from pydantic import BaseModel, ConfigDict


class HistorialOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    entidad_tipo: str
    entidad_id: str
    accion: str
    usuario_id: str
    usuario_nombre: str
    fecha: str
    detalle: str | None = None
    valor_anterior: object | None = None
    valor_nuevo: object | None = None
