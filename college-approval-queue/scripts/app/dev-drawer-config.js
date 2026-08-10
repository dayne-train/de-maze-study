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

  /* DevDrawer.build hardcodes each control's initial value and has no post-build
     setter, so on a deep-linked page the drawer would show its defaults next to a
     page in some other state. These read the same sources the link does — the raw
     URL params for the DELink axes (this runs before DELink.apply, so the live
     state is not set yet), and DENetwork for the gates, which has already hydrated
     from ?net=. Anything absent falls back to the literal it always had. */
  function q() { return (window.DELink && window.DELink.read()) || {}; }
  function qp(name, fallback) { var v = q()[name]; return v == null ? fallback : String(v); }
  function qOn(name, fallback) {
    var b = window.DELink && window.DELink.bool(q()[name]);
    return b == null ? fallback : b;
  }
  function net(key, fallback) {
    return window.DENetwork ? !!window.DENetwork.get(key) : fallback;
  }
  /* '1' vs 'many' in a link, 'single' vs 'multiple' in the control. */
  function schoolsValue() {
    var v = (q().schools || '').toLowerCase();
    if (v === '1' || v === 'single' || v === 'one' || v === 'off' || v === 'false' || v === '0') return 'single';
    return 'multiple';
  }

  function init() {
    if (!window.DevDrawer) return;
    DevDrawer.build('Prototype Settings', function (p) {
      p.section('Navigate');
      p.nav(SCREENS, function (v) { nav(v); }, { active: 'path-select' });

      /* ── Exchange network — approval gates this network requires + its shape.
            Turning a gate off drops that step from every stepper and status. ── */
      p.section('Exchange network');
      p.note('Approvals this network requires:');
      p.toggle('Parent / guardian consent', net('guardianConsent', true), function (on) { gate('guardianConsent', on); });
      p.toggle('Counselor approval', net('counselorApproval', true), function (on) { gate('counselorApproval', on); });
      p.toggle('Institution review', net('institutionReview', true), function (on) { gate('institutionReview', on); });
      p.note('Entry points — how a learner can start');
      p.toggle('College invite', net('heInvite', true),  function (on) { entry('heInvite', on); });
      p.toggle('High school invite', net('hsInvite', true), function (on) { entry('hsInvite', on); });
      p.toggle('Application URL', net('selfUrl', false), function (on) { entry('selfUrl', on); });
      p.toggle('Learner dashboard', net('dashboard', true), function (on) { entry('dashboard', on); });
      p.note('Visibility — the wider record beyond this org\'s action queue');
      p.toggle('See all applications', net('heView', true), function (on) { view('heView', on); });
      p.note('High schools');
      p.segmented([['1 HS', 'single'], ['Multiple', 'multiple']], schoolsValue(), function (v) { d().setMultiHs && d().setMultiHs(v === 'multiple'); });

      p.section('Scenario');
      p.note('Queue size');
      p.grid([['0', '0'], ['3', '3'], ['8', '8'], ['20', '20']], function (v) { d().setQueueSize && d().setQueueSize(v); }, { active: qp('rows', '8') });
      p.button('Approve first 3', function () { d().approveFirst && d().approveFirst(); });
      p.button('Deny first', function () { d().denyFirst && d().denyFirst(); });
      p.button('No applications', function () { window.setNoApplications && window.setNoApplications(true); });

      p.section('Admit flows');
      p.button('Open bulk admit', function () { d().openBulkApprove && d().openBulkApprove(); });
      p.button('Admit only (first pending)', function () { d().admitOnlyFirst && d().admitOnlyFirst(); });
      p.button('Invite admitted to register (all)', function () { d().inviteAllAdmittedToRegister && d().inviteAllAdmittedToRegister(); });

      p.section('Appearance');
      p.note('Persona');
      p.grid([['Kathy Nguyen', 'kathy'], ['Marcus Bell', 'marcus']], function (v) { d().setPersona && d().setPersona(v); }, { active: qp('persona', 'kathy').toLowerCase() });
      p.note('Theme');
      p.select(['default', 'light', 'white', 'dark', 'contrast'], qp('theme', 'default'), function (v) { d().setTheme && d().setTheme(v); });

      p.section('Concepts');
      p.toggle('Attachments in detail', qOn('attach', false), function (v) { d().setShowAttachments && d().setShowAttachments(v); });
      p.toggle('Bulk upload: success state', qOn('bulkok', false), function (v) { d().setBulkValidateSuccess && d().setBulkValidateSuccess(v); });

      p.section('Tools');
      /* Configuration travels in the link, not by merging the prototypes into one
         app (see the portable-config note in _shared/network/network.js). Copying
         this gives a URL that opens THIS prototype in exactly this configuration —
         shareable, and readable enough to hand-edit. */
      /* Configuration only \u2014 DELink.url({base}) starts from an empty query, so this
         stays the plain "open this prototype in this network" link it always was,
         while the footer's Share link carries the current view as well. Going
         through DELink also fixes it on file://, where location.origin is the
         string "null" and the old hand-rolled link came out unusable. */
      p.button('\u29c9 Copy configuration link', function () {
        if (window.DELink) {
          window.DELink.copy({ base: String(location.href).split(/[?#]/)[0] });
          return;
        }
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
