import asyncio
import random


async def extract_text_mock(url: str) -> dict:
    """
    Mock implementation of OCR text extraction.
    Simulates network/processing delay and returns dummy data.
    """
    await asyncio.sleep(2)  # Simulate processing time

    # Generate some dummy extracted fields with mock confidence scores
    datos_extraidos = {
        "entidad_emisora": {
            "value": "Municipio de Prueba",
            "confidence": random.uniform(0.7, 0.99),
        },
        "fecha_expedicion": {
            "value": "2023-01-15",
            "confidence": random.uniform(0.6, 0.99),
        },
        "titular": {
            "value": "Vertiche S.A. de C.V.",
            "confidence": random.uniform(0.8, 0.99),
        },
        "folio": {
            "value": f"FOL-{random.randint(1000, 9999)}",
            "confidence": random.uniform(0.5, 0.9),
        },
    }

    return datos_extraidos
