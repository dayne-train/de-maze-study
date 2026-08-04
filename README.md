# DE Maze study build

A frozen, participant-ready snapshot of the Dual Enrollment prototypes, built for an
**unmoderated Maze website test**. Local only — nothing here is hosted or in git yet.

```
./build.sh                                    # regenerate build/ from the published tree
python3 -m http.server 8080 --directory build # serve
open http://localhost:8080/                   # task launcher (internal, not for participants)
```

---

## The rule

**Never edit `build/`.** It is deleted and regenerated on every run. Edit `patches/`,
then re-run `./build.sh`.

The delta between the published prototypes and this study build is exactly the contents
of `patches/` — a reviewable directory, not a divergent copy. That is the whole design.
The InstructureCon demo was a hand-copied fork and drifted a month behind within three
weeks; this build cannot drift silently, because everything it changes is enumerated.

## Snapshot semantics

This build is deliberately **frozen**. A study whose prototype changes mid-flight is
measuring two different products, so participants in week three must see exactly what
participants in week one saw.

`build/PROVENANCE.txt` records the source commit, branch, dirty-file count and build
timestamp. To pull a later upstream change forward, re-run `./build.sh` **deliberately**,
then diff `build/` to see precisely what moved — and only do it between study rounds.

---

## Layout

```
de-maze-study/
├── build.sh              regenerates build/ ; fails loudly on any broken assumption
├── publish.sh            stages build/ into a Pages repo (does NOT commit or push)
├── vendor-tabler.sh      one-time: caches the Tabler webfont locally (needs network)
├── vendor/tabler/        the cached webfont
├── patches/              THE ENTIRE DELTA vs published
│   ├── shim/
│   │   ├── maze-shim.js          URL routing + dev-drawer hotkey
│   │   ├── maze-shim.css         drawer suppression + demo-affordance removal
│   │   └── config/*.js           one descriptor per prototype
│   ├── parent-consent/           the only hand-maintained prototype (never published)
│   ├── launcher.html             internal task-URL index → build/index.html
│   ├── maze-snippet.html         ← PASTE THE MAZE SNIPPET HERE, then rebuild
│   ├── inject-tags.py            wires shim + noindex + snippet into each <head>
│   ├── strip-escapes.py          removes "← Prototypes"; self-hosts the icon font
│   ├── pin-network.py            bakes the study config into the defaults
│   └── stub-downloads.py         CSV export → toast instead of a real download
└── build/                GENERATED — do not edit
```

## Publishing to GitHub Pages

```
# 1. paste the Maze snippet into patches/maze-snippet.html
./build.sh
./publish.sh ~/path/to/pages-repo     # stages only — review, then commit/push yourself
```

Repo must be **public** with Pages enabled. Every path in the build is relative, so serving
from `https://<user>.github.io/<repo>/` works with no rewriting.

**`.nojekyll` is not optional.** Pages runs Jekyll by default, and Jekyll excludes every
directory whose name starts with an underscore — which is `_kit/` and `_shared/`, i.e. all
115 stylesheet and script references. Without that file every prototype serves as unstyled
HTML with no kit and no shim. `build.sh` writes it; `publish.sh` refuses to stage without it.

The build also ships `robots.txt` (`Disallow: /`) and `noindex, nofollow` on every prototype.

## What the shim does

The prototypes are SPAs: `showScreen()` / `switchSegment()` change the view without
touching the URL. Maze registers a success-path step when the **URL changes** (query
params count), so without a shim Maze sees a one-step test — no path analysis, no
per-screen heatmaps, and no way to define task success at all.

`maze-shim.js` mirrors live screen state into the URL and restores it on boot:

```
?screen=de&mode=all&seg=waiting          hs-approval-queue
?screen=review&app=DE-2026-0483          application detail
?journey=invited-counselor/email&screen=de-app   learner (journey is required)
?screen=consent                          parent-consent
```

Design points worth knowing before changing it:

- **Wraps on `window 'load'`**, which is strictly outside every other wrapper
  (`nav.js` defines → `boot.js` reassigns → `workspace.js` wraps → `dev-drawer.js` wraps,
  the last two on DOMContentLoaded).
- **Reads the current screen from `.screen.active`**, not from `showScreen`'s arguments.
  That second argument is type-inconsistent — a string for `review`, `{ids, from}` for
  `deny`, an array for `bulk-approve` — so serialising it generically would produce three
  incompatible URL shapes.
- **pushState for participant navigation, replaceState for machine-driven** (boot restore,
  popstate, config-driven eviction). Several internal calls are not user intent and would
  otherwise poison both the back button and Maze's path analysis.
- **Write-only params.** `learner-application` is still IIFE-wrapped, so `journey` and
  `state` set variables that cannot be read back. The shim remembers them, or they would
  drop out of the URL on the next navigation.
- **Allowlisted screens.** `learner-application` and `parent-consent` fall through to a
  bare `getElementById()` with no class check, so an unknown id strips `.active` from
  every screen and adds it to whatever matched — a silent blank white page, no console
  error. The shim validates first and falls back to the prototype's default screen.

## Study-specific behaviour

| Concern | What the build does |
|---|---|
| **Dev drawer** | Hidden. <kbd>Cmd</kbd>/<kbd>Ctrl</kbd>+<kbd>D</kbd> toggles it for moderators. The gear is a child of `#devdrawer`, so hiding the parent hides both. |
| **Escape hatches** | The drawer's "← Prototypes" button is stripped (`indexHref` removed). Build asserts no `target="_blank"` or `window.open` anywhere. |
| **Config** | **Baked into the build's defaults** — all three approval gates, all four entry points, both visibility flags. Task URLs carry no config param. The `sessionStorage` fallback in `hydrate()` is removed, so a bare URL always means the study config rather than whatever a previous task left behind. `?net=` still works as an explicit moderator override. |
| **CSV export** | Stubbed to a toast. A real download prompt mid-task pulls the participant out of the single tab the Maze session depends on, and nothing in the study tests the export itself — only whether people find it. |
| **Application form** | **Prepopulated**; the participant reviews and submits. Typing an SSN, address, guardian details and a drawn signature unmoderated runs long and measures typing speed, not comprehension. |
| **Click-to-fill** | **Removed.** It shipped in the published learner prototype (`enableClickFill`) and required the participant to discover that clicking the form fills it — a leading cue and an artifact of a presenter demo. |
| **Guardian consent** | Name and date prefilled (facts the system already holds). The **checkboxes and signature are not** — those are the consent act itself, and prefilling them would leave nothing to observe on that screen. |
| **Demo tour** | Not ported. No caption cards, no presenter HUD, no `todo` hints, no row highlight-and-scroll. The last one handed participants the answer to "which application do I act on," which is a finding we want to measure. |
| **Icons** | Tabler is self-hosted. It was the only external dependency; under a Maze iframe with a restrictive CSP every glyph would vanish and the prototype would read as broken design. |

## Build assertions

`build.sh` fails rather than producing a plausible-looking bad build:

1. No new-tab navigation anywhere in the prototypes or `_shared`.
2. No presenter-demo scaffolding (`DemoTour`, `demo-steps`, `DEMO_FILL`) survived the port.
3. The shim is actually wired into all four prototypes.
4. No redirect stubs copied (`counselor-approval-queue`, `college-admin-applications` are
   27-line meta-refresh pages; a redirect hop would register as an extra Maze page).
5. `node -c` on every file we author or modify.

The patchers (`inject-tags.py`, `strip-escapes.py`) exit non-zero when an anchor moves
upstream. This matters more than it looks: a silent no-op would ship a build with no shim,
which looks fine locally and records one URL for the entire study.

---

## Still open

- **Maze snippet not yet added.** `patches/maze-snippet.html` is a placeholder. Without it
  the test still records clips and clicks, but no heatmaps and no success-path metrics.
- **The load-bearing unknown: does Maze register a `pushState` query-param change without
  a page reload?** Their docs are clear that query params count as a step but ambiguous
  about pushState-only changes. Pilot this on a throwaway page before recruiting. If the
  answer is no, the fallback is a real page load per screen (`location.assign`), which
  works for the queue prototypes but not for `learner-application` without adding URL
  params for its whole session state.
- **`adv-search` is excluded from every allowlist** — `renderAdvancedResults()`
  early-returns unless `advSearch.active`, and it is itself what calls
  `showScreen('adv-search')`, so a cold link yields a blank Global Search page. (The dev
  drawer's own Navigate list hits this today — a real latent bug in published, worth
  reporting separately.)
- **`parent-consent` stepper is hardcoded** static markup, not driven by `DENetwork`. Its
  labels were reviewed and corrected to the Jul 29 canon (Application Submission ·
  Parent/Guardian Consent · High School Approval · Institution Review · Register For
  Courses) — three of five were stale. Correct under the pinned all-gates-on config; it
  would lie under any other, so do not change the pinned `?net=` without revisiting it.
