from sqlalchemy import Column, ForeignKey, String, Table

from app.database import Base

usuario_tiendas = Table(
    "usuario_tiendas",
    Base.metadata,
    Column(
        "usuario_id",
        String(36),
        ForeignKey("usuarios.id", ondelete="CASCADE"),
        primary_key=True,
    ),
    Column(
        "tienda_id",
        String(36),
        ForeignKey("tiendas.id", ondelete="CASCADE"),
        primary_key=True,
    ),
)

documento_tramites = Table(
    "documento_tramites",
    Base.metadata,
    Column(
        "documento_id",
        String(36),
        ForeignKey("documentos.id", ondelete="CASCADE"),
        primary_key=True,
    ),
    Column(
        "tramite_id",
        String(36),
        ForeignKey("tramites.id", ondelete="CASCADE"),
        primary_key=True,
    ),
)
