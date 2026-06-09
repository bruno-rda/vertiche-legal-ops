from fastapi import APIRouter

from app.api.deps import CurrentUser, DbSession, RequireAdmin
from app.core.pagination import PaginatedResponse, paginate
from app.schemas.tienda import ExpedienteOut, TiendaOut, TiendaUpdate
from app.services import tienda_service

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


@router.get("", response_model=PaginatedResponse[TiendaOut])
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


@router.get("/{id}", response_model=TiendaOut)
async def get_tienda(db: DbSession, id: str, current_user: CurrentUser):
    t = await tienda_service.get_by_id(db, id, current_user=current_user)
    return _serialize_tienda(t)


@router.patch("/{id}", response_model=TiendaOut)
async def update_tienda(
    db: DbSession, id: str, data: TiendaUpdate, admin: RequireAdmin
):
    t = await tienda_service.update(
        db, id, actor=admin, **data.model_dump(exclude_unset=True)
    )
    return _serialize_tienda(t)


@router.get("/{id}/expediente", response_model=ExpedienteOut)
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
