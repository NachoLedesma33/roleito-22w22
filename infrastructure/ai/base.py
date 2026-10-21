"""The contract every LLM provider implements.

A provider takes MESSAGES (not a bare string) so the same code can talk to a
text model and to a vision model: the difference is a message that carries an
image, not a different provider.

Runtime stays deterministic: nothing here writes to the DB or touches world
state. Callers decide what to do with the returned text.
"""

from abc import ABC, abstractmethod
from dataclasses import dataclass

# El tamaño de la imagen va acotado (C3): sin limite, una imagen de 40 MB se
# manda a un API de pago.
MAX_IMAGE_BYTES = 5 * 1024 * 1024


@dataclass
class AIMessage:
    """Un mensaje del chat. `image_base64` es el base64 pelado (sin data URL)."""

    role: str  # system | user | assistant
    text: str = ""
    image_base64: str | None = None
    image_mime: str | None = None


def simple_messages(
    system: str = "",
    text: str = "",
    image_base64: str | None = None,
    image_mime: str | None = None,
) -> list[AIMessage]:
    """El caso comun: un system opcional + un mensaje de usuario.

    Con `image_base64`, el mensaje de usuario lleva la imagen (vision).
    """
    messages: list[AIMessage] = []
    if system:
        messages.append(AIMessage(role="system", text=system))
    messages.append(
        AIMessage(
            role="user",
            text=text,
            image_base64=image_base64,
            image_mime=image_mime,
        )
    )
    return messages


class AIProvider(ABC):
    """Base contract for LLM providers."""

    name: str
    supports_vision: bool = False
    # El modelo del perfil (si lo hay): se usa cuando la llamada no pasa uno.
    default_model: str | None = None

    @abstractmethod
    async def complete(
        self,
        messages: list[AIMessage],
        *,
        model: str | None = None,
        max_tokens: int = 512,
        temperature: float = 0.7,
        tools: list[dict] | None = None,
    ) -> str:
        """Send the messages and return the model's text response.

        Con `tools`, el modelo puede pedir una tool: el adapter devuelve
        entonces el JSON de la tool call (`{"tool_call": {...}}`) y el bucle
        del agente la ejecuta. El contrato sigue siendo texto->texto.
        """
        raise NotImplementedError
