/* HS Approval Queue — DevDrawer controls.
   Vanilla, no deps. Renders the shared right-edge drawer (../_shared/dev-drawer/dev-drawer.js)
   with this prototype's controls, all routed through the window.__dev bridge (see dev.js).

   Section order is shared across all three DE prototypes for consistency:
   Navigate · Exchange network · Scenario · Appearance · Concepts · Tools.
   Prototypes / Changelog / Reset live in the drawer's persistent footer, so the
   escape hatches are always in the same place (see _shared/dev-drawer). */
(function () {
  function d() { return window.__dev || {}; }
  function nav(s) { (d().navTo || window.showScreen || function () {})(s); }
  function gate(k, on) { if (d().setGate) d().setGate(k, on); }
  function entry(k, on) { if (d().setEntry) d().setEntry(k, on); }
  function view(k, on) { if (d().setView) d().setView(k, on); }

  /* Initial control values come from the URL, not from a literal: a link can arrive with
     ?persona=james&theme=dark and DevDrawer.build has no post-build setter, so hardcoding
     them would leave the drawer describing a page that is not on screen. Both helpers are
     from deeplink-config.js, which is parsed before this init runs; DENetwork.get covers
     the gate/entry/visibility toggles, which travel in ?net= rather than in a DELink param. */
  function urlVal(name, fallback) {
    return window.dlParamFromUrl ? window.dlParamFromUrl(name, fallback) : fallback;
  }
  function urlScreen(fallback) {
    return window.dlScreenIdFromUrl ? window.dlScreenIdFromUrl(fallback) : fallback;
  }
  function netOn(key, fallback) {
    if (!window.DENetwork) return fallback;
    var v = DENetwork.get(key);
    return v == null ? fallback : !!v;
  }

  var SCREENS = [
    ['Start', 'path-select'], ['Email', 'email'], ['Login', 'login'], ['Service', 'service-select'],
    ['Workspace', 'dashboard'], ['Applications', 'de'], ['Pending Invites', 'invites'], ['Invite', 'invite-learners'], ['Global Search', 'adv-search']
  ];

  function init() {
    if (!window.DevDrawer) return;
    DevDrawer.build('Prototype Settings', function (p) {
      p.section('Navigate');
      p.nav(SCREENS, function (v) { nav(v); }, { active: urlScreen('path-select') });

      /* ── Exchange network — approval gates this network requires + its shape.
            Turning a gate off drops that step from every stepper and status. ── */
      p.section('Exchange network');
      p.note('Approvals this network requires:');
      p.toggle('Parent / guardian consent', netOn('guardianConsent', true), function (on) { gate('guardianConsent', on); });
      p.toggle('Counselor approval', netOn('counselorApproval', true), function (on) { gate('counselorApproval', on); });
      p.toggle('Institution review', netOn('institutionReview', true), function (on) { gate('institutionReview', on); });
      p.note('Entry points — how a learner can start');
      p.toggle('College invite', netOn('heInvite', true),  function (on) { entry('heInvite', on); });
      p.toggle('High school invite', netOn('hsInvite', true), function (on) { entry('hsInvite', on); });
      p.toggle('Application URL', netOn('selfUrl', false), function (on) { entry('selfUrl', on); });
      p.toggle('Learner dashboard', netOn('dashboard', true), function (on) { entry('dashboard', on); });
      p.note('Visibility — the wider record beyond this org\'s action queue');
      p.toggle('See all applications', netOn('hsView', true), function (on) { view('hsView', on); });
      p.note('High schools');
      p.segmented([['1 HS', 'single'], ['Multiple', 'multiple']],
        urlVal('schools', '1') === 'many' ? 'multiple' : 'single',
        function (v) { d().setMultiHs && d().setMultiHs(v === 'multiple'); });

      p.section('Scenario');
      p.note('Queue size');
      p.grid([['0', '0'], ['3', '3'], ['8', '8'], ['20', '20']], function (v) { d().setQueueSize && d().setQueueSize(v); }, { active: urlVal('rows', '8'), columns: 2 });
      p.button('Approve first 3', function () { d().approveFirst && d().approveFirst(); });
      p.button('Deny first', function () { d().denyFirst && d().denyFirst(); });
      p.button('Open bulk approval', function () { d().openBulkApprove && d().openBulkApprove(); });
      p.button('No applications', function () { window.setNoApplications && window.setNoApplications(true); });

      p.section('Appearance');
      p.note('Persona');
      p.grid([['Morgan Lee', 'morgan'], ['James Park', 'james']], function (v) { d().setPersona && d().setPersona(v); }, { active: urlVal('persona', 'morgan') });
      p.note('Theme');
      p.select(['default', 'light', 'white', 'dark', 'contrast'], urlVal('theme', 'default'), function (v) { d().setTheme && d().setTheme(v); });

      p.section('Concepts');
      p.toggle('Attachments in detail', urlVal('attach', '0') === '1', function (v) { d().setShowAttachments && d().setShowAttachments(v); });
      p.toggle('Bulk upload: success state', urlVal('bulkok', '0') === '1', function (v) { d().setBulkValidateSuccess && d().setBulkValidateSuccess(v); });
      /* One `grades` param carries both the gate and the variant, so both controls read it. */
      p.toggle('Grades (concept)', urlVal('grades', 'off') !== 'off', function (v) { d().setActiveEnrollments && d().setActiveEnrollments(v); });
      p.toggle('Show In Progress (demo)', urlVal('inprogress', '1') === '1', function (v) { window.setShowInProgress && setShowInProgress(v); });
      p.segmented([['A · Table', 'table'], ['B · Split View', 'split'], ['C · Report', 'reportc']],
        urlVal('grades', 'off') === 'report' ? 'reportc' : (urlVal('grades', 'off') === 'split' ? 'split' : 'table'),
        function (v) { window.setActiveEnrollmentsVariant && setActiveEnrollmentsVariant(v); });

      p.section('Tools');
      /* Configuration travels in the link, not by merging the prototypes into one
         app (see the portable-config note in _shared/network/network.js). Copying
         this gives a URL that opens THIS prototype in exactly this configuration —
         shareable, and readable enough to hand-edit. */
      p.button('\u29c9 Copy configuration link', function () {
        if (!window.DENetwork) return;
        var url = DENetwork.link(location.origin + location.pathname);
        function done() { if (window.tastyToast) tastyToast('Configuration link copied.', 'success'); }
        if (navigator.clipboard) navigator.clipboard.writeText(url).then(done, done);
        else done();
      });
      p.button('Edit groups (multi)', function () { window.openEditGroups && window.openEditGroups('DE-2026-0483'); });
      p.button('Edit learner (missing)', function () {
        var l = (typeof LEARNER_ROSTER !== 'undefined') && LEARNER_ROSTER.find(function (x) { return x.missingData; });
        if (l && window.openEditLearner) window.openEditLearner(l.id);
      });
      p.button('✎ Fill learner form', function () { window.devFillEditLearner && window.devFillEditLearner(); });
    }, { scope: 'hs', onReset: function () { d().reset && d().reset(); } });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
