import fs from "node:fs/promises";
import { SpreadsheetFile, Workbook } from "@oai/artifact-tool";

const outputDir = "outputs/app-feature-evaluation-2026-09-21";
const outputPath = `${outputDir}/NAFS_App_Feature_Evaluation_2026-09-21.xlsx`;
const font = "Arial";
const navy = "#17324D";
const blue = "#2F75B5";
const lightBlue = "#D9EAF7";
const green = "#2E7D32";
const lightGreen = "#E2F0D9";
const amber = "#B26A00";
const lightAmber = "#FFF2CC";
const red = "#B91C1C";
const lightRed = "#FCE8E6";
const gray = "#667085";
const lightGray = "#F2F4F7";

const features = [
  ["F-001","Public experience","Landing page","Public","Yes","No","No",4,4,4,4,4,"Ready","P2","Role-aware calls to action; false live metrics removed.","Keep claims tied to measurable platform data."],
  ["F-002","Authentication","Credentials login","Public / all roles","Yes","Yes","Yes",5,4,5,4,5,"Ready","P3","NextAuth credentials flow with password verification.","Add automated login regression tests."],
  ["F-003","Authentication","Google OAuth login","Public / all roles","Yes","Yes","Yes",3,4,4,3,3,"Needs configuration","P1","Provider exists; depends on deployment OAuth credentials and callback configuration.","Validate production callback URL and first-login role policy."],
  ["F-004","Authentication","Student self-registration","Public / student","No","No","Yes",5,4,5,4,5,"Ready","P2","Public registration is restricted to student accounts.","Add email verification before broad commercial launch."],
  ["F-005","Authentication","Unauthorized access page","All roles","Yes","Yes","Yes",4,4,5,4,4,"Ready","P3","Dedicated access-denied route and role redirects.","Keep wording consistent across API and page denials."],
  ["F-006","Navigation","Role-based desktop and mobile navigation","All roles","Yes","Yes","Yes",5,5,5,4,5,"Ready","P3","Sidebar and mobile navigation show role-appropriate routes.","Run a final small-screen device check."],
  ["F-007","Dashboards","Admin dashboard","Admin","Yes","No","No",4,4,5,4,4,"Ready","P2","Platform-wide KPIs, charts, recent activity and quick actions.","Add commercial KPIs after real submission volume exists."],
  ["F-008","Dashboards","Teacher dashboard","Teacher","No","Yes","No",4,4,5,4,4,"Ready","P2","Metrics and records are scoped to exact subject-grade assignments.","Acceptance-test with a teacher assigned to multiple non-overlapping pairs."],
  ["F-009","Dashboards","Student dashboard","Student","No","No","Yes",4,4,5,4,4,"Ready with acceptance test","P1","Available quizzes, completed work, averages and subject breakdown are implemented.","Validate with real submissions because the live database currently has none."],
  ["F-010","Quizzes","Quiz library","All roles","Yes","Yes","Yes",5,4,5,4,5,"Ready","P2","Role-aware library with publication and assignment scoping.","Publish enough verified quizzes for a complete student catalog."],
  ["F-011","Quizzes","Filter quizzes by subject","All roles","Yes","Yes","Yes",5,4,5,4,5,"Ready","P3","Server/query filtering no longer limits the filtered result set to the first 15.","Keep a regression test for more than one page of matches."],
  ["F-012","Quizzes","Filter quizzes by grade","Admin / teacher","Yes","Yes","No",5,4,5,4,5,"Ready","P3","Grade filter respects teacher assignments.","Test mixed subject-grade assignments."],
  ["F-013","Quizzes","Filter quizzes by outcome","All roles","Yes","Yes","Yes",5,4,5,4,5,"Ready","P2","Outcome filtering uses normalized quiz and question mappings.","Add an integration test using a known outcome ID."],
  ["F-014","Quizzes","Search quizzes by indicator","All roles","Yes","Yes","Yes",5,5,5,4,5,"Ready","P2","Indicator text search is included in the filter UI and query logic.","Add typo-tolerant search only if users request it."],
  ["F-015","Quizzes","Quiz pagination","All roles","Yes","Yes","Yes",5,4,5,5,5,"Ready","P3","15 items per page with total-aware navigation instead of a hard display cap.","Test first, middle and last pages at production volume."],
  ["F-016","Quiz authoring","Manual quiz creation","Admin / teacher","Yes","Yes","No",4,4,5,4,4,"Ready","P2","Quiz save validates assignments, outcomes and question structure.","Add a guided validation summary before save."],
  ["F-017","Quiz authoring","Quiz editor","Admin / teacher","Yes","Yes","No",4,4,5,4,4,"Ready","P2","Owners can edit; submitted quizzes are protected from structural changes.","Add versioning if post-submission corrections become necessary."],
  ["F-018","Quiz authoring","Publish and unpublish quizzes","Admin / teacher","Yes","Yes","No",5,4,5,4,5,"Ready","P1","Publishing is permission-checked and separate from student availability.","Review and publish the verified catalog; only 3 of 459 quizzes are live."],
  ["F-019","Quiz delivery","Due dates and availability","All roles","Yes","Yes","Yes",4,4,5,4,4,"Ready","P2","Student submission checks publication, grade and due date.","Add timezone text near due dates to avoid ambiguity."],
  ["F-020","Data operations","Quiz CSV import","Admin / teacher","Yes","Yes","No",4,4,4,4,4,"Ready with acceptance test","P1","Import API and cleaned mapping workflow are implemented.","Run a small production import and confirm row-level error reporting."],
  ["F-021","Data operations","Quiz CSV export","Admin / teacher","Yes","Yes","No",4,4,4,4,4,"Ready","P2","Export includes quiz, question and mapping data for review/re-import.","Document the canonical import/export column contract."],
  ["F-022","Question content","Question image support","All roles","Yes","Yes","Yes",5,4,4,4,5,"Ready","P2","530 local question images were audited; no referenced file is missing.","Verify deployed static paths after each hosting release."],
  ["F-023","Question content","Math notation rendering","All roles","Yes","Yes","Yes",4,4,4,4,4,"Ready","P2","KaTeX renderer is available for mathematical expressions.","Visually test fractions, roots, exponents and right-to-left layouts."],
  ["F-024","Quiz delivery","Quiz-taking interface","Student; staff preview","Yes","Yes","Yes",4,4,5,4,4,"Ready with acceptance test","P1","Students answer and submit; staff preview does not create results.","Complete an end-to-end student attempt in production."],
  ["F-025","Results","Save student submission","Student","No","No","Yes",5,4,5,4,5,"Ready with acceptance test","P0","Save flow is server-authoritative and only marks the UI complete after persistence succeeds.","Run one real student submission and confirm result, answers and UI refresh."],
  ["F-026","Results","Server-side grading","Student","No","No","Yes",5,4,5,5,5,"Ready","P1","The server calculates correctness and percentage; client score is not trusted.","Add tests for blank, duplicate and malformed answers."],
  ["F-027","Results","Attempts and best-score retention","Student","No","No","Yes",5,4,5,4,5,"Ready","P1","Up to three attempts; one best-result row per student and quiz with attempt count.","Acceptance-test lower and higher repeat scores."],
  ["F-028","Results","Answer review and explanations","Student","No","No","Yes",4,4,5,4,4,"Ready","P2","Correct-answer review is returned after submission, not exposed before it.","Check explanation quality across all subjects."],
  ["F-029","Results","Completed quizzes page","Student","No","No","Yes",4,4,5,4,4,"Ready with acceptance test","P1","Completed assessments and scores are implemented.","Verify ordering and score display after first live submission."],
  ["F-030","Reporting","Student reports","Admin / teacher","Yes","Yes","No",4,4,5,4,4,"Ready with acceptance test","P1","Report access is cohort-scoped and supports republishing.","Validate PDF/print output with real result history."],
  ["F-031","Student management","Student roster","Admin / teacher","Yes","Yes","No",5,4,5,4,5,"Ready","P2","Search, grade/class filtering, counts and averages are implemented.","Add server pagination if the roster grows beyond current limits."],
  ["F-032","Student management","Create and edit students","Admin / teacher","Yes","Yes","No",5,4,5,4,5,"Ready","P2","Teachers are restricted to assigned grades; passwords are never returned.","Add a forced password-change option for staff-created accounts."],
  ["F-033","Student management","Student CSV import","Admin / teacher","Yes","Yes","No",5,4,5,4,5,"Ready","P2","Atomic validated import, 1,000-row cap, normalized emails and account protection.","Provide downloadable error rows for failed imports."],
  ["F-034","Student management","Student profile and performance","Admin / teacher","Yes","Yes","No",4,4,5,4,4,"Ready with acceptance test","P2","Profile, history and performance are cohort-scoped.","Review display with several attempts and subjects."],
  ["F-035","Teacher management","Teacher roster","Admin","Yes","No","No",4,4,5,4,4,"Ready","P2","Admin-only teacher list with assignment and performance context.","Add deactivate/reactivate instead of deletion for commercial use."],
  ["F-036","Teacher management","Create and edit teachers","Admin","Yes","No","No",4,4,5,4,4,"Ready","P1","Admin-managed staff creation and assignment editing.","Require first-login password change."],
  ["F-037","Teacher management","Subject-grade assignments","Admin / teacher self-view","Yes","Yes","No",5,4,5,4,5,"Ready","P1","Exact subject-grade pairs drive data access and statistics.","Add a duplicate/conflict warning in the assignment UI."],
  ["F-038","Reference data","Subject management","Admin; teacher read","Yes","Yes","No",4,4,5,4,4,"Ready","P2","Subject catalog and teacher visibility are implemented.","Protect deletion when dependent quizzes/outcomes exist."],
  ["F-039","Reference data","Grade and class management","Admin; scoped teacher","Yes","Yes","Yes",4,4,5,4,4,"Ready","P2","Grade creation is admin-only; class access is role-scoped.","Add archive behavior for inactive classes."],
  ["F-040","Standards","Learning outcomes management","Admin / teacher","Yes","Yes","No",4,4,5,4,4,"Ready","P2","Outcomes can be listed, filtered and created.","Prefer immutable external codes if standards updates are expected."],
  ["F-041","Standards","Learning outcomes CSV upload","Admin / teacher","Yes","Yes","No",4,4,4,4,4,"Ready with acceptance test","P2","Bulk outcome import exists.","Validate duplicates and provide a dry-run summary."],
  ["F-042","Standards","Question-to-indicator mapping","Admin / teacher","Yes","Yes","No",5,4,5,4,5,"Ready","P1","All 4,520 audited questions have indicators with no subject/grade mismatch.","Sample content alignment with subject teachers after curriculum updates."],
  ["F-043","Analytics","Admin statistics","Admin","Yes","No","No",4,4,5,4,4,"Ready with data limitation","P1","KPIs, trends, grade/subject views and rankings are implemented.","Collect real submissions; the live database has zero results."],
  ["F-044","Analytics","Teacher statistics scoping","Teacher","No","Yes","No",5,4,5,4,5,"Ready with data limitation","P1","Queries use exact assignment pairs and cohort permissions.","Acceptance-test with real results from assigned and unassigned cohorts."],
  ["F-045","Analytics","System statistics API and chart","Admin / teacher","Yes","Yes","No",4,4,5,4,4,"Ready with data limitation","P2","Authenticated stats endpoint and readable charts are implemented.","Define a minimum sample size before highlighting comparisons."],
  ["F-046","Intervention","AI remediation generation","Admin / teacher","Yes","Yes","No",3,4,4,3,3,"Needs configuration","P2","Route exists and is scoped; external model credentials and output quality need validation.","Test with representative weak-skill profiles and teacher review."],
  ["F-047","Student support","Diagnostics","Student","No","No","Yes",4,4,5,4,4,"Ready with acceptance test","P2","Diagnostic route and student page are protected.","Verify the full diagnostic-to-mastery update flow."],
  ["F-048","Student support","Personal learning path","Student","No","No","Yes",4,4,5,4,4,"Ready with acceptance test","P2","Generate and view learning path items by outcome.","Test sequencing, regeneration and mastered-item behavior."],
  ["F-049","Engagement","Challenge creation and management","Admin / teacher","Yes","Yes","No",4,5,5,4,4,"Ready with data limitation","P1","Professional UI, assignment-aware options, date windows and validated criteria.","Create a pilot challenge; the live database currently has none."],
  ["F-050","Engagement","Challenge participation and progress","Student","No","No","Yes",5,5,5,4,5,"Ready with data limitation","P1","Students join; server derives progress from qualifying results.","Test join, progress, completion and closed-window cases."],
  ["F-051","Engagement","Achievements and trophies","Student","No","No","Yes",4,4,5,4,4,"Ready with acceptance test","P2","Mastery awards are scoped by subject, grade and domain.","Validate thresholds with real multi-domain results."],
  ["F-052","Engagement","Certificates","All roles","Yes","Yes","Yes",4,4,5,4,4,"Ready with acceptance test","P2","Role-scoped certificate views and PDF generation are implemented.","Check print/PDF layout with long Arabic and English names."],
  ["F-053","Account","Profile and password settings","All roles","Yes","Yes","Yes",5,4,5,4,5,"Ready","P0","Users can update name and password with current-password verification.","Change the live legacy admin password before launch."],
  ["F-054","AI authoring","AI quiz generation","Admin / teacher","Yes","Yes","No",3,4,4,3,3,"Needs configuration","P2","Generation route exists with subject, grade and outcome context.","Require teacher approval and validate model credentials, cost and failure handling."],
  ["F-055","AI authoring","AI question image generation","Admin / teacher","Yes","Yes","No",3,4,4,3,3,"Needs configuration","P2","Image generation route and page exist.","Validate provider credentials, storage, moderation and licensing policy."],
  ["F-056","Preparation","Subject preparation pages","All roles","Yes","Yes","Yes",3,4,4,4,3,"Needs content review","P2","Science, Mathematics and English entry points exist.","Complete a curriculum and bilingual content review before selling."],
  ["F-057","Administration","Documentation page","Admin","Yes","No","No",4,3,5,4,4,"Ready","P3","Documentation is admin-only.","Update operational steps whenever import schemas or role rules change."],
  ["F-058","Security","Route-level role access","All roles","Yes","Yes","Yes",5,4,5,5,5,"Ready","P0","Pages and APIs use a centralized role matrix; unknown APIs default to authentication.","Add automated role-matrix tests for every protected route."],
  ["F-059","Security","Server guards and data scoping","All roles","Yes","Yes","Yes",5,4,5,4,5,"Ready","P0","Server resolves current database user and enforces ownership/cohort rules.","Add negative authorization tests for cross-cohort access."],
  ["F-060","Data integrity","Result schema and uniqueness","Student","No","No","Yes",5,4,5,5,5,"Ready","P0","Unique student-quiz result, normalized percentages and attempt count are migrated.","Monitor failed writes during the first live assessment window."],
  ["F-061","Operations","Safe database seeding","Admin / engineering","Yes","No","No",5,3,5,4,5,"Ready","P1","Destructive seed requires explicit opt-in; secrets come from environment variables.","Keep seeding disabled in production deployment jobs."],
  ["F-062","Performance","Database indexes and query shape","All roles","Yes","Yes","Yes",4,4,5,5,4,"Ready","P1","Indexes, aggregates, batching, streaming and bounded pools are in place.","Load-test with production-like users and submissions."],
  ["F-063","User experience","Responsive dashboard layout","All roles","Yes","Yes","Yes",4,5,5,4,4,"Ready","P2","Desktop sidebar and mobile navigation adapt across breakpoints.","Test common Android, iPad and laptop widths."],
  ["F-064","User experience","Loading, error and success states","All roles","Yes","Yes","Yes",4,4,5,4,4,"Ready","P2","Streaming skeletons and explicit quiz/challenge save errors are present.","Standardize remaining legacy page messages and retry actions."],
  ["F-065","Deployment","Production build and database migrations","Engineering","Yes","Yes","Yes",5,3,5,5,5,"Ready","P0","Production build and TypeScript checks pass; both result migrations are deployed.","Repeat build, migration and smoke checks in the release pipeline."],
  ["F-066","Quality","Automated test coverage","Engineering","Yes","Yes","Yes",2,2,4,3,2,"Needs attention","P0","Build, type checks and smoke checks exist, but route and end-to-end regression coverage is insufficient.","Add critical-path tests for login, filters, submit, roles, import and challenges."],
  ["F-067","Quality","Lint and code consistency","Engineering","Yes","Yes","Yes",2,3,4,3,2,"Needs attention","P1","Production build passes, but legacy explicit-any and image warnings remain.","Pay down lint debt incrementally and enforce no new violations."],
  ["F-068","Operations","Monitoring and auditability","Admin / engineering","Yes","Yes","No",2,3,4,3,2,"Needs attention","P1","Diagnostics exist, but production error tracking and audit logs are limited.","Add centralized error monitoring, structured logs and admin audit events."],
  ["F-069","Security","Production administrator credentials","Admin","Yes","No","No",1,3,1,4,1,"Critical action","P0","The live admin account still uses the legacy weak seed password.","Change it immediately in Dashboard > Settings and rotate any reused secret."],
  ["F-070","Launch readiness","Published content availability","Student","No","No","Yes",2,3,5,5,2,"Critical action","P0","Only 3 of 459 quizzes are published, so the student catalog is not commercially ready.","Review, approve and publish the intended launch catalog."],
];

const roleRows = [
  ["/","Landing page","Public","Public marketing; role-aware calls to action"],
  ["/login","Login","Public","Credentials and optional Google OAuth"],
  ["/register","Registration","Public / Student","Creates student accounts only"],
  ["/dashboard","Main dashboard","Admin, Teacher, Student","Different content and data scope by role"],
  ["/dashboard/quizzes","Quiz library","Admin, Teacher, Student","Student sees published grade quizzes; teacher sees assigned scope"],
  ["/dashboard/quizzes/edit/[id]","Quiz editor","Admin, Teacher","Teacher can modify owned quizzes only"],
  ["/dashboard/quizzes/solve/[id]","Quiz solve / preview","Admin, Teacher, Student","Only student submission persists a result"],
  ["/dashboard/quizzes/completed","Completed quizzes","Student","Own completed quizzes only"],
  ["/dashboard/students","Student roster","Admin, Teacher","Teacher limited to assigned grades"],
  ["/dashboard/students/profile/[id]","Student profile","Admin, Teacher","Cross-cohort access denied"],
  ["/dashboard/teachers","Teacher management","Admin","Admin only"],
  ["/dashboard/teachers/[id]","Teacher profile","Admin","Admin only"],
  ["/dashboard/subjects","Subjects","Admin, Teacher","Management options depend on role"],
  ["/dashboard/statistics","Statistics","Admin, Teacher","Teacher limited to exact assignment pairs"],
  ["/dashboard/student-reports","Student reports","Admin, Teacher","Cohort-scoped"],
  ["/dashboard/challenges","Challenges","Admin, Teacher, Student","Staff manage; students participate"],
  ["/dashboard/diagnostics","Diagnostics","Student","Student only"],
  ["/dashboard/learning-path","Learning path","Student","Student only"],
  ["/dashboard/report","Student report","Student","Own data only"],
  ["/dashboard/achievements","Achievements","Student","Own trophies only"],
  ["/dashboard/certificates","Certificates","Admin, Teacher, Student","Role-scoped certificates"],
  ["/dashboard/settings","Account settings","Admin, Teacher, Student","Own profile and password"],
  ["/image-generator","Image generator","Admin, Teacher","Staff authoring tool"],
  ["/preparation/[subject]","Subject preparation","Admin, Teacher, Student","Authenticated preparation content"],
  ["/docs","Documentation","Admin","Admin only"],
];

const dataRows = [
  ["Quizzes",459,"Live database count","Inventory exists"],
  ["Published quizzes",3,"Live database count","Launch blocker: approve intended student catalog"],
  ["Empty quizzes",0,"Live database audit","Pass"],
  ["Questions",4520,"Live database count","Substantial content inventory"],
  ["Invalid answer keys",0,"Live database audit","Pass"],
  ["Questions without indicators",0,"Live database audit","Pass"],
  ["Question indicator subject/grade mismatches",0,"Live database audit","Pass"],
  ["Quiz outcome subject/grade mismatches",0,"Live database audit","Pass"],
  ["Learning outcomes / indicators",484,"Live database count","Mapped reference catalog"],
  ["Question images",530,"Live database audit","All local paths"],
  ["Missing question image files",0,"Filesystem audit","Pass"],
  ["Students missing grade",0,"Live database audit","Pass"],
  ["Teachers missing assignments",0,"Live database audit","Pass"],
  ["Duplicate student-quiz result rows",0,"Pre-migration audit","Unique constraint deployed"],
  ["Results",0,"Live database count","Analytics and result UI need live acceptance data"],
  ["Challenges",0,"Live database count","Challenge workflow needs a pilot record"],
  ["Admin accounts using legacy weak seed password",1,"Live security audit","Immediate password change required"],
];

const actions = [
  [1,"P0","Change the live administrator password","Platform owner","Before any external access","Removes the highest immediate security risk","Open Dashboard > Settings and set a unique strong password"],
  [2,"P0","Run an end-to-end student submission test","QA / product owner","Before launch","Confirms the repaired save, grading, attempts and completed-page flow","Use a real student account on one published quiz and verify saved answers"],
  [3,"P0","Review and publish the launch quiz catalog","Curriculum lead / admin","Before launch","Makes the platform useful to students; only 3 quizzes are currently published","Approve by subject and grade, then publish in controlled batches"],
  [4,"P0","Add critical automated regression tests","Engineering","Before paid rollout","Protects login, filters, roles and submission from regressions","Cover login, role denial, filters, submit, import and challenge progress"],
  [5,"P1","Pilot challenges with real result data","Teacher / QA","Before launch","Validates participation, progress and completion calculations","Create one dated challenge and complete it with a student account"],
  [6,"P1","Validate teacher scoping with mixed assignments","QA","Before launch","Proves there is no cross-subject or cross-grade data leakage","Test assigned and unassigned subject-grade pairs"],
  [7,"P1","Configure and test OAuth and AI providers","Engineering / admin","Before enabling those features","External services remain environment-dependent","Validate keys, callbacks, quotas, failure messages and cost controls"],
  [8,"P1","Add production monitoring and audit logs","Engineering","Before paid rollout","Makes failures and sensitive changes traceable","Capture route errors, failed submissions, imports and account changes"],
  [9,"P1","Load-test database queries","Engineering","Before school-wide rollout","Confirms performance beyond the current empty-results state","Use production-like users, quizzes, answers and concurrent submissions"],
  [10,"P2","Complete curriculum and bilingual UX review","Science, Mathematics and English leads","Before sales demonstrations","Improves trust in content and display quality","Sample every grade/subject, image question and math/English layout"],
  [11,"P2","Document the canonical CSV contracts","Product / engineering","Before customer onboarding","Reduces import errors and support effort","Publish examples for outcomes, quizzes, images and students"],
  [12,"P2","Reduce legacy lint debt","Engineering","Planned maintenance","Improves maintainability while preserving working behavior","Fix no-explicit-any and image warnings module by module"],
];

function title(sheet, text, subtitle, endCol) {
  sheet.getRange(`A2:${endCol}2`).merge();
  sheet.getRange("A2").values = [[text]];
  sheet.getRange("A2").format = { font: { name: font, size: 16, bold: true, color: navy }, verticalAlignment: "center" };
  sheet.getRange(`A3:${endCol}3`).merge();
  sheet.getRange("A3").values = [[subtitle]];
  sheet.getRange("A3").format = { font: { name: font, size: 10, italic: true, color: gray }, verticalAlignment: "center" };
  sheet.getRange(`A4:${endCol}4`).format.borders = { bottom: { style: "thin", color: blue } };
}

function styleHeader(range) {
  range.format = {
    fill: navy,
    font: { name: font, size: 10, bold: true, color: "#FFFFFF" },
    horizontalAlignment: "center",
    verticalAlignment: "center",
    wrapText: true,
    borders: { insideVertical: { style: "thin", color: "#FFFFFF" }, bottom: { style: "thin", color: navy } },
  };
}

function baseSheet(sheet, usedRange) {
  sheet.showGridLines = false;
  usedRange.format.font = { name: font, size: 10, color: "#1F2937" };
  usedRange.format.verticalAlignment = "center";
}

const workbook = Workbook.create();
const summary = workbook.worksheets.add("Executive Summary");
const evaluation = workbook.worksheets.add("Feature Evaluation");
const roles = workbook.worksheets.add("Role Access");
const data = workbook.worksheets.add("Data Readiness");
const action = workbook.worksheets.add("Action Plan");

summary.tabColor = navy;
evaluation.tabColor = blue;
roles.tabColor = "#5B9BD5";
data.tabColor = "#A5A5A5";
action.tabColor = amber;

title(summary, "NAFS platform feature evaluation", "Code, security, role, live-data and launch-readiness review as of 21 September 2026", "L");
summary.getRange("A6:B11").values = [
  ["Metric","Value"],
  ["Features reviewed",null],
  ["Average readiness score",null],
  ["P0 actions",null],
  ["Ready features",null],
  ["Features needing attention",null],
];
summary.getRange("B7").formulas = [["=COUNTA('Feature Evaluation'!$A$7:$A$200)"]];
summary.getRange("B8").formulas = [["=AVERAGE('Feature Evaluation'!$M$7:$M$200)"]];
summary.getRange("B9").formulas = [["=COUNTIFS('Feature Evaluation'!$O$7:$O$200,\"P0\")"]];
summary.getRange("B10").formulas = [["=COUNTIFS('Feature Evaluation'!$N$7:$N$200,\"Ready\")"]];
summary.getRange("B11").formulas = [["=COUNTIFS('Feature Evaluation'!$N$7:$N$200,\"Needs attention\")+COUNTIFS('Feature Evaluation'!$N$7:$N$200,\"Critical action\")"]];
styleHeader(summary.getRange("A6:B6"));
summary.getRange("A7:A11").format.fill = lightGray;
summary.getRange("A7:A11").format.font = { name: font, size: 10, bold: true, color: navy };
summary.getRange("B7:B11").format.font = { name: font, size: 13, bold: true, color: navy };
summary.getRange("B8").format.numberFormat = "0.0";
summary.getRange("D6:E13").values = [
  ["Status","Feature count"],
  ["Ready",null],
  ["Ready with acceptance test",null],
  ["Ready with data limitation",null],
  ["Needs configuration",null],
  ["Needs content review",null],
  ["Needs attention",null],
  ["Critical action",null],
];
for (let row = 7; row <= 13; row++) summary.getRange(`E${row}`).formulas = [[`=COUNTIFS('Feature Evaluation'!$N$7:$N$200,D${row})`]];
styleHeader(summary.getRange("D6:E6"));
summary.getRange("D7:D13").format.fill = lightGray;
summary.getRange("D7:D13").format.font = { name: font, size: 10, bold: true, color: navy };
summary.getRange("A15:L15").merge();
summary.getRange("A15").values = [["Overall evaluation"]];
summary.getRange("A15:L15").format = { fill: lightBlue, font: { name: font, bold: true, color: navy }, borders: { bottom: { style: "thin", color: blue } } };
summary.getRange("A16:L20").merge();
summary.getRange("A16").values = [["The application has a strong production foundation: role controls, quiz filtering, server-side grading, result integrity, teacher scoping, challenge logic, responsive navigation and database performance protections are implemented. The code builds successfully and the result migrations are deployed. Commercial launch is not yet recommended until the administrator password is changed, a real student submission is completed, the intended quiz catalog is published, and critical automated regression tests are added. Analytics and challenge quality cannot be fully judged from live behavior because the database currently has zero results and zero challenges."]];
summary.getRange("A16:L20").format = { wrapText: true, verticalAlignment: "top", font: { name: font, size: 11, color: "#1F2937" }, fill: "#FFFFFF", borders: { preset: "outside", style: "thin", color: "#D0D5DD" } };
summary.getRange("A22:F22").values = [["Launch gate","Current state","Required evidence","Owner","Priority","Decision"]];
styleHeader(summary.getRange("A22:F22"));
summary.getRange("A23:F27").values = [
  ["Administrator security","Weak legacy password detected","Password changed and login rechecked","Platform owner","P0","Open"],
  ["Student result persistence","Code repaired; no live results","One complete saved attempt with answers and score","QA / product owner","P0","Open"],
  ["Student content availability","3 of 459 quizzes published","Approved launch catalog visible by grade","Curriculum lead / admin","P0","Open"],
  ["Regression protection","Build/type/smoke checks pass","Automated critical-path suite passes","Engineering","P0","Open"],
  ["Challenges and analytics","No live challenge/result data","Pilot challenge and populated analytics reviewed","Teacher / QA","P1","Open"],
];
summary.getRange("A23:F27").format.wrapText = true;
summary.getRange("F23:F27").conditionalFormats.add("containsText", { text: "Open", format: { fill: lightRed, font: { bold: true, color: red } } });

const chart = summary.charts.add("bar", summary.getRange("D6:E13"));
chart.title = "Features by evaluation status";
chart.titleTextStyle.typeface = font;
chart.titleTextStyle.fontSize = 12;
chart.hasLegend = false;
chart.xAxis = { axisType: "textAxis", textStyle: { typeface: font, fontSize: 10 } };
chart.yAxis = { numberFormatCode: "0", numberFormatSourceLinked: false, textStyle: { typeface: font, fontSize: 10 } };
chart.setPosition("G6", "L14");

title(evaluation, "Feature evaluation", "Scores use a 1-5 scale. Average score is formula-driven across functionality, usability, security, performance and commercial readiness.", "Q");
const evalHeaders = ["Feature ID","Area","Feature","Primary users","Admin","Teacher","Student","Functionality","Usability","Security","Performance","Commercial readiness","Average score","Status","Priority","Evidence / evaluation","Recommended action"];
evaluation.getRange("A6:Q6").values = [evalHeaders];
styleHeader(evaluation.getRange("A6:Q6"));
evaluation.getRange(`A7:Q${features.length + 6}`).values = features.map(r => [...r.slice(0,12), null, ...r.slice(12)]);
for (let row = 7; row <= features.length + 6; row++) evaluation.getRange(`M${row}`).formulas = [[`=AVERAGE(H${row}:L${row})`]];
evaluation.getRange(`H7:M${features.length + 6}`).format.numberFormat = "0.0";
evaluation.getRange(`A7:Q${features.length + 6}`).format.wrapText = true;
evaluation.getRange(`A7:A${features.length + 6}`).format.font = { name: font, size: 10, bold: true, color: navy };
evaluation.getRange(`N7:N${features.length + 6}`).conditionalFormats.add("containsText", { text: "Critical", format: { fill: lightRed, font: { bold: true, color: red } } });
evaluation.getRange(`N7:N${features.length + 6}`).conditionalFormats.add("containsText", { text: "Needs attention", format: { fill: lightRed, font: { bold: true, color: red } } });
evaluation.getRange(`N7:N${features.length + 6}`).conditionalFormats.add("containsText", { text: "Needs configuration", format: { fill: lightAmber, font: { bold: true, color: amber } } });
evaluation.getRange(`N7:N${features.length + 6}`).conditionalFormats.add("containsText", { text: "Ready", format: { fill: lightGreen, font: { bold: true, color: green } } });
evaluation.getRange(`O7:O${features.length + 6}`).conditionalFormats.add("containsText", { text: "P0", format: { fill: lightRed, font: { bold: true, color: red } } });
evaluation.getRange(`O7:O${features.length + 6}`).conditionalFormats.add("containsText", { text: "P1", format: { fill: lightAmber, font: { bold: true, color: amber } } });
evaluation.freezePanes.freezeRows(6);
evaluation.freezePanes.freezeColumns(3);
evaluation.tables.add(`A6:Q${features.length + 6}`, true, "FeatureEvaluationTable").style = "TableStyleMedium2";

title(roles, "Role and page access", "The intended user-facing route matrix after the access-control review.", "D");
roles.getRange("A6:D6").values = [["Route","Feature","Allowed roles","Scope / behavior"]];
styleHeader(roles.getRange("A6:D6"));
roles.getRange(`A7:D${roleRows.length + 6}`).values = roleRows;
roles.getRange(`A7:D${roleRows.length + 6}`).format.wrapText = true;
roles.freezePanes.freezeRows(6);
roles.tables.add(`A6:D${roleRows.length + 6}`, true, "RoleAccessTable").style = "TableStyleMedium2";

title(data, "Live data readiness", "Read-only live database and local image audit completed during the production-readiness review.", "D");
data.getRange("A6:D6").values = [["Measure","Value","Evidence source","Evaluation"]];
styleHeader(data.getRange("A6:D6"));
data.getRange(`A7:D${dataRows.length + 6}`).values = dataRows;
data.getRange(`B7:B${dataRows.length + 6}`).format.numberFormat = "#,##0";
data.getRange(`A7:D${dataRows.length + 6}`).format.wrapText = true;
data.getRange(`D7:D${dataRows.length + 6}`).conditionalFormats.add("cellIs", { operator: "equal", formula: "\"Pass\"", format: { fill: lightGreen, font: { bold: true, color: green } } });
data.getRange(`D7:D${dataRows.length + 6}`).conditionalFormats.add("containsText", { text: "Immediate", format: { fill: lightRed, font: { bold: true, color: red } } });
data.freezePanes.freezeRows(6);
data.tables.add(`A6:D${dataRows.length + 6}`, true, "DataReadinessTable").style = "TableStyleMedium2";

title(action, "Launch action plan", "Actions are ordered by launch risk and the evidence needed to close each item.", "G");
action.getRange("A6:G6").values = [["Order","Priority","Action","Owner","Timing","Why it matters","Completion evidence"]];
styleHeader(action.getRange("A6:G6"));
action.getRange(`A7:G${actions.length + 6}`).values = actions;
action.getRange(`A7:G${actions.length + 6}`).format.wrapText = true;
action.getRange(`B7:B${actions.length + 6}`).conditionalFormats.add("containsText", { text: "P0", format: { fill: lightRed, font: { bold: true, color: red } } });
action.getRange(`B7:B${actions.length + 6}`).conditionalFormats.add("containsText", { text: "P1", format: { fill: lightAmber, font: { bold: true, color: amber } } });
action.freezePanes.freezeRows(6);
action.tables.add(`A6:G${actions.length + 6}`, true, "ActionPlanTable").style = "TableStyleMedium2";

baseSheet(summary, summary.getRange("A1:L27"));
baseSheet(evaluation, evaluation.getRange(`A1:Q${features.length + 6}`));
baseSheet(roles, roles.getRange(`A1:D${roleRows.length + 6}`));
baseSheet(data, data.getRange(`A1:D${dataRows.length + 6}`));
baseSheet(action, action.getRange(`A1:G${actions.length + 6}`));

// Reapply reader-facing hierarchy after the shared body font is set.
styleHeader(summary.getRange("A6:B6"));
styleHeader(summary.getRange("D6:E6"));
styleHeader(summary.getRange("A22:F22"));
styleHeader(evaluation.getRange("A6:Q6"));
styleHeader(roles.getRange("A6:D6"));
styleHeader(data.getRange("A6:D6"));
styleHeader(action.getRange("A6:G6"));
for (const [sheet, endCol] of [[summary,"L"],[evaluation,"Q"],[roles,"D"],[data,"D"],[action,"G"]]) {
  sheet.getRange("A2").format = { font: { name: font, size: 16, bold: true, color: navy }, verticalAlignment: "center" };
  sheet.getRange("A3").format = { font: { name: font, size: 10, italic: true, color: gray }, verticalAlignment: "center" };
  sheet.getRange(`A4:${endCol}4`).format.borders = { bottom: { style: "thin", color: blue } };
}

summary.getRange("A1:L27").format.rowHeight = 20;
summary.getRange("A16:L20").format.rowHeight = 30;
summary.getRange("A:A").format.columnWidth = 28;
summary.getRange("B:B").format.columnWidth = 16;
summary.getRange("C:C").format.columnWidth = 34;
summary.getRange("D:D").format.columnWidth = 24;
summary.getRange("E:E").format.columnWidth = 12;
summary.getRange("F:F").format.columnWidth = 16;
summary.getRange("G:L").format.columnWidth = 13;
summary.getRange("A23:F27").format.rowHeight = 46;

const evalWidths = [11,19,28,22,9,9,9,13,11,11,12,17,13,27,9,48,48];
evalWidths.forEach((w,i)=>evaluation.getRangeByIndexes(0,i,features.length+6,1).format.columnWidth=w);
evaluation.getRange(`A6:Q${features.length + 6}`).format.rowHeight = 34;
evaluation.getRange("A6:Q6").format.rowHeight = 42;

[24,26,25,55].forEach((w,i)=>roles.getRangeByIndexes(0,i,roleRows.length+6,1).format.columnWidth=w);
roles.getRange(`A6:D${roleRows.length + 6}`).format.rowHeight = 32;
[40,14,24,58].forEach((w,i)=>data.getRangeByIndexes(0,i,dataRows.length+6,1).format.columnWidth=w);
data.getRange(`A6:D${dataRows.length + 6}`).format.rowHeight = 30;
[9,10,40,23,22,44,52].forEach((w,i)=>action.getRangeByIndexes(0,i,actions.length+6,1).format.columnWidth=w);
action.getRange(`A6:G${actions.length + 6}`).format.rowHeight = 40;

workbook.recalculate();

const checks = {};
checks.summary = (await workbook.inspect({kind:"table",range:"Executive Summary!A6:F27",include:"values,formulas",tableMaxRows:30,tableMaxCols:8})).ndjson;
checks.evaluation = (await workbook.inspect({kind:"table",range:`Feature Evaluation!A6:Q${features.length + 6}`,include:"values,formulas",tableMaxRows:8,tableMaxCols:17})).ndjson;
checks.errors = (await workbook.inspect({kind:"match",searchTerm:"#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A|#NUM!|#NULL!|#SPILL!|#CALC!",options:{useRegex:true,maxResults:300},summary:"final formula error scan"})).ndjson;

await fs.mkdir(outputDir, { recursive: true });
for (const [sheetName, fileName, range] of [
  ["Executive Summary","preview-summary.png","A1:L27"],
  ["Feature Evaluation","preview-features.png","A1:Q30"],
  ["Role Access","preview-roles.png",`A1:D${roleRows.length + 6}`],
  ["Data Readiness","preview-data.png",`A1:D${dataRows.length + 6}`],
  ["Action Plan","preview-actions.png",`A1:G${actions.length + 6}`],
]) {
  const preview = await workbook.render({sheetName,range,scale:1,format:"png"});
  await fs.writeFile(`${outputDir}/${fileName}`, new Uint8Array(await preview.arrayBuffer()));
}

const output = await SpreadsheetFile.exportXlsx(workbook);
await output.save(outputPath);
await fs.writeFile(`${outputDir}/verification.json`, JSON.stringify(checks, null, 2));
console.log(JSON.stringify({outputPath, featureCount:features.length, sheetCount:5, checks}, null, 2));
