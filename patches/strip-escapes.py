#!/usr/bin/env python3
"""Remove participant escape hatches from the study build.

1. `indexHref` in each dev-drawer-config.js — dev-drawer.js:530 renders the
   "← Prototypes" button only `if (opts.indexHref)`, so dropping the key removes
   the button entirely with no engine change. This is the single biggest
   single-tab escape hatch: one click and the participant is browsing the whole
   prototype library mid-task.

2. The Tabler Icons CDN <link> — rewritten to a self-hosted copy. It is the only
   external dependency in the build. If Maze frames the page under a restrictive
   CSP, or jsdelivr is slow, every .ti-* glyph disappears: row actions, status
   badges, pagination and Back chevrons. The prototype still "works" but reads as
   broken design, and participants report it as such.

Fails loudly if an anchor is missing.
"""
import sys
import pathlib
import re

BUILD = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else "build")

DRAWER_CONFIGS = [
    "hs-approval-queue/scripts/app/dev-drawer-config.js",
    "college-approval-queue/scripts/app/dev-drawer-config.js",
    "learner-application/scripts/dev-drawer-config.js",
]

CDN_RE = re.compile(
    r'<link rel="stylesheet" href="https://cdn\.jsdelivr\.net/npm/@tabler/icons-webfont@[^"]+">'
)

errors = []

# ── 1. indexHref ──────────────────────────────────────────────────────────
for rel in DRAWER_CONFIGS:
    path = BUILD / rel
    if not path.exists():
        errors.append(f"{rel}: not found")
        continue
    src = path.read_text()
    if "indexHref" not in src:
        errors.append(f"{rel}: no indexHref key found — did the config shape change?")
        continue
    patched = re.sub(r"\s*indexHref:\s*'[^']*',", "", src)
    if "indexHref" in patched:
        errors.append(f"{rel}: indexHref survived the strip")
        continue
    path.write_text(patched)

# ── 2. Tabler CDN -> self-hosted ──────────────────────────────────────────
font_css = BUILD / "_kit" / "vendor" / "tabler-icons.min.css"
if not font_css.exists():
    errors.append(
        "_kit/vendor/tabler-icons.min.css missing — run `./vendor-tabler.sh` once "
        "(needs network) to cache the webfont locally"
    )
else:
    for index in sorted(BUILD.glob("*/index.html")):
        html = index.read_text()
        if not CDN_RE.search(html):
            continue  # not every prototype references it
        depth_prefix = "../"  # every prototype sits one level under build/
        html = CDN_RE.sub(
            f'<link rel="stylesheet" href="{depth_prefix}_kit/vendor/tabler-icons.min.css">',
            html,
        )
        index.write_text(html)

    # nothing may still point at the CDN
    for index in sorted(BUILD.glob("*/index.html")):
        if "cdn.jsdelivr.net" in index.read_text():
            errors.append(f"{index.relative_to(BUILD)}: still references the CDN")

if errors:
    print("strip-escapes.py FAILED:", file=sys.stderr)
    for e in errors:
        print("  - " + e, file=sys.stderr)
    sys.exit(1)

print("strip-escapes.py: escape hatches removed, icons self-hosted")
