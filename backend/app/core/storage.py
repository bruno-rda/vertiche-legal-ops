import os
import uuid

import aiofiles

from app.config import settings


async def save_file(file_content: bytes, original_filename: str) -> str:
    """Saves file to UPLOAD_DIR and returns the relative path for DB storage."""
    os.makedirs(settings.upload_dir, exist_ok=True)

    extension = os.path.splitext(original_filename)[1]
    stored_filename = f"{uuid.uuid4()}{extension}"
    relative_path = f"uploads/{stored_filename}"

    upload_subdir = os.path.join(settings.upload_dir, "uploads")
    os.makedirs(upload_subdir, exist_ok=True)

    full_path = os.path.join(settings.upload_dir, relative_path)

    async with aiofiles.open(full_path, "wb") as f:
        await f.write(file_content)

    return relative_path


def get_file_url(relative_path: str) -> str:
    """Converts a stored relative path to a URL the frontend can fetch."""
    return f"/media/{relative_path}"
