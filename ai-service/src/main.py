from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

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
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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
