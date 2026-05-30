import Link from "next/link";
import { BookOpen, Shield, Database, Layout, Cpu, BarChart3, Globe, Users, FileText, Settings } from "lucide-react";

const sections = [
  { id: "overview", label: "Overview", icon: BookOpen },
  { id: "tech-stack", label: "Tech Stack", icon: Cpu },
  { id: "auth", label: "Authentication", icon: Shield },
  { id: "roles", label: "User Roles", icon: Users },
  { id: "database", label: "Database Schema", icon: Database },
  { id: "pages", label: "Pages & Routes", icon: Layout },
  { id: "api", label: "API Reference", icon: FileText },
  { id: "components", label: "Components", icon: Settings },
  { id: "ai", label: "AI Integration", icon: Cpu },
  { id: "performance", label: "Performance", icon: BarChart3 },
  { id: "deploy", label: "Deployment", icon: Globe },
];

export default function DocsPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex gap-8">
        {/* ─── Sidebar TOC ─── */}
        <nav className="hidden lg:block w-64 flex-shrink-0">
          <div className="sticky top-24 space-y-1">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 px-3">Documentation</p>
            {sections.map(({ id, label, icon: Icon }) => (
              <a
                key={id}
                href={`#${id}`}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-600 hover:bg-white hover:text-indigo-700 hover:shadow-sm transition-all"
              >
                <Icon size={16} className="text-slate-400" />
                {label}
              </a>
            ))}
            <div className="pt-4 mt-4 border-t border-slate-200">
              <Link href="/dashboard" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-indigo-600 hover:bg-indigo-50 transition-all">
                ← Back to Dashboard
              </Link>
            </div>
          </div>
        </nav>

        {/* ─── Main Content ─── */}
        <div className="flex-1 min-w-0 space-y-12">

          <section id="overview">
            <h1 className="text-3xl font-extrabold text-slate-900 mb-6">NAFS Preparation Portal — Documentation</h1>
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-4">
              <p className="text-slate-600 leading-relaxed">
                The <strong>NAFS Preparation Portal</strong> is an AI-powered web platform designed to help students prepare for the <strong>NAFS (National Assessment Framework)</strong> standardized assessment in the UAE. It enables teachers to generate quizzes from text or PDF content, track student progress, and provides detailed analytics for students, teachers, and administrators.
              </p>
              <ul className="space-y-2 text-slate-600">
                <li className="flex items-start gap-2"><div className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-2.5 flex-shrink-0" /> <span><strong>Students</strong> — Take quizzes, track progress, earn certificates, and review performance across subjects.</span></li>
                <li className="flex items-start gap-2"><div className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-2.5 flex-shrink-0" /> <span><strong>Teachers</strong> — Create quizzes via AI, manage assignments, view class analytics, and generate remediation plans.</span></li>
                <li className="flex items-start gap-2"><div className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-2.5 flex-shrink-0" /> <span><strong>Admins</strong> — Full platform oversight, manage teachers, students, subjects, grades, and view system-wide statistics.</span></li>
              </ul>
            </div>
          </section>

          {/* ─── Tech Stack ─── */}
          <section id="tech-stack">
            <h2 className="text-2xl font-bold text-slate-900 mb-4 flex items-center gap-3">
              <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl"><Cpu size={20} /></div>
              Tech Stack
            </h2>
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <table className="w-full text-left">
                <thead><tr className="bg-slate-50 border-b border-slate-100"><th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Layer</th><th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Technology</th></tr></thead>
                <tbody className="divide-y divide-slate-50">
                  {[
                    ["Framework", "Next.js 16.2.3 (App Router, React 19)"],
                    ["Language", "TypeScript 5"],
                    ["Styling", "TailwindCSS v4"],
                    ["Database", "PostgreSQL via Supabase (Tokyo region)"],
                    ["ORM", "Prisma 7.8 with @prisma/adapter-pg"],
                    ["Authentication", "NextAuth v4 (JWT, credentials + Google OAuth)"],
                    ["AI", "Google Gemini 2.0 Flash, Anthropic via AgentRouter"],
                    ["Charts", "Recharts 3.8.1"],
                    ["Math Rendering", "KaTeX + react-katex"],
                    ["Client Caching", "SWR 2.4"],
                    ["PDF", "React-PDF (certificates), jsPDF"],
                    ["Notifications", "react-hot-toast"],
                    ["Icons", "Lucide React"],
                  ].map(([layer, tech]) => (
                    <tr key={layer} className="hover:bg-slate-50/50"><td className="p-4 font-semibold text-slate-700">{layer}</td><td className="p-4 text-slate-600">{tech}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* ─── Authentication ─── */}
          <section id="auth">
            <h2 className="text-2xl font-bold text-slate-900 mb-4 flex items-center gap-3">
              <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl"><Shield size={20} /></div>
              Authentication
            </h2>
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-6">
              <div>
                <h3 className="font-bold text-slate-800 mb-2">Login Methods</h3>
                <ul className="space-y-2 text-slate-600">
                  <li className="flex items-start gap-2"><div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-2.5 flex-shrink-0" /> <span><strong>Email & Password</strong> — Credentials provider with bcrypt password hashing. Users can register with name, email, password, and role.</span></li>
                  <li className="flex items-start gap-2"><div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-2.5 flex-shrink-0" /> <span><strong>Google OAuth</strong> — Social login via Google (requires GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env).</span></li>
                </ul>
              </div>
              <div>
                <h3 className="font-bold text-slate-800 mb-2">Session Strategy</h3>
                <p className="text-slate-600">JWT-based sessions with 30-day max age. The JWT stores <code className="text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded text-sm">id</code>, <code className="text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded text-sm">role</code>, <code className="text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded text-sm">gradeId</code>, <code className="text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded text-sm">classId</code>, and <code className="text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded text-sm">className</code>. Available in <code className="text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded text-sm">session.user</code> on the client and <code className="text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded text-sm">getServerSession()</code> on the server.</p>
              </div>
            </div>
          </section>

          {/* ─── User Roles ─── */}
          <section id="roles">
            <h2 className="text-2xl font-bold text-slate-900 mb-4 flex items-center gap-3">
              <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl"><Users size={20} /></div>
              User Roles & Permissions
            </h2>
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <table className="w-full text-left">
                <thead><tr className="bg-slate-50 border-b border-slate-100"><th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Role</th><th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Access</th><th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Key Pages</th></tr></thead>
                <tbody className="divide-y divide-slate-50">
                  <tr className="hover:bg-slate-50/50"><td className="p-4 font-bold text-slate-800">ADMIN</td><td className="p-4 text-slate-600">Full platform access</td><td className="p-4 text-slate-600">Dashboard, Teachers, Students, Subjects, Statistics, Certificates, Settings</td></tr>
                  <tr className="hover:bg-slate-50/50"><td className="p-4 font-bold text-slate-800">TEACHER</td><td className="p-4 text-slate-600">Own classes & subjects</td><td className="p-4 text-slate-600">Dashboard, Quizzes, Students (scoped), Subjects, Statistics, Certificates, Settings</td></tr>
                  <tr className="hover:bg-slate-50/50"><td className="p-4 font-bold text-slate-800">STUDENT</td><td className="p-4 text-slate-600">Own data only</td><td className="p-4 text-slate-600">Dashboard, Quizzes (scoped to grade), Completed Quizzes, Certificates, Settings, Preparation</td></tr>
                </tbody>
              </table>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mt-4 flex items-start gap-3">
              <Shield size={20} className="text-amber-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-amber-800"><strong>Route protection</strong> is enforced at two levels: the <code className="text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded">src/proxy.ts</code> middleware intercepts all dashboard and API requests, and each page/API route independently checks the session.</p>
            </div>
          </section>

          {/* ─── Database ─── */}
          <section id="database">
            <h2 className="text-2xl font-bold text-slate-900 mb-4 flex items-center gap-3">
              <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl"><Database size={20} /></div>
              Database Schema
            </h2>
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-6">
              <p className="text-slate-600">PostgreSQL hosted on Supabase (Tokyo). Managed via Prisma ORM with the <code className="text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded text-sm">@prisma/adapter-pg</code> driver and a connection pool of <strong>max 3</strong> connections.</p>

              <div>
                <h3 className="font-bold text-slate-800 mb-3">Models</h3>
                <div className="space-y-3">
                  {[
                    { name: "User", fields: "id, name, email (unique), password, image, role (ENUM: ADMIN/TEACHER/STUDENT), gradeId, classId", desc: "All users — students, teachers, and admins. Linked to Grade and Class." },
                    { name: "Grade", fields: "id, level (unique Int), name", desc: "Grade levels (typically 3-9)." },
                    { name: "Class", fields: "id, name, gradeId", desc: "Class groups within a grade. Unique constraint on name+gradeId." },
                    { name: "Subject", fields: "id, name (unique), description, colorCode", desc: "Academic subjects — Science, Math, English (static)." },
                    { name: "TeacherAssignment", fields: "id, teacherId, subjectId, gradeId", desc: "Maps which subjects + grades a teacher can access. Unique constraint on teacherId+subjectId+gradeId." },
                    { name: "Quiz", fields: "id, title, description, isPublished, dueDate, gradeId, subjectId, creatorId, outcomeId", desc: "Assessments created by teachers/admins." },
                    { name: "Question", fields: "id, quizId, questionText, questionType, options (JSON), correctAnswer, explanation, imageUrl, bloomLevel, difficulty, learningOutcomeId", desc: "Individual quiz questions." },
                    { name: "Result", fields: "id, score, totalPoints, studentId, quizId", desc: "Quiz submission results." },
                    { name: "StudentAnswer", fields: "id, resultId, questionId, studentAnswer, isCorrect", desc: "Individual question answers within a submission." },
                    { name: "LearningOutcome", fields: "id, grade (Int), subject, subDomain, outcomeText, indicatorText", desc: "NAFS learning standards mapped by grade/subject." },
                  ].map(({ name, fields, desc }) => (
                    <div key={name} className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-bold text-indigo-700">{name}</span>
                        <span className="text-xs text-slate-400 font-mono">{fields}</span>
                      </div>
                      <p className="text-sm text-slate-600">{desc}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="font-bold text-slate-800 mb-3">Key Relationships</h3>
                <pre className="bg-slate-900 text-slate-300 rounded-xl p-4 text-sm overflow-x-auto leading-relaxed">
{`User (ADMIN/TEACHER) ──→ Quiz       (creator)
User (STUDENT)       ──→ Grade ──→ Class
User (TEACHER)       ──→ TeacherAssignment ──→ Subject × Grade
Quiz                 ──→ Grade × Subject × Creator × Outcome
Quiz                 ──→ Question ──→ LearningOutcome
Quiz                 ──→ Result    ──→ StudentAnswer ──→ Question`}
                </pre>
              </div>
            </div>
          </section>

          {/* ─── Pages ─── */}
          <section id="pages">
            <h2 className="text-2xl font-bold text-slate-900 mb-4 flex items-center gap-3">
              <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl"><Layout size={20} /></div>
              Pages & Routes
            </h2>
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <table className="w-full text-left">
                <thead><tr className="bg-slate-50 border-b border-slate-100"><th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Page</th><th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Role</th><th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Description</th></tr></thead>
                <tbody className="divide-y divide-slate-50 text-sm">
                  {[
                    ["/", "Public", "Landing page — hero, subject cards, how-it-works, CTA"],
                    ["/login", "Public", "Sign in with email/password or Google"],
                    ["/register", "Public", "Create account with name, email, password, role"],
                    ["/dashboard", "All", "Role-based dashboard with stats, charts, recent activity. Uses streaming Suspense."],
                    ["/dashboard/quizzes", "All", "Quiz library with filters (subject, grade, outcome). Students see only published quizzes."],
                    ["/dashboard/quizzes/solve/[id]", "All", "Quiz-taking interface for students; preview for teachers/admins."],
                    ["/dashboard/quizzes/edit/[id]", "Admin, Teacher", "Edit quiz questions, settings, publish state."],
                    ["/dashboard/quizzes/completed", "Student", "List of completed quizzes with scores."],
                    ["/dashboard/students", "Admin, Teacher", "Student list with search, create form, grade/class filters. SWR cached."],
                    ["/dashboard/students/profile/[id]", "Admin, Teacher", "Individual student performance profile."],
                    ["/dashboard/teachers", "Admin", "Teacher management — list, assignments, quiz stats, create modal."],
                    ["/dashboard/teachers/[id]", "Admin", "Individual teacher profile with performance chart."],
                    ["/dashboard/subjects", "Admin, Teacher", "Subject listing and management."],
                    ["/dashboard/statistics", "Admin, Teacher", "Full analytics — KPIs, score trends, grade pie, subject performance, rankings, remediation. Uses streaming."],
                    ["/dashboard/certificates", "All", "Achievement certificates for scores ≥ 80%. Downloadable PDF."],
                    ["/dashboard/settings", "All", "User settings."],
                    ["/preparation/[subject]", "Student", "Subject-specific prep content (Science, English, Math)."],
                    ["/docs", "All", "This documentation page."],
                  ].map(([page, role, desc]) => (
                    <tr key={page} className="hover:bg-slate-50/50">
                      <td className="p-4 font-mono text-xs text-indigo-600">{page}</td>
                      <td className="p-4"><span className={`text-xs font-bold px-2 py-0.5 rounded-lg ${role === "Public" ? "bg-emerald-50 text-emerald-700" : role === "All" ? "bg-blue-50 text-blue-700" : "bg-amber-50 text-amber-700"}`}>{role}</span></td>
                      <td className="p-4 text-slate-600">{desc}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* ─── API ─── */}
          <section id="api">
            <h2 className="text-2xl font-bold text-slate-900 mb-4 flex items-center gap-3">
              <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl"><FileText size={20} /></div>
              API Reference
            </h2>
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <table className="w-full text-left">
                <thead><tr className="bg-slate-50 border-b border-slate-100"><th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Endpoint</th><th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Methods</th><th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Auth</th><th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Purpose</th></tr></thead>
                <tbody className="divide-y divide-slate-50 text-sm">
                  {[
                    ["/api/auth/[...nextauth]", "ALL", "Public", "NextAuth handler (sign in, session, providers, CSRF)"],
                    ["/api/register", "POST", "Public", "User registration with bcrypt-hashed password"],
                    ["/api/students", "GET, POST", "Admin, Teacher", "List (paginated with avg score) or create student"],
                    ["/api/students/[id]", "GET", "Admin, Teacher", "Single student details with recent results"],
                    ["/api/students/stats/[id]", "GET", "Admin, Teacher", "Aggregated student stats (quizzes, score)"],
                    ["/api/students/completed-quizzes", "GET", "Admin, Teacher", "Completed quizzes data"],
                    ["/api/students/quiz-attempts", "GET", "Admin, Teacher", "Quiz attempt data"],
                    ["/api/students/import", "POST", "Admin, Teacher", "CSV batch import of students"],
                    ["/api/teachers", "GET, POST", "Admin", "List or create teachers"],
                    ["/api/teachers/[id]", "GET, PATCH", "Admin", "Teacher details or update"],
                    ["/api/teachers/assignments", "GET, POST", "Admin", "List or create teacher assignments"],
                    ["/api/teachers/me/assignments", "GET", "Admin, Teacher", "Current teacher's own assignments"],
                    ["/api/grades", "GET, POST", "All", "List grades (with counts) or create grade"],
                    ["/api/classes", "GET, POST", "All", "List classes (filterable by grade) or create class"],
                    ["/api/subjects", "GET", "All", "List all subjects"],
                    ["/api/quizzes/[id]", "GET, PUT", "Admin, Teacher", "Get or update quiz with questions"],
                    ["/api/quizzes/[id]/publish", "POST", "Admin, Teacher", "Toggle quiz publish state"],
                    ["/api/quizzes/save", "POST", "Admin, Teacher", "Create or update quiz with questions"],
                    ["/api/quizzes/import", "POST", "Admin, Teacher", "Import quiz from data"],
                    ["/api/outcomes", "GET, POST", "Admin, Teacher", "List or create learning outcomes"],
                    ["/api/outcomes/upload", "POST", "Admin, Teacher", "Upload outcomes CSV file"],
                    ["/api/results/save", "POST", "All", "Save quiz result with all answers, calculate score"],
                    ["/api/generate-quiz", "POST", "Admin, Teacher", "AI quiz generation via Gemini"],
                    ["/api/generate-images", "POST", "Admin, Teacher", "AI image generation"],
                    ["/api/remediation/generate", "POST", "Admin, Teacher", "AI remediation plan generation"],
                    ["/api/stats", "GET", "Public", "Platform-wide per-grade stats (avg score, participation)"],
                  ].map(([ep, methods, auth, desc]) => (
                    <tr key={ep} className="hover:bg-slate-50/50">
                      <td className="p-4 font-mono text-xs text-indigo-600 max-w-[260px] break-all">{ep}</td>
                      <td className="p-4"><span className="text-xs font-bold text-slate-600">{methods}</span></td>
                      <td className="p-4"><span className="text-xs font-bold px-2 py-0.5 rounded-lg bg-slate-100 text-slate-700">{auth}</span></td>
                      <td className="p-4 text-slate-600">{desc}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* ─── Components ─── */}
          <section id="components">
            <h2 className="text-2xl font-bold text-slate-900 mb-4 flex items-center gap-3">
              <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl"><Settings size={20} /></div>
              Components
            </h2>
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <table className="w-full text-left">
                <thead><tr className="bg-slate-50 border-b border-slate-100"><th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Component</th><th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Type</th><th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Description</th></tr></thead>
                <tbody className="divide-y divide-slate-50 text-sm">
                  {[
                    ["Navbar", "Client", "Sticky top nav — logo, student achievement badge, role badge, user name, sign out"],
                    ["Sidebar", "Client", "Dashboard sidebar — role-aware menu items, active highlight, quick links for students"],
                    ["Footer", "Client", "Site footer"],
                    ["Providers", "Client", "SessionProvider + SWRConfig wrapper"],
                    ["DashboardCharts", "Client", "CSS-based performance bars and grade distribution (handles hydration)"],
                    ["SystemStatsChart", "Client", "Recharts line chart for system stats via SWR"],
                    ["QuizManager / QuizManager2", "Client", "AI-powered quiz creator — topic input, question generation, save"],
                    ["MathRenderer", "Client", "KaTeX LaTeX math expression renderer"],
                    ["SafeQuizImage", "Client", "Image component with fallback for quiz images"],
                    ["CertificateButton / CertificatePDF", "Client", "Certificate download — renders React-PDF template"],
                    ["PrintButton", "Client", "Browser print trigger"],
                    ["StudentEditModal", "Client", "Edit student info — name, email, grade, class"],
                    ["TeacherEditButton / TeacherEditModal", "Client", "Edit teacher subject/grade assignments"],
                    ["SubjectCreateModal", "Client", "Create new subject"],
                  ].map(([comp, type, desc]) => (
                    <tr key={comp} className="hover:bg-slate-50/50">
                      <td className="p-4 font-mono text-xs font-bold text-slate-800">{comp}</td>
                      <td className="p-4"><span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-lg">{type}</span></td>
                      <td className="p-4 text-slate-600">{desc}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* ─── AI ─── */}
          <section id="ai">
            <h2 className="text-2xl font-bold text-slate-900 mb-4 flex items-center gap-3">
              <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl"><Cpu size={20} /></div>
              AI Integration
            </h2>
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-6">
              <div>
                <h3 className="font-bold text-slate-800 mb-2">Quiz Generation (Gemini 2.0 Flash)</h3>
                <p className="text-slate-600 mb-3">Teachers provide a topic, number of questions, and question types. The API sends a structured prompt to Gemini which returns JSON containing questions with options, correct answers, bloom levels, difficulty, and learning outcome mappings.</p>
                <pre className="bg-slate-900 text-slate-300 rounded-xl p-4 text-sm overflow-x-auto"><code>{`POST /api/generate-quiz
Body: { topic, numQuestions, questionTypes, subject, grade, outcomes }
→ Generates questions → parsed → saved to database`}</code></pre>
              </div>
              <div>
                <h3 className="font-bold text-slate-800 mb-2">Remediation Generation (Anthropic/AgentRouter)</h3>
                <p className="text-slate-600">For quizzes with low average scores (&lt;70%), teachers can generate AI remediation plans that suggest targeted interventions.</p>
              </div>
            </div>
          </section>

          {/* ─── Performance ─── */}
          <section id="performance">
            <h2 className="text-2xl font-bold text-slate-900 mb-4 flex items-center gap-3">
              <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl"><BarChart3 size={20} /></div>
              Performance
            </h2>
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-6">
              <p className="text-slate-600">All times are from a remote Supabase database in Tokyo (~200-400ms network latency per query).</p>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead><tr className="bg-slate-50 border-b border-slate-100"><th className="p-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Page</th><th className="p-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Before</th><th className="p-3 text-xs font-bold text-slate-500 uppercase tracking-wider">After</th><th className="p-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Improvement</th></tr></thead>
                  <tbody className="divide-y divide-slate-50 text-sm">
                    {[
                      ["Teachers", "14.9s", "1.4s", "-90%"],
                      ["Students API", "4.9s", "500ms", "-90%"],
                      ["Classes API", "3.8s", "500ms", "-87%"],
                      ["Grades API", "1.6s", "350ms", "-78%"],
                      ["Dashboard", "4.3s", "1.1s", "-74%"],
                      ["Statistics", "5.5s", "1.7s", "-69%"],
                      ["Certificates", "1.5s", "600ms", "-60%"],
                      ["Quizzes", "5.7s", "2.3s", "-59%"],
                    ].map(([page, before, after, impr]) => (
                      <tr key={page} className="hover:bg-slate-50/50">
                        <td className="p-3 font-semibold text-slate-800">{page}</td>
                        <td className="p-3 text-red-600 font-medium">{before}</td>
                        <td className="p-3 text-emerald-600 font-medium">{after}</td>
                        <td className="p-3 font-bold text-indigo-600">{impr}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div>
                <h3 className="font-bold text-slate-800 mb-3">Optimizations Applied</h3>
                <ul className="space-y-2 text-slate-600">
                  <li className="flex items-start gap-2"><div className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-2.5 flex-shrink-0" /> <span><strong>Database indexes</strong> on all foreign keys and filtered columns (role, gradeId, subjectId, isPublished, studentId, quizId, completedAt)</span></li>
                  <li className="flex items-start gap-2"><div className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-2.5 flex-shrink-0" /> <span><strong>Batch parallelization</strong> — all pages use <code className="text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded text-sm">Promise.all</code> to run independent queries concurrently</span></li>
                  <li className="flex items-start gap-2"><div className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-2.5 flex-shrink-0" /> <span><strong>Removed heavy includes</strong> — replaced <code className="text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded text-sm">include: results</code> with <code className="text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded text-sm">_count</code> or server-side <code className="text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded text-sm">groupBy</code> aggregates</span></li>
                  <li className="flex items-start gap-2"><div className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-2.5 flex-shrink-0" /> <span><strong>Streaming via Suspense</strong> — Dashboard and Statistics pages render layout immediately, heavy sections stream in with skeleton placeholders</span></li>
                  <li className="flex items-start gap-2"><div className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-2.5 flex-shrink-0" /> <span><strong>SWR client caching</strong> — automatic deduplication and cache for API calls on Students page, Navbar, and SystemStatsChart</span></li>
                  <li className="flex items-start gap-2"><div className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-2.5 flex-shrink-0" /> <span><strong>ISR</strong> — pages use <code className="text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded text-sm">revalidate = 300-600s</code> for cached renders in production</span></li>
                  <li className="flex items-start gap-2"><div className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-2.5 flex-shrink-0" /> <span><strong>Pagination</strong> — Students API limits results (max 500) with offset-based pagination</span></li>
                  <li className="flex items-start gap-2"><div className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-2.5 flex-shrink-0" /> <span><strong>Raw SQL</strong> — complex aggregations use raw SQL for single-pass computation</span></li>
                </ul>
              </div>
            </div>
          </section>

          {/* ─── Deployment ─── */}
          <section id="deploy">
            <h2 className="text-2xl font-bold text-slate-900 mb-4 flex items-center gap-3">
              <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl"><Globe size={20} /></div>
              Deployment
            </h2>
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-6">
              <div>
                <h3 className="font-bold text-slate-800 mb-2">Vercel</h3>
                <ol className="space-y-2 text-slate-600 list-decimal list-inside">
                  <li>Push repository to GitHub</li>
                  <li>Import project to Vercel</li>
                  <li>Set all environment variables from <code className="text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded text-sm">.env</code></li>
                  <li>Vercel auto-detects <code className="text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded text-sm">NEXTAUTH_URL</code> from <code className="text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded text-sm">VERCEL_URL</code></li>
                  <li>Build command: <code className="text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded text-sm">prisma generate && next build</code></li>
                </ol>
              </div>
              <div>
                <h3 className="font-bold text-slate-800 mb-2">Before Deploying</h3>
                <p className="text-slate-600">Ensure the Prisma schema is in sync with the database:</p>
                <pre className="bg-slate-900 text-slate-300 rounded-xl p-4 text-sm mt-2"><code>{`npx prisma migrate deploy`}</code></pre>
              </div>
              <div>
                <h3 className="font-bold text-slate-800 mb-2">Required Environment Variables</h3>
                <pre className="bg-slate-900 text-slate-300 rounded-xl p-4 text-sm overflow-x-auto"><code>{`DATABASE_URL    — PostgreSQL connection string
NEXTAUTH_SECRET — Random secret for JWT signing
GEMINI_API_KEY  — Google Gemini API key (quiz generation)
GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET — OAuth (optional)

Optional:
CLOUDINARY_CLOUD_NAME / API_KEY / API_SECRET — Image upload
ANTHROPIC_API_KEY / AGENTROUTER_API_KEY — Remediation AI`}</code></pre>
              </div>
            </div>
          </section>

          {/* ─── Footer ─── */}
          <div className="text-center py-8 border-t border-slate-200">
            <p className="text-sm text-slate-400">
              Need help? Contact your system administrator.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
