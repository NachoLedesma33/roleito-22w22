from .base import AIProvider
from .local import LocalProvider
from .mock import MockProvider
from .remote import RemoteProvider


def build_provider(
    provider_name: str,
    *,
    local_base_url: str | None = None,
    remote_base_url: str | None = None,
    api_key: str | None = None,
) -> AIProvider:
    if provider_name == "local":
        return LocalProvider(local_base_url) if local_base_url else LocalProvider()
    if provider_name == "remote":
        return RemoteProvider(remote_base_url, api_key=api_key)
    return MockProvider()


__all__ = ["AIProvider", "LocalProvider", "MockProvider", "RemoteProvider", "build_provider"]
