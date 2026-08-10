/* maze-shim descriptor — hs-approval-queue (HS admin: Morgan Lee, Pioneer HS).
   Loads after maze-shim.js and after every prototype script. */
(function () {
  'use strict';

  /* Only these four are queue segments. "Invited" is its own screen
     (#screen-invites) on the HS fork, not a segment. The ae-seg-panel-* ids
     belong to the Grades concept and must never be confused with these. */
  var SEGS = ['needs-review', 'waiting', 'active', 'denied'];

  /* The four screens of the invite wizard, which share one accumulating
     selection. `screen-invites` (Pending Invites) is NOT one of them — it is
     where the wizard lands after sending, and by then the selection is spent. */
  var INVITE_SCREENS = ['screen-invite-learners', 'screen-invite-college',
                        'screen-invite-groups'];

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

    /* Task 1 invites her, which happens BEFORE she applies — so at that point
       she should not be in the queue at all, in any bucket. The authored
       fixture has her Registered, and an admin being asked to invite a student
       who is already enrolled in the course is a fair thing to be confused by. */
    if (chapter === 'invite') {
      try {
        var j = ALL_ACTIVE_APPS.findIndex(function (a) { return a.id === JESSICA; });
        if (j !== -1) ALL_ACTIVE_APPS.splice(j, 1);
      } catch (e) {
        if (window.console) console.warn('[maze-shim] invite chapter seed failed: ' + e.message);
      }
      return;
    }

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
        /* wvcc-g2 IS 'Math - Dual Enrollment Fall 2026' — her group, and the one
           MATH1D sits in. The screens that show a group read it from groupIds,
           NOT from the `group` string, so seeding both g1 and g2 made the admit
           workflow announce her as English while every other screen said Math. */
        groupIds: ['wvcc-g2']
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

  /* ── One institution in the invite wizard ───────────────────────────────
     The wizard offers three tiles (West Valley CC, ASU, Mesa CC) but the whole
     study runs on one exchange: the college prototype is WVCC-fixed, Jessica's
     course is MATH1D at WVCC, and every fixture application names wvcc. Two
     institutions nobody can reach are a decision the participant has to make
     and then discover was never real.

     The step itself stays. One tile still says "you are inviting these students
     TO an institution", which is the thing worth understanding, and it keeps a
     recorded step in task 1's path. Skipping it outright would remove both.

     Safe to trim: the QUEUE renders institution names from COLLEGES (data-apps),
     not from this map. COLLEGE_META is invite-flow display data, and its only
     other reader (edit-groups.js) already falls back when a key is missing. */
  function seedSingleInstitution() {
    try {
      Object.keys(COLLEGE_META).forEach(function (k) {
        if (k !== 'wvcc') delete COLLEGE_META[k];
      });
    } catch (e) {
      if (window.console) console.warn('[maze-shim] institution trim failed: ' + e.message);
    }
  }


  /* ── No second Jessica ─────────────────────────────────────────────────
     The Pending Invites fixture opens with "Jessica Abrams", and the study's
     applicant is Jessica Cumberland. Completing Task 1 puts a real Jessica
     Cumberland row at the top of that same list, so a participant sees two
     Jessicas and reasonably reads the second as the first one with the wrong
     surname — or worse, as evidence the invite went to the wrong student.

     Renaming her TO Cumberland would be worse still: there would then be two
     Cumberland rows, one added by the participant's own invite. So the fixture
     row keeps its surname and loses the first name. Matched by name rather than
     by id, so it still fires if the fixture is reordered upstream. */
  function seedNoSecondJessica() {
    try {
      INVITED_FIXTURE.forEach(function (row) {
        if (row.firstName === 'Jessica' && row.lastName !== 'Cumberland') row.firstName = 'Renee';
      });
    } catch (e) {
      if (window.console) console.warn('[maze-shim] invited-fixture rename failed: ' + e.message);
    }
  }


  /* ── Refresh the counts the markup hardcodes ────────────────────────────
     The workspace "review applications" card ships with a literal count in the
     HTML (8). It is only corrected by updateBadges(), which runs inside
     renderTable() — i.e. the first time the QUEUE renders. Land on the workspace
     and the card shows the authored number regardless of the data behind it.

     That was invisible while the fixture happened to contain exactly that many,
     and seeding Jessica made it 9 against a card still reading 8. The card was
     always capable of lying; it just had not been given the chance.

     Deferred to DOMContentLoaded because this runs at parse time, before the
     table DOM the render walks exists. */
  function refreshCounts() {
    document.addEventListener('DOMContentLoaded', function () {
      try { if (typeof renderTable === 'function') renderTable(); } catch (e) {}
    });
  }

  seedChapter();
  seedRoster();
  refreshCounts();
  seedSingleInstitution();
  seedNoSecondJessica();

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
    try { out.invited = INVITED_FIXTURE; } catch (e) {}
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
    /* Pending Invites. Sending an invite unshifts rows onto INVITED_FIXTURE and
       then navigates straight to that screen, so this is the ONE bucket whose
       loss is guaranteed to be noticed: the participant invites a student and
       lands on a list that does not contain them. Missed on the first pass
       because the invite flow mutates a different fixture from the queue. */
    try { refill(INVITED_FIXTURE, data.invited); } catch (e) {}
    /* Re-render from the restored buckets. apply() runs after this and will
       navigate to the requested screen, but the tables are painted from module
       state that has just changed underneath them. */
    try { if (typeof renderTable === 'function') renderTable(); } catch (e) {}
    try { if (typeof renderWaitingTable === 'function') renderWaitingTable(); } catch (e) {}
    try { if (typeof renderInvitedTable === 'function') renderInvitedTable(); } catch (e) {}
  }

  /* ── The single-approve attestation modal ──────────────────────────────
     Approving one learner fires a non-skippable attestation modal over the
     queue (or over the detail screen). It changes no screen and, on confirm,
     leaves the participant exactly where they were — so the whole decision was
     invisible: no step for the modal, and none for the outcome.

     requestApproveConsent() does NOT receive the application id on this fork
     (only institution + display name), so the id is captured from the caller
     instead. approveFromQueue(id) is the queue path; the detail path sets
     currentActionIds, which is read as a fallback. */
  var approvingId = null;

  (function captureApprove() {
    if (typeof window.approveFromQueue !== 'function' || window.approveFromQueue.__mazeApprove) return;
    var orig = window.approveFromQueue;
    window.approveFromQueue = function (id) {
      approvingId = id;
      return orig.apply(this, arguments);
    };
    window.approveFromQueue.__mazeApprove = true;
  })();

  function approveModalOpen() {
    var o = document.getElementById('approve-consent-overlay');
    return !!(o && o.classList.contains('open'));
  }

  function approveModalId() {
    if (approvingId) return approvingId;
    try { if (currentActionIds && currentActionIds.length === 1) return currentActionIds[0]; }
    catch (e) {}
    return null;
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
      'edit-learner', 'edit-groups', 'active-enrollments',
      /* 'adv-search' was excluded while the search term lived only in memory:
         renderAdvancedResults() early-returns unless advSearch.active, and it is itself the
         function that calls showScreen('adv-search'), so a cold link rendered a blank Global
         Search page. Now that `q` travels with the URL, apply() below can rebuild the search
         before the screen is shown — and it has to be routable, because searching from the
         workspace is one of the ways through task 7 and was recording no step at all. */
      'adv-search'
    ],

    /* requestApproveConsent and approveFromQueue open the attestation modal
       WITHOUT changing screen, so neither triggers a wrapped showScreen and the
       router never notices. Both are wrapped so opening the modal schedules a
       URL write like any other navigation — requestApproveConsent because every
       path into the modal goes through it, approveFromQueue because it is the
       one that knows the application id. */
    wrap: ['showScreen', 'switchSegment', 'enterReviewWorkflow',
           'showAllApplications', 'viewApplication',
           'requestApproveConsent', 'approveFromQueue'],

    observe: function () {
      var screen = document.querySelector('.screen.active');
      var onDe = screen && screen.id === 'screen-de';
      var id = screen && screen.id;
      /* The bulk screens render from currentActionIds, which showScreen()
         receives as an ARGUMENT and holds only in memory. A page load loses it,
         and the screen then shows an empty selection with a live Approve button
         — worse than an error, because it looks like it worked. */
      var sel = null, col = null, grp = null;
      if (id === 'screen-bulk-approve' || id === 'screen-deny') {
        try {
          if (currentActionIds && currentActionIds.length) sel = currentActionIds.join(',');
        } catch (e) {}
      }
      /* THE INVITE WIZARD accumulates across four screens: learners, then the
         institution, then groups, then send. All of it lives in one in-memory
         object, so without carrying it the participant picks their students,
         the page loads, and the next screen has nothing selected — the wizard
         silently forgets everything on the way to its own second step. */
      if (INVITE_SCREENS.indexOf(id) !== -1) {
        try {
          if (inviteState.selectedLearnerIds.size) sel = Array.from(inviteState.selectedLearnerIds).join(',');
          if (inviteState.collegeKey) col = inviteState.collegeKey;
          if (inviteState.selectedGroupIds.size) grp = Array.from(inviteState.selectedGroupIds).join(',');
        } catch (e) {}
      }
      /* The search term, so it survives the load that searching from the workspace now
         causes. Read from the live field rather than the module variable: the two are kept
         in sync by the prototype, and the field is the one that exists on both screens. */
      var q = null;
      try {
        if (id === 'screen-adv-search') {
          /* Global Search has no visible box holding the term — it is a criterion. Reading
             the inputs here would report nothing, q would drop off the next URL write, and
             the back button would land on a global-search folder with no term to rebuild
             from: the blank page again, one step removed. */
          if (advSearch && advSearch.criteria && advSearch.criteria.term) q = advSearch.criteria.term;
        } else {
          var qEl = document.getElementById('search-input') || document.getElementById('ws-search-input');
          if (qEl && qEl.value.trim()) q = qEl.value.trim();
        }
      } catch (e) {}
      var out = {
        q:    q,
        seg:  onDe ? activeSeg() : null,
        mode: onDe ? (window.deScreenMode === 'review' ? 'review' : 'all') : null,
        app:  window.currentReviewId || null,
        sel:  sel,
        col:  col,
        grp:  grp
      };
      /* Reported ONLY while the attestation modal is actually open. Reporting it
         after it closed would pin the participant on the modal's address once
         they had left it, and the next navigation would look like a no-op. */
      if (approveModalOpen()) {
        out.modal = 'approve';
        var mid = approveModalId();
        if (mid) out.app = mid;
      }
      return out;
    },

    apply: function (p) {
      /* Restore the search term BEFORE anything renders, so the tables below are built
         filtered rather than built twice. window.applySearchTerm is the prototype's own
         entry point; falling back to the fields keeps this working if it is ever renamed. */
      /* A Global Search address with no term renders the screen's own empty state — "No
         applications match your search", with Adjust Search, Clear All and Back to Workspace
         all present. Redirecting away from it was tried and removed: the shim applies
         `screen` after this runs, so the redirect was silently overridden, and leaving the
         code in would have implied a protection that was not there. The empty state is an
         honest place to land and has its own ways out. */
      if (p.q) {
        try {
          if (p.screen === 'adv-search') {
            /* GLOBAL search: rebuild the criteria the workspace box sent and let the
               prototype render its own results screen. Without this the folder loads and
               renderAdvancedResults() early-returns, which is the blank page this route was
               excluded for in the first place. */
            if (typeof window.applyGlobalSearchTerm === 'function') window.applyGlobalSearchTerm(p.q);
          } else {
            /* QUEUE search: the term narrows the buckets already on screen. */
            ['search-input', 'ws-search-input'].forEach(function (id) {
              var el = document.getElementById(id);
              if (el) el.value = p.q;
            });
            if (typeof window.applySearchTerm === 'function') window.applySearchTerm(p.q);
          }
        } catch (e) {}
      }

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

      /* Re-open the attestation modal after the page load that gave it its own
         address. Re-entered through the prototype's own approveFromQueue(),
         which rebuilds the modal AND its commit callback — the callback is
         module-scoped and would otherwise be gone, leaving a modal whose
         Confirm button does nothing. */
      if (p.modal === 'approve') {
        var target = p.app;
        if (target && knownApp(target) && typeof window.approveFromQueue === 'function') {
          window.showScreen('de');
          window.approveFromQueue(target);
          return;
        }
        console.warn('[maze-shim] approve modal without a known application — showing the queue');
        window.showScreen('de');
        return;
      }

      /* Invite wizard: refill the accumulating selection BEFORE showing the
         screen. showScreen() is what triggers renderInviteLearners /
         renderInviteCollege / renderInviteGroups (boot.js), and each renders
         its ticks straight from inviteState — so restoring after the navigation
         would paint an empty wizard and leave it that way. */
      if (p.screen && p.screen.indexOf('invite-') === 0) {
        try {
          if (p.sel) {
            inviteState.selectedLearnerIds = new Set(p.sel.split(',').filter(Boolean));
          }
          if (p.col) inviteState.collegeKey = p.col;
          if (p.grp) {
            /* AFTER collegeKey. inviteSelectCollege() resets the group selection
               whenever the institution changes, so groups restored first would
               be wiped by the college restore that followed. */
            inviteState.selectedGroupIds = new Set(p.grp.split(',').filter(Boolean));
          }
        } catch (e) {}
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
