#!/usr/bin/env python3
"""Replace real CSV downloads with a toast.

WHY
Three code paths build a Blob and click a synthetic <a download>, which fires a
real browser download prompt. Unmoderated, that is disruptive at best: the
participant gets an OS-level dialog mid-task, and on some setups the file opens
in another application, which takes them out of the single tab the Maze session
depends on. Nothing in the study tests the export itself — only that people can
find it — so a toast preserves the affordance and the discoverability finding
while removing the interruption.

Three sites, two shapes:
  - deDownloadCSV() in search.js          (both admin forks, identical text)
  - an inline blob block in active-enrollments.js (HS only, Grades concept)

Fails loudly if an anchor moved upstream.
"""
import sys
import pathlib

BUILD = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else "build")

TOAST = (
    "showToast('Export ready — download disabled in this preview', 'success')"
)

# ── shape 1: the named helper in search.js ────────────────────────────────
OLD_HELPER = """  function deDownloadCSV(csv, filename) {
    var blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    var link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
  }"""

NEW_HELPER = """  function deDownloadCSV(csv, filename) {
    /* STUDY BUILD: no real download. A browser download prompt mid-task pulls the
       participant out of the single tab the Maze session depends on. The export
       affordance still works and still registers as a click. */
    void csv; void filename;
    %s;
  }""" % TOAST

# ── shape 2: the inline block in active-enrollments.js ────────────────────
OLD_INLINE = """  var blob = new Blob([csvRows.join('\\n')], { type: 'text/csv;charset=utf-8;' });
  var url = URL.createObjectURL(blob);
  var link = document.createElement('a');
  link.href = url;
  link.download = 'grades_' + term.toLowerCase().replace(/\\s+/g, '-') + '.csv';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);"""

NEW_INLINE = """  /* STUDY BUILD: no real download — see stub-downloads.py. */
  void csvRows; void term;
  %s;""" % TOAST

TARGETS = [
    ("hs-approval-queue/scripts/app/search.js", OLD_HELPER, NEW_HELPER),
    ("college-approval-queue/scripts/app/search.js", OLD_HELPER, NEW_HELPER),
    ("hs-approval-queue/scripts/app/active-enrollments.js", OLD_INLINE, NEW_INLINE),
]

errors = []
patched = 0

for rel, old, new in TARGETS:
    path = BUILD / rel
    if not path.exists():
        errors.append(f"{rel}: not found")
        continue
    src = path.read_text()
    if old not in src:
        errors.append(f"{rel}: download block not found — did it change upstream?")
        continue
    path.write_text(src.replace(old, new, 1))
    patched += 1

# Nothing anywhere may still click a synthetic download link.
for path in BUILD.glob("*/scripts/**/*.js"):
    body = path.read_text()
    if ".download =" in body and "createObjectURL" in body:
        errors.append(f"{path.relative_to(BUILD)}: a real download path survived")

if errors:
    print("stub-downloads.py FAILED:", file=sys.stderr)
    for e in errors:
        print("  - " + e, file=sys.stderr)
    sys.exit(1)

print(f"stub-downloads.py: {patched} download paths stubbed to a toast")
