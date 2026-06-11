import asyncio
import uuid

from app.database import AsyncSessionLocal
from app.core.security import hash_password
from app.models.usuario import Usuario

async def main():
    async with AsyncSessionLocal() as db:
        usuario = Usuario(
            id=str(uuid.uuid4()),
            nombre="Admin",
            email="admin@vertiche.com",
            password_hash=hash_password("password"),
            rol="ADMIN",
            estado="activo",
        )

        db.add(usuario)
        await db.flush()
        await db.commit()
        print(f"Usuario creado: {usuario.id} - {usuario.nombre}")


if __name__ == "__main__":
    asyncio.run(main())