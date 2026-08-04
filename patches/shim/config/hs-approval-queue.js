/* maze-shim descriptor — hs-approval-queue (HS admin: Morgan Lee, Pioneer HS).
   Loads after maze-shim.js and after every prototype script. */
(function () {
  'use strict';

  /* Only these four are queue segments. "Invited" is its own screen
     (#screen-invites) on the HS fork, not a segment. The ae-seg-panel-* ids
     belong to the Grades concept and must never be confused with these. */
  var SEGS = ['needs-review', 'waiting', 'active', 'denied'];

  function activeSeg() {
    var panels = document.querySelectorAll('.seg-panel.active');
    for (var i = 0; i < panels.length; i++) {
      var id = panels[i].id || '';
      if (id.indexOf('seg-panel-') === 0) return id.slice('seg-panel-'.length);
    }
    return null;
  }

  function knownApp(id) {
    if (!id) return false;
    try { return !!(window.findAppAnywhere && window.findAppAnywhere(id)); }
    catch (e) { return false; }
  }

  MazeShim.init({
    proto: 'hs-approval-queue',
    defaultScreen: 'dashboard',

    screens: [
      'path-select', 'email', 'login', 'service-select', 'dashboard', 'de',
      'review', 'deny', 'bulk-approve', 'invites', 'invite-learners',
      'invite-college', 'invite-groups', 'add-learners', 'bulk-upload',
      'edit-learner', 'edit-groups', 'active-enrollments'
      /* 'adv-search' is deliberately EXCLUDED: renderAdvancedResults() early-returns
         unless advSearch.active, and it is itself the function that calls
         showScreen('adv-search'). A cold link yields a blank Global Search page. */
    ],

    wrap: ['showScreen', 'switchSegment', 'enterReviewWorkflow',
           'showAllApplications', 'viewApplication'],

    observe: function () {
      var screen = document.querySelector('.screen.active');
      var onDe = screen && screen.id === 'screen-de';
      return {
        seg:  onDe ? activeSeg() : null,
        mode: onDe ? (window.deScreenMode === 'review' ? 'review' : 'all') : null,
        app:  window.currentReviewId || null
      };
    },

    apply: function (p) {
      /* ORDER MATTERS.
         1. mode first — applyDeMode() force-calls switchSegment('needs-review')
            in review mode, so setting the segment before the mode is pointless.
         2. screen next.
         3. seg last, for the same reason. */
      if (p.mode === 'review' && typeof window.enterReviewWorkflow === 'function') {
        window.enterReviewWorkflow();
      } else if (p.mode === 'all' && typeof window.showAllApplications === 'function') {
        window.showAllApplications();
      }

      if (p.screen === 'review' && p.app) {
        /* Prefer viewApplication() over showScreen('review', id): it sets
           __reviewOrigin, which drives the Back button's label and destination.
           A bogus id would otherwise render a broken empty detail with no error. */
        if (!knownApp(p.app)) {
          console.warn('[maze-shim] unknown application "' + p.app + '" — falling back to the queue');
          window.showScreen('de');
        } else if (typeof window.viewApplication === 'function') {
          window.viewApplication(p.app);
        } else {
          window.showScreen('review', p.app);
        }
      } else if (p.screen) {
        window.showScreen(p.screen);
      }

      if (p.seg && SEGS.indexOf(p.seg) !== -1 && typeof window.switchSegment === 'function') {
        var btn = document.getElementById('seg-btn-' + p.seg);
        /* applyExchangeModel() hides segment tabs the current config does not
           support. Landing on an invisible tab is a dead end. */
        if (btn && btn.offsetParent !== null) window.switchSegment(p.seg);
        else console.warn('[maze-shim] segment "' + p.seg + '" is hidden under the current config — staying put');
      }
    }
  });
})();
