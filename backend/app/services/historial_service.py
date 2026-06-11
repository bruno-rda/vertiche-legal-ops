from sqlalchemy.ext.asyncio import AsyncSession

from app.models.historial import Historial
from app.repositories import historial_repo
from app.schemas.historial import HistorialItem


def _generate_detalle(h: Historial) -> str:
    payload = h.payload or {}
    if h.accion == "documento.upload":
        return f"Documento subido: {payload.get('filename', '')}"
    if h.accion == "documento.rename":
        return f"Documento renombrado: {payload.get('nombre_archivo', '')}"
    if h.accion == "documento.update_tramites":
        return "Trámites de documento actualizados"
    if h.accion == "documento.ocr_review":
        return "Revisión OCR de documento completada"
    if h.accion == "alerta.resuelta":
        return "Alerta resuelta"
    if h.accion == "alerta.silenciada":
        return "Alerta silenciada"
    if h.accion == "tramite.create":
        return f"Trámite creado: {payload.get('nombre', '')}"
    if h.accion == "tramite.editado":
        return "Trámite editado"
    if h.accion == "tienda.creada":
        return "Tienda creada"
    if h.accion == "tienda.editada":
        return "Tienda editada"
    if h.accion == "documento.ocr_processed":
        return f"OCR procesado. Requiere revisión: {payload.get('requiere_revision', '')}"
    if h.accion == "documento.llm_extracted":
        return f"Información extraída del OCR. Confianza: {payload.get('confianza', '')}"
    return h.accion


async def get_history(
    db: AsyncSession, context_type: str, context_id: str
) -> list[HistorialItem]:
    hist_records = await historial_repo.get_for_context(db, context_type, context_id)

    formatted = []
    for h in hist_records:
        usuario_nombre = "Sistema"
        if h.actor:
            usuario_nombre = h.actor.nombre
        elif h.actor_id:
            usuario_nombre = h.actor_id

        formatted.append(
            HistorialItem(
                id=h.id,
                entidad_tipo=h.entidad,
                entidad_id=h.entidad_id,
                accion=h.accion,
                usuario_id=h.actor_id or "system",
                usuario_nombre=usuario_nombre,
                fecha=h.timestamp.isoformat(),
                detalle=_generate_detalle(h),
            )
        )

    return formatted
