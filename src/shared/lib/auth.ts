import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import { PrismaAdapter } from "@auth/prisma-adapter"
import bcrypt from "bcryptjs"
import { db } from "@/shared/lib/db"

// Secret resolved lazily — Cloudflare Workers only populates process.env at runtime
function getSecret(): string {
  const s = process.env.AUTH_SECRET
  if (!s) return "" // empty = invalid, but won't crash build
  return s
}

const secret = getSecret()

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(db),
  secret: secret || undefined,
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id
        // Preserve name and email so session always has display info
        if (user.name) token.name = user.name
        if (user.email) token.email = user.email
      }
      return token
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
        // Always surface real name from token (falls back to email prefix)
        if (token.name) session.user.name = token.name as string
        else if (token.email) session.user.name = (token.email as string).split("@")[0]
        if (token.email) session.user.email = token.email as string
      }
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
          const valid = await bcrypt.compare(credentials.password as string, user.passwordHash)
          if (!valid) return null
          // Try to get display name from Member record
          const member = await db.member.findFirst({ where: { email: credentials.email as string } })
          return { id: user.id, email: user.email, name: member?.name ?? user.name ?? undefined }
        } catch (e) {
          console.error("authorize error:", e)
          return null
        }
      },
    }),
  ],
})
