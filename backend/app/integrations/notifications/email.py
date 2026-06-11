from __future__ import annotations

import logging
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import Literal

from app.config import settings

logger = logging.getLogger(__name__)

# SMTP configuration for sandbox/testing (ideally loaded from config, but keeping simple for sprint 3)
SMTP_HOST = "sandbox.smtp.mailtrap.io"
SMTP_PORT = 2525
SMTP_USER = "633a56f47c4a39"
SMTP_PASSWORD = "c9c8f1ea626706"
SMTP_FROM = "gestoria@vertiche.com"

class EmailSender:
    def _color_severidad(self, severidad: str) -> str:
        return {
            "critical": "#ef4444",
            "warning":  "#f59e0b",
            "info":     "#3b82f6",
        }.get((severidad or "").lower(), "#6b7280")

    def _label_severidad(self, severidad: str) -> str:
        return {
            "critical": "CRÍTICO",
            "warning":  "ADVERTENCIA",
            "info":     "INFORMACIÓN",
        }.get((severidad or "").lower(), "INFO")

    def construir_html(self, titulo: str, mensaje: str, severidad: str, detalles: dict) -> str:
        color = self._color_severidad(severidad)
        label = self._label_severidad(severidad)

        filas = ""
        if "sucursal" in detalles:
            filas += f"<tr><td style='padding:8px 12px;color:#6b7280;font-size:13px;'>Sucursal</td><td style='padding:8px 12px;font-size:13px;font-weight:600;'>{detalles['sucursal']}</td></tr>"
        if "tramite" in detalles:
            filas += f"<tr style='background:#f9fafb;'><td style='padding:8px 12px;color:#6b7280;font-size:13px;'>Trámite</td><td style='padding:8px 12px;font-size:13px;font-weight:600;'>{detalles['tramite']}</td></tr>"
        if "fecha_fin" in detalles:
            filas += f"<tr><td style='padding:8px 12px;color:#6b7280;font-size:13px;'>Vencimiento</td><td style='padding:8px 12px;font-size:13px;font-weight:600;color:{color};'>{detalles['fecha_fin']}</td></tr>"
        
        filas += f"<tr style='background:#f9fafb;'><td style='padding:8px 12px;color:#6b7280;font-size:13px;'>Severidad</td><td style='padding:8px 12px;'><span style='background:{color};color:white;padding:2px 10px;border-radius:999px;font-size:12px;font-weight:700;'>{label}</span></td></tr>"

        return f"""
<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:white;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.1);">
        <!-- Header -->
        <tr><td style="background:{color};padding:24px 32px;">
          <p style="margin:0;color:rgba(255,255,255,.8);font-size:12px;text-transform:uppercase;letter-spacing:1px;">Vertiche · Gestoría Legal</p>
          <h1 style="margin:8px 0 0;color:white;font-size:22px;font-weight:700;">⚠️ {titulo}</h1>
        </td></tr>
        <!-- Mensaje -->
        <tr><td style="padding:24px 32px;">
          <p style="margin:0;color:#374151;font-size:15px;line-height:1.6;">{mensaje}</p>
        </td></tr>
        <!-- Tabla de detalles -->
        <tr><td style="padding:0 32px 24px;">
          <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;">
            {filas}
          </table>
        </td></tr>
        <!-- Footer -->
        <tr><td style="padding:16px 32px;background:#f9fafb;border-top:1px solid #e5e7eb;">
          <p style="margin:0;color:#9ca3af;font-size:12px;">
            Este mensaje fue generado automáticamente por el sistema de Gestoría Legal de Vertiche.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>
"""

    def send(self, recipient: str, subject: str, html_body: str) -> Literal['enviada', 'simulada', 'fallida']:
        if settings.environment != 'production':
            logger.info("SIMULACIÓN EMAIL — Para: %s | Asunto: %s", recipient, subject)
            print(f"\n{'='*60}")
            print(f"SIMULACIÓN EMAIL")
            print(f"Para:    {recipient}")
            print(f"Asunto:  {subject}")
            print(f"{'='*60}\n")
            return "simulada"

        try:
            msg = MIMEMultipart("alternative")
            msg["Subject"] = f"[Gestoría Vertiche] {subject}"
            msg["From"] = SMTP_FROM
            msg["To"] = recipient
            msg.attach(MIMEText(html_body, "html"))

            with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
                server.starttls()
                server.login(SMTP_USER, SMTP_PASSWORD)
                server.sendmail(SMTP_FROM, recipient, msg.as_string())

            logger.info("Email enviado a %s — %s", recipient, subject)
            return "enviada"

        except Exception as exc:
            logger.exception("Error enviando email a %s: %s", recipient, exc)
            return "fallida"
