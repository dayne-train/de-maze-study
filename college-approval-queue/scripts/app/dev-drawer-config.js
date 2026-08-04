/* College Approval Queue — DevDrawer controls.
   Vanilla, no deps. Renders the shared right-edge drawer (../_shared/dev-drawer/dev-drawer.js)
   with this prototype's controls, all routed through the window.__dev bridge (see boot.js).

   Section order is shared across all three DE prototypes for consistency:
   Navigate · Exchange network · Scenario · Admit flows · Appearance · Concepts · Tools.
   Prototypes / Changelog / Reset live in the drawer's persistent footer, so the
   escape hatches are always in the same place (see _shared/dev-drawer). */
(function () {
  function d() { return window.__dev || {}; }
  function nav(s) { (d().navTo || window.showScreen || function () {})(s); }
  function gate(k, on) { if (d().setGate) d().setGate(k, on); }
  function entry(k, on) { if (d().setEntry) d().setEntry(k, on); }
  function view(k, on) { if (d().setView) d().setView(k, on); }

  var SCREENS = [
    ['Start', 'path-select'], ['Email', 'email'], ['Login', 'login'], ['Service', 'service-select'],
    ['Workspace', 'dashboard'], ['Applications', 'de'], ['Pending Invites', 'invites'], ['Invite', 'invite-learners'], ['Global Search', 'adv-search']
  ];

  function init() {
    if (!window.DevDrawer) return;
    DevDrawer.build('Prototype Settings', function (p) {
      p.section('Navigate');
      p.nav(SCREENS, function (v) { nav(v); }, { active: 'path-select' });

      /* ── Exchange network — approval gates this network requires + its shape.
            Turning a gate off drops that step from every stepper and status. ── */
      p.section('Exchange network');
      p.note('Approvals this network requires:');
      p.toggle('Parent / guardian consent', true, function (on) { gate('guardianConsent', on); });
      p.toggle('Counselor approval', true, function (on) { gate('counselorApproval', on); });
      p.toggle('Institution review', true, function (on) { gate('institutionReview', on); });
      p.note('Entry points — how a learner can start');
      p.toggle('College invite', true,  function (on) { entry('heInvite', on); });
      p.toggle('High school invite', true, function (on) { entry('hsInvite', on); });
      p.toggle('Application URL', false, function (on) { entry('selfUrl', on); });
      p.toggle('Learner dashboard', true, function (on) { entry('dashboard', on); });
      p.note('Visibility — the wider record beyond this org\'s action queue');
      p.toggle('See all applications', true, function (on) { view('heView', on); });
      p.note('High schools');
      p.segmented([['1 HS', 'single'], ['Multiple', 'multiple']], 'multiple', function (v) { d().setMultiHs && d().setMultiHs(v === 'multiple'); });

      p.section('Scenario');
      p.note('Queue size');
      p.grid([['0', '0'], ['3', '3'], ['8', '8'], ['20', '20']], function (v) { d().setQueueSize && d().setQueueSize(v); }, { active: '8' });
      p.button('Approve first 3', function () { d().approveFirst && d().approveFirst(); });
      p.button('Deny first', function () { d().denyFirst && d().denyFirst(); });
      p.button('No applications', function () { window.setNoApplications && window.setNoApplications(true); });

      p.section('Admit flows');
      p.button('Open bulk admit', function () { d().openBulkApprove && d().openBulkApprove(); });
      p.button('Admit only (first pending)', function () { d().admitOnlyFirst && d().admitOnlyFirst(); });
      p.button('Invite admitted to register (all)', function () { d().inviteAllAdmittedToRegister && d().inviteAllAdmittedToRegister(); });

      p.section('Appearance');
      p.note('Persona');
      p.grid([['Kathy Nguyen', 'kathy'], ['Marcus Bell', 'marcus']], function (v) { d().setPersona && d().setPersona(v); }, { active: 'kathy' });
      p.note('Theme');
      p.select(['default', 'light', 'white', 'dark', 'contrast'], 'default', function (v) { d().setTheme && d().setTheme(v); });

      p.section('Concepts');
      p.toggle('Attachments in detail', false, function (v) { d().setShowAttachments && d().setShowAttachments(v); });
      p.toggle('Bulk upload: success state', false, function (v) { d().setBulkValidateSuccess && d().setBulkValidateSuccess(v); });

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
    }, { scope: 'college', onReset: function () { d().reset && d().reset(); } });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
