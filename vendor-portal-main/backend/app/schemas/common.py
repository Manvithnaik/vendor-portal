"""
Shared Pydantic schema — standard API response envelope and helpers.
ALL endpoints must return one of these wrappers.
"""
from typing import Any, Optional, Literal
from pydantic import BaseModel


class APIResponse(BaseModel):
    status: Literal["success", "error"]
    message: str
    data: Optional[Any] = None
    errors: Optional[Any] = None


def success_response(message: str, data: Any = None) -> APIResponse:
    return APIResponse(status="success", message=message, data=data)


def error_response(
    message: str,
    code: str = "INTERNAL_ERROR",
    details: Optional[dict] = None,
) -> APIResponse:
    return APIResponse(
        status="error",
        message=message,
        data=None,
        errors={"code": code, "details": details or {}},
    )
