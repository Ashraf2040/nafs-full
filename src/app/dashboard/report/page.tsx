import { redirect } from "next/navigation";

// Keep the old report URL as a bookmark-compatible alias for current diagnostics.
export default function LegacyReportPage() {
  redirect("/dashboard/diagnostic/analysis");
}
