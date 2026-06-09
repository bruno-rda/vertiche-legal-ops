from pydantic import BaseModel, ConfigDict


class AlertaSilenciarRequest(BaseModel):
    duracion_dias: int
    nota: str | None = None


class AlertaOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    tipo: str
    severidad: str
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
    notificaciones_enviadas: dict | None = None


class AlertaCountOut(BaseModel):
    count: int
