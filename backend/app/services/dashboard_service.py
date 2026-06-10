from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.tramite import Tramite
from app.models.usuario import Usuario
from app.repositories import tienda_repo


async def _get_allowed_tienda_ids(current_user: Usuario) -> list[str] | None:
    if current_user.rol == "OPERATOR":
        return [t.id for t in current_user.tiendas]
    return None


async def get_metrics(db: AsyncSession, *, current_user: Usuario) -> dict:
    allowed_ids = await _get_allowed_tienda_ids(current_user)

    tiendas = await tienda_repo.get_all(db, allowed_ids=allowed_ids)

    total_tiendas = len(tiendas)
    en_cumplimiento = sum(1 for t in tiendas if t.estado_cumplimiento == "vigente")
    en_riesgo_critico = sum(1 for t in tiendas if t.estado_cumplimiento == "critico")

    # Query total por_vencer across these tiendas
    stmt = select(func.count(Tramite.id)).where(Tramite.estado == "por_vencer")
    if allowed_ids is not None:
        stmt = stmt.where(Tramite.tienda_id.in_(allowed_ids))
    por_vencer = (await db.execute(stmt)).scalar_one()

    # Calculate global percentage
    porcentaje_cumplimiento = 0
    if total_tiendas > 0:
        total_cumplimiento = sum(t.cumplimiento for t in tiendas)
        porcentaje_cumplimiento = int(total_cumplimiento / total_tiendas)

    return {
        "total_tiendas": total_tiendas,
        "en_cumplimiento": en_cumplimiento,
        "por_vencer": por_vencer,
        "en_riesgo_critico": en_riesgo_critico,
        "porcentaje_cumplimiento": porcentaje_cumplimiento,
    }


async def get_estado_geografico(
    db: AsyncSession, *, current_user: Usuario
) -> list[dict]:
    allowed_ids = await _get_allowed_tienda_ids(current_user)
    tiendas = await tienda_repo.get_all(db, allowed_ids=allowed_ids)

    # Group by estado
    from collections import defaultdict

    estados = defaultdict(lambda: {"total": 0, "cumplimiento_sum": 0, "criticos": 0})
    for t in tiendas:
        st = estados[t.estado]
        st["total"] += 1
        st["cumplimiento_sum"] += t.cumplimiento
        if t.estado_cumplimiento == "critico":
            st["criticos"] += 1

    result = []
    for estado, data in estados.items():
        result.append(
            {
                "estado": estado,
                "total_tiendas": data["total"],
                "cumplimiento": int(data["cumplimiento_sum"] / data["total"]),
                "tramites_criticos": data["criticos"],
            }
        )

    result.sort(key=lambda x: x["cumplimiento"])
    return result
