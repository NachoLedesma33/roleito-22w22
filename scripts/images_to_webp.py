"""Convierte imagenes raster a WebP SOLO si el WebP pesa menos que el original.

Uso:
    venv\\Scripts\\python.exe scripts/images_to_webp.py <archivo|carpeta> [...]
    venv\\Scripts\\python.exe scripts/images_to_webp.py data/assets/micampania --recursive
    venv\\Scripts\\python.exe scripts/images_to_webp.py fotos --dry-run
    venv\\Scripts\\python.exe scripts/images_to_webp.py fotos --replace

Por defecto el original NO se toca: se escribe `mismo_nombre.webp` al lado.
`--replace` borra el original solo despues de escribir un WebP mas chico.
SVG no se toca (no es raster). GIF animadas se saltan (perderian animacion).
"""

import argparse
import io
import sys
from pathlib import Path

from PIL import Image, ImageOps

EXTS = {".png", ".jpg", ".jpeg", ".bmp", ".tif", ".tiff"}


def encode_webp(path: Path, quality: int) -> tuple[bytes | None, str | None]:
    with Image.open(path) as img:
        if getattr(img, "n_frames", 1) > 1:
            return None, "animada"
        img = ImageOps.exif_transpose(img)
        has_alpha = "A" in img.getbands() or (img.mode == "P" and "transparency" in img.info)
        if img.mode not in ("RGB", "RGBA"):
            img = img.convert("RGBA" if has_alpha else "RGB")
        buf = io.BytesIO()
        img.save(buf, format="WEBP", quality=quality, method=6)
    return buf.getvalue(), None


def collect(paths: list[Path], recursive: bool) -> list[Path]:
    found: list[Path] = []
    for raw in paths:
        if raw.is_dir():
            found.extend(sorted(raw.rglob("*") if recursive else raw.iterdir()))
        elif raw.is_file():
            found.append(raw)
        else:
            print(f"FALTA: {raw}", file=sys.stderr)
    return found


def main() -> int:
    parser = argparse.ArgumentParser(description="Convierte imagenes a WebP solo si pesa menos.")
    parser.add_argument("paths", nargs="+", type=Path, help="archivos o carpetas de imagenes")
    parser.add_argument("--quality", type=int, default=82, help="calidad WebP (default: 82)")
    parser.add_argument("--recursive", action="store_true", help="bajar subcarpetas")
    parser.add_argument("--dry-run", action="store_true", help="mostrar sin escribir")
    parser.add_argument("--replace", action="store_true", help="borrar originales convertidos")
    args = parser.parse_args()

    files = collect(args.paths, args.recursive)
    converted = kept = skipped = 0
    saved_before = saved_after = 0

    for path in files:
        if path.suffix.lower() not in EXTS:
            continue
        before = path.stat().st_size
        try:
            data, reason = encode_webp(path, args.quality)
        except (OSError, ValueError) as exc:
            print(f"SKIP {path.name}: {exc}")
            skipped += 1
            continue
        if reason:
            print(f"SKIP {path.name}: {reason}")
            skipped += 1
            continue
        after = len(data)
        if after >= before:
            print(f"KEEP {path.name}: webp {after} B >= original {before} B")
            kept += 1
            continue
        out = path.with_suffix(".webp")
        if out.exists():
            print(f"SKIP {out.name}: ya existe")
            skipped += 1
            continue
        verb = "WOULD" if args.dry_run else "WRITE"
        if not args.dry_run:
            out.write_bytes(data)
            if args.replace:
                path.unlink()
        saved_before += before
        saved_after += after
        converted += 1
        print(f"{verb} {path.name}: {before} B -> {after} B (-{100 * (before - after) // before}%)")

    print(
        f"TOTAL: {converted} convertidas, {kept} mas chicas en original, "
        f"{skipped} saltadas; {saved_before} B -> {saved_after} B"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
