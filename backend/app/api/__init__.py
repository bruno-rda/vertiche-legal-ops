from fastapi import APIRouter

from app.api import (
    alertas,
    auth,
    dashboard,
    documentos,
    tiendas,
    tramites,
    usuarios,
)

api_router = APIRouter()
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(alertas.router, prefix="/alertas", tags=["alertas"])
api_router.include_router(dashboard.router, prefix="/dashboard", tags=["dashboard"])
api_router.include_router(documentos.router, prefix="/documentos", tags=["documentos"])
api_router.include_router(tiendas.router, prefix="/tiendas", tags=["tiendas"])
api_router.include_router(tramites.router, prefix="/tramites", tags=["tramites"])
api_router.include_router(usuarios.router, prefix="/usuarios", tags=["usuarios"])
