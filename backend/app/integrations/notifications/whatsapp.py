from __future__ import annotations

import logging
from typing import Literal

from app.config import settings

logger = logging.getLogger(__name__)

class WhatsAppSender:
    def send(self, phone: str, message: str) -> Literal['enviada', 'simulada', 'fallida']:
        if settings.environment != 'production':
            logger.info("SIMULACIÓN WHATSAPP — Para: %s", phone)
            print("\n" + "=" * 70)
            print("SIMULACIÓN WHATSAPP")
            print("Para:", phone)
            print("-" * 70)
            print(message)
            print("=" * 70)
            return "simulada"

        try:
            import pywhatkit as kit
            
            logger.info("Enviando WhatsApp a %s", phone)
            # wait_time is deliberately short for demo purposes
            # this will open a browser tab
            kit.sendwhatmsg_instantly(
                phone_no=phone,
                message=message,
                wait_time=20,
                tab_close=True,
                close_time=5,
            )
            return "enviada"

        except ImportError as exc:
            logger.error("Falta pywhatkit. Instala con: pip install pywhatkit")
            return "fallida"
        except Exception as exc:
            logger.exception("Falló envío de WhatsApp a %s: %s", phone, exc)
            return "fallida"
