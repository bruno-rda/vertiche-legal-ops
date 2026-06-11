import uuid
from sqlalchemy.ext.asyncio import AsyncSession

from app.core import audit
from app.core.exceptions import NotFoundError
from app.models.tienda import Tienda
from app.models.usuario import Usuario
from app.repositories import tienda_repo, tramite_repo


async def _get_allowed_tienda_ids(current_user: Usuario) -> list[str] | None:
    if current_user.rol == "OPERATOR":
        return [t.id for t in current_user.tiendas]
    return None


async def get_many(
    db: AsyncSession,
    *,
    page: int = 1,
    page_size: int = 25,
    search: str | None = None,
    estado: str | None = None,
    estado_cumplimiento: str | None = None,
    sort_by: str = "nombre",
    sort_order: str = "asc",
    operador_id: str | None = None,
    current_user: Usuario,
) -> tuple[list[Tienda], int]:
    allowed_ids = await _get_allowed_tienda_ids(current_user)
    return await tienda_repo.get_many(
        db,
        page=page,
        page_size=page_size,
        search=search,
        estado=estado,
        estado_cumplimiento=estado_cumplimiento,
        sort_by=sort_by,
        sort_order=sort_order,
        operador_id=operador_id,
        allowed_ids=allowed_ids,
    )


async def get_by_id(db: AsyncSession, id: str, *, current_user: Usuario) -> Tienda:
    allowed_ids = await _get_allowed_tienda_ids(current_user)
    if allowed_ids is not None and id not in allowed_ids:
        raise NotFoundError("Tienda no encontrada")

    tienda = await tienda_repo.get_by_id(db, id)
    if not tienda:
        raise NotFoundError("Tienda no encontrada")
    return tienda


async def update(
    db: AsyncSession, id: str, *, actor: Usuario, **fields: object
) -> Tienda:
    tienda = await get_by_id(db, id, current_user=actor)

    update_payload = {}
    for key in ["nombre", "estado", "municipio", "direccion"]:
        if key in fields and fields[key] is not None:
            update_payload[key] = fields[key]

    tienda = await tienda_repo.update(db, tienda, **update_payload)

    await audit.record(
        db,
        actor_id=actor.id,
        accion="tienda.update",
        entidad="tienda",
        entidad_id=tienda.id,
        payload=update_payload,
    )
    return tienda


async def create(
    db: AsyncSession, 
    *, 
    actor: Usuario, 
    nombre: str,
    estado: str,
    municipio: str,
    direccion: str,
    marcas: list[str],
) -> Tienda:
    # Initialize default fields
    fields = {
        "id": str(uuid.uuid4()),
        "nombre": nombre,
        "estado": estado,
        "municipio": municipio,
        "direccion": direccion,
        "marcas": marcas,
    }
    tienda = await tienda_repo.create(db, **fields)
    
    await audit.record(
        db,
        actor_id=actor.id,
        accion="tienda.create",
        entidad="tienda",
        entidad_id=tienda.id,
        payload=fields,
    )
    return tienda


async def recalculate_compliance(db: AsyncSession, tienda_id: str) -> None:
    """
    Called whenever a tramite changes state.
    Uses the canonical Architecture Doc formula:
    cumplimiento = (vigentes / total) * 100
    - >= 80%: vigente
    - >= 50%: en_riesgo
    - < 50%: critico
    """
    tienda = await tienda_repo.get_by_id(db, tienda_id)
    if not tienda:
        return

    counts = await tramite_repo.count_by_tienda_and_estado(db, tienda_id)
    total = sum(counts.values())
    vigentes = counts.get("vigente", 0) + counts.get("en_espera_resolucion", 0)
    vencidos = counts.get("vencido", 0)
    por_vencer = counts.get("por_vencer", 0)

    if total == 0:
        cumplimiento = 100.0
        estado_cumplimiento = "vigente"
    else:
        cumplimiento = (vigentes / total) * 100.0
        if cumplimiento >= 80:
            estado_cumplimiento = "vigente"
        elif cumplimiento >= 50:
            estado_cumplimiento = "en_riesgo"
        else:
            estado_cumplimiento = "critico"

    await tienda_repo.update(
        db,
        tienda,
        total_tramites=total,
        tramites_vencidos=vencidos,
        tramites_por_vencer=por_vencer,
        cumplimiento=cumplimiento,
        estado_cumplimiento=estado_cumplimiento,
    )
