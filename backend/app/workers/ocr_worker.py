import logging

from arq.connections import RedisSettings

from app.config import settings
from app.core import audit
from app.database import AsyncSessionLocal
from app.repositories import documento_repo
from app.workers.ocr_engine import extract_text_mock

logger = logging.getLogger(__name__)


async def process_ocr(ctx, document_id: str):
    logger.info(f"Starting OCR process for document {document_id}")

    async with AsyncSessionLocal() as db:
        doc = await documento_repo.get_by_id(db, document_id)
        if not doc:
            logger.error(f"Document {document_id} not found")
            return

        try:
            # Run the OCR extraction
            datos = await extract_text_mock(doc.url)

            # Check confidence thresholds
            requiere_revision = any(
                field_data["confidence"] < settings.ocr_confidence_threshold
                for field_data in datos.values()
            )

            # Update the document
            doc = await documento_repo.update(
                db,
                doc,
                datos_extraidos=datos,
                estado_ocr="completado",
                requiere_revision_manual=requiere_revision,
            )

            await audit.record(
                db,
                actor_id="system:ocr_worker",
                accion="documento.ocr_processed",
                entidad="documento",
                entidad_id=doc.id,
                payload={"requiere_revision": requiere_revision},
            )

            await db.commit()
            logger.info(f"Finished OCR for document {document_id}")

        except Exception:
            logger.exception(f"Error processing document {document_id}")
            doc = await documento_repo.update(db, doc, estado_ocr="error")
            await db.commit()


# ARQ worker configuration
class WorkerSettings:
    functions = [process_ocr]
    redis_settings = RedisSettings(host=settings.redis_host, port=settings.redis_port)
