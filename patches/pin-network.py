#!/usr/bin/env python3
"""Pin the exchange-network config into the study build's defaults.

WHY
Previously every task URL carried a 130-character ?net= string. That worked, but
it was load-bearing in a fragile way: network.js's hydrate() falls back to
sessionStorage when ?net= is absent, so a participant who nudged a setting in
task 1 (or any URL that lost the param) would carry that state into task 4. It
also made every Maze URL hard to read at a glance.

WHAT THIS DOES
1. Sets selfUrl to true — the only one of the nine keys whose shipped default
   differs from the study's pinned config (all three gates, all four entry
   points, both visibility flags ON).
2. Removes the sessionStorage fallback from hydrate(), so a bare URL always
   yields the study config rather than whatever the last screen left behind.

?net= still works as an explicit override, which is what a moderator wants when
demonstrating a different configuration behind Cmd+D.

Fails loudly if an anchor moved upstream.
"""
import sys
import pathlib

BUILD = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else "build")
path = BUILD / "_shared" / "network" / "network.js"

errors = []

if not path.exists():
    print(f"pin-network.py FAILED: {path} not found", file=sys.stderr)
    sys.exit(1)

src = path.read_text()

# ── 1. selfUrl default ────────────────────────────────────────────────────
OLD_SELFURL = """    // entry points — self-serve URL off by default, matching the explorer
    heInvite: true,
    hsInvite: true,
    selfUrl: false,"""
NEW_SELFURL = """    // entry points — STUDY BUILD: all four on, so every entry point the study
    // discusses is actually reachable (selfUrl ships false upstream).
    heInvite: true,
    hsInvite: true,
    selfUrl: true,"""

if OLD_SELFURL not in src:
    errors.append("selfUrl default block not found — did the state shape change?")
else:
    src = src.replace(OLD_SELFURL, NEW_SELFURL, 1)

# ── 2. sessionStorage fallback ────────────────────────────────────────────
OLD_HYDRATE = """        if (m) q = decodeURIComponent(m[1]);
        else if (root.sessionStorage) q = root.sessionStorage.getItem(STORE_KEY);"""
NEW_HYDRATE = """        if (m) q = decodeURIComponent(m[1]);
        /* STUDY BUILD: no sessionStorage fallback. Upstream this carries config
           between prototypes in one sitting; here it would let a setting nudged
           in one task silently reshape a later one. A bare URL must always mean
           the pinned study config. ?net= still overrides explicitly. */"""

if OLD_HYDRATE not in src:
    errors.append("hydrate() sessionStorage fallback not found")
else:
    src = src.replace(OLD_HYDRATE, NEW_HYDRATE, 1)

if errors:
    print("pin-network.py FAILED:", file=sys.stderr)
    for e in errors:
        print("  - " + e, file=sys.stderr)
    sys.exit(1)

path.write_text(src)

# ── verify ────────────────────────────────────────────────────────────────
written = path.read_text()
checks = {
    "selfUrl: true": "selfUrl not pinned on",
    "STUDY BUILD: no sessionStorage fallback": "hydrate patch missing",
}
bad = [msg for needle, msg in checks.items() if needle not in written]
if bad or "else if (root.sessionStorage) q = root.sessionStorage.getItem" in written:
    print("pin-network.py FAILED verification:", file=sys.stderr)
    for m in bad:
        print("  - " + m, file=sys.stderr)
    sys.exit(1)

print("pin-network.py: config pinned into defaults (?net= no longer required)")
