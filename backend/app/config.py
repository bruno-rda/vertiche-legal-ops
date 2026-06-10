from pydantic import computed_field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # Postgres
    postgres_user: str = "user"
    postgres_password: str = "password"
    postgres_db: str = "vertiche"
    postgres_host: str = "localhost"
    postgres_port: int = 5432

    @computed_field
    @property
    def database_url(self) -> str:
        return (
            f"postgresql+asyncpg://{self.postgres_user}:"
            f"{self.postgres_password}@{self.postgres_host}:"
            f"{self.postgres_port}/{self.postgres_db}"
        )

    redis_host: str = "redis"
    redis_port: int = 6379

    # App
    secret_key: str = "change-me-in-production-use-a-real-secret"
    access_token_expire_minutes: int = 480
    ocr_confidence_threshold: float = 0.80
    alert_scan_interval_hours: int = 6
    environment: str = "development"

    # Minio
    minio_endpoint: str = "localhost:9000"
    minio_access_key: str = "minioadmin"
    minio_secret_key: str = "minioadmin"
    minio_bucket: str = "vertiche-documentos"
    minio_secure: bool = False

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")


settings = Settings()
