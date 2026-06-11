import logging

from arq.connections import RedisSettings

from app.config import settings
from app.core import audit, storage
from app.database import AsyncSessionLocal
from app.integrations.ocr import ocr_engine
from app.repositories import documento_repo
from app.workers.llm_worker import extract_fields_task

logger = logging.getLogger(__name__)


async def process_ocr(ctx, document_id: str):
    logger.info(f"Starting OCR process for document {document_id}")

    async with AsyncSessionLocal() as db:
        doc = await documento_repo.get_by_id(db, document_id)
        if not doc:
            logger.error(f"Document {document_id} not found")
            return

        try:
            minio_client = storage.get_minio_client()
            pdf_bytes = await storage.get_file_bytes(minio_client, doc.ruta_archivo)

            # Run the OCR extraction
            result = ocr_engine.extract(pdf_bytes)

            # Check confidence thresholds
            requiere_revision = (
                result.avg_confidence < settings.ocr_confidence_threshold
            )
            estado = (
                "pendiente_extraccion" if not requiere_revision else "baja_confianza"
            )

            ocr_metrics = {
                "word_count": result.word_count,
                "avg_confidence": result.avg_confidence,
                "method": result.method,
            }

            # Update the document
            doc = await documento_repo.update(
                db,
                doc,
                texto_ocr=result.raw_text,
                ocr_metrics=ocr_metrics,
                estado_ocr=estado,
                requiere_revision_manual=requiere_revision,
            )

            await audit.record(
                db,
                actor_id=None,
                accion="documento.ocr_processed",
                entidad="documento",
                entidad_id=doc.id,
                payload={
                    "requiere_revision": requiere_revision,
                    "metrics": ocr_metrics,
                },
            )

            await db.commit()
            logger.info(f"Finished OCR for document {document_id}")

            if estado == "pendiente_extraccion":
                await ctx["redis"].enqueue_job("extract_fields_task", doc.id)

        except Exception:
            logger.exception(f"Error processing document {document_id}")
            doc = await documento_repo.update(db, doc, estado_ocr="error")
            await db.commit()


class WorkerSettings:
    functions = [process_ocr, extract_fields_task]
    redis_settings = RedisSettings(host=settings.redis_host, port=settings.redis_port)
