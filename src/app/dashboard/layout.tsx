import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import DashboardMobileNav from "@/components/DashboardMobileNav";

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
    <div className="flex min-h-screen w-full flex-col bg-slate-50/80">
      <DashboardMobileNav />
      <div className="flex flex-1">
        <Sidebar />
        <main className="flex-1 overflow-y-auto relative min-w-0">
          <div className="absolute inset-0 bg-[radial-gradient(#e2e8f01a_1px,transparent_1px)] [background-size:24px_24px] pointer-events-none" />
          <div className="relative z-10 p-4 sm:p-6 lg:p-8 max-w-[1400px] mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
