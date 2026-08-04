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
  var OWNED = ['screen', 'seg', 'mode', 'app', 'journey', 'state', 'step', 'variant'];

  var desc = null;        // the active prototype descriptor
  var applying = false;   // true while WE are driving; suppresses pushState
  var pending = false;    // debounce flag for the URL write
  var booted = false;

  function log(msg) {
    if (root.console && console.warn) console.warn('[maze-shim] ' + msg);
  }

  /* ── URL read/write ────────────────────────────────────────────────── */

  function readParams() {
    var p = new URLSearchParams(root.location.search), out = {};
    OWNED.forEach(function (k) { if (p.has(k)) out[k] = p.get(k); });
    return out;
  }

  function writeUrl(params, push) {
    var u = new URL(root.location.href);
    OWNED.forEach(function (k) { u.searchParams.delete(k); });
    Object.keys(params).forEach(function (k) {
      var v = params[k];
      if (v !== null && v !== undefined && v !== '') u.searchParams.set(k, v);
    });
    if (u.href === root.location.href) return;
    history[push ? 'pushState' : 'replaceState']({ maze: params }, '', u.href);
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
    if (pending || !booted) return;
    pending = true;
    Promise.resolve().then(function () {
      pending = false;
      if (applying) return;             // machine-driven; apply() writes its own
      writeUrl(collect(), true);
    });
  }

  /* ── Function wrapping ─────────────────────────────────────────────── */

  function wrapFn(name) {
    var orig = root[name];
    if (typeof orig !== 'function') { log('cannot wrap missing function "' + name + '"'); return; }
    if (orig.__mazeWrapped) return;
    var wrapped = function () {
      var r = orig.apply(this, arguments);
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
    writeUrl(got, false);   // replaceState — boot restore is not user intent
  }

  /* ── Dev drawer: hidden unless Cmd/Ctrl+D ──────────────────────────── */

  function installDevHotkey() {
    document.addEventListener('keydown', function (e) {
      if (!(e.metaKey || e.ctrlKey)) return;
      if (e.key !== 'd' && e.key !== 'D') return;
      e.preventDefault();          // Cmd/Ctrl+D is the browser bookmark shortcut
      e.stopPropagation();
      document.documentElement.classList.toggle('maze-dev');
    }, true);                      // capture, so we beat the page's own handlers
  }

  /* ── Boot ──────────────────────────────────────────────────────────── */

  function start() {
    /* 50ms after 'load'. boot.js's initial render calls applyExchangeModel(),
       and completeSignIn() routes on a 650ms timer — we must land after the
       first, and the debounced writer handles the second. */
    setTimeout(function () {
      (desc.wrap || []).forEach(wrapFn);
      booted = true;

      var params = readParams();
      if (!params.screen && desc.defaultScreen) params.screen = desc.defaultScreen;
      apply(params);

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
    }, 50);
  }

  root.MazeShim = {
    init: function (descriptor) {
      desc = descriptor;
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
      var u = new URL('../' + proto + '/index.html', root.location.href);
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
