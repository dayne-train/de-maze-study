/* Column sorting for the queue tables — one implementation, every table.
   Shared by the HS and college admin prototypes.

   WHY THIS EXISTS. Sorting was wired for exactly one table (#queue-table) while six others
   rendered a sort icon on columns with no handler behind them: they looked interactive, and
   clicking did nothing. This generalises the machinery that table already had so the
   affordance and the behaviour are the same thing everywhere.

   THE TASTY RULE ON VISIBILITY, which this follows deliberately: an unsorted column shows NO
   indicator at all. The caret appears only on the column currently sorted
   (TableHeader.tsx:94-100 gates the icon on `sort.columnName === columnKey`). Sortability is
   signalled by the header being a blue button that underlines on hover
   (TableHeaderSortButton.tsx:20-47), not by a permanent grey arrow on every column. Following
   that means a header carrying an icon is always a header that is actually sorted — which is
   the property the old always-visible icons destroyed.

   HOW A TABLE OPTS IN. Two calls, because that is how the code already worked:

     DETableSort.register('#waiting-table', {
       columns: { name: fn, group: fn, date: fn },   // sortCol → value accessor
       initial: { col: 'date', dir: 'desc' },
       render:  renderWaitingTable                    // called after every sort
     });

     // inside that renderer, before painting rows:
     DETableSort.apply('#waiting-table', rows);

   `apply` is the integration point rather than the sorter owning the data, because each
   renderer fetches its own rows from its own pool and filters them its own way. queue.js
   already called sortAppList(visibleApps) in exactly this position; every other renderer gains
   the same one-line call.

   Vanilla, no deps, file:// safe. */
(function (root) {
  'use strict';

  var tables = {};    // selector → { columns, dir, col, render, bound }

  function state(sel) { return tables[sel]; }

  /* Compare two values of unknown type. Numbers and dates arrive as numbers from the
     accessor; everything else is compared as a lowercased string, so "Thompson" and
     "thompson" sort together rather than in two blocks. */
  function cmp(a, b) {
    if (a == null) a = '';
    if (b == null) b = '';
    if (typeof a === 'number' && typeof b === 'number') return a === b ? 0 : (a < b ? -1 : 1);
    a = String(a).toLowerCase(); b = String(b).toLowerCase();
    return a === b ? 0 : (a < b ? -1 : 1);
  }

  /* The stable tiebreak, kept from queue.js: rows with equal values keep a predictable order
     instead of shuffling every time the table re-renders. */
  function tiebreak(a, b) {
    var na = ((a.lastName || '') + (a.firstName || '') + (a.name || '')).toLowerCase();
    var nb = ((b.lastName || '') + (b.firstName || '') + (b.name || '')).toLowerCase();
    return na < nb ? -1 : na > nb ? 1 : 0;
  }

  /* Reflect the active column in the headers. The DS shows nothing on an unsorted column, so
     this REMOVES any indicator it finds elsewhere rather than dimming it. */
  function paintHeaders(sel) {
    var st = state(sel);
    var thead = root.document.querySelector(sel + ' thead');
    if (!st || !thead) return;
    thead.querySelectorAll('th').forEach(function (th) {
      var sortable = th.classList.contains('is-sortable');
      var active   = sortable && th.getAttribute('data-sort-col') === st.col;
      th.classList.toggle('is-sorted', active);
      th.setAttribute('aria-sort', active ? (st.dir === 'asc' ? 'ascending' : 'descending')
                                          : (sortable ? 'none' : ''));
      if (!sortable) th.removeAttribute('aria-sort');

      var old = th.querySelector('.th-sort');
      if (old) old.parentNode.removeChild(old);
      if (!active) return;

      /* caret-solid is the glyph the DS itself uses (CaretSolidIcon); the kit carries it, so
         the indicator is the design system's own mark rather than a lookalike. */
      var mark = root.document.createElement('span');
      mark.className = 'th-sort' + (st.dir === 'asc' ? ' is-asc' : '');
      mark.setAttribute('data-tasty-icon', 'caret-solid');
      mark.setAttribute('data-size', '16');
      mark.setAttribute('aria-hidden', 'true');
      (th.querySelector('.th-inner') || th).appendChild(mark);
    });
    /* Injected data-tasty-icon nodes are inert until the kit resolves them. */
    try { if (typeof root.resolveTastyAssets === 'function') root.resolveTastyAssets(thead); } catch (e) {}
  }

  var api = {
    /* register(sel, opts) — wire a table's headers. Safe to call more than once: the click
       listener binds once, so a re-registration cannot double-sort on a single click. */
    register: function (sel, opts) {
      opts = opts || {};
      var st = tables[sel] || (tables[sel] = {});
      st.columns = opts.columns || {};
      st.render  = typeof opts.render === 'function' ? opts.render : function () {};
      if (st.col == null) {
        st.col = (opts.initial && opts.initial.col) || null;
        st.dir = (opts.initial && opts.initial.dir) || 'asc';
      }

      var thead = root.document.querySelector(sel + ' thead');
      if (!thead || st.bound) { paintHeaders(sel); return; }
      thead.addEventListener('click', function (e) {
        var th = e.target.closest ? e.target.closest('th.is-sortable') : null;
        if (!th || !thead.contains(th)) return;
        var col = th.getAttribute('data-sort-col');
        if (!col || !st.columns[col]) return;
        /* A newly clicked column starts ascending, matching TableHeader.tsx:88-90. */
        st.dir = (col === st.col && st.dir === 'asc') ? 'desc' : 'asc';
        st.col = col;
        st.render();
        paintHeaders(sel);
      });
      st.bound = true;
      paintHeaders(sel);
    },

    /* apply(sel, rows) — sort in place by the table's current column, and return the rows so
       it can be dropped into a chain. A table with no sort chosen yet is left alone. */
    apply: function (sel, rows) {
      var st = state(sel);
      if (!st || !st.col || !rows || !rows.sort) return rows;
      var get = st.columns[st.col];
      if (typeof get !== 'function') return rows;
      var dir = st.dir === 'asc' ? 1 : -1;
      rows.sort(function (a, b) {
        var r = cmp(get(a), get(b));
        return r !== 0 ? r * dir : tiebreak(a, b);
      });
      return rows;
    },

    /* Current state, for a caller that needs to show it elsewhere (the advanced-search
       control reads its own; this is here so nothing has to reach into `tables`). */
    get: function (sel) {
      var st = state(sel);
      return st ? { col: st.col, dir: st.dir } : null;
    },

    /* Set the column without a click — used to keep a header in step with a sort chosen from
       some other control. */
    set: function (sel, col, dir) {
      var st = state(sel);
      if (!st) return;
      st.col = col; st.dir = dir === 'desc' ? 'desc' : 'asc';
      paintHeaders(sel);
    },

    repaint: paintHeaders
  };

  root.DETableSort = api;

})(typeof window !== 'undefined' ? window : this);
