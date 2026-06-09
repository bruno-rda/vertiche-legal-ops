from pydantic import BaseModel


class LoginRequest(BaseModel):
    email: str
    password: str


class LoginResponse(BaseModel):
    token: str
    user: "UsuarioOut"


from app.schemas.usuario import UsuarioOut  # noqa: E402

LoginResponse.model_rebuild()
