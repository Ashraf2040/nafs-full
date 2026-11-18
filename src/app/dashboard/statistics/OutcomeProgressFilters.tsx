"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Filter } from "lucide-react";
import { startTransition } from "react";

export default function OutcomeProgressFilters({ subjects, grades }: { subjects: { id: string; name: string }[]; grades: number[] }) {
  const router = useRouter();
  const params = useSearchParams();
  const update = (key: string, value: string) => {
    const next = new URLSearchParams(params.toString());
    if (value === "All") next.delete(key); else next.set(key, value);
    startTransition(() => router.push(`?${next.toString()}`, { scroll: false }));
  };
  return <div className="flex flex-wrap gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3">
    <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"><Filter size={15} className="text-indigo-600"/><span className="font-semibold text-slate-600">Subject</span><select aria-label="Filter outcome progress by subject" className="max-w-44 bg-transparent font-bold text-slate-800 outline-none" value={params.get("outcomeSubject") || "All"} onChange={event => update("outcomeSubject", event.target.value)}><option value="All">All subjects</option>{subjects.map(subject => <option key={subject.id} value={subject.name}>{subject.name}</option>)}</select></label>
    <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"><span className="font-semibold text-slate-600">Grade</span><select aria-label="Filter outcome progress by grade" className="bg-transparent font-bold text-slate-800 outline-none" value={params.get("outcomeGrade") || "All"} onChange={event => update("outcomeGrade", event.target.value)}><option value="All">All grades</option>{grades.map(grade => <option key={grade} value={grade}>Grade {grade}</option>)}</select></label>
  </div>;
}
