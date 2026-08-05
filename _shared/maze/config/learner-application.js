/* maze-shim descriptor — learner-application (Jessica Cumberland, Pioneer HS).

   This prototype is the awkward one. Unlike the two queue forks (whose scripts
   dissolved into shared global scope), this file is still IIFE-wrapped, so its
   session variables — entryOrigin, inviteFlow, collegeKnown, selectedCourses —
   are UNREACHABLE from outside. They fork both routing and content, and there
   are no setters on window.__dev.

   Consequence: a URL that names a screen without naming the JOURNEY is not
   restorable here. ?screen=login alone leaves entryOrigin at its default and
   routes the participant somewhere other than the task intended. Always pair
   ?screen= with ?journey=.                                                     */
(function () {
  'use strict';

  /* Verified legal combinations. There is NO open-enrollment/email variant. */
  var JOURNEYS = {
    'open-enrollment/dashboard':   ['open-enrollment', 'dashboard'],
    'invited-college/email':       ['invited-college', 'email'],
    'invited-college/dashboard':   ['invited-college', 'dashboard'],
    'invited-counselor/email':     ['invited-counselor', 'email'],
    'invited-counselor/dashboard': ['invited-counselor', 'dashboard']
    /* 'college-site' is handled separately — it has its own entry function. */
  };

  /* ── Prepopulation ──────────────────────────────────────────────────────
     Study decision: the DE application arrives PREPOPULATED and the participant
     reviews and submits, rather than typing it.

     Why: unmoderated, typing an SSN, address, guardian details and a drawn
     signature runs long and drives drop-off, and it measures typing speed rather
     than comprehension. Prepopulating as "what we already have from your account"
     keeps the real decision — do you understand what you are submitting, and do
     you submit it — which is what the task is actually about.

     Why not the demo's click-to-fill: it requires the participant to discover
     that clicking the form fills it, which is a leading cue and an artifact of a
     presenter demo. We fill it outright and neutralise the click affordance.   */
  var filled = {};

  /* The fill helpers call showScreen() themselves, which re-enters after() →
     prepopulate(). The guard therefore has to be set BEFORE the call, not after,
     or the first invocation recurses until the stack blows. */
  function fillOnce(key, fn) {
    if (filled[key]) return;
    filled[key] = true;
    if (typeof fn === 'function') fn();
  }

  function prepopulate(screen) {
    if (screen === 'de-app') {
      fillOnce('de-app', window.devFillDeApp);
      /* setAxis() does not re-run the gate pass; only setGate() does. Without
         this, a form reached by deep link shows sections the pinned config
         should have hidden. */
      if (typeof window.applyNetworkGatesToForm === 'function') window.applyNetworkGatesToForm();
    }
    if (screen === 'aer') {
      fillOnce('aer', window.devFillAccountForm);
    }
  }

  /* Kill the click-to-fill affordance. enableClickFill() re-attaches on every
     showScreen, so this runs after every navigation. We cannot call the
     module-scoped disableClickFill(), so we defang the handler's target instead:
     the listener stays bound but calls a no-op, and the hover hint class goes. */
  function killClickFill() {
    ['aer-form', 'de-app-form'].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.classList.remove('demo-fill-soft');
    });
  }

  MazeShim.init({
    proto: 'learner-application',
    defaultScreen: 'dashboard',

    screens: [
      'path-select', 'dashboard', 'de-tab', 'entry', 'select-hs', 'select-college',
      'college-site', 'email-landing', 'email-entry', 'login', 'aer',
      'confirm-email', 'de-app', 'aer-confirm', 'courses', 'course-detail', 'registered'
    ],

    wrap: ['showScreen', 'startEntry', 'startCollegeSite', 'goToApplication',
           'startApplicationFlow', 'completeSignIn'],

    /* Both are honoured on the way in and unreadable on the way out: `journey`
       sets entryOrigin/inviteFlow and `state` sets DEV.appState, all of which are
       IIFE-scoped with no getter. The shim remembers them so they survive
       subsequent navigations instead of silently dropping out of the URL. */
    writeOnly: ['journey', 'state'],

    observe: function () { return {}; },

    apply: function (p) {
      /* ORDER: journey → state → screen. Journey sets entryOrigin/inviteFlow and
         itself navigates; state re-renders the dashboard and DE tab; only then is
         it safe to land on the requested screen. */
      if (p.journey === 'college-site' && typeof window.startCollegeSite === 'function') {
        window.startCollegeSite();
      } else if (p.journey && JOURNEYS[p.journey] && typeof window.startEntry === 'function') {
        var j = JOURNEYS[p.journey];
        window.startEntry(j[0], j[1]);
      } else if (p.journey) {
        console.warn('[maze-shim] unknown journey "' + p.journey + '" — ignored');
      }

      if (p.state && window.__dev && typeof window.__dev.setAxis === 'function') {
        window.__dev.setAxis('appState', p.state);
      }

      if (p.screen) {
        /* Prefer the semantic entry points over raw showScreen: 'entry' has no
           showScreen hook at all and would skip renderEntryScreen entirely. */
        if (p.screen === 'de-app' && typeof window.goToApplication === 'function') {
          window.goToApplication();
        } else if (p.screen === 'entry' && typeof window.startApplicationFlow === 'function') {
          window.startApplicationFlow();
        } else {
          window.showScreen(p.screen);
        }
      }
    },

    /* Runs after every navigation, including the ones the participant drives. */
    after: function (screen) {
      prepopulate(screen);
      killClickFill();
    }
  });
})();
