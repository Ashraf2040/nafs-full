// src/app/page.tsx
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import Link from 'next/link';
import { BarChart3, BookOpen, FlaskConical, Calculator, ShieldCheck, GraduationCap, ArrowRight, Trophy, Users, Star } from 'lucide-react';
import { SystemStatsChart } from '@/components/SystemStatsChart';

export default async function LandingPage() {
  const session = await getServerSession(authOptions);
  const userRole = (session?.user as any)?.role;

  const subjects = [
    { 
      name: 'Science', 
      icon: <FlaskConical size={72} />, 
      color: 'from-emerald-500 via-teal-600 to-cyan-700', 
      path: 'science', 
      description: 'Biology, Chemistry & Physics',
      accent: 'emerald'
    },
    { 
      name: 'English', 
      icon: <BookOpen size={72} />, 
      color: 'from-blue-500 via-indigo-600 to-violet-700', 
      path: 'english', 
      description: 'Grammar, Reading & Writing',
      accent: 'blue'
    },
    { 
      name: 'Math', 
      icon: <Calculator size={72} />, 
      color: 'from-purple-500 via-fuchsia-600 to-pink-700', 
      path: 'math', 
      description: 'Algebra, Geometry & Problem Solving',
      accent: 'purple'
    },
  ];

  return (
    <div className="flex flex-col min-h-screen bg-slate-50">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-lg border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-2xl flex items-center justify-center">
              <GraduationCap className="text-white" size={22} />
            </div>
            <span className="font-bold text-2xl tracking-tighter text-slate-900">NAFS Portal</span>
          </div>
          
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600">
            <a href="#subjects" className="hover:text-slate-900 transition-colors">Subjects</a>
            <a href="#features" className="hover:text-slate-900 transition-colors">Features</a>
            <a href="/statistics" className="hover:text-slate-900 transition-colors">Statistics</a>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-950 text-white relative overflow-hidden">
        {/* Background Elements */}
        <div className="absolute inset-0 bg-[radial-gradient(#ffffff10_1px,transparent_1px)] [background-size:50px_50px] opacity-40"></div>
        
        <div className="max-w-5xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white/10 backdrop-blur-md text-white/90 font-medium text-sm mb-6 border border-white/20">
            <ShieldCheck size={18} className="text-emerald-400" /> 
            Officially Aligned with NAFS Standards
          </div>

          <h1 className="text-6xl md:text-7xl font-bold tracking-tighter leading-[1.1] mb-8">
            Master the NAFS Assessment with<br />
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400">AI-Powered Precision</span>
          </h1>

          <p className="text-xl md:text-2xl text-slate-300 max-w-3xl mx-auto leading-relaxed mb-12">
            Generate intelligent quizzes from PDFs, render beautiful math equations, and track progress with advanced analytics.
          </p>

          {/* Role-aware CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            {!session ? (
              <>
                <Link 
                  href="/register" 
                  className="group bg-white text-slate-900 px-10 py-4.5 rounded-3xl font-semibold text-lg flex items-center justify-center gap-3 hover:shadow-2xl hover:shadow-indigo-500/30 transition-all duration-300 hover:-translate-y-1 active:scale-[0.985]"
                >
                  <GraduationCap size={24} />
                  Start Free Today
                </Link>
                <Link 
                  href="/login" 
                  className="group border border-white/40 hover:border-white/70 px-10 py-4.5 rounded-3xl font-semibold text-lg flex items-center justify-center gap-3 transition-all duration-300 hover:-translate-y-1"
                >
                  Sign In <ArrowRight className="group-hover:translate-x-1 transition" />
                </Link>
              </>
            ) : userRole === "STUDENT" ? (
              <>
                <Link 
                  href="/preparation/science" 
                  className="bg-white text-slate-900 px-10 py-4.5 rounded-3xl font-semibold text-lg flex items-center gap-3 hover:shadow-2xl hover:shadow-indigo-500/30 transition-all"
                >
                  <BookOpen size={24} /> Start Practicing
                </Link>
                <Link 
                  href="/dashboard" 
                  className="border border-white/40 hover:border-white/70 px-10 py-4.5 rounded-3xl font-semibold text-lg flex items-center gap-3 transition-all"
                >
                  <Trophy size={24} /> My Progress
                </Link>
              </>
            ) : (
              <>
                <Link 
                  href="/dashboard/quizzes" 
                  className="bg-white text-slate-900 px-10 py-4.5 rounded-3xl font-semibold text-lg flex items-center gap-3 hover:shadow-2xl hover:shadow-indigo-500/30 transition-all"
                >
                  <BarChart3 size={24} /> Create Assessment
                </Link>
                <Link 
                  href="/dashboard/statistics" 
                  className="border border-white/40 hover:border-white/70 px-10 py-4.5 rounded-3xl font-semibold text-lg flex items-center gap-3 transition-all"
                >
                  View Analytics <ArrowRight size={22} />
                </Link>
              </>
            )}
          </div>

          <div className="mt-16 flex justify-center gap-8 text-sm opacity-75">
            <div className="flex items-center gap-2">
              <Star className="text-yellow-400" fill="currentColor" /> <span>4.98/5</span>
            </div>
            <div>Trusted by 12,400+ students</div>
            <div>98% pass rate improvement</div>
          </div>
        </div>
      </section>

      {/* Global Statistics Section */}
      <section className="container mx-auto px-6 -mt-12 relative z-20 max-w-7xl">
        <div className="bg-white rounded-3xl shadow-2xl shadow-slate-300/50 border border-slate-100 p-8 md:p-10">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-10">
            <div>
              <h2 className="text-3xl font-semibold text-slate-900 flex items-center gap-4">
                <div className="p-3 bg-indigo-100 text-indigo-600 rounded-2xl">
                  <BarChart3 size={28} />
                </div>
                Platform at a Glance
              </h2>
              <p className="text-slate-500 mt-2 text-lg">Real-time performance across the entire platform</p>
            </div>
            
            <Link href="/statistics" className="mt-6 md:mt-0 inline-flex items-center gap-2 text-indigo-600 hover:text-indigo-700 font-medium group">
              Detailed Analytics
              <ArrowRight size={18} className="group-hover:translate-x-1 transition" />
            </Link>
          </div>
          
          <div className="h-[380px] w-full rounded-2xl overflow-hidden border border-slate-100">
            <SystemStatsChart />
          </div>
        </div>
      </section>

      {/* Subject Cards Section */}
      <section id="subjects" className="container mx-auto px-6 py-24 max-w-7xl">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-slate-900 mb-4">Master Every Subject</h2>
          <p className="text-xl text-slate-600 max-w-xl mx-auto">
            Curated, standards-aligned practice materials for the NAFS curriculum
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {subjects.map((subject) => (
            <Link key={subject.name} href={`/preparation/${subject.path}`} className="group">
              <div className={`relative h-full overflow-hidden rounded-3xl bg-gradient-to-br ${subject.color} p-10 text-white shadow-xl transition-all duration-500 hover:shadow-2xl hover:-translate-y-3 flex flex-col`}>
                
                {/* Large Background Icon */}
                <div className="absolute -bottom-8 -right-8 opacity-10 group-hover:opacity-20 transition-all duration-700 group-hover:scale-110">
                  {subject.icon}
                </div>

                <div className="relative z-10 flex-1 flex flex-col justify-end">
                  <div className={`inline-flex w-fit px-4 py-1.5 rounded-full bg-white/20 text-sm font-medium mb-6 backdrop-blur-sm`}>
                    {subject.name}
                  </div>
                  
                  <h3 className="text-5xl font-bold tracking-tighter mb-4">{subject.name}</h3>
                  <p className="text-white/80 text-[17px] mb-8 leading-relaxed">{subject.description}</p>
                  
                  <div className="inline-flex items-center gap-3 text-white/90 font-medium group-hover:gap-4 transition-all text-lg">
                    Start Learning
                    <div className="w-9 h-9 rounded-2xl bg-white/20 flex items-center justify-center backdrop-blur-sm group-hover:bg-white/30 transition-colors">
                      <ArrowRight size={20} />
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="bg-slate-900 py-24 text-white">
        <div className="container mx-auto px-6 max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">Built for Real Results</h2>
            <p className="text-slate-400 text-xl max-w-md mx-auto">
              Everything you need to excel in the NAFS Assessment
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                icon: <FlaskConical size={42} />,
                title: "AI Quiz Generator",
                desc: "Upload PDFs or paste text and instantly get high-quality, standards-aligned assessments with explanations."
              },
              {
                icon: <BarChart3 size={42} />,
                title: "Deep Analytics",
                desc: "Real-time dashboards, weak area identification, and progress reports for students and teachers."
              },
              {
                icon: <Trophy size={42} />,
                title: "Recognition & Growth",
                desc: "Beautiful digital certificates, leaderboards, and achievement system that motivates students."
              }
            ].map((feature, i) => (
              <div key={i} className="bg-white/5 border border-white/10 rounded-3xl p-10 hover:bg-white/10 transition-all group">
                <div className="w-20 h-20 bg-white/10 rounded-3xl flex items-center justify-center mb-8 group-hover:scale-110 transition-transform">
                  {feature.icon}
                </div>
                <h3 className="text-2xl font-semibold mb-4">{feature.title}</h3>
                <p className="text-slate-400 leading-relaxed text-[17px]">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 bg-white">
        <div className="max-w-2xl mx-auto text-center px-6">
          <h2 className="text-4xl font-bold text-slate-900 mb-6">Ready to Excel in NAFS?</h2>
          <p className="text-slate-600 text-lg mb-10">Join thousands of students and educators already improving their performance.</p>
          
          <Link 
            href={session ? "/dashboard" : "/register"}
            className="inline-flex bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-12 py-5 rounded-3xl font-semibold text-xl shadow-xl hover:shadow-2xl transition-all hover:-translate-y-1"
          >
            {session ? "Go to Dashboard" : "Create Your Free Account"}
          </Link>
        </div>
      </section>
    </div>
  );
}