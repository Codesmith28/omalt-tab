#!/usr/bin/env python3
"""
scripts/clean-bindings.py — Cleanly remove omalt-tab loader entries from Hyprland bindings.lua
without leaving orphaned lines or invalid syntax.
"""
import sys
import re
from pathlib import Path

def clean_bindings(file_path: Path) -> bool:
    if not file_path.is_file():
        return False

    content = file_path.read_text(encoding="utf-8")

    # 1. Remove delimited blocks (-- >>> omalt-tab >>> ... -- <<< omalt-tab <<<)
    cleaned = re.sub(r"\n*-- >>> omalt-tab >>>.*?-- <<< omalt-tab <<<\n?", "", content, flags=re.DOTALL)

    # 2. Remove legacy banner blocks (-- ================== ... end)
    cleaned = re.sub(
        r"\n*-- =+\s*\n-- Omarchy Plugins: omalt-tab[^\n]*\n-- =+\s*\nlocal omalt_tab_binding[^\n]*\nlocal f_omalt[^\n]*\nif f_omalt then\s*\n\s*f_omalt:close\(\)\s*\n\s*dofile\(omalt_tab_binding\)\s*\nend\s*\n?",
        "",
        cleaned
    )

    # 3. Remove single-line compact injection if present
    cleaned = re.sub(
        r"\n*-- Omarchy Plugins: omalt-tab[^\n]*\nlocal omalt_tab_binding[^\n]*\nlocal f_omalt[^\n]*\nif f_omalt then f_omalt:close\(\); dofile\(omalt_tab_binding\) end\n?",
        "",
        cleaned
    )

    if cleaned != content:
        file_path.write_text(cleaned.rstrip() + "\n", encoding="utf-8")
        return True
    return False

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(f"Usage: {sys.argv[0]} <path-to-bindings.lua>", file=sys.stderr)
        sys.exit(1)

    target_path = Path(sys.argv[1]).expanduser()
    clean_bindings(target_path)
