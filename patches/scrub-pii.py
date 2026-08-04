#!/usr/bin/env python3
"""
scrub-pii.py — remove real people's names and real-looking contact details from
the build.

This build is PUBLISHED TO A PUBLIC REPO. Source comments in the prototypes cite
colleagues by name ("Corey review #7", "confirmed with Dayne"), which is fine in
an internal repo and not fine on the open web. Fixture personas (Morgan Lee,
Kathy Nguyen, the students) are invented and stay — they are the study content.

Run as a build step so the scrub cannot be forgotten on a rebuild; the assertion
at the bottom of build.sh fails the build if anything slips through.

Deliberately NOT scrubbed:
  --arendtBlue   an upstream Tasty color token. It carries a surname, but it is a
                 token name, not prose: renaming it would break every var() that
                 references it across the kit. Upstream's choice, not ours.
  Figma node ids and KB section refs — not personal data, and meaningless to
                 anyone outside the org.
"""
import re
import sys
from pathlib import Path

BUILD = Path(sys.argv[1] if len(sys.argv) > 1 else "build")

# Ordered: longest / most specific first, so "Corey review #7" is consumed before
# a bare "Corey" can strand a dangling "#7".
SUBS = [
    (re.compile(r"\bCorey(?:'s)? review\b"), "PM review"),
    (re.compile(r"\bCorey's\b"),             "the PM's"),
    (re.compile(r"\bCorey\b"),               "the PM"),
    (re.compile(r"\bDayne's\b"),             "the designer's"),
    (re.compile(r"\bDayne\b"),               "the designer"),
    # A real-shaped Gmail address in a bulk-upload fixture row. Every other
    # fixture email sits on an obviously fake domain; this one did not, so it
    # could plausibly belong to a real person.
    (re.compile(r"\bdavidabella80@gmail\.com\b"), "d.abella@email.com"),
]

EXTS = {".js", ".html", ".css", ".json", ".txt", ".md"}

changed = 0
for path in sorted(BUILD.rglob("*")):
    if not path.is_file() or path.suffix.lower() not in EXTS:
        continue
    try:
        original = path.read_text(encoding="utf-8")
    except (UnicodeDecodeError, OSError):
        continue

    text = original
    for pattern, replacement in SUBS:
        text = pattern.sub(replacement, text)

    if text != original:
        path.write_text(text, encoding="utf-8")
        changed += 1

print(f"scrub-pii.py: {changed} file(s) scrubbed")
