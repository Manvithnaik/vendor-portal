"""
Centralized custom exception classes and FastAPI exception handlers.
All exceptions produce the standard APIResponse error envelope.
"""
from typing import Any, Optional
from fastapi import Request
from fastapi.responses import JSONResponse
from fastapi import HTTPException


# ---------------------------------------------------------------------------
# Custom exception types
# ---------------------------------------------------------------------------

class AppException(HTTPException):
    """Base for all application exceptions."""
    def __init__(
        self,
        status_code: int,
        message: str,
        code: str = "APP_ERROR",
        details: Optional[dict] = None,
    ):
        super().__init__(status_code=status_code, detail=message)
        self.message = message
        self.code = code
        self.details = details or {}


class NotFoundException(AppException):
    def __init__(self, resource: str = "Resource", details: Optional[dict] = None):
        super().__init__(
            status_code=404,
            message=f"{resource} not found.",
            code="NOT_FOUND",
            details=details,
        )


class ValidationException(AppException):
    def __init__(self, message: str = "Validation failed.", details: Optional[dict] = None):
        super().__init__(
            status_code=422,
            message=message,
            code="VALIDATION_ERROR",
            details=details,
        )


class UnauthorizedException(AppException):
    def __init__(self, message: str = "Authentication required.", details: Optional[dict] = None):
        super().__init__(
            status_code=401,
            message=message,
            code="UNAUTHORIZED",
            details=details,
        )


class ForbiddenException(AppException):
    def __init__(self, message: str = "Insufficient permissions.", details: Optional[dict] = None):
        super().__init__(
            status_code=403,
            message=message,
            code="FORBIDDEN",
            details=details,
        )


class ConflictException(AppException):
    def __init__(self, message: str = "Resource already exists.", details: Optional[dict] = None):
        super().__init__(
            status_code=409,
            message=message,
            code="CONFLICT",
            details=details,
        )


class DatabaseException(AppException):
    def __init__(self, message: str = "A database error occurred.", details: Optional[dict] = None):
        super().__init__(
            status_code=500,
            message=message,
            code="DATABASE_ERROR",
            details=details,
        )


class BusinessRuleException(AppException):
    def __init__(self, message: str, details: Optional[dict] = None):
        super().__init__(
            status_code=400,
            message=message,
            code="BUSINESS_RULE_VIOLATION",
            details=details,
        )


# ---------------------------------------------------------------------------
# FastAPI exception handlers
# ---------------------------------------------------------------------------

def _error_body(message: str, code: str, details: dict) -> dict:
    return {
        "status": "error",
        "message": message,
        "data": None,
        "errors": {"code": code, "details": details},
    }


async def app_exception_handler(request: Request, exc: AppException) -> JSONResponse:
    return JSONResponse(
        status_code=exc.status_code,
        content=_error_body(exc.message, exc.code, exc.details),
    )


async def generic_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    return JSONResponse(
        status_code=500,
        content=_error_body(
            "An unexpected error occurred.",
            "INTERNAL_SERVER_ERROR",
            {"type": type(exc).__name__},
        ),
    )


async def http_exception_handler(request: Request, exc: HTTPException) -> JSONResponse:
    return JSONResponse(
        status_code=exc.status_code,
        content=_error_body(
            str(exc.detail),
            "HTTP_ERROR",
            {"status_code": exc.status_code},
        ),
    )
