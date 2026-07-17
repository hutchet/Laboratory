"use client"

import { useState, type FormEvent } from "react"
import { signIn } from "next-auth/react"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const res = await signIn("credentials", { email, password, redirect: false })
    setLoading(false)
    if (res?.error) {
      setError("Sai email hoac mat khau.")
      return
    }
    window.location.href = "/dash"
  }

  return (
    <main style={{ display: "flex", minHeight: "100vh", alignItems: "center", justifyContent: "center" }}>
      <form onSubmit={handleSubmit} style={{ width: 320, padding: 24, border: "1px solid #ddd", borderRadius: 8 }}>
        <h1 style={{ marginBottom: 16 }}>Dang nhap TaskFlow</h1>
        <label style={{ display: "block", marginBottom: 8 }}>
          Email
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required style={{ width: "100%", padding: 8, marginTop: 4 }} />
        </label>
        <label style={{ display: "block", marginBottom: 16 }}>
          Mat khau
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required style={{ width: "100%", padding: 8, marginTop: 4 }} />
        </label>
        {error && <p style={{ color: "red", marginBottom: 12 }}>{error}</p>}
        <button type="submit" disabled={loading} style={{ width: "100%", padding: 10 }}>
          {loading ? "Dang xu ly..." : "Dang nhap"}
        </button>
      </form>
    </main>
  )
}
