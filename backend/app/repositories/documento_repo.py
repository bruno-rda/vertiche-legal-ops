from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.associations import documento_tramites
from app.models.documento import Documento


async def get_by_id(db: AsyncSession, documento_id: str) -> Documento | None:
    stmt = (
        select(Documento)
        .options(
            selectinload(Documento.tramites),
            selectinload(Documento.uploader),
            selectinload(Documento.tienda),
        )
        .where(Documento.id == documento_id)
    )
    result = await db.execute(stmt)
    return result.scalar_one_or_none()


async def get_many(
    db: AsyncSession,
    *,
    page: int = 1,
    page_size: int = 25,
    estado_ocr: str | None = None,
    requiere_revision: bool | None = None,
    tienda_id: str | None = None,
    tramite_id: str | None = None,
    allowed_tienda_ids: list[str] | None = None,
) -> tuple[list[Documento], int]:
    stmt = select(Documento).options(
        selectinload(Documento.tramites),
        selectinload(Documento.uploader),
        selectinload(Documento.tienda),
    )

    if allowed_tienda_ids is not None:
        stmt = stmt.where(Documento.tienda_id.in_(allowed_tienda_ids))

    if estado_ocr:
        stmt = stmt.where(Documento.estado_ocr == estado_ocr)
    if requiere_revision is not None:
        stmt = stmt.where(Documento.requiere_revision_manual == requiere_revision)
    if tienda_id:
        stmt = stmt.where(Documento.tienda_id == tienda_id)
    if tramite_id:
        # Join the association table to filter by tramite_id
        stmt = stmt.join(documento_tramites).where(
            documento_tramites.c.tramite_id == tramite_id
        )

    count_stmt = select(func.count()).select_from(stmt.subquery())
    total = (await db.execute(count_stmt)).scalar_one()

    stmt = stmt.order_by(Documento.created_at.desc())
    stmt = stmt.offset((page - 1) * page_size).limit(page_size)

    result = await db.execute(stmt)
    return list(result.scalars().all()), total


async def get_by_tienda(db: AsyncSession, tienda_id: str) -> list[Documento]:
    stmt = select(Documento).where(Documento.tienda_id == tienda_id)
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def create(db: AsyncSession, **fields: object) -> Documento:
    doc = Documento(**fields)
    db.add(doc)
    await db.flush()
    return doc


async def update(db: AsyncSession, doc: Documento, **fields: object) -> Documento:
    for key, value in fields.items():
        setattr(doc, key, value)
    await db.flush()
    return doc


async def set_tramite_ids(
    db: AsyncSession, doc_id: str, tramite_ids: list[str]
) -> None:
    await db.execute(
        delete(documento_tramites).where(documento_tramites.c.documento_id == doc_id)
    )
    if tramite_ids:
        await db.execute(
            documento_tramites.insert(),
            [{"documento_id": doc_id, "tramite_id": tid} for tid in tramite_ids],
        )
    await db.flush()
