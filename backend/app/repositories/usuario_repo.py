from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.associations import usuario_tiendas
from app.models.usuario import Usuario


async def get_by_id(db: AsyncSession, user_id: str) -> Usuario | None:
    stmt = (
        select(Usuario)
        .options(selectinload(Usuario.tiendas))
        .where(Usuario.id == user_id)
    )
    result = await db.execute(stmt)
    return result.scalar_one_or_none()


async def get_by_email(db: AsyncSession, email: str) -> Usuario | None:
    stmt = (
        select(Usuario)
        .options(selectinload(Usuario.tiendas))
        .where(Usuario.email == email)
    )
    result = await db.execute(stmt)
    return result.scalar_one_or_none()


async def get_many(
    db: AsyncSession,
    *,
    rol: str | None = None,
    search: str | None = None,
) -> list[Usuario]:
    stmt = select(Usuario).options(selectinload(Usuario.tiendas))

    if rol:
        stmt = stmt.where(Usuario.rol == rol)
    if search:
        pattern = f"%{search.lower()}%"
        stmt = stmt.where(Usuario.nombre.ilike(pattern) | Usuario.email.ilike(pattern))

    stmt = stmt.order_by(Usuario.nombre)
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def create(
    db: AsyncSession,
    *,
    id: str,
    nombre: str,
    email: str,
    password_hash: str,
    rol: str,
) -> Usuario:
    user = Usuario(
        id=id,
        nombre=nombre,
        email=email,
        password_hash=password_hash,
        rol=rol,
        estado="activo",
    )
    db.add(user)
    await db.flush()
    return user


async def update(db: AsyncSession, user: Usuario, **fields: object) -> Usuario:
    for key, value in fields.items():
        setattr(user, key, value)
    await db.flush()
    return user


async def delete_user(db: AsyncSession, user: Usuario) -> None:
    await db.delete(user)
    await db.flush()


async def get_assigned_tienda_ids(db: AsyncSession, user_id: str) -> list[str]:
    stmt = select(usuario_tiendas.c.tienda_id).where(
        usuario_tiendas.c.usuario_id == user_id
    )
    result = await db.execute(stmt)
    return [row[0] for row in result.all()]


async def set_assigned_tiendas(
    db: AsyncSession, user_id: str, tienda_ids: list[str]
) -> None:
    await db.execute(
        delete(usuario_tiendas).where(usuario_tiendas.c.usuario_id == user_id)
    )
    if tienda_ids:
        await db.execute(
            usuario_tiendas.insert(),
            [{"usuario_id": user_id, "tienda_id": tid} for tid in tienda_ids],
        )
    await db.flush()
