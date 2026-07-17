// Debug: test full auth flow on Workers
import { db } from "@/lib/db"

export const runtime = 'edge'

export async function GET() {
  const results: Record<string, string> = {}

  try {
    // 1. Test DB query
    const user = await db.user.findUnique({ where: { email: "okashi1993@gmail.com" } })
    if (user) {
      results.db_found = "YES"
      results.db_email = user.email || ""
      results.db_hash_prefix = user.passwordHash?.substring(0, 10) || "NONE"
      
      // 2. Test SHA-256 verify
      const storedHash = user.passwordHash
      if (storedHash && storedHash.startsWith("sha256:")) {
        results.hash_type = "sha256"
        const enc = new TextEncoder()
        const hashBuf = await crypto.subtle.digest("SHA-256", enc.encode("admin123"))
        const hashHex = Array.from(new Uint8Array(hashBuf)).map(b => b.toString(16).padStart(2, "0")).join("")
        const match = hashHex === storedHash.slice(7)
        results.verify_result = match ? "MATCH" : "NO_MATCH"
        results.computed_hash = hashHex
        results.stored_hash = storedHash.slice(7)
      }
    } else {
      results.db_found = "NO"
    }
  } catch (e) {
    results.error = String(e)
  }

  return new Response(JSON.stringify(results, null, 2), {
    headers: { "content-type": "application/json" },
  })
}
