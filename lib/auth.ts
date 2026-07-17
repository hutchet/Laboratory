import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import { PrismaAdapter } from "@auth/prisma-adapter"
import bcrypt from "bcryptjs"
import { db } from "@/lib/db"

// Secret: prefer AUTH_SECRET env var, fallback to static for Cloudflare Workers compatibility
const AUTH_SECRET = process.env.AUTH_SECRET || "taskflow-secret-key-2026-lab-only"

// SHA-256 verify using Web Crypto API (works on Cloudflare Workers, no polyfill needed)
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
  adapter: PrismaAdapter(db),
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
          const user = await db.user.findUnique({ where: { email: credentials.email as string } })
          if (!user?.passwordHash) return null

          let valid = false
          const hash = user.passwordHash

          if (hash.startsWith("sha256:")) {
            // Cloudflare Workers — use Web Crypto
            valid = await verifySha256(credentials.password as string, hash.slice(7))
          } else {
            // Vercel / local — use bcryptjs
            valid = await bcrypt.compare(credentials.password as string, hash)
          }

          if (!valid) return null
          return { id: user.id, email: user.email, name: user.name ?? undefined }
        } catch (e) {
          console.error("authorize error:", e)
          return null
        }
      },
    }),
  ],
})
