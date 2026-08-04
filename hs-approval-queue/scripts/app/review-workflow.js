/* scripts/app/review-workflow.js — Review Applications focused workflow.
   Micro-Frontend architecture (doc 99): the needs-review queue is ONE module
   presented in two shell contexts on screen-de —
     • 'all'    = standard page (All Applications): nav tabs, all 5 segments, Add Enrollment.
     • 'review' = focused workflow (Review Applications, Launchpad pattern): the
                  WorkflowHeader replaces the nav, segment tabs + Add Enrollment are
                  hidden, the queue is locked to needs-review. The only exit is
                  "Back to Workspace" (Launchpad exits need no confirmation modal).
   Reusing screen-de (vs duplicating) keeps one source of truth for the table,
   bulk approve/deny, search, and pagination logic.
   Load order is fixed in index.html; do not reorder casually. */

  /* Sticky shell mode. Default 'all'. Set by the Workspace entry points below and
     read by showScreen('de') (nav.js) + the exchange-model stranding guard (core.js). */
  var deScreenMode = 'all';

  /* Apply the current shell context to screen-de. Called from showScreen('de'). */
  function applyDeMode() {
    var review = deScreenMode === 'review';

    var navShell = document.getElementById('de-nav-shell');
    if (navShell) navShell.style.display = review ? 'none' : '';
    var wfShell = document.getElementById('de-workflow-shell');
    if (wfShell) wfShell.style.display = review ? '' : 'none';

    // The focused Review Applications view is locked to needs-review — no segment nav.
    // Also hidden in the no-applications empty state.
    var segRow = document.querySelector('#screen-de .seg-row');
    if (segRow) segRow.style.display = (review || window.__noApps) ? 'none' : '';

    var title = document.getElementById('de-page-title');
    if (title) title.textContent = review ? 'Review Applications' : 'Applications';

    // Workflow is locked to the needs-review bucket.
    if (review && typeof switchSegment === 'function') switchSegment('needs-review');
  }
  window.applyDeMode = applyDeMode;


  /* ─── Visibility (DENetwork heView / hsView) ───
     With the wider record switched off there is no browsable Applications page:
     screen-de exists only in its focused 'review' shell, entered from the Workspace
     "Review Applications" card. The nav tab and the View All Applications card are
     hidden by applyExchangeModel; this keeps the SHELL honest too, so flipping the
     setting while sitting on the standard page doesn't leave the segment tabs and
     the "Applications" title behind. Only ever forces INTO the focused shell —
     turning visibility back on shouldn't yank someone out of a review they're in. */
  window.applyRecordVisibility = function (hasView) {
    if (hasView || deScreenMode === 'review') return;
    deScreenMode = 'review';
    if (typeof selectedIds !== 'undefined' && selectedIds.clear) selectedIds.clear();
    applyDeMode();
  };

  /* ─── Workspace entry points ─── */
  // Launch the focused review workflow (Workspace "Review Applications" card).
  window.enterReviewWorkflow = function() {
    deScreenMode = 'review';
    if (typeof selectedIds !== 'undefined' && selectedIds.clear) selectedIds.clear();
    showScreen('de');
  };

  // Open the full Applications page (Workspace "View All Applications" card / nav tab).
  window.showAllApplications = function() {
    deScreenMode = 'all';
    showScreen('de');
  };

  // Launchpad exit — leave the workflow and return to the Workspace.
  window.exitReviewWorkflow = function() {
    deScreenMode = 'all';
    showScreen('dashboard');
  };
