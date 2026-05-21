import prisma from "@/lib/prisma";

export async function analyzeQuiz(quizId: string) {
  const quiz = await prisma.quiz.findUnique({
    where: { id: quizId },

    include: {
      subject: true,
      grade: true, // ✅ FIX: needed instead of gradeTarget

      questions: {
        include: {
          learningOutcome: true,
          answers: true,
        },
      },

      results: {
        include: {
          student: true,
          answers: true,
        },
      },
    },
  });

  if (!quiz) {
    throw new Error("Quiz not found");
  }

  const questionAnalysis = quiz.questions.map((question) => {
    const totalAnswers = question.answers.length;

    const correctAnswers = question.answers.filter(
      (a) => a.isCorrect
    ).length;

    const mastery =
      totalAnswers > 0
        ? (correctAnswers / totalAnswers) * 100
        : 0;

    const commonWrongAnswers: Record<string, number> = {};

    question.answers
      .filter((a) => !a.isCorrect)
      .forEach((a) => {
        commonWrongAnswers[a.studentAnswer] =
          (commonWrongAnswers[a.studentAnswer] || 0) + 1;
      });

    return {
      questionText: question.questionText,
      correctAnswer: question.correctAnswer,
      mastery,
      learningIndicator:
        question.learningOutcome?.indicatorText ||
        "Unknown Indicator",
      commonWrongAnswers,
    };
  });

  const weakQuestions = questionAnalysis.filter(
    (q) => q.mastery < 70
  );

  return {
    quizTitle: quiz.title,
    subject: quiz.subject.name,
    grade: quiz.grade?.level ?? "N/A", // ✅ FIXED HERE
    weakQuestions,
  };
}