from contextlib import asynccontextmanager

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from arq import create_pool
from arq.connections import RedisSettings
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, RedirectResponse
from fastapi.routing import APIRoute
from fastapi.staticfiles import StaticFiles

from app.api import api_router
from app.config import settings
from app.core.exceptions import AppError
from app.workers.alert_worker import scan_tramites_for_alerts


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Setup ARQ redis pool
    app.state.redis = await create_pool(
        RedisSettings(host=settings.redis_host, port=settings.redis_port)
    )

    # Setup APScheduler
    scheduler = AsyncIOScheduler()
    # Run every X hours according to config
    scheduler.add_job(
        scan_tramites_for_alerts, "interval", hours=settings.alert_scan_interval_hours
    )
    scheduler.start()
    app.state.scheduler = scheduler

    yield

    # Shutdown
    scheduler.shutdown()
    app.state.redis.close()
    await app.state.redis.wait_closed()


app = FastAPI(
    title="Vertiche LegalOps API",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix="/api")


@app.exception_handler(AppError)
async def app_exception_handler(request: Request, exc: AppError) -> JSONResponse:
    return JSONResponse(
        status_code=exc.status_code,
        content={"code": exc.code, "detail": exc.detail},
    )


if settings.environment == "development":
    import os

    os.makedirs(settings.upload_dir, exist_ok=True)
    app.mount("/media", StaticFiles(directory=settings.upload_dir), name="media")


@app.get("/health")
async def health_check() -> dict[str, str]:
    return {"status": "healthy"}


@app.get("/")
async def root():
    if settings.environment == "development":
        return RedirectResponse(url="/docs")
    return {"message": "Vertiche API is running"}


# Set operation_id for each route (easier openapi docs)
for route in app.routes:
    if isinstance(route, APIRoute):
        route.operation_id = route.name
