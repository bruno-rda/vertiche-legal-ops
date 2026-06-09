from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, DateTime, ForeignKey, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

if TYPE_CHECKING:
    from app.models.tienda import Tienda
    from app.models.tramite import Tramite


class Alerta(Base):
    __tablename__ = "alertas"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    tipo: Mapped[str] = mapped_column(String(30), index=True)
    severidad: Mapped[str] = mapped_column(String(20), index=True)
    tienda_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("tiendas.id", ondelete="CASCADE"), index=True
    )
    tramite_id: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("tramites.id", ondelete="SET NULL")
    )
    documento_id: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("documentos.id", ondelete="SET NULL")
    )
    mensaje: Mapped[str] = mapped_column(Text)

    fecha_generacion: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    silenciada: Mapped[bool] = mapped_column(Boolean, default=False)
    silenciada_hasta: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    silenciada_por: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("usuarios.id", ondelete="SET NULL")
    )
    resuelta: Mapped[bool] = mapped_column(Boolean, default=False)
    fecha_resolucion: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    resuelta_por: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("usuarios.id", ondelete="SET NULL")
    )
    notificaciones_enviadas: Mapped[dict | None] = mapped_column(
        JSONB, default=lambda: {"email": False, "whatsapp": False}
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), onupdate=func.now()
    )

    tienda: Mapped[Tienda] = relationship(
        "Tienda", back_populates="alertas", lazy="raise"
    )
    tramite: Mapped[Tramite | None] = relationship("Tramite", lazy="raise")
