/* maze-shim descriptor — college-approval-queue (HE admin: Kathy Nguyen, WVCC).
   Fork of the HS descriptor. Deltas: a fifth segment (admitted), the
   admit-confirm workflow screen, and no Grades concept. */
(function () {
  'use strict';

  var SEGS = ['needs-review', 'waiting', 'admitted', 'active', 'denied'];

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

  /* ── ?chapter= — put Jessica where her story is ─────────────────────────
     Same mechanism and same reasoning as the HS fork: the study follows one
     applicant end to end, and a task that admits somebody else breaks the
     thread. See hs-approval-queue.js for the full note on why this is not a
     cross-task dependency.

       (no param)                she is Registered — the authored fixture
       ?chapter=college-review   she is awaiting this college's decision

     The pending row is deliberately identical in shape to the HS fork's, because
     it is the same application seen from the other side of the exchange. */
  var JESSICA = 'DE-2026-0440';

  function seedChapter() {
    if (new URLSearchParams(location.search).get('chapter') !== 'college-review') return;
    try {
      var i = ALL_ACTIVE_APPS.findIndex(function (a) { return a.id === JESSICA; });
      var enrolled = i !== -1 ? ALL_ACTIVE_APPS.splice(i, 1)[0] : null;
      if (ALL_APPS.some(function (a) { return a.id === JESSICA; })) return;
      var pending = {
        id: JESSICA,
        lastName: 'Cumberland', firstName: 'Jessica', initials: 'JC',
        school: (enrolled && enrolled.school) || 'Pioneer High School',
        group: (enrolled && enrolled.group) || 'Math - Dual Enrollment Fall 2026',
        term: (enrolled && enrolled.term) || 'FALL 2026',
        course: null,
        submitted: 'Jul 28, 2026',
        gradDate: 'May 2028',
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
      ALL_APPS.unshift(pending);
      if (typeof activeApps !== 'undefined') activeApps.unshift(pending);
    } catch (e) {
      if (window.console) console.warn('[maze-shim] chapter seed failed: ' + e.message);
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
  seedNoSecondJessica();
  refreshCounts();

  /* ── Mutations that must survive a page load ────────────────────────────
     As the HS fork, plus ALL_ADMITTED_APPS: this fork has a fifth bucket
     (Admit Only), so an admit decision can land in either Admitted or Waiting
     depending on which button was pressed. Missing it would lose exactly the
     outcome task 5 is measuring. */
  function snapshot() {
    var out = {};
    try { out.active = activeApps; } catch (e) {}
    try { out.waiting = WAITING_APPS; } catch (e) {}
    try { out.admitted = ALL_ADMITTED_APPS; } catch (e) {}
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
    try { refill(ALL_ADMITTED_APPS, data.admitted); } catch (e) {}
    try { refill(ALL_DENIED_APPS, data.denied); } catch (e) {}
    /* Pending Invites. Sending an invite unshifts rows onto INVITED_FIXTURE and
       then navigates straight to that screen, so this is the ONE bucket whose
       loss is guaranteed to be noticed: the participant invites a student and
       lands on a list that does not contain them. Missed on the first pass
       because the invite flow mutates a different fixture from the queue. */
    try { refill(INVITED_FIXTURE, data.invited); } catch (e) {}
    try { if (typeof renderTable === 'function') renderTable(); } catch (e) {}
    try { if (typeof renderWaitingTable === 'function') renderWaitingTable(); } catch (e) {}
    try { if (typeof renderInvitedTable === 'function') renderInvitedTable(); } catch (e) {}
  }

  MazeShim.init({
    proto: 'college-approval-queue',
    defaultScreen: 'dashboard',
    snapshot: snapshot,
    restore: restore,

    screens: [
      'path-select', 'email', 'login', 'service-select', 'dashboard', 'de',
      'review', 'deny', 'bulk-approve', 'admit-confirm', 'invites',
      'invite-learners', 'invite-college', 'invite-groups', 'add-learners',
      'bulk-upload', 'edit-learner', 'edit-groups',
      /* 'adv-search' is routable now, for the same reason as the HS fork: the search term
         travels in `q`, so apply() can rebuild the search before the screen renders and the
         cold link is no longer blank. */
      'adv-search'
    ],

    wrap: ['showScreen', 'switchSegment', 'enterReviewWorkflow',
           'showAllApplications', 'viewApplication', 'requestApproveConsent'],

    observe: function () {
      var screen = document.querySelector('.screen.active');
      var onDe = screen && screen.id === 'screen-de';
      var id = screen && screen.id;
      /* The Admit workflow page and the bulk screens all render from
         currentActionIds, which showScreen receives as an ARGUMENT and holds
         only in memory. */
      var sel = null;
      if (id === 'screen-admit-confirm' || id === 'screen-bulk-approve' || id === 'screen-deny') {
        try {
          if (currentActionIds && currentActionIds.length) sel = currentActionIds.join(',');
        } catch (e) {}
      }
      /* Edit Learner and Edit Groups are rebuilt from a subject the same way the review
         screen is, and neither had one: arriving from the Add Learners cards produced a screen
         with no form on it at all. `sel` carries WHICH learner (absent = the Add case, which is
         a legitimately blank form rather than a broken one) and `app` carries which
         application's groups are open. */
      if (id === 'screen-edit-learner') {
        try {
          if (typeof _elMode !== 'undefined' && _elMode !== 'add' &&
              typeof _elLearnerId !== 'undefined' && _elLearnerId) sel = String(_elLearnerId);
        } catch (e) {}
      }
      var egApp = null;
      if (id === 'screen-edit-groups') {
        try { if (typeof _egAppId !== 'undefined' && _egAppId) egApp = _egAppId; } catch (e) {}
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
        app:  egApp || window.currentReviewId || null
      };
      if (sel) out.sel = sel;
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
      /* These three screens render from state their OPENER sets, not from markup, so a page
         load leaves them blank — the participant picks "Add One Learner", the page loads, and
         the form is not there. Re-entered through the prototype's own openers, which is what a
         click would have called, so the screen is built the same way it always is.

         Dead ends matter more here than anywhere: a blank screen ends the task, and the path
         we are trying to capture ends with it. */
      if (p.screen === 'edit-learner') {
        try {
          if (p.sel && typeof window.openEditLearner === 'function') window.openEditLearner(String(p.sel).split(',')[0]);
          else if (typeof window.openAddLearner === 'function') window.openAddLearner();
        } catch (e) {}
      }
      if (p.screen === 'bulk-upload') {
        try { if (typeof window.openBulkUpload === 'function') window.openBulkUpload(); } catch (e) {}
      }
      if (p.screen === 'edit-groups' && p.app) {
        try { if (typeof window.openEditGroups === 'function') window.openEditGroups(p.app); } catch (e) {}
      }

      if (p.q) {
        try {
          if (p.screen === 'adv-search') {
            /* GLOBAL search: rebuild the criteria the workspace box sent and let the
               prototype render its own results screen. Without this the folder loads and
               renderAdvancedResults() early-returns — the blank page this route was
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

      /* ── The Admit workflow page ──────────────────────────────────────
         renderAdmitConfirmScreen() reads currentActionIds and, finding none
         after a page load, renders an EMPTY mount — the participant clicks
         "Admit Now" and lands on a blank workflow page. Worse, the two commit
         callbacks (_approveConsentOnRegister / _approveConsentOnHold) are
         module-scoped and also gone, so even with the ids restored both buttons
         would do nothing.

         Restoring both by re-entering through the prototype's own
         requestApproveConsent(), with the same commit functions the queue
         passes. That rebuilds the ids, the callbacks and the screen in one call
         — and it is the path the product actually uses, so the page cannot
         drift from it.

         requestApproveConsent() calls showScreen('admit-confirm') itself, which
         is why this returns rather than falling through. Safe inside apply():
         the shim suppresses navigation while it is applying state. */
      if (p.screen === 'admit-confirm' && p.sel) {
        var admitId = p.sel.split(',')[0];
        var admitApp = knownApp(admitId) && window.findAppAnywhere(admitId);
        if (admitApp && typeof window.requestApproveConsent === 'function') {
          window.requestApproveConsent(
            admitId, admitApp.institution,
            admitApp.firstName + ' ' + admitApp.lastName,
            function () { commitApproveFromQueue(admitId); },
            function () { commitAdmitOnlyFromQueue(admitId); }
          );
          return;
        }
        console.warn('[maze-shim] admit-confirm without a known application — falling back to the queue');
        window.showScreen('de');
        return;
      }

      /* Bulk screens: hand the ids back the way showScreen() expects them. */
      if ((p.screen === 'bulk-approve' || p.screen === 'deny') && p.sel) {
        var ids = p.sel.split(',').filter(Boolean);
        try { ids.forEach(function (i) { selectedIds.add(i); }); } catch (e) {}
        if (p.screen === 'bulk-approve') window.showScreen('bulk-approve', ids);
        else window.showScreen('deny', { ids: ids, from: 'queue' });
        return;
      }

      if (p.mode === 'review' && typeof window.enterReviewWorkflow === 'function') {
        window.enterReviewWorkflow();
      } else if (p.mode === 'all' && typeof window.showAllApplications === 'function') {
        window.showAllApplications();
      }

      if (p.screen === 'review' && p.app) {
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
        if (btn && btn.offsetParent !== null) window.switchSegment(p.seg);
        else console.warn('[maze-shim] segment "' + p.seg + '" is hidden under the current config — staying put');
      }
    }
  });
})();
