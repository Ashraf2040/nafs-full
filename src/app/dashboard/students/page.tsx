"use client";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import {
  Users, Upload, Filter, UserCircle2, FileText, Search,
  Loader2, GraduationCap, TrendingUp, AlertCircle,
  Plus, X, Download, UserPlus, Pencil
} from "lucide-react";
import Link from "next/link";
import StudentEditModal from "@/components/StudentEditModal";

interface Student {
  id: string;
  name: string;
  email: string;
  gradeLevel: number;
  className: string | null;
  role: string;
  _count?: {
    submissions: number;
  };
  submissions?: {
    score: number;
  }[];
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

  const [students, setStudents] = useState<Student[]>([]);              // FIXED
  const [gradeFilter, setGradeFilter] = useState("All");
  const [classFilter, setClassFilter] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [isImporting, setIsImporting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, active: 0, struggling: 0 });

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: "",
    email: "",
    gradeLevel: "6",
    className: "",
    password: "",
  });
  const [createError, setCreateError] = useState("");

  const [editingStudent, setEditingStudent] = useState<Student | null>(null);   // FIXED

  const fetchStudents = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/students');
      const data = await res.json();
      setStudents(data);

      const total = data.length;
      const active = data.filter((s: Student) => (s._count?.submissions ?? 0) > 0).length;
      const struggling = data.filter((s: Student) => {
        const avg = s.submissions?.length
          ? s.submissions.reduce((a: number, b: any) => a + b.score, 0) / s.submissions.length
          : 0;
        return avg > 0 && avg < 50;
      }).length;

      setStats({ total, active, struggling });
    } catch (error) {
      console.error("Failed to fetch students:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchStudents(); }, []);

  const handleExportRoster = () => {
    const headers = ["Name", "Email", "Grade", "Class", "Password"];
    const rows = students.map((s) => [
      s.name,
      s.email,
      s.gradeLevel,
      s.className || "",
      "Student123!",
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

  const handleDownloadSample = () => {
    const sampleData = `Name,Email,Grade,Class,Password
John Doe,john.doe@school.edu,6,A,JohnPass123!
Jane Smith,jane.smith@school.edu,7,B,JanePass456!
Alice Johnson,alice.j@school.edu,8,A,AlicePass789!
Bob Williams,bob.w@school.edu,6,C,BobPass012!`;

    const blob = new Blob([sampleData], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", "student_import_template.csv");
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
      const headers = lines[0].split(",").map((h) => h.trim().replace(/^"|"$/g, ""));

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
          email: getField(row, "email") || getField(row, "Email"),
          gradeLevel: parseInt(getField(row, "grade") || getField(row, "Grade") || "0"),
          className: getField(row, "class") || getField(row, "Class") || "",
          password: getField(row, "password") || getField(row, "Password"),
        }))
        .filter((s) => s.email && s.name && !isNaN(s.gradeLevel));

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
          `Import successful! ${data.count} students imported with their own passwords.`
        );
        fetchStudents();
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
          email: createForm.email,
          gradeLevel: parseInt(createForm.gradeLevel),
          className: createForm.className || null,
          password: createForm.password || "Student123!",
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setCreateError(data.error || "Failed to create student");
        setIsCreating(false);
        return;
      }

      setCreateForm({ name: "", email: "", gradeLevel: "6", className: "", password: "" });
      setShowCreateForm(false);
      fetchStudents();
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
      !classFilter ||
      s.className?.toLowerCase().includes(classFilter.toLowerCase());
    const matchesSearch =
      !searchQuery ||
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.email.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesGrade && matchesClass && matchesSearch;
  });

  const getStudentAverage = (student: Student) => {
    if (!student.submissions?.length) return null;
    return student.submissions.reduce((a, b) => a + b.score, 0) / student.submissions.length;
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-blue-50 rounded-xl text-blue-600">
            <Users size={24} />
          </div>
          <div>
            <p className="text-2xl font-black text-slate-900">{stats.total}</p>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Total Students
            </p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-emerald-50 rounded-xl text-emerald-600">
            <TrendingUp size={24} />
          </div>
          <div>
            <p className="text-2xl font-black text-slate-900">{stats.active}</p>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Active Learners
            </p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-red-50 rounded-xl text-red-600">
            <AlertCircle size={24} />
          </div>
          <div>
            <p className="text-2xl font-black text-slate-900">{stats.struggling}</p>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Need Attention
            </p>
          </div>
        </div>
      </div>

      <header className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 flex items-center gap-3">
            <Users className="text-indigo-600" size={32} /> Student Directory
          </h1>
          <p className="text-slate-500 font-medium">
            Manage student accounts and monitor NAFS progress.
          </p>
        </div>
        <div className="flex gap-3 flex-wrap">
          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-3 rounded-2xl font-bold cursor-pointer flex items-center gap-2 transition-all shadow-lg shadow-emerald-100 active:scale-95"
          >
            {showCreateForm ? <X size={20} /> : <UserPlus size={20} />}
            {showCreateForm ? "Close Form" : "Add Student"}
          </button>

          <button
            onClick={handleExportRoster}
            disabled={students.length === 0}
            className="bg-white border-2 border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-600 px-5 py-3 rounded-2xl font-bold cursor-pointer flex items-center gap-2 transition-all shadow-sm active:scale-95 disabled:opacity-50"
          >
            <Download size={20} /> Export Roster
          </button>

          <label className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-3 rounded-2xl font-bold cursor-pointer flex items-center gap-2 transition-all shadow-lg shadow-indigo-100 active:scale-95">
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

      <div className="flex justify-end">
        <button
          onClick={handleDownloadSample}
          className="text-sm text-indigo-600 font-semibold hover:text-indigo-800 transition-colors flex items-center gap-1.5"
        >
          <FileText size={16} /> Download sample file
        </button>
      </div>

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
                onChange={(e) =>
                  setCreateForm({ ...createForm, name: e.target.value })
                }
                placeholder="e.g. John Doe"
                className="w-full p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-400 outline-none font-medium text-slate-700"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">
                Email Address *
              </label>
              <input
                type="email"
                required
                value={createForm.email}
                onChange={(e) =>
                  setCreateForm({ ...createForm, email: e.target.value })
                }
                placeholder="e.g. john@school.edu"
                className="w-full p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-400 outline-none font-medium text-slate-700"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">
                Grade Level *
              </label>
              <select
                required
                value={createForm.gradeLevel}
                onChange={(e) =>
                  setCreateForm({ ...createForm, gradeLevel: e.target.value })
                }
                className="w-full p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-400 outline-none font-medium text-slate-700 cursor-pointer bg-white"
              >
                {[3, 4, 5, 6, 7, 8, 9].map((g) => (
                  <option key={g} value={g}>
                    Grade {g}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">
                Class Name
              </label>
              <input
                type="text"
                value={createForm.className}
                onChange={(e) =>
                  setCreateForm({ ...createForm, className: e.target.value })
                }
                placeholder="e.g. A, B, 6/1"
                className="w-full p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-400 outline-none font-medium text-slate-700"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">
                Password *
              </label>
              <input
                type="password"
                required
                value={createForm.password}
                onChange={(e) =>
                  setCreateForm({ ...createForm, password: e.target.value })
                }
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
                {isCreating ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <Plus size={18} />
                )}
                {isCreating ? "Creating..." : "Create Student"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1 bg-white p-2 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-3 px-4">
          <Filter size={20} className="text-indigo-500" />
          <select
            className="w-full py-3 bg-transparent outline-none font-bold text-slate-700 cursor-pointer"
            onChange={(e) => setGradeFilter(e.target.value)}
            value={gradeFilter}
          >
            <option value="All">All Grades</option>
            {[3, 4, 5, 6, 7, 8, 9].map((g) => (
              <option key={g} value={g}>
                Grade {g}
              </option>
            ))}
          </select>
        </div>
        <div className="flex-1 bg-white p-2 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-3 px-4">
          <Search size={20} className="text-indigo-500" />
          <input
            type="text"
            placeholder="Search by name or email..."
            className="w-full py-3 bg-transparent outline-none font-medium text-slate-700"
            onChange={(e) => setSearchQuery(e.target.value)}
            value={searchQuery}
          />
        </div>
        <div className="flex-1 bg-white p-2 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-3 px-4">
          <GraduationCap size={20} className="text-indigo-500" />
          <input
            type="text"
            placeholder="Filter by Class (e.g. A, B, 6/1)..."
            className="w-full py-3 bg-transparent outline-none font-medium text-slate-700"
            onChange={(e) => setClassFilter(e.target.value)}
            value={classFilter}
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-[2.5rem] border border-slate-100 overflow-hidden shadow-sm">
        <table className="w-full text-left">
          <thead className="bg-slate-50/50 border-b border-slate-100">
            <tr className="text-xs font-black text-slate-400 uppercase tracking-[0.1em]">
              <th className="p-8">Student Identity</th>
              <th className="p-8">Placement</th>
              <th className="p-8">Performance</th>
              <th className="p-8 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {loading ? (
              <tr>
                <td
                  colSpan={4}
                  className="p-20 text-center text-slate-400 font-bold italic"
                >
                  <Loader2 className="animate-spin mx-auto mb-4" size={32} />
                  Loading student records...
                </td>
              </tr>
            ) : filteredStudents.length === 0 ? (
              <tr>
                <td
                  colSpan={4}
                  className="p-20 text-center text-slate-400 font-bold"
                >
                  <Users size={48} className="mx-auto mb-4 text-slate-300" />
                  No students found matching your criteria.
                </td>
              </tr>
            ) : (
              filteredStudents.map((student: Student) => {
                const avg = getStudentAverage(student);
                return (
                  <tr
                    key={student.id}
                    className="hover:bg-slate-50/80 transition-all group"
                  >
                    <td className="p-8">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-black text-lg border border-indigo-100">
                          {student.name[0]}
                        </div>
                        <div>
                          <p className="font-bold text-slate-800 text-lg">
                            {student.name}
                          </p>
                          <p className="text-sm text-slate-400">{student.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-8">
                      <div className="flex items-center gap-2">
                        <span className="bg-slate-100 px-3 py-1 rounded-lg font-bold text-slate-600 text-sm">
                          Grade {student.gradeLevel}
                        </span>
                        <span className="text-indigo-400 font-medium text-sm">
                          {student.className || "Unassigned"}
                        </span>
                      </div>
                    </td>
                    <td className="p-8">
                      {avg !== null ? (
                        <div className="flex items-center gap-2">
                          <div
                            className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm ${
                              avg >= 80
                                ? "bg-emerald-100 text-emerald-700"
                                : avg >= 50
                                ? "bg-amber-100 text-amber-700"
                                : "bg-red-100 text-red-700"
                            }`}
                          >
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
                    <td className="p-8 text-right">
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

      {editingStudent && (
        <StudentEditModal
          student={editingStudent}
          onClose={() => setEditingStudent(null)}
          onSaved={fetchStudents}
        />
      )}
    </div>
  );
}