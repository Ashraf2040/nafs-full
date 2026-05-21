"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { X, Plus, Save, Loader2, BookOpen } from "lucide-react";
import toast from "react-hot-toast";

interface Subject { id: string; name: string }
interface Grade { id: string; level: number }

export default function TeacherCreateModal({ subjects, grades }: { subjects: Subject[]; grades: Grade[] }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [assignments, setAssignments] = useState<{subjectId: string; gradeIds: string[]}[]>([]);
  const router = useRouter();

  const toggleSubject = (subjectId: string) => {
    setAssignments(prev => {
      const exists = prev.find(a => a.subjectId === subjectId);
      if (exists) return prev.filter(a => a.subjectId !== subjectId);
      return [...prev, { subjectId, gradeIds: [] }];
    });
  };

  const toggleGrade = (subjectId: string, gradeId: string) => {
    setAssignments(prev => prev.map(a => {
      if (a.subjectId !== subjectId) return a;
      const gradeIds = a.gradeIds.includes(gradeId)
        ? a.gradeIds.filter(g => g !== gradeId)
        : [...a.gradeIds, gradeId].sort();
      return { ...a, gradeIds };
    }));
  };

  const handleSubmit = async () => {
    if (!name || !email || !password) return toast.error("Fill all fields");
    if (assignments.length === 0) return toast.error("Assign at least one subject");
    if (assignments.some(a => a.gradeIds.length === 0)) return toast.error("Select grades for each subject");

    setLoading(true);
    try {
      const res = await fetch("/api/teachers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, assignments }),
      });
      if (res.ok) {
        toast.success("Teacher created successfully");
        setOpen(false);
        router.refresh();
      } else {
        const err = await res.json();
        toast.error(err.message || "Failed to create teacher");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setLoading(false);
    }
  };

  if (!open) return (
    <button onClick={() => setOpen(true)} className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-xl font-bold shadow-md flex items-center gap-2 transition-all">
      <Plus size={20} /> Add Teacher
    </button>
  );

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-2xl rounded-[2rem] shadow-2xl p-8 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-slate-800">Create New Teacher</h2>
          <button onClick={() => setOpen(false)} className="p-2 hover:bg-slate-100 rounded-full"><X size={24} /></button>
        </div>

        <div className="space-y-4 mb-6">
          <input value={name} onChange={e => setName(e.target.value)} placeholder="Full Name" className="w-full p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-400 outline-none" />
          <input value={email} onChange={e => setEmail(e.target.value)} placeholder="Email Address" type="email" className="w-full p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-400 outline-none" />
          <input value={password} onChange={e => setPassword(e.target.value)} placeholder="Password" type="password" className="w-full p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-400 outline-none" />
        </div>

        <div className="mb-4">
          <h3 className="font-bold text-slate-700 mb-3 flex items-center gap-2"><BookOpen size={18} /> Assign Subjects & Grades</h3>
          <div className="space-y-3">
            {subjects.map(sub => {
              const assigned = assignments.find(a => a.subjectId === sub.id);
              return (
                <div key={sub.id} className={`border-2 rounded-xl p-4 transition-all ${assigned ? "border-indigo-200 bg-indigo-50/50" : "border-slate-100"}`}>
                  <label className="flex items-center gap-3 cursor-pointer mb-3">
                    <input type="checkbox" checked={!!assigned} onChange={() => toggleSubject(sub.id)} className="w-5 h-5 text-indigo-600 rounded" />
                    <span className="font-bold text-slate-800">{sub.name}</span>
                  </label>
                  {assigned && (
                    <div className="flex flex-wrap gap-2 pl-8">
                      {grades.map(g => (
                        <button
                          key={g.id}
                          onClick={() => toggleGrade(sub.id, g.id)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${assigned.gradeIds.includes(g.id) ? "bg-indigo-600 text-white border-indigo-600" : "bg-white text-slate-600 border-slate-200 hover:border-indigo-300"}`}
                        >
                          Grade {g.level}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <button onClick={handleSubmit} disabled={loading} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-xl font-bold shadow-md flex items-center justify-center gap-2 disabled:opacity-50">
          {loading ? <Loader2 size={20} className="animate-spin" /> : <Save size={20} />} Create Teacher
        </button>
      </div>
    </div>
  );
}