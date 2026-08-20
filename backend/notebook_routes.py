from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from database import get_session
from models import DMNotebook, DMNotebookVersion
from schemas import DMNotebookCreate, DMNotebookUpdate, DMNotebookResponse, DMNotebookVersionResponse

router = APIRouter(tags=["dm-notebooks"])


@router.get(
    "/campaigns/{campaign_id}/notebooks",
    response_model=list[DMNotebookResponse],
)
async def list_notebooks(
    campaign_id: str,
    db: AsyncSession = Depends(get_session),
):
    result = await db.execute(
        select(DMNotebook)
        .where(DMNotebook.campaign_id == campaign_id)
        .order_by(DMNotebook.pinned.desc(), DMNotebook.updated_at.desc())
    )
    return result.scalars().all()


@router.post(
    "/campaigns/{campaign_id}/notebooks",
    response_model=DMNotebookResponse,
)
async def create_notebook(
    campaign_id: str,
    data: DMNotebookCreate,
    db: AsyncSession = Depends(get_session),
):
    notebook = DMNotebook(
        campaign_id=campaign_id,
        title=data.title,
        content=data.content,
        category=data.category,
    )
    db.add(notebook)
    await db.commit()
    await db.refresh(notebook)
    return notebook


@router.get(
    "/campaigns/{campaign_id}/notebooks/{notebook_id}",
    response_model=DMNotebookResponse,
)
async def get_notebook(
    campaign_id: str,
    notebook_id: str,
    db: AsyncSession = Depends(get_session),
):
    result = await db.execute(
        select(DMNotebook).where(
            DMNotebook.id == notebook_id,
            DMNotebook.campaign_id == campaign_id,
        )
    )
    notebook = result.scalar_one_or_none()
    if not notebook:
        raise HTTPException(status_code=404, detail="Notebook not found")
    return notebook


@router.put(
    "/campaigns/{campaign_id}/notebooks/{notebook_id}",
    response_model=DMNotebookResponse,
)
async def update_notebook(
    campaign_id: str,
    notebook_id: str,
    data: DMNotebookUpdate,
    db: AsyncSession = Depends(get_session),
):
    result = await db.execute(
        select(DMNotebook).where(
            DMNotebook.id == notebook_id,
            DMNotebook.campaign_id == campaign_id,
        )
    )
    notebook = result.scalar_one_or_none()
    if not notebook:
        raise HTTPException(status_code=404, detail="Notebook not found")

    if data.content is not None and data.content != notebook.content:
        version_r = await db.execute(
            select(DMNotebookVersion)
            .where(DMNotebookVersion.notebook_id == notebook_id)
            .order_by(DMNotebookVersion.version_number.desc())
            .limit(1)
        )
        last_version = version_r.scalar_one_or_none()
        next_num = (last_version.version_number + 1) if last_version else 1

        version = DMNotebookVersion(
            notebook_id=notebook_id,
            title=notebook.title,
            content=notebook.content,
            version_number=next_num,
        )
        db.add(version)

    updates = data.model_dump(exclude_unset=True)
    for field, value in updates.items():
        setattr(notebook, field, value)

    await db.commit()
    await db.refresh(notebook)
    return notebook


@router.delete("/campaigns/{campaign_id}/notebooks/{notebook_id}")
async def delete_notebook(
    campaign_id: str,
    notebook_id: str,
    db: AsyncSession = Depends(get_session),
):
    result = await db.execute(
        select(DMNotebook).where(
            DMNotebook.id == notebook_id,
            DMNotebook.campaign_id == campaign_id,
        )
    )
    notebook = result.scalar_one_or_none()
    if not notebook:
        raise HTTPException(status_code=404, detail="Notebook not found")

    await db.execute(
        select(DMNotebookVersion).where(DMNotebookVersion.notebook_id == notebook_id)
    )
    versions_r = await db.execute(
        select(DMNotebookVersion).where(DMNotebookVersion.notebook_id == notebook_id)
    )
    for v in versions_r.scalars().all():
        await db.delete(v)

    await db.delete(notebook)
    await db.commit()
    return {"status": "deleted", "id": notebook_id}


@router.get(
    "/notebooks/{notebook_id}/versions",
    response_model=list[DMNotebookVersionResponse],
)
async def list_versions(
    notebook_id: str,
    db: AsyncSession = Depends(get_session),
):
    result = await db.execute(
        select(DMNotebookVersion)
        .where(DMNotebookVersion.notebook_id == notebook_id)
        .order_by(DMNotebookVersion.version_number.desc())
    )
    return result.scalars().all()


@router.post(
    "/notebooks/{notebook_id}/restore/{version_id}",
    response_model=DMNotebookResponse,
)
async def restore_version(
    notebook_id: str,
    version_id: str,
    db: AsyncSession = Depends(get_session),
):
    result = await db.execute(
        select(DMNotebook).where(DMNotebook.id == notebook_id)
    )
    notebook = result.scalar_one_or_none()
    if not notebook:
        raise HTTPException(status_code=404, detail="Notebook not found")

    vr = await db.execute(
        select(DMNotebookVersion).where(DMNotebookVersion.id == version_id)
    )
    version = vr.scalar_one_or_none()
    if not version:
        raise HTTPException(status_code=404, detail="Version not found")

    version_r = await db.execute(
        select(DMNotebookVersion)
        .where(DMNotebookVersion.notebook_id == notebook_id)
        .order_by(DMNotebookVersion.version_number.desc())
        .limit(1)
    )
    last_version = version_r.scalar_one_or_none()
    next_num = (last_version.version_number + 1) if last_version else 1

    save_version = DMNotebookVersion(
        notebook_id=notebook_id,
        title=notebook.title,
        content=notebook.content,
        version_number=next_num,
    )
    db.add(save_version)

    notebook.title = version.title
    notebook.content = version.content

    await db.commit()
    await db.refresh(notebook)
    return notebook
