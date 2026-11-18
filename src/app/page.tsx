// src/app/page.tsx
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import Link from "next/link";
import {
  BarChart3, BookOpen, FlaskConical, Calculator, ShieldCheck,
  GraduationCap, ArrowRight, Trophy, Users, Zap,
  FileText, Target, Sparkles, CheckCircle2, ChevronRight,
  Brain, Globe, Lock, LayoutDashboard, Activity
} from "lucide-react";
import { SystemStatsChart } from "@/components/SystemStatsChart";

export default async function LandingPage() {
  const session = await getServerSession(authOptions);
  const userRole = (session?.user as any)?.role;

  const subjects = [
    {
      name: "Science",
      icon: <FlaskConical size={64} strokeWidth={1.5} />,
      color: "from-emerald-500 via-teal-600 to-cyan-700",
      glow: "shadow-emerald-500/25",
      path: "science",
      description: "Biology, Chemistry & Physics",
      topics: ["Cell Biology", "Chemical Reactions", "Forces & Motion", "Energy"],
      accent: "emerald",
    },
    {
      name: "English",
      icon: <BookOpen size={64} strokeWidth={1.5} />,
      color: "from-blue-500 via-indigo-600 to-violet-700",
      glow: "shadow-blue-500/25",
      path: "english",
      description: "Grammar, Reading & Writing",
      topics: ["Reading Comprehension", "Grammar Rules", "Essay Writing", "Vocabulary"],
      accent: "blue",
    },
    {
      name: "Math",
      icon: <Calculator size={64} strokeWidth={1.5} />,
      color: "from-purple-500 via-fuchsia-600 to-pink-700",
      glow: "shadow-purple-500/25",
      path: "math",
      description: "Algebra, Geometry & Problem Solving",
      topics: ["Algebraic Expressions", "Geometry", "Statistics", "Number Theory"],
      accent: "purple",
    },
  ];

  const stats = [
    { value: "3", label: "Core Subjects", icon: <BookOpen size={22} /> },
    { value: "3 · 6 · 9", label: "Supported grades", icon: <GraduationCap size={22} /> },
    { value: "2", label: "Assessment modes", icon: <ShieldCheck size={22} /> },
    { value: "3", label: "Role-based portals", icon: <Users size={22} /> },
  ];

  const steps = [
    {
      step: "01",
      title: "Upload Your Material",
      description: "Drop a PDF or paste text from any NAFS-aligned source material.",
      icon: <FileText size={28} />,
    },
    {
      step: "02",
      title: "AI Generates Quizzes",
      description: "Our AI analyzes content and creates standards-aligned assessments instantly.",
      icon: <Brain size={28} />,
    },
    {
      step: "03",
      title: "Practice & Improve",
      description: "Take quizzes, get instant feedback, and watch your weak areas transform.",
      icon: <Target size={28} />,
    },
  ];

  const features = [
    {
      icon: <Sparkles size={36} />,
      title: "AI Quiz Generator",
      desc: "Upload PDFs or paste text and instantly get high-quality, standards-aligned assessments with detailed explanations.",
      highlight: "AI Assisted",
    },
    {
      icon: <BarChart3 size={36} />,
      title: "Deep Analytics",
      desc: "Real-time dashboards, weak area identification, and progress reports for students and teachers.",
      highlight: "Live Tracking",
    },
    {
      icon: <Trophy size={36} />,
      title: "Recognition & Growth",
      desc: "Beautiful digital certificates, leaderboards, and achievement system that motivates continuous improvement.",
      highlight: "Gamified",
    },
  ];

  const trustBadges = [
    { icon: <Target size={18} />, text: "Curriculum indicators" },
    { icon: <CheckCircle2 size={18} />, text: "Practice & quizzes" },
    { icon: <BarChart3 size={18} />, text: "Progress insights" },
    { icon: <Zap size={18} />, text: "Feedback after quizzes" },
  ];

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 overflow-x-hidden">
      {/* ===== NAVIGATION ===== */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/70 backdrop-blur-xl border-b border-slate-200/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20 group-hover:shadow-indigo-500/40 transition-shadow">
              <GraduationCap className="text-white" size={20} />
            </div>
            <span className="font-extrabold text-xl tracking-tight text-slate-900">
              NAFS<span className="text-indigo-600">.</span>
            </span>
          </Link>

          <div className="hidden md:flex items-center gap-1">
            {["Subjects", "How It Works", "Features"].map((item) => (
              <a
                key={item}
                href={`#${item.toLowerCase().replace(/\s+/g, "-")}`}
                className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100/80 transition-all"
              >
                {item}
              </a>
            ))}
            <a
              href="/dashboard/statistics"
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100/80 transition-all"
            >
              Statistics
            </a>
          </div>

          <div className="flex items-center gap-3">
            {session ? (
              <Link
                href="/dashboard"
                className="hidden sm:inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors shadow-lg shadow-indigo-500/20"
              >
                Dashboard <ArrowRight size={16} />
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  className="hidden sm:inline-flex items-center px-4 py-2.5 text-sm font-medium text-slate-700 hover:text-slate-900 rounded-xl hover:bg-slate-100/80 transition-all"
                >
                  Sign In
                </Link>
                <Link
                  href="/register"
                  className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors shadow-lg shadow-indigo-500/20"
                >
                  Get Started <ArrowRight size={16} />
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* ===== HERO SECTION ===== */}
      <section className="relative isolate overflow-hidden bg-slate-950 text-white">
        <div aria-hidden="true" className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_78%_10%,rgba(99,102,241,.2),transparent_34%),radial-gradient(ellipse_at_0%_100%,rgba(124,58,237,.13),transparent_36%)]" />
        <div aria-hidden="true" className="absolute inset-0 -z-10 bg-[radial-gradient(#ffffff08_1px,transparent_1px)] [background-size:34px_34px]" />
        <div className="mx-auto grid w-full max-w-7xl items-center gap-12 px-4 pb-20 pt-16 sm:px-6 sm:pb-24 sm:pt-20 lg:grid-cols-[1.05fr_.95fr] lg:gap-14 lg:px-8 lg:py-28">
          <div className="max-w-2xl">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-indigo-300/20 bg-white/[.06] px-3.5 py-2 text-xs font-semibold text-indigo-100 sm:text-sm">
              <ShieldCheck size={15} className="text-emerald-300" /> Saudi NAFS preparation, thoughtfully designed
            </div>
            <h1 className="text-[2.55rem] font-extrabold leading-[1.08] tracking-tight sm:text-5xl lg:text-[3.8rem]">
              Prepare with clarity.
              <span className="mt-1 block bg-gradient-to-r from-indigo-300 via-violet-300 to-fuchsia-300 bg-clip-text text-transparent">Grow with confidence.</span>
            </h1>
            <p className="mt-6 max-w-xl text-base leading-7 text-slate-300 sm:text-lg sm:leading-8">
              A focused preparation space for Saudi students and educators, with curriculum-mapped practice, clear feedback, and progress you can follow.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
              {!session ? <>
                <Link href="/register" className="group inline-flex min-h-12 items-center justify-center gap-2.5 rounded-xl bg-white px-6 py-3 font-bold text-slate-900 shadow-lg shadow-indigo-950/20 transition hover:-translate-y-0.5 hover:bg-indigo-50">
                  <GraduationCap size={20} /> Get started <ArrowRight size={17} className="transition-transform group-hover:translate-x-1" />
                </Link>
                <Link href="/login" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-white/15 px-6 py-3 font-semibold text-white transition hover:border-white/30 hover:bg-white/[.06]">Sign in</Link>
              </> : userRole === "STUDENT" ? <>
                <Link href="/preparation/science" className="group inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-white px-6 py-3 font-bold text-slate-900 shadow-lg transition hover:-translate-y-0.5 hover:bg-indigo-50"><BookOpen size={19} /> Start learning <ArrowRight size={17} /></Link>
                <Link href="/dashboard" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-white/15 px-6 py-3 font-semibold transition hover:bg-white/[.06]"><Trophy size={18} /> My progress</Link>
              </> : <>
                <Link href="/dashboard/quizzes" className="group inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-white px-6 py-3 font-bold text-slate-900 shadow-lg transition hover:-translate-y-0.5 hover:bg-indigo-50"><BarChart3 size={19} /> Manage assessments <ArrowRight size={17} /></Link>
                <Link href="/dashboard/statistics" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-white/15 px-6 py-3 font-semibold transition hover:bg-white/[.06]">View analytics <ArrowRight size={17} /></Link>
              </>}
            </div>
            <div className="mt-8 flex flex-wrap gap-x-5 gap-y-2 border-t border-white/10 pt-5">
              {trustBadges.map((badge) => <span key={badge.text} className="inline-flex items-center gap-2 text-xs font-medium text-slate-300 sm:text-sm"><span className="text-indigo-300">{badge.icon}</span>{badge.text}</span>)}
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-[34rem] lg:ml-auto">
            <div aria-hidden="true" className="absolute -inset-6 rounded-[2rem] bg-gradient-to-br from-indigo-500/20 via-violet-500/10 to-transparent blur-2xl" />
            <div className="relative rounded-[1.6rem] border border-white/15 bg-slate-900/80 p-4 shadow-2xl shadow-slate-950/50 backdrop-blur-xl sm:p-5">
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div className="flex items-center gap-3"><span className="rounded-xl bg-indigo-500/15 p-2.5 text-indigo-200"><LayoutDashboard size={19} /></span><div><p className="text-sm font-bold text-white">Your learning space</p><p className="mt-0.5 text-xs text-slate-400">A clear view of what comes next</p></div></div>
                <span className="rounded-full border border-emerald-300/20 bg-emerald-300/10 px-2.5 py-1 text-[10px] font-semibold text-emerald-200">Ready to learn</span>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-white/10 bg-white/[.04] p-3.5"><div className="flex items-center gap-2 text-xs font-medium text-slate-300"><BookOpen size={15} className="text-indigo-300" /> Curriculum mapped</div><p className="mt-3 text-lg font-bold text-white">Learn by indicator</p><p className="mt-1 text-xs leading-5 text-slate-400">Practice focused on each skill</p></div>
                <div className="rounded-xl border border-white/10 bg-white/[.04] p-3.5"><div className="flex items-center gap-2 text-xs font-medium text-slate-300"><Activity size={15} className="text-emerald-300" /> Progress tracking</div><p className="mt-3 text-lg font-bold text-white">See your growth</p><p className="mt-1 text-xs leading-5 text-slate-400">Feedback after every assessment</p></div>
              </div>
              <div className="mt-3 rounded-xl border border-white/10 bg-white/[.04] p-4">
                <div className="mb-4 flex items-center justify-between"><div><p className="text-xs font-semibold text-slate-300">Choose a subject</p><p className="mt-1 text-[11px] text-slate-500">Build a steady study routine</p></div><ArrowRight size={16} className="text-slate-400" /></div>
                <div className="space-y-2.5">
                  {[{ name: "Science", color: "bg-emerald-400", width: "w-[72%]" }, { name: "English", color: "bg-indigo-400", width: "w-[54%]" }, { name: "Mathematics", color: "bg-violet-400", width: "w-[63%]" }].map((item) => <div key={item.name} className="flex items-center gap-3"><span className="w-24 shrink-0 text-xs font-medium text-slate-300">{item.name}</span><div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10"><div className={`h-full rounded-full ${item.color} ${item.width} opacity-80`} /></div><span className="text-[10px] text-slate-500">Explore</span></div>)}
                </div>
              </div>
              <div className="mt-3 flex items-center gap-2 text-[11px] text-slate-400"><ShieldCheck size={14} className="text-emerald-300" /> Designed for students, teachers, and school administrators</div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== STATS BAR ===== */}
      <section className="relative z-20 -mt-1">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-200/80 p-6 sm:p-8 grid grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
            {stats.map((stat) => (
              <div key={stat.label} className="text-center sm:text-left">
                <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 mb-3">
                  {stat.icon}
                </div>
                <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                  {stat.value}
                </div>
                <div className="text-sm text-slate-500 mt-0.5">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== SYSTEM CHART SECTION ===== */}
      {(userRole === "ADMIN" || userRole === "TEACHER") && <section className="py-16 sm:py-24">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/40 border border-slate-200/80 overflow-hidden">
            <div className="p-6 sm:p-8 lg:p-10 border-b border-slate-100">
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">
                      <BarChart3 size={24} />
                    </div>
                    <h2 className="text-2xl sm:text-3xl font-bold text-slate-900">
                      Platform at a Glance
                    </h2>
                  </div>
                  <p className="text-slate-500 text-base">
                    Real-time performance across the entire platform
                  </p>
                </div>
                <Link
                  href="/dashboard/statistics"
                  className="inline-flex items-center gap-1.5 text-indigo-600 hover:text-indigo-700 font-semibold text-sm group"
                >
                  Detailed Analytics
                  <ArrowRight size={16} className="group-hover:translate-x-0.5 transition-transform" />
                </Link>
              </div>
            </div>
            <div className="p-4 sm:p-6 lg:p-8">
              <div className="min-w-0"><SystemStatsChart /></div>
            </div>
          </div>
        </div>
      </section>}

      {/* ===== SUBJECTS SECTION ===== */}
      <section id="subjects" className="py-16 sm:py-24 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12 sm:mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-50 text-indigo-700 text-xs font-semibold mb-4 uppercase tracking-wider">
              <BookOpen size={14} />
              Core Subjects
            </div>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 mb-4 tracking-tight">
              Master Every Subject
            </h2>
            <p className="text-base sm:text-lg text-slate-500 max-w-lg mx-auto">
              Curated, standards-aligned practice materials for the NAFS curriculum
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
            {subjects.map((subject) => (
              <Link
                key={subject.name}
                href={`/preparation/${subject.path}`}
                className="group relative"
              >
                <div
                  className={`relative h-full overflow-hidden rounded-3xl bg-gradient-to-br ${subject.color} p-8 sm:p-10 text-white shadow-xl ${subject.glow} transition-all duration-500 hover:shadow-2xl hover:-translate-y-2 flex flex-col min-h-[380px] sm:min-h-[420px]`}
                >
                  {/* Decorative Background Icon */}
                  <div className="absolute -top-6 -right-6 opacity-[0.08] group-hover:opacity-[0.15] transition-all duration-700 group-hover:scale-110 rotate-12">
                    {subject.icon}
                  </div>
                  {/* Decorative Circle */}
                  <div className="absolute -bottom-20 -left-20 w-60 h-60 bg-white/[0.04] rounded-full" />
                  <div className="absolute top-10 right-10 w-32 h-32 bg-white/[0.04] rounded-full" />

                  {/* Content */}
                  <div className="relative z-10 flex-1 flex flex-col">
                    {/* Badge */}
                    <div className="inline-flex w-fit px-3.5 py-1 rounded-full bg-white/20 text-xs font-semibold uppercase tracking-wider mb-6 backdrop-blur-sm border border-white/10">
                      {subject.name}
                    </div>

                    {/* Icon */}
                    <div className="mb-6 opacity-90">{subject.icon}</div>

                    {/* Title */}
                    <h3 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-2">
                      {subject.name}
                    </h3>
                    <p className="text-white/70 text-sm sm:text-base mb-6">
                      {subject.description}
                    </p>

                    {/* Topics */}
                    <div className="flex flex-wrap gap-2 mb-auto">
                      {subject.topics.map((topic) => (
                        <span
                          key={topic}
                          className="px-2.5 py-1 rounded-lg bg-white/10 text-white/70 text-xs font-medium backdrop-blur-sm"
                        >
                          {topic}
                        </span>
                      ))}
                    </div>

                    {/* CTA */}
                    <div className="inline-flex items-center gap-2 text-white/90 font-semibold mt-8 group-hover:text-white transition-colors text-sm">
                      Start Learning
                      <div className="w-8 h-8 rounded-xl bg-white/15 flex items-center justify-center backdrop-blur-sm group-hover:bg-white/25 transition-colors">
                        <ArrowRight size={16} className="group-hover:translate-x-0.5 transition-transform" />
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ===== HOW IT WORKS ===== */}
      <section id="how-it-works" className="py-16 sm:py-24 bg-slate-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12 sm:mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-50 text-indigo-700 text-xs font-semibold mb-4 uppercase tracking-wider">
              <Zap size={14} />
              Simple Process
            </div>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 mb-4 tracking-tight">
              How It Works
            </h2>
            <p className="text-base sm:text-lg text-slate-500 max-w-lg mx-auto">
              Three simple steps to transform your NAFS preparation
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
            {/* Connector Line (desktop) */}
            <div className="hidden md:block absolute top-16 left-[calc(16.67%+24px)] right-[calc(16.67%+24px)] h-px bg-gradient-to-r from-indigo-200 via-purple-200 to-pink-200" />

            {steps.map((step, i) => (
              <div key={step.step} className="relative text-center group">
                {/* Step Number Circle */}
                <div className="relative inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white shadow-lg shadow-slate-200/50 border border-slate-200/80 mb-6 mx-auto group-hover:shadow-xl group-hover:-translate-y-1 transition-all duration-300">
                  <span className="text-xl font-extrabold bg-clip-text text-transparent bg-gradient-to-br from-indigo-600 to-purple-600">
                    {step.step}
                  </span>
                </div>

                {/* Icon */}
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 mb-4">
                  {step.icon}
                </div>

                <h3 className="text-xl font-bold text-slate-900 mb-2">
                  {step.title}
                </h3>
                <p className="text-slate-500 text-sm sm:text-base max-w-xs mx-auto leading-relaxed">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== FEATURES SECTION ===== */}
      <section id="features" className="py-16 sm:py-24 bg-slate-950 text-white relative overflow-hidden">
        {/* Background */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(99,102,241,0.08),transparent_70%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(#ffffff06_1px,transparent_1px)] [background-size:40px_40px]" />

        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12 sm:mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.06] text-indigo-300 text-xs font-semibold mb-4 uppercase tracking-wider border border-white/[0.06]">
              <Sparkles size={14} />
              Platform Features
            </div>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold mb-4 tracking-tight">
              Built for{" "}
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-purple-400">
                Real Results
              </span>
            </h2>
            <p className="text-slate-400 text-base sm:text-lg max-w-md mx-auto">
              Everything you need to excel in the NAFS Assessment
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
            {features.map((feature, i) => (
              <div
                key={i}
                className="group relative bg-white/[0.03] border border-white/[0.06] rounded-3xl p-8 sm:p-10 hover:bg-white/[0.06] hover:border-white/[0.12] transition-all duration-300"
              >
                {/* Highlight Badge */}
                <div className="absolute top-6 right-6">
                  <span className="px-2.5 py-1 rounded-lg bg-indigo-500/10 text-indigo-300 text-[11px] font-semibold uppercase tracking-wider border border-indigo-500/10">
                    {feature.highlight}
                  </span>
                </div>

                {/* Icon */}
                <div className="w-16 h-16 bg-gradient-to-br from-indigo-500/20 to-purple-500/20 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 border border-white/[0.06]">
                  {feature.icon}
                </div>

                <h3 className="text-xl sm:text-2xl font-bold mb-3">
                  {feature.title}
                </h3>
                <p className="text-slate-400 leading-relaxed text-sm sm:text-base">
                  {feature.desc}
                </p>

                {/* Bottom gradient line */}
                <div className="absolute bottom-0 left-8 right-8 h-px bg-gradient-to-r from-transparent via-indigo-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== LEARNING APPROACH ===== */}
      <section className="bg-white py-16 sm:py-24">
        <div className="mx-auto grid w-full max-w-6xl items-center gap-10 px-4 sm:px-6 lg:grid-cols-[.9fr_1.1fr] lg:gap-16 lg:px-8">
          <div><p className="text-xs font-bold uppercase tracking-[.16em] text-indigo-600">A clearer way to prepare</p><h2 className="mt-3 text-3xl font-extrabold leading-tight tracking-tight text-slate-900 sm:text-4xl">Study with purpose, one skill at a time.</h2><p className="mt-4 max-w-lg leading-7 text-slate-600">Keep preparation focused on the skills students need to build. Review feedback, revisit challenging areas, and follow progress across each subject.</p></div>
          <div className="grid gap-3 sm:grid-cols-3">
            {[{ icon: <Target size={20} />, title: "Focused practice", detail: "Work through curriculum indicators with targeted questions." }, { icon: <CheckCircle2 size={20} />, title: "Useful feedback", detail: "Review answers and explanations after each assessment." }, { icon: <BarChart3 size={20} />, title: "Visible progress", detail: "Follow quiz results and skill development over time." }].map((item) => <article key={item.title} className="rounded-2xl border border-slate-200 bg-slate-50/70 p-5 sm:p-4"><span className="inline-flex rounded-xl bg-indigo-50 p-2.5 text-indigo-600">{item.icon}</span><h3 className="mt-4 text-sm font-bold text-slate-900">{item.title}</h3><p className="mt-2 text-xs leading-5 text-slate-600">{item.detail}</p></article>)}
          </div>
        </div>
      </section>

      {/* ===== FINAL CTA ===== */}
      <section className="py-16 sm:py-24 bg-slate-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="relative bg-gradient-to-br from-indigo-600 via-violet-600 to-purple-700 rounded-3xl p-8 sm:p-12 lg:p-16 text-center text-white overflow-hidden">
            {/* Decorative Elements */}
            <div className="absolute inset-0 bg-[radial-gradient(#ffffff10_1px,transparent_1px)] [background-size:30px_30px] opacity-50" />
            <div className="absolute top-0 right-0 w-72 h-72 bg-white/[0.05] rounded-full -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-96 h-96 bg-white/[0.03] rounded-full translate-y-1/2 -translate-x-1/2" />

            <div className="relative z-10">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 text-white/80 text-sm font-medium mb-6 backdrop-blur-sm border border-white/10">
                <Sparkles size={16} />
                Built for steady progress
              </div>

              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold mb-4 tracking-tight">
                Ready to Excel in NAFS?
              </h2>
              <p className="text-indigo-100 text-base sm:text-lg max-w-lg mx-auto mb-8 sm:mb-10">
                Create a focused preparation routine with curriculum-mapped practice and clear progress tracking.
              </p>

              <Link
                href={session ? "/dashboard" : "/register"}
                className="group inline-flex items-center gap-2.5 bg-white text-indigo-700 px-8 sm:px-10 py-4 sm:py-5 rounded-2xl font-bold text-base sm:text-lg shadow-2xl shadow-indigo-900/30 hover:shadow-indigo-900/50 transition-all duration-300 hover:-translate-y-0.5 active:scale-[0.98]"
              >
                {session ? "Go to Dashboard" : "Create Your Free Account"}
                <ArrowRight size={20} className="group-hover:translate-x-0.5 transition-transform" />
              </Link>

              {!session && (
                <p className="mt-4 text-indigo-200 text-xs sm:text-sm">
                  Built for students and educators in Saudi Arabia
                </p>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ===== FOOTER ===== */}
      <footer className="bg-slate-950 text-white py-12 sm:py-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-start gap-8 mb-10">
            <div>
              <div className="flex items-center gap-2.5 mb-3">
                <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-lg flex items-center justify-center">
                  <GraduationCap className="text-white" size={18} />
                </div>
                <span className="font-extrabold text-lg tracking-tight">
                  NAFS<span className="text-indigo-400">.</span>
                </span>
              </div>
              <p className="text-slate-500 text-sm max-w-xs">
                AI-powered assessment preparation platform aligned with NAFS standards.
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-8 text-sm">
              <div>
                <h4 className="font-semibold text-slate-300 mb-3">Platform</h4>
                <ul className="space-y-2 text-slate-500">
                  <li><a href="#subjects" className="hover:text-slate-300 transition-colors">Subjects</a></li>
                  <li><a href="#features" className="hover:text-slate-300 transition-colors">Features</a></li>
                  <li><a href="/dashboard/statistics" className="hover:text-slate-300 transition-colors">Statistics</a></li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold text-slate-300 mb-3">Subjects</h4>
                <ul className="space-y-2 text-slate-500">
                  <li><Link href="/preparation/science" className="hover:text-slate-300 transition-colors">Science</Link></li>
                  <li><Link href="/preparation/english" className="hover:text-slate-300 transition-colors">English</Link></li>
                  <li><Link href="/preparation/math" className="hover:text-slate-300 transition-colors">Math</Link></li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold text-slate-300 mb-3">Account</h4>
                <ul className="space-y-2 text-slate-500">
                  <li><Link href="/login" className="hover:text-slate-300 transition-colors">Sign In</Link></li>
                  <li><Link href="/register" className="hover:text-slate-300 transition-colors">Register</Link></li>
                  <li><Link href="/dashboard" className="hover:text-slate-300 transition-colors">Dashboard</Link></li>
                </ul>
              </div>
            </div>
          </div>

          <div className="border-t border-slate-800 pt-8 flex flex-col sm:flex-row justify-between items-center gap-4">
            <p className="text-slate-600 text-xs">
              © {new Date().getFullYear()} NAFS Portal. All rights reserved.
            </p>
            <div className="flex items-center gap-4 text-slate-600 text-xs">
              <a href="#" className="hover:text-slate-400 transition-colors">Privacy</a>
              <a href="#" className="hover:text-slate-400 transition-colors">Terms</a>
              <a href="#" className="hover:text-slate-400 transition-colors">Support</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
