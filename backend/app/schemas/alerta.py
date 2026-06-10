from typing import Literal

from pydantic import BaseModel, ConfigDict


class AlertaSilenciarRequest(BaseModel):
    duracion_dias: int
    nota: str | None = None


AlertaSeveridad = Literal["info", "warning", "critical"]
AlertaTipo = Literal[
    "vencimiento_proximo",
    "vencido",
    "inconsistencia",
    "baja_confianza_ocr",
]


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
