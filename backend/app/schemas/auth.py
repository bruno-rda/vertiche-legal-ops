from pydantic import BaseModel


class LoginResponse(BaseModel):
    access_token: str
    token_type: str
    user: "UsuarioOut"


from app.schemas.usuario import UsuarioOut  # noqa: E402

LoginResponse.model_rebuild()
