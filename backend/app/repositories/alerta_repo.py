from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.alerta import Alerta
from app.models.tienda import Tienda
from app.models.tramite import Tramite


async def get_by_id(db: AsyncSession, alerta_id: str) -> Alerta | None:
    stmt = (
        select(Alerta)
        .options(selectinload(Alerta.tienda), selectinload(Alerta.tramite))
        .where(Alerta.id == alerta_id)
    )
    result = await db.execute(stmt)
    return result.scalar_one_or_none()


async def get_many(
    db: AsyncSession,
    *,
    severidad: str | None = None,
    tipo: str | None = None,
    silenciada: bool | None = None,
    resuelta: bool | None = None,
    tienda_id: str | None = None,
    search: str | None = None,
    allowed_tienda_ids: list[str] | None = None,
) -> list[Alerta]:
    stmt = select(Alerta).options(
        selectinload(Alerta.tienda), selectinload(Alerta.tramite)
    )

    if allowed_tienda_ids is not None:
        stmt = stmt.where(Alerta.tienda_id.in_(allowed_tienda_ids))

    if severidad:
        stmt = stmt.where(Alerta.severidad == severidad)
    if tipo:
        stmt = stmt.where(Alerta.tipo == tipo)
    if silenciada is not None:
        stmt = stmt.where(Alerta.silenciada == silenciada)
    if resuelta is not None:
        stmt = stmt.where(Alerta.resuelta == resuelta)
    if tienda_id:
        stmt = stmt.where(Alerta.tienda_id == tienda_id)

    if search:
        pattern = f"%{search.lower()}%"
        stmt = stmt.outerjoin(Alerta.tienda).outerjoin(Alerta.tramite)
        stmt = stmt.where(
            Alerta.mensaje.ilike(pattern)
            | Tienda.nombre.ilike(pattern)
            | Tramite.nombre.ilike(pattern)
        )

    stmt = stmt.order_by(Alerta.fecha_generacion.desc())
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def get_by_tienda(db: AsyncSession, tienda_id: str) -> list[Alerta]:
    stmt = (
        select(Alerta)
        .where(Alerta.tienda_id == tienda_id)
        .order_by(Alerta.fecha_generacion.desc())
    )
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def count_active_critical(
    db: AsyncSession, *, allowed_tienda_ids: list[str] | None = None
) -> int:
    stmt = select(func.count()).where(
        (Alerta.severidad == "critical")
        & (not Alerta.silenciada)
        & (not Alerta.resuelta)
    )
    if allowed_tienda_ids is not None:
        stmt = stmt.where(Alerta.tienda_id.in_(allowed_tienda_ids))

    return (await db.execute(stmt)).scalar_one()


async def create(db: AsyncSession, **fields: object) -> Alerta:
    alerta = Alerta(**fields)
    db.add(alerta)
    await db.flush()
    return alerta


async def update(db: AsyncSession, alerta: Alerta, **fields: object) -> Alerta:
    for key, value in fields.items():
        setattr(alerta, key, value)
    await db.flush()
    return alerta


async def find_open_for_tramite(db: AsyncSession, tramite_id: str) -> Alerta | None:
    stmt = select(Alerta).where(
        (Alerta.tramite_id == tramite_id) & (not Alerta.resuelta)
        # Assuming we don't want to duplicate even if it's silenced
    )
    result = await db.execute(stmt)
    return result.scalar_one_or_none()
