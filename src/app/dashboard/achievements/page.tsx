"use client";
import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import {
  Trophy, Medal, Loader2, Target,
  Sparkles, AlertCircle, Star, Crown, Gamepad2,
  CheckCircle2, Clock, Download
} from "lucide-react";
import Link from "next/link";

const tierConfig: Record<string, { icon: any; color: string; bg: string; border: string; label: string }> = {
  PLATINUM: {
    icon: Crown,
    color: "text-slate-100",
    bg: "bg-gradient-to-br from-slate-400 to-slate-300",
    border: "border-slate-300",
    label: "Platinum",
  },
  GOLD: {
    icon: Trophy,
    color: "text-amber-700",
    bg: "bg-gradient-to-br from-amber-300 to-yellow-200",
    border: "border-amber-400",
    label: "Gold",
  },
  SILVER: {
    icon: Medal,
    color: "text-slate-600",
    bg: "bg-gradient-to-br from-slate-300 to-slate-200",
    border: "border-slate-400",
    label: "Silver",
  },
  BRONZE: {
    icon: Star,
    color: "text-orange-700",
    bg: "bg-gradient-to-br from-orange-300 to-amber-200",
    border: "border-orange-400",
    label: "Bronze",
  },
};

const tierIcons: Record<string, string> = {
  PLATINUM: "💎",
  GOLD: "🥇",
  SILVER: "🥈",
  BRONZE: "🥉",
};

function downloadCertificate(name: string, badgeName: string, challengeTitle: string, date: string) {
  const w = 1200, h = 850;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;

  // Background
  const bg = ctx.createLinearGradient(0, 0, w, h);
  bg.addColorStop(0, "#fefce8");
  bg.addColorStop(0.5, "#fef3c7");
  bg.addColorStop(1, "#fde68a");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  // Outer border
  ctx.strokeStyle = "#d97706";
  ctx.lineWidth = 12;
  ctx.strokeRect(30, 30, w - 60, h - 60);

  // Inner border
  ctx.strokeStyle = "#f59e0b";
  ctx.lineWidth = 3;
  ctx.strokeRect(50, 50, w - 100, h - 100);

  // Corner decorations
  const corners = [[60, 60], [w - 60, 60], [60, h - 60], [w - 60, h - 60]];
  corners.forEach(([x, y]) => {
    ctx.fillStyle = "#d97706";
    ctx.beginPath();
    ctx.arc(x, y, 8, 0, Math.PI * 2);
    ctx.fill();
  });

  // Top ribbon
  ctx.fillStyle = "#d97706";
  ctx.fillRect(300, 100, 600, 6);

  // Title
  ctx.fillStyle = "#78350f";
  ctx.font = "bold 48px 'Georgia', serif";
  ctx.textAlign = "center";
  ctx.fillText("Certificate of Achievement", w / 2, 200);

  // Subtitle
  ctx.fillStyle = "#92400e";
  ctx.font = "22px 'Georgia', serif";
  ctx.fillText("This certificate is proudly presented to", w / 2, 270);

  // Student name
  ctx.fillStyle = "#1e293b";
  ctx.font = "bold 56px 'Georgia', serif";
  ctx.fillText(name, w / 2, 360);

  // For
  ctx.fillStyle = "#78350f";
  ctx.font = "20px 'Georgia', serif";
  ctx.fillText("for completing the", w / 2, 430);

  // Badge name
  ctx.fillStyle = "#d97706";
  ctx.font = "bold 40px 'Georgia', serif";
  ctx.fillText(badgeName, w / 2, 500);

  // Challenge title
  ctx.fillStyle = "#64748b";
  ctx.font = "20px 'Georgia', serif";
  ctx.fillText(challengeTitle, w / 2, 550);

  // Date
  ctx.fillStyle = "#94a3b8";
  ctx.font = "18px 'Georgia', serif";
  ctx.fillText(`Awarded on ${date}`, w / 2, 630);

  // Bottom ribbon
  ctx.fillStyle = "#d97706";
  ctx.fillRect(300, 680, 600, 6);

  // Footer
  ctx.fillStyle = "#a16207";
  ctx.font = "14px 'Georgia', serif";
  ctx.fillText("NAFS Prep — National Assessment of Future Skills Preparation", w / 2, 730);

  // Download
  const link = document.createElement("a");
  link.download = `certificate-${badgeName.replace(/\s+/g, "-").toLowerCase()}.png`;
  link.href = canvas.toDataURL("image/png");
  link.click();
}

export default function AchievementsPage() {
  const { data: session, status: sessionStatus } = useSession();
  const userRole = (session?.user as any)?.role;

  const [data, setData] = useState<any>(null);
  const [badges, setBadges] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (sessionStatus === "loading") return;
    if (!session) redirect("/login");

    const fetchAll = async () => {
      try {
        const [trophyRes, badgeRes] = await Promise.all([
          fetch("/api/trophies"),
          fetch("/api/challenges/completed"),
        ]);
        if (trophyRes.ok) setData(await trophyRes.json());
        if (badgeRes.ok) {
          const b = await badgeRes.json();
          setBadges(b.badges || []);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, [sessionStatus]);

  if (sessionStatus === "loading" || loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 size={40} className="animate-spin text-indigo-600" />
      </div>
    );
  }

  const trophies = data?.trophies || [];
  const byTier = data?.byTier || {};
  const byDomain = data?.byDomain || {};
  const hasTrophies = trophies.length > 0;
  const hasBadges = badges.length > 0;

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <header className="bg-gradient-to-br from-amber-600 via-orange-600 to-yellow-600 rounded-3xl p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute -top-10 -right-10 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-10 -left-10 w-48 h-48 bg-white/5 rounded-full blur-3xl" />
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 text-white/90 text-xs font-semibold mb-4 border border-white/10">
            <Trophy size={14} /> Achievements
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight">Trophy Gallery &amp; Badges</h1>
          <p className="text-amber-200 mt-2">Earn trophies by mastering skills and badges by completing challenges</p>
        </div>
      </header>

      {!hasTrophies && !hasBadges ? (
        <div className="bg-white rounded-3xl border-2 border-dashed border-slate-200 p-16 text-center">
          <Trophy size={64} className="mx-auto text-slate-300 mb-4" />
          <h2 className="text-xl font-bold text-slate-600 mb-2">No Achievements Yet</h2>
          <p className="text-slate-400 max-w-md mx-auto mb-6">
            Complete assessments to earn trophies, or join challenges to earn badges.
          </p>
          <Link
            href="/dashboard/learning-path"
            className="inline-flex items-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-indigo-700 transition-colors shadow-md"
          >
            <Target size={18} /> Start Learning
          </Link>
        </div>
      ) : (
        <>
          {/* Badges Section */}
          {hasBadges && (
            <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
              <div className="h-1.5 bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-400" />
              <div className="p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl">
                    <Gamepad2 size={22} />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-slate-800">Challenge Badges</h2>
                    <p className="text-sm text-slate-500">Earned by completing challenges</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {badges.map((b: any) => {
                    const criteria = b.challenge.criteria as any;
                    const studentName = (session?.user as any)?.name || "Student";
                    const completedDate = b.completedAt ? new Date(b.completedAt).toLocaleDateString() : "";
                    return (
                      <div
                        key={b.id}
                        className="bg-gradient-to-br from-emerald-50 to-teal-50 border-2 border-emerald-200 rounded-2xl p-5 text-center shadow-sm flex flex-col items-center"
                      >
                        <div className="text-4xl mb-2">🏅</div>
                        <p className="text-xs font-bold uppercase tracking-wider text-emerald-700">
                          {b.challenge.rewardBadge || "Challenge"}
                        </p>
                        <p className="text-sm font-extrabold text-slate-900 mt-1 line-clamp-2">
                          {b.challenge.title}
                        </p>
                        {criteria && (
                          <p className="text-[10px] text-slate-500 mt-1">
                            {criteria.subject} • Grade {criteria.grade}
                          </p>
                        )}
                        <div className="flex items-center justify-center gap-1 mt-2 text-[10px] text-emerald-600 font-semibold">
                          <CheckCircle2 size={10} />
                          {completedDate}
                        </div>
                        <button
                          onClick={() => downloadCertificate(
                            studentName,
                            b.challenge.rewardBadge || "Challenge",
                            b.challenge.title,
                            completedDate
                          )}
                          className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200 transition-colors"
                        >
                          <Download size={12} /> Download Certificate
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Trophies Section */}
          {hasTrophies && (
            <>
              {/* Tier Summary */}
              <div className="grid grid-cols-4 gap-4">
                {["PLATINUM", "GOLD", "SILVER", "BRONZE"].map((tier) => {
                  const cfg = tierConfig[tier];
                  const count = byTier[tier] || 0;
                  return (
                    <div key={tier} className={`bg-white rounded-2xl border-2 ${cfg.border} shadow-sm p-5 text-center`}>
                      <div className={`inline-flex p-3 rounded-2xl ${cfg.bg} ${cfg.color} mb-2 shadow-sm`}>
                        <cfg.icon size={24} />
                      </div>
                      <p className="text-2xl font-extrabold text-slate-900">{count}</p>
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">{cfg.label}</p>
                    </div>
                  );
                })}
              </div>

              {/* Trophy Grid by Domain */}
              {(Object.entries(byDomain) as [string, any[]][]).map(([domain, domainTrophies]) => (
                <div key={domain} className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
                  <div className="p-6">
                    <h2 className="text-xl font-bold text-slate-800 mb-1">{domain}</h2>
                    <p className="text-sm text-slate-500 mb-6">{domainTrophies.length} trophy{(domainTrophies.length) !== 1 ? "ies" : "y"}</p>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      {domainTrophies.map((t: any) => {
                        const cfg = tierConfig[t.tier] || tierConfig.BRONZE;

                        return (
                          <div
                            key={t.id}
                            className={`relative overflow-hidden rounded-2xl border-2 ${cfg.border} ${cfg.bg} p-5 text-center shadow-sm`}
                          >
                            <div className="text-4xl mb-2">{tierIcons[t.tier] || "🏆"}</div>
                            <p className={`text-xs font-bold uppercase tracking-wider ${cfg.color}`}>{cfg.label}</p>
                            <p className="text-lg font-extrabold text-slate-900 mt-1">{t.outcomesMastered}</p>
                            <p className="text-[10px] text-slate-600 font-medium">mastered</p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ))}
            </>
          )}
        </>
      )}
    </div>
  );
}
