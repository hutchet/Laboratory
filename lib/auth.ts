// Auth.js (NextAuth v5) config khung -- can `npm install` roi dien AUTH_SECRET + DATABASE_URL truoc khi chay thu
// Xem README.md muc "Buoc 2 - Authentication" de biet cac buoc con lai.
import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import { PrismaAdapter } from "@auth/prisma-adapter"
import bcrypt from "bcryptjs"
import { db } from "@/lib/db"

// Secret explicitly from env — required on Cloudflare Workers
const secret = process.env.AUTH_SECRET
if (!secret) throw new Error("AUTH_SECRET not set")

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(db),
  secret,
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
          const valid = await bcrypt.compare(credentials.password as string, user.passwordHash)
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
