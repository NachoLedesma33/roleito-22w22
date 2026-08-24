"""Narrative engine — parse DM narration into structured events."""

from core.narrative.entity_resolver import (
    ResolutionResult,
    ResolvedEntity,
    get_campaign_context,
    resolve_entities,
)
from core.narrative.parser import ExtractedEvent, parse_narrative
from core.narrative.proposer import ProposalResult, ProposedEvent, propose_events

__all__ = [
    "ExtractedEvent",
    "parse_narrative",
    "ResolutionResult",
    "ResolvedEntity",
    "resolve_entities",
    "get_campaign_context",
    "ProposalResult",
    "ProposedEvent",
    "propose_events",
]
