/* Parchment Dual Enrollment — Parent/Guardian Consent prototype logic.
   Vanilla, no deps. Screens: inbox → find-enrollment → consent → success.
   Reuses the shared _kit validator (window.validateField / tastyBindValidation)
   and ports the learner signature pad. Maze study build (ported from the
   InstructureCon demo; the guided tour rail and click-to-fill were removed). */
(function () {
  'use strict';

  /* ── Screen nav ─────────────────────────────────────────── */
  window.showScreen = function (id) {
    document.querySelectorAll('.screen').forEach(function (s) { s.classList.remove('active'); });
    var el = document.getElementById('screen-' + id) || document.getElementById(id);
    if (el) el.classList.add('active');
    window.scrollTo(0, 0);
    if (id === 'consent') initSigPad();     // canvas must be sized while visible
    if (id === 'consent' && window.pcPrefillIdentity) window.pcPrefillIdentity();
  };

  /* ── Custom checkbox toggle (ported from learner) ───────── */
  window.toggleCheck = function (el) { el.classList.toggle('is-checked'); };

  /* ── Submit handlers ────────────────────────────────────── */
  window.submitFindEnrollment = function () {
    // Validate only the visible pane's required fields, then advance.
    var pane = document.querySelector('.pc-pane.is-active');
    var ok = true;
    if (pane && window.validateField) {
      pane.querySelectorAll('.tasty-field').forEach(function (f) {
        var input = f.querySelector('input');
        if (input) { input.__tvTouched = true; if (!window.validateField(f)) ok = false; }
      });
    }
    if (!ok) return;
    showScreen('consent');
  };

  window.submitConsent = function () {
    // Prototype-level: advance to the thank-you screen (no hard gate, keeps the demo fluid).
    showScreen('success');
  };

  /* ════════════════════════════════════════════════════════
     Signature pad (ported from the learner DE-application form)
  ════════════════════════════════════════════════════════ */
  var sigState = { bound: false, drawing: false };
  function initSigPad() {
    var canvas = document.getElementById('sig-pad');
    if (!canvas) return;
    var rect = canvas.getBoundingClientRect();
    if (rect.width) { canvas.width = rect.width; canvas.height = rect.height; }
    var ctx = canvas.getContext('2d');
    ctx.lineWidth = 2; ctx.lineCap = 'round';
    ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue('--body-font-strong').trim() || '#222';
    if (sigState.bound) return;
    sigState.bound = true;
    function pos(e) {
      var r = canvas.getBoundingClientRect();
      var p = e.touches ? e.touches[0] : e;
      return { x: p.clientX - r.left, y: p.clientY - r.top };
    }
    function start(e) { sigState.drawing = true; var p = pos(e); ctx.beginPath(); ctx.moveTo(p.x, p.y); e.preventDefault(); }
    function move(e) { if (!sigState.drawing) return; var p = pos(e); ctx.lineTo(p.x, p.y); ctx.stroke(); e.preventDefault(); }
    function end() { sigState.drawing = false; }
    canvas.addEventListener('mousedown', start);
    canvas.addEventListener('mousemove', move);
    window.addEventListener('mouseup', end);
    canvas.addEventListener('touchstart', start, { passive: false });
    canvas.addEventListener('touchmove', move, { passive: false });
    canvas.addEventListener('touchend', end);
  }
  window.clearSig = function () {
    var canvas = document.getElementById('sig-pad');
    if (!canvas) return;
    var ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };
  function drawSignature() {
    var canvas = document.getElementById('sig-pad');
    if (!canvas || !canvas.width) return;
    var ctx = canvas.getContext('2d');
    var w = canvas.width, h = canvas.height;
    ctx.clearRect(0, 0, w, h);
    ctx.lineWidth = 2; ctx.lineCap = 'round';
    ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue('--body-font-strong').trim() || '#222';
    var x = w * 0.10, y = h * 0.62, s = Math.min(w / 320, 1);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.bezierCurveTo(x + 24 * s, y - 46 * s, x + 46 * s, y + 22 * s, x + 70 * s, y - 12 * s);
    ctx.bezierCurveTo(x + 92 * s, y - 44 * s, x + 116 * s, y + 30 * s, x + 150 * s, y - 6 * s);
    ctx.bezierCurveTo(x + 176 * s, y - 34 * s, x + 200 * s, y + 24 * s, x + 236 * s, y - 8 * s);
    ctx.stroke();
  }

  /* ════════════════════════════════════════════════════════
     STUDY BUILD — identity prefill only.

     Replaces the demo's pcFillConsent(), which filled the ENTIRE consent act
     (name, date, both checkboxes, and the signature) on a click anywhere in the
     form. That was a presenter convenience and, in an unmoderated study, it
     would have completed the task on the participant's behalf.

     What we prefill: name-as-signed and date. Those are facts the system already
     holds about the guardian, so typing them measures nothing.

     What we deliberately do NOT prefill: the two consent checkboxes and the
     signature. Those ARE the task — whether a guardian understands what they are
     agreeing to, and whether they will agree to it. Prefilling them would leave
     the study with nothing to observe on this screen.
  ════════════════════════════════════════════════════════ */
  window.pcPrefillIdentity = function () {
    var cols = document.querySelectorAll('#screen-consent .de-app-cols input');
    ['Diana', 'L', 'Cumberland'].forEach(function (v, i) { if (cols[i]) cols[i].value = v; });
    markColsFilled(document.getElementById('screen-consent'));
    var dateField = document.querySelector('#screen-consent .de-app-consent .tasty-field input');
    if (dateField) {
      dateField.value = '03 / 22 / 2026';
      if (window.validateField) {
        var f = dateField.closest('.tasty-field'); if (f) window.validateField(f);
      }
    }
  };

  /* Multi-column name rows (First/Middle/Last) are separate .tasty-field columns;
     reveal each column's green check the moment it has a value. */
  function markColsFilled(scope) {
    (scope || document).querySelectorAll('.de-app-cols .tasty-field, .de-app-cols-2 .tasty-field').forEach(function (f) {
      var inp = f.querySelector('input');
      if (inp) f.classList.toggle('is-valid', !!inp.value.trim());
    });
  }
  function onColInput(e) {
    var f = e.target.closest && e.target.closest('.de-app-cols .tasty-field, .de-app-cols-2 .tasty-field');
    if (f) { var inp = f.querySelector('input'); if (inp) f.classList.toggle('is-valid', !!inp.value.trim()); }
  }

  function boot() {
    if (window.resolveTastyAssets) window.resolveTastyAssets(document.body);
    document.addEventListener('input', onColInput);
    /* Screen restoration is owned by maze-shim.js (allowlisted, with a fallback).
       The demo's reader called showScreen() with whatever the URL said; an
       unknown id falls through to a bare getElementById() with no class check,
       which strips .active from every screen and produces a silent blank page. */
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
