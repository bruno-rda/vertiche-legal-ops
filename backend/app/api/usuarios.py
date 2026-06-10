from typing import Literal

from fastapi import APIRouter

from app.api.deps import DbSession, RequireAdmin
from app.schemas.usuario import (
    UsuarioCreate,
    UsuarioOut,
    UsuarioPerformanceOut,
    UsuarioResumenTiendasOut,
    UsuarioStatusUpdate,
    UsuarioTiendasUpdate,
)
from app.services import usuario_service

router = APIRouter()


@router.get("", response_model=list[UsuarioOut])
async def list_usuarios(
    db: DbSession,
    _: RequireAdmin,
    rol: str | None = None,
    search: str | None = None,
):
    users = await usuario_service.get_many(db, rol=rol, search=search)
    return [
        {
            "id": u.id,
            "nombre": u.nombre,
            "email": u.email,
            "rol": u.rol,
            "tiendas_asignadas": [t.id for t in u.tiendas],
            "fecha_creacion": u.created_at.isoformat(),
            "estado": u.estado,
        }
        for u in users
    ]


@router.post("", response_model=UsuarioOut, status_code=201)
async def create_usuario(db: DbSession, data: UsuarioCreate, admin: RequireAdmin):
    # In a real app, send an email to set password. For now, we default it to "password"
    user = await usuario_service.create(
        db,
        nombre=data.nombre,
        email=data.email,
        password="password",
        rol=data.rol,
        actor=admin,
    )
    return {
        "id": user.id,
        "nombre": user.nombre,
        "email": user.email,
        "rol": user.rol,
        "tiendas_asignadas": [],
        "fecha_creacion": user.created_at.isoformat(),
        "estado": user.estado,
    }


@router.get("/{id}", response_model=UsuarioOut)
async def get_usuario(db: DbSession, id: str, admin: RequireAdmin):
    u = await usuario_service.get_by_id(db, id)
    return {
        "id": u.id,
        "nombre": u.nombre,
        "email": u.email,
        "rol": u.rol,
        "tiendas_asignadas": [t.id for t in u.tiendas],
        "fecha_creacion": u.created_at.isoformat(),
        "estado": u.estado,
    }


@router.delete("/{id}", status_code=204)
async def delete_usuario(db: DbSession, id: str, admin: RequireAdmin):
    await usuario_service.delete_usuario(db, id, actor=admin)


@router.get("/{id}/tiendas-resumen", response_model=list[UsuarioResumenTiendasOut])
async def get_tiendas_resumen(db: DbSession, id: str, admin: RequireAdmin):
    return await usuario_service.get_tiendas_resumen(db, id)


@router.get("/{id}/performance", response_model=UsuarioPerformanceOut)
async def get_performance(
    db: DbSession, id: str, range: Literal["30", "month", "90"], admin: RequireAdmin
):
    return await usuario_service.get_performance(db, id, range=range)


@router.put("/{id}/status", response_model=UsuarioOut)
async def update_status(
    db: DbSession, id: str, data: UsuarioStatusUpdate, admin: RequireAdmin
):
    user = await usuario_service.update_status(db, id, estado=data.estado, actor=admin)
    return {
        "id": user.id,
        "nombre": user.nombre,
        "email": user.email,
        "rol": user.rol,
        "tiendas_asignadas": [t.id for t in user.tiendas],
        "fecha_creacion": user.created_at.isoformat(),
        "estado": user.estado,
    }


@router.put("/{id}/tiendas", response_model=UsuarioOut)
async def update_tiendas(
    db: DbSession, id: str, data: UsuarioTiendasUpdate, admin: RequireAdmin
):
    user = await usuario_service.update_tiendas(
        db, id, tienda_ids=data.tiendas_asignadas, actor=admin
    )
    return {
        "id": user.id,
        "nombre": user.nombre,
        "email": user.email,
        "rol": user.rol,
        "tiendas_asignadas": [t.id for t in user.tiendas],
        "fecha_creacion": user.created_at.isoformat(),
        "estado": user.estado,
    }
