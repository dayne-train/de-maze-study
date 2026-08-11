/* ════════════════════════════════════════════════════════════════════
   app.js — Learner Application prototype
   Screens: Dashboard → DE Tab → Entry → HS Select → College Select →
            AER Form → AER Confirm → Course Registration → Registered
   ════════════════════════════════════════════════════════════════════ */
/* ════════════════════════════════════════════════════════════════════
   TABLE OF CONTENTS — grep a "§N" tag to jump to a section; or grep a
   function name directly (all are unique). Routing brain = §11.
   ─────────────────────────────────────────────────────────────────────
   §1  State & data ......... persona/college/app constants · DEV state · session state
   §2  Tracker model ........ joinTerms · buildEnrollments · getTrackerSteps · getStepMeta · renderFullTracker
   §3  DashboardStatusTracker renderDashboardStatusTracker(item) dispatch · renderDSTInvite (green) · renderDSTStatus (gray) · renderStatusTag · getDSTNextStep · DynamicActionCardSection: getDacsHeader · renderDacsHeader · renderActionCard · renderDynamicActionCardSection
   §4  Dashboard render ...... renderDashboard · renderHsCard · renderCredentialTile · renderHsDeSection · renderDeStatusPill · renderAnotherInstitution
   §5  DE Tab render ......... renderDeTab · instSectionHeader · renderDeInviteBox · renderDeAppBox · deBucket · switchDeTab
   §6  HS / college select ... renderHsSelect · renderCollegeSelect
   §7  Confirm member-box .... renderConfirmMemberBox
   §8  AER confirm ........... renderAerConfirm
   §9  Registered screen ..... renderRegisteredScreen
   §10 Course registration ... renderCourseList · renderCourseDetail · viewCourse · confirmRegistration
   §11 Flow navigation ⇐ ROUTING . startEntry(scenario,origin) · setNoAccountState · startCollegeSite · updateEmailLanding · startCollegeApply · startApplicationFlow · advanceEntryFlow · advanceFromHsSelect · advanceFromCollegeSelect · applyFromCollegeInvite · applyFromCounselorInvite · goToApplication · submitDeApp · selectHs · selectCollege · submitEmailEntry · completeSignIn ⇐ router · routeToApplication · submitConfirmEmail · submitAerForm · togglePw · toggleCheck · toggleCourse · registerCourses
   §12 Dev panel ............. initDevPanel · updateDevAxisButtons · applyDevState
   §13 Dev helpers (fillers) . devFillAccountForm · devFillDeApp · devDrawSignature · devCopyEmail · devInsertEmail · devSetEmail
   §14 showScreen ........... window.showScreen — per-screen re-render hooks
   §15 Signature pad ........ initSigPad · clearSig
   §16 Toast + esc .......... showToast · esc/escapeHtml
   §17 Boot ................. populateDob · DOMContentLoaded
   Entry→login→app routing model + matrix: learner-application.context.md
   ════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  /* ─── §1 · Persona / college / app constants ─── */
  var COLLEGE = { name: 'West Valley Community College', abbr: 'WVCC', email: 'admissions@wvcc.edu', city: 'Scottsdale, AZ', web: 'www.westvalleycc.edu' };
  var APP     = { id: 'DE-2026-0440', term: 'Fall 2026', group: 'Math - Dual Enrollment Fall 2026' };
  /* accent = the MemberBox branded-strip color, kept in sync with this school's accent on the
     dashboard (HIGH_SCHOOLS Pioneer entry = --summer). The DE-tab strip is always this HS's color.
     KIT/DATA-GROWTH ▶ ideally HS and the HIGH_SCHOOLS Pioneer record share one source. */
  var HS      = { name: 'Pioneer High School', city: 'Scottsdale, AZ', accent: '--summer' };

  var ALT_HS = [
    { id: 'pioneer',   name: 'Pioneer High School',    city: 'Scottsdale, AZ', logo: 'assets/pioneer-logo.png' },
    { id: 'appletree', name: 'Apple Tree High School',  city: 'Scottsdale, AZ', logo: 'assets/appletree-logo.png' },
  ];

  var ALT_COLLEGES = [
    { id: 'wvcc', name: 'West Valley Community College', city: 'Phoenix, AZ' },
    { id: 'sjcc', name: 'San José City College',         city: 'San José, CA' },
  ];

  /* Colleges that can invite (multi-college invite + multi-app states).
     terms = the term/subject offers named in invite copy. */
  var INVITE_COLLEGES = [
    { name: 'West Valley Community College', abbr: 'WVCC', city: 'Phoenix, AZ',   terms: ['Engineering - Dual Enrollment Fall 2026', 'Math - Dual Enrollment Fall 2026'] },
    { name: 'Northern Arizona University',   abbr: 'NAU',  city: 'Flagstaff, AZ', terms: ['Fall 2026 Cohort'] },
    { name: 'Grand Canyon University',       abbr: 'GCU',  city: 'Phoenix, AZ',   terms: [] },
  ];

  /* Courses offered by the college, per Figma 13431-194273 (Select A Course) and
     13484-75159 (Course Details). Twelve rows so the table paginates 1–10 of 12
     exactly as designed. MATH1D is the study's canonical pick — it is the course
     on Jessica Cumberland's record in both admin queues. */
  var COURSES = [
    { id:'AVC169',  title:'2D Media Design',                  term:'Fall 2026', start:'AUG 03, 2026', end:'DEC 17, 2026', credits:2, location:'Pioneer High School',           crn:'10201', instructor:'Prof. Dana Whitfield',  modality:'On Campus', meets:'MW 10:00–11:15am', seats:8,  tuition:82.00,  transferrable:true,  units:'2.0 semester units', description:'An introduction to two-dimensional design principles: composition, color, typography and visual hierarchy, worked through studio projects in both analog and digital media.' },
    { id:'AVC177',  title:'Digital Photographic Imaging I',   term:'Fall 2026', start:'SEP 15, 2026', end:'DEC 17, 2026', credits:3, location:'Pioneer High School',           crn:'10214', instructor:'Prof. Ruben Ortega',    modality:'On Campus', meets:'TTh 1:00–2:20pm',  seats:5,  tuition:124.00, transferrable:true,  units:'3.0 semester units', description:'Camera operation, exposure, and digital darkroom technique, with an emphasis on developing a personal visual vocabulary through weekly shooting assignments.' },
    { id:'ENG101',  title:'First-Year Composition',           term:'Fall 2026', start:'AUG 03, 2026', end:'DEC 17, 2026', credits:3, location:'Pioneer High School',           crn:'10228', instructor:'Prof. Alice Marchetti', modality:'On Campus', meets:'MWF 9:00–9:50am',  seats:12, tuition:124.00, transferrable:true,  units:'3.0 semester units', description:'College-level reading and writing: argument, evidence, revision, and research practice across a sequence of essays.' },
    { id:'MATH1D',  title:'Calculus',                         term:'Fall 2026', start:'AUG 03, 2026', end:'DEC 17, 2026', credits:3, location:'West Valley Community College', crn:'10353', instructor:'Prof. Michael Angelone', modality:'On Campus', meets:'TBA',              seats:10, tuition:124.00, transferrable:true,  units:'3.0 semester units', description:'The focus and themes of the Introduction to Calculus course address the most important foundations for applications of mathematics in science, engineering and commerce. The course emphasizes the key ideas and historical motivation for calculus, while at the same time striking a balance between theory and application, leading to a mastery of key threshold concepts in foundational mathematics.' },
    { id:'MAT241',  title:'Calculus With Analytic Geometry III', term:'Fall 2026', start:'AUG 28, 2026', end:'DEC 17, 2026', credits:4, location:'Pioneer High School',        crn:'10361', instructor:'Prof. Helen Brody',    modality:'On Campus', meets:'MWF 11:00–12:10pm', seats:6, tuition:165.00, transferrable:true,  units:'4.0 semester units', description:'Multivariable calculus: vectors, partial derivatives, multiple integrals and vector fields, with applications in physics and engineering.' },
    { id:'MUP181',  title:'Chamber Music Ensembles',          term:'Fall 2026', start:'SEP 15, 2026', end:'DEC 17, 2026', credits:1, location:'West Valley Community College', crn:'10377', instructor:'Prof. Sofia Delacroix', modality:'On Campus', meets:'Th 4:00–5:30pm',  seats:4,  tuition:41.00,  transferrable:false, units:'1.0 semester unit',  description:'Small-ensemble performance for intermediate and advanced instrumentalists, culminating in an end-of-term recital. Audition required.' },
    { id:'MUP131',  title:'Classic Piano I',                  term:'Fall 2026', start:'AUG 07, 2026', end:'DEC 17, 2026', credits:1, location:'West Valley Community College', crn:'10384', instructor:'Prof. Sofia Delacroix', modality:'On Campus', meets:'F 2:00–3:00pm',   seats:9,  tuition:41.00,  transferrable:false, units:'1.0 semester unit',  description:'Foundational keyboard technique, sight-reading and repertoire for students with little or no prior piano experience.' },
    { id:'MAT151',  title:'College Algebra/Functions',        term:'Fall 2026', start:'AUG 28, 2026', end:'DEC 17, 2026', credits:4, location:'Online',                        crn:'10390', instructor:'Prof. Nathan Reyes',   modality:'Online',    meets:'Asynchronous',    seats:22, tuition:165.00, transferrable:true,  units:'4.0 semester units', description:'Functions, graphs, systems of equations and an introduction to modelling, preparing students for pre-calculus and statistics pathways.' },
    { id:'HIS103',  title:'United States History To 1865',    term:'Fall 2026', start:'AUG 07, 2026', end:'DEC 17, 2026', credits:3, location:'Pioneer High School',           crn:'10402', instructor:'Prof. Grace Okonkwo',  modality:'On Campus', meets:'TTh 9:30–10:45am', seats:14, tuition:124.00, transferrable:true,  units:'3.0 semester units', description:'The American past from pre-contact through Reconstruction, with attention to primary sources and competing historical interpretations.' },
    { id:'SPA101',  title:'Elementary Spanish I',             term:'Fall 2026', start:'AUG 10, 2026', end:'DEC 17, 2026', credits:4, location:'Online',                        crn:'10418', instructor:'Prof. Carmen Villalobos', modality:'Online', meets:'Asynchronous',   seats:18, tuition:165.00, transferrable:true,  units:'4.0 semester units', description:'Introductory Spanish: everyday communication, present and past tenses, and cultural context across the Spanish-speaking world.' },
    { id:'BIO156',  title:'Introductory Biology',             term:'Fall 2026', start:'AUG 03, 2026', end:'DEC 17, 2026', credits:4, location:'West Valley Community College', crn:'10425', instructor:'Prof. Amara Osei',     modality:'On Campus', meets:'MW 1:00–3:30pm',  seats:7,  tuition:165.00, transferrable:true,  units:'4.0 semester units', description:'Cell biology, genetics and evolution with a weekly laboratory. Meets the laboratory science requirement for most transfer pathways.' },
    { id:'PSY101',  title:'Introduction to Psychology',       term:'Fall 2026', start:'AUG 10, 2026', end:'DEC 17, 2026', credits:3, location:'Online',                        crn:'10431', instructor:'Prof. Ellis Grant',    modality:'Online',    meets:'Asynchronous',    seats:26, tuition:124.00, transferrable:true,  units:'3.0 semester units', description:'A survey of psychological science: research methods, cognition, development, personality and psychological disorders.' },
  ];

  /* ─── Dev state ─── */
  var DEV = {
    appState:     'parent-consent-pending',
    entryPath:    'college-url',
    inviteSource: 'college',
    hsCount:      'single',
    collegeCount: 'single',
    appMix:       'single',   /* 'single' = one application (the selected state) · 'multi' = a
                                portfolio spanning all three DE-tab buckets, so the NavToggle,
                                its bucket filtering and its count badges are all reachable */
    reapply:      'on',
  };

  /* ─── Session state ─── */
  var registeredCourse = null;   // the single course the learner registered for
  var selectedHsId    = ALT_HS[0].id;
  var selectedCollege = ALT_COLLEGES[0].id;
  // When a COLLEGE invites the learner we already know the institution, so the
  // college-select screen is skipped. Open-enrollment (learner-initiated) leaves this
  // false so a learner whose HS is in 2+ exchanges still picks a college.
  var collegeKnown    = false;
  /* Email-invite journey flag — true only while walking the no-account
     "Invited by your college" path (email-entry → aer → confirm-email →
     select-hs → de-app). Logged-in paths leave this false. */
  var inviteFlow      = false;
  /* Entry origin — 'dashboard' (authenticate → land on the dashboard, apply from there)
     or 'email' (external invite / college website → straight into the application, past
     the dashboard). Read by completeSignIn() to route after sign-in. */
  var entryOrigin     = 'dashboard';

  /* ════════════════════════════════════════
     §2 · TRACKER — step state derivation
     5 steps: 0=Submitted 1=Parent 2=Counselor 3=College 4=Register
  ════════════════════════════════════════ */
  var STEP_LABELS = [
    'Application Submission',
    'Parent/Guardian Consent',
    'High School Approval',
    'Institution Review',
    'Register For Courses',
  ];

  /* ─── Exchange-network approval gates ───
     A network can switch off the guardian-consent, counselor-approval and/or
     institution-review step. Read from the shared DENetwork model (defaults ON if
     the model isn't present). activeSteps() returns the 5-step indices that survive,
     so the tracker and all index-aligned arrays (labels, parties, meta) stay in sync
     as steps drop out.
       idx 0 Application · 1 Parent · 2 Counselor · 3 College · 4 Register
     With all three gates off the learner sees only Submission → Register: the
     "pure registration tool" network in KB §8. */
  function gate(key) {
    return (window.DENetwork ? window.DENetwork.get(key) : true) !== false;
  }
  function guardianOn()  { return gate('guardianConsent'); }
  function counselorOn() { return gate('counselorApproval'); }
  function institutionOn() { return gate('institutionReview'); }
  function activeSteps() {
    var keep = [0];
    if (guardianOn())    keep.push(1);
    if (counselorOn())   keep.push(2);
    if (institutionOn()) keep.push(3);
    keep.push(4);
    return keep;
  }

  /* ─── "Engineering - Dual Enrollment Fall 2026, and Math - Dual Enrollment Fall 2026" ─── */
  function joinTerms(terms) {
    if (!terms || !terms.length) return '';
    if (terms.length === 1) return '<strong>' + esc(terms[0]) + '</strong>';
    var head = terms.slice(0, -1).map(function (t) { return '<strong>' + esc(t) + '</strong>'; }).join(', ');
    return head + ', and <strong>' + esc(terms[terms.length - 1]) + '</strong>';
  }

  /* ─── Build the list of enrollments DEV state should render ───
     Returns an array; single states return a 1-element array so callers
     can always iterate. `kind` = 'discovery' | 'invite' | 'app'. */
  function buildEnrollments() {
    var appState = DEV.appState;
    var multiCollege = DEV.collegeCount === 'multiple';

    /* Multi-application portfolio — the only way to see the DE tab's three buckets at once
       (in progress · Registered · Closed). The first entry still honours the State selector so
       that control keeps working; the rest pin one bucket each, with a SECOND in-progress
       application so at least one bucket holds more than one and the count badges appear.
       Colleges vary so the member boxes are visually distinct. */
    if (DEV.appMix === 'multi') {
      var C = INVITE_COLLEGES;
      var first = (appState === 'open-enrollment') ? { kind: 'discovery', college: C[0] }
                : (appState === 'invited')         ? { kind: 'invite', inviteSource: DEV.inviteSource, college: C[0], terms: C[0].terms }
                : { kind: 'app', appState: appState, inviteSource: DEV.inviteSource, college: C[0], appId: APP.id };
      return [
        first,
        /* Invites and applications coexist — a learner can have an invite they haven't acted on
           while other applications are mid-approval, registered, or closed. */
        { kind: 'invite', inviteSource: 'college', college: C[1], terms: C[1].terms },
        { kind: 'app', appState: 'counselor-pending', inviteSource: DEV.inviteSource, college: C[1], appId: '20263392' },
        { kind: 'app', appState: 'registered',        inviteSource: DEV.inviteSource, college: C[2], appId: '20263408' },
        { kind: 'app', appState: 'denied-college',    inviteSource: DEV.inviteSource, college: C[1], appId: '20263417' }
      ];
    }

    if (appState === 'open-enrollment') {
      return [{ kind: 'discovery', college: COLLEGE }];
    }
    if (appState === 'invited') {
      if (multiCollege) {
        return INVITE_COLLEGES.map(function (c) {
          return { kind: 'invite', inviteSource: 'college', college: c, terms: c.terms };
        });
      }
      return [{
        kind: 'invite',
        inviteSource: DEV.inviteSource,
        college: COLLEGE,
        terms: INVITE_COLLEGES[0].terms,
      }];
    }
    // In-progress / enrolled / closed = real application(s).
    if (multiCollege) {
      return INVITE_COLLEGES.slice(0, 2).map(function (c, i) {
        return {
          kind: 'app',
          appState: i === 0 ? appState : 'parent-consent-pending',
          inviteSource: DEV.inviteSource,
          college: c,
          appId: i === 0 ? APP.id : '20263392',
        };
      });
    }
    return [{ kind: 'app', appState: appState, inviteSource: DEV.inviteSource, college: COLLEGE, appId: APP.id }];
  }

  function getTrackerSteps(appState, inviteSource) {
    /* An invite from the high school says WHO asked the learner to apply. It does not say the
       high school has approved them — nobody has reviewed anything at the point the invitation
       goes out. The approval step is owed whenever its gate is on, whoever opened the door.
       (Same correction the admin queues took: review follows the gate, not the entry point.) */
    var map = {
      'invited':                 ['active', 'pending', 'pending', 'pending', 'pending'],
      'open-enrollment':         ['active', 'pending', 'pending', 'pending', 'pending'],
      'parent-consent-pending':  ['done',   'active',  'active',  'pending', 'pending'],
      'counselor-pending':       ['done',   'done',    'active',               'pending', 'pending'],
      'dual-pending':            ['done',   'active',  'active',               'pending', 'pending'],
      'college-review':          ['done',   'done',    'done',                 'active',  'pending'],
      'approved':                ['done',   'done',    'done',                 'done',    'active'],
      'registered':              ['done',   'done',    'done',                 'done',    'done'],
      'registered-in-session':   ['done',   'done',    'done',                 'done',    'done'],
      'denied-counselor':        ['done',   'done',    'denied',               'pending', 'pending'],
      'denied-college':          ['done',   'done',    'done',                 'denied',  'pending'],
      'cancelled':               ['done',   'done',    'done',    'pending', 'pending'],
    };
    return map[appState] || map['parent-consent-pending'];
  }

  /* Responsible-party name per step (index-aligned). idx0/idx4 = the learner. */
  /* Responsible party per step. Step 2 is the SCHOOL, not a person: the learner never names
     an admin, so showing one would imply a specific approver they didn't choose. */
  var STEP_PARTIES = ['Jessica Cumberland', 'Diana Cumberland', HS.name, COLLEGE.name, 'Jessica Cumberland'];
  /* Stamped when a step completes/decides. Single canonical timestamp matches the Figma frames. */
  var STEP_DONE_TS = 'MAR 20 at 12:20pm PST';

  /* ─── Notification recipients ───
     The parties Parchment emails for a gate. MUTABLE and the single source for both the
     address and the last-sent stamp: Change Email rewrites `email`, Resend Notification
     restamps `sent`, and every surface that prints either (action-card sent line, the
     DashboardStatusTracker sub-line, the active High School Approval step's line 2) reads
     from here — so a resend or an address change can never leave one surface stale.
     `noun` is the generic role used in toast copy ("resent to your parent/guardian"). */
  var NOTIFY = {
    guardian: { name: 'Diana Cumberland', role: 'Parent/Guardian',   noun: 'parent/guardian',
                title: 'Change Parent/Guardian Email', email: 'diana.cumberland@email.com', sent: STEP_DONE_TS },
    /* No named admin, and no address the learner owns: high school approval routes to the
       school's queue automatically (Aug 5, 2026), so the learner sees the SCHOOL. A null
       `email` is what marks a record as unaddressable — it drops the Change Email action and
       the "(address)" suffix wherever a recipient is printed. */
    hsadmin:  { name: HS.name,            role: 'High School',       noun: 'high school',
                title: null,                     email: null,                              sent: STEP_DONE_TS }
  };

  /* "AUG 5 at 3:42pm PST" — same shape as STEP_DONE_TS, off the real clock, so a resend
     visibly restamps the sent line instead of repeating the fixture timestamp. */
  var TS_MONTHS = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
  function nowStamp() {
    var d = new Date();
    var h = d.getHours();
    var h12 = (h % 12) === 0 ? 12 : (h % 12);
    var min = ('0' + d.getMinutes()).slice(-2);
    return TS_MONTHS[d.getMonth()] + ' ' + d.getDate() + ' at ' + h12 + ':' + min + (h < 12 ? 'am' : 'pm') + ' PST';
  }

  function getStepMeta(idx, st) {
    if (st === 'done') {
      // line1 = completion timestamp; line2 = outcome note (College Review only).
      var note = idx === 3 ? 'Accepted for Fall 2026' : '';
      return { line1: STEP_DONE_TS, line2: note };
    }
    if (st === 'denied') {
      // line1 = decision timestamp; line2 = hardcoded denial string (component-owned, not data).
      var denial = idx === 2 ? 'Not Approved' : 'Not Accepted';
      return { line1: STEP_DONE_TS, line2: denial };
    }
    if (st === 'active') {
      // line1 = responsible party; line2 = deadline (Register only). The High School Approval
      // step used to print the admin's email here — gone with the named admin (Aug 5, 2026).
      var line2 = idx === 4 ? 'Register by APR 25' : '';
      return { line1: STEP_PARTIES[idx] || '', line2: line2 };
    }
    // pending — line1 = responsible-party name; line2 empty.
    return { line1: STEP_PARTIES[idx] || '', line2: '' };
  }

  /* ─── Full tracker HTML (.tasty-stepper) ─── */
  function renderFullTracker(appState, inviteSource) {
    var steps = getTrackerSteps(appState, inviteSource);
    var html = '<div class="tasty-stepper">';
    activeSteps().forEach(function (i) {
      var st = steps[i];
      var mod = st === 'active' ? ' is-active' : st === 'done' ? ' is-done' : st === 'denied' ? ' is-denied' : '';
      // Desktop Stepper (Figma 9952:43956): 50px node → 30px glyph; upcoming = a small gray dot
      // (rendered via CSS on the empty node), NOT a number. Glyph was 24px against a
      // 30px node until Aug 6, 2026, when both were corrected to the DS geometry.
      var nodeContent = st === 'done'   ? tastyIcon('check-open', { size: 30 })
                      : st === 'denied' ? tastyIcon('cancel', { size: 30 })
                      : st === 'active' ? tastyIcon('time',   { size: 30 })
                      : '';
      var meta = getStepMeta(i, st);
      html += '<div class="tasty-stepper__step' + mod + '">';
      html += '<div class="tasty-stepper__node">' + nodeContent + '</div>';
      html += '<div class="tasty-stepper__lbl">' + esc(STEP_LABELS[i]) + '</div>';
      if (meta.line1) html += '<div class="tasty-stepper__meta">' + esc(meta.line1) + '</div>';
      if (meta.line2) html += '<div class="tasty-stepper__meta">' + esc(meta.line2) + '</div>';
      html += '</div>';
    });
    html += '</div>';
    return html;
  }

  /* ════════════════════════════════════════
     §3 · DashboardStatusTracker — Tasty Organism (Figma "DashboardStatusTracker"
     9939:10123). Reusable status pill: college logo · "Dual Enrollment" ·
     5-step MiniStatusTracker · next-step text · action button. Driven by
     appState (+ inviteSource so a counselor invite shows that step done).
     Indicators: done = green check · current = pale-gold clock · upcoming = gray
     · denied = red ✕. Connector lines: green only between two done steps, red
     entering a denied step, gray otherwise — matching the Figma frames.
     ════════════════════════════════════════ */
  function renderDashboardStatusTracker(item) {
    if (item.kind === 'invite' || item.kind === 'discovery') return renderDSTInvite(item);
    return renderDSTStatus(item.appState, item.inviteSource);
  }

  /* Green INVITE / OPEN-ENROLLMENT variant (Figma "Invited - College", "Invited -
     Counselor", "Open Enrollment"): status-base-2 pill · logo · title · body ·
     Apply Now (success) + Dismiss. No mini tracker, no "Dual Enrollment" label. */
  function renderDSTInvite(item) {
    var isCounselor = item.kind === 'invite' && item.inviteSource === 'counselor';
    var isDiscovery = item.kind === 'discovery';
    var col = item.college;
    var termFrag = (item.terms && item.terms.length) ? ' for ' + joinTerms(item.terms) : ' for Dual Enrollment';
    var title = isDiscovery ? 'Earn college credit while you’re still in high school.'
                            : 'You’re invited to Dual Enrollment.';
    var body  = isDiscovery
          ? 'Dual enrollment applications are open. Apply whenever you’re ready, no invite needed.'
          : (isCounselor
              ? 'Your high school admin at ' + esc(HS.name) + ' has invited you to apply' + termFrag + '. Start your application to begin earning college credit.'
              : esc(col.name) + ' has invited you to apply' + termFrag + '. Start your application to begin earning college credit.');
    // Apply Now from the dashboard: college → pick HS first; counselor → HS known, skip;
    // open enrollment (discovery) → straight to the application.
    var apply = isDiscovery ? 'goToApplication()'
              : isCounselor ? 'applyFromCounselorInvite()'
              : 'applyFromCollegeInvite()';
    // Logo: college invite → WVCC MemberLogo (xs); counselor / open-enrollment → DE illustration.
    var logo = (isCounselor || isDiscovery)
          ? '<span class="tasty-dst-logo-illus" aria-hidden="true"><span data-tasty-illus="dual-enrollment-fill" data-size="50"></span></span>'
          : '<img class="tasty-member-logo is-xs" src="assets/wvcc-logo.png" alt="">';
    return '<div class="tasty-dashboard-status-tracker is-invite">' +
      '<div class="tasty-dst-content">' +
        logo +
        '<div class="tasty-dst-text">' +
          '<span class="tasty-dst-title">' + esc(title) + '</span>' +
          '<span class="tasty-dst-sub tasty-dst-sub--wrap">' + body + '</span>' +
        '</div>' +
      '</div>' +
      '<div class="tasty-dst-buttons is-row">' +
        '<button type="button" class="tasty-btn is-md is-transparent is-success is-no-border" onclick="' + apply + '">Apply Now</button>' +
        '<button type="button" class="tasty-btn is-md is-transparent is-no-border tasty-dst-dismiss" onclick="dismissInvite(\'' + inviteKey(item) + '\')">Dismiss</button>' +
      '</div>' +
    '</div>';
  }

  function renderDSTStatus(appState, inviteSource) {
    var steps  = getTrackerSteps(appState, inviteSource);   // 5 × done|active|denied|pending
    var nxt    = getDSTNextStep(appState);
    var denied = steps.indexOf('denied') !== -1;

    // MiniStatusTracker — 5 indicators (20px) joined by 4 connector lines (2px).
    // States reuse the kit stepper vocabulary: is-done / is-active / is-denied.
    var vis = activeSteps().map(function (i) { return steps[i]; });   // gate-filtered order
    var mini = '<div class="tasty-mini-status-tracker" aria-hidden="true">';
    vis.forEach(function (st, i) {
      var cls   = st === 'done' ? ' is-done' : st === 'active' ? ' is-active' : st === 'denied' ? ' is-denied' : '';
      var glyph = st === 'done'   ? tastyIcon('check-open', { size: 13 })
                : st === 'denied' ? tastyIcon('cancel', { size: 13 })
                : st === 'active' ? tastyIcon('time',   { size: 13 })
                : '';
      mini += '<span class="tasty-mini-status-tracker__indicator' + cls + '">' + glyph + '</span>';
      if (i < vis.length - 1) {
        var next = vis[i + 1];
        var lineCls = next === 'denied' ? ' is-denied'
                    : (st === 'done' && next === 'done') ? ' is-done' : '';
        mini += '<span class="tasty-mini-status-tracker__line' + lineCls + '"></span>';
      }
    });
    mini += '</div>';

    // Action — canonical .tasty-btn (Button medium, transparent text variant).
    // Register when the learner can act; Resend when a party is owed; View Reason when denied.
    //
    // The approved state used to render NO action here: the condensed tracker said
    // "Approved — register for courses" and gave the learner nothing to press, so the
    // only route to registration was the DACS CallToAction on the DE tab — a screen
    // away, and invisible from the dashboard they land on.
    //
    // Success-transparent, not filled, matching the invite variant's "Apply Now"
    // (renderDSTInvite). The filled success button is the DACS CTA's variant; the
    // DashboardStatusTracker keeps its actions as text buttons.
    var action = '';
    if (denied) {
      action = '<button type="button" class="tasty-btn is-md is-transparent is-error is-no-border is-full" onclick="showToast(\'Opening denial reason…\',\'config\')">View Reason</button>';
    } else if (appState === 'approved') {
      action = '<button type="button" class="tasty-btn is-md is-transparent is-success is-no-border is-full" onclick="showScreen(\'courses\')">Register For Courses</button>';
    } else if (nxt.resend) {
      action = '<button type="button" class="tasty-btn is-md is-transparent is-no-border is-full" onclick="resendNotification(\'' + (nxt.notify || 'guardian') + '\')">Resend Notification</button>';
    }
    var buttons = action ? '<div class="tasty-dst-buttons">' + action + '</div>' : '';

    var sub = nxt.sub ? '<span class="tasty-dst-sub">' + esc(nxt.sub) + '</span>' : '';
    return '<div class="tasty-dashboard-status-tracker' + (denied ? ' is-denied' : '') + '">' +
      '<img class="tasty-member-logo is-xs" src="assets/wvcc-logo.png" alt="">' +
      '<span class="tasty-dst-label">Dual Enrollment</span>' +
      '<div class="tasty-dst-content">' +
        mini +
        '<div class="tasty-dst-text">' +
          '<span class="tasty-dst-title">' + esc(nxt.title) + '</span>' + sub +
        '</div>' +
      '</div>' +
      buttons +
    '</div>';
  }

  /* ─── Status tag HTML ─── [label, context, icon] — clock on the in-progress states (Figma). */
  function renderStatusTag(appState) {
    var map = {
      'invited':                 ['Invited',          'is-primary', 'send'],
      'open-enrollment':         ['Open enrollment',  'is-primary', null],
      'parent-consent-pending':  ['Awaiting consent', 'is-warning', 'time'],
      'counselor-pending':       ['In progress',      'is-warning', 'time'],
      'dual-pending':            ['In progress',      'is-warning', 'time'],
      'college-review':          ['In progress',      'is-note',    'time'],
      'approved':                ['Approved',         'is-success', null],
      'registered':              ['Registered',       'is-success', null],
      'registered-in-session':   ['In session',       'is-success', null],
      'denied-counselor':        ['Not approved',     'is-error',   null],
      'denied-college':          ['Not accepted',     'is-error',   null],
      'cancelled':               ['Cancelled',        'is-bold',    null],
    };
    var t = map[appState] || ['—', '', null];
    var icon = t[2] ? tastyIcon(t[2], { size: 14 }) : '';
    return '<span class="tasty-status-tag is-solid ' + t[1] + '">' + icon + esc(t[0]) + '</span>';
  }

  /* ─── Banner inside DE member box ─── */
  /* ─── DynamicActionCardSection (Tasty organism · Figma 99-01 Organisms 5844:109456) ───
     KIT-GROWTH ▶ this organism is NOT in the kit yet (kit ships .tasty-member-box /
     -section-header / -banner only). Built locally here; promote
     .tasty-dynamic-action-card-section + .tasty-action-card + .tasty-dacs-cta to
     _kit/styles + the tasty-prototype-starter skill later. One reusable section, two Types:
       • Default       → plain HEADER (icon + title + sub) · divider · N ACTION CARDS
       • CallToAction  → media (illus|icon) + title/body + one button
     COLOR RULE (confirmed w/ the designer): everything is plain — status color lives in the MemberBox
     status tag. The ONLY filled variant is the success-green "Register For Courses" CTA, shown
     when the learner can actually register. */

  /* Plain section-header content per state. `sub` may contain inline HTML (kept un-escaped). */
  function getDacsHeader(appState) {
    var m = {
      'parent-consent-pending': { icon: 'time',   title: 'Waiting On Parent/Guardian Consent',
        sub: 'Your parent/guardian must give their consent before your application can move forward.' },
      'counselor-pending':      { icon: 'time',   title: 'Waiting On High School Approval',
        sub: 'A high school admin must approve your dual enrollment request before your application can move forward.' },
      'dual-pending':           { icon: 'time',   title: 'Waiting On Parent/Guardian And High School',
        sub: 'Both your parent/guardian and your high school admin need to respond before your application can move forward.' },
      'college-review':         { icon: 'school', title: 'Institution Review Pending',
        sub: 'Application received MAR 23, 2026 at 7:05am PST. The admissions team at ' + esc(COLLEGE.name) + ' is reviewing your application. Processing typically takes about 10 days. We’ll send any response immediately to <strong>jcumberland@pioneerhs.edu</strong> as well as your mobile number at <strong>456-867-5309</strong>.' },
      'denied-counselor':       { icon: null,     title: 'Application Not Approved By High School',
        sub: 'Denied on ' + STEP_DONE_TS + '. Your high school has not approved this application. Contact your high school for more information.' },
      'denied-college':         { icon: null,     title: 'Application Not Accepted By Institution',
        sub: 'Denied on ' + STEP_DONE_TS + '. ' + esc(COLLEGE.name) + ' has chosen not to accept your Dual Enrollment application with the following reason: <strong>“Your GPA does not meet threshold for Dual Enrollment. We encourage you to reapply once you have the grades to meet entry requirements.”</strong>' },
    };
    return m[appState] || null;
  }

  function renderDacsHeader(h) {
    if (!h) return '';
    var iconHtml = h.icon ? '<span class="tasty-dacs__icon">' + tastyIcon(h.icon, { size: 20 }) + '</span>' : '';
    return '<div class="tasty-dacs__header">' + iconHtml +
      '<div class="tasty-dacs__htext">' +
        '<div class="tasty-dacs__title">' + esc(h.title) + '</div>' +
        '<div class="tasty-dacs__sub">' + h.sub + '</div>' +
      '</div></div>';
  }

  /* One notification action card: who · role · sent-line + Change Email / Resend actions.
     Takes a NOTIFY key, not a literal row, so both actions can mutate the shared record
     (address, sent stamp) and every other surface picks the change up on re-render. */
  function renderActionCard(key) {
    var r = NOTIFY[key];
    return '<div class="tasty-action-card">' +
      '<div class="tasty-action-card__info">' +
        '<div class="tasty-action-card__name">' + esc(r.name) + '</div>' +
        '<div class="tasty-action-card__role">' + esc(r.role) + '</div>' +
        '<div class="tasty-action-card__sent">Notification sent ' + esc(r.sent) + ' to <strong>' + esc(r.email || r.name) + '</strong></div>' +
      '</div>' +
      '<div class="tasty-action-card__actions">' +
        /* Change Email only where the learner supplied the address. The high school's queue
           isn't theirs to redirect, so that card offers Resend alone. */
        (r.email ? '<button type="button" class="tasty-btn is-transparent is-sm" onclick="openChangeEmail(\'' + key + '\')">' + tastyIcon('edit', { size: 16 }) + 'Change Email</button>' : '') +
        '<button type="button" class="tasty-btn is-ghost is-sm" onclick="resendNotification(\'' + key + '\')">' + tastyIcon('refresh', { size: 16 }) + 'Resend Notification</button>' +
      '</div>' +
    '</div>';
  }

  /* Assemble the section for an enrollment/state. Returns '' when there is nothing to show. */
  function renderDynamicActionCardSection(item) {
    var appState = item.appState;
    var inviteSource = item.inviteSource;
    var col = item.college || COLLEGE;
    var wrap = function (inner, mod) {
      return inner ? '<div class="tasty-dynamic-action-card-section' + (mod ? ' ' + mod : '') + '">' + inner + '</div>' : '';
    };
    var cta = function (o) {
      var media = o.illus ? '<div class="tasty-dacs-cta__media">' + tastyIllus(o.illus, { size: 40, alt: '' }) + '</div>'
                : o.icon  ? '<div class="tasty-dacs-cta__media">' + tastyIcon(o.icon, { size: 28 }) + '</div>' : '';
      var meta  = o.meta ? '<span class="tasty-dacs-cta__meta">' + o.meta + '</span>' : '';
      return '<div class="tasty-dacs-cta">' + media +
        '<div class="tasty-dacs-cta__text">' +
          '<div class="tasty-dacs-cta__title">' + esc(o.title) + '</div>' +
          (o.body ? '<div class="tasty-dacs-cta__body">' + o.body + '</div>' : '') +
        '</div>' +
        '<div class="tasty-dacs-cta__aside">' + meta + (o.button || '') + '</div>' +
      '</div>';
    };

    // DISCOVERY (open enrollment) → CallToAction, no inviter (Figma 4.3.1.15).
    if (item.kind === 'discovery') {
      return wrap(cta({
        illus: 'gf-dual-enrollment',
        title: 'Earn college credit while you’re still in high school.',
        body: 'Dual enrollment applications are open. Apply whenever you’re ready, no invite needed.',
        button: '<button type="button" class="tasty-btn is-success is-sm" onclick="goToApplication()">Apply now</button>'
      }));
    }

    // INVITE → CallToAction (Apply Now)
    if (item.kind === 'invite') {
      var termFrag = item.terms && item.terms.length ? ' for ' + joinTerms(item.terms) : ' for Dual Enrollment';
      var body = inviteSource === 'counselor'
        ? 'Your high school admin at ' + esc(HS.name) + ' has invited you to apply' + termFrag + '. Start your application to begin earning college credit.'
        : esc(col.name) + ' has invited you to apply' + termFrag + '. Start your application to begin earning college credit.';
      return wrap(cta({
        illus: 'gf-dual-enrollment',
        title: 'You’ve been invited to apply for Dual Enrollment',
        body: body,
        button: '<button type="button" class="tasty-btn is-success is-sm" onclick="startApplicationFlow()">Apply now</button>'
      }));
    }

    // APPROVED → success-green Register CTA (the one place green is allowed)
    if (appState === 'approved') {
      return wrap(cta({
        icon: 'notification',
        title: 'Register For Courses',
        body: 'Your application was approved on APR 15, 2026 at 11:45pm PST. Congratulations! You have been approved for Dual Enrollment at ' + esc(col.name) + ' for the <strong>' + esc(APP.term) + ' Term</strong>.',
        meta: '<strong>52 days remaining.</strong> Space may be limited.',
        button: '<button type="button" class="tasty-btn is-success is-sm" onclick="showScreen(\'courses\')">Register for course</button>'
      }), 'is-success');
    }

    // CANCELLED → CallToAction with optional Reapply
    if (appState === 'cancelled') {
      var canReapply = DEV.reapply === 'on';
      return wrap(cta({
        title: 'Application Was Cancelled',
        body: 'Cancelled on ' + STEP_DONE_TS + '. ' + (canReapply ? 'You can apply again while the enrollment window is open.' : 'The enrollment window has closed.'),
        button: canReapply ? '<button type="button" class="tasty-btn is-secondary is-sm" onclick="startApplicationFlow()">Reapply</button>' : ''
      }));
    }

    // WAITING / REVIEW / DENIAL → plain header (+ action cards for the waiting states)
    var headerHtml = renderDacsHeader(getDacsHeader(appState));
    var rows = [];
    var needsParent    = guardianOn()  && (appState === 'parent-consent-pending' || appState === 'dual-pending');
    var needsCounselor = counselorOn() && (appState === 'counselor-pending' || appState === 'dual-pending');
    if (needsParent)    rows.push('guardian');
    if (needsCounselor) rows.push('hsadmin');
    var cardsHtml = rows.length ? '<div class="tasty-dacs__divider"></div>' + rows.map(renderActionCard).join('') : '';
    return wrap(headerHtml + cardsHtml);
  }

  /* ─── DashboardStatusTracker next-step info ─── */
  function getDSTNextStep(appState) {
    var m = {
      /* `notify` names the NOTIFY record this step is waiting on: it supplies the sub-line
         (name + current address) and the party the Resend button restamps. */
      'parent-consent-pending': { title: 'Next Step: Parent/Guardian Consent', notify: 'guardian', resend: true  },
      'counselor-pending':      { title: 'Next Step: High School Approval',    notify: 'hsadmin',  resend: true  },
      'dual-pending':           { title: 'Next Step: Parent/Guardian Consent', notify: 'guardian', resend: true  },
      'college-review':         { title: 'Next Step: Institution Review',           sub: COLLEGE.name,                               resend: false },
      'approved':               { title: 'Approved — register for courses',     sub: 'Register by Apr 25',                       resend: false },
      /* Name the course, not just the term: the learner returns to the dashboard
         to see WHAT they registered for. Falls back to the term before a course
         has been chosen (deep link straight to the registered state). */
      'registered':             { title: registeredCourse ? 'Registered for ' + registeredCourse.id + ' - ' + registeredCourse.title : 'Registered for ' + APP.term,
                                  sub: registeredCourse ? registeredCourse.term + ' - ' + COLLEGE.name : 'Classes start soon', resend: false },
      'registered-in-session':  { title: 'Classes are in session',             sub: APP.term,                                   resend: false },
      'denied-counselor':       { title: 'Application Not Approved By High School', sub: 'Application denied on ' + STEP_DONE_TS,  resend: false },
      'denied-college':         { title: 'Application Not Accepted',           sub: 'Application denied on ' + STEP_DONE_TS,    resend: false },
      'cancelled':              { title: 'Application cancelled',              sub: null,                                       resend: false },
    };
    var nxt = m[appState] || { title: '—', sub: null, resend: false };
    if (nxt.notify && !nxt.sub) {
      var n = NOTIFY[nxt.notify];
      nxt.sub = n.email ? (n.name + ' (' + n.email + ')') : n.name;
    }
    return nxt;
  }

  /* Notification rows moved into renderDynamicActionCardSection (§3) as .tasty-action-card. */

  /* ════════════════════════════════════════
     §4 · DASHBOARD render
  ════════════════════════════════════════ */
  /* High schools the learner is connected to. Each renders as a MemberBox with a
     SectionHeader (image on), its credential tiles, and an Order-A-Credential
     footer. Pioneer carries the Dual Enrollment relationship. */
  var HIGH_SCHOOLS = [
    { name: 'Pioneer High School', city: 'Scottsdale, AZ', accent: '--summer', logo: 'assets/pioneer-logo.png', hasDE: true,
      tiles: [
        { thumb: 'transcript-thumbnail',  title: 'Transcript',  sub: 'High School Transcript' },
        { thumb: 'certificate-thumbnail', title: 'Certificate', sub: 'Young Scientist Award', meta: 'Acquired: MAY 22, 2024' },
      ] },
    { name: 'Apple Tree High School', city: 'Scottsdale, AZ', accent: '--context-success', logo: 'assets/appletree-logo.png', hasDE: false,
      tiles: [
        { thumb: 'transcript-thumbnail', title: 'Transcript', sub: 'Academic Transcript', badge: 'Personal Preview' },
      ] },
  ];

  function renderDashboard() {
    var mount = document.getElementById('dashboard-mount');
    if (!mount) return;
    var enrollments = buildEnrollments();
    var first = enrollments[0];
    /* College invites have no member-box connection yet -> banner OUTSIDE, above
       the boxes. Counselor invites + in-progress render INSIDE the Pioneer box. */
    var collegeInvite = first.kind === 'invite' && first.inviteSource === 'college';

    /* A COLLEGE invite renders standalone above the member boxes; a counselor
       invite renders inside the Pioneer box via renderHsDeSection. Both paths
       have to honour a dismissal — filtering only the second one is why Dismiss
       appeared to do nothing on the common (college invite) case. */
    var collegeInviteShown = collegeInvite && !isDismissed(first);

    var html = '';
    if (collegeInviteShown) html += '<div class="de-dst-standalone">' + renderDashboardStatusTracker(first) + '</div>';
    HIGH_SCHOOLS.forEach(function (hs) {
      var deSection = (hs.hasDE && !collegeInvite) ? renderHsDeSection(enrollments) : '';
      html += renderHsCard(hs, deSection);
    });
    html += renderAnotherInstitution();

    mount.innerHTML = html;
    if (typeof resolveTastyAssets === 'function') resolveTastyAssets(mount);
  }

  /* One high-school MemberBox: SectionHeader (image on) + Order Your Transcript +
     kebab, an optional DE section, the credential tiles, and the footer. */
  function renderHsCard(hs, deSection) {
    var orderBtn =
      '<button type="button" class="tasty-btn is-success is-md hs-order-btn" onclick="showToast(\'Order your transcript — coming soon\',\'config\')">' +
        tastyIcon('order-and-send', { size: 18 }) + '<span class="hs-order-btn__div" aria-hidden="true"></span>Order Your Transcript</button>';
    var kebab =
      '<button type="button" class="tasty-btn is-ghost is-md is-icon hs-kebab" aria-label="More options" onclick="showToast(\'More options — coming soon\',\'config\')">' +
        tastyIcon('more-menu', { size: 18 }) + '</button>';

    var header =
      '<div class="de-inst-header hs-header">' +
        '<div class="tasty-section-header hs-section-header">' +
          '<span class="tasty-section-header__graphic hs-logo"><img src="' + hs.logo + '" alt=""></span>' +
          '<div>' +
            '<div class="tasty-section-header__title">' + esc(hs.name) + '</div>' +
            '<div class="tasty-section-header__sub">' + esc(hs.city) + '</div>' +
          '</div>' +
        '</div>' +
        '<div class="de-member-aside">' + orderBtn + kebab + '</div>' +
      '</div>';

    var deWrap = deSection ? '<div class="hs-de-wrap">' + deSection + '</div>' : '';
    var tiles  = '<div class="hs-tiles">' + hs.tiles.map(renderCredentialTile).join('') + '</div>';

    var offers = [
      { icon: 'transcript',        label: 'Transcripts'   },
      { icon: 'diploma',           label: 'Diplomas'      },
      { icon: 'verified-document', label: 'Verifications' },
      { icon: 'more-menu',         label: 'And More!'     },
    ].map(function (o) {
      return '<span class="hs-offer">' + tastyIcon(o.icon, { size: 15 }) + esc(o.label) + '</span>';
    }).join('');
    var footer =
      '<div class="hs-credential">' +
        '<div class="hs-credential__info">' +
          '<p class="hs-credential__title">Order A Credential</p>' +
          '<p class="hs-credential__sub">' + esc(hs.name) + ' offers:</p>' +
          '<div class="hs-offers">' + offers + '</div>' +
        '</div>' +
        '<button type="button" class="tasty-btn is-ghost is-md" onclick="showToast(\'Order a credential — coming soon\',\'config\')">Order Now</button>' +
      '</div>';

    return '<div class="tasty-member-box de-member-box hs-member-box" style="--member-color:var(' + hs.accent + ')">' +
      header + deWrap + tiles + footer +
    '</div>';
  }

  /* Canonical DashboardCredentialTile. */
  function renderCredentialTile(t) {
    var badge = t.badge ? '<span class="tasty-status-tag is-note hs-tile__badge">' + esc(t.badge) + '</span>' : '';
    var meta  = t.meta  ? '<p class="hs-tile__meta">' + esc(t.meta) + '</p>' : '';
    return '<div class="tasty-credential-tile">' +
      '<span class="tasty-credential-tile__img"><span data-tasty-illus="' + t.thumb + '" data-size="110" alt=""></span></span>' +
      '<div class="tasty-credential-tile__content">' +
        badge +
        '<p class="hs-tile__title">' + esc(t.title) + '</p>' +
        '<p class="hs-tile__sub">' + esc(t.sub) + '</p>' +
        meta +
      '</div>' +
    '</div>';
  }


  /* ─── Dismissing an invitation ──────────────────────────────────────────
     Dismiss clears the invite from the DASHBOARD only. It does not decline it:
     the invitation is still live and still sits on the Dual Enrollment tab,
     where the learner can act on it whenever they like. The dashboard is a
     "what needs me today" surface, so letting someone clear a tile there is
     housekeeping, not a decision — and a decision is not ours to infer from a
     dismiss. Kept in memory only, which is right for a prototype: a reload
     brings it back, so nobody can lose a path while demoing.
     ─────────────────────────────────────────────────────────────────────── */
  var dismissedInvites = {};
  function inviteKey(item) {
    return (item.kind || 'invite') + ':' + ((item.college && item.college.name) || 'unknown');
  }
  function isDismissed(item) { return !!dismissedInvites[inviteKey(item)]; }
  window.dismissInvite = function (key) {
    dismissedInvites[key] = true;
    renderDashboard();
    showToast('Invitation dismissed. It is still on your Dual Enrollment tab.', 'config');
  };

  /* DE section nested in the Pioneer box: invite banner (counselor/discovery) or status pill. */
  /* Dashboard DE section for one high school (Figma 4.3.1.14.1 · 17155:264343).
     INVITES ARE SEPARATE, one row each, and are never folded into the application count — an
     invite isn't an application yet, and it carries its own Apply Now / Dismiss. Applications
     then collapse: exactly one → its full DashboardStatusTracker; more than one → a single
     summary row with View Details, since N stacked trackers would swamp the dashboard. */
  function renderHsDeSection(enrollments) {
    var invites = enrollments.filter(function (it) {
      return (it.kind === 'invite' || it.kind === 'discovery') && !isDismissed(it);
    });
    var apps    = enrollments.filter(function (it) { return it.kind === 'app'; });
    var html = invites.map(function (it) { return renderDashboardStatusTracker(it); }).join('');
    if (apps.length === 1)     html += renderDashboardStatusTracker(apps[0]);
    else if (apps.length > 1)  html += renderAppsSummaryRow(apps);
    return html;
  }

  /* Multi-application summary — the DashboardStatusTracker shell reused neutral (same anatomy
     as the invite variant: media · title · body · one action), NOT a bespoke row.
     Copy stays honest: "in progress" only while every application really is, otherwise the
     subtitle carries the actual breakdown. */
  function renderAppsSummaryRow(apps) {
    var counts = { 'in-progress': 0, 'enrolled': 0, 'closed': 0 };
    apps.forEach(function (a) { counts[deBucket(a)]++; });
    var allInProgress = counts['in-progress'] === apps.length;
    var title = allInProgress
      ? 'You have ' + apps.length + ' Dual Enrollment applications in progress.'
      : 'You have ' + apps.length + ' Dual Enrollment applications.';
    var parts = [];
    if (counts['in-progress']) parts.push(counts['in-progress'] + ' in progress');
    if (counts['enrolled'])    parts.push(counts['enrolled'] + ' registered');
    if (counts['closed'])      parts.push(counts['closed'] + ' closed');
    var body = allInProgress
      ? 'You have multiple ongoing applications for this school. Click ‘View Details’ to get more information on how things are progressing.'
      : parts.join(' · ') + '. Click ‘View Details’ to see how each one is progressing.';
    return '<div class="tasty-dashboard-status-tracker">' +
      '<div class="tasty-dst-content">' +
        '<span class="tasty-dst-logo-illus" aria-hidden="true"><span data-tasty-illus="select-document-fill" data-size="50"></span></span>' +
        '<div class="tasty-dst-text">' +
          '<span class="tasty-dst-title">' + esc(title) + '</span>' +
          '<span class="tasty-dst-sub tasty-dst-sub--wrap">' + esc(body) + '</span>' +
        '</div>' +
      '</div>' +
      '<div class="tasty-dst-buttons">' +
        '<button type="button" class="tasty-btn is-md is-transparent is-no-border" onclick="showScreen(\'de-tab\')">View Details</button>' +
      '</div>' +
    '</div>';
  }

  /* In-progress DE status pill (condensed tracker). Pass appState OR a multi count. */
  function renderDeStatusPill(appState, multiCount, enrollments) {
    if (multiCount) {
      /* "in progress" only holds when they ALL are. Once a portfolio spans buckets (one
         registered, one closed, an invite not yet acted on) that claim is wrong, so fall back
         to a plain count and let the DE tab carry the breakdown. */
      var allInProgress = !enrollments || enrollments.every(function (it) { return deBucket(it) === 'in-progress'; });
      var pillTitle = multiCount + (allInProgress ? ' applications in progress' : ' dual enrollment applications');
      return '<div class="de-pill">' +
        '<div class="de-inst-logo de-inst-logo--college de-pill__logo" aria-hidden="true">W</div>' +
        '<span class="de-pill__label">Dual Enrollment</span>' +
        '<div class="de-pill__next"><span class="de-pill__next-title">' + pillTitle + '</span></div>' +
        '<button type="button" class="tasty-btn is-ghost is-sm" onclick="showScreen(\'de-tab\')">View details</button>' +
      '</div>';
    }
    // Single application → the reusable DashboardStatusTracker (Figma 9939:10123).
    return renderDSTStatus(appState, DEV.inviteSource);
  }

  /* "Order From Another Institution" — centered block below the MemberBoxes. */
  function renderAnotherInstitution() {
    return '<div class="hs-another">' +
      '<div class="hs-another__illus"><span data-tasty-illus="vg-6g-generic-school" data-size="120" alt=""></span></div>' +
      '<button type="button" class="tasty-btn is-primary is-md hs-another__btn" onclick="showToast(\'Order from another institution — coming soon\',\'config\')">' +
        tastyIcon('search', { size: 16 }) + 'Order From Another Institution</button>' +
    '</div>';
  }

  /* ════════════════════════════════════════
     §5 · DE TAB render
  ════════════════════════════════════════ */
  function renderDeTab() {
    var mount = document.getElementById('de-tab-mount');
    if (!mount) return;

    var enrollments = buildEnrollments();

    /* Bucket each enrollment. Three learner buckets: in progress (invited + working through
       approvals) · Registered · Closed (cancelled, denied).
       The NavToggle only earns its place once applications sit in MORE THAN ONE bucket — with
       everything in one state it's a single tab that filters nothing, so it's noise. Same for
       the count badges: they only appear when a bucket actually holds more than one
       application, otherwise every tab would read "1". */
    var counts = { 'in-progress': 0, 'enrolled': 0, 'closed': 0 };
    enrollments.forEach(function (it) { counts[deBucket(it)]++; });
    var TABS = [['in-progress', 'In progress'], ['enrolled', 'Registered'], ['closed', 'Closed']]
      .filter(function (t) { return counts[t[0]] > 0; });
    var showTabs   = TABS.length > 1;
    var showCounts = TABS.some(function (t) { return counts[t[0]] > 1; });

    // Keep the chosen tab if it still holds anything, else fall back to the first occupied one.
    var occupied = TABS.map(function (t) { return t[0]; });
    var activeTab = (occupied.indexOf(deTab) !== -1) ? deTab : (occupied[0] || 'in-progress');
    deTab = activeTab;

    var tabsHtml = showTabs
      ? '<div class="de-view-tabs"><ul class="tasty-navtoggle">' +
          TABS.map(function (t) { return makeViewTab(t[0], t[1], showCounts ? counts[t[0]] : null, activeTab); }).join('') +
        '</ul></div>'
      : '';

    /* No "New Application" action here (removed Aug 5, 2026): a learner does not start a DE
       application from this tab — it begins from an invite or from open enrollment, both of
       which surface their own Apply CTA inside the member box below. */
    /* With tabs showing, a tab has to actually filter, or clicking "Registered" would leave
       the in-progress box on screen. Only reachable when 2+ buckets are occupied. */
    var shown = showTabs ? enrollments.filter(function (it) { return deBucket(it) === activeTab; }) : enrollments;
    var contentHtml = shown.map(function (item) {
      // invite + discovery (open enrollment) = no application yet → CTA box, NOT the tracker box.
      if (item.kind === 'invite' || item.kind === 'discovery') return renderDeInviteBox(item);
      return renderDeAppBox(item);
    }).join('');

    mount.innerHTML = tabsHtml + contentHtml;
    if (typeof resolveTastyAssets === 'function') resolveTastyAssets(mount);
  }

  /* Institution crest logos (extracted from Figma). College falls back to a letter. */
  function collegeLogo(col) { return col.abbr === 'WVCC' ? 'assets/wvcc-logo.png' : null; }

  /* Canonical SectionHeader (image on) for an institution in a MemberBox header. */
  function instSectionHeader(logoSrc, letter, letterClass, name, city) {
    var graphic = logoSrc
      ? '<span class="tasty-section-header__graphic de-sh-logo"><img src="' + logoSrc + '" alt=""></span>'
      : '<span class="tasty-section-header__graphic"><span class="de-inst-logo ' + letterClass + ' de-sh-letter" aria-hidden="true">' + esc(letter) + '</span></span>';
    return '<div class="tasty-section-header de-inst-sh">' + graphic +
      '<div>' +
        '<div class="tasty-section-header__title">' + esc(name) + '</div>' +
        '<div class="tasty-section-header__sub">' + esc(city) + '</div>' +
      '</div>' +
    '</div>';
  }

  /* DE-tab INVITE member box — single institution = the inviter, "Invited" tag, Apply Now. */
  /* Invite + discovery (open enrollment) — no application yet: single-institution header + a
     DynamicActionCardSection CTA, NO tracker. Discovery shows the learner's own HS and no status tag. */
  function renderDeInviteBox(item) {
    var isDiscovery = item.kind === 'discovery';
    var isCounselor = item.inviteSource === 'counselor';
    var col = item.college;

    // Header institution: discovery + counselor invite show the HS; college invite shows the college.
    var headInst = (isDiscovery || isCounselor)
      ? instSectionHeader('assets/pioneer-logo.png', 'P', 'de-inst-logo--hs', HS.name, HS.city)
      : instSectionHeader(collegeLogo(col), (col.abbr || col.name).charAt(0), 'de-inst-logo--college', col.name, col.city);

    // Invites carry an "Invited" tag; open enrollment has no inviter, so no tag.
    var aside = isDiscovery ? ''
      : '<div class="de-member-aside"><span class="tasty-status-tag is-solid is-primary">' + tastyIcon('send', { size: 14 }) + 'Invited</span></div>';

    // Branded strip = this learner's HS color (matches the dashboard). Body + Apply Now live in
    // the shared DynamicActionCardSection (CallToAction), not a bespoke banner.
    return '<div class="tasty-member-box de-member-box" style="--member-color:var(' + HS.accent + ')">' +
      '<div class="de-inst-header de-inst-header--single">' + headInst + aside +
      '</div>' +
      renderDynamicActionCardSection(item) +
    '</div>';
  }

  /* DE-tab APPLICATION member box — HS -> College header, App ID OUTSIDE stepper, full tracker. */
  function renderDeAppBox(item) {
    var appState = item.appState;
    var col = item.college;

    var instHtml =
      instSectionHeader('assets/pioneer-logo.png', 'P', 'de-inst-logo--hs', HS.name, HS.city) +
      '<span class="de-inst-arrow">' + tastyIcon('arrow', { size: 16 }) + '</span>' +
      instSectionHeader(collegeLogo(col), (col.abbr || col.name).charAt(0), 'de-inst-logo--college', col.name, col.city);

    // Aside (Figma): status tag + App ID are one right-aligned group (App ID directly UNDER the
    // tag, never under the kebab); the OptionsMenu sits OUTSIDE that group, to its right. Kebab +
    // App ID only on live, actionable states — none once registered/closed; Cancel is pre-registration.
    var live = ['parent-consent-pending','counselor-pending','dual-pending','college-review','approved'].indexOf(appState) !== -1;
    var asideHtml =
      '<div class="de-app-aside">' +
        '<div class="de-app-aside__meta">' +
          renderStatusTag(appState) +
          (live ? '<span class="de-app-id">Application ID: ' + esc(item.appId || APP.id) + '</span>' : '') +
        '</div>' +
        (live ? renderOptionsMenu() : '') +
      '</div>';

    // Branded strip = this learner's HS color (matches the dashboard MemberBox for that school).
    // Lower region is the shared DynamicActionCardSection (header + cards, or a CTA).
    return '<div class="tasty-member-box de-member-box" style="--member-color:var(' + HS.accent + ')">' +
      '<div class="de-inst-header">' + instHtml + asideHtml +
      '</div>' +
      '<div class="de-stepper-area">' + renderFullTracker(appState, item.inviteSource) + '</div>' +
      renderDynamicActionCardSection(item) +
    '</div>';
  }

  /* Canonical OptionsMenu (Tasty OptionsMenu/Dropdown). Trigger = is-transparent is-icon (keeps its
     border per feedback_optionsmenu_kebab_border); the kit's data-tasty="menu" toggles the sibling
     .tasty-menu (.is-open) with outside-click + Esc handled in tasty-interactions.js. */
  function renderOptionsMenu() {
    return '<div class="de-options">' +
      '<button type="button" class="tasty-btn is-transparent is-sm is-icon de-options-trigger" data-tasty="menu" aria-haspopup="listbox" aria-expanded="false" aria-label="More options" title="More options">' +
        tastyIcon('more-menu', { size: 16 }) +
      '</button>' +
      '<div class="tasty-menu de-options-menu" role="listbox">' +
        '<div class="tasty-menu__item is-danger" role="option" tabindex="0" onclick="showCancelConfirm()">' + tastyIcon('cancel', { size: 16 }) + 'Cancel application</div>' +
      '</div>' +
    '</div>';
  }

  /* count === null → no badge (every bucket holds exactly one, so a "1" says nothing). */
  function makeViewTab(id, label, count, activeId) {
    var cls = 'tasty-navtoggle__item' + (id === activeId ? ' is-active' : '');
    var badge = (count === null || count === undefined) ? '' : ' <span class="tasty-badge">' + count + '</span>';
    return '<li class="' + cls + '" role="button" tabindex="0" onclick="switchDeTab(\'' + id + '\')">' + esc(label) +
      badge + '</li>';
  }

  /* Which DE-tab bucket an enrollment falls into. Invites/discovery = in-progress. */
  function deBucket(item) {
    var s = item.appState || 'invited';
    if (['approved', 'registered', 'registered-in-session'].indexOf(s) !== -1) return 'enrolled';
    if (['denied-counselor', 'denied-college', 'cancelled'].indexOf(s) !== -1) return 'closed';
    return 'in-progress';
  }

  /* Remembered across re-renders so a dev-drawer change doesn't bounce you back to tab one. */
  var deTab = 'in-progress';

  window.switchDeTab = function (id) {
    deTab = id;
    renderDeTab();   // re-renders the boxes for this bucket AND restamps the active tab
    // renderDeTab may reject the bucket and fall back, so sync after it, not before.
    if (window.DELink) window.DELink.sync();
  };


  /* ─── HS select render ─── */
  /* TileMemberSelect (Figma): a canonical .tasty-tile.is-interactive holding a
     .tasty-member-logo + .tasty-member-box name/meta. Click to proceed. */
  function renderHsSelect() {
    var list = document.getElementById('hs-select-list');
    if (!list) return;
    list.innerHTML = '<div class="tasty-member-select">' +
      ALT_HS.map(function (hs) {
        var sel = hs.id === selectedHsId ? ' is-selected' : '';
        var logo = hs.logo
          ? '<img class="tasty-member-logo" src="' + hs.logo + '" alt="">'
          : '<span class="tasty-member-logo"></span>';
        return '<button type="button" class="tasty-tile is-interactive hs-tile' + sel + '" onclick="selectHs(\'' + hs.id + '\')">' +
          logo +
          '<span class="hs-tile__text">' +
            '<span class="tasty-member-box__name">' + esc(hs.name) + '</span>' +
            '<span class="tasty-member-box__meta">' + esc(hs.city) + '</span>' +
          '</span>' +
        '</button>';
      }).join('') +
    '</div>';
    if (typeof resolveTastyAssets === 'function') resolveTastyAssets(list);
  }

  /* ─── College select render — mirrors renderHsSelect (canonical TileMemberSelect) ─── */
  function renderCollegeSelect() {
    var list = document.getElementById('college-select-list');
    if (!list) return;
    list.innerHTML = '<div class="tasty-member-select">' +
      ALT_COLLEGES.map(function (c) {
        var sel = c.id === selectedCollege ? ' is-selected' : '';
        var logo = c.id === 'wvcc'
          ? '<img class="tasty-member-logo" src="assets/wvcc-logo.png" alt="">'
          : '<span class="tasty-member-logo"></span>';
        return '<button type="button" class="tasty-tile is-interactive hs-tile' + sel + '" onclick="selectCollege(\'' + c.id + '\')">' +
          logo +
          '<span class="hs-tile__text">' +
            '<span class="tasty-member-box__name">' + esc(c.name) + '</span>' +
            '<span class="tasty-member-box__meta">' + esc(c.city) + '</span>' +
          '</span>' +
        '</button>';
      }).join('') +
    '</div>';
    if (typeof resolveTastyAssets === 'function') resolveTastyAssets(list);
  }

  /* ════════════════════════════════════════
     §7 · Shared confirm/registered MEMBER-BOX card
     (HS -> College, summer accent bar, status tag + App ID
      OUTSIDE the stepper) — mirrors the DE-tab card shape.
  ════════════════════════════════════════ */
  function renderConfirmMemberBox(appState, opts) {
    opts = opts || {};
    var instHtml =
      '<div class="de-inst de-inst--hs">' +
        '<div class="de-inst-logo de-inst-logo--hs" aria-hidden="true">P</div>' +
        '<div>' +
          '<p class="tasty-member-box__name">' + esc(HS.name) + '</p>' +
          '<p class="tasty-member-box__meta">' + esc(HS.city) + '</p>' +
        '</div>' +
      '</div>' +
      '<span class="de-inst-arrow">' + tastyIcon('arrow', { size: 16 }) + '</span>' +
      '<div class="de-inst de-inst--college">' +
        '<div class="de-inst-logo de-inst-logo--college" aria-hidden="true">' + esc(COLLEGE.abbr.charAt(0)) + '</div>' +
        '<div>' +
          '<p class="tasty-member-box__name">' + esc(COLLEGE.name) + '</p>' +
          '<p class="tasty-member-box__meta">' + esc(COLLEGE.city) + '</p>' +
        '</div>' +
      '</div>';

    var asideHtml =
      renderStatusTag(appState) +
      '<span class="de-app-id">Application ID: ' + esc(APP.id) + '</span>';

    return '<div class="tasty-member-box de-member-box" style="--member-color:var(--summer)">' +
        '<div class="de-inst-header">' + instHtml +
          '<div class="de-member-aside">' + asideHtml + '</div>' +
        '</div>' +
        opts.body +
      '</div>';
  }

  /* ════════════════════════════════════════
     §8 · AER CONFIRM render
  ════════════════════════════════════════ */
  function renderAerConfirm() {
    var cardEl = document.getElementById('aer-confirm-card');
    var nextEl = document.getElementById('aer-confirm-next');
    // Figma 13364-53492: bare horizontal stepper, NO HS->College member-box header.
    if (cardEl) {
      // Reflect the real post-submit state (set in submitDeApp): a counselor invite
      // shows counselor approval already done; college / open enrollment owe both.
      var appState = DEV.appState;
      cardEl.innerHTML = '<div class="confirm-stepper">' +
        renderFullTracker(appState, DEV.inviteSource) + '</div>';
      if (typeof resolveTastyAssets === 'function') resolveTastyAssets(cardEl);
    }
    if (nextEl) {
      var collegeName = esc(COLLEGE.name);
      // Only the gates this network requires are collected before college review.
      var gateParts = [];
      if (guardianOn())  gateParts.push('Parent/Guardian Consent');
      if (counselorOn()) gateParts.push('High School Approval');
      var gateFrag = gateParts.length === 2
        ? gateParts.join(' and ') + ' are collected'
        : gateParts.length === 1
          ? gateParts[0] + ' is collected'
          : '';
      var reviewBody = gateFrag
        ? '<strong>' + collegeName + '</strong> will review your dual enrollment admissions application once ' + gateFrag + '.'
        : '<strong>' + collegeName + '</strong> will review your dual enrollment admissions application.';
      var nextHtml =
        '<div class="confirm-next">' +
          '<h2 class="confirm-next__title">What\'s next?</h2>' +
          '<div class="confirm-next__lead">' +
            '<span class="confirm-next__mark" aria-hidden="true">' + esc(COLLEGE.abbr.charAt(0)) + '</span>' +
            '<p class="confirm-next__body">' + reviewBody + '</p>' +
          '</div>' +
          '<p class="confirm-next__para">Upon application review you will receive a notification indicating whether you have been approved or not, and instructions to follow.</p>' +
          '<p class="confirm-next__para">You can track progress anytime from your Parchment account.</p>' +
        '</div>';
      nextEl.innerHTML = nextHtml;
    }
  }

  /* ════════════════════════════════════════
     §9 · REGISTERED screen render
  ════════════════════════════════════════ */
  function renderRegisteredScreen() {
    var illusEl = document.getElementById('registered-illus');
    var cardEl  = document.getElementById('registered-card');
    if (illusEl && typeof tastyIllus === 'function') {
      illusEl.innerHTML = tastyIllus('enrollment-complete', { size: 120, alt: '' });
      if (typeof resolveTastyAssets === 'function') resolveTastyAssets(illusEl);
    }
    if (cardEl) {
      /* Falls back to currentCourse. registeredCourse is only set by
         confirmRegistration(), so ANY re-render that is not a fresh
         registration -- a deep link to this screen, a state restore, a dev-drawer
         jump -- found it null and rendered "No course registered." underneath a
         headline saying the learner is registered. currentCourse is the course
         they were viewing when they registered, so it is the same course in
         every path that can reach this screen. */
      var c = registeredCourse || currentCourse;
      var courseRows = c
        ? '<div class="registered-course-row">' +
            '<span class="reg-course-code">' + esc(c.id) + '</span>' +
            '<span class="reg-course-title">' + esc(c.title) + '</span>' +
            '<span class="reg-course-credits">' + c.credits + ' cr</span>' +
          '</div>'
        : '<p class="registered-empty">No course registered.</p>';
      var bodyHtml = '<div class="registered-card-body">' +
        '<p class="registered-card-meta">' + esc(COLLEGE.name) + ' &nbsp;·&nbsp; ' + esc(APP.term) + '</p>' +
        '<div class="registered-courses">' + courseRows + '</div>' +
        '</div>';
      cardEl.innerHTML = renderConfirmMemberBox('registered', { body: bodyHtml });
      if (typeof resolveTastyAssets === 'function') resolveTastyAssets(cardEl);
    }
  }

  /* Exposed so the screen can be re-rendered after its inputs change. It runs
     once on DOMContentLoaded, before anything that restores state from a URL has
     had a chance to run, so a deep link to this screen rendered it from an empty
     currentCourse and never revisited it. */
  window.renderRegisteredScreen = renderRegisteredScreen;

  /* ════════════════════════════════════════
     §10 · COURSE REGISTRATION
  ════════════════════════════════════════ */
  /* ── Select A Course (Figma 13431-194273) ────────────────────────────────
     A real .tasty-table, not a card list: Figma's columns are Course ID · Title ·
     Term · Start Date · Credits · Location · Actions, paginated 1–10 of 12. The
     row actions (View Details / Select) appear on the focused row, matching the
     design's single highlighted row. */

  var coursePag = { page: 1, perPage: 10 };
  var currentCourse = null;          // the course being viewed / registered

  function collegeCardHTML(count) {
    var badge = (count != null)
      ? '<span class="crs-college__badge"><span class="crs-college__count">' + count + '</span> Courses Offered</span>'
      : '';
    return '<div class="crs-college__mark" aria-hidden="true">' + esc(COLLEGE.abbr.slice(0, 2)) + '</div>' +
      '<div class="crs-college__text">' +
        '<p class="crs-college__name">' + esc(COLLEGE.name) + '</p>' +
        '<p class="crs-college__city">' + esc(COLLEGE.city) + '</p>' +
        '<a class="crs-college__web" href="#" onclick="return false;">' + esc(COLLEGE.web) +
          ' <i class="ti ti-external-link"></i></a>' +
      '</div>' + badge;
  }

  function renderCourseList() {
    var head = document.getElementById('crs-college');
    if (head) head.innerHTML = collegeCardHTML(COURSES.length);

    var tbody = document.getElementById('crs-tbody');
    if (!tbody) return;

    var total = COURSES.length;
    var pages = Math.max(1, Math.ceil(total / coursePag.perPage));
    if (coursePag.page > pages) coursePag.page = pages;
    var start = (coursePag.page - 1) * coursePag.perPage;
    var slice = COURSES.slice(start, start + coursePag.perPage);

    tbody.innerHTML = slice.map(function (c) {
      return '<tr class="tasty-table__row">' +
        '<td class="tasty-table__td">' + esc(c.id) + '</td>' +
        '<td class="tasty-table__td">' + esc(c.title) + '</td>' +
        '<td class="tasty-table__td">' + esc(c.term) + '</td>' +
        '<td class="tasty-table__td">' + esc(c.start) + '</td>' +
        '<td class="tasty-table__td">' + c.credits + '</td>' +
        '<td class="tasty-table__td">' + esc(c.location) + '</td>' +
        '<td class="tasty-table__td col-actions">' +
          '<div class="crs-row-actions">' +
            '<button type="button" class="tasty-btn is-ghost is-sm" onclick="viewCourse(\'' + c.id + '\')">View Details</button>' +
            '<button type="button" class="tasty-btn is-success is-sm" onclick="selectCourse(\'' + c.id + '\')">Select</button>' +
          '</div>' +
        '</td>' +
      '</tr>';
    }).join('');

    var label = document.getElementById('crs-results-label');
    if (label) {
      label.innerHTML = 'SHOWING <strong>' + (start + 1) + '-' + Math.min(start + coursePag.perPage, total) +
                        '</strong> OF <strong>' + total + '</strong>';
    }
    var btns = document.getElementById('crs-page-buttons');
    if (btns) {
      var html = '<button class="tasty-pagination__item' + (coursePag.page <= 1 ? ' is-disabled' : '') + '"' +
                 (coursePag.page <= 1 ? ' disabled' : '') + ' onclick="gotoCoursePage(' + (coursePag.page - 1) + ')" aria-label="Previous page"><i class="ti ti-arrow-left"></i></button>';
      for (var i = 1; i <= pages; i++) {
        html += '<button class="tasty-pagination__item' + (i === coursePag.page ? ' is-active' : '') +
                '" onclick="gotoCoursePage(' + i + ')" aria-label="Page ' + i + '">' + i + '</button>';
      }
      html += '<button class="tasty-pagination__item' + (coursePag.page >= pages ? ' is-disabled' : '') + '"' +
              (coursePag.page >= pages ? ' disabled' : '') + ' onclick="gotoCoursePage(' + (coursePag.page + 1) + ')" aria-label="Next page"><i class="ti ti-arrow-right"></i></button>';
      btns.innerHTML = html;
    }
    var sel = document.getElementById('crs-perpage-select');
    if (sel && sel.value !== String(coursePag.perPage)) sel.value = String(coursePag.perPage);
  }

  /* ── Course Details (Figma 13484-75159) ──────────────────────────────────
     Section card on the left (CRN, dates, modality, instructor, live seat count,
     price, Register) and the Tuition & Fees rail on the right. */
  function renderCourseDetail() {
    var c = currentCourse;
    if (!c) return;
    var head = document.getElementById('cd-college');
    if (head) head.innerHTML = collegeCardHTML(null);

    var body = document.getElementById('cd-body');
    if (!body) return;

    var money = '$' + c.tuition.toFixed(2);
    var transfer = c.transferrable
      ? '<p class="crs-rail__transfer">' + tastyIcon('check', { size: 16 }) + ' Transferrable Credit</p>' : '';

    var section = '<div class="crs-section">' +
      '<p class="crs-section__crn">CRN ' + esc(c.crn) + '</p>' +
      '<div class="crs-section__row">' +
        '<h4 class="crs-section__dates">' + esc(c.start.replace(', 2026', '').replace(/^([A-Z]{3}) (\d+)$/, '$1 $2')) +
          ' - ' + esc(c.end.replace(', 2026', '')) + '</h4>' +
        '<span class="crs-section__price">' + money + '</span>' +
      '</div>' +
      '<div class="crs-section__meta">' +
        '<span>' + tastyIcon('location', { size: 14 }) + ' ' + esc(c.modality) + '</span>' +
        '<span>' + tastyIcon('time', { size: 14 }) + ' ' + esc(c.meets) + '</span>' +
        '<span>' + tastyIcon('learner', { size: 14 }) + ' ' + esc(c.instructor) + '</span>' +
      '</div>' +
      '<div class="crs-section__foot">' +
        '<p class="crs-section__seats"><strong>Live Seat Count:</strong> ' + c.seats + ' (a few minutes ago)*</p>' +
        '<button type="button" class="tasty-btn is-success is-md" onclick="openRegConfirm()">Register For This Course</button>' +
      '</div>' +
    '</div>' +
    '<p class="crs-section__note">* Seat counts change rapidly, these numbers may not reflect current seat availability.</p>';

    body.innerHTML =
      '<div class="crs-detail__main">' +
        '<h1 class="crs-detail__title">' + esc(c.id) + ' - ' + esc(c.title) + '</h1>' +
        '<h3 class="crs-detail__subhead">Course Description</h3>' +
        '<p class="crs-detail__desc">' + esc(c.description) + '</p>' +
        '<p class="crs-detail__term">' + esc(c.term) + ' - Semester</p>' +
        section +
      '</div>' +
      '<aside class="crs-rail">' +
        '<h3 class="crs-rail__title">Tuition &amp; Fees</h3>' +
        '<p class="crs-rail__price">' + money + '</p>' +
        '<p class="crs-rail__note">Tuition and mandatory fees only. Financial aid may apply. Please contact your local Financial Aid Office for details.</p>' +
        transfer +
        '<h4 class="crs-rail__label">LOCATION</h4><p class="crs-rail__value">' + esc(c.location) + '</p>' +
        '<h4 class="crs-rail__label">UNITS</h4><p class="crs-rail__value">' + esc(c.units) + '</p>' +
      '</aside>';

    if (typeof resolveTastyAssets === 'function') resolveTastyAssets(body);
  }


  /* ════════════════════════════════════════
     §11 · FLOW NAVIGATION (globals)
  ════════════════════════════════════════ */
  /* Demo entry chooser — each path-select tile sets a starting scenario,
     syncs the dev panel, and drops the viewer onto the dashboard for that case. */
  /* Path-select entry. origin = 'dashboard' (sign in → land on the dashboard, apply from
     the invite there) or 'email' (external invite → the mock email → sign-up/sign-in chain,
     past the dashboard). EVERY entry authenticates first (real login screen). */
  window.startEntry = function (scenario, origin) {
    entryOrigin = origin;
    var presets = {
      'open-enrollment':   { appState: 'open-enrollment', inviteSource: 'college'   },
      'invited-college':   { appState: 'invited',         inviteSource: 'college'   },
      'invited-counselor': { appState: 'invited',         inviteSource: 'counselor' },
    };
    var p = presets[scenario] || presets['open-enrollment'];
    DEV.appState = p.appState;          updateDevAxisButtons('appState', p.appState);
    DEV.inviteSource = p.inviteSource;  updateDevAxisButtons('inviteSource', p.inviteSource);
    DEV.entryPath = origin === 'email' ? 'email-invite' : 'college-url';
    updateDevAxisButtons('entryPath', DEV.entryPath);
    applyDevState();

    if (origin === 'email') {
      inviteFlow = true;
      showScreen('email-landing');   // mock email → email-entry → sign in / create account
    } else {
      inviteFlow = false;
      var le = document.getElementById('login-email');
      if (le) le.value = 'jcumberland@pioneerhs.edu';   // prefill the known account
      showScreen('login');           // authenticate, then completeSignIn() → dashboard
    }
  };

  /* Path 4 — no Parchment account. Two front doors (email invite / college website)
     both feed the same sign-up chain: -> email-entry -> account creation ->
     confirm email -> select HS -> DE app. */
  function setNoAccountState() {
    DEV.appState = 'invited';
    DEV.entryPath = 'email-invite';
    DEV.inviteSource = 'college';
    ['appState', 'entryPath', 'inviteSource'].forEach(function (a) { updateDevAxisButtons(a, DEV[a]); });
    applyDevState();
    inviteFlow = true;
  }
  window.startCollegeSite = function () { entryOrigin = 'email'; setNoAccountState(); showScreen('college-site'); };

  /* The mock email-landing inbox adapts to who invited — college vs counselor. */
  function updateEmailLanding() {
    var counselor = DEV.inviteSource === 'counselor';
    var from    = counselor ? 'Pioneer HS' : 'West Valley CC';
    var inviter = counselor ? 'Your high school admin at Pioneer High School' : 'West Valley Community College';
    var atName  = counselor ? 'Pioneer High School' : 'West Valley Community College';
    var terms   = '<strong>Engineering - Dual Enrollment Fall 2026</strong> and <strong>Math - Dual Enrollment Fall 2026</strong>';
    var setText = function (id, txt) { var el = document.getElementById(id); if (el) el.textContent = txt; };
    var setHtml = function (id, html) { var el = document.getElementById(id); if (el) el.innerHTML = html; };
    setText('eml-from', from);
    setText('eml-preview', 'Hi Jessica, ' + inviter + ' has invited you to apply…');
    setText('eml-reader-subject', 'You’re invited to apply for Dual Enrollment at ' + atName);
    setHtml('eml-greeting',
      '<p>Hi Jessica,</p>' +
      '<p><strong>' + inviter + '</strong> has invited you to apply for ' + terms + '.</p>' +
      '<p>To get started, click below to set up your Parchment account. If you have one already, you\'ll be directed to the login page.</p>'
    );
  }
  /* The college site's Apply CTA hands off to the Parchment sign-up. */
  window.startCollegeApply = function () { showScreen('email-entry'); };

  /* Apply Now goes straight into the flow. There used to be a confirmation screen in
     between — "You're applying for dual enrollment at X for Y", Continue — which restated
     what the invitation card the learner had just clicked already said, and cost a step to
     agree with itself. Removed Aug 11, 2026; this now does what its Continue button did. */
  window.startApplicationFlow = function () {
    advanceEntryFlow();
  };

  window.advanceEntryFlow = function () {
    // Open enrollment (learner-initiated): the college is NOT pre-known, so a
    // multi-exchange HS still gets the college-select step.
    collegeKnown = false;
    if (DEV.hsCount === 'multiple') {
      renderHsSelect();
      showScreen('select-hs');
    } else if (DEV.collegeCount === 'multiple') {
      renderCollegeSelect();
      showScreen('select-college');
    } else {
      goToApplication();
    }
  };

  window.advanceFromHsSelect = function () {
    // Selecting the high school creates the HS↔college member-box link, then the
    // learner proceeds to the DE application. Only open-enrollment learners whose HS
    // belongs to 2+ exchanges pick a college first; a college-invited learner skips it
    // (we already know the inviting institution).
    if (DEV.collegeCount === 'multiple' && !collegeKnown) {
      renderCollegeSelect();
      showScreen('select-college');
    } else {
      showScreen('de-app');
    }
  };

  window.advanceFromCollegeSelect = function () {
    showScreen('de-app');
  };

  /* Logged-in learner applying from a college invite: pick the high school
     (creates the member-box connection) -> DE application. No account creation —
     account creation belongs ONLY to the no-account email-landing path (Path 4). */
  window.applyFromCollegeInvite = function () {
    inviteFlow = false;
    // A college invited the learner — the institution is known, so college-select is
    // skipped downstream (advanceFromHsSelect). Pin the inviting college.
    collegeKnown = true;
    selectedCollege = 'wvcc';
    renderHsSelect();
    showScreen('select-hs');
  };

  /* In-app launch screens (open enrollment, counselor invite) — a logged-in
     learner goes straight to the DE application. */
  /* Show/hide the DE application's guardian section to match the network's gates. Hidden
     sections have their inputs neutralized (disabled + data-validate off) so validateForm()
     won't block submit on fields we removed. The High School Admin section left the form
     entirely on Aug 5, 2026 (approval auto-routes to the school), so there's nothing to gate
     for counselorApproval here any more. */
  function applyNetworkGatesToForm() {
    [['de-app-guardian-section', guardianOn()]]
      .forEach(function (pair) {
        var sec = document.getElementById(pair[0]);
        if (!sec) return;
        var on = pair[1];
        sec.style.display = on ? '' : 'none';
        Array.prototype.forEach.call(sec.querySelectorAll('input'), function (inp) {
          if (!on) {
            if (inp.getAttribute('data-validate') !== null && inp.dataset.origValidate === undefined) {
              inp.dataset.origValidate = inp.getAttribute('data-validate');
            }
            inp.setAttribute('data-validate', 'off');
            inp.disabled = true;
          } else {
            if (inp.dataset.origValidate !== undefined) inp.setAttribute('data-validate', inp.dataset.origValidate);
            inp.disabled = false;
          }
        });
      });
  }
  window.applyNetworkGatesToForm = applyNetworkGatesToForm;

  /* ─── Entry points → the path-select tiles ───
     The demo chooser's four tiles ARE the network's four entry points, one each:
       Apply on your own → dashboard · Invited by your college → heInvite
       High school invite → hsInvite · College website "Apply" → selfUrl
     A switched-off entry point shows its tile as UNAVAILABLE rather than hiding it, so the
     effect of the configuration is visible and a presenter can still see the path exists.
     (`selfUrl` is OFF in the DENetwork defaults, matching the Configuration Explorer, so the
     college-website tile starts unavailable until someone turns it on.) */
  var ENTRY_TILE_REASON = 'Turned off for this network';
  function entryOn(key) {
    return (window.DENetwork ? window.DENetwork.get(key) : true) !== false;
  }
  function applyEntryPointsToPathSelect() {
    var tiles = document.querySelectorAll('#screen-path-select [data-entry]');
    Array.prototype.forEach.call(tiles, function (tile) {
      var on = entryOn(tile.getAttribute('data-entry'));
      tile.classList.toggle('is-unavailable', !on);
      // The tile is either a <button> itself or a wrapper holding two origin buttons.
      var btns = tile.tagName === 'BUTTON' ? [tile] : tile.querySelectorAll('button');
      Array.prototype.forEach.call(btns, function (b) { b.disabled = !on; });
      if (tile.tagName === 'BUTTON') tile.setAttribute('aria-disabled', on ? 'false' : 'true');
      var note = tile.querySelector('.path-select-tile-off');
      if (!on && !note) {
        note = document.createElement('span');
        note.className = 'path-select-tile-off';
        note.textContent = ENTRY_TILE_REASON;
        tile.appendChild(note);
      } else if (on && note) {
        note.parentNode.removeChild(note);
      }
    });
  }
  window.applyEntryPointsToPathSelect = applyEntryPointsToPathSelect;

  window.goToApplication = function () {
    showScreen('de-app');
    applyNetworkGatesToForm();
  };

  window.submitDeApp = function () {
    var form = document.getElementById('de-app-form');
    if (form && typeof validateForm === 'function' && !validateForm(form)) return;
    // Submitting moves the application into its in-progress state so the confirm
    // tracker AND the dashboard the learner lands on both reflect what they just did
    // (not the stale invite/open-enrollment state). A counselor invite auto-completes
    // counselor approval, so only parent consent remains; college / open enrollment
    // owe both. Mirrors registerCourses bumping DEV.appState before re-render.
    // Post-submit state = whichever gates this network still owes. Gates switched off drop
    // out entirely; nothing owed → straight to college review. Being invited BY the high
    // school does not discharge its approval — the invitation is not the review.
    var owesGuardian  = guardianOn();
    var owesCounselor = counselorOn();
    var postState = owesGuardian && owesCounselor ? 'dual-pending'
                  : owesGuardian                  ? 'parent-consent-pending'
                  : owesCounselor                 ? 'counselor-pending'
                  :                                 'college-review';
    DEV.appState = postState;
    updateDevAxisButtons('appState', postState);
    applyDevState();
    renderAerConfirm();
    showScreen('aer-confirm');
  };

  window.selectHs = function (id) {
    selectedHsId = id;
    renderHsSelect();
    // No Continue button in this design — selecting a school proceeds.
    advanceFromHsSelect();
  };

  window.selectCollege = function (id) {
    selectedCollege = id;
    renderCollegeSelect();
    // No Continue button in this design — selecting a college proceeds (mirrors selectHs).
    advanceFromCollegeSelect();
  };

  /* Email-invite flow: the email-invite landing collects the learner's email,
     then routes to account creation (#screen-aer). */
  /* Registered Parchment emails (demo). If the entered email already has an account
     we "find" it and route to sign-in; any other email = no account -> create one. */
  var KNOWN_ACCOUNTS = { 'jcumberland@pioneerhs.edu': true };

  window.fillEmail = function (v) {
    var i = document.getElementById('email-entry-input');
    if (i) i.value = v;
  };

  window.submitEmailEntry = function () {
    var form = document.getElementById('email-entry-form');
    if (form && typeof validateForm === 'function' && !validateForm(form)) return;
    var input = document.getElementById('email-entry-input');
    var email = ((input && input.value) || '').trim().toLowerCase();
    if (KNOWN_ACCOUNTS[email]) {
      var le = document.getElementById('login-email');
      if (le && input) le.value = input.value;   // carry the email into sign-in
      showScreen('login');                        // found an account -> sign in
    } else {
      var addr = document.getElementById('aer-email-addr');
      if (addr && input && input.value.trim()) addr.textContent = input.value.trim();  // reflect the email being registered
      showScreen('aer');                          // no account -> create one
    }
  };

  /* Sign In on the Parchment login -> the logged-in learner dashboard. They keep
     their college-invite state, so the dashboard shows the invite (Path 3). */
  /* Sign In routes by entry origin: dashboard-origin → the dashboard (invite shows there,
     learner applies from it); email/website-origin → straight into the application, past
     the dashboard. */
  window.completeSignIn = function () {
    if (entryOrigin === 'email') { routeToApplication(); return; }
    inviteFlow = false;
    showScreen('dashboard');
  };

  /* Email/website-origin post-auth (sign-in OR account creation) → the application.
     Counselor invite knows the HS (skip select); college / website must select one. */
  function routeToApplication() {
    inviteFlow = false;
    if (DEV.inviteSource === 'counselor') {
      selectedHsId = 'pioneer';        // counselor's HS is known
      showScreen('de-app');
    } else {
      // A college invite already knows the institution → skip college-select; an open
      // college-website discovery does not.
      collegeKnown = (DEV.inviteSource === 'college');
      renderHsSelect();
      showScreen('select-hs');
    }
  }

  /* Counselor invite on the dashboard → Apply Now: HS is known, skip selection. */
  window.applyFromCounselorInvite = function () {
    inviteFlow = false;
    selectedHsId = 'pioneer';
    showScreen('de-app');
  };

  /* Email-invite flow: post account-creation email verification.
     Confirms the code, then routes to high-school selection. */
  window.submitConfirmEmail = function () {
    routeToApplication();   // counselor skips HS select; college / website selects one
  };

  window.submitAerForm = function () {
    var form = document.getElementById('aer-form');
    if (form && typeof validateForm === 'function' && !validateForm(form)) return;
    // Account creation only ever happens inside the email-invite journey, so
    // after creating the account we go to email confirmation (not the submitted
    // screen — that comes later, after the DE application is submitted).
    showScreen('confirm-email');
  };

  window.togglePw = function (btn) {
    var wrap = btn.closest('.aer-pw');
    if (!wrap) return;
    var input = wrap.querySelector('.aer-pw__input');
    if (!input) return;
    var icon = btn.querySelector('[data-tasty-icon]');
    var showing = input.type === 'text';
    input.type = showing ? 'password' : 'text';
    var subject = (btn.getAttribute('aria-label') || 'Show password').replace(/^(Show|Hide)\s+/i, '');
    btn.setAttribute('aria-label', (showing ? 'Show ' : 'Hide ') + subject);
    if (icon) {
      icon.setAttribute('data-tasty-icon', showing ? 'visible' : 'notvisible');
      if (typeof resolveTastyAssets === 'function') resolveTastyAssets(btn);
    }
  };

  /* Canonical Tasty checkbox toggle (the box shows its check via is-checked). */
  window.toggleCheck = function (el) {
    el.classList.toggle('is-checked');
  };

  window.showCancelConfirm = function () {
    var overlay = document.getElementById('modal-cancel-overlay');
    if (overlay) overlay.classList.add('open');
  };

  window.confirmCancel = function () {
    var overlay = document.getElementById('modal-cancel-overlay');
    if (overlay) overlay.classList.remove('open');
    showScreen('dashboard');
    if (typeof showToast === 'function') showToast('Application cancelled', 'config');
  };

  /* ════════════════════════════════════════
     Notification actions — Resend / Change Email
  ════════════════════════════════════════ */

  /* Re-render every surface that prints a NOTIFY record. Only the dashboard and the DE tab
     carry them, and both are cheap full re-renders, so restamp and redraw both. */
  function refreshNotifySurfaces() {
    renderDashboard();
    renderDeTab();
  }

  /* Resend restamps the sent line off the real clock (so the date visibly moves) and names
     the recipient's role in the toast — "resent" alone left the learner guessing who got it. */
  window.resendNotification = function (key) {
    var n = NOTIFY[key];
    if (!n) return;
    n.sent = nowStamp();
    refreshNotifySurfaces();
    if (typeof showToast === 'function') showToast('Notification resent to your ' + n.noun + '.', 'success');
  };

  /* ─── Change Email modal (Figma 4.3.2.1 · 15467:198298) ───
     One modal serves both parties; openChangeEmail(key) retitles it and points Save at that
     NOTIFY record. Save stays disabled until the field holds a plausible address. */
  var changeEmailKey = null;

  window.openChangeEmail = function (key) {
    var n = NOTIFY[key];
    /* Unaddressable records (a school queue, no learner-supplied address) have nothing to
       change — no card offers the action, and this refuses it if one ever did. */
    if (!n || !n.email) return;
    changeEmailKey = key;
    var overlay = document.getElementById('modal-change-email');
    if (!overlay) return;
    document.getElementById('chg-email-title').textContent   = n.title;
    document.getElementById('chg-email-current').textContent = n.email;
    var input = document.getElementById('chg-email-input');
    input.value = '';
    input.parentNode.parentNode.classList.remove('is-error');
    validateChangeEmail();
    overlay.classList.add('open');
    input.focus();
  };

  window.closeChangeEmail = function () {
    var overlay = document.getElementById('modal-change-email');
    if (overlay) overlay.classList.remove('open');
    changeEmailKey = null;
  };

  function changeEmailValue() {
    var input = document.getElementById('chg-email-input');
    return input ? input.value.trim() : '';
  }

  /* Same shape check the AER/login fields use: something@something.tld */
  function validateChangeEmail() {
    var ok = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(changeEmailValue());
    var save = document.getElementById('chg-email-save');
    if (save) save.disabled = !ok;
    return ok;
  }
  window.validateChangeEmail = validateChangeEmail;

  /* Save rewrites the address AND restamps `sent` — the modal's own copy promises a fresh
     notification goes to the new address, so the sent line has to move with it. */
  window.saveChangeEmail = function () {
    if (!changeEmailKey || !validateChangeEmail()) return;
    var n = NOTIFY[changeEmailKey];
    n.email = changeEmailValue();
    n.sent  = nowStamp();
    var noun = n.noun;
    closeChangeEmail();
    refreshNotifySurfaces();
    if (typeof showToast === 'function') showToast('Email updated. Notification sent to your ' + noun + '.', 'success');
  };

  window.setCoursePerPage = function (n) {
    coursePag.perPage = parseInt(n, 10) || 10;
    coursePag.page = 1;
    renderCourseList();
  };

  window.gotoCoursePage = function (n) {
    var pages = Math.max(1, Math.ceil(COURSES.length / coursePag.perPage));
    coursePag.page = Math.min(Math.max(1, n), pages);
    renderCourseList();
  };

  window.viewCourse = function (id) {
    currentCourse = COURSES.find(function (c) { return c.id === id; }) || null;
    if (!currentCourse) return;
    renderCourseDetail();
    showScreen('course-detail');
  };

  /* Select goes to the same place as View Details. Figma gives the row two
     buttons but only one destination — the details page is where you register,
     so "Select" cannot skip it without skipping the confirmation too. */
  window.selectCourse = function (id) { window.viewCourse(id); };

  window.openRegConfirm = function () {
    if (!currentCourse) return;
    var t = document.getElementById('reg-confirm-course');
    if (t) t.textContent = currentCourse.id + ' - ' + currentCourse.title + '.';
    var o = document.getElementById('reg-confirm-overlay');
    if (o) o.classList.add('open');
  };

  window.closeRegConfirm = function () {
    var o = document.getElementById('reg-confirm-overlay');
    if (o) o.classList.remove('open');
  };

  /* Confirm → blocking "Processing Enrollment" → Registered.
     Figma says the real thing can take up to five minutes; that copy is a product
     truth about SIS round-trips, not a prototype instruction. Hold it long enough
     to read that eligibility is being checked, not long enough to lose an
     unmoderated participant. */
  window.confirmRegistration = function () {
    window.closeRegConfirm();
    var proc = document.getElementById('reg-processing-overlay');
    if (proc) proc.classList.add('open');
    setTimeout(function () {
      if (proc) proc.classList.remove('open');
      registeredCourse = currentCourse;
      DEV.appState = 'registered';
      updateDevAxisButtons('appState', 'registered');
      applyDevState();
      renderRegisteredScreen();
      showScreen('registered');
    }, 2500);
  };

  /* Kept: the dev drawer and older deep links still call this. Registers the
     course currently in view, or the canonical MATH1D if none was chosen. */
  window.registerCourses = function () {
    if (!currentCourse) currentCourse = COURSES.find(function (c) { return c.id === 'MATH1D'; });
    window.confirmRegistration();
  };


  /* ════════════════════════════════════════
     §12 · DEV PANEL
  ════════════════════════════════════════ */
  /* Bridge for the shared DevDrawer (scripts/dev-drawer-config.js) — the panel is now the
     vanilla drawer (../_shared/dev-drawer/dev-drawer.js), so expose the IIFE-scoped setters. */
  function initDevPanel() {
    window.__dev = {
      // Each setter ends with a sync so a drawer flip lands in the address bar and the
      // Share link panel stays honest about what it is offering.
      setAxis: function (axis, val) {
        DEV[axis] = val; updateDevAxisButtons(axis, val); applyDevState();
        if (window.DELink) window.DELink.sync();
      },
      setTheme: function (t) {
        if (typeof window.setTheme === 'function') window.setTheme(t);
        else document.documentElement.dataset.theme = t;
        if (window.DELink) window.DELink.sync();
      },
      // Exchange-network entry points. Only the path-select chooser reacts (the four tiles
      // ARE the four entry points); nothing downstream depends on them.
      setEntry: function (key, on) {
        if (window.DENetwork) window.DENetwork.set(key, on);
        applyEntryPointsToPathSelect();
        if (window.DELink) window.DELink.sync();
      },
      // Exchange-network approval gates. Flip a gate, keep appState valid, re-render.
      setGate: function (key, on) {
        if (window.DENetwork) window.DENetwork.set(key, on);
        // A counselor invite makes no sense once counselor approval is off.
        if (!counselorOn() && DEV.inviteSource === 'counselor') {
          DEV.inviteSource = 'college';
          updateDevAxisButtons('inviteSource', 'college');
        }
        DEV.appState = coerceAppStateForGates(DEV.appState);
        updateDevAxisButtons('appState', DEV.appState);
        applyNetworkGatesToForm();
        applyDevState();
        // After the coercion, not on DENetwork's own notify: that fires from set() above,
        // before appState and inviteSource have been made valid again.
        if (window.DELink) window.DELink.sync();
      }
    };
  }

  /* Keep the demo out of impossible states: if a gate is off, any appState that
     waits on that gate falls back to the next meaningful state. */
  function coerceAppStateForGates(s) {
    if (!guardianOn() && (s === 'parent-consent-pending' || s === 'dual-pending')) {
      s = counselorOn() ? 'counselor-pending' : 'college-review';
    }
    if (!counselorOn() && (s === 'counselor-pending' || s === 'dual-pending' || s === 'denied-counselor')) {
      s = guardianOn() ? 'parent-consent-pending' : 'college-review';
    }
    // dual-pending needs BOTH gates; collapse to the single active one.
    if (s === 'dual-pending' && !(guardianOn() && counselorOn())) {
      s = guardianOn() ? 'parent-consent-pending' : counselorOn() ? 'counselor-pending' : 'college-review';
    }
    return s;
  }

  function updateDevAxisButtons(axis, val) {
    document.querySelectorAll('[data-axis="' + axis + '"]').forEach(function (b) {
      b.classList.toggle('active', b.dataset.val === val);
    });
  }

  function applyDevState() {
    renderDashboard();
    renderDeTab();
  }

  /* ════════════════════════════════════════
     §13 · DEV HELPERS — one-click fill the account form + demo-email injection
  ════════════════════════════════════════ */
  /* Click-to-fill (demo) — a click anywhere inside a registered form (except a real
     interactive control) runs its filler, so a presenter can fill the whole form with
     one click instead of typing. A faint pointer cursor is the only hint; the audience
     barely notices. Wired per screen from showScreen. */
  var _clickFill = { el: null, handler: null };
  function enableClickFill(container, fillFn) {
    disableClickFill();
    if (!container || typeof fillFn !== 'function') return;
    container.classList.add('demo-fill-soft');
    var handler = function (e) {
      // let real controls behave normally (type in a field, draw a signature, tick a box)
      if (e.target.closest('button, a, [role="button"], input, select, textarea, canvas, .tasty-checkbox')) return;
      try { fillFn(); } catch (err) { if (window.console) console.warn('[click-fill]', err); }
    };
    container.addEventListener('click', handler, true);
    _clickFill = { el: container, handler: handler };
  }
  function disableClickFill() {
    if (!_clickFill.el) return;
    _clickFill.el.classList.remove('demo-fill-soft');
    _clickFill.el.removeEventListener('click', _clickFill.handler, true);
    _clickFill = { el: null, handler: null };
  }

  /* Fill the "Create your account for dual enrollment" form (#screen-aer)
     with demo data so a presenter doesn't have to type during a walkthrough. */
  window.devFillAccountForm = function () {
    var form = document.getElementById('aer-form');
    if (!form) return;
    if (typeof showScreen === 'function') showScreen('aer');   // surface the form being filled
    var byPh = function (ph) { return form.querySelector('[placeholder="' + ph + '"]'); };
    var set  = function (el, v) { if (el) el.value = v; };
    // Section 1 — personal information
    set(byPh('First name'),  'Jessica');
    set(byPh('Middle name'), 'Marie');
    set(byPh('Last name'),   'Cumberland');
    set(form.querySelector('.is-dob select'), '9');         // Month → September
    set(document.getElementById('aer-dob-day'),  '12');     // Day
    set(document.getElementById('aer-dob-year'), '2008');   // Year
    // Section 2 — contact information
    set(form.querySelector('.tasty-input-phone__number'), '(480) 555-0142');
    set(byPh('Address line 1'), '742 Mesquite Drive');
    set(byPh('Address line 2'), 'Apt 4');
    set(byPh('City'), 'Scottsdale');
    set(byPh('Postal code'), '85005');
    form.querySelectorAll('select').forEach(function (s) {
      if (s.querySelector('option[value="US"]')) s.value = 'US';   // Country
      if (s.querySelector('option[value="AZ"]')) s.value = 'AZ';   // State
    });
    // Section 3 — password
    form.querySelectorAll('.aer-pw__input').forEach(function (p) { p.value = 'Parchment123!'; });
    // Run the kit validator on each field so they read clean (green) not red
    if (typeof window.validateField === 'function') {
      form.querySelectorAll('.tasty-field').forEach(function (f) { window.validateField(f); });
    }
    if (typeof showToast === 'function') showToast('Account form filled', 'success');
  };

  /* Draw a plausible cursive squiggle into the DE-application signature pad.
     Only works while #screen-de-app is visible (canvas must be sized first). */
  function devDrawSignature() {
    var canvas = document.getElementById('sig-pad');
    if (!canvas || !canvas.width) return;
    var ctx = canvas.getContext('2d');
    var w = canvas.width, h = canvas.height;
    ctx.clearRect(0, 0, w, h);
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue('--body-font-strong').trim() || '#222';
    var x = w * 0.10, y = h * 0.62, s = Math.min(w / 320, 1);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.bezierCurveTo(x + 24 * s, y - 46 * s, x + 46 * s, y + 22 * s, x + 70 * s, y - 12 * s);
    ctx.bezierCurveTo(x + 92 * s, y - 44 * s, x + 116 * s, y + 30 * s, x + 150 * s, y - 6 * s);
    ctx.bezierCurveTo(x + 176 * s, y - 34 * s, x + 200 * s, y + 24 * s, x + 236 * s, y - 8 * s);
    ctx.stroke();
  }

  /* Fill the Dual Enrollment Application form (#screen-de-app). Targets fields by
     their label text since several inputs share placeholders (First/Last Name).
     The top block (name/address/phone) ships pre-filled, so this fills the rest. */
  window.devFillDeApp = function () {
    var form = document.getElementById('de-app-form');
    if (!form) return;
    if (typeof showScreen === 'function') showScreen('de-app');   // sizes the signature canvas too
    var fieldByLabel = function (text) {
      var fields = form.querySelectorAll('.tasty-field');
      text = text.toLowerCase();
      for (var i = 0; i < fields.length; i++) {
        var lbl = fields[i].querySelector('.tasty-field__label');
        if (lbl && lbl.textContent.toLowerCase().indexOf(text) !== -1) return fields[i];
      }
      return null;
    };
    var fill = function (label, val) {
      var f = fieldByLabel(label); if (!f) return;
      var input = f.querySelector('input, select'); if (input) input.value = val;
    };
    // Student fields that ship empty. Address line 2 stays blank on purpose — most addresses
    // don't have one, so a filled value would be the unusual case.
    fill('Social Security Number', '123456789');
    fill('State Student ID', 'AZ-10293847');
    fill('Current GPA', '3.85');
    // Parent / legal guardian
    fill('Parent / Guardian First Name', 'Diana');
    fill('Parent / Guardian Last Name', 'Cumberland');
    fill('Parent / Guardian Email', 'diana.cumberland@email.com');
    fill('Parent / Guardian Phone', '(480) 555-0188');
    // Learner consent — typed signature (first / middle / last), drawn signature, certs
    var sigCols = form.querySelector('#sig-name-cols');
    if (sigCols) {
      var sigInputs = sigCols.querySelectorAll('input');
      ['Jessica', 'Marie', 'Cumberland'].forEach(function (v, i) { if (sigInputs[i]) sigInputs[i].value = v; });
    }
    form.querySelectorAll('.cert-check').forEach(function (c) { c.classList.add('is-checked'); });
    devDrawSignature();
    // Every field now carries a single input (the signature name trio was split into
    // three individual .tasty-field), so the kit validator runs cleanly on all of them.
    if (typeof window.validateField === 'function') {
      form.querySelectorAll('.tasty-field').forEach(function (f) { window.validateField(f); });
    }
    if (typeof showToast === 'function') showToast('DE application filled', 'success');
  };

  /* Demo-email helpers — the dev panel carries a copyable/insertable email so the
     no-account paths (email sign-up / college website) don't need live typing. */
  function devEmailValue() {
    var i = document.getElementById('dev-email-input');
    return ((i && i.value) || '').trim();
  }
  window.devSetEmail = function (v) {
    var i = document.getElementById('dev-email-input');
    if (i) i.value = v;
  };
  function devLegacyCopy(v) {
    var ta = document.createElement('textarea');
    ta.value = v; ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.focus(); ta.select();
    try { document.execCommand('copy'); } catch (e) { /* no-op */ }
    document.body.removeChild(ta);
  }
  window.devCopyEmail = function () {
    var v = devEmailValue();
    if (!v) return;
    var done = function () { if (typeof showToast === 'function') showToast('Copied ' + v, 'success'); };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(v).then(done, function () { devLegacyCopy(v); done(); });
    } else { devLegacyCopy(v); done(); }
  };
  /* Drop the email straight into every place a learner would type it:
     the no-account email-entry field, the sign-in field, and the account-screen header. */
  window.devInsertEmail = function () {
    var v = devEmailValue();
    if (!v) return;
    var entry = document.getElementById('email-entry-input');
    if (entry) entry.value = v;
    var login = document.getElementById('login-email');
    if (login) login.value = v;
    var addr = document.querySelector('#screen-aer .aer-email__addr');
    if (addr) addr.textContent = v;
    if (typeof showToast === 'function') showToast('Email inserted', 'success');
  };

  /* ════════════════════════════════════════
     §14 · showScreen — swap active screen
     (replaces the minimal stub in starter)
  ════════════════════════════════════════ */
  window.showScreen = function (id) {
    document.querySelectorAll('.screen').forEach(function (s) { s.classList.remove('active'); });
    var el = document.getElementById('screen-' + id) || document.getElementById(id);
    if (el) el.classList.add('active');
    // Re-render dynamic screens when navigating to them
    if (id === 'dashboard') renderDashboard();
    if (id === 'de-tab')    renderDeTab();
    if (id === 'courses')   renderCourseList();
    if (id === 'course-detail') renderCourseDetail();
    if (id === 'de-app')    { initSigPad(); applyNetworkGatesToForm(); }
    if (id === 'email-landing') updateEmailLanding();
    // Click-to-fill: click anywhere in these forms to fill them (demo convenience).
    if (id === 'aer')         enableClickFill(document.getElementById('aer-form'), window.devFillAccountForm);
    else if (id === 'de-app') enableClickFill(document.getElementById('de-app-form'), window.devFillDeApp);
    else                      disableClickFill();
    // Every navigation in this prototype funnels through here, including viewCourse and
    // startCollegeSite, so one sync covers the address bar for all of them.
    if (window.DELink) window.DELink.sync();
  };

  /* ════════════════════════════════════════
     §15 · SIGNATURE PAD (DE application learner consent)
  ════════════════════════════════════════ */
  var sigState = { bound: false, drawing: false };
  function initSigPad() {
    var canvas = document.getElementById('sig-pad');
    if (!canvas) return;
    // Size the backing store to the displayed box (must run while visible).
    var rect = canvas.getBoundingClientRect();
    if (rect.width) { canvas.width = rect.width; canvas.height = rect.height; }
    var ctx = canvas.getContext('2d');
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
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

  /* ════════════════════════════════════════
     §16 · TOAST (from starter — keep local copy)
  ════════════════════════════════════════ */
  window.showToast = function (message, context) {
    var KIND = { config: 'config', success: 'success', warning: 'warning', urgent: 'error', error: 'error', bold: 'primary', info: 'config' };
    window.tastyToast(message, KIND[context] || 'config');
  };

  /* ─── Escape helper ─── */
  function esc(s) {
    if (s == null) return '';
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
  window.escapeHtml = esc;

  /* ════════════════════════════════════════
     §17 · BOOT
  ════════════════════════════════════════ */
  /* ─── Populate AER date-of-birth Day (1–31) + Year selects ─── */
  function populateDob() {
    var day = document.getElementById('aer-dob-day');
    if (day && day.options.length <= 1) {
      var dayOpts = '';
      for (var d = 1; d <= 31; d++) { dayOpts += '<option value="' + d + '">' + d + '</option>'; }
      day.insertAdjacentHTML('beforeend', dayOpts);
    }
    var year = document.getElementById('aer-dob-year');
    if (year && year.options.length <= 1) {
      var nowYr = new Date().getFullYear();
      var yearOpts = '';
      for (var y = nowYr; y >= nowYr - 100; y--) { yearOpts += '<option value="' + y + '">' + y + '</option>'; }
      year.insertAdjacentHTML('beforeend', yearOpts);
    }
  }

  /* ─── Entry-point default for THIS prototype ───
     The learner prototype exists to demonstrate every way a learner can start, so all four
     entry points default ON here. The shared DENetwork ships `selfUrl` OFF (matching the
     Configuration Explorer), which left the college-website tile unavailable on boot.
     Only applied when there is NO explicit configuration to respect — `DENetwork.hydrate()`
     takes ?net= first, then the sessionStorage copy that carries a config between prototypes
     in one sitting. Overriding either would undo a choice someone actually made. */
  function hasExplicitNetworkConfig() {
    if (/[?&]net=/.test(location.search || '')) return true;
    try { return !!(window.sessionStorage && window.sessionStorage.getItem('de-network-config')); }
    catch (e) { return false; }   // file:// or storage blocked
  }
  function applyLearnerEntryDefaults() {
    if (!window.DENetwork || hasExplicitNetworkConfig()) return;
    DENetwork.setMany({ heInvite: true, hsInvite: true, selfUrl: true, dashboard: true });
  }

  /* ════════════════════════════════════════
     §17 · DEEP LINK — this prototype's URL vocabulary
     Registered from inside the IIFE because DEV, deTab, currentCourse and COURSES are all
     private to it, and a param's read/apply closures have to see them. The module itself
     (../_shared/deeplink/deeplink.js) knows nothing about screens or buckets — everything
     specific to the learner lives here.
  ════════════════════════════════════════ */
  if (window.DELink) {
    /* Accepted on the way in → the internal showScreen id. Internal ids are accepted too,
       because they are already all over the inline onclick attrs and the drawer's nav rows. */
    var SCREEN_IN = {
      'start': 'path-select', 'path-select': 'path-select',
      'dashboard': 'dashboard',
      'dual-enrollment': 'de-tab', 'de-tab': 'de-tab',
      'select-hs': 'select-hs', 'select-college': 'select-college',
      'college-site': 'college-site',
      'inbox': 'email-landing', 'email-landing': 'email-landing',
      'email-entry': 'email-entry',
      'login': 'login',
      'create-account': 'aer', 'aer': 'aer', 'signup': 'aer',
      'confirm-email': 'confirm-email',
      'apply': 'de-app', 'de-app': 'de-app',
      'submitted': 'aer-confirm', 'aer-confirm': 'aer-confirm',
      'courses': 'courses',
      'course': 'course-detail', 'course-detail': 'course-detail',
      'registered': 'registered'
    };
    /* Internal id → the one friendly slug sync() writes. The two picker screens map back to
       `entry` because that is the only one of the three a link can actually re-enter. */
    var SCREEN_OUT = {
      'path-select': 'start', 'dashboard': 'dashboard', 'de-tab': 'dual-enrollment',
      'select-hs': 'select-hs', 'select-college': 'select-college',
      'college-site': 'college-site', 'email-landing': 'inbox', 'email-entry': 'email-entry',
      'login': 'login', 'aer': 'create-account', 'confirm-email': 'confirm-email',
      'de-app': 'apply', 'aer-confirm': 'submitted', 'courses': 'courses',
      'course-detail': 'course', 'registered': 'registered'
    };
    /* The bucket the learner calls "Registered" is `enrolled` internally, and "Closed" is
       `closed`. The URL uses the words on the tabs. */
    var SEG_IN = { 'in-progress': 'in-progress', 'inprogress': 'in-progress',
                   'registered': 'enrolled', 'enrolled': 'enrolled',
                   'closed': 'closed', 'denied': 'closed' };
    var SEG_OUT = { 'in-progress': 'in-progress', 'enrolled': 'registered', 'closed': 'closed' };

    window.DELink.register({
      id: 'learner-application',
      carryNet: true,
      order: ['state', 'mix', 'invite', 'path', 'schools', 'colleges', 'reapply',
              'theme', 'course', 'screen', 'seg'],
      params: {

        /* ── phase 'state' — written into DEV before the first render ────────────────
           renderAerConfirm() reads DEV.appState exactly once on boot and is never
           re-rendered except by submitDeApp, so a state applied any later is stale. */
        state: { phase: 'state', 'default': 'parent-consent-pending',
          values: ['invited', 'open-enrollment', 'parent-consent-pending', 'counselor-pending',
                   'dual-pending', 'college-review', 'approved', 'registered',
                   'registered-in-session', 'denied-counselor', 'denied-college', 'cancelled'],
          alias: { guardian: 'parent-consent-pending', counselor: 'counselor-pending',
                   review: 'college-review' },
          read:  function () { return DEV.appState; },
          apply: function (v) { DEV.appState = v; return true; } },

        mix: { phase: 'state', values: ['single', 'multi'], 'default': 'single',
          alias: { '1': 'single', one: 'single', many: 'multi', multiple: 'multi' },
          read:  function () { return DEV.appMix; },
          apply: function (v) { DEV.appMix = v; return true; } },

        invite: { phase: 'state', values: ['college', 'counselor'], 'default': 'college',
          alias: { he: 'college', hs: 'counselor' },
          read:  function () { return DEV.inviteSource; },
          apply: function (v) { DEV.inviteSource = v; return true; } },

        path: { phase: 'state', values: ['college-url', 'email-invite'], 'default': 'college-url',
          alias: { url: 'college-url', college: 'college-url',
                   email: 'email-invite', invite: 'email-invite' },
          read:  function () { return DEV.entryPath; },
          apply: function (v) { DEV.entryPath = v; return true; } },

        schools: { phase: 'state', values: ['1', 'many'], 'default': '1',
          alias: { single: '1', one: '1', 'false': '1', '0': '1', off: '1',
                   multiple: 'many', multi: 'many', 'true': 'many', on: 'many' },
          read:  function () { return DEV.hsCount === 'multiple' ? 'many' : '1'; },
          apply: function (v) { DEV.hsCount = (v === 'many') ? 'multiple' : 'single'; return true; } },

        colleges: { phase: 'state', values: ['1', 'many'], 'default': '1',
          alias: { single: '1', one: '1', multiple: 'many', multi: 'many' },
          read:  function () { return DEV.collegeCount === 'multiple' ? 'many' : '1'; },
          apply: function (v) { DEV.collegeCount = (v === 'many') ? 'multiple' : 'single'; return true; } },

        /* Not BOOL_ALIAS: that canonicalises to '1'/'0', which this param's own vocabulary
           ('on'/'off') would then reject, so reapply=no silently did nothing. */
        reapply: { phase: 'state', values: ['on', 'off'], 'default': 'on',
          alias: { '1': 'on', 'true': 'on', yes: 'on', '0': 'off', 'false': 'off', no: 'off' },
          read:  function () { return DEV.reapply; },
          apply: function (v) { DEV.reapply = (v === '1' || v === 'on') ? 'on' : 'off'; return true; } },

        /* ── phase 'view' — after initDevPanel(), so __dev and every fixture exist ── */
        theme: { phase: 'view', values: ['default', 'light', 'white', 'dark', 'contrast'],
          'default': 'light',
          read:  function () { return document.documentElement.getAttribute('data-theme') || 'light'; },
          apply: function (v) { window.__dev.setTheme(v);
                                return document.documentElement.getAttribute('data-theme') === v; } },

        /* Must precede `screen`: viewCourse renders AND navigates to course-detail, and it is
           also what makes screen=registered show a course rather than "No course registered." */
        course: { phase: 'view', values: null, 'default': null,
          /* The canvas renders screen=course, which falls back to the list without one. */
          sample: function () { return (COURSES && COURSES[0]) ? COURSES[0].id : null; },
          read:  function () { return currentCourse ? currentCourse.id : null; },
          apply: function (v) { window.viewCourse(String(v).trim().toUpperCase());
                                return !!currentCourse; } },

        screen: { phase: 'view', values: Object.keys(SCREEN_IN), 'default': null,
          fallback: 'dashboard',
          read:  function () {
            var el = document.querySelector('.screen.active');
            if (!el) return null;
            var id = el.id.replace(/^screen-/, '');
            return SCREEN_OUT[id] || null;   /* an unmapped screen simply drops out of the URL */
          },
          apply: function (v) {
            var id = SCREEN_IN[v];
            if (!id) return false;
            /* #entry-mount, #hs-select-list and #college-select-list are empty in the markup
               and showScreen does not fill them, so each picker is rendered by the function
               that owns it before we navigate. startApplicationFlow does that for the entry
               chooser; the two member-select screens have their own renderers. */
            if (id === 'select-hs')      { renderHsSelect();      window.showScreen('select-hs');      return true; }
            if (id === 'select-college') { renderCollegeSelect(); window.showScreen('select-college'); return true; }
            /* renderCourseDetail early-returns on a null currentCourse, so without a course=
               the honest destination is the list. */
            if (id === 'course-detail') {
              /* Reported as a rejection, not a success: without a course this lands on the
                 list, which is what returning false produces via the fallback anyway. Saying
                 so lets surfaces that render screens cold know to hand it a course. */
              if (!currentCourse) return false;
              window.showScreen('course-detail'); return true;
            }
            /* registered renders once on boot, before `course` has run. */
            if (id === 'registered') {
              window.renderRegisteredScreen(); window.showScreen('registered'); return true;
            }
            window.showScreen(id);
            var el = document.getElementById('screen-' + id);
            return !!(el && el.classList.contains('active'));
          } },

        /* Applied last. renderDeTab falls back to the first occupied bucket, so reading deTab
           back afterwards is what tells the truth about whether the link's bucket exists.
           Pair any seg= link with mix=multi: with one application the NavToggle never renders. */
        seg: { phase: 'view', values: ['in-progress', 'enrolled', 'closed'],
          'default': 'in-progress', alias: SEG_IN,
          read:  function () { return SEG_OUT[deTab] || null; },
          apply: function (v) {
            var el = document.getElementById('screen-de-tab');
            if (!el || !el.classList.contains('active')) return false;
            window.switchDeTab(v);
            return deTab === v;
          } }
      }
    });

    /* Any DENetwork write, from anywhere, refreshes net= in the address bar. */
    if (window.DENetwork) window.DENetwork.subscribe(function () { window.DELink.sync(); });
  }


  /* Canvas grouping — the order a learner actually walks this prototype, which the
     deep-link vocabulary's declaration order cannot express. Screens are named by their
     internal id; anything not claimed here still reaches the board, in a trailing group,
     so adding a screen never means remembering to file it. */
  window.DECanvasGroups = [
    { title: 'Finding the way in', note: 'The five ways a learner arrives at an application.',
      screens: ['path-select', 'select-hs', 'select-college', 'college-site', 'email-landing', 'email-entry'] },
    { title: 'Getting an account', note: 'Signing in, or creating the account the application needs.',
      screens: ['login', 'aer', 'confirm-email'] },
    { title: 'Applying', note: 'The application itself, and what comes back after submitting.',
      screens: ['de-app', 'aer-confirm'] },
    { title: 'Tracking it', note: 'Where a learner watches the approvals land.',
      screens: ['dashboard', 'de-tab'] },
    { title: 'Registering', note: 'What opens up once the application is approved.',
      screens: ['courses', 'course-detail', 'registered'] }
  ];

  window.addEventListener('DOMContentLoaded', function () {
    applyLearnerEntryDefaults();
    if (window.DELink) window.DELink.apply('state');   // before the renders below read DEV
    applyDevState();
    renderCourseList();
    renderAerConfirm();
    renderRegisteredScreen();
    populateDob();
    applyEntryPointsToPathSelect();
    initDevPanel();
    /* Last: __dev, every fixture and the rendered screens all exist by here, and DENetwork has
       already consumed ?net=. One write, immediately, so the address bar is right from frame one. */
    if (window.DELink) { window.DELink.apply('view'); window.DELink.sync({ now: true }); }
  });

})();
