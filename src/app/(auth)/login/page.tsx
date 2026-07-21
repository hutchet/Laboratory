"use client"

import { useState, type FormEvent } from "react"
import { signIn } from "next-auth/react"

// Thiet ke lai trang login theo yeu cau: ngoai dang nhap bang email, cho phep dang
// nhap bang Ma nhan vien (Member.code). Giao dien dong bo mau sac voi phan con lai
// cua app (gradient xanh #5b7bff/#3a55d9, accent #1d5fd6 - xem MembersView/adminbar).
type LoginMethod = "email" | "code"

export default function LoginPage() {
  const [method, setMethod] = useState<LoginMethod>("email")
  const [identifier, setIdentifier] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  function switchMethod(next: LoginMethod) {
    if (next === method) return
    setMethod(next)
    setIdentifier("")
    setError(null)
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const res = await signIn("credentials", { identifier: identifier.trim(), password, redirect: false })
    setLoading(false)
    if (res?.error) {
      setError(method === "email" ? "Sai email hoặc mật khẩu." : "Sai mã nhân viên hoặc mật khẩu.")
      return
    }
    window.location.href = "/dash"
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "radial-gradient(circle at 20% 20%, #3a55d9 0%, transparent 45%), radial-gradient(circle at 80% 80%, #5b7bff 0%, transparent 45%), #0f1420",
        padding: 20,
      }}
    >
      <div
        style={{
          width: 400,
          maxWidth: "100%",
          background: "#fff",
          borderRadius: 20,
          padding: "36px 32px",
          boxShadow: "0 24px 60px rgba(15,20,32,0.35)",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, marginBottom: 26 }}>
          <span
            style={{
              width: 52,
              height: 52,
              borderRadius: 14,
              background: "linear-gradient(135deg,#5b7bff,#3a55d9)",
              color: "#fff",
              display: "grid",
              placeItems: "center",
              fontWeight: 700,
              fontSize: 18,
              letterSpacing: 0.5,
            }}
          >
            VF
          </span>
          <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0, color: "#1a2035" }}>Đăng nhập Trung tâm thử nghiệm VinFast</h1>
          <p style={{ fontSize: 13, color: "#6b7280", margin: 0, textAlign: "center" }}>
            Quản lý kiểm nghiệm, kiểm toán &amp; vận hành phòng thử nghiệm
          </p>
        </div>

        <div
          role="tablist"
          aria-label="Phương thức đăng nhập"
          style={{ display: "flex", background: "#f1f3f8", borderRadius: 10, padding: 4, marginBottom: 20, gap: 4 }}
        >
          <button
            type="button"
            role="tab"
            aria-selected={method === "email"}
            onClick={() => switchMethod("email")}
            style={{
              flex: 1,
              padding: "9px 0",
              borderRadius: 8,
              border: "none",
              cursor: "pointer",
              fontSize: 13,
              fontWeight: 600,
              background: method === "email" ? "#fff" : "transparent",
              color: method === "email" ? "#1d5fd6" : "#6b7280",
              boxShadow: method === "email" ? "0 1px 4px rgba(15,20,32,0.12)" : "none",
              transition: "all .15s ease",
            }}
          >
            Email
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={method === "code"}
            onClick={() => switchMethod("code")}
            style={{
              flex: 1,
              padding: "9px 0",
              borderRadius: 8,
              border: "none",
              cursor: "pointer",
              fontSize: 13,
              fontWeight: 600,
              background: method === "code" ? "#fff" : "transparent",
              color: method === "code" ? "#1d5fd6" : "#6b7280",
              boxShadow: method === "code" ? "0 1px 4px rgba(15,20,32,0.12)" : "none",
              transition: "all .15s ease",
            }}
          >
            Mã nhân viên
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: "#374151" }}>
            {method === "email" ? "Email" : "Mã nhân viên"}
            <input
              type={method === "email" ? "email" : "text"}
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              required
              autoFocus
              placeholder={method === "email" ? "ten@congty.com" : "VD: NV0012"}
              style={{
                width: "100%",
                padding: "10px 12px",
                marginTop: 6,
                borderRadius: 8,
                border: "1px solid #dfe3e8",
                fontSize: 14,
              }}
            />
          </label>
          <label style={{ fontSize: 12, fontWeight: 600, color: "#374151" }}>
            Mật khẩu
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="••••••••"
              style={{
                width: "100%",
                padding: "10px 12px",
                marginTop: 6,
                borderRadius: 8,
                border: "1px solid #dfe3e8",
                fontSize: 14,
              }}
            />
          </label>

          {error && (
            <p style={{ fontSize: 12.5, color: "#c62828", background: "#fdecec", borderRadius: 8, padding: "8px 10px", margin: 0 }}>
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%",
              padding: "11px 0",
              borderRadius: 9,
              border: "none",
              color: "#fff",
              fontSize: 14,
              fontWeight: 600,
              cursor: loading ? "default" : "pointer",
              background: "linear-gradient(135deg,#5b7bff,#3a55d9)",
              opacity: loading ? 0.7 : 1,
              marginTop: 4,
            }}
          >
            {loading ? "Đang xử lý..." : "Đăng nhập"}
          </button>
        </form>

        <p style={{ fontSize: 11.5, color: "#9aa1ae", textAlign: "center", marginTop: 20, marginBottom: 0 }}>
          Quên mật khẩu? Liên hệ Trưởng phòng hoặc Giám đốc để được đặt lại mật khẩu.
        </p>
      </div>
    </main>
  )
}
