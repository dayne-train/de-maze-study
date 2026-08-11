/* scripts/app/boot.js — module split from former scripts/app.js (one IIFE, now dissolved to shared global scope). Denial-reason modal, Tweaks bridge (window.__dev), the showScreen invite-extension (relocated here so showScreen is already defined), and the initial render. Loaded LAST.
   Load order is fixed in index.html; do not reorder casually. */
  /* ─── Denial reason modal ─── */
  window.resendInvitation = function(id, name) {
    var e = (typeof INVITED_FIXTURE !== 'undefined') && INVITED_FIXTURE.find(function(x) { return x.id === id; });
    if (e && e.sendFails) {   // mock message-service failure — leaves Last Sent untouched
      showToast('Couldn\'t resend to ' + name + '. Try again.', 'error');
      return;
    }
    if (e) e.lastSent = (typeof todayLabel === 'function') ? todayLabel() : 'Today';
    if (typeof renderInvitedTable === 'function') renderInvitedTable();
    showToast('Invitation resent to ' + name + '.', 'success');
  };

  // Nudge a party we're blocked on (guardian consent / HS counselor) from the
  // application detail view. Party string comes from the button (e.g. "the high school").
  window.sendReminder = function(party) {
    showToast('Reminder sent to ' + (party || 'the pending party') + '.', 'success');
  };

  // Universal "View application" action — opens the unified application detail page.
  // Remembers the originating screen so Back/Cancel/Return lead there (path remembrance),
  // e.g. Global Search → View → Back returns to Global Search, not the queue.
  window.viewApplication = function(id) {
    var current = document.querySelector('.screen.active');
    var origin  = current ? current.id.replace('screen-', '') : 'de';
    // Detail can only be opened from a list screen; ignore anything unexpected.
    window.__reviewOrigin = (origin === 'review') ? 'de' : origin;
    showScreen('review', id);
  };

  // Where the application detail returns to, + a label for that destination.
  window.reviewReturn = function() {
    showScreen(window.__reviewOrigin || 'de');
  };
  window.reviewReturnLabel = function() {
    if (window.__reviewOrigin === 'adv-search') return 'Global Search';
    if (window.__reviewOrigin === 'invites')    return 'Invites';
    return 'Queue';
  };

  // Sign-in router. The email entry is a contextual deep link → after sign-in it
  // lands straight on the Applications page / "Needs Review" (review) tab, skipping
  // the product chooser. The direct "log into workspace" path shows the chooser.
  // Login submit → locked/"signing in" state (greyed inputs w/ lock glyph, disabled button).
  function setLoginLocked(screen, locked) {
    screen.querySelectorAll('.tasty-field').forEach(function(f) {
      f.classList.toggle('is-locked', locked);
      if (locked) f.classList.remove('is-valid', 'is-error');
      var inp = f.querySelector('input'); if (inp) inp.disabled = locked;
      var ctl = f.querySelector('.tasty-field__control');
      var v = f.querySelector('.tasty-field__vicon');
      if (!v && ctl && locked) { v = document.createElement('span'); v.className = 'tasty-field__vicon'; v.setAttribute('aria-hidden', 'true'); ctl.insertBefore(v, ctl.firstChild); }
      if (v) v.innerHTML = (locked && window.tastyIcon) ? window.tastyIcon('locked', { size: 16 }) : '';
    });
    var btn = screen.querySelector('.tasty-btn'); if (btn) btn.disabled = locked;
  }

  window.completeSignIn = function() {
    var screen = document.getElementById('screen-login');
    // a11y validation gate — block sign-in if any required field is empty/invalid
    if (screen && window.validateForm && !window.validateForm(screen)) return;
    if (screen) setLoginLocked(screen, true);          // submit → locked state
    var go = function() {
      if (window.__entryIntent === 'email-review') {
        showScreen('de');
        if (typeof switchSegment === 'function') switchSegment('needs-review');
      } else {
        showScreen('service-select');
      }
      window.__entryIntent = null;
      if (screen) setLoginLocked(screen, false);       // reset for any later visit (login now hidden)
    };
    if (screen) setTimeout(go, 650); else go();        // brief "signing in…" beat
  };

  // Attachment viewer — opens the transcript modal when the file is a transcript
  // with a backing fixture, otherwise acknowledges the open.
  window.viewAttachment = function(id, filename) {
    var inAll = ALL_APPS.some(function(a) { return a.id === id; });
    if (inAll && /transcript/i.test(filename)) { openTranscriptModal(id); return; }
    showToast('Opening ' + filename, 'config');
  };

  // Helper: the standard View button markup for a given application id.
  function viewAppBtn(id) {
    return '<button class="tasty-btn is-bold is-ghost is-sm" onclick="viewApplication(\'' + id + '\')">View</button>';
  }

  window.showDenialReason = function(id) {
    var a = ALL_DENIED_APPS.find(function(x) { return x.id === id; });
    if (!a) return;
    /* The title says what the window is FOR; the learner it concerns leads the body. A
       cancelled application was withdrawn rather than refused, so the title says so. */
    document.getElementById('denial-reason-title').textContent =
      (a.kind === 'cancelled') ? 'Cancellation Reason' : 'Denial Reason';
    document.getElementById('denial-reason-name').textContent = a.lastName + ', ' + a.firstName;
    document.getElementById('denial-reason-meta').textContent = a.id + ' · ' + (a.course || a.group) + ' · ' + (COLLEGES[a.institution] || a.institution);
    document.getElementById('denial-audit-date').textContent  = a.deniedDate;
    document.getElementById('denial-audit-state-tag').textContent = a.deniedState;
    document.getElementById('denial-audit-by').textContent   = a.deniedBy;
    document.getElementById('denial-reason-body').textContent = a.reason;
    document.getElementById('denial-reason-overlay').classList.add('open');
  };
  window.closeDenialReason = function() {
    document.getElementById('denial-reason-overlay').classList.remove('open');
  };

  /* ─── Tweaks panel bridge ───────────────────────────────────────────
     Exposes IIFE-scoped state-mutators so scripts/tweaks.jsx can drive
     the app without being inside this closure.
     ──────────────────────────────────────────────────────────────── */
  // Empty state — "No Applications" (edge case). Persistent flag so the state survives
  // navigation (workspace → back to Applications keeps the empty view, not the tabs).
  window.__noApps = false;

  // Apply the current no-apps flag to the Applications screen: hides the header row,
  // segment tabs, and all segment tables, showing the centered empty state instead.
  /* ─────────────────────────────────────────────────────────────────
     Group the header's trailing actions so they wrap as ONE unit.
     .de-page-identity is a wrap container holding [header][search][primary]
     [kebab]. Flex wraps items individually, so at a band of widths around
     560px the search and primary fitted on a line and the kebab alone spilled
     to the next — a lone floating kebab under the row. Wrapping the primary +
     kebab in .de-header-actions makes them a single flex item: either they fit
     beside the search or they move down together, which is the Templates
     paradigm's third row.

     Done here rather than in the markup because every screen builds this row a
     little differently (some have a primary, some only the kebab) and both
     admin forks share this file — one normalisation covers all of them.
     Idempotent: a row already grouped is skipped. ───────────────────────── */
  /* Opt every queue table into the DS's mobile row-stacking, and re-stamp the
     labels after a render since the rows are rebuilt from scratch each time. */
  function enableStackedTables() {
    document.querySelectorAll('table.queue-table').forEach(function (t) { t.classList.add('is-stackable'); });
    if (typeof stackTableRows === 'function') stackTableRows();
  }
  window.enableStackedTables = enableStackedTables;

  function groupHeaderActions(root) {
    (root || document).querySelectorAll('.de-page-identity').forEach(function (row) {
      if (row.querySelector(':scope > .de-header-actions')) return;
      var actions = [].filter.call(row.children, function (c) {
        return c.classList.contains('de-add-enrollment-btn') || c.classList.contains('de-options');
      });
      if (actions.length < 2) return;   // nothing to group; a lone item cannot strand
      var wrap = document.createElement('div');
      wrap.className = 'de-header-actions';
      actions[0].parentNode.insertBefore(wrap, actions[0]);
      actions.forEach(function (a) { wrap.appendChild(a); });
    });
  }
  window.groupHeaderActions = groupHeaderActions;
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { groupHeaderActions(); enableStackedTables(); });
  else { groupHeaderActions(); enableStackedTables(); }

  // Called on every showScreen('de') so navigating away and back re-applies it.
  // Note: the segment row is owned by applyDeMode (it depends on review mode too),
  // which factors in __noApps — so we don't touch .seg-row here.
  window.applyNoAppsState = function() {
    var screen = document.getElementById('screen-de');
    if (!screen) return;
    var on       = window.__noApps;
    var empty    = document.getElementById('de-empty-state');
    var identity = screen.querySelector('.de-page-identity');
    var panels   = screen.querySelectorAll('.seg-panel');
    if (identity) identity.style.display = on ? 'none' : '';
    panels.forEach(function(p) { p.style.display = on ? 'none' : ''; });
    if (empty) empty.style.display = on ? 'flex' : 'none';
  };

  window.setNoApplications = function(on) {
    window.__noApps = !!on;
    applyNoAppsState();
    if (typeof applyDeMode === 'function') applyDeMode();  // re-apply seg-row visibility
    renderTable();   // refreshes badges incl. the workspace review count (→ 0 / restored)
  };

  window.__dev = {
    setNoApplications: function(on) { window.setNoApplications(on !== false); },
    setTheme: function(t) {
      if (typeof window.setTheme === 'function') window.setTheme(t);
    },
    setPersona: function(key) {
      currentAdmin = key;
      var c = ADMINS[key];
      if (!c) return;
      if (typeof window.updatePersona === 'function')
        window.updatePersona({ name: c.name, org: c.org, initials: c.abbr });
    },
    // One entry point on/off (heInvite | hsInvite | selfUrl | dashboard). Writes to
    // the shared model so every prototype agrees, then re-applies what this queue
    // offers as a result.
    setEntry: function(key, on) {
      if (window.DENetwork) window.DENetwork.set(key, on);
      applyExchangeModel();
    },
    // This org's application visibility (heView | hsView). Off = the action queue
    // only, no wider record.
    setView: function(key, on) {
      if (window.DENetwork) window.DENetwork.set(key, on);
      applyExchangeModel();
    },
    // How many high schools WVCC serves — drives the High School column. Its own
    // axis now, no longer smuggled in on the entry model.
    setMultiHs: function(on) {
      multiHs = !!on;
      applyHsScope();
      renderTable(); renderWaitingTable(); renderInvitedTable();
      renderActiveTable(); renderDeniedTable();
    },
    // Exchange-network approval gate (guardianConsent | counselorApproval). Flip it,
    // then re-render every table + any open detail so the steppers/badges update.
    setGate: function(key, on) {
      if (window.DENetwork) window.DENetwork.set(key, on);
      renderTable();
      if (typeof renderAdmittedTable === 'function') renderAdmittedTable();
      renderWaitingTable();
      renderInvitedTable();
      renderActiveTable();
      renderDeniedTable();
      if (typeof updateSegmentCounts === 'function') updateSegmentCounts();
      // College review (the New bucket) is the college's own step — independent of the
      // counselor gate — so buckets don't hide here; just refresh model-driven chrome.
      if (typeof applyExchangeModel === 'function') applyExchangeModel();
      var rv = document.getElementById('screen-review');
      if (rv && rv.classList.contains('active') && typeof currentReviewId !== 'undefined' && currentReviewId && typeof renderReviewScreen === 'function') {
        renderReviewScreen(currentReviewId);
      }
    },
    setQueueSize: function(n) {
      activeApps = ALL_APPS.slice(0, parseInt(n, 10));
      selectedIds.clear();
      renderTable();
    },
    // Attachments in the detail view are a concept, off by default. Body-class idiom
    // (same as show-hs) so any open detail reflects it without a re-render.
    setShowAttachments: function(on) { document.body.classList.toggle('show-attachments', !!on); },
    // Bulk upload: switch the Validate Data step between the error state (default) and success.
    setBulkValidateSuccess: function(on) {
      window.__bulkValidateSuccess = !!on;
      var m = document.getElementById('bulk-upload-mount');
      if (m && m.querySelector('.bulk-hero') && typeof window.renderBulkValidate === 'function') window.renderBulkValidate();
    },
    navTo: function(screen) { showScreen(screen); },
    openBulkApprove: function() {
      var ids = activeApps.map(function(a){ return a.id; });
      if (ids.length === 0) return;
      ids.forEach(function(id){ selectedIds.add(id); });
      showScreen('bulk-approve', ids);
    },
    reset: devReset,
    approveFirst: function() { devMarkApproved(3); },
    denyFirst:    function() { devMarkDenied(1); },
    admitOnlyFirst: function() {
      if (activeApps.length === 0) return;
      commitAdmitOnlyFromQueue(activeApps[0].id);
    },
    inviteAllAdmittedToRegister: function() {
      var apps = ALL_ADMITTED_APPS.slice();
      if (apps.length === 0) return;
      apps.forEach(function(a) { moveAdmittedToWaiting(a); });
      selectedAdmittedIds.clear();
      renderAdmittedTable();
      renderWaitingTable();
      updateSegmentCounts();
      refreshUnifiedPool();
      showToast(apps.length + ' admitted learner' + (apps.length === 1 ? '' : 's') + ' invited to register.', 'success');
    },
  };

  /* ─── Initial render ─── */
  renderTable();
  renderAdmittedTable();
  renderWaitingTable();
  renderInvitedTable();
  renderActiveTable();
  renderDeniedTable();
  applyExchangeModel();
  applyHsScope();   // one college, many high schools — HS column on by default


  /* ─── showScreen extension for invite flow — relocated from invite.js so showScreen is defined first ─── */
  /* ─── Extend showScreen for invite flow ─── */
  (function() {
    var _origShowScreen = showScreen;
    showScreen = function(name, param) {
      _origShowScreen(name, param);
      if (name === 'invite-learners') renderInviteLearners();
      else if (name === 'invite-college') renderInviteCollege();
      else if (name === 'invite-groups') renderInviteGroups();
    };
    window.showScreen = showScreen;
  })();

  /* ─── Declarative Tasty asset resolver ───────────────────────────────
     Lets static screen markup reference any manifest asset by friendly slug:
       <span data-tasty-illus="parchment-pathways-logo" data-size="150"></span>
       <span data-tasty-icon="sign-in" data-size="20"></span>
     Resolves once at boot via the shared _kit manifest (298 icons / 228
     graphics / 109 illustrations) — no hardcoded asset paths. ─── */
  (function resolveTastyAssets() {
    if (typeof tastyIllus !== 'function') return;
    document.querySelectorAll('[data-tasty-illus]').forEach(function (el) {
      var html = tastyIllus(el.getAttribute('data-tasty-illus'), {
        size: el.getAttribute('data-size') || undefined,
        alt: el.getAttribute('alt') || '',
        className: el.getAttribute('data-class') || ''
      });
      if (html) el.outerHTML = html;
    });
    document.querySelectorAll('[data-tasty-icon]').forEach(function (el) {
      var html = tastyIcon(el.getAttribute('data-tasty-icon'), {
        size: el.getAttribute('data-size') || 18,
        className: el.getAttribute('data-class') || ''
      });
      if (html) el.outerHTML = html;
    });
  })();

  /* ─── Options kebab (bordered OptionsMenu): the trigger carries data-tasty="menu", so the
     kit (tasty-interactions.js) toggles the sibling .tasty-menu's .is-open and closes it on an
     outside click. The menu is shown via .is-open (see the .tasty-menu:not(.is-open) rule) —
     do NOT toggle the [hidden] attribute here; that fights the kit. ─── */

  /* ── Column sorting ──────────────────────────────────────────────────────
     Registered here because boot.js loads after every renderer, so each table can name the
     function that repaints it. The shared sorter (_shared/queue-screens/table-sort.js) owns
     the click handling, the direction toggle and the header indicator; these lines only say
     which columns a table has and what redraws it.

     Defaults match what each screen is for: the queues open newest-first, because an admin
     wants what just arrived; the roster and group list open A→Z, because those are things you
     look up by name. */
  (function wireTableSorting() {
    if (!window.DETableSort) return;
    var A = window.DE_SORT_COLS, R = window.DE_ROSTER_COLS, G = window.DE_GROUP_COLS;
    var reg = [
      ['#queue-table',          A, { col: 'date', dir: 'desc' }, function () { queuePag.page = 1; renderTable(); }],
      ['#waiting-table',        A, { col: 'date', dir: 'desc' }, function () { waitingPag.page = 1; renderWaitingTable(); }],
      ['#active-table',         A, { col: 'date', dir: 'desc' }, function () { activePag.page = 1; renderActiveTable(); }],
      ['#denied-table',         A, { col: 'date', dir: 'desc' }, function () { deniedPag.page = 1; renderDeniedTable(); }],
      ['#invited-table',        A, { col: 'date', dir: 'desc' }, function () { renderInvitedTable(); }],
      ['#invite-learner-table', R, { col: 'name', dir: 'asc'  }, function () { renderInviteLearners(); }],
      ['#invite-groups-table',  G, { col: 'group', dir: 'asc' }, function () { renderInviteGroups(); }]
    ];
    reg.splice(4, 0, ['#admitted-table', A, { col: 'date', dir: 'desc' },
                     function () { admittedPag.page = 1; renderAdmittedTable(); }]);
    reg.forEach(function (r) {
      if (!document.querySelector(r[0])) return;      /* a fork without that table */
      DETableSort.register(r[0], { columns: r[1], initial: r[2], render: r[3] });
    });
  })();
