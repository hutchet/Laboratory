"use client"
import { useMemo, useState, useTransition } from "react"
import { PageShell } from "@/shared/ui/page-shell"
import { FilterBar } from "@/shared/ui/filter-bar"
import { DataTable, type DataTableColumn } from "@/shared/ui/data-table"
import { FormModal } from "@/shared/ui/form-modal"
import { ConfirmDialog } from "@/shared/ui/confirm-dialog"
import { AvatarInitials } from "@/shared/ui/avatar-initials"
import { CustomSelect } from "@/shared/ui/custom-select"
import { StatusBadge } from "@/shared/ui/status-badge"
import { KpiCard } from "@/shared/ui/kpi-card"
import { Perm } from "@/shared/lib/rbac-client"
import { saveMember, deleteMember, resetMemberPassword, bulkDeleteMembers } from "../actions"
import { ACCESS_ROLE_LABEL, NEW_ACCESS_ROLE_OPTIONS, type MemberRow } from "../types"
import type { CurrentMemberInfo } from "../queries"
import type { Option } from "@/features/projects/types"

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(-2).map((w) => w[0]).join("").toUpperCase()
}

export function MembersView({
  members,
  currentMember,
  centerOptions = [],
  groupOptions = [],
}: {
  members: MemberRow[]
  currentMember?: CurrentMemberInfo
  centerOptions?: Option[]
  groupOptions?: Array<Option & { centerId: string }>
}) {
  const [q, setQ] = useState("")
  const [editing, setEditing] = useState<MemberRow | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [formCenterId, setFormCenterId] = useState<string>("")
  const [mGroupId, setMGroupId] = useState("")
  const [mGender, setMGender] = useState("")
  const [mAccessRole, setMAccessRole] = useState("")
  // Bao cao 1:40 PM muc 5b: gop lua chon "Tat ca trung tam" vao chinh droplist
  // Trung tam thay vi chi co checkbox rieng o duoi - chon muc nay se tu dong
  // bat allCenters va bo chon trung tam cu the.
  const [mAllCenters, setMAllCenters] = useState(false)
  const [pending, startTransition] = useTransition()
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [bulkConfirm, setBulkConfirm] = useState(false)
  const [editMode, setEditMode] = useState(false)
  // Additive — đặt lại mật khẩu đăng nhập cho thành viên (yêu cầu: admin có quyền
  // reset mật khẩu của user). Chỉ hiện với Perm minPerm="dept_head" ở cột hành động.
  const [resetPasswordFor, setResetPasswordFor] = useState<MemberRow | null>(null)
  const [resetPasswordValue, setResetPasswordValue] = useState("")
  const [resetPasswordError, setResetPasswordError] = useState<string | null>(null)
  // Additive — yeu cau them che do gan anh avatar vao tai khoan: preview + crop UI.
  // Nguoi dung chon file -> hien thi anh goc + 3 slider vi tri/do lon -> bam Confirm -> cat
  // xuong 240x240 (giu ty le canvas) -> luu vao avatarPreview (data URI base64 JPEG).
  const [avatarRawUrl, setAvatarRawUrl] = useState<string | null>(null)
  const [avatarCrop, setAvatarCrop] = useState({ x: 0, y: 0, size: 100 })
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [avatarError, setAvatarError] = useState<string | null>(null)

  const filtered = useMemo(() => members.filter((m) => !q || m.name.toLowerCase().includes(q.toLowerCase())), [members, q])

  // 4 the KPI dau trang (muc 4d) — bo sung moi vi trang Thanh vien truoc day khong co
  // hang KPI nao. Trend dung cung phong cach snapshot theo Member.createdAt nhu Cong viec.
  const kpi = useMemo(() => ({
    total: members.length,
    managers: members.filter((m) => ["admin", "director", "dept_head"].includes(m.accessRole ?? "")).length,
    assigned: members.filter((m) => !!m.centerId).length,
    unassigned: members.filter((m) => !m.centerId).length,
  }), [members])

  const kpiTrends = useMemo(() => {
    const now = Date.now()
    const day = 86400000
    function snapshot(asOfMs: number) {
      const list = members.filter((m) => new Date(m.createdAt).getTime() <= asOfMs)
      return {
        total: list.length,
        managers: list.filter((m) => ["admin", "director", "dept_head"].includes(m.accessRole ?? "")).length,
        assigned: list.filter((m) => !!m.centerId).length,
        unassigned: list.filter((m) => !m.centerId).length,
      }
    }
    function pctChg(curr: number, prev: number) {
      if (prev === 0) return { pct: curr > 0 ? 100 : 0, up: curr >= prev }
      return { pct: Math.round((Math.abs(curr - prev) / prev) * 100), up: curr >= prev }
    }
    function sparklineFor(key: "total" | "managers" | "assigned" | "unassigned") {
      const pts: number[] = []
      for (let i = 6; i >= 0; i--) pts.push(snapshot(now - i * day)[key])
      return pts
    }
    const curr = snapshot(now)
    const prev = snapshot(now - 7 * day)
    const keys = ["total", "managers", "assigned", "unassigned"] as const
    return Object.fromEntries(keys.map((k) => [k, { ...pctChg(curr[k], prev[k]), sparkline: sparklineFor(k) }])) as Record<typeof keys[number], { pct: number; up: boolean; sparkline: number[] }>
  }, [members])
  const groupOptionsForForm = useMemo(() => groupOptions.filter((g) => !formCenterId || g.centerId === formCenterId), [groupOptions, formCenterId])

  function openNew() { setEditing(null); setFormCenterId(""); setMGroupId(""); setMGender(""); setMAccessRole("viewer"); setMAllCenters(false); setAvatarPreview(null); setAvatarError(null); setShowForm(true) }
  // Fix bao cao 1:40 PM muc 5a: Gioi tinh/Phan quyen (va Nhom van hanh/Tat ca
  // trung tam) la CustomSelect dieu khien boi state rieng (mGender/mAccessRole/
  // mGroupId/mAllCenters) chu khong dung defaultValue nhu cac input thuong, nen
  // truoc day openEdit khong set lai cac state nay -> luon hien trong khi sua.
  function openEdit(m: MemberRow) { setEditing(m); setFormCenterId(m.allCenters ? "" : (m.centerId ?? "")); setMGroupId(m.groupId ?? ""); setMGender(m.gender ?? ""); setMAccessRole(m.accessRole ?? "viewer"); setMAllCenters(m.allCenters ?? false); setAvatarPreview(m.avatar ?? null); setAvatarError(null); setShowForm(true) }
  // Additive — doc file anh nguoi dung chon, nen kich thuoc xuong toi da 240x240 (giu ty le,
  // qua canvas) roi xuat ra JPEG chat luong 0.85 truoc khi luu data URI vao avatarPreview, de
  // tranh luu anh goc qua nang (co the vai MB) vao DB dang text.
  function handleAvatarFile(file: File | null) {
    setAvatarError(null)
    if (!file) return
    if (!file.type.startsWith("image/")) { setAvatarError("Vui lòng chọn một tệp hình ảnh"); return }
    const reader = new FileReader()
    reader.onload = () => {
      const img = new Image()
      img.onload = () => {
        const maxSize = 240
        const scale = Math.min(1, maxSize / Math.max(img.width, img.height))
        const w = Math.max(1, Math.round(img.width * scale))
        const h = Math.max(1, Math.round(img.height * scale))
        const canvas = document.createElement("canvas")
        canvas.width = w
        canvas.height = h
        const ctx = canvas.getContext("2d")
        if (!ctx) { setAvatarError("Không thể xử lý ảnh này"); return }
        ctx.drawImage(img, 0, 0, w, h)
        setAvatarPreview(canvas.toDataURL("image/jpeg", 0.85))
      }
      img.onerror = () => setAvatarError("Không thể đọc ảnh này")
      img.src = String(reader.result)
    }
    reader.onerror = () => setAvatarError("Không thể đọc tệp này")
    reader.readAsDataURL(file)
  }
  function handleSubmit(formData: FormData) {
    const input = {
      id: editing?.id,
      name: String(formData.get("name") || ""),
      code: String(formData.get("code") || ""),
      email: String(formData.get("email") || ""),
      gender: String(formData.get("gender") || ""),
      team: String(formData.get("team") || ""),
      accessRole: String(formData.get("accessRole") || "viewer"),
      avatar: String(formData.get("avatar") || "") || null,
      password: String(formData.get("password") || "") || undefined,
      centerId: String(formData.get("centerId") || "") || null,
      groupId: String(formData.get("groupId") || "") || null,
      isOperations: formData.get("isOperations") === "on",
      allCenters: formData.get("allCenters") === "on",
    }
    startTransition(async () => { await saveMember(input); setShowForm(false); setEditing(null) })
  }
  function confirmDelete() {
    if (!confirmDeleteId) return
    const id = confirmDeleteId
    startTransition(async () => { await deleteMember(id); setConfirmDeleteId(null) })
  }
  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }
  const allSelected = filtered.length > 0 && filtered.every((m) => selected.has(m.id))
  function toggleSelectAll() {
    setSelected((prev) => (allSelected ? new Set() : new Set(filtered.map((m) => m.id))))
  }
  function toggleEditMode() {
    setEditMode((v) => { if (v) setSelected(new Set()); return !v })
  }
  function confirmBulkDelete() {
    const ids = Array.from(selected)
    startTransition(async () => { await bulkDeleteMembers(ids); setSelected(new Set()); setBulkConfirm(false) })
  }
  function closeResetPassword() { setResetPasswordFor(null); setResetPasswordValue(""); setResetPasswordError(null) }
  function submitResetPassword() {
    if (!resetPasswordFor) return
    if (resetPasswordValue.trim().length < 6) { setResetPasswordError("Mật khẩu mới phải có ít nhất 6 ký tự"); return }
    const id = resetPasswordFor.id
    const newPassword = resetPasswordValue.trim()
    startTransition(async () => {
      try {
        await resetMemberPassword(id, newPassword)
        closeResetPassword()
      } catch (e) {
        setResetPasswordError(e instanceof Error ? e.message : "Có lỗi xảy ra")
      }
    })
  }

  const columns: Array<DataTableColumn<MemberRow>> = [
    ...(editMode
      ? [{
          key: "sel", header: <input type="checkbox" checked={allSelected} onChange={toggleSelectAll} />, defaultWidth: 44,
          render: (m: MemberRow) => <input type="checkbox" checked={selected.has(m.id)} onClick={(e) => e.stopPropagation()} onChange={() => toggleSelect(m.id)} />,
        } as DataTableColumn<MemberRow>]
      : []),
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
    { key: "team", header: "Nhóm (tằng)", render: (m) => m.team ?? "—" },
    {
      key: "center", header: "Trung tâm",
      render: (m) => m.allCenters
        ? <StatusBadge label="Toàn bộ Trung tâm" tone="success" />
        : m.isOperations
        ? <StatusBadge label="Nhóm vận hành (xem chéo)" tone="success" />
        : (m.centerName ?? "—"),
    },
    { key: "group", header: "Nhóm vận hành", render: (m) => m.groupName ?? "—" },
    { key: "accessRole", header: "Quyền", render: (m) => <StatusBadge label={ACCESS_ROLE_LABEL[m.accessRole ?? "viewer"] ?? m.accessRole ?? "—"} tone="info" /> },
    {
      key: "actions", header: "", align: "right",
      render: (m) =>
        editMode ? (
          <span className="acts" style={{ display: "flex", gap: 8, justifyContent: "flex-end" }} onClick={(e) => e.stopPropagation()}>
            <Perm minPerm="dept_head">
              <button type="button" className="txt-act" onClick={() => { setResetPasswordFor(m); setResetPasswordValue(""); setResetPasswordError(null) }}>Đặt lại MK</button>
            </Perm>
            <Perm minPerm="director">
              <button type="button" className="txt-act pri" onClick={() => openEdit(m)}>Sửa</button>
              <button type="button" className="txt-act del" onClick={() => setConfirmDeleteId(m.id)}>Xoá</button>
            </Perm>
          </span>
        ) : null,
    },
  ]

  return (
    <PageShell title="Thành viên">
      <div className="kpis-tier" style={{ marginBottom: 20 }}>
        <KpiCard label="Tổng thành viên" value={kpi.total} tone="blue" trend={kpiTrends.total} />
        <KpiCard label="Quản lý" value={kpi.managers} tone="danger" trend={kpiTrends.managers} />
        <KpiCard label="Đã gán trung tâm" value={kpi.assigned} tone="success" trend={kpiTrends.assigned} />
        <KpiCard label="Chưa gán trung tâm" value={kpi.unassigned} tone="warning" trend={kpiTrends.unassigned} />
      </div>
      <div className="section-head">
        <h3>Tất cả thành viên</h3>
        <div className="tools">
          <FilterBar search={{ value: q, onChange: setQ, placeholder: "Tìm thành viên..." }} />
          <Perm minPerm="director">
            <span style={{ display: "flex", gap: 8 }}>
              {editMode && (
                <button type="button" className="btn-danger" disabled={!selected.size} onClick={() => setBulkConfirm(true)} style={{ opacity: selected.size ? 1 : 0.5 }}>Xoá tất cả</button>
              )}
              <button type="button" className={editMode ? "btn-success" : "btn-line"} onClick={toggleEditMode}>{editMode ? "Xong" : "Chỉnh sửa"}</button>
              <button type="button" className="btn-pri" onClick={openNew}>+ Thêm thành viên</button>
            </span>
          </Perm>
        </div>
      </div>
      {currentMember && (
        // Ported from the original's .adminbar block (#page-members): shows the
        // currently logged-in account with avatar initials, name, email, and role badge.
        // Additive: khi thành viên đã gắn ảnh avatar thì hiện ảnh đó thay cho initials.
        // Additive: thêm nút "Chỉnh sửa" để thành viên tự sửa thông tin của mình (kể cả admin).
        <div style={{ display: "flex", alignItems: "center", gap: 13, background: "linear-gradient(135deg,#eef2ff,#e7ecff)", border: "1px solid #e0e7ff", borderRadius: 14, padding: "14px 16px", marginBottom: 18 }}>
          <AvatarInitials name={currentMember.name} size={44} src={currentMember.avatar} />
          <div>
            <div style={{ fontWeight: 600, fontSize: 14 }}>{currentMember.name}</div>
            <div style={{ fontSize: 12, color: "#6b7280" }}>{currentMember.email ?? "—"}</div>
          </div>
          <span style={{ fontSize: 11, fontWeight: 600, color: "#1d5fd6", background: "#fff", borderRadius: 20, padding: "4px 11px", marginLeft: "auto" }}>
            {currentMember.accessRole === "admin" ? "★ " : ""}{ACCESS_ROLE_LABEL[currentMember.accessRole ?? "viewer"] ?? currentMember.accessRole ?? "—"}
          </span>
          <button type="button" className="txt-act pri" onClick={() => {
            const m = members.find(m => m.id === currentMember.id)
            if (m) openEdit(m)
          }} style={{ fontSize: 12, fontWeight: 600 }}>Chỉnh sửa</button>
        </div>
      )}
      <DataTable columns={columns} rows={filtered} rowKey={(m) => m.id} loading={pending} emptyTitle="Chưa có thành viên nào" onRowClick={(m) => openEdit(m)} resizable maxBodyHeight={560} fillHeight />

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
          <input type="hidden" name="centerId" value={formCenterId} />
          <input type="hidden" name="groupId" value={mGroupId} />
          <div className="row">
            <div className="field" style={{ flex: 1 }}>
              <label>Trung tâm</label>
              <CustomSelect
                value={mAllCenters ? "__ALL__" : formCenterId}
                onChange={(v) => { if (v === "__ALL__") { setMAllCenters(true); setFormCenterId("") } else { setMAllCenters(false); setFormCenterId(v) } }}
                width="100%"
                options={[{ value: "", label: "— Chưa gán —" }, { value: "__ALL__", label: "Tất cả trung tâm" }, ...centerOptions.map((c) => ({ value: c.id, label: c.name }))]}
              />
            </div>
            <div className="field" style={{ flex: 1 }}>
              <label>Nhóm vận hành (trong Trung tâm)</label>
              <CustomSelect value={mGroupId} onChange={setMGroupId} width="100%" options={[{ value: "", label: "— Chưa gán —" }, ...groupOptionsForForm.map((g) => ({ value: g.id, label: g.name }))]} />
            </div>
          </div>
          <label style={{ fontSize: 12, fontWeight: 600, display: "flex", alignItems: "center", gap: 8 }}>
            <input type="checkbox" name="isOperations" defaultChecked={editing?.isOperations ?? false} />
            Thuộc Nhóm vận hành (xem chéo tất cả Trung tâm ở các module dùng chung: thiết bị, khấu hao, chi phí biến đổi, chất lượng, kế hoạch kiểm toán)
          </label>
          <label style={{ fontSize: 12, fontWeight: 600, display: "flex", alignItems: "center", gap: 8 }}>
            <input type="checkbox" name="allCenters" checked={mAllCenters} onChange={(e) => setMAllCenters(e.target.checked)} />
            Toàn bộ Trung tâm (xem/thao tác dữ liệu ở TẤT CẢ Trung tâm, mọi module — không giới hạn theo Trung tâm/Nhóm, không đổi Phân quyền) — có thể chọn nhanh qua mục "Tất cả trung tâm" ở droplist Trung tâm phía trên
          </label>
          <input type="hidden" name="gender" value={mGender} />
          <input type="hidden" name="accessRole" value={mAccessRole} />
          <div className="field">
            <label>Giới tính</label>
            <CustomSelect value={mGender} onChange={setMGender} width="100%" options={[{ value: "", label: "—" }, { value: "Nam", label: "Nam" }, { value: "Nữ", label: "Nữ" }]} />
          </div>
          <div className="field">
            <label>Phân quyền</label>
            <CustomSelect value={mAccessRole} onChange={setMAccessRole} width="100%" options={NEW_ACCESS_ROLE_OPTIONS.map((opt) => ({ value: opt.value, label: opt.label }))} />
          </div>
          {/* Ảnh đại diện — chọn file ảnh, tự động resize xuống 240px, preview + data URI */}
          <label style={{ fontSize: 12, fontWeight: 600 }}>Ảnh đại diện
            <input type="file" accept="image/*" onChange={(e) => handleAvatarFile(e.target.files?.[0] ?? null)} style={{ width: "100%", fontSize: 13, marginTop: 4 }} />
            {avatarPreview && <img src={avatarPreview} alt="avatar preview" style={{ width: 72, height: 72, borderRadius: 8, objectFit: "cover", marginTop: 6, border: "1px solid #dfe3e8" }} />}
            {avatarError && <span style={{ display: "block", fontSize: 11, color: "#c62828", marginTop: 2 }}>{avatarError}</span>}
            <span style={{ display: "block", fontSize: 11, color: "#6b7280", marginTop: 2 }}>Chọn ảnh JPEG/PNG, tự động nén xuống 240px. Để trống nếu không muốn đổi ảnh.</span>
          </label>
          <input type="hidden" name="avatar" value={avatarPreview ?? ""} />
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

      <FormModal
        open={!!resetPasswordFor}
        title={`Đặt lại mật khẩu — ${resetPasswordFor?.name ?? ""}`}
        onClose={closeResetPassword}
        onSubmit={submitResetPassword}
        submitLabel="Đặt lại mật khẩu"
        submitting={pending}
      >
        {resetPasswordFor && !resetPasswordFor.email ? (
          <p style={{ fontSize: 12.5, color: "#c62828", background: "#fdecec", borderRadius: 8, padding: "8px 10px", margin: 0 }}>
            Thành viên này chưa có email nên chưa thể có tài khoản đăng nhập — hãy thêm email ở form Sửa thành viên trước.
          </p>
        ) : (
          <>
            <label style={{ fontSize: 12, fontWeight: 600 }}>Mật khẩu mới
              <input
                type="password"
                value={resetPasswordValue}
                onChange={(e) => setResetPasswordValue(e.target.value)}
                placeholder="Ít nhất 6 ký tự"
                autoFocus
                style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid #dfe3e8", marginTop: 4 }}
              />
            </label>
            <span style={{ display: "block", fontSize: 11, color: "#6b7280" }}>
              Thành viên sẽ đăng nhập bằng email hoặc mã nhân viên hiện có kèm mật khẩu mới này.
            </span>
          </>
        )}
        {resetPasswordError && <p style={{ fontSize: 12, color: "#c62828", margin: 0 }}>{resetPasswordError}</p>}
      </FormModal>

      <ConfirmDialog open={!!confirmDeleteId} title="Xoá thành viên?" description="Hành động này không thể hoàn tác." danger onConfirm={confirmDelete} onCancel={() => setConfirmDeleteId(null)} />
      <ConfirmDialog open={bulkConfirm} title="Xoá các thành viên đã chọn?" description={`Sẽ xoá ${selected.size} thành viên đã chọn. Hành động này không thể hoàn tác.`} danger onConfirm={confirmBulkDelete} onCancel={() => setBulkConfirm(false)} />
    </PageShell>
  )
}

export default MembersView
