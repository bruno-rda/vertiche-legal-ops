import asyncio
import logging

from app.workers.alert_worker import scan_tramites_for_alerts

logging.basicConfig(level=logging.INFO)

async def main():
    await scan_tramites_for_alerts()

if __name__ == "__main__":
    asyncio.run(main())