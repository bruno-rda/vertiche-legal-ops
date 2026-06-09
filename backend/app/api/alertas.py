from fastapi import APIRouter

from app.api.deps import CurrentUser, DbSession
from app.schemas.alerta import AlertaCountOut, AlertaOut, AlertaSilenciarRequest
from app.services import alerta_service

router = APIRouter()


def _serialize_alerta(a) -> dict:
    return {
        "id": a.id,
        "tipo": a.tipo,
        "severidad": a.severidad,
        "tienda_id": a.tienda_id,
        "tienda_nombre": getattr(a.tienda, "nombre", None)
        if hasattr(a, "tienda")
        else None,
        "tramite_id": a.tramite_id,
        "tramite_nombre": getattr(a.tramite, "nombre", None)
        if hasattr(a, "tramite")
        else None,
        "documento_id": a.documento_id,
        "mensaje": a.mensaje,
        "fecha_generacion": a.fecha_generacion.isoformat(),
        "silenciada": a.silenciada,
        "silenciada_hasta": a.silenciada_hasta.isoformat()
        if a.silenciada_hasta
        else None,
        "silenciada_por": a.silenciada_por,
        "resuelta": a.resuelta,
        "fecha_resolucion": a.fecha_resolucion.isoformat()
        if a.fecha_resolucion
        else None,
        "resuelta_por": a.resuelta_por,
        "notificaciones_enviadas": a.notificaciones_enviadas,
    }


@router.get("", response_model=list[AlertaOut])
async def list_alertas(
    db: DbSession,
    current_user: CurrentUser,
    severidad: str | None = None,
    tipo: str | None = None,
    silenciada: bool | None = None,
    resuelta: bool | None = None,
    tienda_id: str | None = None,
    search: str | None = None,
):
    items = await alerta_service.get_many(
        db,
        severidad=severidad,
        tipo=tipo,
        silenciada=silenciada,
        resuelta=resuelta,
        tienda_id=tienda_id,
        search=search,
        current_user=current_user,
    )
    return [_serialize_alerta(a) for a in items]


@router.get("/count/critical", response_model=AlertaCountOut)
async def count_critical(db: DbSession, current_user: CurrentUser):
    count = await alerta_service.count_active_critical(db, current_user=current_user)
    return {"count": count}


@router.post("/{id}/silenciar", response_model=AlertaOut)
async def silenciar(
    db: DbSession, id: str, data: AlertaSilenciarRequest, current_user: CurrentUser
):
    a = await alerta_service.silenciar(
        db, id, duracion_dias=data.duracion_dias, nota=data.nota, actor=current_user
    )
    return _serialize_alerta(a)


@router.post("/{id}/resolver", response_model=AlertaOut)
async def resolver(db: DbSession, id: str, current_user: CurrentUser):
    a = await alerta_service.resolver(db, id, actor=current_user)
    return _serialize_alerta(a)


@router.post("/{id}/reactivar", response_model=AlertaOut)
async def reactivar(db: DbSession, id: str, current_user: CurrentUser):
    a = await alerta_service.reactivar(db, id, actor=current_user)
    return _serialize_alerta(a)


@router.post("/{id}/notificar/{canal}", response_model=AlertaOut)
async def notificar(db: DbSession, id: str, canal: str, current_user: CurrentUser):
    a = await alerta_service.notificar(db, id, canal=canal, actor=current_user)
    return _serialize_alerta(a)
