from pydantic import BaseModel, ConfigDict

from app.schemas.documento import DocumentoOut
from app.schemas.historial import HistorialOut


class ObservacionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    descripcion: str
    severidad: str
    fecha: str


class TramiteCreate(BaseModel):
    nombre: str
    tipo: str
    fecha_inicio: str
    fecha_vencimiento: str | None = None
    es_permanente: bool = False
    es_recurrente: bool = False
    periodo_recurrencia: str | None = None


class TramiteUpdate(BaseModel):
    nombre: str | None = None
    fecha_inicio: str | None = None
    fecha_vencimiento: str | None = None
    es_permanente: bool | None = None


class TramiteOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    tienda_id: str
    tienda_nombre: str | None = None
    nombre: str
    tipo: str
    estado: str
    fecha_inicio: str
    fecha_vencimiento: str
    es_permanente: bool | None = None
    es_recurrente: bool
    periodo_recurrencia: str | None = None
    observaciones: list[ObservacionOut] = []
    documentos: list[DocumentoOut] = []
    historial: list[HistorialOut] = []
    asignado_a: str | None = None
