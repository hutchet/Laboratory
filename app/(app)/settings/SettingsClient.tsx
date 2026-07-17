"use client"

import { useEffect, useState } from "react"
import { exportAllData } from "./actions"

const ROLE_OPTIONS = [
  { value: "", label: "Theo Quản trị viên mặc định" },
  { value: "admin", label: "Quản trị" },
  { value: "manager", label: "Quản lý" },
  { value: "technician", label: "Kỹ thuật viên" },
  { value: "viewer", label: "Người xem" },
]

const ROLE_LABELS: Record<string, string> = { admin: "Quản trị", manager: "Quản lý", technician: "Kỹ thuật viên", viewer: "Người xem" }

export default function SettingsClient({ roleLabel }: { roleLabel: string }) {
  const [theme, setTheme] = useState("light")
  const [font, setFont] = useState("normal")
  const [activeRole, setActiveRole] = useState("")
  const [backupMeta, setBackupMeta] = useState<string | null>(null)
  const [dbStatus, setDbStatus] = useState("Chưa chọn thư mục database")

  useEffect(() => {
    const t = localStorage.getItem("tf-theme") || "light"
    const f = localStorage.getItem("tf-font") || "normal"
    const r = localStorage.getItem("tf-active-role") || ""
    setTheme(t); setFont(f); setActiveRole(r)
    document.documentElement.setAttribute("data-theme", t)
  }, [])

  function changeTheme(v: string) {
    setTheme(v)
    localStorage.setItem("tf-theme", v)
    document.documentElement.setAttribute("data-theme", v)
  }
  function changeFont(v: string) {
    setFont(v)
    localStorage.setItem("tf-font", v)
  }
  function changeRole(v: string) {
    setActiveRole(v)
    localStorage.setItem("tf-active-role", v)
  }
  function resetTheme() {
    changeTheme("light")
    changeFont("normal")
  }
  async function backupData() {
    setBackupMeta("Đang xuất dữ liệu...")
    try {
      const snapshot = await exportAllData()
      const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: "application/json" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `taskflow-backup-${new Date().toISOString().slice(0, 10)}.json`
      a.click()
      URL.revokeObjectURL(url)
      setBackupMeta(`Đã sao lưu lúc ${new Date().toLocaleString("vi-VN")}`)
    } catch {
      setBackupMeta("Sao lưu thất bại, vui lòng thử lại.")
    }
  }
  function clearLocal() {
    if (!confirm("Xóa toàn bộ cài đặt hiển thị lưu trên máy này?")) return
    localStorage.removeItem("tf-theme")
    localStorage.removeItem("tf-font")
    localStorage.removeItem("tf-active-role")
    resetTheme()
    changeRole("")
  }
  function restoreData() {
    document.getElementById("set-file-restore")?.click()
  }
  function onRestoreFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    alert("Khôi phục dữ liệu đầy đủ cần endpoint import trên server — sẽ được bổ sung ở bản sau.")
  }
  function chooseDbFolder() {
    alert("Tính năng thư mục database offline cần File System Access API trên Chrome/Edge — sẽ được bổ sung ở bản sau.")
  }

  return (
    <section id="page-settings">
      <div className="card" style={{ marginBottom: 18 }}>
        <div className="ch"><h3>Vai trò & phân quyền</h3><span>Chọn vai trò bạn đang thao tác trong phiên này</span></div>
        <div className="th-row">
          <label>Vai trò hiện tại của bạn</label>
          <select id="set-active-role" value={activeRole} onChange={(e) => changeRole(e.target.value)}>
            {ROLE_OPTIONS.map((r) => (<option key={r.value} value={r.value}>{r.label}</option>))}
          </select>
        </div>
        <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 6, lineHeight: 1.6 }}>
          Vai trò hiện tại: <b id="active-role-badge" style={{ color: "var(--ink)" }}>{activeRole ? ROLE_LABELS[activeRole] : roleLabel}</b><br />
          <b>Quản trị</b>: toàn quyền, kể cả quản lý thành viên/phân quyền.<br />
          <b>Quản lý</b>: tạo/sửa/xóa dự án, thiết bị, mẫu, bài thử — trừ quản lý thành viên.<br />
          <b>Kỹ thuật viên</b>: đặt lịch thiết bị, thêm/cập nhật kết quả bài thử — không được tạo/xóa mẫu, thiết bị, dự án.<br />
          <b>Người xem</b>: chỉ xem, không chỉnh sửa được.
        </div>
      </div>

      <div className="card" style={{ marginBottom: 18 }}>
        <div className="ch"><h3>Giao diện</h3><span>Áp dụng cho toàn bộ ứng dụng, lưu trên trình duyệt này</span></div>
        <div className="th-seg" id="set-th-mode">
          <button type="button" className={theme === "light" ? "btn-pri" : "btn-line"} onClick={() => changeTheme("light")}>Sáng</button>
          <button type="button" className={theme === "dark" ? "btn-pri" : "btn-line"} onClick={() => changeTheme("dark")}>Tối</button>
        </div>
        <div className="th-row">
          <label>Phông chữ</label>
          <select id="set-font" value={font} onChange={(e) => changeFont(e.target.value)}>
            <option value="normal">Vừa</option>
            <option value="large">Lớn</option>
          </select>
        </div>
        <div className="note" style={{ marginTop: 12 }}>Bảng màu Material được khóa theo chế độ Sáng/Tối để bảo đảm độ tương phản. Nền thẻ luôn đặc 100%; hiệu ứng trong suốt, kính mờ và ảnh nền đã được loại bỏ.</div>
        <div style={{ marginTop: 16 }}><button className="btn-line" id="set-theme-reset" onClick={resetTheme}>↺ Khôi phục mặc định</button></div>
      </div>

      <div className="card">
        <div className="ch"><h3>Sao lưu & khôi phục dữ liệu</h3><span>Toàn bộ dữ liệu ứng dụng</span></div>
        <div className="eqinfo-note">
          <span>ℹ️</span>
          <div>Dữ liệu chính (task, dự án, thành viên, báo cáo, thiết bị, lịch đặt, kế hoạch thử nghiệm) đã được lưu trong cơ sở dữ liệu chung (PostgreSQL/Neon) — không còn phụ thuộc vào localStorage trình duyệt như bản gốc. Nút bên dưới xuất toàn bộ dữ liệu nghiệp vụ hiện có thành 1 file JSON.</div>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <button className="btn-pri" id="set-backup-btn" onClick={backupData}>⬇ Sao lưu toàn bộ dữ liệu</button>
          <button className="btn-line" id="set-clear-btn" style={{ marginLeft: 8, color: "var(--red)" }} onClick={clearLocal}>🗑 Xóa cài đặt cục bộ</button>
          <button className="btn-line" id="set-restore-btn" onClick={restoreData}>⬆ Khôi phục dữ liệu</button>
          <input type="file" id="set-file-restore" accept=".json" style={{ display: "none" }} onChange={onRestoreFile} />
        </div>
        {backupMeta && <div className="eqbackup-meta" id="set-backup-meta" style={{ marginTop: 10 }}>{backupMeta}</div>}
      </div>

      <div className="card" style={{ marginTop: 18 }}>
        <div className="ch"><h3>Thư mục Database (offline)</h3><span>Lưu dữ liệu ra một thư mục trên máy, không chỉ trong trình duyệt</span></div>
        <div className="eqinfo-note">
          <span>ℹ️</span>
          <div>Trong bản Next.js này, dữ liệu đã được lưu tập trung trên Postgres (Neon) thông qua server, nên không cần thư mục database cục bộ như bản HTML đơn gốc. Giữ lại nút này để tham khảo giao diện gốc; chức năng thực tế sẽ không cần thiết nữa.</div>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", marginTop: 10 }}>
          <button className="btn-pri" type="button" id="tf-db-choose-btn" onClick={chooseDbFolder}>📁 Chọn thư mục database</button>
        </div>
        <div style={{ marginTop: 10, fontSize: 12.5, fontWeight: 600, color: "var(--muted)" }} id="tf-db-status">{dbStatus}</div>
      </div>
    </section>
  )
}
