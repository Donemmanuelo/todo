"use client"

export default function Error({ error, reset }: { error: Error & { digest?: string }, reset: () => void }) {
  return (
    <div style={{ padding: 24, fontFamily: 'sans-serif', color: 'white', background: '#0b1220', minHeight: '100vh' }}>
      <h1 style={{ fontSize: 28, marginBottom: 12 }}>Something went wrong</h1>
      {error?.digest && (
        <p style={{ opacity: 0.7 }}>Error digest: {error.digest}</p>
      )}
      <div style={{ marginTop: 16 }}>
        <button
          onClick={() => reset()}
          style={{
            background: 'linear-gradient(to right, #2563eb, #06b6d4)',
            color: 'white',
            padding: '10px 16px',
            borderRadius: 8,
            border: 'none',
            cursor: 'pointer'
          }}
        >
          Try again
        </button>
      </div>
    </div>
  )
}
