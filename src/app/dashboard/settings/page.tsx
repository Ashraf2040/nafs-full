import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { GraduationCap, Shield } from "lucide-react";
import prisma from "@/lib/prisma";
import SettingsForm from "./SettingsForm";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");

  const account = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      name: true,
      email: true,
      role: true,
      password: true,
      grade: { select: { level: true } },
      class: { select: { name: true } },
    },
  });
  if (!account) redirect("/login");
  const name = account.name || "User";

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <header className="border-b border-slate-200 pb-6">
        <h1 className="text-3xl font-extrabold text-slate-900">Account settings</h1>
        <p className="mt-2 text-slate-500">Keep your profile and sign-in credentials up to date.</p>
      </header>
      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-5 bg-gradient-to-r from-indigo-600 to-purple-600 p-6 text-white sm:flex-row sm:items-center sm:p-8">
          <div className="flex h-20 w-20 items-center justify-center rounded-2xl border border-white/30 bg-white/15 text-3xl font-black shadow-inner">{name[0]?.toUpperCase()}</div>
          <div>
            <h2 className="text-2xl font-bold">{name}</h2>
            <div className="mt-2 flex flex-wrap gap-2 text-sm text-indigo-100">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1"><Shield size={14} /> {account.role}</span>
              {account.grade && <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1"><GraduationCap size={14} /> Grade {account.grade.level}{account.class ? ` · ${account.class.name}` : ""}</span>}
            </div>
          </div>
        </div>
        <SettingsForm defaultName={name} email={account.email} canChangePassword={Boolean(account.password)} />
      </div>
    </div>
  );
}
