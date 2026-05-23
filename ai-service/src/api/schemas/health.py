from pydantic import BaseModel


class HealthResponse(BaseModel):
    status: str
    service: str
    environment: str
    active_reasoning_mode: str
    fallback_mode: str
    local_model_reachable: bool
