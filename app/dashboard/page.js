// app/dashboard/page.js

export default function DashboardPage() {
  return (
    <main
      style={{
        minHeight: '100vh',
        padding: '2rem',
        color: '#fff',
        background: 'radial-gradient(circle at top, #1f2937, #020617)',
        fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, sans-serif',
      }}
    >
      <h1 style={{ fontSize: '2rem', marginBottom: '1rem' }}>PrintHQ Dashboard</h1>
      <p style={{ opacity: 0.8 }}>
        If you can see this, the <code>/dashboard</code> route is working and no longer stuck on a
        loading screen.
      </p>
    </main>
  );
}
