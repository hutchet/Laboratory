"use server"

// Port của hàm logAudit(entity, action, target, detail) trong bản HTML gốc.
// Bản gốc ghi vào localStorage (tf_audit_log_v1, tối đa 1000 dòng, mới nhất lên đầu).
// Bản này ghi thẳng vào bảng AuditLog (Postgres) qua Prisma — không giới hạn 1000 dòng
// (Postgres không có giới hạn dung lượng như localStorage), nhưng giữ đúng 4 tham số
// (entity, action, target, detail) và thêm user/role thật từ session hiện tại thay vì
// đọc tay từ getAdmin()/currentPerm() như bản gốc.

import { db } from "@/lib/db"
import { auth } from "@/lib/auth"
import { getUserRbacContext } from "@/lib/rbac"

export type AuditEntity =
	| "task"
	| "project"
	| "member"
	| "equipment"
	| "booking"
	| "customer"
	| "center"
	| "quote"
	| "purchase"
	| "sample"
	| "testplan"
	| "auditplan"
	| "quality"
	| "settings"

export type AuditAction = "create" | "update" | "delete" | "other"

/**
 * Ghi 1 dòng nhật ký hành động người dùng. Không throw nếu ghi lỗi — audit log
 * không được phép làm hỏng hành động nghiệp vụ chính (giống bản gốc: logAudit
 * chạy sau khi đã lưu dữ liệu xong, chỉ là ghi vết, không phải điều kiện chặn).
 */
export async function logAudit(
	entity: AuditEntity,
	action: AuditAction,
	target: string,
	detail: string,
): Promise<void> {
	try {
		const session = await auth()
		const userId = (session?.user as { id?: string } | undefined)?.id
		const userName = session?.user?.name || "Không rõ"
		let roleLabel = ""
		if (userId) {
			const ctx = await getUserRbacContext(userId)
			roleLabel = ctx?.rank || ""
		}
		await db.auditLog.create({
			data: {
				entity,
				action,
				target,
				detail: roleLabel ? `[${roleLabel}] ${detail}` : detail,
				userId: userId || null,
				userName,
			},
		})
	} catch (err) {
		// Không throw — lỗi ghi audit log không được chặn hành động nghiệp vụ chính.
		console.error("logAudit failed", err)
	}
}
