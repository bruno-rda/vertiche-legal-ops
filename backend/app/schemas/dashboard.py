from pydantic import BaseModel


class DashboardMetricsOut(BaseModel):
    total_tiendas: int
    en_cumplimiento: int
    por_vencer: int
    en_riesgo_critico: int
    porcentaje_cumplimiento: int


class CumplimientoEstadoOut(BaseModel):
    estado: str
    total_tiendas: int
    cumplimiento: int
    tramites_criticos: int
