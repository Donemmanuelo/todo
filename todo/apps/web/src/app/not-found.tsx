export default function NotFound() {
  return (
    <div style={{ padding: 24, fontFamily: 'sans-serif', color: 'white', background: '#0b1220', minHeight: '100vh' }}>
      <h1 style={{ fontSize: 28, marginBottom: 12 }}>Page not found</h1>
      <p style={{ opacity: 0.7 }}>The page you are looking for does not exist.</p>
      <div style={{ marginTop: 16 }}>
        <a href="/" style={{ color: '#60a5fa', textDecoration: 'underline' }}>Go back home</a>
      </div>
    </div>
  )
}
