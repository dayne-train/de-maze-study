/* scripts/app/bulk-upload.js — Add Multiple Learners: the bulk CSV upload wizard.
   The whole flow is faked (no real CSV parsing). Renders into #bulk-upload-mount.
   Step 1 (Upload File): faked file upload + delimiter type + learner-group select.
   Steps 2–4 (Map Columns / Validate Data / Finish) are added in later passes.
   Reached from the Add Learners DecisionTree "Add Multiple Learners" card. */

  var BULK_GROUPS = [
    'Fall 2026 Cohort - Dual Enrollment',
    'Spring 2027 Cohort - Dual Enrollment',
    'Fall 2026 - Early College Program',
    '2026-2027 Concurrent Enrollment',
    'Class of 2027 - Dual Enrollment',
    'Summer 2026 Bridge Cohort'
  ];
  var BULK_FILE_NAME = 'Learners-Fall2026_update.csv';

  /* Step 2 (Map Columns) faked data. Available system fields on the left; the file's
     column headers are the mapping options; first four fields auto-map (valid). */
  var BULK_MAP_COLUMNS = ['First Name', 'Middle Name', 'Last Name', 'Email', 'Phone Number', 'Date of Birth'];
  var BULK_MAP_SAMPLE = {
    'First Name': 'David', 'Middle Name': 'J', 'Last Name': 'Abella',
    'Email': 'd.abella@email.com', 'Phone Number': '(480) 555-0148', 'Date of Birth': 'Jan 29, 2010'
  };
  var BULK_MAP_FIELDS = [
    { field: 'First Name', req: true, col: 'First Name' },
    { field: 'Middle Name', req: false, col: 'Middle Name' },
    { field: 'Last Name', req: true, col: 'Last Name' },
    { field: 'Email', req: true, col: 'Email' },
    { field: 'Date Of Birth', req: false, col: null },
    { field: 'Phone Number', req: false, col: null },
    { field: 'Street Address 1', req: false, col: null },
    { field: 'Street Address 2', req: false, col: null },
    { field: 'City', req: false, col: null },
    { field: 'State/Province', req: false, col: null },
    { field: 'Zip/Postal Code', req: false, col: null },
    { field: 'Country', req: false, col: null }
  ];
  /* Step 3 (Validate Data) faked results. 35 rows → 3 errors → 32 valid learners.
     Default demo shows the error state; a dev-drawer toggle switches to success. */
  var BULK_TOTAL = 35;
  var BULK_ERRORS = [
    { row: 8,  msg: 'Data missing in required field Verified Student ID' },
    { row: 19, msg: 'Data missing in required field Date Of Birth' },
    { row: 27, msg: 'Invalid email format in required field Email' }
  ];

  var bulkState = null;
  var _bulkStep = 0;   // current wizard step (0-based) — used by the dev toggle + tracker nav

  function _bulkFresh() {
    return { file: null, delimiter: '', group: '', newGroup: '', creating: false, mapping: null, addedCount: 0 };
  }

  window.openBulkUpload = function () {
    bulkState = _bulkFresh();
    renderBulkUpload();
    showScreen('bulk-upload');
  };

  /* The wizard's shared 4-step ProgressTracker. `active` = 0-based current step;
     earlier steps render completed (check), later ones upcoming. Reused by every step. */
  function bulkTracker(active) {
    var steps = ['Upload File', 'Map Columns', 'Validate Data', 'Finish'];
    return '<div class="tasty-progress-tracker">' + steps.map(function (s, i) {
      var completed = i < active;
      var cls = completed ? ' is-completed' : (i === active ? ' is-active' : '');
      var node = completed ? '<span class="tcon" data-g="check"></span>' : String(i + 1);
      var goto = completed ? ' data-bulk-goto="' + i + '"' : '';   // completed steps are clickable (back-nav)
      return '<div class="tasty-progress-tracker__step' + cls + '"' + goto + '>' +
        '<span class="tasty-progress-tracker__node">' + node + '</span>' +
        '<span class="tasty-progress-tracker__lbl">' + s + '</span></div>';
    }).join('') + '</div>';
  }
  window.bulkTracker = bulkTracker;

  function renderBulkUpload() {
    var mount = document.getElementById('bulk-upload-mount');
    if (!mount) return;
    _bulkStep = 0;
    var groupItems = BULK_GROUPS.map(function (g) {
      return '<div class="tasty-menu__item" role="option" tabindex="0" data-group="' + g + '">' + g + '</div>';
    }).join('');

    mount.innerHTML =
      '<div class="bulk-card">' +
        '<div class="bulk-card__header">Invite Learners</div>' +
        '<div class="bulk-card__tracker">' + bulkTracker(0) + '</div>' +
        '<div class="bulk-card__body">' +
          '<div class="bulk-intro">' +
            '<h1>Let’s invite some learners!</h1>' +
            '<p>Here is an <span class="bulk-link" id="bulk-template-link">example Excel data template file</span> to reference how your data should be defined for learners.</p>' +
          '</div>' +

          '<div class="tasty-dropzone bulk-dropzone" id="bulk-dropzone">' +
            '<span class="bulk-dz__req"><span class="tcon" data-g="warning"></span> A file is required</span>' +
            '<span class="bulk-dz__prompt"><span class="tcon" data-g="upload"></span> Upload A File</span>' +
            '<span class="tasty-dropzone__hint">10MB Max File Size</span>' +
            '<span class="tasty-dropzone__types"><span class="tasty-dropzone__type">CSV</span><span class="tasty-dropzone__type">XLS</span><span class="tasty-dropzone__type">XLSX</span></span>' +
            '<span class="bulk-file"><span class="bulk-file__check tcon" data-g="check"></span> <span id="bulk-file-name"></span> <span class="bulk-file__remove" id="bulk-file-remove">Remove</span></span>' +
          '</div>' +

          '<div class="bulk-field">' +
            '<label class="bulk-field__label"><span class="req">*</span> Delimiter Type</label>' +
            '<div class="bulk-radios" id="bulk-delim">' +
              '<label class="tasty-radio" data-delim="comma"><span class="tasty-radio__dot"></span> Comma Delimited</label>' +
              '<label class="tasty-radio" data-delim="semicolon"><span class="tasty-radio__dot"></span> Semicolon Delimited</label>' +
              '<label class="tasty-radio" data-delim="tab"><span class="tasty-radio__dot"></span> Tab Delimited</label>' +
            '</div>' +
          '</div>' +

          '<div class="bulk-field">' +
            '<label class="bulk-field__label"><span class="req">*</span> Select Learner Group</label>' +
            '<div class="bulk-group">' +
              '<button type="button" class="bulk-select" id="bulk-group-trigger" data-tasty="menu" aria-haspopup="listbox" aria-expanded="false"><span id="bulk-group-label">Select</span> <span class="tcon" data-g="caret"></span></button>' +
              '<div class="tasty-menu" role="listbox">' + groupItems +
                '<hr class="tasty-divider" style="margin:6px 0;">' +
                '<div class="tasty-menu__item" role="option" tabindex="0" data-group="__new">Create a new group…</div>' +
              '</div>' +
            '</div>' +
            '<div class="bulk-newgroup" id="bulk-newgroup" hidden>' +
              '<input class="tasty-input" id="bulk-newgroup-input" placeholder="New group name">' +
              '<p class="bulk-help">What is this name used for? Providing a name for your learner group will help you to reference these learners in the future.</p>' +
            '</div>' +
          '</div>' +
        '</div>' +

        '<div class="bulk-card__foot">' +
          '<button class="tasty-btn is-primary is-md is-full" id="bulk-continue-btn" disabled>Continue</button>' +
          '<p class="bulk-reqnote"><span class="req">*</span> All items with a red asterisk are required.</p>' +
        '</div>' +
      '</div>';

    if (window.resolveTastyAssets) window.resolveTastyAssets(mount);
    wireBulkUpload(mount);
    wireBulkTracker(mount);
    _bulkRestoreUpload(mount);   // reflect prior state when returning via the tracker
  }

  /* Re-apply bulkState to the Step 1 DOM (used when navigating back to Upload File). */
  function _bulkRestoreUpload(mount) {
    if (bulkState.file) {
      mount.querySelector('#bulk-file-name').textContent = bulkState.file;
      mount.querySelector('#bulk-dropzone').classList.add('is-filled');
    }
    if (bulkState.delimiter) {
      var r = mount.querySelector('#bulk-delim .tasty-radio[data-delim="' + bulkState.delimiter + '"]');
      if (r) r.classList.add('is-checked');
    }
    var trigger = mount.querySelector('#bulk-group-trigger');
    if (bulkState.creating) {
      mount.querySelector('#bulk-group-label').textContent = 'Create a new group…';
      trigger.classList.add('is-selected');
      var ng = mount.querySelector('#bulk-newgroup'); if (ng) ng.hidden = false;
      var ngi = mount.querySelector('#bulk-newgroup-input'); if (ngi) ngi.value = bulkState.newGroup;
    } else if (bulkState.group) {
      mount.querySelector('#bulk-group-label').textContent = bulkState.group;
      trigger.classList.add('is-selected');
    }
    bulkGate(mount);
  }

  /* Completed tracker steps navigate back to that step. */
  function wireBulkTracker(mount) {
    mount.querySelectorAll('[data-bulk-goto]').forEach(function (s) {
      s.addEventListener('click', function () { goToBulkStep(parseInt(s.getAttribute('data-bulk-goto'), 10)); });
    });
  }
  function goToBulkStep(i) {
    if (i === 0) renderBulkUpload();
    else if (i === 1) renderBulkMap();
    else if (i === 2) renderBulkValidate();
  }
  window.goToBulkStep = goToBulkStep;

  function wireBulkUpload(mount) {
    var dz = mount.querySelector('#bulk-dropzone');
    var fileName = mount.querySelector('#bulk-file-name');

    // Dropzone → fake a CSV upload (there's no real file in the prototype).
    dz.addEventListener('click', function (e) {
      if (e.target.closest('#bulk-file-remove')) return;
      if (bulkState.file) return;
      bulkState.file = BULK_FILE_NAME;
      fileName.textContent = bulkState.file;
      dz.classList.add('is-filled');
      bulkGate(mount);
    });
    var remove = mount.querySelector('#bulk-file-remove');
    if (remove) remove.addEventListener('click', function (e) {
      e.stopPropagation();
      bulkState.file = null;
      dz.classList.remove('is-filled');
      bulkGate(mount);
    });

    // Delimiter radios (single-select).
    mount.querySelectorAll('#bulk-delim .tasty-radio').forEach(function (r) {
      r.addEventListener('click', function () {
        mount.querySelectorAll('#bulk-delim .tasty-radio').forEach(function (x) { x.classList.remove('is-checked'); });
        r.classList.add('is-checked');
        bulkState.delimiter = r.getAttribute('data-delim');
        bulkGate(mount);
      });
    });

    // Learner-group dropdown (kit .tasty-menu). Picking "Create a new group…" reveals a name input.
    var trigger = mount.querySelector('#bulk-group-trigger');
    var label = mount.querySelector('#bulk-group-label');
    var menu = mount.querySelector('.bulk-group .tasty-menu');
    var newGroup = mount.querySelector('#bulk-newgroup');
    mount.querySelectorAll('.tasty-menu__item[data-group]').forEach(function (it) {
      it.addEventListener('click', function () {
        var g = it.getAttribute('data-group');
        if (menu) menu.classList.remove('is-open');
        trigger.classList.add('is-selected');
        if (g === '__new') {
          bulkState.creating = true; bulkState.group = '';
          label.textContent = 'Create a new group…';
          newGroup.hidden = false;
          var ng = mount.querySelector('#bulk-newgroup-input'); if (ng) ng.focus();
        } else {
          bulkState.creating = false; bulkState.group = g; bulkState.newGroup = '';
          label.textContent = g;
          newGroup.hidden = true;
        }
        bulkGate(mount);
      });
    });
    var ngInput = mount.querySelector('#bulk-newgroup-input');
    if (ngInput) ngInput.addEventListener('input', function () { bulkState.newGroup = ngInput.value.trim(); bulkGate(mount); });

    var link = mount.querySelector('#bulk-template-link');
    if (link) link.addEventListener('click', function () { if (typeof showToast === 'function') showToast('Example template downloaded.', 'success'); });

    var cont = mount.querySelector('#bulk-continue-btn');
    cont.addEventListener('click', function () {
      if (cont.disabled) return;
      openBulkMap();
    });

    bulkGate(mount);
  }

  /* Continue is enabled only when a file, a delimiter, and a group (existing or new) are set. */
  function bulkGate(mount) {
    var groupOk = bulkState.creating ? !!bulkState.newGroup : !!bulkState.group;
    var ok = !!bulkState.file && !!bulkState.delimiter && groupOk;
    var cont = mount.querySelector('#bulk-continue-btn');
    if (cont) cont.disabled = !ok;
  }

  /* ─── Step 2: Map Columns ─── */
  window.openBulkMap = function () {
    if (!bulkState) bulkState = _bulkFresh();
    if (!bulkState.mapping) bulkState.mapping = BULK_MAP_FIELDS.map(function (f) { return { field: f.field, req: f.req, col: f.col }; });
    renderBulkMap();
    showScreen('bulk-upload');
  };

  function renderBulkMap() {
    var mount = document.getElementById('bulk-upload-mount');
    if (!mount) return;
    _bulkStep = 1;
    if (!bulkState.mapping) bulkState.mapping = BULK_MAP_FIELDS.map(function (f) { return { field: f.field, req: f.req, col: f.col }; });

    var colOptions = '<div class="tasty-menu__item" role="option" tabindex="0" data-col="__none">Not Mapped</div>' +
      BULK_MAP_COLUMNS.map(function (c) { return '<div class="tasty-menu__item" role="option" tabindex="0" data-col="' + c + '">' + c + '</div>'; }).join('');

    var rows = bulkState.mapping.map(function (m, idx) {
      var mapped = !!m.col;
      var label = mapped
        ? '<span class="bulk-map-select__label">' + m.col + '</span>'
        : '<span class="bulk-map-select__label is-placeholder">Not Mapped</span>';
      var sample = mapped ? (BULK_MAP_SAMPLE[m.col] || '') : '';
      return '<div class="bulk-map-row">' +
          '<div class="bulk-map-field">' + (m.req ? '<span class="req">*</span>' : '') + m.field + '</div>' +
          '<div class="bulk-map-cell">' +
            '<div class="bulk-map-select' + (mapped ? ' is-valid' : '') + '" data-tasty="menu" data-row="' + idx + '" aria-haspopup="listbox">' +
              '<span class="bulk-map-select__bar"></span>' +
              '<span class="bulk-map-select__check tcon" data-g="valid"></span>' +
              label +
              '<span class="bulk-map-select__caret tcon" data-g="caret"></span>' +
            '</div>' +
            '<div class="tasty-menu" role="listbox">' + colOptions + '</div>' +
          '</div>' +
          '<div class="bulk-map-sample">' + sample + '</div>' +
        '</div>';
    }).join('');

    mount.innerHTML =
      '<div class="bulk-card is-wide">' +
        '<div class="bulk-card__header">Invite Learners</div>' +
        '<div class="bulk-card__tracker">' + bulkTracker(1) + '</div>' +
        '<div class="bulk-card__body">' +
          '<div class="bulk-uploaded">Uploaded File: <span class="bulk-uploaded__name"><span class="tcon" data-g="document"></span> ' + (bulkState.file || BULK_FILE_NAME) + '</span></div>' +
          '<div class="tasty-banner bulk-map-banner"><span class="tasty-banner__icon"><span class="tcon" data-g="info"></span></span><span class="tasty-banner__message"><span class="tasty-banner__title">Data Mapping:</span>Each file column header can only be mapped once.</span></div>' +
          '<div class="bulk-map-table">' +
            '<div class="bulk-map-row is-head"><div>Available Fields</div><div>File Column Header</div><div>Sample Record</div></div>' +
            rows +
          '</div>' +
        '</div>' +
        '<div class="bulk-card__foot">' +
          '<button class="tasty-btn is-primary is-md is-full" id="bulk-save-btn" style="max-width:600px;">Save &amp; Process</button>' +
          '<p class="bulk-reqnote"><span class="req">*</span> All items with a red asterisk are required.</p>' +
        '</div>' +
      '</div>';

    if (window.resolveTastyAssets) window.resolveTastyAssets(mount);
    wireBulkMap(mount);
    wireBulkTracker(mount);
  }

  function wireBulkMap(mount) {
    mount.querySelectorAll('.bulk-map-cell').forEach(function (cell) {
      var sel = cell.querySelector('.bulk-map-select');
      var menu = cell.querySelector('.tasty-menu');
      var rowIdx = parseInt(sel.getAttribute('data-row'), 10);
      cell.querySelectorAll('.tasty-menu__item[data-col]').forEach(function (it) {
        it.addEventListener('click', function () {
          if (menu) menu.classList.remove('is-open');
          var col = it.getAttribute('data-col');
          bulkState.mapping[rowIdx].col = (col === '__none') ? null : col;
          _bulkUpdateMapRow(cell, sel, bulkState.mapping[rowIdx]);
          _bulkMapGate(mount);
        });
      });
    });
    var save = mount.querySelector('#bulk-save-btn');
    if (save) save.addEventListener('click', function () {
      if (save.disabled) return;
      openBulkValidate();
    });
    _bulkMapGate(mount);
  }

  function _bulkUpdateMapRow(cell, sel, m) {
    var mapped = !!m.col;
    sel.classList.toggle('is-valid', mapped);
    var label = sel.querySelector('.bulk-map-select__label');
    label.textContent = mapped ? m.col : 'Not Mapped';
    label.classList.toggle('is-placeholder', !mapped);
    var sample = cell.parentElement.querySelector('.bulk-map-sample');
    if (sample) sample.textContent = mapped ? (BULK_MAP_SAMPLE[m.col] || '') : '';
  }

  /* Save is enabled only when every required field is mapped to a column. */
  function _bulkMapGate(mount) {
    var ok = bulkState.mapping.every(function (m) { return !m.req || !!m.col; });
    var save = mount.querySelector('#bulk-save-btn');
    if (save) save.disabled = !ok;
  }

  /* ─── Step 3: Validate Data (error / success) ─── */
  window.openBulkValidate = function () {
    if (!bulkState) bulkState = _bulkFresh();
    renderBulkValidate();
    showScreen('bulk-upload');
  };

  function renderBulkValidate() {
    var mount = document.getElementById('bulk-upload-mount');
    if (!mount) return;
    _bulkStep = 2;
    var success = !!window.__bulkValidateSuccess;
    var errCount = BULK_ERRORS.length;
    bulkState.addedCount = success ? BULK_TOTAL : (BULK_TOTAL - errCount);   // learners the Finish step adds

    var body, foot;
    if (success) {
      body =
        '<div class="bulk-hero is-success">' +
          '<div class="bulk-hero__badge"><span class="tcon" data-g="valid"></span></div>' +
          '<div class="bulk-hero__text">' +
            '<p class="bulk-hero__count"><span class="big">' + BULK_TOTAL + '</span> out of <span class="big">' + BULK_TOTAL + '</span></p>' +
            '<p class="bulk-hero__headline">Records Validated Successfully</p>' +
            '<p class="bulk-hero__sub">All learners passed validation and are ready to be added.</p>' +
          '</div>' +
        '</div>';
      foot =
        '<div class="bulk-validate-foot">' +
          '<div class="tasty-banner bulk-map-banner"><span class="tasty-banner__icon"><span class="tcon" data-g="valid"></span></span><span class="tasty-banner__message"><span class="tasty-banner__title">Success:</span>All learners passed validation and are ready to be invited.</span></div>' +
          '<div class="bulk-validate-actions"><button class="tasty-btn is-primary is-md" id="bulk-validate-continue">Continue</button></div>' +
        '</div>';
    } else {
      var errRows = BULK_ERRORS.map(function (e) {
        return '<div class="bulk-err-row"><span class="bulk-err-icon tcon" data-g="warning"></span><span class="bulk-err-num">' + e.row + '</span><span class="bulk-err-msg">' + e.msg + '</span></div>';
      }).join('');
      body =
        '<div class="bulk-hero is-error">' +
          '<div class="bulk-hero__badge"><span class="tcon" data-g="warning"></span></div>' +
          '<div class="bulk-hero__text">' +
            '<p class="bulk-hero__count"><span class="big">' + errCount + '</span> out of <span class="big">' + BULK_TOTAL + '</span></p>' +
            '<p class="bulk-hero__headline">Errors Found In This File</p>' +
            '<p class="bulk-hero__sub">These errors will be ignored and any learners associated with this data will not be added.</p>' +
          '</div>' +
        '</div>' +
        '<div class="bulk-err-table">' +
          '<div class="bulk-err-row is-head"><span></span><span class="bulk-err-num">Row</span><span class="bulk-err-msg">Error</span></div>' +
          errRows +
        '</div>';
      foot =
        '<div class="bulk-validate-foot">' +
          '<div class="tasty-banner bulk-map-banner"><span class="tasty-banner__icon"><span class="tcon" data-g="warning"></span></span><span class="tasty-banner__message"><span class="tasty-banner__title">Errors:</span>You may continue using this file but learners with errors will not be invited.</span></div>' +
          '<div class="bulk-validate-actions">' +
            '<button class="tasty-btn is-ghost is-md" id="bulk-validate-newfile">Upload A New File</button>' +
            '<button class="tasty-btn is-primary is-md" id="bulk-validate-continue">Continue With Errors</button>' +
          '</div>' +
        '</div>';
    }

    mount.innerHTML =
      '<div class="bulk-card">' +
        '<div class="bulk-card__header">Learner Data Summary</div>' +
        '<div class="bulk-card__tracker">' + bulkTracker(2) + '</div>' +
        '<div class="bulk-card__body">' + body + '</div>' +
        foot +
      '</div>';

    if (window.resolveTastyAssets) window.resolveTastyAssets(mount);
    wireBulkTracker(mount);
    var cont = mount.querySelector('#bulk-validate-continue');
    if (cont) cont.addEventListener('click', function () { openBulkFinish(); });
    var nf = mount.querySelector('#bulk-validate-newfile');
    if (nf) nf.addEventListener('click', function () { renderBulkUpload(); });
  }
  window.renderBulkValidate = renderBulkValidate;

  /* ─── Step 4: Finish ─── */
  window.openBulkFinish = function () {
    if (!bulkState) bulkState = _bulkFresh();
    renderBulkFinish();
    showScreen('bulk-upload');
  };

  function renderBulkFinish() {
    var mount = document.getElementById('bulk-upload-mount');
    if (!mount) return;
    _bulkStep = 3;
    var n = bulkState.addedCount || (BULK_TOTAL - BULK_ERRORS.length);

    mount.innerHTML =
      '<div class="bulk-card">' +
        '<div class="bulk-card__header">Adding Learners</div>' +
        '<div class="bulk-card__tracker">' + bulkTracker(3) + '</div>' +
        '<div class="bulk-card__body bulk-finish-body">' +
          '<div class="bulk-finish-count"><span class="bulk-finish-count__num">' + n + '</span><span class="bulk-finish-count__lbl">Learners Being Added!</span></div>' +
          '<div class="bulk-finish-progress">' +
            '<div class="bulk-finish-progress__row">' +
              '<div class="tasty-progress is-success" style="flex:1;"><div class="tasty-progress__fill" id="bulk-finish-fill" style="width:0%;transition:width 3s linear;"></div></div>' +
              '<span class="bulk-finish-pct" id="bulk-finish-pct">0%</span>' +
            '</div>' +
            '<p class="bulk-finish-note" id="bulk-finish-note">Adding learners…</p>' +
          '</div>' +
        '</div>' +
        '<div class="bulk-card__foot">' +
          '<div class="bulk-finish-actions">' +
            '<button class="tasty-btn is-ghost is-md" id="bulk-finish-close" disabled>Finish &amp; Close</button>' +
            '<button class="tasty-btn is-success is-md" id="bulk-finish-invite" disabled>Finish &amp; Invite ' + n + ' Learners</button>' +
          '</div>' +
        '</div>' +
      '</div>';

    if (window.resolveTastyAssets) window.resolveTastyAssets(mount);
    wireBulkTracker(mount);

    var group = bulkState.creating ? bulkState.newGroup : bulkState.group;
    var closeBtn = mount.querySelector('#bulk-finish-close');
    var inviteBtn = mount.querySelector('#bulk-finish-invite');
    if (closeBtn) closeBtn.addEventListener('click', function () { if (!closeBtn.disabled) _bulkFinishClose(n, group); });
    if (inviteBtn) inviteBtn.addEventListener('click', function () { if (!inviteBtn.disabled) _bulkFinishInvite(n, group); });

    // Fill the progress bar over ~3s, then flip the note to "added" and enable the buttons.
    var fill = mount.querySelector('#bulk-finish-fill');
    var pctEl = mount.querySelector('#bulk-finish-pct');
    var note = mount.querySelector('#bulk-finish-note');
    setTimeout(function () { if (fill) fill.style.width = '100%'; }, 50);
    var pct = 0;
    var timer = setInterval(function () {
      pct += 2;
      if (pct >= 100) {
        pct = 100;
        clearInterval(timer);
        if (note) note.textContent = n + ' Learners Added Successfully';
        if (closeBtn) closeBtn.disabled = false;
        if (inviteBtn) inviteBtn.disabled = false;
      }
      if (pctEl) pctEl.textContent = pct + '%';
    }, 60);
  }
  window.renderBulkFinish = renderBulkFinish;

  /* Generate n fake learners (varied names + high schools) for the finish actions. */
  function _bulkGenPeople(n) {
    var F = ['Ava', 'Liam', 'Mia', 'Noah', 'Zoe', 'Ethan', 'Isla', 'Kai', 'Nora', 'Owen', 'Lila', 'Ravi', 'Sena', 'Theo', 'Uma', 'Vince'];
    var L = ['Bennett', 'Carter', 'Foster', 'Ramirez', 'Nguyen', 'Osei', 'Park', 'Silva', 'Turner', 'Walsh'];
    var SCH = ['Pioneer High School', 'Westview Academy', 'Eastside High', 'Central High School'];
    var out = [];
    for (var i = 0; i < n; i++) out.push({ id: String(70000 + i), first: F[i % F.length], last: L[i % L.length], school: SCH[i % SCH.length] });
    return out;
  }

  /* Finish & Invite → drop n pending invites into the roster's Invited list, land on
     Pending Invites with an "invited" toast. */
  function _bulkFinishInvite(n, group) {
    var ppl = _bulkGenPeople(n);
    if (typeof INVITED_FIXTURE !== 'undefined') {
      var rows = ppl.map(function (p) {
        return { id: p.id, firstName: p.first, lastName: p.last, school: p.school, college: 'West Valley Community College', group: group || '—', term: 'FALL 2026', course: null, dateInvited: 'Jul 28, 2026', lastSent: 'Jul 28, 2026' };
      });
      Array.prototype.unshift.apply(INVITED_FIXTURE, rows);
      if (typeof renderInvitedTable === 'function') renderInvitedTable();
    }
    showScreen('invites');
    if (typeof showToast === 'function') showToast(n + ' learners invited' + (group ? ' · ' + group : '') + '.', 'success');
  }

  /* Finish & Close → add n learners to the invite roster (not invited yet), land on
     Pending Invites with an "added" toast. */
  function _bulkFinishClose(n, group) {
    var ppl = _bulkGenPeople(n);
    if (typeof LEARNER_ROSTER !== 'undefined') {
      var rows = ppl.map(function (p) {
        return { id: p.id, lastName: p.last, firstName: p.first, middleName: '', initials: (p.first.charAt(0) + p.last.charAt(0)).toUpperCase(), school: p.school, classOf: 2027, dob: '', ssnLast4: '', missingData: false };
      });
      Array.prototype.unshift.apply(LEARNER_ROSTER, rows);
      if (typeof renderInviteLearners === 'function') renderInviteLearners();
    }
    showScreen('invites');
    if (typeof showToast === 'function') showToast(n + ' learners added' + (group ? ' to ' + group : '') + '.', 'success');
  }
