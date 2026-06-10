import itertools
from datetime import datetime, timedelta

from dateutil.relativedelta import relativedelta
from sqlalchemy.ext.asyncio import AsyncSession

from app.core import audit
from app.core.exceptions import ConflictError, NotFoundError
from app.core.security import hash_password
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

    new_user = await usuario_repo.create(
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

    user = await usuario_repo.update(db, user, estado=estado)

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
    await usuario_repo.delete(db, u)
    await audit.record(
        db,
        actor_id=actor.id,
        accion="usuario.delete",
        entidad="usuario",
        entidad_id=id,
        payload={},
    )


async def get_tiendas_resumen(db: AsyncSession, id: str) -> UsuarioResumenTiendas:
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
                por_vencer=sum(
                    1 for t in tiendas_list if t.estado_cumplimiento == "por_vencer"
                ),
                criticas=sum(
                    1 for t in tiendas_list if t.estado_cumplimiento == "critico"
                ),
                tiendas=[TiendaResumen.model_validate(t) for t in tiendas_list],
            )
        )


async def get_performance(
    db: AsyncSession, id: str, *, range: RangeType
) -> PerformanceData:
    if range == RangeType.CURR_MONTH:
        now = datetime.now()
        period_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        prev_period_start = period_start - relativedelta(months=1)
        prev_period_end = prev_period_start + (now - period_start)

    else:
        days = int(range)
        period_start = datetime.now() - timedelta(days=days)
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

    return PerformanceData(
        metrics=PerformanceMetrics(
            documentos_cargados=MetricTrend(0, 0, "neutral"),
            tramites_resueltos=MetricTrend(0, 0, "neutral"),
            alertas_atendidas=MetricTrend(0, 0, "neutral"),
            tiempo_promedio_resolucion=MetricTrend(0, 0, "neutral"),
            tramites_vencidos_responsabilidad=MetricTrend(0, 0, "neutral"),
        ),
        timeline=[
            ActivityTimelineItem(
                id="0",
                accion="test",
                fecha=datetime.now().isoformat(),
                tienda_id="0",
                tienda_nombre="Dont click me",
            )
        ],
    )
