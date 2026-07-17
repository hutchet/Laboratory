// Debug: test auth flow
export const runtime = 'edge'

export async function GET() {
  const results: Record<string, string> = {}

  // Test Web Crypto
  try {
    const enc = new TextEncoder()
    const hashBuf = await crypto.subtle.digest("SHA-256", enc.encode("admin123"))
    const hashHex = Array.from(new Uint8Array(hashBuf)).map(b => b.toString(16).padStart(2, "0")).join("")
    results.sha256_result = hashHex
    results.sha256_match = hashHex === "240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9" ? "YES" : "NO"
  } catch (e) {
    results.sha256_error = String(e)
  }

  return new Response(JSON.stringify(results, null, 2), {
    headers: { "content-type": "application/json" },
  })
}
