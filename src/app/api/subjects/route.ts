import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { name, description, colorCode } = await req.json();
  if (!name?.trim()) {
    return NextResponse.json({ error: "Subject name is required" }, { status: 400 });
  }

  try {
    const subject = await prisma.subject.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        colorCode: colorCode || null,
      },
    });
    return NextResponse.json(subject, { status: 201 });
  } catch (error: any) {
    if (error.code === "P2002") {
      return NextResponse.json({ error: "Subject name already exists" }, { status: 409 });
    }
    console.error("CREATE_SUBJECT_ERROR:", error);
    return NextResponse.json({ error: "Failed to create subject" }, { status: 500 });
  }
}