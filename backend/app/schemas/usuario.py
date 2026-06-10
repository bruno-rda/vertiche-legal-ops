from enum import StrEnum

from pydantic import BaseModel, ConfigDict


class UsuarioRol(StrEnum):
    ADMIN = "ADMIN"
    OPERATOR = "OPERATOR"
    VIEWER = "VIEWER"


class UsuarioEstado(StrEnum):
    ACTIVO = "activo"
    INACTIVO = "inactivo"


class UsuarioCreate(BaseModel):
    nombre: str
    email: str
    rol: UsuarioRol


class UsuarioStatusUpdate(BaseModel):
    estado: UsuarioEstado


class UsuarioTiendasUpdate(BaseModel):
    tiendas_asignadas: list[str]


class Usuario(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    nombre: str
    email: str
    rol: UsuarioRol
    tiendas_asignadas: list[str] | None = None
    fecha_creacion: str
    estado: UsuarioEstado


class TiendaResumen(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    nombre: str
    municipio: str
    estado_cumplimiento: str


class UsuarioResumenTiendas(BaseModel):
    estado: str
    total_tiendas: int
    vigentes: int
    por_vencer: int
    criticas: int
    tiendas: list[TiendaResumen]
