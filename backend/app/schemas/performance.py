from typing import Literal

from pydantic import BaseModel


class MetricTrend(BaseModel):
    value: float
    previous_value: float
    trend: Literal["up", "down", "neutral"]


class PerformanceMetrics(BaseModel):
    documentos_cargados: MetricTrend
    tramites_resueltos: MetricTrend
    alertas_atendidas: MetricTrend
    tiempo_promedio_resolucion: MetricTrend
    tramites_vencidos_responsabilidad: MetricTrend


class ActivityTimelineItem(BaseModel):
    id: str
    accion: str
    fecha: str
    tienda_id: str
    tienda_nombre: str
    tramite_id: str | None = None
    tramite_nombre: str | None = None


class PerformanceData(BaseModel):
    metrics: PerformanceMetrics
    timeline: list[ActivityTimelineItem]
