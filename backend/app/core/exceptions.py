class AppError(Exception):
    def __init__(self, status_code: int, code: str, detail: str) -> None:
        self.status_code = status_code
        self.code = code
        self.detail = detail
        super().__init__(detail)


class NotFoundError(AppError):
    def __init__(self, detail: str = "Resource not found") -> None:
        super().__init__(status_code=404, code="not_found", detail=detail)


class UnauthorizedError(AppError):
    def __init__(self, detail: str = "No autorizado") -> None:
        super().__init__(status_code=401, code="unauthorized", detail=detail)


class ForbiddenError(AppError):
    def __init__(self, detail: str = "Acceso denegado") -> None:
        super().__init__(status_code=403, code="forbidden", detail=detail)


class ConflictError(AppError):
    def __init__(self, detail: str = "Conflict") -> None:
        super().__init__(status_code=409, code="conflict", detail=detail)


class ValidationError(AppError):
    def __init__(self, detail: str = "Validation error") -> None:
        super().__init__(status_code=422, code="validation_error", detail=detail)
