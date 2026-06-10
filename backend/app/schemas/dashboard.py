from pydantic import BaseModel


class DashboardMetrics(BaseModel):
    total_tiendas: int
    en_cumplimiento: int
    por_vencer: int
    en_riesgo_critico: int
    porcentaje_cumplimiento: int


class CumplimientoEstado(BaseModel):
    estado: str
    total_tiendas: int
    cumplimiento: int
    tramites_criticos: int
