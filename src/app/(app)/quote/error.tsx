"use client"

export default function QuoteError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div style={{ padding: 40, color: "red" }}>
      <h2>Quote Error</h2>
      <pre>{error.message}</pre>
      <pre>{error.stack}</pre>
      <button onClick={reset}>Retry</button>
    </div>
  )
}
