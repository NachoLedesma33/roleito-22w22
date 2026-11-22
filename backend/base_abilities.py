from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from models import Ability


BASE_ABILITIES = (
    {"key": "base-fire", "name": "Bola de Fuego", "description": "Llama una bola de fuego contra el objetivo.", "level": 1, "cost_pm": 3, "icon": "fireball", "vfx_type": "fire"},
    {"key": "base-ice", "name": "Dardo de Hielo", "description": "Un dardo de hielo perfora al objetivo.", "level": 1, "cost_pm": 2, "icon": "snowflake", "vfx_type": "ice"},
    {"key": "base-lightning", "name": "Rayo", "description": "Descarga eléctrica sobre el objetivo.", "level": 1, "cost_pm": 2, "icon": "lightning", "vfx_type": "lightning"},
    {"key": "base-heal", "name": "Sanación", "description": "Restaura puntos de vida.", "level": 1, "cost_pm": 2, "icon": "heal", "vfx_type": "heal"},
    {"key": "base-void", "name": "Vacío", "description": "Absorbe la luz y devora al objetivo.", "level": 3, "cost_pm": 4, "icon": "portal", "vfx_type": "void"},
    {"key": "base-flamethrower", "name": "Lanzallamas", "description": "Chorro de fuego en línea recta.", "level": 2, "cost_pm": 4, "icon": "flame", "vfx_type": "flamethrower"},
    {"key": "base-thunder", "name": "Trueno", "description": "Trueno ensordecedor que sacude la zona.", "level": 2, "cost_pm": 4, "icon": "storm", "vfx_type": "thunder"},
    {"key": "base-meteor", "name": "Meteoro", "description": "Un meteorito cae sobre el campo.", "level": 4, "cost_pm": 6, "icon": "fireball", "vfx_type": "meteor"},
    {"key": "base-frostnova", "name": "Nova de Hielo", "description": "Explosión de hielo alrededor del conjurador.", "level": 2, "cost_pm": 4, "icon": "ice", "vfx_type": "frostnova"},
    {"key": "base-poison", "name": "Veneno", "description": "Envenena al objetivo.", "level": 1, "cost_pm": 2, "icon": "poison", "vfx_type": "poison"},
    {"key": "base-holy", "name": "Sagrado", "description": "Luz sagrada que purifica y daña.", "level": 2, "cost_pm": 3, "icon": "prayer", "vfx_type": "holy"},
    {"key": "base-shadow", "name": "Sombra", "description": "Sombras que ciegan y dañan.", "level": 2, "cost_pm": 3, "icon": "smoke", "vfx_type": "shadow"},
    {"key": "base-arcane", "name": "Arcano", "description": "Energía mágica pura.", "level": 2, "cost_pm": 3, "icon": "magic", "vfx_type": "arcane"},
    {"key": "base-arrow", "name": "Flecha", "description": "Flecha mágica contra el objetivo.", "level": 1, "cost_pm": 1, "icon": "bow", "vfx_type": "arrow"},
    {"key": "base-arrowrain", "name": "Lluvia de Flechas", "description": "Una lluvia de flechas cubre la zona.", "level": 3, "cost_pm": 4, "icon": "bow", "vfx_type": "arrowrain"},
    {"key": "base-throwingknife", "name": "Cuchillo Arrojadizo", "description": "Cuchillo que vuela hacia el objetivo.", "level": 1, "cost_pm": 1, "icon": "cross", "vfx_type": "throwingknife"},
    {"key": "base-javelin", "name": "Jabalina", "description": "Jabalina mágica de gran alcance.", "level": 1, "cost_pm": 2, "icon": "sword", "vfx_type": "javelin"},
    {"key": "base-slash", "name": "Cuchillazo", "description": "Tajo rápido cuerpo a cuerpo.", "level": 1, "cost_pm": 1, "icon": "slash", "vfx_type": "slash"},
    {"key": "base-cleave", "name": "Espadazo", "description": "Golpe amplio con espada.", "level": 1, "cost_pm": 2, "icon": "sword", "vfx_type": "cleave"},
    {"key": "base-gunshot", "name": "Disparo", "description": "Disparo certero a distancia.", "level": 1, "cost_pm": 1, "icon": "cross", "vfx_type": "gunshot"},
    {"key": "base-burstfire", "name": "Ráfaga", "description": "Varios disparos en sucesión.", "level": 2, "cost_pm": 3, "icon": "cross", "vfx_type": "burstfire"},
    {"key": "base-punch", "name": "Puñetazo", "description": "Golpe directo con el puño.", "level": 1, "cost_pm": 1, "icon": "fist", "vfx_type": "punch"},
    {"key": "base-slam", "name": "Martillazo", "description": "Golpe pesado que derriba.", "level": 1, "cost_pm": 2, "icon": "fist", "vfx_type": "slam"},
    {"key": "base-chainlightning", "name": "Rayo en Cadena", "description": "El rayo salta entre varios objetivos.", "level": 3, "cost_pm": 5, "icon": "storm", "vfx_type": "chainlightning"},
    {"key": "base-icespear", "name": "Lanza de Hielo", "description": "Lanza de hielo que atraviesa.", "level": 2, "cost_pm": 3, "icon": "ice", "vfx_type": "icespear"},
    {"key": "base-hail", "name": "Granizo", "description": "Granizo que azota la zona.", "level": 2, "cost_pm": 4, "icon": "snowflake", "vfx_type": "hail"},
    {"key": "base-earthquake", "name": "Terremoto", "description": "El suelo se abre bajo los enemigos.", "level": 3, "cost_pm": 5, "icon": "stone", "vfx_type": "earthquake"},
    {"key": "base-vines", "name": "Enredaderas", "description": "Enredaderas que inmovilizan.", "level": 2, "cost_pm": 3, "icon": "water", "vfx_type": "vines"},
    {"key": "base-bleed", "name": "Hemorragia", "description": "Herida que sangra sin cesar.", "level": 1, "cost_pm": 2, "icon": "slash", "vfx_type": "bleed"},
    {"key": "base-toxiccloud", "name": "Nube Tóxica", "description": "Nube de vapor venenoso.", "level": 3, "cost_pm": 4, "icon": "smoke", "vfx_type": "toxiccloud"},
    {"key": "base-sonicwave", "name": "Onda Sónica", "description": "Onda de sonido que empuja.", "level": 2, "cost_pm": 3, "icon": "tornado", "vfx_type": "sonicwave"},
    {"key": "base-forcepush", "name": "Empujón Arcano", "description": "Empuja al objetivo con fuerza mágica.", "level": 1, "cost_pm": 2, "icon": "magic", "vfx_type": "forcepush"},
    {"key": "base-gravityfield", "name": "Campo de Gravedad", "description": "Alteró la gravedad de la zona.", "level": 4, "cost_pm": 5, "icon": "gem", "vfx_type": "gravityfield"},
    {"key": "base-barrier", "name": "Barrera de Energía", "description": "Escudo que bloquea los ataques.", "level": 2, "cost_pm": 3, "icon": "shield", "vfx_type": "barrier"},
    {"key": "base-lifedrain", "name": "Drenaje de Vida", "description": "Roba vida al objetivo.", "level": 3, "cost_pm": 4, "icon": "heart", "vfx_type": "lifedrain"},
    {"key": "base-hex", "name": "Maldición", "description": "Maldice al objetivo.", "level": 2, "cost_pm": 3, "icon": "eye", "vfx_type": "hex"},
)


async def seed_base_abilities(db: AsyncSession, campaign_id: str) -> int:
    existing = set(
        (
            await db.execute(
                select(Ability.vfx_type).where(
                    Ability.campaign_id == campaign_id,
                    Ability.vfx_type.is_not(None),
                )
            )
        ).scalars()
    )
    missing = [a for a in BASE_ABILITIES if a["vfx_type"] not in existing]
    db.add_all(
        Ability(
            campaign_id=campaign_id,
            name=a["name"],
            description=a["description"],
            level=a["level"],
            cost_pm=a["cost_pm"],
            icon=a["icon"],
            vfx_type=a["vfx_type"],
        )
        for a in missing
    )
    return len(missing)
