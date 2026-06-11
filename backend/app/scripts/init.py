import asyncio
import logging
import uuid
from datetime import date, datetime, timedelta

from app.core.security import hash_password
from app.database import AsyncSessionLocal
from app.models.usuario import Usuario
from app.schemas.tramite import TramiteEstado, TramitePeriodoRecurrencia, TramiteTipo
from app.services import tienda_service, tramite_service

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

INITIAL_DATABASE = [
    {
        "nombre": "T-001 San Antonio Abad",
        "estado": "Ciudad de México",
        "municipio": "Cuauhtémoc",
        "direccion": "Calzada San Antonio Abad S/N, Col. Tránsito, C.P. 06820",
        "marcas": ["COMERCIAL IAC SA DE CV"],
        "tramites": [
            {
                "nombre": "Aviso de funcionamiento",
                "tipo": "federal",
                "estado": "vigente",
                "fecha_inicio": "2024-01-01",
                "fecha_vencimiento": None,
                "es_permanente": True,
                "es_recurrente": False,
                "periodo_recurrencia": None
            },
            {
                "nombre": "Uso de suelo",
                "tipo": "municipal",
                "estado": "pendiente_documentacion",
                "fecha_inicio": "2024-06-10",
                "fecha_vencimiento": None,
                "es_permanente": False,
                "es_recurrente": False,
                "periodo_recurrencia": None
            },
            {
                "nombre": "Anuncio",
                "tipo": "municipal",
                "estado": "pendiente_documentacion",
                "fecha_inicio": "2024-06-10",
                "fecha_vencimiento": None,
                "es_permanente": False,
                "es_recurrente": True,
                "periodo_recurrencia": "anual"
            },
            {
                "nombre": "Protección Civil",
                "tipo": "municipal",
                "estado": "en_espera_resolucion",
                "fecha_inicio": "2025-01-01",
                "fecha_vencimiento": "2026-12-31",
                "es_permanente": False,
                "es_recurrente": True,
                "periodo_recurrencia": "anual"
            },
            {
                "nombre": "Licencia Ambiental",
                "tipo": "estatal",
                "estado": "pendiente_documentacion",
                "fecha_inicio": "2025-06-10",
                "fecha_vencimiento": None,
                "es_permanente": False,
                "es_recurrente": True,
                "periodo_recurrencia": "anual"
            },
            
            {
                "nombre": "Aviso de funcionamiento",
                "tipo": "federal",
                "estado": "vigente",
                "fecha_inicio": "2026-01-01",
                "fecha_vencimiento": None,
                "es_permanente": True,
                "es_recurrente": False,
                "periodo_recurrencia": None
            },
            {
                "nombre": "Uso de suelo",
                "tipo": "municipal",
                "estado": "pendiente_documentacion",
                "fecha_inicio": "2026-06-10",
                "fecha_vencimiento": None,
                "es_permanente": False,
                "es_recurrente": False,
                "periodo_recurrencia": None
            },
            {
                "nombre": "Anuncio",
                "tipo": "municipal",
                "estado": "pendiente_documentacion",
                "fecha_inicio": "2026-06-10",
                "fecha_vencimiento": None,
                "es_permanente": False,
                "es_recurrente": True,
                "periodo_recurrencia": "anual"
            },
            {
                "nombre": "Protección Civil",
                "tipo": "municipal",
                "estado": "en_espera_resolucion",
                "fecha_inicio": "2026-01-01",
                "fecha_vencimiento": "2026-12-31",
                "es_permanente": False,
                "es_recurrente": True,
                "periodo_recurrencia": "anual"
            },
            {
                "nombre": "Licencia Ambiental",
                "tipo": "estatal",
                "estado": "pendiente_documentacion",
                "fecha_inicio": "2026-06-10",
                "fecha_vencimiento": None,
                "es_permanente": False,
                "es_recurrente": True,
                "periodo_recurrencia": "anual"
            },
            
        ]
    },
    {
        "nombre": "T-003 Portales",
        "estado": "Ciudad de México",
        "municipio": "Benito Juárez",
        "direccion": "Calz. de Tlalpan S/N, Col. Portales, C.P. 03300",
        "marcas": ["COMERCIAL IAC SA DE CV"],
        "tramites": [
            {
                "nombre": "Aviso de funcionamiento",
                "tipo": "federal",
                "estado": "vigente",
                "fecha_inicio": "2020-01-01",
                "fecha_vencimiento": None,
                "es_permanente": True,
                "es_recurrente": False,
                "periodo_recurrencia": None
            },
            {
                "nombre": "Uso de suelo",
                "tipo": "municipal",
                "estado": "vencido",
                "fecha_inicio": "2025-03-18",
                "fecha_vencimiento": "2026-03-18",
                "es_permanente": False,
                "es_recurrente": False,
                "periodo_recurrencia": None
            },
            {
                "nombre": "Anuncio",
                "tipo": "municipal",
                "estado": "pendiente_documentacion",
                "fecha_inicio": "2026-06-10",
                "fecha_vencimiento": None,
                "es_permanente": False,
                "es_recurrente": True,
                "periodo_recurrencia": "anual"
            },
            {
                "nombre": "Protección Civil",
                "tipo": "municipal",
                "estado": "vigente",
                "fecha_inicio": "2020-01-01",
                "fecha_vencimiento": None,
                "es_permanente": True,
                "es_recurrente": False,
                "periodo_recurrencia": None
            },
            {
                "nombre": "Licencia Ambiental",
                "tipo": "estatal",
                "estado": "pendiente_documentacion",
                "fecha_inicio": "2026-06-10",
                "fecha_vencimiento": None,
                "es_permanente": False,
                "es_recurrente": True,
                "periodo_recurrencia": "anual"
            },
            {
                "nombre": "Aviso de funcionamiento",
                "tipo": "federal",
                "estado": "vigente",
                "fecha_inicio": "2020-01-01",
                "fecha_vencimiento": None,
                "es_permanente": True,
                "es_recurrente": False,
                "periodo_recurrencia": None
            },
            {
                "nombre": "Uso de suelo",
                "tipo": "municipal",
                "estado": "vencido",
                "fecha_inicio": "2025-03-18",
                "fecha_vencimiento": "2026-03-18",
                "es_permanente": False,
                "es_recurrente": False,
                "periodo_recurrencia": None
            },
            {
                "nombre": "Anuncio",
                "tipo": "municipal",
                "estado": "pendiente_documentacion",
                "fecha_inicio": "2026-06-10",
                "fecha_vencimiento": None,
                "es_permanente": False,
                "es_recurrente": True,
                "periodo_recurrencia": "anual"
            },
            {
                "nombre": "Protección Civil",
                "tipo": "municipal",
                "estado": "vigente",
                "fecha_inicio": "2020-01-01",
                "fecha_vencimiento": None,
                "es_permanente": True,
                "es_recurrente": False,
                "periodo_recurrencia": None
            },
            {
                "nombre": "Licencia Ambiental",
                "tipo": "estatal",
                "estado": "pendiente_documentacion",
                "fecha_inicio": "2026-06-10",
                "fecha_vencimiento": None,
                "es_permanente": False,
                "es_recurrente": True,
                "periodo_recurrencia": "anual"
            },
        ]
    },
    {
        "nombre": "T-007 Tlanepantla",
        "estado": "Estado de México",
        "municipio": "Tlalnepantla de Baz",
        "direccion": "Av. Gustavo Baz S/N, Centro, C.P. 54000",
        "marcas": ["COMERCIAL IAC SA DE CV"],
        "tramites": [
            {
                "nombre": "Aviso de funcionamiento",
                "tipo": "federal",
                "estado": "vigente",
                "fecha_inicio": "2020-01-01",
                "fecha_vencimiento": None,
                "es_permanente": True,
                "es_recurrente": False,
                "periodo_recurrencia": None
            },
            {
                "nombre": "Uso de suelo",
                "tipo": "municipal",
                "estado": "vigente",
                "fecha_inicio": "2020-01-01",
                "fecha_vencimiento": None,
                "es_permanente": True,
                "es_recurrente": False,
                "periodo_recurrencia": None
            },
            {
                "nombre": "Anuncio",
                "tipo": "municipal",
                "estado": "vigente",
                "fecha_inicio": "2026-01-01",
                "fecha_vencimiento": "2026-12-31",
                "es_permanente": False,
                "es_recurrente": True,
                "periodo_recurrencia": "anual"
            },
            {
                "nombre": "Protección Civil Visto Bueno",
                "tipo": "municipal",
                "estado": "vencido",
                "fecha_inicio": "2025-05-19",
                "fecha_vencimiento": "2026-05-19",
                "es_permanente": False,
                "es_recurrente": True,
                "periodo_recurrencia": "anual"
            },
            {
                "nombre": "Licencia Ambiental",
                "tipo": "estatal",
                "estado": "pendiente_documentacion",
                "fecha_inicio": "2026-06-10",
                "fecha_vencimiento": None,
                "es_permanente": False,
                "es_recurrente": True,
                "periodo_recurrencia": "anual"
            },
            {
                "nombre": "Aviso de funcionamiento",
                "tipo": "federal",
                "estado": "vigente",
                "fecha_inicio": "2020-01-01",
                "fecha_vencimiento": None,
                "es_permanente": True,
                "es_recurrente": False,
                "periodo_recurrencia": None
            },
            {
                "nombre": "Uso de suelo",
                "tipo": "municipal",
                "estado": "vigente",
                "fecha_inicio": "2020-01-01",
                "fecha_vencimiento": None,
                "es_permanente": True,
                "es_recurrente": False,
                "periodo_recurrencia": None
            },
            {
                "nombre": "Anuncio",
                "tipo": "municipal",
                "estado": "vigente",
                "fecha_inicio": "2026-01-01",
                "fecha_vencimiento": "2026-12-31",
                "es_permanente": False,
                "es_recurrente": True,
                "periodo_recurrencia": "anual"
            },
            {
                "nombre": "Protección Civil Visto Bueno",
                "tipo": "municipal",
                "estado": "vencido",
                "fecha_inicio": "2025-05-19",
                "fecha_vencimiento": "2026-05-19",
                "es_permanente": False,
                "es_recurrente": True,
                "periodo_recurrencia": "anual"
            },
            {
                "nombre": "Licencia Ambiental",
                "tipo": "estatal",
                "estado": "pendiente_documentacion",
                "fecha_inicio": "2026-06-10",
                "fecha_vencimiento": None,
                "es_permanente": False,
                "es_recurrente": True,
                "periodo_recurrencia": "anual"
            },
        ]
    },
    {
        "nombre": "T-008 Chalco",
        "estado": "Estado de México",
        "municipio": "Chalco",
        "direccion": "Av. Cuauhtémoc S/N, Centro, C.P. 56600",
        "marcas": ["COMERCIAL IAC SA DE CV"],
        "tramites": [
            {
                "nombre": "Aviso de funcionamiento",
                "tipo": "federal",
                "estado": "vencido",
                "fecha_inicio": "2025-01-01",
                "fecha_vencimiento": "2025-12-31",
                "es_permanente": False,
                "es_recurrente": True,
                "periodo_recurrencia": "anual"
            },
            {
                "nombre": "Uso de suelo",
                "tipo": "municipal",
                "estado": "vigente",
                "fecha_inicio": "2020-01-01",
                "fecha_vencimiento": None,
                "es_permanente": True,
                "es_recurrente": False,
                "periodo_recurrencia": None
            },
            {
                "nombre": "Anuncio",
                "tipo": "municipal",
                "estado": "vigente",
                "fecha_inicio": "2026-01-01",
                "fecha_vencimiento": "2026-12-31",
                "es_permanente": False,
                "es_recurrente": True,
                "periodo_recurrencia": "anual"
            },
            {
                "nombre": "Protección Civil Visto Bueno",
                "tipo": "municipal",
                "estado": "vigente",
                "fecha_inicio": "2026-01-01",
                "fecha_vencimiento": "2026-12-31",
                "es_permanente": False,
                "es_recurrente": True,
                "periodo_recurrencia": "anual"
            },
            {
                "nombre": "Licencia Ambiental",
                "tipo": "estatal",
                "estado": "pendiente_documentacion",
                "fecha_inicio": "2026-06-10",
                "fecha_vencimiento": None,
                "es_permanente": False,
                "es_recurrente": True,
                "periodo_recurrencia": "anual"
            },
            {
                "nombre": "Aviso de funcionamiento",
                "tipo": "federal",
                "estado": "vencido",
                "fecha_inicio": "2025-01-01",
                "fecha_vencimiento": "2025-12-31",
                "es_permanente": False,
                "es_recurrente": True,
                "periodo_recurrencia": "anual"
            },
            {
                "nombre": "Uso de suelo",
                "tipo": "municipal",
                "estado": "vigente",
                "fecha_inicio": "2020-01-01",
                "fecha_vencimiento": None,
                "es_permanente": True,
                "es_recurrente": False,
                "periodo_recurrencia": None
            },
            {
                "nombre": "Anuncio",
                "tipo": "municipal",
                "estado": "vigente",
                "fecha_inicio": "2026-01-01",
                "fecha_vencimiento": "2026-12-31",
                "es_permanente": False,
                "es_recurrente": True,
                "periodo_recurrencia": "anual"
            },
            {
                "nombre": "Protección Civil Visto Bueno",
                "tipo": "municipal",
                "estado": "vigente",
                "fecha_inicio": "2026-01-01",
                "fecha_vencimiento": "2026-12-31",
                "es_permanente": False,
                "es_recurrente": True,
                "periodo_recurrencia": "anual"
            },
            {
                "nombre": "Licencia Ambiental",
                "tipo": "estatal",
                "estado": "pendiente_documentacion",
                "fecha_inicio": "2026-06-10",
                "fecha_vencimiento": None,
                "es_permanente": False,
                "es_recurrente": True,
                "periodo_recurrencia": "anual"
            }
        ]
    },
    {
        "nombre": "T-014 Puebla Outlet",
        "estado": "Puebla",
        "municipio": "Cuautlancingo",
        "direccion": "Autopista México-Puebla Km 115, C.P. 72710",
        "marcas": ["COMERCIAL IAC SA DE CV"],
        "tramites": [
            {
                "nombre": "Aviso de funcionamiento",
                "tipo": "federal",
                "estado": "vigente",
                "fecha_inicio": "2026-01-01",
                "fecha_vencimiento": "2026-12-31",
                "es_permanente": False,
                "es_recurrente": True,
                "periodo_recurrencia": "anual"
            },
            {
                "nombre": "Uso de suelo",
                "tipo": "municipal",
                "estado": "vigente",
                "fecha_inicio": "2026-02-11",
                "fecha_vencimiento": "2027-02-11",
                "es_permanente": False,
                "es_recurrente": True,
                "periodo_recurrencia": "anual"
            },
            {
                "nombre": "Anuncio",
                "tipo": "municipal",
                "estado": "vigente",
                "fecha_inicio": "2026-01-01",
                "fecha_vencimiento": "2026-12-31",
                "es_permanente": False,
                "es_recurrente": True,
                "periodo_recurrencia": "anual"
            },
            {
                "nombre": "Protección Civil Visto Bueno",
                "tipo": "municipal",
                "estado": "vigente",
                "fecha_inicio": "2026-02-27",
                "fecha_vencimiento": "2027-02-27",
                "es_permanente": False,
                "es_recurrente": True,
                "periodo_recurrencia": "anual"
            },
            {
                "nombre": "Dictamen de medidas contra incendio",
                "tipo": "municipal",
                "estado": "vigente",
                "fecha_inicio": "2026-02-27",
                "fecha_vencimiento": "2027-02-27",
                "es_permanente": False,
                "es_recurrente": True,
                "periodo_recurrencia": "anual"
            },
            {
                "nombre": "Licencia Ambiental",
                "tipo": "estatal",
                "estado": "pendiente_documentacion",
                "fecha_inicio": "2026-06-10",
                "fecha_vencimiento": None,
                "es_permanente": False,
                "es_recurrente": True,
                "periodo_recurrencia": "anual"
            },
            {
                "nombre": "Alineamiento y No oficial",
                "tipo": "municipal",
                "estado": "vigente",
                "fecha_inicio": "2026-02-11",
                "fecha_vencimiento": "2027-02-11",
                "es_permanente": False,
                "es_recurrente": False,
                "periodo_recurrencia": None
            },
            {
                "nombre": "Aviso de funcionamiento",
                "tipo": "federal",
                "estado": "vigente",
                "fecha_inicio": "2026-01-01",
                "fecha_vencimiento": "2026-12-31",
                "es_permanente": False,
                "es_recurrente": True,
                "periodo_recurrencia": "anual"
            },
            {
                "nombre": "Uso de suelo",
                "tipo": "municipal",
                "estado": "vigente",
                "fecha_inicio": "2026-02-11",
                "fecha_vencimiento": "2027-02-11",
                "es_permanente": False,
                "es_recurrente": True,
                "periodo_recurrencia": "anual"
            },
            {
                "nombre": "Anuncio",
                "tipo": "municipal",
                "estado": "vigente",
                "fecha_inicio": "2026-01-01",
                "fecha_vencimiento": "2026-12-31",
                "es_permanente": False,
                "es_recurrente": True,
                "periodo_recurrencia": "anual"
            },
            {
                "nombre": "Protección Civil Visto Bueno",
                "tipo": "municipal",
                "estado": "vigente",
                "fecha_inicio": "2026-02-27",
                "fecha_vencimiento": "2027-02-27",
                "es_permanente": False,
                "es_recurrente": True,
                "periodo_recurrencia": "anual"
            },
            {
                "nombre": "Dictamen de medidas contra incendio",
                "tipo": "municipal",
                "estado": "vigente",
                "fecha_inicio": "2026-02-27",
                "fecha_vencimiento": "2027-02-27",
                "es_permanente": False,
                "es_recurrente": True,
                "periodo_recurrencia": "anual"
            },
            {
                "nombre": "Licencia Ambiental",
                "tipo": "estatal",
                "estado": "pendiente_documentacion",
                "fecha_inicio": "2026-06-10",
                "fecha_vencimiento": None,
                "es_permanente": False,
                "es_recurrente": True,
                "periodo_recurrencia": "anual"
            },
            {
                "nombre": "Alineamiento y No oficial",
                "tipo": "municipal",
                "estado": "vigente",
                "fecha_inicio": "2026-02-11",
                "fecha_vencimiento": "2027-02-11",
                "es_permanente": False,
                "es_recurrente": False,
                "periodo_recurrencia": None
            }
        ]
    },
    {
        "nombre": "T-015 Atlixco",
        "estado": "Puebla",
        "municipio": "Atlixco",
        "direccion": "Blvd. Niños Héroes S/N, Centro, C.P. 74200",
        "marcas": ["COMERCIAL IAC SA DE CV"],
        "tramites": [
            {
                "nombre": "Aviso de funcionamiento",
                "tipo": "federal",
                "estado": "vigente",
                "fecha_inicio": "2026-01-01",
                "fecha_vencimiento": "2026-12-31",
                "es_permanente": False,
                "es_recurrente": True,
                "periodo_recurrencia": "anual"
            },
            {
                "nombre": "Uso de suelo",
                "tipo": "municipal",
                "estado": "vigente",
                "fecha_inicio": "2020-01-01",
                "fecha_vencimiento": None,
                "es_permanente": True,
                "es_recurrente": False,
                "periodo_recurrencia": None
            },
            {
                "nombre": "Anuncio",
                "tipo": "municipal",
                "estado": "pendiente_documentacion",
                "fecha_inicio": "2026-06-10",
                "fecha_vencimiento": None,
                "es_permanente": False,
                "es_recurrente": True,
                "periodo_recurrencia": "anual"
            },
            {
                "nombre": "Protección Civil Visto Bueno",
                "tipo": "municipal",
                "estado": "vigente",
                "fecha_inicio": "2026-02-06",
                "fecha_vencimiento": "2027-02-06",
                "es_permanente": False,
                "es_recurrente": True,
                "periodo_recurrencia": "anual"
            },
            {
                "nombre": "Dictamen Bomberos",
                "tipo": "municipal",
                "estado": "vigente",
                "fecha_inicio": "2026-02-06",
                "fecha_vencimiento": "2027-02-06",
                "es_permanente": False,
                "es_recurrente": True,
                "periodo_recurrencia": "anual"
            },
            {
                "nombre": "Licencia Ambiental",
                "tipo": "estatal",
                "estado": "pendiente_documentacion",
                "fecha_inicio": "2026-06-10",
                "fecha_vencimiento": None,
                "es_permanente": False,
                "es_recurrente": True,
                "periodo_recurrencia": "anual"
            },
            {
                "nombre": "Aviso de funcionamiento",
                "tipo": "federal",
                "estado": "vigente",
                "fecha_inicio": "2026-01-01",
                "fecha_vencimiento": "2026-12-31",
                "es_permanente": False,
                "es_recurrente": True,
                "periodo_recurrencia": "anual"
            },
            {
                "nombre": "Uso de suelo",
                "tipo": "municipal",
                "estado": "vigente",
                "fecha_inicio": "2020-01-01",
                "fecha_vencimiento": None,
                "es_permanente": True,
                "es_recurrente": False,
                "periodo_recurrencia": None
            },
            {
                "nombre": "Anuncio",
                "tipo": "municipal",
                "estado": "pendiente_documentacion",
                "fecha_inicio": "2026-06-10",
                "fecha_vencimiento": None,
                "es_permanente": False,
                "es_recurrente": True,
                "periodo_recurrencia": "anual"
            },
            {
                "nombre": "Protección Civil Visto Bueno",
                "tipo": "municipal",
                "estado": "vigente",
                "fecha_inicio": "2026-02-06",
                "fecha_vencimiento": "2027-02-06",
                "es_permanente": False,
                "es_recurrente": True,
                "periodo_recurrencia": "anual"
            },
            {
                "nombre": "Dictamen Bomberos",
                "tipo": "municipal",
                "estado": "vigente",
                "fecha_inicio": "2026-02-06",
                "fecha_vencimiento": "2027-02-06",
                "es_permanente": False,
                "es_recurrente": True,
                "periodo_recurrencia": "anual"
            },
            {
                "nombre": "Licencia Ambiental",
                "tipo": "estatal",
                "estado": "pendiente_documentacion",
                "fecha_inicio": "2026-06-10",
                "fecha_vencimiento": None,
                "es_permanente": False,
                "es_recurrente": True,
                "periodo_recurrencia": "anual"
            }
        ]
    },
    {
        "nombre": "T-016 Puebla",
        "estado": "Puebla",
        "municipio": "Puebla",
        "direccion": "Av. Reforma S/N, Centro Histórico, C.P. 72000",
        "marcas": ["COMERCIAL IAC SA DE CV"],
        "tramites": [
            {
                "nombre": "Aviso de funcionamiento",
                "tipo": "federal",
                "estado": "vigente",
                "fecha_inicio": "2020-01-01",
                "fecha_vencimiento": None,
                "es_permanente": True,
                "es_recurrente": False,
                "periodo_recurrencia": None
            },
            {
                "nombre": "Uso de suelo",
                "tipo": "municipal",
                "estado": "vigente",
                "fecha_inicio": "2020-01-01",
                "fecha_vencimiento": None,
                "es_permanente": True,
                "es_recurrente": False,
                "periodo_recurrencia": None
            },
            {
                "nombre": "Factibilidad de uso de suelo centro histórico",
                "tipo": "municipal",
                "estado": "vigente",
                "fecha_inicio": "2020-01-01",
                "fecha_vencimiento": None,
                "es_permanente": True,
                "es_recurrente": False,
                "periodo_recurrencia": None
            },
            {
                "nombre": "Anuncio",
                "tipo": "municipal",
                "estado": "pendiente_documentacion",
                "fecha_inicio": "2026-06-10",
                "fecha_vencimiento": None,
                "es_permanente": False,
                "es_recurrente": True,
                "periodo_recurrencia": "anual"
            },
            {
                "nombre": "Protección Civil Visto Bueno",
                "tipo": "municipal",
                "estado": "vigente",
                "fecha_inicio": "2025-10-16",
                "fecha_vencimiento": "2026-10-16",
                "es_permanente": False,
                "es_recurrente": True,
                "periodo_recurrencia": "anual"
            },
            {
                "nombre": "Dictamen Bomberos",
                "tipo": "municipal",
                "estado": "vigente",
                "fecha_inicio": "2025-11-06",
                "fecha_vencimiento": "2026-11-06",
                "es_permanente": False,
                "es_recurrente": True,
                "periodo_recurrencia": "anual"
            },
            {
                "nombre": "Licencia Ambiental",
                "tipo": "estatal",
                "estado": "pendiente_documentacion",
                "fecha_inicio": "2026-06-10",
                "fecha_vencimiento": None,
                "es_permanente": False,
                "es_recurrente": True,
                "periodo_recurrencia": "anual"
            },
            {
                "nombre": "Aviso de funcionamiento",
                "tipo": "federal",
                "estado": "vigente",
                "fecha_inicio": "2020-01-01",
                "fecha_vencimiento": None,
                "es_permanente": True,
                "es_recurrente": False,
                "periodo_recurrencia": None
            },
            {
                "nombre": "Uso de suelo",
                "tipo": "municipal",
                "estado": "vigente",
                "fecha_inicio": "2020-01-01",
                "fecha_vencimiento": None,
                "es_permanente": True,
                "es_recurrente": False,
                "periodo_recurrencia": None
            },
            {
                "nombre": "Factibilidad de uso de suelo centro histórico",
                "tipo": "municipal",
                "estado": "vigente",
                "fecha_inicio": "2020-01-01",
                "fecha_vencimiento": None,
                "es_permanente": True,
                "es_recurrente": False,
                "periodo_recurrencia": None
            },
            {
                "nombre": "Anuncio",
                "tipo": "municipal",
                "estado": "pendiente_documentacion",
                "fecha_inicio": "2026-06-10",
                "fecha_vencimiento": None,
                "es_permanente": False,
                "es_recurrente": True,
                "periodo_recurrencia": "anual"
            },
            {
                "nombre": "Protección Civil Visto Bueno",
                "tipo": "municipal",
                "estado": "vigente",
                "fecha_inicio": "2025-10-16",
                "fecha_vencimiento": "2026-10-16",
                "es_permanente": False,
                "es_recurrente": True,
                "periodo_recurrencia": "anual"
            },
            {
                "nombre": "Dictamen Bomberos",
                "tipo": "municipal",
                "estado": "vigente",
                "fecha_inicio": "2025-11-06",
                "fecha_vencimiento": "2026-11-06",
                "es_permanente": False,
                "es_recurrente": True,
                "periodo_recurrencia": "anual"
            },
            {
                "nombre": "Licencia Ambiental",
                "tipo": "estatal",
                "estado": "pendiente_documentacion",
                "fecha_inicio": "2026-06-10",
                "fecha_vencimiento": None,
                "es_permanente": False,
                "es_recurrente": True,
                "periodo_recurrencia": "anual"
            }
        ]
    },
    {
        "nombre": "T-017 Izúcar",
        "estado": "Puebla",
        "municipio": "Izúcar de Matamoros",
        "direccion": "Plaza Principal S/N, Centro, C.P. 74400",
        "marcas": ["COMERCIAL IAC SA DE CV"],
        "tramites": [
            {
                "nombre": "Aviso de funcionamiento",
                "tipo": "federal",
                "estado": "vencido",
                "fecha_inicio": "2025-01-01",
                "fecha_vencimiento": "2025-12-31",
                "es_permanente": False,
                "es_recurrente": True,
                "periodo_recurrencia": "anual"
            },
            {
                "nombre": "Uso de suelo",
                "tipo": "municipal",
                "estado": "vigente",
                "fecha_inicio": "2026-01-01",
                "fecha_vencimiento": "2026-12-31",
                "es_permanente": False,
                "es_recurrente": True,
                "periodo_recurrencia": "anual"
            },
            {
                "nombre": "Anuncio",
                "tipo": "municipal",
                "estado": "vigente",
                "fecha_inicio": "2026-01-01",
                "fecha_vencimiento": "2026-12-31",
                "es_permanente": False,
                "es_recurrente": True,
                "periodo_recurrencia": "anual"
            },
            {
                "nombre": "Protección Civil Visto Bueno",
                "tipo": "municipal",
                "estado": "vigente",
                "fecha_inicio": "2026-01-01",
                "fecha_vencimiento": "2026-12-31",
                "es_permanente": False,
                "es_recurrente": True,
                "periodo_recurrencia": "anual"
            },
            {
                "nombre": "Licencia Ambiental",
                "tipo": "estatal",
                "estado": "pendiente_documentacion",
                "fecha_inicio": "2026-06-10",
                "fecha_vencimiento": None,
                "es_permanente": False,
                "es_recurrente": True,
                "periodo_recurrencia": "anual"
            },
            {
                "nombre": "Aviso de funcionamiento",
                "tipo": "federal",
                "estado": "vencido",
                "fecha_inicio": "2025-01-01",
                "fecha_vencimiento": "2025-12-31",
                "es_permanente": False,
                "es_recurrente": True,
                "periodo_recurrencia": "anual"
            },
            {
                "nombre": "Uso de suelo",
                "tipo": "municipal",
                "estado": "vigente",
                "fecha_inicio": "2026-01-01",
                "fecha_vencimiento": "2026-12-31",
                "es_permanente": False,
                "es_recurrente": True,
                "periodo_recurrencia": "anual"
            },
            {
                "nombre": "Anuncio",
                "tipo": "municipal",
                "estado": "vigente",
                "fecha_inicio": "2026-01-01",
                "fecha_vencimiento": "2026-12-31",
                "es_permanente": False,
                "es_recurrente": True,
                "periodo_recurrencia": "anual"
            },
            {
                "nombre": "Protección Civil Visto Bueno",
                "tipo": "municipal",
                "estado": "vigente",
                "fecha_inicio": "2026-01-01",
                "fecha_vencimiento": "2026-12-31",
                "es_permanente": False,
                "es_recurrente": True,
                "periodo_recurrencia": "anual"
            },
            {
                "nombre": "Licencia Ambiental",
                "tipo": "estatal",
                "estado": "pendiente_documentacion",
                "fecha_inicio": "2026-06-10",
                "fecha_vencimiento": None,
                "es_permanente": False,
                "es_recurrente": True,
                "periodo_recurrencia": "anual"
            }
        ]
    },
    {
        "nombre": "T-018 Huamantla",
        "estado": "Tlaxcala",
        "municipio": "Huamantla",
        "direccion": "Calle Hidalgo S/N, Centro, C.P. 90500",
        "marcas": ["COMERCIAL IAC SA DE CV"],
        "tramites": [
            {
                "nombre": "Aviso de funcionamiento",
                "tipo": "federal",
                "estado": "vencido",
                "fecha_inicio": "2025-01-01",
                "fecha_vencimiento": "2025-12-31",
                "es_permanente": False,
                "es_recurrente": True,
                "periodo_recurrencia": "anual"
            },
            {
                "nombre": "Uso de suelo",
                "tipo": "municipal",
                "estado": "vencido",
                "fecha_inicio": "2025-01-01",
                "fecha_vencimiento": "2025-12-31",
                "es_permanente": False,
                "es_recurrente": False,
                "periodo_recurrencia": None
            },
            {
                "nombre": "Anuncio",
                "tipo": "municipal",
                "estado": "pendiente_documentacion",
                "fecha_inicio": "2026-06-10",
                "fecha_vencimiento": None,
                "es_permanente": False,
                "es_recurrente": True,
                "periodo_recurrencia": "anual"
            },
            {
                "nombre": "Protección Civil Visto Bueno",
                "tipo": "municipal",
                "estado": "vencido",
                "fecha_inicio": "2025-01-01",
                "fecha_vencimiento": "2025-12-31",
                "es_permanente": False,
                "es_recurrente": True,
                "periodo_recurrencia": "anual"
            },
            {
                "nombre": "Licencia Ambiental",
                "tipo": "estatal",
                "estado": "pendiente_documentacion",
                "fecha_inicio": "2026-06-10",
                "fecha_vencimiento": None,
                "es_permanente": False,
                "es_recurrente": True,
                "periodo_recurrencia": "anual"
            },
            {
                "nombre": "Aviso de funcionamiento",
                "tipo": "federal",
                "estado": "vencido",
                "fecha_inicio": "2025-01-01",
                "fecha_vencimiento": "2025-12-31",
                "es_permanente": False,
                "es_recurrente": True,
                "periodo_recurrencia": "anual"
            },
            {
                "nombre": "Uso de suelo",
                "tipo": "municipal",
                "estado": "vencido",
                "fecha_inicio": "2025-01-01",
                "fecha_vencimiento": "2025-12-31",
                "es_permanente": False,
                "es_recurrente": False,
                "periodo_recurrencia": None
            },
            {
                "nombre": "Anuncio",
                "tipo": "municipal",
                "estado": "pendiente_documentacion",
                "fecha_inicio": "2026-06-10",
                "fecha_vencimiento": None,
                "es_permanente": False,
                "es_recurrente": True,
                "periodo_recurrencia": "anual"
            },
            {
                "nombre": "Protección Civil Visto Bueno",
                "tipo": "municipal",
                "estado": "vencido",
                "fecha_inicio": "2025-01-01",
                "fecha_vencimiento": "2025-12-31",
                "es_permanente": False,
                "es_recurrente": True,
                "periodo_recurrencia": "anual"
            },
            {
                "nombre": "Licencia Ambiental",
                "tipo": "estatal",
                "estado": "pendiente_documentacion",
                "fecha_inicio": "2026-06-10",
                "fecha_vencimiento": None,
                "es_permanente": False,
                "es_recurrente": True,
                "periodo_recurrencia": "anual"
            }
        ]
    },
    {
        "nombre": "T-019 Orizaba",
        "estado": "Veracruz",
        "municipio": "Orizaba",
        "direccion": "Oriente 6 S/N, Centro, C.P. 94300",
        "marcas": ["COMERCIAL IAC SA DE CV"],
        "tramites": [
            {
                "nombre": "Aviso de funcionamiento",
                "tipo": "federal",
                "estado": "vencido",
                "fecha_inicio": "2025-01-01",
                "fecha_vencimiento": "2025-12-31",
                "es_permanente": False,
                "es_recurrente": True,
                "periodo_recurrencia": "anual"
            },
            {
                "nombre": "Uso de suelo",
                "tipo": "municipal",
                "estado": "vencido",
                "fecha_inicio": "2025-01-01",
                "fecha_vencimiento": "2025-12-31",
                "es_permanente": False,
                "es_recurrente": False,
                "periodo_recurrencia": None
            },
            {
                "nombre": "Anuncio",
                "tipo": "municipal",
                "estado": "vigente",
                "fecha_inicio": "2026-01-01",
                "fecha_vencimiento": "2026-12-31",
                "es_permanente": False,
                "es_recurrente": True,
                "periodo_recurrencia": "anual"
            },
            {
                "nombre": "Protección Civil Visto Bueno",
                "tipo": "municipal",
                "estado": "vigente",
                "fecha_inicio": "2026-11-22",
                "fecha_vencimiento": "2027-11-22",
                "es_permanente": False,
                "es_recurrente": True,
                "periodo_recurrencia": "anual"
            },
            {
                "nombre": "Convenio de bomberos",
                "tipo": "municipal",
                "estado": "vigente",
                "fecha_inicio": "2025-10-09",
                "fecha_vencimiento": "2026-10-09",
                "es_permanente": False,
                "es_recurrente": True,
                "periodo_recurrencia": "anual"
            },
            {
                "nombre": "Licencia ambiental",
                "tipo": "estatal",
                "estado": "pendiente_documentacion",
                "fecha_inicio": "2026-06-10",
                "fecha_vencimiento": None,
                "es_permanente": False,
                "es_recurrente": True,
                "periodo_recurrencia": "anual"
            },
            {
                "nombre": "Aviso de funcionamiento",
                "tipo": "federal",
                "estado": "vencido",
                "fecha_inicio": "2025-01-01",
                "fecha_vencimiento": "2025-12-31",
                "es_permanente": False,
                "es_recurrente": True,
                "periodo_recurrencia": "anual"
            },
            {
                "nombre": "Uso de suelo",
                "tipo": "municipal",
                "estado": "vencido",
                "fecha_inicio": "2025-01-01",
                "fecha_vencimiento": "2025-12-31",
                "es_permanente": False,
                "es_recurrente": False,
                "periodo_recurrencia": None
            },
            {
                "nombre": "Anuncio",
                "tipo": "municipal",
                "estado": "vigente",
                "fecha_inicio": "2026-01-01",
                "fecha_vencimiento": "2026-12-31",
                "es_permanente": False,
                "es_recurrente": True,
                "periodo_recurrencia": "anual"
            },
            {
                "nombre": "Protección Civil Visto Bueno",
                "tipo": "municipal",
                "estado": "vigente",
                "fecha_inicio": "2026-11-22",
                "fecha_vencimiento": "2027-11-22",
                "es_permanente": False,
                "es_recurrente": True,
                "periodo_recurrencia": "anual"
            },
            {
                "nombre": "Convenio de bomberos",
                "tipo": "municipal",
                "estado": "vigente",
                "fecha_inicio": "2025-10-09",
                "fecha_vencimiento": "2026-10-09",
                "es_permanente": False,
                "es_recurrente": True,
                "periodo_recurrencia": "anual"
            },
            {
                "nombre": "Licencia ambiental",
                "tipo": "estatal",
                "estado": "pendiente_documentacion",
                "fecha_inicio": "2026-06-10",
                "fecha_vencimiento": None,
                "es_permanente": False,
                "es_recurrente": True,
                "periodo_recurrencia": "anual"
            }
        ]
    },
    {
        "nombre": "T-022 Veracruz",
        "estado": "Veracruz",
        "municipio": "Veracruz",
        "direccion": "Av. Independencia S/N, Centro, C.P. 91700",
        "marcas": ["COMERCIAL IAC SA DE CV"],
        "tramites": [
            {
                "nombre": "Aviso de funcionamiento",
                "tipo": "federal",
                "estado": "vigente",
                "fecha_inicio": "2020-01-01",
                "fecha_vencimiento": None,
                "es_permanente": True,
                "es_recurrente": False,
                "periodo_recurrencia": None
            },
            {
                "nombre": "Uso de suelo",
                "tipo": "municipal",
                "estado": "vigente",
                "fecha_inicio": "2025-11-07",
                "fecha_vencimiento": "2026-11-07",
                "es_permanente": False,
                "es_recurrente": False,
                "periodo_recurrencia": None
            },
            {
                "nombre": "Anuncio",
                "tipo": "municipal",
                "estado": "pendiente_documentacion",
                "fecha_inicio": "2026-06-10",
                "fecha_vencimiento": None,
                "es_permanente": False,
                "es_recurrente": True,
                "periodo_recurrencia": "anual"
            },
            {
                "nombre": "Protección Civil Visto Bueno",
                "tipo": "municipal",
                "estado": "vigente",
                "fecha_inicio": "2025-12-12",
                "fecha_vencimiento": "2026-12-12",
                "es_permanente": False,
                "es_recurrente": True,
                "periodo_recurrencia": "anual"
            },
            {
                "nombre": "Licencia Ambiental",
                "tipo": "estatal",
                "estado": "pendiente_documentacion",
                "fecha_inicio": "2026-06-10",
                "fecha_vencimiento": None,
                "es_permanente": False,
                "es_recurrente": True,
                "periodo_recurrencia": "anual"
            },
            {
                "nombre": "Aviso de funcionamiento",
                "tipo": "federal",
                "estado": "vigente",
                "fecha_inicio": "2020-01-01",
                "fecha_vencimiento": None,
                "es_permanente": True,
                "es_recurrente": False,
                "periodo_recurrencia": None
            },
            {
                "nombre": "Uso de suelo",
                "tipo": "municipal",
                "estado": "vigente",
                "fecha_inicio": "2025-11-07",
                "fecha_vencimiento": "2026-11-07",
                "es_permanente": False,
                "es_recurrente": False,
                "periodo_recurrencia": None
            },
            {
                "nombre": "Anuncio",
                "tipo": "municipal",
                "estado": "pendiente_documentacion",
                "fecha_inicio": "2026-06-10",
                "fecha_vencimiento": None,
                "es_permanente": False,
                "es_recurrente": True,
                "periodo_recurrencia": "anual"
            },
            {
                "nombre": "Protección Civil Visto Bueno",
                "tipo": "municipal",
                "estado": "vigente",
                "fecha_inicio": "2025-12-12",
                "fecha_vencimiento": "2026-12-12",
                "es_permanente": False,
                "es_recurrente": True,
                "periodo_recurrencia": "anual"
            },
            {
                "nombre": "Licencia Ambiental",
                "tipo": "estatal",
                "estado": "pendiente_documentacion",
                "fecha_inicio": "2026-06-10",
                "fecha_vencimiento": None,
                "es_permanente": False,
                "es_recurrente": True,
                "periodo_recurrencia": "anual"
            }
        ]
    },
    {
        "nombre": "T-023 Chilpancingo",
        "estado": "Guerrero",
        "municipio": "Chilpancingo de los Bravo",
        "direccion": "Av. de los Insurgentes S/N, Centro, C.P. 39000",
        "marcas": ["COMERCIAL IAC SA DE CV"],
        "tramites": [
            {
                "nombre": "Aviso de funcionamiento",
                "tipo": "federal",
                "estado": "vigente",
                "fecha_inicio": "2026-01-01",
                "fecha_vencimiento": "2026-12-31",
                "es_permanente": False,
                "es_recurrente": True,
                "periodo_recurrencia": "anual"
            },
            {
                "nombre": "Uso de suelo",
                "tipo": "municipal",
                "estado": "vigente",
                "fecha_inicio": "2020-01-01",
                "fecha_vencimiento": None,
                "es_permanente": True,
                "es_recurrente": False,
                "periodo_recurrencia": None
            },
            {
                "nombre": "Anuncio",
                "tipo": "municipal",
                "estado": "vigente",
                "fecha_inicio": "2026-01-01",
                "fecha_vencimiento": "2026-12-31",
                "es_permanente": False,
                "es_recurrente": True,
                "periodo_recurrencia": "anual"
            },
            {
                "nombre": "Protección Civil Visto Bueno",
                "tipo": "municipal",
                "estado": "vigente",
                "fecha_inicio": "2026-01-01",
                "fecha_vencimiento": "2026-12-31",
                "es_permanente": False,
                "es_recurrente": True,
                "periodo_recurrencia": "anual"
            },
            {
                "nombre": "Dictamen de bomberos",
                "tipo": "municipal",
                "estado": "vigente",
                "fecha_inicio": "2026-01-01",
                "fecha_vencimiento": "2026-12-31",
                "es_permanente": False,
                "es_recurrente": True,
                "periodo_recurrencia": "anual"
            },
            {
                "nombre": "Dictamen de regulación de niveles máximos de sonido",
                "tipo": "municipal",
                "estado": "vigente",
                "fecha_inicio": "2026-01-01",
                "fecha_vencimiento": "2026-12-31",
                "es_permanente": False,
                "es_recurrente": True,
                "periodo_recurrencia": "anual"
            },
            {
                "nombre": "Licencia ambiental",
                "tipo": "estatal",
                "estado": "vigente",
                "fecha_inicio": "2026-01-01",
                "fecha_vencimiento": "2026-12-31",
                "es_permanente": False,
                "es_recurrente": True,
                "periodo_recurrencia": "anual"
            },
            {
                "nombre": "Aviso de funcionamiento",
                "tipo": "federal",
                "estado": "vigente",
                "fecha_inicio": "2026-01-01",
                "fecha_vencimiento": "2026-12-31",
                "es_permanente": False,
                "es_recurrente": True,
                "periodo_recurrencia": "anual"
            },
            {
                "nombre": "Uso de suelo",
                "tipo": "municipal",
                "estado": "vigente",
                "fecha_inicio": "2020-01-01",
                "fecha_vencimiento": None,
                "es_permanente": True,
                "es_recurrente": False,
                "periodo_recurrencia": None
            },
            {
                "nombre": "Anuncio",
                "tipo": "municipal",
                "estado": "vigente",
                "fecha_inicio": "2026-01-01",
                "fecha_vencimiento": "2026-12-31",
                "es_permanente": False,
                "es_recurrente": True,
                "periodo_recurrencia": "anual"
            },
            {
                "nombre": "Protección Civil Visto Bueno",
                "tipo": "municipal",
                "estado": "vigente",
                "fecha_inicio": "2026-01-01",
                "fecha_vencimiento": "2026-12-31",
                "es_permanente": False,
                "es_recurrente": True,
                "periodo_recurrencia": "anual"
            },
            {
                "nombre": "Dictamen de bomberos",
                "tipo": "municipal",
                "estado": "vigente",
                "fecha_inicio": "2026-01-01",
                "fecha_vencimiento": "2026-12-31",
                "es_permanente": False,
                "es_recurrente": True,
                "periodo_recurrencia": "anual"
            },
            {
                "nombre": "Dictamen de regulación de niveles máximos de sonido",
                "tipo": "municipal",
                "estado": "vigente",
                "fecha_inicio": "2026-01-01",
                "fecha_vencimiento": "2026-12-31",
                "es_permanente": False,
                "es_recurrente": True,
                "periodo_recurrencia": "anual"
            },
            {
                "nombre": "Licencia ambiental",
                "tipo": "estatal",
                "estado": "vigente",
                "fecha_inicio": "2026-01-01",
                "fecha_vencimiento": "2026-12-31",
                "es_permanente": False,
                "es_recurrente": True,
                "periodo_recurrencia": "anual"
            }
        ]
    },
    {
        "nombre": "T-024 Zamora",
        "estado": "Michoacán",
        "municipio": "Zamora",
        "direccion": "Calle Morelos S/N, Centro, C.P. 59600",
        "marcas": ["COMERCIAL IAC SA DE CV"],
        "tramites": [
            {
                "nombre": "Aviso de funcionamiento",
                "tipo": "federal",
                "estado": "vencido",
                "fecha_inicio": "2025-01-01",
                "fecha_vencimiento": "2025-12-31",
                "es_permanente": False,
                "es_recurrente": True,
                "periodo_recurrencia": "anual"
            },
            {
                "nombre": "Uso de suelo",
                "tipo": "municipal",
                "estado": "vigente",
                "fecha_inicio": "2020-01-01",
                "fecha_vencimiento": None,
                "es_permanente": True,
                "es_recurrente": False,
                "periodo_recurrencia": None
            },
            {
                "nombre": "Anuncio",
                "tipo": "municipal",
                "estado": "vencido",
                "fecha_inicio": "2025-01-01",
                "fecha_vencimiento": "2025-12-31",
                "es_permanente": False,
                "es_recurrente": True,
                "periodo_recurrencia": "anual"
            },
            {
                "nombre": "Protección Civil Visto Bueno",
                "tipo": "municipal",
                "estado": "vigente",
                "fecha_inicio": "2025-11-24",
                "fecha_vencimiento": "2026-11-24",
                "es_permanente": False,
                "es_recurrente": True,
                "periodo_recurrencia": "anual"
            },
            {
                "nombre": "Aprobación del Programa de Protección C",
                "tipo": "municipal",
                "estado": "vigente",
                "fecha_inicio": "2025-11-24",
                "fecha_vencimiento": "2026-11-24",
                "es_permanente": False,
                "es_recurrente": True,
                "periodo_recurrencia": "anual"
            },
            {
                "nombre": "Licencia Ambiental",
                "tipo": "estatal",
                "estado": "pendiente_documentacion",
                "fecha_inicio": "2026-06-10",
                "fecha_vencimiento": None,
                "es_permanente": False,
                "es_recurrente": True,
                "periodo_recurrencia": "anual"
            },
            {
                "nombre": "Aviso de funcionamiento",
                "tipo": "federal",
                "estado": "vencido",
                "fecha_inicio": "2025-01-01",
                "fecha_vencimiento": "2025-12-31",
                "es_permanente": False,
                "es_recurrente": True,
                "periodo_recurrencia": "anual"
            },
            {
                "nombre": "Uso de suelo",
                "tipo": "municipal",
                "estado": "vigente",
                "fecha_inicio": "2020-01-01",
                "fecha_vencimiento": None,
                "es_permanente": True,
                "es_recurrente": False,
                "periodo_recurrencia": None
            },
            {
                "nombre": "Anuncio",
                "tipo": "municipal",
                "estado": "vencido",
                "fecha_inicio": "2025-01-01",
                "fecha_vencimiento": "2025-12-31",
                "es_permanente": False,
                "es_recurrente": True,
                "periodo_recurrencia": "anual"
            },
            {
                "nombre": "Protección Civil Visto Bueno",
                "tipo": "municipal",
                "estado": "vigente",
                "fecha_inicio": "2025-11-24",
                "fecha_vencimiento": "2026-11-24",
                "es_permanente": False,
                "es_recurrente": True,
                "periodo_recurrencia": "anual"
            },
            {
                "nombre": "Aprobación del Programa de Protección C",
                "tipo": "municipal",
                "estado": "vigente",
                "fecha_inicio": "2025-11-24",
                "fecha_vencimiento": "2026-11-24",
                "es_permanente": False,
                "es_recurrente": True,
                "periodo_recurrencia": "anual"
            },
            {
                "nombre": "Licencia Ambiental",
                "tipo": "estatal",
                "estado": "pendiente_documentacion",
                "fecha_inicio": "2026-06-10",
                "fecha_vencimiento": None,
                "es_permanente": False,
                "es_recurrente": True,
                "periodo_recurrencia": "anual"
            }
        ]
    },
    {
        "nombre": "T-025 Uruapan",
        "estado": "Michoacán",
        "municipio": "Uruapan",
        "direccion": "Paseo Lázaro Cárdenas S/N, C.P. 60190",
        "marcas": ["COMERCIAL IAC SA DE CV"],
        "tramites": [
            {
                "nombre": "Aviso de funcionamiento",
                "tipo": "federal",
                "estado": "vigente",
                "fecha_inicio": "2026-01-01",
                "fecha_vencimiento": "2026-12-31",
                "es_permanente": False,
                "es_recurrente": True,
                "periodo_recurrencia": "anual"
            },
            {
                "nombre": "Uso de suelo",
                "tipo": "municipal",
                "estado": "vigente",
                "fecha_inicio": "2020-01-01",
                "fecha_vencimiento": None,
                "es_permanente": True,
                "es_recurrente": False,
                "periodo_recurrencia": None
            },
            {
                "nombre": "Anuncio",
                "tipo": "municipal",
                "estado": "vigente",
                "fecha_inicio": "2026-01-01",
                "fecha_vencimiento": "2026-12-31",
                "es_permanente": False,
                "es_recurrente": True,
                "periodo_recurrencia": "anual"
            },
            {
                "nombre": "Protección Civil Visto Bueno",
                "tipo": "municipal",
                "estado": "vigente",
                "fecha_inicio": "2025-10-26",
                "fecha_vencimiento": "2026-10-26",
                "es_permanente": False,
                "es_recurrente": True,
                "periodo_recurrencia": "anual"
            },
            {
                "nombre": "Licencia Ambiental",
                "tipo": "estatal",
                "estado": "pendiente_documentacion",
                "fecha_inicio": "2026-06-10",
                "fecha_vencimiento": None,
                "es_permanente": False,
                "es_recurrente": True,
                "periodo_recurrencia": "anual"
            },
            {
                "nombre": "Aviso de funcionamiento",
                "tipo": "federal",
                "estado": "vigente",
                "fecha_inicio": "2026-01-01",
                "fecha_vencimiento": "2026-12-31",
                "es_permanente": False,
                "es_recurrente": True,
                "periodo_recurrencia": "anual"
            },
            {
                "nombre": "Uso de suelo",
                "tipo": "municipal",
                "estado": "vigente",
                "fecha_inicio": "2020-01-01",
                "fecha_vencimiento": None,
                "es_permanente": True,
                "es_recurrente": False,
                "periodo_recurrencia": None
            },
            {
                "nombre": "Anuncio",
                "tipo": "municipal",
                "estado": "vigente",
                "fecha_inicio": "2026-01-01",
                "fecha_vencimiento": "2026-12-31",
                "es_permanente": False,
                "es_recurrente": True,
                "periodo_recurrencia": "anual"
            },
            {
                "nombre": "Protección Civil Visto Bueno",
                "tipo": "municipal",
                "estado": "vigente",
                "fecha_inicio": "2025-10-26",
                "fecha_vencimiento": "2026-10-26",
                "es_permanente": False,
                "es_recurrente": True,
                "periodo_recurrencia": "anual"
            },
            {
                "nombre": "Licencia Ambiental",
                "tipo": "estatal",
                "estado": "pendiente_documentacion",
                "fecha_inicio": "2026-06-10",
                "fecha_vencimiento": None,
                "es_permanente": False,
                "es_recurrente": True,
                "periodo_recurrencia": "anual"
            }
        ]
    },
    {
        "nombre": "T-028 Mérida",
        "estado": "Yucatán",
        "municipio": "Mérida",
        "direccion": "Calle 60 S/N, Centro, C.P. 97000",
        "marcas": ["COMERCIAL IAC SA DE CV"],
        "tramites": [
            {
                "nombre": "Aviso de funcionamiento",
                "tipo": "federal",
                "estado": "pendiente_documentacion",
                "fecha_inicio": "2026-06-10",
                "fecha_vencimiento": None,
                "es_permanente": False,
                "es_recurrente": True,
                "periodo_recurrencia": "anual"
            },
            {
                "nombre": "Uso de suelo",
                "tipo": "municipal",
                "estado": "pendiente_documentacion",
                "fecha_inicio": "2026-06-10",
                "fecha_vencimiento": None,
                "es_permanente": False,
                "es_recurrente": False,
                "periodo_recurrencia": None
            },
            {
                "nombre": "Anuncio",
                "tipo": "municipal",
                "estado": "pendiente_documentacion",
                "fecha_inicio": "2026-06-10",
                "fecha_vencimiento": None,
                "es_permanente": False,
                "es_recurrente": True,
                "periodo_recurrencia": "anual"
            },
            {
                "nombre": "Protección Civil Visto Bueno",
                "tipo": "municipal",
                "estado": "vigente",
                "fecha_inicio": "2025-09-22",
                "fecha_vencimiento": "2026-09-22",
                "es_permanente": False,
                "es_recurrente": True,
                "periodo_recurrencia": "anual"
            },
            {
                "nombre": "Licencia Ambiental",
                "tipo": "estatal",
                "estado": "pendiente_documentacion",
                "fecha_inicio": "2026-06-10",
                "fecha_vencimiento": None,
                "es_permanente": False,
                "es_recurrente": True,
                "periodo_recurrencia": "anual"
            },
            {
                "nombre": "Aviso de funcionamiento",
                "tipo": "federal",
                "estado": "pendiente_documentacion",
                "fecha_inicio": "2026-06-10",
                "fecha_vencimiento": None,
                "es_permanente": False,
                "es_recurrente": True,
                "periodo_recurrencia": "anual"
            },
            {
                "nombre": "Uso de suelo",
                "tipo": "municipal",
                "estado": "pendiente_documentacion",
                "fecha_inicio": "2026-06-10",
                "fecha_vencimiento": None,
                "es_permanente": False,
                "es_recurrente": False,
                "periodo_recurrencia": None
            },
            {
                "nombre": "Anuncio",
                "tipo": "municipal",
                "estado": "pendiente_documentacion",
                "fecha_inicio": "2026-06-10",
                "fecha_vencimiento": None,
                "es_permanente": False,
                "es_recurrente": True,
                "periodo_recurrencia": "anual"
            },
            {
                "nombre": "Protección Civil Visto Bueno",
                "tipo": "municipal",
                "estado": "vigente",
                "fecha_inicio": "2025-09-22",
                "fecha_vencimiento": "2026-09-22",
                "es_permanente": False,
                "es_recurrente": True,
                "periodo_recurrencia": "anual"
            },
            {
                "nombre": "Licencia Ambiental",
                "tipo": "estatal",
                "estado": "pendiente_documentacion",
                "fecha_inicio": "2026-06-10",
                "fecha_vencimiento": None,
                "es_permanente": False,
                "es_recurrente": True,
                "periodo_recurrencia": "anual"
            }
        ]
    },
    {
        "nombre": "T-030 Tuxpan",
        "estado": "Veracruz",
        "municipio": "Tuxpan",
        "direccion": "Blvd. Jesús Reyes Heroles S/N, Centro, C.P. 92800",
        "marcas": ["COMERCIAL IAC SA DE CV"],
        "tramites": [
            {
                "nombre": "Aviso de funcionamiento",
                "tipo": "federal",
                "estado": "vigente",
                "fecha_inicio": "2026-01-01",
                "fecha_vencimiento": "2026-12-31",
                "es_permanente": False,
                "es_recurrente": True,
                "periodo_recurrencia": "anual"
            },
            {
                "nombre": "Cedula de empadronamiento",
                "tipo": "municipal",
                "estado": "vigente",
                "fecha_inicio": "2026-01-01",
                "fecha_vencimiento": "2026-12-31",
                "es_permanente": False,
                "es_recurrente": True,
                "periodo_recurrencia": "anual"
            },
            {
                "nombre": "Uso de suelo",
                "tipo": "municipal",
                "estado": "vencido",
                "fecha_inicio": "2025-03-31",
                "fecha_vencimiento": "2026-03-31",
                "es_permanente": False,
                "es_recurrente": False,
                "periodo_recurrencia": None
            },
            {
                "nombre": "Anuncio",
                "tipo": "municipal",
                "estado": "vigente",
                "fecha_inicio": "2025-07-31",
                "fecha_vencimiento": "2026-07-31",
                "es_permanente": False,
                "es_recurrente": True,
                "periodo_recurrencia": "anual"
            },
            {
                "nombre": "Protección Civil Visto Bueno",
                "tipo": "municipal",
                "estado": "vencido",
                "fecha_inicio": "2024-12-16",
                "fecha_vencimiento": "2025-12-16",
                "es_permanente": False,
                "es_recurrente": True,
                "periodo_recurrencia": "anual"
            },
            {
                "nombre": "Licencia Ambiental",
                "tipo": "estatal",
                "estado": "pendiente_documentacion",
                "fecha_inicio": "2026-06-10",
                "fecha_vencimiento": None,
                "es_permanente": False,
                "es_recurrente": True,
                "periodo_recurrencia": "anual"
            },
            {
                "nombre": "Aviso de funcionamiento",
                "tipo": "federal",
                "estado": "vigente",
                "fecha_inicio": "2026-01-01",
                "fecha_vencimiento": "2026-12-31",
                "es_permanente": False,
                "es_recurrente": True,
                "periodo_recurrencia": "anual"
            },
            {
                "nombre": "Cedula de empadronamiento",
                "tipo": "municipal",
                "estado": "vigente",
                "fecha_inicio": "2026-01-01",
                "fecha_vencimiento": "2026-12-31",
                "es_permanente": False,
                "es_recurrente": True,
                "periodo_recurrencia": "anual"
            },
            {
                "nombre": "Uso de suelo",
                "tipo": "municipal",
                "estado": "vencido",
                "fecha_inicio": "2025-03-31",
                "fecha_vencimiento": "2026-03-31",
                "es_permanente": False,
                "es_recurrente": False,
                "periodo_recurrencia": None
            },
            {
                "nombre": "Anuncio",
                "tipo": "municipal",
                "estado": "vigente",
                "fecha_inicio": "2025-07-31",
                "fecha_vencimiento": "2026-07-31",
                "es_permanente": False,
                "es_recurrente": True,
                "periodo_recurrencia": "anual"
            },
            {
                "nombre": "Protección Civil Visto Bueno",
                "tipo": "municipal",
                "estado": "vencido",
                "fecha_inicio": "2024-12-16",
                "fecha_vencimiento": "2025-12-16",
                "es_permanente": False,
                "es_recurrente": True,
                "periodo_recurrencia": "anual"
            },
            {
                "nombre": "Licencia Ambiental",
                "tipo": "estatal",
                "estado": "pendiente_documentacion",
                "fecha_inicio": "2026-06-10",
                "fecha_vencimiento": None,
                "es_permanente": False,
                "es_recurrente": True,
                "periodo_recurrencia": "anual"
            }
        ]
    },
    {
        "nombre": "T-032 Tuxtla Gutiérrez",
        "estado": "Chiapas",
        "municipio": "Tuxtla Gutiérrez",
        "direccion": "Av. Central S/N, Centro, C.P. 29000",
        "marcas": ["COMERCIAL IAC SA DE CV"],
        "tramites": [
            {
                "nombre": "Aviso de funcionamiento",
                "tipo": "federal",
                "estado": "vigente",
                "fecha_inicio": "2025-10-16",
                "fecha_vencimiento": "2026-10-16",
                "es_permanente": False,
                "es_recurrente": True,
                "periodo_recurrencia": "anual"
            },
            {
                "nombre": "Uso de suelo",
                "tipo": "municipal",
                "estado": "vigente",
                "fecha_inicio": "2020-01-01",
                "fecha_vencimiento": None,
                "es_permanente": True,
                "es_recurrente": False,
                "periodo_recurrencia": None
            },
            {
                "nombre": "Anuncio",
                "tipo": "municipal",
                "estado": "vencido",
                "fecha_inicio": "2025-01-01",
                "fecha_vencimiento": "2025-12-31",
                "es_permanente": False,
                "es_recurrente": True,
                "periodo_recurrencia": "anual"
            },
            {
                "nombre": "Protección Civil Visto Bueno",
                "tipo": "municipal",
                "estado": "vencido",
                "fecha_inicio": "2024-06-03",
                "fecha_vencimiento": "2025-06-03",
                "es_permanente": False,
                "es_recurrente": True,
                "periodo_recurrencia": "anual"
            },
            {
                "nombre": "Licencia Ambiental",
                "tipo": "estatal",
                "estado": "pendiente_documentacion",
                "fecha_inicio": "2026-06-10",
                "fecha_vencimiento": None,
                "es_permanente": False,
                "es_recurrente": True,
                "periodo_recurrencia": "anual"
            },
            {
                "nombre": "Aviso de funcionamiento",
                "tipo": "federal",
                "estado": "vigente",
                "fecha_inicio": "2025-10-16",
                "fecha_vencimiento": "2026-10-16",
                "es_permanente": False,
                "es_recurrente": True,
                "periodo_recurrencia": "anual"
            },
            {
                "nombre": "Uso de suelo",
                "tipo": "municipal",
                "estado": "vigente",
                "fecha_inicio": "2020-01-01",
                "fecha_vencimiento": None,
                "es_permanente": True,
                "es_recurrente": False,
                "periodo_recurrencia": None
            },
            {
                "nombre": "Anuncio",
                "tipo": "municipal",
                "estado": "vencido",
                "fecha_inicio": "2025-01-01",
                "fecha_vencimiento": "2025-12-31",
                "es_permanente": False,
                "es_recurrente": True,
                "periodo_recurrencia": "anual"
            },
            {
                "nombre": "Protección Civil Visto Bueno",
                "tipo": "municipal",
                "estado": "vencido",
                "fecha_inicio": "2024-06-03",
                "fecha_vencimiento": "2025-06-03",
                "es_permanente": False,
                "es_recurrente": True,
                "periodo_recurrencia": "anual"
            },
            {
                "nombre": "Licencia Ambiental",
                "tipo": "estatal",
                "estado": "pendiente_documentacion",
                "fecha_inicio": "2026-06-10",
                "fecha_vencimiento": None,
                "es_permanente": False,
                "es_recurrente": True,
                "periodo_recurrencia": "anual"
            }
        ]
    },
    {
        "nombre": "T-034 Villa Hermosa",
        "estado": "Tabasco",
        "municipio": "Centro",
        "direccion": "Paseo Tabasco S/N, Tabasco 2000, C.P. 86035",
        "marcas": ["COMERCIAL IAC SA DE CV"],
        "tramites": [
            {
                "nombre": "Aviso de funcionamiento",
                "tipo": "federal",
                "estado": "vencido",
                "fecha_inicio": "2025-01-01",
                "fecha_vencimiento": "2025-12-31",
                "es_permanente": False,
                "es_recurrente": True,
                "periodo_recurrencia": "anual"
            },
            {
                "nombre": "Uso de suelo",
                "tipo": "municipal",
                "estado": "pendiente_documentacion",
                "fecha_inicio": "2026-06-10",
                "fecha_vencimiento": None,
                "es_permanente": False,
                "es_recurrente": False,
                "periodo_recurrencia": None
            },
            {
                "nombre": "Anuncio",
                "tipo": "municipal",
                "estado": "pendiente_documentacion",
                "fecha_inicio": "2026-06-10",
                "fecha_vencimiento": None,
                "es_permanente": False,
                "es_recurrente": True,
                "periodo_recurrencia": "anual"
            },
            {
                "nombre": "Protección Civil Visto Bueno",
                "tipo": "municipal",
                "estado": "vigente",
                "fecha_inicio": "2025-10-22",
                "fecha_vencimiento": "2026-10-22",
                "es_permanente": False,
                "es_recurrente": True,
                "periodo_recurrencia": "anual"
            },
            {
                "nombre": "Licencia Ambiental",
                "tipo": "estatal",
                "estado": "pendiente_documentacion",
                "fecha_inicio": "2026-06-10",
                "fecha_vencimiento": None,
                "es_permanente": False,
                "es_recurrente": True,
                "periodo_recurrencia": "anual"
            },
            {
                "nombre": "Aviso de funcionamiento",
                "tipo": "federal",
                "estado": "vencido",
                "fecha_inicio": "2025-01-01",
                "fecha_vencimiento": "2025-12-31",
                "es_permanente": False,
                "es_recurrente": True,
                "periodo_recurrencia": "anual"
            },
            {
                "nombre": "Uso de suelo",
                "tipo": "municipal",
                "estado": "pendiente_documentacion",
                "fecha_inicio": "2026-06-10",
                "fecha_vencimiento": None,
                "es_permanente": False,
                "es_recurrente": False,
                "periodo_recurrencia": None
            },
            {
                "nombre": "Anuncio",
                "tipo": "municipal",
                "estado": "pendiente_documentacion",
                "fecha_inicio": "2026-06-10",
                "fecha_vencimiento": None,
                "es_permanente": False,
                "es_recurrente": True,
                "periodo_recurrencia": "anual"
            },
            {
                "nombre": "Protección Civil Visto Bueno",
                "tipo": "municipal",
                "estado": "vigente",
                "fecha_inicio": "2025-10-22",
                "fecha_vencimiento": "2026-10-22",
                "es_permanente": False,
                "es_recurrente": True,
                "periodo_recurrencia": "anual"
            },
            {
                "nombre": "Licencia Ambiental",
                "tipo": "estatal",
                "estado": "pendiente_documentacion",
                "fecha_inicio": "2026-06-10",
                "fecha_vencimiento": None,
                "es_permanente": False,
                "es_recurrente": True,
                "periodo_recurrencia": "anual"
            }
        ]
    },
    {
        "nombre": "T-035 Cuautla Bravos",
        "estado": "Morelos",
        "municipio": "Cuautla",
        "direccion": "Los Bravos S/N, Centro, C.P. 62740",
        "marcas": ["COMERCIAL IAC SA DE CV"],
        "tramites": [
            {
                "nombre": "Aviso de funcionamiento",
                "tipo": "federal",
                "estado": "vigente",
                "fecha_inicio": "2026-01-01",
                "fecha_vencimiento": "2026-12-31",
                "es_permanente": False,
                "es_recurrente": True,
                "periodo_recurrencia": "anual"
            },
            {
                "nombre": "Uso de suelo",
                "tipo": "municipal",
                "estado": "vigente",
                "fecha_inicio": "2020-01-01",
                "fecha_vencimiento": None,
                "es_permanente": True,
                "es_recurrente": False,
                "periodo_recurrencia": None
            },
            {
                "nombre": "Anuncio",
                "tipo": "municipal",
                "estado": "vigente",
                "fecha_inicio": "2026-01-01",
                "fecha_vencimiento": "2026-12-31",
                "es_permanente": False,
                "es_recurrente": True,
                "periodo_recurrencia": "anual"
            },
            {
                "nombre": "Protección Civil Visto Bueno",
                "tipo": "municipal",
                "estado": "vigente",
                "fecha_inicio": "2026-01-01",
                "fecha_vencimiento": "2026-12-31",
                "es_permanente": False,
                "es_recurrente": True,
                "periodo_recurrencia": "anual"
            },
            {
                "nombre": "Aprobación del programa de Protección C",
                "tipo": "municipal",
                "estado": "vigente",
                "fecha_inicio": "2026-01-01",
                "fecha_vencimiento": "2026-12-31",
                "es_permanente": False,
                "es_recurrente": True,
                "periodo_recurrencia": "anual"
            },
            {
                "nombre": "Licencia Ambiental",
                "tipo": "estatal",
                "estado": "pendiente_documentacion",
                "fecha_inicio": "2026-06-10",
                "fecha_vencimiento": None,
                "es_permanente": False,
                "es_recurrente": True,
                "periodo_recurrencia": "anual"
            },
            {
                "nombre": "Aviso de funcionamiento",
                "tipo": "federal",
                "estado": "vigente",
                "fecha_inicio": "2026-01-01",
                "fecha_vencimiento": "2026-12-31",
                "es_permanente": False,
                "es_recurrente": True,
                "periodo_recurrencia": "anual"
            },
            {
                "nombre": "Uso de suelo",
                "tipo": "municipal",
                "estado": "vigente",
                "fecha_inicio": "2020-01-01",
                "fecha_vencimiento": None,
                "es_permanente": True,
                "es_recurrente": False,
                "periodo_recurrencia": None
            },
            {
                "nombre": "Anuncio",
                "tipo": "municipal",
                "estado": "vigente",
                "fecha_inicio": "2026-01-01",
                "fecha_vencimiento": "2026-12-31",
                "es_permanente": False,
                "es_recurrente": True,
                "periodo_recurrencia": "anual"
            },
            {
                "nombre": "Protección Civil Visto Bueno",
                "tipo": "municipal",
                "estado": "vigente",
                "fecha_inicio": "2026-01-01",
                "fecha_vencimiento": "2026-12-31",
                "es_permanente": False,
                "es_recurrente": True,
                "periodo_recurrencia": "anual"
            },
            {
                "nombre": "Aprobación del programa de Protección C",
                "tipo": "municipal",
                "estado": "vigente",
                "fecha_inicio": "2026-01-01",
                "fecha_vencimiento": "2026-12-31",
                "es_permanente": False,
                "es_recurrente": True,
                "periodo_recurrencia": "anual"
            },
            {
                "nombre": "Licencia Ambiental",
                "tipo": "estatal",
                "estado": "pendiente_documentacion",
                "fecha_inicio": "2026-06-10",
                "fecha_vencimiento": None,
                "es_permanente": False,
                "es_recurrente": True,
                "periodo_recurrencia": "anual"
            }
        ]
    },
    {
        "nombre": "T-037 Apizaco",
        "estado": "Tlaxcala",
        "municipio": "Apizaco",
        "direccion": "Av. 16 de Septiembre S/N, Centro, C.P. 90300",
        "marcas": ["COMERCIAL IAC SA DE CV"],
        "tramites": [
            {
                "nombre": "Aviso de funcionamiento",
                "tipo": "federal",
                "estado": "pendiente_documentacion",
                "fecha_inicio": "2026-06-10",
                "fecha_vencimiento": None,
                "es_permanente": False,
                "es_recurrente": True,
                "periodo_recurrencia": "anual"
            },
            {
                "nombre": "Uso de suelo",
                "tipo": "municipal",
                "estado": "pendiente_documentacion",
                "fecha_inicio": "2026-06-10",
                "fecha_vencimiento": None,
                "es_permanente": False,
                "es_recurrente": False,
                "periodo_recurrencia": None
            },
            {
                "nombre": "Anuncio",
                "tipo": "municipal",
                "estado": "pendiente_documentacion",
                "fecha_inicio": "2026-06-10",
                "fecha_vencimiento": None,
                "es_permanente": False,
                "es_recurrente": True,
                "periodo_recurrencia": "anual"
            },
            {
                "nombre": "Protección Civil Visto Bueno",
                "tipo": "municipal",
                "estado": "vencido",
                "fecha_inicio": "2025-01-01",
                "fecha_vencimiento": "2025-12-31",
                "es_permanente": False,
                "es_recurrente": True,
                "periodo_recurrencia": "anual"
            },
            {
                "nombre": "Licencia Ambiental",
                "tipo": "estatal",
                "estado": "vencido",
                "fecha_inicio": "2025-01-01",
                "fecha_vencimiento": "2025-12-31",
                "es_permanente": False,
                "es_recurrente": True,
                "periodo_recurrencia": "anual"
            },
            {
                "nombre": "Aviso de funcionamiento",
                "tipo": "federal",
                "estado": "pendiente_documentacion",
                "fecha_inicio": "2026-06-10",
                "fecha_vencimiento": None,
                "es_permanente": False,
                "es_recurrente": True,
                "periodo_recurrencia": "anual"
            },
            {
                "nombre": "Uso de suelo",
                "tipo": "municipal",
                "estado": "pendiente_documentacion",
                "fecha_inicio": "2026-06-10",
                "fecha_vencimiento": None,
                "es_permanente": False,
                "es_recurrente": False,
                "periodo_recurrencia": None
            },
            {
                "nombre": "Anuncio",
                "tipo": "municipal",
                "estado": "pendiente_documentacion",
                "fecha_inicio": "2026-06-10",
                "fecha_vencimiento": None,
                "es_permanente": False,
                "es_recurrente": True,
                "periodo_recurrencia": "anual"
            },
            {
                "nombre": "Protección Civil Visto Bueno",
                "tipo": "municipal",
                "estado": "vencido",
                "fecha_inicio": "2025-01-01",
                "fecha_vencimiento": "2025-12-31",
                "es_permanente": False,
                "es_recurrente": True,
                "periodo_recurrencia": "anual"
            },
            {
                "nombre": "Licencia Ambiental",
                "tipo": "estatal",
                "estado": "vencido",
                "fecha_inicio": "2025-01-01",
                "fecha_vencimiento": "2025-12-31",
                "es_permanente": False,
                "es_recurrente": True,
                "periodo_recurrencia": "anual"
            }
        ]
    },
    {
        "nombre": "T-038 Toluca",
        "estado": "Estado de México",
        "municipio": "Toluca",
        "direccion": "Av. Benito Juárez S/N, Centro, C.P. 50000",
        "marcas": ["COMERCIAL IAC SA DE CV"],
        "tramites": [
            {
                "nombre": "Aviso de funcionamiento",
                "tipo": "federal",
                "estado": "en_revision",
                "fecha_inicio": "2025-01-01",
                "fecha_vencimiento": "2025-12-31",
                "es_permanente": False,
                "es_recurrente": True,
                "periodo_recurrencia": "anual"
            },
            {
                "nombre": "Uso de suelo",
                "tipo": "municipal",
                "estado": "vigente",
                "fecha_inicio": "2020-01-01",
                "fecha_vencimiento": None,
                "es_permanente": True,
                "es_recurrente": False,
                "periodo_recurrencia": None
            },
            {
                "nombre": "Anuncio",
                "tipo": "municipal",
                "estado": "vencido",
                "fecha_inicio": "2025-01-01",
                "fecha_vencimiento": "2025-12-31",
                "es_permanente": False,
                "es_recurrente": True,
                "periodo_recurrencia": "anual"
            },
            {
                "nombre": "Protección Civil Visto Bueno",
                "tipo": "municipal",
                "estado": "vigente",
                "fecha_inicio": "2025-08-12",
                "fecha_vencimiento": "2026-08-12",
                "es_permanente": False,
                "es_recurrente": True,
                "periodo_recurrencia": "anual"
            },
            {
                "nombre": "Licencia Ambiental",
                "tipo": "estatal",
                "estado": "pendiente_documentacion",
                "fecha_inicio": "2026-06-10",
                "fecha_vencimiento": None,
                "es_permanente": False,
                "es_recurrente": True,
                "periodo_recurrencia": "anual"
            },
            {
                "nombre": "Aviso de funcionamiento",
                "tipo": "federal",
                "estado": "en_revision",
                "fecha_inicio": "2025-01-01",
                "fecha_vencimiento": "2025-12-31",
                "es_permanente": False,
                "es_recurrente": True,
                "periodo_recurrencia": "anual"
            },
            {
                "nombre": "Uso de suelo",
                "tipo": "municipal",
                "estado": "vigente",
                "fecha_inicio": "2020-01-01",
                "fecha_vencimiento": None,
                "es_permanente": True,
                "es_recurrente": False,
                "periodo_recurrencia": None
            },
            {
                "nombre": "Anuncio",
                "tipo": "municipal",
                "estado": "vencido",
                "fecha_inicio": "2025-01-01",
                "fecha_vencimiento": "2025-12-31",
                "es_permanente": False,
                "es_recurrente": True,
                "periodo_recurrencia": "anual"
            },
            {
                "nombre": "Protección Civil Visto Bueno",
                "tipo": "municipal",
                "estado": "vigente",
                "fecha_inicio": "2025-08-12",
                "fecha_vencimiento": "2026-08-12",
                "es_permanente": False,
                "es_recurrente": True,
                "periodo_recurrencia": "anual"
            },
            {
                "nombre": "Licencia Ambiental",
                "tipo": "estatal",
                "estado": "pendiente_documentacion",
                "fecha_inicio": "2026-06-10",
                "fecha_vencimiento": None,
                "es_permanente": False,
                "es_recurrente": True,
                "periodo_recurrencia": "anual"
            }
        ]
    }
]

async def seed():
    async with AsyncSessionLocal() as db:
        admin = Usuario(
            id=str(uuid.uuid4()),
            nombre="Admin",
            email="admin@vertiche.com",
            password_hash=hash_password("password"),
            rol="ADMIN",
            estado="activo",
        )

        db.add(admin)
        await db.flush()

        for tienda in INITIAL_DATABASE:
            t = await tienda_service.create(
                db,
                actor=admin,
                nombre=tienda["nombre"],
                estado=tienda["estado"],
                municipio=tienda["municipio"],
                direccion=tienda["direccion"],
                marcas=tienda["marcas"],
            )

            total_tramites = len(tienda["tramites"])
            
            tramites_2025 = tienda["tramites"][:total_tramites//2]
            for tramite in tramites_2025:
                await tramite_service.create(
                    db,
                    actor=admin,
                    tienda_id=t.id,
                    nombre=tramite["nombre"] + " 2025",
                    estado=TramiteEstado(tramite["estado"]),
                    tipo=TramiteTipo(tramite["tipo"]),
                    fecha_inicio=tramite["fecha_inicio"],
                    fecha_vencimiento=tramite["fecha_vencimiento"],
                    es_permanente=tramite["es_permanente"],
                    es_recurrente=tramite["es_recurrente"],
                    periodo_recurrencia=(
                        TramitePeriodoRecurrencia(tramite["periodo_recurrencia"])
                        if tramite["periodo_recurrencia"]
                        else None
                    ),
                )
            
            tramites_2026 = tienda["tramites"][total_tramites//2:]
            for tramite in tramites_2026:
                await tramite_service.create(
                    db,
                    actor=admin,
                    tienda_id=t.id,
                    nombre=tramite["nombre"] + " 2026",
                    estado=TramiteEstado(tramite["estado"]),
                    tipo=TramiteTipo(tramite["tipo"]),
                    fecha_inicio=tramite["fecha_inicio"],
                    fecha_vencimiento=tramite["fecha_vencimiento"],
                    es_permanente=tramite["es_permanente"],
                    es_recurrente=tramite["es_recurrente"],
                    periodo_recurrencia=(
                        TramitePeriodoRecurrencia(tramite["periodo_recurrencia"])
                        if tramite["periodo_recurrencia"]
                        else None
                    ),
                )
            
            
            await db.commit()


def main():
    asyncio.run(seed())


if __name__ == "__main__":
    main()