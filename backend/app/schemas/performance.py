from typing import Literal

from pydantic import BaseModel


class MetricTrendOut(BaseModel):
    value: float
    previous_value: float
    trend: Literal["up", "down", "neutral"]


class PerformanceMetricsOut(BaseModel):
    documentos_cargados: MetricTrendOut
    tramites_resueltos: MetricTrendOut
    alertas_atendidas: MetricTrendOut
    tiempo_promedio_resolucion: MetricTrendOut
    tramites_vencidos_responsabilidad: MetricTrendOut


class ActivityTimelineItemOut(BaseModel):
    id: str
    accion: str
    fecha: str
    tienda_id: str
    tienda_nombre: str
    tramite_id: str | None = None
    tramite_nombre: str | None = None


class PerformanceDataOut(BaseModel):
    metrics: PerformanceMetricsOut
    timeline: list[ActivityTimelineItemOut]
