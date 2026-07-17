"use client"

import { useEffect, useState } from "react"

export default function SettingsClient({ roleLabel }: { roleLabel: string }) {
  const [theme, setTheme] = useState("light")
  const [font, setFont] = useState("normal")

  useEffect(() => {
    const t = localStorage.getItem("tf-theme") || "light"
    const f = localStorage.getItem("tf-font") || "normal"
    setTheme(t)
    setFont(f)
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

  function resetTheme() {
    changeTheme("light")
    changeFont("normal")
  }

  function backupData() {
    const snapshot = { note: "Ban sao du lieu day du can duoc xuat tu server (chua trien khai endpoint export).", exportedAt: new Date().toISOString() }
    const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "taskflow-backup.json"
    a.click()
    URL.revokeObjectURL(url)
  }

  function clearLocal() {
    if (!confirm("Xoa toan bo cai dat hien thi luu tren may nay?")) return
    localStorage.removeItem("tf-theme")
    localStorage.removeItem("tf-font")
    resetTheme()
  }

  return (
    <section id="page-settings">
      <div className="card">
        <div className="ch"><h3>Vai tro hien tai</h3></div>
        <div className="row"><span id="set-active-role">Vai tro:</span><span id="active-role-badge">{roleLabel}</span></div>
      </div>

      <div className="card">
        <div className="ch"><h3>Giao dien</h3></div>
        <div className="row">
          <label>Che do hien thi</label>
          <select id="set-th-mode" value={theme} onChange={(e) => changeTheme(e.target.value)}>
            <option value="light">Sang</option>
            <option value="dark">Toi</option>
          </select>
        </div>
        <div className="row">
          <label>Co chu</label>
          <select id="set-font" value={font} onChange={(e) => changeFont(e.target.value)}>
            <option value="normal">Vua</option>
            <option value="large">Lon</option>
          </select>
        </div>
        <button className="btn-line" id="set-theme-reset" onClick={resetTheme}>Dat lai giao dien</button>
      </div>

      <div className="card">
        <div className="ch"><h3>Sao luu / phuc hoi</h3></div>
        <button className="btn-line" id="set-backup-btn" onClick={backupData}>Sao luu</button>
        <button className="btn-line" id="set-clear-btn" onClick={clearLocal}>Xoa cai dat cuc bo</button>
        <div id="set-backup-meta" style={{ fontSize: 12, color: "var(--muted)" }}>
          Du lieu chinh (cong viec, du an, khach hang...) da duoc luu trong co so du lieu chung; ban sao luu day du can may chu ho tro xuat/nhap toan bo du lieu.
        </div>
      </div>
    </section>
  )
}
