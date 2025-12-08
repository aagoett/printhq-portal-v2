'use client';

// Right now this is a simple pass-through wrapper.
// We'll add real Supabase auth checking next.
export default function RequireAuth({ children }) {
  return children;
}
