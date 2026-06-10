import logging
import re

import cv2
from dataclasses import dataclass
import fitz
import numpy as np
import pytesseract
from PIL import Image


logger = logging.getLogger(__name__)


def _clean_text(text: str) -> str:
    text = text or ""
    text = text.replace("\x00", " ")
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n[ \t]+", "\n", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def _word_count(text: str) -> int:
    return len(re.findall(r"[A-Za-zÁÉÍÓÚÜÑáéíóúüñ0-9]{2,}", text or ""))


def _signal_score(text: str) -> int:
    flat = _clean_text(text).lower()
    flat = re.sub(r"\s+", " ", flat)
    signals = [
        "fecha de exped",
        "vigencia",
        "vencimiento",
        "folio",
        "uso del suelo",
        "uso de suelo",
        "zonificaci",
        "licencia",
        "funcionamiento",
        "proteccion civil",
        "protección civil",
        "pipc",
        "anuncio",
        "alineamiento",
        "numero oficial",
        "número oficial",
        "factura",
        "cfdi",
        "bomberos",
        "ambiental",
    ]
    return sum(1 for s in signals if s in flat)


@dataclass
class OCRResult:
    raw_text: str
    avg_confidence: float
    word_count: int
    method: str


class OCREngine:
    def __init__(
        self,
        dpi: int = 300,
        low_conf_threshold: int = 60,
        tesseract_lang: str = "spa+eng",
        fallback_tesseract_configs: tuple[str, ...] = (
            "--oem 3 --psm 6",
            "--oem 3 --psm 4",
            "--oem 3 --psm 11",
        ),
        max_pages: int | None = None,
        min_direct_words: int = 80,
        force_ocr: bool = False,
        merge_direct_and_ocr: bool = True,
        try_extra_preprocess: bool = False,
    ):
        self.dpi = dpi
        self.low_conf_threshold = low_conf_threshold
        self.tesseract_lang = tesseract_lang
        self.fallback_tesseract_configs = fallback_tesseract_configs
        self.max_pages = max_pages
        self.min_direct_words = min_direct_words
        self.force_ocr = force_ocr
        self.merge_direct_and_ocr = merge_direct_and_ocr
        self.try_extra_preprocess = try_extra_preprocess

    def extract(self, pdf_bytes: bytes) -> OCRResult:
        doc = fitz.open(stream=pdf_bytes, filetype="pdf")
        total_pages = len(doc)
        limit = min(total_pages, self.max_pages) if self.max_pages else total_pages

        direct_pages = []
        for page_num in range(limit):
            page = doc.load_page(page_num)
            text = page.get_text("text") or ""
            direct_pages.append(_clean_text(text))

        raw_direct = "\n\n".join(p for p in direct_pages if p)
        direct_words = _word_count(raw_direct)
        direct_signals = _signal_score(raw_direct)
        direct_conf = 100.0 if direct_words >= self.min_direct_words else 0.0

        if (
            not self.force_ocr
            and direct_words >= self.min_direct_words
            and direct_signals >= 2
        ):
            doc.close()
            return OCRResult(
                raw_text=raw_direct,
                avg_confidence=direct_conf,
                word_count=direct_words,
                method="direct_text",
            )

        images = []
        zoom = self.dpi / 72
        matrix = fitz.Matrix(zoom, zoom)
        for page_num in range(limit):
            page = doc.load_page(page_num)
            pix = page.get_pixmap(matrix=matrix, alpha=False)
            img = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
            images.append(img)
        doc.close()

        ocr_pages = []
        ocr_total_conf = 0.0
        ocr_total_words = 0
        methods = []

        for idx, image in enumerate(images):
            best = self._ocr_page_best(image, idx)
            ocr_pages.append(best["text"])
            ocr_total_conf += best["avg_conf"] * best["word_count"]
            ocr_total_words += best["word_count"]
            methods.append(best["method"])

        ocr_avg_conf = ocr_total_conf / ocr_total_words if ocr_total_words else 0.0
        raw_ocr = "\n\n".join(t for t in ocr_pages if t)
        ocr_method = "best_page_ocr:" + ",".join(sorted(set(methods)))

        if not self.merge_direct_and_ocr or direct_words == 0:
            o_score = ocr_total_words * 0.7 + _signal_score(raw_ocr) * 25
            d_score = direct_words * 0.7 + direct_signals * 25

            if o_score >= d_score:
                return OCRResult(
                    raw_text=raw_ocr,
                    avg_confidence=ocr_avg_conf,
                    word_count=ocr_total_words,
                    method=ocr_method,
                )
            return OCRResult(
                raw_text=raw_direct,
                avg_confidence=direct_conf,
                word_count=direct_words,
                method="direct_text",
            )

        merged_pages = []
        for i in range(max(len(direct_pages), len(ocr_pages))):
            d = direct_pages[i] if i < len(direct_pages) else ""
            o = ocr_pages[i] if i < len(ocr_pages) else ""

            d_score = _word_count(d) * 0.7 + _signal_score(d) * 25
            o_score = _word_count(o) * 0.7 + _signal_score(o) * 25

            if d and o and d != o:
                merged_pages.append(d if d_score >= o_score else o)
            else:
                merged_pages.append(d or o)

        raw_merged = "\n\n".join(p for p in merged_pages if p)
        merged_words = _word_count(raw_merged)

        return OCRResult(
            raw_text=raw_merged,
            avg_confidence=direct_conf if direct_pages else ocr_avg_conf,
            word_count=merged_words,
            method=f"hybrid(direct_text+{ocr_method})",
        )

    def _ocr_page_best(self, image: Image.Image, page_idx: int) -> dict:
        arr = np.array(image)
        gray = cv2.cvtColor(arr, cv2.COLOR_RGB2GRAY)
        denoised = cv2.fastNlMeansDenoising(gray, h=7)
        _, otsu = cv2.threshold(denoised, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)

        variants = [Image.fromarray(otsu)]
        if self.try_extra_preprocess:
            clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8)).apply(gray)
            adaptive = cv2.adaptiveThreshold(
                clahe, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 35, 11
            )
            variants.extend([Image.fromarray(adaptive), Image.fromarray(gray)])

        best: dict | None = None
        for variant_idx, variant in enumerate(variants):
            for cfg in self.fallback_tesseract_configs:
                try:
                    data = pytesseract.image_to_data(
                        variant,
                        lang=self.tesseract_lang,
                        config=cfg,
                        output_type=pytesseract.Output.DICT,
                    )
                    text, avg, count = self._data_to_text(data)
                except Exception as exc:
                    logger.warning(
                        f"Fallo OCR página {page_idx + 1} config={cfg} "
                        f"variant={variant_idx}: {exc}"
                    )
                    continue

                signal = _signal_score(text)
                score = count * 0.7 + avg * 2.5 + signal * 20
                candidate = {
                    "text": text,
                    "avg_conf": avg,
                    "word_count": count,
                    "method": f"tesseract:{cfg}:variant{variant_idx}",
                    "score": score,
                }

                if best is None or score > best["score"]:
                    best = candidate

                if count >= 250 and avg >= 60 and signal >= 2:
                    return candidate

        return best or {
            "text": "",
            "avg_conf": 0.0,
            "word_count": 0,
            "method": "tesseract:none",
            "score": 0,
        }

    def _data_to_text(self, data: dict) -> tuple[str, float, int]:
        page_text = ""
        total_conf = 0.0
        word_count = 0
        last_block = last_par = last_line = -1

        for i, text in enumerate(data.get("text", [])):
            text = (text or "").strip()
            if not text:
                continue

            try:
                conf = float(data["conf"][i])
            except Exception:
                conf = -1.0

            if conf == -1:
                continue

            block = int(data.get("block_num", [0])[i])
            par = int(data.get("par_num", [0])[i])
            line = int(data.get("line_num", [0])[i])

            if page_text:
                if block != last_block or par != last_par:
                    page_text += "\n\n"
                elif line != last_line:
                    page_text += "\n"
                else:
                    page_text += " "
            page_text += text
            last_block, last_par, last_line = block, par, line

            total_conf += conf
            word_count += 1

        avg = total_conf / word_count if word_count else 0.0
        return page_text.strip(), avg, word_count
