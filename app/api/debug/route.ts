// Debug endpoint — test Workers env behaviour
export const runtime = 'edge'

export async function GET() {
  const s = process.env.AUTH_SECRET
  return new Response(
    JSON.stringify({
      hasSecret: s ? s.length + " chars" : "MISSING",
      nodejs: typeof process?.versions?.node,
      envKeys: Object.keys(process.env).length,
    }),
    { headers: { "content-type": "application/json" } },
  )
}
