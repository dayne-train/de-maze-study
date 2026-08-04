/* scripts/app/approve-consent.js — Single-learner attestation modal.
   Every time a counselor approves a single learner (from the queue OR the review screen),
   this modal fires — non-skippable. The accordion expands the institution's eligibility
   requirements so the counselor can review what they're attesting to. Gates the single
   approve paths; bulk approve has its own modal (bulk.js). Load order is fixed in index.html. */

  var _approveConsentOnConfirm = null;

  /* Show the attestation modal before committing an approval.
     institution: app.institution key · learnerName: display name · onConfirm: commit fn. */
  function requestApproveConsent(institution, learnerName, onConfirm) {
    var r       = (typeof COLLEGE_REQS !== 'undefined' && (COLLEGE_REQS[institution] || COLLEGE_REQS.wvcc)) || { reqs: [] };
    var reqs    = r.reqs || [];
    var college = (typeof COLLEGES !== 'undefined' && (COLLEGES[institution] || institution)) || institution;

    document.getElementById('approve-consent-learner').textContent = learnerName || 'this learner';
    document.getElementById('approve-consent-count').textContent   = reqs.length;
    document.getElementById('approve-consent-college').textContent = college;
    document.getElementById('approve-consent-acc-label').textContent =
      'View the ' + reqs.length + ' eligibility requirement' + (reqs.length === 1 ? '' : 's');
    document.getElementById('approve-consent-reqs').innerHTML = reqs.map(function (req, i) {
      return '<li class="req-modal-item">' +
        '<div class="req-modal-num">' + (i + 1) + '</div>' +
        '<div><p class="req-modal-label">' + req.label + '</p>' +
        '<p class="req-modal-desc">' + req.desc + '</p></div>' +
      '</li>';
    }).join('');

    // Reset transient state each open: collapsed accordion.
    document.getElementById('approve-consent-accordion').classList.remove('is-open');
    document.getElementById('approve-consent-acc-head').setAttribute('aria-expanded', 'false');

    _approveConsentOnConfirm = onConfirm;
    document.getElementById('approve-consent-overlay').classList.add('open');
  }

  function closeApproveConsent() {
    document.getElementById('approve-consent-overlay').classList.remove('open');
    _approveConsentOnConfirm = null;
  }

  function toggleApproveConsentAccordion() {
    var acc  = document.getElementById('approve-consent-accordion');
    var open = acc.classList.toggle('is-open');
    document.getElementById('approve-consent-acc-head').setAttribute('aria-expanded', open ? 'true' : 'false');
  }

  window.requestApproveConsent       = requestApproveConsent;
  window.closeApproveConsent         = closeApproveConsent;
  window.toggleApproveConsentAccordion = toggleApproveConsentAccordion;

  (function wireApproveConsent() {
    var confirmBtn = document.getElementById('approve-consent-confirm-btn');
    if (confirmBtn) {
      confirmBtn.addEventListener('click', function () {
        var cb = _approveConsentOnConfirm;
        closeApproveConsent();
        if (cb) cb();
      });
    }
    var head = document.getElementById('approve-consent-acc-head');
    if (head) {
      head.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleApproveConsentAccordion(); }
      });
    }
    // Click the backdrop (not the surface) to cancel.
    var overlay = document.getElementById('approve-consent-overlay');
    if (overlay) {
      overlay.addEventListener('click', function (e) { if (e.target === overlay) closeApproveConsent(); });
    }
  })();
