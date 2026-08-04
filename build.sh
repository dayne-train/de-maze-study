#!/usr/bin/env bash
# ══════════════════════════════════════════════════════════════════════════
# build.sh — generate the DE Maze study build.
#
# NEVER EDIT docs/ BY HAND. It is regenerated from scratch every run.
# Edit patches/ instead, then re-run this script.
#
# docs/ is the published site. GitHub Pages is set to "deploy from branch:
# main, folder: /docs", and it serves that folder AT THE SITE ROOT — so
# docs/hs-approval-queue/ is /hs-approval-queue/, and no URL ever contains
# "docs". Everything else in this repo (build.sh, patches/, vendor/) sits
# outside docs/ and is therefore never served, which is what keeps
# launcher.html — the moderator answer key — off the public web.
#
# The study build is a SNAPSHOT: it is cut from the published prototypes at a
# point in time and deliberately frozen, so every participant sees the same
# build. Porting a later upstream change forward is a decision, not a default —
# re-run this script when you mean to, and diff docs/ to see what moved.
#
# Publishing is just:  ./build.sh && git add -A && git commit && git push
# ══════════════════════════════════════════════════════════════════════════
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SRC="/Users/dayne.petera/Desktop/Parchment/dual-enrollment-design/dual-enrollment/prototypes"
BUILD="$HERE/docs"

PROTOS=(hs-approval-queue college-approval-queue learner-application)

[ -d "$SRC" ] || { echo "source tree not found: $SRC" >&2; exit 1; }

echo "→ clearing docs/"
rm -rf "$BUILD"
mkdir -p "$BUILD"

echo "→ syncing shared kit + _shared"
rsync -a --exclude '.DS_Store' "$SRC/_kit" "$SRC/_shared" "$BUILD/"

echo "→ syncing prototypes"
for p in "${PROTOS[@]}"; do
  rsync -a --exclude '.DS_Store' --exclude '*.context.md' --exclude '*reference.md' \
        "$SRC/$p" "$BUILD/"
done

# parent-consent exists ONLY in patches/ — it was never published upstream.
echo "→ adding parent-consent (patch-maintained)"
rsync -a --exclude '.DS_Store' "$HERE/patches/parent-consent" "$BUILD/"

echo "→ installing shim"
mkdir -p "$BUILD/_shared/maze"
cp "$HERE/patches/shim/maze-shim.js" "$HERE/patches/shim/maze-shim.css" "$BUILD/_shared/maze/"
cp -r "$HERE/patches/shim/config" "$BUILD/_shared/maze/"

# Self-hosted Tabler webfont (see vendor-tabler.sh).
if [ -d "$HERE/vendor/tabler" ]; then
  echo "→ installing self-hosted Tabler icons"
  mkdir -p "$BUILD/_kit/vendor"
  cp -r "$HERE/vendor/tabler/." "$BUILD/_kit/vendor/"
fi

echo "→ patching"
python3 "$HERE/patches/inject-tags.py"    "$BUILD"
python3 "$HERE/patches/strip-escapes.py"  "$BUILD"
python3 "$HERE/patches/pin-network.py"    "$BUILD"
python3 "$HERE/patches/stub-downloads.py" "$BUILD"
python3 "$HERE/patches/scrub-pii.py" "$BUILD"

echo "→ launcher (repo root — outside docs/, so Pages never serves it)"
cp "$HERE/patches/launcher.html" "$HERE/launcher.html"

# ── GitHub Pages essentials ───────────────────────────────────────────────
# .nojekyll is NOT optional. Pages runs Jekyll by default, and Jekyll excludes
# every directory whose name starts with an underscore — which is _kit/ and
# _shared/, i.e. all 115 stylesheet/script references in the build. Without this
# file every prototype serves as unstyled HTML with no kit and no shim.
touch "$BUILD/.nojekyll"

# Keep the study build out of search results for its whole life.
cat > "$BUILD/robots.txt" <<'ROBOTS'
User-agent: *
Disallow: /
ROBOTS

# ── assertions ────────────────────────────────────────────────────────────
# Each of these guards a failure that would look like a clean build but ruin
# the study data.
echo "→ asserting"
fail=0

# 1. Nothing may open a new tab: Maze requires the whole session in one tab.
#    Scoped to the prototypes + shared code. The launcher legitimately discusses
#    target="_blank" in prose, and it no longer lives inside docs/ anyway.
for dir in "${PROTOS[@]}" parent-consent _shared; do
  if grep -rn 'target="_blank"\|window\.open(' "$BUILD/$dir" \
       --include='*.html' --include='*.js' 2>/dev/null; then
    echo "  ✗ $dir: found a new-tab navigation — it would break the Maze session" >&2
    fail=1
  fi
done

# 2. No demo/tour scaffolding may survive the port.
if grep -rln 'DemoTour\|demo-tour\|demo-steps\|DEMO_FILL' "$BUILD" 2>/dev/null; then
  echo "  ✗ presenter demo scaffolding leaked into the study build" >&2
  fail=1
fi

# 3. The shim must actually be wired into every prototype.
for p in "${PROTOS[@]}" parent-consent; do
  grep -q 'maze-shim.js' "$BUILD/$p/index.html" || {
    echo "  ✗ $p: shim not wired" >&2; fail=1; }
done

# 4. No redirect stubs — a meta-refresh hop registers as an extra Maze page.
for stub in counselor-approval-queue college-admin-applications; do
  [ -e "$BUILD/$stub" ] && { echo "  ✗ redirect stub $stub was copied" >&2; fail=1; }
done

# 5. Syntax-check everything we author or touch.
for f in "$BUILD"/_shared/maze/maze-shim.js "$BUILD"/_shared/maze/config/*.js \
         "$BUILD"/parent-consent/scripts/app.js; do
  node -c "$f" 2>/dev/null || { echo "  ✗ syntax error in $f" >&2; fail=1; }
done

# 6. No real colleague names may reach the public repo. scrub-pii.py handles this;
#    this is the net under it, because a NEW comment naming someone would
#    otherwise ship silently on the next rebuild.
#    Two exemptions, both deliberate:
#      --arendtBlue   an upstream Tasty color token, not prose.
#      dayne-train    the public GitHub handle that HOSTS this build. It is the
#                     URL; it cannot be secret. Note \bdayne\b matches inside it,
#                     since '-' is a word boundary — hence the explicit exclusion.
leak=$(grep -rniE '\b(corey|arenz|arendt|jeanette|dayne|petera)\b' "$BUILD" 2>/dev/null \
       | grep -v 'arendtBlue' | grep -viE 'dayne-train' || true)
if [ -n "$leak" ]; then
  echo "  ✗ real names survived the scrub — they would be published publicly:" >&2
  echo "$leak" | cut -c1-160 | sed 's/^/      /' >&2
  fail=1
fi

# 7. The self-hosted Tabler CSS must reference fonts it can actually load. A
#    prefix-only url() rewrite in vendor-tabler.sh once produced
#    url(fonts/x.woff2?v3.0.0")  — every icon rendered as an empty box, and
#    nothing failed until the CDN <link> was stripped for the public build.
if [ -f "$BUILD/_kit/vendor/tabler-icons.min.css" ]; then
  badurl=$(grep -oE 'url\([^)]*\)' "$BUILD/_kit/vendor/tabler-icons.min.css" \
           | grep -vE '^url\("fonts/[A-Za-z0-9._-]+"\)$' || true)
  if [ -n "$badurl" ]; then
    echo "  ✗ malformed font url() in vendored Tabler CSS — icons will not render:" >&2
    echo "$badurl" | sed 's/^/      /' >&2
    fail=1
  fi
  for ref in $(grep -oE 'url\("fonts/[^"]+"\)' "$BUILD/_kit/vendor/tabler-icons.min.css" \
               | sed 's#url("fonts/##;s#")##' | sort -u); do
    [ -f "$BUILD/_kit/vendor/fonts/$ref" ] || {
      echo "  ✗ Tabler CSS references missing font fonts/$ref" >&2; fail=1; }
  done
fi

[ "$fail" -eq 0 ] || { echo "BUILD FAILED" >&2; exit 1; }

# ── provenance ────────────────────────────────────────────────────────────
# A snapshot with no record of what it was cut from is unauditable six weeks in.
{
  echo "Built:  $(date '+%Y-%m-%d %H:%M:%S %Z')"
  # Home-relative, not absolute: PROVENANCE.txt ships in a PUBLIC Pages repo and
  # an absolute path would publish the account name.
  echo "Source: ${SRC/#$HOME/~}"
  if git -C "$SRC" rev-parse --short HEAD >/dev/null 2>&1; then
    echo "Commit: $(git -C "$SRC" rev-parse --short HEAD) on $(git -C "$SRC" rev-parse --abbrev-ref HEAD)"
    echo "Dirty:  $(git -C "$SRC" status --porcelain | wc -l | tr -d ' ') uncommitted file(s)"
  else
    echo "Commit: (source is not a git working tree)"
  fi
} > "$BUILD/PROVENANCE.txt"

echo
echo "✓ docs/ ready — $(find "$BUILD" -type f | wc -l | tr -d ' ') files"
sed 's/^/  /' "$BUILD/PROVENANCE.txt"
echo
# Serve the REPO ROOT, not docs/, so launcher.html is reachable locally. Its task
# links are docs/-prefixed to match. (Pages serves docs/ at the root instead, which
# is why the published URLs have no docs/ segment.)
echo "  Serve:  python3 -m http.server 8080 --directory $HERE"
echo "  Open:   http://localhost:8080/launcher.html"
echo
echo "  Publish: git add -A && git commit -m 'DE study build' && git push"
