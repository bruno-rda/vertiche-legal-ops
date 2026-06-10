from enum import StrEnum

from pydantic import BaseModel, ConfigDict


class DocumentoUpdate(BaseModel):
    tramite_ids: list[str] | None = None


class DocumentoRename(BaseModel):
    nombre_archivo: str


class EstadoOCR(StrEnum):
    PROCESANDO = "procesando"
    COMPLETADO = "completado"
    BAJA_CONFIANZA = "baja_confianza"
    ERROR = "error"


class CampoExtraidoDocumento(BaseModel):
    value: str
    confidence: float


class DocumentoOcrReview(BaseModel):
    datos_extraidos: dict[str, str]


class Documento(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    tramite_ids: list[str]
    tramite_nombres: list[str] | None = None
    nombre_archivo: str
    url: str
    estado_ocr: EstadoOCR
    datos_extraidos: dict[str, CampoExtraidoDocumento] | None = None
    requiere_revision_manual: bool
    cargado_por: str
    cargado_por_nombre: str | None = None
    cargado_en: str
    tienda_id: str | None = None
    tienda_nombre: str | None = None
