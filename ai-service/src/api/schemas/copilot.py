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
    citationId: str


class CopilotEvidenceEntry(BaseModel):
    citationId: str
    title: str
    summary: str
    occurredAt: str
    sourceFamily: str


class CopilotAnswerRequest(BaseModel):
    incidentId: str
    summary: str
    sourceFamilies: list[str] = Field(default_factory=list)
    recommendedActions: list[str] = Field(default_factory=list)
    timeline: list[CopilotTimelineEntry] = Field(default_factory=list)
    evidence: list[CopilotEvidenceEntry] = Field(default_factory=list)
    question: str = Field(..., min_length=1, max_length=2_000)


class CopilotAnswerResponse(BaseModel):
    answer: str
    citations: list[str] = Field(default_factory=list)
    model_used: str
    fallback_used: bool
