/* scripts/app/invites-screen.js — the Invites top-level tab (PM review #7: an invite
   isn't an application yet, so pending invites moved out of the Applications table onto
   their own screen). Render + bulk resend relocated verbatim from segments.js; same DOM
   ids, markup now lives in #screen-invites. The Applications quick-search no longer
   filters this table (Global Search still covers invites via buildUnifiedAppPool). */

  /* ─── Invites table render ─── */
  var invitedSearchTerm = '';
  function _invitedRows() {
    var term = (invitedSearchTerm || '').toLowerCase();
    if (!term) return INVITED_FIXTURE;
    return INVITED_FIXTURE.filter(function(e) {
      return (e.firstName + ' ' + e.lastName + ' ' + (e.group || '') + ' ' + (e.college || '') + ' ' + (e.school || '')).toLowerCase().indexOf(term) !== -1;
    });
  }
  function renderInvitedTable() {
    var data = _invitedRows();

    var section = document.getElementById('invited-table-section');
    var pagEl   = document.getElementById('invited-pagination');
    var empty   = document.getElementById('invited-empty');
    var tbody   = document.getElementById('invited-tbody');
    if (!tbody) return;

    if (data.length === 0) {
      if (section) section.style.display = 'none';
      if (pagEl)   pagEl.style.display   = 'none';
      if (empty)   empty.style.display   = '';
      updateInvitedBulkBar();
      return;
    }

    var pg = invitedPag.paginate(data);
    var rows = '';
    pg.slice.forEach(function(e) {
      var invSel = selectedInvitedIds.has(e.id);
      rows += '<tr data-id="' + e.id + '"' + (invSel ? ' class="selected"' : '') + '>';
      rows += '<td class="col-check"><input type="checkbox" class="row-checkbox invited-row-cb" data-id="' + e.id + '"' + (invSel ? ' checked' : '') + '></td>';
      // Invited learners have no application ID yet (created when the invite is accepted), so no sub-line.
      rows += nameCells(e);
      rows += '<td style="font-size:13px;">' + (e.school || e.college) + '</td>';
      rows += '<td style="font-size:13px;">' + e.group + '</td>';
      rows += '<td style="font-size:12px;color:var(--c-text-muted);">' + e.dateInvited + '</td>';
      rows += '<td style="font-size:12px;color:var(--c-text-muted);">' + (e.lastSent || e.dateInvited) + '</td>';
      rows += '<td class="col-status-badge"><span class="tasty-status-tag is-sm is-solid is-primary">Invited</span></td>';
      rows += '<td class="col-actions"><div class="row-actions">' + viewAppBtn(e.id) + '<button class="tasty-btn is-bold is-ghost is-sm" onclick="resendInvitation(\'' + e.id + '\',\'' + (e.firstName + ' ' + e.lastName).replace(/'/g, "\\'") + '\')">Resend invitation</button></div></td>';
      rows += '</tr>';
    });
    tbody.innerHTML = rows;

    if (section) section.style.display = '';
    if (pagEl)   pagEl.style.display   = '';
    if (empty)   empty.style.display   = 'none';
    invitedPag.renderControls(pg.total, pg.pages, pg.start, pg.end, data.length);
    updateInvitedBulkBar();
  }

  /* Pending Invites header — search + Export (options kebab). */
  function exportInvited() {
    var rows = _invitedRows();
    if (!rows.length) { if (typeof showToast === 'function') showToast('No invites to export.', 'warning'); return; }
    var esc = (typeof deCsvEscape === 'function') ? deCsvEscape : function(v) { return v == null ? '' : String(v); };
    var header = ['Last Name', 'First Name', 'High School', 'Group', 'Date Invited', 'Last Sent', 'Status'];
    var lines = [header.map(esc).join(',')];
    rows.forEach(function(e) {
      lines.push([e.lastName, e.firstName, (e.school || e.college || ''), e.group, e.dateInvited, (e.lastSent || e.dateInvited), 'Invited'].map(esc).join(','));
    });
    if (typeof deDownloadCSV === 'function') deDownloadCSV(lines.join('\n'), 'pending-invites.csv');
    if (typeof showToast === 'function') showToast('Exported ' + rows.length + ' invite' + (rows.length === 1 ? '' : 's') + ' to CSV.', 'success');
  }
  (function wireInvitedHeader() {
    var input = document.getElementById('invited-search-input');
    var btn   = document.getElementById('invited-search-btn');
    function doSearch() { invitedSearchTerm = input ? input.value.trim() : ''; if (typeof invitedPag !== 'undefined') invitedPag.page = 1; renderInvitedTable(); }
    if (btn)   btn.addEventListener('click', doSearch);
    if (input) input.addEventListener('keydown', function(e) { if (e.key === 'Enter') doSearch(); });
    var exportBtn = document.getElementById('invited-export-btn');
    if (exportBtn) exportBtn.addEventListener('click', exportInvited);
  })();

  /* ─── Invited bulk resend — selection state, bar, and handlers ─── */
  function updateInvitedBulkBar() {
    var count = selectedInvitedIds.size;
    var bar   = document.getElementById('invited-bulk-bar');
    var badge = document.getElementById('invited-bulk-count');
    if (badge) badge.textContent = count;
    if (bar)   bar.style.display = count > 0 ? 'flex' : 'none';
    var saBtn = document.getElementById('invited-bulk-select-all');
    if (saBtn) {
      var allSel = INVITED_FIXTURE.length > 0 && selectedInvitedIds.size === INVITED_FIXTURE.length;
      saBtn.textContent = allSel ? 'Clear selection' : 'Select all ' + INVITED_FIXTURE.length;
    }
    var hcb = document.getElementById('invited-select-all-cb');
    if (hcb) {
      var visible = document.querySelectorAll('#invited-tbody .invited-row-cb');
      var checkedCount = document.querySelectorAll('#invited-tbody .invited-row-cb:checked').length;
      hcb.checked = visible.length > 0 && checkedCount === visible.length;
      hcb.indeterminate = checkedCount > 0 && checkedCount < visible.length;
    }
  }

  (function wireInvitedBulk() {
    var tbl = document.getElementById('invited-table');
    if (tbl) {
      tbl.addEventListener('change', function(e) {
        if (!e.target.classList.contains('invited-row-cb')) return;
        var id = e.target.dataset.id;
        if (e.target.checked) selectedInvitedIds.add(id); else selectedInvitedIds.delete(id);
        var row = e.target.closest('tr'); if (row) row.classList.toggle('selected', e.target.checked);
        updateInvitedBulkBar();
      });
    }
    var hcb = document.getElementById('invited-select-all-cb');
    if (hcb) hcb.addEventListener('change', function(e) {
      if (e.target.checked) INVITED_FIXTURE.forEach(function(x) { selectedInvitedIds.add(x.id); });
      else selectedInvitedIds.clear();
      renderInvitedTable();
    });
    var saBtn = document.getElementById('invited-bulk-select-all');
    if (saBtn) saBtn.addEventListener('click', function() {
      var allSel = INVITED_FIXTURE.length > 0 && selectedInvitedIds.size === INVITED_FIXTURE.length;
      if (allSel) selectedInvitedIds.clear();
      else INVITED_FIXTURE.forEach(function(x) { selectedInvitedIds.add(x.id); });
      renderInvitedTable();
    });
    var resendBtn = document.getElementById('invited-bulk-resend');
    if (resendBtn) resendBtn.addEventListener('click', function() {
      var ids = Array.from(selectedInvitedIds);
      var n = ids.length;
      if (n === 0) return;
      // Mock a flaky message service: ~1 in 4 sends fail (e.sendFails). Successful sends stamp
      // Last Sent with today; failed ones are left untouched so the column shows the miss.
      // We don't get per-invite delivery confirmation back in real usage, so the toast is
      // always a flat success message regardless of what happened underneath.
      var today = (typeof todayLabel === 'function') ? todayLabel() : 'Today';
      ids.forEach(function(id) {
        var e = INVITED_FIXTURE.find(function(x) { return x.id === id; });
        if (!e) return;
        if (!e.sendFails) e.lastSent = today;
      });
      selectedInvitedIds.clear();
      renderInvitedTable();
      showToast('Invitation sent', 'success');
    });
  })();
