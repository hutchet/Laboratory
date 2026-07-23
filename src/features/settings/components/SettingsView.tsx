"use client"
import { useRef, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { PageShell } from "@/shared/ui/page-shell"
import { ConfirmDialog } from "@/shared/ui/confirm-dialog"
import { ActionIcon } from "@/shared/ui/icons"
import { CustomSelect } from "@/shared/ui/custom-select"
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
        downloadJson(`vinfast-backup-${stamp}.json`, data)
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
          <CustomSelect
            value={simRole}
            disabled={pending}
            width={240}
            options={SIM_ROLE_OPTIONS.map((opt) => ({ value: opt.value, label: opt.label }))}
            onChange={(v) => handleSimRoleChange(v as SimRole)}
          />
        </div>
        <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 6, lineHeight: 1.6 }}>
          Vai trò hiện tại: <b style={{ color: "var(--ink)" }}>{settings.activeRoleLabel}</b><br />
          {/* Thiet ke: Tai khoan 6 cap bac + Phan vung du lieu theo Trung tam thu nghiem &
              Nhom van hanh (Section 2): 6 cap bac chinh + 1 vai tro chuyen trach bao gia. */}
          <b>Giám đốc</b>: toàn quyền trên tất cả Trung tâm, kể cả quản lý thành viên/phân quyền.<br />
          <b>Trưởng phòng</b>: quản lý toàn bộ dữ liệu trong Trung tâm phụ trách (dự án, mẫu, thiết bị, mua hàng, kế hoạch kiểm toán), tạo Nhóm vận hành và thành viên trong Trung tâm.<br />
          <b>Trưởng nhóm</b>: quản lý dữ liệu trong Nhóm vận hành của mình (tạo/sửa công việc, mẫu, mua hàng).<br />
          <b>Kỹ sư</b>: cập nhật công việc và mẫu được giao trong phạm vi Trung tâm/Nhóm của mình.<br />
          <b>Kỹ thuật viên</b>: đặt lịch thiết bị, xem công việc — không được tạo/xóa mẫu, thiết bị, dự án.<br />
          <b>Nhân viên báo giá</b>: chuyên trách báo giá và khách hàng, không thuộc hệ thứ bậc chính.<br />
          <b>Chỉ xem</b>: chỉ xem, không chỉnh sửa được.<br />
          Thành viên thuộc <b>Nhóm vận hành</b> (đánh dấu đặc biệt ở trang Thành viên) được xem chéo dữ liệu thiết bị, khấu hao, chi phí biến đổi, chất lượng và kế hoạch kiểm toán giữa tất cả Trung tâm, thay vì chỉ giới hạn trong Trung tâm của mình.
        </div>
      </div>

      <div className="card" style={{ marginBottom: 18 }}>
        <div className="ch"><h3>Giao diện</h3><span>Áp dụng cho toàn bộ ứng dụng, lưu trên trình duyệt này</span></div>
        <div className="th-seg">
          <button type="button" className={mode === "device" ? "btn-pri" : "btn-line"} disabled={pending} onClick={() => applyTheme("device", font)}>
            <ActionIcon name="desktop" size={16} style={{ marginRight: 6, color: mode === "device" ? undefined : "#2563eb" }} />Theo thiết bị
          </button>
          <button type="button" className={mode === "light" ? "btn-pri" : "btn-line"} disabled={pending} onClick={() => applyTheme("light", font)}>
            <ActionIcon name="lightMode" size={16} style={{ marginRight: 6, color: mode === "light" ? undefined : "#f59e0b" }} />Sáng
          </button>
          <button type="button" className={mode === "dark" ? "btn-pri" : "btn-line"} disabled={pending} onClick={() => applyTheme("dark", font)}>
            <ActionIcon name="darkMode" size={16} style={{ marginRight: 6, color: mode === "dark" ? undefined : "#4f46e5" }} />Tối
          </button>
        </div>
        <div className="th-row">
          <label>Phông chữ</label>
          <CustomSelect
            value={font}
            disabled={pending}
            width={200}
            options={FONT_OPTIONS.map((f) => ({ value: f.key, label: f.label }))}
            onChange={(v) => applyTheme(mode, v as FontKey)}
          />
        </div>
        <div className="th-row">
          <label>Ngôn ngữ</label>
          <CustomSelect
            value={lang}
            disabled={pending}
            width={160}
            options={LANGUAGE_OPTIONS.map((l) => ({ value: l.value, label: l.label }))}
            onChange={(v) => handleLanguageChange(v as Language)}
          />
        </div>
        <div style={{ marginTop: 16 }}>
          <button type="button" className="btn-line" disabled={pending} onClick={handleReset}>↺ Khôi phục mặc định</button>
        </div>
      </div>

      <div className="card">
        <div className="ch"><h3>Sao lưu &amp; khôi phục dữ liệu</h3><span>Toàn bộ dữ liệu nghiệp vụ</span></div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <button type="button" className="btn-pri" disabled={!settings.canBackup || pending || backupBusy} onClick={handleBackup}>
            {backupBusy ? "Đang sao lưu..." : (<><ActionIcon name="download" size={16} style={{ marginRight: 6 }} />Sao lưu toàn bộ dữ liệu</>)}
          </button>
          <button
            type="button"
            className="btn-line"
            style={{ marginLeft: 8, color: "var(--red)" }}
            disabled={!settings.canWipe || pending}
            onClick={() => setClearStep(1)}
          >
            <ActionIcon name="delete" size={16} style={{marginRight:4}} />Xóa toàn bộ dữ liệu
          </button>
          <button type="button" className="btn-line" disabled={!settings.canRestore || pending || restoreBusy} onClick={() => fileRef.current?.click()}>
            {restoreBusy ? "Đang khôi phục..." : (<><ActionIcon name="upload" size={16} style={{ marginRight: 6 }} />Khôi phục dữ liệu</>)}
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
