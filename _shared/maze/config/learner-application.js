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

  /* ── Existing-account branch ────────────────────────────────────────────
     Study decision: Jessica already has a Parchment account, so the whole
     "create your account" chain is out. The invite email goes straight to a
     prefilled sign-in screen:

         email-landing → login → de-app          (was)
         email-landing → email-entry → login | aer → confirm-email → de-app

     submitEmailEntry() checked the typed address against KNOWN_ACCOUNTS —
     jcumberland@pioneerhs.edu got sign-in, ANY other address got account
     creation. The task copy tells participants to use dummy details, so nearly
     all of them took the long branch, and the same task produced two different
     routes.

     Two things are patched, deliberately belt-and-braces:
       1. Every route INTO email-entry is repointed at login (below).
       2. email-entry itself is left prefilled and forced to sign-in, so if any
          route we missed still lands there, it is a one-click pass-through
          rather than a dead end. It stays in the screens allowlist for the
          same reason.                                                        */
  var forcedSignIn = false;

  /* Fill sign-in before showing it, so the screen is never briefly empty. */
  function goToSignIn() {
    var le = document.getElementById('login-email');
    if (le && !le.value) le.value = 'jcumberland@pioneerhs.edu';
    window.showScreen('login');
  }

  /* The invite email's "Accept Invite" button carries an inline
     onclick="showScreen('email-entry')". Repoint the element rather than
     wrapping showScreen: the shim, the after() hook and the prototype already
     form a wrapper chain around it, and inserting another link that redirects
     mid-chain would make the recorded URL depend on wrapper order. */
  function repointInviteCta() {
    var cta = document.querySelector('#screen-email-landing .email-notif-cta');
    if (!cta || cta.__mazeRepointed) return;
    cta.__mazeRepointed = true;
    cta.onclick = goToSignIn;
  }

  function forceSignInBranch() {
    if (forcedSignIn || typeof window.submitEmailEntry !== 'function') return;
    forcedSignIn = true;
    window.submitEmailEntry = function () {
      var form = document.getElementById('email-entry-form');
      if (form && typeof window.validateForm === 'function' && !window.validateForm(form)) return;
      var input = document.getElementById('email-entry-input');
      var login = document.getElementById('login-email');
      if (login && input) login.value = input.value;
      window.showScreen('login');
    };
  }

  function prepareEmailEntry() {
    var input = document.getElementById('email-entry-input');
    if (input && !input.value) {
      input.value = 'jcumberland@pioneerhs.edu';
      if (window.validateField) {
        var f = input.closest('.tasty-field'); if (f) window.validateField(f);
      }
    }
    /* The "Demo" hint offers a second address that lands on account creation —
       a signpost to a branch this build no longer has. */
    var hint = document.querySelector('#screen-email-entry .eml-demo');
    if (hint) hint.style.display = 'none';
    /* "Create your account for dual enrollment" is now wrong: the account exists
       and Continue goes to sign-in. */
    var title = document.querySelector('#screen-email-entry .aer-hero__title');
    if (title) title.textContent = 'Continue to your dual enrollment application';
    forceSignInBranch();
  }

  function prepopulate(screen) {
    /* The college-website path's Apply CTA feeds the same chain. Patched on every
       navigation rather than on its own screen, so it is already redirected
       whichever screen the participant reaches it from. */
    if (typeof window.startCollegeApply === 'function' && !window.startCollegeApply.__mazePatched) {
      window.startCollegeApply = goToSignIn;
      window.startCollegeApply.__mazePatched = true;
    }
    if (screen === 'email-landing') repointInviteCta();
    if (screen === 'email-entry') prepareEmailEntry();
    if (screen === 'login') {
      /* Password already ships with a value; carry the email across for anyone
         who deep-links straight to sign-in. */
      var le = document.getElementById('login-email');
      if (le && !le.value) le.value = 'jcumberland@pioneerhs.edu';
    }
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

  /* ── Which course is being registered ──────────────────────────────────
     `currentCourse` is IIFE-scoped with no getter, like everything else in this
     prototype, so it cannot be read back out. But viewCourse(id) IS exposed and
     is the only way onto the detail screen — so wrapping it records the id on
     the way past, which is enough.

     Without this, the participant picks a course, the page loads, and the
     detail screen has no course: registerCourses() falls back to the canonical
     MATH1D regardless of what they chose. That fallback exists for deep links
     and the dev drawer, and it would have quietly made every participant look
     like they picked the same course.

     Wrapped at parse time so the shim's own wrapper goes on the outside and
     still sees the navigation. */
  var lastCourse = null;

  (function captureCourse() {
    if (typeof window.viewCourse !== 'function' || window.viewCourse.__mazeCourse) return;
    var orig = window.viewCourse;
    window.viewCourse = function (id) {
      lastCourse = id;
      return orig.apply(this, arguments);
    };
    window.viewCourse.__mazeCourse = true;
  })();

  MazeShim.init({
    proto: 'learner-application',
    defaultScreen: 'dashboard',

    screens: [
      'path-select', 'dashboard', 'de-tab', 'entry', 'select-hs', 'select-college',
      'college-site', 'email-landing', 'email-entry', 'login', 'aer',
      'confirm-email', 'de-app', 'aer-confirm', 'courses', 'course-detail', 'registered'
    ],

    wrap: ['showScreen', 'startEntry', 'startCollegeSite', 'goToApplication',
           'startApplicationFlow', 'completeSignIn', 'viewCourse'],

    /* Both are honoured on the way in and unreadable on the way out: `journey`
       sets entryOrigin/inviteFlow and `state` sets DEV.appState, all of which are
       IIFE-scoped with no getter. The shim remembers them so they survive
       subsequent navigations instead of silently dropping out of the URL. */
    writeOnly: ['journey', 'state'],

    observe: function () {
      /* Only meaningful on the two screens that depend on a chosen course.
         Reporting it everywhere would append ?course= to every URL in the
         learner flow for no benefit. */
      var el = document.querySelector('.screen.active');
      var id = el && el.id;
      var onCourse = id === 'screen-course-detail' || id === 'screen-registered';
      return { course: onCourse ? lastCourse : null };
    },

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

      /* Restore the chosen course before landing on a screen that renders from
         it. viewCourse() sets currentCourse, renders the detail and navigates,
         so it does the whole job — no separate showScreen call for this case. */
      if (p.course && typeof window.viewCourse === 'function') {
        lastCourse = p.course;
        if (p.screen === 'course-detail') { window.viewCourse(p.course); return; }
        window.viewCourse(p.course);   /* sets currentCourse for 'registered' */
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
