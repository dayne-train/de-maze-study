/* Learner Application — DevDrawer controls.
   Vanilla, no deps. Renders the shared right-edge drawer (../_shared/dev-drawer/dev-drawer.js)
   with this prototype's controls, routed through the window.__dev bridge (see app.js initDevPanel)
   and the window.dev* demo helpers.

   Section order is shared across all three DE prototypes for consistency:
   Exchange network · State · Appearance · Demo tools. Prototypes / Changelog /
   Reset live in the drawer's persistent footer (see _shared/dev-drawer). */
(function () {
  function dev() { return window.__dev || {}; }
  function axis(a, v) { if (dev().setAxis) dev().setAxis(a, v); }
  function gate(k, on) { if (dev().setGate) dev().setGate(k, on); }
  function entry(k, on) { if (dev().setEntry) dev().setEntry(k, on); }
  function go(s) { if (window.showScreen) window.showScreen(s); }

  var APP_STATES = [
    ['Invited', 'invited'], ['Open enrollment', 'open-enrollment'], ['Guardian consent', 'parent-consent-pending'],
    ['High school', 'counselor-pending'], ['Dual pending', 'dual-pending'], ['Institution review', 'college-review'],
    ['Approved', 'approved'], ['Registered', 'registered'], ['In session', 'registered-in-session'],
    ['Denied (counselor)', 'denied-counselor'], ['Denied (college)', 'denied-college'], ['Cancelled', 'cancelled']
  ];

  function init() {
    if (!window.DevDrawer) return;
    DevDrawer.build('Prototype Settings', function (p) {
      /* ── Exchange network — which approval gates this network requires, plus how
            the learner got here. Turning a gate off removes its stepper step, its
            form section, and every mention of it downstream. ── */
      p.section('Exchange network');
      p.note('Approvals this network requires:');
      p.toggle('Parent / guardian consent', true, function (on) { gate('guardianConsent', on); });
      p.toggle('Counselor approval', true, function (on) { gate('counselorApproval', on); });
      p.toggle('Institution review', true, function (on) { gate('institutionReview', on); });
      /* The four entry points map one-to-one onto the path-select tiles; switching one off
         shows its tile as unavailable. Same wording + order as the two admin drawers.
         Application URL is off by default, matching the DENetwork defaults. */
      p.note('Entry points — how a learner can start');
      p.toggle('College invite', true, function (on) { entry('heInvite', on); });
      p.toggle('High school invite', true, function (on) { entry('hsInvite', on); });
      p.toggle('Application URL', true, function (on) { entry('selfUrl', on); });   /* on by default HERE (see applyLearnerEntryDefaults); the shared default is off */
      p.toggle('Learner dashboard', true, function (on) { entry('dashboard', on); });
      p.note('Entry path');
      p.segmented([['College URL', 'college-url'], ['Email invite', 'email-invite']], 'college-url', function (v) { axis('entryPath', v); });
      p.note('Invite source');
      p.segmented([['College', 'college'], ['Counselor', 'counselor']], 'college', function (v) { axis('inviteSource', v); });
      p.note('Complexity');
      p.segmented([['1 HS', 'single'], ['2+ HS', 'multiple']], 'single', function (v) { axis('hsCount', v); });
      p.segmented([['1 college', 'single'], ['2+ colleges', 'multiple']], 'single', function (v) { axis('collegeCount', v); });

      p.section('State');
      p.select(APP_STATES, 'parent-consent-pending', function (v) { axis('appState', v); });
      /* 'Several' spans all three DE-tab buckets at once, which is the only way to see the
         NavToggle, its filtering and its count badges. The State selector above still drives
         the first application. */
      p.note('Applications');
      p.segmented([['One', 'single'], ['Several (all buckets)', 'multi']], 'single', function (v) { axis('appMix', v); });
      p.toggle('Reapply after cancel', true, function (on) { axis('reapply', on ? 'on' : 'off'); });

      p.section('Appearance');
      p.select(['default', 'light', 'white', 'dark', 'contrast'], 'light', function (v) { dev().setTheme && dev().setTheme(v); });

      p.section('Demo tools');
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
      p.button('↩ Back to start', function () { go('path-select'); });
      p.button('✎ Fill account form', function () { window.devFillAccountForm && window.devFillAccountForm(); });
      p.button('✎ Fill DE application', function () { window.devFillDeApp && window.devFillDeApp(); });
      p.note('Demo email');
      p.input({ id: 'dev-email-input', value: 'new.student@email.com', placeholder: 'Demo email' });
      p.grid([['Copy', 'copy'], ['Insert', 'insert']], function (v) {
        if (v === 'copy') { window.devCopyEmail && window.devCopyEmail(); }
        else { window.devInsertEmail && window.devInsertEmail(); }
      });   /* one-shot actions, not a value — they just flash their selection */
      p.button('New → create', function () { window.devSetEmail && window.devSetEmail('new.student@email.com'); });
      p.button('Existing → sign in', function () { window.devSetEmail && window.devSetEmail('jcumberland@pioneerhs.edu'); });
    }, { scope: 'learner', onReset: function () { window.location.reload(); } });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
