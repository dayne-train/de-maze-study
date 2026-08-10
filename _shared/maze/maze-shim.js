/* ══════════════════════════════════════════════════════════════════════
   maze-shim.js — URL routing shim for the DE Maze study build.

   WHY THIS EXISTS
   The DE prototypes are SPAs: showScreen()/switchSegment() change what is on
   screen without touching the URL. Maze's website test registers a new step in
   the success path when the URL CHANGES (query params count). Without this shim
   Maze sees a one-step test: no path analysis, no per-screen heatmaps, and no
   way to define task success.

   WHAT IT DOES
   1. Mirrors the live screen state into the URL  (?screen=…&seg=…&mode=…&app=…)
   2. Restores that state on boot                 (deep-linkable task start URLs)
   3. Hides the dev drawer behind Cmd/Ctrl+D      (participants must not find it)

   DESIGN NOTES (each of these is load-bearing — see README before changing)
   • Wraps on window 'load', which is strictly OUTSIDE every other wrapper:
     nav.js defines showScreen → boot.js reassigns → workspace.js wraps
     (DOMContentLoaded) → dev-drawer.js:552 wraps (DOMContentLoaded). Ours is last.
   • Reads the current screen from `.screen.active` in the DOM rather than from
     showScreen's arguments. showScreen's 2nd arg is type-inconsistent (string for
     'review', {ids,from} for 'deny', array for 'bulk-approve'), so serialising
     it generically would produce three incompatible URL shapes.
   • pushState for participant-initiated navigation, replaceState for
     machine-initiated (boot restore, popstate, config-driven eviction). Several
     internal calls are not user intent and would otherwise poison both the back
     button and Maze's path analysis.
   • Only ever navigates via the prototype's own showScreen(). Touching .active
     directly leaves initSigPad() with a 0x0 canvas (it measures with
     getBoundingClientRect while the screen must be visible).
   ══════════════════════════════════════════════════════════════════════ */
(function (root) {
  'use strict';

  /* Params the shim owns. Everything else in the query string — ?net=, ?v=, and
     anything Maze appends — is preserved untouched on every write. */
  /* `sel` carries a multi-selection (comma-joined ids) across the page load —
     the rows ticked before a bulk action, the learners picked in the invite
     wizard. It is a PAYLOAD param, not a step: two participants who select
     different rows are doing the same thing and belong on the same path, so it
     must never become part of a folder slug. */
  /* `modal` is a step that is not a screen. A modal renders OVER whatever screen
     is active, so `.screen.active` keeps reporting the screen behind it and the
     router would otherwise see no change at all — which is why an approval
     confirmed in a modal was invisible to Maze. Naming the open modal makes it
     addressable without turning it into a page. */
  /* `q` carries a search term across the page load. Searching from the workspace now
     navigates to the applications screen, which here is a real folder and therefore a
     real page load — and the term itself lives in a module-scoped variable that the load
     destroys. Without this the participant searches, lands on the applications list, and
     finds it unfiltered: worse than the button doing nothing, because it looks like the
     search ran and matched everything. A PAYLOAD param like `sel`, never a step: two
     participants searching different names are doing the same thing and belong on the
     same path. */
  var OWNED = ['screen', 'seg', 'mode', 'app', 'journey', 'state', 'step', 'variant',
               'sel', 'col', 'grp', 'course', 'modal', 'q'];

  var desc = null;        // the active prototype descriptor
  var applying = false;   // true while WE are driving; suppresses pushState
  var pending = false;    // debounce flag for the URL write
  var booted = false;

  function log(msg) {
    if (root.console && console.warn) console.warn('[maze-shim] ' + msg);
  }

  /* ── URL read/write ────────────────────────────────────────────────── */

  /* Screen state arrives two ways. A screen FOLDER declares it in a meta tag
     stamped by the build; the query string can still carry it (and always
     carries the payload params the folders deliberately do not encode). Folder
     first, query string on top, so ?app=… still selects the application while
     the folder decides which screen. */
  function readParams() {
    var out = {};
    var meta = document.querySelector('meta[name="maze-route"]');
    if (meta) {
      new URLSearchParams(meta.getAttribute('content') || '').forEach(function (v, k) {
        if (OWNED.indexOf(k) !== -1) out[k] = v;
      });
    }
    var p = new URLSearchParams(root.location.search);
    OWNED.forEach(function (k) { if (p.has(k)) out[k] = p.get(k); });
    return out;
  }

  /* ── Route table ───────────────────────────────────────────────────────
     window.MAZE_ROUTES is emitted by the build from patches/shim/routes/*.json,
     the same file it generates the folders from — one source, so a folder can
     never exist without a way to reach it or vice versa. */
  function routes() {
    return (root.MAZE_ROUTES && root.MAZE_ROUTES.routes) || [];
  }

  /* Which screen folder is this document sitting in? The last path segment IS
     the slug — /hs-approval-queue/applications-registered/ → that route — and
     the prototype's own index.html matches nothing, which is correct: it is not
     a screen folder. */
  function currentRoute() {
    var parts = root.location.pathname.split('/').filter(Boolean);
    var slug = parts.length ? parts[parts.length - 1] : '';
    var found = null;
    routes().forEach(function (r) { if (r.slug === slug) found = r; });
    return found;
  }

  /* Best match wins: the route agreeing on the most params, so
     {screen:de, seg:active} beats a bare {screen:de}. A route whose params
     CONTRADICT the live state is not a candidate at all. */
  function routeFor(params) {
    var best = null, bestScore = -1;
    var all = routes();

    /* A MODAL OUTRANKS THE SCREEN BEHIND IT. With a modal open, the screen
       params still describe the page underneath, so a screen route would score
       higher on raw key count and win — the modal would never get its own
       address. When a modal is named, only routes declaring that modal are
       candidates. */
    if (params.modal) {
      var modalRoutes = all.filter(function (r) { return r.params && r.params.modal === params.modal; });
      if (modalRoutes.length) all = modalRoutes;
      else log('no route for modal "' + params.modal + '" — falling back to the screen behind it');
    }

    all.forEach(function (r) {
      var score = 0;
      for (var k in r.params) {
        if (String(params[k]) !== String(r.params[k])) return;   // contradiction
        score++;
      }
      if (score > bestScore) { bestScore = score; best = r; }
    });
    return best;
  }

  /* Params a route already encodes in its folder must NOT be repeated in the
     query string — the URL would carry the same fact twice and drift the moment
     one of them changed. Everything else (app, journey, state) stays. */
  function payloadFor(params, route) {
    var out = {};
    Object.keys(params).forEach(function (k) {
      if (route && k in route.params) return;
      var v = params[k];
      if (v !== null && v !== undefined && v !== '') out[k] = v;
    });
    return out;
  }

  function buildUrl(params) {
    var u = new URL(root.location.href);
    OWNED.forEach(function (k) { u.searchParams.delete(k); });
    Object.keys(params).forEach(function (k) {
      var v = params[k];
      if (v !== null && v !== undefined && v !== '') u.searchParams.set(k, v);
    });
    return u;
  }

  function writeUrl(params, push) {
    var u = buildUrl(params);
    if (u.href === root.location.href) return;
    history[push ? 'pushState' : 'replaceState']({ maze: params }, '', u.href);
  }

  /* ── Hard navigation (?nav=load) ────────────────────────────────────────
     WHAT MAZE ACTUALLY RECORDS, established by four control rounds against the
     live Pages site (build.sh generated them under /pathtest1..4/):

       link,   PATH change                     RECORDS
       button + 300ms delay, PATH change       RECORDS
       button, immediate,    PATH change       does NOT record
       link,   QUERY-only change               does NOT record
       button + 300ms delay, QUERY-only        does NOT record
       instant screen redraw then QUERY-only   does NOT record
       instant screen redraw then PATH change  RECORDS

     Two requirements, both necessary, neither sufficient alone:
       1. the PATH must change — a query-string change records nothing, whatever
          Maze's own documentation says about parameters counting as steps;
       2. the navigation must not fire in the same tick as the click, or the
          document unloads before the snippet flushes it.

     Hence: one folder per screen (route table above, folders stamped by the
     build) and a 300ms delay. 300 is the value that was actually tested — do not
     trim it to feel snappier without re-running a control, because the failure
     is silent and does not surface until someone tries to define a success path.

     ?nav=load is what turns this on, opt-in PER TASK via the start URL, because
     every step becomes a real page load and a reload throws away everything the
     prototype holds in memory. Harmless for a task that only moves between
     screens; destructive for one that accumulates state across screens (the
     invite wizard's selections, a bulk-approve row selection, an approval not
     re-derived from a fixture). Those need their state carried in the URL first.
     With nav=load off, navigation stays a pushState and records nothing — which
     is correct for a task not yet ready to be path-measured.

     `nav` is deliberately NOT in OWNED: unowned params are preserved verbatim on
     every write, so it survives the reload it causes without extra plumbing.

     Machine-driven writes (boot restore, popstate, config eviction) still go
     through writeUrl/replaceState and never reload — reloading there would loop. */
  var hardNav = false;
  var navigating = false;

  /* ?cloak=off — author paths without the loading cover.
     The cover is up for the whole navigation delay on the page being left, plus
     the first frames of the destination. That is roughly the window Maze uses to
     capture a step's thumbnail while a path is being created, so some steps come
     back as blank screenshots and others do not, depending on where the capture
     lands. The path still records correctly; only the picture is blank.

     The cover is for PARTICIPANTS — it hides the prototype's default screen
     flashing past before the deep link lands, and the double-render when a step
     is a real page load. Neither matters to whoever is authoring the study, so
     it can simply be switched off for that. Author with ?cloak=off to get real
     thumbnails, and leave it off the participant URLs. */
  var cloakOff = new URLSearchParams(root.location.search).get('cloak') === 'off';
  var prevScreenEl = null;

  /* ── Put the outgoing screen back ──────────────────────────────────────
     A step is a real page load, and the prototype swaps the screen
     synchronously inside the click handler — so between the click and the load
     the OUTGOING page is already showing the DESTINATION. Two problems: the
     participant sees the destination render twice, and Maze captures that page
     while creating a path, so its thumbnail shows the wrong screen.

     Covering it was the first fix, and it traded one problem for another: the
     capture then landed on a blank cover instead. Authoring with the cover off
     is not an option either, because the recorded path has to match the URL
     participants actually use.

     So put the screen back rather than hiding it. This runs in schedule()'s
     microtask, which the browser drains BEFORE it paints, so the swap never
     reaches the glass and the page keeps showing exactly what the participant
     was looking at until the navigation replaces it.

     CLASS SWAP ONLY, deliberately — no re-render. The document is about to be
     thrown away, so anything more is wasted work, and re-rendering could fire
     the very handlers that scheduled this navigation.

     A modal opening does not change .screen.active, so the modal case is a
     no-op here and the modal stays visible, which is correct: that IS the step
     being recorded. */
  function restoreOutgoingScreen() {
    if (!prevScreenEl) return false;
    var now = document.querySelector('.screen.active');
    if (!now || now === prevScreenEl) return false;
    now.classList.remove('active');
    prevScreenEl.classList.add('active');
    return true;
  }

  function raiseCloak() {
    if (cloakOff) return;
    document.documentElement.classList.add('maze-booting');
  }

  /* HOW LONG TO WAIT BETWEEN THE CLICK AND THE NAVIGATION.

     300, and do not lower it without re-testing IN A PROTOTYPE.

     /pathtest5/ measured 200 / 120 / 60 / 0ms hops and every one recorded, so
     this was set to 0. That was wrong, and the way it was wrong is worth
     keeping: the control was a trivial page — click, navigate, nothing in
     between. A prototype renders an entire screen between the two, and at 0 the
     bulk-approve step stopped being recorded even though the browser navigated
     correctly and the participant saw the right page.

     So the control measured the wrong thing. It proved a short delay is enough
     when the main thread is idle, which is not the condition that matters. What
     matters is the delay a real click has AFTER the prototype has finished
     re-rendering, and that is not something a blank page can tell you.

     300 is the only value observed working in an actual task. The failure mode
     is SILENT — the page navigates, the participant sees the right screen, and
     only the recorded path is missing a step — so this errs high deliberately.

     ?navdelay=N overrides it for testing, so a value can be tried against a real
     task without a rebuild. Test in Maze's path creator, not by eye: by eye
     every value looks identical. */
  var NAV_DELAY_MS = (function () {
    var v = parseInt(new URLSearchParams(root.location.search).get('navdelay'), 10);
    return (isFinite(v) && v >= 0 && v <= 5000) ? v : 300;
  })();

  function navigate(params) {
    if (!hardNav) {
      var u = buildUrl(params);
      if (u.href === root.location.href) return;
      history.pushState({ maze: params }, '', u.href);
      return;
    }

    var route = routeFor(params);
    if (!route) {
      /* No folder for this state. Fall back to a same-document write rather than
         navigating somewhere that does not exist — a missing route costs one
         unrecorded step; a bad location.assign costs the whole session. */
      log('no route for ' + JSON.stringify(params) + ' — staying put');
      writeUrl(params, true);
      return;
    }

    /* ALREADY IN THE RIGHT FOLDER → never navigate. Compare the SLUG, not the
       full href: the href also carries payload and dev params, so an href
       comparison reports "different" for a state that is on the correct screen
       and reloads it. That is a redirect loop, and it is not self-limiting —
       each reload re-derives the same mismatch. Only a folder change is a step;
       a payload change on the same screen is a same-document write. */
    var here = currentRoute();
    if (here && here.slug === route.slug) {
      writeUrl(payloadFor(params, route), true);
      return;
    }

    /* Screen folders are siblings, and every one of them carries <base href="../">
       pointing at the prototype root, so a bare slug resolves correctly from any
       of them AND from the prototype's own index.html. */
    var target = new URL(route.slug + '/', document.baseURI);
    var payload = payloadFor(params, route);
    Object.keys(payload).forEach(function (k) { target.searchParams.set(k, payload[k]); });
    /* Carry the unowned params forward: nav=load itself, ?net=, anything Maze
       appends. Without this the second step would silently drop out of hard-nav
       mode and stop recording. */
    new URLSearchParams(root.location.search).forEach(function (v, k) {
      if (OWNED.indexOf(k) === -1) target.searchParams.set(k, v);
    });

    /* Snapshot mutations before leaving. Minted here rather than at boot so a
       task that never mutates anything never grows a token, and a start URL
       stays clean enough to paste into a Maze mission. */
    if (desc && typeof desc.snapshot === 'function') {
      var token = sessionToken() || mintToken();
      target.searchParams.set(SESSION_PARAM, token);
      saveState(token);
    }

    if (target.href === root.location.href) return;   // no step; would loop
    navigating = true;                                // suppress writes mid-unload

    /* ── Hide the intermediate render ──────────────────────────────────
       Without this the participant sees the destination TWICE: the prototype
       swaps the screen synchronously inside the click handler, then 300ms later
       the real document load paints the same screen again. It reads as the page
       glitching, which is exactly the kind of thing that gets reported as a
       broken prototype rather than as a study artifact.

       This runs in schedule()'s microtask, which the browser drains BEFORE it
       paints — so the swapped-in screen never reaches the glass. The
       participant sees the screen they were on, then the loading cloak, then
       the destination. One transition.

       The cloak is the same one the destination raises before its own first
       paint (inline <head> script), so the white is CONTINUOUS across the
       navigation rather than flashing off and on at the document boundary.

       Failsafe, as everywhere else the cloak is used: if the navigation never
       happens, uncover rather than leave the participant on a blank page. */
    /* Cover only if the screen could not be put back — a blank page is better
       than the destination rendering twice, but it is the fallback, not the
       plan. */
    if (!restoreOutgoingScreen()) raiseCloak();
    root.setTimeout(function () {
      if (root.location.href !== target.href) {
        log('navigation to ' + target.href + ' did not happen — uncovering');
        document.documentElement.classList.remove('maze-booting');
      }
    }, NAV_DELAY_MS + 3000);

    /* At 0 the assign is synchronous — the same shape /pathtest5/ tested and the
       browser recorded. Going through setTimeout(…, 0) instead would defer to
       the next task, which can land after a paint and reintroduce the flicker
       the cloak above exists to prevent. */
    if (NAV_DELAY_MS > 0) {
      root.setTimeout(function () { root.location.assign(target.href); }, NAV_DELAY_MS);
    } else {
      root.location.assign(target.href);
    }
  }

  /* ── Current state ─────────────────────────────────────────────────── */

  /* Generic across all four prototypes: every screen is
     <div class="screen" id="screen-NAME">, made visible by adding .active. */
  function currentScreen() {
    var el = document.querySelector('.screen.active');
    if (!el || !el.id) return null;
    return el.id.indexOf('screen-') === 0 ? el.id.slice(7) : el.id;
  }

  /* Write-only params: applied on the way in, unreadable on the way out.
     learner-application's `journey` and `state` set IIFE-scoped variables with no
     getter. Without remembering them, the next navigation would drop them from
     the URL — and a participant who reloaded, or a Maze recording replayed later,
     would land in a different state than the task started in. */
  var sticky = {};

  function collect() {
    var params = { screen: currentScreen() };
    Object.keys(sticky).forEach(function (k) { params[k] = sticky[k]; });
    if (desc && typeof desc.observe === 'function') {
      var extra;
      try { extra = desc.observe() || {}; }
      catch (e) { log('observe() threw: ' + e.message); extra = {}; }
      Object.keys(extra).forEach(function (k) {
        if (OWNED.indexOf(k) === -1) { log('observe() returned unowned key "' + k + '" — ignored'); return; }
        params[k] = extra[k];
      });
    }
    return params;
  }

  /* Debounced so a showScreen()+switchSegment() pair produces ONE history entry
     rather than two. Fires on the next microtask. */
  function schedule() {
    if (pending || !booted || navigating) return;
    pending = true;
    Promise.resolve().then(function () {
      pending = false;
      if (applying || navigating) return;   // machine-driven; apply() writes its own
      navigate(collect());
    });
  }

  /* ── Function wrapping ─────────────────────────────────────────────── */

  function wrapFn(name) {
    var orig = root[name];
    if (typeof orig !== 'function') { log('cannot wrap missing function "' + name + '"'); return; }
    if (orig.__mazeWrapped) return;
    var wrapped = function () {
      /* Remembered BEFORE the call so a hard navigation can put it back — see
         restoreOutgoingScreen(). */
      var before = document.querySelector('.screen.active');
      var r = orig.apply(this, arguments);
      if (before) prevScreenEl = before;
      schedule();
      return r;
    };
    wrapped.__mazeWrapped = true;
    wrapped.__mazeOrig = orig;
    root[name] = wrapped;
  }

  /* ── Applying URL state ────────────────────────────────────────────── */

  function screenAllowed(id) {
    if (!desc || !desc.screens) return true;
    return desc.screens.indexOf(id) !== -1;
  }

  function apply(params) {
    applying = true;
    (desc && desc.writeOnly || []).forEach(function (k) {
      if (params[k]) sticky[k] = params[k];
    });
    try {
      /* Validate the screen BEFORE handing it to the prototype. learner-application
         and parent-consent both fall back to a bare getElementById() with no class
         check, so an unknown id strips .active from every screen and adds it to
         whatever element matched — a silent blank white page, no console error. */
      if (params.screen && !screenAllowed(params.screen)) {
        log('screen "' + params.screen + '" not in allowlist — falling back to "' + desc.defaultScreen + '"');
        params = { screen: desc.defaultScreen };
      }
      if (desc && typeof desc.apply === 'function') desc.apply(params);
      else if (params.screen && typeof root.showScreen === 'function') root.showScreen(params.screen);
    } catch (e) {
      log('apply() failed: ' + e.message + ' — falling back to "' + desc.defaultScreen + '"');
      try { root.showScreen(desc.defaultScreen); } catch (e2) { /* nothing left to do */ }
    } finally {
      applying = false;
    }

    /* Verify we landed where we were asked to. applyExchangeModel() and
       applyRecordVisibility() both re-render at boot and can silently override a
       deep link (evicting off screen-invites, forcing the review shell, resetting
       the segment). A warning here is the difference between a 5-minute fix and
       an afternoon. */
    var got = collect();
    Object.keys(params).forEach(function (k) {
      /* Only verify keys observe() can actually report. Some params are
         write-only by necessity — learner-application's `journey` sets
         IIFE-scoped variables that cannot be read back out, so comparing it
         would warn on every single navigation. */
      if (!(k in got) || got[k] === undefined) return;
      if (params[k] && String(got[k]) !== String(params[k])) {
        log('requested ' + k + '="' + params[k] + '" but landed on "' + got[k] + '"');
      }
    });
    /* replaceState — boot restore is not user intent.

       In folder mode, write ONLY the payload. The folder already states the
       screen, and repeating it in the query string is not merely redundant: the
       next navigation compares its target against this URL, sees /workspace/
       against /workspace/?screen=dashboard, calls them different and reloads —
       which re-derives the same mismatch on the next document. That is the
       redirect loop. The folder is the single statement of which screen this is. */
    var route = hardNav ? currentRoute() : null;
    writeUrl(route ? payloadFor(got, route) : got, false);
  }

  /* ── Dev drawer: hidden unless Cmd/Ctrl+D ──────────────────────────── */

  /* ── Carrying state across the page load ───────────────────────────────
     Every step is now a real document load, which discards everything the
     prototype held in memory. Free for a task that only moves between screens;
     destructive for one that accumulates state — an approval that moved records
     between buckets, a wizard's selections, a multi-select before a bulk action.

     TWO DIFFERENT PROBLEMS, deliberately solved differently:

       SELECTIONS  → the URL. Which rows, which learners, which course. They are
                     small, they are what the next screen renders from, and
                     putting them in the query string means a step is
                     reproducible from its address alone. Handled by the payload
                     params, not here.

       MUTATIONS   → here. An approval rewrites activeApps / WAITING_APPS /
                     ALL_DENIED_APPS. There is no sensible URL for "these three
                     records moved bucket", and if it does not survive the load
                     the participant approves three applications, returns to the
                     queue, and finds them still sitting there. That reads as the
                     approval having failed.

     A descriptor opts in by defining snapshot() and restore(). Prototypes that
     never mutate anything (parent-consent) define neither and pay nothing.

     SCOPED BY A SESSION TOKEN, not just by prototype. Maze runs tasks in one
     tab, so sessionStorage persists across them — without a token, task 7 would
     open onto task 4's approvals and the queue would be wrong in a way nobody
     would think to check. A task start URL carries no token, so it always begins
     clean; the shim mints one on the first navigation and carries it forward
     like any other unowned param. */
  var SESSION_PARAM = 's';

  function sessionToken() {
    return new URLSearchParams(root.location.search).get(SESSION_PARAM) || '';
  }

  function mintToken() {
    return Math.random().toString(36).slice(2, 10);
  }

  function stateKey(token) {
    return 'maze-state:' + ((desc && desc.proto) || 'x') + ':' + token;
  }

  function saveState(token) {
    if (!desc || typeof desc.snapshot !== 'function' || !token) return;
    var data;
    try { data = desc.snapshot(); }
    catch (e) { log('snapshot() threw: ' + e.message); return; }
    if (!data) return;
    try { root.sessionStorage.setItem(stateKey(token), JSON.stringify(data)); }
    catch (e) { log('could not store state: ' + e.message); }   // quota, private mode
  }

  function loadState() {
    if (!desc || typeof desc.restore !== 'function') return;
    var token = sessionToken();
    if (!token) return;            // fresh task start — nothing to restore, by design
    var raw;
    try { raw = root.sessionStorage.getItem(stateKey(token)); }
    catch (e) { return; }
    if (!raw) return;
    try { desc.restore(JSON.parse(raw)); }
    catch (e) {
      log('restore() failed: ' + e.message + ' — continuing with fixture defaults');
    }
  }

  /* ── <base> guard ──────────────────────────────────────────────────────
     Screen folders carry <base href="../"> so one copy of a prototype can sit a
     directory deeper and still find its stylesheets. The side effect: href="#"
     no longer means "this page". It resolves against the BASE, so every
     placeholder anchor in the prototype — menu toggles, "Set Your Preferences",
     anything that is a link only for the cursor — becomes a live navigation to
     the prototype root. Most call return false and are fine; the ones that do
     not would silently throw the participant out of the screen folder.

     Cancelling the default for empty-fragment anchors costs nothing (they were
     never meant to navigate) and removes the whole class of failure. Capture
     phase, so it runs before the page's own handlers. */
  function installBaseGuard() {
    document.addEventListener('click', function (e) {
      var a = e.target && e.target.closest && e.target.closest('a[href]');
      if (!a) return;
      var href = a.getAttribute('href');
      if (href === '#' || href === '') e.preventDefault();
    }, true);
  }

  function installDevHotkey() {
    document.addEventListener('keydown', function (e) {
      if (!(e.metaKey || e.ctrlKey)) return;
      if (e.key !== 'd' && e.key !== 'D') return;
      e.preventDefault();          // Cmd/Ctrl+D is the browser bookmark shortcut
      e.stopPropagation();
      document.documentElement.classList.toggle('maze-dev');
    }, true);                      // capture, so we beat the page's own handlers
  }

  /* ── Boot cloak ────────────────────────────────────────────────────── */

  /* html.maze-booting is set by an inline <head> script (inject-tags.py) and
     hides the page until the deep link has landed, so participants never see
     the prototype's own default screen flash past.

     uncloak() is idempotent and runs from two places on purpose: the happy path
     (end of start(), after apply()) and an unconditional timer. If apply() ever
     threw before the happy-path call, a cloak with no failsafe would leave the
     participant on a permanently blank page — strictly worse than the flash it
     exists to prevent. Fail open, always. */
  var uncloaked = false;
  function uncloak() {
    if (uncloaked) return;
    uncloaked = true;
    document.documentElement.classList.remove('maze-booting');
  }
  setTimeout(function () {
    if (!uncloaked) log('boot cloak failsafe fired — apply() did not complete');
    uncloak();
  }, 4000);

  /* ── Boot ──────────────────────────────────────────────────────────── */

  function start() {
    /* 50ms after 'load'. boot.js's initial render calls applyExchangeModel(),
       and completeSignIn() routes on a 650ms timer — we must land after the
       first, and the debounced writer handles the second. */
    setTimeout(function () {
      (desc.wrap || []).forEach(wrapFn);

      /* BEFORE apply(). apply() re-renders from whatever the buckets hold, so
         restoring after it would paint the fixture defaults first and only then
         the participant's actual queue — a visible flicker of work they had
         already done being undone. */
      loadState();

      var params = readParams();
      if (!params.screen && desc.defaultScreen) params.screen = desc.defaultScreen;
      apply(params);

      /* AFTER apply(), not before. schedule() is called synchronously by every
         wrapped function apply() invokes, and its microtask runs once apply()
         has returned — by which time `applying` is already false, so the guard
         there does not catch it. With `booted` set first, the boot render itself
         scheduled a navigation: in folder mode that is a location.assign on page
         load, i.e. a reload loop before the participant touches anything. */
      booted = true;

      root.addEventListener('popstate', function () {
        var p = readParams();
        if (!p.screen && desc.defaultScreen) p.screen = desc.defaultScreen;
        apply(p);
      });

      if (typeof desc.after === 'function') {
        /* Re-run the descriptor's post-navigation hook on every screen change
           (form prepopulation, click-to-fill suppression). */
        var origShow = root.showScreen;
        root.showScreen = function () {
          var r = origShow.apply(this, arguments);
          try { desc.after(currentScreen()); } catch (e) { log('after() threw: ' + e.message); }
          return r;
        };
        root.showScreen.__mazeWrapped = true;
        try { desc.after(currentScreen()); } catch (e) { log('after() threw: ' + e.message); }
      }

      /* Reveal only now: after apply() has landed the deep link AND after the
         first desc.after() has prepopulated forms. Uncloaking any earlier would
         show a half-filled application for one frame. requestAnimationFrame lets
         that render settle before the page becomes visible. */
      if (root.requestAnimationFrame) root.requestAnimationFrame(uncloak);
      else uncloak();
    }, 50);
  }

  root.MazeShim = {
    init: function (descriptor) {
      desc = descriptor;
      /* Drop the cover the inline <head> script raised, before boot rather than
         after — with ?cloak=off there is nothing to hide behind. */
      if (cloakOff) document.documentElement.classList.remove('maze-booting');
      hardNav = new URLSearchParams(root.location.search).get('nav') === 'load';
      installBaseGuard();
      installDevHotkey();
      if (document.readyState === 'complete') start();
      else root.addEventListener('load', start);
    },

    /* Programmatic navigate + URL write. Used by cross-persona handoffs. */
    go: function (screenId, extras) {
      if (!screenAllowed(screenId)) { log('go(): "' + screenId + '" not allowed'); return; }
      var p = extras || {};
      p.screen = screenId;
      apply(p);
    },

    /* Build a cross-prototype URL, carrying ?net= (and any other unowned param)
       forward. Assign this to location.href: same tab, full page load. Opening a
       new tab would break the single-tab Maze session (build.sh asserts none). */
    url: function (proto, params) {
      /* Resolved against document.baseURI, NOT location.href. Inside a screen
         folder those differ by one level: <base href="../"> pins baseURI to the
         prototype root, so '../<proto>/' is right from a screen folder and from
         the prototype's own index.html alike. Using location.href would land one
         directory too deep from every screen folder. */
      var u = new URL('../' + proto + '/index.html', document.baseURI);
      var cur = new URLSearchParams(root.location.search);
      cur.forEach(function (v, k) { if (OWNED.indexOf(k) === -1) u.searchParams.set(k, v); });
      Object.keys(params || {}).forEach(function (k) {
        if (params[k] !== null && params[k] !== undefined && params[k] !== '') u.searchParams.set(k, params[k]);
      });
      return u.href;
    },

    state: collect,
    isApplying: function () { return applying; }
  };
})(window);
