#!/usr/bin/env python3
"""Inject the maze-shim <script>/<link> tags into each prototype's index.html.

This patcher MUST fail loudly. If an anchor string moves upstream and we silently
no-op, the shim never loads and the study records one URL for every screen — which
looks like a successful build and produces a worthless data set.
"""
import sys
import pathlib
import re

BUILD = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else "build")
CACHE_BUST = "v=1"

# proto -> (anchor line that must exist, relative depth to _shared)
TARGETS = {
    "hs-approval-queue":       '<script src="scripts/app/dev-drawer-config.js"></script>',
    "college-approval-queue":  '<script src="scripts/app/dev-drawer-config.js"></script>',
    "learner-application":     '<script src="scripts/dev-drawer-config.js"></script>',
    "parent-consent":          '<script src="scripts/app.js"></script>',
}

# The last stylesheet differs per prototype (active-enrollments.css here,
# queue-screens/modals.css there), so anchor POSITIONALLY rather than by name:
# the shim's CSS must simply come last, after everything it overrides.
CSS_LINK_RE = re.compile(r'<link rel="stylesheet"[^>]*>')

errors = []

for proto, anchor in TARGETS.items():
    path = BUILD / proto / "index.html"
    if not path.exists():
        errors.append(f"{proto}: index.html not found at {path}")
        continue

    html = path.read_text()

    if "maze-shim.js" in html:
        errors.append(f"{proto}: shim tags already present — build/ was not clean")
        continue

    # ── <head> extras: noindex, then the Maze snippet if one is configured ──
    # This is unreleased product design on a public host. robots.txt covers
    # crawlers that respect it; the meta tag covers the rest.
    head_extra = '\n  <meta name="robots" content="noindex, nofollow">'

    snippet_file = pathlib.Path(__file__).parent / "maze-snippet.html"
    snippet = snippet_file.read_text() if snippet_file.exists() else ""
    # Strip whole HTML comment blocks — the placeholder file is all comments, and
    # its example body contains a <script> tag that would otherwise be injected
    # as live markup and throw a SyntaxError on every page.
    snippet = re.sub(r"<!--.*?-->", "", snippet, flags=re.S).strip()
    if snippet:
        head_extra += "\n  " + snippet

    # parent-consent is a bare document with no explicit <html>/<head> (the
    # browser synthesises them), so fall back to the charset meta, which every
    # prototype has and which must stay first in the head.
    if "<head>" in html:
        html = html.replace("<head>", "<head>" + head_extra, 1)
    else:
        m = re.search(r'<meta charset="[^"]*">', html)
        if not m:
            errors.append(f"{proto}: no <head> and no charset meta to inject after")
        else:
            html = html[: m.end()] + head_extra + html[m.end() :]

    # ── stylesheet: append after the LAST existing one ────────────────────
    links = list(CSS_LINK_RE.finditer(html))
    if not links:
        errors.append(f"{proto}: no <link rel=\"stylesheet\"> found at all")
    else:
        end = links[-1].end()
        html = (
            html[:end]
            + f'\n  <link rel="stylesheet" href="../_shared/maze/maze-shim.css?{CACHE_BUST}">'
            + html[end:]
        )

    # ── scripts (dead last, so our showScreen wrapper is the outermost one) ─
    if anchor not in html:
        errors.append(f"{proto}: script anchor not found: {anchor!r}")
    else:
        tags = (
            anchor
            + f'\n<script src="../_shared/maze/maze-shim.js?{CACHE_BUST}"></script>'
            + f'\n<script src="../_shared/maze/config/{proto}.js?{CACHE_BUST}"></script>'
        )
        html = html.replace(anchor, tags, 1)

    path.write_text(html)

    # ── verify our own work ───────────────────────────────────────────────
    written = path.read_text()
    for needle in ("maze-shim.css", "maze-shim.js", f"config/{proto}.js"):
        if needle not in written:
            errors.append(f"{proto}: {needle} missing after injection")

if errors:
    print("inject-tags.py FAILED:", file=sys.stderr)
    for e in errors:
        print("  - " + e, file=sys.stderr)
    print("\nAn anchor probably moved upstream. Fix the anchor, do not skip this step.",
          file=sys.stderr)
    sys.exit(1)

print(f"inject-tags.py: shim wired into {len(TARGETS)} prototypes")
