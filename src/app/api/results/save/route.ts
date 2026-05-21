
// src/app/api/results/save/route.ts

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";

import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(
      authOptions
    );

    if (!session || !session.user) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      );
    }

    const userRole = (session.user as any).role;

    const userId = (session.user as any).id;

    if (userRole !== "STUDENT") {
      return NextResponse.json(
        {
          message:
            "Only students can submit quiz results",
        },
        { status: 403 }
      );
    }

    const {
      quizId,
      score,
      answers,
    } = await req.json();

    if (
      !quizId ||
      score === undefined
    ) {
      return NextResponse.json(
        {
          message:
            "Missing required fields",
        },
        { status: 400 }
      );
    }

    // Get quiz WITH questions
    const quiz = await prisma.quiz.findUnique({
      where: {
        id: quizId,
      },

      include: {
        questions: true,
      },
    });

    if (!quiz) {
      return NextResponse.json(
        { message: "Quiz not found" },
        { status: 404 }
      );
    }

    // Existing result?
    const existingResult =
      await prisma.result.findFirst({
        where: {
          studentId: userId,

          quizId,
        },

        include: {
  answers: true,
}
      });

    // UPDATE EXISTING RESULT
    if (existingResult) {
      if (score > existingResult.score) {
        // Delete old answers
        await prisma.studentAnswer.deleteMany({
          where: {
            resultId: existingResult.id,
          },
        });

        // Update result
        const updated =
          await prisma.result.update({
            where: {
              id: existingResult.id,
            },

            data: {
              score,

              totalPoints:
                quiz.questions.length,
            },
          });

        // Save new answers
        if (
          answers &&
          Array.isArray(answers)
        ) {
          await prisma.studentAnswer.createMany({
            data: answers.map((a: any) => ({
              resultId: updated.id,

              questionId:
                a.questionId,

              studentAnswer:
                a.studentAnswer,

              isCorrect:
                a.isCorrect,
            })),
          });
        }

        return NextResponse.json(
          {
            message:
              "Result updated successfully",

            result: updated,
          },
          { status: 200 }
        );
      }

      return NextResponse.json(
        {
          message:
            "Previous score was higher or equal",

          result: existingResult,
        },
        { status: 200 }
      );
    }

    // CREATE RESULT
    const newResult =
      await prisma.result.create({
        data: {
          score,

          totalPoints:
            quiz.questions.length,

          studentId: userId,

          quizId,
        },
      });

    // SAVE STUDENT ANSWERS
    if (
      answers &&
      Array.isArray(answers)
    ) {
      await prisma.studentAnswer.createMany({
        data: answers.map((a: any) => ({
          resultId: newResult.id,

          questionId:
            a.questionId,

          studentAnswer:
            a.studentAnswer,

          isCorrect:
            a.isCorrect,
        })),
      });
    }

    return NextResponse.json(
      {
        message:
          "Result saved successfully",

        result: newResult,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error(
      "RESULT_SAVE_ERROR:",
      error
    );

    return NextResponse.json(
      {
        message:
          "Internal Server Error",

        details: error.message,
      },
      { status: 500 }
    );
  }
}
