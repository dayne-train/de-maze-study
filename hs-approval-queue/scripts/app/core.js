/* scripts/app/core.js — module split from former scripts/app.js (one IIFE, now dissolved to shared global scope). Shared state (selectedIds, activeApps, searchTerm…), paginator utility + instances, exchange model, step dots.
   Load order is fixed in index.html; do not reorder casually. */
  /* ─── State ─── */
  let selectedIds   = new Set();
  let selectedInvitedIds = new Set();
  let activeApps    = ALL_APPS.slice(); // current visible set (can be filtered by dev panel count)
  let visibleApps   = []; // activeApps after status filter

  /* ─── Exchange-network re-bucketing (shared DENetwork gates) ───
     When counselor approval is off, Needs Review apps have no counselor step, so
     they belong in Waiting (awaiting institution review — guardian is already done
     at the counselor step). Derived on READ: the source arrays are never mutated,
     so toggling the gate back is instant and the approve/deny paths are untouched.
     Moved apps are prepended and marked _xlated so they're never written back. */
  function _netGate(k) { return (window.DENetwork ? window.DENetwork.get(k) : true) !== false; }
  function _reviewToWaiting(a) {
    return Object.assign({}, a, { awaitingConsent: false, awaitingInstitution: true, awaitingRegistration: false, _xlated: true });
  }
  function reviewBucket()  { return _netGate('counselorApproval') ? activeApps : []; }
  function waitingBucket() {
    return _netGate('counselorApproval')
      ? WAITING_APPS
      : activeApps.map(_reviewToWaiting).concat(WAITING_APPS);
  }
  let currentCounselor = 'morgan';
  let searchTerm      = '';      // empty = no search filter

  /* Advanced search state. criteria mirrors the modal's form fields. */
  const advSearch = {
    active: false,
    criteria: emptyAdvCriteria(),
    results: [],
  };
  function emptyAdvCriteria() {
    return {
      firstName: '', lastName: '', sisId: '',
      school: '', grade: '', gpaMin: '', gpaMax: '',
      institution: '', group: '',
      statuses: new Set(),       // 'pending' | 'invited' | 'active' | 'denied'
      flags: new Set(),          // 'gpa' | 'grade' | 'prereq' | 'transcript' | 'consent'
      receivedFrom: '', receivedTo: '',
    };
  }

  var currentReviewId     = null;
  var currentActionIds    = [];
  var currentActionSource = 'queue';

  /* ═══════════════════════════════════════════
     PAGINATOR — shared pagination utility
     Each view gets its own instance so per-page selection sticks.
  ═══════════════════════════════════════════ */
  function makePaginator(labelId, buttonsId, selectId, onPageChange) {
    var pag = { page: 1, perPage: 10 };

    /* paginate(allItems) → { slice, total, pages, start, end } */
    pag.paginate = function(allItems) {
      var total = allItems.length;
      var pages = Math.ceil(total / pag.perPage) || 1;
      pag.page = Math.min(pag.page, Math.max(1, pages));
      var start = (pag.page - 1) * pag.perPage;
      var end   = Math.min(start + pag.perPage, total);
      return { slice: allItems.slice(start, end), total: total, pages: pages, start: start, end: end };
    };

    /* renderControls(total, pages, start, end, grandTotal) — writes label + buttons */
    pag.renderControls = function(total, pages, start, end, grandTotal) {
      var label = document.getElementById(labelId);
      if (label) {
        if (total === 0) {
          label.innerHTML = 'NO RESULTS';
        } else {
          var gt = grandTotal != null ? grandTotal : total;
          label.innerHTML = 'SHOWING <strong>' + (start + 1) + '–' + end + '</strong> OF <strong>' + gt + '</strong>';
        }
      }

      var btns = document.getElementById(buttonsId);
      if (btns) {
        var html = '<button class="tasty-pagination__item' + (pag.page <= 1 ? ' is-disabled' : '') + '" ' + (pag.page <= 1 ? 'disabled' : '') + ' data-pg-dir="prev" aria-label="Previous page"><i class="ti ti-chevron-left"></i></button>';
        for (var p = 1; p <= pages; p++) {
          html += '<button class="tasty-pagination__item' + (p === pag.page ? ' is-active' : '') + '" data-pg="' + p + '" aria-label="Page ' + p + '">' + p + '</button>';
        }
        html += '<button class="tasty-pagination__item' + (pag.page >= pages ? ' is-disabled' : '') + '" ' + (pag.page >= pages ? 'disabled' : '') + ' data-pg-dir="next" aria-label="Next page"><i class="ti ti-chevron-right"></i></button>';
        btns.innerHTML = html;
      }

      /* Sync the per-page select to current value (handles first render + memory) */
      var sel = document.getElementById(selectId);
      if (sel) sel.value = String(pag.perPage);
    };

    /* Wire click + change events (once, via delegation on the paginator's parent) */
    (function wireEvents() {
      var btns = document.getElementById(buttonsId);
      if (btns) {
        btns.addEventListener('click', function(e) {
          var btn = e.target.closest('[data-pg]');
          var dir = e.target.closest('[data-pg-dir]');
          if (btn) {
            pag.page = parseInt(btn.dataset.pg, 10);
            onPageChange();
          } else if (dir) {
            if (dir.dataset.pgDir === 'prev' && pag.page > 1) { pag.page--; onPageChange(); }
            else if (dir.dataset.pgDir === 'next') { pag.page++; onPageChange(); }
          }
        });
      }
      var sel = document.getElementById(selectId);
      if (sel) {
        sel.addEventListener('change', function() {
          pag.perPage = parseInt(sel.value, 10);
          pag.page = 1;
          onPageChange();
        });
      }
    })();

    return pag;
  }

  /* ─── Entry points ───
     Which initiation points a network offers now lives in the shared DENetwork model
     as four independent switches (heInvite · hsInvite · selfUrl · dashboard), not the
     old invite/open/combined enum. The enum couldn't express the real cases — a
     college inviting while its high schools can't, or a self-serve URL without the
     learner dashboard — and it conflated "who may invite" with "what this counselor
     can see". Read through DENetwork.canInvite()/canSelfApply().
     Still independent of how many high schools the counselor spans (see multiHs). */

  /* Whether this counselor spans multiple high schools (dev toggle, default OFF — the counselor
     normally sees one HS). Only when ON is the learner's High School worth surfacing as its own
     column (body.show-hs reveals the .col-hs cells). */
  var multiHs = false;
  function applyHsScope() {
    document.body.classList.toggle('show-hs', multiHs);
    // The Global Search "High school" filter follows the same axis as the column.
    // The pool classifies Needs Review vs Waiting from the approval gate, so it has
    // to be rebuilt when the config changes or search serves a stale classification.
    if (typeof refreshUnifiedPool === 'function') refreshUnifiedPool();
    if (typeof window.applySearchConfig === 'function') window.applySearchConfig();
  }

  /* Active Enrollments (concept, dev toggle, default OFF). Unreleased grade-export exploration —
     kept out of the default nav so it doesn't show up unless explicitly switched on in the drawer. */
  var showActiveEnrollments = false;
  function applyActiveEnrollmentsScope() { document.body.classList.toggle('show-active-enrollments', showActiveEnrollments); }

  function applyExchangeModel() {
    // Inviting is this high school's own capability: whether the COLLEGE can invite
    // says nothing about whether this counselor can.
    var hasInvite = window.DENetwork ? window.DENetwork.canInvite('hs') : true;

    // Review is decided by the counselor-approval GATE alone. Entry points have no
    // say in it: if this network requires high school approval, every application
    // needs it regardless of how the learner started — invited by the high school,
    // invited by the college, or self-applied. (Gates and entry points are separate
    // axes, which is exactly how Corey's configuration explorer models them.)
    // The old invite/open/combined enum wrongly emptied Needs Review whenever the
    // network was invite-only, on the assumption that an invited learner is
    // pre-vetted and so has nothing left to review. That assumption is wrong —
    // confirmed with Dayne, July 30 — so it is gone rather than generalised.
    var hasReview = (window.DENetwork ? window.DENetwork.get('counselorApproval') : true) !== false;

    // ── Workspace offerings ──
    // "Review Applications" follows the counselor-approval gate; "Invite Learners"
    // follows this high school's own invite entry point.
    // Availability, not inline display: the card may also be hidden by the user's
    // own Starting Screen preference, and wsSetCardAvailable re-measures the
    // row-start borders so the wrapping flex row doesn't end up with stray
    // separators where a hidden card used to sit.
    wsSetCardAvailable('ws-review-card', hasReview);
    wsSetCardAvailable('ws-invite-card', hasInvite);

    // ── Dual Enrollment segment tabs ──
    // Needs Review exists whenever the network requires high school approval;
    // Waiting / Registered / Closed depend on this org's visibility (below).
    // (Invited left the segment set for its own top-level tab: Corey review #7.)
    var reviewSeg  = document.getElementById('seg-btn-needs-review');
    if (reviewSeg)  reviewSeg.style.display  = hasReview ? '' : 'none';

    // ── Application visibility ──
    // A network can give an org its action queue WITHOUT the wider record: it works
    // what it must decide on, but doesn't get to browse who's waiting, who
    // registered, or who was closed. That's the amber "View applications" switch in
    // Corey's explorer, and it's what gates the "View all applications" module.
    // Needs Review is NOT part of this — it's the action queue, owned by the
    // approval gate — and neither is Invited, which follows the invite entry point
    // (invites you sent are yours to see and resend regardless).
    // Reminders on in-flight applications fall away on their own: they live in the
    // detail of a Waiting application, which is unreachable without the record.
    var hasView = window.DENetwork ? window.DENetwork.canView('hs') : true;
    ['seg-btn-waiting', 'seg-btn-active', 'seg-btn-denied'].forEach(function (id) {
      var b = document.getElementById(id);
      if (b) b.style.display = hasView ? '' : 'none';
    });
    wsSetCardAvailable('ws-viewall-card', hasView);

    // ── Applications top-level tab ──
    // Without the wider record there is nothing to browse, so the Applications page
    // stops being a destination: the tab goes, and the only route into screen-de is
    // the Workspace "Review Applications" card, which opens the focused workflow
    // shell (WorkflowHeader instead of nav, locked to Needs Review, exit is "Back to
    // Workspace"). That shell already exists — see review-workflow.js.
    document.querySelectorAll('[data-tab-id="dual-enrollment"]').forEach(function (btn) {
      btn.style.display = hasView ? '' : 'none';
    });
    if (typeof window.applyRecordVisibility === 'function') window.applyRecordVisibility(hasView);
    // Global Search is the only remaining route to a record when the page is gone,
    // so it has to respect the same limit (see searchablePool in search.js).
    if (typeof window.applySearchConfig === 'function') window.applySearchConfig();

    // ── Invites top-level tab ──
    // "Open" means self-apply only: no inviting capability exists, so the nav tab
    // (one rendered instance per screen) and the workspace card hide with it. If the
    // user is ON the Invites screen when it disappears, fall back to Applications.
    document.querySelectorAll('[data-tab-id="invites"]').forEach(function(btn) {
      btn.style.display = hasInvite ? '' : 'none';
    });
    wsSetCardAvailable('ws-invites-card', hasInvite);
    var invitesScreen = document.getElementById('screen-invites');
    if (invitesScreen && invitesScreen.classList.contains('active') && !hasInvite) {
      showScreen('de');
    }

    // If the currently-active segment no longer exists in this model, fall back
    // to a sensible first tab (Needs Review where it exists, else Invited).
    var activeSeg = document.querySelector('.tasty-navtoggle__item.is-active');
    var oc        = activeSeg && activeSeg.getAttribute('onclick');
    var activeKey = oc ? (oc.match(/switchSegment\('([^']+)'\)/) || [])[1] : null;
    // Stranded if the active tab is one this config no longer shows. With the record
    // hidden that's every tab except Needs Review, so the fallback has to prefer a
    // tab that actually exists rather than blindly jumping to Waiting.
    var hiddenByView = !hasView && ['waiting', 'admitted', 'active', 'denied'].indexOf(activeKey) !== -1;
    var stranded  = (activeKey === 'needs-review' && !hasReview) ||
                    hiddenByView ||
                    !activeKey;
    // In the focused Review workflow the queue is locked to needs-review — an empty
    // bucket shows the "All caught up" empty state rather than jumping to another tab.
    var inReviewWorkflow = typeof deScreenMode !== 'undefined' && deScreenMode === 'review';
    if (stranded && !inReviewWorkflow && typeof switchSegment === 'function') {
      // Needs Review first; otherwise Waiting, but only if the record is visible.
      // If neither exists there is nothing to switch to, so leave the tab alone.
      if (hasReview) switchSegment('needs-review');
      else if (hasView) switchSegment('waiting');
    }

    renderTable();
  }

  /* ─── Paginator instances ─── */
  var queuePag     = makePaginator('queue-results-label',      'queue-page-buttons',       'queue-perpage-select',       function() { renderTable(); });
  var invitedPag   = makePaginator('invited-results-label',    'invited-page-buttons',     'invited-perpage-select',     function() { renderInvitedTable(); });
  var activePag    = makePaginator('active-results-label',     'active-page-buttons',      'active-perpage-select',      function() { renderActiveTable(); });
  var deniedPag    = makePaginator('denied-results-label',     'denied-page-buttons',      'denied-perpage-select',      function() { renderDeniedTable(); });
  var waitingPag   = makePaginator('waiting-results-label',     'waiting-page-buttons',     'waiting-perpage-select',     function() { renderWaitingTable(); });
  var advResultPag = makePaginator('adv-results-label',        'adv-results-page-buttons', 'adv-results-perpage-select', function() { renderAdvancedResults(); });
