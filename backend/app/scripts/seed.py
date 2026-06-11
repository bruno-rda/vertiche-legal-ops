import asyncio
import logging
import random
import uuid
from datetime import date, datetime, timedelta

from sqlalchemy import text

from app.core.security import hash_password
from app.database import AsyncSessionLocal
from app.models.alerta import Alerta
from app.models.associations import usuario_tiendas
from app.models.documento import Documento
from app.models.regla_alerta import ReglaAlerta
from app.models.tienda import Tienda
from app.models.tramite import Tramite
from app.models.usuario import Usuario
from app.services import tienda_service

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

ESTADOS = [
    "Jalisco",
    "Nuevo León",
    "Ciudad de México",
    "Estado de México",
    "Puebla",
    "Guanajuato",
    "Querétaro",
    "Chihuahua",
    "Sonora",
    "Baja California",
    "Yucatán",
    "Veracruz",
    "Coahuila",
    "Sinaloa",
    "Aguascalientes",
]

MUNICIPIOS = {
    "Jalisco": ["Guadalajara", "Zapopan", "Tlaquepaque", "Tonalá"],
    "Nuevo León": ["Monterrey", "San Pedro Garza García", "San Nicolás", "Apodaca"],
    "Ciudad de México": ["Polanco", "Santa Fe", "Coyoacán", "Roma Norte"],
    "Estado de México": ["Naucalpan", "Tlalnepantla", "Ecatepec", "Metepec"],
    "Puebla": ["Puebla Centro", "Angelópolis", "Cholula"],
    "Guanajuato": ["León", "Irapuato", "Celaya"],
    "Querétaro": ["Querétaro Centro", "Juriquilla", "El Marqués"],
    "Chihuahua": ["Chihuahua Centro", "Ciudad Juárez"],
    "Sonora": ["Hermosillo", "Ciudad Obregón"],
    "Baja California": ["Tijuana", "Mexicali", "Ensenada"],
    "Yucatán": ["Mérida Centro", "Mérida Norte"],
    "Veracruz": ["Veracruz Puerto", "Xalapa", "Boca del Río"],
    "Coahuila": ["Saltillo", "Torreón"],
    "Sinaloa": ["Culiacán", "Mazatlán"],
    "Aguascalientes": ["Aguascalientes Centro"],
}

MARCAS = [
    "Cuidado con el Perro",
    "Oggi",
    "Sahara",
    "Non Stop",
    "Vertiche",
    "Milano",
    "Brantano",
    "Price Shoes",
]

TRAMITES_NAMES = [
    {"nombre": "Licencia de Funcionamiento", "tipo": "municipal"},
    {"nombre": "Uso de Suelo", "tipo": "municipal"},
    {"nombre": "Protección Civil", "tipo": "estatal"},
    {"nombre": "Licencia Sanitaria", "tipo": "federal"},
    {"nombre": "Aviso de Apertura (SARE)", "tipo": "municipal"},
    {"nombre": "Registro ante IMSS", "tipo": "federal"},
    {"nombre": "Permiso de Anuncio", "tipo": "municipal"},
    {"nombre": "Licencia Ambiental", "tipo": "estatal"},
    {"nombre": "Constancia de Bomberos", "tipo": "municipal"},
    {"nombre": "Registro REPSE", "tipo": "federal"},
]

DOC_NAMES = [
    "Licencia_Funcionamiento_2025.pdf",
    "Permiso_Uso_Suelo.pdf",
    "Dictamen_Proteccion_Civil.pdf",
    "Constancia_Bomberos.pdf",
    "Alta_IMSS.pdf",
    "Licencia_Sanitaria_COFEPRIS.pdf",
    "Aviso_Apertura_SARE.pdf",
    "Permiso_Anuncio_Municipal.pdf",
    "Dictamen_Ambiental.pdf",
    "Registro_REPSE.pdf",
    "Comprobante_Pago_Derechos.pdf",
    "Acta_Constitutiva.pdf",
]


def random_date(days_from_now: int) -> date:
    return date.today() + timedelta(days=days_from_now)


def generate_tiendas(num_tiendas: int = 55):
    tiendas = []
    for i in range(num_tiendas):
        estado = ESTADOS[i % len(ESTADOS)]
        munis = MUNICIPIOS.get(estado, ["Centro"])
        municipio = munis[i % len(munis)]

        num_marcas = random.randint(1, 3)
        marcas_seleccionadas = random.sample(MARCAS, num_marcas)

        suffix = f" {(i // 15) + 1}" if i > 14 else ""
        nombre = f"Vertiche {municipio}{suffix}".strip()

        tiendas.append(
            Tienda(
                id=str(uuid.uuid4()),
                nombre=nombre,
                estado=estado,
                municipio=municipio,
                direccion=(
                    f"Av. Principal #{100 + i}, Col. Centro, {municipio}, {estado}"
                ),
                marcas=marcas_seleccionadas,
                cumplimiento=100.0,
                estado_cumplimiento="vigente",
                total_tramites=0,
                tramites_vencidos=0,
                tramites_por_vencer=0,
            )
        )
    return tiendas


def generate_tramites(tienda_id: str):
    tramites = []
    count = random.randint(4, 8)
    selected = random.sample(TRAMITES_NAMES, count)

    for t in selected:
        rand_val = random.random()
        if rand_val < 0.35:
            estado = "vigente"
        elif rand_val < 0.5:
            estado = "por_vencer"
        elif rand_val < 0.65:
            estado = "vencido"
        elif rand_val < 0.75:
            estado = "en_revision"
        elif rand_val < 0.85:
            estado = "presentado"
        elif rand_val < 0.92:
            estado = "en_espera_resolucion"
        else:
            estado = "pendiente_documentacion"

        if estado == "vencido":
            fecha_vencimiento = random_date(-random.randint(1, 60))
        elif estado == "por_vencer":
            fecha_vencimiento = random_date(random.randint(1, 28))
        elif estado == "vigente":
            fecha_vencimiento = random_date(random.randint(60, 360))
        else:
            fecha_vencimiento = random_date(random.randint(30, 210))

        es_recurrente = random.random() > 0.3
        periodo_recurrencia = (
            "anual" if random.random() > 0.5 else "bianual" if es_recurrente else None
        )

        tramites.append(
            Tramite(
                id=str(uuid.uuid4()),
                tienda_id=tienda_id,
                nombre=t["nombre"],
                tipo=t["tipo"],
                estado=estado,
                fecha_inicio=random_date(-365),
                fecha_vencimiento=fecha_vencimiento,
                es_permanente=not es_recurrente,
                es_recurrente=es_recurrente,
                periodo_recurrencia=periodo_recurrencia,
                asignado_a=None,  # Can assign later if we want
            )
        )
    return tramites


def generate_documentos(
    tienda_id: str, tienda_nombre: str, tramites: list[Tramite], uploader_ids: list[str]
):
    docs = []
    ocr_states = [
        "completado",
        "completado",
        "completado",
        "procesando",
        "baja_confianza",
        "error",
    ]
    doc_counter = 0

    for t in tramites:
        num_docs = random.randint(0, 2)
        for _ in range(num_docs):
            doc_counter += 1
            estado_ocr = random.choice(ocr_states)
            doc_name = random.choice(DOC_NAMES)

            datos_extraidos = None
            requiere_revision_manual = estado_ocr == "baja_confianza"

            if estado_ocr in ["completado", "baja_confianza"]:
                confidence_fecha = 45 if estado_ocr == "baja_confianza" else 95
                confidence_permiso = 55 if estado_ocr == "baja_confianza" else 92
                datos_extraidos = {
                    "fecha_vigencia": {
                        "value": str(t.fecha_vencimiento),
                        "confidence": confidence_fecha,
                    },
                    "numero_permiso": {
                        "value": f"PERM-{random.randint(10000, 99999)}",
                        "confidence": confidence_permiso,
                    },
                    "referencia_pago": {
                        "value": f"REF-{random.randint(100000, 999999)}",
                        "confidence": 88,
                    },
                    "domicilio": {
                        "value": f"Av. Principal #{100 + doc_counter}, Col. Centro",
                        "confidence": 99,
                    },
                }

            docs.append(
                Documento(
                    id=str(uuid.uuid4()),
                    tienda_id=tienda_id,
                    nombre_archivo=f"{tienda_id}_{doc_name}",
                    url=f"https://api.vertiche.com/docs/{doc_counter}/{doc_name}",
                    estado_ocr=estado_ocr,
                    datos_extraidos=datos_extraidos,
                    requiere_revision_manual=requiere_revision_manual,
                    cargado_por=random.choice(uploader_ids),
                    tramites=[t],
                )
            )
    return docs


def generate_alertas(tienda: Tienda, tramites: list[Tramite]):
    alertas = []

    vencidos = [t for t in tramites if t.estado == "vencido"]
    por_vencer = [t for t in tramites if t.estado == "por_vencer"]

    for t in vencidos:
        alertas.append(
            Alerta(
                id=str(uuid.uuid4()),
                tipo="vencido",
                severidad="critical",
                tienda_id=tienda.id,
                tramite_id=t.id,
                mensaje=(
                    f'El trámite "{t.nombre}" de {tienda.nombre} '
                    "ha vencido y requiere atención inmediata."
                ),
                fecha_generacion=datetime.now() - timedelta(days=random.randint(0, 6)),
                silenciada=False,
                resuelta=False,
            )
        )

    for t in por_vencer:
        alertas.append(
            Alerta(
                id=str(uuid.uuid4()),
                tipo="vencimiento_proximo",
                severidad="warning",
                tienda_id=tienda.id,
                tramite_id=t.id,
                mensaje=(
                    f'El trámite "{t.nombre}" de {tienda.nombre} está próximo a vencer.'
                ),
                fecha_generacion=datetime.now() - timedelta(days=random.randint(0, 13)),
                silenciada=False,
                resuelta=False,
            )
        )

    return alertas


def generate_inconsistencia_alertas(tiendas: list[Tienda]):
    alertas = []
    inconsistency_types = [
        {
            "tipo": "inconsistencia",
            "severidad": "critical",
            "template": (
                "Se detectó una inconsistencia en el expediente de {tienda}: "
                "la dirección registrada no coincide con el permiso."
            ),
        },
        {
            "tipo": "baja_confianza_ocr",
            "severidad": "warning",
            "template": (
                "El documento cargado en {tienda} tiene baja confianza de OCR "
                "y requiere revisión manual."
            ),
        },
        {
            "tipo": "inconsistencia",
            "severidad": "warning",
            "template": (
                "El número de permiso extraído por OCR "
                "no coincide con el registro previo en {tienda}."
            ),
        },
    ]

    for i in range(6):
        tienda = random.choice(tiendas)
        template = inconsistency_types[i % len(inconsistency_types)]
        alertas.append(
            Alerta(
                id=str(uuid.uuid4()),
                tipo=template["tipo"],
                severidad=template["severidad"],
                tienda_id=tienda.id,
                mensaje=template["template"].replace("{tienda}", tienda.nombre),
                fecha_generacion=datetime.now() - timedelta(days=random.randint(0, 20)),
                silenciada=False,
                resuelta=False,
            )
        )

    for i in range(4):
        tienda = random.choice(tiendas)
        alertas.append(
            Alerta(
                id=str(uuid.uuid4()),
                tipo="vencimiento_proximo",
                severidad="info",
                tienda_id=tienda.id,
                mensaje=(
                    f"Recordatorio: revisar renovación de trámite en {tienda.nombre}."
                ),
                fecha_generacion=datetime.now() - timedelta(days=random.randint(0, 29)),
                silenciada=True,
                silenciada_hasta=datetime.now() + timedelta(days=15),
                silenciada_por=None,  # Will update with a user later if needed
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

        # 0. Reglas de Alerta
        reglas_data = [
            {"codigo_regla": "VEN_40", "nombre": "Vencimiento en 40 días", "dias": 40, "severidad": "info", "canal": "email", "estado": "vigente"},
            {"codigo_regla": "VEN_30", "nombre": "Vencimiento en 30 días", "dias": 30, "severidad": "warning", "canal": "email", "estado": "vigente"},
            {"codigo_regla": "VEN_20", "nombre": "Vencimiento en 20 días", "dias": 20, "severidad": "warning", "canal": "ambos", "estado": "vigente"},
            {"codigo_regla": "VEN_10", "nombre": "Vencimiento en 10 días", "dias": 10, "severidad": "critical", "canal": "whatsapp", "estado": "vigente"},
            {"codigo_regla": "VEN_DIARIO", "nombre": "Alerta diaria ≤10 días / vencido", "dias": None, "severidad": "critical", "canal": "whatsapp", "estado": None},
            {"codigo_regla": "PEND_DOC", "nombre": "Trámite pendiente de documentación", "dias": None, "severidad": "warning", "canal": "email", "estado": "pendiente_documentacion"},
            {"codigo_regla": "EN_ESPERA", "nombre": "Trámite en espera de resolución", "dias": None, "severidad": "info", "canal": "email", "estado": "en_espera_resolucion"},
            {"codigo_regla": "EN_REVISION", "nombre": "Trámite en revisión", "dias": None, "severidad": "info", "canal": "email", "estado": "en_revision"},
            {"codigo_regla": "PRESENTADO", "nombre": "Trámite presentado", "dias": None, "severidad": "info", "canal": "email", "estado": "presentado"},
        ]
        
        for r_data in reglas_data:
            db.add(
                ReglaAlerta(
                    id=str(uuid.uuid4()),
                    codigo_regla=r_data["codigo_regla"],
                    nombre=r_data["nombre"],
                    dias_antes_vencimiento=r_data["dias"],
                    severidad=r_data["severidad"],
                    canal=r_data["canal"],
                    aplica_a_estado=r_data["estado"],
                    activa=True
                )
            )
        await db.flush()

        # 1. Users
        users_data = [
            {
                "id": str(uuid.uuid4()),
                "nombre": "Ana García López",
                "email": "ana.garcia@vertiche.com",
                "rol": "ADMIN",
                "password": "admin123",
                "estado": "activo",
            },
            {
                "id": str(uuid.uuid4()),
                "nombre": "Carlos Mendoza Ruiz",
                "email": "carlos.mendoza@vertiche.com",
                "rol": "OPERATOR",
                "password": "operator123",
                "estado": "activo",
            },
            {
                "id": str(uuid.uuid4()),
                "nombre": "María Fernández Ortiz",
                "email": "maria.fernandez@vertiche.com",
                "rol": "VIEWER",
                "password": "viewer123",
                "estado": "activo",
            },
            {
                "id": str(uuid.uuid4()),
                "nombre": "Roberto Silva",
                "email": "roberto.silva@vertiche.com",
                "rol": "OPERATOR",
                "password": "operator123",
                "estado": "activo",
            },
            {
                "id": str(uuid.uuid4()),
                "nombre": "Luis Gómez (Sin tiendas)",
                "email": "luis.gomez@vertiche.com",
                "rol": "OPERATOR",
                "password": "operator123",
                "estado": "activo",
            },
            {
                "id": str(uuid.uuid4()),
                "nombre": "Elena Torres (Inactiva)",
                "email": "elena.torres@vertiche.com",
                "rol": "OPERATOR",
                "password": "operator123",
                "estado": "inactivo",
            },
        ]

        usuarios = []
        for u in users_data:
            usuarios.append(
                Usuario(
                    id=u["id"],
                    nombre=u["nombre"],
                    email=u["email"],
                    password_hash=hash_password(u["password"]),
                    rol=u["rol"],
                    estado=u["estado"],
                )
            )

        db.add_all(usuarios)
        await db.flush()

        admin_id = usuarios[0].id
        carlos_id = usuarios[1].id
        roberto_id = usuarios[3].id
        elena_id = usuarios[5].id
        uploader_ids = [admin_id, carlos_id, roberto_id]

        # 2. Tiendas
        tiendas = generate_tiendas(55)
        db.add_all(tiendas)
        await db.flush()

        # Join users to tiendas
        joins = []
        for i, t in enumerate(tiendas):
            # Carlos gets 5 stores, Roberto gets 3, Elena gets 2
            if i < 5:
                joins.append({"usuario_id": carlos_id, "tienda_id": t.id})
            elif i < 8:
                joins.append({"usuario_id": roberto_id, "tienda_id": t.id})
            elif i < 10:
                joins.append({"usuario_id": elena_id, "tienda_id": t.id})
            # Other stores have no specific assignment, or we can distribute them.
            # We'll leave the rest unassigned to match frontend
            # (where mostly 5/3/0/2 are assigned).

        if joins:
            await db.execute(usuario_tiendas.insert(), joins)

        # 3. Tramites, Documentos, Alertas
        all_tramites = []
        for t in tiendas:
            tramites = generate_tramites(t.id)
            docs = generate_documentos(t.id, t.nombre, tramites, uploader_ids)
            alertas = generate_alertas(t, tramites)

            db.add_all(tramites)
            db.add_all(docs)
            db.add_all(alertas)
            all_tramites.extend(tramites)

        # Add global inconsistency/OCR alerts
        global_alertas = generate_inconsistencia_alertas(tiendas)
        for al in global_alertas:
            if al.silenciada:
                al.silenciada_por = admin_id
        db.add_all(global_alertas)

        await db.flush()

        # Recalculate compliance for stores
        logger.info("Recalculating compliance for all stores...")
        for t in tiendas:
            await tienda_service.recalculate_compliance(db, t.id)

        await db.commit()
        logger.info("Seed completed successfully.")


def main():
    asyncio.run(seed())


if __name__ == "__main__":
    main()
