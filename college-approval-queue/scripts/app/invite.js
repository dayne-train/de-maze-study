/* scripts/app/invite.js — module split from former scripts/app.js (one IIFE, now dissolved to shared global scope). Invite wizard: state + renderInviteLearners/College/Groups + summary/cancel + window exposures.
   Load order is fixed in index.html; do not reorder casually. */
  /* ═══════════════════════════════════════════
     INVITE FLOW — State + render functions
     Flow: invite-learners → invite-college → invite-groups → summary modal → send
  ═══════════════════════════════════════════ */
  // College admin only ever invites to their own institution (WVCC), so the
  // "Select Institution" step is skipped and the college is pre-set.
  var inviteState = { selectedLearnerIds: new Set(), collegeKey: 'wvcc', selectedGroupIds: new Set() };

  function renderInviteLearners() {
    var tbody = document.getElementById('invite-learner-tbody');
    if (!tbody) return;

    var term = (document.getElementById('invite-search-input') ? document.getElementById('invite-search-input').value : '').toLowerCase();

    var rows = '';
    LEARNER_ROSTER.forEach(function(learner, i) {
      var checked = inviteState.selectedLearnerIds.has(learner.id) ? 'checked' : '';
      var disabledAttr = learner.missingData ? 'disabled' : '';

      var verifiedIdCell = '';
      if (learner.missingData) {
        verifiedIdCell = '<span style="color:var(--c-danger,#c0392b);display:inline-flex;align-items:center;gap:4px;font-size:13px;"><i class="ti ti-shield-x" style="font-size:14px;"></i>' + learner.id + '</span>';
      } else {
        verifiedIdCell = '<span style="color:var(--c-text-muted);display:inline-flex;align-items:center;gap:4px;font-size:13px;"><i class="ti ti-shield-check" style="color:var(--c-success);font-size:14px;"></i>' + learner.id + '</span>';
      }

      var actionsCell = '<div class="row-actions">' +
        (learner.missingData ? '<span class="missing-data-flag"><i class="ti ti-alert-triangle"></i> Missing Required Data</span>' : '') +
        '<button class="tasty-btn is-bold is-ghost is-sm btn-edit-learner" data-learner-id="' + learner.id + '">Edit</button>' +
      '</div>';

      var visible = true;
      if (term) {
        var haystack = (learner.firstName + ' ' + learner.lastName + ' ' + learner.id).toLowerCase();
        if (haystack.indexOf(term) === -1) visible = false;
      }
      var rowStyle = visible ? '' : ' style="display:none"';

      rows += '<tr data-learner-id="' + learner.id + '"' + rowStyle + '>';
      rows += '<td class="col-check"><input type="checkbox" class="row-checkbox invite-learner-cb" data-id="' + learner.id + '" ' + checked + ' ' + disabledAttr + '></td>';
      rows += '<td style="font-size:13px;font-weight:600;">' + learner.lastName + '</td>';
      rows += '<td style="font-size:13px;">' + learner.firstName + '</td>';
      rows += '<td>' + verifiedIdCell + '</td>';
      rows += '<td style="font-size:13px;color:var(--c-text-muted);">' + learner.dob + '</td>';
      rows += '<td style="font-size:13px;color:var(--c-text-muted);">' + learner.ssnLast4 + '</td>';
      rows += '<td style="font-size:13px;">' + learner.classOf + '</td>';
      rows += '<td class="col-actions">' + actionsCell + '</td>';
      rows += '</tr>';
    });

    tbody.innerHTML = rows;

    var visibleCount = tbody.querySelectorAll('tr:not([style*="display:none"])').length;
    var resultsLabel = document.getElementById('invite-results-label');
    if (resultsLabel) resultsLabel.innerHTML = 'SHOWING <strong>1–' + visibleCount + '</strong> OF <strong>' + visibleCount + '</strong>';

    tbody.querySelectorAll('.invite-learner-cb').forEach(function(cb) {
      cb.addEventListener('change', function() {
        var id = this.dataset.id;
        if (this.checked) {
          inviteState.selectedLearnerIds.add(id);
        } else {
          inviteState.selectedLearnerIds.delete(id);
        }
        updateInviteBulkBar();
      });
    });

    tbody.querySelectorAll('.btn-edit-learner').forEach(function(btn) {
      btn.addEventListener('click', function() {
        openEditLearner(this.dataset.learnerId);
      });
    });

    var selectAllCb = document.getElementById('invite-select-all-cb');
    if (selectAllCb) {
      selectAllCb.onchange = function() {
        var checked = this.checked;
        tbody.querySelectorAll('.invite-learner-cb:not(:disabled)').forEach(function(cb) {
          cb.checked = checked;
          var id = cb.dataset.id;
          if (checked) {
            inviteState.selectedLearnerIds.add(id);
          } else {
            inviteState.selectedLearnerIds.delete(id);
          }
        });
        updateInviteBulkBar();
      };
    }

    var selectAllBtn = document.getElementById('invite-select-all-btn');
    if (selectAllBtn) {
      selectAllBtn.onclick = function() {
        var allChecked = tbody.querySelectorAll('.invite-learner-cb:not(:disabled):not(:checked)').length === 0;
        tbody.querySelectorAll('.invite-learner-cb:not(:disabled)').forEach(function(cb) {
          cb.checked = !allChecked;
          var id = cb.dataset.id;
          if (!allChecked) {
            inviteState.selectedLearnerIds.add(id);
          } else {
            inviteState.selectedLearnerIds.delete(id);
          }
        });
        if (selectAllCb) selectAllCb.checked = !allChecked;
        updateInviteBulkBar();
      };
    }

    var proceedBtn = document.getElementById('invite-proceed-btn');
    if (proceedBtn) {
      proceedBtn.onclick = function() { inviteState.collegeKey = 'wvcc'; showScreen('invite-groups'); };
    }

    var searchBtn = document.getElementById('invite-search-btn');
    var searchInput = document.getElementById('invite-search-input');
    function doSearch() {
      var t = searchInput ? searchInput.value.toLowerCase() : '';
      var allRows = tbody.querySelectorAll('tr[data-learner-id]');
      var shown = 0;
      allRows.forEach(function(row) {
        var lid = row.dataset.learnerId;
        var learner = LEARNER_ROSTER.find(function(l) { return l.id === lid; });
        if (!learner) { row.style.display = 'none'; return; }
        var haystack = (learner.firstName + ' ' + learner.lastName + ' ' + learner.id).toLowerCase();
        if (!t || haystack.indexOf(t) !== -1) {
          row.style.display = '';
          shown++;
        } else {
          row.style.display = 'none';
        }
      });
      var resultsLabelEl = document.getElementById('invite-results-label');
      if (resultsLabelEl) resultsLabelEl.innerHTML = 'SHOWING <strong>1–' + shown + '</strong> OF <strong>' + shown + '</strong>';
    }
    if (searchBtn) searchBtn.onclick = doSearch;
    if (searchInput) {
      searchInput.onkeydown = function(e) { if (e.key === 'Enter') doSearch(); };
    }

    // Add Learners — opens the roster-add flow once built; toast placeholder until then.
    var addBtn = document.getElementById('invite-add-learners-btn');
    if (addBtn) addBtn.onclick = function() {
      if (typeof window.openAddLearners === 'function') window.openAddLearners();
      else if (typeof showToast === 'function') showToast('Add Learners flow coming soon.', 'info');
    };
    // Export the roster (the "people to invite" database) to CSV.
    var exportBtn = document.getElementById('invite-export-btn');
    if (exportBtn) exportBtn.onclick = exportRoster;

    updateInviteBulkBar();
  }

  /* Export the invite roster to CSV — reuses the shared CSV helpers from search.js. */
  function exportRoster() {
    var esc = (typeof deCsvEscape === 'function') ? deCsvEscape : function(v) { return v == null ? '' : String(v); };
    var header = ['Last Name', 'First Name', 'Verified ID', 'Date of Birth', 'Last 4 SSN', 'Expected Grad Year'];
    var lines = [header.map(esc).join(',')];
    LEARNER_ROSTER.forEach(function(l) {
      lines.push([l.lastName, l.firstName, l.id, l.dob, l.ssnLast4, l.classOf].map(esc).join(','));
    });
    var csv = lines.join('\n');
    if (typeof deDownloadCSV === 'function') deDownloadCSV(csv, 'invite-learners-roster.csv');
    if (typeof showToast === 'function') showToast('Exported ' + LEARNER_ROSTER.length + ' learners to CSV.', 'success');
  }

  /* Add Learners — the invite-learners "Add Learners" button opens the DecisionTree
     fork (single learner vs bulk CSV upload). */
  window.openAddLearners = function() { showScreen('add-learners'); };
  /* Branch targets (single-learner form / CSV bulk upload) are the next Figma
     screens — stubbed until they're built. */
  window.addLearnersChoice = function(kind) {
    if (kind === 'single') {
      if (typeof window.openAddLearner === 'function') window.openAddLearner();
      return;
    }
    if (typeof window.openBulkUpload === 'function') window.openBulkUpload();
  };

  function updateInviteBulkBar() {
    var count = inviteState.selectedLearnerIds.size;
    var bar = document.getElementById('invite-bulk-bar');
    var badge = document.getElementById('invite-bulk-badge');
    var proceedBtn = document.getElementById('invite-proceed-btn');
    var selectAllBtn = document.getElementById('invite-select-all-btn');
    if (bar) bar.style.display = count > 0 ? 'flex' : 'none';
    if (badge) badge.textContent = count;
    if (proceedBtn) {
      proceedBtn.disabled = count === 0;
      proceedBtn.style.opacity = count === 0 ? '0.45' : '1';
      proceedBtn.onclick = count > 0 ? function() { inviteState.collegeKey = 'wvcc'; showScreen('invite-groups'); } : null;
    }
    if (selectAllBtn) selectAllBtn.textContent = 'Select All (' + LEARNER_ROSTER.filter(function(l) { return !l.missingData; }).length + ')';
  }

  function renderInviteCollege() {
    var grid = document.getElementById('invite-college-grid');
    if (!grid) return;
    var html = '';
    Object.keys(COLLEGE_META).forEach(function(key) {
      var meta = COLLEGE_META[key];
      var selectedClass = inviteState.collegeKey === key ? ' selected' : '';
      var logoStyle = 'background:' + meta.color + ';';
      html += '<div class="college-tile' + selectedClass + '" data-key="' + key + '" onclick="inviteSelectCollege(\'' + key + '\')">';
      html += '<div class="college-tile-logo">' + meta.abbr + '</div>';
      html += '<div><p class="college-tile-name">' + meta.name + '</p><p class="college-tile-city">' + meta.city + '</p></div>';
      html += '</div>';
    });
    grid.innerHTML = html;
  }

  function inviteSelectCollege(key) {
    inviteState.collegeKey = key;
    inviteState.selectedGroupIds = new Set();
    var tiles = document.querySelectorAll('.college-tile');
    tiles.forEach(function(tile) {
      if (tile.dataset.key === key) {
        tile.classList.add('selected');
      } else {
        tile.classList.remove('selected');
      }
    });
    setTimeout(function() { showScreen('invite-groups'); }, 180);
  }

  function renderInviteGroups() {
    var key = inviteState.collegeKey;
    if (!key) return;
    var meta = COLLEGE_META[key];

    // College identity inside card
    var identity = document.getElementById('invite-groups-college-identity');
    if (identity) {
      identity.innerHTML =
        '<div class="invite-groups-college-logo">' + meta.abbr + '</div>' +
        '<div>' +
          '<p class="invite-groups-college-name">' + meta.name + '</p>' +
          '<p class="invite-groups-college-city">' + meta.city + '</p>' +
          '<a class="invite-groups-college-url" href="#"><i class="ti ti-external-link"></i> www.' + meta.abbr.toLowerCase() + '.edu</a>' +
        '</div>';
    }

    // Table rows
    var tbody = document.getElementById('invite-groups-tbody');
    if (!tbody) return;
    var groups = COLLEGE_GROUPS[key] || [];
    var rows = '';
    groups.forEach(function(group) {
      var checked = inviteState.selectedGroupIds.has(group.id) ? 'checked' : '';
      var rowCls = inviteState.selectedGroupIds.has(group.id) ? ' class="selected"' : '';
      rows += '<tr data-group-id="' + group.id + '"' + rowCls + '>';
      rows += '<td class="col-check"><input type="checkbox" class="row-checkbox invite-group-cb" data-id="' + group.id + '" ' + checked + '></td>';
      rows += '<td style="font-size:13px;font-weight:600;">' + group.name + '</td>';
      rows += '<td style="font-size:13px;color:var(--c-text-muted);max-width:420px;">' + group.description + '</td>';
      rows += '<td style="font-size:12px;color:var(--c-text-muted);white-space:nowrap;"><i class="ti ti-calendar" style="margin-right:4px;"></i>' + group.deadline + '</td>';
      rows += '</tr>';
    });
    tbody.innerHTML = rows;

    // Checkbox wiring
    tbody.querySelectorAll('.invite-group-cb').forEach(function(cb) {
      cb.addEventListener('change', function() {
        var id = this.dataset.id;
        var row = this.closest('tr');
        if (this.checked) {
          inviteState.selectedGroupIds.add(id);
          if (row) row.classList.add('selected');
        } else {
          inviteState.selectedGroupIds.delete(id);
          if (row) row.classList.remove('selected');
        }
        updateGroupsContinueBtn();
        updateGroupsSelectAllState();
      });
    });

    // Select-all checkbox
    var selectAllCb = document.getElementById('invite-groups-select-all-cb');
    if (selectAllCb) {
      selectAllCb.onchange = function() {
        var checked = this.checked;
        tbody.querySelectorAll('.invite-group-cb').forEach(function(cb) {
          cb.checked = checked;
          var id = cb.dataset.id;
          var row = cb.closest('tr');
          if (checked) {
            inviteState.selectedGroupIds.add(id);
            if (row) row.classList.add('selected');
          } else {
            inviteState.selectedGroupIds.delete(id);
            if (row) row.classList.remove('selected');
          }
        });
        updateGroupsContinueBtn();
      };
    }

    // Continue button
    var proceedBtn = document.getElementById('invite-groups-proceed-btn');
    if (proceedBtn) {
      proceedBtn.onclick = function() { showInviteSummary(); };
    }

    updateGroupsContinueBtn();
  }

  function updateGroupsContinueBtn() {
    var count = inviteState.selectedGroupIds.size;
    var btn = document.getElementById('invite-groups-proceed-btn');
    if (btn) btn.disabled = count === 0;
  }

  function updateGroupsSelectAllState() {
    var selectAllCb = document.getElementById('invite-groups-select-all-cb');
    if (!selectAllCb) return;
    var all = document.querySelectorAll('.invite-group-cb');
    var checked = document.querySelectorAll('.invite-group-cb:checked');
    selectAllCb.indeterminate = checked.length > 0 && checked.length < all.length;
    selectAllCb.checked = checked.length === all.length && all.length > 0;
  }

  function showInviteSummary() {
    var key = inviteState.collegeKey;
    var meta = COLLEGE_META[key];
    var learnerCount = inviteState.selectedLearnerIds.size;

    var learnerCountEl = document.getElementById('summary-learner-count');
    if (learnerCountEl) learnerCountEl.textContent = learnerCount;
    var learnerSubEl = document.getElementById('summary-learner-sub');
    if (learnerSubEl) learnerSubEl.textContent = 'learner' + (learnerCount !== 1 ? 's' : '') + ' selected';

    // White square logo matching TileMemberSelect / ImageMemberLogo
    var logoEl = document.getElementById('summary-college-logo');
    if (logoEl) { logoEl.textContent = meta.abbr; }
    var nameEl = document.getElementById('summary-college-name');
    if (nameEl) nameEl.textContent = meta.name;
    var cityEl = document.getElementById('summary-college-city');
    if (cityEl) cityEl.textContent = meta.city;

    var groups = COLLEGE_GROUPS[key] || [];
    var selectedGroups = groups.filter(function(g) { return inviteState.selectedGroupIds.has(g.id); });
    var groupsListEl = document.getElementById('summary-groups-list');
    if (groupsListEl) {
      var listHtml = '';
      selectedGroups.forEach(function(g) {
        listHtml += '<div class="summary-group-row">' + g.name + '</div>';
      });
      groupsListEl.innerHTML = listHtml;
    }

    var overlay = document.getElementById('invite-summary-overlay');
    if (overlay) overlay.classList.add('open');
  }

  function hideInviteSummary() {
    document.getElementById('invite-summary-overlay').classList.remove('open');
  }

  function sendInvitations() {
    hideInviteSummary();

    var key = inviteState.collegeKey;
    var meta = COLLEGE_META[key];
    var groups = COLLEGE_GROUPS[key] || [];
    var selectedGroups = groups.filter(function(g) { return inviteState.selectedGroupIds.has(g.id); });
    var groupNames = selectedGroups.map(function(g) { return g.name; }).join(', ');
    var learnerCount = inviteState.selectedLearnerIds.size;
    var selectedIds = Array.from(inviteState.selectedLearnerIds);

    /* Write the invites into the pending list: a new learner gets a fresh row
       (newest on top, matching the list's date-descending order); re-inviting
       someone already pending refreshes their row and bumps it up. */
    selectedIds.forEach(function(id) {
      var existingIdx = INVITED_FIXTURE.findIndex(function(e) { return e.id === id; });
      if (existingIdx > -1) {
        var row = INVITED_FIXTURE.splice(existingIdx, 1)[0];
        row.college = meta.name;
        row.group   = groupNames;
        if (selectedGroups.length) row.term = selectedGroups[0].term;
        row.dateInvited = todayLabel();
        row.lastSent = todayLabel();
        INVITED_FIXTURE.unshift(row);
        return;
      }
      var learner = LEARNER_ROSTER.find(function(l) { return l.id === id; });
      if (!learner) return;
      INVITED_FIXTURE.unshift({
        id: learner.id, lastName: learner.lastName, firstName: learner.firstName,
        college: meta.name,   /* no school: the college never asks for one, and the learner picks
                                 theirs from the exchange's high schools when they apply */
        group: groupNames, term: selectedGroups.length ? selectedGroups[0].term : '',
        course: null, dateInvited: todayLabel(), lastSent: todayLabel(), inviteType: 'apply'
      });
    });

    /* Land on a clean slate: any rows bulk-selected on the Pending Invites table
       BEFORE entering the wizard would otherwise still read as selected here,
       which looks like the flow selected them. */
    selectedInvitedIds.clear();
    invitedPag.page = 1;
    showScreen('invites');

    renderInvitedTable();
    updateInvitesWorkspaceCount();
    refreshUnifiedPool();

    showToast('Invitations sent to ' + learnerCount + ' learner' + (learnerCount !== 1 ? 's' : '') + '.', 'success');

    inviteState.selectedLearnerIds = new Set();
    inviteState.collegeKey = 'wvcc';
    inviteState.selectedGroupIds = new Set();
  }

  window.inviteSelectCollege = inviteSelectCollege;
  window.hideInviteSummary = hideInviteSummary;
  window.sendInvitations = sendInvitations;

  function showInviteCancelConfirm() {
    var overlay = document.getElementById('invite-cancel-overlay');
    if (overlay) overlay.classList.add('open');
  }
  function hideInviteCancelConfirm() {
    var overlay = document.getElementById('invite-cancel-overlay');
    if (overlay) overlay.classList.remove('open');
  }
  function confirmInviteCancel() {
    hideInviteCancelConfirm();
    inviteState.selectedLearnerIds = new Set();
    inviteState.collegeKey = 'wvcc';
    inviteState.selectedGroupIds = new Set();
    exitInviteFlow();
  }
  window.showInviteCancelConfirm = showInviteCancelConfirm;
  window.hideInviteCancelConfirm = hideInviteCancelConfirm;
  window.confirmInviteCancel = confirmInviteCancel;

  /* Path remembrance: the invite workflow is reachable from the Workspace card and the
     Pending Invites screen; Back (step 1) and the cancel-confirm return wherever you
     entered from. Mirrors the review screen's review-back-btn convention. */
  function openInviteFlow() {
    var cur = document.querySelector('.screen.active');
    window.__inviteOrigin = (cur && cur.id === 'screen-invites') ? 'invites' : 'dashboard';
    showScreen('invite-learners');
    var btn = document.getElementById('invite-back-btn');
    if (btn) btn.innerHTML = '<i class="ti ti-chevron-left"></i> Back to ' +
      (window.__inviteOrigin === 'invites' ? 'Pending Invites' : 'Workspace');
  }
  function exitInviteFlow() {
    showScreen(window.__inviteOrigin === 'invites' ? 'invites' : 'dashboard');
  }
  window.openInviteFlow = openInviteFlow;
  window.exitInviteFlow = exitInviteFlow;
