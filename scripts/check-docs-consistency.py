#!/usr/bin/env python3
"""
Doc-Code Consistency Checker for Roleito.

Scans docs/ and source code for type definitions, checks for:
1. Naming collisions between docs and code
2. Conflicting type definitions across docs
3. Missing cross-references
4. Stale type definitions in docs

Usage: python scripts/check-docs-consistency.py
"""

import re
import os
import sys
from pathlib import Path
from collections import defaultdict

ROOT = Path(__file__).parent.parent
DOCS_DIR = ROOT / "docs"
CODE_DIRS = [ROOT / "apps" / "dm" / "src", ROOT / "core", ROOT / "backend"]

# Patterns to find type definitions
TS_INTERFACE = re.compile(r"export\s+(?:interface|type)\s+(\w+)", re.MULTILINE)
TS_ENUM = re.compile(r"export\s+enum\s+(\w+)", re.MULTILINE)
PY_CLASS = re.compile(r"class\s+(\w+)\s*[:\(]", re.MULTILINE)
DOC_INTERFACE = re.compile(r"interface\s+(\w+)", re.MULTILINE)
DOC_ENUM = re.compile(r"enum\s+(\w+)", re.MULTILINE)
DOC_TYPE = re.compile(r"type\s+(\w+)", re.MULTILINE)

# Pattern to find SceneLayer references
SCENELAYER_REF = re.compile(r"SceneLayer\.(\w+)")
SCENELAYER_DEF = re.compile(r"(\w+)\s*=\s*(\d+)")

# Known naming collisions (ARCHITECTURE.md describes same types as code)
KNOWN_COLLISIONS = {
    "Campaign", "Session", "Event", "EventType", "CanonStatus",
    "KnowledgeScope", "Relationship", "Map", "Player", "DiceRoll",
    "Entity", "Secret", "Snapshot", "EntityType", "EventStatus",
    "Item", "InventoryItem", "Scene",
}


def scan_code_types():
    """Scan source code for TypeScript/Python type definitions."""
    types = {}
    for code_dir in CODE_DIRS:
        if not code_dir.exists():
            continue
        for ext in ["*.ts", "*.tsx"]:
            for f in code_dir.rglob(ext):
                if "node_modules" in str(f) or ".d.ts" in str(f):
                    continue
                try:
                    content = f.read_text(encoding="utf-8")
                except Exception:
                    continue
                for m in TS_INTERFACE.finditer(content):
                    types[m.group(1)] = str(f.relative_to(ROOT))
                for m in TS_ENUM.finditer(content):
                    types[m.group(1)] = str(f.relative_to(ROOT))
        for f in code_dir.rglob("*.py"):
            try:
                content = f.read_text(encoding="utf-8")
            except Exception:
                continue
            for m in PY_CLASS.finditer(content):
                types[m.group(1)] = str(f.relative_to(ROOT))
    return types


def scan_doc_types():
    """Scan docs for type definitions."""
    types = {}
    for f in DOCS_DIR.glob("*.md"):
        try:
            content = f.read_text(encoding="utf-8")
        except Exception:
            continue
        for m in DOC_INTERFACE.finditer(content):
            types[m.group(1)] = str(f.relative_to(ROOT))
        for m in DOC_ENUM.finditer(content):
            types[m.group(1)] = str(f.relative_to(ROOT))
        for m in DOC_TYPE.finditer(content):
            types[m.group(1)] = str(f.relative_to(ROOT))
    return types


def check_scenelayer_conflicts():
    """Check for conflicting SceneLayer definitions across docs."""
    layer_defs = {}
    for f in DOCS_DIR.glob("*.md"):
        try:
            content = f.read_text(encoding="utf-8")
        except Exception:
            continue
        # Only check files that mention SceneLayer
        if "SceneLayer" not in content:
            continue
        lines = content.split("\n")
        current_layers = {}
        in_scenelayer_block = False
        for line in lines:
            stripped = line.strip()
            # Detect start of SceneLayer block
            if "SceneLayer" in stripped and "{" in stripped:
                in_scenelayer_block = True
                continue
            if in_scenelayer_block:
                # End of block
                if stripped == "}":
                    in_scenelayer_block = False
                    continue
                # Match "TERRAIN = 0," pattern inside enum block
                m = re.match(r"(\w+)\s*=\s*(\d+)", stripped)
                if m:
                    current_layers[m.group(1)] = int(m.group(2))
            # Also match inline "0: TERRAIN" in tables/lists
            m = re.match(r"(\d+):\s*(\w+)", stripped)
            if m and m.group(2).isupper():
                current_layers[m.group(2)] = int(m.group(1))
        if current_layers:
            layer_defs[str(f.relative_to(ROOT))] = current_layers
    return layer_defs


def check_naming_collisions(code_types, doc_types):
    """Find type names that exist in both code and docs."""
    collisions = {}
    for name in set(code_types.keys()) & set(doc_types.keys()):
        collisions[name] = {
            "code": code_types[name],
            "doc": doc_types[name],
        }
    return collisions


def check_sceneitem_references():
    """Check for SceneItem references that should use canonical Item type."""
    issues = []
    for f in DOCS_DIR.glob("*.md"):
        try:
            content = f.read_text(encoding="utf-8")
        except Exception:
            continue
        # Find non-canonical layer strings
        for m in re.finditer(r"layer:\s*['\"](\w+)['\"]", content):
            layer_val = m.group(1)
            if layer_val in ("ground", "items"):
                issues.append(
                    f"{f.relative_to(ROOT)}: Uses non-canonical layer '{layer_val}' "
                    f"(should use SceneLayer enum from SCENE-GRAPH.md)"
                )
    return issues


def check_cross_references():
    """Check that key docs reference each other properly."""
    required_refs = {
        "FOG-AND-VISIBILITY.md": ["SCENE-GRAPH.md", "WALLS-AND-LINE-OF-SIGHT.md"],
        "WALLS-AND-LINE-OF-SIGHT.md": ["SCENE-GRAPH.md", "FOG-AND-VISIBILITY.md"],
        "LIGHTING-SYSTEM.md": ["SCENE-GRAPH.md", "WALLS-AND-LINE-OF-SIGHT.md"],
        "MAP-ANALYSIS.md": ["SCENE-GRAPH.md", "FOG-AND-VISIBILITY.md"],
        "2D-TO-3D.md": ["SCENE-GRAPH.md", "LIGHTING-SYSTEM.md"],
    }
    issues = []
    for doc, refs in required_refs.items():
        doc_path = DOCS_DIR / doc
        if not doc_path.exists():
            continue
        try:
            content = doc_path.read_text(encoding="utf-8")
        except Exception:
            continue
        for ref in refs:
            if ref not in content:
                issues.append(f"{doc}: Missing reference to {ref}")
    return issues


def check_stale_types(code_types, doc_types):
    """Find doc types that don't match any code type (potential staleness)."""
    stale = []
    for name, location in doc_types.items():
        if name not in code_types and name[0].isupper():
            # Only flag PascalCase names that look like types
            stale.append(f"  {name} ({location})")
    return stale


def main():
    print("=" * 60)
    print("Roleito Doc-Code Consistency Check")
    print("=" * 60)

    code_types = scan_code_types()
    doc_types = scan_doc_types()

    # 1. Naming collisions
    print("\n[1] NAMING COLLISIONS (code <-> docs)")
    print("-" * 40)
    collisions = check_naming_collisions(code_types, doc_types)
    # Filter out known intentional collisions
    real_collisions = {k: v for k, v in collisions.items() if k not in KNOWN_COLLISIONS}
    if real_collisions:
        for name, locs in sorted(real_collisions.items()):
            print(f"  WARNING {name}")
            print(f"    code: {locs['code']}")
            print(f"    doc:  {locs['doc']}")
    else:
        print("  OK No unexpected naming collisions")
    if collisions:
        print(f"  (suppressed {len(collisions) - len(real_collisions)} known collisions from ARCHITECTURE.md)")

    # 2. SceneLayer conflicts
    print("\n[2] SCENELAYER DEFINITIONS (should be identical)")
    print("-" * 40)
    layer_defs = check_scenelayer_conflicts()
    if layer_defs:
        # Check if all definitions match
        canonical = None
        all_match = True
        for doc, layers in layer_defs.items():
            if canonical is None:
                canonical = layers
            elif layers != canonical:
                all_match = False
                print(f"  WARNING {doc} differs from canonical:")
                for k, v in layers.items():
                    if canonical.get(k) != v:
                        print(f"    {k}={v} (expected {canonical.get(k)})")
        if all_match:
            print("  OK All SceneLayer definitions match")
        else:
            pass  # conflicts already printed
    else:
        print("  (no SceneLayer definitions found)")

    # 3. Non-canonical layer references
    print("\n[3] NON-CANONICAL LAYER REFERENCES")
    print("-" * 40)
    layer_issues = check_sceneitem_references()
    if layer_issues:
        for issue in layer_issues:
            print(f"  WARNING {issue}")
    else:
        print("  OK No non-canonical layer references")

    # 4. Cross-references
    print("\n[4] CROSS-REFERENCES")
    print("-" * 40)
    ref_issues = check_cross_references()
    if ref_issues:
        for issue in ref_issues:
            print(f"  WARNING {issue}")
    else:
        print("  OK All cross-references present")

    # 5. Stale doc types
    print("\n[5] DOC TYPES NOT IN CODE (potential staleness)")
    print("-" * 40)
    stale = check_stale_types(code_types, doc_types)
    if stale:
        print(f"  Found {len(stale)} types only in docs (expected for new features):")
        for s in stale[:15]:
            print(f"  - {s}")
        if len(stale) > 15:
            print(f"  ... and {len(stale) - 15} more")
    else:
        print("  OK No stale types")

    # Summary
    total_issues = (
        len(real_collisions)
        + (0 if all_match else 1)
        + len(layer_issues)
        + len(ref_issues)
    )
    print("\n" + "=" * 60)
    if total_issues == 0:
        print("RESULT: OK No consistency issues found")
    else:
        print(f"RESULT: WARNING {total_issues} issue(s) found")
    print("=" * 60)

    return 0 if total_issues == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
