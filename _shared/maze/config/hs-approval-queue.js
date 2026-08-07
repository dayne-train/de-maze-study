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

  /* ── Mutations that must survive a page load ────────────────────────────
     Approving moves app objects between three arrays: out of `activeApps`
     (Needs Review), into `WAITING_APPS`, and denials into `ALL_DENIED_APPS`.
     Every step is a real document load now, so without this the participant
     approves three applications, lands back on the queue, and finds all three
     still sitting in Needs Review — which reads as the approval having failed.

     These are top-level bindings in the prototype's shared global scope, NOT
     properties of window, so they are reachable by bare name from here but not
     via window.x. Hence the direct references and the try/catch: a missing
     binding must degrade to fixture defaults, never throw during boot.

     `activeApps` is reassigned wholesale by confirmBulkApprove(), so restoring
     it is an assignment. WAITING_APPS and ALL_DENIED_APPS are const arrays
     mutated in place, so they are emptied and refilled instead — reassigning
     them would throw and lose the whole restore. */
  function snapshot() {
    var out = {};
    try { out.active = activeApps; } catch (e) {}
    try { out.waiting = WAITING_APPS; } catch (e) {}
    try { out.denied = ALL_DENIED_APPS; } catch (e) {}
    return out;
  }

  function refill(arr, next) {
    if (!arr || !next) return;
    arr.length = 0;
    next.forEach(function (x) { arr.push(x); });
  }

  function restore(data) {
    if (!data) return;
    if (data.active) { try { activeApps = data.active; } catch (e) {} }
    try { refill(WAITING_APPS, data.waiting); } catch (e) {}
    try { refill(ALL_DENIED_APPS, data.denied); } catch (e) {}
    /* Re-render from the restored buckets. apply() runs after this and will
       navigate to the requested screen, but the tables are painted from module
       state that has just changed underneath them. */
    try { if (typeof renderTable === 'function') renderTable(); } catch (e) {}
    try { if (typeof renderWaitingTable === 'function') renderWaitingTable(); } catch (e) {}
  }

  MazeShim.init({
    proto: 'hs-approval-queue',
    defaultScreen: 'dashboard',
    snapshot: snapshot,
    restore: restore,

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
      var id = screen && screen.id;
      /* The bulk screens render from currentActionIds, which showScreen()
         receives as an ARGUMENT and holds only in memory. A page load loses it,
         and the screen then shows an empty selection with a live Approve button
         — worse than an error, because it looks like it worked. */
      var sel = null;
      if (id === 'screen-bulk-approve' || id === 'screen-deny') {
        try {
          if (currentActionIds && currentActionIds.length) sel = currentActionIds.join(',');
        } catch (e) {}
      }
      return {
        seg:  onDe ? activeSeg() : null,
        mode: onDe ? (window.deScreenMode === 'review' ? 'review' : 'all') : null,
        app:  window.currentReviewId || null,
        sel:  sel
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

      /* Bulk screens: hand the ids back the way showScreen() expects them, and
         re-tick the checkboxes underneath. Restoring selectedIds matters even
         though the bulk screen does not read it — confirmBulkApprove() deletes
         from it on commit, and the queue behind renders ticks from it, so a
         participant who backs out would find their selection gone. */
      if ((p.screen === 'bulk-approve' || p.screen === 'deny') && p.sel) {
        var ids = p.sel.split(',').filter(Boolean);
        try { ids.forEach(function (id) { selectedIds.add(id); }); } catch (e) {}
        if (p.screen === 'bulk-approve') window.showScreen('bulk-approve', ids);
        else window.showScreen('deny', { ids: ids, from: 'queue' });
        return;
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
