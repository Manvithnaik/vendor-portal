import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from fastapi.staticfiles import StaticFiles
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.core.config import settings
from app.api.v1.router import api_router
from app.exceptions.handlers import (
    AppException,
    app_exception_handler,
    generic_exception_handler,
    http_exception_handler,
    validation_exception_handler,
)

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Backend API supporting the unified Customer and Vendor portals",
    version="1.0.0"
)

# CORS config — always allow local dev origins in addition to any env-configured ones
_ALWAYS_ALLOWED = ["http://localhost:3000", "http://127.0.0.1:3000"]
_cors_origins = list(set((settings.CORS_ORIGINS or []) + _ALWAYS_ALLOWED))

app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Exception handlers
app.add_exception_handler(AppException, app_exception_handler)
app.add_exception_handler(RequestValidationError, validation_exception_handler)
app.add_exception_handler(Exception, generic_exception_handler)
app.add_exception_handler(StarletteHTTPException, http_exception_handler)

# Mount Routers
app.include_router(api_router, prefix=settings.API_V1_STR)

# Static files — serve locally uploaded PO documents during dev
# In production, Supabase Storage is used instead (no static mount needed)
try:
    _upload_dir = settings.UPLOAD_DIR
    os.makedirs(_upload_dir, exist_ok=True)
    app.mount("/uploads", StaticFiles(directory=_upload_dir), name="uploads")
except Exception:  # noqa: BLE001
    pass  # skip static mount if directory unavailable (e.g. fresh container)

@app.get("/")
def read_root():
    return {"message": "Welcome to the Unified B2B Platform API"}

# Trigger reload 123
