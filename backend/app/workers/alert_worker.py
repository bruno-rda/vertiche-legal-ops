import logging
from datetime import date

from sqlalchemy import select, and_
from app.database import AsyncSessionLocal
from app.models.alerta import Alerta
from app.models.regla_alerta import ReglaAlerta
from app.models.tramite import Tramite

logger = logging.getLogger(__name__)

def _evaluar_vencimiento(tramite: Tramite, hoy: date, reglas_by_codigo: dict, nuevas: list) -> None:
    if not tramite.fecha_vencimiento or tramite.es_permanente:
        return

    dias_restantes = (tramite.fecha_vencimiento - hoy).days
    
    # Matching logic for thresholds
    for codigo, umbral in [("VEN_40", 40), ("VEN_30", 30), ("VEN_20", 20), ("VEN_10", 10)]:
        if dias_restantes == umbral:
            regla = reglas_by_codigo.get(codigo)
            if not regla:
                continue
            
            nuevas.append({
                "tramite_id": tramite.id,
                "regla_id": regla.id,
                "tienda_id": tramite.tienda_id,
                "severidad": regla.severidad,
                "tipo": "vencimiento_proximo",
                "mensaje": f"El trámite '{tramite.nombre}' vence el {tramite.fecha_vencimiento.isoformat()} ({umbral} días).",
            })

    if dias_restantes <= 10:
        regla = reglas_by_codigo.get("VEN_DIARIO")
        if regla:
            if dias_restantes >= 0:
                tipo = "vencimiento_proximo"
                msg_tiempo = f"Faltan {dias_restantes} día(s)"
            else:
                tipo = "vencido"
                msg_tiempo = f"Venció hace {abs(dias_restantes)} día(s)"
                
            nuevas.append({
                "tramite_id": tramite.id,
                "regla_id": regla.id,
                "tienda_id": tramite.tienda_id,
                "severidad": regla.severidad,
                "tipo": tipo,
                "mensaje": f"{msg_tiempo} para el trámite '{tramite.nombre}'. Fecha de vencimiento: {tramite.fecha_vencimiento.isoformat()}.",
            })

def _evaluar_estado(tramite: Tramite, hoy: date, reglas_by_codigo: dict, nuevas: list) -> None:
    # Adapt to the existing states:
    # "pendiente_documentacion", "en_espera_resolucion", "en_revision", "presentado"
    estado_a_codigo = {
        "pendiente_documentacion": "PEND_DOC",
        "en_espera_resolucion": "EN_ESPERA",
        "en_revision": "EN_REVISION",
        "presentado": "PRESENTADO",
    }
    codigo = estado_a_codigo.get(tramite.estado)
    if not codigo:
        return

    regla = reglas_by_codigo.get(codigo)
    if not regla:
        return

    mensajes = {
        "PEND_DOC": f"El trámite '{tramite.nombre}' se encuentra pendiente de documentación.",
        "EN_ESPERA": f"El trámite '{tramite.nombre}' está en espera de resolución.",
        "EN_REVISION": f"El trámite '{tramite.nombre}' está en revisión y requiere seguimiento.",
        "PRESENTADO": f"El trámite '{tramite.nombre}' ha sido presentado, pendiente de acuse o seguimiento.",
    }

    nuevas.append({
        "tramite_id": tramite.id,
        "regla_id": regla.id,
        "tienda_id": tramite.tienda_id,
        "severidad": regla.severidad,
        "tipo": "estado_tramite",
        "mensaje": mensajes[codigo],
    })


async def scan_tramites_for_alerts():
    """
    Scans all tramites and evaluates them against active ReglaAlerta records.
    Run via APScheduler.
    """
    logger.info("Starting scheduled scan for compliance alerts")
    hoy = date.today()

    async with AsyncSessionLocal() as db:
        # 1. Fetch active rules
        result = await db.execute(select(ReglaAlerta).where(ReglaAlerta.activa == True))
        reglas = result.scalars().all()
        if not reglas:
            logger.info("No active alert rules found.")
            return

        reglas_by_codigo = {r.codigo_regla: r for r in reglas}

        # 2. Fetch all non-no_aplica tramites
        result = await db.execute(
            select(Tramite).where(Tramite.estado != "no_aplica")
        )
        tramites = result.scalars().all()

        alertas_nuevas = 0
        
        for tramite in tramites:
            nuevas_para_tramite = []
            _evaluar_vencimiento(tramite, hoy, reglas_by_codigo, nuevas_para_tramite)
            _evaluar_estado(tramite, hoy, reglas_by_codigo, nuevas_para_tramite)

            for alerta_data in nuevas_para_tramite:
                # Idempotency check using uniqueness logic
                existing = await db.execute(
                    select(Alerta).where(
                        and_(
                            Alerta.tramite_id == alerta_data["tramite_id"],
                            Alerta.regla_id == alerta_data["regla_id"],
                            Alerta.fecha == hoy,
                        )
                    )
                )
                if not existing.scalar_one_or_none():
                    import uuid
                    from datetime import datetime, UTC
                    alerta = Alerta(
                        id=str(uuid.uuid4()),
                        tipo=alerta_data["tipo"],
                        severidad=alerta_data["severidad"],
                        tienda_id=alerta_data["tienda_id"],
                        tramite_id=alerta_data["tramite_id"],
                        regla_id=alerta_data["regla_id"],
                        mensaje=alerta_data["mensaje"],
                        fecha=hoy,
                        fecha_generacion=datetime.now(UTC)
                    )
                    db.add(alerta)
                    alertas_nuevas += 1

        await db.commit()
        logger.info(
            "Finished scheduled scan. "
            f"Evaluated {len(tramites)} tramites, "
            f"generated {alertas_nuevas} alerts."
        )
