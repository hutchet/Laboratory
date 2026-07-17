import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import bcrypt from "bcryptjs"
import { neon } from "@neondatabase/serverless"

// Raw SQL — bypass Prisma to avoid DateTime serialization bug on Workers
async function queryUser(email: string) {
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) throw new Error("DATABASE_URL not set")
  const sql = neon(connectionString)
  const rows = await sql`SELECT id, name, email, "passwordHash" FROM "User" WHERE email = ${email} LIMIT 1`
  return rows[0] || null
}

const AUTH_SECRET = process.env.AUTH_SECRET || "taskflow-secret-key-2026-lab-only"

// SHA-256 verify using Web Crypto API (works on Cloudflare Workers)
async function verifySha256(password: string, storedHash: string): Promise<boolean> {
  try {
    const enc = new TextEncoder()
    const hashBuf = await crypto.subtle.digest("SHA-256", enc.encode(password))
    const hashHex = Array.from(new Uint8Array(hashBuf)).map(b => b.toString(16).padStart(2, "0")).join("")
    return hashHex === storedHash
  } catch {
    return false
  }
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  secret: AUTH_SECRET,
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  callbacks: {
    jwt({ token, user }) {
      if (user) token.id = user.id
      return token
    },
    session({ session, token }) {
      if (session.user) session.user.id = token.id as string
      return session
    },
  },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (credentials) => {
        if (!credentials?.email || !credentials?.password) return null
        try {
          const user = await queryUser(credentials.email as string)
          if (!user?.passwordHash) {
            console.error("auth: no passwordHash for user")
            return null
          }

          let valid = false
          const hash = user.passwordHash

          if (hash.startsWith("sha256:")) {
            valid = await verifySha256(credentials.password as string, hash.slice(7))
          } else {
            valid = await bcrypt.compare(credentials.password as string, hash)
          }

          if (!valid) {
            console.error("auth: password mismatch")
            return null
          }

          return { id: user.id, email: user.email, name: user.name ?? undefined }
        } catch (e) {
          console.error("authorize error:", e instanceof Error ? e.message : String(e))
          return null
        }
      },
    }),
  ],
})
