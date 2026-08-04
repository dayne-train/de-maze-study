/* scripts/app/data-apps.js — module split from former scripts/app.js (one IIFE, now dissolved to shared global scope). App fixtures: ALL_APPS, WAITING_APPS, ALL_ACTIVE_APPS, ALL_DENIED_APPS, COLLEGES, ADMINS, COLLEGE_REQS. Pure data — loaded first.
   Load order is fixed in index.html; do not reorder casually.

   ── COLLEGE-ADMIN (HE Admin) PERSPECTIVE ─────────────────────────────
   Mirror of the HS-counselor queue. Here the institution is FIXED = West
   Valley Community College (Kathy's college); the variable is the LEARNER'S
   HIGH SCHOOL (WVCC receives applications from every high school in its
   exchange network). So every fixture is institution:'wvcc', and `school`
   varies across the network. Buckets flip to the college's JTBD:
     New     = WVCC owes the College Review (Kathy's turn to approve/deny)
     Waiting = WVCC reviewed; now blocked on the HS counselor and/or parent
     (never on "institution" — that IS the college's own step).
   ───────────────────────────────────────────────────────────────────── */
  /* (Jun 30: AVATAR_COLORS rainbow palette retired — all avatars now use the DS
     Tasty .tasty-persona-icon, single brand color, 40px round.) */

  /* The high schools in WVCC's exchange network, each with its HS counselor.
     `app.counselor` (the other-party approver) is resolved from the school. */
  const HS_COUNSELORS = {
    'Pioneer High School': 'Morgan Lee',
    'Westview Academy':    'James Park',
    'Eastside High':       'Renee Carter',
    'Central High School': 'David Osei',
    'Northgate High':      'Priya Shah',
    'Riverside Prep':      'Tom Becker',
  };

  /* New — applications WVCC owes a College Review on (Kathy's turn).
     gpa/grade/prereq/transcript drive the reviewer's eligibility read against
     WVCC's published requirements (COLLEGE_REQS.wvcc). A few are deliberately
     short of a requirement (Chen GPA, Rodriguez prereq, Washington grade). */
  const ALL_APPS = [
    { id:'DE-2026-0441', lastName:'Thompson',   firstName:'Aisha',  initials:'AT', school:'Pioneer High School',    group:'English - Dual Enrollment Fall 2026',         term:'FALL 2026',   course:null,       submitted:'Jun 27, 2026', gradDate:'May 2027', counselor:'Morgan Lee',   hasAlert: false, gpa: 3.7, grade: 12, prereqMet: true,  transcriptAttached: true,  sisId:'STU-24-7741', institution:'wvcc', groupIds:['wvcc-g1','wvcc-g2'] },
    { id:'DE-2026-0452', lastName:'Delgado',    firstName:'Marcus', initials:'MD', school:'Westview Academy',       group:'Math - Dual Enrollment Fall 2026',     term:'FALL 2026',   course:null,        submitted:'Jun 25, 2026', gradDate:'Jun 2027', counselor:'James Park',   hasAlert: false, gpa: 3.2, grade: 11, prereqMet: true,  transcriptAttached: false, sisId:'STU-24-8892', institution:'wvcc' },
    { id:'DE-2026-0458', lastName:'Chen',       firstName:'Sofia',  initials:'SC', school:'Eastside High',          group:'Science - Dual Enrollment Fall 2026',        term:'FALL 2026',   course:null,                           submitted:'Jun 22, 2026', gradDate:'May 2027', counselor:'Renee Carter', hasAlert: true,  gpa: 2.8, grade: 12, prereqMet: true,  transcriptAttached: true,  sisId:'STU-24-6633', institution:'wvcc' },
    { id:'DE-2026-0467', lastName:'Brooks',     firstName:'Jaylen', initials:'JB', school:'Pioneer High School',    group:'Social Science - Dual Enrollment Fall 2026', term:'FALL 2026',   course:null,      submitted:'Jun 18, 2026', gradDate:'Jun 2027', counselor:'Morgan Lee',   hasAlert: false, gpa: 3.5, grade: 11, prereqMet: true,  transcriptAttached: true,  sisId:'STU-24-5510', institution:'wvcc' },
    { id:'DE-2026-0471', lastName:'Rodriguez',  firstName:'Emma',   initials:'ER', school:'Westview Academy',       group:'Social Science - Dual Enrollment Fall 2026', term:'FALL 2026',   course:null,  submitted:'Jun 12, 2026', gradDate:'May 2027', counselor:'James Park',   hasAlert: false, gpa: 3.1, grade: 12, prereqMet: false, transcriptAttached: true,  sisId:'STU-24-9021', institution:'wvcc' },
    { id:'DE-2026-0479', lastName:'Washington', firstName:'Tyler',  initials:'TW', school:'Central High School',    group:'Science - Dual Enrollment Fall 2026',        term:'FALL 2026',   course:null,                           submitted:'Jun 8, 2026', gradDate:'Jun 2028', counselor:'David Osei',   hasAlert: false, gpa: 3.8, grade: 10, prereqMet: true,  transcriptAttached: false, sisId:'STU-25-1147', institution:'wvcc' },
    { id:'DE-2026-0483', lastName:'Patel',      firstName:'Priya',  initials:'PP', school:'Eastside High',          group:'Engineering - Dual Enrollment Fall 2026',     term:'FALL 2026',   course:null,         submitted:'Jun 3, 2026', gradDate:'May 2027', counselor:'Renee Carter', hasAlert: false, gpa: 4.0, grade: 12, prereqMet: true,  transcriptAttached: true,  sisId:'STU-24-3384', institution:'wvcc', groupIds:['wvcc-g4','wvcc-g1','wvcc-g3'] },
    { id:'DE-2026-0491', lastName:'Fitzgerald', firstName:'Noah',   initials:'NF', school:'Central High School',    group:'English - Dual Enrollment Spring 2026',         term:'SPRING 2026', course:null,        submitted:'May 28, 2026',  gradDate:'Jun 2027', counselor:'David Osei',   hasAlert: false, gpa: 3.4, grade: 11, prereqMet: true,  transcriptAttached: true,  sisId:'STU-24-7208', institution:'wvcc' },
  ];

  /* Waiting = WVCC has no action right now; someone else does. Two positions in the
     pipeline land here (the PM's roll-up folds both into "Waiting"):
       1. BEFORE WVCC's review — still waiting on the HS side (counselor approval +
          guardian consent, which are CONCURRENT with each other, so an app can be
          waiting on either or both). It has NOT reached WVCC's review queue yet.
       2. AFTER WVCC admits — the post-admission edge where the learner is admitted
          but the groups/courses aren't open for registration yet (awaitingRegistration).
     Nothing for Kathy to do in either case. Note: an app is NEVER in the New/Needs
     Review queue (WVCC's turn) while the HS side is still pending — that gate is closed
     first. */
  const WAITING_APPS = [
    { id:'DE-2026-0501', lastName:'Hernandez', firstName:'Lucia',  initials:'LH', school:'Pioneer High School', group:'English - Dual Enrollment Fall 2026',     term:'FALL 2026', course:null,  institution:'wvcc', counselor:'Morgan Lee',   submitted:'Jun 15, 2026', awaitingConsent:true,  awaitingCounselor:false },
    { id:'DE-2026-0508', lastName:'Okafor',    firstName:'Daniel', initials:'DO', school:'Eastside High',       group:'Math - Dual Enrollment Fall 2026', term:'FALL 2026', course:null,                     institution:'wvcc', counselor:'Renee Carter', submitted:'Jun 5, 2026', awaitingConsent:false, awaitingCounselor:true  },
    { id:'DE-2026-0512', lastName:'Tran',      firstName:'Mai',    initials:'MT', school:'Westview Academy',     group:'Science - Dual Enrollment Fall 2026',    term:'FALL 2026', course:null, institution:'wvcc', counselor:'James Park',   submitted:'May 26, 2026', awaitingConsent:true,  awaitingCounselor:true  },
    { id:'DE-2026-0519', lastName:'Foster',    firstName:'Grace',  initials:'GF', school:'Central High School',  group:'Engineering - Dual Enrollment Fall 2026', term:'FALL 2026', course:null,     institution:'wvcc', counselor:'David Osei',   submitted:'May 18, 2026', awaitingConsent:false, awaitingCounselor:true  },
    { id:'DE-2026-0524', lastName:'Reyes',     firstName:'Nina',   initials:'NR', school:'Northgate High',       group:'English - Dual Enrollment Fall 2026',     term:'FALL 2026', course:null,  institution:'wvcc', counselor:'Priya Shah',   submitted:'May 14, 2026', awaitingConsent:false, awaitingCounselor:false, awaitingRegistration:true },
    { id:'DE-2026-0527', lastName:'Patel',     firstName:'Anaya',  initials:'AP', school:'Eastside High',        group:'Science - Dual Enrollment Fall 2026',    term:'FALL 2026', course:null,  institution:'wvcc', counselor:'Renee Carter', submitted:'May 8, 2026',  awaitingConsent:false, awaitingCounselor:false, awaitingRegistration:true },
  ];

  const ALL_ACTIVE_APPS = [
    { id:'DE-2026-0388', lastName:'Garcia',    firstName:'Maria',    initials:'MG', school:'Pioneer High School',  group:'English - Dual Enrollment Spring 2026',         term:'SPRING 2026', course:'ENGL 101 — Composition',       institution:'wvcc', counselor:'Morgan Lee',   enrolledDate:'Jun 26, 2026' },
    { id:'DE-2026-0392', lastName:'Kim',       firstName:'David',    initials:'DK', school:'Westview Academy',     group:'Engineering - Dual Enrollment Spring 2026',     term:'SPRING 2026', course:'CS 150 — Python Programming',   institution:'wvcc', counselor:'James Park',   enrolledDate:'Jun 19, 2026'  },
    { id:'DE-2026-0401', lastName:'Martinez',  firstName:'Ana',      initials:'AM', school:'Eastside High',        group:'Social Science - Dual Enrollment Spring 2026', term:'SPRING 2026', course:'PSYC 101 — Intro Psychology',   institution:'wvcc', counselor:'Renee Carter', enrolledDate:'Jun 11, 2026'  },
    { id:'DE-2026-0415', lastName:'Johnson',   firstName:'Marcus',   initials:'MJ', school:'Central High School',  group:'Social Science - Dual Enrollment Spring 2026', term:'SPRING 2026', course:'HIST 105 — U.S. History',       institution:'wvcc', counselor:'David Osei',   enrolledDate:'Jun 4, 2026'  },
    { id:'DE-2026-0422', lastName:'Nguyen',    firstName:'Sophie',   initials:'SN', school:'Northgate High',       group:'Math - Dual Enrollment Spring 2026',     term:'SPRING 2026', course:'MATH 120 — Calculus I',         institution:'wvcc', counselor:'Priya Shah',   enrolledDate:'May 27, 2026'  },
    { id:'DE-2026-0429', lastName:'Williams',  firstName:'Jordan',   initials:'JW', school:'Riverside Prep',       group:'Science - Dual Enrollment Spring 2026',        term:'SPRING 2026', course:'BIOL 110 — Intro Biology',      institution:'wvcc', counselor:'Tom Becker',   enrolledDate:'May 19, 2026' },
  ];

  /* Closed — terminal. Outcome + who closed it (College / Counselor / Learner /
     System). Consent can't be actively declined; it lapses → Expired / No
     Consent, closed by System. `kind:'cancelled'` renders the neutral badge. */
  const ALL_DENIED_APPS = [
    {
      id:'DE-2026-0334', lastName:'Johnson', firstName:'Tyler', initials:'TJ',
      school:'Pioneer High School', group:'Math - Dual Enrollment Fall 2026', term:'FALL 2026', course:null, institution:'wvcc', counselor:'Morgan Lee',
      deniedDate:'Jun 23, 2026', deniedBy:'WVCC Admissions', closedBy:'College', deniedState:'Institution Review',
      reason:"Tyler's current GPA of 2.4 doesn't meet West Valley CC's minimum of 3.0 for dual enrollment. Our admissions team reviewed his transcript alongside the counselor's note; he needs another semester to build a stronger foundation before college-level coursework. We've encouraged him to reapply in the fall once his grades reflect that progress.",
    },
    {
      id:'DE-2026-0347', lastName:'Lee', firstName:'Samantha', initials:'SL',
      school:'Eastside High', group:'Science - Dual Enrollment Fall 2026', term:'FALL 2026', course:null, institution:'wvcc', counselor:'Renee Carter',
      deniedDate:'Jun 14, 2026', deniedBy:'WVCC Admissions', closedBy:'College', deniedState:'Institution Review',
      reason:"Samantha hasn't completed the prerequisite coursework West Valley CC requires before General Chemistry — specifically Biology I and Algebra II. Her counselor confirmed she's on track to finish those by end of semester, so we're recommending she reapply for the spring term.",
    },
    {
      id:'DE-2026-0361', lastName:'Brown', firstName:'Ethan', initials:'EB',
      school:'Central High School', group:'Engineering - Dual Enrollment Fall 2026', term:'FALL 2026', course:null, institution:'wvcc', counselor:'David Osei',
      deniedDate:'Jun 6, 2026', deniedBy:'David Osei (Counselor)', closedBy:'Counselor', deniedState:'Counselor Review',
      reason:"Ethan's counselor did not approve the application — he's currently in 9th grade, and the school requires students to be in 10th grade or above before endorsing a dual enrollment request. He's a strong student genuinely interested in CS; the family has been told he'll be eligible to apply next year.",
    },
    {
      id:'DE-2026-0375', lastName:'Wilson', firstName:'Caitlyn', initials:'CW',
      school:'Westview Academy', group:'English - Dual Enrollment Fall 2026', term:'FALL 2026', course:null, institution:'wvcc', counselor:'James Park',
      deniedDate:'May 29, 2026', deniedBy:'System', closedBy:'System', deniedState:'Guardian Consent', kind:'cancelled',
      reason:"The parent/guardian consent window lapsed without a response, so the application expired at the consent step — it never reached counselor or institution review. Consent can't be actively declined; it simply times out. The family is welcome to reapply in a future term.",
    },
    {
      id:'DE-2026-0312', lastName:'Reyes', firstName:'Diego', initials:'DR',
      school:'Pioneer High School', group:'Math - Dual Enrollment Fall 2026', term:'FALL 2026', course:null, institution:'wvcc', counselor:'Morgan Lee',
      deniedDate:'May 21, 2026', deniedBy:'Diego Reyes (Learner)', closedBy:'Learner', deniedState:'Guardian Consent', kind:'cancelled',
      reason:"Diego withdrew his own application before consent was finalized — he decided to prioritize a varsity athletics commitment that conflicts with the course schedule. He may revisit dual enrollment in the spring.",
    },
    {
      id:'DE-2026-0320', lastName:'Murphy', firstName:'Hannah', initials:'HM',
      school:'Riverside Prep', group:'English - Dual Enrollment Fall 2026', term:'FALL 2026', course:null, institution:'wvcc', counselor:'Tom Becker',
      deniedDate:'May 12, 2026', deniedBy:'Hannah Murphy (Learner)', closedBy:'Learner', deniedState:'Application', kind:'cancelled',
      reason:"Withdrawn at the family's request — they're relocating out of district before the term begins. We recommended they connect with a college near their new home to explore options there.",
    },
  ];

  /* Admitted, on hold (PM review #8 "Admit Only"): WVCC has admitted these learners
     but hasn't yet invited them to register. This is the college's own pacing decision
     (e.g. batching registration invites once a term opens), distinct from Waiting,
     which is blocked on EXTERNAL parties (guardian consent / counselor approval). */
  const ALL_ADMITTED_APPS = [
    { id:'DE-2026-0601', lastName:'Vance',     firstName:'Corinne', initials:'CV', school:'Pioneer High School', group:'English - Dual Enrollment Fall 2026',     term:'FALL 2026', course:null, institution:'wvcc', counselor:'Morgan Lee',   submitted:'Jun 20, 2026', awaitingConsent:false, awaitingCounselor:false, admittedDate:'Jun 27, 2026' },
    { id:'DE-2026-0602', lastName:'Sandoval',  firstName:'Marco',   initials:'MS', school:'Westview Academy',    group:'Math - Dual Enrollment Fall 2026', term:'FALL 2026', course:null, institution:'wvcc', counselor:'James Park',   submitted:'Jun 9, 2026',  awaitingConsent:false, awaitingCounselor:false, admittedDate:'Jun 18, 2026' },
    { id:'DE-2026-0603', lastName:'Whitfield', firstName:'Alana',   initials:'AW', school:'Eastside High',       group:'Science - Dual Enrollment Fall 2026',    term:'FALL 2026', course:null, institution:'wvcc', counselor:'Renee Carter', submitted:'May 28, 2026', awaitingConsent:false, awaitingCounselor:false, admittedDate:'Jun 5, 2026'  },
  ];

  const COLLEGES = {
    wvcc: 'West Valley Community College',
    asu:  'Arizona State University',
    mesa: 'Mesa Community College',
  };

  /* Resolve an application's assigned groups to full group objects from COLLEGE_GROUPS.
     Supports the new multi-group model (app.groupIds) and falls back to the legacy
     single app.group (matched by name/term) so untouched fixtures keep working. */
  function getAppGroups(app) {
    if (!app) return [];
    var avail = (typeof COLLEGE_GROUPS !== 'undefined' && COLLEGE_GROUPS[app.institution]) || [];
    if (app.groupIds && app.groupIds.length) {
      return app.groupIds
        .map(function(id) { return avail.find(function(g) { return g.id === id; }); })
        .filter(Boolean);
    }
    if (app.group) {
      var match = avail.find(function(g) { return g.name === app.group && (!app.term || g.term === app.term); })
               || avail.find(function(g) { return g.name === app.group; });
      return [match || { id: '_legacy', name: app.group, term: app.term || '', description: '', deadline: '' }];
    }
    return [];
  }
  window.getAppGroups = getAppGroups;

  /* ─── Standard applications-table helpers (Dual Enrollment Standard Admin Modules schema) ───
     Columns: Last Name · First Name · Application ID · Group · High School · Submission Date ·
     Status · Actions. Centralized so every bucket table + search stays in sync. nameCells() emits
     the two name columns (no sub-line — the High School is its own column here); appHaystack() is the
     single search index — Course and Term stay searchable though Course is no longer a column. */
  function nameCells(app) {
    return '<td><p class="student-name">' + (app.lastName || '') + '</p></td>' +
           '<td><p class="student-name">' + (app.firstName || '') + '</p></td>';
  }
  function appHaystack(app) {
    var groupNames = (typeof getAppGroups === 'function') ? getAppGroups(app).map(function(g){ return g.name; }).join(' ') : '';
    var inst = (typeof COLLEGES !== 'undefined' && COLLEGES[app.institution]) ? COLLEGES[app.institution] : (app.institution || '');
    return [app.firstName, app.lastName, app.id, app.school, app.college, app.group, groupNames, inst, app.term, app.course, app.submitted]
      .filter(Boolean).join(' ').toLowerCase();
  }
  window.nameCells = nameCells;
  window.appHaystack = appHaystack;

  /* Logged-in persona = the COLLEGE admin (HE Admin). Dev panel switches between
     college admins, not counselors. The per-app HS counselor lives on app.counselor. */
  const ADMINS = {
    kathy:  { name: 'Kathy Nguyen',  initials: 'KN', org: 'West Valley Community College', abbr: 'WV' },
    marcus: { name: 'Marcus Bell',   initials: 'MB', org: 'West Valley Community College', abbr: 'WV' },
  };

  /* Eligibility requirements WVCC publishes — what the College Review checks against. */
  const SHARED_REQS_TAIL = [
    { key: 'attendance', label: 'Attendance and Conduct',      desc: 'Learner must demonstrate 90%+ attendance and no major disciplinary actions in the current or previous academic year.' },
  ];
  const COLLEGE_REQS = {
    wvcc: { minGpa: 3.0, minGrade: 11, prereqRequired: true,
            reqs: [
              { key: 'gpa',    label: 'Academic Standing',    desc: 'Min cumulative GPA of 3.0 on a 4.0 scale.' },
              { key: 'grade',  label: 'Grade Level',          desc: '11th or 12th grade enrollment required.' },
              { key: 'prereq', label: 'Course Prerequisites', desc: 'Must have completed all prerequisite HS coursework.' },
              ...SHARED_REQS_TAIL,
            ]},
    asu:  { minGpa: 3.0, minGrade: 11, prereqRequired: true,
            reqs: [
              { key: 'gpa',    label: 'Academic Standing',    desc: 'Min cumulative GPA of 3.0 on a 4.0 scale.' },
              { key: 'grade',  label: 'Grade Level',          desc: '11th or 12th grade enrollment required.' },
              { key: 'prereq', label: 'Course Prerequisites', desc: 'Must have completed all prerequisite HS coursework.' },
              ...SHARED_REQS_TAIL,
            ]},
    mesa: { minGpa: 3.0, minGrade: 10, prereqRequired: true,
            reqs: [
              { key: 'gpa',    label: 'Academic Standing',    desc: 'Min cumulative GPA of 3.0 on a 4.0 scale.' },
              { key: 'grade',  label: 'Grade Level',          desc: '10th grade or above.' },
              { key: 'prereq', label: 'Course Prerequisites', desc: 'Must have completed all prerequisite HS coursework.' },
              ...SHARED_REQS_TAIL,
            ]},
  };

  // gradeSuffix is the only remaining helper from this section.
  // getEligFlags was removed for MVP — review is now all-or-nothing.
  function gradeSuffix(g) { return ({ 10:'10th', 11:'11th', 12:'12th' }[g] || g + 'th'); }
