/* ════════════════════════════════════════════════════════════════════════════
   DevDrawer — shared, dependency-free dev panel for the DE prototypes.

   One vanilla drawer used by every prototype (learner · counselor · college-admin):
   a right-edge tab that opens a side drawer which PUSHES the page content left.
   No React/Babel — works identically over file:// and on the claude.ai/design upload,
   so people can navigate the uploaded prototype without setting up dependencies.

   ── Navigability (Jul 29, 2026 rebuild) ──────────────────────────────────────
   The panel had grown to ~30 controls in one flat scroll, all wearing the same
   grey pill, so nothing read as a group and nothing showed its current value.
   What changed, and why:
     • COMMON REGION — each section is a bordered card with its own header, so
       groups are enclosed rather than implied by whitespace.
     • Collapsible sections, remembered per prototype (localStorage). A 300px
       panel can't show 30 controls at once, so let people close what they
       aren't using. Section state survives reloads.
     • FILTER field — type to find a control by name; non-matching rows and
       empty sections disappear, matching sections auto-open. Recognition over
       recall, and the fastest path when you know what you want.
     • VISIBILITY OF STATE — grids are single-select and now show which value is
       live (like the segmented control always did). Pass { active: value }.
     • SIMILARITY — one look per job: navigation rows, value chips, switches,
       and plain actions each read differently instead of all being grey pills.
     • Persistent FOOTER — Changelog / Reset / back-to-index are always reachable
       instead of buried at whichever end of the scroll they landed in.

   Usage (each prototype ships one small config script):
     DevDrawer.build('Tweaks', function (p) {
       p.section('Appearance');
       p.select(['default','dark'], 'default', function (v) { setTheme(v); });
       p.button('Reset', function () { reset(); });
     }, { scope: 'counselor', onReset: reset, indexHref: '../' });

   Builder API (p):
     p.section(label, opts)             opts: { open:true|false } default open
     p.note(text)
     p.button(label, onClick, opts)     opts: { variant:'primary'|'back'|'danger' }
     p.grid(items, onClick, opts)       items: ['Label', value] pairs OR strings
                                        opts: { active:value, columns:2 }
     p.nav(items, onClick, opts)        same shape; renders as a navigation list
     p.select(options, value, onChange)
     p.segmented(options, value, onChange)
     p.toggle(label, checked, onChange)
     p.changelog(scopeKey, opts)        (legacy; the footer button covers this)

   build() opts: { scope, onReset, indexHref, width }
   ════════════════════════════════════════════════════════════════════════════ */
(function () {
  if (window.DevDrawer) return;
  var W = 320; // drawer width (px) — also the content push distance
  /* Inline so the drawer stays dependency-free: it has to render identically on
     file:// and on the claude.ai/design upload, with or without an icon font. */
  var GEAR_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" ' +
    'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' +
    '<path d="M10.3 4.3a1.9 1.9 0 0 1 3.4 0l.2.5a1.9 1.9 0 0 0 2.4 1l.5-.2a1.9 1.9 0 0 1 2.4 2.4l-.2.5a1.9 1.9 0 0 0 1 2.4l.5.2a1.9 1.9 0 0 1 0 3.4l-.5.2a1.9 1.9 0 0 0-1 2.4l.2.5a1.9 1.9 0 0 1-2.4 2.4l-.5-.2a1.9 1.9 0 0 0-2.4 1l-.2.5a1.9 1.9 0 0 1-3.4 0l-.2-.5a1.9 1.9 0 0 0-2.4-1l-.5.2a1.9 1.9 0 0 1-2.4-2.4l.2-.5a1.9 1.9 0 0 0-1-2.4l-.5-.2a1.9 1.9 0 0 1 0-3.4l.5-.2a1.9 1.9 0 0 0 1-2.4l-.2-.5a1.9 1.9 0 0 1 2.4-2.4l.5.2a1.9 1.9 0 0 0 2.4-1z"/>' +
    '<circle cx="12" cy="12" r="2.6"/></svg>';

  function injectCSS() {
    if (document.getElementById('devdrawer-css')) return;
    var css = [
      'html.devdrawer-open body{padding-right:' + W + 'px;}',
      'body{transition:padding-right .22s cubic-bezier(.3,.7,.4,1);}',
      '.devdrawer{position:fixed;top:0;right:0;height:100vh;width:' + W + 'px;z-index:2147483646;',
        'background:#fff;border-left:1px solid #e6e6e6;box-shadow:-8px 0 28px rgba(0,0,0,.12);',
        'transform:translateX(100%);transition:transform .22s cubic-bezier(.3,.7,.4,1);',
        'display:flex;flex-direction:column;font:13px/1.4 "Open Sans",ui-sans-serif,system-ui,sans-serif;color:#29261b;}',
      '.devdrawer.open{transform:translateX(0);}',
      '.devdrawer :focus-visible{outline:2px solid #006aa8;outline-offset:1px;}',
      /* Tab — a quiet gear near the top of the viewport rather than a shouty
         vertical "TWEAKS" label at mid-height: this is prototype scaffolding, so it
         should sit at the edge of attention and not compete with the page. It hangs
         off the drawer's left edge, so it rides out with the drawer. */
      '.devdrawer-tab{position:absolute;left:-38px;top:84px;width:38px;height:38px;',
        'display:flex;align-items:center;justify-content:center;padding:0;',
        'border:1px solid #e3e1d8;border-right:0;border-radius:9px 0 0 9px;',
        'background:rgba(255,255,255,.94);color:#8a8677;cursor:pointer;box-shadow:-2px 0 8px rgba(0,0,0,.07);',
        'transition:color .15s,background .15s,box-shadow .15s;}',
      '.devdrawer-tab svg{width:17px;height:17px;display:block;}',
      '.devdrawer-tab:hover{background:#fff;color:#29261b;box-shadow:-3px 0 12px rgba(0,0,0,.12);}',
      '.devdrawer.open .devdrawer-tab{color:#29261b;}',
      '.devdrawer-head{display:flex;align-items:center;gap:8px;padding:12px 14px 10px;border-bottom:1px solid #efefef;}',
      '.devdrawer-title{flex:1;font-weight:700;font-size:13px;letter-spacing:.02em;}',
      '.devdrawer-x{appearance:none;border:0;background:transparent;font-size:18px;line-height:1;color:#8a8a82;cursor:pointer;padding:2px 6px;border-radius:6px;}',
      '.devdrawer-x:hover{background:#f2f2f0;color:#29261b;}',
      // Filter — sticky under the header; typing narrows every section at once.
      '.dd-filter-wrap{position:relative;padding:10px 14px;border-bottom:1px solid #efefef;background:#fff;}',
      '.dd-filter{box-sizing:border-box;width:100%;height:32px;padding:0 26px 0 28px;border:1px solid #e0ddd2;border-radius:8px;',
        'background:#faf9f5;color:#29261b;font:12px/1 inherit;}',
      '.dd-filter::placeholder{color:#a8a496;}',
      '.dd-filter-ic{position:absolute;left:22px;top:50%;transform:translateY(-50%);color:#a8a496;font-size:12px;pointer-events:none;}',
      '.dd-filter-clear{position:absolute;right:20px;top:50%;transform:translateY(-50%);border:0;background:transparent;',
        'color:#8a8a82;font-size:14px;line-height:1;cursor:pointer;padding:2px 4px;border-radius:4px;display:none;}',
      '.dd-filter-clear.is-on{display:block;}',
      '.devdrawer-body{flex:1;overflow-y:auto;padding:12px 14px 18px;}',
      '.dd-empty{font-size:12px;color:#9a968a;text-align:center;padding:24px 8px;}',
      // Common region — one card per section, header doubles as the collapse control.
      '.dd-group{border:1px solid #eceadf;border-radius:10px;background:#fcfcfa;margin:0 0 10px;overflow:hidden;}',
      '.dd-group-head{display:flex;align-items:center;gap:8px;width:100%;box-sizing:border-box;padding:9px 11px;',
        'border:0;background:transparent;cursor:pointer;text-align:left;',
        'font:700 10px/1 inherit;letter-spacing:.1em;text-transform:uppercase;color:#6b6757;}',
      '.dd-group-head:hover{background:#f5f4ec;}',
      '.dd-group-title{flex:1;}',
      '.dd-caret{font-size:11px;color:#a8a496;transition:transform .16s;}',
      '.dd-group.is-open .dd-caret{transform:rotate(90deg);}',
      '.dd-group-body{display:none;padding:2px 11px 11px;}',
      '.dd-group.is-open .dd-group-body{display:block;}',
      '.dd-sec{font:700 10px/1 inherit;letter-spacing:.1em;text-transform:uppercase;color:#9a968a;margin:14px 0 8px;}',
      '.dd-note{font-size:11px;color:#9a968a;margin:10px 0 6px;}',
      '.dd-group-body > .dd-note:first-child{margin-top:2px;}',
      // Plain action
      '.dd-btn{display:block;width:100%;box-sizing:border-box;padding:8px 10px;margin:0 0 6px;border:1px solid #e0ddd2;',
        'border-radius:7px;background:#fff;color:#29261b;font:600 12px/1 inherit;text-align:left;cursor:pointer;}',
      '.dd-btn:hover{background:#f5f4ec;}',
      '.dd-btn.is-primary{background:#226103;border-color:#226103;color:#fff;}',
      '.dd-btn.is-primary:hover{background:#1a4c02;}',
      '.dd-btn.is-back{background:#0E1721;border-color:#0E1721;color:#fff;}',
      '.dd-btn.is-danger{color:#a32020;border-color:#e8d5d5;}',
      '.dd-btn.is-danger:hover{background:#fbf1f1;}',
      // Value chips — single-select, so the live value is always visible.
      '.dd-grid{display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:6px;}',
      '.dd-grid.is-c1{grid-template-columns:1fr;}',
      '.dd-grid.is-c3{grid-template-columns:1fr 1fr 1fr;}',
      '.dd-chip{box-sizing:border-box;padding:7px 8px;border:1px solid #e0ddd2;border-radius:7px;background:#fff;',
        'color:#4a473c;font:600 11px/1.2 inherit;text-align:center;cursor:pointer;}',
      '.dd-chip:hover{background:#f5f4ec;}',
      '.dd-chip.is-on{background:#0E1721;border-color:#0E1721;color:#fff;}',
      // Navigation list — distinct from value chips: full-width rows with a chevron.
      '.dd-nav{display:flex;flex-direction:column;gap:2px;margin-bottom:4px;}',
      '.dd-nav-item{display:flex;align-items:center;gap:8px;width:100%;box-sizing:border-box;padding:7px 9px;',
        'border:0;border-radius:7px;background:transparent;color:#29261b;font:600 12px/1 inherit;text-align:left;cursor:pointer;}',
      '.dd-nav-item:hover{background:#f0efe7;}',
      '.dd-nav-item .dd-nav-ic{color:#c0bcae;font-size:11px;}',
      '.dd-nav-item.is-on{background:#e8eef3;color:#00548a;}',
      '.dd-nav-item.is-on .dd-nav-ic{color:#00548a;}',
      '.dd-field{box-sizing:border-box;width:100%;height:32px;padding:0 8px;margin-bottom:8px;border:1px solid #e0ddd2;',
        'border-radius:7px;background:#fff;color:#29261b;font:12px/1 inherit;cursor:pointer;}',
      '.dd-seg{display:flex;gap:2px;padding:2px;margin-bottom:8px;background:#efeee7;border-radius:8px;}',
      '.dd-seg button{flex:1;min-width:0;border:0;background:transparent;border-radius:6px;padding:6px 4px;',
        'font:600 11px/1 inherit;color:#6b6757;cursor:pointer;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}',
      '.dd-seg button.is-on{background:#fff;color:#29261b;box-shadow:0 1px 2px rgba(0,0,0,.12);}',
      '.dd-toggle{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:5px 0;}',
      '.dd-toggle span{font-size:12px;}',
      '.dd-switch{position:relative;width:34px;height:18px;border:0;border-radius:999px;background:#cfccc0;cursor:pointer;flex:none;transition:background .15s;}',
      '.dd-switch.is-on{background:#226103;}',
      '.dd-switch i{position:absolute;top:2px;left:2px;width:14px;height:14px;border-radius:50%;background:#fff;transition:left .15s;}',
      '.dd-switch.is-on i{left:18px;}',
      '.dd-hidden{display:none !important;}',
      // Footer — the escape hatches, always in the same place.
      '.devdrawer-foot{display:flex;gap:6px;padding:10px 14px;border-top:1px solid #efefef;background:#fff;}',
      '.dd-foot-btn{flex:1;padding:8px 6px;border:1px solid #e0ddd2;border-radius:7px;background:#fff;color:#4a473c;',
        'font:600 11px/1 inherit;cursor:pointer;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}',
      '.dd-foot-btn:hover{background:#f5f4ec;}',
      '.dd-foot-btn.is-danger{color:#a32020;}',
      // Secondary sub-panel (e.g. Changelog) — slides over the main body; Back returns.
      '.devdrawer-panel{position:absolute;inset:0;background:#fff;display:flex;flex-direction:column;',
        'transform:translateX(100%);transition:transform .2s cubic-bezier(.3,.7,.4,1);z-index:2;}',
      '.devdrawer-panel.open{transform:translateX(0);}',
      '.dd-panel-head{display:flex;align-items:center;padding:14px 16px;border-bottom:1px solid #efefef;}',
      '.dd-panel-back{appearance:none;border:0;background:transparent;cursor:pointer;display:flex;align-items:center;gap:7px;',
        'font:700 13px/1 inherit;color:#29261b;padding:2px 4px;border-radius:6px;}',
      '.dd-panel-back:hover{background:#f2f2f0;}',
      '.dd-panel-back .dd-arrow{font-size:15px;line-height:1;}',
      '.dd-panel-body{flex:1;overflow-y:auto;padding:6px 16px 24px;}',
      '.dd-cl-date{font:700 11px/1 inherit;letter-spacing:.04em;color:#29261b;margin:16px 0 8px;padding-bottom:5px;border-bottom:1px solid #f0efe9;}',
      '.dd-cl-date:first-child{margin-top:8px;}',
      '.dd-cl-item{display:flex;gap:7px;font-size:12px;line-height:1.45;color:#4a473c;margin:0 0 7px;}',
      '.dd-cl-item .dd-dot{color:#c0bcae;font-weight:700;flex:none;}',
      '.dd-cl-empty{font-size:12px;color:#9a968a;margin-top:12px;}'
    ].join('');
    var s = document.createElement('style');
    s.id = 'devdrawer-css';
    s.textContent = css;
    document.head.appendChild(s);
  }

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }
  function pair(o) { return Array.isArray(o) ? o : [o, o]; }

  /* Section open/closed state survives reloads — closing what you don't use is
     only worth doing if it stays closed. Keyed per prototype title + section. */
  function stateKey(title, section) { return 'devdrawer:' + (title || 'dev') + ':' + section; }
  function readOpen(title, section, dflt) {
    try {
      var v = window.localStorage.getItem(stateKey(title, section));
      return v === null ? dflt : v === '1';
    } catch (e) { return dflt; }
  }
  function writeOpen(title, section, on) {
    try { window.localStorage.setItem(stateKey(title, section), on ? '1' : '0'); } catch (e) {}
  }

  // Render window.DEV_CHANGELOG into a container, showing only items scoped to this
  // prototype (its scopeKey) or to 'all'. Grouped by date; empty dates are skipped.
  function renderChangelog(container, scopeKey) {
    var log = window.DEV_CHANGELOG || [];
    var shown = 0;
    log.forEach(function (day) {
      var items = (day.items || []).filter(function (it) {
        var sc = it.scope || ['all'];
        return sc.indexOf('all') !== -1 || sc.indexOf(scopeKey) !== -1;
      });
      if (!items.length) return;
      shown++;
      container.appendChild(el('div', 'dd-cl-date', day.date));
      items.forEach(function (it) {
        var row = el('div', 'dd-cl-item');
        row.appendChild(el('span', 'dd-dot', '·'));
        row.appendChild(el('span', null, it.text));
        container.appendChild(row);
      });
    });
    if (!shown) container.appendChild(el('p', 'dd-cl-empty', 'No changes logged yet.'));
  }

  window.DevDrawer = {
    build: function (title, fn, opts) {
      opts = opts || {};
      injectCSS();
      var existing = document.getElementById('devdrawer');
      if (existing) existing.remove();

      var drawer = el('div', 'devdrawer');
      drawer.id = 'devdrawer';

      var tab = el('button', 'devdrawer-tab');
      tab.type = 'button';
      tab.innerHTML = GEAR_SVG;
      tab.title = title || 'Prototype settings';
      tab.setAttribute('aria-label', 'Toggle ' + (title || 'prototype settings') + ' panel');
      tab.setAttribute('aria-expanded', 'false');
      drawer.appendChild(tab);

      var head = el('div', 'devdrawer-head');
      head.appendChild(el('span', 'devdrawer-title', title || 'Tweaks'));
      var x = el('button', 'devdrawer-x', '×');
      x.type = 'button';
      x.setAttribute('aria-label', 'Close panel');
      head.appendChild(x);
      drawer.appendChild(head);

      /* ── Filter ── */
      var fWrap = el('div', 'dd-filter-wrap');
      fWrap.appendChild(el('span', 'dd-filter-ic', '⌕'));
      var filter = el('input', 'dd-filter');
      filter.type = 'search';
      filter.placeholder = 'Filter controls…';
      filter.setAttribute('aria-label', 'Filter controls');
      var fClear = el('button', 'dd-filter-clear', '×');
      fClear.type = 'button';
      fClear.setAttribute('aria-label', 'Clear filter');
      fWrap.appendChild(filter);
      fWrap.appendChild(fClear);
      drawer.appendChild(fWrap);

      var body = el('div', 'devdrawer-body');
      drawer.appendChild(body);

      var noHits = el('p', 'dd-empty', 'No controls match that.');
      noHits.classList.add('dd-hidden');
      body.appendChild(noHits);

      /* ── Sections (common region) ── */
      var groups = [];          // { wrap, body, name, head }
      var current = null;       // the section controls are being appended to
      /* A note captions the controls under it ("Theme" over a theme select), so it
         joins their searchable text — otherwise filtering for "theme" finds nothing,
         because the select itself only knows its option labels. */
      var noteCtx = '';

      function ensureGroup() {
        if (!current) startGroup('Controls', {});
        return current;
      }
      function startGroup(label, gOpts) {
        gOpts = gOpts || {};
        var wrap = el('section', 'dd-group');
        var h = el('button', 'dd-group-head');
        h.type = 'button';
        h.appendChild(el('span', 'dd-group-title', label));
        h.appendChild(el('span', 'dd-caret', '›'));
        var gBody = el('div', 'dd-group-body');
        var open = readOpen(title, label, gOpts.open !== false);
        wrap.classList.toggle('is-open', open);
        h.setAttribute('aria-expanded', String(open));
        h.onclick = function () {
          var on = !wrap.classList.contains('is-open');
          wrap.classList.toggle('is-open', on);
          h.setAttribute('aria-expanded', String(on));
          writeOpen(title, label, on);
        };
        wrap.appendChild(h);
        wrap.appendChild(gBody);
        body.appendChild(wrap);
        noteCtx = '';
        var g = { wrap: wrap, body: gBody, name: label, head: h };
        groups.push(g);
        current = g;
        return g;
      }
      // Anything a control is searchable by — its own label plus its section's.
      function tagRow(node, label) {
        node.setAttribute('data-dd-label', String(label || '').toLowerCase());
        return node;
      }
      function add(node, label) {
        tagRow(node, (label || '') + ' ' + noteCtx);
        ensureGroup().body.appendChild(node);
        return node;
      }

      /* ── Filtering: hide non-matching rows, hide emptied sections, and open any
            section that still has a hit (a match you can't see is not a match). ── */
      function applyFilter() {
        var q = filter.value.trim().toLowerCase();
        fClear.classList.toggle('is-on', !!q);
        var anyHit = false;
        groups.forEach(function (g) {
          var rows = Array.prototype.slice.call(g.body.children);
          var hits = 0;
          rows.forEach(function (r) {
            var lbl = r.getAttribute('data-dd-label') || '';
            var hit = !q || lbl.indexOf(q) !== -1 || g.name.toLowerCase().indexOf(q) !== -1;
            r.classList.toggle('dd-hidden', !hit);
            if (hit && !r.classList.contains('dd-note')) hits++;
          });
          g.wrap.classList.toggle('dd-hidden', !!q && hits === 0);
          if (hits) anyHit = true;
          if (q && hits) { g.wrap.classList.add('is-open'); g.head.setAttribute('aria-expanded', 'true'); }
          if (!q) {   // restore the remembered state when the filter clears
            var open = readOpen(title, g.name, true);
            g.wrap.classList.toggle('is-open', open);
            g.head.setAttribute('aria-expanded', String(open));
          }
        });
        noHits.classList.toggle('dd-hidden', !q || anyHit);
      }
      filter.oninput = applyFilter;
      filter.onkeydown = function (e) { if (e.key === 'Escape') { filter.value = ''; applyFilter(); } };
      fClear.onclick = function () { filter.value = ''; applyFilter(); filter.focus(); };

      // Secondary sub-panel (Changelog, etc.) — slides over the body; Back returns.
      var panel = el('div', 'devdrawer-panel');
      var panelHead = el('div', 'dd-panel-head');
      var panelBack = el('button', 'dd-panel-back');
      panelBack.type = 'button';
      var panelTitle = el('span', 'dd-panel-title', 'Back');
      panelBack.appendChild(el('span', 'dd-arrow', '←'));
      panelBack.appendChild(panelTitle);
      panelBack.onclick = function () { panel.classList.remove('open'); };
      panelHead.appendChild(panelBack);
      var panelBody = el('div', 'dd-panel-body');
      panel.appendChild(panelHead);
      panel.appendChild(panelBody);
      drawer.appendChild(panel);
      function openPanel(t, renderFn) {
        panelTitle.textContent = t;
        panelBody.innerHTML = '';
        renderFn(panelBody);
        panel.classList.add('open');
      }

      function setOpen(on) {
        drawer.classList.toggle('open', on);
        tab.setAttribute('aria-expanded', String(on));
        document.documentElement.classList.toggle('devdrawer-open', on);
        if (!on) panel.classList.remove('open');   // reset to the main view when closed
      }
      tab.onclick = function () { setOpen(!drawer.classList.contains('open')); };
      x.onclick = function () { setOpen(false); };
      drawer.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && document.activeElement !== filter) setOpen(false);
      });

      /* Nav highlight follows the real screen. */
      var navWraps = [];
      function syncNav(v) {
        navWraps.forEach(function (w) {
          Array.prototype.forEach.call(w.children, function (c) {
            c.classList.toggle('is-on', c.getAttribute('data-dd-value') === v);
          });
        });
      }

      // Builder API handed to the per-prototype config.
      var p = {
        section: function (label, sOpts) { startGroup(label, sOpts); return p; },
        note: function (text) { noteCtx = ''; add(el('p', 'dd-note', text), text); noteCtx = text; return p; },
        // Legacy inline changelog button — the footer button is the canonical one now.
        changelog: function (scopeKey, cOpts) {
          cOpts = cOpts || {};
          var label = cOpts.label || 'Changelog';
          var b = el('button', 'dd-btn', label);
          b.type = 'button';
          b.onclick = function () { openPanel(label, function (c) { renderChangelog(c, scopeKey); }); };
          add(b, label);
          return p;
        },
        button: function (label, onClick, bOpts) {
          bOpts = bOpts || {};
          var v = bOpts.variant;
          var b = el('button', 'dd-btn' + (v === 'primary' ? ' is-primary' : v === 'back' ? ' is-back' : v === 'danger' ? ' is-danger' : ''), label);
          b.type = 'button';
          b.onclick = onClick;
          add(b, label);
          return p;
        },
        /* Single-select value chips. The live value stays lit, so the panel
           reports state instead of just firing events. */
        grid: function (items, onClick, gOpts) {
          gOpts = gOpts || {};
          var cols = gOpts.columns || 2;
          var g = el('div', 'dd-grid' + (cols === 1 ? ' is-c1' : cols === 3 ? ' is-c3' : ''));
          var labels = [];
          items.forEach(function (it) {
            var pr = pair(it);
            labels.push(pr[0]);
            var b = el('button', 'dd-chip' + (gOpts.active != null && pr[1] === gOpts.active ? ' is-on' : ''), pr[0]);
            b.type = 'button';
            b.onclick = function () {
              Array.prototype.forEach.call(g.children, function (c) { c.classList.remove('is-on'); });
              b.classList.add('is-on');
              onClick(pr[1], pr[0]);
            };
            g.appendChild(b);
          });
          add(g, labels.join(' '));
          return p;
        },
        /* Navigation rows — a different job from value chips, so a different look.
           The lit row follows the ACTUAL screen (showScreen is wrapped below), not
           just the last click, so the panel can't disagree with the page. */
        nav: function (items, onClick, nOpts) {
          nOpts = nOpts || {};
          var wrap = el('div', 'dd-nav');
          navWraps.push(wrap);
          var labels = [];
          items.forEach(function (it) {
            var pr = pair(it);
            labels.push(pr[0]);
            var b = el('button', 'dd-nav-item' + (nOpts.active != null && pr[1] === nOpts.active ? ' is-on' : ''));
            b.type = 'button';
            b.setAttribute('data-dd-value', pr[1]);
            b.appendChild(el('span', 'dd-nav-ic', '›'));
            b.appendChild(el('span', null, pr[0]));
            b.onclick = function () {
              Array.prototype.forEach.call(wrap.children, function (c) { c.classList.remove('is-on'); });
              b.classList.add('is-on');
              onClick(pr[1], pr[0]);
            };
            wrap.appendChild(b);
          });
          add(wrap, labels.join(' '));
          return p;
        },
        input: function (iOpts) {
          iOpts = iOpts || {};
          var inp = el('input', 'dd-field');
          inp.type = iOpts.type || 'text';
          if (iOpts.id) inp.id = iOpts.id;
          if (iOpts.value != null) inp.value = iOpts.value;
          if (iOpts.placeholder) inp.placeholder = iOpts.placeholder;
          if (typeof iOpts.onChange === 'function') inp.oninput = function () { iOpts.onChange(inp.value); };
          add(inp, iOpts.placeholder || iOpts.id || 'input');
          return p;
        },
        select: function (options, value, onChange) {
          var sel = el('select', 'dd-field');
          var labels = [];
          options.forEach(function (o) {
            var pr = pair(o);
            labels.push(pr[0]);
            var opt = el('option', null, pr[0]);
            opt.value = pr[1];
            if (pr[1] === value) opt.selected = true;
            sel.appendChild(opt);
          });
          sel.onchange = function () { onChange(sel.value); };
          add(sel, labels.join(' '));
          return p;
        },
        segmented: function (options, value, onChange) {
          var seg = el('div', 'dd-seg');
          var labels = [];
          options.forEach(function (o) {
            var pr = pair(o);
            labels.push(pr[0]);
            var b = el('button', (pr[1] === value ? 'is-on' : ''), pr[0]);
            b.type = 'button';
            b.onclick = function () {
              Array.prototype.forEach.call(seg.children, function (c) { c.classList.remove('is-on'); });
              b.classList.add('is-on');
              onChange(pr[1]);
            };
            seg.appendChild(b);
          });
          add(seg, labels.join(' '));
          return p;
        },
        toggle: function (label, checked, onChange) {
          var row = el('div', 'dd-toggle');
          row.appendChild(el('span', null, label));
          var sw = el('button', 'dd-switch' + (checked ? ' is-on' : ''));
          sw.type = 'button';
          sw.setAttribute('role', 'switch');
          sw.setAttribute('aria-checked', String(!!checked));
          sw.setAttribute('aria-label', label);
          sw.appendChild(el('i'));
          sw.onclick = function () {
            var on = !sw.classList.contains('is-on');
            sw.classList.toggle('is-on', on);
            sw.setAttribute('aria-checked', String(on));
            onChange(on);
          };
          row.appendChild(sw);
          add(row, label);
          return p;
        }
      };

      if (typeof fn === 'function') fn(p);

      /* ── Footer: the three things you always want reachable ── */
      var foot = el('div', 'devdrawer-foot');
      if (opts.indexHref) {
        var bIdx = el('button', 'dd-foot-btn', '← Prototypes');
        bIdx.type = 'button';
        bIdx.onclick = function () { window.location.href = opts.indexHref; };
        foot.appendChild(bIdx);
      }
      if (opts.scope) {
        var bLog = el('button', 'dd-foot-btn', 'Changelog');
        bLog.type = 'button';
        bLog.onclick = function () { openPanel('Changelog', function (c) { renderChangelog(c, opts.scope); }); };
        foot.appendChild(bLog);
      }
      if (typeof opts.onReset === 'function') {
        var bRst = el('button', 'dd-foot-btn is-danger', 'Reset');
        bRst.type = 'button';
        bRst.onclick = function () { opts.onReset(); };
        foot.appendChild(bRst);
      }
      if (foot.children.length) drawer.appendChild(foot);

      if (typeof window.showScreen === 'function' && !window.showScreen.__ddWrapped) {
        var origShow = window.showScreen;
        window.showScreen = function (id) {
          var r = origShow.apply(this, arguments);
          syncNav(id);
          return r;
        };
        window.showScreen.__ddWrapped = true;
      }

      document.body.appendChild(drawer);
      applyFilter();
      return p;
    }
  };
})();
