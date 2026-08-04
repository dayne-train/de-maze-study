/* scripts/app/dev.js — module split from former scripts/app.js (one IIFE, now dissolved to shared global scope). showToast + the dev panel (toggle, actions).
   Load order is fixed in index.html; do not reorder casually. */
  /* ─── Toast ─── */
  /* showToast(message, context) — thin wrapper over the shared kit's window.tastyToast.
     Maps the prototype context vocabulary → kit Toast kind, then delegates (the kit auto-mounts
     the .tasty-toast-stack, builds .tasty-toast.is-*, resolves icons, auto-dismisses at 4s).
     context: "config"|"success"|"warning"|"urgent"|"error"|"bold"; "info"/undefined → "config". */
  function showToast(message, context) {
    const KIND = { config: 'config', success: 'success', warning: 'warning', urgent: 'error', error: 'error', bold: 'primary', info: 'config' };
    window.tastyToast(message, KIND[context] || 'config');
  }

  /* ─── Dev panel ─── */
  const _devPanelToggle = document.getElementById('dev-toggle');
  const _devPanelEl     = document.getElementById('dev-panel');
  const _devPanelClose  = document.getElementById('dev-panel-close');

  if (_devPanelToggle) {
    _devPanelToggle.addEventListener('click', function () {
      _devPanelEl.classList.toggle('hidden');
    });
  }
  if (_devPanelClose) {
    _devPanelClose.addEventListener('click', function () {
      _devPanelEl.classList.add('hidden');
    });
  }
  // Close on Escape
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && _devPanelEl && !_devPanelEl.classList.contains('hidden')) {
      _devPanelEl.classList.add('hidden');
    }
  });

  // Reset = full state restore to initial fixtures
  function devReset() {
    if (typeof window.setNoApplications === 'function') window.setNoApplications(false);
    activeApps = ALL_APPS.slice(0, 8);
    selectedIds.clear();
    searchTerm = '';
    const searchInput = document.getElementById('search-input');
    if (searchInput) searchInput.value = '';
    // Reset segmented control to "needs review"
    if (typeof switchSegment === 'function') {
      switchSegment('needs-review');
    }
    // Sync count buttons
    document.querySelectorAll('[data-count]').forEach(b => {
      b.classList.toggle('active', b.dataset.count === '8');
    });
    // Entry points live in DENetwork now; reset them to the model's defaults.
    if (window.DENetwork) {
      window.DENetwork.setMany({ heInvite: true, hsInvite: true, selfUrl: false, dashboard: true });
    }
    applyExchangeModel();
    renderTable();
    showScreen('dashboard');
    showToast('State reset · All applications restored to initial state.', 'success');
  }

  function devMarkApproved(n) {
    const ids = activeApps.slice(0, n).map(a => a.id);
    if (ids.length === 0) return;
    confirmEndorse(ids);
  }

  function devMarkDenied(n) {
    const ids = activeApps.slice(0, n).map(a => a.id);
    if (ids.length === 0) return;
    currentActionIds = ids;
    showScreen('deny', { ids: ids, from: 'dev-panel' });
  }

  if (_devPanelEl) {
    _devPanelEl.addEventListener('click', function (e) {
      const btn = e.target.closest('.dev-btn');
      if (!btn) return;

      // Theme switch
      if (btn.dataset.theme) {
        document.querySelectorAll('[data-theme]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        if (typeof window.setTheme === 'function') {
          window.setTheme(btn.dataset.theme);
        } else {
          document.documentElement.dataset.theme = btn.dataset.theme;
        }
      }

      // Counselor switch — update persona text in-place so workflow
      // header click handlers (e.g. adv-search Cancel) survive.
      if (btn.dataset.counselor) {
        document.querySelectorAll('[data-counselor]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentCounselor = btn.dataset.counselor;
        const c = COUNSELORS[currentCounselor];
        const initials = (c.school || '').split(/\s+/).map(w => w[0]).join('').slice(0, 3).toUpperCase() || 'PHS';
        if (typeof window.updatePersona === 'function') {
          window.updatePersona({ name: c.name, org: c.school, initials: initials });
        }
      }

      // Queue size
      if (btn.dataset.count != null) {
        document.querySelectorAll('[data-count]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const count = parseInt(btn.dataset.count, 10);
        activeApps = ALL_APPS.slice(0, count);
        selectedIds.clear();
        renderTable();
      }

      // Quick nav
      if (btn.dataset.goto) {
        showScreen(btn.dataset.goto);
      }

      // Scenario actions
      if (btn.dataset.action) {
        switch (btn.dataset.action) {
          case 'reset':         devReset();        break;
          case 'approve-first': devMarkApproved(3); break;
          case 'deny-first':    devMarkDenied(1);   break;
        }
      }
    });
  }
