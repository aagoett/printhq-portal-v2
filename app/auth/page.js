        'use client';

export default function AuthPage() {
  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily:
          'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      }}
    >
      <div
        style={{
          padding: '2rem 2.5rem',
          borderRadius: '0.75rem',
          border: '1px solid #e5e7eb',
          boxShadow: '0 10px 30px rgba(15, 23, 42, 0.08)',
          maxWidth: '420px',
          width: '100%',
          textAlign: 'center',
        }}
      >
        <h1
          style={{
            fontSize: '1.5rem',
            fontWeight: 600,
            marginBottom: '0.75rem',
          }}
        >
          Auth Coming Soon
        </h1>
        <p style={{ fontSize: '0.95rem', color: '#6b7280' }}>
          This is a temporary placeholder so we can finish wiring up Supabase
          and the rest of the PrintHQ portal.
        </p>
      </div>
    </main>
  );
}
