export type AppRole = 'USER' | 'EVENT_ORGANIZER' | 'TALENT'

export const ALL_ROLES: AppRole[] = [
  'USER',
  'EVENT_ORGANIZER',
  'TALENT',
]

export const ROLE_LABELS: Record<AppRole, string> = {
  USER:            'User',
  EVENT_ORGANIZER: 'Event Organizer',
  TALENT:          'Talent',
}

export const ROLE_EMOJI: Record<AppRole, string> = {
  USER:            '👤',
  EVENT_ORGANIZER: '🎪',
  TALENT:          '🎤',
}

export const getRoleDashboard = (role: AppRole): string => {
  switch (role) {
    case 'EVENT_ORGANIZER': return '/organizer/dashboard'
    case 'TALENT':          return '/talent/dashboard'
    default:                return '/events'
  }
}

export const getRoleOnboarding = (role: AppRole): string => {
  switch (role) {
    case 'EVENT_ORGANIZER': return '/organizer/onboarding'
    case 'TALENT':          return '/talent/onboarding'
    default:                return '/onboarding'
  }
}

export const isValidRole = (v: unknown): v is AppRole =>
  typeof v === 'string' && (ALL_ROLES as string[]).includes(v)
