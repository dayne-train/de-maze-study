/* scripts/app/approve-consent.js — Single-learner "Admit Now" workflow page (COLLEGE ADMIN).
   Every time the admin admits a single learner (from the queue row OR the review screen), this
   navigates to the full-screen #screen-admit-confirm step instead of a modal — per Figma
   "2.1.3 - Admin Application Approval 05" (node 13572:121048). Two admit paths (Corey review #8):
   "Admit & Invite To Register For Courses" (the existing pipeline) vs "Admit Only" (park in the
   Admitted bucket until invited to register). Bulk approve has its own workflow step (bulk.js). */

  var _approveConsentOnRegister = null;
  var _approveConsentOnHold     = null;

  /* Gate a single approval behind the Admit workflow page. institution arg kept for shape parity
     with the counselor signature, but unused (college-admin has one institution: WVCC). */
  function requestApproveConsent(id, institution, learnerName, onConfirmRegister, onConfirmHold) {
    _approveConsentOnRegister = onConfirmRegister;
    _approveConsentOnHold     = onConfirmHold || null;
    var fromReview = document.getElementById('screen-review').classList.contains('active');
    currentActionIds    = [id];
    currentActionSource = fromReview ? 'review' : 'queue';
    showScreen('admit-confirm');
  }
  window.requestApproveConsent = requestApproveConsent;

  /* Learner's primary group + term as one display string ("English - FALL 2026"),
     "+N more" if the learner carries additional groups. */
  function admitGroupTermText(app) {
    var groups = (typeof getAppGroups === 'function') ? getAppGroups(app) : [];
    if (!groups.length) return app.group || '—';
    var first = groups[0];
    var text = first.name + (first.term ? ' - ' + first.term : '');
    if (groups.length > 1) text += ' +' + (groups.length - 1) + ' more';
    return text;
  }

  function renderAdmitConfirmScreen() {
    var mount = document.getElementById('admit-confirm-content');
    if (!mount) return;
    var ids  = currentActionIds || [];
    var apps = activeApps.filter(function(a) { return ids.indexOf(a.id) > -1; });
    var n    = apps.length;
    if (n === 0) { mount.innerHTML = ''; return; }

    var groupText = n === 1 ? admitGroupTermText(apps[0])
      : apps.map(admitGroupTermText).filter(function(t, i, arr) { return arr.indexOf(t) === i; }).join('; ');

    mount.innerHTML =
      '<div class="invite-groups-card" style="max-width:760px;margin:0 auto;width:100%;">' +
        '<div class="invite-groups-card-header">Review Summary and Confirm</div>' +
        '<div class="invite-groups-card-body">' +
          '<div class="invite-summary-stats">' +
            '<div class="invite-summary-stat">' +
              '<i class="ti ti-users" style="font-size:28px;color:var(--c-brand);"></i>' +
              '<p class="invite-summary-stat-label">Learners</p>' +
              '<p class="invite-summary-stat-value">' + n + '</p>' +
              '<p class="invite-summary-stat-sub">' + (n === 1 ? 'Learner Selected' : 'Learners Selected') + '</p>' +
            '</div>' +
            '<div class="invite-summary-stat">' +
              '<i class="ti ti-users-group" style="font-size:28px;color:var(--c-brand);"></i>' +
              '<p class="invite-summary-stat-label">Group(s) &amp; Term(s)</p>' +
              '<p class="invite-summary-stat-sub">' + groupText + '</p>' +
            '</div>' +
          '</div>' +
        '</div>' +
        '<div class="invite-groups-card-footer" style="gap:12px;">' +
          '<button class="tasty-btn is-bold is-ghost is-sm" id="admit-confirm-hold-btn">Admit Only</button>' +
          '<button class="tasty-btn is-success is-sm" id="admit-confirm-btn">Admit &amp; Invite To Register For Courses</button>' +
        '</div>' +
      '</div>';

    document.getElementById('admit-confirm-hold-btn').addEventListener('click', function() {
      var cb = _approveConsentOnHold;
      _approveConsentOnRegister = null; _approveConsentOnHold = null;
      if (cb) cb();
      returnFromAdmitConfirm();
    });
    document.getElementById('admit-confirm-btn').addEventListener('click', function() {
      var cb = _approveConsentOnRegister;
      _approveConsentOnRegister = null; _approveConsentOnHold = null;
      if (cb) cb();
      returnFromAdmitConfirm();
    });
  }
  window.renderAdmitConfirmScreen = renderAdmitConfirmScreen;

  /* Reveal the (now-updated) source screen after commit. */
  function returnFromAdmitConfirm() {
    if (currentActionSource === 'review') showScreen('review', currentReviewId);
    else showScreen('de');
  }
