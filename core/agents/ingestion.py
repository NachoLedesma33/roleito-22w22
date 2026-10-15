"""Ingestion Agent — normalizes external text into a Raw Session.

Sources: DM notes, player notes, documents, transcripts. Ingestion never
decides canon — it only cleans and segments. Canon decisions happen
downstream (Session Processor → DM approval).
"""

from __future__ import annotations

import os
import re
from dataclasses import dataclass, field
from typing import Any

from core.agents.base import AgentResult, BaseAgent


@dataclass
class RawSession:
    title: str
    body: str
    source: str
    chars: int
    segments: list[str] = field(default_factory=list)

    def to_dict(self) -> dict[str, Any]:
        return {
            "title": self.title,
            "body": self.body,
            "source": self.source,
            "chars": self.chars,
            "segments": self.segments,
        }


_BLANK_RUN = re.compile(r"\n{3,}")


def normalize_text(text: str) -> str:
    """Line endings → \\n, trailing whitespace per line dropped, 3+ blank
    lines collapsed to 2, ends stripped. Inner content untouched."""
    lines = text.replace("\r\n", "\n").replace("\r", "\n").split("\n")
    cleaned = _BLANK_RUN.sub("\n\n", "\n".join(line.rstrip() for line in lines))
    return cleaned.strip("\n")


def segment_text(body: str) -> list[str]:
    """Split on blank lines. One block = one segment."""
    return [seg for seg in body.split("\n\n") if seg.strip()]


def ingest_text(text: str, source: str = "dm-notes", title: str = "") -> RawSession:
    """Normalize + segment. Raises ValueError on blank input."""
    body = normalize_text(text)
    if not body:
        raise ValueError("empty input: nothing to ingest")
    segments = segment_text(body)
    return RawSession(
        title=title,
        body=body,
        source=source,
        chars=len(body),
        segments=segments,
    )


def ingest_document(filename: str, content: str) -> RawSession:
    """Same as ingest_text, title defaulted from the filename stem."""
    stem = os.path.splitext(os.path.basename(filename))[0]
    return ingest_text(content, source="document", title=stem)


class IngestionAgent(BaseAgent):
    """Incorporates external text without judging canon."""

    agent_id = "ingestion"
    version = "1.0"
    description = "Normalizes external notes and documents into raw sessions."

    async def run(
        self,
        *,
        text: str = "",
        source: str = "dm-notes",
        title: str = "",
        filename: str = "",
        **kwargs: Any,
    ) -> AgentResult:
        try:
            if filename:
                raw = ingest_document(filename, text)
            else:
                raw = ingest_text(text, source=source, title=title)
        except ValueError as e:
            return self._error(str(e))
        return self._ok(raw)
