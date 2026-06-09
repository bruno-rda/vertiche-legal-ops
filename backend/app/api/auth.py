from fastapi import APIRouter

from app.api.deps import CurrentUser, DbSession
from app.schemas.auth import LoginRequest, LoginResponse
from app.schemas.usuario import UsuarioOut
from app.services import auth_service

router = APIRouter()


@router.post("/login", response_model=LoginResponse)
async def login(db: DbSession, creds: LoginRequest):
    token, user = await auth_service.login(db, creds.email, creds.password)
    # The frontend expects a list of IDs for tiendas_asignadas
    tiendas_asignadas = [t.id for t in user.tiendas]
    return {
        "token": token,
        "user": {
            "id": user.id,
            "nombre": user.nombre,
            "email": user.email,
            "rol": user.rol,
            "tiendas_asignadas": tiendas_asignadas,
            "fecha_creacion": user.created_at.isoformat(),
            "estado": user.estado,
        },
    }


@router.get("/me", response_model=UsuarioOut)
async def get_me(current_user: CurrentUser):
    tiendas_asignadas = [t.id for t in current_user.tiendas]
    return {
        "id": current_user.id,
        "nombre": current_user.nombre,
        "email": current_user.email,
        "rol": current_user.rol,
        "tiendas_asignadas": tiendas_asignadas,
        "fecha_creacion": current_user.created_at.isoformat(),
        "estado": current_user.estado,
    }
