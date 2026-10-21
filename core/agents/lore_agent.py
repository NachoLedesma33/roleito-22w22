"""Lore Agent — searches and summarizes campaign lore."""

from __future__ import annotations

import json
from dataclasses import dataclass, field
from typing import Any

from core.agents.base import AgentResult, BaseAgent
from core.agents.validation import safe_text, safe_str_list
from core.agents.context_manager import build_context, system_with_rule, wrap_data

LORE_SYSTEM = """You are a tabletop RPG lore keeper. Given campaign context and a question, provide a helpful answer.

Return ONLY valid JSON. No markdown, no explanation.

Output format:
{
  "answer": "clear answer to the question",
  "alternative_readings": ["another valid reading of the same canon, from another angle"],
  "entities_mentioned": ["entity_name1", "entity_name2"],
  "confidence": 0.0-1.0,
  "related_topics": ["related topic 1", "related topic 2"],
  "source_hint": "brief description of where this info comes from in the campaign"
}

Rules:
- Only use information provided in the context
- If information is missing, say so clearly (confidence < 0.3)
- Never invent lore that isn't in the context
- Keep answers concise and relevant
- Identify which characters/NPCs/locations are mentioned
- **alternative_readings**: si el canon admite MAS DE UNA lectura (un motivo ambiguo, una regla que se puede leer de dos maneras, una consecuencia que depende de una decision del DM), listalas. No inventes lecturas alternativas donde hay una sola lectura: la lista puede ir vacia. Es un segundo arbitro, no un generador de dudas."""


@dataclass
class LoreResult:
    answer: str
    entities_mentioned: list[str]
    confidence: float
    related_topics: list[str]
    source_hint: str
    # El contexto que se le mando al modelo. El DM tiene que poder ver QUE
    # vio la IA para decidir si le cree: sin esto, la respuesta es una caja
    # negra (el advisor es un segundo arbitro, no un oraculo).
    context: str = ""
    # Otras lecturas validas del mismo canon. Vacio cuando hay una sola
    # lectura: el advisor propone, no inventa dudas.
    alternative_readings: list[str] = field(default_factory=list)


HISTORY_TURNS = 6


def _format_history(history: list[dict[str, str]] | None) -> str:
    """El hilo de la conversacion, como texto.

    Recortado a las ultimas vueltas: el hilo viejo es lo primero que se
    sacrifica cuando el contexto se llena.
    """
    if not history:
        return ""
    lines = []
    for turn in history[-HISTORY_TURNS:]:
        question = str(turn.get("question", "")).strip()
        answer = str(turn.get("answer", "")).strip()
        if not question and not answer:
            continue
        lines.append(f"Q: {question}\nA: {answer}")
    if not lines:
        return ""
    return "Previous conversation (the DM asked, the agent answered):\n" + "\n\n".join(lines)


class LoreAgent(BaseAgent):
    """Searches and summarizes campaign lore."""
    agent_id = "lore"
    version = "1.0"
    description = "Answers questions about campaign lore and history."

    async def run(
        self,
        *,
        question: str,
        campaign_context: str = "",
        characters: list[dict[str, str]] | None = None,
        npcs: list[dict[str, str]] | None = None,
        locations: list[dict[str, str]] | None = None,
        events: list[dict[str, str]] | None = None,
        history: list[dict[str, str]] | None = None,
        **kwargs: Any,
    ) -> AgentResult:
        if not question.strip():
            return self._error("No question provided")

        context = build_context(
            campaign_context=campaign_context,
            characters=characters,
            npcs=npcs,
            locations=locations,
            events=events,
        )
        context_str = context.text or "No campaign context available."

        # El hilo de la conversacion entra al contexto COMO DATO (para que una
        # repregunta entienda de que se habla), y recortado: el hilo viejo
        # es lo primero que se sacrifica.
        history_text = _format_history(history)
        if history_text:
            context_str = f"{history_text}\n\n{context_str}"

        user_msg = f"Campaign Context:\n{wrap_data(context_str)}\n\nQuestion: {question}"

        raw = await self._complete(
            user_msg,
            system=system_with_rule(LORE_SYSTEM),
            max_tokens=1024,
            temperature=0.3,
        )

        return self._parse_response(raw, context_str)

    def _parse_response(self, raw: str, context: str = "") -> AgentResult:
        data = self._parse_json_response(raw)
        if data is None:
            return self._error("Failed to parse AI response")

        result = LoreResult(
            answer=safe_text(data.get("answer")),
            entities_mentioned=safe_str_list(data.get("entities_mentioned")),
            confidence=data.get("confidence", 0.5),
            related_topics=safe_str_list(data.get("related_topics")),
            source_hint=data.get("source_hint", ""),
            context=context,
            alternative_readings=safe_str_list(data.get("alternative_readings")),
        )

        return self._ok(result)
