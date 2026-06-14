from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from src.api.routes.health import router as health_router
from src.api.routes.copilot import router as copilot_router
from src.api.routes.inference import router as inference_router
from src.api.routes.threats import router as threats_router
from src.infrastructure.config.settings import get_settings

settings = get_settings()

app = FastAPI(
    title=settings.app_name,
    description="AI threat analysis service for MCIPS.",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[origin.strip() for origin in settings.cors_origins.split(",") if origin.strip()],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def protect_service(request: Request, call_next):
    content_length = request.headers.get("content-length")
    if content_length and int(content_length) > 256 * 1024:
        return JSONResponse(status_code=413, content={"detail": "Request body too large"})
    if (
        settings.service_api_token
        and request.url.path.startswith(settings.api_prefix)
        and request.headers.get("X-Service-Token") != settings.service_api_token
    ):
        return JSONResponse(status_code=401, content={"detail": "Invalid service credentials"})
    return await call_next(request)

app.include_router(health_router)
app.include_router(inference_router, prefix=settings.api_prefix)
app.include_router(copilot_router, prefix=settings.api_prefix)
app.include_router(threats_router, prefix=settings.api_prefix)


@app.get("/")
async def root() -> dict[str, str]:
    return {
        "service": settings.app_name,
        "status": "running",
        "docs": "/docs",
    }
