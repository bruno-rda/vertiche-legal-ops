from __future__ import annotations

import json
import logging
import re
from dataclasses import dataclass
from datetime import date, datetime
from typing import Optional

import httpx

from app.config import settings

logger = logging.getLogger(__name__)


@dataclass
class DocumentoGestoria:
    tipo_tramite: Optional[str] = None
    categoria: Optional[str] = None
    nombre_comercio: Optional[str] = None
    razon_social: Optional[str] = None
    sucursal_id: Optional[str] = None
    direccion: Optional[str] = None
    municipio: Optional[str] = None
    estado: Optional[str] = None
    emisor: Optional[str] = None
    folio: Optional[str] = None
    numero_oficio: Optional[str] = None
    fecha_expedicion: Optional[date] = None
    fecha_inicio_vigencia: Optional[date] = None
    fecha_fin_vigencia: Optional[date] = None
    es_permanente: bool = False
    monto: Optional[float] = None
    moneda: str = "MXN"
    confianza_extraccion: str = "alta"
    notas_extraccion: Optional[str] = None


EXTRACTION_PROMPT = r"""
Eres un extractor de datos para documentos oficiales mexicanos de gestoría.

Debes extraer de forma conservadora los campos útiles para alertas de vencimiento.
Prioridad real del sistema:
1. sucursal / tienda,
2. tipo de trámite,
3. vigencia o fecha de fin,
4. si es permanente,
5. fecha de expedición o trámite.

Reglas:
- Responde únicamente JSON válido. Sin markdown.
- Si no estás seguro, usa null y explica brevemente en notas_extraccion.
- Para categoria usa SOLO: LF, US, AN, PC, PIPC, BOM, ALN, AMB, BAS, CFDI, OTRO.
  LF=Licencia/Aviso funcionamiento; US=Uso suelo; AN=Anuncio; PC=Protección Civil;
  PIPC=Constancia No Obligatoriedad PIPC; BOM=Bomberos/incendios; ALN=Alineamiento/Número oficial;
  AMB=Ecología/ambiental/ruido/control ambiental; BAS=Basura/residuos; CFDI=Factura/pago.
- Si el documento dice permanente, indefinido, no vence o sin vencimiento: es_permanente=true y fecha_fin_vigencia=null.
- Fechas siempre YYYY-MM-DD.
- Si solo hay año de vigencia y el documento parece anual, puedes usar YYYY-12-31 y aclararlo en notas.
- Si es factura/comprobante, categoria puede ser CFDI, pero en notas indica a qué trámite parece corresponder.

JSON exacto:
{
  "tipo_tramite": null,
  "categoria": "OTRO",
  "nombre_comercio": null,
  "razon_social": null,
  "sucursal_id": null,
  "direccion": null,
  "municipio": null,
  "estado": null,
  "emisor": null,
  "folio": null,
  "numero_oficio": null,
  "fecha_expedicion": null,
  "fecha_inicio_vigencia": null,
  "fecha_fin_vigencia": null,
  "es_permanente": false,
  "monto": null,
  "moneda": "MXN",
  "confianza_extraccion": "media",
  "notas_extraccion": null
}

Texto OCR/PDF:
__RAW_TEXT__
"""


class FieldExtractor:
    def __init__(self, url: Optional[str] = None, model: Optional[str] = None, timeout: Optional[int] = None):
        self.url = url or settings.ollama_url
        self.model = model or settings.ollama_model
        self.timeout = timeout or settings.ollama_timeout

    def _parse_date(self, value: Optional[str]) -> Optional[date]:
        if not value:
            return None
        
        val = str(value).strip()[:10]
        for fmt in ("%Y-%m-%d", "%d/%m/%Y", "%d-%m-%Y", "%Y"):
            try:
                parsed = datetime.strptime(val, fmt).date()
                return date(parsed.year, 12, 31) if fmt == "%Y" else parsed
            except ValueError:
                continue
        return None

    def _fallback_result(self, error_note: str) -> DocumentoGestoria:
        return DocumentoGestoria(
            categoria="OTRO",
            confianza_extraccion="baja",
            notas_extraccion=error_note,
        )

    def _fetch_llm_data(self, raw_text: str) -> dict:
        prompt = EXTRACTION_PROMPT.replace("__RAW_TEXT__", raw_text[:12000])
        payload = {
            "model": self.model,
            "stream": False,
            "messages": [
                {
                    "role": "system",
                    "content": "Respondes únicamente con JSON válido. Eres conservador y preciso extrayendo trámites mexicanos.",
                },
                {"role": "user", "content": prompt},
            ],
            "options": {"temperature": 0, "num_predict": 1200},
        }
        
        response = httpx.post(self.url, json=payload, timeout=self.timeout)
        response.raise_for_status()
        
        text = response.json().get("message", {}).get("content", "").strip()
        text = re.sub(r"^```(?:json)?\s*|\s*```\s*$", "", text, flags=re.MULTILINE)
        
        if match := re.search(r"\{[\s\S]+\}", text):
            text = match.group(0)
            
        return json.loads(text)

    def extract(self, raw_text: str) -> DocumentoGestoria:
        if not raw_text or not raw_text.strip():
            return self._fallback_result("Texto OCR/PDF vacío")

        try:
            data = self._fetch_llm_data(raw_text)
        except Exception as e:
            logger.warning(f"Extracción LLM falló: {e}")
            return self._fallback_result(f"Extracción LLM fallida: {e}; usando heurísticas.")

        return DocumentoGestoria(
            tipo_tramite=data.get("tipo_tramite"),
            categoria=data.get("categoria", "OTRO"),
            nombre_comercio=data.get("nombre_comercio"),
            razon_social=data.get("razon_social"),
            sucursal_id=data.get("sucursal_id"),
            direccion=data.get("direccion"),
            municipio=data.get("municipio"),
            estado=data.get("estado"),
            emisor=data.get("emisor"),
            folio=data.get("folio"),
            numero_oficio=data.get("numero_oficio"),
            fecha_expedicion=self._parse_date(data.get("fecha_expedicion")),
            fecha_inicio_vigencia=self._parse_date(data.get("fecha_inicio_vigencia")),
            fecha_fin_vigencia=self._parse_date(data.get("fecha_fin_vigencia")),
            es_permanente=bool(data.get("es_permanente", False)),
            monto=data.get("monto"),
            moneda=data.get("moneda", "MXN"),
            confianza_extraccion=data.get("confianza_extraccion", "media"),
            notas_extraccion=data.get("notas_extraccion"),
        )
