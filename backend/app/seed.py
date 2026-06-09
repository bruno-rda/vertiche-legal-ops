import asyncio
import logging
from datetime import date, timedelta

from sqlalchemy import text

from app.core.security import hash_password
from app.database import AsyncSessionLocal
from app.models.associations import usuario_tiendas
from app.models.tienda import Tienda
from app.models.tramite import Tramite
from app.models.usuario import Usuario
from app.services import tienda_service

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


async def seed():
    async with AsyncSessionLocal() as db:
        # Check idempotency: If admin exists, skip
        result = await db.execute(
            text("SELECT id FROM usuarios WHERE email = 'admin@vertiche.com'")
        )
        if result.scalar_one_or_none():
            logger.info("Seed data already exists. Skipping.")
            return

        logger.info("Starting database seed...")

        # 1. Users
        admin_id = "user-admin"
        operator_1_id = "user-op-1"
        operator_2_id = "user-op-2"

        db.add_all(
            [
                Usuario(
                    id=admin_id,
                    nombre="Admin Principal",
                    email="admin@vertiche.com",
                    password_hash=hash_password("password123"),
                    rol="ADMIN",
                ),
                Usuario(
                    id=operator_1_id,
                    nombre="Operador Norte",
                    email="op_norte@vertiche.com",
                    password_hash=hash_password("password123"),
                    rol="OPERATOR",
                ),
                Usuario(
                    id=operator_2_id,
                    nombre="Operador Sur",
                    email="op_sur@vertiche.com",
                    password_hash=hash_password("password123"),
                    rol="OPERATOR",
                ),
            ]
        )
        await db.flush()

        # 2. Tiendas
        tienda_1_id = "tienda-1"
        tienda_2_id = "tienda-2"
        db.add_all(
            [
                Tienda(
                    id=tienda_1_id,
                    nombre="Vertiche Monterrey Centro",
                    estado="Nuevo León",
                    municipio="Monterrey",
                    direccion="Padre Mier 123",
                    marcas=["Vertiche"],
                ),
                Tienda(
                    id=tienda_2_id,
                    nombre="Vertiche CDMX Coyoacán",
                    estado="Ciudad de México",
                    municipio="Coyoacán",
                    direccion="Av. Miguel Ángel de Quevedo",
                    marcas=["Vertiche", "VRT"],
                ),
            ]
        )
        await db.flush()

        # Join users to tiendas
        await db.execute(
            usuario_tiendas.insert(),
            [
                {"usuario_id": operator_1_id, "tienda_id": tienda_1_id},
                {"usuario_id": operator_2_id, "tienda_id": tienda_2_id},
            ],
        )

        # 3. Tramites
        t1_id = "tramite-1"
        t2_id = "tramite-2"
        db.add_all(
            [
                Tramite(
                    id=t1_id,
                    tienda_id=tienda_1_id,
                    nombre="Licencia de Funcionamiento",
                    tipo="licencia",
                    estado="vencido",
                    fecha_inicio=date.today() - timedelta(days=400),
                    fecha_vencimiento=date.today() - timedelta(days=35),
                ),
                Tramite(
                    id=t2_id,
                    tienda_id=tienda_2_id,
                    nombre="Permiso de Anuncios",
                    tipo="permiso",
                    estado="vigente",
                    fecha_inicio=date.today() - timedelta(days=100),
                    fecha_vencimiento=date.today() + timedelta(days=200),
                ),
            ]
        )
        await db.flush()

        # Recalculate compliance for stores
        await tienda_service.recalculate_compliance(db, tienda_1_id)
        await tienda_service.recalculate_compliance(db, tienda_2_id)

        await db.commit()
        logger.info("Seed completed successfully.")


def main():
    asyncio.run(seed())


if __name__ == "__main__":
    main()
