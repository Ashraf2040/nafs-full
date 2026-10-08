import { redirect } from "next/navigation";

// Keep old bookmarks working while sending everyone to the current diagnostic flow.
export default function LegacyDiagnosticsPage() {
  redirect("/dashboard/diagnostic/analysis");
}
