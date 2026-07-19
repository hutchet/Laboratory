"use client"
import { useRef, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { PageShell } from "@/shared/ui/page-shell"
import { ConfirmDialog } from "@/shared/ui/confirm-dialog"
import { saveTheme, resetTheme, setSimRole, saveLanguage, requestFullBackup, restoreFullBackup, clearAllData } from "../actions"
import { FONT_OPTIONS, SIM_ROLE_OPTIONS, LANGUAGE_OPTIONS } from "../types"
import type { AppSettings, FontKey, Language, SimRole, ThemeMode } from "../types"
import type { FullBackup } from "../backup"

function formatStamp(iso: string): string {
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function downloadJson(filename: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

export function SettingsView({ settings }: { settings: AppSettings }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [mode, setMode] = useState<ThemeMode>(settings.theme.mode)
  const [font, setFont] = useState<FontKey>(settings.theme.font)
  const [lang, setLangState] = useState<Language>(settings.language)
  const [simRole, setSimRoleState] = useState<SimRole>(settings.simRole)
  const [backupBusy, setBackupBusy] = useState(false)
  const [restoreBusy, setRestoreBusy] = useState(false)
  const [clearStep, setClearStep] = useState<0 | 1 | 2>(0)
  const [restoreConfirm, setRestoreConfirm] = useState<{ data: FullBackup; description: string } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  function applyTheme(nextMode: ThemeMode, nextFont: FontKey) {
    setMode(nextMode)
    setFont(nextFont)
    startTransition(async () => {
      try {
        await saveTheme({ mode: nextMode, font: nextFont })
        router.refresh()
      } catch (e) {
        setError(e instanceof Error ? e.message : "Có lỗi xảy ra")
      }
    })
  }

  function handleReset() {
    startTransition(async () => {
      try {
        await resetTheme()
        setMode("light")
        setFont("default")
        router.refresh()
      } catch (e) {
        setError(e instanceof Error ? e.message : "Có lỗi xảy ra")
      }
    })
  }

  function handleLanguageChange(next: Language) {
    setLangState(next)
    startTransition(async () => {
      try {
        await saveLanguage(next)
        router.refresh()
      } catch (e) {
        setError(e instanceof Error ? e.message : "Có lỗi xảy ra")
      }
    })
  }

  function handleSimRoleChange(next: SimRole) {
    setSimRoleState(next)
    startTransition(async () => {
      try {
        await setSimRole(next)
        router.refresh()
      } catch (e) {
        setError(e instanceof Error ? e.message : "Có lỗi xảy ra")
      }
    })
  }

  function handleBackup() {
    setError(null)
    setBackupBusy(true)
    startTransition(async () => {
      try {
        const data = await requestFullBackup()
        const stamp = new Date().toISOString().replace(/[:T]/g, "-").slice(0, 16)
        downloadJson(`taskflow-backup-${stamp}.json`, data)
        router.refresh()
      } catch (e) {
        setError(e instanceof Error ? e.message : "Có lỗi xảy ra")
      } finally {
        setBackupBusy(false)
      }
    })
  }

  function handleFileChosen(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ""
    if (!file) return
    setError(null)
    const reader = new FileReader()
    reader.onload = () => {
      let data: FullBackup
      try {
        data = JSON.parse(String(reader.result))
      } catch {
        setError("File không hợp lệ")
        return
      }
      const projectCount = data?.tables?.projects?.length ?? 0
      const taskCount = data?.tables?.tasks?.length ?? 0
      const memberCount = data?.tables?.members?.length ?? 0
      const description = `File chứa ${projectCount} dự án, ${taskCount} công việc, ${memberCount} thành viên. Khôi phục sẽ THAY THẾ toàn bộ dữ liệu hiện tại. Tiếp tục?`
      setRestoreConfirm({ data, description })
    }
    reader.readAsText(file)
  }

  function confirmRestore() {
    if (!restoreConfirm) return
    const data = restoreConfirm.data
    setRestoreConfirm(null)
    setRestoreBusy(true)
    startTransition(async () => {
      try {
        await restoreFullBackup(data)
        window.location.reload()
      } catch (e) {
        setError(e instanceof Error ? e.message : "Có lỗi xảy ra")
        setRestoreBusy(false)
      }
    })
  }

  function confirmClearStep2() {
    setClearStep(0)
    startTransition(async () => {
      try {
        await clearAllData()
        window.location.reload()
      } catch (e) {
        setError(e instanceof Error ? e.message : "Có lỗi xảy ra")
      }
    })
  }

  return (
    <PageShell title="Cài đặt" subtitle="Vai trò, giao diện và sao lưu dữ liệu">
      {error ? (
        <div className="note" style={{ color: "var(--red)", marginBottom: 14 }}>{error}</div>
      ) : null}

      <div className="card" style={{ marginBottom: 18 }}>
        <div className="ch"><h3>Vai trò &amp; phân quyền</h3><span>Chọn vai trò bạn muốn xem thử giao diện trong phiên này</span></div>
        <div className="th-row">
          <label>Vai trò hiện tại của bạn</label>
          <select value={simRole} disabled={pending} onChange={(e) => handleSimRoleChange(e.target.value as SimRole)}>
            {SIM_ROLE_OPTIONS.map((opt) => (
              <option key={opt.value || "default"} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
        <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 6, lineHeight: 1.6 }}>
          Vai trò hiện tại: <b style={{ color: "var(--ink)" }}>{settings.activeRoleLabel}</b><br />
          <b>Quản trị</b>: toàn quyền, kể cả quản lý thành viên/phân quyền.<br />
          <b>Quản lý</b>: tạo/sửa/xóa dự án, thiết bị, mẫu, bài thử — trừ quản lý thành viên.<br />
          <b>Kỹ thuật viên</b>: đặt lịch thiết bị, thêm/cập nhật kết quả bài thử — không được tạo/xóa mẫu, thiết bị, dự án.<br />
          <b>Người xem</b>: chỉ xem, không chỉnh sửa được.
        </div>
        <div className="note" style={{ marginTop: 12 }}>
          Khác với bản gốc (chạy 1 mình trên máy, không có server): ứng dụng này có RBAC thật theo
          tài khoản đăng nhập. Lựa chọn ở đây chỉ đổi cách hiển thị giao diện để xem thử, không thể
          dùng để có thêm quyền thao tác thật.
        </div>
      </div>

      <div className="card" style={{ marginBottom: 18 }}>
        <div className="ch"><h3>Giao diện</h3><span>Áp dụng cho toàn bộ ứng dụng, lưu trên trình duyệt này</span></div>
        <div className="th-seg">
          <button type="button" className={mode === "device" ? "btn-pri" : "btn-line"} disabled={pending} onClick={() => applyTheme("device", font)}>🖥️ Theo thiết bị</button>
          <button type="button" className={mode === "light" ? "btn-pri" : "btn-line"} disabled={pending} onClick={() => applyTheme("light", font)}>☀️ Sáng</button>
          <button type="button" className={mode === "dark" ? "btn-pri" : "btn-line"} disabled={pending} onClick={() => applyTheme("dark", font)}>🌙 Tối</button>
        </div>
        <div className="th-row">
          <label>Phông chữ</label>
          <select value={font} disabled={pending} onChange={(e) => applyTheme(mode, e.target.value as FontKey)}>
            {FONT_OPTIONS.map((f) => (
              <option key={f.key} value={f.key}>{f.label}</option>
            ))}
          </select>
        </div>
        <div className="th-row">
          <label>Ngôn ngữ</label>
          <select value={lang} disabled={pending} onChange={(e) => handleLanguageChange(e.target.value as Language)}>
            {LANGUAGE_OPTIONS.map((l) => (
              <option key={l.value} value={l.value}>{l.label}</option>
            ))}
          </select>
        </div>
        <div className="note" style={{ marginTop: 12 }}>
          Bảng màu Material được khóa theo chế độ Sáng/Tối để bảo đảm độ tương phản. Nền thẻ luôn đặc
          100%; hiệu ứng trong suốt, kính mờ và ảnh nền đã được loại bỏ.
        </div>
        <div style={{ marginTop: 16 }}>
          <button type="button" className="btn-line" disabled={pending} onClick={handleReset}>↺ Khôi phục mặc định</button>
        </div>
      </div>

      <div className="card">
        <div className="ch"><h3>Sao lưu &amp; khôi phục dữ liệu</h3><span>Toàn bộ dữ liệu nghiệp vụ</span></div>
        <div className="eqinfo-note">
          <span>ℹ️</span>
          <div>
            Dữ liệu (công việc, dự án, thành viên, báo cáo, khách hàng, trung tâm, thiết bị, lịch đặt,
            báo giá, kế hoạch/bài thử, kiểm toán, mua hàng, chất lượng...) được lưu trên cơ sở dữ liệu
            server (Postgres) — không phụ thuộc trình duyệt hay thiết bị này như bản gốc. Vẫn nên sao
            lưu định kỳ ra file JSON để phòng ngừa và có thể mang đi.
          </div>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <button type="button" className="btn-pri" disabled={!settings.canBackup || pending || backupBusy} onClick={handleBackup}>
            {backupBusy ? "Đang sao lưu..." : "⬇ Sao lưu toàn bộ dữ liệu"}
          </button>
          <button
            type="button"
            className="btn-line"
            style={{ marginLeft: 8, color: "var(--red)" }}
            disabled={!settings.canWipe || pending}
            onClick={() => setClearStep(1)}
          >
            🗑 Xóa toàn bộ dữ liệu
          </button>
          <button type="button" className="btn-line" disabled={!settings.canRestore || pending || restoreBusy} onClick={() => fileRef.current?.click()}>
            {restoreBusy ? "Đang khôi phục..." : "⬆ Khôi phục dữ liệu"}
          </button>
          <input ref={fileRef} type="file" accept=".json" style={{ display: "none" }} onChange={handleFileChosen} />
        </div>
        {!settings.canBackup && !settings.canWipe && !settings.canRestore ? (
          <div className="eqbackup-meta" style={{ marginTop: 10 }}>Chỉ Quản trị mới có quyền sao lưu/khôi phục/xóa toàn bộ dữ liệu.</div>
        ) : null}
        <div className="eqbackup-meta" style={{ marginTop: 10 }}>
          {settings.lastBackupAt ? `Lần sao lưu gần nhất: ${formatStamp(settings.lastBackupAt)}` : "Chưa có bản sao lưu nào trong phiên này."}
        </div>
      </div>

      <div className="card" style={{ marginTop: 18 }}>
        <div className="ch"><h3>Thư mục Database (offline)</h3><span>Lưu dữ liệu ra một thư mục trên máy, không chỉ trong trình duyệt</span></div>
        <div className="eqinfo-note">
          <span>ℹ️</span>
          <div>
            Tính năng này thuộc bản HTML gốc chạy 1 mình trên máy (không có server), dùng để tự sao
            lưu ra một thư mục cạnh file taskflow.html. Ứng dụng này đã có cơ sở dữ liệu server thật
            (Postgres) làm nơi lưu trữ chính, nên tính năng thư mục offline không còn áp dụng — dùng
            Sao lưu/Khôi phục ở trên thay thế.
          </div>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", marginTop: 10 }}>
          <button className="btn-pri" type="button" disabled>📁 Chọn thư mục database</button>
        </div>
        <div style={{ marginTop: 10, fontSize: 12.5, fontWeight: 600, color: "var(--muted)" }}>Không áp dụng cho bản chạy trên server/Vercel</div>
      </div>

      <ConfirmDialog
        open={clearStep === 1}
        title="Xóa toàn bộ dữ liệu?"
        description="Bạn có chắc muốn xóa TOÀN BỘ dữ liệu đã nhập (công việc, dự án, thành viên, thiết bị, báo giá, kế hoạch...)? Nên Sao lưu trước khi xóa."
        confirmLabel="Tiếp tục"
        danger
        onConfirm={() => setClearStep(2)}
        onCancel={() => setClearStep(0)}
      />
      <ConfirmDialog
        open={clearStep === 2}
        title="Xác nhận lần 2"
        description="Xác nhận lần 2: toàn bộ dữ liệu trên hệ thống này sẽ bị xóa trắng và không thể hoàn tác."
        confirmLabel="Xóa toàn bộ"
        danger
        onConfirm={confirmClearStep2}
        onCancel={() => setClearStep(0)}
      />
      <ConfirmDialog
        open={!!restoreConfirm}
        title="Khôi phục dữ liệu?"
        description={restoreConfirm?.description}
        confirmLabel="Khôi phục"
        danger
        onConfirm={confirmRestore}
        onCancel={() => setRestoreConfirm(null)}
      />
    </PageShell>
  )
}

export default SettingsView
