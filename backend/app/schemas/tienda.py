from enum import StrEnum

from pydantic import BaseModel, ConfigDict


class TiendaUpdate(BaseModel):
    nombre: str | None = None
    estado: str | None = None
    municipio: str | None = None
    direccion: str | None = None


class TiendaEstadoCumplimiento(StrEnum):
    VIGENTE = "vigente"
    EN_RIESGO = "en_riesgo"
    CRITICO = "critico"


class Tienda(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    nombre: str
    estado: str
    municipio: str
    direccion: str
    marcas: list[str]
    cumplimiento: float
    estado_cumplimiento: TiendaEstadoCumplimiento
    total_tramites: int
    tramites_vencidos: int
    tramites_por_vencer: int
    ultima_actualizacion: str


class Expediente(BaseModel):
    id: str
    tienda_id: str
    tramites: list["Tramite"]
    cumplimiento: float
    ultima_actualizacion: str


from app.schemas.tramite import Tramite  # noqa: E402

Expediente.model_rebuild()
