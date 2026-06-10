from fastapi import APIRouter

from app.api.alertas import _serialize_alerta
from app.api.deps import CurrentUser, DbSession
from app.api.tramites import _serialize_tramite
from app.schemas.alerta import AlertaOut
from app.schemas.dashboard import CumplimientoEstadoOut, DashboardMetricsOut
from app.schemas.tramite import TramiteOut
from app.services import alerta_service, dashboard_service, tramite_service

router = APIRouter()


@router.get("/metrics", response_model=DashboardMetricsOut)
async def get_metrics(db: DbSession, current_user: CurrentUser):
    metrics = await dashboard_service.get_metrics(db, current_user=current_user)
    return metrics


@router.get("/cumplimiento-por-estado", response_model=list[CumplimientoEstadoOut])
async def get_estado_geografico(db: DbSession, current_user: CurrentUser):
    data = await dashboard_service.get_estado_geografico(db, current_user=current_user)
    return data


@router.get("/alertas-recientes", response_model=list[AlertaOut])
async def get_alertas_recientes(db: DbSession, current_user: CurrentUser):
    items = await alerta_service.get_many(db, resuelta=False, current_user=current_user)
    # Manually cutoff at 10, as repo doesnt support pagination
    return [_serialize_alerta(a) for a in items[:10]]


@router.get("/tramites-proximos", response_model=list[TramiteOut])
async def get_tramites_proximos(db: DbSession, current_user: CurrentUser):
    items, total = await tramite_service.get_many(
        db, current_user=current_user, estado="por_vencer", page_size=10
    )
    return [_serialize_tramite(t) for t in items]
