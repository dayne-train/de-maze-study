/* scripts/app/bulk.js — Bulk-approve workflow step + bulk-bar wiring + per-institution
   requirements modal. NO eligibility gate (June 15 simplification): approving = attesting.
   Network-first (Corey review #1, Jul 1): grouped by institution with a per-section
   requirements link — leads with the exchange network, not a flat learner list. Chips/links
   open the per-institution requirements modal — single modal on top of a screen, no nesting.
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
     BULK APPROVE WORKFLOW STEP — attestation + per-institution requirements
     This IS the confirmation step (no follow-up confirmation modal). Click Approve →
     commit + return to queue + toast. (Single approve still uses the inline-accordion
     modal in approve-consent.js; only bulk routes here.)
  ═══════════════════════════════════════════ */

  /* Group selected apps by their teaching institution. No issues / gating. */
  function buildBulkModel() {
    var ids  = currentActionIds || [];
    var apps = activeApps.filter(function(a) { return ids.indexOf(a.id) > -1; });
    var order = [], groups = {};
    apps.forEach(function(a, i) {
      var inst = a.institution;
      if (!groups[inst]) { groups[inst] = []; order.push(inst); }
      groups[inst].push({ app: a, colorIdx: i });
    });
    return { apps: apps, order: order, groups: groups };
  }

  /* Avatar + name + meta (no status pill — there's no eligibility gate anymore).
     Avatar is the DS Tasty .tasty-persona-icon (single brand color, 40px round). */
  function learnerRowHtml(x) {
    var a = x.app;
    return '<div class="bulk-elig-row">' +
      '<span class="tasty-persona-icon">' + escapeHtml(a.initials) + '</span>' +
      '<div class="bulk-elig-info">' +
        '<div class="bulk-elig-name">' + escapeHtml(a.lastName) + ', ' + escapeHtml(a.firstName) + '</div>' +
        '<div class="bulk-elig-sub">' + escapeHtml(a.course || a.group) + ' &middot; ' + escapeHtml(a.id) + '</div>' +
      '</div>' +
    '</div>';
  }

  function renderBulkApproveScreen() {
    var m = buildBulkModel();
    var n = m.apps.length;
    var mount = document.getElementById('bulk-approve-content');
    if (!mount) return;
    if (n === 0) { mount.innerHTML = ''; return; }

    var multiNet = m.order.length > 1;
    var netNames = m.order.map(function(i){ return COLLEGES[i] || i; });

    // ── Identity strip: count + statement of intent ─────────────────────────
    var statement = multiNet
      ? '<strong>' + n + ' learners</strong> across <strong>' + m.order.length + ' teaching institutions</strong> selected for approval.'
      : '<strong>' + n + ' ' + (n === 1 ? 'learner' : 'learners') + '</strong> selected for approval to ' + escapeHtml(netNames[0]) + '.';
    var identity =
      '<div class="review-identity">' +
        '<div class="review-identity-left">' +
          '<div class="review-member-logo"><div class="review-member-logo-inner review-member-logo-inner--count">' + n + '</div></div>' +
          '<p class="review-identity-statement">' + statement + '</p>' +
        '</div>' +
        '<div class="review-identity-divider"></div>' +
        '<div class="review-identity-right">' +
          '<div class="review-id-kv"><span class="review-id-kv-label">' + (multiNet ? 'Institutions:' : 'Institution:') + '</span>' +
            '<span class="review-id-kv-value">' + (multiNet ? m.order.length + ' institutions' : escapeHtml(netNames[0])) + '</span></div>' +
        '</div>' +
      '</div>';

    // ── Attestation banner ────────────────────────────────────────────────
    var attest =
      '<div class="bulk-attest">' +
        '<i class="ti ti-shield-check"></i>' +
        '<div class="bulk-attest-text">' +
          'By approving, <strong>you confirm on behalf of your school that ' +
          (n === 1 ? 'this learner meets' : 'these learners meet') +
          ' the receiving institution&rsquo;s published eligibility requirements</strong>. ' +
          'College coursework will appear on each learner&rsquo;s permanent transcript.' +
        '</div>' +
      '</div>';

    // ── Body: grouped by institution (network-first) ──────────────────────
    var body = m.order.map(function(inst) {
      var grp = m.groups[inst];
      var rows = grp.map(learnerRowHtml).join('');
      return '<div class="bulk-net">' +
        '<div class="bulk-net-head">' +
          '<div>' +
            '<div class="bulk-net-name">' + escapeHtml(COLLEGES[inst] || inst) + '</div>' +
            '<div class="bulk-net-meta">' + grp.length + ' ' + (grp.length === 1 ? 'learner' : 'learners') + '</div>' +
          '</div>' +
          '<button class="bulk-req-link" data-req-inst="' + inst + '">' +
            '<i class="ti ti-info-circle"></i>View eligibility requirements</button>' +
        '</div>' +
        rows +
      '</div>';
    }).join('');

    // ── Action zone: Cancel / Approve N Learners ─────────────────────────
    var actionZone =
      '<div class="review-action-zone">' +
        '<div class="review-action-row">' +
          '<button class="tasty-btn is-bold is-ghost is-sm" id="bulk-cancel-btn">Cancel</button>' +
          '<button class="tasty-btn is-success is-sm" id="bulk-confirm-btn">' +
            '<i class="ti ti-shield-check"></i> Approve ' + n + ' ' + (n === 1 ? 'Learner' : 'Learners') +
          '</button>' +
        '</div>' +
      '</div>';

    mount.innerHTML =
      '<div class="review-page">' + identity +
        '<div class="review-body"><div class="bulk-elig-wrap">' +
          attest + body + actionZone +
        '</div></div>' +
      '</div>';

    // Wire chip/link clicks → per-institution requirements modal (single modal on screen)
    mount.querySelectorAll('[data-req-inst]').forEach(function(el) {
      el.addEventListener('click', function() {
        openReqModalForInstitution(this.getAttribute('data-req-inst'));
      });
    });
    document.getElementById('bulk-confirm-btn').addEventListener('click', confirmBulkApprove);
    document.getElementById('bulk-cancel-btn').addEventListener('click', function() { showScreen('de'); });
  }
  window.renderBulkApproveScreen = renderBulkApproveScreen;

  /* Confirm bulk approve → commit + return to queue + toast.
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
    showToast(n + ' ' + (n === 1 ? 'application' : 'applications') + ' approved and forwarded to institution review.', 'success');
  }
  window.confirmBulkApprove = confirmBulkApprove;

  /* ─── Per-institution requirements modal (used by review screen + bulk chips/links) ─── */
  function openReqModal(id) {
    var lookupId = id || currentReviewId;
    var _reviewApp = ALL_APPS.find(function(a) { return a.id === lookupId; });
    var _inst   = (_reviewApp && _reviewApp.institution) || 'wvcc';
    openReqModalForInstitution(_inst);
  }

  /* On-demand eligibility requirements, keyed by network (used by bulk approve). */
  function openReqModalForInstitution(_inst) {
    var r       = COLLEGE_REQS[_inst] || COLLEGE_REQS.wvcc;
    var college = COLLEGES[_inst] || _inst;
    var items   = r.reqs.map(function(req, i) {
      return '<li class="req-modal-item">' +
        '<div class="req-modal-num">' + (i + 1) + '</div>' +
        '<div>' +
          '<p class="req-modal-label">' + req.label + '</p>' +
          '<p class="req-modal-desc">' + req.desc + '</p>' +
        '</div>' +
      '</li>';
    }).join('');

    var html = '<div class="tasty-modal-overlay open" id="req-modal-overlay">' +
      '<div class="tasty-modal is-md" role="dialog" aria-modal="true" aria-labelledby="req-modal-title">' +
        '<div class="tasty-modal__head">' +
          '<div>' +
            '<h2 class="tasty-modal__title" id="req-modal-title">Eligibility Requirements</h2>' +
            '<p class="tasty-modal__submeta">' + college + '</p>' +
          '</div>' +
          '<button class="tasty-modal__x" id="req-modal-close" aria-label="Close"><i class="ti ti-x"></i></button>' +
        '</div>' +
        '<div class="tasty-modal__body">' +
          '<ol class="req-modal-list">' + items + '</ol>' +
        '</div>' +
      '</div>' +
    '</div>';

    var mount = document.getElementById('req-modal-mount') || document.getElementById('bulk-req-mount');
    mount.innerHTML = html;

    function closeReqModal() { mount.innerHTML = ''; }
    document.getElementById('req-modal-close').addEventListener('click', closeReqModal);
    document.getElementById('req-modal-overlay').addEventListener('click', function(e) {
      if (e.target.id === 'req-modal-overlay') closeReqModal();
    });
    document.addEventListener('keydown', function escHandler(e) {
      if (e.key === 'Escape') { closeReqModal(); document.removeEventListener('keydown', escHandler); }
    });
  }
