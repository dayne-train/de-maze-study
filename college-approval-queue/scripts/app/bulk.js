/* scripts/app/bulk.js — Bulk-approve workflow step + bulk-bar wiring.
   COLLEGE ADMIN: approving = an admission decision (admit these learners to dual enrollment at
   our college so they can register for courses) — NOT an eligibility attestation. The admin
   doesn't know HS-side eligibility data (GPA, transcript, prereqs) until automation is built,
   so no "View eligibility requirements" chips/links and no per-institution grouping (we ARE the
   only institution here, WVCC). Single flat list, admit-framed copy, Approve N learners.
   (The HS-counselor prototype keeps the eligibility attestation + chips/A-B layout — that's
   where attestation actually belongs.)
   Load order is fixed in index.html; do not reorder casually. */
  /* ─── Bulk bar events ─── */
  document.getElementById('bulk-select-all-btn').addEventListener('click', function () {
    const allSel = selectedIds.size === activeApps.length && activeApps.length > 0;
    if (allSel) selectedIds.clear();
    else activeApps.forEach(a => selectedIds.add(a.id));
    renderTable();
  });

  document.getElementById('bulk-approve-btn').addEventListener('click', function () {
    if (selectedIds.size === 0) return;
    showScreen('bulk-approve', [...selectedIds]);
  });

  document.getElementById('bulk-deny-btn').addEventListener('click', function () {
    if (selectedIds.size === 0) return;
    showScreen('deny', { ids: [...selectedIds], from: 'queue' });
  });

  /* ═══════════════════════════════════════════
     BULK ADMIT WORKFLOW STEP — admission decision (no eligibility gate, no chips, no A/B)
     This IS the confirmation step. Click Approve → commit + return to queue + toast.
  ═══════════════════════════════════════════ */

  /* Avatar + name + meta. Avatar is the DS Tasty .tasty-persona-icon (single brand color, 40px). */
  function learnerRowHtml(a) {
    return '<div class="bulk-elig-row">' +
      '<span class="tasty-persona-icon">' + escapeHtml(a.initials) + '</span>' +
      '<div class="bulk-elig-info">' +
        '<div class="bulk-elig-name">' + escapeHtml(a.lastName) + ', ' + escapeHtml(a.firstName) + '</div>' +
        '<div class="bulk-elig-sub">' + escapeHtml(a.course || a.group) + ' &middot; ' + escapeHtml(a.id) + '</div>' +
      '</div>' +
    '</div>';
  }

  function renderBulkApproveScreen() {
    var ids  = currentActionIds || [];
    var apps = activeApps.filter(function(a) { return ids.indexOf(a.id) > -1; });
    var n    = apps.length;
    var mount = document.getElementById('bulk-approve-content');
    if (!mount) return;
    if (n === 0) { mount.innerHTML = ''; return; }

    var college = COLLEGES.wvcc;

    // ── Identity strip: count + statement of intent ─────────────────────────
    var identity =
      '<div class="review-identity">' +
        '<div class="review-identity-left">' +
          '<div class="review-member-logo"><div class="review-member-logo-inner review-member-logo-inner--count">' + n + '</div></div>' +
          '<p class="review-identity-statement">' +
            '<strong>' + n + ' ' + (n === 1 ? 'learner' : 'learners') + '</strong> selected for admission to ' + escapeHtml(college) + '.' +
          '</p>' +
        '</div>' +
      '</div>';

    // ── Admit attestation (NOT eligibility — the admin is making an admission decision).
    //    Neutral on registration: that's now the two-button choice below (the PM #8). ──
    var attest =
      '<div class="bulk-attest">' +
        '<i class="ti ti-shield-check"></i>' +
        '<div class="bulk-attest-text">' +
          'By continuing, <strong>you admit ' +
          (n === 1 ? 'this learner' : 'these learners') +
          ' to dual enrollment at ' + escapeHtml(college) + '</strong>. Choose whether to also invite ' +
          (n === 1 ? 'them' : 'them') + ' to register for courses now, or hold the registration invite for later.' +
        '</div>' +
      '</div>';

    // ── Flat list of learners ──────────────────────────────────────────────
    var list = '<div class="bulk-flat-list">' + apps.map(learnerRowHtml).join('') + '</div>';

    // ── Action zone: the two admit paths (Figma-matched copy; the PM #8). No Cancel
    //    button here — the WorkflowHeader's "Back to Queue" is the exit for this
    //    full-screen confirm step. ──
    var actionZone =
      '<div class="review-action-zone">' +
        '<div class="review-action-row">' +
          '<button class="tasty-btn is-bold is-ghost is-sm" id="bulk-confirm-hold-btn">Admit Only</button>' +
          '<button class="tasty-btn is-success is-sm is-full" id="bulk-confirm-btn">Admit &amp; Invite To Register For Courses</button>' +
        '</div>' +
      '</div>';

    mount.innerHTML =
      '<div class="review-page">' + identity +
        '<div class="review-body"><div class="bulk-elig-wrap">' +
          attest + list + actionZone +
        '</div></div>' +
      '</div>';

    document.getElementById('bulk-confirm-btn').addEventListener('click', confirmBulkApprove);
    document.getElementById('bulk-confirm-hold-btn').addEventListener('click', confirmBulkAdmitOnly);
  }
  window.renderBulkApproveScreen = renderBulkApproveScreen;

  /* Confirm bulk admit → commit + return to queue + toast.
     Hard rule (June 15): approving must NOT reset table view/pagination. */
  function confirmBulkApprove() {
    var ids = (currentActionIds || []).slice();
    if (ids.length === 0) return;
    var n = ids.length;
    ids.forEach(function(id) {
      var app = activeApps.find(function(a) { return a.id === id; });
      if (app) moveAppToWaiting(app);
    });
    activeApps = activeApps.filter(function(a) { return ids.indexOf(a.id) === -1; });
    ids.forEach(function(id){ selectedIds.delete(id); });
    renderTable();
    renderWaitingTable();
    if (typeof advSearch !== 'undefined' && advSearch.active && typeof renderAdvancedResults === 'function') renderAdvancedResults();
    showScreen('de');
    showToast(n + ' ' + (n === 1 ? 'application' : 'applications') + ' approved — Institution Review complete.', 'success');
  }
  window.confirmBulkApprove = confirmBulkApprove;

  /* "Admit Only": admit the selection but HOLD the registration invites; learners land
     in the Admitted bucket until unheld (PM review #8). */
  function confirmBulkAdmitOnly() {
    var ids = (currentActionIds || []).slice();
    if (ids.length === 0) return;
    var n = ids.length;
    ids.forEach(function(id) {
      var app = activeApps.find(function(a) { return a.id === id; });
      if (app) moveAppToAdmitted(app);
    });
    activeApps = activeApps.filter(function(a) { return ids.indexOf(a.id) === -1; });
    ids.forEach(function(id){ selectedIds.delete(id); });
    renderTable();
    renderAdmittedTable();
    refreshUnifiedPool();
    if (typeof advSearch !== 'undefined' && advSearch.active && typeof renderAdvancedResults === 'function') renderAdvancedResults();
    showScreen('de');
    showToast(n + ' ' + (n === 1 ? 'learner' : 'learners') + ' admitted, on hold until invited to register.', 'success');
  }
  window.confirmBulkAdmitOnly = confirmBulkAdmitOnly;
