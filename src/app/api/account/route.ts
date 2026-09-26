import { NextResponse } from "next/server";
import bcrypt from "bcrypt";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/guard";

export async function PUT(req: Request) {
  try {
    const { user, response } = await requireAuth();
    if (response) return response;
    const body = await req.json();
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const currentPassword = typeof body.currentPassword === "string" ? body.currentPassword : "";
    const newPassword = typeof body.newPassword === "string" ? body.newPassword : "";

    if (name.length < 2 || name.length > 100) {
      return NextResponse.json({ error: "Name must be between 2 and 100 characters" }, { status: 400 });
    }

    const account = await prisma.user.findUnique({
      where: { id: user!.id },
      select: { id: true, password: true },
    });
    if (!account) return NextResponse.json({ error: "Account not found" }, { status: 404 });

    let passwordHash: string | undefined;
    if (newPassword) {
      if (!account.password) {
        return NextResponse.json({ error: "Password changes are unavailable for your external sign-in account" }, { status: 400 });
      }
      if (!currentPassword || !(await bcrypt.compare(currentPassword, account.password))) {
        return NextResponse.json({ error: "Current password is incorrect" }, { status: 400 });
      }
      if (newPassword.length < 8) {
        return NextResponse.json({ error: "New password must be at least 8 characters" }, { status: 400 });
      }
      passwordHash = await bcrypt.hash(newPassword, 12);
    }

    const updated = await prisma.user.update({
      where: { id: user!.id },
      data: { name, ...(passwordHash ? { password: passwordHash } : {}) },
      select: { id: true, name: true, email: true, role: true },
    });
    return NextResponse.json({ user: updated, passwordChanged: Boolean(passwordHash) });
  } catch (error) {
    console.error("ACCOUNT_UPDATE_ERROR:", error);
    return NextResponse.json({ error: "Account changes could not be saved" }, { status: 500 });
  }
}
