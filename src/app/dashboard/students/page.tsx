"use client";
import { useState } from "react";
import useSWR, { mutate } from "swr";
import { useSession } from "next-auth/react";
import {
  Users, Upload, Filter, UserCircle2, FileText, Search,
  Loader2, GraduationCap, TrendingUp, AlertCircle,
  Plus, X, Download, UserPlus, Pencil, School, Layers
} from "lucide-react";
import Link from "next/link";
import StudentEditModal from "@/components/StudentEditModal";
import { fetcher } from "@/lib/fetcher";
import BulkDeleteStudentsButton from "./BulkDeleteStudentsButton";

interface Student {
  id: string;
  name: string;
  username: string;
  email: string;
  gradeLevel: number | null;
  gradeId: string | null;
  classId: string | null;
  className: string | null;
  role: string;
  _count?: { submissions: number };
  avgScore: number | null;
}

interface ClassItem {
  id: string;
  name: string;
  gradeId: string;
  grade: { level: number };
  _count: { users: number };
}

interface GradeItem {
  id: string;
  level: number;
  name: string | null;
  _count: { users: number; classes: number };
}

export default function StudentsPage() {
  const { data: session } = useSession();
  const userRole = (session?.user as any)?.role;

  if (userRole === "STUDENT") {
    if (typeof window !== "undefined") {
      window.location.href = "/dashboard";
    }
    return null;
  }

  const [gradeFilter, setGradeFilter] = useState("All");
  const [classFilter, setClassFilter] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [isImporting, setIsImporting] = useState(false);
  const [stats, setStats] = useState({ total: 0, active: 0, struggling: 0 });

  // Create Student Form
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: "",
    username: "",
    email: "",
    gradeLevel: "6",
    classId: "",
    password: "",
  });
  const [createError, setCreateError] = useState("");

  // Add Class Modal
  const [showAddClass, setShowAddClass] = useState(false);
  const [classForm, setClassForm] = useState({ name: "", gradeLevel: "6" });
  const [isAddingClass, setIsAddingClass] = useState(false);
  const [classError, setClassError] = useState("");

  // Add Grade Modal
  const [showAddGrade, setShowAddGrade] = useState(false);
  const [gradeForm, setGradeForm] = useState({ level: "", name: "" });
  const [isAddingGrade, setIsAddingGrade] = useState(false);
  const [gradeError, setGradeError] = useState("");

  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);

  // SWR: auto-cached and deduplicated data fetching
  const { data: studentsRes, isLoading: studentsLoading } = useSWR('/api/students', fetcher, {
    onSuccess: (data: any) => {
      const list: Student[] = data?.students ?? [];
      const total = list.length;
      const active = list.filter((s: Student) => (s._count?.submissions ?? 0) > 0).length;
      const struggling = list.filter((s: Student) => {
        const avg = s.avgScore ?? 0;
        return avg > 0 && avg < 50;
      }).length;
      setStats({ total, active, struggling });
    }
  });

  const { data: gradesData } = useSWR('/api/grades', fetcher);
  const { data: classesData } = useSWR(
    showCreateForm && createForm.gradeLevel
      ? `/api/classes?gradeLevel=${createForm.gradeLevel}`
      : '/api/classes',
    fetcher
  );

  const students: Student[] = studentsRes?.students ?? [];
  const grades: GradeItem[] = gradesData ?? [];
  const classes: ClassItem[] = classesData ?? [];

  // Reset classId when grade level changes in create form
  const handleGradeLevelChange = (level: string) => {
    setCreateForm(prev => ({ ...prev, gradeLevel: level, classId: "" }));
  };

  // ==================== ADD CLASS ====================
  const handleAddClass = async (e: React.FormEvent) => {
    e.preventDefault();
    setClassError("");
    setIsAddingClass(true);

    try {
      const res = await fetch("/api/classes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: classForm.name.trim(),
          gradeLevel: parseInt(classForm.gradeLevel),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setClassError(data.error || "Failed to create class");
        setIsAddingClass(false);
        return;
      }

      setClassForm({ name: "", gradeLevel: "6" });
      setShowAddClass(false);
      mutate('/api/classes');
      alert(`Class "${data.class.name}" created successfully!`);
    } catch (error) {
      setClassError("Network error. Please try again.");
    } finally {
      setIsAddingClass(false);
    }
  };

  // ==================== ADD GRADE ====================
  const handleAddGrade = async (e: React.FormEvent) => {
    e.preventDefault();
    setGradeError("");
    setIsAddingGrade(true);

    try {
      const res = await fetch("/api/grades", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          level: parseInt(gradeForm.level),
          name: gradeForm.name.trim() || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setGradeError(data.error || "Failed to create grade");
        setIsAddingGrade(false);
        return;
      }

      setGradeForm({ level: "", name: "" });
      setShowAddGrade(false);
      mutate('/api/grades');
      alert(`Grade ${data.grade.level} created successfully!`);
    } catch (error) {
      setGradeError("Network error. Please try again.");
    } finally {
      setIsAddingGrade(false);
    }
  };

  const handleExportRoster = () => {
    const headers = ["Username", "Name", "Email", "Grade", "Class"];
    const rows = students.map((s) => [
      s.username,
      s.name,
      s.email,
      s.gradeLevel ?? "",
      s.className ?? "",
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((r) => r.map((field) => `"${field}"`).join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `student_roster_${new Date().toISOString().split("T")[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCSVImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsImporting(true);

    const reader = new FileReader();
    reader.onload = async (event) => {
      const csvData = event.target?.result as string;
      const lines = csvData.trim().split("\n");
      const headers = lines[0].replace(/^\uFEFF/, "").split(",").map((h) => h.trim().replace(/^"|"$/g, ""));

      const getField = (row: string[], headerName: string) => {
        const idx = headers.findIndex((h) => h.toLowerCase() === headerName.toLowerCase());
        return idx >= 0 ? row[idx]?.trim().replace(/^"|"$/g, "") : "";
      };

      const rows = lines
        .slice(1)
        .map((line) => {
          const fields: string[] = [];
          let current = "";
          let inQuotes = false;
          for (let i = 0; i < line.length; i++) {
            const char = line[i];
            if (char === '"') {
              inQuotes = !inQuotes;
            } else if (char === "," && !inQuotes) {
              fields.push(current.trim());
              current = "";
            } else {
              current += char;
            }
          }
          fields.push(current.trim());
          return fields;
        })
        .filter((row) => row.some((f) => f !== ""));

      const formattedData = rows
        .map((row) => ({
          name: getField(row, "name") || getField(row, "Name"),
          username: getField(row, "username") || getField(row, "Username"),
          email: getField(row, "email") || getField(row, "Email"),
          gradeLevel: parseInt(getField(row, "grade") || getField(row, "Grade") || "0"),
          className: getField(row, "class") || getField(row, "Class") || "",
          password: getField(row, "password") || getField(row, "Password"),
        }))
        .filter((s) => s.username && s.name && !isNaN(s.gradeLevel));

      if (formattedData.length === 0) {
        alert("No valid student data found. Please check your CSV format.");
        setIsImporting(false);
        return;
      }

      const missingPassword = formattedData.filter((s) => !s.password);
      if (missingPassword.length > 0) {
        alert(
          `Import failed: ${missingPassword.length} student(s) are missing a Password field.`
        );
        setIsImporting(false);
        return;
      }

      const res = await fetch("/api/students/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ students: formattedData }),
      });

      if (res.ok) {
        const data = await res.json();
        alert(
          `Import successful! ${data.count} students imported with username sign-in.`
        );
        mutate('/api/students');
      } else {
        const err = await res.json();
        alert(`Import failed: ${err.error || "Check CSV format."}`);
      }
      setIsImporting(false);
    };
    reader.readAsText(file);
  };

  const handleCreateStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError("");
    setIsCreating(true);

    try {
      const res = await fetch("/api/students", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: createForm.name,
          username: createForm.username,
          email: createForm.email,
          gradeLevel: parseInt(createForm.gradeLevel),
          classId: createForm.classId || undefined,
          password: createForm.password,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setCreateError(data.error || "Failed to create student");
        setIsCreating(false);
        return;
      }

      setCreateForm({ name: "", username: "", email: "", gradeLevel: "6", classId: "", password: "" });
      setShowCreateForm(false);
      mutate('/api/students');
      alert("Student created successfully!");
    } catch (error) {
      setCreateError("Network error. Please try again.");
    } finally {
      setIsCreating(false);
    }
  };

  const filteredStudents = students.filter((s: Student) => {
    const matchesGrade =
      gradeFilter === "All" || s.gradeLevel === parseInt(gradeFilter);
    const matchesClass =
      classFilter === "All" || s.classId === classFilter;
    const matchesSearch =
      !searchQuery ||
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.email.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesGrade && matchesClass && matchesSearch;
  });

  const getStudentAverage = (student: Student) => {
    return student.avgScore;
  };

  const availableClasses = gradeFilter === "All" 
    ? classes 
    : classes.filter(c => c.grade.level === parseInt(gradeFilter));

  const gradeLevels = grades.map(g => g.level).sort((a, b) => a - b);

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-1 sm:space-y-7">
      <header className="flex flex-col justify-between gap-5 rounded-3xl border border-slate-200 bg-gradient-to-br from-white via-white to-indigo-50/70 p-5 shadow-sm sm:p-7 xl:flex-row xl:items-center">
        <div>
          <h1 className="flex items-center gap-3 text-2xl font-black text-slate-900 sm:text-3xl">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-700"><Users size={24} /></span> Student Directory
          </h1>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600">
            {userRole === "ADMIN" ? "Manage student accounts, organize classes, and review NAFS progress across the platform." : "Find students in your assigned grades, review their progress, and keep class rosters up to date."}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:gap-3 xl:max-w-[620px] xl:justify-end">
          {userRole === "ADMIN" && (
            <button
              onClick={() => setShowAddGrade(true)}
              className="flex items-center justify-center gap-2 rounded-xl bg-violet-600 px-3 py-3 text-xs font-bold text-white shadow-sm transition-all hover:bg-violet-700 active:scale-95 sm:px-4 sm:text-sm"
            >
              <Layers size={20} /> Add Grade
            </button>
          )}

          {/* ADD CLASS BUTTON */}
          <button
            onClick={() => setShowAddClass(true)}
            className="flex items-center justify-center gap-2 rounded-xl bg-amber-600 px-3 py-3 text-xs font-bold text-white shadow-sm transition-all hover:bg-amber-700 active:scale-95 sm:px-4 sm:text-sm"
          >
            <School size={20} /> Add Class
          </button>

          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-3 py-3 text-xs font-bold text-white shadow-sm transition-all hover:bg-emerald-700 active:scale-95 sm:px-4 sm:text-sm"
          >
            {showCreateForm ? <X size={20} /> : <UserPlus size={20} />}
            {showCreateForm ? "Close Form" : "Add Student"}
          </button>

          {userRole === "ADMIN" && <BulkDeleteStudentsButton studentIds={selectedStudentIds} onDeleted={() => setSelectedStudentIds([])} />}

          <button
            onClick={handleExportRoster}
            disabled={students.length === 0}
            className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-3 text-xs font-bold text-slate-600 shadow-sm transition-all hover:border-slate-300 hover:bg-slate-50 active:scale-95 disabled:opacity-50 sm:px-4 sm:text-sm"
          >
            <Download size={20} /> Export Roster
          </button>

          <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-indigo-600 px-3 py-3 text-xs font-bold text-white shadow-sm transition-all hover:bg-indigo-700 active:scale-95 sm:px-4 sm:text-sm">
            {isImporting ? (
              <Loader2 className="animate-spin" size={20} />
            ) : (
              <Upload size={20} />
            )}
            {isImporting ? "Processing CSV..." : "Bulk Import"}
            <input
              type="file"
              accept=".csv"
              onChange={handleCSVImport}
              className="hidden"
            />
          </label>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
        <div className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5"><div className="rounded-xl bg-blue-50 p-3 text-blue-600"><Users size={22} /></div><div><p className="text-2xl font-black text-slate-900">{stats.total}</p><p className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Students</p></div></div>
        <div className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5"><div className="rounded-xl bg-emerald-50 p-3 text-emerald-600"><TrendingUp size={22} /></div><div><p className="text-2xl font-black text-slate-900">{stats.active}</p><p className="text-xs font-bold uppercase tracking-wider text-slate-400">Active Learners</p></div></div>
        <div className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5"><div className="rounded-xl bg-rose-50 p-3 text-rose-600"><AlertCircle size={22} /></div><div><p className="text-2xl font-black text-slate-900">{stats.struggling}</p><p className="text-xs font-bold uppercase tracking-wider text-slate-400">Need Attention</p></div></div>
      </div>

      <div className="flex justify-end">
        <a href="/student_import_template.csv" download className="flex items-center gap-1.5 text-sm font-semibold text-indigo-600 transition-colors hover:text-indigo-800">
          <FileText size={16} /> Download sample file
        </a>
      </div>

      {/* ==================== ADD GRADE MODAL ==================== */}
      {showAddGrade && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-[2rem] shadow-2xl p-8">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                <Layers className="text-violet-600" size={24} /> Add New Grade
              </h2>
              <button onClick={() => setShowAddGrade(false)} className="p-2 hover:bg-slate-100 rounded-full">
                <X size={20} />
              </button>
            </div>

            {gradeError && (
              <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm font-semibold flex items-center gap-2">
                <AlertCircle size={18} /> {gradeError}
              </div>
            )}

            <form onSubmit={handleAddGrade} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">
                  Grade Level *
                </label>
                <input
                  type="number"
                  min="1"
                  max="12"
                  required
                  value={gradeForm.level}
                  onChange={(e) => setGradeForm({ ...gradeForm, level: e.target.value })}
                  placeholder="e.g. 10"
                  className="w-full p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-violet-400 outline-none font-medium text-slate-700"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">
                  Grade Name (Optional)
                </label>
                <input
                  type="text"
                  value={gradeForm.name}
                  onChange={(e) => setGradeForm({ ...gradeForm, name: e.target.value })}
                  placeholder="e.g. Grade 10, Year 10"
                  className="w-full p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-violet-400 outline-none font-medium text-slate-700"
                />
              </div>
              <button
                type="submit"
                disabled={isAddingGrade}
                className="w-full bg-violet-600 hover:bg-violet-700 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 disabled:opacity-50 transition-all shadow-md"
              >
                {isAddingGrade ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />}
                {isAddingGrade ? "Creating..." : "Create Grade"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ==================== ADD CLASS MODAL ==================== */}
      {showAddClass && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-[2rem] shadow-2xl p-8">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                <School className="text-amber-600" size={24} /> Add New Class
              </h2>
              <button onClick={() => setShowAddClass(false)} className="p-2 hover:bg-slate-100 rounded-full">
                <X size={20} />
              </button>
            </div>

            {classError && (
              <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm font-semibold flex items-center gap-2">
                <AlertCircle size={18} /> {classError}
              </div>
            )}

            <form onSubmit={handleAddClass} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">
                  Grade Level *
                </label>
                <select
                  required
                  value={classForm.gradeLevel}
                  onChange={(e) => setClassForm({ ...classForm, gradeLevel: e.target.value })}
                  className="w-full p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-amber-400 outline-none font-medium text-slate-700 cursor-pointer bg-white"
                >
                  {gradeLevels.length === 0 && (
                    <option value="">No grades available - add a grade first</option>
                  )}
                  {gradeLevels.map((g) => (
                    <option key={g} value={g}>
                      Grade {g}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">
                  Class Name *
                </label>
                <input
                  type="text"
                  required
                  value={classForm.name}
                  onChange={(e) => setClassForm({ ...classForm, name: e.target.value })}
                  placeholder="e.g. A, B, Science-A, 6/1"
                  className="w-full p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-amber-400 outline-none font-medium text-slate-700"
                />
              </div>
              <button
                type="submit"
                disabled={isAddingClass}
                className="w-full bg-amber-600 hover:bg-amber-700 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 disabled:opacity-50 transition-all shadow-md"
              >
                {isAddingClass ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />}
                {isAddingClass ? "Creating..." : "Create Class"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Create Student Form */}
      {showCreateForm && (
        <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm">
          <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
            <UserPlus className="text-emerald-600" size={22} /> Create New Student
          </h2>

          {createError && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm font-semibold flex items-center gap-2">
              <AlertCircle size={18} /> {createError}
            </div>
          )}

          <form
            onSubmit={handleCreateStudent}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5"
          >
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">
                Full Name *
              </label>
              <input
                type="text"
                required
                value={createForm.name}
                onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                placeholder="e.g. John Doe"
                className="w-full p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-400 outline-none font-medium text-slate-700"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">
                Username *
              </label>
              <input
                type="text"
                required
                minLength={3}
                autoComplete="username"
                value={createForm.username}
                onChange={(e) => setCreateForm({ ...createForm, username: e.target.value })}
                placeholder="e.g. john.doe"
                className="w-full p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-400 outline-none font-medium text-slate-700"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Email (Optional)</label>
              <input type="email" value={createForm.email} onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })} placeholder="e.g. john@school.edu" className="w-full p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-400 outline-none font-medium text-slate-700" />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">
                Grade Level *
              </label>
              <select
                required
                value={createForm.gradeLevel}
              onChange={(e) => handleGradeLevelChange(e.target.value)}
              className="w-full p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-400 outline-none font-medium text-slate-700 cursor-pointer bg-white"
            >
              {gradeLevels.length === 0 && (
                <option value="">No grades - add one first</option>
              )}
              {gradeLevels.map((g) => (
                <option key={g} value={g}>
                  Grade {g}
                </option>
              ))}
            </select>
          </div>
          
          {/* Class Dropdown */}
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">
              Class *
            </label>
            <select
              required
              value={createForm.classId}
              onChange={(e) => setCreateForm({ ...createForm, classId: e.target.value })}
                className="w-full p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-400 outline-none font-medium text-slate-700 cursor-pointer bg-white"
              >
                <option value="">Select a class...</option>
                {classes
                  .filter(c => c.grade.level === parseInt(createForm.gradeLevel))
                  .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c._count.users} students)
                  </option>
                ))}
              </select>
              {classes.filter(c => c.grade.level === parseInt(createForm.gradeLevel)).length === 0 && (
                <p className="text-xs text-amber-600 mt-1">
                  No classes for Grade {createForm.gradeLevel}. 
                  <button 
                    type="button"
                    onClick={() => {
                      setClassForm({ name: "", gradeLevel: createForm.gradeLevel });
                      setShowAddClass(true);
                    }}
                    className="underline ml-1 hover:text-amber-800 font-semibold"
                  >
                    Add one?
                  </button>
                </p>
              )}
            </div>

            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">
                Password *
              </label>
              <input
                type="password"
                required
                value={createForm.password}
                onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                placeholder="Min 6 characters"
                minLength={6}
                className="w-full p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-400 outline-none font-medium text-slate-700"
              />
            </div>
            <div className="flex items-end">
              <button
                type="submit"
                disabled={isCreating}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-3 rounded-xl font-bold transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isCreating ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />}
                {isCreating ? "Creating..." : "Create Student"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Filters */}
      <div className="grid grid-cols-1 gap-3 rounded-3xl border border-slate-200 bg-white p-3 shadow-sm sm:grid-cols-2 xl:grid-cols-3 sm:p-4">
        <div className="flex min-w-0 items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3">
          <Filter size={20} className="text-indigo-500" />
          <select
            className="w-full py-3 bg-transparent outline-none font-bold text-slate-700 cursor-pointer"
            onChange={(e) => {
              setGradeFilter(e.target.value);
              setClassFilter("All");
            }}
            value={gradeFilter}
          >
            <option value="All">All Grades</option>
            {gradeLevels.map((g) => (
              <option key={g} value={g}>
                Grade {g}
              </option>
            ))}
          </select>
        </div>
        
        <div className="flex min-w-0 items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3">
          <School size={20} className="text-indigo-500" />
          <select
            className="w-full py-3 bg-transparent outline-none font-bold text-slate-700 cursor-pointer"
            onChange={(e) => setClassFilter(e.target.value)}
            value={classFilter}
          >
            <option value="All">All Classes</option>
            {availableClasses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} (Grade {c.grade.level})
              </option>
            ))}
          </select>
        </div>

        <div className="flex min-w-0 items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3">
          <Search size={20} className="text-indigo-500" />
          <input
            type="text"
            placeholder="Search name, username, or email..."
            className="w-full py-3 bg-transparent outline-none font-medium text-slate-700"
            onChange={(e) => setSearchQuery(e.target.value)}
            value={searchQuery}
          />
        </div>
      </div>

      {/* Mobile roster cards */}
      <div className="grid gap-3 md:hidden">
        {studentsLoading ? <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-slate-500"><Loader2 className="mx-auto mb-3 animate-spin" />Loading student records...</div> : filteredStudents.length === 0 ? <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500"><Users size={36} className="mx-auto mb-3 text-slate-300" />No students match your filters.</div> : filteredStudents.map((student) => {
          const average = getStudentAverage(student);
          return <article key={student.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-start gap-3">
              {userRole === "ADMIN" && <input type="checkbox" aria-label={`Select ${student.name}`} checked={selectedStudentIds.includes(student.id)} onChange={(event) => setSelectedStudentIds((current) => event.target.checked ? [...current, student.id] : current.filter((id) => id !== student.id))} className="mt-1 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />}
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-50 font-bold text-indigo-700">{student.name?.[0] || "S"}</div>
              <div className="min-w-0 flex-1"><h2 className="truncate font-bold text-slate-900">{student.name}</h2><p className="mt-0.5 truncate text-xs font-semibold text-indigo-600">@{student.username}</p><p className="truncate text-xs text-slate-500">{student.email.endsWith(".invalid") ? "No email provided" : student.email}</p></div>
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-2"><span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600">Grade {student.gradeLevel ?? "?"}</span>{student.className ? <span className="rounded-lg bg-indigo-50 px-2.5 py-1 text-xs font-bold text-indigo-700">{student.className}</span> : <span className="text-xs font-medium text-amber-600">No class</span>}{average !== null ? <span className={`rounded-lg px-2.5 py-1 text-xs font-bold ${average >= 80 ? "bg-emerald-50 text-emerald-700" : average >= 50 ? "bg-amber-50 text-amber-700" : "bg-rose-50 text-rose-700"}`}>{average.toFixed(0)}% · {student._count?.submissions || 0} quizzes</span> : <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs text-slate-500">No activity</span>}</div>
            <div className="mt-4 grid grid-cols-2 gap-2"><button onClick={() => setEditingStudent(student)} className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-100 px-3 py-2.5 text-sm font-bold text-slate-700 hover:bg-indigo-50 hover:text-indigo-700"><Pencil size={15} />Edit</button><Link href={`/dashboard/students/profile/${student.id}`} className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-3 py-2.5 text-sm font-bold text-white hover:bg-indigo-700"><UserCircle2 size={16} />Profile</Link></div>
          </article>;
        })}
      </div>

      {/* Desktop and tablet roster */}
      <div className="hidden overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm md:block">
        <div className="overflow-x-auto">
        <table className="w-full min-w-[900px] text-left">
          <thead className="bg-slate-50/50 border-b border-slate-100">
            <tr className="text-xs font-black text-slate-400 uppercase tracking-[0.1em]">
              {userRole === "ADMIN" && <th className="p-4 sm:p-6"><input type="checkbox" aria-label="Select all visible students" checked={filteredStudents.length > 0 && filteredStudents.every((student) => selectedStudentIds.includes(student.id))} onChange={(event) => { const visibleIds = filteredStudents.map((student) => student.id); setSelectedStudentIds((current) => event.target.checked ? Array.from(new Set([...current, ...visibleIds])) : current.filter((id) => !visibleIds.includes(id))); }} className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" /></th>}
              <th className="px-5 py-4">Student</th>
              <th className="px-5 py-4">Placement</th>
              <th className="px-5 py-4">Performance</th>
              <th className="px-5 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {studentsLoading ? (
              <tr>
                <td colSpan={userRole === "ADMIN" ? 5 : 4} className="p-20 text-center text-slate-400 font-bold italic">
                  <Loader2 className="animate-spin mx-auto mb-4" size={32} />
                  Loading student records...
                </td>
              </tr>
            ) : filteredStudents.length === 0 ? (
              <tr>
                <td colSpan={userRole === "ADMIN" ? 5 : 4} className="p-20 text-center text-slate-400 font-bold">
                  <Users size={48} className="mx-auto mb-4 text-slate-300" />
                  No students found matching your criteria.
                </td>
              </tr>
            ) : (
              filteredStudents.map((student: Student) => {
                const avg = getStudentAverage(student);
                return (
                  <tr key={student.id} className="hover:bg-slate-50/80 transition-all group">
                    {userRole === "ADMIN" && <td className="p-4 sm:p-6"><input type="checkbox" aria-label={`Select ${student.name}`} checked={selectedStudentIds.includes(student.id)} onChange={(event) => setSelectedStudentIds((current) => event.target.checked ? [...current, student.id] : current.filter((id) => id !== student.id))} className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" /></td>}
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-black text-lg border border-indigo-100">
                          {student.name[0]}
                        </div>
                        <div>
                          <p className="font-bold text-slate-800 text-lg">{student.name}</p>
                          <p className="text-xs font-semibold text-indigo-600">@{student.username}</p>
                          <p className="text-xs text-slate-400">{student.email.endsWith(".invalid") ? "No email provided" : student.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <span className="bg-slate-100 px-3 py-1 rounded-lg font-bold text-slate-600 text-sm">
                          Grade {student.gradeLevel ?? "?"}
                        </span>
                        {student.className && (
                          <span className="bg-indigo-50 px-3 py-1 rounded-lg font-bold text-indigo-600 text-sm border border-indigo-100">
                            {student.className}
                          </span>
                        )}
                        {!student.className && (
                          <span className="text-amber-400 font-medium text-sm">No class</span>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      {avg !== null ? (
                        <div className="flex items-center gap-2">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm ${
                            avg >= 80 ? "bg-emerald-100 text-emerald-700" : 
                            avg >= 50 ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"
                          }`}>
                            {avg.toFixed(0)}%
                          </div>
                          <span className="text-xs text-slate-400">
                            {student._count?.submissions || 0} quizzes
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400 bg-slate-100 px-3 py-1 rounded-lg">
                          No activity
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setEditingStudent(student)}
                          className="inline-flex items-center gap-2 bg-slate-50 text-slate-600 px-4 py-2.5 rounded-xl font-bold hover:bg-indigo-50 hover:text-indigo-600 transition-all"
                        >
                          <Pencil size={16} /> Edit
                        </button>
                        <Link
                          href={`/dashboard/students/profile/${student.id}`}
                          className="inline-flex items-center gap-2 bg-slate-50 text-indigo-600 px-5 py-2.5 rounded-xl font-bold hover:bg-indigo-600 hover:text-white transition-all"
                        >
                          <UserCircle2 size={18} /> View Profile
                        </Link>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
        </div>
      </div>

      {editingStudent && (
        <StudentEditModal
          student={editingStudent}
          onClose={() => setEditingStudent(null)}
          onSaved={() => mutate('/api/students')}
          canDelete={userRole === "ADMIN"}
        />
      )}
    </div>
  );
}
