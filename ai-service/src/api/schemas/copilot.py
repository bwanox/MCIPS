from pydantic import BaseModel, Field


class IncidentSignal(BaseModel):
    eventId: str
    eventType: str
    title: str
    label: str
    risk: str


class IncidentSummarizeRequest(BaseModel):
    incidentId: str
    tenantId: str
    title: str
    summary: str
    recommendedActions: list[str] = Field(default_factory=list)
    signals: list[IncidentSignal] = Field(default_factory=list)


class IncidentSummarizeResponse(BaseModel):
    summary: str
    model_used: str
    fallback_used: bool


class IncidentReasoningRequest(BaseModel):
    incidentId: str
    tenantId: str
    title: str
    summary: str
    recommendedActions: list[str] = Field(default_factory=list)
    signals: list[IncidentSignal] = Field(default_factory=list)


class IncidentReasoningResponse(BaseModel):
    summary: str
    recommended_actions: list[str] = Field(default_factory=list)
    approval_required: bool
    approval_reason: str
    model_used: str
    fallback_used: bool


class CopilotTimelineEntry(BaseModel):
    title: str
    occurredAt: str
    sourceFamily: str
    severity: str


class CopilotAnswerRequest(BaseModel):
    incidentId: str
    summary: str
    sourceFamilies: list[str] = Field(default_factory=list)
    recommendedActions: list[str] = Field(default_factory=list)
    timeline: list[CopilotTimelineEntry] = Field(default_factory=list)
    question: str


class CopilotAnswerResponse(BaseModel):
    answer: str
    model_used: str
    fallback_used: bool
