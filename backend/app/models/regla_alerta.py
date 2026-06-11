from __future__ import annotations

from typing import TYPE_CHECKING

from sqlalchemy import Boolean, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

if TYPE_CHECKING:
    from app.models.alerta import Alerta


class ReglaAlerta(Base):
    __tablename__ = "reglas_alerta"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    codigo_regla: Mapped[str] = mapped_column(String(100), unique=True, index=True)
    nombre: Mapped[str] = mapped_column(String(255))
    dias_antes_vencimiento: Mapped[int | None] = mapped_column(Integer)
    severidad: Mapped[str] = mapped_column(String(20))
    canal: Mapped[str] = mapped_column(String(20))
    aplica_a_estado: Mapped[str | None] = mapped_column(String(50))
    activa: Mapped[bool] = mapped_column(Boolean, default=True)

    alertas: Mapped[list[Alerta]] = relationship(
        "Alerta", back_populates="regla", lazy="raise"
    )
