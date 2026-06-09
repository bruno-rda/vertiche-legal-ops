import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from app.core import audit, storage
from app.core.exceptions import NotFoundError
from app.models.documento import Documento
from app.models.usuario import Usuario
from app.repositories import documento_repo, tramite_repo


async def _get_allowed_tienda_ids(current_user: Usuario) -> list[str] | None:
    if current_user.rol == "OPERATOR":
        return [t.id for t in current_user.tiendas]
    return None


async def get_by_id(db: AsyncSession, id: str, *, current_user: Usuario) -> Documento:
    allowed_ids = await _get_allowed_tienda_ids(current_user)
    doc = await documento_repo.get_by_id(db, id)

    if not doc:
        raise NotFoundError("Documento no encontrado")
    if (
        allowed_ids is not None
        and doc.tienda_id is not None
        and doc.tienda_id not in allowed_ids
    ):
        raise NotFoundError("Documento no encontrado")

    return doc


async def get_many(
    db: AsyncSession,
    *,
    page: int = 1,
    page_size: int = 25,
    estado_ocr: str | None = None,
    requiere_revision: bool | None = None,
    tienda_id: str | None = None,
    tramite_id: str | None = None,
    current_user: Usuario,
) -> tuple[list[Documento], int]:
    allowed_ids = await _get_allowed_tienda_ids(current_user)
    return await documento_repo.get_many(
        db,
        page=page,
        page_size=page_size,
        estado_ocr=estado_ocr,
        requiere_revision=requiere_revision,
        tienda_id=tienda_id,
        tramite_id=tramite_id,
        allowed_tienda_ids=allowed_ids,
    )


async def create_from_upload(
    db: AsyncSession,
    *,
    file_content: bytes,
    filename: str,
    actor: Usuario,
) -> Documento:
    # 1. Save file to disk
    relative_path = await storage.save_file(file_content, filename)

    # 2. Create database record
    doc_id = str(uuid.uuid4())
    doc = await documento_repo.create(
        db,
        id=doc_id,
        nombre_archivo=filename,
        url=relative_path,
        cargado_por=actor.id,
    )

    await audit.record(
        db,
        actor_id=actor.id,
        accion="documento.upload",
        entidad="documento",
        entidad_id=doc.id,
        payload={"filename": filename},
    )

    return doc


async def update_tramites(
    db: AsyncSession, id: str, *, tramite_ids: list[str], actor: Usuario
) -> Documento:
    doc = await get_by_id(db, id, current_user=actor)

    # verify user has access to these tramites, and they belong to the same store if any
    allowed_ids = await _get_allowed_tienda_ids(actor)
    tienda_ids_found = set()
    for t_id in tramite_ids:
        t = await tramite_repo.get_by_id(db, t_id)
        if not t:
            raise NotFoundError(f"Tramite {t_id} no encontrado")
        if allowed_ids is not None and t.tienda_id not in allowed_ids:
            raise NotFoundError(f"Tramite {t_id} no encontrado")
        tienda_ids_found.add(t.tienda_id)

    if len(tienda_ids_found) > 1:
        raise ValueError(
            "Un documento no puede estar asociado a trámites de diferentes tiendas"
        )

    new_tienda_id = tienda_ids_found.pop() if tienda_ids_found else None

    # update the DB
    await documento_repo.set_tramite_ids(db, doc.id, tramite_ids)
    if doc.tienda_id != new_tienda_id:
        doc = await documento_repo.update(db, doc, tienda_id=new_tienda_id)

    # refresh to get relationships
    doc = await get_by_id(db, doc.id, current_user=actor)

    await audit.record(
        db,
        actor_id=actor.id,
        accion="documento.update_tramites",
        entidad="documento",
        entidad_id=doc.id,
        payload={"tramite_ids": tramite_ids},
    )

    return doc


async def rename(
    db: AsyncSession, id: str, *, nombre_archivo: str, actor: Usuario
) -> Documento:
    doc = await get_by_id(db, id, current_user=actor)
    doc = await documento_repo.update(db, doc, nombre_archivo=nombre_archivo)

    await audit.record(
        db,
        actor_id=actor.id,
        accion="documento.rename",
        entidad="documento",
        entidad_id=doc.id,
        payload={"nombre_archivo": nombre_archivo},
    )
    return doc


async def accept_ocr_review(
    db: AsyncSession, id: str, *, datos_extraidos: dict, actor: Usuario
) -> Documento:
    doc = await get_by_id(db, id, current_user=actor)

    # Wrap incoming values with confidence
    enriched_data = {}
    for key, val in datos_extraidos.items():
        enriched_data[key] = {"value": val, "confidence": 1.0}

    doc = await documento_repo.update(
        db,
        doc,
        datos_extraidos=enriched_data,
        estado_ocr="completado",
        requiere_revision_manual=False,
    )

    await audit.record(
        db,
        actor_id=actor.id,
        accion="documento.ocr_review",
        entidad="documento",
        entidad_id=doc.id,
        payload={"keys_reviewed": list(datos_extraidos.keys())},
    )
    return doc
