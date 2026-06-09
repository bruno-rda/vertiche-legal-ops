from sqlalchemy import Select, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.associations import usuario_tiendas
from app.models.tienda import Tienda


async def get_by_id(db: AsyncSession, tienda_id: str) -> Tienda | None:
    stmt = select(Tienda).where(Tienda.id == tienda_id)
    result = await db.execute(stmt)
    return result.scalar_one_or_none()


def _apply_filters(
    stmt: Select,
    *,
    search: str | None = None,
    estado: str | None = None,
    estado_cumplimiento: str | None = None,
    operador_id: str | None = None,
    allowed_ids: list[str] | None = None,
) -> Select:
    if allowed_ids is not None:
        stmt = stmt.where(Tienda.id.in_(allowed_ids))

    if search:
        pattern = f"%{search.lower()}%"
        stmt = stmt.where(
            Tienda.nombre.ilike(pattern) | Tienda.municipio.ilike(pattern)
        )
    if estado:
        stmt = stmt.where(Tienda.estado == estado)
    if estado_cumplimiento:
        stmt = stmt.where(Tienda.estado_cumplimiento == estado_cumplimiento)

    if operador_id == "unassigned":
        assigned_subq = select(usuario_tiendas.c.tienda_id).distinct().scalar_subquery()
        stmt = stmt.where(Tienda.id.notin_(assigned_subq))
    elif operador_id:
        stmt = stmt.where(
            Tienda.id.in_(
                select(usuario_tiendas.c.tienda_id).where(
                    usuario_tiendas.c.usuario_id == operador_id
                )
            )
        )

    return stmt


def _apply_sort(stmt: Select, sort_by: str, sort_order: str) -> Select:
    column_map = {
        "nombre": Tienda.nombre,
        "cumplimiento": Tienda.cumplimiento,
        "tramites_vencidos": Tienda.tramites_vencidos,
    }
    column = column_map.get(sort_by, Tienda.nombre)

    if sort_order == "desc":
        stmt = stmt.order_by(column.desc())
    else:
        stmt = stmt.order_by(column.asc())

    return stmt


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
    allowed_ids: list[str] | None = None,
) -> tuple[list[Tienda], int]:
    base = select(Tienda)
    base = _apply_filters(
        base,
        search=search,
        estado=estado,
        estado_cumplimiento=estado_cumplimiento,
        operador_id=operador_id,
        allowed_ids=allowed_ids,
    )

    count_stmt = select(func.count()).select_from(base.subquery())
    total = (await db.execute(count_stmt)).scalar_one()

    base = _apply_sort(base, sort_by, sort_order)
    base = base.offset((page - 1) * page_size).limit(page_size)

    result = await db.execute(base)
    return list(result.scalars().all()), total


async def update(db: AsyncSession, tienda: Tienda, **fields: object) -> Tienda:
    for key, value in fields.items():
        setattr(tienda, key, value)
    await db.flush()
    return tienda


async def get_all(
    db: AsyncSession, *, allowed_ids: list[str] | None = None
) -> list[Tienda]:
    stmt = select(Tienda)
    if allowed_ids is not None:
        stmt = stmt.where(Tienda.id.in_(allowed_ids))
    result = await db.execute(stmt)
    return list(result.scalars().all())
