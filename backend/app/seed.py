import asyncio
import logging
import random
import uuid
from datetime import date, timedelta

from sqlalchemy import text

from app.core.security import hash_password
from app.database import AsyncSessionLocal
from app.models.alerta import Alerta
from app.models.associations import usuario_tiendas
from app.models.documento import Documento
from app.models.tienda import Tienda
from app.models.tramite import Tramite
from app.models.usuario import Usuario
from app.services import tienda_service

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def generate_tiendas(num_tiendas: int = 55):
    estados_municipios = [
        ("Nuevo León", ["Monterrey", "San Pedro", "Guadalupe", "San Nicolás"]),
        ("Jalisco", ["Guadalajara", "Zapopan", "Tlaquepaque", "Tonalá"]),
        (
            "Ciudad de México",
            ["Cuauhtémoc", "Miguel Hidalgo", "Coyoacán", "Benito Juárez"],
        ),
        ("Estado de México", ["Toluca", "Naucalpan", "Tlalnepantla", "Ecatepec"]),
        ("Puebla", ["Puebla", "Cholula", "Atlixco"]),
        ("Querétaro", ["Querétaro", "San Juan del Río", "Corregidora"]),
        ("Yucatán", ["Mérida", "Valladolid", "Progreso"]),
        ("Quintana Roo", ["Cancún", "Playa del Carmen", "Tulum"]),
    ]

    tiendas = []
    for i in range(1, num_tiendas + 1):
        estado, municipios = random.choice(estados_municipios)
        municipio = random.choice(municipios)
        tiendas.append(
            Tienda(
                id=str(uuid.uuid4()),
                nombre=f"Vertiche {municipio} {i}",
                estado=estado,
                municipio=municipio,
                direccion=f"Av. Principal {random.randint(100, 9999)}",
                marcas=["Vertiche"] if random.random() > 0.3 else ["Vertiche", "VRT"],
            )
        )
    return tiendas


def generate_tramites(tienda_id: str, num_tramites: int):
    tramites = []
    tipos = ["licencia", "permiso", "registro", "certificado"]
    nombres = [
        "Licencia de Funcionamiento",
        "Permiso de Anuncios",
        "Registro SIEM",
        "Certificado Fumigación",
    ]
    estados_posibles = ["vigente", "por_vencer", "vencido", "en_espera_resolucion"]

    for _ in range(num_tramites):
        estado = random.choices(estados_posibles, weights=[0.6, 0.2, 0.1, 0.1])[0]
        tipo_idx = random.randint(0, len(tipos) - 1)

        if estado == "vigente":
            dias_inicio = random.randint(100, 365)
            dias_vence = random.randint(30, 365)
        elif estado == "por_vencer":
            dias_inicio = random.randint(100, 365)
            dias_vence = random.randint(1, 14)
        elif estado == "vencido":
            dias_inicio = random.randint(400, 700)
            dias_vence = -random.randint(1, 100)
        else:  # en_espera_resolucion
            dias_inicio = random.randint(10, 100)
            dias_vence = random.randint(30, 365)

        tramites.append(
            Tramite(
                id=str(uuid.uuid4()),
                tienda_id=tienda_id,
                nombre=nombres[tipo_idx],
                tipo=tipos[tipo_idx],
                estado=estado,
                fecha_inicio=date.today() - timedelta(days=dias_inicio),
                fecha_vencimiento=date.today() + timedelta(days=dias_vence),
                es_permanente=False,
            )
        )
    return tramites


def generate_documentos(tienda_id: str, tramites: list[Tramite], uploader_id: str):
    docs = []
    for t in tramites:
        if random.random() > 0.2:  # 80% have documents
            estado_ocr = random.choices(
                ["completado", "procesando", "error"], weights=[0.8, 0.1, 0.1]
            )[0]
            docs.append(
                Documento(
                    id=str(uuid.uuid4()),
                    tienda_id=tienda_id,
                    nombre_archivo=f"Doc_{t.tipo}_{random.randint(1000, 9999)}.pdf",
                    url=f"uploads/dummy_{random.randint(1000, 9999)}.pdf",
                    estado_ocr=estado_ocr,
                    requiere_revision_manual=(
                        estado_ocr == "completado" and random.random() > 0.8
                    ),
                    cargado_por=uploader_id,
                    tramites=[t],
                )
            )
    return docs


def generate_alertas(tienda_id: str, tramites: list[Tramite]):
    alertas = []
    for t in tramites:
        if t.estado == "vencido":
            alertas.append(
                Alerta(
                    id=str(uuid.uuid4()),
                    tipo="vencimiento",
                    severidad="critical",
                    mensaje=f"El trámite {t.nombre} ha vencido.",
                    tienda_id=tienda_id,
                    tramite_id=t.id,
                    resuelta=False,
                )
            )
        elif t.estado == "por_vencer":
            alertas.append(
                Alerta(
                    id=str(uuid.uuid4()),
                    tipo="vencimiento",
                    severidad="warning",
                    mensaje=f"El trámite {t.nombre} está próximo a vencer.",
                    tienda_id=tienda_id,
                    tramite_id=t.id,
                    resuelta=False,
                )
            )
    return alertas


async def seed():
    async with AsyncSessionLocal() as db:
        # Check idempotency: If admin exists, skip
        result = await db.execute(
            text("SELECT id FROM usuarios WHERE email = 'ana.garcia@vertiche.com'")
        )
        if result.scalar_one_or_none():
            logger.info("Seed data already exists. Skipping.")
            return

        logger.info("Starting database seed...")

        # 1. Users
        admin_id = str(uuid.uuid4())
        operator_1_id = str(uuid.uuid4())
        operator_2_id = str(uuid.uuid4())

        db.add_all(
            [
                Usuario(
                    id=admin_id,
                    nombre="Ana García López",
                    email="ana.garcia@vertiche.com",
                    password_hash=hash_password("password123"),
                    rol="ADMIN",
                ),
                Usuario(
                    id=operator_1_id,
                    nombre="Operador Norte",
                    email="op_norte@vertiche.com",
                    password_hash=hash_password("password123"),
                    rol="OPERATOR",
                ),
                Usuario(
                    id=operator_2_id,
                    nombre="Operador Sur",
                    email="op_sur@vertiche.com",
                    password_hash=hash_password("password123"),
                    rol="OPERATOR",
                ),
            ]
        )
        await db.flush()

        # 2. Tiendas
        tiendas = generate_tiendas(55)
        db.add_all(tiendas)
        await db.flush()

        # Join users to tiendas
        joins = []
        for i, t in enumerate(tiendas):
            op_id = operator_1_id if i % 2 == 0 else operator_2_id
            joins.append({"usuario_id": op_id, "tienda_id": t.id})
        await db.execute(usuario_tiendas.insert(), joins)

        # 3. Tramites, Documentos, Alertas
        all_tramites = []
        for t in tiendas:
            num_tramites = random.randint(4, 8)
            tramites = generate_tramites(t.id, num_tramites)
            docs = generate_documentos(t.id, tramites, admin_id)
            alertas = generate_alertas(t.id, tramites)

            db.add_all(tramites)
            db.add_all(docs)
            db.add_all(alertas)
            all_tramites.extend(tramites)

        await db.flush()

        # Recalculate compliance for stores
        # We can do this in batch to avoid 55 sequential updates
        logger.info("Recalculating compliance for all stores...")
        for t in tiendas:
            await tienda_service.recalculate_compliance(db, t.id)

        await db.commit()
        logger.info("Seed completed successfully.")


def main():
    asyncio.run(seed())


if __name__ == "__main__":
    main()
