import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, status
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException

from backend.app.core.config import settings
from backend.app.core.exceptions import TrustVaultException
from backend.app.middleware.security_headers import SecurityHeadersMiddleware
from backend.app.db.init_db import init_db
from backend.app.api.v1.routes import api_router

# Configure clean logging
logging.basicConfig(level=logging.INFO if settings.DEBUG else logging.WARNING)
logger = logging.getLogger("trustvault")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: ensure tables are created
    init_db()
    logger.info("TrustVault database tables initialized and verified.")
    yield
    # Shutdown
    logger.info("TrustVault backend shutting down cleanly.")

app = FastAPI(
    title="TrustVault — Secure Document Sharing with a Real Audit Trail",
    description="API for high-security document sharing, granular RBAC, immediate revocation, and durable audit trails.",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
    lifespan=lifespan
)

# 1. Custom Security Headers & Correlation ID Middleware
app.add_middleware(SecurityHeadersMiddleware)

# 2. CORS Middleware with Credentials support for HTTP-only cookies
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allow_headers=["*"],
    expose_headers=["X-Request-ID", "Content-Disposition"]
)

# 3. Exception Handlers for structured JSON responses
@app.exception_handler(TrustVaultException)
async def trustvault_exception_handler(request: Request, exc: TrustVaultException):
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "success": False,
            "error": exc.detail if isinstance(exc.detail, dict) else {"message": str(exc.detail), "code": "ERROR"},
            "request_id": getattr(request.state, "request_id", None)
        }
    )

@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "success": False,
            "error": {"message": str(exc.detail), "code": "HTTP_ERROR"},
            "request_id": getattr(request.state, "request_id", None)
        }
    )

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    errors = []
    for err in exc.errors():
        loc = " -> ".join(str(l) for l in err.get("loc", []))
        errors.append(f"{loc}: {err.get('msg')}")
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "success": False,
            "error": {
                "message": "Input validation failed. Please check the submitted fields.",
                "code": "VALIDATION_ERROR",
                "details": errors
            },
            "request_id": getattr(request.state, "request_id", None)
        }
    )

@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled server error: {exc}", exc_info=True)
    # Fail safe: Never leak internal tracebacks or secrets to clients
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "success": False,
            "error": {
                "message": "An internal server error occurred. This incident has been logged.",
                "code": "INTERNAL_SERVER_ERROR"
            },
            "request_id": getattr(request.state, "request_id", None)
        }
    )

# 4. Health Check Endpoints
@app.get("/health", tags=["Health"])
@app.get("/api/health", tags=["Health"])
@app.get("/api/v1/health", tags=["Health"])
def health_check():
    return {
        "status": "healthy",
        "service": "TrustVault API",
        "version": "1.0.0",
        "storage": "operational"
    }

# 5. Include API v1 Routes
app.include_router(api_router, prefix="/api/v1")
