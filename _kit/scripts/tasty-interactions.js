/* ════════════════════════════════════════════════════════════════════
   TASTY INTERACTIONS — tiny, dependency-free behaviors for the prototype
   component classes. Delegated click handling on document, so it works for
   markup injected after load. Opt-in via data-tasty="..." hooks.
   ════════════════════════════════════════════════════════════════════
     data-tasty="toggle"      → flips .is-on on the .tasty-toggle
     data-tasty="accordion"   → flips .is-open on the closest .tasty-accordion
     data-tasty="menu"        → toggles the next .tasty-menu / .tasty-popover sibling
     data-tasty="modal-open"  value=#id  → shows that .tasty-modal-overlay
     data-tasty="modal-close" → hides the closest overlay
     data-tasty="toast"       value="message" data-kind="success|warning|error|primary|note (config=primary)"
   ════════════════════════════════════════════════════════════════════ */
(function () {
  function closeAllMenus(except) {
    document.querySelectorAll('.tasty-menu.is-open, .tasty-popover.is-open').forEach(function (m) {
      if (m !== except) m.classList.remove('is-open');
    });
  }

  document.addEventListener('click', function (e) {
    var t = e.target.closest('[data-tasty]');

    // clicking outside any open menu closes them
    if (!t || t.getAttribute('data-tasty') !== 'menu') closeAllMenus(null);
    if (!t) return;

    var kind = t.getAttribute('data-tasty');

    if (kind === 'toggle') {
      if (t.classList.contains('is-disabled')) return;
      t.classList.toggle('is-on');
      t.setAttribute('aria-pressed', t.classList.contains('is-on'));
    }

    if (kind === 'accordion') {
      var acc = t.closest('.tasty-accordion');
      if (acc) acc.classList.toggle('is-open');
    }

    if (kind === 'menu') {
      e.stopPropagation();
      var menu = t.parentElement.querySelector('.tasty-menu, .tasty-popover');
      if (menu) {
        var willOpen = !menu.classList.contains('is-open');
        closeAllMenus(menu);
        menu.classList.toggle('is-open', willOpen);
      }
    }

    if (kind === 'modal-open') {
      var sel = t.getAttribute('value') || t.dataset.target;
      var ov = sel && document.querySelector(sel);
      if (ov) ov.style.display = 'flex';
    }

    if (kind === 'modal-close') {
      var overlay = t.closest('.tasty-modal-overlay');
      if (overlay) overlay.style.display = 'none';
    }

    if (kind === 'toast') {
      window.tastyToast(t.getAttribute('value') || 'Done', t.dataset.kind || 'config');
    }
  });

  // close menu/popover on escape
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeAllMenus(null); });

  // Programmatic toast. Mounts a stack if absent.
  window.tastyToast = function (message, kind) {
    var stack = Array.from(document.querySelectorAll('.tasty-toast-stack')).find(function(el) { return el.style.position !== 'static'; });
    if (!stack) { stack = document.createElement('div'); stack.className = 'tasty-toast-stack'; document.body.appendChild(stack); }
    var el = document.createElement('div');
    el.className = 'tasty-toast is-' + (kind || 'success');   /* truth: ToastProvider defaults colorContext to success */
    el.setAttribute('role', 'status');
    var icons = { success: 'valid', warning: 'warning-2', error: 'warning', primary: 'settings', config: 'settings', note: 'support' };
    var iconSlug = icons[kind] || 'info';
    el.innerHTML = '<span class="tcon" data-g="' + iconSlug + '"></span><span class="tasty-toast__msg"></span><button class="tasty-toast__x" aria-label="Dismiss">×</button>';
    el.querySelector('.tasty-toast__msg').textContent = message;
    el.querySelector('.tasty-toast__x').addEventListener('click', function () { el.remove(); });
    stack.appendChild(el);
    if (window.resolveTastyAssets) window.resolveTastyAssets(el);
    setTimeout(function () { el.remove(); }, 4000);
  };

  /* .tasty-menu/.tasty-popover are positioned absolutely and hidden until .is-open.
     Provide the hidden default here so consumers don't need extra CSS. */
  var style = document.createElement('style');
  style.textContent = '.tasty-menu:not(.is-open),.tasty-popover:not(.is-open){display:none}';
  document.head.appendChild(style);
})();

/* ── Form validation (a11y) ──────────────────────────────────────────────
   Every .tasty-field input is validated on blur, then live once "touched"
   (blur → errors flag red; once valid, turns green live as you type).
   Declarative rules via data-validate, or inferred from native attributes:
     data-validate="required email"       data-validate="required minlength:8"
     required · email · minlength:N · maxlength:N · pattern:RE · match:#selector
   Custom rules:  window.tastyValidators.myRule = function (value) { return true || 'message'; }
   Opt a field OUT with data-validate="off".
   Drives .is-valid / .is-error on the .tasty-field, injects the check / alert
   vicon, sets the message, and wires aria-invalid + aria-describedby +
   aria-live="polite" so the result is ANNOUNCED to screen readers — that a11y
   wiring is the point; the green/red wash is just the visible half.
   API:  validateField(fieldOrInput) → true|false
         validateForm(root) → are all valid? (focuses the first invalid input)   */
(function (w, d) {
  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  var uid = 0;
  var RULES = {
    required:  function (v) { return v.trim() !== '' || 'This field is required.'; },
    email:     function (v) { return v === '' || EMAIL_RE.test(v) || 'Enter a valid email address.'; },
    minlength: function (v, n) { return v === '' || v.length >= +n || 'Must be at least ' + n + ' characters.'; },
    maxlength: function (v, n) { return v.length <= +n || 'Must be ' + n + ' characters or fewer.'; },
    pattern:   function (v, re) { return v === '' || new RegExp(re).test(v) || 'Invalid format.'; },
    match:     function (v, sel) { var o = d.querySelector(sel); return (o && v === o.value) || 'Values don’t match.'; }
  };
  w.tastyValidators = w.tastyValidators || {};   // extend with custom rules

  function parseRules(input) {
    var dv = input.getAttribute('data-validate');
    if (dv === 'off') return null;
    if (dv) return dv.trim().split(/\s+/).map(function (t) {
      var i = t.indexOf(':');
      return i < 0 ? { name: t } : { name: t.slice(0, i), arg: t.slice(i + 1) };
    });
    var inferred = [];                             // no data-validate → infer from native attrs
    if (input.required) inferred.push({ name: 'required' });
    if (input.type === 'email') inferred.push({ name: 'email' });
    if (input.minLength > 0) inferred.push({ name: 'minlength', arg: input.minLength });
    return inferred;
  }

  function evaluate(input) {                        // → true | error-message string
    var rules = parseRules(input);
    if (rules === null) return undefined;            // data-validate="off" → opted out, skip entirely
    // (an empty rules array = no rules → falls through the loop and returns true = "valid, green if filled")
    for (var i = 0; i < rules.length; i++) {
      var r = rules[i], fn = RULES[r.name] || w.tastyValidators[r.name];
      if (!fn) continue;
      var res = fn(input.value, r.arg, input);
      if (res !== true) return res;                 // stop at first failure
    }
    return true;
  }

  function viconOf(field) {
    var ctl = field.querySelector('.tasty-field__control') || field;
    var v = ctl.querySelector('.tasty-field__vicon');
    if (!v) { v = d.createElement('span'); v.className = 'tasty-field__vicon'; v.setAttribute('aria-hidden', 'true'); ctl.insertBefore(v, ctl.firstChild); }
    return v;
  }
  function msgOf(field, input) {
    var m = field.querySelector('.tasty-field__msg');
    if (!m) { m = d.createElement('span'); m.className = 'tasty-field__msg'; field.appendChild(m); }
    if (!m.id) m.id = 'tf-msg-' + (++uid);
    if (m.getAttribute('data-orig') === null) m.setAttribute('data-orig', m.textContent || '');
    m.setAttribute('aria-live', 'polite');
    input.setAttribute('aria-describedby', m.id);
    return m;
  }
  function setIcon(field, slug) {
    viconOf(field).innerHTML = (slug && w.tastyIcon) ? w.tastyIcon(slug, { size: 16 }) : '';
  }

  w.validateField = function (target) {
    var field = (target.classList && target.classList.contains('tasty-field')) ? target
              : (target.closest ? target.closest('.tasty-field') : null);
    if (!field) return true;
    var input = field.querySelector('input, select, textarea');
    if (!input) return true;
    if (input.disabled || input.readOnly) return true;   // don't decorate locked fields
    var res = evaluate(input);                           // string = error · true = passes/no-rules · undefined = opted out
    if (res === undefined) return true;                  // data-validate="off" → leave the field untouched
    var m = msgOf(field, input);
    if (typeof res === 'string') {                       // a rule failed → red + alert + announce
      field.classList.remove('is-valid'); field.classList.add('is-error');
      input.setAttribute('aria-invalid', 'true');
      setIcon(field, 'warning');
      m.textContent = res;
      return false;
    }
    input.setAttribute('aria-invalid', 'false');
    if (input.value.trim() !== '') {                 // ANY content that passes (incl. no-rules) → green valid mark
      field.classList.remove('is-error'); field.classList.add('is-valid');
      setIcon(field, 'valid');
    } else {                                         // empty → neutral
      field.classList.remove('is-error', 'is-valid');
      setIcon(field, '');
    }
    m.textContent = m.getAttribute('data-orig') || '';
    return true;
  };

  // Pure validity check — runs the rules but does NOT touch the DOM (no red/green, no aria).
  // Use it to gate a Save button live without flashing errors on untouched fields.
  w.isFieldValid = function (target) {
    var input = (target.tagName && /^(INPUT|SELECT|TEXTAREA)$/.test(target.tagName)) ? target
              : (target.querySelector ? target.querySelector('input, select, textarea') : null);
    if (!input) return true;
    return typeof evaluate(input) !== 'string';      // anything but an error message counts as valid
  };

  w.validateForm = function (root) {
    root = root || d;
    var ok = true, first = null;
    root.querySelectorAll('.tasty-field').forEach(function (f) {
      var input = f.querySelector('input, select, textarea');
      if (input && !w.validateField(f)) { ok = false; if (!first) first = input; }
    });
    if (first) first.focus();
    return ok;
  };

  function bind(input) {
    if (input.__tvBound) return; input.__tvBound = true;
    input.addEventListener('blur', function () { input.__tvTouched = true; w.validateField(input); });
    input.addEventListener('input', function () { if (input.__tvTouched) w.validateField(input); });
  }
  // Forgiving structure: auto-wrap a field's primary input in .tasty-field__control (the relative
  // positioning context the validation icon needs) so the SIMPLE markup — label-span, input,
  // msg-span — works without the author remembering the wrapper. A bare input directly in
  // .tasty-field gets wrapped; inputs already in a control (or .tasty-search / -group / -phone)
  // are left alone. Idempotent.
  function ensureControl(field) {
    var bare = field.querySelector(':scope > input, :scope > select, :scope > textarea');
    if (!bare) return;
    var ctl = d.createElement('span'); ctl.className = 'tasty-field__control';
    field.insertBefore(ctl, bare); ctl.appendChild(bare);
  }
  // opts.validateNow → validate ON OPEN (also opt in declaratively via a [data-validate-on-open]
  // ancestor). IMPORTANT: on open we only surface the GREEN/valid state — an ERROR never fires until
  // the user interacts. So a valid pre-filled field shows its check on open; empty/invalid ones stay
  // neutral and only flag red on blur. Default (no validateNow) stays fully blur-first.
  w.tastyBindValidation = function (root, opts) {
    opts = opts || {};
    var eagerAll = !!opts.validateNow;
    (root || d).querySelectorAll('.tasty-field').forEach(function (f) {
      ensureControl(f);
      var input = f.querySelector('.tasty-field__control input, .tasty-field__control select, .tasty-field__control textarea');
      if (!input) return;
      bind(input);
      // on open: decorate only if currently VALID (→ green) and visible; never show an error yet.
      if ((eagerAll || input.closest('[data-validate-on-open]')) && !input.closest('[hidden]') && w.isFieldValid(input)) {
        input.__tvTouched = true;            // it showed a state → re-validate live from here on
        w.validateField(input);
      }
    });
  };
  if (d.readyState === 'loading') d.addEventListener('DOMContentLoaded', function () { w.tastyBindValidation(); });
  else w.tastyBindValidation();
})(window, document);
