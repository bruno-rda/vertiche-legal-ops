import logging
import dataclasses
from copy import deepcopy
from datetime import date

from app.database import AsyncSessionLocal
from app.repositories import documento_repo
from app.integrations.llm.extractor import FieldExtractor
from app.integrations.llm.heuristics import extract_document_hints, merge_doc_with_hints
from app.core import audit
from app.services import tienda_service

logger = logging.getLogger(__name__)


async def extract_fields_task(ctx, document_id: str):
    logger.info(f"Starting LLM field extraction for document {document_id}")

    async with AsyncSessionLocal() as db:
        doc = await documento_repo.get_by_id(db, document_id)
        if not doc:
            logger.error(f"Document {document_id} not found")
            return

        if doc.estado_ocr != "pendiente_extraccion":
            logger.info(f"Document {document_id} state is {doc.estado_ocr}, skipping extraction.")
            return

        texto_ocr = doc.texto_ocr or ""
        nombre_archivo = doc.nombre_archivo or ""

        try:
            # 1. Run LLM Extraction
            extractor = FieldExtractor()
            llm_result = extractor.extract(texto_ocr)
            llm_result_original = deepcopy(llm_result)

            # 2. Run Heuristics
            # Pass name and text
            hints = extract_document_hints(nombre_archivo, raw_text=texto_ocr)

            # 3. Merge
            merged = merge_doc_with_hints(llm_result, hints)

            # Check if LLM failed
            llm_failed = "Extracción LLM fallida" in llm_result_original.notas_extraccion

            requiere_revision = doc.requiere_revision_manual
            if llm_failed:
                merged.confianza_extraccion = "baja"
                requiere_revision = True

            # 4. Translate to datos_extraidos JSONB
            datos_extraidos = {}
            for k, v in dataclasses.asdict(merged).items():
                if v is None or k in ("confianza_extraccion", "notas_extraccion"):
                    continue
                
                if isinstance(v, date):
                    v = v.isoformat()

                original_v = getattr(llm_result_original, k)
                if isinstance(original_v, date):
                    original_v = original_v.isoformat()

                # Determine source
                if original_v != v:
                    source = "heuristica"
                else:
                    # check if hint also found it
                    hint_val = getattr(hints, k, None)
                    if k == "sucursal_id":
                        hint_val = hints.sucursal_codigo
                    
                    if isinstance(hint_val, date):
                        hint_val = hint_val.isoformat()

                    if hint_val == v:
                        source = "merged"
                    else:
                        source = "llm" if not llm_failed else "heuristica"

                datos_extraidos[k] = {
                    "value": v,
                    "confidence": merged.confianza_extraccion,
                    "source": source
                }

            # If LLM failed, we just record whatever the heuristic found.
            # 5. Update Documento
            doc = await documento_repo.update(
                db,
                doc,
                estado_ocr="completado",
                datos_extraidos=datos_extraidos,
                categoria=merged.categoria,
                fecha_fin_vigencia=merged.fecha_fin_vigencia,
                es_permanente=merged.es_permanente,
                confianza_extraccion=merged.confianza_extraccion,
                requiere_revision_manual=requiere_revision,
            )

            # 6. Audit
            await audit.record(
                db,
                actor_id=None,
                accion="documento.llm_extracted",
                entidad="documento",
                entidad_id=doc.id,
                payload={
                    "llm_failed": llm_failed,
                    "confianza": merged.confianza_extraccion,
                    "notas": merged.notas_extraccion,
                },
            )

            # 7. Recalculate Compliance
            if doc.tienda_id:
                await tienda_service.recalculate_compliance(db, doc.tienda_id)

            await db.commit()
            logger.info(f"Finished LLM extraction for document {document_id}")

        except Exception:
            logger.exception(f"Error during LLM extraction for document {document_id}")
            doc = await documento_repo.update(db, doc, estado_ocr="error")
            await db.commit()
