from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import UnauthorizedError
from app.core.security import create_access_token, decode_token, verify_password
from app.models.usuario import Usuario
from app.repositories import usuario_repo


async def login(db: AsyncSession, email: str, password: str) -> tuple[str, Usuario]:
    user = await usuario_repo.get_by_email(db, email)
    if not user:
        raise UnauthorizedError("Credenciales incorrectas")

    if not verify_password(password, user.password_hash):
        raise UnauthorizedError("Credenciales incorrectas")

    if user.estado != "activo":
        raise UnauthorizedError("El usuario no está activo")

    token = create_access_token({"sub": user.id})
    return token, user


async def get_user_from_token(db: AsyncSession, token: str) -> Usuario:
    payload = decode_token(token)
    user_id = payload.get("sub")
    if not user_id:
        raise UnauthorizedError("Token inválido")

    user = await usuario_repo.get_by_id(db, user_id)
    if not user:
        raise UnauthorizedError("Usuario no encontrado")

    if user.estado != "activo":
        raise UnauthorizedError("El usuario no está activo")

    return user
