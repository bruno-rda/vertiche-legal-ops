from pydantic import BaseModel, ConfigDict


class TiendaUpdate(BaseModel):
    nombre: str | None = None
    estado: str | None = None
    municipio: str | None = None
    direccion: str | None = None


class TiendaOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    nombre: str
    estado: str
    municipio: str
    direccion: str
    marcas: list[str]
    cumplimiento: float
    estado_cumplimiento: str
    total_tramites: int
    tramites_vencidos: int
    tramites_por_vencer: int
    ultima_actualizacion: str


class ExpedienteOut(BaseModel):
    id: str
    tienda_id: str
    tramites: list["TramiteOut"]
    cumplimiento: float
    ultima_actualizacion: str


from app.schemas.tramite import TramiteOut  # noqa: E402

ExpedienteOut.model_rebuild()
