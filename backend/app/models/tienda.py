from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import ARRAY, DateTime, Float, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.associations import usuario_tiendas

if TYPE_CHECKING:
    from app.models.alerta import Alerta
    from app.models.tramite import Tramite
    from app.models.usuario import Usuario


class Tienda(Base):
    __tablename__ = "tiendas"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    nombre: Mapped[str] = mapped_column(String(255))
    estado: Mapped[str] = mapped_column(String(100), index=True)
    municipio: Mapped[str] = mapped_column(String(255))
    direccion: Mapped[str] = mapped_column(Text)
    marcas: Mapped[list[str] | None] = mapped_column(ARRAY(String), default=list)

    cumplimiento: Mapped[float] = mapped_column(Float, default=100.0)
    estado_cumplimiento: Mapped[str] = mapped_column(String(30), default="vigente")
    total_tramites: Mapped[int] = mapped_column(Integer, default=0)
    tramites_vencidos: Mapped[int] = mapped_column(Integer, default=0)
    tramites_por_vencer: Mapped[int] = mapped_column(Integer, default=0)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), onupdate=func.now(), server_default=func.now()
    )

    tramites: Mapped[list[Tramite]] = relationship(
        "Tramite", back_populates="tienda", lazy="raise"
    )
    alertas: Mapped[list[Alerta]] = relationship(
        "Alerta", back_populates="tienda", lazy="raise"
    )
    operadores: Mapped[list[Usuario]] = relationship(
        "Usuario",
        secondary=usuario_tiendas,
        back_populates="tiendas",
        lazy="raise",
    )
