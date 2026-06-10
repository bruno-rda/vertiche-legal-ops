from __future__ import annotations

import re
import unicodedata
from dataclasses import dataclass, field
from datetime import date
from pathlib import Path
from typing import Optional


MONTH_MAP = {
    "ene": 1, "enero": 1, "feb": 2, "febrero": 2, "mar": 3, "marzo": 3,
    "abr": 4, "abril": 4, "may": 5, "mayo": 5, "jun": 6, "junio": 6,
    "jul": 7, "julio": 7, "ago": 8, "agosto": 8, "sep": 9, "sept": 9, "septiembre": 9,
    "oct": 10, "octubre": 10, "nov": 11, "noviembre": 11, "dic": 12, "diciembre": 12,
}

CATEGORY_NAMES = {
    "LF": "Licencia / Aviso de Funcionamiento",
    "US": "Uso de Suelo / Zonificación",
    "AN": "Anuncio Publicitario",
    "PC": "Protección Civil / Vo.Bo. / PIPC",
    "PIPC": "Constancia de No Obligatoriedad de PIPC",
    "BOM": "Bomberos / Dictamen contra incendios",
    "ALN": "Alineamiento y Número Oficial",
    "AMB": "Ambiental / Ecología / Ruido / Control Ambiental",
    "BAS": "Basura / Recolección de residuos",
    "CFDI": "Factura CFDI / Comprobante de pago",
    "OTRO": "Otro trámite",
}

SUPPORT_CATEGORIES = {"CFDI"}

FILENAME_PATTERNS = [
    ("US", 60, r"\b(u\s*\.?\s*s\.?|uso\s+de\s+suelo|uso\s+del\s+suelo|zonificaci[oó]n|zoni)\b", "filename: uso de suelo/zonificacion"),
    ("LF", 55, r"\b(l\s*\.?\s*f\.?|lic(?:encia)?\s+funcionamiento|licencia|aviso\s+de\s+funcionamiento|funcionamiento)\b", "filename: licencia/funcionamiento"),
    ("PC", 55, r"\b(p\s*\.?\s*c\.?|protecci[oó]n\s+civil|v\s*\.?\s*o\s*\.?\s*b\s*\.?\s*o\.?|vobo|vo\s*bo|pipc|no\s+obligatoriedad)\b", "filename: proteccion civil"),
    ("AN", 50, r"\b(anuncio|anuncios|publicidad|publicitario|publicitaria)\b", "filename: anuncio/publicidad"),
    ("ALN", 50, r"\b(alineamiento|n[uú]mero\s+oficial|numero\s+oficial|no\.?\s+oficial)\b", "filename: alineamiento/numero oficial"),
    ("AMB", 45, r"\b(ambiental|ecolog[ií]a|ecologia|ruido|control\s+ambiental)\b", "filename: ambiental"),
    ("BAS", 45, r"\b(basura|residuos|recolecci[oó]n)\b", "filename: basura"),
    ("BOM", 45, r"\b(bomberos|dictamen\s+(?:de\s+)?(?:seguridad|incendios)|contra\s+incendios|incendios)\b", "filename: bomberos"),
]

HEADER_PATTERNS = [
    ("US", 70, ["certificado unico de zonificacion", "certificado unico de zonificaci", "uso del suelo", "uso de suelo", "zonificacion"], "header: uso de suelo"),
    ("LF", 60, ["licencia de funcionamiento", "aviso de funcionamiento", "funcionamiento"], "header: funcionamiento"),
    ("PC", 60, ["proteccion civil", "programa interno de proteccion civil", "pipc", "no obligatoriedad"], "header: proteccion civil"),
    ("AN", 50, ["anuncio", "publicidad exterior", "publicitario"], "header: anuncio"),
    ("ALN", 50, ["alineamiento", "numero oficial", "número oficial"], "header: alineamiento"),
    ("AMB", 50, ["ambiental", "ecologia", "ecología", "emision de ruido", "ruido"], "header: ambiental"),
    ("BAS", 50, ["basura", "residuos", "recoleccion de residuos", "recolección de residuos"], "header: basura"),
    ("BOM", 55, ["bomberos", "dictamen de bomberos", "dictamen contra incendios", "prevencion contra incendios"], "header: bomberos"),
]

BODY_PATTERNS = [
    ("US", 18, ["uso del suelo", "uso de suelo", "zonificacion", "zonificación", "desarrollo urbano y vivienda"], "body: uso de suelo"),
    ("LF", 15, ["licencia de funcionamiento", "aviso de funcionamiento"], "body: funcionamiento"),
    ("PC", 16, ["proteccion civil", "protección civil", "programa interno", "pipc"], "body: proteccion civil"),
    ("AN", 14, ["anuncio", "publicidad"], "body: anuncio"),
    ("ALN", 14, ["alineamiento", "numero oficial", "número oficial"], "body: alineamiento"),
    ("AMB", 14, ["ambiental", "ecologia", "ecología", "emision de ruido", "emisión de ruido"], "body: ambiental"),
    ("BAS", 12, ["basura", "residuos"], "body: basura"),
    ("BOM", 18, ["bomberos", "dictamen contra incendios", "dictamen de seguridad contra incendios"], "body: bomberos"),
]

PERMANENT_PHRASES = [
    "permanente", "vigencia permanente", "indefinida", 
    "sin vencimiento", "no vence", "no tiene vencimiento",
]


@dataclass
class DocumentHints:
    sucursal_codigo: Optional[str] = None
    sucursal_nombre: Optional[str] = None
    carpeta_sucursal: Optional[str] = None
    anio_carpeta: Optional[int] = None
    anio_archivo: Optional[int] = None
    categoria: Optional[str] = None
    tipo_tramite: Optional[str] = None
    categoria_fuente: Optional[str] = None
    categoria_score: int = 0
    es_factura: bool = False
    es_acuse: bool = False
    es_permanente: bool = False
    fecha_expedicion: Optional[date] = None
    fecha_inicio_vigencia: Optional[date] = None
    fecha_fin_vigencia: Optional[date] = None
    fecha_fuente: Optional[str] = None
    confianza: str = "media"
    notas: list[str] = field(default_factory=list)

    @property
    def anio(self) -> Optional[int]:
        return self.anio_carpeta or self.anio_archivo


def normalize_text(value: str) -> str:
    value = unicodedata.normalize("NFD", value or "")
    value = "".join(ch for ch in value if unicodedata.category(ch) != "Mn")
    value = re.sub(r"[^a-z0-9]+", " ", value.lower())
    return re.sub(r"\s+", " ", value).strip()


def extract_sucursal_code(value: str | None) -> Optional[str]:
    if not value:
        return None
    match = re.search(r"\b[tT]\s*[-_ ]?\s*(\d{1,3})\b", value)
    if not match:
        match = re.search(r"\b(?:suc(?:ursal)?\.?|tienda)\s*[-_ ]?\s*(\d{1,3})\b", value, flags=re.I)
    if not match:
        return None
    return f"T-{int(match.group(1)):03d}"


def parse_sucursal_from_path(pdf_path: Path, root: Path | None = None) -> tuple[Optional[str], Optional[str], Optional[str]]:
    parts = pdf_path.relative_to(root).parts if root and pdf_path.is_relative_to(root) else pdf_path.parts
    candidates = list(parts)

    folder_name = parts[0] if root and len(parts) >= 2 else None

    for candidate in candidates:
        code = extract_sucursal_code(candidate)
        if code:
            name = re.sub(r"^\s*[tT]\s*[-_ ]?\s*\d{1,3}\s*[-_ ]?\s*", "", candidate).strip(" -_")
            name = f"Sucursal {code}" if not name or name.lower().endswith(".pdf") else name
            return code, name, folder_name

    return None, None, folder_name


def parse_year_from_path(pdf_path: Path, root: Path | None = None) -> tuple[Optional[int], Optional[int]]:
    parts = pdf_path.relative_to(root).parts if root and pdf_path.is_relative_to(root) else pdf_path.parts
    folder_year = next((int(part) for part in parts if re.fullmatch(r"20\d{2}", part)), None)
    
    file_years = [int(y) for y in re.findall(r"(?<!\d)(20\d{2})(?!\d)", pdf_path.stem)]
    file_year = max(file_years) if file_years else None
    
    return folder_year, file_year


def score_document_category(filename: str, raw_text: str = "") -> tuple[str, str, bool, bool, list[str], int, str]:
    notes = []
    base_name = normalize_text(filename or "")
    full_text = normalize_text((raw_text or "")[:14000])
    header_text = full_text[:900]

    scores = {k: 0 for k in CATEGORY_NAMES}
    evidence = {k: [] for k in CATEGORY_NAMES}

    is_invoice = bool(re.search(r"\b(fac|factura|cfdi|comprobante\s+de\s+pago|pago\s+de\s+derechos)\b", base_name, flags=re.I))
    is_receipt = bool(re.search(r"\b(acuse|ingreso|recepcion|recepción|presentado)\b", f"{base_name} {header_text}", flags=re.I))

    if is_invoice:
        scores["CFDI"] += 45
        evidence["CFDI"].append("filename indicates invoice/payment")
        notes.append("Invoice/payment receipt detected.")
    if is_receipt:
        notes.append("Receipt/in-process document detected.")

    for cat, points, pattern, reason in FILENAME_PATTERNS:
        if re.search(pattern, filename or "", flags=re.I) or re.search(pattern, base_name, flags=re.I):
            scores[cat] += points
            evidence[cat].append(reason)

    for cat, points, phrases, reason in HEADER_PATTERNS:
        if any(normalize_text(p) in header_text for p in phrases):
            scores[cat] += points
            evidence[cat].append(reason)

    for cat, points, phrases, reason in BODY_PATTERNS:
        if any(normalize_text(p) in full_text for p in phrases):
            scores[cat] += points
            evidence[cat].append(reason)

    if scores["US"] >= 50 and scores["BOM"] <= 45 and "bomberos" not in base_name and "bomberos" not in header_text:
        scores["BOM"] -= 25
        evidence["BOM"].append("penalty: incidental fire safety mention in zoning document")

    if scores["US"] >= 55 and any("filename" in e for e in evidence["US"]):
        for cat in ["BOM", "PC", "AN", "LF", "ALN", "AMB", "BAS"]:
            if scores[cat] < scores["US"] + 30:
                scores[cat] -= 20
                evidence[cat].append("penalty: filename explicitly identifies as zoning")

    if is_invoice:
        support_cat = max((c for c in scores if c != "CFDI"), key=lambda c: scores[c])
        if scores[support_cat] > 0:
            notes.append(f"Invoice likely associated with {CATEGORY_NAMES.get(support_cat, support_cat)}.")
        scores["CFDI"] += 30

    best_cat = max(scores, key=lambda c: scores[c])
    best_score = scores[best_cat]

    if best_score <= 0:
        return "OTRO", CATEGORY_NAMES["OTRO"], is_invoice, is_receipt, notes, best_score, "insufficient evidence"

    best_cat = "PC" if best_cat == "PIPC" else best_cat
    tramite_type = CATEGORY_NAMES.get(best_cat, CATEGORY_NAMES["OTRO"])
    source_evidence = "; ".join(evidence.get(best_cat, [])[:4]) or "heuristics"
    
    return best_cat, tramite_type, is_invoice, is_receipt, notes, best_score, source_evidence


def parse_two_digit_year(year_str: str) -> int:
    y = int(year_str)
    if y < 100:
        return 2000 + y if y <= 79 else 1900 + y
    return y


def extract_dates_from_text(text: str) -> list[tuple[date, str, int]]:
    if not text:
        return []

    found_dates = []
    flat_text = "".join(ch for ch in unicodedata.normalize("NFD", text) if unicodedata.category(ch) != "Mn").lower()

    for match in re.finditer(r"(?<!\d)(\d{1,2})\s*[-/.]\s*(\d{1,2})\s*[-/.]\s*(\d{2,4})(?!\d)", flat_text):
        try:
            d, m, y = int(match.group(1)), int(match.group(2)), parse_two_digit_year(match.group(3))
            found_dates.append((date(y, m, d), text[match.start():match.end()], match.start()))
        except ValueError:
            pass

    for match in re.finditer(r"(?<!\d)(20\d{2})\s*[-/.]\s*(\d{1,2})\s*[-/.]\s*(\d{1,2})(?!\d)", flat_text):
        try:
            y, m, d = int(match.group(1)), int(match.group(2)), int(match.group(3))
            found_dates.append((date(y, m, d), text[match.start():match.end()], match.start()))
        except ValueError:
            pass

    month_pattern = "|".join(sorted(MONTH_MAP, key=len, reverse=True))
    for pat in [
        rf"(?<!\d)(\d{{1,2}})\s*(?:de\s*)?[- ]\s*({month_pattern})\s*(?:de\s*)?[- ]\s*(\d{{2,4}})(?!\d)",
        rf"(?<!\d)(\d{{1,2}})\s+de\s+({month_pattern})\s+de\s+(\d{{2,4}})(?!\d)",
    ]:
        for match in re.finditer(pat, flat_text, flags=re.I):
            try:
                d, m, y = int(match.group(1)), MONTH_MAP[match.group(2)], parse_two_digit_year(match.group(3))
                found_dates.append((date(y, m, d), text[match.start():match.end()], match.start()))
            except ValueError:
                pass

    unique_dates = []
    seen = set()
    for item in sorted(found_dates, key=lambda x: x[2]):
        key = (item[0], item[2])
        if key not in seen:
            unique_dates.append(item)
            seen.add(key)
            
    return unique_dates


def select_best_contextual_date(text: str, date_candidates: list[tuple[date, str, int]], is_filename: bool = False) -> tuple[Optional[date], Optional[str], str]:
    if not date_candidates:
        return None, None, ""

    best_date, best_score, best_reason = None, -999, ""
    
    for dt, raw_str, pos in date_candidates:
        window = normalize_text(text[max(0, pos - 120): pos + 120])
        score, reasons = 0, []

        if is_filename:
            if any(k in window for k in ["vigencia", "vence", "vencimiento", "hasta", "valido", "valida"]):
                score += 40
                reasons.append("validity context in filename")
            else:
                score += 8
                reasons.append("date in filename")
        else:
            if any(k in window for k in ["vigencia", "vencimiento", "vence", "valido hasta", "valida hasta", "fecha fin", "hasta"]):
                score += 35
                reasons.append("validity context")
            if any(k in window for k in ["fecha de expedicion", "expedicion", "emision", "emitido", "pago", "factura", "importe"]):
                score -= 30
                reasons.append("looks like issuance/payment")
            if any(k in window for k in ["del", "inicio", "a partir"]):
                score += 2

        score += 3 if dt.year >= 2020 else 0
        score -= 20 if dt.year < 2015 else 0
        score += min(max(dt.year - 2020, 0), 10) * 0.4

        if score > best_score:
            best_score, best_date, best_reason = score, (dt, raw_str), ", ".join(reasons) or "best contextual date"

    if best_score < 0 and not is_filename:
        return None, None, "no reliable validity date found"
        
    return (best_date[0], best_date[1], best_reason) if best_date else (None, None, "")


def is_explicitly_permanent(filename: str, raw_text: str = "") -> bool:
    combined_text = f"{normalize_text(filename)} {normalize_text(raw_text[:8000])}"
    
    if any(phrase in combined_text for phrase in PERMANENT_PHRASES):
        return True
    if "permanecera vigente siempre" in combined_text:
        return False
        
    return False


def extract_document_hints(pdf_path: str | Path, root: str | Path | None = None, raw_text: str = "") -> DocumentHints:
    pdf_path = Path(pdf_path)
    root_path = Path(root) if root else None
    hints = DocumentHints()

    hints.sucursal_codigo, hints.sucursal_nombre, hints.carpeta_sucursal = parse_sucursal_from_path(pdf_path, root_path)
    hints.anio_carpeta, hints.anio_archivo = parse_year_from_path(pdf_path, root_path)

    cat, tipo, is_invoice, is_receipt, notes, score, source = score_document_category(pdf_path.name, raw_text)
    
    hints.categoria = cat
    hints.tipo_tramite = tipo
    hints.categoria_score = score
    hints.categoria_fuente = source
    hints.es_factura = is_invoice
    hints.es_acuse = is_receipt
    hints.notas.extend(notes)
    
    if cat and cat != "OTRO":
        hints.notas.append(f"Category detected as {cat} from {source} (score={score}).")

    hints.es_permanente = is_explicitly_permanent(pdf_path.name, raw_text)
    if hints.es_permanente:
        hints.notas.append("Explicit permanent validity detected.")

    file_dates = extract_dates_from_text(pdf_path.stem)
    end_date, raw_str, reason = select_best_contextual_date(pdf_path.stem, file_dates, is_filename=True)
    
    if end_date:
        hints.fecha_fin_vigencia, hints.fecha_fuente, hints.confianza = end_date, f"filename:{raw_str} ({reason})", "alta"
    else:
        text_dates = extract_dates_from_text(raw_text[:16000])
        end_date, raw_str, reason = select_best_contextual_date(raw_text[:16000], text_dates, is_filename=False)
        if end_date:
            hints.fecha_fin_vigencia, hints.fecha_fuente, hints.confianza = end_date, f"text:{raw_str} ({reason})", "media"

    flat_text = normalize_text(raw_text[:16000])
    for pattern in [
        r"fecha\s+de\s+expedicion\s*[:\-]?\s*([^\n]{0,70})",
        r"fecha\s+de\s+emision\s*[:\-]?\s*([^\n]{0,70})",
        r"expedido\s+el\s*([^\n]{0,70})",
        r"emision\s*[:\-]?\s*([^\n]{0,70})",
    ]:
        if match := re.search(pattern, flat_text, flags=re.I):
            if ds := extract_dates_from_text(match.group(1)):
                hints.fecha_expedicion = ds[0][0]
                break

    if hints.es_permanente:
        hints.fecha_fin_vigencia, hints.fecha_fuente = None, None

    if not hints.fecha_fin_vigencia and not hints.es_permanente and hints.anio:
        if hints.categoria in {"AN", "PC", "BOM", "AMB", "BAS"} and not hints.es_factura:
            hints.fecha_fin_vigencia = date(hints.anio, 12, 31)
            hints.fecha_fuente = f"inferred_by_year:{hints.anio}-12-31"
            hints.confianza = "baja"
            hints.notas.append("End date inferred as Dec 31st based on folder/filename year.")
        elif hints.categoria in {"US", "LF", "ALN"} and not hints.es_factura:
            hints.notas.append("Dec 31st not inferred because this trámite type often has variable/permanent validity.")

    return hints


def merge_doc_with_hints(doc, hints: DocumentHints):
    doc_cat = (getattr(doc, "categoria", "OTRO") or "OTRO").upper().strip()
    hint_cat = (hints.categoria or "OTRO").upper().strip()
    doc_cat = "PC" if doc_cat == "PIPC" else doc_cat
    hint_cat = "PC" if hint_cat == "PIPC" else hint_cat

    if hint_cat != "OTRO" and (
        doc_cat in {"", "OTRO"} 
        or hints.confianza == "alta" 
        or hints.categoria_score >= 55 
        or (doc_cat != hint_cat and hints.categoria_score >= 45)
    ):
        if doc_cat and doc_cat != "OTRO" and doc_cat != hint_cat:
            old_note = getattr(doc, "notas_extraccion", "") or ""
            doc.notas_extraccion = f"{old_note} | LLM category '{doc_cat}' corrected to '{hint_cat}' via local heuristics.".strip(" |")
        
        doc.categoria = hint_cat
        doc.tipo_tramite = hints.tipo_tramite
    elif not getattr(doc, "categoria", None):
        doc.categoria = "OTRO"

    if hints.sucursal_codigo and not getattr(doc, "sucursal_id", None):
        doc.sucursal_id = hints.sucursal_codigo
    elif norm_suc := extract_sucursal_code(getattr(doc, "sucursal_id", None)):
        doc.sucursal_id = norm_suc

    if hints.fecha_expedicion and not getattr(doc, "fecha_expedicion", None):
        doc.fecha_expedicion = hints.fecha_expedicion

    final_cat = (getattr(doc, "categoria", "OTRO") or "OTRO").upper().strip()
    
    if hints.es_permanente:
        doc.es_permanente = True
        doc.fecha_fin_vigencia = None
    elif final_cat not in SUPPORT_CATEGORIES and hints.fecha_fin_vigencia:
        if not getattr(doc, "fecha_fin_vigencia", None) or hints.confianza in {"alta", "media"}:
            doc.fecha_fin_vigencia = hints.fecha_fin_vigencia

    notes = [getattr(doc, "notas_extraccion", None)] if getattr(doc, "notas_extraccion", None) else []
    
    if hints.fecha_fuente:
        notes.append(f"End date from {hints.fecha_fuente}.")
    if hints.categoria_fuente:
        notes.append(f"Category from {hints.categoria_fuente}.")
        
    notes.extend(hints.notas)
    
    if hints.es_factura:
        notes.append("Document identified as invoice/receipt.")
    if hints.es_acuse:
        notes.append("Document identified as in-process receipt.")

    if notes:
        doc.notas_extraccion = " | ".join(dict.fromkeys(n for n in notes if n))

    if hints.confianza == "alta" or hints.categoria_score >= 55:
        doc.confianza_extraccion = "alta"
    elif hints.confianza == "media" or hints.categoria_score >= 30:
        doc.confianza_extraccion = "media"
    elif getattr(doc, "confianza_extraccion", "baja") == "baja" and (hints.sucursal_codigo or hint_cat != "OTRO"):
        doc.confianza_extraccion = "baja"

    return doc
