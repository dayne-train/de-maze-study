/* scripts/app/review.js — module split from former scripts/app.js (one IIFE, now dissolved to shared global scope). Single-application review screen renderer.
   Load order is fixed in index.html; do not reorder casually. */
  /* ─── Review Screen ─── */
  /* ═══════════════════════════════════════════
     REVIEW SCREEN — Individual application detail render
  ═══════════════════════════════════════════ */
  /* ─────────────────────────────────────────────
     Unified APPLICATION DETAIL page (admin "Application Review" format).
     Works for every lifecycle stage; the right-rail action set is
     contextual — Approve/Deny (New) · Resend (Invited) · View reason
     (Closed) · read-only status (Waiting / Registered).
  ───────────────────────────────────────────── */

  function _detailHash(s) {
    s = String(s); var h = 5381;
    for (var i = 0; i < s.length; i++) { h = ((h << 5) + h) + s.charCodeAt(i); h |= 0; }
    return Math.abs(h);
  }

  var _DET_STREETS = ['Main Street','Oak Avenue','Maple Drive','Sunset Boulevard','Cedar Lane','Willow Way','Pine Street','Birch Court'];
  var _DET_CITIES  = [['Scottsdale','AZ','85205'],['Tempe','AZ','85281'],['Mesa','AZ','85201'],['Phoenix','AZ','85004'],['Chandler','AZ','85224'],['Glendale','AZ','85301']];
  var _DET_GFIRST  = ['Diana','Robert','Linda','Carlos','Susan','James','Maria','David','Karen','Michael','Angela','Steven'];
  var _DET_MONTHS  = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  var _DET_TODAY   = new Date(2026, 5, 30).getTime(); /* this fixture set's "today" ceiling — matches the Jun 30 2026 date spread */

  var DETAIL_STATUS_LABEL = { pending:'Needs Review', invited:'Invited', admitted:'Admitted', waiting:'Waiting', active:'Registered', denied:'Denied', cancelled:'Cancelled' };
  var DETAIL_STATUS_BADGE = { pending:'is-solid is-note', invited:'is-solid is-primary', admitted:'is-solid is-primary', waiting:'is-solid is-primary', active:'is-solid is-success', denied:'is-solid is-error', cancelled:'is-solid is-bold' };

  /* The detail rail shows the same specific sub-status as the tables: which approval
     is owed (waiting) or which party denied (closed). Falls back to the roll-up label. */
  function detailStatusLabel(app, status) {
    if (status === 'waiting' && typeof waitingSubText === 'function') return waitingSubText(app);
    if ((status === 'denied' || status === 'cancelled') && typeof closedSubText === 'function') return closedSubText(app);
    return DETAIL_STATUS_LABEL[status];
  }

  /* Find an application in any pool and report its lifecycle status.
     Transitioned pools (Waiting / Active / Denied) are checked BEFORE ALL_APPS
     so that an app just moved via approve/deny is found in its new home. */
  function findAppAnywhere(id) {
    var a;
    a = activeApps.find(function(x){return x.id===id;});      if (a) return { app:a, status:'pending' };
    a = WAITING_APPS.find(function(x){return x.id===id;});    if (a) return { app:a, status:'waiting' };
    a = ALL_ACTIVE_APPS.find(function(x){return x.id===id;}); if (a) return { app:a, status:'active' };
    a = ALL_DENIED_APPS.find(function(x){return x.id===id;}); if (a) return { app:a, status:(a.kind==='cancelled'?'cancelled':'denied') };
    a = ALL_ADMITTED_APPS.find(function(x){return x.id===id;}); if (a) return { app:a, status:'admitted' };
    a = ALL_APPS.find(function(x){return x.id===id;});        if (a) return { app:a, status:'pending' };
    a = INVITED_FIXTURE.find(function(x){return x.id===id;});
    if (a) return { app: { id:a.id, firstName:a.firstName, lastName:a.lastName, initials:(a.firstName[0]+a.lastName[0]),
                           group:a.group, term:a.term, course:a.course, institution:(COLLEGE_NAME_TO_KEY[a.college]||'wvcc'),
                           school:a.school, dateInvited:a.dateInvited, lastSent:a.lastSent }, status:'invited' };
    return null;
  }

  /* Deterministically synthesize the full application record (the admin
     format captures more than the queue rows carry). Cached per app. */
  function detailDataFor(app) {
    if (app.__detail) return app.__detail;
    var h    = _detailHash(app.id + '|' + app.firstName + '|' + app.lastName);
    var st   = _DET_STREETS[h % _DET_STREETS.length];
    var city = _DET_CITIES[(h >> 3) % _DET_CITIES.length];
    var num  = 100 + (h % 8900);
    var gFirst = _DET_GFIRST[(h >> 5) % _DET_GFIRST.length];
    var mid  = String.fromCharCode(65 + (h % 26));
    var ssn4 = app.ssnLast4 || String(1000 + (h % 9000));
    function ph(seed){ var a=200+((h>>seed)%700), b=200+((h>>(seed+4))%700), c=1000+((h>>(seed+8))%9000); return '('+a+') '+b+'-'+c; }
    var d = {
      fullName: app.firstName + ' ' + mid + ' ' + app.lastName,
      addrLine1: num + ' ' + st,
      addrLine2: city[0] + ', ' + city[1] + ' ' + city[2],
      ssn4: ssn4,
      ssnFull: (100 + (h % 900)) + '-' + (10 + (h % 90)) + '-' + ssn4,
      ssnMask: '\u2022\u2022\u2022 - \u2022\u2022 - ' + ssn4,
      phone: ph(2),
      sisId: app.sisId || ('10-' + String(20000000000 + (h % 9999999999))),
      gpa: (app.gpa != null) ? app.gpa.toFixed(2) : (2.8 + (h % 121) / 100).toFixed(2),
      dob: _DET_MONTHS[h % 12] + ' ' + (1 + (h % 28)) + ', ' + (2008 + (h % 3)),
      guardianName: gFirst + ' ' + app.lastName,
      guardianEmail: (gFirst.charAt(0) + app.lastName).toLowerCase().replace(/[^a-z]/g,'') + '@gmail.com',
      guardianPhone: ph(6),
      signedName: app.firstName + ' ' + mid + ' ' + app.lastName,
      institution: COLLEGES[app.institution] || COLLEGES.wvcc,
      counselor: app.counselor || HS_COUNSELORS[app.school] || 'High School Admin',
      school: app.school || '—',
      dateSent: app.dateInvited || app.submitted || app.enrolledDate || app.deniedDate || '\u2014',
      learnerEmail: (app.firstName.charAt(0) + app.lastName).toLowerCase().replace(/[^a-z]/g,'') + '@student.edu',
      attachments: [ { name: app.lastName + '_Academic_Transcript.pdf', icon:'ti-file-text', kind:'transcript' } ],
    };
    if (h % 3 !== 0) d.attachments.push({ name: app.lastName + '_Immunization_Record.pdf', icon:'ti-vaccine', kind:'immunization' });
    /* The DE application asks for Country, so the detail view has to be able to show it
       (audited Aug 5, 2026). It does NOT ask who the high school admin is — approval routes to
       the school's queue — so there is deliberately no adminName/adminEmail here; `counselor`
       stays for the tracker, which legitimately knows who acted. */
    d.country = 'United States';
    app.__detail = d;
    return d;
  }

  var _STEP_DEFS = [ 'Invitation To Apply', 'Application Submission', 'Parent/Guardian Consent', 'High School Approval', 'Institution Review', 'Register For Courses' ];

  /* Exchange-network gates (shared DENetwork model). A network can switch off the
     guardian-consent (idx 2), HS-counselor-approval (idx 3) and/or institution-review
     (idx 4) step; visibleStepIdx() returns the surviving indices so the stepper and
     every index-aligned array (states · stepSubs · stepDates) stay in sync.
     Defaults ON. Institution review is THIS college's own step: with it off the
     college keeps the application record but owes no decision (KB §8, and the
     independent he_review switch in the configuration explorer). */
  function _gateOn(key) { return (window.DENetwork ? window.DENetwork.get(key) : true) !== false; }
  function visibleStepIdx() {
    var keep = [0, 1];
    if (_gateOn('guardianConsent'))   keep.push(2);
    if (_gateOn('counselorApproval')) keep.push(3);
    if (_gateOn('institutionReview')) keep.push(4);
    keep.push(5);
    return keep;
  }

  /* A gate that's off means its step doesn't exist for this network, so it can't
     be the blocking (current) or denying step. Force off-gate steps to 'complete'
     (they're filtered out of display anyway), and if that displaced the current/denied
     marker with nothing else claiming it, hand it to the next real step — so the
     stepper never renders with no active step. */
  function coerceStatesForGates(states) {
    var s = states.slice(), displaced = null;
    [[2, 'guardianConsent'], [3, 'counselorApproval'], [4, 'institutionReview']].forEach(function (p) {
      if (_gateOn(p[1])) return;
      if (s[p[0]] === 'current' || s[p[0]] === 'denied') displaced = s[p[0]];
      s[p[0]] = 'complete';
    });
    var vis = visibleStepIdx();
    var claimed = vis.some(function (i) { return s[i] === 'current' || s[i] === 'denied'; });
    if (displaced && !claimed) {
      for (var k = 0; k < vis.length; k++) {
        if (s[vis[k]] === 'upcoming') { s[vis[k]] = displaced; break; }
      }
    }
    return s;
  }

  /* Needs-Review queue progress — the "Review Next" button's only. The detail header used to
     carry this count too (excluding the app in focus); removed Aug 5, 2026 as rail clutter. */
  function remainingQueueText() {
    var n = activeApps.length;
    return n > 0 ? (n + ' remaining') : 'All caught up';
  }

  /* Synthesize a distinct date+time per active step, spread across days rather
     than reusing one stamp everywhere — real applications take 1-2 weeks to
     move through steps. The app's one stored date (submitted/enrolledDate/
     deniedDate) anchors a specific step; earlier active steps get progressively
     earlier dates, later ones progressively later, deterministic per app. */
  function _detailStepDates(app, status, states) {
    var out = _STEP_DEFS.map(function () { return ''; });
    var refStr = app.dateInvited || app.submitted || app.enrolledDate || app.deniedDate || '';
    if (!refStr) return out;
    var refDate = new Date(refStr);
    if (isNaN(refDate.getTime())) return out;

    var refIdx = (status === 'active') ? 5
      : (status === 'denied' || status === 'cancelled') ?
          ((app.deniedState === 'Application') ? 1
           : (app.deniedState === 'Guardian Consent') ? 2
           : (app.deniedState === 'Institution Review' || app.deniedState === 'College Review') ? 4
           : 3)
      : 1; /* pending / waiting: the stored date is when the Application step completed */

    var activeIdx = [];
    for (var i = 0; i < states.length; i++) { if (states[i] !== 'upcoming') activeIdx.push(i); }
    var pos = activeIdx.indexOf(refIdx);
    if (pos === -1) return out;

    var h = _detailHash(app.id + '|' + app.firstName + '|' + app.lastName);
    var dayMs = 24 * 60 * 60 * 1000;
    var stepTime = {}; stepTime[refIdx] = refDate.getTime();
    var t = refDate.getTime();
    for (var k = pos - 1; k >= 0; k--) { t -= (1 + ((h >> (k * 3)) % 5)) * dayMs; stepTime[activeIdx[k]] = t; }
    /* Forward (later) steps never pass "today" — a step still in progress
       can't be dated in the future. Clamped steps share today's date, which
       is correct: concurrent in-progress gates really are both "as of today". */
    t = refDate.getTime();
    for (var k2 = pos + 1; k2 < activeIdx.length; k2++) {
      t += (1 + ((h >> (k2 * 3 + 1)) % 5)) * dayMs;
      if (t > _DET_TODAY) t = _DET_TODAY;
      stepTime[activeIdx[k2]] = t;
    }

    activeIdx.forEach(function (idx) {
      var dt = new Date(stepTime[idx]);
      var hr = 8 + ((h >> (idx + 1)) % 9);
      var min = ((h >> (idx + 3)) % 12) * 5;
      var hr12 = ((hr + 11) % 12) + 1;
      var mm = min < 10 ? '0' + min : String(min);
      var label = (_DET_MONTHS[dt.getMonth()] + ' ' + dt.getDate() + ', ' + dt.getFullYear()).toUpperCase();
      out[idx] = label + ' at ' + hr12 + ':' + mm + (hr < 12 ? 'am' : 'pm') + ' PST';
    });
    return out;
  }

  /* Per-step lifecycle state → complete | current | upcoming | denied */
  function stepperStatesFor(app, status) {
    var s = ['upcoming','upcoming','upcoming','upcoming','upcoming','upcoming'];
    // Steps: 0 Invitation · 1 Application · 2 Consent · 3 Counselor · 4 College Review · 5 Register.
    // College (HE Admin) view: College Review (step 4) is OUR step.
    if (status === 'invited') { s[0]='complete'; s[1]='current'; }
    else if (status === 'pending') {
      // New = college owes the College Review (our turn). The HS-side gate (counselor
      // approval + guardian consent) is CLOSED before it reaches us, so both read
      // complete — an app can't be in our review queue with either still pending.
      s[0]='complete'; s[1]='complete';
      s[2]='complete';
      s[3]='complete';
      s[4]='current';
    }
    else if (status === 'waiting') {
      s[0]='complete'; s[1]='complete';
      if (app.awaitingRegistration) {
        // POST-admit: we reviewed + admitted; only registration is left.
        s[2]='complete'; s[3]='complete'; s[4]='complete'; s[5]='current';
      } else {
        // PRE-review: still waiting on the HS side (counselor + consent, concurrent).
        // Our College Review (step 4) has NOT happened yet — it stays upcoming.
        s[2] = app.awaitingConsent   ? 'current' : 'complete';
        s[3] = app.awaitingCounselor ? 'current' : 'complete';
      }
    }
    else if (status === 'admitted') {
      // Admitted, deliberately ON HOLD: nothing external is blocking and nothing is
      // in motion. Step 5 stays 'upcoming' (NOT waiting's ready-to-register 'current')
      // until the admin invites the learner to register.
      s[0]='complete'; s[1]='complete'; s[2]='complete'; s[3]='complete'; s[4]='complete';
    }
    else if (status === 'active') { s = ['complete','complete','complete','complete','complete','complete']; }
    else if (status === 'denied' || status === 'cancelled') {
      var di = (app.deniedState === 'Application') ? 1
             : (app.deniedState === 'Guardian Consent') ? 2
             : (app.deniedState === 'Institution Review' || app.deniedState === 'College Review') ? 4
             : 3;
      for (var i=0;i<di;i++) s[i]='complete';
      s[di]='denied';
    }
    return s;
  }

  /* ─────────────────────────────────────────────
     INVITED-state detail — the application does NOT exist yet, so this
     view deliberately shows severely limited data: only the invitation
     facts (who, where, what group/term) plus an empty-state. No SSN,
     address, GPA, guardian, signature, or attachments are synthesized.
  ───────────────────────────────────────────── */
  function renderInvitedDetail(app) {
    var learnerName  = app.firstName + ' ' + app.lastName;
    var d            = detailDataFor(app);   // account-profile fields known from sign-up (name, dob, address, phone\u2026)
    var institution  = COLLEGES[app.institution] || app.institution || '\u2014';
    var learnerEmail = (app.firstName.charAt(0) + app.lastName).toLowerCase().replace(/[^a-z]/g,'') + '@student.edu';
    var school       = app.school || 'Not yet selected';
    var dateSent     = app.dateInvited || '\u2014';

    var states   = ['complete','current','upcoming','upcoming','upcoming','upcoming'];
    var stepSubs = [ institution, learnerName, 'Parent/Guardian', (app.counselor || HS_COUNSELORS[app.school] || 'High School Admin'), 'WVCC Admissions', learnerName ];
    var _vis = visibleStepIdx(), _lastVis = _vis[_vis.length - 1];
    var stepHtml = _vis.map(function(i) {
      var title = _STEP_DEFS[i];
      var stt = states[i];
      var marker = stt === 'complete' ? '<span data-tasty-icon="check-open" data-size="14"></span>' : stt === 'current' ? '<span data-tasty-icon="time" data-size="14"></span>' : '';
      var meta = '';
      if (stt === 'complete' && i === 0) meta = '<span class="appdetail-step-meta">Sent ' + escapeHtml(dateSent) + '</span>';
      else if (stt === 'current') meta = '<span class="appdetail-step-meta">Awaiting learner</span>';
      return '<li class="appdetail-step is-' + stt + (i === _lastVis ? ' is-last' : '') + '">' +
          '<span class="appdetail-step-marker is-' + stt + '">' + marker + '</span>' +
          '<span class="appdetail-step-body">' +
            '<span class="appdetail-step-title">' + escapeHtml(title) + '</span>' +
            '<span class="appdetail-step-sub">' + escapeHtml(stepSubs[i]) + '</span>' + meta +
          '</span>' +
        '</li>';
    }).join('');

    function field(label, valueHtml) {
      return '<div class="appdetail-field"><span class="appdetail-field-label">' + label + '</span><span class="appdetail-field-value">' + valueHtml + '</span></div>';
    }

    var html =
      '<div class="appdetail">' +
        '<div class="appdetail-main">' +
          '<div class="appdetail-head">' +
            '<div class="tasty-section-header" style="flex:1;width:auto;">' +
              /* Envelope, not a document: nothing has been submitted yet — this is an invitation
                 waiting on the learner (Aug 5, 2026). The submitted detail keeps the document. */
              '<span class="tasty-section-header__graphic"><span data-tasty-illus="envelope-fill" alt=""></span></span>' +
              '<div>' +
                '<div class="tasty-section-header__title">Invitation Pending</div>' +
                '<div class="tasty-section-header__sub">' + escapeHtml(learnerName) + ' has been invited but hasn’t started their application yet.</div>' +
              '</div>' +
            '</div>' +
          '</div>' +

          /* Same fields/layout as the application-details screen, minus everything we
             don't have data for until the learner accepts and completes the AER (SSN,
             State Student ID, GPA, guardian, signature, attachments). Group lives in the
             right rail. DOB + the invitation's own details used to sit in a rail person
             block; since Aug 5, 2026 they're body fields like every other.
             ORDER MATTERS: the invitation group leads, mirroring the submitted detail, whose
             identity row (Application ID · Applying From · Applying To) also opens the body.
             The learner's own profile follows. */
          '<div class="appdetail-grid">' +
            field('Applying From', escapeHtml(school)) +
            field('Applying To', escapeHtml(institution)) +
            field('Invitation Sent To', escapeHtml(learnerEmail)) +
            field('Date Invited', escapeHtml(dateSent)) +
            field('Last Sent', escapeHtml(app.lastSent || dateSent)) +
          '</div>' +

          '<hr class="appdetail-rule">' +

          '<div class="appdetail-grid">' +
            field('Current Name', escapeHtml(d.fullName)) +
            field('Address', escapeHtml(d.addrLine1) + '<br>' + escapeHtml(d.addrLine2)) +
            field('Phone Number', escapeHtml(d.phone)) +
            field('Date of Birth', escapeHtml(d.dob)) +
          '</div>' +
        '</div>' +

        '<aside class="appdetail-side">' +
          /* Status tag sits at the top of the rail above the stepper, the same place every
             other status tag lives on a submitted application (moved out of the main
             column's head, Aug 5, 2026). */
          '<div class="appdetail-side-status">' +
            '<span class="tasty-status-tag is-md is-solid is-primary appdetail-status-tag">Invited</span>' +
          '</div>' +
          '<ul class="appdetail-stepper">' + stepHtml + '</ul>' +

          '<hr class="appdetail-rule">' +

          '<div class="appdetail-side-block">' +
            '<div class="appdetail-side-label"><i class="ti ti-users"></i> Group(s)</div>' +
            '<div class="appdetail-group-value">' + groupsValueHTML(app) + '</div>' +
          '</div>' +

          '<div class="appdetail-actions">' +
            '<button class="tasty-btn is-primary is-md is-full" id="detail-resend-btn"><i class="ti ti-send"></i> Resend Invitation</button>' +
            '<p class="appdetail-readonly-note is-muted"><i class="ti ti-mail"></i><span>Awaiting the learner to accept and complete their application.</span></p>' +
          '</div>' +
        '</aside>' +
      '</div>';

    document.getElementById('review-content').innerHTML = html;
    if (typeof resolveTastyAssets === 'function') resolveTastyAssets(document.getElementById('review-content'));
    var resendBtn = document.getElementById('detail-resend-btn');
    if (resendBtn) resendBtn.addEventListener('click', function() {
      resendInvitation(app.id, learnerName);   // updates the INVITED_FIXTURE row's lastSent on success
      var rec = (typeof INVITED_FIXTURE !== 'undefined') && INVITED_FIXTURE.find(function(x){ return x.id === app.id; });
      if (rec) app.lastSent = rec.lastSent;    // sync this detail copy from the mutated row
      renderInvitedDetail(app);                // refresh the panel so Last Sent reflects the send
    });
  }

  function renderReviewScreen(id) {
    var found = findAppAnywhere(id);
    if (!found) return;
    var app = found.app, status = found.status;
    if (status === 'invited') { renderInvitedDetail(app); return; }
    var d = detailDataFor(app);
    var learnerName = app.firstName + ' ' + app.lastName;
    var states = coerceStatesForGates(stepperStatesFor(app, status));

    var stepSubs = [ d.institution, learnerName, d.guardianName, d.counselor, 'WVCC Admissions', learnerName ];
    var stepDates = _detailStepDates(app, status, states);

    /* ── Right-rail stepper ── */
    var _vis = visibleStepIdx(), _lastVis = _vis[_vis.length - 1];
    var stepHtml = _vis.map(function(i) {
      var title = _STEP_DEFS[i];
      var stt  = states[i];
      var marker = stt === 'complete' ? '<span data-tasty-icon="check-open" data-size="14"></span>'
                 : stt === 'current'  ? '<span data-tasty-icon="time" data-size="14"></span>'
                 : stt === 'denied'   ? '<span data-tasty-icon="cancel" data-size="14"></span>'
                 : '';
      var dateLine = '';
      if (stepDates[i]) {
        if (stt === 'complete' || stt === 'denied') dateLine = stepDates[i];
        else if (stt === 'current') dateLine = 'Received: ' + stepDates[i];
      }
      var meta = dateLine ? '<span class="appdetail-step-meta">' + escapeHtml(dateLine) + '</span>' : '';
      return '<li class="appdetail-step is-' + stt + (i === _lastVis ? ' is-last' : '') + '">' +
          '<span class="appdetail-step-marker is-' + stt + '">' + marker + '</span>' +
          '<span class="appdetail-step-body">' +
            '<span class="appdetail-step-title">' + escapeHtml(title) + '</span>' +
            '<span class="appdetail-step-sub">' + escapeHtml(stepSubs[i]) + '</span>' +
            meta +
          '</span>' +
        '</li>';
    }).join('');

    /* ── Contextual actions ── */
    var actions;
    if (status === 'pending') {
      actions =
        '<div class="appdetail-actions">' +
          '<button class="tasty-btn is-success is-md appdetail-action-btn" id="detail-approve-btn">Admit Now</button>' +
          '<button class="tasty-btn is-ghost is-error is-md appdetail-action-btn" id="detail-reject-btn">Deny</button>' +
        '</div>';
    } else if (status === 'invited') {
      actions =
        '<div class="appdetail-actions">' +
          '<button class="tasty-btn is-primary is-md is-full" id="detail-resend-btn"><i class="ti ti-send"></i> Resend Invitation</button>' +
          '<p class="appdetail-readonly-note is-muted"><i class="ti ti-mail"></i><span>Awaiting the learner to accept and complete their application.</span></p>' +
        '</div>';
    } else if (status === 'waiting') {
      // Pre-review rows are waiting on the HS side (before WVCC's review); offer a nudge
      // to whichever party we're blocked on. The post-admit awaitingRegistration row is
      // now waiting on the learner to complete course registration — nudge the learner.
      var waitMsg = '', remindParty = '', remindLabel = '';
      if (app.awaitingRegistration) {
        waitMsg = 'Waiting on the learner to register for their courses.';
        remindParty = 'the learner'; remindLabel = 'Send reminder to learner';
      } else if (app.awaitingConsent && app.awaitingCounselor) {
        waitMsg = 'Waiting on the high school — admin approval and guardian consent — before it reaches your review.';
        remindParty = 'the high school'; remindLabel = 'Send reminder to high school';
      } else if (app.awaitingConsent) {
        waitMsg = 'Waiting on guardian consent before it reaches your review.';
        remindParty = 'the parent/guardian'; remindLabel = 'Send reminder to guardian';
      } else if (app.awaitingCounselor) {
        waitMsg = 'Waiting on the high school admin’s approval before it reaches your review.';
        remindParty = 'the high school admin'; remindLabel = 'Send reminder to high school';
      } else {
        waitMsg = 'Approved — moving to registration.';
      }
      actions = '<div class="appdetail-actions">' +
          (remindLabel ? '<button class="tasty-btn is-bold is-ghost is-md is-full" id="detail-remind-btn" data-party="' + remindParty + '"><i class="ti ti-bell"></i> ' + remindLabel + '</button>' : '') +
          '<p class="appdetail-readonly-note is-info"><i class="ti ti-clock"></i><span>' + waitMsg + ' No action needed from you.</span></p>' +
          '<div id="detail-transition-nav" class="appdetail-transition-nav"></div>' +
        '</div>';
    } else if (status === 'admitted') {
      actions = '<div class="appdetail-actions">' +
          '<button class="tasty-btn is-primary is-md is-full" id="detail-invite-register-btn"><i class="ti ti-send"></i> Invite To Register</button>' +
          '<p class="appdetail-readonly-note is-info"><i class="ti ti-player-pause"></i><span>Admitted and on hold. No action needed until you invite this learner to register for courses.</span></p>' +
        '</div>';
    } else if (status === 'active') {
      actions = '<div class="appdetail-actions"><p class="appdetail-readonly-note is-success"><i class="ti ti-circle-check"></i><span>Learner is registered for courses. No action needed.</span></p></div>';
    } else {
      actions =
        '<div class="appdetail-actions">' +
          '<button class="tasty-btn is-bold is-ghost is-md is-full" id="detail-reason-btn"><i class="ti ti-info-circle"></i> View reason</button>' +
          '<p class="appdetail-readonly-note is-muted"><i class="ti ti-ban"></i><span>' + (status === 'cancelled' ? 'This application was cancelled.' : 'This application was denied.') + '</span></p>' +
          '<div id="detail-transition-nav" class="appdetail-transition-nav"></div>' +
        '</div>';
    }

    /* ── Attachments ── */
    var attachHtml = d.attachments.map(function(at) {
      return '<div class="appdetail-attach">' +
          '<span class="appdetail-attach-icon"><i class="ti ' + at.icon + '"></i></span>' +
          '<span class="appdetail-attach-name">' + escapeHtml(at.name) + '</span>' +
          '<button class="appdetail-attach-view" data-attach="' + escapeHtml(at.name) + '" aria-label="View attachment"><i class="ti ti-file-search"></i></button>' +
        '</div>';
    }).join('');

    var subtitle = status === 'pending'
      ? 'Please review the information that was submitted below.'
      : 'Review the information submitted for this application.';

    function field(label, valueHtml) {
      return '<div class="appdetail-field"><span class="appdetail-field-label">' + label + '</span><span class="appdetail-field-value">' + valueHtml + '</span></div>';
    }

    var html =
      '<div class="appdetail">' +

        // ── MAIN COLUMN ──
        '<div class="appdetail-main">' +
          '<div class="appdetail-head">' +
            '<div class="tasty-section-header" style="flex:1;width:auto;">' +
              '<span class="tasty-section-header__graphic"><span data-tasty-illus="select-document-fill" alt=""></span></span>' +
              '<div>' +
                '<div class="tasty-section-header__title">Application Review</div>' +
                '<div class="tasty-section-header__sub">' + subtitle + '</div>' +
              '</div>' +
            '</div>' +
          '</div>' +

          /* Identity row: which record, and which two orgs it runs between. "Applying From"
             is always the sending high school and "Applying To" the receiving institution, so
             each fork reads its own org on one side and the counterparty on the other — the
             informative half (many colleges for an HS admin, many high schools for a college).
             This pair replaced a lone school chip that sat in the rail below Group(s). */
          '<div class="appdetail-grid">' +
            field('Application ID', escapeHtml(app.id)) +
            field('Applying From', escapeHtml(d.school)) +
            field('Applying To', escapeHtml(d.institution)) +
          '</div>' +

          '<hr class="appdetail-rule">' +

          '<div class="appdetail-grid">' +
            field('Current Name', escapeHtml(d.fullName)) +
            field('Address', escapeHtml(d.addrLine1) + '<br>' + escapeHtml(d.addrLine2)) +
            field('Country', escapeHtml(d.country)) +
            /* DOB comes from account sign-up rather than the DE application, but it belongs
               with the identity fields an admin verifies — and the invited detail shows it. */
            field('Date of Birth', escapeHtml(d.dob)) +
            field('Social Security Number',
              '<span class="appdetail-ssn">' +
                '<span id="detail-ssn-value" data-mask="' + d.ssnMask + '" data-full="' + d.ssnFull + '">' + d.ssnMask + '</span>' +
                '<button class="appdetail-ssn-toggle" id="detail-ssn-toggle" data-shown="0" aria-label="Reveal SSN"><i class="ti ti-eye"></i></button>' +
              '</span>') +
            field('Phone Number', escapeHtml(d.phone)) +
            field('State Student ID', escapeHtml(d.sisId)) +
            field('Current GPA', escapeHtml(d.gpa)) +
          '</div>' +

          '<hr class="appdetail-rule">' +

          '<div class="appdetail-grid">' +
            field('Parent/Legal Guardian Name', escapeHtml(d.guardianName)) +
            field('Parent/Legal Guardian Email', escapeHtml(d.guardianEmail)) +
            field('Parent/Legal Guardian Phone', escapeHtml(d.guardianPhone)) +
          '</div>' +

          '<hr class="appdetail-rule">' +

          '<div class="appdetail-sign">' +
            '<div class="appdetail-sign-line"><span class="appdetail-sign-x">X</span><span class="appdetail-signature">' + escapeHtml(d.signedName) + '</span></div>' +
            '<span class="appdetail-field-label">Full Name As Signed Above</span>' +
            '<p class="appdetail-sign-name">' + escapeHtml(d.signedName) + '</p>' +
            '<ul class="appdetail-certs">' +
              '<li><span class="tasty-checkbox is-checked is-disabled appdetail-cert-check" aria-hidden="true"><span class="tasty-checkbox__box"><span data-tasty-icon="check" data-size="14"></span></span></span><span>I certify under penalty of law that I am the individual identified above and am authorized to take this action.</span></li>' +
              '<li><span class="tasty-checkbox is-checked is-disabled appdetail-cert-check" aria-hidden="true"><span class="tasty-checkbox__box"><span data-tasty-icon="check" data-size="14"></span></span></span><span>I agree to have my personal information transferred from my high school to the teaching college as necessary to register for this course through the exchange.</span></li>' +
              /* Two certifications, matching the DE application form exactly. A third —
                 transcript sent back from the college to the high school — used to render
                 here but the form never asks for it (removed Aug 5, 2026). */
            '</ul>' +
          '</div>' +

          '<div class="appdetail-attachments">' +
            '<span class="appdetail-field-label">Attachment(s)</span>' +
            attachHtml +
          '</div>' +
        '</div>' +

        // ── RIGHT RAIL ──
        '<aside class="appdetail-side">' +
          '<div class="appdetail-side-status">' +
            '<span class="tasty-status-tag is-md ' + DETAIL_STATUS_BADGE[status] + ' appdetail-status-tag">' + detailStatusLabel(app, status) + '</span>' +
          '</div>' +
          '<ul class="appdetail-stepper">' + stepHtml + '</ul>' +

          '<hr class="appdetail-rule">' +

          '<div class="appdetail-side-block">' +
            '<div class="appdetail-side-label"><i class="ti ti-users"></i> Group(s) <button class="appdetail-group-edit" id="detail-group-edit" aria-label="Edit group"><i class="ti ti-edit"></i></button></div>' +
            '<div class="appdetail-group-value">' + groupsValueHTML(app) + '</div>' +
          '</div>' +

          actions +
        '</aside>' +
      '</div>';

    document.getElementById('review-content').innerHTML = html;
    if (typeof resolveTastyAssets === 'function') resolveTastyAssets(document.getElementById('review-content'));

    // ── Wire contextual actions ──
    var approveBtn = document.getElementById('detail-approve-btn');
    if (approveBtn) approveBtn.addEventListener('click', function() { confirmEndorse([id]); });
    var rejectBtn = document.getElementById('detail-reject-btn');
    if (rejectBtn) rejectBtn.addEventListener('click', function() { openDenyModal(id); });
    var resendBtn = document.getElementById('detail-resend-btn');
    if (resendBtn) resendBtn.addEventListener('click', function() { resendInvitation(id, learnerName); });
    var inviteRegBtn = document.getElementById('detail-invite-register-btn');
    if (inviteRegBtn) inviteRegBtn.addEventListener('click', function() {
      inviteAdmittedToRegister(id);
      showScreen('review', id); /* re-render: the app is now in Waiting (ready to register) */
    });
    var remindBtn = document.getElementById('detail-remind-btn');
    if (remindBtn) remindBtn.addEventListener('click', function() { sendReminder(remindBtn.getAttribute('data-party')); });
    var reasonBtn = document.getElementById('detail-reason-btn');
    if (reasonBtn) reasonBtn.addEventListener('click', function() { showDenialReason(id); });

    // ── SSN reveal ──
    var ssnToggle = document.getElementById('detail-ssn-toggle');
    if (ssnToggle) ssnToggle.addEventListener('click', function() {
      var v = document.getElementById('detail-ssn-value');
      var shown = this.getAttribute('data-shown') === '1';
      v.textContent = shown ? v.getAttribute('data-mask') : v.getAttribute('data-full');
      this.setAttribute('data-shown', shown ? '0' : '1');
      this.querySelector('i').className = shown ? 'ti ti-eye' : 'ti ti-eye-off';
    });

    // ── Attachments ──
    Array.prototype.forEach.call(document.querySelectorAll('#review-content [data-attach]'), function(btn) {
      btn.addEventListener('click', function() { viewAttachment(id, btn.getAttribute('data-attach')); });
    });

    // ── Group edit (non-functional in prototype) ──
    var groupEdit = document.getElementById('detail-group-edit');
    if (groupEdit) groupEdit.addEventListener('click', function() { openEditGroups(id); });
  }

  /* ═══════════════════════════════════════════
     IN-PLACE TRANSITION — animate the stepper, badge & actions
     without re-rendering the whole review screen.
  ═══════════════════════════════════════════ */
  function transitionReviewInPlace(id, type) {
    var found = findAppAnywhere(id);
    if (!found) return;
    var app = found.app, status = found.status;
    var newStates = stepperStatesFor(app, status);

    var stepperEl = document.querySelector('#review-content .appdetail-stepper');
    if (!stepperEl) return;

    /* Mark stepper so CSS transition rules apply (not on initial render) */
    stepperEl.classList.add('is-live-transition');

    var stepEls  = stepperEl.querySelectorAll('.appdetail-step');
    var allCls   = ['is-complete','is-current','is-upcoming','is-denied'];
    var STEP_GAP = 120; /* ms between each step */

    stepEls.forEach(function(stepEl, i) {
      var newState = newStates[i];
      var delay    = i * STEP_GAP;

      setTimeout(function() {
        var oldCls = allCls.find(function(c) { return stepEl.classList.contains(c); });
        var changed = oldCls !== ('is-' + newState);

        /* Flip classes on the <li> and the marker <span> */
        allCls.forEach(function(c) { stepEl.classList.remove(c); });
        stepEl.classList.add('is-' + newState);

        var marker = stepEl.querySelector('.appdetail-step-marker');
        if (marker) {
          allCls.forEach(function(c) { marker.classList.remove(c); });
          marker.classList.add('is-' + newState);

          /* Swap the icon inside the marker. Tasty glyphs are inline SVG, so this
             re-renders rather than restyling a font <i>. */
          var _slug = newState === 'complete' ? 'check-open'
                    : newState === 'current'  ? 'time'
                    : newState === 'denied'   ? 'cancel' : '';
          marker.innerHTML = _slug ? '<span data-tasty-icon="' + _slug + '" data-size="14"></span>' : '';
          if (_slug && typeof resolveTastyAssets === 'function') resolveTastyAssets(marker);

          /* Pop only markers that actually changed */
          if (changed) {
            marker.style.animation = 'none';
            void marker.offsetWidth;            /* force reflow */
            marker.style.animation = 'markerPop 0.4s ease-out';
          }
        }
      }, delay);
    });

    /* ── Status badge ── */
    var badgeDelay = stepEls.length * STEP_GAP;
    setTimeout(function() {
      var badge = document.querySelector('#review-content .appdetail-status-tag');
      if (badge) {
        badge.className = 'tasty-status-tag is-md ' + DETAIL_STATUS_BADGE[status] + ' appdetail-status-tag';
        badge.textContent = detailStatusLabel(app, status);
        badge.style.animation = 'none';
        void badge.offsetWidth;
        badge.style.animation = 'badgePop 0.35s ease-out';
      }
    }, badgeDelay);

    /* ── Actions area ── */
    setTimeout(function() {
      var actionsEl = document.querySelector('#review-content .appdetail-actions');
      if (!actionsEl) return;

      var html = '';
      if (type === 'approved') {
        // Just admitted \u2014 the HS-side gates (counselor + consent) were prerequisites and
        // are already done, so this is a post-admit message only.
        var waitMsg = app.awaitingRegistration ? 'Waiting on the learner to register for their courses.'
          : 'Admitted \u2014 moving to registration.';
        html += '<p class="appdetail-readonly-note is-info"><i class="ti ti-clock"></i><span>' + waitMsg + ' No action needed from you.</span></p>';
      } else if (type === 'admitted') {
        html += '<p class="appdetail-readonly-note is-info"><i class="ti ti-player-pause"></i><span>Admitted and on hold. Invite this learner to register when ready (Admitted tab).</span></p>';
      } else {
        html += '<button class="tasty-btn is-bold is-ghost is-md is-full" id="detail-reason-btn"><i class="ti ti-info-circle"></i> View reason</button>';
        html += '<p class="appdetail-readonly-note is-muted"><i class="ti ti-ban"></i><span>This application was denied.</span></p>';
      }

      /* Navigation: Return to Queue + Review Next */
      var nextApp = activeApps.length > 0 ? activeApps[0] : null;
      html += '<div class="appdetail-transition-nav">';
      html += '<button class="tasty-btn is-primary is-md is-full" onclick="reviewReturn()">Return to ' + reviewReturnLabel() + '</button>';
      if (nextApp) {
        html += '<button class="tasty-btn is-bold is-ghost is-md is-full" id="detail-review-next-btn">' +
          'Review Next: ' + escapeHtml(nextApp.firstName) + ' ' + escapeHtml(nextApp.lastName) +
          ' <span style="opacity:0.55;font-weight:400;margin-left:4px;">' + escapeHtml(remainingQueueText()) + '</span></button>';
      } else {
        html += '<p style="text-align:center;font-size:13px;color:var(--c-text-muted);margin:0;">All caught up \u2014 no more pending applications.</p>';
      }
      html += '</div>';

      /* Fade actions in */
      actionsEl.style.opacity   = '0';
      actionsEl.style.transform = 'translateY(6px)';
      actionsEl.innerHTML = html;
      requestAnimationFrame(function() {
        actionsEl.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
        actionsEl.style.opacity   = '1';
        actionsEl.style.transform = 'translateY(0)';
        setTimeout(function() { actionsEl.style.transition = ''; }, 350);
      });

      /* Wire handlers */
      if (nextApp) {
        var nb = document.getElementById('detail-review-next-btn');
        if (nb) nb.addEventListener('click', function() { showScreen('review', nextApp.id); });
      }
      var rb = document.getElementById('detail-reason-btn');
      if (rb) rb.addEventListener('click', function() { showDenialReason(id); });
    }, badgeDelay + 200);

    /* Cleanup */
    setTimeout(function() { stepperEl.classList.remove('is-live-transition'); }, badgeDelay + 900);
  }

  // Minimal HTML escaper for dynamic insertions in this file.
  function escapeHtml(s) {
    if (s == null) return '';
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  /* ── Group display helpers (multi-group, shared by detail panel + tables) ── */
  // Right-panel Group(s): one line per assigned group ("Name (TERM)"), course on the primary.
  function groupsValueHTML(app) {
    var gs = (typeof getAppGroups === 'function') ? getAppGroups(app) : [];
    if (!gs.length) return escapeHtml(app.group || '—');
    return gs.map(function(g, i) {
      /* Group names now usually carry their own term ("… Fall 2026") — only append
         the (TERM) chip when the name doesn't already say it. */
      var nameHasTerm = g.term && g.name.toLowerCase().indexOf(g.term.toLowerCase()) !== -1;
      var term = (g.term && !nameHasTerm) ? ' <span class="appdetail-group-term">(' + escapeHtml(g.term) + ')</span>' : '';
      var courseBit = (i === 0 && app.course) ? '<span class="appdetail-group-course">' + escapeHtml(app.course) + '</span>' : '';
      return '<span class="appdetail-group-line">' + escapeHtml(g.name) + term + courseBit + '</span>';
    }).join('');
  }
  window.groupsValueHTML = groupsValueHTML;

  // Table Group cell: single name, or "{first} +N" with a hover tooltip listing all.
  /* Group names are free text and now carry the program + term ("Math - Dual
     Enrollment Fall 2026"), so the primary name truncates with an ellipsis and
     reveals a tooltip only when it's actually clipped (markTruncatedCells). */
  function groupNameHTML(name) {
    var esc = escapeHtml(name);
    return '<span class="group-cell__text">' + esc + '</span>' +
           '<span class="tasty-tooltip is-light group-name-tooltip">' + esc + '</span>';
  }
  function groupCellHTML(app) {
    var gs = (typeof getAppGroups === 'function') ? getAppGroups(app) : [];
    if (!gs.length) return '<span class="group-cell">' + groupNameHTML(app.group || '—') + '</span>';
    if (gs.length === 1) return '<span class="group-cell">' + groupNameHTML(gs[0].name) + '</span>';
    var list = gs.map(function(g) {
      var dup = g.term && g.name.toLowerCase().indexOf(g.term.toLowerCase()) !== -1;
      return escapeHtml(g.name) + ((g.term && !dup) ? ' · ' + escapeHtml(g.term) : '');
    }).join('<br>');
    return '<span class="group-cell has-more">' + groupNameHTML(gs[0].name) +
      '<span class="group-more">+' + (gs.length - 1) +
        '<span class="tasty-tooltip is-light group-tooltip">' + list + '</span>' +
      '</span></span>';
  }
  window.groupCellHTML = groupCellHTML;

  // Table Selected-Course cell (Registered bucket): the course the learner picked at
  // registration. Truncates with an ellipsis; the Tasty tooltip only shows the full
  // value on hover when it's actually clipped (see markTruncatedCourses).
  function courseCellHTML(app) {
    if (!app || !app.course) return '—';
    var esc = escapeHtml(app.course);
    return '<span class="course-cell">' +
        '<span class="course-cell__text">' + esc + '</span>' +
        '<span class="tasty-tooltip is-light course-tooltip">' + esc + '</span>' +
      '</span>';
  }
  window.courseCellHTML = courseCellHTML;

  // After a table renders, flag any course cell whose text is clipped so the hover
  // tooltip appears only when the value is truncated (matches the request).
  function markTruncatedCourses(container) {
    var root = container || document;
    [['.course-cell', '.course-cell__text'], ['.group-cell', '.group-cell__text']].forEach(function (pair) {
      Array.prototype.forEach.call(root.querySelectorAll(pair[0]), function(cell) {
        var txt = cell.querySelector(pair[1]);
        if (!txt) return;
        cell.classList.toggle('is-truncated', txt.scrollWidth > txt.clientWidth + 1);
      });
    });
  }
  window.markTruncatedCourses = markTruncatedCourses;
