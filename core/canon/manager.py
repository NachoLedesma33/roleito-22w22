"""Canon Manager — enforces canon flow and validates contradictions."""

from __future__ import annotations

import json
from datetime import datetime
from pathlib import Path

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models import Event, Character, NPC
from .models import CanonEntry, CanonStatus, CanonValidationResult

CANON_DIR = Path(__file__).parent.parent.parent / "data" / "canon"


class CanonManager:
    """Manages canon entries for a campaign.

    Canon flow: PROPOSED → REVIEW → APPROVED/REJECTED
    Only the DM can approve canon.
    """

    def __init__(self, db: AsyncSession):
        self.db = db

    async def propose(self, campaign_id: str, entity_type: str, entity_id: str,
                      fact: str, source_event_id: str | None = None,
                      confidence: float = 1.0) -> CanonEntry:
        entry = CanonEntry(
            entry_id=f"canon-{datetime.utcnow().strftime('%Y%m%d%H%M%S')}",
            campaign_id=campaign_id,
            entity_type=entity_type,
            entity_id=entity_id,
            fact=fact,
            source_event_id=source_event_id,
            status=CanonStatus.PROPOSED,
            confidence=confidence,
        )

        validation = await self.validate(campaign_id, entry)
        if validation.conflicts:
            entry.contradictions = [c.get("entry_id", "") for c in validation.conflicts]
            entry.status = CanonStatus.REVIEW

        await self._save(entry)
        return entry

    async def validate(self, campaign_id: str, new_entry: CanonEntry) -> CanonValidationResult:
        existing = await self._load_all(campaign_id)
        conflicts = []
        warnings = []

        for e in existing:
            if e.entity_id == new_entry.entity_id and e.status == CanonStatus.APPROVED:
                if self._contradicts(e, new_entry):
                    conflicts.append({
                        "entry_id": e.entry_id,
                        "existing_fact": e.fact,
                        "new_fact": new_entry.fact,
                        "reason": "Direct contradiction with approved canon",
                    })

        if new_entry.confidence < 0.5:
            warnings.append("Low confidence — consider REVIEW status")

        return CanonValidationResult(
            valid=len(conflicts) == 0,
            conflicts=conflicts,
            warnings=warnings,
        )

    def _contradicts(self, existing: CanonEntry, proposed: CanonEntry) -> bool:
        ef = existing.fact.lower()
        pf = proposed.fact.lower()
        contradictions = [
            ("alive", "dead"), ("dead", "alive"),
            ("present", "absent"), ("absent", "present"),
            ("allied", "enemy"), ("enemy", "allied"),
        ]
        for a, b in contradictions:
            if a in ef and b in pf:
                return True
            if b in ef and a in pf:
                return True
        return False

    async def approve(self, entry_id: str, campaign_id: str, reviewed_by: str = "dm",
                      notes: str = "") -> CanonEntry | None:
        entry = await self._load(campaign_id, entry_id)
        if not entry:
            return None
        entry.status = CanonStatus.APPROVED
        entry.reviewed_by = reviewed_by
        entry.review_notes = notes
        entry.updated_at = datetime.utcnow().isoformat()
        await self._save(entry)
        return entry

    async def reject(self, entry_id: str, campaign_id: str, reviewed_by: str = "dm",
                     notes: str = "") -> CanonEntry | None:
        entry = await self._load(campaign_id, entry_id)
        if not entry:
            return None
        entry.status = CanonStatus.REJECTED
        entry.reviewed_by = reviewed_by
        entry.review_notes = notes
        entry.updated_at = datetime.utcnow().isoformat()
        await self._save(entry)
        return entry

    async def list_entries(self, campaign_id: str, status: str | None = None) -> list[CanonEntry]:
        all_entries = await self._load_all(campaign_id)
        if status:
            return [e for e in all_entries if e.status == status]
        return all_entries

    async def get_entry(self, campaign_id: str, entry_id: str) -> CanonEntry | None:
        return await self._load(campaign_id, entry_id)

    def _canon_file(self, campaign_id: str) -> Path:
        d = CANON_DIR / campaign_id
        d.mkdir(parents=True, exist_ok=True)
        return d / "canon.json"

    async def _save(self, entry: CanonEntry) -> None:
        entries = await self._load_all(entry.campaign_id)
        entries = [e for e in entries if e.entry_id != entry.entry_id]
        entries.append(entry)
        f = self._canon_file(entry.campaign_id)
        f.write_text(json.dumps([vars(e) for e in entries], indent=2, default=str))

    async def _load(self, campaign_id: str, entry_id: str) -> CanonEntry | None:
        entries = await self._load_all(campaign_id)
        for e in entries:
            if e.entry_id == entry_id:
                return e
        return None

    async def _load_all(self, campaign_id: str) -> list[CanonEntry]:
        f = self._canon_file(campaign_id)
        if not f.exists():
            return []
        data = json.loads(f.read_text())
        return [CanonEntry(**d) for d in data]
