/* Shared changelog for the DE prototypes' dev drawer (learner · HS admin · college admin).
   Rendered in the drawer's "Changelog" sub-panel. Each entry:
       { date: 'Mon D, YYYY', items: [ { text: '…', scope: ['learner'|'hs'|'college'|'all'] } ] }
   A prototype only shows items scoped to it (its key) or to 'all'. Keep items terse and dated;
   add a new dated block at the TOP at the end of each work session. */
window.DEV_CHANGELOG = [
  { date: 'Jul 30, 2026', items: [
    { text: 'New Application step: build the application learners actually fill in. Six fields are always collected because the workflow breaks without them \u2014 each one says why \u2014 then the usual optional asks (transcript, personal statement, self-reported GPA, immunization records, counselor recommendation), each with a line explaining what the learner will be asked for and whether it is required.', scope: ['studio'] },
    { text: 'You can also add any question you like: short answer, paragraph, single or multiple choice, dropdown, number, date, yes/no, or file upload, each with optional help text and its own required flag. Drag the grip to reorder, or focus it and use the arrow keys.', scope: ['studio'] },
    { text: 'The editor is six steps now, one decision each: Schools, Entry points, Application, Approvals, Admin access, Review & save. Admin access is new \u2014 it decides whether each admin sees every application or only the ones they have to act on.', scope: ['studio'] },
    { text: 'Review & save now shows what each admin console ends up containing, and every module says which setting drives it and which step to change it in. The high school card is scoped to this exchange on purpose: a counselor working with several colleges sees the sum of all of them, and this college only controls its own.', scope: ['studio'] },
    { text: 'Workflows carry a version and an activation date, because changing a config does not change applications already in flight. An application follows the rules that were in force when the learner entered \u2014 at invite if they were invited, at submission if they applied themselves.', scope: ['studio'] },
    { text: 'Moving a school off another workflow now asks first, and tells you how many in-flight applications stay where they are. A school follows exactly one workflow in this exchange; it can sit in other colleges\u2019 exchanges under completely different rules.', scope: ['studio'] },
    { text: 'Each workflow can be opened in the learner, high school and college prototypes straight from Review & save, configured exactly as you built it. The configuration travels in the link rather than the prototypes being merged into one app.', scope: ['studio'] },
    { text: 'This drawer now has Navigate and a changelog, matching the other prototypes.', scope: ['studio'] }
  ] },
  { date: 'Jul 30, 2026', items: [
    { text: 'New "See all applications" toggle. Off means this org only ever sees what it has to act on: Waiting, Registered and Closed go, and so does the Applications tab itself \u2014 the only way in is the Review Applications card on the Workspace, which opens the focused review flow. Needs Review stays, because that is the work. Invites stay too, since those are yours.', scope: ['hs', 'college'] },
    { text: 'Global Search follows the same limits. It only searches what you can act on, and the Status filters only offer buckets you can actually reach \u2014 otherwise search would be a back door to the records the setting just took away. Filters you had already selected are cleared rather than left applying invisibly.', scope: ['hs', 'college'] },
    { text: 'The rest of the search options react to the setup too: "Guardian consent pending" disappears when the network does not require consent, "Invited" disappears when this org cannot send invites, and the High school filter only shows when you span more than one school.', scope: ['hs', 'college'] },
    { text: 'New "Institution review" toggle sits with the other approvals. Switch it off and the college owes no decision: Needs Review empties and those applications move to Waiting, but you keep the whole record of what happened. Turn all three approvals off and a learner simply registers after submitting.', scope: ['all'] },
    { text: 'Entry points are now four separate switches — College invite, High school invite, Application URL, Learner dashboard — instead of one Invite / Open / Combined picker. The old picker couldn\'t describe a college that invites while its high schools can\'t, or a signup link without the learner dashboard.', scope: ['hs', 'college'] },
    { text: 'Needs Review now depends only on whether the network requires that approval. It used to disappear on invite-only networks, on the assumption that an invited learner had already been vetted and needed no review. That assumption was wrong: if high school approval is required, every application needs it however the learner started.', scope: ['hs', 'college'] },
    { text: 'The college queue has its own "High schools: 1 / Multiple" toggle for the High School column, which used to be tied to the initiation model. How many high schools you serve has nothing to do with how a learner starts an application.', scope: ['college'] },
    { text: 'Fixed: setting the initiation model to "Invite" used to hide the Needs Review tab and the Review Applications card. College review runs on every application no matter how the learner got in, so an invited learner still needs reviewing.', scope: ['college'] },
    { text: 'Fixed the workspace cards: they\'re a real three-column grid now, so a card that wraps to the second row is exactly one column wide and lines up under the card above it. Invite Learners and View All Applications also resize with everything else — they were pinned to a fixed width and stopped flowing when the window narrowed. Columns drop to two, then one, as the window shrinks.', scope: ['hs', 'college'] },
    { text: 'Fixed the separators between workspace cards when a setting hides one: the borders now recompute, so no stray lines or gaps are left behind. A card hidden by configuration is also greyed out in the Starting Screen menu rather than pretending to be a choice.', scope: ['hs', 'college'] }
  ] },
  { date: 'Jul 29, 2026', items: [
    { text: 'The prototypes are renamed: this one is the "HS Approval Queue" and the college one is the "College Approval Queue" (they were "Counselor Approval Queue" and "College Admin Applications"). The old links still work — they redirect here.', scope: ['hs', 'college'] },
    { text: 'This panel is now "Prototype Settings", opened by a small gear near the top of the right edge instead of the vertical TWEAKS tab. Sections are collapsible cards, there\'s a filter box at the top to find a control by name, the buttons that pick a value now show which one is active, and Changelog / Reset / back-to-prototypes live in a fixed footer.', scope: ['all'] },
    { text: 'Group names now read the way real ones will: "Math - Dual Enrollment Fall 2026", "English - Dual Enrollment Spring 2026", and so on. A few are deliberately off-pattern ("Fall 2026 Cohort", "CTE Pathway", "Early College Academy 26-27") since group names are free text. The Group column truncates long names and shows the full one on hover.', scope: ['all'] },
    { text: 'Cleaned up the sign-in screen to match the design: white page, wider card, a "Sign In" title, and the terms and privacy line in a grey footer.', scope: ['all'] },
    { text: 'The prototype\'s entry screen now calls the persona "HS Admin / Counselor", since the person approving at the school isn\'t always a counselor.', scope: ['hs'] },
    { text: 'Rebuilt the Workspace to match the Figma: a "WORKSPACE" heading with a divider, cards that wrap three-to-a-row (so View All Applications sits on its own row), bigger counts and copy, and the Tasty line-art graphics on the Invite Learners and View All Applications cards instead of the old icon-in-a-circle.', scope: ['hs', 'college'] },
    { text: 'New "Starting Screen" menu next to the Workspace heading: check or uncheck any card to choose what shows on your landing screen. At least one card always stays.', scope: ['hs', 'college'] },
    { text: 'Tracker steps now use the agreed terminology everywhere: "Application Submission", "Parent/Guardian Consent", "High School Approval", "Institution Review", "Register For Courses".', scope: ['all'] },
    { text: 'The Waiting status now reads "Awaiting guardian consent" instead of "Awaiting parent consent".', scope: ['hs', 'college'] },
    { text: 'Swept the learner copy to the same terminology: statuses and headings now say "high school approval" and "institution review" instead of "counselor approval" and "college review", and waits say guardian rather than parent.', scope: ['learner'] },
    { text: 'Copy now says "high school admin" instead of "counselor" wherever we mean whoever approves at the school, since it isn\'t always a counselor. That includes the invite copy, the waiting states, the notification card role, and the application\'s "High School Admin Information" section.', scope: ['learner'] },
    { text: 'The waiting messages and the reminder button now say "high school admin" rather than "HS counselor", since the approver isn\'t always a counselor.', scope: ['college'] },
    { text: 'Closed now includes a "Denied by institution" example — approved by the high school, then turned down by the college — so all three closure types are represented.', scope: ['hs'] },
  ] },
  { date: 'Jul 28, 2026', items: [
    { text: 'The "Add Learners" button on the invite page now works. It opens a choice screen: add one learner with a form, or bulk-upload a CSV of many learners.', scope: ['hs', 'college'] },
    { text: 'Add One Learner reuses the Edit Learner form with everything blank; fill it in and Save adds the learner to your invite list.', scope: ['hs', 'college'] },
    { text: 'Add Multiple Learners is a 4-step wizard: upload a CSV (faked — just click the drop zone), pick a delimiter and a learner group (cohort names, or create a new one), map the file columns to our fields, validate the data, then finish. On the validation step you can flip between the error and success states from this drawer (Concepts → "Bulk upload: success state").', scope: ['hs', 'college'] },
    { text: 'Finishing the bulk upload lets you Finish & Close (adds the learners to your invite list) or Finish & Invite them right away, then lands on Pending Invites with a confirmation.', scope: ['hs', 'college'] },
    { text: 'Cleaned up the invite page to match the latest design: search + Add Learners + an Export option moved into the header, dropped the Middle Name column, renamed "Class Of" to "Expected Grad Year", and tidied the pagination.', scope: ['hs', 'college'] },
    { text: 'Pending Invites now has a search bar and an Export option (in the "…" menu) to download the list as a CSV.', scope: ['hs', 'college'] },
    { text: 'The Registered tab now has a "Selected Course" column showing the course the learner registered for. Long course names truncate with an ellipsis; hover the course to see the full name.', scope: ['hs', 'college'] },
    { text: 'Reordered the queue columns to read broad to narrow so the hierarchy is clearer: Institution, then Group, then Course (High School stays hidden unless you turn on multiple high schools). College admin reads High School, then Group, then Course. Consistent across every tab.', scope: ['hs', 'college'] },
    { text: 'The applicant\'s agreement statements in the application detail view now show as read-only checked checkboxes, so it reads as a signed snapshot.', scope: ['hs', 'college'] },
    { text: 'Dropped the bold styling on the Group column so it matches the other columns.', scope: ['hs', 'college'] },
    { text: 'Attachments in the application detail view are now a concept toggle in this drawer (Concepts section), off by default.', scope: ['hs', 'college'] },
  ] },
  { date: 'Jul 24, 2026', items: [
    { text: 'Exchange networks can now switch off parent/guardian consent and/or counselor approval. When a network doesn\'t require a step, it disappears from the tracker and everywhere it\'s mentioned, and the application stops asking for that info (e.g. no "Counselor Information" section).', scope: ['all'] },
    { text: 'The two approval toggles live in a new "Exchange network" section of this drawer, so you can flip the network\'s requirements on the fly.', scope: ['all'] },
    { text: 'Counselor approval off now hides the Needs Review tab and its workspace card — same as invite-only, since there\'s no counselor review to do — and those applications move into Waiting (awaiting institution review) instead of just disappearing. The tracker\'s active step moves to the next real step too.', scope: ['hs'] },
    { text: 'College review always happens, so turning off counselor or parent approval never moves applications between buckets here — it only updates the tracker steps and the Waiting status labels (e.g. "Awaiting high school approval" becomes "Awaiting college review").', scope: ['college'] },
    { text: 'Rebuilt the service picker to match the real Parchment platform screen: two product cards (Parchment Award / Transcript Services with a Default badge, and Parchment Pathways / Dual Enrollment), a "Set Your Preferences" link, and an "Open" button on each.', scope: ['hs', 'college'] },
    { text: 'Tidied this drawer: consistent section order across all three prototypes (Exchange network · State/Scenario · Appearance · Tools), and removed a duplicate bulk-approve button.', scope: ['all'] },
  ] },
  { date: 'Jul 22, 2026', items: [
    { text: 'New "Awaiting learner registration" status in the Waiting tab: everything\'s approved and it\'s down to the learner to register; the detail view can send them a reminder.', scope: ['hs', 'college'] },
    { text: 'Invited applications now show a lighter version of the full application detail: only what we know before a learner accepts (name, address, phone, date of birth, email). No application ID, course, or unsubmitted fields yet; header reads "Invitation Pending".', scope: ['hs', 'college'] },
    { text: 'The "N remaining" count now shows only on Needs Review applications, not on every status.', scope: ['hs', 'college'] },
    { text: 'Bulk resend on the Invited tab now shows a plain "Invitation sent" toast instead of a sent-vs-failed breakdown, since we don\'t get that detail back in real usage.', scope: ['hs', 'college'] },
  ] },
  { date: 'Jul 17, 2026', items: [
    { text: 'Grades: dropped the progress bar from Completed (it was always 100%); In Progress keeps it.', scope: ['hs'] },
    { text: 'Grades: added an Institution column to every view, so each grade shows which college it came from.', scope: ['hs'] },
    { text: 'Grades: courses that aren\'t graded A–F now show Pass / Fail or Completed pills; CSV export adds a Grading Basis column.', scope: ['hs'] },
    { text: 'Grades: fixed the "More options" export menu so it actually opens, and a multi-course student no longer splits across two pages.', scope: ['hs'] },
  ] },
  { date: 'Jul 15, 2026', items: [
    { text: 'Invites: new "Last Sent" column; resend wired everywhere (per-row, bulk, detail) with a mock ~1-in-4 send failure.', scope: ['hs', 'college'] },
    { text: 'Applications: the options menu now exports the rows in view as CSV (queue + global search); removed the placeholder Add Enrollment button.', scope: ['hs', 'college'] },
    { text: 'Fixed the options-menu dropdown so it actually opens.', scope: ['hs', 'college'] },
    { text: 'Added this changelog to the dev drawer.', scope: ['all'] },
  ] },
  { date: 'Jul 14, 2026', items: [
    { text: 'Aligned personas across prototypes (counselor Morgan Lee, guardian David Cumberland, WVCC in Phoenix).', scope: ['all'] },
    { text: 'College picker now matches the high-school picker; skipped for college-initiated invites.', scope: ['learner'] },
    { text: 'Click anywhere on the account or application form to fill it (demo).', scope: ['learner'] },
    { text: 'Name fields validate first / middle / last; added a FERPA legal-name note to the account form.', scope: ['learner'] },
    { text: 'Fixed the New Application button icon; the Change Email button now confirms.', scope: ['learner'] },
    { text: 'Dev drawer: one-click "Fill learner form" on the invite / edit forms.', scope: ['hs', 'college'] },
    { text: 'Fixed the Waiting tab empty-state wording.', scope: ['college'] },
  ] },
];
