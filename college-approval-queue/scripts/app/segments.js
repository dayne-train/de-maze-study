/* scripts/app/segments.js — module split from former scripts/app.js (one IIFE, now dissolved to shared global scope). Segmented control: Admitted/Waiting/Active/Denied table renders, admitted bulk invite-to-register, switchSegment. (Invited render + bulk resend relocated to invites-screen.js: PM review #7.)
   Load order is fixed in index.html; do not reorder casually. */
  /* ─── Segmented control ─── */
  /* ─── Waiting tab render — WVCC reviewed; now blocked on the HS counselor
     and/or guardian consent (never on "institution" — that's our own step).
     Plus the post-admission edge case: admitted, registration not open yet. ─── */
  /* Sub-status text (no chrome) — shared by the table badges, the detail rail, and
     search so they never drift. The college waits on the HS side (parent consent +
     counselor approval), plus the post-admit "registration not open yet" edge. */
  function waitingSubText(a) {
    if (a.awaitingRegistration) return 'Awaiting learner registration';
    // Only surface a wait for a gate this network actually requires.
    var consent   = a.awaitingConsent   && _gateOn('guardianConsent');
    var counselor = a.awaitingCounselor && _gateOn('counselorApproval');
    if (consent && counselor) return 'Awaiting approvals';
    if (consent)              return 'Awaiting guardian consent';
    if (counselor)            return 'Awaiting high school approval';
    // With institution review off the college owes nothing, so what remains is the
    // learner completing registration.
    if (!_gateOn('institutionReview')) return 'Awaiting learner registration';
    return 'Awaiting college review';
  }
  function closedSubText(a) {
    if (a.kind === 'cancelled') return 'Cancelled';
    if (a.deniedState === 'Institution Review') return 'Denied by institution';
    if (a.deniedState === 'Counselor Review')   return 'Denied by high school';
    if (a.deniedState === 'Guardian Consent')   return 'Declined by guardian';
    return 'Denied';
  }
  function waitingBadgeHTML(a) {
    var consent   = a.awaitingConsent   && _gateOn('guardianConsent');
    var counselor = a.awaitingCounselor && _gateOn('counselorApproval');
    var icon = 'ti-clock', cls = 'is-primary';
    if (consent && counselor) cls = 'is-warning';
    else if (!a.awaitingRegistration && !consent) icon = 'ti-user-check';
    return '<span class="tasty-status-tag is-sm is-solid ' + cls + '"><i class="ti ' + icon + '"></i> ' + waitingSubText(a) + '</span>';
  }
  function renderWaitingTable() {
    var t = searchTerm.toLowerCase();
    var _waiting = waitingBucket();
    var filtered = _waiting.filter(function(a) {
      if (!t) return true;
      return appHaystack(a).indexOf(t) !== -1;
    });
    var section = document.getElementById('waiting-table-section');
    var empty   = document.getElementById('waiting-empty');
    var pagEl   = document.getElementById('waiting-pagination');
    var tbody   = document.getElementById('waiting-tbody');
    if (!tbody) return;
    if (filtered.length === 0) {
      if (section) section.style.display = 'none';
      if (pagEl)   pagEl.style.display = 'none';
      if (empty)   empty.style.display = '';
      return;
    }
    if (t) waitingPag.page = 1;
    var pg = waitingPag.paginate(filtered);
    var rows = '';
    pg.slice.forEach(function(a) {
      var hs = a.school;
      rows += '<tr data-id="' + a.id + '">';
      rows += nameCells(a);
      rows += '<td class="col-appid">' + a.id + '</td>';
      rows += '<td style="font-size:13px;">' + hs + '</td>';
      rows += '<td style="font-size:13px;">' + groupCellHTML(a) + '</td>';
      rows += '<td style="font-size:12px;color:var(--c-text-muted);">' + a.submitted + '</td>';
      rows += '<td class="col-status-badge">' + waitingBadgeHTML(a) + '</td>';
      rows += '<td class="col-actions">' + viewAppBtn(a.id) + '</td>';
      rows += '</tr>';
    });
    tbody.innerHTML = rows;
    if (section) section.style.display = '';
    if (empty)   empty.style.display   = 'none';
    if (pagEl)   pagEl.style.display   = '';
    waitingPag.renderControls(pg.total, pg.pages, pg.start, pg.end, _waiting.length);
  }

  /* ─── Admitted tab render: admitted-on-hold learners (PM review #8) ─── */
  function renderAdmittedTable() {
    var t = searchTerm.toLowerCase();
    var filtered = ALL_ADMITTED_APPS.filter(function(a) {
      if (!t) return true;
      return appHaystack(a).indexOf(t) !== -1;
    });
    var section = document.getElementById('admitted-table-section');
    var empty   = document.getElementById('admitted-empty');
    var pagEl   = document.getElementById('admitted-pagination');
    var tbody   = document.getElementById('admitted-tbody');
    if (!tbody) return;
    if (filtered.length === 0) {
      if (section) section.style.display = 'none';
      if (pagEl)   pagEl.style.display = 'none';
      if (empty)   empty.style.display = '';
      updateAdmittedBulkBar();
      return;
    }
    if (t) admittedPag.page = 1;
    var pg = admittedPag.paginate(filtered);
    var rows = '';
    pg.slice.forEach(function(a) {
      var sel = selectedAdmittedIds.has(a.id);
      rows += '<tr data-id="' + a.id + '"' + (sel ? ' class="selected"' : '') + '>';
      rows += '<td class="col-check"><input type="checkbox" class="row-checkbox admitted-row-cb" data-id="' + a.id + '"' + (sel ? ' checked' : '') + '></td>';
      rows += nameCells(a);
      rows += '<td class="col-appid">' + a.id + '</td>';
      rows += '<td style="font-size:13px;">' + a.school + '</td>';
      rows += '<td style="font-size:13px;">' + groupCellHTML(a) + '</td>';
      rows += '<td style="font-size:12px;color:var(--c-text-muted);">' + a.admittedDate + '</td>';
      rows += '<td class="col-status-badge"><span class="tasty-status-tag is-sm is-solid is-primary">Admitted</span></td>';
      rows += '<td class="col-actions"><div class="row-actions">' + viewAppBtn(a.id) + '<button class="tasty-btn is-bold is-ghost is-sm" onclick="inviteAdmittedToRegister(\'' + a.id + '\')">Invite to register</button></div></td>';
      rows += '</tr>';
    });
    tbody.innerHTML = rows;
    if (section) section.style.display = '';
    if (empty)   empty.style.display   = 'none';
    if (pagEl)   pagEl.style.display   = '';
    admittedPag.renderControls(pg.total, pg.pages, pg.start, pg.end, ALL_ADMITTED_APPS.length);
    updateAdmittedBulkBar();
  }

  function updateAdmittedBulkBar() {
    var count = selectedAdmittedIds.size;
    var bar   = document.getElementById('admitted-bulk-bar');
    var badge = document.getElementById('admitted-bulk-count');
    if (badge) badge.textContent = count;
    if (bar)   bar.style.display = count > 0 ? 'flex' : 'none';
    var saBtn = document.getElementById('admitted-bulk-select-all');
    if (saBtn) {
      var allSel = ALL_ADMITTED_APPS.length > 0 && selectedAdmittedIds.size === ALL_ADMITTED_APPS.length;
      saBtn.textContent = allSel ? 'Clear selection' : 'Select all ' + ALL_ADMITTED_APPS.length;
    }
    var hcb = document.getElementById('admitted-select-all-cb');
    if (hcb) {
      var visible = document.querySelectorAll('#admitted-tbody .admitted-row-cb');
      var checkedCount = document.querySelectorAll('#admitted-tbody .admitted-row-cb:checked').length;
      hcb.checked = visible.length > 0 && checkedCount === visible.length;
      hcb.indeterminate = checkedCount > 0 && checkedCount < visible.length;
    }
  }

  (function wireAdmittedBulk() {
    var tbl = document.getElementById('admitted-table');
    if (tbl) {
      tbl.addEventListener('change', function(e) {
        if (!e.target.classList.contains('admitted-row-cb')) return;
        var id = e.target.dataset.id;
        if (e.target.checked) selectedAdmittedIds.add(id); else selectedAdmittedIds.delete(id);
        var row = e.target.closest('tr'); if (row) row.classList.toggle('selected', e.target.checked);
        updateAdmittedBulkBar();
      });
    }
    var hcb = document.getElementById('admitted-select-all-cb');
    if (hcb) hcb.addEventListener('change', function(e) {
      if (e.target.checked) ALL_ADMITTED_APPS.forEach(function(x) { selectedAdmittedIds.add(x.id); });
      else selectedAdmittedIds.clear();
      renderAdmittedTable();
    });
    var saBtn = document.getElementById('admitted-bulk-select-all');
    if (saBtn) saBtn.addEventListener('click', function() {
      var allSel = ALL_ADMITTED_APPS.length > 0 && selectedAdmittedIds.size === ALL_ADMITTED_APPS.length;
      if (allSel) selectedAdmittedIds.clear();
      else ALL_ADMITTED_APPS.forEach(function(x) { selectedAdmittedIds.add(x.id); });
      renderAdmittedTable();
    });
    var invBtn = document.getElementById('admitted-bulk-invite');
    if (invBtn) invBtn.addEventListener('click', function() {
      var ids = Array.from(selectedAdmittedIds);
      if (ids.length === 0) return;
      ids.forEach(function(id) {
        var app = ALL_ADMITTED_APPS.find(function(a) { return a.id === id; });
        if (app) moveAdmittedToWaiting(app);
      });
      selectedAdmittedIds.clear();
      renderAdmittedTable();
      renderWaitingTable();
      updateSegmentCounts();
      refreshUnifiedPool();
      showToast(ids.length + ' learner' + (ids.length === 1 ? '' : 's') + ' invited to register.', 'success');
    });
  })();

  /* Row-level unhold. NOTE: "invite to register" is NOT "invite to apply"; it reuses
     the Waiting pipeline (ready-to-register sub-state), no pending-invite record. */
  window.inviteAdmittedToRegister = function(id) {
    var app = ALL_ADMITTED_APPS.find(function(a) { return a.id === id; });
    if (!app) return;
    moveAdmittedToWaiting(app);
    selectedAdmittedIds.delete(id);
    renderAdmittedTable();
    renderWaitingTable();
    updateSegmentCounts();
    refreshUnifiedPool();
    showToast(app.firstName + ' ' + app.lastName + ' invited to register.', 'success');
  };

  /* ─── Active tab render ─── */
  function renderActiveTable() {
    var t = searchTerm.toLowerCase();
    var filtered = ALL_ACTIVE_APPS.filter(function(a) {
      if (!t) return true;
      return appHaystack(a).indexOf(t) !== -1;
    });
    var section = document.getElementById('active-table-section');
    var empty   = document.getElementById('active-empty');
    var pagEl   = document.getElementById('active-pagination');
    var tbody   = document.getElementById('active-tbody');
    if (!tbody) return;
    if (filtered.length === 0) {
      if (section) section.style.display = 'none';
      if (pagEl)   pagEl.style.display = 'none';
      if (empty)   empty.style.display = '';
      return;
    }
    if (t) activePag.page = 1;
    var pg = activePag.paginate(filtered);
    var rows = '';
    pg.slice.forEach(function(a) {
      var hs = a.school;
      rows += '<tr data-id="' + a.id + '">';
      rows += nameCells(a);
      rows += '<td class="col-appid">' + a.id + '</td>';
      rows += '<td style="font-size:13px;">' + hs + '</td>';
      rows += '<td style="font-size:13px;">' + groupCellHTML(a) + '</td>';
      rows += '<td class="col-course" style="font-size:13px;">' + courseCellHTML(a) + '</td>';
      rows += '<td style="font-size:12px;color:var(--c-text-muted);">' + a.enrolledDate + '</td>';
      rows += '<td class="col-status-badge"><span class="tasty-status-tag is-sm is-solid is-success">Registered</span></td>';
      rows += '<td class="col-actions">' + viewAppBtn(a.id) + '</td>';
      rows += '</tr>';
    });
    tbody.innerHTML = rows;
    if (typeof markTruncatedCourses === 'function') markTruncatedCourses(tbody);
    if (section) section.style.display = '';
    if (empty)   empty.style.display   = 'none';
    if (pagEl)   pagEl.style.display   = '';
    activePag.renderControls(pg.total, pg.pages, pg.start, pg.end, ALL_ACTIVE_APPS.length);
  }

  function closedBadgeHTML(a) {
    if (a.kind === 'cancelled') return '<span class="tasty-status-tag is-sm">Cancelled</span>';
    return '<span class="tasty-status-tag is-sm is-solid is-error">' + closedSubText(a) + '</span>';
  }
  /* ─── Denied tab render ─── */
  function renderDeniedTable() {
    var t = searchTerm.toLowerCase();
    var filtered = ALL_DENIED_APPS.filter(function(a) {
      if (!t) return true;
      return appHaystack(a).indexOf(t) !== -1;
    });
    var section = document.getElementById('denied-table-section');
    var empty   = document.getElementById('denied-empty');
    var pagEl   = document.getElementById('denied-pagination');
    var tbody   = document.getElementById('denied-tbody');
    if (!tbody) return;
    if (filtered.length === 0) {
      if (section) section.style.display = 'none';
      if (pagEl)   pagEl.style.display = 'none';
      if (empty)   empty.style.display = '';
      return;
    }
    if (t) deniedPag.page = 1;
    var pg = deniedPag.paginate(filtered);
    var rows = '';
    pg.slice.forEach(function(a) {
      var hs = a.school;
      rows += '<tr data-id="' + a.id + '">';
      rows += nameCells(a);
      rows += '<td class="col-appid">' + a.id + '</td>';
      rows += '<td style="font-size:13px;">' + hs + '</td>';
      rows += '<td style="font-size:13px;">' + groupCellHTML(a) + '</td>';
      rows += '<td style="font-size:12px;color:var(--c-text-muted);">' + a.deniedDate + '</td>';
      rows += '<td class="col-status-badge">' + closedBadgeHTML(a) + '</td>';
      rows += '<td class="col-actions"><div class="row-actions">' + viewAppBtn(a.id) + '<button class="tasty-btn is-bold is-ghost is-sm" onclick="showDenialReason(\'' + a.id + '\')">View reason</button></div></td>';
      rows += '</tr>';
    });
    tbody.innerHTML = rows;
    if (section) section.style.display = '';
    if (empty)   empty.style.display   = 'none';
    if (pagEl)   pagEl.style.display   = '';
    deniedPag.renderControls(pg.total, pg.pages, pg.start, pg.end, ALL_DENIED_APPS.length);
  }

  function switchSegment(key) {
    // Clicking a segment tab while in advanced-search mode exits it.
    if (typeof advSearch !== 'undefined' && advSearch.active) {
      advSearch.active = false;
      advSearch.criteria = emptyAdvCriteria();
      advSearch.results = [];
      var resScreen = document.getElementById('adv-results-screen');
      if (resScreen) resScreen.classList.remove('active');
      var segCtl = document.getElementById('seg-control');
      if (segCtl) segCtl.style.display = '';
      document.querySelectorAll('.seg-panel').forEach(function(p) { p.style.display = ''; });
    }
    document.querySelectorAll('.seg-panel').forEach(function(p) { p.classList.remove('active'); });
    document.querySelectorAll('.tasty-navtoggle__item').forEach(function(b) { b.classList.remove('is-active'); });
    var panel = document.getElementById('seg-panel-' + key);
    if (panel) panel.classList.add('active');
    var btns = document.querySelectorAll('.tasty-navtoggle__item');
    btns.forEach(function(b) {
      if (b.getAttribute('onclick') && b.getAttribute('onclick').indexOf(key) !== -1) b.classList.add('is-active');
    });
    if (key === 'admitted') renderAdmittedTable();
    if (key === 'waiting') renderWaitingTable();    if (key === 'active')  renderActiveTable();
    if (key === 'denied')  renderDeniedTable();
  }
  window.switchSegment = switchSegment;
