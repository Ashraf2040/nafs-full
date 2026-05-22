// src/app/page.tsx
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import Link from "next/link";
import {
  BarChart3, BookOpen, FlaskConical, Calculator, ShieldCheck,
  GraduationCap, ArrowRight, Trophy, Users, Star, Zap,
  FileText, Target, Sparkles, CheckCircle2, ChevronRight,
  Brain, Globe, Lock
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
    { value: "12,400+", label: "Active Students", icon: <Users size={22} /> },
    { value: "98%", label: "Pass Rate Improvement", icon: <Trophy size={22} /> },
    { value: "50K+", label: "Quizzes Generated", icon: <FileText size={22} /> },
    { value: "4.98", label: "Average Rating", icon: <Star size={22} /> },
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
      highlight: "GPT-4 Powered",
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
    { icon: <ShieldCheck size={18} />, text: "NAFS Aligned" },
    { icon: <Lock size={18} />, text: "Data Secure" },
    { icon: <Globe size={18} />, text: "Arabic & English" },
    { icon: <Zap size={18} />, text: "Instant Results" },
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
      <section className="relative pt-24 pb-16 sm:pt-32 sm:pb-24 lg:pt-40 lg:pb-32 bg-slate-950 text-white overflow-hidden">
        {/* Animated Background */}
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(99,102,241,0.15),transparent_50%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,rgba(168,85,247,0.1),transparent_50%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(#ffffff08_1px,transparent_1px)] [background-size:60px_60px]" />
          {/* Floating orbs */}
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse [animation-delay:2s]" />
        </div>

        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          {/* Trust Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/[0.07] backdrop-blur-sm text-white/80 font-medium text-xs sm:text-sm mb-8 border border-white/[0.08] ring-1 ring-white/[0.05]">
            <ShieldCheck size={15} className="text-emerald-400" />
            <span>Officially Aligned with NAFS Standards</span>
            <CheckCircle2 size={13} className="text-emerald-400" />
          </div>

          {/* Headline */}
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight leading-[1.08] mb-6 sm:mb-8">
            Master the NAFS
            <br className="hidden sm:block" />{" "}
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 via-violet-400 to-pink-400">
              Assessment
            </span>{" "}
            with
            <br className="hidden sm:block" />{" "}
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-blue-400 to-indigo-400">
              Professional Practicing
            </span>
          </h1>

          {/* Subtitle */}
          <p className="text-base sm:text-lg md:text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed mb-8 sm:mb-12">
            Generate intelligent quizzes from PDFs, render beautiful math equations,
            and track progress with advanced analytics — all aligned to NAFS standards.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center items-stretch sm:items-center mb-10 sm:mb-16">
            {!session ? (
              <>
                <Link
                  href="/register"
                  className="group bg-white text-slate-900 px-8 py-4 rounded-2xl font-semibold text-base sm:text-lg flex items-center justify-center gap-2.5 hover:shadow-2xl hover:shadow-indigo-500/20 transition-all duration-300 hover:-translate-y-0.5 active:scale-[0.98]"
                >
                  <GraduationCap size={22} />
                  Start Free Today
                  <ArrowRight size={18} className="group-hover:translate-x-0.5 transition-transform" />
                </Link>
                <Link
                  href="/login"
                  className="group border border-white/15 hover:border-white/30 hover:bg-white/5 px-8 py-4 rounded-2xl font-semibold text-base sm:text-lg flex items-center justify-center gap-2.5 transition-all duration-300"
                >
                  Sign In
                  <ArrowRight size={18} className="group-hover:translate-x-0.5 transition-transform" />
                </Link>
              </>
            ) : userRole === "STUDENT" ? (
              <>
                <Link
                  href="/preparation/science"
                  className="group bg-white text-slate-900 px-8 py-4 rounded-2xl font-semibold text-base sm:text-lg flex items-center justify-center gap-2.5 hover:shadow-2xl hover:shadow-indigo-500/20 transition-all"
                >
                  <BookOpen size={22} /> Start Practicing
                </Link>
                <Link
                  href="/dashboard"
                  className="group border border-white/15 hover:border-white/30 hover:bg-white/5 px-8 py-4 rounded-2xl font-semibold text-base sm:text-lg flex items-center justify-center gap-2.5 transition-all"
                >
                  <Trophy size={22} /> My Progress
                </Link>
              </>
            ) : (
              <>
                <Link
                  href="/dashboard/quizzes"
                  className="group bg-white text-slate-900 px-8 py-4 rounded-2xl font-semibold text-base sm:text-lg flex items-center justify-center gap-2.5 hover:shadow-2xl hover:shadow-indigo-500/20 transition-all"
                >
                  <BarChart3 size={22} /> Create Assessment
                </Link>
                <Link
                  href="/dashboard/statistics"
                  className="group border border-white/15 hover:border-white/30 hover:bg-white/5 px-8 py-4 rounded-2xl font-semibold text-base sm:text-lg flex items-center justify-center gap-2.5 transition-all"
                >
                  View Analytics <ArrowRight size={20} />
                </Link>
              </>
            )}
          </div>

          {/* Trust Badges Row */}
          <div className="flex flex-wrap justify-center gap-3 sm:gap-4">
            {trustBadges.map((badge) => (
              <div
                key={badge.text}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.05] text-white/50 text-xs sm:text-sm font-medium border border-white/[0.06]"
              >
                {badge.icon}
                {badge.text}
              </div>
            ))}
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
      <section className="py-16 sm:py-24">
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
              <div className="h-[300px] sm:h-[380px] w-full rounded-2xl overflow-hidden bg-slate-50/50">
                <SystemStatsChart />
              </div>
            </div>
          </div>
        </div>
      </section>

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

      {/* ===== SOCIAL PROOF / TESTIMONIAL ===== */}
      <section className="py-16 sm:py-24 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16 items-center">
            {/* Left - Quote */}
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-50 text-amber-700 text-xs font-semibold mb-6 uppercase tracking-wider">
                <Star size={14} className="fill-current" />
                Testimonial
              </div>
              <blockquote className="text-2xl sm:text-3xl lg:text-4xl font-bold text-slate-900 leading-snug tracking-tight mb-6">
                &ldquo;NAFS Portal helped me go from struggling to{" "}
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600">
                  scoring in the top 5%
                </span>{" "}
                of my class.&rdquo;
              </blockquote>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold text-lg">
                  A
                </div>
                <div>
                  <div className="font-semibold text-slate-900">Ahmed Al-Rashid</div>
                  <div className="text-sm text-slate-500">Grade 9 Student, Riyadh</div>
                </div>
              </div>
              <div className="flex gap-1 mt-4">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} size={18} className="text-amber-400 fill-amber-400" />
                ))}
              </div>
            </div>

            {/* Right - Stats Cards */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100">
                <div className="text-4xl font-extrabold text-slate-900 mb-1">98%</div>
                <div className="text-sm text-slate-500">Pass rate improvement</div>
                <div className="mt-3 h-2 bg-slate-200 rounded-full overflow-hidden">
                  <div className="h-full w-[98%] bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full" />
                </div>
              </div>
              <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100">
                <div className="text-4xl font-extrabold text-slate-900 mb-1">3x</div>
                <div className="text-sm text-slate-500">Faster learning</div>
                <div className="mt-3 h-2 bg-slate-200 rounded-full overflow-hidden">
                  <div className="h-full w-[75%] bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full" />
                </div>
              </div>
              <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100">
                <div className="text-4xl font-extrabold text-slate-900 mb-1">12K+</div>
                <div className="text-sm text-slate-500">Active learners</div>
                <div className="mt-3 h-2 bg-slate-200 rounded-full overflow-hidden">
                  <div className="h-full w-[85%] bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full" />
                </div>
              </div>
              <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100">
                <div className="text-4xl font-extrabold text-slate-900 mb-1">50K+</div>
                <div className="text-sm text-slate-500">Quizzes taken</div>
                <div className="mt-3 h-2 bg-slate-200 rounded-full overflow-hidden">
                  <div className="h-full w-[92%] bg-gradient-to-r from-purple-500 to-pink-500 rounded-full" />
                </div>
              </div>
            </div>
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
                Join 12,400+ students today
              </div>

              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold mb-4 tracking-tight">
                Ready to Excel in NAFS?
              </h2>
              <p className="text-indigo-100 text-base sm:text-lg max-w-lg mx-auto mb-8 sm:mb-10">
                Join thousands of students and educators already improving their performance with AI-powered tools.
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
                  No credit card required · Free forever plan available
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