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
    <div className="flex h-[calc(100dvh-4rem)] min-h-0 w-full flex-col overflow-hidden bg-slate-50/80 print:h-auto print:overflow-visible print:bg-white">
      <DashboardMobileNav />
      <div className="flex min-h-0 flex-1">
        <Sidebar />
        <main className="relative min-h-0 min-w-0 flex-1 overflow-y-auto print:overflow-visible">
          <div className="absolute inset-0 bg-[radial-gradient(#e2e8f01a_1px,transparent_1px)] [background-size:24px_24px] pointer-events-none print:hidden" />
          <div className="relative z-10 mx-auto w-full max-w-[1400px] p-3 sm:p-5 md:p-6 lg:p-8 print:max-w-none print:p-0">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
