from datetime import date, timedelta

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.tienda import Tienda
from app.models.tramite import Tramite


async def get_by_id(db: AsyncSession, tramite_id: str) -> Tramite | None:
    stmt = (
        select(Tramite)
        .options(
            selectinload(Tramite.tienda),
            selectinload(Tramite.documentos),
            selectinload(Tramite.observaciones),
        )
        .where(Tramite.id == tramite_id)
    )
    result = await db.execute(stmt)
    return result.scalar_one_or_none()


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
    allowed_tienda_ids: list[str] | None = None,
) -> tuple[list[Tramite], int]:
    stmt = (
        select(Tramite)
        .join(Tramite.tienda)
        .options(
            selectinload(Tramite.tienda),
            selectinload(Tramite.documentos),
            selectinload(Tramite.observaciones),
        )
    )

    if allowed_tienda_ids is not None:
        stmt = stmt.where(Tramite.tienda_id.in_(allowed_tienda_ids))

    if search:
        pattern = f"%{search.lower()}%"
        stmt = stmt.where(Tramite.nombre.ilike(pattern) | Tienda.nombre.ilike(pattern))
    if estado:
        stmt = stmt.where(Tramite.estado == estado)
    if tipo:
        stmt = stmt.where(Tramite.tipo == tipo)
    if estado_geografico:
        stmt = stmt.where(Tienda.estado == estado_geografico)

    if solo_vencidos:
        stmt = stmt.where(Tramite.estado == "vencido")

    if por_vencer_dias is not None:
        limit_date = date.today() + timedelta(days=por_vencer_dias)
        stmt = stmt.where(
            (Tramite.fecha_vencimiento <= limit_date) & (Tramite.estado != "vencido")
        )

    count_stmt = select(func.count()).select_from(stmt.subquery())
    total = (await db.execute(count_stmt)).scalar_one()

    stmt = stmt.order_by(Tramite.fecha_vencimiento.asc().nulls_last())
    stmt = stmt.offset((page - 1) * page_size).limit(page_size)

    result = await db.execute(stmt)
    return list(result.scalars().all()), total


async def get_by_tienda(db: AsyncSession, tienda_id: str) -> list[Tramite]:
    stmt = select(Tramite).where(Tramite.tienda_id == tienda_id)
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def create(db: AsyncSession, **fields: object) -> Tramite:
    tramite = Tramite(**fields)
    db.add(tramite)
    await db.flush()
    return tramite


async def update(db: AsyncSession, tramite: Tramite, **fields: object) -> Tramite:
    for key, value in fields.items():
        setattr(tramite, key, value)
    await db.flush()
    return tramite


async def get_expiring(db: AsyncSession, *, within_days: int) -> list[Tramite]:
    limit_date = date.today() + timedelta(days=within_days)
    stmt = select(Tramite).where(
        (not Tramite.es_permanente) & (Tramite.fecha_vencimiento <= limit_date)
    )
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def count_by_tienda_and_estado(
    db: AsyncSession, tienda_id: str
) -> dict[str, int]:
    stmt = (
        select(Tramite.estado, func.count(Tramite.id))
        .where(Tramite.tienda_id == tienda_id)
        .group_by(Tramite.estado)
    )
    result = await db.execute(stmt)
    return {row[0]: row[1] for row in result.all()}
