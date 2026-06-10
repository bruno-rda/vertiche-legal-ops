from fastapi import APIRouter

from app.api.deps import CurrentUser, DbSession
from app.core.pagination import PaginatedResponse, paginate
from app.schemas.tramite import Tramite, TramiteUpdate
from app.services import tramite_service

router = APIRouter()


def _serialize_tramite(t) -> dict:
    return {
        "id": t.id,
        "tienda_id": t.tienda_id,
        "tienda_nombre": getattr(t.tienda, "nombre", None)
        if hasattr(t, "tienda")
        else None,
        "nombre": t.nombre,
        "tipo": t.tipo,
        "estado": t.estado,
        "fecha_inicio": t.fecha_inicio.isoformat() if t.fecha_inicio else "",
        "fecha_vencimiento": t.fecha_vencimiento.isoformat()
        if t.fecha_vencimiento
        else "",
        "es_permanente": t.es_permanente,
        "es_recurrente": t.es_recurrente,
        "periodo_recurrencia": t.periodo_recurrencia,
        "asignado_a": t.asignado_a,
        "observaciones": [
            {
                "id": o.id,
                "descripcion": o.descripcion,
                "severidad": o.severidad,
                "fecha": o.fecha.isoformat(),
            }
            for o in getattr(t, "observaciones", [])
        ],
        "documentos": [
            {
                "id": d.id,
                "tramite_ids": [],
                "nombre_archivo": d.nombre_archivo,
                "url": d.url,
                "estado_ocr": d.estado_ocr,
                "datos_extraidos": d.datos_extraidos,
                "requiere_revision_manual": d.requiere_revision_manual,
                "cargado_por": d.cargado_por,
                "cargado_en": d.created_at.isoformat(),
                "tienda_id": d.tienda_id,
            }
            for d in getattr(t, "documentos", [])
        ],
        "historial": [],
    }


@router.get("", response_model=PaginatedResponse[Tramite])
async def list_tramites(
    db: DbSession,
    current_user: CurrentUser,
    page: int = 1,
    page_size: int = 25,
    search: str | None = None,
    estado: str | None = None,
    tipo: str | None = None,
    estado_geografico: str | None = None,
    solo_vencidos: bool = False,
    por_vencer_dias: int | None = None,
):
    items, total = await tramite_service.get_many(
        db,
        page=page,
        page_size=page_size,
        search=search,
        estado=estado,
        tipo=tipo,
        estado_geografico=estado_geografico,
        solo_vencidos=solo_vencidos,
        por_vencer_dias=por_vencer_dias,
        current_user=current_user,
    )
    return paginate([_serialize_tramite(t) for t in items], total, page, page_size)


@router.get("/{id}", response_model=Tramite)
async def get_tramite(db: DbSession, id: str, current_user: CurrentUser):
    t = await tramite_service.get_by_id(db, id, current_user=current_user)

    # We must fetch historial here
    from app.repositories import historial_repo

    hist = await historial_repo.get_by_entity(db, "tramite", t.id)
    serialized = _serialize_tramite(t)
    serialized["historial"] = [
        {
            "id": h.id,
            "entidad_tipo": h.entidad,
            "entidad_id": h.entidad_id,
            "accion": h.accion,
            "usuario_id": h.actor_id or "system",
            "usuario_nombre": "Sistema"
            if not h.actor_id
            else h.actor_id,  # Simplified for now
            "fecha": h.timestamp.isoformat(),
        }
        for h in hist
    ]
    return serialized


@router.patch("/{id}", response_model=Tramite)
async def update_tramite(
    db: DbSession, id: str, data: TramiteUpdate, current_user: CurrentUser
):
    t = await tramite_service.update(
        db, id, actor=current_user, **data.model_dump(exclude_unset=True)
    )
    return _serialize_tramite(t)
