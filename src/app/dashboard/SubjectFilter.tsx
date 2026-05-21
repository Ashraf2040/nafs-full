// src/app/dashboard/SubjectFilter.tsx
"use client";

import { useRouter, useSearchParams } from "next/navigation";

interface Subject {
  id: string;
  name: string;
}

export default function SubjectFilter({ subjects }: { subjects: Subject[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const current = searchParams.get("subject") || "";

  const handleChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set("subject", value);
    } else {
      params.delete("subject");
    }
    router.push(`/dashboard?${params.toString()}`);
  };

  return (
    <select
      value={current}
      onChange={(e) => handleChange(e.target.value)}
      className="w-full p-2.5 rounded-xl border border-slate-200 bg-white shadow-sm outline-none focus:ring-2 focus:ring-indigo-400 font-medium text-slate-600 text-sm cursor-pointer"
    >
      <option value="">All Subjects</option>
      {subjects.map((s) => (
        <option key={s.id} value={s.name}>
          {s.name}
        </option>
      ))}
    </select>
  );
}
