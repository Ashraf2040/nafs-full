// src/app/dashboard/settings/page.tsx
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { User, Mail, Shield, Bell, Key, GraduationCap, BookOpen } from "lucide-react";

export const revalidate = 60;

export default async function SettingsPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect("/login");
  }

  const userRole = (session.user as any)?.role;
  const userName = session.user?.name || "User";
  const userEmail = session.user?.email || "";
  const gradeLevel = (session.user as any)?.gradeLevel;
  const className = (session.user as any)?.className;

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <header className="border-b border-slate-200 pb-6">
        <h1 className="text-3xl font-extrabold text-slate-900">Account Settings</h1>
        <p className="text-slate-500 mt-2">Manage your profile, preferences, and security.</p>
      </header>

      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
        {/* Profile Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-8 text-white flex items-center gap-6">
          <div className="w-24 h-24 bg-white/20 rounded-full flex items-center justify-center text-4xl font-bold backdrop-blur-sm border-2 border-white/40 shadow-inner">
            {userName[0]}
          </div>
          <div>
            <h2 className="text-2xl font-bold">{userName}</h2>
            <div className="flex items-center gap-3 mt-1">
              <p className="text-indigo-100 flex items-center gap-2">
                <Shield size={16} /> {userRole}
              </p>
              {userRole === "STUDENT" && gradeLevel && (
                <p className="text-indigo-100 flex items-center gap-2">
                  <GraduationCap size={16} /> Grade {gradeLevel}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Settings Form */}
        <div className="p-8 space-y-8">

          {/* Profile Section */}
          <section>
            <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
              <User size={20} className="text-indigo-500" /> Personal Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-bold text-slate-600 mb-2">Full Name</label>
                <input 
                  type="text" 
                  defaultValue={userName} 
                  className="w-full p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-400 outline-none text-slate-800 bg-slate-50 transition-all" 
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-600 mb-2">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3.5 text-slate-400" size={18} />
                  <input 
                    type="email" 
                    defaultValue={userEmail} 
                    disabled 
                    className="w-full pl-10 p-3 rounded-xl border border-slate-200 text-slate-500 bg-slate-100 cursor-not-allowed" 
                  />
                </div>
                <p className="text-xs text-slate-400 mt-1">Contact IT support to change your primary email.</p>
              </div>
            </div>

            {/* Student-specific fields */}
            {userRole === "STUDENT" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                <div>
                  <label className="block text-sm font-bold text-slate-600 mb-2">Grade Level</label>
                  <div className="relative">
                    <GraduationCap className="absolute left-3 top-3.5 text-slate-400" size={18} />
                    <input 
                      type="text" 
                      defaultValue={gradeLevel || ""} 
                      disabled 
                      className="w-full pl-10 p-3 rounded-xl border border-slate-200 text-slate-500 bg-slate-100 cursor-not-allowed" 
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-600 mb-2">Class</label>
                  <div className="relative">
                    <BookOpen className="absolute left-3 top-3.5 text-slate-400" size={18} />
                    <input 
                      type="text" 
                      defaultValue={className || ""} 
                      disabled 
                      className="w-full pl-10 p-3 rounded-xl border border-slate-200 text-slate-500 bg-slate-100 cursor-not-allowed" 
                    />
                  </div>
                </div>
              </div>
            )}
          </section>

          <hr className="border-slate-100" />

          {/* Security Section */}
          <section>
            <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
              <Key size={20} className="text-indigo-500" /> Security
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-600 mb-2">Current Password</label>
                <input 
                  type="password" 
                  placeholder="••••••••" 
                  className="w-full p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-400 outline-none text-slate-800 bg-slate-50 transition-all" 
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-600 mb-2">New Password</label>
                  <input 
                    type="password" 
                    placeholder="••••••••" 
                    className="w-full p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-400 outline-none text-slate-800 bg-slate-50 transition-all" 
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-600 mb-2">Confirm Password</label>
                  <input 
                    type="password" 
                    placeholder="••••••••" 
                    className="w-full p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-400 outline-none text-slate-800 bg-slate-50 transition-all" 
                  />
                </div>
              </div>
            </div>
          </section>

          <hr className="border-slate-100" />

          {/* Preferences Section */}
          <section>
            <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
              <Bell size={20} className="text-indigo-500" /> Notifications
            </h3>
            <div className="space-y-4">
              <label className="flex items-center gap-3 cursor-pointer group">
                <input type="checkbox" defaultChecked className="w-5 h-5 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500" />
                <span className="text-slate-700 font-medium group-hover:text-indigo-600 transition-colors">
                  {userRole === "STUDENT" 
                    ? "Email me when a new quiz is assigned" 
                    : "Email me when a student completes a quiz"}
                </span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer group">
                <input type="checkbox" defaultChecked className="w-5 h-5 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500" />
                <span className="text-slate-700 font-medium group-hover:text-indigo-600 transition-colors">
                  {userRole === "STUDENT" 
                    ? "Send weekly progress summary" 
                    : "Send weekly performance summary reports"}
                </span>
              </label>
              {userRole === "TEACHER" && (
                <label className="flex items-center gap-3 cursor-pointer group">
                  <input type="checkbox" defaultChecked className="w-5 h-5 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500" />
                  <span className="text-slate-700 font-medium group-hover:text-indigo-600 transition-colors">
                    Alert when students score below 50%
                  </span>
                </label>
              )}
            </div>
          </section>

          <div className="pt-6 flex justify-end gap-4">
            <button className="px-6 py-3 rounded-xl text-slate-600 font-bold hover:bg-slate-100 transition-colors">
              Cancel
            </button>
            <button className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3 rounded-xl font-bold shadow-md transition-colors">
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}