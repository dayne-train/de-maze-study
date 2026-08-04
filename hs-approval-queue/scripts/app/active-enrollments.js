/* scripts/app/active-enrollments.js — "Grades" concept (formerly "Active Enrollments" — renamed
   in user-facing text only; internal ids/functions/files stay active-enrollments/ae-* on purpose,
   see project memory), dev-drawer-gated (default OFF).
   Two A/B variants, toggled via setActiveEnrollmentsVariant (mirrors workflow-config-studio's
   setVariant): "table" (flat .tasty-table, one row per course) and "split" (Tasty Split View —
   student-summary rows with a derived On Track/Off Track status + a persistent right-side
   detail panel, per the Figma Split View template). Both variants have 3 buckets: In Progress
   (Canvas-gated — Quottly only reports at midterm, so only courses taught through the HE
   institution's own Canvas integration have real live data), Completed, Withdrawn.
   Scoped to its own #screen-active-enrollments + own state — never touches the Applications
   queue's selectedIds/switchSegment (crossing those wires bit the Invited-tab build).
   Load order is fixed in index.html; do not reorder casually. */

var aeVariant = 'table'; // 'table' | 'split'

/* ─── Variant A (flat table) state ─── */
var selectedGradeIds = new Set();
var aeCurrentTerm = 'SUMMER 2026'; // matches the default-active "In Progress" segment below
var aeCourseFilter = ''; // '' = All Courses
var aeSearchTerm = ''; // own scoped state — never touches the Applications queue's searchTerm
var aOpenPanelCourseId = null; // variant A on-demand side panel — which course it's showing, if open

/* ─── Variant B (Split View) state — deliberately separate from variant A's, since only one
   variant is visible at a time and independent state avoids cross-variant interference. ─── */
var bCurrentTerm = 'SUMMER 2026';
var bCourseFilter = '';
var bSearchTerm = '';
var bSelectedGradeIds = new Set(); // holds sisIds (student-level selection), not course ids
var bSelectedStudentSisId = null;

/* ─── Variant C (Grade Report) state — a purpose-built, non-Tasty exploration: transcript-style
   student cards + a term summary band, optimized for the HS registrar's real job (pull a term's
   grades → import to their SIS). Its own state, independent of A/B. ─── */
var cCurrentTerm = 'SPRING 2026'; // completed-rich by default so the report reads full on open
var cSegment = 'completed';
var cSelected = new Set(); // sisIds selected within the current term (export targets)

/* Fixed demo anchor, NOT new Date() — course start/end dates are fixed narrative facts,
   so progress math should read the same whenever this is opened, not drift with real time. */
var AE_TODAY = new Date('2026-07-08T00:00:00');

/* Pagination — one makePaginator() instance per table (shared utility, core.js; same pattern
   as the Applications queue's queuePag/activePag/etc.), so per-page selection sticks per view. */
var aeInProgressPag = makePaginator('ae-inprogress-results-label', 'ae-inprogress-page-buttons', 'ae-inprogress-perpage-select', function () { renderInProgressTable(); });
var aeCompletedPag  = makePaginator('ae-completed-results-label',  'ae-completed-page-buttons',  'ae-completed-perpage-select',  function () { renderCompletedTable(); });
var aeWithdrawnPag  = makePaginator('ae-withdrawn-results-label',  'ae-withdrawn-page-buttons',  'ae-withdrawn-perpage-select',  function () { renderWithdrawnTable(); });
var bInProgressPag  = makePaginator('ae-b-inprogress-results-label', 'ae-b-inprogress-page-buttons', 'ae-b-inprogress-perpage-select', function () { renderInProgressTableB(); });
var bCompletedPag   = makePaginator('ae-b-completed-results-label',  'ae-b-completed-page-buttons',  'ae-b-completed-perpage-select',  function () { renderCompletedTableB(); });
var bWithdrawnPag   = makePaginator('ae-b-withdrawn-results-label',  'ae-b-withdrawn-page-buttons',  'ae-b-withdrawn-perpage-select',  function () { renderWithdrawnTableB(); });

function titleCaseTerm(term) {
  return (term || '').toLowerCase().replace(/\b\w/g, function (c) { return c.toUpperCase(); });
}

/* Search haystack — mirrors appHaystack()'s shape (data-apps.js) but scoped to this
   screen's fields (course + current/final grade instead of group/submitted/etc). */
function aeHaystack(a) {
  return [a.lastName, a.firstName, a.id, a.course, a.grade, a.currentGrade].filter(Boolean).join(' ').toLowerCase();
}

/* In Progress is Canvas-gated: Quottly (the majority case) only reports grades at midterm, so
   there's no real "current grade"/live trajectory between term start and end — those courses
   simply don't appear here until they have something to report (they'll show up once Completed).
   Only courses taught through the HE institution's own Canvas (daily/weekly reporting) have
   real live data. See COURSE_INFO.gradeSource in data-apps.js. */
function aeIsCanvasLive(a) {
  var info = COURSE_INFO[a.course] || {};
  return info.gradeSource === 'canvas';
}

function aeCompletedRows() {
  var t = aeSearchTerm.toLowerCase();
  return ALL_ACTIVE_APPS.filter(function (a) {
    if (a.enrollmentStatus !== 'completed' || a.term !== aeCurrentTerm) return false;
    if (aeCourseFilter && a.course !== aeCourseFilter) return false;
    if (t && aeHaystack(a).indexOf(t) === -1) return false;
    return true;
  });
}
function aeInProgressRows() {
  var t = aeSearchTerm.toLowerCase();
  return ALL_ACTIVE_APPS.filter(function (a) {
    if (a.enrollmentStatus !== 'in-progress' || a.term !== aeCurrentTerm) return false;
    if (aeCourseFilter && a.course !== aeCourseFilter) return false;
    if (!aeIsCanvasLive(a)) return false;
    if (t && aeHaystack(a).indexOf(t) === -1) return false;
    return true;
  });
}
function aeWithdrawnRows() {
  var t = aeSearchTerm.toLowerCase();
  return ALL_ACTIVE_APPS.filter(function (a) {
    if (a.enrollmentStatus !== 'withdrawn' || a.term !== aeCurrentTerm) return false;
    if (aeCourseFilter && a.course !== aeCourseFilter) return false;
    if (t && aeHaystack(a).indexOf(t) === -1) return false;
    return true;
  });
}

function bCompletedRows() {
  var t = bSearchTerm.toLowerCase();
  return ALL_ACTIVE_APPS.filter(function (a) {
    if (a.enrollmentStatus !== 'completed' || a.term !== bCurrentTerm) return false;
    if (bCourseFilter && a.course !== bCourseFilter) return false;
    if (t && aeHaystack(a).indexOf(t) === -1) return false;
    return true;
  });
}
function bInProgressRows() {
  var t = bSearchTerm.toLowerCase();
  return ALL_ACTIVE_APPS.filter(function (a) {
    if (a.enrollmentStatus !== 'in-progress' || a.term !== bCurrentTerm) return false;
    if (bCourseFilter && a.course !== bCourseFilter) return false;
    if (!aeIsCanvasLive(a)) return false;
    if (t && aeHaystack(a).indexOf(t) === -1) return false;
    return true;
  });
}
function bWithdrawnRows() {
  var t = bSearchTerm.toLowerCase();
  return ALL_ACTIVE_APPS.filter(function (a) {
    if (a.enrollmentStatus !== 'withdrawn' || a.term !== bCurrentTerm) return false;
    if (bCourseFilter && a.course !== bCourseFilter) return false;
    if (t && aeHaystack(a).indexOf(t) === -1) return false;
    return true;
  });
}

/* Completed → always done. In Progress → % elapsed of courseStart..courseEnd against AE_TODAY. */
function aeCourseProgress(a) {
  if (a.enrollmentStatus === 'completed') return { pct: 100, label: 'Completed' };
  var start = new Date(a.courseStart + 'T00:00:00');
  var end = new Date(a.courseEnd + 'T00:00:00');
  var totalDays = Math.max(1, Math.round((end - start) / 86400000));
  var elapsedDays = Math.round((AE_TODAY - start) / 86400000);
  var pct = Math.min(100, Math.max(0, Math.round((elapsedDays / totalDays) * 100)));
  var daysLeft = Math.max(0, totalDays - elapsedDays);
  return { pct: pct, label: daysLeft + ' days left' };
}

function aeProgressCellHTML(a) {
  var prog = aeCourseProgress(a);
  return '<div class="ae-time-left">' +
    '<span class="ae-time-left-label">' + prog.label + '</span>' +
    '<div class="tasty-progress is-sm"><div class="tasty-progress__fill" style="width:' + prog.pct + '%"></div></div>' +
  '</div>';
}

/* One button, two behaviors resolved by ancestry (see the delegated handler in the IIFE below):
   inside variant A (#ae-variant-table) it opens the on-demand side panel; inside variant B's
   persistent panel it opens the course-info modal. Kept as one function so both surfaces stay
   in sync. */
function aeViewInfoBtnHTML(a) {
  return '<button type="button" class="tasty-btn is-bold is-ghost is-xs ae-view-info-btn" data-id="' + a.id + '">View</button>';
}
function aeDropCourseBtnHTML(a) {
  return '<button type="button" class="tasty-btn is-bold is-ghost is-xs ae-drop-course-btn" onclick="event.stopPropagation(); openDropCourseModal(\'' + a.id + '\')">Drop Course</button>';
}

function aeFormatDate(iso) {
  var d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

/* "View Info" modal — mirrors the transcript modal's shell (nav.js, openTranscriptModal):
   same .tasty-modal* structure, own #course-info-mount, and reuses the transcript modal's
   existing .transcript-student-grid/.tr-key/.tr-val/.transcript-section-title CSS (already
   loaded on this page) instead of inventing a new info-grid layout. */
function openCourseInfoModal(courseId) {
  var a = ALL_ACTIVE_APPS.find(function (x) { return x.id === courseId; });
  if (!a) return;
  var info = COURSE_INFO[a.course] || {};
  var start = a.courseStart || SPRING_TERM_RANGE.start;
  var end = a.courseEnd || SPRING_TERM_RANGE.end;
  var html = '<div class="tasty-modal-overlay open" id="course-info-overlay">' +
    '<div class="tasty-modal">' +
      '<div class="tasty-modal__head">' +
        '<span class="tasty-modal__title">' + escapeHtml(a.course) + '</span>' +
        '<button class="tasty-modal__x" id="course-info-close" aria-label="Close"><i class="ti ti-x"></i></button>' +
      '</div>' +
      '<div class="tasty-modal__body">' +
        '<div class="transcript-student-grid">' +
          '<div><p class="tr-key">Term</p><p class="tr-val">' + titleCaseTerm(a.term) + '</p></div>' +
          '<div><p class="tr-key">Institution</p><p class="tr-val">' + (COLLEGES[a.institution] || a.institution) + '</p></div>' +
          '<div><p class="tr-key">Room</p><p class="tr-val">' + (info.room || '—') + '</p></div>' +
          '<div><p class="tr-key">Teacher</p><p class="tr-val">' + (info.teacher || '—') + '</p></div>' +
          '<div><p class="tr-key">Start Date</p><p class="tr-val">' + aeFormatDate(start) + '</p></div>' +
          '<div><p class="tr-key">End Date</p><p class="tr-val">' + aeFormatDate(end) + '</p></div>' +
        '</div>' +
        '<p class="transcript-section-title">Description</p>' +
        '<p>' + escapeHtml(info.description || 'No description available.') + '</p>' +
      '</div>' +
    '</div>' +
  '</div>';
  var mount = document.getElementById('course-info-mount');
  mount.innerHTML = html;
  function closeCourseInfoModal() { mount.innerHTML = ''; }
  document.getElementById('course-info-close').addEventListener('click', closeCourseInfoModal);
  document.getElementById('course-info-overlay').addEventListener('click', function (e) {
    if (e.target.id === 'course-info-overlay') closeCourseInfoModal();
  });
}
window.openCourseInfoModal = openCourseInfoModal;

/* Variant A's on-demand side panel — same course detail the modal showed, rendered into the
   collapsible right column instead of a modal overlay. Opened by "View" on any variant A row. */
function renderAPanel(courseId) {
  var content = document.getElementById('ae-a-split-panel-content');
  if (!content) return;
  var a = ALL_ACTIVE_APPS.find(function (x) { return x.id === courseId; });
  if (!a) return;
  var info = COURSE_INFO[a.course] || {};
  var grade = a.enrollmentStatus === 'completed' ? a.grade
            : a.enrollmentStatus === 'withdrawn' ? 'Withdrawn'
            : (a.currentGrade || '—');
  var start = a.courseStart || SPRING_TERM_RANGE.start;
  var end = a.courseEnd || SPRING_TERM_RANGE.end;
  var metaRows =
    '<div class="ae-panel-meta-row"><span class="ae-panel-meta-key">Room</span><span class="ae-panel-meta-val">' + escapeHtml(info.room || '—') + '</span></div>' +
    '<div class="ae-panel-meta-row"><span class="ae-panel-meta-key">Teacher</span><span class="ae-panel-meta-val">' + escapeHtml(info.teacher || '—') + '</span></div>' +
    '<div class="ae-panel-meta-row"><span class="ae-panel-meta-key">Start</span><span class="ae-panel-meta-val">' + aeFormatDate(start) + '</span></div>' +
    '<div class="ae-panel-meta-row"><span class="ae-panel-meta-key">End</span><span class="ae-panel-meta-val">' + aeFormatDate(end) + '</span></div>';
  // Progress bar only means something mid-term — completed courses are always 100%, so drop it there.
  var progress = a.enrollmentStatus === 'in-progress' ? aeProgressCellHTML(a) : '';
  content.innerHTML =
    '<div class="ae-split-panel-head">' +
      '<div class="ae-split-panel-title">' + escapeHtml(a.firstName + ' ' + a.lastName) + '</div>' +
      '<button type="button" class="tasty-btn is-transparent is-icon ae-panel-close" id="ae-a-panel-close" aria-label="Close panel"><i class="ti ti-x"></i></button>' +
    '</div>' +
    '<div class="ae-split-panel-course">' +
      '<div class="ae-split-panel-course-name">' + escapeHtml(a.course) + '</div>' +
      '<div class="ae-split-panel-course-grade">' + titleCaseTerm(a.term) + ' · ' + escapeHtml(COLLEGES[a.institution] || a.institution) + '</div>' +
      '<div class="ae-panel-grade-chip">Grade: <strong>' + grade + '</strong></div>' +
      progress +
    '</div>' +
    '<div class="ae-panel-meta">' + metaRows + '</div>' +
    '<p class="ae-panel-section-title">Description</p>' +
    '<p class="ae-panel-desc">' + escapeHtml(info.description || 'No description available.') + '</p>';
  var closeBtn = document.getElementById('ae-a-panel-close');
  if (closeBtn) closeBtn.addEventListener('click', closeAPanel);
}
function openAPanel(courseId) {
  aOpenPanelCourseId = courseId;
  renderAPanel(courseId);
  var panel = document.getElementById('ae-a-split-panel');
  var rule = document.getElementById('ae-a-split-rule');
  if (panel) panel.classList.remove('is-collapsed');
  if (rule) rule.classList.remove('is-collapsed');
}
window.openAPanel = openAPanel;
function closeAPanel() {
  aOpenPanelCourseId = null;
  var panel = document.getElementById('ae-a-split-panel');
  var rule = document.getElementById('ae-a-split-rule');
  if (panel) panel.classList.add('is-collapsed');
  if (rule) rule.classList.add('is-collapsed');
}
window.closeAPanel = closeAPanel;

/* "Drop Course" confirmation — mirrors the Deny modal's shell (#deny-modal, confirm.js) but
   without its required-reason-textarea gating: a plain Cancel/Confirm footer is enough here. */
function openDropCourseModal(courseId) {
  var a = ALL_ACTIVE_APPS.find(function (x) { return x.id === courseId; });
  if (!a) return;
  var html = '<div class="tasty-modal-overlay open" id="drop-course-overlay">' +
    '<div class="tasty-modal is-narrow">' +
      '<div class="tasty-modal__head">' +
        '<span class="tasty-modal__title">Drop Course</span>' +
        '<button class="tasty-modal__x" id="drop-course-close" aria-label="Close"><i class="ti ti-x"></i></button>' +
      '</div>' +
      '<div class="tasty-modal__body">' +
        '<p>Drop <strong>' + escapeHtml(a.course) + '</strong> for <strong>' + escapeHtml(a.firstName + ' ' + a.lastName) + '</strong>? This removes them from the course.</p>' +
      '</div>' +
      '<div class="ae-modal-footer">' +
        '<button type="button" class="tasty-btn is-bold is-ghost is-md" id="drop-course-cancel">Cancel</button>' +
        '<button type="button" class="tasty-btn is-bold is-md" id="drop-course-confirm">Drop Course</button>' +
      '</div>' +
    '</div>' +
  '</div>';
  var mount = document.getElementById('drop-course-mount');
  mount.innerHTML = html;
  function closeDropCourseModal() { mount.innerHTML = ''; }
  document.getElementById('drop-course-close').addEventListener('click', closeDropCourseModal);
  document.getElementById('drop-course-cancel').addEventListener('click', closeDropCourseModal);
  document.getElementById('drop-course-overlay').addEventListener('click', function (e) {
    if (e.target.id === 'drop-course-overlay') closeDropCourseModal();
  });
  document.getElementById('drop-course-confirm').addEventListener('click', function () {
    a.enrollmentStatus = 'withdrawn';
    a.withdrawnDate = aeFormatDate(AE_TODAY.toISOString().slice(0, 10));
    closeDropCourseModal();
    renderInProgressTable();
    renderWithdrawnTable();
    renderInProgressTableB();
    renderWithdrawnTableB();
    if (bSelectedStudentSisId) renderSplitPanel(bSelectedStudentSisId); // refresh if the panel is showing this student
    showToast('Course dropped', 'success');
  });
}
window.openDropCourseModal = openDropCourseModal;

/* ─── Grade → GPA — grounded in the real DE policy that a course needs a C or better to count
   for transfer credit (drives "Passed"/credits-earned math), not an arbitrary threshold. ─── */
var AE_GPA_SCALE = { 'A':4.0, 'A-':3.7, 'B+':3.3, 'B':3.0, 'B-':2.7, 'C+':2.3, 'C':2.0, 'C-':1.7, 'D+':1.3, 'D':1.0, 'D-':0.7, 'F':0.0 };

function aeGradeToGPA(grade) {
  return AE_GPA_SCALE.hasOwnProperty(grade) ? AE_GPA_SCALE[grade] : null;
}

/* ─── Grade schemes — not every DE course reports an A–F letter grade. gradeScheme lives on
   COURSE_INFO (like gradeSource): absent = 'letter', plus 'passfail' (Pass/Fail) and 'complete'
   (satisfactory-Completed). One helper resolves the scheme so every surface reads it the same. ─── */
function aeScheme(a) { return (COURSE_INFO[a.course] || {}).gradeScheme || 'letter'; }

/* "Did this course earn credit?" — scheme-aware, so it's honest across letter/pass-fail/complete.
   Replaces the old bare aeGradeToGPA(x) >= 2.0 checks, which treated Pass/Completed as "not passed"
   because they have no GPA point. Letter still needs a C (2.0) or better for transfer credit. */
function aePassed(a) {
  var s = aeScheme(a);
  if (s === 'passfail') return a.grade === 'Pass';
  if (s === 'complete') return a.grade === 'Completed';
  var g = aeGradeToGPA(a.grade);
  return g != null && g >= 2.0;
}

/* Grade cell markup — letter grades stay plain bold text; Pass/Fail and Completed render as a
   canonical .tasty-status-tag pill (green when it earned credit, red when it didn't) so a
   categorical outcome doesn't read like a letter value in the same column. */
function aeGradeMarkup(a) {
  if (aeScheme(a) === 'letter') return '<span style="font-weight:600;">' + escapeHtml(a.grade) + '</span>';
  var tone = aePassed(a) ? 'is-success' : 'is-error';
  return '<span class="tasty-status-tag is-sm is-solid ' + tone + '">' + escapeHtml(a.grade) + '</span>';
}

var AE_SCHEME_LABEL = { letter: 'Letter', passfail: 'Pass/Fail', complete: 'Complete' };

/* Institution cell — a single HS can belong to more than one exchange network (2+ colleges), so
   every grade needs institution attribution. Compact abbr (WVCC/ASU/MESA) in the dense tables,
   full name in the title tooltip and CSV. */
function aeInstCell(a) {
  var full = COLLEGES[a.institution] || a.institution;
  return '<td title="' + escapeHtml(full) + '">' + escapeHtml((a.institution || '').toUpperCase()) + '</td>';
}
/* Student-grain institution (variant B summary rows are one row per student, whose courses can
   span colleges) — one abbr when they're all the same college, else "Multiple" with the list in
   the tooltip. */
function aeStudentInstCell(courses) {
  var set = courses.map(function (c) { return c.institution; }).filter(function (v, i, arr) { return arr.indexOf(v) === i; });
  if (set.length === 1) {
    var full = COLLEGES[set[0]] || set[0];
    return '<td title="' + escapeHtml(full) + '">' + escapeHtml((set[0] || '').toUpperCase()) + '</td>';
  }
  var fulls = set.map(function (k) { return COLLEGES[k] || k; }).join(', ');
  return '<td title="' + escapeHtml(fulls) + '">Multiple</td>';
}

/* Groups an already-filtered, already-ordered row list by student (sisId), preserving
   first-seen order — used for rowspan (variant A) and student-summary rows (variant B). */
function aeGroupRowsByStudent(rows) {
  var groups = {};
  var order = [];
  rows.forEach(function (a) {
    var key = a.sisId;
    if (!groups[key]) { groups[key] = []; order.push(key); }
    groups[key].push(a);
  });
  return order.map(function (key) { return groups[key]; });
}

/* Same visual shape as the shared nameCells() (queue.js) — <td><p class="student-name">...
   — but rowspan-aware, since a multi-course student's name should print once, not per row. */
function aeNameCellsHTML(a, rowspan) {
  var rs = rowspan > 1 ? ' rowspan="' + rowspan + '"' : '';
  return '<td' + rs + '><p class="student-name">' + escapeHtml(a.lastName) + '</p></td>' +
         '<td' + rs + '><p class="student-name">' + escapeHtml(a.firstName) + '</p></td>';
}

/* ═══════════════════════ Variant A — flat table ═══════════════════════ */

function renderInProgressTable() {
  var theadEl = document.getElementById('ae-inprogress-thead');
  if (theadEl) theadEl.innerHTML =
    '<tr><th>Last Name</th><th>First Name</th><th>Course</th><th>Institution</th><th>Current Grade</th><th>Progress</th><th class="col-actions"></th></tr>';

  var tbody     = document.getElementById('ae-inprogress-tbody');
  var tableWrap = document.getElementById('ae-inprogress-table-wrap');
  var empty     = document.getElementById('ae-inprogress-empty');
  var pagWrap   = document.getElementById('ae-inprogress-pagination');
  if (!tbody) return;
  var rows = aeInProgressRows();
  var countEl = document.getElementById('ae-count-inprogress');
  if (countEl) countEl.textContent = rows.length; // term now sits above the tabs, so the badge tracks it
  if (rows.length === 0) {
    tbody.innerHTML = '';
    if (tableWrap) tableWrap.style.display = 'none';
    if (empty) empty.style.display = '';
    if (pagWrap) pagWrap.style.display = 'none';
    return;
  }
  // Paginate whole students (not flat rows) so a multi-course student is never split across two
  // pages — mirrors variant B's group-level pagination.
  var pg = aeInProgressPag.paginate(aeGroupRowsByStudent(rows));
  var html = '';
  pg.slice.forEach(function (courses, groupIdx) {
    courses.forEach(function (a, i) {
      var groupStartCls = i === 0 && groupIdx > 0 ? ' class="ae-row-group-start"' : '';
      html += '<tr data-id="' + a.id + '"' + groupStartCls + '>';
      if (i === 0) html += aeNameCellsHTML(a, courses.length);
      html += '<td>' + escapeHtml(a.course) + '</td>';
      html += aeInstCell(a);
      html += '<td style="font-weight:600;">' + (a.currentGrade || '—') + '</td>';
      html += '<td>' + aeProgressCellHTML(a) + '</td>';
      html += '<td class="col-actions"><div class="row-actions">' + aeViewInfoBtnHTML(a) + ' ' + aeDropCourseBtnHTML(a) + '</div></td>';
      html += '</tr>';
    });
  });
  tbody.innerHTML = html;
  if (tableWrap) tableWrap.style.display = '';
  if (empty) empty.style.display = 'none';
  if (pagWrap) pagWrap.style.display = '';
  aeInProgressPag.renderControls(pg.total, pg.pages, pg.start, pg.end);
}

function renderCompletedTable() {
  var theadEl = document.getElementById('ae-completed-thead');
  if (theadEl) theadEl.innerHTML =
    '<tr><th class="col-check"><input type="checkbox" class="row-checkbox" id="ae-select-all-checkbox" aria-label="Select all completed enrollments" /></th>' +
    '<th>Last Name</th><th>First Name</th><th>Course</th><th>Institution</th><th>Grade</th><th>Credits</th><th>Grade Posted</th><th class="col-actions"></th></tr>';

  var tbody     = document.getElementById('ae-completed-tbody');
  var tableWrap = document.getElementById('ae-completed-table-wrap');
  var empty     = document.getElementById('ae-completed-empty');
  var pagWrap   = document.getElementById('ae-completed-pagination');
  if (!tbody) return;
  var rows = aeCompletedRows();
  var countEl = document.getElementById('ae-count-completed');
  if (countEl) countEl.textContent = rows.length; // term now sits above the tabs, so the badge tracks it
  if (rows.length === 0) {
    tbody.innerHTML = '';
    if (tableWrap) tableWrap.style.display = 'none';
    if (empty) empty.style.display = '';
    if (pagWrap) pagWrap.style.display = 'none';
    updateGradesBulkBar();
    return;
  }
  var pg = aeCompletedPag.paginate(aeGroupRowsByStudent(rows)); // paginate whole students — no split rows
  var html = '';
  pg.slice.forEach(function (courses, groupIdx) {
    courses.forEach(function (a, i) {
      var checked = selectedGradeIds.has(a.id);
      var rowCls = [];
      if (checked) rowCls.push('tasty-table__row', 'is-selected');
      if (i === 0 && groupIdx > 0) rowCls.push('ae-row-group-start');
      html += '<tr data-id="' + a.id + '"' + (rowCls.length ? ' class="' + rowCls.join(' ') + '"' : '') + '>';
      html += '<td class="col-check"><input type="checkbox" class="row-checkbox" data-id="' + a.id + '" ' + (checked ? 'checked' : '') + ' aria-label="Select ' + a.firstName + ' ' + a.lastName + ' — ' + escapeHtml(a.course) + '" /></td>';
      if (i === 0) html += aeNameCellsHTML(a, courses.length);
      html += '<td>' + escapeHtml(a.course) + '</td>';
      html += aeInstCell(a);
      html += '<td>' + aeGradeMarkup(a) + '</td>';
      html += '<td>' + a.credits + '</td>';
      html += '<td style="font-size:12px;color:var(--body-font-weak);">' + a.gradePosted + '</td>';
      html += '<td class="col-actions">' + aeViewInfoBtnHTML(a) + '</td>';
      html += '</tr>';
    });
  });
  tbody.innerHTML = html;
  if (tableWrap) tableWrap.style.display = '';
  if (empty) empty.style.display = 'none';
  if (pagWrap) pagWrap.style.display = '';
  aeCompletedPag.renderControls(pg.total, pg.pages, pg.start, pg.end);
  updateSelectAllGradeCheckbox();
  updateGradesBulkBar();
}

function renderWithdrawnTable() {
  var theadEl = document.getElementById('ae-withdrawn-thead');
  if (theadEl) theadEl.innerHTML = '<tr><th>Last Name</th><th>First Name</th><th>Course</th><th>Institution</th><th>Withdrawn Date</th></tr>';

  var tbody     = document.getElementById('ae-withdrawn-tbody');
  var tableWrap = document.getElementById('ae-withdrawn-table-wrap');
  var empty     = document.getElementById('ae-withdrawn-empty');
  var pagWrap   = document.getElementById('ae-withdrawn-pagination');
  if (!tbody) return;
  var rows = aeWithdrawnRows();
  var countEl = document.getElementById('ae-count-withdrawn');
  if (countEl) countEl.textContent = rows.length;
  if (rows.length === 0) {
    tbody.innerHTML = '';
    if (tableWrap) tableWrap.style.display = 'none';
    if (empty) empty.style.display = '';
    if (pagWrap) pagWrap.style.display = 'none';
    return;
  }
  var pg = aeWithdrawnPag.paginate(aeGroupRowsByStudent(rows)); // paginate whole students — no split rows
  var html = '';
  pg.slice.forEach(function (courses, groupIdx) {
    courses.forEach(function (a, i) {
      var groupStartCls = i === 0 && groupIdx > 0 ? ' class="ae-row-group-start"' : '';
      html += '<tr data-id="' + a.id + '"' + groupStartCls + '>';
      if (i === 0) html += aeNameCellsHTML(a, courses.length);
      html += '<td>' + escapeHtml(a.course) + '</td>';
      html += aeInstCell(a);
      html += '<td style="font-size:12px;color:var(--body-font-weak);">' + (a.withdrawnDate || '—') + '</td>';
      html += '</tr>';
    });
  });
  tbody.innerHTML = html;
  if (tableWrap) tableWrap.style.display = '';
  if (empty) empty.style.display = 'none';
  if (pagWrap) pagWrap.style.display = '';
  aeWithdrawnPag.renderControls(pg.total, pg.pages, pg.start, pg.end);
}

function updateGradesBulkBar() {
  var bar = document.getElementById('grades-bulk-bar');
  if (!bar) return;
  var count = selectedGradeIds.size;
  var total = aeCompletedRows().length;
  var badge = document.getElementById('grades-bulk-count-badge');
  if (badge) badge.textContent = count;
  var label = document.getElementById('grades-bulk-label-text');
  if (label) label.textContent = 'selected';
  var allSelected = count === total && total > 0;
  var saBtn = document.getElementById('grades-bulk-select-all-btn');
  if (saBtn) saBtn.textContent = allSelected ? 'Deselect all' : 'Select all ' + total;
  bar.style.display = count > 0 ? 'flex' : 'none';
}

function updateSelectAllGradeCheckbox() {
  var cb = document.getElementById('ae-select-all-checkbox');
  if (!cb) return;
  var total = aeCompletedRows().length;
  var sel = selectedGradeIds.size;
  cb.checked = sel === total && total > 0;
  cb.indeterminate = sel > 0 && sel < total;
}

/* Scoped to #screen-active-enrollments only — deliberately mirrors switchSegment()'s shape
   (segments.js) but queries within this screen's root, never the whole document, so it can
   never touch the Applications queue's #seg-control/.seg-panel state. */
function switchEnrollmentSegment(key) {
  var root = document.getElementById('ae-variant-table');
  if (!root) return;
  root.querySelectorAll('.seg-panel').forEach(function (p) { p.classList.remove('active'); });
  root.querySelectorAll('.tasty-navtoggle__item').forEach(function (b) { b.classList.remove('is-active'); });
  var panel = document.getElementById('ae-seg-panel-' + key);
  if (panel) panel.classList.add('active');
  root.querySelectorAll('.tasty-navtoggle__item').forEach(function (b) {
    if (b.getAttribute('onclick') && b.getAttribute('onclick').indexOf(key) !== -1) b.classList.add('is-active');
  });
  if (key === 'in-progress') renderInProgressTable();
  if (key === 'completed')   renderCompletedTable();
  if (key === 'withdrawn')   renderWithdrawnTable();
}
window.switchEnrollmentSegment = switchEnrollmentSegment;

/* Term dropdown — In Progress is essentially always "the current term" and Completed is
   essentially always "the past," so quick term-switching isn't a frequent action; a plain
   select fits better here than a prominent pill row. */
function switchEnrollmentTerm(el) {
  var term = el.value;
  if (term === aeCurrentTerm) return;
  aeCurrentTerm = term;
  aeCourseFilter = '';
  populateCourseOptions(term, 'ae-course-select');
  closeAPanel(); // the panel's course may not exist in the new term
  selectedGradeIds.clear(); // selection doesn't carry across a term change
  aeInProgressPag.page = 1; aeCompletedPag.page = 1; aeWithdrawnPag.page = 1;
  renderInProgressTable();
  renderCompletedTable();
  renderWithdrawnTable();
}
window.switchEnrollmentTerm = switchEnrollmentTerm;

/* Course dropdown — narrows whichever segment is showing to one course within the current
   term. "Once we pass a term we don't need to display it forever" applies here too, so this
   is a select, not a persistent FilterTag row. */
function populateCourseOptions(term, selectId) {
  var select = document.getElementById(selectId);
  if (!select) return;
  var courses = ALL_ACTIVE_APPS
    .filter(function (a) { return a.term === term; })
    .map(function (a) { return a.course; })
    .filter(function (c, i, arr) { return arr.indexOf(c) === i; })
    .sort();
  select.innerHTML = '<option value="">All Courses</option>' +
    courses.map(function (c) { return '<option value="' + escapeHtml(c) + '">' + escapeHtml(c) + '</option>'; }).join('');
}

function switchCourseFilter(el) {
  aeCourseFilter = el.value;
  selectedGradeIds.clear();
  aeInProgressPag.page = 1; aeCompletedPag.page = 1; aeWithdrawnPag.page = 1;
  renderInProgressTable();
  renderCompletedTable();
  renderWithdrawnTable();
}
window.switchCourseFilter = switchCourseFilter;

function csvEscape(value) {
  var s = String(value == null ? '' : value);
  if (/[",\n]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
  return s;
}

/* termOverride lets variant B (its own bCurrentTerm) produce a correctly-named file without
   touching variant A's aeCurrentTerm — defaults to aeCurrentTerm so variant A's call site
   below is unchanged. */
function exportGradesCSV(ids, termOverride) {
  var term = termOverride || aeCurrentTerm;
  var rows = ALL_ACTIVE_APPS.filter(function (a) { return ids.indexOf(a.id) !== -1; });
  var header = ['Student ID', 'Last Name', 'First Name', 'Application ID', 'Course', 'Institution', 'Term', 'Grade', 'Grading Basis', 'Credits'];
  var csvRows = [header.join(',')];
  rows.forEach(function (a) {
    var institution = COLLEGES[a.institution] || a.institution;
    csvRows.push([a.sisId, a.lastName, a.firstName, a.id, a.course, institution, titleCaseTerm(a.term), a.grade, AE_SCHEME_LABEL[aeScheme(a)], a.credits].map(csvEscape).join(','));
  });
  /* STUDY BUILD: no real download — see stub-downloads.py. */
  void csvRows; void term;
  showToast('Export ready — download disabled in this preview', 'success');
}

/* Search — mirrors the Applications queue's button/Enter-triggered pattern (search.js
   triggerSearch), not live-as-you-type. */
function aeTriggerSearch() {
  var input = document.getElementById('ae-search-input');
  if (!input) return;
  aeSearchTerm = input.value.trim();
  aeInProgressPag.page = 1; aeCompletedPag.page = 1; aeWithdrawnPag.page = 1;
  renderInProgressTable();
  renderCompletedTable();
  renderWithdrawnTable();
}
window.aeTriggerSearch = aeTriggerSearch;

/* ═══════════════════════ Variant B — Split View ═══════════════════════ */

function renderStudentSummaryTable(opts) {
  var tbody   = document.getElementById(opts.tbodyId);
  var wrap    = document.getElementById(opts.wrapId);
  var empty   = document.getElementById(opts.emptyId);
  var pagWrap = opts.pagWrapId ? document.getElementById(opts.pagWrapId) : null;
  if (!tbody) return;
  var countEl = document.getElementById(opts.countElId);
  var groups = aeGroupRowsByStudent(opts.rows);
  if (countEl) countEl.textContent = groups.length; // term now sits above the tabs, so the badge tracks it (student count, matching this table's grain)
  if (groups.length === 0) {
    tbody.innerHTML = '';
    if (wrap) wrap.style.display = 'none';
    if (empty) empty.style.display = '';
    if (pagWrap) pagWrap.style.display = 'none';
    return;
  }
  var pageGroups = groups;
  if (opts.pag) {
    var pg = opts.pag.paginate(groups);
    pageGroups = pg.slice;
    if (pagWrap) pagWrap.style.display = '';
    opts.pag.renderControls(pg.total, pg.pages, pg.start, pg.end);
  }
  // A single student can hold a mix of passed and not-passed courses, so a lone student-level
  // Passed/Did Not Pass tag would misrepresent them. Instead each row shows honest aggregate
  // counts (courses, credits earned, how many passed) — the per-course detail lives one click in.
  var segment = opts.segment || 'completed';
  var html = '';
  pageGroups.forEach(function (courses) {
    var a = courses[0];
    var rowCls = bSelectedStudentSisId === a.sisId ? ' class="is-selected"' : '';
    html += '<tr data-sisid="' + a.sisId + '"' + rowCls + '>';
    if (opts.showCheckbox) {
      var checked = bSelectedGradeIds.has(a.sisId);
      html += '<td class="col-check"><input type="checkbox" class="row-checkbox" data-sisid="' + a.sisId + '" ' + (checked ? 'checked' : '') + ' aria-label="Select ' + a.firstName + ' ' + a.lastName + '" /></td>';
    }
    html += '<td><p class="student-name">' + escapeHtml(a.lastName) + '</p></td>';
    html += '<td><p class="student-name">' + escapeHtml(a.firstName) + '</p></td>';
    html += aeStudentInstCell(courses);
    html += '<td>' + courses.length + '</td>';
    if (segment === 'completed') {
      var passed = courses.filter(aePassed);
      var creditsEarned = passed.reduce(function (s, c) { return s + (c.credits || 0); }, 0);
      html += '<td>' + creditsEarned + '</td>';
      html += '<td>' + passed.length + ' of ' + courses.length + '</td>';
    } else { // in-progress
      var creditLoad = courses.reduce(function (s, c) { return s + (c.credits || 0); }, 0);
      html += '<td>' + creditLoad + '</td>';
    }
    html += '</tr>';
  });
  tbody.innerHTML = html;
  if (wrap) wrap.style.display = '';
  if (empty) empty.style.display = 'none';
}

function renderInProgressTableB() {
  var theadEl = document.getElementById('ae-b-inprogress-thead');
  if (theadEl) theadEl.innerHTML = '<tr><th>Last Name</th><th>First Name</th><th>Institution</th><th># Courses</th><th>Credits</th></tr>';
  renderStudentSummaryTable({
    tbodyId: 'ae-b-inprogress-tbody', wrapId: 'ae-b-inprogress-table-wrap', emptyId: 'ae-b-inprogress-empty',
    pagWrapId: 'ae-b-inprogress-pagination', pag: bInProgressPag, segment: 'in-progress',
    countElId: 'ae-b-count-inprogress', rows: bInProgressRows(), showCheckbox: false
  });
}

function renderCompletedTableB() {
  var theadEl = document.getElementById('ae-b-completed-thead');
  if (theadEl) theadEl.innerHTML =
    '<tr><th class="col-check"><input type="checkbox" class="row-checkbox" id="ae-b-select-all-checkbox" aria-label="Select all completed students" /></th>' +
    '<th>Last Name</th><th>First Name</th><th>Institution</th><th># Courses</th><th>Credits Earned</th><th>Passed</th></tr>';
  renderStudentSummaryTable({
    tbodyId: 'ae-b-completed-tbody', wrapId: 'ae-b-completed-table-wrap', emptyId: 'ae-b-completed-empty',
    pagWrapId: 'ae-b-completed-pagination', pag: bCompletedPag, segment: 'completed',
    countElId: 'ae-b-count-completed', rows: bCompletedRows(), showCheckbox: true
  });
  updateGradesBulkBarB();
}

function renderWithdrawnTableB() {
  var theadEl = document.getElementById('ae-b-withdrawn-thead');
  if (theadEl) theadEl.innerHTML = '<tr><th>Last Name</th><th>First Name</th><th>Course</th><th>Institution</th><th>Withdrawn Date</th></tr>';

  var tbody     = document.getElementById('ae-b-withdrawn-tbody');
  var tableWrap = document.getElementById('ae-b-withdrawn-table-wrap');
  var empty     = document.getElementById('ae-b-withdrawn-empty');
  var pagWrap   = document.getElementById('ae-b-withdrawn-pagination');
  if (!tbody) return;
  var rows = bWithdrawnRows();
  var countEl = document.getElementById('ae-b-count-withdrawn');
  if (countEl) countEl.textContent = rows.length;
  if (rows.length === 0) {
    tbody.innerHTML = '';
    if (tableWrap) tableWrap.style.display = 'none';
    if (empty) empty.style.display = '';
    if (pagWrap) pagWrap.style.display = 'none';
    return;
  }
  var pg = bWithdrawnPag.paginate(aeGroupRowsByStudent(rows)); // paginate whole students — no split rows
  var html = '';
  pg.slice.forEach(function (courses, groupIdx) {
    courses.forEach(function (a, i) {
      var groupStartCls = i === 0 && groupIdx > 0 ? ' class="ae-row-group-start"' : '';
      html += '<tr data-id="' + a.id + '"' + groupStartCls + '>';
      if (i === 0) html += aeNameCellsHTML(a, courses.length);
      html += '<td>' + escapeHtml(a.course) + '</td>';
      html += aeInstCell(a);
      html += '<td style="font-size:12px;color:var(--body-font-weak);">' + (a.withdrawnDate || '—') + '</td>';
      html += '</tr>';
    });
  });
  tbody.innerHTML = html;
  if (tableWrap) tableWrap.style.display = '';
  if (empty) empty.style.display = 'none';
  if (pagWrap) pagWrap.style.display = '';
  bWithdrawnPag.renderControls(pg.total, pg.pages, pg.start, pg.end);
}

function updateGradesBulkBarB() {
  var bar = document.getElementById('ae-b-grades-bulk-bar');
  if (!bar) return;
  var count = bSelectedGradeIds.size;
  var total = aeGroupRowsByStudent(bCompletedRows()).length;
  var badge = document.getElementById('ae-b-grades-bulk-count-badge');
  if (badge) badge.textContent = count;
  var label = document.getElementById('ae-b-grades-bulk-label-text');
  if (label) label.textContent = 'selected';
  var allSelected = count === total && total > 0;
  var saBtn = document.getElementById('ae-b-grades-bulk-select-all-btn');
  if (saBtn) saBtn.textContent = allSelected ? 'Deselect all' : 'Select all ' + total;
  bar.style.display = count > 0 ? 'flex' : 'none';
}

function switchEnrollmentSegmentB(key) {
  var root = document.getElementById('ae-variant-split');
  if (!root) return;
  root.querySelectorAll('.seg-panel').forEach(function (p) { p.classList.remove('active'); });
  root.querySelectorAll('.tasty-navtoggle__item').forEach(function (b) { b.classList.remove('is-active'); });
  var panel = document.getElementById('ae-b-seg-panel-' + key);
  if (panel) panel.classList.add('active');
  root.querySelectorAll('.tasty-navtoggle__item').forEach(function (b) {
    if (b.getAttribute('onclick') && b.getAttribute('onclick').indexOf(key) !== -1) b.classList.add('is-active');
  });
  if (key === 'in-progress') renderInProgressTableB();
  if (key === 'completed')   renderCompletedTableB();
  if (key === 'withdrawn')   renderWithdrawnTableB();
}
window.switchEnrollmentSegmentB = switchEnrollmentSegmentB;

function switchEnrollmentTermB(el) {
  var term = el.value;
  if (term === bCurrentTerm) return;
  bCurrentTerm = term;
  bCourseFilter = '';
  populateCourseOptions(term, 'ae-b-course-select');
  bSelectedGradeIds.clear();
  bSelectedStudentSisId = null;
  bInProgressPag.page = 1; bCompletedPag.page = 1; bWithdrawnPag.page = 1;
  renderSplitPanel(null);
  renderInProgressTableB();
  renderCompletedTableB();
  renderWithdrawnTableB();
}
window.switchEnrollmentTermB = switchEnrollmentTermB;

function switchCourseFilterB(el) {
  bCourseFilter = el.value;
  bSelectedGradeIds.clear();
  bInProgressPag.page = 1; bCompletedPag.page = 1; bWithdrawnPag.page = 1;
  renderInProgressTableB();
  renderCompletedTableB();
  renderWithdrawnTableB();
}
window.switchCourseFilterB = switchCourseFilterB;

function bTriggerSearch() {
  var input = document.getElementById('ae-b-search-input');
  if (!input) return;
  bSearchTerm = input.value.trim();
  bInProgressPag.page = 1; bCompletedPag.page = 1; bWithdrawnPag.page = 1;
  renderInProgressTableB();
  renderCompletedTableB();
  renderWithdrawnTableB();
}
window.bTriggerSearch = bTriggerSearch;

/* Persistent detail panel — always present, starts empty until a student row is clicked.
   Reuses aeProgressCellHTML for each course exactly as variant A renders it. */
function renderSplitPanel(sisId) {
  var emptyEl   = document.getElementById('ae-split-panel-empty');
  var contentEl = document.getElementById('ae-split-panel-content');
  if (!contentEl) return;
  if (!sisId) {
    if (emptyEl) emptyEl.style.display = '';
    contentEl.style.display = 'none';
    contentEl.innerHTML = '';
    return;
  }
  var courses = ALL_ACTIVE_APPS.filter(function (a) { return a.sisId === sisId; });
  if (courses.length === 0) return;
  var a0 = courses[0];
  var html = '<div class="ae-split-panel-title">' + escapeHtml(a0.firstName + ' ' + a0.lastName) + '</div>';
  courses.forEach(function (a) {
    var grade = a.enrollmentStatus === 'completed' ? a.grade : (a.currentGrade || '—');
    var actions = aeViewInfoBtnHTML(a);
    if (a.enrollmentStatus === 'in-progress') actions += ' ' + aeDropCourseBtnHTML(a);
    html += '<div class="ae-split-panel-course">' +
      '<div class="ae-split-panel-course-name">' + escapeHtml(a.course) + '</div>' +
      '<div class="ae-split-panel-course-grade">' + titleCaseTerm(a.term) + ' · ' + escapeHtml(COLLEGES[a.institution] || a.institution) + ' · Grade: ' + grade + '</div>' +
      (a.enrollmentStatus === 'in-progress' ? aeProgressCellHTML(a) : '') +
      '<div class="ae-split-panel-course-actions">' + actions + '</div>' +
    '</div>';
  });
  contentEl.innerHTML = html;
  if (emptyEl) emptyEl.style.display = 'none';
  contentEl.style.display = '';
}

function selectSplitStudent(sisId) {
  bSelectedStudentSisId = sisId;
  renderSplitPanel(sisId);
  var activePanel = document.querySelector('#ae-variant-split .seg-panel.active');
  if (activePanel && activePanel.id === 'ae-b-seg-panel-in-progress') renderInProgressTableB();
  if (activePanel && activePanel.id === 'ae-b-seg-panel-completed')   renderCompletedTableB();
}
window.selectSplitStudent = selectSplitStudent;

function wireRowSelection(tbodyId) {
  var tbody = document.getElementById(tbodyId);
  if (!tbody) return;
  tbody.addEventListener('click', function (e) {
    if (e.target.closest('.row-checkbox')) return; // toggling the checkbox shouldn't open the panel
    var row = e.target.closest('tr[data-sisid]');
    if (!row) return;
    selectSplitStudent(row.dataset.sisid);
  });
}

/* ═══════════════════════ Variant C — Grade Report (bespoke, not Tasty components) ═══════════════════════ */

function cSetText(id, v) { var el = document.getElementById(id); if (el) el.textContent = v; }

function cRows(status) {
  return ALL_ACTIVE_APPS.filter(function (a) {
    if (a.enrollmentStatus !== status || a.term !== cCurrentTerm) return false;
    if (status === 'in-progress' && !aeIsCanvasLive(a)) return false; // same Canvas gate as A/B
    return true;
  });
}

/* Per-course chip tone — honest at the course grain (each course stands on its own), which is
   exactly why the report avoids a single per-student Passed/Did Not Pass rollup. */
function cChipClass(a) {
  if (a.enrollmentStatus === 'withdrawn') return 'is-withdrawn';
  if (a.enrollmentStatus === 'in-progress') return 'is-prog';
  return aePassed(a) ? 'is-pass' : 'is-fail';
}

function cCardHTML(courses) {
  var a = courses[0];
  var checked = cSelected.has(a.sisId);
  var colleges = courses.map(function (c) { return COLLEGES[c.institution] || c.institution; })
                        .filter(function (v, i, arr) { return arr.indexOf(v) === i; });
  var collegeLabel = colleges.length === 1 ? colleges[0] : colleges.length + ' colleges';
  var chips = courses.map(function (c) {
    var grade = c.enrollmentStatus === 'completed' ? c.grade
              : c.enrollmentStatus === 'withdrawn' ? 'Withdrawn'
              : (c.currentGrade || '—');
    var courseCode = c.course.split(' — ')[0];
    // Per-course institution abbr — a student's courses can span colleges, so attribution belongs on
    // the chip, not just the card sub-line. Full name in the title.
    var inst = '<span class="gradesc-chip-inst" title="' + escapeHtml(COLLEGES[c.institution] || c.institution) + '">' + escapeHtml((c.institution || '').toUpperCase()) + '</span>';
    return '<span class="gradesc-chip ' + cChipClass(c) + '">' + escapeHtml(courseCode) + ' ' + inst + ' · ' + grade + '</span>';
  }).join('');
  var metricsHTML;
  if (cSegment === 'completed') {
    var passed = courses.filter(aePassed);
    var creditsEarned = passed.reduce(function (s, c) { return s + (c.credits || 0); }, 0);
    metricsHTML =
      '<div class="gradesc-metric"><span class="gradesc-metric-num">' + creditsEarned + '</span><span class="gradesc-metric-lbl">cr earned</span></div>' +
      '<div class="gradesc-metric"><span class="gradesc-metric-num">' + passed.length + '/' + courses.length + '</span><span class="gradesc-metric-lbl">passed</span></div>';
  } else if (cSegment === 'in-progress') {
    var load = courses.reduce(function (s, c) { return s + (c.credits || 0); }, 0);
    metricsHTML = '<div class="gradesc-metric"><span class="gradesc-metric-num">' + load + '</span><span class="gradesc-metric-lbl">cr in progress</span></div>';
  } else {
    metricsHTML = '<div class="gradesc-metric"><span class="gradesc-metric-num">' + courses.length + '</span><span class="gradesc-metric-lbl">withdrawn</span></div>';
  }
  var initials = a.initials || ((a.firstName || ' ')[0] + (a.lastName || ' ')[0]);
  return '<div class="gradesc-card' + (checked ? ' is-selected' : '') + '" data-sisid="' + a.sisId + '">' +
    '<label class="gradesc-card-check"><input type="checkbox" class="gradesc-check" data-sisid="' + a.sisId + '" ' + (checked ? 'checked' : '') + ' aria-label="Select ' + escapeHtml(a.firstName + ' ' + a.lastName) + '" /></label>' +
    '<div class="gradesc-card-id">' +
      '<span class="gradesc-avatar">' + escapeHtml(initials) + '</span>' +
      '<div><div class="gradesc-card-name">' + escapeHtml(a.firstName + ' ' + a.lastName) + '</div>' +
      '<div class="gradesc-card-sub">' + escapeHtml(a.school || '') + ' · ' + escapeHtml(collegeLabel) + '</div></div>' +
    '</div>' +
    '<div class="gradesc-card-courses">' + chips + '</div>' +
    '<div class="gradesc-card-metrics">' + metricsHTML + '</div>' +
  '</div>';
}

function updateReportCBulkBar() {
  var bar = document.getElementById('c-bulkbar');
  if (!bar) return;
  cSetText('c-bulk-count', cSelected.size);
  bar.hidden = cSelected.size === 0;
}

function renderReportC() {
  // Summary band always reflects the term's COMPLETED grades — that's the export target, so it
  // shouldn't jump around as you flip between In Progress / Withdrawn segments below.
  var completed = cRows('completed');
  var creditsEarned = completed.reduce(function (s, c) { return s + (aePassed(c) ? (c.credits || 0) : 0); }, 0);
  cSetText('c-stat-students', aeGroupRowsByStudent(completed).length);
  cSetText('c-stat-courses', completed.length);
  cSetText('c-stat-credits', creditsEarned);
  cSetText('c-count-completed', aeGroupRowsByStudent(cRows('completed')).length);
  cSetText('c-count-inprogress', aeGroupRowsByStudent(cRows('in-progress')).length);
  cSetText('c-count-withdrawn', aeGroupRowsByStudent(cRows('withdrawn')).length);
  var segs = document.getElementById('c-segs');
  if (segs) segs.querySelectorAll('.gradesc-seg').forEach(function (b) { b.classList.toggle('is-active', b.dataset.seg === cSegment); });
  var groups = aeGroupRowsByStudent(cRows(cSegment));
  var list = document.getElementById('c-list');
  var empty = document.getElementById('c-empty');
  if (!list) return;
  if (groups.length === 0) {
    list.innerHTML = '';
    list.hidden = true;
    if (empty) empty.hidden = false;
  } else {
    list.innerHTML = groups.map(cCardHTML).join('');
    list.hidden = false;
    if (empty) empty.hidden = true;
  }
  updateReportCBulkBar();
}
window.renderReportC = renderReportC;

function switchReportTerm(el) {
  if (!el.value) { el.value = cCurrentTerm; return; } // ignore disabled archived options
  cCurrentTerm = el.value;
  cSelected.clear();
  renderReportC();
}
window.switchReportTerm = switchReportTerm;

function switchReportSegment(seg) {
  cSegment = (seg === 'in-progress' || seg === 'withdrawn') ? seg : 'completed';
  cSelected.clear(); // selection is scoped to one segment (export pulls completed grades only)
  renderReportC();
}

/* ═══════════════════════ A/B/C variant switch (mirrors workflow-config-studio's setVariant) ═══════════════════════ */
function setActiveEnrollmentsVariant(v) {
  aeVariant = (v === 'split' || v === 'reportc') ? v : 'table';
  closeAPanel(); // variant A's panel shouldn't linger under B/C
  var tableEl  = document.getElementById('ae-variant-table');
  var splitEl  = document.getElementById('ae-variant-split');
  var reportEl = document.getElementById('ae-variant-report');
  if (tableEl)  tableEl.classList.toggle('is-hidden',  aeVariant !== 'table');
  if (splitEl)  splitEl.classList.toggle('is-hidden',  aeVariant !== 'split');
  if (reportEl) reportEl.classList.toggle('is-hidden', aeVariant !== 'reportc');
  if (aeVariant === 'split') {
    renderInProgressTableB();
    renderCompletedTableB();
    renderWithdrawnTableB();
  }
  if (aeVariant === 'reportc') renderReportC();
}
window.setActiveEnrollmentsVariant = setActiveEnrollmentsVariant;

/* "Show In Progress" — presentation-only, independent of the Canvas gating above: lets Dayne
   hide the whole In Progress bucket for PAC-demo pacing without touching the underlying data
   logic. Mirrors the body-class idiom used by show-hs/applyHsScope (core.js). */
function setShowInProgress(on) {
  document.body.classList.toggle('hide-in-progress', !on);
  if (!on) {
    var aPanel = document.getElementById('ae-seg-panel-in-progress');
    if (aPanel && aPanel.classList.contains('active')) switchEnrollmentSegment('completed');
    var bPanel = document.getElementById('ae-b-seg-panel-in-progress');
    if (bPanel && bPanel.classList.contains('active')) switchEnrollmentSegmentB('completed');
  }
}
window.setShowInProgress = setShowInProgress;

function initActiveEnrollments() {
  populateCourseOptions(aeCurrentTerm, 'ae-course-select');
  populateCourseOptions(bCurrentTerm, 'ae-b-course-select');
  renderInProgressTable();
  renderCompletedTable();
  renderWithdrawnTable();
  if (aeVariant === 'split') {
    renderInProgressTableB();
    renderCompletedTableB();
    renderWithdrawnTableB();
  }
}
window.initActiveEnrollments = initActiveEnrollments;

/* The "More options" kebab open/close is handled entirely by the kit (tasty-interactions.js) via
   data-tasty="menu" on the trigger — same as the Applications queue's de-options. No custom wiring:
   the kit toggles the sibling .tasty-menu's .is-open, and .tasty-menu:not(.is-open){display:none}
   does the hiding. (An earlier custom handler toggled the `hidden` attribute instead, which that
   rule ignores — so the menu never showed.) */

/* ─── Event delegation ─── */
(function () {
  var searchBtn = document.getElementById('ae-search-btn');
  if (searchBtn) searchBtn.addEventListener('click', aeTriggerSearch);
  var searchInput = document.getElementById('ae-search-input');
  if (searchInput) {
    searchInput.addEventListener('keydown', function (e) { if (e.key === 'Enter') aeTriggerSearch(); });
  }

  // "View" — resolves by ancestry: variant A opens the on-demand side panel, variant B opens
  // the course-info modal. One delegated listener so both surfaces share aeViewInfoBtnHTML.
  document.addEventListener('click', function (e) {
    var btn = e.target.closest('.ae-view-info-btn');
    if (!btn) return;
    var id = btn.dataset.id;
    if (!id) return;
    if (btn.closest('#ae-variant-table')) openAPanel(id);
    else openCourseInfoModal(id);
  });

  // Delegated from the stable <table> element, not the checkbox itself — #ae-completed-thead
  // gets rewritten via innerHTML on every render, which destroys/recreates #ae-select-all-checkbox
  // each time; a direct listener on that node would silently stop working after the first render.
  var table = document.getElementById('ae-completed-table');
  if (table) {
    table.addEventListener('change', function (e) {
      if (!e.target.classList.contains('row-checkbox')) return;
      if (e.target.id === 'ae-select-all-checkbox') {
        var visible = aeCompletedRows();
        if (e.target.checked) visible.forEach(function (a) { selectedGradeIds.add(a.id); });
        else selectedGradeIds.clear();
        renderCompletedTable();
        return;
      }
      var id = e.target.dataset.id;
      if (!id) return;
      if (e.target.checked) selectedGradeIds.add(id); else selectedGradeIds.delete(id);
      renderCompletedTable();
    });
  }

  var bulkSelectAllBtn = document.getElementById('grades-bulk-select-all-btn');
  if (bulkSelectAllBtn) {
    bulkSelectAllBtn.addEventListener('click', function () {
      var visible = aeCompletedRows();
      var allSelected = selectedGradeIds.size === visible.length && visible.length > 0;
      if (allSelected) selectedGradeIds.clear();
      else visible.forEach(function (a) { selectedGradeIds.add(a.id); });
      renderCompletedTable();
    });
  }

  var exportBtn = document.getElementById('grades-export-btn');
  if (exportBtn) {
    exportBtn.addEventListener('click', function () {
      if (selectedGradeIds.size === 0) return;
      exportGradesCSV([...selectedGradeIds]);
      showToast('Grades exported', 'success');
    });
  }

  var exportAllBtn = document.getElementById('ae-export-all-btn');
  if (exportAllBtn) {
    exportAllBtn.addEventListener('click', function () {
      var rows = aeCompletedRows();
      if (rows.length === 0) return;
      exportGradesCSV(rows.map(function (a) { return a.id; }), aeCurrentTerm);
      showToast('All completed grades exported', 'success');
    });
  }

  /* ─── Variant B wiring ─── */
  var searchBtnB = document.getElementById('ae-b-search-btn');
  if (searchBtnB) searchBtnB.addEventListener('click', bTriggerSearch);
  var searchInputB = document.getElementById('ae-b-search-input');
  if (searchInputB) {
    searchInputB.addEventListener('keydown', function (e) { if (e.key === 'Enter') bTriggerSearch(); });
  }

  wireRowSelection('ae-b-inprogress-tbody');
  wireRowSelection('ae-b-completed-tbody');

  var tableB = document.getElementById('ae-b-completed-table');
  if (tableB) {
    tableB.addEventListener('change', function (e) {
      if (!e.target.classList.contains('row-checkbox')) return;
      if (e.target.id === 'ae-b-select-all-checkbox') {
        var studentGroups = aeGroupRowsByStudent(bCompletedRows());
        if (e.target.checked) studentGroups.forEach(function (courses) { bSelectedGradeIds.add(courses[0].sisId); });
        else bSelectedGradeIds.clear();
        renderCompletedTableB();
        return;
      }
      var sisId = e.target.dataset.sisid;
      if (!sisId) return;
      if (e.target.checked) bSelectedGradeIds.add(sisId); else bSelectedGradeIds.delete(sisId);
      renderCompletedTableB();
    });
  }

  var bulkSelectAllBtnB = document.getElementById('ae-b-grades-bulk-select-all-btn');
  if (bulkSelectAllBtnB) {
    bulkSelectAllBtnB.addEventListener('click', function () {
      var studentGroups = aeGroupRowsByStudent(bCompletedRows());
      var allSelectedS = bSelectedGradeIds.size === studentGroups.length && studentGroups.length > 0;
      if (allSelectedS) bSelectedGradeIds.clear();
      else studentGroups.forEach(function (courses) { bSelectedGradeIds.add(courses[0].sisId); });
      renderCompletedTableB();
    });
  }

  var exportBtnB = document.getElementById('ae-b-grades-export-btn');
  if (exportBtnB) {
    exportBtnB.addEventListener('click', function () {
      if (bSelectedGradeIds.size === 0) return;
      // Resolve selected student sisIds -> ALL their course ids for this term
      // (bulk-select is per-student, but the CSV stays one row per course).
      var ids = ALL_ACTIVE_APPS.filter(function (a) {
        return a.enrollmentStatus === 'completed' && a.term === bCurrentTerm && bSelectedGradeIds.has(a.sisId);
      }).map(function (a) { return a.id; });
      exportGradesCSV(ids, bCurrentTerm);
      showToast('Grades exported', 'success');
    });
  }

  var exportAllBtnB = document.getElementById('ae-b-export-all-btn');
  if (exportAllBtnB) {
    exportAllBtnB.addEventListener('click', function () {
      var rows = bCompletedRows(); // exports all currently-visible completed rows regardless of view mode/selection
      if (rows.length === 0) return;
      exportGradesCSV(rows.map(function (a) { return a.id; }), bCurrentTerm);
      showToast('All completed grades exported', 'success');
    });
  }

  /* ─── Variant C (Grade Report) wiring ─── */
  var cSegs = document.getElementById('c-segs');
  if (cSegs) {
    cSegs.addEventListener('click', function (e) {
      var b = e.target.closest('.gradesc-seg');
      if (b) switchReportSegment(b.dataset.seg);
    });
  }
  var cList = document.getElementById('c-list');
  if (cList) {
    cList.addEventListener('change', function (e) {
      var cb = e.target.closest('.gradesc-check');
      if (!cb) return;
      var sisId = cb.dataset.sisid;
      if (!sisId) return;
      if (cb.checked) cSelected.add(sisId); else cSelected.delete(sisId);
      var card = cb.closest('.gradesc-card');
      if (card) card.classList.toggle('is-selected', cb.checked); // toggle in place, no full re-render
      updateReportCBulkBar();
    });
  }
  var cClear = document.getElementById('c-bulk-clear');
  if (cClear) cClear.addEventListener('click', function () { cSelected.clear(); renderReportC(); });

  var cBulkExport = document.getElementById('c-bulk-export');
  if (cBulkExport) {
    cBulkExport.addEventListener('click', function () {
      if (cSelected.size === 0) return;
      var ids = ALL_ACTIVE_APPS.filter(function (a) {
        return a.enrollmentStatus === 'completed' && a.term === cCurrentTerm && cSelected.has(a.sisId);
      }).map(function (a) { return a.id; });
      if (ids.length === 0) { showToast('Selected students have no completed grades this term', 'info'); return; }
      exportGradesCSV(ids, cCurrentTerm);
      showToast('Grades exported', 'success');
    });
  }
  var cExportTerm = document.getElementById('c-export-term');
  if (cExportTerm) {
    cExportTerm.addEventListener('click', function () {
      var rows = cRows('completed');
      if (rows.length === 0) return;
      exportGradesCSV(rows.map(function (a) { return a.id; }), cCurrentTerm);
      showToast('All completed grades exported', 'success');
    });
  }
})();
