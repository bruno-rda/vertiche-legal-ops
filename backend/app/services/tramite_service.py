from datetime import date

from sqlalchemy.ext.asyncio import AsyncSession

from app.core import audit
from app.core.exceptions import NotFoundError
from app.models.tramite import Tramite
from app.models.usuario import Usuario
from app.repositories import tramite_repo
from app.services import tienda_service


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
    tipo: str | None = None,
    estado_geografico: str | None = None,
    solo_vencidos: bool = False,
    por_vencer_dias: int | None = None,
    current_user: Usuario,
) -> tuple[list[Tramite], int]:
    allowed_ids = await _get_allowed_tienda_ids(current_user)
    return await tramite_repo.get_many(
        db,
        page=page,
        page_size=page_size,
        search=search,
        estado=estado,
        tipo=tipo,
        estado_geografico=estado_geografico,
        solo_vencidos=solo_vencidos,
        por_vencer_dias=por_vencer_dias,
        allowed_tienda_ids=allowed_ids,
    )


async def get_by_tienda(
    db: AsyncSession, *, tienda_id: str, current_user: Usuario
) -> list[Tramite]:
    allowed_ids = await _get_allowed_tienda_ids(current_user)
    if allowed_ids is not None and tienda_id not in allowed_ids:
        raise NotFoundError("Trámites no encontrados")

    return await tramite_repo.get_by_tienda(db, tienda_id)


async def get_by_id(db: AsyncSession, id: str, *, current_user: Usuario) -> Tramite:
    allowed_ids = await _get_allowed_tienda_ids(current_user)
    tramite = await tramite_repo.get_by_id(db, id)

    if not tramite:
        raise NotFoundError("Trámite no encontrado")
    if allowed_ids is not None and tramite.tienda_id not in allowed_ids:
        raise NotFoundError("Trámite no encontrado")

    return tramite


async def create(
    db: AsyncSession, *, tienda_id: str, actor: Usuario, **fields: object
) -> Tramite:
    allowed_ids = await _get_allowed_tienda_ids(current_user=actor)
    if allowed_ids is not None and tienda_id not in allowed_ids:
        raise NotFoundError("Tienda no encontrada")

    import uuid

    if fields.get("fecha_inicio"):
        fields["fecha_inicio"] = date.fromisoformat(fields["fecha_inicio"])
    if fields.get("fecha_vencimiento"):
        fields["fecha_vencimiento"] = date.fromisoformat(fields["fecha_vencimiento"])

    # Determine initial status
    estado = "vigente"
    if fields.get("fecha_vencimiento"):
        days = (fields["fecha_vencimiento"] - date.today()).days
        if days < 0:
            estado = "vencido"
        elif days <= 30:
            estado = "por_vencer"

    tramite = await tramite_repo.create(
        db,
        id=str(uuid.uuid4()),
        tienda_id=tienda_id,
        estado=estado,
        **fields,
    )

    await audit.record(
        db,
        actor_id=actor.id,
        accion="tramite.create",
        entidad="tramite",
        entidad_id=tramite.id,
        payload={"tienda_id": tienda_id, "nombre": fields.get("nombre")},
    )

    await tienda_service.recalculate_compliance(db, tienda_id)
    return tramite


async def update(
    db: AsyncSession, id: str, *, actor: Usuario, **fields: object
) -> Tramite:
    tramite = await get_by_id(db, id, current_user=actor)

    update_payload = {}
    if "nombre" in fields and fields["nombre"] is not None:
        update_payload["nombre"] = fields["nombre"]
    if "fecha_inicio" in fields and fields["fecha_inicio"] is not None:
        update_payload["fecha_inicio"] = date.fromisoformat(fields["fecha_inicio"])
    if "fecha_vencimiento" in fields and fields["fecha_vencimiento"] is not None:
        update_payload["fecha_vencimiento"] = date.fromisoformat(
            fields["fecha_vencimiento"]
        )
    if "es_permanente" in fields and fields["es_permanente"] is not None:
        update_payload["es_permanente"] = fields["es_permanente"]

    # Re-evaluate status if dates changed
    if "fecha_vencimiento" in update_payload or "es_permanente" in update_payload:
        venc = update_payload.get("fecha_vencimiento", tramite.fecha_vencimiento)
        perm = update_payload.get("es_permanente", tramite.es_permanente)

        if perm or not venc:
            update_payload["estado"] = "vigente"
        else:
            days = (venc - date.today()).days
            if days < 0:
                update_payload["estado"] = "vencido"
            elif days <= 30:
                update_payload["estado"] = "por_vencer"
            else:
                update_payload["estado"] = "vigente"

    tramite = await tramite_repo.update(db, tramite, **update_payload)

    # stringify dates for json serialization
    json_payload = {
        k: v.isoformat() if isinstance(v, date) else v
        for k, v in update_payload.items()
    }

    await audit.record(
        db,
        actor_id=actor.id,
        accion="tramite.update",
        entidad="tramite",
        entidad_id=tramite.id,
        payload=json_payload,
    )

    if "estado" in update_payload:
        await tienda_service.recalculate_compliance(db, tramite.tienda_id)

    return tramite
