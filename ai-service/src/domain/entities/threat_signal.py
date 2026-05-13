from dataclasses import dataclass
from typing import Optional


@dataclass(slots=True)
class ThreatSignal:
    event_type: str
    content: str
    source: Optional[str] = None
    ip_address: Optional[str] = None
    country: Optional[str] = None
    device: Optional[str] = None
    user_agent: Optional[str] = None
