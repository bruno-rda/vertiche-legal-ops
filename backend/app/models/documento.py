from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, DateTime, ForeignKey, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.associations import documento_tramites

if TYPE_CHECKING:
    from app.models.tienda import Tienda
    from app.models.tramite import Tramite
    from app.models.usuario import Usuario


class Documento(Base):
    __tablename__ = "documentos"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    nombre_archivo: Mapped[str] = mapped_column(String(500))
    url: Mapped[str] = mapped_column(Text)
    estado_ocr: Mapped[str] = mapped_column(String(30), default="procesando")
    datos_extraidos: Mapped[dict | None] = mapped_column(JSONB)
    requiere_revision_manual: Mapped[bool] = mapped_column(Boolean, default=False)

    cargado_por: Mapped[str] = mapped_column(
        String(36), ForeignKey("usuarios.id", ondelete="SET NULL")
    )
    tienda_id: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("tiendas.id", ondelete="SET NULL"), index=True
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), onupdate=func.now()
    )

    uploader: Mapped[Usuario] = relationship(
        "Usuario", lazy="raise", foreign_keys=[cargado_por]
    )
    tienda: Mapped[Tienda | None] = relationship("Tienda", lazy="raise")
    tramites: Mapped[list[Tramite]] = relationship(
        "Tramite",
        secondary=documento_tramites,
        back_populates="documentos",
        lazy="raise",
    )
