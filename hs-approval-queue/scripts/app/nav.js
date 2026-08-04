/* scripts/app/nav.js — module split from former scripts/app.js (one IIFE, now dissolved to shared global scope). showScreen navigation, transcript viewer modal, tracker hover popover.
   Load order is fixed in index.html; do not reorder casually. */
  /* ─── Screen navigation ─── */
  /* ═══════════════════════════════════════════
     NAVIGATION — showScreen, showToast, switchSegment
  ═══════════════════════════════════════════ */
  function showScreen(name, param) {
    document.querySelectorAll('.screen').forEach(function(s) { s.classList.remove('active'); });
    var target = document.getElementById('screen-' + name);
    if (!target) return;
    target.classList.add('active');
    window.scrollTo(0, 0);
    // Apply the standard-page vs focused-review shell context to the Applications screen.
    if (name === 'de' && typeof applyDeMode === 'function') applyDeMode();
    if (name === 'de' && typeof applyNoAppsState === 'function') applyNoAppsState();
    if (name === 'active-enrollments' && typeof initActiveEnrollments === 'function') initActiveEnrollments();
    if (name === 'review' && param) {
      currentReviewId = param;
      renderReviewScreen(param);
      var rbb = document.getElementById('review-back-btn');
      if (rbb) {
        rbb.onclick = function() { reviewReturn(); };
        rbb.innerHTML = '<i class="ti ti-chevron-left"></i> Back to ' + reviewReturnLabel();
      }
    } else if (name === 'deny' && param) {
      currentActionIds    = Array.isArray(param.ids) ? param.ids : [param.ids];
      currentActionSource = param.from || 'queue';
      renderDenyScreen();
      // Step depth drives the header: from the detail view, Deny is a deeper step
      // (Back + Cancel); reached directly from the queue (bulk-deny) it's the first
      // step in (Back to Queue, no Cancel).
      var fromReview = currentActionSource === 'review';
      var backBtn = document.getElementById('deny-back-btn');
      if (backBtn) {
        backBtn.onclick = function() {
          if (fromReview) showScreen('review', currentReviewId);
          else showScreen('de');
        };
        backBtn.innerHTML = '<i class="ti ti-chevron-left"></i> ' + (fromReview ? 'Back' : 'Back to Queue');
      }
      var denyCancelBtn = document.getElementById('deny-cancel-btn');
      if (denyCancelBtn) denyCancelBtn.style.display = fromReview ? '' : 'none';
    } else if (name === 'bulk-approve' && param) {
      currentActionIds = param;
      renderBulkApproveScreen();
    }
  }
  // Expose globally so inline onclick attrs can reach it
  window.showScreen = showScreen;

  /* ─── Transcript viewer ─── */
  function openTranscriptModal(appId) {
    var app = ALL_APPS.find(function(a) { return a.id === appId; });
    if (!app) return;

    var courses = [
      { term:'Fall 2024',   code:'ENG 3A',  name:'English III',         grade:'A',  cr:5 },
      { term:'Fall 2024',   code:'MATH 3A', name:'Pre-Calculus',        grade:'B+', cr:5 },
      { term:'Fall 2024',   code:'HIST 3A', name:'U.S. History',        grade:'A-', cr:5 },
      { term:'Spr 2025',    code:'ENG 3B',  name:'English III (cont.)', grade:'A',  cr:5 },
      { term:'Spr 2025',    code:'SCI 2B',  name:'Life Science',        grade:'B',  cr:5 },
      { term:'Fall 2025',   code:'ENG 4A',  name:'English IV (AP)',     grade:'A-', cr:5 },
      { term:'Fall 2025',   code:'MATH 4A', name:'AP Calculus AB',      grade:'B+', cr:5 },
    ];

    var rows = courses.map(function(c) {
      return '<tr><td>' + c.term + '</td><td>' + c.code + '</td><td>' + c.name +
        '</td><td style="text-align:center;">' + c.grade +
        '</td><td style="text-align:center;">' + c.cr + '</td></tr>';
    }).join('');

    var html = '<div class="tasty-modal-overlay open" id="transcript-overlay">' +
      '<div class="tasty-modal">' +
        '<div class="tasty-modal__head">' +
          '<span class="tasty-modal__title">Transcript &mdash; ' + app.firstName + ' ' + app.lastName + '</span>' +
          '<button class="tasty-modal__x" id="transcript-close" aria-label="Close"><i class="ti ti-x"></i></button>' +
        '</div>' +
        '<div class="tasty-modal__body">' +
          '<div class="transcript-doc">' +
            '<div class="transcript-doc-head">' +
              '<h4>' + app.school + '</h4>' +
              '<p>Official Academic Transcript</p>' +
            '</div>' +
            '<div class="transcript-doc-content">' +
              '<div class="transcript-student-grid">' +
                '<div><p class="tr-key">Learner Name</p><p class="tr-val">' + app.firstName + ' ' + app.lastName + '</p></div>' +
                '<div><p class="tr-key">Learner ID</p><p class="tr-val">' + app.sisId + '</p></div>' +
                '<div><p class="tr-key">Grade Level</p><p class="tr-val">' + gradeSuffix(app.grade) + ' grade</p></div>' +
                '<div><p class="tr-key">Expected Graduation</p><p class="tr-val">' + app.gradDate + '</p></div>' +
              '</div>' +
              '<p class="transcript-section-title">Course History</p>' +
              '<table class="transcript-table">' +
                '<thead><tr><th>Term</th><th>Code</th><th>Course</th><th>Grade</th><th>Credits</th></tr></thead>' +
                '<tbody>' + rows + '</tbody>' +
              '</table>' +
              '<div class="transcript-gpa-line">' +
                '<span>Cumulative GPA</span>' +
                '<span>' + app.gpa.toFixed(2) + '</span>' +
              '</div>' +
            '</div>' +
          '</div>' +
        '</div>' +
      '</div>' +
    '</div>';

    var mount = document.getElementById('transcript-mount');
    mount.innerHTML = html;

    function closeTranscript() { mount.innerHTML = ''; }
    document.getElementById('transcript-close').addEventListener('click', closeTranscript);
    document.getElementById('transcript-overlay').addEventListener('click', function(e) {
      if (e.target.id === 'transcript-overlay') closeTranscript();
    });
  }

  /* ─── Tracker popover ─── */
  var _popoverRowId = null;

  function buildTrackerPopoverHTML(app, status) {
    var consentDone = !app.hasAlert;
    var steps;
    if (status === 'invited') {
      steps = [
        { label: 'Invitation Sent',    state: 'done',    sub: app.submitted || 'Sent',     subCls: 'done'   },
        { label: 'Application Submission',        state: 'active',  sub: 'Awaiting learner response', subCls: 'active' },
        { label: 'Parent/Guardian Consent',   state: 'pending', sub: 'Not yet started',           subCls: ''       },
        { label: 'High School Approval', state: 'pending', sub: 'Not yet started',           subCls: ''       },
        { label: 'Institution Review', state: 'pending', sub: 'Not yet started',           subCls: ''       },
      ];
    } else if (status === 'waiting') {
      steps = [
        { label: 'Application Submission',        state: 'done', sub: 'Completed', subCls: 'done' },
        { label: 'Parent/Guardian Consent',   state: app.awaitingConsent ? 'active' : 'done', sub: app.awaitingConsent ? 'Awaiting response' : 'Completed', subCls: app.awaitingConsent ? 'active' : 'done' },
        { label: 'High School Approval', state: 'done', sub: 'Approved', subCls: 'done' },
        { label: 'Institution Review', state: app.awaitingInstitution ? 'active' : 'pending', sub: app.awaitingInstitution ? 'Under review' : 'Not yet started', subCls: app.awaitingInstitution ? 'active' : '' },
      ];
    } else if (status === 'active') {
      steps = [
        { label: 'Application Submission',        state: 'done', sub: 'Completed', subCls: 'done' },
        { label: 'Parent/Guardian Consent',   state: 'done', sub: 'Completed', subCls: 'done' },
        { label: 'High School Approval', state: 'done', sub: 'Approved',  subCls: 'done' },
        { label: 'Institution Review', state: 'done', sub: 'Approved',  subCls: 'done' },
        { label: 'Enrolled',           state: 'done', sub: app.enrolledDate || 'Enrolled', subCls: 'done' },
      ];
    } else if (status === 'denied') {
      var deniedStepMap = { 'Guardian Consent': 'Parent/Guardian Consent', 'Counselor Review': 'High School Approval', 'Institution Review': 'Institution Review' };
      var deniedStep = deniedStepMap[app.deniedState] || 'High School Approval';
      var before = true;
      steps = ['Application Submission', 'Parent/Guardian Consent', 'High School Approval', 'Institution Review'].map(function(lbl) {
        if (lbl === deniedStep) { before = false; return { label: lbl, state: 'denied', sub: app.deniedDate || 'Denied', subCls: 'denied' }; }
        if (before) return { label: lbl, state: 'done',    sub: 'Completed',   subCls: 'done' };
        return                  { label: lbl, state: 'pending', sub: 'Not started', subCls: '' };
      });
    } else {
    var steps_pending = [
      { label: 'Application Submission',       state: 'done',                        sub: app.submitted,           subCls: 'done'   },
      { label: 'Parent/Guardian Consent',  state: consentDone ? 'done' : 'active', sub: consentDone ? 'Completed' : 'Awaiting response', subCls: consentDone ? 'done' : 'active' },
      { label: 'High School Approval', state: 'active',                     sub: 'Awaiting your review',  subCls: 'active' },
      { label: 'Institution Review', state: 'pending',                     sub: 'Not yet started',       subCls: ''       },
    ];
    steps = steps_pending;
    }
    var stepsHtml = steps.map(function(step, i) {
      var isLast  = i === steps.length - 1;
      var connCls = step.state === 'done' ? ' done' : '';
      return '<div class="tracker-v-step">' +
        '<div class="tracker-v-left">' +
          '<div class="tracker-v-dot ' + step.state + '"></div>' +
          (!isLast ? '<div class="tracker-v-connector' + connCls + '"></div>' : '') +
        '</div>' +
        '<div class="tracker-v-body">' +
          '<p class="tracker-v-step-label">' + step.label + '</p>' +
          '<p class="tracker-v-step-sub ' + step.subCls + '">' + step.sub + '</p>' +
        '</div>' +
      '</div>';
    }).join('');
    return '<p class="tracker-popover-name">' + app.lastName + ', ' + app.firstName + '</p>' +
      '<div class="tracker-v">' + stepsHtml + '</div>';
  }

  function showTrackerPopover(app, status, cell) {
    var pop  = document.getElementById('tracker-popover');
    pop.classList.remove('visible');
    pop.innerHTML = buildTrackerPopoverHTML(app, status);

    var rect = cell.getBoundingClientRect();
    var popW = pop.offsetWidth;
    var popH = pop.offsetHeight;
    var top  = rect.bottom + 8;
    var left = rect.left;

    if (left + popW > window.innerWidth - 12) left = Math.max(8, window.innerWidth - popW - 12);
    if (top  + popH > window.innerHeight - 12) top  = rect.top - popH - 8;

    pop.style.top  = top  + 'px';
    pop.style.left = left + 'px';
    pop.classList.add('visible');
  }

  function hideTrackerPopover() {
    document.getElementById('tracker-popover').classList.remove('visible');
    _popoverRowId = null;
  }

  /* Hover the Status badge on any segment table to see the step tracker. */
  function wireTrackerHover(tableId, lookup, status) {
    var tbl = document.getElementById(tableId);
    if (!tbl) return;
    tbl.addEventListener('mouseover', function(e) {
      var cell = e.target.closest('td.col-status-badge');
      if (!cell) { hideTrackerPopover(); return; }
      var row = cell.closest('tr[data-id]');
      if (!row) return;
      var id = row.dataset.id;
      if (id === _popoverRowId) return;
      _popoverRowId = id;
      var rec = lookup(id);
      if (rec) showTrackerPopover(rec, status, cell);
    });
    tbl.addEventListener('mouseleave', hideTrackerPopover);
  }

  wireTrackerHover('queue-table',   function(id) { return reviewBucket().find(function(a) { return a.id === id; }); },   'pending');
  wireTrackerHover('waiting-table', function(id) { return waitingBucket().find(function(a) { return a.id === id; }); }, 'waiting');
  wireTrackerHover('invited-table', function(id) { return INVITED_FIXTURE.find(function(a) { return a.id === id; }); },   'invited');
  wireTrackerHover('active-table',  function(id) { return ALL_ACTIVE_APPS.find(function(a) { return a.id === id; }); },   'active');
  wireTrackerHover('denied-table',  function(id) { return ALL_DENIED_APPS.find(function(a) { return a.id === id; }); },   'denied');
