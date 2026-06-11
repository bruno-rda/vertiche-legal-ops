from enum import StrEnum

from pydantic import BaseModel, ConfigDict


class AlertaSilenciarRequest(BaseModel):
    duracion_dias: int
    nota: str | None = None


class AlertaSeveridad(StrEnum):
    INFO = "info"
    WARNING = "warning"
    CRITICAL = "critical"


class AlertaTipo(StrEnum):
    VENCIMIENTO_PROXIMO = "vencimiento_proximo"
    VENCIDO = "vencido"
    INCONSISTENCIA = "inconsistencia"
    BAJA_CONFIANZA_OCR = "baja_confianza_ocr"
    ESTADO_TRAMITE = "estado_tramite"


class AlertaNotificacionSend(BaseModel):
    email: bool
    whatsapp: bool


class Alerta(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    tipo: AlertaTipo
    severidad: AlertaSeveridad
    tienda_id: str
    tienda_nombre: str | None = None
    tramite_id: str | None = None
    tramite_nombre: str | None = None
    documento_id: str | None = None
    mensaje: str
    fecha_generacion: str
    silenciada: bool
    silenciada_hasta: str | None = None
    silenciada_por: str | None = None
    resuelta: bool
    fecha_resolucion: str | None = None
    resuelta_por: str | None = None
    notificaciones_enviadas: AlertaNotificacionSend | None = None


class AlertaCount(BaseModel):
    count: int
