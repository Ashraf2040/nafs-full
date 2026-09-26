// src/types/next-auth.d.ts
import NextAuth, { DefaultSession } from "next-auth";
import { Role } from "@prisma/client";

declare module "next-auth" {
  /**
   * Returned by `useSession`, `getSession` and received as a prop on the `SessionProvider` React Context
   */
  interface Session {
    user: {
      id: string;
      role: Role;
      gradeId?: string | null;
      classId?: string | null;
      className?: string | null;
    } & DefaultSession["user"];
  }

  interface User {
    id: string;
    role: Role;
    gradeId?: string | null;
    classId?: string | null;
    className?: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: Role;
    gradeId?: string | null;
    classId?: string | null;
    className?: string | null;
  }
}
