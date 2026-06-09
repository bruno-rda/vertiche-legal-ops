from datetime import UTC, datetime, timedelta

import bcrypt
import jwt

from app.config import settings
from app.core.exceptions import UnauthorizedError


def hash_password(plain: str) -> str:
    return bcrypt.hashpw(plain.encode(), bcrypt.gensalt()).decode()


def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode(), hashed.encode())


def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expires_at = datetime.now(UTC) + timedelta(
        minutes=settings.access_token_expire_minutes
    )
    to_encode["exp"] = expires_at
    return jwt.encode(to_encode, settings.secret_key, algorithm="HS256")


def decode_token(token: str) -> dict:
    try:
        return jwt.decode(token, settings.secret_key, algorithms=["HS256"])
    except jwt.ExpiredSignatureError:
        raise UnauthorizedError("Token expirado")
    except jwt.InvalidTokenError:
        raise UnauthorizedError("Token inválido")
