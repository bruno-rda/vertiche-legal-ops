import logging

from app.database import AsyncSessionLocal
from app.repositories import tramite_repo
from app.services import alerta_service

logger = logging.getLogger(__name__)


async def scan_tramites_for_alerts():
    """
    Scans all tramites and evaluates them for alert creation using `ensure_alert_exists`
    Run via APScheduler.
    """
    logger.info("Starting scheduled scan for compliance alerts")

    async with AsyncSessionLocal() as db:
        # Optimization: Only fetch active tramites that aren't permanent.
        # We'll use get_expiring with a very large window (e.g. 100 days) to catch
        # everything that could possibly need an alert.
        from app.services.alerta_service import SEVERITY_THRESHOLDS_DAYS

        max_days = SEVERITY_THRESHOLDS_DAYS["info"]
        tramites_to_check = await tramite_repo.get_expiring(db, within_days=max_days)

        alerts_created = 0
        for tramite in tramites_to_check:
            try:
                alerta = await alerta_service.ensure_alert_exists(db, tramite)
                if alerta:
                    alerts_created += 1
            except Exception:
                logger.exception(f"Error checking alerts for tramite {tramite.id}")

        await db.commit()
        logger.info(
            "Finished scheduled scan."
            f"Evaluated {len(tramites_to_check)} tramites, "
            f"generated/updated {alerts_created} alerts."
        )
