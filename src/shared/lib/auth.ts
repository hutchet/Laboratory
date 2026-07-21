import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import { PrismaAdapter } from "@auth/prisma-adapter"
import bcrypt from "bcryptjs"
import { db } from "@/shared/lib/db"
import { getUserRbacContext } from "@/shared/lib/rbac"

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
    async jwt({ token, user, trigger }) {
      if (user) {
        token.id = user.id
        // Preserve name and email so session always has display info
        if (user.name) token.name = user.name
        if (user.email) token.email = user.email
      }
      // Additive (thiết kế 6 cấp bậc + phân vùng theo Trung tâm/Nhóm vận hành): nhúng
      // rank/centerId/groupId/isOperations vào JWT ngay khi đăng nhập (trigger=="signIn")
      // hoặc khi chưa có sẵn, để getScopeFilter() ở server dùng được ngay từ session mà
      // không phải query lại DB ở mọi request. Làm mới lại khi client gọi update() (ví dụ
      // sau khi admin đổi phân quyền/Trung tâm của chính người đang đăng nhập).
      if (token.id && (trigger === "signIn" || trigger === "update" || !token.rank)) {
        try {
          const ctx = await getUserRbacContext(token.id as string)
          token.rank = ctx.rank
          token.centerId = ctx.centerId
          token.centerName = ctx.centerName
          token.groupId = ctx.groupId
          token.isOperations = ctx.isOperations
          token.modulePerms = ctx.modulePerms
        } catch (e) {
          console.error("jwt rbac enrich error:", e)
        }
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
        // Additive — surface rbac context on session.user for client (RBACProvider) and
        // server (getScopeFilter) without an extra DB round-trip in most cases.
        ;(session.user as any).rank = token.rank ?? "viewer"
        ;(session.user as any).centerId = token.centerId ?? null
        ;(session.user as any).centerName = token.centerName ?? null
        ;(session.user as any).groupId = token.groupId ?? null
        ;(session.user as any).isOperations = token.isOperations ?? false
        ;(session.user as any).modulePerms = token.modulePerms ?? []
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
