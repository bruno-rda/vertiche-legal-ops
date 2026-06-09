from datetime import datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.historial import Historial


async def get_by_entity(
    db: AsyncSession, entidad: str, entidad_id: str
) -> list[Historial]:
    stmt = (
        select(Historial)
        .where((Historial.entidad == entidad) & (Historial.entidad_id == entidad_id))
        .order_by(Historial.timestamp.desc())
    )
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def get_by_actor(
    db: AsyncSession, actor_id: str, *, since: datetime, limit: int = 100
) -> list[Historial]:
    stmt = (
        select(Historial)
        .where((Historial.actor_id == actor_id) & (Historial.timestamp >= since))
        .order_by(Historial.timestamp.desc())
        .limit(limit)
    )
    result = await db.execute(stmt)
    return list(result.scalars().all())
