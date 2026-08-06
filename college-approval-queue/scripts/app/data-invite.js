/* scripts/app/data-invite.js — module split from former scripts/app.js (one IIFE, now dissolved to shared global scope). Invite-flow fixtures: COLLEGE_META, LEARNER_ROSTER, INVITED_FIXTURE, COLLEGE_GROUPS.
   Load order is fixed in index.html; do not reorder casually. */

  /* ════════════════════════════════════════════════════════════════
     §1. DATA FIXTURES — apps, colleges, counselors, eligibility reqs
     ════════════════════════════════════════════════════════════════
     ALL_APPS         array of pending applications
     COLLEGES         display name lookup by institution key
     ADMINS           college-admin persona data for dev-panel switching
     COLLEGE_REQS     minGpa, minGrade, prereqRequired per institution
     ════════════════════════════════════════════════════════════════ */

  /* ════════════════════════════════════════════════════════════════
     §2. INVITE FLOW FIXTURES — data for the counselor invite workflow
     ════════════════════════════════════════════════════════════════
     COLLEGE_META     display data per institution (color, logo init)
     LEARNER_ROSTER   10 learners for the invite selection table
     COLLEGE_GROUPS   available enrollment groups per institution
     ════════════════════════════════════════════════════════════════ */

  var COLLEGE_META = {
    wvcc: { name:'West Valley Community College', city:'Surprise, AZ',  abbr:'WVCC', color:'#2e6da4' },
    asu:  { name:'Arizona State University',      city:'Tempe, AZ',     abbr:'ASU',  color:'#8C1D40' },
    mesa: { name:'Mesa Community College',        city:'Mesa, AZ',      abbr:'MCC',  color:'#1d6b40' },
  };

  /* Not-yet-invited learners — inviting from this list ADDS rows to INVITED_FIXTURE
     (the Pending Invites screen). Keep the two lists disjoint or the flow can only
     ever re-invite. */
  var LEARNER_ROSTER = [
    { id:'20481', lastName:'Dawson',   firstName:'Emily',    middleName:'Rose',   initials:'ED', classOf:2027, dob:'Mar 14, 2010', ssnLast4:'4821', missingData:false },
    { id:'31752', lastName:'Escobar',  firstName:'Luis',     middleName:'',       initials:'LE',    classOf:2026, dob:'Jul 2, 2009',  ssnLast4:'7345', missingData:false },
    { id:'48063', lastName:'Gao',      firstName:'Kevin',    middleName:'',       initials:'KG',       classOf:2027, dob:'Dec 8, 2009',  ssnLast4:'n/o',  missingData:true  },
    { id:'59314', lastName:'Herrera',  firstName:'Sofia',    middleName:'Isabel', initials:'SH', classOf:2026, dob:'Feb 21, 2010', ssnLast4:'2210', missingData:false },
    { id:'60825', lastName:'Ibrahim',  firstName:'Yusuf',    middleName:'',       initials:'YI', classOf:2026, dob:'Sep 5, 2009',  ssnLast4:'8804', missingData:false },
    { id:'71536', lastName:'Kowalski', firstName:'Anna',     middleName:'Marie',  initials:'AK',    classOf:2027, dob:'May 30, 2010', ssnLast4:'1937', missingData:false },
    { id:'82947', lastName:'Larsen',   firstName:'Peter',    middleName:'',       initials:'PL',       classOf:2026, dob:'Oct 12, 2009', ssnLast4:'n/o',  missingData:true  },
    { id:'93158', lastName:'Moreno',   firstName:'Isabella', middleName:'',       initials:'IM', classOf:2026, dob:'Jan 26, 2010', ssnLast4:'5568', missingData:false },
    { id:'14269', lastName:'Novak',    firstName:'Daniel',   middleName:'James',  initials:'DN', classOf:2027, dob:'Aug 17, 2010', ssnLast4:'3092', missingData:false },
    { id:'25370', lastName:'Quinn',    firstName:'Maya',     middleName:'',       initials:'MQ',    classOf:2026, dob:'Apr 3, 2010',  ssnLast4:'6714', missingData:false },
  ];

  /* College-initiated invites — Kathy/WVCC inviting learners across the
     exchange network to apply. Institution is constant (WVCC); the column
     shows the learner's high school. */
  var INVITED_FIXTURE = [
    { id:'43536', lastName:'Abrams',    firstName:'Jessica',   college:'West Valley Community College', group:'English - Dual Enrollment Fall 2026',         term:'FALL 2026',   course:null, dateInvited:'Jun 28, 2026' },
    { id:'57587', lastName:'Adams',     firstName:'Matthew',   college:'West Valley Community College', group:'Math - Dual Enrollment Fall 2026',     term:'FALL 2026',   course:null,                     dateInvited:'Jun 27, 2026' },
    { id:'75088', lastName:'Adamson',   firstName:'Samantha',  college:'West Valley Community College',    group:'Science - Dual Enrollment Fall 2026',        term:'FALL 2026',   course:null,                     dateInvited:'Jun 25, 2026' },
    { id:'05467', lastName:'Aitken',    firstName:'Triston',   college:'West Valley Community College',    group:'Engineering - Dual Enrollment Fall 2026',     term:'FALL 2026',   course:null,   dateInvited:'Jun 23, 2026' },
    { id:'84257', lastName:'Alexander', firstName:'Carter',    college:'West Valley Community College',       group:'Math - Dual Enrollment Fall 2026',     term:'FALL 2026',   course:null,                     dateInvited:'Jun 21, 2026' },
    { id:'65870', lastName:'Alexander', firstName:'David',     college:'West Valley Community College',       group:'Engineering - Dual Enrollment Fall 2026',     term:'FALL 2026',   course:null,                     dateInvited:'Jun 19, 2026' },
    { id:'42325', lastName:'Allan',     firstName:'Gloria',    college:'West Valley Community College', group:'Social Science - Dual Enrollment Fall 2026', term:'FALL 2026',   course:null,                     dateInvited:'Jun 17, 2026' },
    { id:'21956', lastName:'Allan',     firstName:'Samuel',    college:'West Valley Community College', group:'English - Dual Enrollment Fall 2026',         term:'FALL 2026',   course:null,                     dateInvited:'Jun 15, 2026' },
    { id:'53036', lastName:'Allison',   firstName:'Elizabeth', college:'West Valley Community College', group:'Social Science - Dual Enrollment Fall 2026', term:'FALL 2026',   course:null,dateInvited:'Jun 12, 2026' },
    { id:'17436', lastName:'Anderson',  firstName:'Jordan',    college:'West Valley Community College',    group:'English - Dual Enrollment Spring 2026',         term:'SPRING 2026', course:null,                     dateInvited:'Jun 10, 2026' },
    { id:'29847', lastName:'Bailey',    firstName:'Morgan',    college:'West Valley Community College',      group:'Science - Dual Enrollment Fall 2026',        term:'FALL 2026',   course:null,                     dateInvited:'Jun 8, 2026' },
    { id:'38521', lastName:'Barnes',    firstName:'Taylor',    college:'West Valley Community College',      group:'Math - Dual Enrollment Fall 2026',     term:'FALL 2026',   course:null,  dateInvited:'Jun 5, 2026' },
    { id:'47193', lastName:'Bennett',   firstName:'Alex',      college:'West Valley Community College',      group:'Engineering - Dual Enrollment Fall 2026',     term:'FALL 2026',   course:null,                     dateInvited:'Jun 3, 2026' },
    { id:'56284', lastName:'Brooks',    firstName:'Casey',     college:'West Valley Community College',      group:'Math - Dual Enrollment Spring 2026',     term:'SPRING 2026', course:null,                     dateInvited:'May 30, 2026' },
    { id:'63917', lastName:'Campbell',  firstName:'Riley',     college:'West Valley Community College',       group:'Science - Dual Enrollment Spring 2026',        term:'SPRING 2026', course:null,                     dateInvited:'May 27, 2026' },
    { id:'72048', lastName:'Carter',    firstName:'Jordan',    college:'West Valley Community College', group:'Social Science - Dual Enrollment Fall 2026', term:'FALL 2026',   course:null,                     dateInvited:'May 23, 2026' },
  ];
  /* inviteType: every pending invite today is an invite to APPLY. 'register' is a second
     flavor a later feature adds (admit-only hold, then invite to register); kept as a
     distinct field value so the two invite kinds never conflate. */
  (function () {
    var resent = ['Jul 10, 2026', 'Jul 6, 2026', 'Jul 1, 2026'];   // "reminded again" dates for variety
    INVITED_FIXTURE.forEach(function (e, i) {
      if (!e.inviteType) e.inviteType = 'apply';
      // Backend send reliability: ~1 in 4 sends fail (message-service hiccup). Deterministic
      // by index so the demo repeats. A failed send does NOT advance Last Sent.
      if (e.sendFails === undefined) e.sendFails = (i % 4 === 3);
      // Last Sent = most recent invite/reminder that actually went out. Most were invited once
      // (== dateInvited); a few non-failing rows were nudged again more recently, for variety.
      if (!e.lastSent) e.lastSent = (!e.sendFails && i % 3 === 1) ? resent[(i / 3 | 0) % resent.length] : e.dateInvited;
    });
  })();

  var COLLEGE_GROUPS = {
    wvcc: [
      { id:'wvcc-g1', name:'English - Dual Enrollment Fall 2026',         term:'FALL 2026',   description:'Have a high school cumulative GPA of 2.5, immediately prior to taking the course; and, Earn an A, B, or C in the eligible course(s).', deadline:'JUL 20, 2026' },
      { id:'wvcc-g2', name:'Math - Dual Enrollment Fall 2026',     term:'FALL 2026',   description:'Have a high school cumulative GPA of 2.5, immediately prior to taking the course; and, Earn an A, B, or C in the eligible course(s).', deadline:'JUL 20, 2026' },
      { id:'wvcc-g3', name:'Science - Dual Enrollment Fall 2026',        term:'FALL 2026',   description:'Have a high school cumulative GPA of 2.5, immediately prior to taking the course; and, Earn an A, B, or C in the eligible course(s).', deadline:'JUL 20, 2026' },
      { id:'wvcc-g4', name:'Engineering - Dual Enrollment Spring 2026',     term:'SPRING 2026', description:'Have a high school cumulative GPA of 2.5, immediately prior to taking the course; and, Earn an A, B, or C in the eligible course(s).', deadline:'DEC 19, 2026' },
      { id:'wvcc-g5', name:'Social Science - Dual Enrollment Spring 2026', term:'SPRING 2026', description:'Have a high school cumulative GPA of 2.5, immediately prior to taking the course; and, Earn an A, B, or C in the eligible course(s).', deadline:'DEC 19, 2026' },
      { id:'wvcc-g6', name:'English - Dual Enrollment Spring 2026',         term:'SPRING 2026', description:'Have a high school cumulative GPA of 2.5, immediately prior to taking the course; and, Earn an A, B, or C in the eligible course(s).', deadline:'DEC 19, 2026' },
    ],
    asu: [
      { id:'asu-g1', name:'Math - Dual Enrollment Fall 2026', term:'FALL 2026',   description:'Have a high school cumulative GPA of 3.0, immediately prior to taking the course; and, Earn an A, B, or C in the eligible course(s).', deadline:'AUG 1, 2026' },
      { id:'asu-g2', name:'Early College Academy 26-27', term:'FALL 2026',   description:'Have a high school cumulative GPA of 3.0, immediately prior to taking the course; and, Earn an A, B, or C in the eligible course(s).', deadline:'AUG 1, 2026' },
      { id:'asu-g3', name:'Science - Dual Enrollment Spring 2026',    term:'SPRING 2026', description:'Have a high school cumulative GPA of 3.0, immediately prior to taking the course; and, Earn an A, B, or C in the eligible course(s).', deadline:'JAN 10, 2027' },
    ],
    mesa: [
      { id:'mesa-g1', name:'Fall 2026 Cohort', term:'FALL 2026',   description:'Have a high school cumulative GPA of 2.5, immediately prior to taking the course; and, Earn an A, B, or C in the eligible course(s).', deadline:'JUL 15, 2026' },
      { id:'mesa-g2', name:'English - Dual Enrollment Fall 2026',         term:'FALL 2026',   description:'Have a high school cumulative GPA of 2.5, immediately prior to taking the course; and, Earn an A, B, or C in the eligible course(s).', deadline:'JUL 15, 2026' },
      { id:'mesa-g3', name:'Math - Dual Enrollment Spring 2026',     term:'SPRING 2026', description:'Have a high school cumulative GPA of 2.5, immediately prior to taking the course; and, Earn an A, B, or C in the eligible course(s).', deadline:'DEC 15, 2026' },
    ],
  };
