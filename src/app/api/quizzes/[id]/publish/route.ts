// src/app/api/quizzes/[id]/publish/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userRole = (session.user as any).role;
    if (userRole === "STUDENT") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;

    // Update quiz to published
    const updatedQuiz = await prisma.quiz.update({
      where: { id },
      data: { isPublished: true },
    });

    // Revalidate the quizzes page so fresh data shows
    revalidatePath("/dashboard/quizzes");

    return NextResponse.json({ success: true, quiz: updatedQuiz });
  } catch (error) {
    console.error("PUBLISH_ERROR:", error);
    return NextResponse.json({ error: "Failed to publish quiz" }, { status: 500 });
  }
}