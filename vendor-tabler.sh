#!/usr/bin/env bash
# Cache the Tabler Icons webfont locally, once. Needs network.
#
# The prototypes load Tabler from cdn.jsdelivr.net — the only external dependency
# in the whole build. Under a Maze iframe with a restrictive CSP, or a slow CDN,
# every icon silently disappears and the prototype reads as broken design.
# Self-hosting removes the risk entirely.
#
# Run once; the result is committed and reused by every build.
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
OUT="$HERE/vendor/tabler"
VER="3.0.0"
BASE="https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@${VER}/dist"

mkdir -p "$OUT/fonts"

echo "Fetching Tabler Icons ${VER}…"
curl -fsSL "$BASE/tabler-icons.min.css" -o "$OUT/tabler-icons.min.css"

# The CSS references its font files by relative path; pull each one it names.
grep -o "url([^)]*)" "$OUT/tabler-icons.min.css" \
  | sed 's/url(//;s/)//;s/["'\'']//g;s/?.*//;s/#.*//' \
  | sort -u \
  | while read -r ref; do
      case "$ref" in
        data:*|http*) continue ;;
      esac
      name="$(basename "$ref")"
      echo "  · $name"
      curl -fsSL "$BASE/${ref#./}" -o "$OUT/fonts/$name" || {
        echo "    (could not fetch $ref — check the path)" >&2
      }
    done

# Point the CSS at our flat fonts/ directory.
#
# Rewrite the WHOLE url(...) token, never just its prefix. Upstream ships
# url("./fonts/tabler-icons.woff2?v3.0.0") — a prefix-only substitution eats the
# opening quote and leaves the closing one, producing
# url(fonts/tabler-icons.woff2?v3.0.0")  which no browser will resolve, and which
# stays invisible for as long as a CDN <link> is still there to cover for it.
# The ?v cache-buster goes too: these files are local and versioned by this repo.
sed -i '' -E 's#url\([^)]*/?fonts/([A-Za-z0-9._-]+)[^)]*\)#url("fonts/\1")#g' \
  "$OUT/tabler-icons.min.css"

# Fail loudly rather than shipping a stylesheet whose fonts cannot load.
bad=$(grep -oE 'url\([^)]*\)' "$OUT/tabler-icons.min.css" | grep -vE '^url\("fonts/[A-Za-z0-9._-]+"\)$' || true)
if [ -n "$bad" ]; then
  echo "url() rewrite produced malformed refs:" >&2
  echo "$bad" >&2
  exit 1
fi
for f in $(grep -oE 'url\("fonts/[^"]+"\)' "$OUT/tabler-icons.min.css" | sed 's#url("fonts/##;s#")##' | sort -u); do
  [ -f "$OUT/fonts/$f" ] || { echo "CSS references fonts/$f which was not downloaded" >&2; exit 1; }
done

echo "Cached to vendor/tabler/. Re-run build.sh to pick it up."
