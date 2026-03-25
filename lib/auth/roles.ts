export type NormalizedRole = 'admin' | 'staff' | 'csr' | 'bindery' | 'customer'

const INTERNAL_ROLE_SET = new Set<NormalizedRole>(['admin', 'staff', 'csr', 'bindery'])
const INTERNAL_EMAIL_DOMAINS = ['printedunion.com', 'gocmyk.com']

/**
 * Normalizes the profile.role string and adds sensible fallbacks for internal domains.
 */
export function normalizeRole(rawRole?: string | null, email?: string | null): NormalizedRole {
  const cleaned = rawRole?.toString().trim().toLowerCase()

  if (cleaned && isInternalRole(cleaned as NormalizedRole)) {
    return cleaned as NormalizedRole
  }

  if (cleaned === 'customer' || cleaned === 'guest') return 'customer'

  // Fallback: treat known internal domains as staff if no explicit role set
  if (email) {
    const domain = email.split('@')[1]?.toLowerCase()
    if (domain && INTERNAL_EMAIL_DOMAINS.includes(domain)) {
      return 'staff'
    }
  }

  return 'customer'
}

export function isInternalRole(role: NormalizedRole | string | null | undefined): role is Exclude<NormalizedRole, 'customer'> {
  if (!role) return false
  return INTERNAL_ROLE_SET.has(role as NormalizedRole)
}

export function resolveLandingPath(role: NormalizedRole) {
  if (role === 'bindery') return '/bindery'
  if (isInternalRole(role)) return '/dashboard'
  return '/dashboard'
}
