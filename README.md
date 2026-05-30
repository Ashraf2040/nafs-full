# NAFS Preparation Portal

AI-powered web platform for students to prepare for the **NAFS (National Assessment Framework)** standardized assessment in the UAE. Generates quizzes from text/PDF, tracks progress, provides analytics for students, teachers, and admins.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16.2.3 (App Router, React 19) |
| Language | TypeScript 5 |
| Styling | TailwindCSS v4 |
| Database | PostgreSQL (via Supabase) |
| ORM | Prisma 7.8 with `@prisma/adapter-pg` (pg driver) |
| Auth | NextAuth v4 (JWT strategy, credentials + Google OAuth) |
| AI | Google Gemini 2.0 Flash, Anthropic (via AgentRouter) |
| Charts | Recharts 3.8.1 |
| PDF | React-PDF (certificates), jsPDF |
| Math | KaTeX (rendering), react-katex |
| Notifications | react-hot-toast |
| Client caching | SWR 2.4 |
| Icons | Lucide React |

---

## Getting Started

### Prerequisites

- Node.js 20+
- PostgreSQL database (Supabase recommended)
- Google Gemini API key (for AI quiz generation)
- Google OAuth credentials (optional, for social login)

### Environment Variables

Create a `.env` file at the project root:

```env
# Database
DATABASE_URL="postgresql://user:password@host:5432/db?schema=public"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-random-secret"

# Google OAuth (optional)
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"

# AI - Gemini (for quiz generation)
GEMINI_API_KEY="your-gemini-api-key"

# AI - AgentRouter / Anthropic (for remediation)
ANTHROPIC_API_KEY="your-anthropic-key"
AGENTROUTER_API_KEY="your-agentrouter-key"
ANTHROPIC_BASE_URL="https://agentrouter.org/"

# Image upload
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
```

### Install & Run

```bash
# Install dependencies
npm install

# Generate Prisma client
npx prisma generate

# Apply migrations to database
npx prisma migrate deploy

# (Optional) Seed database
npx prisma db seed

# Start dev server
npm run dev
```

The app will be available at `http://localhost:3000`.

### Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server (Turbopack) |
| `npm run build` | Generate Prisma client + production build |
| `npm start` | Start production server |
| `npm run lint` | Run ESLint |
| `npx prisma migrate dev` | Create + apply migration after schema changes |
| `npx prisma migrate deploy` | Apply pending migrations (production) |
| `npx prisma studio` | Open Prisma Studio (DB GUI) |
| `npx prisma db seed` | Run seed script |
| `npx tsc --noEmit` | TypeScript check without emitting |

---

## Project Structure

```
nafs-prep/
├── prisma/
│   ├── schema.prisma          # Database schema (models, enums, indexes)
│   ├── migrations/            # Migration history (one folder per migration)
│   ├── seed.ts                # Database seed script
│   └── config.ts              # Prisma config (seed command, datasource URL)
├── public/                    # Static assets
├── src/
│   ├── app/
│   │   ├── layout.tsx         # Root layout (Navbar, Footer, Providers, Toaster)
│   │   ├── loading.tsx        # Global loading spinner
│   │   ├── page.tsx           # Landing page
│   │   ├── login/             # Login page
│   │   ├── register/          # Registration page
│   │   ├── unauthorized/      # Access denied page
│   │   ├── image-generator/   # AI image generation page
│   │   ├── preparation/[subject]/  # Subject preparation pages
│   │   ├── dashboard/
│   │   │   ├── layout.tsx     # Dashboard layout (Sidebar + main area)
│   │   │   ├── loading.tsx    # Dashboard skeleton loading
│   │   │   ├── page.tsx       # Main dashboard (stat cards, charts, recent)
│   │   │   ├── quizzes/       # Quiz listing, create, edit, solve, completed
│   │   │   ├── students/      # Student list, profiles
│   │   │   ├── teachers/      # Teacher list, profiles
│   │   │   ├── subjects/      # Subject management
│   │   │   ├── statistics/    # Analytics dashboard (charts, rankings)
│   │   │   ├── certificates/  # Achievement certificates
│   │   │   └── settings/      # User settings
│   │   └── api/               # 27 API route files (see API Routes section)
│   ├── components/
│   │   ├── Navbar.tsx         # Top navigation bar (client component)
│   │   ├── Sidebar.tsx        # Dashboard sidebar navigation (client component)
│   │   ├── Footer.tsx         # Site footer
│   │   ├── Providers.tsx      # SessionProvider + SWR wrapper
│   │   ├── DashboardCharts.tsx # Dashboard charts (bar + grade dist)
│   │   ├── SystemStatsChart.tsx # System stat chart
│   │   ├── QuizManager.tsx    # Quiz creator (v1)
│   │   ├── QuizManager2.tsx   # Quiz creator (v2 refactored)
│   │   ├── MathRenderer.tsx   # KaTeX math rendering
│   │   ├── SafeQuizImage.tsx  # Safe image component for quizzes
│   │   ├── CertificateButton.tsx # Certificate download button
│   │   ├── CertificatePDF.tsx  # React-PDF certificate template
│   │   ├── PrintButton.tsx    # Print functionality
│   │   ├── StudentEditModal.tsx  # Edit student info modal
│   │   ├── TeacherEditButton.tsx # Edit teacher assignments button
│   │   ├── TeacherEditModal.tsx  # Edit teacher modal
│   │   └── SubjectCreateModal.tsx # Create subject modal
│   ├── hooks/
│   │   └── useQuizManager.ts  # Custom hook for quiz state management
│   ├── lib/
│   │   ├── auth.ts            # NextAuth config (providers, callbacks, JWT)
│   │   ├── prisma.ts          # Prisma client singleton (pg pool, global cache)
│   │   ├── fetcher.ts         # SWR fetch wrapper
│   │   ├── ai.ts              # Gemini AI model initialization
│   │   └── analyzeQuiz.ts     # Quiz analysis utilities
│   ├── proxy.ts               # Middleware (role-based route protection)
│   └── types/                 # TypeScript type declarations
├── next.config.ts             # Next.js configuration
├── tailwind.config.ts         # Tailwind CSS configuration
├── tsconfig.json               # TypeScript configuration
├── postcss.config.mjs          # PostCSS configuration
├── eslint.config.mjs           # ESLint configuration
├── package.json
└── .env
```

---

## Database Schema

### Enums

**`Role`** — `ADMIN`, `TEACHER`, `STUDENT`

### Models

| Model | Key Fields | Relations | Purpose |
|-------|-----------|-----------|---------|
| **User** | `id`, `name`, `email` (unique), `password`, `image`, `role`, `gradeId`, `classId`, `createdAt` | → Grade, → Class, → Quiz (creator), → Result, → TeacherAssignment | All users (students, teachers, admins) |
| **Grade** | `id`, `level` (unique, Int), `name`, `createdAt` | → Quiz[], → TeacherAssignment[], → User[], → Class[] | Grade levels (3-9) |
| **Class** | `id`, `name`, `gradeId`, `createdAt` | → Grade, → User[] | Class groups within a grade |
| **Subject** | `id`, `name` (unique), `description`, `colorCode`, `createdAt` | → Quiz[], → TeacherAssignment[], → LearningOutcome[] | Academic subjects (Science, Math, English) |
| **TeacherAssignment** | `id`, `teacherId`, `subjectId`, `gradeId`, `createdAt` | → User (teacher), → Subject, → Grade | Which subjects/grades a teacher can teach |
| **Quiz** | `id`, `title`, `description`, `isPublished`, `dueDate`, `gradeId`, `subjectId`, `creatorId`, `outcomeId`, `createdAt` | → Grade, → Subject, → User (creator), → LearningOutcome (optional), → Question[], → Result[] | Assessments created by teachers/admins |
| **Question** | `id`, `quizId`, `questionText`, `questionType`, `options` (JSON), `correctAnswer`, `explanation`, `imageUrl`, `bloomLevel`, `difficulty`, `learningOutcomeId`, `createdAt` | → Quiz, → LearningOutcome (optional), → StudentAnswer[] | Individual quiz questions |
| **Result** | `id`, `score`, `totalPoints`, `studentId`, `quizId`, `completedAt` | → User (student), → Quiz, → StudentAnswer[] | Quiz submission results |
| **StudentAnswer** | `id`, `resultId`, `questionId`, `studentAnswer`, `isCorrect`, `createdAt` | → Result, → Question | Individual question answers within a submission |
| **LearningOutcome** | `id`, `grade` (Int), `subject`, `subDomain`, `outcomeText`, `indicatorText`, `subjectRefId`, `createdAt` | → Subject (optional), → Question[], → Quiz[] | NAFS learning standards mapped by grade/subject |

### Indexes

All indexes are applied via migration `20260529210144_add_indexes`:

| Table | Index Columns |
|-------|--------------|
| User | `role`, `gradeId` |
| Quiz | `isPublished`, `gradeId`, `subjectId` |
| Result | `studentId`, `quizId`, `completedAt` |
| Class | `gradeId` |
| Question | `quizId` |
| StudentAnswer | `resultId`, `questionId` |
| TeacherAssignment | `teacherId`, `subjectId`, `gradeId` |
| LearningOutcome | `grade`, `subject` |

### Key Relationships

```
User (ADMIN/TEACHER) ──→ Quiz (creator)
User (STUDENT) ──→ Grade → Class
User (TEACHER) ──→ TeacherAssignment → Subject × Grade
Quiz ──→ Grade × Subject × Creator × Outcome
Quiz ──→ Question → LearningOutcome
Quiz ──→ Result (submission) → StudentAnswer → Question
LearningOutcome ──→ Subject (optional reference)
```

---

## Authentication & Authorization

### Auth Flow

1. **Credentials**: User enters email + password → `authorize()` in `src/lib/auth.ts` looks up user via Prisma, compares password with bcrypt → returns user object with role, gradeId, classId
2. **Google OAuth**: Uses GoogleProvider with client ID/secret from env vars
3. **JWT Strategy**: Token stores `id`, `role`, `gradeId`, `classId`, `className`
4. **Session**: JWT decoded on each request, role/grade info available in `session.user`

### Auth Configuration (`src/lib/auth.ts`)

- Two providers: Credentials (email/password) + Google OAuth
- JWT strategy with 30-day max age
- Callbacks populate JWT and session with role + grade/class info
- Custom sign-in page: `/login`
- On Vercel, auto-detects `NEXTAUTH_URL` from `VERCEL_URL`

### Route Protection

**Middleware** (`src/proxy.ts`):

Uses Next.js `config.matcher` to intercept:
- `/dashboard/:path*` — All dashboard routes
- `/preparation/:path*` — Subject prep pages
- `/api/teachers/:path*`, `/api/quizzes/:path*`, `/api/students/import`, `/api/outcomes/upload`, `/api/outcomes/:path*`

For each matched route, the middleware:
1. Reads JWT from request cookies via `getToken()`
2. Checks if user role is in the allowed list for that route prefix
3. Redirects unauthenticated users to `/login`
4. Returns 403 for unauthorized API calls, redirects students to `/dashboard` or others to `/unauthorized`

**Permission Map** (in `src/proxy.ts`):

| Route | Allowed Roles |
|-------|--------------|
| `/dashboard` | ADMIN, TEACHER, STUDENT |
| `/dashboard/quizzes/solve` | ADMIN, TEACHER, STUDENT |
| `/dashboard/teachers` | ADMIN |
| `/dashboard/subjects` | ADMIN, TEACHER |
| `/dashboard/students` | ADMIN, TEACHER |
| `/dashboard/statistics` | ADMIN, TEACHER |
| `/dashboard/certificates` | ADMIN, TEACHER, STUDENT |
| `/dashboard/settings` | ADMIN, TEACHER, STUDENT |
| `/api/teachers` | ADMIN |
| `/api/students/import` | ADMIN, TEACHER |
| `/api/quizzes` | ADMIN, TEACHER (except `/api/quizzes/save` which is ADMIN, TEACHER) |
| `/api/outcomes` | ADMIN, TEACHER |
| `/api/outcomes/upload` | ADMIN, TEACHER |

**Server-side guards**: Each page and API route also independently checks the session via `getServerSession()` as a second layer.

---

## Pages

### Public Pages

| URL | File | Description |
|-----|------|-------------|
| `/` | `src/app/page.tsx` | Landing page — hero, stats bar, subject cards (Science/Math/English), how-it-works, features, testimonials, footer CTA. Role-aware CTAs based on session. |
| `/login` | `src/app/login/page.tsx` | Login form with email/password + Google OAuth button |
| `/register` | `src/app/register/page.tsx` | Registration form (name, email, password, role selection, grade) |
| `/unauthorized` | `src/app/unauthorized/page.tsx` | Access denied page with 403 illustration |

### Dashboard Pages (all under `/dashboard`)

| URL | File | Auth | Description |
|-----|------|------|-------------|
| `/dashboard` | `page.tsx` | ADMIN, TEACHER, STUDENT | Role-based main dashboard. Admin/Teacher: stat cards (students, quizzes, submissions, avg score), analytics charts (subject performance, grade distribution, monthly trends), recent assessments, quick actions, recent submissions. Student: welcome header, stat cards (available, completed, avg score, pending), performance chart, available assessments list, subject breakdown, recent results. **Streaming**: Header renders instantly, then stats section → charts → recent items stream in with skeletons. |
| `/dashboard/quizzes` | `quizzes/page.tsx` | ADMIN, TEACHER, STUDENT | Assessment library with filters (subject, grade, outcome, indicator), pagination (15/page), CSV import (admin/teacher). Teacher view scoped to assigned subjects/grades. Student view shows only published quizzes for their grade. |
| `/dashboard/quizzes/completed` | `quizzes/completed/page.tsx` | STUDENT | List of completed quizzes with scores |
| `/dashboard/quizzes/edit/[id]` | `quizzes/edit/[id]/page.tsx` | ADMIN, TEACHER | Quiz editor — modify questions, settings, publish state |
| `/dashboard/quizzes/solve/[id]` | `quizzes/solve/[id]/page.tsx` | ADMIN, TEACHER, STUDENT | Quiz-taking interface. Students answer questions and submit. Teachers/admins can preview. |
| `/dashboard/students` | `students/page.tsx` | ADMIN, TEACHER | Student list with search, create student form, grade/class filters, SWR caching. Shows name, email, grade, class, submissions count, avg score. |
| `/dashboard/students/profile/[id]` | `students/profile/[id]/page.tsx` | ADMIN, TEACHER | Individual student profile — quiz history, performance stats |
| `/dashboard/teachers` | `teachers/page.tsx` | ADMIN | Teacher management — list with assignments, quiz stats (quizzes, submissions, avg score), edit assignments button, create teacher modal. |
| `/dashboard/teachers/[id]` | `teachers/[id]/page.tsx` | ADMIN | Individual teacher profile with performance chart |
| `/dashboard/subjects` | `subjects/page.tsx` | ADMIN, TEACHER | Subject listing with management options |
| `/dashboard/statistics` | `statistics/page.tsx` | ADMIN, TEACHER | Full analytics dashboard. KPI cards (students, completion rate, avg score, active quizzes), score trends chart (6-month), grade distribution pie chart, subject performance bar chart, student rankings table, struggling quizzes needing remediation. **Streaming**: Header/filters instantly, then KPI cards → charts → rankings → struggling quizzes stream in. Supports subject/grade filters. |
| `/dashboard/certificates` | `certificates/page.tsx` | ADMIN, TEACHER, STUDENT | Achievement certificates. Students see their own (score ≥ 80%). Admins/teachers see all high-scoring students (score ≥ 80%, latest 20). Downloadable PDF certificates. |
| `/dashboard/settings` | `settings/page.tsx` | ADMIN, TEACHER, STUDENT | User settings page |
| `/image-generator` | `image-generator/page.tsx` | Public | AI image generation tool |
| `/preparation/[subject]` | `preparation/[subject]/page.tsx` | STUDENT | Subject-specific preparation content (Science, English, Math) |

---

## API Routes

### Auth

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| ALL | `/api/auth/[...nextauth]` | Public | NextAuth handler — sign in/out, session, providers, CSRF |
| POST | `/api/register` | Public | Create account (name, email, password, role, grade). Hashes password with bcrypt. Returns user + auto sign-in URL. |

### Users / Students

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| GET, POST | `/api/students` | ADMIN, TEACHER | List students (paginated, limit 500) with avg score via groupBy, or create new student. GET returns `{ students, total }`. |
| GET | `/api/students/[id]` | ADMIN, TEACHER | Single student details including recent results |
| GET | `/api/students/stats/[id]` | ADMIN, TEACHER | Aggregated stats for a student (quizzesTaken, totalScore, recentQuizzes) |
| GET | `/api/students/completed-quizzes` | ADMIN, TEACHER | All completed quizzes for students |
| GET | `/api/students/quiz-attempts` | ADMIN, TEACHER | Quiz attempt data |
| POST | `/api/students/import` | ADMIN, TEACHER | CSV batch import of students (parses file, creates users) |

### Teachers

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| GET, POST | `/api/teachers` | ADMIN | List teachers or create new teacher |
| GET, PATCH | `/api/teachers/[id]` | ADMIN | Get teacher details or update teacher |
| GET, POST | `/api/teachers/assignments` | ADMIN | List all teacher assignments or create new assignment |
| GET | `/api/teachers/me/assignments` | ADMIN, TEACHER | Get current teacher's own assignments (used by quizzes page to scope filters) |

### Grades & Classes

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| GET, POST | `/api/grades` | Auth required | List grades (with user/class counts) or create grade |
| GET, POST | `/api/classes` | Auth required | List classes (with grade info, user count) or create class |

### Subjects

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| GET | `/api/subjects` | Auth required | List all subjects |

### Quizzes

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| GET, PUT | `/api/quizzes/[id]` | ADMIN, TEACHER | Get quiz (with questions, results count) or update quiz |
| POST | `/api/quizzes/[id]/publish` | ADMIN, TEACHER | Toggle publish state of a quiz |
| POST | `/api/quizzes/save` | ADMIN, TEACHER | Create or update a quiz with questions (AI-generated or manual) |
| POST | `/api/quizzes/import` | ADMIN, TEACHER | Import quiz from data |

### Learning Outcomes

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| GET, POST | `/api/outcomes` | ADMIN, TEACHER | List outcomes (filterable by subject/grade) or create outcome |
| POST | `/api/outcomes/upload` | ADMIN, TEACHER | Upload outcomes CSV file |

### Results / Submissions

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| POST | `/api/results/save` | Auth required | Save quiz result with all student answers, calculate score |

### AI

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| POST | `/api/generate-quiz` | ADMIN, TEACHER | Generate quiz via Gemini AI from topic/text/PDF content. Creates questions with options, answers, bloom levels, difficulty, and learning outcome mapping. |
| POST | `/api/generate-images` | ADMIN, TEACHER | Generate images via AI for quiz questions |
| POST | `/api/remediation/generate` | ADMIN, TEACHER | Generate AI remediation plan for struggling quizzes |

### Stats

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| GET | `/api/stats` | Public | Platform-wide stats: per-grade average score and participation count (raw SQL aggregation across Grade → Quiz → Result). Used by admin dashboard. |

---

## Components

### Layout Components

| Component | File | Type | Description |
|-----------|------|------|-------------|
| **Navbar** | `src/components/Navbar.tsx` | Client | Sticky top nav. Shows NAFS Portal logo, student achievement badge (if student), role badge, user name, sign out button. Uses `useSession()` and `useSWR` for student stats. |
| **Sidebar** | `src/components/Sidebar.tsx` | Client | Dashboard sidebar (w-64, dark bg). Role-aware menu items. Active route highlighting with longest-match logic. Student quick links to subject prep pages. |
| **Footer** | `src/components/Footer.tsx` | Client | Site footer with links |
| **Providers** | `src/components/Providers.tsx` | Client | Wraps children in `SessionProvider` + `SWRConfig`. Must be in root layout. |

### Dashboard Components

| Component | File | Type | Description |
|-----------|------|------|-------------|
| **DashboardCharts** | `src/components/DashboardCharts.tsx` | Client | Displays subject performance bars and grade distribution bars (CSS-based, not Recharts). Handles hydration with `useEffect` + `setMounted`. |
| **SystemStatsChart** | `src/components/SystemStatsChart.tsx` | Client | Recharts line chart for system-wide stats. Uses SWR to fetch `/api/stats`. Numeric height on ResponsiveContainer to avoid hydration width/height errors. |

### Quiz Components

| Component | File | Type | Description |
|-----------|------|------|-------------|
| **QuizManager** | `src/components/QuizManager.tsx` | Client | AI-powered quiz creator (v1). Topic input, number of questions, question type selection. Generates via API call, displays preview, saves to DB. |
| **QuizManager2** | `src/components/QuizManager2.tsx` | Client | Refactored quiz creator (v2). Similar to v1 but with improved UX. |
| **MathRenderer** | `src/components/MathRenderer.tsx` | Client | Renders LaTeX math expressions via KaTeX |
| **SafeQuizImage** | `src/components/SafeQuizImage.tsx` | Client | Safe image component with fallback for quiz images |

### Certificate Components

| Component | File | Type | Description |
|-----------|------|------|-------------|
| **CertificateButton** | `src/components/CertificateButton.tsx` | Client | "Download Certificate" button that renders and downloads a PDF |
| **CertificatePDF** | `src/components/CertificatePDF.tsx` | Client | React-PDF document template — styled certificate with student name, subject, score, date, teacher name |
| **PrintButton** | `src/components/PrintButton.tsx` | Client | Browser print button |

### Management Components

| Component | File | Type | Description |
|-----------|------|------|-------------|
| **StudentEditModal** | `src/components/StudentEditModal.tsx` | Client | Modal for editing student info (name, email, grade, class). Fetches grades/classes dynamically. |
| **TeacherEditButton** | `src/components/TeacherEditButton.tsx` | Client | Button that opens TeacherEditModal for editing a teacher's assignments |
| **TeacherEditModal** | `src/components/TeacherEditModal.tsx` | Client | Modal for editing teacher assignments (subject + grade combinations) |
| **SubjectCreateModal** | `src/components/SubjectCreateModal.tsx` | Client | Modal for creating new subjects |

---

## AI Integration

### Quiz Generation (`src/lib/ai.ts`)

Uses Google Gemini 2.0 Flash model:

```typescript
import { GoogleGenerativeAI } from "@google/generative-ai";
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
export const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
```

The API route `/api/generate-quiz` sends a prompt to Gemini including:
- Topic/description of the quiz
- Number of questions
- Question types (multiple choice, true/false, etc.)
- Grade level, subject, learning outcomes
- Bloom's taxonomy level

Gemini returns structured JSON which is parsed and saved as quiz questions.

### Image Generation (`/api/generate-images`)

Generates images for quiz content via AI.

### Remediation (`/api/remediation/generate`)

Uses Anthropic/AgentRouter to generate remediation plans for quizzes with low average scores.

---

## Performance

### Current State (after optimizations)

| Page | First Visit | Cached Visit |
|------|------------|--------------|
| Dashboard (Admin) | ~1.6s | ~1.0s |
| Quizzes | ~2.3s | ~1.5s |
| Statistics | ~1.7s | ~1.0s |
| Students (API) | ~500ms | ~300ms |
| Classes (API) | ~500ms | ~200ms |
| Grades (API) | ~350ms | ~150ms |
| Certificates | ~600ms | ~300ms |
| Teachers | ~1.4s | ~1.0s |

### Optimizations Applied

1. **Database indexes** on all foreign keys and frequently filtered columns (gradeId, subjectId, role, isPublished, studentId, quizId, completedAt)
2. **Batch parallelization** — All pages use `Promise.all` to run independent queries concurrently
3. **Removed heavy includes** — Replaced `include: { results: true }` with `_count` or `groupBy` aggregates (avoided transferring all result rows)
4. **Server-side aggregation** — Used raw SQL (`$queryRaw`) for complex aggregations (subject performance, grade distribution, monthly trends)
5. **SWR client caching** — Students page, Navbar, SystemStatsChart use SWR with automatic deduplication and cache
6. **Streaming via Suspense** — Dashboard and Statistics pages split into independently-streamed sections with skeleton placeholders
7. **ISR** — Pages use `revalidate = 300-600s` in production for cached renders
8. **Pagination** — Students API uses `limit` (max 500) and `offset`
9. **Connection pooling** — Prisma uses pg Pool with `max: 3`

### Production Build

`revalidate` and ISR only work in production (`next build && next start`). In dev mode (Turbopack), every request is dynamic.

```bash
npm run build   # Builds + generates Prisma client
npm start       # Starts production server with ISR
```

### Database Connection

- Hosted on Supabase (Tokyo region, `aws-1-ap-northeast-1.pooler.supabase.com`)
- Each query has ~200-400ms network overhead
- Pool max 3 connections with 10s timeout, 15s idle timeout
- Prisma client is cached as global singleton (prevents multiple pool creation in serverless)

---

## Deployment

### Vercel

1. Push repository to GitHub
2. Import project to Vercel
3. Set environment variables (all from `.env`)
4. Vercel auto-detects `NEXTAUTH_URL` from `VERCEL_URL`
5. Post-install hook runs `prisma generate`
6. Build command runs `prisma generate && next build`

**Important**: Ensure the Prisma schema is in sync with the database before deploying:
```bash
npx prisma migrate deploy
```

### Manual / Self-Hosted

```bash
npm run build
npm start
```

---

## Common Development Tasks

### Adding a new database field

1. Edit `prisma/schema.prisma`
2. Run `npx prisma migrate dev --name describe_change`
3. Run `npx prisma generate`
4. Update types and queries in code

### Adding a new page

1. Create folder under `src/app/` or `src/app/dashboard/`
2. Add `page.tsx` with the page component
3. If under dashboard, the dashboard layout auto-wraps it with sidebar
4. Add route permission in `src/proxy.ts` if needed
5. Add sidebar link in `src/components/Sidebar.tsx`

### Adding a new API route

1. Create folder under `src/app/api/` with `route.ts`
2. Export `GET`, `POST`, `PUT`, `PATCH`, or `DELETE` as needed
3. Check session with `getServerSession(authOptions)`
4. Add route middleware in `src/proxy.ts` if it needs protection beyond the base `/api/` pattern
