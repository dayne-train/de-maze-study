/* scripts/app/confirm.js — module split from former scripts/app.js (one IIFE, now dissolved to shared global scope). Deny screen, confirmEndorse, approve-success screen, confirmDeny.
   Load order is fixed in index.html; do not reorder casually. */
  /* ─── Deny Screen ─── */
  /* ═══════════════════════════════════════════
     DENY SCREEN — Single and bulk denial flow render
  ═══════════════════════════════════════════ */
  /* Build the deny content (shared by the standalone screen + the single-app modal).
     includeTitle=false drops the in-content heading AND the full-width action zone (the
     modal head/footer carries the equivalent chrome) — this also doubles as the "are we in
     the modal or the standalone screen" flag. */
  function buildDenyHTML(includeTitle) {
    var ids  = currentActionIds;
    var apps = activeApps.filter(function(a) { return ids.indexOf(a.id) > -1; });
    var n    = apps.length;
    if (n === 0) return '';

    /* Avatars are the DS Tasty .tasty-persona-icon (single brand color, 40px round). */
    var studentHtml = '';
    if (n === 1) {
      var a = apps[0];
      studentHtml = '<div class="deny-student-card">' +
        '<span class="tasty-persona-icon">' + a.initials + '</span>' +
        '<div>' +
          '<p class="deny-student-name">' + a.lastName + ', ' + a.firstName + '</p>' +
          '<p class="deny-student-meta">' + (a.course || a.group) + ' &nbsp;&middot;&nbsp; ' + a.id + '</p>' +
        '</div>' +
      '</div>';
    } else {
      /* Same card + row pattern as bulk-approve (bulk.js learnerRowHtml / .bulk-net),
         so denial and approval read as one visual language. No institution grouping here —
         that's a separate, future ask (Corey review #3). */
      var rows = apps.map(function(a) {
        return '<div class="bulk-elig-row">' +
          '<span class="tasty-persona-icon">' + a.initials + '</span>' +
          '<div class="bulk-elig-info">' +
            '<div class="bulk-elig-name">' + a.lastName + ', ' + a.firstName + '</div>' +
            '<div class="bulk-elig-sub">' + (a.course || a.group) + ' &middot; ' + a.id + '</div>' +
          '</div>' +
        '</div>';
      }).join('');
      studentHtml = '<div class="bulk-net">' +
        '<div class="bulk-net-head">' +
          '<div>' +
            '<div class="bulk-net-name">Learners selected</div>' +
            '<div class="bulk-net-meta">' + n + ' learners</div>' +
          '</div>' +
        '</div>' +
        rows +
      '</div>';
    }

    var warnText = n === 1
      ? 'This decision will notify <strong>' + apps[0].firstName + ' ' + apps[0].lastName + '</strong> and their guardian. Denials can\'t be reversed once submitted.'
      : 'A denial reason will be sent to each learner and their guardian individually (' + n + ' notifications). Denials can\'t be reversed once submitted.';

    var actionRow = includeTitle !== false
      ? '<div class="review-action-zone"><div class="review-action-row">' +
          '<button class="tasty-btn is-bold is-ghost is-sm" id="deny-cancel-btn">Cancel</button>' +
          '<button class="tasty-btn is-error is-sm" id="deny-confirm-btn" disabled>' +
            '<i class="ti ti-x"></i> Confirm Denial' +
          '</button>' +
        '</div></div>'
      : '<div class="deny-action-row">' +
          '<button class="tasty-btn is-bold is-ghost is-sm" id="deny-cancel-btn">Cancel</button>' +
          '<button class="tasty-btn is-error is-sm" id="deny-confirm-btn" disabled>' +
            '<i class="ti ti-x"></i> Confirm Denial' +
          '</button>' +
        '</div>';

    return '<div class="deny-page">' +
      (includeTitle !== false ? '<h1 class="deny-page-title">Deny ' + (n === 1 ? 'Application' : n + ' Applications') + '</h1>' : '') +
      studentHtml +
      '<div class="tasty-banner is-primary"><span class="tasty-banner__icon"><i class="ti ti-info-circle"></i></span><span class="tasty-banner__message">' + warnText + '</span></div>' +
      '<label class="deny-field-label" for="deny-reason">Reason for denial <span style="color:var(--c-danger);">*</span></label>' +
      '<textarea class="tasty-textarea" id="deny-reason" placeholder="Explain why ' + (n === 1 ? 'this application is' : 'these applications are') + ' being denied. Learners will receive this message." rows="5"></textarea>' +
      actionRow +
    '</div>';
  }

  /* Wire the textarea + confirm/cancel within a given container (scoped querySelector
     avoids the duplicate #deny-cancel-btn that also lives in the deny-screen header). */
  function wireDenyControls(container, onCancel) {
    var textarea   = container.querySelector('#deny-reason');
    var confirmBtn = container.querySelector('#deny-confirm-btn');
    var cancelBtn  = container.querySelector('#deny-cancel-btn');
    if (textarea && confirmBtn) {
      textarea.addEventListener('input', function() {
        confirmBtn.disabled = textarea.value.trim().length === 0;
      });
      confirmBtn.addEventListener('click', function() { confirmDeny(currentActionIds); });
    }
    if (cancelBtn) cancelBtn.addEventListener('click', onCancel);
  }

  function renderDenyScreen() {
    var mount = document.getElementById('deny-content');
    var html  = buildDenyHTML(true);
    if (!html) return;
    mount.innerHTML = html;
    wireDenyControls(mount, function() {
      if (currentActionSource === 'review') showScreen('review', currentReviewId);
      else showScreen('de');
    });
  }

  /* Single-application deny → modal (same content), instead of the standalone screen. */
  window.openDenyModal = function(id) {
    currentActionIds    = [id];
    currentActionSource = 'review';
    var mount = document.getElementById('deny-modal-body');
    var html  = buildDenyHTML(false);
    if (!mount || !html) return;
    mount.innerHTML = html;
    wireDenyControls(mount, closeDenyModal);
    document.getElementById('deny-modal').classList.add('open');
  };
  window.closeDenyModal = function() {
    var m = document.getElementById('deny-modal');
    if (m) m.classList.remove('open');
  };

  /* ─── Confirm endorse ─── */
  function confirmEndorse(ids) {
    // First-approval consent gate for single-learner approvals (until dismissed).
    if (ids.length === 1 && typeof requestApproveConsent === 'function') {
      var gateApp = activeApps.find(function(a) { return a.id === ids[0]; });
      if (gateApp) {
        requestApproveConsent(gateApp.institution, gateApp.firstName + ' ' + gateApp.lastName, function() { doEndorse(ids); });
        return;
      }
    }
    doEndorse(ids);
  }
  function doEndorse(ids) {
    var n = ids.length;
    var fromReview = (n === 1 && document.getElementById('screen-review').classList.contains('active'));
    ids.forEach(function(id) {
      var app = activeApps.find(function(a) { return a.id === id; });
      if (app) moveAppToWaiting(app);
    });
    activeApps = activeApps.filter(function(a) { return ids.indexOf(a.id) === -1; });
    ids.forEach(function(id) { selectedIds.delete(id); });
    renderTable();
    renderWaitingTable();
    if (fromReview) {
      /* Surgical DOM update — animate the stepper + swap actions in-place */
      transitionReviewInPlace(ids[0], 'approved');
      var _f = findAppAnywhere(ids[0]);
      showToast(_f ? _f.app.firstName + ' ' + _f.app.lastName + '\u2019s application approved.' : 'Application approved.', 'success');
    } else {
      // Single-from-queue and any other non-review path: in-place table refresh + toast (no success
      // screen). Hard rule (June 15): approving must NOT reset the table view/pagination.
      var msg = n === 1
        ? 'Application approved and forwarded to institution review.'
        : n + ' applications approved and forwarded to institution review.';
      showToast(msg, 'success');
    }
  }

  /* Approve-success screen retired (June 15): single + bulk approvals now refresh the table
     in place + fire a toast. See doEndorse above + bulk.js confirmBulkApprove. */

  /* ─── Confirm deny ─── */
  function confirmDeny(ids) {
    if (typeof closeDenyModal === 'function') closeDenyModal();
    var n = ids.length;
    var fromReview = (currentActionSource === 'review' && n === 1);
    var reasonEl = document.getElementById('deny-reason');
    var reason = reasonEl ? reasonEl.value.trim() : '';
    ids.forEach(function(id) {
      var app = activeApps.find(function(a) { return a.id === id; });
      if (app) moveAppToDenied(app, reason);
    });
    activeApps = activeApps.filter(function(a) { return ids.indexOf(a.id) === -1; });
    ids.forEach(function(id) { selectedIds.delete(id); });
    renderTable();
    renderDeniedTable();
    if (fromReview) {
      /* Switch back to the review screen without re-rendering,
         then surgically animate the stepper + swap actions. */
      document.querySelectorAll('.screen').forEach(function(s) { s.classList.remove('active'); });
      document.getElementById('screen-review').classList.add('active');
      window.scrollTo(0, 0);
      transitionReviewInPlace(ids[0], 'denied');
      showToast('Application denied. The learner has been notified.', 'success');
    } else {
      showScreen('de');
      showToast(
        (n === 1 ? '1 application' : n + ' applications') + ' denied. ' + (n === 1 ? 'The learner has' : 'Learners have') + ' been notified.',
        'success'
      );
    }
  }
