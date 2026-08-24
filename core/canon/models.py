"""Canon models — data structures for canon management."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime


class CanonStatus(str):
    PROPOSED = "PROPOSED"
    REVIEW = "REVIEW"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"
    RETCONNED = "RETCONNED"


@dataclass
class CanonEntry:
    entry_id: str
    campaign_id: str
    entity_type: str
    entity_id: str
    fact: str
    source_event_id: str | None = None
    status: str = CanonStatus.PROPOSED
    confidence: float = 1.0
    proposed_by: str = "system"
    reviewed_by: str | None = None
    review_notes: str = ""
    contradictions: list[str] = field(default_factory=list)
    created_at: str = field(default_factory=lambda: datetime.utcnow().isoformat())
    updated_at: str = field(default_factory=lambda: datetime.utcnow().isoformat())

    def to_dict(self) -> dict:
        return vars(self)


@dataclass
class CanonValidationResult:
    valid: bool
    conflicts: list[dict] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)
    suggestion: str = ""
