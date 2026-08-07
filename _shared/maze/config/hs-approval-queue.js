/* maze-shim descriptor — hs-approval-queue (HS admin: Morgan Lee, Pioneer HS).
   Loads after maze-shim.js and after every prototype script. */
(function () {
  'use strict';

  /* Only these four are queue segments. "Invited" is its own screen
     (#screen-invites) on the HS fork, not a segment. The ae-seg-panel-* ids
     belong to the Grades concept and must never be confused with these. */
  var SEGS = ['needs-review', 'waiting', 'active', 'denied'];

  function activeSeg() {
    var panels = document.querySelectorAll('.seg-panel.active');
    for (var i = 0; i < panels.length; i++) {
      var id = panels[i].id || '';
      if (id.indexOf('seg-panel-') === 0) return id.slice('seg-panel-'.length);
    }
    return null;
  }

  function knownApp(id) {
    if (!id) return false;
    try { return !!(window.findAppAnywhere && window.findAppAnywhere(id)); }
    catch (e) { return false; }
  }

  /* ── ?chapter= — put Jessica where her story is, for this task ──────────
     The study follows ONE applicant end to end: Jessica Cumberland,
     DE-2026-0440, the learner in learner-application and the student in
     parent-consent. A task that approves somebody else breaks the thread the
     whole study is built on — the participant has just spent two tasks as
     Jessica and her family, and is then asked to act on a stranger.

     But she cannot sit in two buckets at once. Task 4 needs her awaiting HS
     approval; task 7 asks an admin to confirm she reached Registered, so there
     she must already be Registered. The fixture cannot satisfy both.

     It does not have to. Every task is a fresh page load with its own clean
     state, so the fixture can open at the chapter that task is in:

       (no param)            she is Registered — the authored fixture, task 7
       ?chapter=hs-approval  she is in Needs Review, awaiting this admin

     Note what this is NOT: task 4 does not "cause" her to be approved for task
     7. Nothing carries between tasks, deliberately — a task that depended on the
     previous one's outcome would break the moment a participant picked a
     different student, or did the tasks out of order, or dropped out halfway.
     Each task opens at the right page of the same story.

     Runs at PARSE time, before boot.js paints anything. core.js has already
     taken activeApps = ALL_APPS.slice() by now, so both have to be updated —
     mutating only the fixture would seed a queue nothing renders from. */
  var JESSICA = 'DE-2026-0440';

  function seedChapter() {
    var chapter = new URLSearchParams(location.search).get('chapter');
    if (chapter !== 'hs-approval') return;
    try {
      /* Out of Registered, or she appears twice — once as a pending applicant
         and once as an enrolled student, which is exactly the kind of detail a
         DE coordinator notices immediately. */
      var i = ALL_ACTIVE_APPS.findIndex(function (a) { return a.id === JESSICA; });
      var enrolled = i !== -1 ? ALL_ACTIVE_APPS.splice(i, 1)[0] : null;
      if (ALL_APPS.some(function (a) { return a.id === JESSICA; })) return;

      /* A pending row is a different shape from an enrolled one: submitted date
         and eligibility evidence rather than enrolment status and credits. Built
         from her enrolled row so name, school, group, term and institution stay
         identical to what the participant saw in the earlier tasks. */
      var pending = {
        id: JESSICA,
        lastName: 'Cumberland', firstName: 'Jessica', initials: 'JC',
        school: (enrolled && enrolled.school) || 'Pioneer High School',
        group: (enrolled && enrolled.group) || 'Math - Dual Enrollment Fall 2026',
        term: (enrolled && enrolled.term) || 'FALL 2026',
        course: null,                       /* dropped from the table, still searchable */
        submitted: 'Jul 28, 2026',          /* after the other pending rows: she just applied */
        gradDate: 'May 2028',               /* a junior in 2026 graduates in 2028 */
        counselor: 'Morgan Lee',
        hasAlert: false,
        gpa: 3.8, grade: 11, prereqMet: true, transcriptAttached: true,
        sisId: (enrolled && enrolled.sisId) || 'STU-26-1000',
        institution: (enrolled && enrolled.institution) || 'wvcc',
        groupIds: ['wvcc-g1', 'wvcc-g2']
      };
      ALL_APPS.unshift(pending);            /* first row: findable without paging */
      if (typeof activeApps !== 'undefined') activeApps.unshift(pending);
    } catch (e) {
      /* A seeding failure must not take the prototype down with it. The task
         still works, it just opens on the authored fixture. */
      if (window.console) console.warn('[maze-shim] chapter seed failed: ' + e.message);
    }
  }

  /* Task 1 invites her, so she has to be on the roster the invite table renders
     from — and that roster is authored without her, because until this study
     followed one applicant end to end there was no reason for her to be there.

     UNCONDITIONAL, not chapter-gated. The roster is "learners at this school",
     which she is in every chapter; gating it would mean she vanishes from the
     school's own roster the moment she applies. First row so she is findable
     without searching, same as in the queue. */
  function seedRoster() {
    try {
      if (typeof LEARNER_ROSTER === 'undefined') return;
      if (LEARNER_ROSTER.some(function (l) { return l.lastName === 'Cumberland'; })) return;
      LEARNER_ROSTER.unshift({
        id: '20440', lastName: 'Cumberland', firstName: 'Jessica', middleName: 'Anne',
        initials: 'JC', school: 'Pioneer High School', classOf: 2028,
        dob: 'Sep 9, 2009', ssnLast4: '3312', missingData: false
      });
    } catch (e) {
      if (window.console) console.warn('[maze-shim] roster seed failed: ' + e.message);
    }
  }

  seedChapter();
  seedRoster();

  /* ── Mutations that must survive a page load ────────────────────────────
     Approving moves app objects between three arrays: out of `activeApps`
     (Needs Review), into `WAITING_APPS`, and denials into `ALL_DENIED_APPS`.
     Every step is a real document load now, so without this the participant
     approves three applications, lands back on the queue, and finds all three
     still sitting in Needs Review — which reads as the approval having failed.

     These are top-level bindings in the prototype's shared global scope, NOT
     properties of window, so they are reachable by bare name from here but not
     via window.x. Hence the direct references and the try/catch: a missing
     binding must degrade to fixture defaults, never throw during boot.

     `activeApps` is reassigned wholesale by confirmBulkApprove(), so restoring
     it is an assignment. WAITING_APPS and ALL_DENIED_APPS are const arrays
     mutated in place, so they are emptied and refilled instead — reassigning
     them would throw and lose the whole restore. */
  function snapshot() {
    var out = {};
    try { out.active = activeApps; } catch (e) {}
    try { out.waiting = WAITING_APPS; } catch (e) {}
    try { out.denied = ALL_DENIED_APPS; } catch (e) {}
    return out;
  }

  function refill(arr, next) {
    if (!arr || !next) return;
    arr.length = 0;
    next.forEach(function (x) { arr.push(x); });
  }

  function restore(data) {
    if (!data) return;
    if (data.active) { try { activeApps = data.active; } catch (e) {} }
    try { refill(WAITING_APPS, data.waiting); } catch (e) {}
    try { refill(ALL_DENIED_APPS, data.denied); } catch (e) {}
    /* Re-render from the restored buckets. apply() runs after this and will
       navigate to the requested screen, but the tables are painted from module
       state that has just changed underneath them. */
    try { if (typeof renderTable === 'function') renderTable(); } catch (e) {}
    try { if (typeof renderWaitingTable === 'function') renderWaitingTable(); } catch (e) {}
  }

  MazeShim.init({
    proto: 'hs-approval-queue',
    defaultScreen: 'dashboard',
    snapshot: snapshot,
    restore: restore,

    screens: [
      'path-select', 'email', 'login', 'service-select', 'dashboard', 'de',
      'review', 'deny', 'bulk-approve', 'invites', 'invite-learners',
      'invite-college', 'invite-groups', 'add-learners', 'bulk-upload',
      'edit-learner', 'edit-groups', 'active-enrollments'
      /* 'adv-search' is deliberately EXCLUDED: renderAdvancedResults() early-returns
         unless advSearch.active, and it is itself the function that calls
         showScreen('adv-search'). A cold link yields a blank Global Search page. */
    ],

    wrap: ['showScreen', 'switchSegment', 'enterReviewWorkflow',
           'showAllApplications', 'viewApplication'],

    observe: function () {
      var screen = document.querySelector('.screen.active');
      var onDe = screen && screen.id === 'screen-de';
      var id = screen && screen.id;
      /* The bulk screens render from currentActionIds, which showScreen()
         receives as an ARGUMENT and holds only in memory. A page load loses it,
         and the screen then shows an empty selection with a live Approve button
         — worse than an error, because it looks like it worked. */
      var sel = null;
      if (id === 'screen-bulk-approve' || id === 'screen-deny') {
        try {
          if (currentActionIds && currentActionIds.length) sel = currentActionIds.join(',');
        } catch (e) {}
      }
      return {
        seg:  onDe ? activeSeg() : null,
        mode: onDe ? (window.deScreenMode === 'review' ? 'review' : 'all') : null,
        app:  window.currentReviewId || null,
        sel:  sel
      };
    },

    apply: function (p) {
      /* ORDER MATTERS.
         1. mode first — applyDeMode() force-calls switchSegment('needs-review')
            in review mode, so setting the segment before the mode is pointless.
         2. screen next.
         3. seg last, for the same reason. */
      if (p.mode === 'review' && typeof window.enterReviewWorkflow === 'function') {
        window.enterReviewWorkflow();
      } else if (p.mode === 'all' && typeof window.showAllApplications === 'function') {
        window.showAllApplications();
      }

      /* Bulk screens: hand the ids back the way showScreen() expects them, and
         re-tick the checkboxes underneath. Restoring selectedIds matters even
         though the bulk screen does not read it — confirmBulkApprove() deletes
         from it on commit, and the queue behind renders ticks from it, so a
         participant who backs out would find their selection gone. */
      if ((p.screen === 'bulk-approve' || p.screen === 'deny') && p.sel) {
        var ids = p.sel.split(',').filter(Boolean);
        try { ids.forEach(function (id) { selectedIds.add(id); }); } catch (e) {}
        if (p.screen === 'bulk-approve') window.showScreen('bulk-approve', ids);
        else window.showScreen('deny', { ids: ids, from: 'queue' });
        return;
      }

      if (p.screen === 'review' && p.app) {
        /* Prefer viewApplication() over showScreen('review', id): it sets
           __reviewOrigin, which drives the Back button's label and destination.
           A bogus id would otherwise render a broken empty detail with no error. */
        if (!knownApp(p.app)) {
          console.warn('[maze-shim] unknown application "' + p.app + '" — falling back to the queue');
          window.showScreen('de');
        } else if (typeof window.viewApplication === 'function') {
          window.viewApplication(p.app);
        } else {
          window.showScreen('review', p.app);
        }
      } else if (p.screen) {
        window.showScreen(p.screen);
      }

      if (p.seg && SEGS.indexOf(p.seg) !== -1 && typeof window.switchSegment === 'function') {
        var btn = document.getElementById('seg-btn-' + p.seg);
        /* applyExchangeModel() hides segment tabs the current config does not
           support. Landing on an invisible tab is a dead end. */
        if (btn && btn.offsetParent !== null) window.switchSegment(p.seg);
        else console.warn('[maze-shim] segment "' + p.seg + '" is hidden under the current config — staying put');
      }
    }
  });
})();
