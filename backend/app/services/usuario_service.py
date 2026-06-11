import itertools
from datetime import datetime, timedelta

from dateutil.relativedelta import relativedelta
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core import audit
from app.core.exceptions import ConflictError, NotFoundError
from app.core.security import hash_password
from app.models.alerta import Alerta
from app.models.documento import Documento
from app.models.tienda import Tienda
from app.models.tramite import Tramite
from app.models.usuario import Usuario
from app.repositories import historial_repo, usuario_repo
from app.schemas.performance import (
    ActivityTimelineItem,
    MetricTrend,
    PerformanceData,
    PerformanceMetrics,
    RangeType,
)
from app.schemas.usuario import TiendaResumen, UsuarioResumenTiendas
from app.services.historial_service import _generate_detalle


async def get_by_id(db: AsyncSession, id: str) -> Usuario:
    user = await usuario_repo.get_by_id(db, id)
    if not user:
        raise NotFoundError("Usuario no encontrado")
    return user


async def get_many(
    db: AsyncSession, *, rol: str | None = None, search: str | None = None
) -> list[Usuario]:
    return await usuario_repo.get_many(db, rol=rol, search=search)


async def create(
    db: AsyncSession,
    *,
    nombre: str,
    email: str,
    password: str,
    rol: str,
    actor: Usuario,
) -> Usuario:
    existing = await usuario_repo.get_by_email(db, email)
    if existing:
        raise ConflictError("Ya existe un usuario con este email")

    import uuid

    new_user = await usuario_repo.create_user(
        db,
        id=str(uuid.uuid4()),
        nombre=nombre,
        email=email,
        password_hash=hash_password(password),
        rol=rol,
    )

    await audit.record(
        db,
        actor_id=actor.id,
        accion="usuario.create",
        entidad="usuario",
        entidad_id=new_user.id,
        payload={"nombre": nombre, "email": email, "rol": rol},
    )
    return new_user


async def update_status(
    db: AsyncSession, id: str, *, estado: str, actor: Usuario
) -> Usuario:
    user = await get_by_id(db, id)

    if user.id == actor.id:
        raise ConflictError("No puedes cambiar tu propio estado")

    user = await usuario_repo.update_user(db, user, estado=estado)

    await audit.record(
        db,
        actor_id=actor.id,
        accion="usuario.update_status",
        entidad="usuario",
        entidad_id=user.id,
        payload={"estado": estado},
    )
    return user


async def update_tiendas(
    db: AsyncSession, id: str, *, tienda_ids: list[str], actor: Usuario
) -> Usuario:
    user = await get_by_id(db, id)

    if user.rol != "OPERATOR":
        raise ConflictError("Solo se pueden asignar tiendas a operadores")

    await usuario_repo.set_assigned_tiendas(db, user.id, tienda_ids)

    # Refresh to load the relation
    user = await get_by_id(db, id)

    await audit.record(
        db,
        actor_id=actor.id,
        accion="usuario.update_tiendas",
        entidad="usuario",
        entidad_id=user.id,
        payload={"tienda_ids": tienda_ids},
    )
    return user


async def delete_usuario(db: AsyncSession, id: str, *, actor: Usuario) -> None:
    u = await get_by_id(db, id)
    await usuario_repo.delete_user(db, u)
    await audit.record(
        db,
        actor_id=actor.id,
        accion="usuario.delete",
        entidad="usuario",
        entidad_id=id,
        payload={},
    )


async def get_tiendas_resumen(db: AsyncSession, id: str) -> list[UsuarioResumenTiendas]:
    u = await get_by_id(db, id)
    tiendas = u.tiendas
    result = []
    for estado, group in itertools.groupby(tiendas, key=lambda t: t.estado):
        tiendas_list = list(group)
        result.append(
            UsuarioResumenTiendas(
                estado=estado,
                total_tiendas=len(tiendas_list),
                vigentes=sum(
                    1 for t in tiendas_list if t.estado_cumplimiento == "vigente"
                ),
                en_riesgo=sum(
                    1 for t in tiendas_list if t.estado_cumplimiento == "en_riesgo"
                ),
                criticas=sum(
                    1 for t in tiendas_list if t.estado_cumplimiento == "critico"
                ),
                tiendas=[TiendaResumen.model_validate(t) for t in tiendas_list],
            )
        )

    return result


def _get_trend(current: float, previous: float, lower_is_better: bool = False) -> str:
    if current == previous:
        return "neutral"
    if lower_is_better:
        return "down" if current < previous else "up"
    return "up" if current > previous else "down"


async def _compute_metrics(
    db: AsyncSession,
    tienda_ids: list[str],
    start: datetime,
    end: datetime,
    records: list,
) -> dict:
    mttr = 0.0
    tasa_renovacion = 0.0
    incidencia = 0.0
    resolucion = 0.0

    if not tienda_ids:
        return {
            "mttr": mttr,
            "proactiva": tasa_renovacion,
            "incidencia": incidencia,
            "resolucion": resolucion,
        }

    alerta_ids_resuelta = [
        h.entidad_id for h in records if h.accion == "alerta.resuelta" and h.entidad_id
    ]
    if alerta_ids_resuelta:
        stmt = select(
            func.avg(Alerta.fecha_resolucion - Alerta.fecha_generacion)
        ).where(Alerta.id.in_(alerta_ids_resuelta), Alerta.fecha_resolucion.isnot(None))
        avg_td = (await db.execute(stmt)).scalar()
        if avg_td:
            mttr = round(avg_td.total_seconds() / 86400.0, 1)

    tramite_ids_edited = list(
        {h.entidad_id for h in records if h.entidad == "tramite" and h.entidad_id}
    )
    if tramite_ids_edited:
        vigente_count = 0
        for t_id in tramite_ids_edited:
            t = await db.get(Tramite, t_id)
            if t and t.estado == "vigente" and t.fecha_vencimiento:
                if (t.fecha_vencimiento - end.date()).days > 30:
                    vigente_count += 1
        tasa_renovacion = round((vigente_count / len(tramite_ids_edited)) * 100.0, 1)

    total_tramites = (
        await db.execute(
            select(func.count(Tramite.id)).where(Tramite.tienda_id.in_(tienda_ids))
        )
    ).scalar() or 0
    alerts_generated_crit = (
        await db.execute(
            select(func.count(Alerta.id)).where(
                Alerta.tienda_id.in_(tienda_ids),
                Alerta.fecha_generacion >= start,
                Alerta.fecha_generacion <= end,
                Alerta.severidad == "critical",
            )
        )
    ).scalar() or 0

    if total_tramites > 0:
        incidencia = round((alerts_generated_crit / (total_tramites / 100.0)), 1)

    alerts_generated_total = (
        await db.execute(
            select(func.count(Alerta.id)).where(
                Alerta.tienda_id.in_(tienda_ids),
                Alerta.fecha_generacion >= start,
                Alerta.fecha_generacion <= end,
            )
        )
    ).scalar() or 0

    resolved_count = len(alerta_ids_resuelta)
    if alerts_generated_total > 0:
        resolucion = round(
            min(100.0, (resolved_count / alerts_generated_total) * 100.0), 1
        )
    elif resolved_count > 0:
        resolucion = 100.0

    return {
        "mttr": mttr,
        "proactiva": tasa_renovacion,
        "incidencia": incidencia,
        "resolucion": resolucion,
    }


async def get_performance(
    db: AsyncSession, id: str, *, range: RangeType
) -> PerformanceData:
    now = datetime.now()
    if range == RangeType.CURR_MONTH:
        period_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        prev_period_start = period_start - relativedelta(months=1)
        prev_period_end = prev_period_start + (now - period_start)
    else:
        days = int(range)
        period_start = now - timedelta(days=days)
        prev_period_start = period_start - timedelta(days=days)
        prev_period_end = period_start

    current_records = await historial_repo.get_by_actor(
        db,
        id,
        since=period_start,
        until=now,
    )
    prev_records = await historial_repo.get_by_actor(
        db,
        id,
        since=prev_period_start,
        until=prev_period_end,
    )

    user = await get_by_id(db, id)
    tienda_ids = [t.id for t in user.tiendas]

    curr_metrics = await _compute_metrics(
        db, tienda_ids, period_start, now, current_records
    )
    prev_metrics = await _compute_metrics(
        db, tienda_ids, prev_period_start, prev_period_end, prev_records
    )

    timeline = []
    for h in current_records:
        tienda_nombre = "Sistema"
        tienda_id = ""
        tramite_nombre = None
        tramite_id = None

        if h.entidad == "tienda":
            t = await db.get(Tienda, h.entidad_id)
            if t:
                tienda_nombre = t.nombre
                tienda_id = t.id
        elif h.entidad == "tramite":
            tr = await db.get(Tramite, h.entidad_id)
            if tr:
                tramite_nombre = tr.nombre
                tramite_id = tr.id
                t = await db.get(Tienda, tr.tienda_id)
                if t:
                    tienda_nombre = t.nombre
                    tienda_id = t.id
        elif h.entidad == "documento":
            doc = await db.get(Documento, h.entidad_id)
            if doc and doc.tramite_id:
                tr = await db.get(Tramite, doc.tramite_id)
                if tr:
                    tramite_nombre = tr.nombre
                    tramite_id = tr.id
                    t = await db.get(Tienda, tr.tienda_id)
                    if t:
                        tienda_nombre = t.nombre
                        tienda_id = t.id
        elif h.entidad == "alerta":
            a = await db.get(Alerta, h.entidad_id)
            if a:
                t = await db.get(Tienda, a.tienda_id)
                if t:
                    tienda_nombre = t.nombre
                    tienda_id = t.id
                if a.tramite_id:
                    tr = await db.get(Tramite, a.tramite_id)
                    if tr:
                        tramite_nombre = tr.nombre
                        tramite_id = tr.id

        if not tienda_id:
            continue

        timeline.append(
            ActivityTimelineItem(
                id=h.id,
                accion=_generate_detalle(h),
                fecha=h.timestamp.isoformat(),
                tienda_id=tienda_id,
                tienda_nombre=tienda_nombre,
                tramite_id=tramite_id,
                tramite_nombre=tramite_nombre,
            )
        )

    return PerformanceData(
        metrics=PerformanceMetrics(
            tiempo_medio_resolucion_alertas=MetricTrend(
                value=curr_metrics["mttr"],
                previous_value=prev_metrics["mttr"],
                trend=_get_trend(
                    curr_metrics["mttr"], prev_metrics["mttr"], lower_is_better=True
                ),
            ),
            tasa_renovacion_proactiva=MetricTrend(
                value=curr_metrics["proactiva"],
                previous_value=prev_metrics["proactiva"],
                trend=_get_trend(curr_metrics["proactiva"], prev_metrics["proactiva"]),
            ),
            tasa_incidencia_alertas=MetricTrend(
                value=curr_metrics["incidencia"],
                previous_value=prev_metrics["incidencia"],
                trend=_get_trend(
                    curr_metrics["incidencia"],
                    prev_metrics["incidencia"],
                    lower_is_better=True,
                ),
            ),
            tasa_resolucion_alertas=MetricTrend(
                value=curr_metrics["resolucion"],
                previous_value=prev_metrics["resolucion"],
                trend=_get_trend(
                    curr_metrics["resolucion"], prev_metrics["resolucion"]
                ),
            ),
        ),
        timeline=timeline,
    )
