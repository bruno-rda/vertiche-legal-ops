import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.historial import Historial


async def record(
    db: AsyncSession,
    *,
    actor_id: str,
    accion: str,
    entidad: str,
    entidad_id: str,
    payload: dict,
) -> None:
    entry = Historial(
        id=str(uuid.uuid4()),
        actor_id=actor_id,
        accion=accion,
        entidad=entidad,
        entidad_id=entidad_id,
        payload=payload,
    )
    db.add(entry)
    await db.flush()
