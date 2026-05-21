// src/app/unauthorized/page.tsx
import Link from "next/link";
import { ShieldAlert, ArrowLeft } from "lucide-react";

export default function UnauthorizedPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
      <div className="max-w-md w-full bg-white rounded-[2.5rem] shadow-xl border border-slate-100 p-10 text-center">
        <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
          <ShieldAlert size={40} className="text-red-500" />
        </div>
        <h1 className="text-3xl font-black text-slate-900 mb-3">Access Denied</h1>
        <p className="text-slate-500 mb-8 leading-relaxed">
          You don't have permission to access this page. Please contact your administrator if you believe this is an error.
        </p>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-xl font-bold transition-all shadow-md"
        >
          <ArrowLeft size={18} /> Go to Dashboard
        </Link>
      </div>
    </div>
  );
}