"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { CheckCircle2, Key, Loader2, Mail, Save, User } from "lucide-react";

export default function SettingsForm({
  defaultName,
  email,
  canChangePassword,
}: {
  defaultName: string;
  email: string;
  canChangePassword: boolean;
}) {
  const { update } = useSession();
  const [name, setName] = useState(defaultName);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    setMessage(null);
    if (newPassword && newPassword !== confirmPassword) {
      setMessage({ type: "error", text: "New password confirmation does not match." });
      return;
    }
    setSaving(true);
    try {
      const response = await fetch("/api/account", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, currentPassword, newPassword }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Account changes could not be saved");
      await update({ name: data.user.name });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setMessage({ type: "success", text: data.passwordChanged ? "Profile and password updated." : "Profile updated." });
    } catch (error) {
      setMessage({ type: "error", text: error instanceof Error ? error.message : "Account changes could not be saved" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={save} className="space-y-8 p-6 sm:p-8">
      {message && (
        <div role={message.type === "error" ? "alert" : "status"} className={`flex items-center gap-2 rounded-xl border p-4 text-sm font-semibold ${message.type === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-red-200 bg-red-50 text-red-700"}`}>
          <CheckCircle2 size={18} /> {message.text}
        </div>
      )}
      <section>
        <h3 className="mb-4 flex items-center gap-2 text-lg font-bold text-slate-800"><User size={20} className="text-indigo-500" /> Personal information</h3>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <label className="block text-sm font-bold text-slate-600">
            Full name
            <input required minLength={2} maxLength={100} value={name} onChange={(event) => setName(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-slate-800 outline-none focus:ring-2 focus:ring-indigo-400" />
          </label>
          <label className="block text-sm font-bold text-slate-600">
            Email address
            <div className="relative mt-2"><Mail className="absolute left-3 top-3.5 text-slate-400" size={18} /><input value={email} disabled className="w-full cursor-not-allowed rounded-xl border border-slate-200 bg-slate-100 p-3 pl-10 text-slate-500" /></div>
            <span className="mt-1 block text-xs font-normal text-slate-400">Email and role changes are managed by an administrator.</span>
          </label>
        </div>
      </section>
      <hr className="border-slate-100" />
      <section>
        <h3 className="mb-4 flex items-center gap-2 text-lg font-bold text-slate-800"><Key size={20} className="text-indigo-500" /> Password</h3>
        {canChangePassword ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <input type="password" autoComplete="current-password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} placeholder="Current password" className="rounded-xl border border-slate-200 bg-slate-50 p-3 outline-none focus:ring-2 focus:ring-indigo-400" />
            <input type="password" autoComplete="new-password" minLength={8} value={newPassword} onChange={(event) => setNewPassword(event.target.value)} placeholder="New password (8+ characters)" className="rounded-xl border border-slate-200 bg-slate-50 p-3 outline-none focus:ring-2 focus:ring-indigo-400" />
            <input type="password" autoComplete="new-password" minLength={8} value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} placeholder="Confirm new password" className="rounded-xl border border-slate-200 bg-slate-50 p-3 outline-none focus:ring-2 focus:ring-indigo-400" />
          </div>
        ) : <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">Your password is managed by your external sign-in provider.</p>}
      </section>
      <div className="flex justify-end border-t border-slate-100 pt-6">
        <button disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-7 py-3 font-bold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-60">
          {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
          {saving ? "Saving…" : "Save changes"}
        </button>
      </div>
    </form>
  );
}
