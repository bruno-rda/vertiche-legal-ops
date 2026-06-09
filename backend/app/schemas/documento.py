from pydantic import BaseModel, ConfigDict


class DocumentoUpdate(BaseModel):
    tramite_ids: list[str] | None = None


class DocumentoRename(BaseModel):
    nombre_archivo: str


class DocumentoOcrReview(BaseModel):
    datos_extraidos: dict[str, str]


class DocumentoOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    tramite_ids: list[str]
    tramite_nombres: list[str] | None = None
    nombre_archivo: str
    url: str
    estado_ocr: str
    datos_extraidos: dict | None = None
    requiere_revision_manual: bool
    cargado_por: str
    cargado_por_nombre: str | None = None
    cargado_en: str
    tienda_id: str | None = None
    tienda_nombre: str | None = None
