import io
from datetime import timedelta

from minio import Minio

from app.config import settings


def get_minio_client() -> Minio:
    return Minio(
        settings.minio_endpoint,
        access_key=settings.minio_access_key,
        secret_key=settings.minio_secret_key,
        secure=settings.minio_secure,
    )


async def save_file(client: Minio, file_content: bytes, filename: str) -> str:
    file_stream = io.BytesIO(file_content)
    length = len(file_content)

    client.put_object(
        settings.minio_bucket,
        filename,
        file_stream,
        length,
        content_type=(
            "application/pdf"
            if filename.endswith(".pdf")
            else "application/octet-stream"
        ),
    )
    return f"{settings.minio_bucket}/{filename}"


async def get_file_bytes(client: Minio, minio_path: str) -> bytes:
    bucket, object_name = minio_path.split("/", 1)
    response = client.get_object(bucket, object_name)
    try:
        return response.read()
    finally:
        response.close()
        response.release_conn()


async def delete_file(client: Minio, minio_path: str) -> None:
    bucket, object_name = minio_path.split("/", 1)
    try:
        client.remove_object(bucket, object_name)
    except Exception:
        pass


async def get_presigned_url(
    client: Minio, minio_path: str, download: bool = False
) -> str:
    bucket, object_name = minio_path.split("/", 1)
    filename = object_name.split("/")[-1]
    key = "attachment" if download else "inline"

    try:
        url = client.presigned_get_object(
            bucket_name=bucket,
            object_name=object_name,
            expires=timedelta(minutes=60),
            response_headers={
                "response-content-disposition": f'{key}; filename="{filename}"'
            },
        )
        return url
    except Exception:
        return ""
