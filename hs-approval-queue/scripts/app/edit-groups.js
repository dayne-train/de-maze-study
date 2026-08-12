/* scripts/app/edit-groups.js — Edit Groups screen.
   Assign which COLLEGE_GROUPS an approved learner can access. Reached from the
   application detail view's Group(s) edit button; Save reflects everywhere.
   Load order: after review.js (needs findAppAnywhere/escapeHtml) and data files. */

  var _egAppId = null;
  var _egSelected = [];   // working set of selected group ids (discarded on Cancel)

  function _egApp() {
    var f = (typeof findAppAnywhere === 'function') && findAppAnywhere(_egAppId);
    return f ? f.app : null;
  }
  function _egGroups(app) {
    return (typeof COLLEGE_GROUPS !== 'undefined' && COLLEGE_GROUPS[app.institution]) || [];
  }

  window.openEditGroups = function(appId) {
    _egAppId = appId;
    var app = _egApp();
    if (!app) return;
    _egSelected = getAppGroups(app)
      .map(function(g) { return g.id; })
      .filter(function(id) { return id && id !== '_legacy'; });
    renderEditGroups();
    showScreen('edit-groups');
  };

  function renderEditGroups() {
    var app = _egApp();
    if (!app) return;
    var meta   = (typeof COLLEGE_META !== 'undefined' && COLLEGE_META[app.institution]) ||
                 { name: (typeof COLLEGES !== 'undefined' && COLLEGES[app.institution]) || '', city: '', abbr: '?', color: '#555' };
    var groups = _egGroups(app);

    var rows = groups.map(function(g) {
      var checked = _egSelected.indexOf(g.id) > -1;
      return '<tr data-eg-row="' + g.id + '"' + (checked ? ' class="selected"' : '') + '>' +
        '<td class="col-check"><label class="tasty-checkbox' + (checked ? ' is-checked' : '') + '" data-eg-check="' + g.id + '">' +
          '<span class="tasty-checkbox__box">' + (checked ? '<i class="ti ti-check"></i>' : '') + '</span></label></td>' +
        '<td class="eg-group">' + escapeHtml(g.name) + '</td>' +
        '<td class="eg-term">' + escapeHtml(g.term) + '</td>' +
        '<td class="eg-desc">' + escapeHtml(g.description) + '</td>' +
        '<td class="eg-deadline"><i class="ti ti-calendar"></i>' + escapeHtml(g.deadline) + '</td>' +
      '</tr>';
    }).join('');

    /* One bordered card holding the whole task — banded "Assign To Group" head, the
       institution the groups belong to, the table, and the actions. Same container as the
       invite flow's "Select A Group" step (`.invite-groups-card`), because the two screens
       are the same job seen from different entry points and were drawn that way in Figma
       (node 17447-93862). Shared CSS shades the identity row and the footer on both. */
    var html =
      '<div class="editgroups">' +
        '<div class="tasty-section-header">' +
          '<span class="tasty-section-header__graphic"><span data-tasty-illus="manage-learner-fill" alt=""></span></span>' +
          '<div>' +
            '<div class="tasty-section-header__title">Edit Groups</div>' +
            '<div class="tasty-section-header__sub">Select which group(s) to give the approved learner access to</div>' +
          '</div>' +
        '</div>' +
        '<div class="invite-groups-card">' +
          '<div class="invite-groups-card-header">Assign To Group</div>' +
          '<div class="invite-groups-card-body">' +
            '<div class="invite-groups-college-identity">' +
              '<div class="invite-groups-college-logo" style="color:' + meta.color + ';">' + escapeHtml(meta.abbr) + '</div>' +
              '<div>' +
                '<p class="invite-groups-college-name">' + escapeHtml(meta.name) + '</p>' +
                '<p class="invite-groups-college-city">' + escapeHtml(meta.city) + '</p>' +
                '<a class="invite-groups-college-url" href="#"><i class="ti ti-external-link"></i> www.' +
                  escapeHtml(String(meta.abbr).toLowerCase()) + '.edu</a>' +
              '</div>' +
            '</div>' +
            '<h3 class="invite-groups-section-heading">Available Groups</h3>' +
            '<div class="queue-table-wrap" style="margin:0;">' +
              '<table class="queue-table is-stackable editgroups-table" data-primary-col="group">' +
                '<thead><tr>' +
                  '<th class="col-check"><label class="tasty-checkbox" id="eg-select-all"><span class="tasty-checkbox__box"></span></label></th>' +
                  '<th><span class="th-inner">Group</span></th>' +
                  '<th><span class="th-inner">Term</span></th>' +
                  '<th><span class="th-inner">Description</span></th>' +
                  '<th><span class="th-inner">Registration Deadline</span></th>' +
                '</tr></thead>' +
                '<tbody>' + rows + '</tbody>' +
              '</table>' +
            '</div>' +
          '</div>' +
          '<div class="invite-groups-card-footer">' +
            '<button class="tasty-btn is-bold is-ghost is-md" id="eg-cancel-btn">Cancel</button>' +
            '<button class="tasty-btn is-success is-md" id="eg-save-btn">Save</button>' +
          '</div>' +
        '</div>' +
      '</div>';

    var mount = document.getElementById('edit-groups-content');
    mount.innerHTML = html;
    if (typeof resolveTastyAssets === 'function') resolveTastyAssets(mount);
    /* This screen builds its table from scratch every time it opens, so it misses the pass that
       stamps column names and field labels at load. Without them a narrow layout hides headers
       whose cells stay put, and the stacked rows below the mobile breakpoint have no labels to
       render. Stamping also attaches the watcher that keeps them in step from here on. */
    if (typeof stackTableRows === 'function') stackTableRows(mount);

    /* Row checkbox toggles */
    mount.querySelectorAll('[data-eg-check]').forEach(function(cb) {
      cb.addEventListener('click', function() {
        var id = cb.getAttribute('data-eg-check');
        var i = _egSelected.indexOf(id);
        if (i > -1) _egSelected.splice(i, 1); else _egSelected.push(id);
        _egPaint(cb, _egSelected.indexOf(id) > -1);
        _egUpdateSelectAll(groups);
      });
    });
    /* Select-all (header) */
    var selAll = document.getElementById('eg-select-all');
    selAll.addEventListener('click', function() {
      var allOn = _egSelected.length === groups.length;
      _egSelected = allOn ? [] : groups.map(function(g) { return g.id; });
      mount.querySelectorAll('[data-eg-check]').forEach(function(cb) {
        _egPaint(cb, _egSelected.indexOf(cb.getAttribute('data-eg-check')) > -1);
      });
      _egUpdateSelectAll(groups);
    });
    _egUpdateSelectAll(groups);

    /* Header Back / Cancel + footer Cancel / Save */
    var backBtn = document.getElementById('edit-groups-back-btn');
    if (backBtn) backBtn.onclick = _egClose;
    var hCancel = document.getElementById('edit-groups-cancel-btn');
    if (hCancel) hCancel.onclick = _egClose;
    document.getElementById('eg-cancel-btn').addEventListener('click', _egClose);
    document.getElementById('eg-save-btn').addEventListener('click', _egSave);
  }

  function _egPaint(cb, on) {
    cb.classList.toggle('is-checked', on);
    cb.querySelector('.tasty-checkbox__box').innerHTML = on ? '<i class="ti ti-check"></i>' : '';
    /* .selected is how a queue-table row shows it is picked; keep it with the box. */
    var row = cb.closest && cb.closest('tr');
    if (row) row.classList.toggle('selected', on);
  }
  function _egUpdateSelectAll(groups) {
    var sel = document.getElementById('eg-select-all');
    if (!sel) return;
    var box = sel.querySelector('.tasty-checkbox__box');
    sel.classList.remove('is-checked', 'is-indeterminate');
    if (_egSelected.length === 0)            { box.innerHTML = ''; }
    else if (_egSelected.length === groups.length) { sel.classList.add('is-checked');        box.innerHTML = '<i class="ti ti-check"></i>'; }
    else                                     { sel.classList.add('is-indeterminate'); box.innerHTML = '<i class="ti ti-minus"></i>'; }
  }

  function _egClose() {
    showScreen('review', _egAppId);   // discard working set; back to the detail
  }
  function _egSave() {
    var app = _egApp();
    if (app) {
      app.groupIds = _egSelected.slice();
      // Keep the legacy primary group/term in sync (table/search read app.group).
      var primary = getAppGroups(app)[0];
      if (primary && primary.id !== '_legacy') { app.group = primary.name; app.term = primary.term; }
      if (typeof renderTable === 'function')        renderTable();
      if (typeof renderWaitingTable === 'function') renderWaitingTable();
      if (typeof renderActiveTable === 'function')  renderActiveTable();
      if (typeof renderDeniedTable === 'function')  renderDeniedTable();
      if (typeof showToast === 'function') showToast('Group access updated.', 'success');
    }
    showScreen('review', _egAppId);   // re-renders the detail with the new groups
  }
