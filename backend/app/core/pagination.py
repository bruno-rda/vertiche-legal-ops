import math
from typing import TypeVar

from pydantic import BaseModel

T = TypeVar("T")


class PaginatedResponse[T](BaseModel):
    data: list[T]
    total: int
    page: int
    page_size: int
    total_pages: int


def paginate[T](
    items: list[T], total: int, page: int, page_size: int
) -> PaginatedResponse[T]:
    return PaginatedResponse(
        data=items,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=max(1, math.ceil(total / page_size)),
    )
