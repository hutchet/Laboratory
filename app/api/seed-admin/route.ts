import { NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { neon } from "@neondatabase/serverless"

export async function GET() {
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) {
    return NextResponse.json({ error: "DATABASE_URL not set" }, { status: 500 })
  }
  const sql = neon(connectionString)
  const email = "okashi1993@gmail.com"
  const password = "admin123"

  try {
    const passwordHash = await bcrypt.hash(password, 10)

    // Upsert user
    const existing = await sql`SELECT id, "passwordHash" FROM "User" WHERE email = ${email} LIMIT 1`

    if (existing.length > 0) {
      // Update password
      await sql`UPDATE "User" SET "passwordHash" = ${passwordHash} WHERE email = ${email}`
      return NextResponse.json({
        status: "updated",
        email,
        hash_prefix: passwordHash.substring(0, 20) + "...",
      })
    } else {
      // Create user
      const result = await sql`
        INSERT INTO "User" (id, email, name, "passwordHash")
        VALUES (gen_random_uuid()::text, ${email}, 'Admin', ${passwordHash})
        RETURNING id
      `
      return NextResponse.json({
        status: "created",
        email,
        userId: result[0]?.id,
      })
    }
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
