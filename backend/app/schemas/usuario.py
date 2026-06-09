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
