/* ════════════════════════════════════════════════════════════════════
   TASTY ICON HELPERS — resolve a friendly slug to vendored SVG markup.
   Depends on window.TASTY_ICONS (assets/tasty/manifest.js), loaded first.
   ════════════════════════════════════════════════════════════════════

   tastyIcon(slug, opts)   → monochrome <span class="tcon">  (recolorable)
   tastyIllus(slug, opts)  → full-color <img class="tillus">
   tastyName(slug)         → the PascalCase name Tasty calls it (e.g. CheckIcon)

   Lookup order: icon → graphic → vector (first match wins). Pass
   { category: 'vector' } to disambiguate. Unknown slug → empty string
   plus a console.warn (so a typo is visible, not silently blank).
   ════════════════════════════════════════════════════════════════════ */
(function (w, doc) {
  var M = w.TASTY_ICONS || { icon: {}, graphic: {}, vector: {} };
  var ORDER = ['icon', 'graphic', 'vector'];

  // Manifest paths are project-root-relative (e.g. "assets/tasty/icons/x.svg").
  // Derive the project root from THIS script's own URL so those paths resolve
  // correctly no matter where the host page lives — project root (index.html),
  // a subfolder (preview/*.html), or a template (templates/*/). Without this,
  // a preview page resolves "assets/…" against /preview/ → broken /preview/assets/….
  var self = doc.currentScript || (function () { var s = doc.getElementsByTagName('script'); return s[s.length - 1]; })();
  var BASE = '';
  try { if (self && self.src) BASE = self.src.replace(/scripts\/tasty-icons\.js(\?.*)?$/, ''); } catch (e) {}
  w.TASTY_BASE = BASE;
  // Leave absolute (http(s)://, //, data:, /) paths untouched; prefix the rest.
  function resolvePath(p) {
    return (!p || /^([a-z][a-z0-9+.-]*:)?\/\//i.test(p) || p.charAt(0) === '/' || p.indexOf('data:') === 0) ? p : BASE + p;
  }
  w.tastyAssetUrl = resolvePath;

  // Resolve an asset's <img> source from EITHER manifest format: a base64 `uri`
  // (skill kits — SVGs inlined by embed-svgs.js) or a loose-file `path` (kit copies).
  // Last resort: an inline-svg-only record (a mono icon reached via tastyIllus, or a
  // slug that collides with an inlined icon) → wrap its markup as a data URI so the
  // <img> still renders instead of emitting src="undefined".
  function svgDataUri(rec) {
    var s = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="' + (rec.vb || '0 0 40 40') + '">' + rec.svg + '</svg>';
    // base64 — a `;utf8,` data URI is unreliable as a CSS mask-image (renders the full box,
    // not the glyph); base64 works everywhere incl. headless. Fall back to utf8 if btoa chokes.
    try { return 'data:image/svg+xml;base64,' + w.btoa(s); }
    catch (e) { return 'data:image/svg+xml;utf8,' + encodeURIComponent(s); }
  }
  function assetSrc(rec) {
    if (rec.uri) return rec.uri;
    if (rec.path) return resolvePath(rec.path);
    if (rec.svg) return svgDataUri(rec);
    return '';
  }

  function lookup(slug, category) {
    if (category) return M[category] && M[category][slug] ? { cat: category, rec: M[category][slug] } : null;
    for (var i = 0; i < ORDER.length; i++) {
      var c = ORDER[i];
      if (M[c] && M[c][slug]) return { cat: c, rec: M[c][slug] };
    }
    return null;
  }

  function warn(slug) { if (w.console) console.warn('[tasty-icons] unknown slug: ' + slug); return ''; }

  // Monochrome glyph. Clean icons carry inline markup (rec.svg) → rendered as an
  // inline <svg fill="currentColor"> that RECOLORS to the inherited text color
  // (white on a primary button, themed in dark mode) on any protocol, file://
  // included — the same approach Tasty's Icon.tsx uses. Multi-color / gradient /
  // stroked icons have no inline markup and fall back to <img> (shows everywhere,
  // doesn't recolor — correct, they're not meant to). opts: { size:18, className, title, category }
  w.tastyIcon = function (slug, opts) {
    opts = opts || {};
    var hit = lookup(slug, opts.category);
    if (!hit) return warn(slug);
    var size = opts.size != null ? opts.size : 18;   // number (px), bare-number string, or a CSS length like '1em'
    var cls = 'ticon' + (opts.className ? ' ' + opts.className : '');
    // px numbers → width/height ATTR (valid on both <svg> and <img>); a CSS length like '1em' →
    // inline STYLE (the attr rejects em: svg collapses to 0×0, img to 0). NOTE: do NOT size .ticon
    // in CSS — a fixed width there would override every per-call size here.
    var dim = (typeof size === 'number' || /^\d+(\.\d+)?$/.test(String(size)))
      ? ' width="' + size + '" height="' + size + '"'
      : ' style="width:' + size + ';height:' + size + '"';
    if (hit.rec.svg) {
      var a11y = opts.title ? ' role="img"' : ' aria-hidden="true" focusable="false"';
      var ttl = opts.title ? '<title>' + opts.title + '</title>' : '';
      return '<svg xmlns="http://www.w3.org/2000/svg" class="' + cls + '" viewBox="' + (hit.rec.vb || '0 0 40 40') + '"' + dim + ' fill="currentColor"' + a11y + '>' + ttl + hit.rec.svg + '</svg>';
    }
    var title = opts.title ? ' title="' + opts.title + '" alt="' + opts.title + '"' : ' alt="" aria-hidden="true"';
    return '<img class="' + cls + '" src="' + assetSrc(hit.rec) + '"' + dim + title + '>';
  };

  // Full-color illustration/graphic/logo. opts: { size:number(px width), alt, className, category }
  w.tastyIllus = function (slug, opts) {
    opts = opts || {};
    var hit = lookup(slug, opts.category);
    if (!hit) return warn(slug);
    var cls = 'tillus' + (opts.className ? ' ' + opts.className : '');
    var style = opts.size != null ? ' style="width:' + opts.size + 'px"' : '';
    var alt = ' alt="' + (opts.alt != null ? opts.alt : '') + '"';
    return '<img class="' + cls + '" src="' + assetSrc(hit.rec) + '"' + style + alt + '>';
  };

  // The name Tasty calls this asset (e.g. 'check' → 'CheckIcon').
  w.tastyName = function (slug) {
    var hit = lookup(slug);
    return hit ? hit.rec.name : null;
  };

  /* ─── Declarative asset resolver ──────────────────────────────────────
     Lets static screen markup reference any asset by friendly slug — no
     hardcoded asset paths in the HTML:
       <span data-tasty-icon="sign-in" data-size="20"></span>
       <span data-tasty-illus="parchment-pathways-logo" data-size="150"></span>
     Runs once the DOM is ready, and again on demand via resolveTastyAssets()
     after you inject markup dynamically. Idempotent: a resolved node no longer
     carries the data-attr, so a second pass is a no-op. ─── */
  function resolveTastyAssets(root) {
    root = root || doc;
    root.querySelectorAll('[data-tasty-illus]').forEach(function (el) {
      var html = w.tastyIllus(el.getAttribute('data-tasty-illus'), {
        size: el.getAttribute('data-size') || undefined,
        alt: el.getAttribute('alt') || '',
        className: el.getAttribute('data-class') || ''
      });
      if (html) el.outerHTML = html;
    });
    // Both the current `data-tasty-icon` and the legacy `data-g` resolve to an inline
    // <svg> from the manifest — CARRYING the element's own classes onto the svg (so a
    // toggle knob's __ic-on/__ic-off state classes survive the swap), defaulting to 1em
    // so the glyph sizes to its context (override with data-size).
    ['data-tasty-icon', 'data-g'].forEach(function (attr) {
      root.querySelectorAll('[' + attr + ']').forEach(function (el) {
        var html = w.tastyIcon(el.getAttribute(attr), {
          size: el.getAttribute('data-size') || '1em',
          className: keepClasses(el)
        });
        if (html) el.outerHTML = html;
      });
    });
  }
  // Carry an element's semantic classes onto the resolved icon, dropping the icon-
  // mechanism classes (tcon/ticon/tillus); data-class still appends extra classes.
  function keepClasses(el) {
    var keep = (el.getAttribute('class') || '').split(/\s+/).filter(function (c) {
      return c && c !== 'tcon' && c !== 'ticon' && c !== 'tillus';
    });
    var dc = el.getAttribute('data-class');
    if (dc) keep.push(dc);
    return keep.join(' ');
  }
  w.resolveTastyAssets = resolveTastyAssets;
  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', function () { resolveTastyAssets(); });
  else resolveTastyAssets();
})(window, document);
