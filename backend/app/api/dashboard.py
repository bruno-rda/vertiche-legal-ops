from fastapi import APIRouter

from app.api.deps import CurrentUser, DbSession
from app.schemas.dashboard import CumplimientoEstadoOut, DashboardMetricsOut
from app.services import dashboard_service

router = APIRouter()


@router.get("/metrics", response_model=DashboardMetricsOut)
async def get_metrics(db: DbSession, current_user: CurrentUser):
    metrics = await dashboard_service.get_metrics(db, current_user=current_user)
    return metrics


@router.get("/estado-geografico", response_model=list[CumplimientoEstadoOut])
async def get_estado_geografico(db: DbSession, current_user: CurrentUser):
    data = await dashboard_service.get_estado_geografico(db, current_user=current_user)
    return data
