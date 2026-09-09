const shouldLogAuth = () => {
  if (process.env.NEXT_PUBLIC_AUTH_DEBUG === 'true') return true
  return process.env.NODE_ENV !== 'production'
}

const formatArgs = (event: string, data?: Record<string, unknown>) => {
  const stamp = new Date().toISOString()
  const base = `[auth] ${stamp} ${event}`
  return data ? [base, data] : [base]
}

export const logAuth = (event: string, data?: Record<string, unknown>) => {
  if (!shouldLogAuth()) return
  const useWarn = process.env.NEXT_PUBLIC_AUTH_DEBUG === 'true'
  const logger = useWarn ? console.warn : console.info
  logger(...formatArgs(event, data))
}

export const logAuthWarn = (event: string, data?: Record<string, unknown>) => {
  if (!shouldLogAuth()) return
  console.warn(...formatArgs(event, data))
}

export const logAuthError = (event: string, data?: Record<string, unknown>) => {
  if (!shouldLogAuth()) return
  console.error(...formatArgs(event, data))
}
