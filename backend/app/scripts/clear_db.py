import asyncio
import logging

from sqlalchemy import delete

from app.database import AsyncSessionLocal
from app.models.alerta import Alerta
from app.models.associations import documento_tramites, usuario_tiendas
from app.models.documento import Documento
from app.models.tienda import Tienda
from app.models.tramite import Tramite
from app.models.usuario import Usuario

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


async def clear_db():
    async with AsyncSessionLocal() as db:
        logger.info("Starting database cleanup...")

        # We delete in reverse dependency order to avoid foreign key constraint errors
        logger.info("Deleting Alertas...")
        await db.execute(delete(Alerta))

        logger.info("Deleting Documento-Tramite associations...")
        await db.execute(delete(documento_tramites))

        logger.info("Deleting Documentos...")
        await db.execute(delete(Documento))

        logger.info("Deleting Tramites...")
        await db.execute(delete(Tramite))

        logger.info("Deleting Usuario-Tienda associations...")
        await db.execute(delete(usuario_tiendas))

        logger.info("Deleting Tiendas...")
        await db.execute(delete(Tienda))

        logger.info("Deleting Usuarios...")
        await db.execute(delete(Usuario))

        await db.commit()
        logger.info("Database cleanup completed successfully.")


def main():
    asyncio.run(clear_db())


if __name__ == "__main__":
    main()
