from datetime import date, datetime, timezone

from sqlalchemy.ext.asyncio import AsyncSession

from app.core import audit
from app.core.exceptions import NotFoundError
from app.models.alerta import Alerta
from app.models.tramite import Tramite
from app.models.usuario import Usuario
from app.repositories import alerta_repo, tienda_repo
from app.services import tienda_service


SEVERITY_THRESHOLDS_DAYS = {
    "critical": 0,
    "warning": 14,
    "info": 30,
}


async def _get_allowed_tienda_ids(current_user: Usuario) -> list[str] | None:
    if current_user.rol == "OPERATOR":
        return [t.id for t in current_user.tiendas]
    return None


async def get_many(
    db: AsyncSession,
    *,
    severidad: str | None = None,
    tipo: str | None = None,
    silenciada: bool | None = None,
    resuelta: bool | None = None,
    tienda_id: str | None = None,
    search: str | None = None,
    current_user: Usuario,
) -> list[Alerta]:
    allowed_ids = await _get_allowed_tienda_ids(current_user)
    return await alerta_repo.get_many(
        db,
        severidad=severidad,
        tipo=tipo,
        silenciada=silenciada,
        resuelta=resuelta,
        tienda_id=tienda_id,
        search=search,
        allowed_tienda_ids=allowed_ids,
    )


async def count_active_critical(db: AsyncSession, *, current_user: Usuario) -> int:
    allowed_ids = await _get_allowed_tienda_ids(current_user)
    return await alerta_repo.count_active_critical(db, allowed_tienda_ids=allowed_ids)


async def silenciar(
    db: AsyncSession, id: str, *, duracion_dias: int, nota: str | None, actor: Usuario
) -> Alerta:
    alerta = await alerta_repo.get_by_id(db, id)
    if not alerta:
        raise NotFoundError("Alerta no encontrada")

    silenciada_hasta = datetime.now(timezone.utc) + datetime.timedelta(
        days=duracion_dias
    )

    await alerta_repo.update(
        db,
        alerta,
        silenciada=True,
        silenciada_hasta=silenciada_hasta,
        silenciada_por=actor.id,
    )

    await audit.record(
        db,
        actor_id=actor.id,
        accion="alerta.silenciar",
        entidad="alerta",
        entidad_id=alerta.id,
        payload={"duracion_dias": duracion_dias, "nota": nota},
    )
    return alerta


async def resolver(db: AsyncSession, id: str, *, actor: Usuario) -> Alerta:
    alerta = await alerta_repo.get_by_id(db, id)
    if not alerta:
        raise NotFoundError("Alerta no encontrada")

    await alerta_repo.update(
        db,
        alerta,
        resuelta=True,
        silenciada=False,
        fecha_resolucion=datetime.now(timezone.utc),
        resuelta_por=actor.id,
    )

    await audit.record(
        db,
        actor_id=actor.id,
        accion="alerta.resolver",
        entidad="alerta",
        entidad_id=alerta.id,
        payload={},
    )
    
    # Alert-to-tramite compliance bridge
    await tienda_service.recalculate_compliance(db, alerta.tienda_id)
    return alerta


async def reactivar(db: AsyncSession, id: str, *, actor: Usuario) -> Alerta:
    alerta = await alerta_repo.get_by_id(db, id)
    if not alerta:
        raise NotFoundError("Alerta no encontrada")

    await alerta_repo.update(
        db, alerta, silenciada=False, silenciada_hasta=None, silenciada_por=None
    )

    await audit.record(
        db,
        actor_id=actor.id,
        accion="alerta.reactivar",
        entidad="alerta",
        entidad_id=alerta.id,
        payload={},
    )
    return alerta


async def notificar(db: AsyncSession, id: str, *, canal: str, actor: Usuario) -> Alerta:
    alerta = await alerta_repo.get_by_id(db, id)
    if not alerta:
        raise NotFoundError("Alerta no encontrada")

    # Connect to integrations
    tienda = await tienda_repo.get_by_id(db, alerta.tienda_id)
    tramite_nombre = alerta.tramite.nombre if alerta.tramite else "Trámite"
    
    detalles = {
        "sucursal": tienda.nombre if tienda else "Desconocida"
    }
    if alerta.tramite:
        detalles["tramite"] = alerta.tramite.nombre
        if alerta.tramite.fecha_vencimiento:
            detalles["fecha_fin"] = alerta.tramite.fecha_vencimiento.isoformat()

    titulo = f"Alerta - {alerta.tipo.replace('_', ' ').capitalize()}"
    mensaje = alerta.mensaje

    if canal in ["email", "ambos"]:
        from app.integrations.notifications.email import EmailSender
        sender = EmailSender()
        html_body = sender.construir_html(titulo=titulo, mensaje=mensaje, severidad=alerta.severidad, detalles=detalles)
        # Using a generic admin email for demo purposes
        recipient = "admin@vertiche.com"
        sender.send(recipient, titulo, html_body)

    if canal in ["whatsapp", "ambos"]:
        from app.integrations.notifications.whatsapp import WhatsAppSender
        w_sender = WhatsAppSender()
        
        partes = [
            f"*Alerta:* {titulo}",
            f"*Severidad:* {alerta.severidad.upper()}",
            "",
            mensaje
        ]
        text_message = "\\n".join(partes)
        phone = "+521234567890" # Demo phone
        w_sender.send(phone, text_message)

    current_notificaciones = alerta.notificaciones_enviadas or {
        "email": False,
        "whatsapp": False,
    }
    
    if canal in ["email", "ambos"]:
        current_notificaciones["email"] = True
    if canal in ["whatsapp", "ambos"]:
        current_notificaciones["whatsapp"] = True

    # Assign a new dict to trigger SQLAlchemy JSONB mutation detection
    await alerta_repo.update(
        db, alerta, notificaciones_enviadas=current_notificaciones.copy()
    )

    await audit.record(
        db,
        actor_id=actor.id,
        accion=f"alerta.notificar.{canal}",
        entidad="alerta",
        entidad_id=alerta.id,
        payload={"canal": canal},
    )
    return alerta


async def ensure_alert_exists(db: AsyncSession, tramite: Tramite) -> Alerta | None:
    """
    Idempotent. Checks if an open alert exists for this tramite. If not, and the tramite
    is expiring or expired, generates one. Called by the background worker.
    """
    if tramite.es_permanente or not tramite.fecha_vencimiento:
        return None

    days_to_expiry = (tramite.fecha_vencimiento - date.today()).days

    if days_to_expiry > SEVERITY_THRESHOLDS_DAYS["info"]:
        return None

    severidad = "info"
    if days_to_expiry <= SEVERITY_THRESHOLDS_DAYS["critical"]:
        severidad = "critical"
    elif days_to_expiry <= SEVERITY_THRESHOLDS_DAYS["warning"]:
        severidad = "warning"

    tipo = "vencido" if days_to_expiry < 0 else "vencimiento_proximo"

    existing_alert = await alerta_repo.find_open_for_tramite(db, tramite.id)
    if existing_alert:
        # Update severity if it escalated
        if existing_alert.severidad != severidad or existing_alert.tipo != tipo:
            await alerta_repo.update(db, existing_alert, severidad=severidad, tipo=tipo)
        return existing_alert

    tienda = await tienda_repo.get_by_id(db, tramite.tienda_id)
    tienda_nombre = tienda.nombre if tienda else "Tienda Desconocida"

    mensaje = f"El trámite '{tramite.nombre}' de {tienda_nombre} "
    if days_to_expiry < 0:
        mensaje += "ha vencido."
    elif days_to_expiry == 0:
        mensaje += "vence hoy."
    else:
        mensaje += f"vence en {days_to_expiry} días."

    import uuid

    alerta = await alerta_repo.create(
        db,
        id=str(uuid.uuid4()),
        tipo=tipo,
        severidad=severidad,
        tienda_id=tramite.tienda_id,
        tramite_id=tramite.id,
        mensaje=mensaje,
    )

    await audit.record(
        db,
        actor_id=None,
        accion="alerta.auto_create",
        entidad="alerta",
        entidad_id=alerta.id,
        payload={"tramite_id": tramite.id, "severidad": severidad},
    )
    return alerta
