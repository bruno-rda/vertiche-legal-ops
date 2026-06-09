from __future__ import annotations

from datetime import date, datetime
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, Date, DateTime, ForeignKey, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.associations import documento_tramites

if TYPE_CHECKING:
    from app.models.documento import Documento
    from app.models.observacion import Observacion
    from app.models.tienda import Tienda


class Tramite(Base):
    __tablename__ = "tramites"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    tienda_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("tiendas.id", ondelete="CASCADE"), index=True
    )
    nombre: Mapped[str] = mapped_column(String(255))
    tipo: Mapped[str] = mapped_column(String(20))
    estado: Mapped[str] = mapped_column(String(40), index=True)
    fecha_inicio: Mapped[date] = mapped_column(Date)
    fecha_vencimiento: Mapped[date | None] = mapped_column(Date)
    es_permanente: Mapped[bool] = mapped_column(Boolean, default=False)
    es_recurrente: Mapped[bool] = mapped_column(Boolean, default=False)
    periodo_recurrencia: Mapped[str | None] = mapped_column(String(50))
    asignado_a: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("usuarios.id", ondelete="SET NULL")
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), onupdate=func.now()
    )

    tienda: Mapped[Tienda] = relationship(
        "Tienda", back_populates="tramites", lazy="raise"
    )
    documentos: Mapped[list[Documento]] = relationship(
        "Documento",
        secondary=documento_tramites,
        back_populates="tramites",
        lazy="raise",
    )
    observaciones: Mapped[list[Observacion]] = relationship(
        "Observacion", back_populates="tramite", lazy="raise"
    )
