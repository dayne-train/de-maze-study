/* scripts/app/search.js — module split from former scripts/app.js (one IIFE, now dissolved to shared global scope). Advanced search modal + results view, top free-text search, Row-3 toolbar wiring, workspace search banner.
   Load order is fixed in index.html; do not reorder casually. */
  /* ═══════════════════════════════════════════
     ADVANCED SEARCH — modal + dedicated results view
  ═══════════════════════════════════════════ */

  /* Map college full names → institution key (invited fixture stores full name) */
  const COLLEGE_NAME_TO_KEY = Object.keys(COLLEGES).reduce(function(acc, k) {
    acc[COLLEGES[k]] = k; return acc;
  }, {});

  /* Build a unified pool of every application across segments. */
  function buildUnifiedAppPool() {
    var pool = [];
    // With counselor approval off, Needs Review apps live in Waiting (see reviewBucket/
    // waitingBucket) — so Global Search must file them there too, not as 'pending'.
    var _counselorReq = (window.DENetwork ? window.DENetwork.get('counselorApproval') : true) !== false;
    ALL_APPS.forEach(function(a) {
      if (_counselorReq) pool.push(Object.assign({}, a, { status: 'pending', _receivedRaw: a.submitted }));
      else pool.push(Object.assign({}, a, { status: 'waiting', awaitingConsent: false, awaitingInstitution: true, awaitingRegistration: false, _receivedRaw: a.submitted }));
    });
    INVITED_FIXTURE.forEach(function(e) {
      pool.push({
        id: e.id, firstName: e.firstName, lastName: e.lastName,
        school: '',
        group: e.group, term: e.term, course: e.course || '',
        institution: COLLEGE_NAME_TO_KEY[e.college] || '',
        status: 'invited',
        submitted: e.dateInvited, _receivedRaw: e.dateInvited,
      });
    });
    WAITING_APPS.forEach(function(a) {
      pool.push(Object.assign({}, a, { status: 'waiting', _receivedRaw: a.submitted }));
    });
    ALL_ACTIVE_APPS.forEach(function(a) {
      pool.push(Object.assign({}, a, { status: 'active', submitted: a.enrolledDate, _receivedRaw: a.enrolledDate }));
    });
    ALL_DENIED_APPS.forEach(function(a) {
      pool.push(Object.assign({}, a, { status: a.kind === 'cancelled' ? 'cancelled' : 'denied', submitted: a.deniedDate, _receivedRaw: a.deniedDate }));
    });
    return pool;
  }
  /* Fixtures mutate at runtime (new invites from the invite flow); rebuild so
     Global Search doesn't serve a stale pool. */
  let UNIFIED_POOL = buildUnifiedAppPool();
  function refreshUnifiedPool() { UNIFIED_POOL = buildUnifiedAppPool(); }

  /* Parse "May 29, 2026" or "MAY 29, 2026" → Date. */
  function parseAppDate(s) {
    if (!s) return null;
    var d = new Date(s);
    return isNaN(d.getTime()) ? null : d;
  }

  /* Match a single app against the supplied criteria. */
  function matchesAdvCriteria(app, c) {
    function txtMatch(field, query) {
      if (!query) return true;
      return (field || '').toString().toLowerCase().indexOf(query.toLowerCase()) !== -1;
    }
    /* The free-text term runs against the same index the queue's own search uses,
       so a name typed in the workspace finds exactly what typing it in the queue
       would — one search behaviour, two entry points. */
    if (c.term && appHaystack(app).indexOf(c.term.toLowerCase()) === -1) return false;
    if (!txtMatch(app.firstName, c.firstName)) return false;
    if (!txtMatch(app.lastName, c.lastName)) return false;
    if (c.sisId && !(txtMatch(app.sisId, c.sisId) || txtMatch(app.id, c.sisId))) return false;
    if (c.school && app.school !== c.school) return false;
    if (c.grade && String(app.grade) !== c.grade) return false;
    if (c.gpaMin !== '' && c.gpaMin != null && (app.gpa == null || app.gpa < parseFloat(c.gpaMin))) return false;
    if (c.gpaMax !== '' && c.gpaMax != null && (app.gpa == null || app.gpa > parseFloat(c.gpaMax))) return false;
    if (c.institution && app.institution !== c.institution) return false;
    // Group filter searches the structured app.group/app.term fields and the
    // course code/title, so "English" matches the group and
    // "ENGL 101" still matches if a counselor types a course code.
    if (c.group && !txtMatch(app.group, c.group) && !txtMatch(app.term, c.group) && !txtMatch(app.course, c.group)) return false;
    if (c.statuses.size > 0 && !c.statuses.has(app.status)) return false;
    if (c.flags.size > 0) {
      if (app.status !== 'pending') return false; // flags only meaningful for Needs Review
      // MVP: only transcript + consent remain; eligibility flags removed.
      var hit = false;
      c.flags.forEach(function(fk) {
        if (fk === 'transcript' && !app.transcriptAttached) hit = true;
        else if (fk === 'consent' && app.hasAlert) hit = true;
      });
      if (!hit) return false;
    }
    if (c.receivedFrom || c.receivedTo) {
      var d = parseAppDate(app._receivedRaw);
      if (!d) return false;
      if (c.receivedFrom) {
        var f = new Date(c.receivedFrom);
        if (d < f) return false;
      }
      if (c.receivedTo) {
        var t = new Date(c.receivedTo);
        t.setHours(23,59,59,999);
        if (d > t) return false;
      }
    }
    return true;
  }

  /* Are any fields filled in? */
  function advHasCriteria(c) {
    return !!(c.term || c.firstName || c.lastName || c.sisId || c.school || c.grade ||
              c.gpaMin !== '' || c.gpaMax !== '' || c.institution || c.group ||
              c.statuses.size > 0 || c.flags.size > 0 ||
              c.receivedFrom || c.receivedTo);
  }

  /* ─── What Global Search may offer, given the network config ───
     Every option the modal shows should be able to return something AND mean
     something. Three different settings decide that, and they are not
     interchangeable — this is the matrix:

       Option                          Driven by                    This fork
       ------------------------------  ---------------------------  ----------------
       Name · SIS ID · Grade · GPA ·   nothing (learner/app facts)  always
         Group · Date received
       High school                     multiHs                      multiHs
       Institution                     fork shape                   shown (which college)
       Status "Needs Review"           this org's APPROVAL GATE     counselorApproval
       Status "Invited"                this org's INVITE entry pt   hsInvite
       Status Waiting/Registered/     this org's VISIBILITY        hsView
         Closed (denied · cancelled)
       Flag "Guardian consent pending" guardianConsent gate         all forks
       Flag "Transcript missing"       nothing                      always

     The three status rules are independent. Needs Review is the action queue, so it
     lives or dies with the gate, not with visibility — an org can owe decisions
     without being allowed to browse the record. Invited follows the invite entry
     point for the same reason its tab does: no invites sent means no invites to
     find. Only the remaining buckets are the "wider record" that visibility gates. */
  function searchableStatuses() {
    var N = window.DENetwork;
    if (!N) return null;                               // null = no restriction
    var allowed = [];
    if (N.get('counselorApproval') !== false) allowed.push('pending');
    if (N.canInvite('hs')) allowed.push('invited');
    if (N.canView('hs')) allowed.push('waiting', 'active', 'denied', 'cancelled');
    return allowed;
  }
  function searchablePool() {
    var allowed = searchableStatuses();
    if (!allowed) return UNIFIED_POOL;
    return UNIFIED_POOL.filter(function (app) { return allowed.indexOf(app.status) !== -1; });
  }
  /* Bring the Global Search modal in line with the network config. Every option it
     offers should be able to return something and mean something — a filter for a
     bucket this org can't see, or for a step this network doesn't run, is worse than
     no filter at all. Anything hidden is also cleared, so a criterion selected before
     the config changed can't linger and silently narrow the results. */
  function applySearchConfig() {
    var N = window.DENetwork;

    // Status — only buckets this org can actually reach.
    var allowed = searchableStatuses();
    document.querySelectorAll('#adv-status-group .adv-status-chip').forEach(function (chip) {
      var ok = !allowed || allowed.indexOf(chip.dataset.status) !== -1;
      chip.style.display = ok ? '' : 'none';
      if (!ok) chip.classList.remove('selected');
    });

    // "Guardian consent pending" — there is no such state if the network doesn't
    // require consent. (Independent of visibility: a Needs Review application can be
    // awaiting consent, since consent and high school approval run concurrently.)
    var consentOn = !N || N.get('guardianConsent') !== false;
    var consentBox = document.querySelector('#adv-flag-grid input[data-flag="consent"]');
    if (consentBox) {
      var lab = consentBox.closest('label');
      if (lab) lab.style.display = consentOn ? '' : 'none';
      if (!consentOn) consentBox.checked = false;
    }

    // High school — nothing to filter by when this admin only spans one.
    var schoolSel = document.getElementById('adv-school');
    if (schoolSel && typeof multiHs !== 'undefined') {
      var field = schoolSel.closest('.adv-field');
      if (field) field.style.display = multiHs ? '' : 'none';
      if (!multiHs) schoolSel.value = '';
    }
  }
  window.applySearchConfig = applySearchConfig;

  function runAdvancedSearch(c) {
    if (!advHasCriteria(c)) return [];
    return searchablePool().filter(function(app) { return matchesAdvCriteria(app, c); });
  }

  /* Read the current modal form into a criteria object. */
  function readAdvFormState() {
    var c = emptyAdvCriteria();
    ['firstName','lastName','sisId','school','grade','gpaMin','gpaMax','institution','group','receivedFrom','receivedTo'].forEach(function(k) {
      var el = document.querySelector('[data-adv="' + k + '"]');
      if (el) c[k] = el.value.trim();
    });
    document.querySelectorAll('#adv-status-group .adv-status-chip.selected').forEach(function(chip) {
      c.statuses.add(chip.dataset.status);
    });
    document.querySelectorAll('#adv-flag-grid input[type="checkbox"]:checked').forEach(function(cb) {
      c.flags.add(cb.dataset.flag);
    });
    return c;
  }

  /* Write a criteria object back into the modal form. */
  function writeAdvFormState(c) {
    ['firstName','lastName','sisId','school','grade','gpaMin','gpaMax','institution','group','receivedFrom','receivedTo'].forEach(function(k) {
      var el = document.querySelector('[data-adv="' + k + '"]');
      if (el) el.value = c[k] || '';
    });
    document.querySelectorAll('#adv-status-group .adv-status-chip').forEach(function(chip) {
      chip.classList.toggle('selected', c.statuses.has(chip.dataset.status));
    });
    document.querySelectorAll('#adv-flag-grid input[type="checkbox"]').forEach(function(cb) {
      cb.checked = c.flags.has(cb.dataset.flag);
    });
  }

  /* Footer count states: muted | valid | zero | warn */
  function updateAdvFooterCount() {
    var c = readAdvFormState();
    var countEl = document.getElementById('adv-search-count');
    var submitBtn = document.getElementById('btn-adv-submit');
    countEl.classList.remove('muted','zero','warn');
    if (!advHasCriteria(c)) {
      countEl.textContent = 'Add search criteria to perform a global search.';
      countEl.classList.add('muted');
      submitBtn.disabled = true;
      return;
    }
    var n = runAdvancedSearch(c).length;
    if (n === 0) {
      countEl.textContent = 'This search will produce 0 results. Remove some criteria to broaden the search.';
      countEl.classList.add('zero');
      submitBtn.disabled = true;
    } else if (n > 100) {
      countEl.innerHTML = 'This search will produce <strong>' + n + '</strong> results — narrow your criteria for a focused list.';
      countEl.classList.add('warn');
      submitBtn.disabled = false;
    } else {
      countEl.innerHTML = 'This search will produce <strong>' + n + '</strong> result' + (n === 1 ? '' : 's') + '.';
      submitBtn.disabled = false;
    }
  }

  /* Populate the High school select from real fixtures. */
  (function populateAdvSchoolSelect() {
    var schools = ALL_APPS.reduce(function(acc, a) {
      if (acc.indexOf(a.school) === -1) acc.push(a.school);
      return acc;
    }, []).sort();
    var sel = document.getElementById('adv-school');
    schools.forEach(function(s) {
      var opt = document.createElement('option');
      opt.value = s; opt.textContent = s;
      sel.appendChild(opt);
    });
  })();

  /* Open / close the modal. */
  /* Populate the Group <select> from COLLEGE_GROUPS, deduped across
     institutions. Each option's value + label is "Name — TERM" so the
     existing filter (txtMatch against app.groups / app.course) works
     against the selected string directly. */
  function populateAdvGroupSelect() {
    var sel = document.getElementById('adv-group');
    if (!sel) return;
    var seen = {};
    var options = [];
    Object.keys(COLLEGE_GROUPS).forEach(function(instKey) {
      COLLEGE_GROUPS[instKey].forEach(function(g) {
        var label = g.name;
        if (!seen[label]) {
          seen[label] = true;
          options.push(label);
        }
      });
    });
    options.sort();
    // Keep the "All groups" placeholder, append the rest.
    var current = sel.value;
    sel.innerHTML = '<option value="">All groups</option>' +
      options.map(function(o) {
        return '<option value="' + escapeHtml(o) + '">' + escapeHtml(o) + '</option>';
      }).join('');
    sel.value = current;
  }
  populateAdvGroupSelect();

  function openAdvSearch() {
    writeAdvFormState(advSearch.criteria); // pre-populate when reopening
    document.getElementById('adv-search-overlay').classList.add('open');
    updateAdvFooterCount();
  }
  function closeAdvSearch() {
    document.getElementById('adv-search-overlay').classList.remove('open');
  }
  function resetAdvForm() {
    advSearch.criteria = emptyAdvCriteria();
    writeAdvFormState(advSearch.criteria);
    updateAdvFooterCount();
  }

  /* Friendly labels for filter tags + result rows. */
  const STATUS_LABEL = { pending: 'Needs Review', waiting: 'Waiting', invited: 'Invited', active: 'Registered', denied: 'Denied', cancelled: 'Cancelled' };
  const STATUS_BADGE_CLASS = { pending: 'is-solid is-note', waiting: 'is-solid is-primary', invited: 'is-solid is-primary', active: 'is-solid is-success', denied: 'is-solid is-error', cancelled: '' };
  const FLAG_LABEL = {
    gpa: 'GPA below min', grade: 'Grade level below min',
    prereq: 'Prereq missing', transcript: 'Transcript missing', consent: 'Consent pending',
  };

  function buildFilterTags(c) {
    var tags = [];
    function add(key, label, value, onRemove) {
      tags.push({ key: label, value: value, remove: onRemove });
    }
    if (c.term)        add('term', 'Search', c.term, function() { c.term = ''; });
    if (c.firstName)   add('firstName', 'First name', c.firstName, function() { c.firstName = ''; });
    if (c.lastName)    add('lastName', 'Last name', c.lastName, function() { c.lastName = ''; });
    if (c.sisId)       add('sisId', 'ID', c.sisId, function() { c.sisId = ''; });
    if (c.school)      add('school', 'High school', c.school, function() { c.school = ''; });
    if (c.grade)       add('grade', 'Grade', gradeSuffix(parseInt(c.grade,10)) + ' grade', function() { c.grade = ''; });
    if (c.gpaMin !== '' || c.gpaMax !== '') {
      var lo = c.gpaMin === '' ? '0.0' : parseFloat(c.gpaMin).toFixed(1);
      var hi = c.gpaMax === '' ? '4.0' : parseFloat(c.gpaMax).toFixed(1);
      add('gpa', 'GPA', lo + '–' + hi, function() { c.gpaMin = ''; c.gpaMax = ''; });
    }
    if (c.institution) add('institution', 'Institution', COLLEGES[c.institution] || c.institution, function() { c.institution = ''; });
    if (c.group)       add('group', 'Group', c.group, function() { c.group = ''; });
    if (c.statuses.size > 0) {
      var labels = Array.from(c.statuses).map(function(s) { return STATUS_LABEL[s]; }).join(', ');
      add('statuses', 'Status', labels, function() { c.statuses = new Set(); });
    }
    if (c.flags.size > 0) {
      var fl = Array.from(c.flags).map(function(f) { return FLAG_LABEL[f]; }).join(', ');
      add('flags', 'Flags', fl, function() { c.flags = new Set(); });
    }
    if (c.receivedFrom || c.receivedTo) {
      add('received', 'Received',
          (c.receivedFrom || '…') + ' → ' + (c.receivedTo || '…'),
          function() { c.receivedFrom = ''; c.receivedTo = ''; });
    }
    return tags;
  }

  function renderAdvancedResults() {
    if (!advSearch.active) return;
    advSearch.results = runAdvancedSearch(advSearch.criteria);

    /* Navigate to dedicated results screen */
    showScreen('adv-search');

    // Count
    document.getElementById('adv-results-count').textContent =
      advSearch.results.length + ' Result' + (advSearch.results.length === 1 ? '' : 's');

    // Filter tags
    var tags = buildFilterTags(advSearch.criteria);
    var tagsEl = document.getElementById('adv-results-tags');
    tagsEl.innerHTML = tags.map(function(t, i) {
      return '<div class="filter-tag">' +
        '<span class="filter-tag-key">' + t.key + '</span>' +
        '<span class="filter-tag-value">' + t.value + '</span>' +
        '<button class="filter-tag-x" type="button" data-tag-i="' + i + '" aria-label="Remove ' + t.key + '"><i class="ti ti-x"></i></button>' +
      '</div>';
    }).join('');
    tagsEl.querySelectorAll('.filter-tag-x').forEach(function(btn) {
      btn.addEventListener('click', function() {
        var i = parseInt(btn.dataset.tagI, 10);
        tags[i].remove();
        if (!advHasCriteria(advSearch.criteria)) {
          clearAdvancedSearch();
        } else {
          renderAdvancedResults();
        }
      });
    });

    // Rows
    var tbody = document.getElementById('adv-results-tbody');
    var empty = document.getElementById('adv-results-empty');
    var pagEl = document.getElementById('adv-results-pagination');
    if (advSearch.results.length === 0) {
      tbody.innerHTML = '';
      empty.style.display = '';
      if (pagEl) pagEl.style.display = 'none';
      return;
    }
    empty.style.display = 'none';
    if (pagEl) pagEl.style.display = '';
    var pg = advResultPag.paginate(advSearch.results);
    var rows = '';
    pg.slice.forEach(function(a) {
      var college = COLLEGES[a.institution] || a.institution || '—';
      var status = a.status;
      var statusLabel = (status === 'waiting' && typeof waitingSubText === 'function') ? waitingSubText(a)
                      : ((status === 'denied' || status === 'cancelled') && typeof closedSubText === 'function') ? closedSubText(a)
                      : STATUS_LABEL[status];
      var badgeCls = STATUS_BADGE_CLASS[status];
      var schoolBit = (multiHs && a.school) ? ' &nbsp;·&nbsp; ' + a.school : '';
      // Invited rows have no application ID yet — show name only (matches the Invited tab).
      var subLine = (multiHs && a.school) ? a.school : '';
      // Advanced search mixes statuses — show only a single "View" action per row
      var actionBtn = '';
      rows += '<tr data-id="' + a.id + '">';
      rows += nameCells(a);
      rows += '<td class="col-appid">' + (a.status === 'invited' ? '—' : a.id) + '</td>';
      rows += '<td style="font-size:13px;">' + college + '</td>';
      rows += '<td class="col-hs" style="font-size:13px;">' + (a.school || '—') + '</td>';
      rows += '<td style="font-size:13px;">' + groupCellHTML(a) + '</td>';
      rows += '<td style="font-size:12px;color:var(--c-text-muted);">' + (a.submitted || '—') + '</td>';
      rows += '<td class="col-status-badge"><span class="tasty-status-tag is-sm ' + badgeCls + '">' + statusLabel + '</span></td>';
      rows += '<td class="col-actions"><div class="row-actions">' + viewAppBtn(a.id) + actionBtn + '</div></td>';
      rows += '</tr>';
    });
    tbody.innerHTML = rows;
    advResultPag.renderControls(pg.total, pg.pages, pg.start, pg.end);
  }

  function clearAdvancedSearch() {
    advSearch.active = false;
    advSearch.criteria = emptyAdvCriteria();
    advResultPag.page = 1;
    advSearch.results = [];
    showScreen('dashboard');
  }

  function submitAdvancedSearch() {
    var c = readAdvFormState();
    if (!advHasCriteria(c)) return;
    advSearch.criteria = c;
    advSearch.active = true;
    advResultPag.page = 1;
    closeAdvSearch();
    renderAdvancedResults();
  }

  /* ─── Search input (top-of-page free-text search across segments) ─── */
  function triggerSearch() {
    searchTerm = document.getElementById('search-input').value.trim();
    /* Reset all paginators to page 1 when search changes */
    queuePag.page = 1;
    activePag.page = 1;
    deniedPag.page = 1;
    renderTable();
    renderWaitingTable();
    renderActiveTable();
    renderDeniedTable();
    jumpToFirstMatchingSegment();
  }

  /* Searching inside the applications view narrows the buckets you are already looking at,
     so the tabs carry the answer: their counts become match counts, and we land on the first
     bucket that actually has one. Without the jump the admin searches a name, watches the tab
     they happen to be on go empty, and concludes there are no matches while the tab beside it
     reads 3. Stays put when the current bucket already has matches — moving someone off a
     result they can already see is its own kind of wrong. */
  function jumpToFirstMatchingSegment() {
    if (!searchTerm) return;
    var counts = (typeof segCountsNow === 'function') ? segCountsNow() : null;
    if (!counts) return;
    var current = ((document.querySelector('.seg-panel.active') || {}).id || '').replace(/^seg-panel-/, '');
    if (counts[current] > 0) return;
    var order = ['needs-review', 'waiting', 'active', 'denied'];
    for (var i = 0; i < order.length; i++) {
      if (counts[order[i]] > 0) { switchSegment(order[i]); return; }
    }
  }

  /* Apply a term programmatically — same effect as typing it and pressing Search, but
     without requiring a field to read from. Exposed because a caller outside this module
     may need to restore a search that a page load destroyed (the Maze study build turns
     every screen into its own page), and reaching into `searchTerm` from outside would be
     reaching into an implementation detail. */
  window.applySearchTerm = function (term) {
    var el = document.getElementById('search-input');
    if (el) el.value = term || '';
    triggerSearch();
  };

  /* Run a GLOBAL search for a term and show its results — what the workspace box does,
     available to a caller that has the term but not the box. The study build needs it: a
     screen there is its own page, so arriving at Global Search means rebuilding the search
     that produced it rather than inheriting it from memory. */
  window.applyGlobalSearchTerm = function (term) {
    if (!term) return;
    advSearch.criteria = emptyAdvCriteria();
    advSearch.criteria.term = term;
    advSearch.active = true;
    advResultPag.page = 1;
    renderAdvancedResults();
  };

  document.getElementById('search-btn').addEventListener('click', triggerSearch);
  document.getElementById('search-input').addEventListener('keydown', function(e) {
    if (e.key === 'Enter') triggerSearch();
  });

  /* ─── Row 3 toolbar: SortTag dropdown + FilterTag quick-filter chips ─── */
  (function wireQuickFilters() {
    var sortWrap    = document.getElementById('de-sort');
    var sortTrigger = document.getElementById('de-sort-trigger');
    var sortMenu    = document.getElementById('de-sort-menu');
    var sortLabel   = document.getElementById('de-sort-label');
    if (sortWrap && sortTrigger && sortMenu) {
      var closeSort = function() {
        sortWrap.classList.remove('is-open');
        sortMenu.hidden = true;
        sortTrigger.setAttribute('aria-expanded', 'false');
      };
      var openSort = function() {
        sortWrap.classList.add('is-open');
        sortMenu.hidden = false;
        sortTrigger.setAttribute('aria-expanded', 'true');
      };
      sortTrigger.addEventListener('click', function(e) {
        e.stopPropagation();
        if (sortMenu.hidden) openSort(); else closeSort();
      });
      sortMenu.querySelectorAll('.de-sort-opt').forEach(function(opt) {
        opt.addEventListener('click', function() {
          deSortKey = opt.dataset.sort;
          if (sortLabel) sortLabel.textContent = opt.textContent;
          sortMenu.querySelectorAll('.de-sort-opt').forEach(function(o) {
            o.classList.toggle('is-selected', o === opt);
          });
          closeSort();
          queuePag.page = 1;
          rerenderActiveSegment();
        });
      });
      document.addEventListener('click', function(e) {
        if (!sortWrap.contains(e.target)) closeSort();
      });
      document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') closeSort();
      });
    }

    document.querySelectorAll('.de-filter').forEach(function(wrap) {
      var trigger = wrap.querySelector('.de-filter-trigger');
      var menu    = wrap.querySelector('.de-filter-menu');
      var valueEl = wrap.querySelector('.de-filter-value');
      var key     = wrap.dataset.filter;
      if (!trigger || !menu) return;
      var closeF = function() {
        wrap.classList.remove('is-open');
        menu.hidden = true;
        trigger.setAttribute('aria-expanded', 'false');
      };
      var openF = function() {
        wrap.classList.add('is-open');
        menu.hidden = false;
        trigger.setAttribute('aria-expanded', 'true');
      };
      trigger.addEventListener('click', function(e) {
        e.stopPropagation();
        if (menu.hidden) openF(); else closeF();
      });
      menu.querySelectorAll('.de-filter-opt').forEach(function(opt) {
        opt.addEventListener('click', function() {
          deQuickFilters[key] = opt.dataset.value;
          if (valueEl) valueEl.textContent = opt.textContent;
          wrap.classList.toggle('is-set', !!opt.dataset.value);
          menu.querySelectorAll('.de-filter-opt').forEach(function(o) {
            o.classList.toggle('is-selected', o === opt);
          });
          closeF();
          queuePag.page = 1;
          rerenderActiveSegment();
        });
      });
      document.addEventListener('click', function(e) {
        if (!wrap.contains(e.target)) closeF();
      });
      document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') closeF();
      });
    });
  })();

  /* ─── Export (DE queue + Global Search) — real CSV of the visible rows ─── */
  function deCsvEscape(v) {
    v = (v == null ? '' : String(v));
    return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v;
  }
  /* Status text that matches the table's tag: the shared detailStatusLabel() resolves the
     waiting/closed sub-status; the segment key maps to the row's lifecycle status. */
  function deStatusText(a, segKey) {
    var status = segKey === 'needs-review' ? 'pending'
               : segKey === 'active'       ? 'active'
               : segKey === 'denied'       ? (a.kind === 'cancelled' ? 'cancelled' : 'denied')
               : segKey === 'waiting'      ? 'waiting'
               : (a.status || '');           // Global Search rows carry their own status
    return (typeof detailStatusLabel === 'function') ? detailStatusLabel(a, status) : status;
  }
  function deRowDate(a) { return a.submitted || a.dateInvited || a.enrolledDate || a.deniedDate || ''; }
  function deRowsToCSV(rows, statusFn) {
    var header = ['Last Name', 'First Name', 'Application ID', 'Institution', 'High School', 'Group', 'Course', 'Date', 'Status'];
    var lines = [header.map(deCsvEscape).join(',')];
    rows.forEach(function(a) {
      var college = (typeof COLLEGES !== 'undefined' && (COLLEGES[a.institution] || a.institution)) || a.institution || '';
      lines.push([
        a.lastName, a.firstName, (a.status === 'invited' ? '' : a.id), college, a.school, a.group,
        (a.course || ''), deRowDate(a), statusFn(a)
      ].map(deCsvEscape).join(','));
    });
    return lines.join('\n');
  }
  function deDownloadCSV(csv, filename) {
    /* STUDY BUILD: no real download. A browser download prompt mid-task pulls the
       participant out of the single tab the Maze session depends on. The export
       affordance still works and still registers as a click. */
    void csv; void filename;
    showToast('Export ready — download disabled in this preview', 'success');
  }
  /* Which segment tab is showing, and the rows it currently displays (segment + search,
     mirroring the per-segment render filters exactly). */
  function deActiveSegment() {
    var seg = document.querySelector('#screen-de .tasty-navtoggle__item.is-active');
    var oc  = seg && seg.getAttribute('onclick');
    return (oc && (oc.match(/switchSegment\('([^']+)'\)/) || [])[1]) || 'needs-review';
  }
  function deSegmentRows(segKey) {
    var t = (searchTerm || '').toLowerCase();
    var rows;
    if (segKey === 'needs-review') {
      rows = reviewBucket().filter(function(a) {
        if (t && appHaystack(a).indexOf(t) === -1) return false;
        return (typeof passesQuickFilters !== 'function') || passesQuickFilters(a);
      });
      if (typeof sortAppList === 'function') sortAppList(rows);
    } else {
      var base = segKey === 'waiting' ? waitingBucket() : segKey === 'active' ? ALL_ACTIVE_APPS : ALL_DENIED_APPS;
      rows = base.filter(function(a) { return !t || appHaystack(a).indexOf(t) !== -1; });
    }
    return rows;
  }
  var SEG_FILE_LABEL = { 'needs-review': 'needs-review', 'waiting': 'waiting', 'active': 'registered', 'denied': 'closed' };

  /* Export item in the Applications header kebab -> the current segment's displayed rows. */
  var deExportBtn = document.getElementById('de-export-btn');
  if (deExportBtn) deExportBtn.addEventListener('click', function() {
    var seg = deActiveSegment();
    var rows = deSegmentRows(seg);
    if (!rows.length) { showToast('No applications to export in this view.', 'warning'); return; }
    var csv = deRowsToCSV(rows, function(a) { return deStatusText(a, seg); });
    deDownloadCSV(csv, 'dual-enrollment-' + (SEG_FILE_LABEL[seg] || seg) + '.csv');
    showToast('Exported ' + rows.length + ' application' + (rows.length === 1 ? '' : 's') + ' to CSV.', 'success');
  });

  /* Export item in the Global Search results kebab -> the full current result set. */
  var advExportBtn = document.getElementById('adv-export-btn');
  if (advExportBtn) advExportBtn.addEventListener('click', function() {
    var rows = (typeof advSearch !== 'undefined' && advSearch.results) ? advSearch.results : [];
    if (!rows.length) { showToast('No results to export.', 'warning'); return; }
    var csv = deRowsToCSV(rows, function(a) { return deStatusText(a, null); });
    deDownloadCSV(csv, 'dual-enrollment-search-results.csv');
    showToast('Exported ' + rows.length + ' result' + (rows.length === 1 ? '' : 's') + ' to CSV.', 'success');
  });

  /* ─── Wire advanced search modal ─── */
  document.getElementById('adv-search-close').addEventListener('click', closeAdvSearch);
  document.getElementById('adv-search-overlay').addEventListener('click', function(e) {
    if (e.target.id === 'adv-search-overlay') closeAdvSearch();
  });
  document.getElementById('btn-adv-reset').addEventListener('click', resetAdvForm);
  document.getElementById('btn-adv-submit').addEventListener('click', submitAdvancedSearch);
  document.getElementById('adv-results-clear').addEventListener('click', clearAdvancedSearch);
  /* Adjust Search — reopen the form modal from results screen */
  var adjBtn = document.getElementById('btn-adjust-search');
  if (adjBtn) adjBtn.addEventListener('click', openAdvSearch);
  /* BACK on results screen (step 1 of Global Search) — return to Workspace */
  var backScreenBtn = document.getElementById('adv-back-screen-btn');
  if (backScreenBtn) backScreenBtn.addEventListener('click', clearAdvancedSearch);
  /* Cancel button (footer) closes modal, stays on current screen */
  var advCancelBtn = document.getElementById('btn-adv-cancel');
  if (advCancelBtn) advCancelBtn.addEventListener('click', closeAdvSearch);

  /* ─── Workspace search banner wiring ─── */
  var wsInput = document.getElementById('ws-search-input');
  var wsBtn   = document.getElementById('ws-search-btn');
  var wsAdv   = document.getElementById('ws-adv-btn');

  /* The workspace search box is GLOBAL search: it looks across every application in the
     workspace, whatever bucket they sit in, and lands on the Global Search Results screen
     with the term as a removable criterion. That is a different job from the search inside
     the applications view, which narrows the buckets you are already looking at.

     It used to apply the term to the queue's own filter and stay on the workspace, which
     read as a dead button, and then briefly took you to the queue instead — the right idea
     aimed at the wrong screen. */
  function doWorkspaceSearch() {
    var term = wsInput ? wsInput.value.trim() : '';
    if (!term) return;
    advSearch.criteria = emptyAdvCriteria();
    advSearch.criteria.term = term;
    advSearch.active = true;
    advResultPag.page = 1;
    renderAdvancedResults();          // renders the results AND shows the screen
  }

  if (wsBtn)   wsBtn.addEventListener('click', doWorkspaceSearch);
  if (wsInput) wsInput.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') doWorkspaceSearch();
  });
  /* Advanced search from workspace: open modal — submit will navigate to DE */
  if (wsAdv) wsAdv.addEventListener('click', openAdvSearch);
  /* Advanced search from DE tab search — same trigger, same spot as Workspace */
  var deAdv = document.getElementById('de-adv-btn');
  if (deAdv) deAdv.addEventListener('click', openAdvSearch);

  // Status chips — multi-select toggle
  document.getElementById('adv-status-group').addEventListener('click', function(e) {
    var chip = e.target.closest('.adv-status-chip');
    if (!chip) return;
    chip.classList.toggle('selected');
    updateAdvFooterCount();
  });

  // Debounced live count on any input change inside the modal
  var advDebounce = null;
  document.querySelector('.adv-search-body').addEventListener('input', function() {
    clearTimeout(advDebounce);
    advDebounce = setTimeout(updateAdvFooterCount, 150);
  });
  document.querySelector('.adv-search-body').addEventListener('change', function() {
    clearTimeout(advDebounce);
    advDebounce = setTimeout(updateAdvFooterCount, 150);
  });

  // Escape closes the modal
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape' && document.getElementById('adv-search-overlay').classList.contains('open')) {
      closeAdvSearch();
    }
  });
