"use client"
import { useMemo, useState, useTransition } from "react"
import { PageShell } from "@/shared/ui/page-shell"
import { FilterBar } from "@/shared/ui/filter-bar"
import { DataTable, type DataTableColumn } from "@/shared/ui/data-table"
import { FormModal } from "@/shared/ui/form-modal"
import { ConfirmDialog } from "@/shared/ui/confirm-dialog"
import { AvatarInitials } from "@/shared/ui/avatar-initials"
import { StatusBadge } from "@/shared/ui/status-badge"
import { Perm } from "@/shared/lib/rbac-client"
import { saveMember, deleteMember } from "../actions"
import { ACCESS_ROLE_LABEL, type MemberRow } from "../types"
import type { CurrentMemberInfo } from "../queries"

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(-2).map((w) => w[0]).join("").toUpperCase()
}

export function MembersView({ members, currentMember }: { members: MemberRow[]; currentMember?: CurrentMemberInfo }) {
  const [q, setQ] = useState("")
  const [editing, setEditing] = useState<MemberRow | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const filtered = useMemo(() => members.filter((m) => !q || m.name.toLowerCase().includes(q.toLowerCase())), [members, q])

  function openNew() { setEditing(null); setShowForm(true) }
  function openEdit(m: MemberRow) { setEditing(m); setShowForm(true) }
  function handleSubmit(formData: FormData) {
    const input = {
      id: editing?.id,
      name: String(formData.get("name") || ""),
      code: String(formData.get("code") || ""),
      email: String(formData.get("email") || ""),
      gender: String(formData.get("gender") || ""),
      team: String(formData.get("team") || ""),
      accessRole: String(formData.get("accessRole") || "viewer"),
      password: String(formData.get("password") || "") || undefined,
    }
    startTransition(async () => { await saveMember(input); setShowForm(false); setEditing(null) })
  }
  function confirmDelete() {
    if (!confirmDeleteId) return
    const id = confirmDeleteId
    startTransition(async () => { await deleteMember(id); setConfirmDeleteId(null) })
  }

  const columns: Array<DataTableColumn<MemberRow>> = [
    {
      key: "name", header: "Thành viên",
      render: (m) => (
        <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <AvatarInitials name={m.name} size={26} />
          <span style={{ fontWeight: 600 }}>{m.name}</span>
        </span>
      ),
    },
    { key: "code", header: "Mã", render: (m) => m.code ?? "—" },
    { key: "email", header: "Email", render: (m) => m.email ?? "—" },
    {
      // Ported from renderMembers() (dòng 5204-5214): huy hiệu giới tính màu theo Nam/Nữ.
      key: "gender", header: "Giới tính",
      render: (m) => {
        const tone = m.gender === "Nam" ? { background: "#eaf1ff", color: "#4f6cf7" } : m.gender === "Nữ" ? { background: "#fdeef4", color: "#db2777" } : { background: "#f1f3f5", color: "#6b7280" }
        return <span style={{ ...tone, fontSize: 11, fontWeight: 600, borderRadius: 999, padding: "3px 10px" }}>{m.gender || "—"}</span>
      },
    },
    { key: "team", header: "Nhóm", render: (m) => m.team ?? "—" },
    { key: "accessRole", header: "Quyền", render: (m) => <StatusBadge label={ACCESS_ROLE_LABEL[m.accessRole ?? "viewer"] ?? m.accessRole ?? "—"} tone="info" /> },
    {
      key: "actions", header: "", align: "right",
      render: (m) => (
        <span style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <Perm minPerm="admin"><button type="button" onClick={() => openEdit(m)} style={{ border: "none", background: "none", color: "#1d5fd6", cursor: "pointer" }}>Sửa</button>
          <button type="button" onClick={() => setConfirmDeleteId(m.id)} style={{ border: "none", background: "none", color: "#c62828", cursor: "pointer" }}>Xoá</button></Perm>
        </span>
      ),
    },
  ]

  return (
    <PageShell
      title="Thành viên"
      actions={<Perm minPerm="admin"><button type="button" onClick={openNew} style={{ padding: "8px 14px", borderRadius: 8, border: "none", background: "#1d5fd6", color: "#fff" }}>+ Thêm thành viên</button></Perm>}
      filters={<FilterBar search={{ value: q, onChange: setQ, placeholder: "Tìm thành viên..." }} />}
    >
      {currentMember && (
        // Ported from the original's .adminbar block (#page-members): shows the
        // currently logged-in account with avatar initials, name, email, and role badge.
        <div style={{ display: "flex", alignItems: "center", gap: 13, background: "linear-gradient(135deg,#eef2ff,#e7ecff)", border: "1px solid #e0e7ff", borderRadius: 14, padding: "14px 16px", marginBottom: 18 }}>
          <span style={{ width: 44, height: 44, borderRadius: 11, background: "linear-gradient(135deg,#5b7bff,#3a55d9)", color: "#fff", display: "grid", placeItems: "center", fontWeight: 600, fontSize: 15 }}>
            {initials(currentMember.name)}
          </span>
          <div>
            <div style={{ fontWeight: 600, fontSize: 14 }}>{currentMember.name}</div>
            <div style={{ fontSize: 12, color: "#6b7280" }}>{currentMember.email ?? "—"}</div>
          </div>
          <span style={{ fontSize: 11, fontWeight: 600, color: "#1d5fd6", background: "#fff", borderRadius: 20, padding: "4px 11px", marginLeft: "auto" }}>
            {currentMember.accessRole === "admin" ? "★ " : ""}{ACCESS_ROLE_LABEL[currentMember.accessRole ?? "viewer"] ?? currentMember.accessRole ?? "—"}
          </span>
        </div>
      )}
      <DataTable columns={columns} rows={filtered} rowKey={(m) => m.id} loading={pending} emptyTitle="Chưa có thành viên nào" />

      <FormModal
        open={showForm}
        title={editing ? "Sửa thành viên" : "Thêm thành viên"}
        onClose={() => { setShowForm(false); setEditing(null) }}
        onSubmit={() => {
          const form = document.getElementById("tf-member-form") as HTMLFormElement | null
          if (form) handleSubmit(new FormData(form))
        }}
        submitting={pending}
      >
        <form key={editing?.id ?? "new"} id="tf-member-form" onSubmit={(e) => e.preventDefault()} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <label style={{ fontSize: 12, fontWeight: 600 }}>Tên *
            <input name="name" required defaultValue={editing?.name ?? ""} style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid #dfe3e8", marginTop: 4 }} />
          </label>
          <div style={{ display: "flex", gap: 12 }}>
            <label style={{ fontSize: 12, fontWeight: 600, flex: 1 }}>Mã
              <input name="code" defaultValue={editing?.code ?? ""} style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid #dfe3e8", marginTop: 4 }} />
            </label>
            <label style={{ fontSize: 12, fontWeight: 600, flex: 1 }}>Nhóm
              <input name="team" defaultValue={editing?.team ?? ""} style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid #dfe3e8", marginTop: 4 }} />
            </label>
          </div>
          <label style={{ fontSize: 12, fontWeight: 600 }}>Email
            <input name="email" type="email" defaultValue={editing?.email ?? ""} style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid #dfe3e8", marginTop: 4 }} />
          </label>
          <label style={{ fontSize: 12, fontWeight: 600 }}>Giới tính
            <select name="gender" defaultValue={editing?.gender ?? ""} style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid #dfe3e8", marginTop: 4 }}>
              <option value="">—</option>
              <option value="Nam">Nam</option>
              <option value="Nữ">Nữ</option>
            </select>
          </label>
          <label style={{ fontSize: 12, fontWeight: 600 }}>Phân quyền
            <select name="accessRole" defaultValue={editing?.accessRole ?? "viewer"} style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid #dfe3e8", marginTop: 4 }}>
              <option value="admin">Quản trị</option>
              <option value="manager">Quản lý</option>
              <option value="technician">Kỹ thuật viên</option>
              <option value="quote_staff">Nhân viên báo giá</option>
              <option value="viewer">Chỉ xem</option>
            </select>
          </label>
          {/* Sửa lỗi phát hiện khi rà lại P0: trước đây không có cách nào tạo/đổi mật khẩu
              đăng nhập thật (User.passwordHash) từ trang này, nên đổi "Phân quyền" ở trên
              chỉ đổi phần hiển thị, không đổi được quyền thực thi ở server. Ô này là tuỳ chọn —
              chỉ cần nhập khi muốn tạo tài khoản đăng nhập mới hoặc đổi mật khẩu hiện có; để
              trống thì Phân quyền vẫn được đồng bộ vào tài khoản đã có (nếu email đã có User). */}
          <label style={{ fontSize: 12, fontWeight: 600 }}>Mật khẩu đăng nhập (tuỳ chọn)
            <input name="password" type="password" placeholder="Để trống nếu không tạo/đổi mật khẩu" style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid #dfe3e8", marginTop: 4 }} />
            <span style={{ display: "block", fontSize: 11, color: "#6b7280", marginTop: 2 }}>Nhập để tạo tài khoản đăng nhập ứng với email trên, hoặc đổi mật khẩu tài khoản đã có.</span>
          </label>
        </form>
      </FormModal>

      <ConfirmDialog open={!!confirmDeleteId} title="Xoá thành viên?" description="Hành động này không thể hoàn tác." danger onConfirm={confirmDelete} onCancel={() => setConfirmDeleteId(null)} />
    </PageShell>
  )
}

export default MembersView
