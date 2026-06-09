from sqlalchemy.ext.asyncio import AsyncSession

from app.core import audit
from app.core.exceptions import ConflictError, NotFoundError
from app.core.security import hash_password
from app.models.usuario import Usuario
from app.repositories import usuario_repo


async def get_by_id(db: AsyncSession, id: str) -> Usuario:
    user = await usuario_repo.get_by_id(db, id)
    if not user:
        raise NotFoundError("Usuario no encontrado")
    return user


async def get_many(
    db: AsyncSession, *, rol: str | None = None, search: str | None = None
) -> list[Usuario]:
    return await usuario_repo.get_many(db, rol=rol, search=search)


async def create(
    db: AsyncSession,
    *,
    nombre: str,
    email: str,
    password: str,
    rol: str,
    actor: Usuario,
) -> Usuario:
    existing = await usuario_repo.get_by_email(db, email)
    if existing:
        raise ConflictError("Ya existe un usuario con este email")

    import uuid

    new_user = await usuario_repo.create(
        db,
        id=str(uuid.uuid4()),
        nombre=nombre,
        email=email,
        password_hash=hash_password(password),
        rol=rol,
    )

    await audit.record(
        db,
        actor_id=actor.id,
        accion="usuario.create",
        entidad="usuario",
        entidad_id=new_user.id,
        payload={"nombre": nombre, "email": email, "rol": rol},
    )
    return new_user


async def update_status(
    db: AsyncSession, id: str, *, estado: str, actor: Usuario
) -> Usuario:
    user = await get_by_id(db, id)

    if user.id == actor.id:
        raise ConflictError("No puedes cambiar tu propio estado")

    user = await usuario_repo.update(db, user, estado=estado)

    await audit.record(
        db,
        actor_id=actor.id,
        accion="usuario.update_status",
        entidad="usuario",
        entidad_id=user.id,
        payload={"estado": estado},
    )
    return user


async def update_tiendas(
    db: AsyncSession, id: str, *, tienda_ids: list[str], actor: Usuario
) -> Usuario:
    user = await get_by_id(db, id)

    if user.rol != "OPERATOR":
        raise ConflictError("Solo se pueden asignar tiendas a operadores")

    await usuario_repo.set_assigned_tiendas(db, user.id, tienda_ids)

    # Refresh to load the relation
    user = await get_by_id(db, id)

    await audit.record(
        db,
        actor_id=actor.id,
        accion="usuario.update_tiendas",
        entidad="usuario",
        entidad_id=user.id,
        payload={"tienda_ids": tienda_ids},
    )
    return user
