import asyncio
import uuid
import logging
from sqlalchemy import select
from app.database import AsyncSessionLocal
from app.models.regla_alerta import ReglaAlerta

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def create_reglas():
    logger.info("Iniciando creación/actualización de reglas de alerta...")
    
    # Basado en la lógica de alert_worker.py:
    # 1. VEN_40, VEN_30, VEN_20, VEN_10, VEN_DIARIO (para vencimientos de trámites)
    # 2. PEND_DOC, EN_ESPERA, EN_REVISION, PRESENTADO (para cambios de estado)
    
    reglas = [
        {
            "codigo_regla": "VEN_40",
            "nombre": "Vencimiento próximo (40 días)",
            "dias_antes_vencimiento": 40,
            "severidad": "info",
            "canal": "sistema",
            "aplica_a_estado": None,
        },
        {
            "codigo_regla": "VEN_30",
            "nombre": "Vencimiento próximo (30 días)",
            "dias_antes_vencimiento": 30,
            "severidad": "info",
            "canal": "sistema",
            "aplica_a_estado": None,
        },
        {
            "codigo_regla": "VEN_20",
            "nombre": "Vencimiento próximo (20 días)",
            "dias_antes_vencimiento": 20,
            "severidad": "warning",
            "canal": "sistema",
            "aplica_a_estado": None,
        },
        {
            "codigo_regla": "VEN_10",
            "nombre": "Vencimiento próximo (10 días)",
            "dias_antes_vencimiento": 10,
            "severidad": "critical",
            "canal": "sistema",
            "aplica_a_estado": None,
        },
        {
            "codigo_regla": "VEN_DIARIO",
            "nombre": "Vencimiento crítico / Vencido (Diario <= 10 días)",
            "dias_antes_vencimiento": 10,
            "severidad": "critical",
            "canal": "sistema",
            "aplica_a_estado": None,
        },
        {
            "codigo_regla": "PEND_DOC",
            "nombre": "Trámite pendiente de documentación",
            "dias_antes_vencimiento": None,
            "severidad": "warning",
            "canal": "sistema",
            "aplica_a_estado": "pendiente_documentacion",
        },
        {
            "codigo_regla": "EN_ESPERA",
            "nombre": "Trámite en espera de resolución",
            "dias_antes_vencimiento": None,
            "severidad": "info",
            "canal": "sistema",
            "aplica_a_estado": "en_espera_resolucion",
        },
        {
            "codigo_regla": "EN_REVISION",
            "nombre": "Trámite en revisión",
            "dias_antes_vencimiento": None,
            "severidad": "warning",
            "canal": "sistema",
            "aplica_a_estado": "en_revision",
        },
        {
            "codigo_regla": "PRESENTADO",
            "nombre": "Trámite presentado",
            "dias_antes_vencimiento": None,
            "severidad": "info",
            "canal": "sistema",
            "aplica_a_estado": "presentado",
        },
    ]

    async with AsyncSessionLocal() as db:
        for r_data in reglas:
            result = await db.execute(
                select(ReglaAlerta).where(ReglaAlerta.codigo_regla == r_data["codigo_regla"])
            )
            existing = result.scalar_one_or_none()
            
            if not existing:
                nueva_regla = ReglaAlerta(
                    id=str(uuid.uuid4()),
                    codigo_regla=r_data["codigo_regla"],
                    nombre=r_data["nombre"],
                    dias_antes_vencimiento=r_data["dias_antes_vencimiento"],
                    severidad=r_data["severidad"],
                    canal=r_data["canal"],
                    aplica_a_estado=r_data["aplica_a_estado"],
                    activa=True
                )
                db.add(nueva_regla)
                logger.info(f"Regla creada: {r_data['codigo_regla']}")
            else:
                existing.nombre = r_data["nombre"]
                existing.dias_antes_vencimiento = r_data["dias_antes_vencimiento"]
                existing.severidad = r_data["severidad"]
                existing.canal = r_data["canal"]
                existing.aplica_a_estado = r_data["aplica_a_estado"]
                existing.activa = True
                logger.info(f"Regla actualizada: {r_data['codigo_regla']}")
                
        await db.commit()
        logger.info("Todas las reglas han sido procesadas exitosamente.")

if __name__ == "__main__":
    asyncio.run(create_reglas())
