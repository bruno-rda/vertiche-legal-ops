from pydantic import BaseModel


class LoginResponse(BaseModel):
    access_token: str
    token_type: str
    user: "Usuario"


from app.schemas.usuario import Usuario  # noqa: E402

LoginResponse.model_rebuild()
