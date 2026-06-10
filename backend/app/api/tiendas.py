from fastapi import APIRouter, File, Form, Request, UploadFile

from app.api.alertas import _serialize_alerta
from app.api.deps import CurrentUser, DbSession, RequireAdmin
from app.api.documentos import _serialize_documento
from app.api.tramites import _serialize_tramite
from app.core.pagination import PaginatedResponse, paginate
from app.schemas.alerta import Alerta
from app.schemas.documento import Documento
from app.schemas.historial import HistorialItem
from app.schemas.tienda import Expediente, Tienda, TiendaUpdate
from app.schemas.tramite import Tramite, TramiteCreate
from app.services import (
    alerta_service,
    documento_service,
    tienda_service,
    tramite_service,
)

router = APIRouter()


def _serialize_tienda(t) -> dict:
    return {
        "id": t.id,
        "nombre": t.nombre,
        "estado": t.estado,
        "municipio": t.municipio,
        "direccion": t.direccion,
        "marcas": t.marcas,
        "cumplimiento": round(t.cumplimiento),
        "estado_cumplimiento": t.estado_cumplimiento,
        "total_tramites": t.total_tramites,
        "tramites_vencidos": t.tramites_vencidos,
        "tramites_por_vencer": t.tramites_por_vencer,
        "ultima_actualizacion": t.updated_at.isoformat()
        if t.updated_at
        else t.created_at.isoformat(),
    }


@router.get("", response_model=PaginatedResponse[Tienda])
async def list_tiendas(
    db: DbSession,
    current_user: CurrentUser,
    page: int = 1,
    page_size: int = 25,
    search: str | None = None,
    estado: str | None = None,
    estado_cumplimiento: str | None = None,
    sort_by: str = "nombre",
    sort_order: str = "asc",
    operador_id: str | None = None,
):
    items, total = await tienda_service.get_many(
        db,
        page=page,
        page_size=page_size,
        search=search,
        estado=estado,
        estado_cumplimiento=estado_cumplimiento,
        sort_by=sort_by,
        sort_order=sort_order,
        operador_id=operador_id,
        current_user=current_user,
    )
    return paginate([_serialize_tienda(t) for t in items], total, page, page_size)


@router.get("/{id}", response_model=Tienda)
async def get_tienda(db: DbSession, id: str, current_user: CurrentUser):
    t = await tienda_service.get_by_id(db, id, current_user=current_user)
    return _serialize_tienda(t)


@router.put("/{id}", response_model=Tienda)
async def update_tienda(
    db: DbSession, id: str, data: TiendaUpdate, admin: RequireAdmin
):
    t = await tienda_service.update(
        db, id, actor=admin, **data.model_dump(exclude_unset=True)
    )
    return _serialize_tienda(t)


@router.get("/{id}/expediente", response_model=Expediente)
async def get_expediente(db: DbSession, id: str, current_user: CurrentUser):
    t = await tienda_service.get_by_id(db, id, current_user=current_user)

    return {
        "id": f"exp-{t.id}",
        "tienda_id": t.id,
        "cumplimiento": round(t.cumplimiento),
        "ultima_actualizacion": t.updated_at.isoformat()
        if t.updated_at
        else t.created_at.isoformat(),
        # tramites will be fetched by the frontend via the /tramites endpoint
        # this is a simplified payload just to satisfy the folder view requirements
        "tramites": [],
    }


@router.post("/{id}/tramites", response_model=Tramite, status_code=201)
async def create_tramite_for_tienda(
    db: DbSession, id: str, data: TramiteCreate, current_user: CurrentUser
):
    # Verifies store access
    await tienda_service.get_by_id(db, id, current_user=current_user)
    t = await tramite_service.create(
        db, tienda_id=id, actor=current_user, **data.model_dump(exclude_unset=True)
    )
    return _serialize_tramite(t)


@router.get("/{id}/alertas", response_model=list[Alerta])
async def get_alertas_for_tienda(db: DbSession, id: str, current_user: CurrentUser):
    # Ensure user has access
    await tienda_service.get_by_id(db, id, current_user=current_user)
    items = await alerta_service.get_many(db, tienda_id=id, current_user=current_user)
    return [_serialize_alerta(a) for a in items]


@router.get("/{id}/documentos", response_model=PaginatedResponse[Documento])
async def get_documentos_for_tienda(
    db: DbSession,
    id: str,
    current_user: CurrentUser,
    page: int = 1,
    page_size: int = 25,
):
    # Ensure user has access
    await tienda_service.get_by_id(db, id, current_user=current_user)
    items, total = await documento_service.get_many(
        db, tienda_id=id, current_user=current_user, page=page, page_size=page_size
    )
    return paginate([_serialize_documento(d) for d in items], total, page, page_size)


@router.post("/{id}/documentos", response_model=Documento, status_code=201)
async def upload_documento_for_tienda(
    request: Request,
    db: DbSession,
    id: str,
    current_user: CurrentUser,
    file: UploadFile = File(None),
    file_name: str = Form(None),
    tramite_ids: list[str] = Form(None),
):
    # Ensure user has access
    await tienda_service.get_by_id(db, id, current_user=current_user)

    content = await file.read()
    name = file_name or file.filename

    doc = await documento_service.create_from_upload(
        db,
        file_content=content,
        filename=name,
        actor=current_user,
    )

    doc = await documento_service.update_tramites(
        db, doc.id, tramite_ids=tramite_ids, actor=current_user
    )

    # Fire off OCR worker asynchronously via ARQ
    redis = request.app.state.redis
    await redis.enqueue_job("process_ocr", doc.id)

    return _serialize_documento(doc)


@router.get("/{id}/historial", response_model=list[HistorialItem])
async def get_historial_for_tienda(db: DbSession, id: str, current_user: CurrentUser):
    # Verify access
    await tienda_service.get_by_id(db, id, current_user=current_user)

    from app.repositories import historial_repo

    hist = await historial_repo.get_by_entity(db, "tienda", id)

    return [
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
