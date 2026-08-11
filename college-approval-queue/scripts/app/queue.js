/* scripts/app/queue.js — module split from former scripts/app.js (one IIFE, now dissolved to shared global scope). Needs-Review queue: table render, quick-filters/sort, badges, row event delegation, move helpers, approveFromQueue.
   Load order is fixed in index.html; do not reorder casually. */
  /* ─── Render table ─── */
  /* ═══════════════════════════════════════════
     NEEDS REVIEW — Main queue table render + filter/search logic
  ═══════════════════════════════════════════ */
  /* ─── Quick-filter + sort state (Row 3 toolbar) ─── */
  /* Column sort state for the main queue. Driven by clicking the column headers.
     Default: Received, newest first. */
  var deQuickFilters = { transcript: '', consent: '' };
  function _appDate(a) {
    var d = new Date(a.submitted || a.dateInvited || a.enrolledDate || a.deniedDate || 0);
    return isNaN(d.getTime()) ? 0 : d.getTime();
  }
  /* ── Column accessors for every queue table ──────────────────────────────
     One map, because the tables are the same records viewed through different buckets: a
     column named "Submission Date" in one and "Closed" in another is the same idea — when
     this row happened — so `date` resolves whichever date field the row carries. Sorting is
     wired through _shared/queue-screens/table-sort.js; these say what a column MEANS. */
  var DE_SORT_COLS = {
    name:        function (a) { return ((a.lastName || '') + ' ' + (a.firstName || '')).toLowerCase(); },
    first:       function (a) { return (a.firstName || '').toLowerCase(); },
    id:          function (a) { return (a.id || '').toLowerCase(); },
    institution: function (a) { return ((typeof COLLEGES !== 'undefined' && COLLEGES[a.institution]) || a.college || a.institution || '').toLowerCase(); },
    school:      function (a) { return (a.school || '').toLowerCase(); },
    group:       function (a) { return (a.group || '').toLowerCase(); },
    course:      function (a) { return (a.course || '').toLowerCase(); },
    date:        function (a) { return _appDate(a); },
    sent:        function (a) { var d = new Date(a.lastSent || a.dateInvited || 0); return isNaN(d.getTime()) ? 0 : d.getTime(); },
    /* Status sorts by the words on screen, not by an internal key: the admin is sorting what
       they can read. Each bucket has its own sub-status helper, so ask whichever exists. */
    status:      function (a) {
      try {
        if (a.awaitingRegistration || a.awaitingConsent || a.awaitingCounselor) {
          if (typeof waitingSubText === 'function') return waitingSubText(a).toLowerCase();
        }
        if (a.deniedState || a.kind === 'cancelled') {
          if (typeof closedSubText === 'function') return closedSubText(a).toLowerCase();
        }
      } catch (e) {}
      return (a.status || '').toLowerCase();
    }
  };
  window.DE_SORT_COLS = DE_SORT_COLS;

  /* The roster and the group list are not applications, so they get their own small maps. */
  var DE_ROSTER_COLS = {
    name:   function (l) { return ((l.lastName || '') + ' ' + (l.firstName || '')).toLowerCase(); },
    first:  function (l) { return (l.firstName || '').toLowerCase(); },
    school: function (l) { return (l.school || '').toLowerCase(); },
    id:     function (l) { return (l.id || '').toLowerCase(); },
    dob:    function (l) { var d = new Date(l.dob || 0); return isNaN(d.getTime()) ? 0 : d.getTime(); },
    grad:   function (l) { return parseInt(l.classOf, 10) || 0; }
  };
  window.DE_ROSTER_COLS = DE_ROSTER_COLS;

  var DE_GROUP_COLS = {
    group:    function (g) { return (g.name || '').toLowerCase(); },
    deadline: function (g) { var d = new Date(g.deadline || 0); return isNaN(d.getTime()) ? 0 : d.getTime(); }
  };
  window.DE_GROUP_COLS = DE_GROUP_COLS;

  /* One source of truth for this table's order. Kept as a named function because
     search.js sorts the Needs Review rows through it too, and both should agree. */
  function sortAppList(list) {
    return (root_DETableSort() || { apply: function (x, l) { return l; } }).apply('#queue-table', list);
  }
  function root_DETableSort() { return window.DETableSort; }
  /* Quick-filter predicates only narrow segments that carry the relevant field. */
  function passesQuickFilters(app) {
    if (deQuickFilters.transcript === 'missing'  && app.transcriptAttached !== false) return false;
    if (deQuickFilters.transcript === 'received' && app.transcriptAttached === false) return false;
    if (deQuickFilters.consent === 'pending'  && !app.hasAlert) return false;
    if (deQuickFilters.consent === 'received' && app.hasAlert)  return false;
    return true;
  }
  /* Re-render whichever segment is currently visible (used by sort + chips). */
  function rerenderActiveSegment() {
    var activeSeg = document.querySelector('.tasty-navtoggle__item.is-active');
    var oc  = activeSeg && activeSeg.getAttribute('onclick');
    var key = oc ? (oc.match(/switchSegment\('([^']+)'\)/) || [])[1] : 'needs-review';
    if (key === 'needs-review')  renderTable();
    else if (key === 'admitted') renderAdmittedTable();
    else if (key === 'waiting')  renderWaitingTable();
    else if (key === 'active')   renderActiveTable();
    else if (key === 'denied')   renderDeniedTable();
  }

  function renderTable() {
    var term = searchTerm.toLowerCase();
    var _review = reviewBucket();
    visibleApps = _review.filter(function(app) {
      if (term && appHaystack(app).indexOf(term) === -1) return false;
      if (!passesQuickFilters(app)) return false;
      return true;
    });
    sortAppList(visibleApps);
    if (window.DETableSort) DETableSort.repaint('#queue-table');

    const tbody = document.getElementById('queue-tbody');

    if (visibleApps.length === 0) {
      var emptyMsg;
      if (term) {
        emptyMsg = '<h3>No matching learners</h3><p>Try a different search term.</p>';
      } else {
        emptyMsg = '<h3>All caught up</h3><p>No applications pending approval right now.</p>';
        // In the focused review workflow, offer the Launchpad exit straight from the empty state.
        if (typeof deScreenMode !== 'undefined' && deScreenMode === 'review') {
          emptyMsg += '<button class="tasty-btn is-primary is-md" style="margin-top:16px;" onclick="exitReviewWorkflow()">Back to Workspace</button>';
        }
      }
      tbody.innerHTML = '<tr><td colspan="9"><div class="empty-state"><i class="ti ti-circle-check"></i>' + emptyMsg + '</div></td></tr>';
      queuePag.renderControls(0, 1, 0, 0, _review.length);
      updateBadges();
      return;
    }

    var pg = queuePag.paginate(visibleApps);

    tbody.innerHTML = pg.slice.map((app, i) => {
      const globalIdx = pg.start + i;
      const checked = selectedIds.has(app.id) ? 'checked' : '';
      const rowCls  = selectedIds.has(app.id) ? 'selected' : '';
      return `
        <tr class="${rowCls}" data-id="${app.id}">
          <td class="col-check">
            <input type="checkbox" class="row-checkbox" data-id="${app.id}" ${checked} />
          </td>
          ${nameCells(app)}
          <td class="col-appid">${app.id}</td>
          <td style="font-size:13px;">${app.school}</td>
          <td style="font-size:13px;">${groupCellHTML(app)}</td>
          <td style="color:var(--c-text-muted);font-size:12px;white-space:nowrap;">${app.submitted}</td>
          <td class="col-status-badge">
            <span class="tasty-status-tag is-sm is-solid is-note">Needs Review</span>
          </td>
          <td class="col-actions">
            <div class="row-actions">
              ${viewAppBtn(app.id)}
              <button class="tasty-btn is-success is-sm" data-id="${app.id}" data-action="approve">Admit</button>
            </div>
          </td>
        </tr>`;
    }).join('');

    queuePag.renderControls(pg.total, pg.pages, pg.start, pg.end, _review.length);
    updateBadges();
    updateBulkBar();
    updateSelectAllCheckbox();
  
    if (typeof stackTableRows === 'function') stackTableRows();   /* rows were rebuilt; re-stamp the stacked labels */
  }

  /* ─── Badge / label helpers ─── */
  function updateBadges() {
    const total = reviewBucket().length;
    var totalBadge = document.getElementById('total-badge');
    if (totalBadge) totalBadge.textContent = total;
    var segCount = document.getElementById('seg-count-needs-review');
    if (segCount) segCount.textContent = segCountsNow()['needs-review'];
    // Workspace "Dual Enrollment Applications" review count mirrors the queue —
    // drops as the counselor approves/denies, and reads 0 in the no-applications state.
    var wsCount = document.querySelector('#ws-review-card .workspace-count');
    if (wsCount) wsCount.textContent = window.__noApps ? '0' : String(total);
    updateSegmentCounts();
    updateInvitesWorkspaceCount();
    /* results-label is now managed by queuePag.renderControls */
  }

  /* Per-segment count badges on the NavToggle set.
     While a search is active these count MATCHES, not bucket totals: the tabs are the only
     place that says where the matches are, and a tab reading 8 next to an empty table is a
     worse lie than no number at all. */
  function segCountsNow() {
    var t = (typeof searchTerm === 'string' ? searchTerm : '').trim().toLowerCase();
    function n(list) {
      if (!t) return list.length;
      return list.filter(function (a) { return appHaystack(a).indexOf(t) !== -1; }).length;
    }
    return {
      'needs-review': n(reviewBucket()),
      'admitted':     n(ALL_ADMITTED_APPS),
      'waiting':      n(waitingBucket()),
      'active':       n(ALL_ACTIVE_APPS),
      'denied':       n(ALL_DENIED_APPS)
    };
  }
  window.segCountsNow = segCountsNow;

  function updateSegmentCounts() {
    var c = segCountsNow();
    var map = {
      'seg-count-admitted': c.admitted,
      'seg-count-waiting': c.waiting,
      'seg-count-active':  c.active,
      'seg-count-denied':  c.denied
    };
    Object.keys(map).forEach(function(id) {
      var el = document.getElementById(id);
      if (el) el.textContent = map[id];
    });
  }

  /* Workspace "Invites" card count (pending invites live on their own screen now). */
  function updateInvitesWorkspaceCount() {
    var el = document.querySelector('.workspace-invites-count');
    if (el) el.textContent = window.__noApps ? '0' : String(INVITED_FIXTURE.length);
  }

  function updateBulkBar() {
    const bar   = document.getElementById('bulk-bar');
    const count = selectedIds.size;
    const total = visibleApps.length;

    document.getElementById('bulk-count-badge').textContent = count;
    document.getElementById('bulk-label-text').textContent  =
      count === 1 ? 'application selected' : 'applications selected';

    const allSelected = count === total && total > 0;
    const saBtn = document.getElementById('bulk-select-all-btn');
    saBtn.textContent = allSelected ? 'Deselect all' : 'Select all ' + total;

    bar.style.display = count > 0 ? 'flex' : 'none';
  }

  function updateSelectAllCheckbox() {
    const cb    = document.getElementById('select-all-checkbox');
    const total = visibleApps.length;
    const sel   = selectedIds.size;
    cb.checked       = sel === total && total > 0;
    cb.indeterminate = sel > 0 && sel < total;
  }

  /* ─── Event delegation — table ─── */
  document.getElementById('queue-table').addEventListener('change', function (e) {
    if (!e.target.classList.contains('row-checkbox')) return;
    const id = e.target.dataset.id;
    if (!id) return; // header checkbox handled separately
    if (e.target.checked) selectedIds.add(id);
    else selectedIds.delete(id);
    renderTable();
  });

  document.getElementById('select-all-checkbox').addEventListener('change', function (e) {
    if (e.target.checked) visibleApps.forEach(a => selectedIds.add(a.id));
    else selectedIds.clear();
    renderTable();
  });

  document.getElementById('queue-table').addEventListener('click', function (e) {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    const id = btn.dataset.id;
    if (btn.dataset.action === 'approve') approveFromQueue(id);
  });


  /* ─── Move helpers — relocate an app between status tabs ───
     Approving a New app (College Review done) sends it to Waiting — now
     awaiting guardian consent (counselor already signed off). Denying it
     sends it to Closed as a College denial (Institution Review). */
  function todayLabel() {
    return new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }
  function moveAppToWaiting(app) {
    if (WAITING_APPS.some(function(a) { return a.id === app.id; })) return;
    /* Copy ALL original fields (incl. __detail cache, gpa, sisId etc.)
       so the review screen can re-render with full fidelity. */
    /* Every caller of this is the college DECIDING (single approve, the confirm page, bulk
       admit), so college review is finished by definition. What remains is whichever gate is
       still outstanding — guardian consent on the flagged records — and once nothing is, the
       learner registering for their courses. Without this last flag waitingSubText fell
       through to its default and told the admin the application was "Awaiting college review"
       immediately after they had reviewed it. */
    var copy = Object.assign({}, app, {
      awaitingConsent: !!app.hasAlert,
      awaitingCounselor: false,
      awaitingRegistration: !app.hasAlert
    });
    WAITING_APPS.unshift(copy);
  }
  function moveAppToAdmitted(app) {
    if (ALL_ADMITTED_APPS.some(function(a) { return a.id === app.id; })) return;
    var copy = Object.assign({}, app, {
      awaitingConsent: false,
      awaitingCounselor: false,
      admittedDate: todayLabel()
    });
    ALL_ADMITTED_APPS.unshift(copy);
  }
  /* Unholding an admitted learner: "invite to register" reuses the existing Waiting
     pipeline in its ready-to-register sub-state. NOTE: this is NOT an invite to APPLY;
     no pending-invite record is created (see data-invite.js inviteType). */
  function moveAdmittedToWaiting(app) {
    var idx = ALL_ADMITTED_APPS.findIndex(function(a) { return a.id === app.id; });
    if (idx > -1) ALL_ADMITTED_APPS.splice(idx, 1);
    if (WAITING_APPS.some(function(a) { return a.id === app.id; })) return;
    var copy = Object.assign({}, app, {
      awaitingConsent: false,
      awaitingCounselor: false,
      awaitingRegistration: true
    });
    WAITING_APPS.unshift(copy);
  }
  function moveAppToDenied(app, reason) {
    if (ALL_DENIED_APPS.some(function(a) { return a.id === app.id; })) return;
    var copy = Object.assign({}, app, {
      deniedDate: todayLabel(),
      deniedBy: (ADMINS[currentAdmin] && ADMINS[currentAdmin].name) || 'WVCC Admissions',
      closedBy: 'College',
      deniedState: 'Institution Review',
      reason: reason || 'No reason provided.'
    });
    ALL_DENIED_APPS.unshift(copy);
  }

  /* Direct in-queue approval — no detail screen. Moves the row to Waiting and
     surfaces a success toast (per design feedback). */
  function approveFromQueue(id) {
    var app = activeApps.find(function(a) { return a.id === id; });
    if (!app) return;
    // Route through the Admit workflow page (Review Summary and Confirm) instead of committing directly.
    if (typeof requestApproveConsent === 'function') {
      requestApproveConsent(id, app.institution, app.firstName + ' ' + app.lastName,
        function() { commitApproveFromQueue(id); },
        function() { commitAdmitOnlyFromQueue(id); });
    } else {
      commitApproveFromQueue(id);
    }
  }
  /* "Admit Only" twin: admit + hold, no registration invite (PM review #8). */
  function commitAdmitOnlyFromQueue(id) {
    var app = activeApps.find(function(a) { return a.id === id; });
    if (!app) return;
    moveAppToAdmitted(app);
    activeApps = activeApps.filter(function(a) { return a.id !== id; });
    selectedIds.delete(id);
    renderTable();
    renderAdmittedTable();
    refreshUnifiedPool();
    if (advSearch.active) renderAdvancedResults();
    showToast(app.firstName + ' ' + app.lastName + ' admitted, on hold until invited to register.', 'success');
  }
  function commitApproveFromQueue(id) {
    var app = activeApps.find(function(a) { return a.id === id; });
    if (!app) return;
    moveAppToWaiting(app);
    activeApps = activeApps.filter(function(a) { return a.id !== id; });
    selectedIds.delete(id);
    renderTable();
    renderWaitingTable();
    if (advSearch.active) renderAdvancedResults();
    showToast(app.firstName + ' ' + app.lastName + '’s application approved — Institution Review complete.', 'success');
  }
  window.approveFromQueue = approveFromQueue;
