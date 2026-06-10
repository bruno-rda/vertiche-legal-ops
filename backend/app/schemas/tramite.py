from enum import StrEnum

from pydantic import BaseModel, ConfigDict

from app.schemas.alerta import AlertaSeveridad
from app.schemas.documento import Documento
from app.schemas.historial import HistorialItem


class Observacion(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    descripcion: str
    severidad: AlertaSeveridad
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


class TramiteTipo(StrEnum):
    FEDERAL = "federal"
    ESTATAL = "estatal"
    MUNICIPAL = "municipal"


class TramiteEstado(StrEnum):
    PENDIENTE_DOCUMENTACION = "pendiente_documentacion"
    EN_REVISION = "en_revision"
    PRESENTADO = "presentado"
    EN_ESPERA_RESOLUCION = "en_espera_resolucion"
    VIGENTE = "vigente"
    POR_VENCER = "por_vencer"
    VENCIDO = "vencido"


class TramitePeriodoRecurrencia(StrEnum):
    ANUAL = "anual"
    BIANUAL = "bianual"


class Tramite(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    tienda_id: str
    tienda_nombre: str | None = None
    nombre: str
    tipo: TramiteTipo
    estado: TramiteEstado
    fecha_inicio: str
    fecha_vencimiento: str
    es_permanente: bool | None = None
    es_recurrente: bool
    periodo_recurrencia: TramitePeriodoRecurrencia | None = None
    observaciones: list[Observacion] = []
    documentos: list[Documento] = []
    historial: list[HistorialItem] = []
    asignado_a: str | None = None


class TramiteResumen(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    nombre: str
    tipo: TramiteTipo
    estado: TramiteEstado
    fecha_vencimiento: str