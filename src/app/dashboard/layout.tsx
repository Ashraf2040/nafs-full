import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import Sidebar from "@/components/Sidebar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect("/login");
  }

  return (
    <div className="flex w-full min-h-screen bg-slate-50/80">
      <Sidebar />
      <main className="flex-1 overflow-y-auto relative">
        {/* Subtle background pattern matching the landing page */}
        <div className="absolute inset-0 bg-[radial-gradient(#e2e8f01a_1px,transparent_1px)] [background-size:24px_24px] pointer-events-none" />
        <div className="relative z-10 p-4 sm:p-6 lg:p-8 max-w-[1400px] mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}