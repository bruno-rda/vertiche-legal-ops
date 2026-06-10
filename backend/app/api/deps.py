from typing import Annotated

from fastapi import Depends
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import ForbiddenError
from app.database import get_db
from app.models.usuario import Usuario
from app.services import auth_service

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

DbSession = Annotated[AsyncSession, Depends(get_db)]
TokenDep = Annotated[str, Depends(oauth2_scheme)]


async def get_current_user(db: DbSession, token: TokenDep) -> Usuario:
    return await auth_service.get_user_from_token(db, token)


CurrentUser = Annotated[Usuario, Depends(get_current_user)]


def require_roles(allowed_roles: list[str]):
    def role_checker(current_user: CurrentUser) -> Usuario:
        if current_user.rol not in allowed_roles:
            raise ForbiddenError("No tienes permisos suficientes")
        return current_user

    return Depends(role_checker)


RequireAdmin = Annotated[Usuario, require_roles(["ADMIN"])]
RequireOperator = Annotated[Usuario, require_roles(["ADMIN", "OPERATOR"])]
