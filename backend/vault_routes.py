from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from auth import require_dm, Session
from vault import vault_status, store_api_key, delete_api_key

router = APIRouter()


class VaultStatusResponse(BaseModel):
    providers: dict[str, bool]


class VaultStoreRequest(BaseModel):
    provider: str
    api_key: str


class VaultDeleteRequest(BaseModel):
    provider: str


@router.get("/vault/status", response_model=VaultStatusResponse)
async def get_vault_status(_session: Session = Depends(require_dm)):
    return VaultStatusResponse(providers=vault_status())


@router.post("/vault/store")
async def store_key(data: VaultStoreRequest, _session: Session = Depends(require_dm)):
    store_api_key(data.provider, data.api_key)
    return {"status": "ok", "provider": data.provider}


@router.post("/vault/delete")
async def delete_key(data: VaultDeleteRequest, _session: Session = Depends(require_dm)):
    deleted = delete_api_key(data.provider)
    return {"status": "ok", "deleted": deleted}
