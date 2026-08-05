/* scripts/app/data-apps.js — module split from former scripts/app.js (one IIFE, now dissolved to shared global scope). App fixtures: ALL_APPS, WAITING_APPS, ALL_ACTIVE_APPS, ALL_DENIED_APPS, COLLEGES, COUNSELORS, COLLEGE_REQS. Pure data — loaded first. (Jun 30: AVATAR_COLORS rainbow palette retired — all avatars now use the DS Tasty .tasty-persona-icon single brand color.)
   Load order is fixed in index.html; do not reorder casually. */

  const ALL_APPS = [
    { id:'DE-2026-0441', lastName:'Thompson',   firstName:'Aisha',  initials:'AT', school:'Pioneer High School',    group:'English - Dual Enrollment Fall 2026',         term:'FALL 2026',   course:null,       submitted:'Jun 27, 2026', gradDate:'May 2027', counselor:'Morgan Lee',  hasAlert: false, gpa: 3.7, grade: 12, prereqMet: true,  transcriptAttached: true,  sisId:'STU-24-7741', institution:'wvcc', groupIds:['wvcc-g1','wvcc-g2'] },
    { id:'DE-2026-0452', lastName:'Delgado',    firstName:'Marcus', initials:'MD', school:'Westview Academy',       group:'Math - Dual Enrollment Fall 2026',     term:'FALL 2026',   course:null,        submitted:'Jun 25, 2026', gradDate:'Jun 2027', counselor:'Morgan Lee',  hasAlert: false, gpa: 3.2, grade: 11, prereqMet: true,  transcriptAttached: false, sisId:'STU-24-8892', institution:'asu'  },
    { id:'DE-2026-0458', lastName:'Chen',       firstName:'Sofia',  initials:'SC', school:'Eastside High',          group:'Science - Dual Enrollment Fall 2026',        term:'FALL 2026',   course:null,                           submitted:'Jun 22, 2026', gradDate:'May 2027', counselor:'James Park',  hasAlert: true,  gpa: 2.8, grade: 12, prereqMet: true,  transcriptAttached: true,  sisId:'STU-24-6633', institution:'wvcc' },
    { id:'DE-2026-0467', lastName:'Brooks',     firstName:'Jaylen', initials:'JB', school:'Pioneer High School',    group:'Fall 2026 Cohort', term:'FALL 2026',   course:null,      submitted:'Jun 18, 2026', gradDate:'Jun 2027', counselor:'Morgan Lee',  hasAlert: false, gpa: 3.5, grade: 11, prereqMet: true,  transcriptAttached: true,  sisId:'STU-24-5510', institution:'mesa' },
    { id:'DE-2026-0471', lastName:'Rodriguez',  firstName:'Emma',   initials:'ER', school:'Westview Academy',       group:'Social Science - Dual Enrollment Fall 2026', term:'FALL 2026',   course:null,  submitted:'Jun 12, 2026', gradDate:'May 2027', counselor:'James Park',  hasAlert: false, gpa: 3.1, grade: 12, prereqMet: false, transcriptAttached: true,  sisId:'STU-24-9021', institution:'asu'  },
    { id:'DE-2026-0479', lastName:'Washington', firstName:'Tyler',  initials:'TW', school:'Central High School',    group:'Science - Dual Enrollment Fall 2026',        term:'FALL 2026',   course:null,                           submitted:'Jun 8, 2026', gradDate:'Jun 2028', counselor:'Morgan Lee',  hasAlert: false, gpa: 3.8, grade: 10, prereqMet: true,  transcriptAttached: false, sisId:'STU-25-1147', institution:'mesa' },
    { id:'DE-2026-0483', lastName:'Patel',      firstName:'Priya',  initials:'PP', school:'Eastside High',          group:'Engineering - Dual Enrollment Fall 2026',     term:'FALL 2026',   course:null,         submitted:'Jun 3, 2026', gradDate:'May 2027', counselor:'James Park',  hasAlert: false, gpa: 4.0, grade: 12, prereqMet: true,  transcriptAttached: true,  sisId:'STU-24-3384', institution:'wvcc', groupIds:['wvcc-g4','wvcc-g1','wvcc-g3'] },
    { id:'DE-2026-0491', lastName:'Fitzgerald', firstName:'Noah',   initials:'NF', school:'Central High School',    group:'English - Dual Enrollment Spring 2026',         term:'SPRING 2026', course:null,        submitted:'May 28, 2026',  gradDate:'Jun 2027', counselor:'Morgan Lee',  hasAlert: false, gpa: 3.4, grade: 11, prereqMet: true,  transcriptAttached: true,  sisId:'STU-24-7208', institution:'asu'  },
  ];

  /* Counselor has already approved. The HS counselor + guardian consent are the two GATES
     before institution review — both must clear before the app can move to the college.
     A Waiting app is one of three sub-states, in order: still awaiting guardian consent →
     (both gates cleared) awaiting institution review → (institution done too) awaiting the
     LEARNER to complete course registration. Nothing for the counselor to do in any of them. */
  const WAITING_APPS = [
    { id:'DE-2026-0501', lastName:'Hernandez', firstName:'Lucia',  initials:'LH', school:'Pioneer High School', group:'English - Dual Enrollment Fall 2026',     term:'FALL 2026', course:null,  institution:'wvcc', submitted:'Jun 15, 2026', awaitingConsent:true,  awaitingInstitution:false, awaitingRegistration:false },
    { id:'DE-2026-0508', lastName:'Okafor',    firstName:'Daniel', initials:'DO', school:'Eastside High',       group:'Math - Dual Enrollment Fall 2026', term:'FALL 2026', course:null,                     institution:'asu',  submitted:'Jun 5, 2026', awaitingConsent:false, awaitingInstitution:true,  awaitingRegistration:false },
    { id:'DE-2026-0512', lastName:'Tran',      firstName:'Mai',    initials:'MT', school:'Westview Academy',     group:'Science - Dual Enrollment Fall 2026',    term:'FALL 2026', course:null, institution:'mesa', submitted:'May 26, 2026', awaitingConsent:true,  awaitingInstitution:false, awaitingRegistration:false },
    { id:'DE-2026-0519', lastName:'Foster',    firstName:'Grace',  initials:'GF', school:'Central High School',  group:'Engineering - Dual Enrollment Fall 2026', term:'FALL 2026', course:null,     institution:'wvcc', submitted:'May 18, 2026', awaitingConsent:false, awaitingInstitution:true,  awaitingRegistration:false },
    /* Both gates + institution review cleared — now waiting on the learner to register. */
    { id:'DE-2026-0523', lastName:'Nguyen',    firstName:'Kevin',  initials:'KN', school:'Pioneer High School', group:'Math - Dual Enrollment Fall 2026', term:'FALL 2026', course:null, institution:'wvcc', submitted:'May 12, 2026', awaitingConsent:false, awaitingInstitution:false, awaitingRegistration:true },
    { id:'DE-2026-0527', lastName:'Patel',     firstName:'Anaya',  initials:'AP', school:'Eastside High',       group:'Science - Dual Enrollment Fall 2026',    term:'FALL 2026', course:null, institution:'asu',  submitted:'May 8, 2026',  awaitingConsent:false, awaitingInstitution:false, awaitingRegistration:true },
  ];

  const ALL_ACTIVE_APPS = [
    /* ── The study's canonical applicant. Jessica is the learner in learner-application and the
       student in parent-consent; Task 7 asks an admin to confirm she reached Registered, so she
       must be HERE, in the fixture, at page load. Nothing the participant does in an earlier
       task creates or moves this row — every Maze task is a fresh page load, and a task that
       depended on the previous one's outcome would break the moment someone picked a different
       student. First row so she is on page 1 of the Registered tab. ── */
    { id:'DE-2026-0440', sisId:'STU-26-1000', lastName:'Cumberland', firstName:'Jessica',  initials:'JC', school:'Pioneer High School',  group:'Math - Dual Enrollment Fall 2026',              term:'FALL 2026',   course:'MATH1D — Calculus',            institution:'wvcc', enrolledDate:'Jul 30, 2026', enrollmentStatus:'in-progress', grade:null, credits:3, gradePosted:null },
    { id:'DE-2026-0388', sisId:'STU-26-1001', lastName:'Garcia',    firstName:'Maria',    initials:'MG', school:'Pioneer High School',  group:'English - Dual Enrollment Spring 2026',         term:'SPRING 2026', course:'ENGL 101 — Composition',       institution:'wvcc', enrolledDate:'Jun 26, 2026', enrollmentStatus:'completed', grade:'A-', credits:3, gradePosted:'Jun 28, 2026' },
    { id:'DE-2026-0389', sisId:'STU-26-1001', lastName:'Garcia',    firstName:'Maria',    initials:'MG', school:'Pioneer High School',  group:'Social Science - Dual Enrollment Spring 2026', term:'SPRING 2026', course:'SOC 110 — Intro Sociology',     institution:'wvcc', enrolledDate:'Jun 26, 2026', enrollmentStatus:'completed', grade:'B+', credits:3, gradePosted:'Jun 28, 2026' },
    /* Non-letter-graded courses — not every DE course reports an A–F grade. PE/wellness, CTE labs, and
       work-based learning are commonly Pass/Fail; college-success/first-year seminars are often
       satisfactory-Completed. Each row sits immediately after its student's other courses so the
       student stays contiguous (the tables paginate the flat list, then group by student — a split
       student would render on two pages). gradeScheme lives on COURSE_INFO. */
    { id:'DE-2026-0548', sisId:'STU-26-1001', lastName:'Garcia',    firstName:'Maria',    initials:'MG', school:'Pioneer High School',  group:'Health & Wellness - Concurrent Enrollment Spring 2026',           term:'SPRING 2026', course:'PE 101 — Fitness & Wellness',        institution:'wvcc', enrolledDate:'Jun 26, 2026', enrollmentStatus:'completed', grade:'Pass',      credits:1, gradePosted:'Jun 28, 2026' },
    { id:'DE-2026-0392', sisId:'STU-26-1002', lastName:'Kim',       firstName:'David',    initials:'DK', school:'Westview Academy',     group:'Engineering - Dual Enrollment Spring 2026',     term:'SPRING 2026', course:'CS 150 — Python Programming',   institution:'asu',  enrolledDate:'Jun 19, 2026', enrollmentStatus:'completed', grade:'B+', credits:4, gradePosted:'Jun 21, 2026'  },
    { id:'DE-2026-0393', sisId:'STU-26-1002', lastName:'Kim',       firstName:'David',    initials:'DK', school:'Westview Academy',     group:'Science - Dual Enrollment Spring 2026',        term:'SPRING 2026', course:'CHEM 101 — General Chemistry',  institution:'asu',  enrolledDate:'Jun 19, 2026', enrollmentStatus:'completed', grade:'B',  credits:4, gradePosted:'Jun 21, 2026'  },
    { id:'DE-2026-0401', sisId:'STU-26-1003', lastName:'Martinez',  firstName:'Ana',      initials:'AM', school:'Eastside High',        group:'Social Science - Dual Enrollment Spring 2026', term:'SPRING 2026', course:'PSYC 101 — Intro Psychology',   institution:'asu',  enrolledDate:'Jun 11, 2026', enrollmentStatus:'completed', grade:'A',  credits:3, gradePosted:'Jun 13, 2026'  },
    { id:'DE-2026-0402', sisId:'STU-26-1003', lastName:'Martinez',  firstName:'Ana',      initials:'AM', school:'Eastside High',        group:'Social Science - Dual Enrollment Spring 2026', term:'SPRING 2026', course:'HIST 106 — World History',      institution:'asu',  enrolledDate:'Jun 11, 2026', enrollmentStatus:'completed', grade:'A-', credits:3, gradePosted:'Jun 13, 2026'  },
    { id:'DE-2026-0403', sisId:'STU-26-1003', lastName:'Martinez',  firstName:'Ana',      initials:'AM', school:'Eastside High',        group:'Math - Dual Enrollment Spring 2026',     term:'SPRING 2026', course:'MATH 110 — College Algebra',    institution:'asu',  enrolledDate:'Jun 11, 2026', enrollmentStatus:'completed', grade:'B+', credits:3, gradePosted:'Jun 13, 2026'  },
    { id:'DE-2026-0415', sisId:'STU-26-1004', lastName:'Johnson',   firstName:'Marcus',   initials:'MJ', school:'Central High School',  group:'Social Science - Dual Enrollment Spring 2026', term:'SPRING 2026', course:'HIST 105 — U.S. History',       institution:'mesa', enrolledDate:'Jun 4, 2026', enrollmentStatus:'completed', grade:'B',  credits:3, gradePosted:'Jun 6, 2026'  },
    { id:'DE-2026-0416', sisId:'STU-26-1004', lastName:'Johnson',   firstName:'Marcus',   initials:'MJ', school:'Central High School',  group:'English - Dual Enrollment Spring 2026',         term:'SPRING 2026', course:'ENGL 102 — Composition II',     institution:'mesa', enrolledDate:'Jun 4, 2026', enrollmentStatus:'completed', grade:'C-', credits:3, gradePosted:'Jun 6, 2026'  },
    { id:'DE-2026-0552', sisId:'STU-26-1004', lastName:'Johnson',   firstName:'Marcus',   initials:'MJ', school:'Central High School',  group:'CTE Pathway', term:'SPRING 2026', course:'WELD 110 — Intro to Welding',    institution:'mesa', enrolledDate:'Jun 4, 2026', enrollmentStatus:'completed', grade:'Pass', credits:3, gradePosted:'Jun 6, 2026'  },
    { id:'DE-2026-0422', sisId:'STU-26-1005', lastName:'Nguyen',    firstName:'Sophie',   initials:'SN', school:'Pioneer High School',  group:'Math - Dual Enrollment Spring 2026',     term:'SPRING 2026', course:'MATH 120 — Calculus I',         institution:'wvcc', enrolledDate:'May 27, 2026', enrollmentStatus:'completed', grade:'A',  credits:4, gradePosted:'May 29, 2026'  },
    { id:'DE-2026-0423', sisId:'STU-26-1005', lastName:'Nguyen',    firstName:'Sophie',   initials:'SN', school:'Pioneer High School',  group:'Social Science - Dual Enrollment Spring 2026', term:'SPRING 2026', course:'POLS 101 — American Government', institution:'wvcc', enrolledDate:'May 27, 2026', enrollmentStatus:'completed', grade:'A',  credits:3, gradePosted:'May 29, 2026'  },
    { id:'DE-2026-0549', sisId:'STU-26-1005', lastName:'Nguyen',    firstName:'Sophie',   initials:'SN', school:'Pioneer High School',  group:'College Success 26-27', term:'SPRING 2026', course:'COLL 101 — College Success Seminar', institution:'wvcc', enrolledDate:'May 27, 2026', enrollmentStatus:'completed', grade:'Completed', credits:1, gradePosted:'May 29, 2026'  },
    { id:'DE-2026-0429', sisId:'STU-26-1006', lastName:'Williams',  firstName:'Jordan',   initials:'JW', school:'Westview Academy',     group:'Science - Dual Enrollment Spring 2026',        term:'SPRING 2026', course:'BIOL 110 — Intro Biology',      institution:'mesa', enrolledDate:'May 19, 2026', enrollmentStatus:'completed', grade:'C+', credits:4, gradePosted:'May 21, 2026' },
    { id:'DE-2026-0430', sisId:'STU-26-1006', lastName:'Williams',  firstName:'Jordan',   initials:'JW', school:'Westview Academy',     group:'Engineering - Dual Enrollment Spring 2026',     term:'SPRING 2026', course:'CS 151 — Intro to Programming', institution:'mesa', enrolledDate:'May 19, 2026', enrollmentStatus:'completed', grade:'D+', credits:4, gradePosted:'May 21, 2026' },
    { id:'DE-2026-0553', sisId:'STU-26-1006', lastName:'Williams',  firstName:'Jordan',   initials:'JW', school:'Westview Academy',     group:'CTE Pathway', term:'SPRING 2026', course:'CTE 200 — Career Internship', institution:'mesa', enrolledDate:'May 19, 2026', enrollmentStatus:'completed', grade:'Fail', credits:2, gradePosted:'May 21, 2026' },
    { id:'DE-2026-0531', sisId:'STU-26-1011', lastName:'Patel',     firstName:'Priya',    initials:'PP', school:'Eastside High',        group:'Engineering - Dual Enrollment Spring 2026',     term:'SPRING 2026', course:'ENGR 101 — Intro to Engineering', institution:'wvcc', enrolledDate:'Jun 2, 2026',  enrollmentStatus:'completed', grade:'A',  credits:3, gradePosted:'Jun 4, 2026'  },
    { id:'DE-2026-0533', sisId:'STU-26-1012', lastName:'Brooks',    firstName:'Tyler',    initials:'TB', school:'Westview Academy',     group:'Science - Dual Enrollment Spring 2026',        term:'SPRING 2026', course:'CHEM 101 — General Chemistry',  institution:'asu',  enrolledDate:'May 28, 2026', enrollmentStatus:'completed', grade:'B-', credits:4, gradePosted:'May 30, 2026' },
    { id:'DE-2026-0534', sisId:'STU-26-1012', lastName:'Brooks',    firstName:'Tyler',    initials:'TB', school:'Westview Academy',     group:'Math - Dual Enrollment Spring 2026',     term:'SPRING 2026', course:'MATH 110 — College Algebra',    institution:'asu',  enrolledDate:'May 28, 2026', enrollmentStatus:'completed', grade:'B',  credits:3, gradePosted:'May 30, 2026' },
    { id:'DE-2026-0536', sisId:'STU-26-1013', lastName:'Fitzgerald',firstName:'Zoe',      initials:'ZF', school:'Central High School',  group:'English - Dual Enrollment Spring 2026',         term:'SPRING 2026', course:'ENGL 102 — Composition II',     institution:'mesa', enrolledDate:'Jun 9, 2026',  enrollmentStatus:'completed', grade:'A-', credits:3, gradePosted:'Jun 11, 2026' },
    { id:'DE-2026-0538', sisId:'STU-26-1014', lastName:'Kim',       firstName:'Noah',     initials:'NK', school:'Pioneer High School',  group:'Social Science - Dual Enrollment Spring 2026', term:'SPRING 2026', course:'POLS 101 — American Government', institution:'wvcc', enrolledDate:'May 22, 2026', enrollmentStatus:'completed', grade:'B+', credits:3, gradePosted:'May 24, 2026' },
    { id:'DE-2026-0540', sisId:'STU-26-1015', lastName:'Foster',    firstName:'Grace',    initials:'GF', school:'Eastside High',        group:'Science - Dual Enrollment Spring 2026',        term:'SPRING 2026', course:'BIOL 111 — Human Anatomy',      institution:'asu',  enrolledDate:'Jun 5, 2026',  enrollmentStatus:'completed', grade:'A',  credits:4, gradePosted:'Jun 7, 2026'  },
    { id:'DE-2026-0541', sisId:'STU-26-1015', lastName:'Foster',    firstName:'Grace',    initials:'GF', school:'Eastside High',        group:'Math - Dual Enrollment Spring 2026',     term:'SPRING 2026', course:'STAT 201 — Statistics II',      institution:'asu',  enrolledDate:'Jun 5, 2026',  enrollmentStatus:'completed', grade:'A-', credits:3, gradePosted:'Jun 7, 2026'  },
    { id:'DE-2026-0543', sisId:'STU-26-1016', lastName:'Hernandez', firstName:'Lucas',    initials:'LH', school:'Westview Academy',     group:'Engineering - Dual Enrollment Spring 2026',     term:'SPRING 2026', course:'CS 151 — Intro to Programming', institution:'mesa', enrolledDate:'May 15, 2026', enrollmentStatus:'completed', grade:'B',  credits:4, gradePosted:'May 17, 2026' },
    { id:'DE-2026-0545', sisId:'STU-26-1017', lastName:'Chen',      firstName:'Isabella', initials:'IC', school:'Central High School',  group:'Math - Dual Enrollment Spring 2026',     term:'SPRING 2026', course:'MATH 121 — Calculus II',        institution:'wvcc', enrolledDate:'Jun 12, 2026', enrollmentStatus:'completed', grade:'C+', credits:4, gradePosted:'Jun 14, 2026' },
    { id:'DE-2026-0547', sisId:'STU-26-1018', lastName:'Ramirez',   firstName:'Ethan',    initials:'ER', school:'Pioneer High School',  group:'Social Science - Dual Enrollment Spring 2026', term:'SPRING 2026', course:'HIST 106 — World History',      institution:'asu',  enrolledDate:'May 26, 2026', enrollmentStatus:'completed', grade:'B-', credits:3, gradePosted:'May 28, 2026' },
    { id:'DE-2026-0512', sisId:'STU-26-1007', lastName:'Alvarez',   firstName:'Diego',    initials:'DA', school:'Pioneer High School',  group:'Math - Dual Enrollment Summer 2026',     term:'SUMMER 2026', course:'STAT 200 — Intro Statistics',   institution:'wvcc', enrolledDate:'Jun 30, 2026', enrollmentStatus:'in-progress', courseStart:'2026-06-23', courseEnd:'2026-08-15', currentGrade:'B', credits:3 },
    { id:'DE-2026-0517', sisId:'STU-26-1008', lastName:'Osei',      firstName:'Amara',    initials:'AO', school:'Central High School',  group:'English - Dual Enrollment Summer 2026',         term:'SUMMER 2026', course:'ENGL 205 — American Lit',       institution:'mesa', enrolledDate:'Jul 2, 2026',  enrollmentStatus:'in-progress', courseStart:'2026-06-29', courseEnd:'2026-08-21', currentGrade:'B+', credits:3 },
    { id:'DE-2026-0518', sisId:'STU-26-1008', lastName:'Osei',      firstName:'Amara',    initials:'AO', school:'Central High School',  group:'Math - Dual Enrollment Summer 2026',     term:'SUMMER 2026', course:'MATH 150 — College Algebra',    institution:'mesa', enrolledDate:'Jun 15, 2026', enrollmentStatus:'in-progress', courseStart:'2026-06-15', courseEnd:'2026-08-07', currentGrade:'A-', credits:3 },
    { id:'DE-2026-0523', sisId:'STU-26-1009', lastName:'Park',      firstName:'Ji-woo',   initials:'JP', school:'Eastside High',        group:'Engineering - Dual Enrollment Summer 2026',     term:'SUMMER 2026', course:'CS 210 — Data Structures',      institution:'asu',  enrolledDate:'Jul 1, 2026',  enrollmentStatus:'in-progress', courseStart:'2026-06-22', courseEnd:'2026-08-14', currentGrade:'A-', credits:4 },
    { id:'DE-2026-0529', sisId:'STU-26-1010', lastName:'Reyes',     firstName:'Camila',   initials:'CR', school:'Pioneer High School',  group:'Math - Dual Enrollment Summer 2026',     term:'SUMMER 2026', course:'STAT 200 — Intro Statistics',   institution:'wvcc', enrolledDate:'Jun 30, 2026', enrollmentStatus:'in-progress', courseStart:'2026-06-23', courseEnd:'2026-08-15', currentGrade:'C+', credits:3 },
    { id:'DE-2026-0550',  sisId:'STU-26-1019', lastName:'Sanders',  firstName:'Olivia',   initials:'OS', school:'Pioneer High School',  group:'Math - Dual Enrollment Summer 2026',     term:'SUMMER 2026', course:'STAT 200 — Intro Statistics',   institution:'wvcc', enrolledDate:'Jun 23, 2026', enrollmentStatus:'withdrawn', withdrawnDate:'Jul 5, 2026' },
    /* SUMMER 2026 non-letter completed grades — the term variants A/B open on, so the Completed tab
       surfaces Pass / Completed / Fail without switching terms. Accelerated summer sections that already
       wrapped (grade posted before AE_TODAY = Jul 8). Single-course students, so no page-split. */
    { id:'DE-2026-0554', sisId:'STU-26-1096', lastName:'Rivera',    firstName:'Sofia',    initials:'SR', school:'Pioneer High School',  group:'Health & Wellness - Concurrent Enrollment Summer 2026',           term:'SUMMER 2026', course:'PE 101 — Fitness & Wellness',        institution:'wvcc', enrolledDate:'Jun 10, 2026', enrollmentStatus:'completed', grade:'Pass',      credits:1, gradePosted:'Jul 3, 2026' },
    { id:'DE-2026-0555', sisId:'STU-26-1097', lastName:'Nakamura',  firstName:'Kenji',    initials:'KN', school:'Central High School',  group:'College Success 26-27',  term:'SUMMER 2026', course:'COLL 101 — College Success Seminar', institution:'mesa', enrolledDate:'Jun 12, 2026', enrollmentStatus:'completed', grade:'Completed', credits:1, gradePosted:'Jul 4, 2026' },
    { id:'DE-2026-0556', sisId:'STU-26-1098', lastName:'Boateng',   firstName:'Kwame',    initials:'KB', school:'Eastside High',        group:'CTE Pathway', term:'SUMMER 2026', course:'CTE 200 — Career Internship',        institution:'asu',  enrolledDate:'Jun 10, 2026', enrollmentStatus:'completed', grade:'Fail',      credits:2, gradePosted:'Jul 5, 2026' },
  ];

  /* ── Bulk fixture generator (Jul 9) ──
     Expands the roster to ~50 students so pagination, bulk-select, and the course
     dropdown filter all have real scale to demo. Deterministic — cycles fixed name/grade
     pools by index instead of Math.random, so the dataset is stable across reloads/screenshots.
     Reuses the SAME course catalog as the hand-authored rows above (not new course names) so
     multiple students land on each course, so filtering to a single course still returns a
     realistic spread of students. Split roughly evenly across BOTH terms (not just SPRING) —
     SUMMER 2026 gets its own Completed rows too (some accelerated summer sections wrap up
     early), not just In Progress/Withdrawn, so the term dropdown has a real spread either way. */
  (function () {
    var BULK_NAMES = [
      ['Ethan','Kowalski'], ['Ava','Nakamura'], ['Liam','Osborne'], ['Mia','Delacroix'],
      ['Benjamin','Ferreira'], ['Harper','Solis'], ['Lucas','Whitfield'], ['Chloe','Adeyemi'],
      ['Mason','Kaczmarek'], ['Layla','Haddad'], ['Elijah','Petrov'], ['Nora','Castellano'],
      ['Logan','Abernathy'], ['Aaliyah','Diallo'], ['Caleb','Yamada'], ['Ruby','Fontaine'],
      ['Wyatt','Okonkwo'], ['Stella','Marchetti'], ['Owen','Nakashima'], ['Violet','Okafor'],
      ['Julian','Esposito'], ['Hazel','Beaumont'], ['Miles','Andersson'], ['Ivy','Salgado'],
      ['Xavier','Njoroge'], ['Piper','Lindqvist'], ['Theo','Castillo'], ['Willa','Berglund'],
    ];
    var SCHOOLS = ['Pioneer High School', 'Westview Academy', 'Eastside High', 'Central High School'];
    var GROUPS  = ['English', 'Mathematics', 'Sciences', 'Social Sciences', 'Engineering'];
    var GRADES  = ['A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D+'];
    var CURRENT_GRADES = ['A-', 'B+', 'B', 'B-', 'C+', 'C'];

    // Same 17 SPRING courses used by the hand-authored rows above — [name, institution, credits]
    var SPRING_COURSES = [
      ['ENGL 101 — Composition', 'wvcc', 3], ['SOC 110 — Intro Sociology', 'wvcc', 3],
      ['CS 150 — Python Programming', 'asu', 4], ['PSYC 101 — Intro Psychology', 'asu', 3],
      ['HIST 105 — U.S. History', 'mesa', 3], ['MATH 120 — Calculus I', 'wvcc', 4],
      ['BIOL 110 — Intro Biology', 'mesa', 4], ['ENGR 101 — Intro to Engineering', 'wvcc', 3],
      ['CHEM 101 — General Chemistry', 'asu', 4], ['MATH 110 — College Algebra', 'asu', 3],
      ['ENGL 102 — Composition II', 'mesa', 3], ['POLS 101 — American Government', 'wvcc', 3],
      ['BIOL 111 — Human Anatomy', 'asu', 4], ['STAT 201 — Statistics II', 'asu', 3],
      ['CS 151 — Intro to Programming', 'mesa', 4], ['MATH 121 — Calculus II', 'wvcc', 4],
      ['HIST 106 — World History', 'asu', 3],
    ];
    var SPRING_DATE_PAIRS = [
      ['May 3, 2026','May 5, 2026'], ['May 8, 2026','May 10, 2026'], ['May 12, 2026','May 14, 2026'],
      ['May 15, 2026','May 17, 2026'], ['May 19, 2026','May 21, 2026'], ['May 22, 2026','May 24, 2026'],
      ['May 26, 2026','May 28, 2026'], ['May 29, 2026','Jun 2, 2026'], ['Jun 3, 2026','Jun 5, 2026'],
      ['Jun 6, 2026','Jun 9, 2026'], ['Jun 10, 2026','Jun 12, 2026'], ['Jun 13, 2026','Jun 16, 2026'],
    ];

    // Same 4 SUMMER courses used by the hand-authored rows above — [name, institution, courseStart, courseEnd, credits]
    var SUMMER_COURSES = [
      ['STAT 200 — Intro Statistics', 'wvcc', '2026-06-23', '2026-08-15', 3],
      ['ENGL 205 — American Lit',     'mesa', '2026-06-29', '2026-08-21', 3],
      ['MATH 150 — College Algebra',  'mesa', '2026-06-15', '2026-08-07', 3],
      ['CS 210 — Data Structures',    'asu',  '2026-06-22', '2026-08-14', 4],
    ];
    var SUMMER_DATE_PAIRS = [
      ['Jun 15, 2026','Jul 10, 2026'], ['Jun 18, 2026','Jul 12, 2026'], ['Jun 22, 2026','Jul 15, 2026'],
      ['Jun 25, 2026','Jul 18, 2026'], ['Jun 29, 2026','Jul 20, 2026'], ['Jul 2, 2026','Jul 22, 2026'],
    ];
    // Accelerated summer sections that already wrapped — enrolled early June, grade posted before AE_TODAY (Jul 8).
    var SUMMER_COMPLETED_DATE_PAIRS = [
      ['Jun 8, 2026','Jun 30, 2026'], ['Jun 10, 2026','Jul 1, 2026'], ['Jun 12, 2026','Jul 2, 2026'],
      ['Jun 15, 2026','Jul 3, 2026'], ['Jun 17, 2026','Jul 4, 2026'], ['Jun 19, 2026','Jul 5, 2026'],
      ['Jun 22, 2026','Jul 6, 2026'], ['Jun 24, 2026','Jul 7, 2026'],
    ];

    // 28 names split across BOTH terms/buckets so the term dropdown has a real spread either
    // way — not just piling everything onto SPRING: 10 spring-completed, 8 summer-completed,
    // 8 summer-in-progress, 2 summer-withdrawn (withdrawn stays the smallest bucket by design).
    BULK_NAMES.forEach(function (name, i) {
      var sisId    = 'STU-26-' + (1020 + i);
      var initials = name[0][0] + name[1][0];
      var school   = SCHOOLS[i % SCHOOLS.length];

      if (i < 10) {
        // Completed — SPRING 2026. A dual-enrollment student typically finishes 2–3 courses
        // in a term, so give the roster a realistic multi-course spread (varied 1–3, mostly
        // multi) — this is what makes the By-Student rollup (# Courses · Credits Earned ·
        // Passed X of Y) and the multi-row rowspan grouping actually mean something. The three
        // SPRING_COURSES offsets (0,7,14) stay distinct across 17 courses, so no student gets
        // the same course twice. id uses i*3 so up to 3 rows/student never collide.
        var SPRING_COURSE_COUNTS = [3, 2, 2, 1, 2, 3, 2, 2, 1, 3];
        var courseCount = SPRING_COURSE_COUNTS[i];
        for (var c = 0; c < courseCount; c++) {
          var course = SPRING_COURSES[(i + c * 7) % SPRING_COURSES.length];
          var dates  = SPRING_DATE_PAIRS[(i + c * 3) % SPRING_DATE_PAIRS.length];
          ALL_ACTIVE_APPS.push({
            id: 'DE-2026-0' + (560 + i * 3 + c), sisId: sisId, lastName: name[1], firstName: name[0], initials: initials,
            school: school, group: GROUPS[(i + c) % GROUPS.length], term: 'SPRING 2026',
            course: course[0], institution: course[1],
            enrolledDate: dates[0], enrollmentStatus: 'completed',
            grade: GRADES[(i + c * 3) % GRADES.length], credits: course[2], gradePosted: dates[1],
          });
        }
      } else if (i < 18) {
        // Completed — SUMMER 2026 (accelerated sections that already wrapped up). Some students
        // took two summer courses; only 4 SUMMER_COURSES exist, so the (scIdx+sc) offset keeps a
        // 2-course student on two distinct offerings. id uses i*2 so 2 rows/student don't collide.
        var scIdx = i - 10;
        var SUMMER_COMPLETED_COUNTS = [2, 1, 2, 1, 1, 2, 1, 2]; // scIdx 0..7
        var scCount = SUMMER_COMPLETED_COUNTS[scIdx];
        for (var sc = 0; sc < scCount; sc++) {
          var scCourse = SUMMER_COURSES[(scIdx + sc) % SUMMER_COURSES.length];
          var scDates  = SUMMER_COMPLETED_DATE_PAIRS[(scIdx + sc) % SUMMER_COMPLETED_DATE_PAIRS.length];
          ALL_ACTIVE_APPS.push({
            id: 'DE-2026-0' + (800 + i * 2 + sc), sisId: sisId, lastName: name[1], firstName: name[0], initials: initials,
            school: school, group: GROUPS[(i + sc) % GROUPS.length], term: 'SUMMER 2026',
            course: scCourse[0], institution: scCourse[1],
            enrolledDate: scDates[0], enrollmentStatus: 'completed',
            grade: GRADES[(i + sc * 2) % GRADES.length], credits: scCourse[4], gradePosted: scDates[1],
          });
        }
      } else if (i < 26) {
        // In Progress — SUMMER 2026, alternating Canvas/Quottly-sourced courses. The Quottly
        // ones stay invisible in the In Progress bucket by design (see aeIsCanvasLive) —
        // they'll surface once completed, same as the hand-authored Quottly rows above.
        var ipCourse = SUMMER_COURSES[i % SUMMER_COURSES.length];
        var ipDates  = SUMMER_DATE_PAIRS[i % SUMMER_DATE_PAIRS.length];
        ALL_ACTIVE_APPS.push({
          id: 'DE-2026-0' + (750 + i), sisId: sisId, lastName: name[1], firstName: name[0], initials: initials,
          school: school, group: GROUPS[i % GROUPS.length], term: 'SUMMER 2026',
          course: ipCourse[0], institution: ipCourse[1],
          enrolledDate: ipDates[0], enrollmentStatus: 'in-progress',
          courseStart: ipCourse[2], courseEnd: ipCourse[3], currentGrade: CURRENT_GRADES[i % CURRENT_GRADES.length],
        });
      } else {
        // Withdrawn — SUMMER 2026 (2 more, bringing the bucket to 3 total — smallest by design).
        var wCourse = SUMMER_COURSES[i % SUMMER_COURSES.length];
        var wDates  = SUMMER_DATE_PAIRS[i % SUMMER_DATE_PAIRS.length];
        ALL_ACTIVE_APPS.push({
          id: 'DE-2026-0' + (700 + i), sisId: sisId, lastName: name[1], firstName: name[0], initials: initials,
          school: school, group: GROUPS[i % GROUPS.length], term: 'SUMMER 2026',
          course: wCourse[0], institution: wCourse[1],
          enrolledDate: wDates[0], enrollmentStatus: 'withdrawn', withdrawnDate: wDates[1],
        });
      }
    });
  })();

  /* Course-level detail (room, teacher, description) for the Active Enrollments "View Info"
     modal — keyed by course name since multiple students share the same course offering,
     avoiding duplicating this per enrollment record. Completed courses fall back to
     SPRING_TERM_RANGE for start/end (display only, not used in any progress math). */
  const SPRING_TERM_RANGE = { start: '2026-01-12', end: '2026-05-15' };
  const COURSE_INFO = {
    'ENGL 101 — Composition':          { room: 'Humanities 204',        teacher: 'Dr. Patricia Owens', description: 'An introduction to college-level composition, with an emphasis on argumentative and analytical writing.' },
    'SOC 110 — Intro Sociology':       { room: 'Social Sciences 118',   teacher: 'Prof. Daniel Reyes', description: 'Survey of sociological perspectives on social structure, culture, and institutions.' },
    'CS 150 — Python Programming':     { room: 'Tech Building 302',     teacher: 'Dr. Wei Chen',       description: 'Fundamentals of programming using Python, covering control flow, data structures, and basic algorithms.' },
    'PSYC 101 — Intro Psychology':     { room: 'Behavioral Sciences 110', teacher: 'Dr. Lauren Ito',   description: 'Introduction to the scientific study of behavior and mental processes.' },
    'HIST 105 — U.S. History':         { room: 'Liberal Arts 220',      teacher: 'Prof. Marcus Webb',  description: 'Survey of United States history from colonization through Reconstruction.' },
    'MATH 120 — Calculus I':           { room: 'Science Center 150',    teacher: 'Dr. Anita Shah',     description: 'Limits, derivatives, and applications of differential calculus.' },
    'BIOL 110 — Intro Biology':        { room: 'Science Center 210',    teacher: 'Dr. Helen Kim',      description: 'Introduction to cellular and molecular biology, genetics, and evolution.' },
    'ENGR 101 — Intro to Engineering': { room: 'Engineering 101',       teacher: 'Prof. Sam Torres',   description: 'Overview of engineering disciplines, design thinking, and problem-solving methods.' },
    'CHEM 101 — General Chemistry':    { room: 'Science Center 305',    teacher: 'Dr. Nora Feldman',   description: 'Atomic structure, chemical bonding, stoichiometry, and reaction types.' },
    'MATH 110 — College Algebra':      { room: 'Science Center 150',    teacher: 'Dr. Anita Shah',     description: 'Functions, equations, and graphing techniques preparing students for calculus.' },
    'ENGL 102 — Composition II':       { room: 'Humanities 204',        teacher: 'Dr. Patricia Owens', description: 'Continuation of ENGL 101 with a focus on research writing and rhetorical analysis.' },
    'POLS 101 — American Government':  { room: 'Liberal Arts 118',      teacher: 'Prof. Michael Alvarez', description: 'Structure and function of American government institutions, federalism, and civil liberties.' },
    'BIOL 111 — Human Anatomy':        { room: 'Science Center 214',    teacher: 'Dr. Helen Kim',      description: 'Structure and function of human organ systems.' },
    'STAT 201 — Statistics II':        { room: 'Science Center 160',    teacher: 'Dr. Anita Shah',     description: 'Inferential statistics, hypothesis testing, and regression analysis.' },
    'CS 151 — Intro to Programming':   { room: 'Tech Building 302',     teacher: 'Dr. Wei Chen',       description: 'Foundational programming concepts using a general-purpose language.' },
    'MATH 121 — Calculus II':          { room: 'Science Center 150',    teacher: 'Dr. Anita Shah',     description: 'Techniques of integration, sequences, and series.' },
    'HIST 106 — World History':        { room: 'Liberal Arts 220',      teacher: 'Prof. Marcus Webb',  description: 'Survey of major civilizations and global historical developments.' },
    'STAT 200 — Intro Statistics':     { room: 'Science Center 160',    teacher: 'Dr. Anita Shah',     description: 'Descriptive statistics, probability, and introductory inferential methods.', gradeSource: 'canvas' },
    'ENGL 205 — American Lit':         { room: 'Humanities 210',        teacher: 'Dr. Patricia Owens', description: 'Survey of American literature from the colonial period to the present.', gradeSource: 'quottly' },
    'MATH 150 — College Algebra':      { room: 'Science Center 150',    teacher: 'Dr. Anita Shah',     description: 'Functions, equations, and graphing techniques preparing students for calculus.', gradeSource: 'canvas' },
    'CS 210 — Data Structures':        { room: 'Tech Building 305',     teacher: 'Dr. Wei Chen',       description: 'Data structures and algorithm analysis for efficient program design.', gradeSource: 'quottly' },
    /* gradeScheme: how the college reports the grade. Absent = 'letter' (A–F, the default/majority).
       'passfail' = Pass/Fail or Credit/No-Credit (PE, CTE labs, work-based learning). 'complete' =
       satisfactory-Completed, no grade (college-success seminars, some non-credit workforce courses).
       The HS still has to import whatever basis the college posts, so all three flow through export. */
    'PE 101 — Fitness & Wellness':        { room: 'Athletic Center 100',  teacher: 'Coach Renee Alvarado', description: 'Foundations of personal fitness, wellness, and lifetime physical activity.', gradeScheme: 'passfail' },
    'COLL 101 — College Success Seminar': { room: 'Student Center 120',   teacher: 'Dr. Marcus Bell',      description: 'Study strategies, time management, and college-readiness skills for first-term students.', gradeScheme: 'complete' },
    'WELD 110 — Intro to Welding':        { room: 'Trades Building 40',   teacher: 'Prof. Hank Dietrich',  description: 'Hands-on introduction to oxy-fuel and arc welding processes, safety, and shop practice.', gradeScheme: 'passfail' },
    'CTE 200 — Career Internship':        { room: 'Off-site placement',   teacher: 'Prof. Dana Whitmore',  description: 'Supervised work-based learning placement in the student’s career field of interest.', gradeScheme: 'passfail' },
  };
  /* Grade-reporting source per course: 'canvas' = the HE institution teaches it through their
     own Canvas with a daily/weekly grade-reporting integration, so live in-progress data is
     real. 'quottly' (the default/majority case) only reports at midterm — no meaningful
     "current grade" exists between term start and end, so those courses don't appear in
     In Progress at all until they have something to report. Only set on SUMMER 2026 (the
     in-progress term) courses; completed courses don't need it. */

  const ALL_DENIED_APPS = [
    {
      id:'DE-2026-0334', lastName:'Johnson', firstName:'Tyler', initials:'TJ',
      school:'Pioneer High School', group:'Math - Dual Enrollment Fall 2026', term:'FALL 2026', course:null, institution:'asu',
      deniedDate:'Jun 23, 2026', deniedBy:'Morgan Lee', deniedState:'Counselor Review',
      reason:"Tyler's current GPA of 2.4 doesn't meet ASU's minimum of 3.0 for dual enrollment. I spoke with his math teacher and academic advisor — both feel he needs another semester to build a stronger foundation before taking college-level coursework. I'd encourage him to reapply in the fall once his grades reflect that progress.",
    },
    {
      id:'DE-2026-0347', lastName:'Lee', firstName:'Samantha', initials:'SL',
      school:'Eastside High', group:'Science - Dual Enrollment Fall 2026', term:'FALL 2026', course:null, institution:'wvcc',
      deniedDate:'Jun 14, 2026', deniedBy:'Morgan Lee', deniedState:'Counselor Review',
      reason:"Samantha hasn't completed the required prerequisite coursework — specifically, she's missing both Biology I and Algebra II, which WVCC requires before enrolling in General Chemistry. Her science teacher confirmed she's on track to finish those by end of semester. I'm recommending she reapplies for the spring term.",
    },
    {
      id:'DE-2026-0361', lastName:'Brown', firstName:'Ethan', initials:'EB',
      school:'Central High School', group:'Engineering - Dual Enrollment Fall 2026', term:'FALL 2026', course:null, institution:'mesa',
      deniedDate:'Jun 6, 2026', deniedBy:'James Park', deniedState:'Counselor Review',
      reason:"Ethan is currently in 9th grade, and Mesa Community College requires students to be in 10th grade or above for dual enrollment eligibility. He's a strong student and genuinely interested in CS — I've let him and his family know he'll be eligible to apply next year and encouraged him to take our school's intro programming elective in the meantime.",
    },
    {
      id:'DE-2026-0356', lastName:'Okafor', firstName:'Nia', initials:'NO',
      school:'Pioneer High School', group:'Science - Dual Enrollment Fall 2026', term:'FALL 2026', course:null, institution:'wvcc',
      deniedDate:'Jun 10, 2026', deniedBy:'WVCC Admissions', deniedState:'Institution Review',
      reason:"I approved Nia on our side, but West Valley didn't accept her into the program this term — their placement testing showed she hadn't met the math readiness benchmark for the course sequence she picked. She can retest and reapply for the spring term.",
    },
    {
      id:'DE-2026-0375', lastName:'Wilson', firstName:'Caitlyn', initials:'CW',
      school:'Westview Academy', group:'English - Dual Enrollment Fall 2026', term:'FALL 2026', course:null, institution:'asu',
      deniedDate:'May 29, 2026', deniedBy:'Parent/Guardian', deniedState:'Guardian Consent',
      reason:"Caitlyn's parent/guardian declined to provide consent for dual enrollment this term, so the application was closed at the consent step — it never reached counselor review. The family is welcome to reapply in a future term if they decide to move forward.",
    },
    {
      id:'DE-2026-0312', lastName:'Reyes', firstName:'Diego', initials:'DR',
      school:'Pioneer High School', group:'Math - Dual Enrollment Fall 2026', term:'FALL 2026', course:null, institution:'wvcc',
      deniedDate:'May 21, 2026', deniedBy:'Diego Reyes (Learner)', deniedState:'Guardian Consent', kind:'cancelled',
      reason:"Diego withdrew his own application before consent was finalized — he decided to prioritize a varsity athletics commitment that conflicts with the course schedule. He may revisit dual enrollment in the spring.",
    },
    {
      id:'DE-2026-0320', lastName:'Murphy', firstName:'Hannah', initials:'HM',
      school:'Eastside High', group:'English - Dual Enrollment Fall 2026', term:'FALL 2026', course:null, institution:'asu',
      deniedDate:'May 12, 2026', deniedBy:'Morgan Lee (Counselor)', deniedState:'Counselor Review', kind:'cancelled',
      reason:"Cancelled at the family's request — they're relocating out of district before the term begins. Recommended they connect with their new school's counselor to explore options there.",
    },
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
     Columns: Last Name · First Name · Application ID · Group · Institution|High School ·
     Submission Date · Status · Actions. Centralized so every bucket table + search stays in sync.
     nameCells() emits the two name columns; appHaystack() is the single search index — note Course
     and Term stay searchable even though Course is no longer a visible column (per spec: advanced
     search covers "application details"). */
  /* No high-school sub-line under the name: the table doesn't support cell subtitles, and the HS
     counselor is scoped to their own school(s) so it's redundant. (College admin shows the high
     school as its own column instead.) */
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

  const COUNSELORS = {
    morgan: { name: 'Morgan Lee',   initials: 'ML', school: 'Pioneer High School' },
    james:  { name: 'James Park',   initials: 'JP', school: 'Westview Academy' },
  };

  /* Eligibility requirements per exchange network — sourced from network config, not editable by counselor */
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
  // getEligFlags was removed for MVP — counselor approval is now all-or-nothing.
  function gradeSuffix(g) { return ({ 10:'10th', 11:'11th', 12:'12th' }[g] || g + 'th'); }

