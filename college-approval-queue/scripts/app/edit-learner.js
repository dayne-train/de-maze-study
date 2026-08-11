/* scripts/app/edit-learner.js — Edit Learner screen (invite flow).
   Reached from the invite-learners table Edit button. Prefills from LEARNER_ROSTER,
   has optional reveal toggles (mailing address, guardian info) and a dynamic
   enrolled -> graduated -> grad-year chain. Save is gated on the visible required
   fields; saving returns to the invite-learners screen. Load after invite.js. */

  var _elLearnerId = null;
  var _elMode = 'edit';   // 'edit' (existing roster learner) | 'add' (new blank learner)

  function _elLearner() {
    return (typeof LEARNER_ROSTER !== 'undefined') &&
      LEARNER_ROSTER.find(function(l) { return l.id === _elLearnerId; });
  }
  // Kit field markup — simple: label-span + input + msg-span. No manual vicon/control wrapper;
  // the kit validator (tasty-interactions.js) auto-wraps the input and injects the check/alert vicon.
  function _elField(label, required, inner) {
    return '<label class="tasty-field">' +
      '<span class="tasty-field__label">' + label + (required ? ' <span class="req">*</span>' : '') + '</span>' +
      inner + '<span class="tasty-field__msg"></span></label>';
  }
  // Label-less .tasty-field — for grouped inputs under one shared label (e.g. First/Middle/Last under
  // "Name When Enrolled"); the placeholder is the cue. Still gets the validator's green-check / red.
  function _elBareField(inner) {
    return '<label class="tasty-field">' + inner + '<span class="tasty-field__msg"></span></label>';
  }
  function _elInput(key, required, attrs, value) {
    attrs = attrs || '';
    var rules = [];
    if (required) rules.push('required');
    if (/type="email"/.test(attrs)) rules.push('email');           // infer the email rule from the type
    var dv = rules.length ? ' data-validate="' + rules.join(' ') + '"' : '';
    return '<input class="tasty-input" data-el="' + key + '"' + dv +
      ' ' + attrs + ' value="' + (value ? String(value).replace(/"/g, '&quot;') : '') + '">';
  }
  /* The high schools this college serves, read from the fixture that already lists them so
     the form cannot drift from the queue's own idea of who is in the exchange. */
  function _elSchools() {
    try {
      if (typeof HS_COUNSELORS !== 'undefined') return Object.keys(HS_COUNSELORS);
    } catch (e) {}
    return [];
  }

  function _elSelect(key, required, opts, revealKey, value) {
    var o = '<option value="">Select</option>' + opts.map(function(v) {
      return '<option' + (v === value ? ' selected' : '') + '>' + v + '</option>';
    }).join('');
    return '<select class="tasty-input" data-el="' + key + '"' + (required ? ' data-validate="required"' : '') +
      (revealKey ? ' data-el-reveal="' + revealKey + '"' : '') + '>' + o + '</select>';
  }

  window.openEditLearner = function(learnerId) {
    _elMode = 'edit';
    _elLearnerId = learnerId;
    var l = _elLearner();
    if (!l) return;
    renderEditLearner(l);
    showScreen('edit-learner');
  };

  // Add a brand-new learner — reuses the Edit Learner UI with all fields empty and no
  // status banner. Reached from the Add Learners DecisionTree "Add One Learner" card.
  function _elNewId() {
    var n = '';
    for (var i = 0; i < 5; i++) n += Math.floor(Math.random() * 10);
    return n;
  }
  window.openAddLearner = function() {
    _elMode = 'add';
    _elLearnerId = _elNewId();
    renderEditLearner(null);
    showScreen('edit-learner');
  };

  /* Dev helper — complete the Edit Learner form's outstanding fields so a presenter
     doesn't have to type during a walkthrough (mirrors the learner app's fill buttons).
     Only fills empty, visible inputs, so on-file values and hidden optional blocks are
     left untouched; runs the kit validator so the completed fields read green. */
  window.devFillEditLearner = function() {
    var root = document.querySelector('.editlearner');
    if (!root) return;
    var VALS = {
      firstName: 'Jordan', middleName: 'Alexis', lastName: 'Rivera',
      curFirst: 'Jordan', curMiddle: 'Alexis', curLast: 'Rivera',
      dob: '09 / 12 / 2008', mobile: '(480) 555-0142',
      street: '742 Mesquite Drive', city: 'Scottsdale', state: 'AZ', zip: '85005',
      gName: 'David Cumberland', gEmail: 'david.cumberland@email.com'
    };
    root.querySelectorAll('[data-el]').forEach(function(el) {
      var key = el.getAttribute('data-el');
      if (VALS[key] != null && el.offsetParent !== null && !el.value) el.value = VALS[key];
    });
    if (typeof window.validateField === 'function') {
      root.querySelectorAll('.tasty-field').forEach(function(f) { window.validateField(f); });
    }
    if (typeof showToast === 'function') showToast('Learner form filled', 'success');
  };

  function renderEditLearner(l) {
    var isAdd = (_elMode === 'add') || !l;
    if (isAdd) l = { id: _elLearnerId, firstName: '', middleName: '', lastName: '', dob: '', ssnLast4: '', classOf: '', missingData: true };
    var email = isAdd ? '' : (l.firstName + '.' + l.lastName + '@gmail.com').toLowerCase().replace(/\s+/g, '');
    var dob   = (!isAdd && l.dob && l.dob !== 'n/o') ? l.dob : '';
    var ssn   = (!isAdd && l.ssnLast4 && l.ssnLast4 !== 'n/o') ? l.ssnLast4 : '';

    // Add mode opens fully blank with no banner. Edit mode: a learner NOT flagged missingData
    // has every required field on file → prefill so the form opens satisfied (all green, Save
    // enabled); a missingData learner leaves the outstanding required fields blank so gaps show.
    var complete   = !isAdd && !l.missingData;
    var gradClass  = l.classOf || 2026;
    var pStartYear = complete ? '2026' : '';
    var pEnrolled  = complete ? 'Yes' : '';
    var pGraduated = complete ? 'No'  : '';
    var pGradYear  = complete ? ('06 / 01 / ' + gradClass) : '';
    var statusBanner = isAdd ? '' : (complete
      ? '<div class="tasty-banner is-success editlearner-status"><span class="tasty-banner__icon"><span data-tasty-icon="check" data-size="18"></span></span><span class="tasty-banner__message">All required information is on file for this learner.</span></div>'
      : '<div class="tasty-banner is-warning editlearner-status"><span class="tasty-banner__icon"><span data-tasty-icon="warning" data-size="18"></span></span><span class="tasty-banner__message">This learner is missing required information. Complete the highlighted fields below.</span></div>');
    var headTitle = isAdd ? 'Add Learner' : 'Edit Learner';
    var saveLabel = isAdd ? 'Add Learner' : 'Save Learner Record';
    var backTo    = isAdd ? 'add-learners' : 'invite-learners';

    var html =
      '<div class="editlearner">' +
        '<div class="editlearner-card">' +
          '<div class="editlearner-card-head">' + headTitle + '</div>' +
          '<div class="editlearner-cardbody">' +
            statusBanner +

            '<div class="editlearner-verifiedid">Verified ID ' +
              '<span class="editlearner-id-badge"><span class="tcon" data-g="verified"></span> ' + escapeHtml(l.id) + '</span>' +
              '<button class="editlearner-change" type="button">Change</button></div>' +

            '<label class="tasty-field__label">Name When Enrolled</label>' +
            '<div class="tasty-form__row" style="margin-bottom:10px;">' +
              _elBareField(_elInput('firstName', true, 'placeholder="First Name"', l.firstName)) +
              _elBareField(_elInput('middleName', false, 'placeholder="Middle Name"', l.middleName)) +
              _elBareField(_elInput('lastName', true, 'placeholder="Last Name"', l.lastName)) +
            '</div>' +
            '<label class="editlearner-check"><input type="checkbox" data-el-toggle="diffname"> Current name is different than name when enrolled</label>' +
            '<div class="editlearner-reveal" data-el-block="diffname" hidden style="margin-top:10px;">' +
              '<div class="tasty-form__row">' +
                _elBareField(_elInput('curFirst', false, 'placeholder="Current First Name"', '')) +
                _elBareField(_elInput('curMiddle', false, 'placeholder="Current Middle Name"', '')) +
                _elBareField(_elInput('curLast', false, 'placeholder="Current Last Name"', '')) +
              '</div>' +
            '</div>' +

            '<div class="tasty-form__row">' +
              _elField("Date Of Birth", true, _elInput('dob', true, 'placeholder="MM / DD / YYYY"', dob)) +
              _elField("Mobile Number", false, _elInput('mobile', false, 'placeholder="555-345-6789"', '')) +
            '</div>' +

            /* Which high school — this college serves six of them, and the roster now has a
               column for it, so a learner added here has to be able to say which one rather
               than silently inheriting a default. Options come from the schools this fork
               already knows about. */
            /* Optional on purpose: some learners on this roster have no high school behind them
               yet — the college holds the record, but there is no enrollment — and the roster
               shows that as a dash. Requiring it here would make a state the data supports
               impossible to enter. */
            _elField("High School", false, _elSelect('school', false, _elSchools(), null, (l && l.school) || '')) +

            _elField("Learner's Email", true, _elInput('email', true, 'type="email"', email)) +

            '<div class="editlearner-grid-2 editlearner-toggles">' +
              '<button class="editlearner-addlink" type="button" data-el-toggle="mailing"><span class="tcon" data-g="add"></span> Add Learner&#39;s Mailing Address</button>' +
              '<button class="editlearner-addlink" type="button" data-el-toggle="guardian"><span class="tcon" data-g="add"></span> Add Parent/Legal Guardian Info</button>' +
            '</div>' +
            '<div class="editlearner-reveal" data-el-block="mailing" hidden>' +
              _elField("Street Address", false, _elInput('street', false, '', '')) +
              '<div class="tasty-form__row">' +
                _elField("City", false, _elInput('city', false, '', '')) +
                _elField("State", false, _elInput('state', false, '', '')) +
                _elField("ZIP", false, _elInput('zip', false, '', '')) +
              '</div>' +
            '</div>' +
            '<div class="editlearner-reveal" data-el-block="guardian" hidden>' +
              '<div class="tasty-form__row">' +
                _elField("Guardian Name", false, _elInput('gName', false, '', '')) +
                _elField("Guardian Email", false, _elInput('gEmail', false, 'type="email"', '')) +
              '</div>' +
            '</div>' +

            '<div class="tasty-form__row">' +
              _elField("Last 4 SSN", false, '<span class="editlearner-ssn">' + _elInput('ssn', false, 'maxlength="4"', ssn) + '<span class="tcon" data-g="preview"></span></span>') +
              _elField("Ethnicity", false, _elSelect('ethnicity', false, ['Prefer not to say', 'Hispanic or Latino', 'Asian', 'Black or African American', 'White', 'Two or more'])) +
            '</div>' +

            '<div class="tasty-form__row">' +
              _elField("Start Year", true, _elInput('startYear', true, 'placeholder="2026"', pStartYear)) +
              _elField("State Student ID", false, _elInput('stateId', false, '', '')) +
              _elField("Current GPA", false, _elInput('gpa', false, 'placeholder="3.0"', '')) +
            '</div>' +

            _elField("Is Learner Currently Enrolled?", true, _elSelect('enrolled', true, ['Yes', 'No'], 'graduate', pEnrolled)) +

            '<div class="editlearner-reveal" data-el-block="graduate" hidden>' +
              _elField("Did This Learner Graduate?", true, _elSelect('graduated', true, ['Yes', 'No'], 'gradyear', pGraduated)) +
            '</div>' +
            '<div class="editlearner-reveal" data-el-block="gradyear" hidden>' +
              _elField("Expected Graduation/Leave Year", true, _elInput('gradYear', true, 'placeholder="MM / DD / YYYY"', pGradYear)) +
            '</div>' +

            '<label class="editlearner-check" style="margin-top:6px;"><input type="checkbox" data-el="feeWaiver"> Fee Waiver Eligible</label>' +
            _elField("Notes", false, '<textarea class="tasty-textarea" data-el="notes" placeholder="Enter a note for this learner (optional)"></textarea>') +

          '</div>' +
          '<div class="editlearner-foot">' +
            '<button class="tasty-btn is-success is-md is-full" id="el-save-btn" disabled>' + saveLabel + '</button>' +
            '<p class="editlearner-reqnote"><span class="req">*</span> All items with a red asterisk are required.</p>' +
          '</div>' +
        '</div>' +
      '</div>';

    var mount = document.getElementById('edit-learner-content');
    mount.innerHTML = html;

    /* innerHTML-injected data-g icons must be resolved by hand (the boot pass already ran). */
    if (window.resolveTastyAssets) window.resolveTastyAssets(mount);
    /* Reveal any dependent block whose controlling select was pre-selected (a complete learner's
       enrolled→graduated chain), so the validator green-checks the now-visible required fields on
       open. Must run BEFORE tastyBindValidation — validateNow skips fields inside a [hidden] block. */
    mount.querySelectorAll('[data-el-reveal]').forEach(function(sel) {
      var block = mount.querySelector('[data-el-block="' + sel.getAttribute('data-el-reveal') + '"]');
      if (block) block.toggleAttribute('hidden', sel.value === '');
    });
    /* Wire the shared kit validator (blur→red error / live→green + a11y) onto every .tasty-field;
       it auto-wraps inputs + injects the check/alert vicon. validateNow → on open, green-check the
       already-valid (pre-filled) fields; errors still NEVER fire until the user interacts. The save
       gate (below) reads validity; fields in collapsed reveals are skipped until shown. */
    if (window.tastyBindValidation) window.tastyBindValidation(mount, { validateNow: true });

    /* Reveal toggles (checkbox + link buttons) */
    mount.querySelectorAll('[data-el-toggle]').forEach(function(t) {
      t.addEventListener('click', function() {
        var key = t.getAttribute('data-el-toggle');
        var block = mount.querySelector('[data-el-block="' + key + '"]');
        if (!block) return;
        // Checkboxes report state via .checked; link buttons just toggle.
        var show = (t.type === 'checkbox') ? t.checked : block.hasAttribute('hidden');
        block.toggleAttribute('hidden', !show);
        if (t.classList.contains('editlearner-addlink')) t.classList.toggle('is-open', show);
        _elSaveGate(mount);
      });
    });

    /* Dynamic chain: enrolled -> graduate -> gradyear */
    mount.querySelectorAll('[data-el-reveal]').forEach(function(sel) {
      sel.addEventListener('change', function() {
        var key = sel.getAttribute('data-el-reveal');
        var block = mount.querySelector('[data-el-block="' + key + '"]');
        if (block) {
          var show = sel.value !== '';
          block.toggleAttribute('hidden', !show);
          if (!show) {
            // collapsing a parent hides its descendants' values from validation
            var nested = block.querySelector('[data-el-reveal]');
            if (nested) {
              var nb = mount.querySelector('[data-el-block="' + nested.getAttribute('data-el-reveal') + '"]');
              if (nb) nb.setAttribute('hidden', '');
            }
          }
        }
        _elSaveGate(mount);
      });
    });

    /* Live validation on any input/change */
    mount.addEventListener('input', function() { _elSaveGate(mount); });
    mount.addEventListener('change', function() { _elSaveGate(mount); });

    document.getElementById('el-save-btn').addEventListener('click', _elSave);
    /* Header Back / Cancel */
    var back = document.getElementById('edit-learner-back-btn');
    if (back) back.onclick = function() { showScreen(backTo); };
    var cancel = document.getElementById('edit-learner-cancel-btn');
    if (cancel) cancel.onclick = function() { showScreen(backTo); };

    _elSaveGate(mount);
  }

  /* A required field counts only if it (and its reveal ancestors) are visible. */
  function _elHidden(el) {
    var n = el;
    while (n && n !== document.body) {
      if (n.hasAttribute && n.hasAttribute('hidden')) return true;
      n = n.parentElement;
    }
    return false;
  }
  // Save gate (reveal-aware): Save is enabled only when every VISIBLE required field passes its
  // rules. The red/green/vicon/a11y decoration is handled separately by the kit validator on blur
  // (tastyBindValidation, set up in renderEditLearner) — this gate just reads validity, no DOM writes.
  function _elSaveGate(mount) {
    var ok = true;
    mount.querySelectorAll('[data-validate]').forEach(function(inp) {
      if (!/\brequired\b/.test(inp.getAttribute('data-validate') || '')) return;   // only required fields gate
      if (_elHidden(inp)) return;                                                    // inside a collapsed reveal → skip
      if (!(window.isFieldValid && window.isFieldValid(inp))) ok = false;
    });
    var save = document.getElementById('el-save-btn');
    if (save) save.disabled = !ok;
  }

  function _elSave() {
    var mount = document.getElementById('edit-learner-content');
    var get = function(k) { var e = mount && mount.querySelector('[data-el="' + k + '"]'); return e ? e.value.trim() : ''; };

    // Add mode → build a new roster record from the entered fields and drop it on top
    // of the invite roster so it's immediately selectable.
    if (_elMode === 'add') {
      var fn = get('firstName'), ln = get('lastName');
      var gy = get('gradYear') || get('startYear');
      var yr = (gy.match(/(\d{4})/) || [])[1] || get('startYear');
      if (typeof LEARNER_ROSTER !== 'undefined') {
        LEARNER_ROSTER.unshift({
          id: _elLearnerId,
          lastName: ln, firstName: fn, middleName: get('middleName'),
          initials: ((fn.charAt(0) || '') + (ln.charAt(0) || '')).toUpperCase(),
          school: get('school') || '\u2014',
          classOf: yr ? parseInt(yr, 10) : '',
          dob: get('dob'), ssnLast4: get('ssn'),
          missingData: false
        });
      }
      if (typeof renderInviteLearners === 'function') renderInviteLearners();
      if (typeof showToast === 'function') showToast('Learner added.', 'success');
      showScreen('invite-learners');
      return;
    }

    // Edit mode → pull the core fields back onto the existing roster record.
    var l = _elLearner();
    if (l && mount) {
      l.firstName  = get('firstName')  || l.firstName;
      l.middleName = get('middleName');
      l.lastName   = get('lastName')   || l.lastName;
      if (get('dob')) l.dob = get('dob');
      if (get('ssn')) l.ssnLast4 = get('ssn');
      l.missingData = false;   // required data now supplied
      if (typeof renderInviteLearners === 'function') renderInviteLearners();
      if (typeof showToast === 'function') showToast('Learner record saved.', 'success');
    }
    showScreen('invite-learners');
  }
