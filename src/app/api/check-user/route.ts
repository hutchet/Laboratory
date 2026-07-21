import { db } from "@/shared/lib/db";
import { NextResponse } from "next/server";

export const runtime = 'nodejs';

export async function GET() {
  try {
    const users = await db.user.findMany({
      select: { id: true, email: true, name: true, passwordHash: true },
    });
    const members = await db.member.findMany({
      select: { id: true, email: true, code: true, name: true },
      where: { email: { not: null } },
    });
    return NextResponse.json({
      users: users.map(u => ({
        id: u.id,
        email: u.email,
        name: u.name,
        hasPassword: !!u.passwordHash,
        pwPrefix: u.passwordHash?.substring(0, 12),
      })),
      members: members.map(m => ({
        id: m.id,
        email: m.email,
        code: m.code,
        name: m.name,
      })),
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
