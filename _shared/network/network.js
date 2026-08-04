/* Shared exchange-network model — one source of truth for how an exchange network is
   configured. Read by all three DE prototypes (learner · HS admin · college admin) so
   their steppers, queues, forms, and copy never drift from one another.

   The shape mirrors the PM's Configuration Explorer
   (knowledge-base/config-explorer/, and KB §10), which is the reference model for how
   configuration composes into a learner's path. Three kinds of setting:

     GATES — approval steps the network requires, in workflow order:
       guardianConsent    — parent / guardian consent required?
       counselorApproval  — high school approval required?
       institutionReview  — college / institution review required?
     guardianConsent and counselorApproval are CONCURRENT (neither depends on the
     other); institutionReview follows both. With all three off, a learner registers
     straight off submit — the "pure registration tool" case in KB §8.

     ENTRY POINTS — how a learner can start. Four independent switches, NOT a
     single invite/open/combined mode: a college can invite while its high schools
     cannot, and self-service splits into a public URL and the learner dashboard.
       heInvite · hsInvite · selfUrl · dashboard
     With all four off nobody can start; the model can express that, and the UI is
     expected to warn rather than the model silently preventing it.

     VISIBILITY — whether an org sees applications beyond the ones it must act on.
       heView · hsView
     Off means the org still works its own action queue but doesn't get the wider
     record (who's waiting, who registered, who was closed).

   Configuration is authored by the COLLEGE at the exchange-group level; the "he" and
   "hs" prefixes name which org a setting AFFECTS, not who sets it (see the DE
   exchange network notes and KB §2). Defaults match the explorer's opening state.

   Every key lives in one flat namespace, so get('someKey') / set('someKey', bool)
   work uniformly. The grouped helpers below are conveniences over the same state.
   Vanilla, no deps, file:// safe. */
(function (root) {

  var GATE_KEYS  = ['guardianConsent', 'counselorApproval', 'institutionReview'];
  var ENTRY_KEYS = ['heInvite', 'hsInvite', 'selfUrl', 'dashboard'];
  var VIEW_KEYS  = ['heView', 'hsView'];
  var ALL_KEYS   = GATE_KEYS.concat(ENTRY_KEYS, VIEW_KEYS);
  var STORE_KEY  = 'de-network-config';

  var state = {
    // gates — the full workflow by default
    guardianConsent: true,
    counselorApproval: true,
    institutionReview: true,
    // entry points — STUDY BUILD: all four on, so every entry point the study
    // discusses is actually reachable (selfUrl ships false upstream).
    heInvite: true,
    hsInvite: true,
    selfUrl: true,
    dashboard: true,
    // visibility — both orgs see the full record by default
    heView: true,
    hsView: true
  };

  var listeners = [];

  function notify() {
    listeners.forEach(function (fn) { try { fn(root.DENetwork.get()); } catch (e) {} });
  }

  function pick(keys) {
    var out = {};
    keys.forEach(function (k) { out[k] = state[k]; });
    return out;
  }

  function anyOn(keys) {
    return keys.some(function (k) { return !!state[k]; });
  }

  /* Writes one key. Returns true if the value actually changed, so setMany can
     decide whether a notify is warranted. Unknown keys are ignored, which keeps
     a typo from quietly inventing a setting. */
  function write(key, val) {
    val = !!val;
    if (!(key in state) || state[key] === val) return false;
    state[key] = val;
    return true;
  }

  root.DENetwork = {
    /* Key groups, exposed so callers can iterate without hardcoding names. */
    GATE_KEYS: GATE_KEYS.slice(),
    ENTRY_KEYS: ENTRY_KEYS.slice(),
    VIEW_KEYS: VIEW_KEYS.slice(),

    /* get()      → shallow copy of the whole configuration
       get('key') → one setting's boolean */
    get: function (key) {
      if (key) return state[key];
      return pick(GATE_KEYS.concat(ENTRY_KEYS, VIEW_KEYS));
    },

    /* set('key', bool) — updates one setting and notifies (no-op if unchanged). */
    set: function (key, val) {
      if (write(key, val)) notify();
    },

    /* setMany({key: bool, …}) — batch update, at most ONE notify. Use when flipping
       several settings together (a dev-drawer preset, say) so subscribers re-render
       once against the final state instead of once per key, mid-transition. */
    setMany: function (patch) {
      var changed = false;
      Object.keys(patch || {}).forEach(function (k) {
        if (write(k, patch[k])) changed = true;
      });
      if (changed) notify();
    },

    /* ── Grouped reads ──────────────────────────────────────────────────── */

    gates:       function () { return pick(GATE_KEYS); },
    entryPoints: function () { return pick(ENTRY_KEYS); },
    visibility:  function () { return pick(VIEW_KEYS); },

    /* True when at least one entry point is open — i.e. a learner can start at all.
       The inverse is the explorer's "no entry point is enabled" warning state. */
    anyEntry: function () { return anyOn(ENTRY_KEYS); },

    /* True when the network requires no approvals whatsoever, so a submitted
       application goes straight to course registration. */
    noGates: function () { return !anyOn(GATE_KEYS); },

    /* canInvite('he'|'hs') — may this org send invites?
       Replaces the old invite/open/combined enum, which couldn't express one org
       inviting while the other can't. */
    canInvite: function (org) {
      return org === 'he' ? !!state.heInvite
           : org === 'hs' ? !!state.hsInvite
           : false;
    },

    /* Self-service application, by either surface — the old enum's "open". */
    canSelfApply: function () { return !!state.selfUrl || !!state.dashboard; },

    /* canView('he'|'hs') — does this org see applications beyond its action queue? */
    canView: function (org) {
      return org === 'he' ? !!state.heView
           : org === 'hs' ? !!state.hsView
           : false;
    },

    /* subscribe(fn) — fn(config) runs on every change; returns an unsubscribe fn. */
    subscribe: function (fn) {
      listeners.push(fn);
      return function () {
        var i = listeners.indexOf(fn);
        if (i !== -1) listeners.splice(i, 1);
      };
    },

    /* ── Portable configuration ─────────────────────────────────────────
       The prototypes are separate pages — learner, HS admin, college admin,
       Config Studio — because in the real product they're separate applications
       behind separate logins. What they legitimately share is the exchange
       configuration, so that travels in the LINK rather than the prototypes
       being merged into one app.

       Serialised as a comma-separated list of the settings that are ON:
         ?net=heInvite,hsInvite,dashboard,guardianConsent,counselorApproval,…
       Verbose on purpose — a config link should be readable and editable by
       hand, and self-describing when it turns up in Slack a week later.
       The param is AUTHORITATIVE when present: anything not listed is off, so a
       link always means exactly one configuration and never half-inherits. */

    /* toQuery() → "a,b,c" of every setting currently on. */
    toQuery: function () {
      return ALL_KEYS.filter(function (k) { return state[k]; }).join(',');
    },

    /* link('../hs-approval-queue/') → that URL carrying this configuration. */
    link: function (base) {
      var q = root.DENetwork.toQuery();
      return base + (base.indexOf('?') === -1 ? '?' : '&') + 'net=' + encodeURIComponent(q);
    },

    /* fromQuery('a,b,c') — apply a serialised config. Unknown names are ignored
       (a stale link from an older build shouldn't throw), and every key absent
       from the list is explicitly turned off. That makes an empty list mean a
       network with everything switched off — deliberately, since that's a state
       the model is meant to be able to express (the explorer's "no entry point
       is enabled" warning). hydrate() won't reach here on an empty value. */
    fromQuery: function (q) {
      if (typeof q !== 'string') return;
      var on = q.split(',').map(function (s) { return s.trim(); }).filter(Boolean);
      var patch = {};
      ALL_KEYS.forEach(function (k) { patch[k] = on.indexOf(k) !== -1; });
      root.DENetwork.setMany(patch);
    },

    /* hydrate() — called once on load (below). Precedence:
         1. ?net= in the URL — an explicit, shareable configuration
         2. sessionStorage — carries the config as you move between prototypes
            in one sitting, so a persona jump doesn't reset what you set up
         3. the defaults above
       sessionStorage rather than localStorage deliberately: config that outlives
       the tab would silently reshape a prototype days later, and someone opening
       a bare link expects to see the default network, not yesterday's demo. */
    hydrate: function () {
      var q = null;
      try {
        var m = /[?&]net=([^&]*)/.exec(root.location ? root.location.search : '');
        if (m) q = decodeURIComponent(m[1]);
        /* STUDY BUILD: no sessionStorage fallback. Upstream this carries config
           between prototypes in one sitting; here it would let a setting nudged
           in one task silently reshape a later one. A bare URL must always mean
           the pinned study config. ?net= still overrides explicitly. */
      } catch (e) { /* file:// or storage blocked — fall back to defaults */ }
      if (q) root.DENetwork.fromQuery(q);
    }
  };

  /* Keep the session copy current so the next prototype in this sitting inherits
     whatever was just configured. */
  root.DENetwork.subscribe(function () {
    try {
      if (root.sessionStorage) root.sessionStorage.setItem(STORE_KEY, root.DENetwork.toQuery());
    } catch (e) { /* storage blocked — links still work */ }
  });

  if (root.location) root.DENetwork.hydrate();
})(typeof window !== 'undefined' ? window : this);
