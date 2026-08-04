/* scripts/app/segments.js — module split from former scripts/app.js (one IIFE, now dissolved to shared global scope). Segmented control: Waiting/Active/Denied table renders, switchSegment. (Invited render + bulk resend relocated to invites-screen.js: PM review #7.)
   Load order is fixed in index.html; do not reorder casually. */
  /* ─── Segmented control ─── */
  /* ─── Waiting tab render — counselor approved, awaiting consent and/or institution ─── */
  /* Sub-status text (no chrome) — shared by the table badges + the detail rail so
     they never drift. Waiting = which approval(s) are still owed. */
  function waitingSubText(a) {
    // Three ordered sub-states, mutually exclusive: awaiting guardian consent →
    // (gates cleared) awaiting institution review → (institution done) awaiting the
    // learner to complete course registration.
    if (a.awaitingRegistration) return 'Awaiting learner registration';
    // Only surface the guardian-consent wait if this network requires it.
    if (a.awaitingConsent && _gateOn('guardianConsent')) return 'Awaiting guardian consent';
    // Likewise institution review: with that gate off there is no college step to
    // wait on, so everything past the high school is waiting on the learner instead.
    if (!_gateOn('institutionReview')) return 'Awaiting learner registration';
    return 'Awaiting institution review';
  }
  function closedSubText(a) {
    if (a.kind === 'cancelled') return 'Cancelled';
    if (a.deniedState === 'Institution Review') return 'Denied by institution';
    if (a.deniedState === 'Counselor Review')   return 'Denied by high school';
    if (a.deniedState === 'Guardian Consent')   return 'Declined by guardian';
    return 'Denied';
  }
  function waitingBadgeHTML(a) {
    // Icon follows the same precedence as waitingSubText, including the
    // institution-review gate, so badge glyph and label never disagree.
    var icon = a.awaitingRegistration            ? '<i class="ti ti-user-edit"></i> '
             : (a.awaitingConsent && _gateOn('guardianConsent')) ? '<i class="ti ti-clock"></i> '
             : !_gateOn('institutionReview')     ? '<i class="ti ti-user-edit"></i> '
             :                                     '<i class="ti ti-building-bank"></i> ';
    return '<span class="tasty-status-tag is-sm is-solid is-primary">' + icon + waitingSubText(a) + '</span>';
  }
  function renderWaitingTable() {
    var t = searchTerm.toLowerCase();
    var filtered = waitingBucket().filter(function(a) {
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
      var college = COLLEGES[a.institution] || a.institution;
      rows += '<tr data-id="' + a.id + '">';
      rows += nameCells(a);
      rows += '<td class="col-appid">' + a.id + '</td>';
      rows += '<td style="font-size:13px;">' + college + '</td>';
      rows += '<td class="col-hs" style="font-size:13px;">' + (a.school || '—') + '</td>';
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
    waitingPag.renderControls(pg.total, pg.pages, pg.start, pg.end, WAITING_APPS.length);
  }

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
      var college = COLLEGES[a.institution] || a.institution;
      rows += '<tr data-id="' + a.id + '">';
      rows += nameCells(a);
      rows += '<td class="col-appid">' + a.id + '</td>';
      rows += '<td style="font-size:13px;">' + college + '</td>';
      rows += '<td class="col-hs" style="font-size:13px;">' + (a.school || '—') + '</td>';
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

  /* Closed-bucket badge: cancellations stay neutral; denials name the party that
     said no (deniedState → high school vs institution). Guardian-consent declines
     and anything else fall back to a plain "Denied". */
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
      var college = COLLEGES[a.institution] || a.institution;
      rows += '<tr data-id="' + a.id + '">';
      rows += nameCells(a);
      rows += '<td class="col-appid">' + a.id + '</td>';
      rows += '<td style="font-size:13px;">' + college + '</td>';
      rows += '<td class="col-hs" style="font-size:13px;">' + (a.school || '—') + '</td>';
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
    if (key === 'waiting') renderWaitingTable();    if (key === 'active')  renderActiveTable();
    if (key === 'denied')  renderDeniedTable();
  }
  window.switchSegment = switchSegment;
