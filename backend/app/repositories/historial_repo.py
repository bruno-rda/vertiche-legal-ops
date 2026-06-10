from datetime import datetime

from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.alerta import Alerta
from app.models.associations import documento_tramites
from app.models.documento import Documento
from app.models.historial import Historial
from app.models.tramite import Tramite


async def get_for_context(
    db: AsyncSession, context_type: str, context_id: str
) -> list[Historial]:
    if context_type == "tienda":
        stmt = (
            select(Historial)
            .outerjoin(
                Documento,
                (Historial.entidad == "documento")
                & (Historial.entidad_id == Documento.id),
            )
            .outerjoin(
                Tramite,
                (Historial.entidad == "tramite") & (Historial.entidad_id == Tramite.id),
            )
            .outerjoin(
                Alerta,
                (Historial.entidad == "alerta") & (Historial.entidad_id == Alerta.id),
            )
            .where(
                or_(
                    (Historial.entidad == "tienda")
                    & (Historial.entidad_id == context_id),
                    (Documento.tienda_id == context_id),
                    (Tramite.tienda_id == context_id),
                    (Alerta.tienda_id == context_id),
                )
            )
        )
    elif context_type == "tramite":
        stmt = (
            select(Historial)
            .outerjoin(
                Documento,
                (Historial.entidad == "documento")
                & (Historial.entidad_id == Documento.id),
            )
            .outerjoin(
                documento_tramites, Documento.id == documento_tramites.c.documento_id
            )
            .where(
                or_(
                    (Historial.entidad == "tramite")
                    & (Historial.entidad_id == context_id),
                    (documento_tramites.c.tramite_id == context_id),
                )
            )
        )
    else:
        # Fallback for simple entities
        stmt = select(Historial).where(
            (Historial.entidad == context_type) & (Historial.entidad_id == context_id)
        )

    stmt = stmt.order_by(Historial.timestamp.desc())
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def get_by_actor(
    db: AsyncSession, actor_id: str, *, since: datetime, until: datetime
) -> list[Historial]:
    stmt = (
        select(Historial)
        .where(
            (Historial.actor_id == actor_id)
            & (Historial.timestamp >= since)
            & (Historial.timestamp <= until)
        )
        .order_by(Historial.timestamp.desc())
    )
    result = await db.execute(stmt)
    return list(result.scalars().all())
