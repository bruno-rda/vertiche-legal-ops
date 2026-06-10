from fastapi import APIRouter, Request

from app.api.deps import CurrentUser, DbSession
from app.core import storage
from app.core.pagination import PaginatedResponse, paginate
from app.schemas.documento import (
    Documento,
    DocumentoOcrReview,
    DocumentoRename,
    DocumentoUpdate,
    DocumentoUrl,
)
from app.services import documento_service

router = APIRouter()


def _serialize_documento(d) -> dict:
    return {
        "id": d.id,
        "tramite_ids": [t.id for t in getattr(d, "tramites", [])],
        "tramite_nombres": [t.nombre for t in getattr(d, "tramites", [])],
        "nombre_archivo": d.nombre_archivo,
        "ruta_archivo": d.ruta_archivo,
        "estado_ocr": d.estado_ocr,
        "datos_extraidos": d.datos_extraidos,
        "requiere_revision_manual": d.requiere_revision_manual,
        "cargado_por": d.cargado_por,
        "cargado_por_nombre": getattr(d.uploader, "nombre", None)
        if hasattr(d, "uploader")
        else None,
        "cargado_en": d.created_at.isoformat(),
        "tienda_id": d.tienda_id,
        "tienda_nombre": getattr(d.tienda, "nombre", None)
        if hasattr(d, "tienda")
        else None,
    }


@router.get("", response_model=PaginatedResponse[Documento])
async def list_documentos(
    db: DbSession,
    current_user: CurrentUser,
    page: int = 1,
    page_size: int = 25,
    estado_ocr: str | None = None,
    requiere_revision: bool | None = None,
    tienda_id: str | None = None,
    tramite_id: str | None = None,
):
    items, total = await documento_service.get_many(
        db,
        page=page,
        page_size=page_size,
        estado_ocr=estado_ocr,
        requiere_revision=requiere_revision,
        tienda_id=tienda_id,
        tramite_id=tramite_id,
        current_user=current_user,
    )
    return paginate([_serialize_documento(d) for d in items], total, page, page_size)


@router.get("/{id}", response_model=Documento)
async def get_documento(db: DbSession, id: str, current_user: CurrentUser):
    doc = await documento_service.get_by_id(db, id, current_user=current_user)
    return _serialize_documento(doc)


@router.get("/{id}/url", response_model=DocumentoUrl)
async def get_documento_url(
    request: Request, db: DbSession, id: str, download: bool, current_user: CurrentUser
):
    doc = await documento_service.get_by_id(db, id, current_user=current_user)
    if not doc.ruta_archivo:
        return {"url": ""}
    storage_client = request.app.state.storage_client
    url = await storage.get_presigned_url(storage_client, doc.ruta_archivo, download=download)
    return {"url": url}


@router.patch("/{id}", response_model=Documento)
async def update_documento(
    db: DbSession, id: str, data: DocumentoUpdate, current_user: CurrentUser
):
    doc = await documento_service.get_by_id(db, id, current_user=current_user)
    if data.tramite_ids is not None:
        doc = await documento_service.update_tramites(
            db, id, tramite_ids=data.tramite_ids, actor=current_user
        )
    return _serialize_documento(doc)


@router.post("/{id}/rename", response_model=Documento)
async def rename_documento(
    db: DbSession, id: str, data: DocumentoRename, current_user: CurrentUser
):
    doc = await documento_service.rename(
        db, id, nombre_archivo=data.nombre_archivo, actor=current_user
    )
    return _serialize_documento(doc)


@router.post("/{id}/ocr-review", response_model=Documento)
async def accept_ocr_review(
    db: DbSession, id: str, data: DocumentoOcrReview, current_user: CurrentUser
):
    doc = await documento_service.accept_ocr_review(
        db, id, datos_extraidos=data.datos_extraidos, actor=current_user
    )
    return _serialize_documento(doc)


@router.delete("/{id}", status_code=204)
async def delete_documento(
    request: Request, db: DbSession, id: str, current_user: CurrentUser
):
    storage_client = request.app.state.storage_client
    await documento_service.delete(
        db, id, storage_client=storage_client, actor=current_user
    )
