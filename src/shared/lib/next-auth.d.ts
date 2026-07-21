// Additive (thiet ke 6 cap bac + phan vung theo Trung tam/Nhom van hanh) — mo rong kieu
// JWT/Session cua next-auth de nhung rank/centerId/groupId/isOperations/modulePerms vao
// session, dung o auth.ts (callbacks.jwt/session) va shared/lib/rbac-client.tsx.
import type { DefaultSession } from "next-auth"
import type { DefaultJWT } from "next-auth/jwt"

declare module "next-auth" {
	interface Session {
		user?: DefaultSession["user"] & {
			id?: string
			rank?: string
			centerId?: string | null
			centerName?: string | null
			groupId?: string | null
			isOperations?: boolean
			modulePerms?: string[]
		}
	}
}

declare module "next-auth/jwt" {
	interface JWT extends DefaultJWT {
		id?: string
		rank?: string
		centerId?: string | null
		centerName?: string | null
		groupId?: string | null
		isOperations?: boolean
		modulePerms?: string[]
	}
}
