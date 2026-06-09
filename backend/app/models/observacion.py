from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

if TYPE_CHECKING:
    from app.models.tramite import Tramite


class Observacion(Base):
    __tablename__ = "observaciones"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    tramite_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("tramites.id", ondelete="CASCADE"), index=True
    )
    descripcion: Mapped[str] = mapped_column(Text)
    severidad: Mapped[str] = mapped_column(String(20))
    fecha: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    tramite: Mapped[Tramite] = relationship(
        "Tramite", back_populates="observaciones", lazy="raise"
    )
