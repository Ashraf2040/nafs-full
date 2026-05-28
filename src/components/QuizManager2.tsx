"use client";

import { useQuizManager } from "@/hooks/useQuizManager";

export default function QuizManager() {
  const q = useQuizManager();

  return (
    <div className="p-6 space-y-6">

      {/* HEADER */}
      <div className="flex gap-4">
        <select value={q.subject} onChange={(e) => q.setSubject(e.target.value)}>
          <option value="">Subject</option>
          <option value="science">Science</option>
          <option value="math">Math</option>
        </select>

        <select value={q.grade} onChange={(e) => q.setGrade(e.target.value)}>
          <option value="">Grade</option>
          <option value="3">3</option>
          <option value="6">6</option>
        </select>

        <input
          type="date"
          value={q.dueDate}
          onChange={(e) => q.setDueDate(e.target.value)}
        />
      </div>

      {/* OUTCOME */}
      <div>
        <button onClick={q.fetchOutcomes}>
          Load Outcomes
        </button>

        <select
          value={q.selectedOutcomeId}
          onChange={(e) => q.setSelectedOutcomeId(e.target.value)}
        >
          {q.outcomes.map((o) => (
            <option key={o.id} value={o.id}>
              {o.outcomeText}
            </option>
          ))}
        </select>
      </div>

      {/* LESSON */}
      <textarea
        placeholder="Lesson text..."
        value={q.lessonText}
        onChange={(e) => q.setLessonText(e.target.value)}
      />

      {/* ACTIONS */}
      <div className="flex gap-2">
        <button onClick={q.generateQuestions} disabled={q.generating}>
          Generate
        </button>

        <button onClick={q.saveQuiz} disabled={q.saving}>
          Save
        </button>
      </div>

      {/* QUESTIONS */}
      <div className="space-y-3">
        {q.questions.map((qq, i) => (
          <div key={i} className="border p-3">
            <input
              value={qq.question}
              onChange={(e) =>
                q.updateQuestion(i, "question", e.target.value)
              }
            />

            <button onClick={() => q.removeQuestion(i)}>Delete</button>
          </div>
        ))}

        <button onClick={q.addQuestion}>+ Add Question</button>
      </div>

    </div>
  );
}