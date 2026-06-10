from typing import Literal

from pydantic import BaseModel, ConfigDict


class UsuarioCreate(BaseModel):
    nombre: str
    email: str
    rol: Literal["ADMIN", "OPERATOR", "VIEWER"]


class UsuarioStatusUpdate(BaseModel):
    estado: Literal["activo", "inactivo"]


class UsuarioTiendasUpdate(BaseModel):
    tiendas_asignadas: list[str]


class UsuarioOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    nombre: str
    email: str
    rol: str
    tiendas_asignadas: list[str] | None = None
    fecha_creacion: str
    estado: str


class TiendaResumen(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    nombre: str
    municipio: str
    estado_cumplimiento: str


class UsuarioResumenTiendasOut(BaseModel):
    estado: str
    total_tiendas: int
    vigentes: int
    por_vencer: int
    criticas: int
    tiendas: list[TiendaResumen]


class MetricTrend(BaseModel):
    value: int
    previous_value: int
    trend: str


class UsuarioPerformanceMetrics(BaseModel):
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


class UsuarioPerformanceOut(BaseModel):
    metrics: UsuarioPerformanceMetrics
    timeline: list[ActivityTimelineItem]
