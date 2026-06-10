from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, String, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

if TYPE_CHECKING:
    from app.models.usuario import Usuario

from app.database import Base


class Historial(Base):
    __tablename__ = "historial"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    actor_id: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("usuarios.id", ondelete="SET NULL")
    )
    actor: Mapped["Usuario | None"] = relationship("Usuario", lazy="joined")
    accion: Mapped[str] = mapped_column(String(100), index=True)
    entidad: Mapped[str] = mapped_column(String(50), index=True)
    entidad_id: Mapped[str] = mapped_column(String(36), index=True)
    payload: Mapped[dict | None] = mapped_column(JSONB, default=dict)
    timestamp: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
