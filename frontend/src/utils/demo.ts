// Mirrors backend/utils/demo.util.ts, which is what enforces the rules; this only shapes the UI.
export const isDemoAccount = (email: string | null | undefined) =>
  !!email && email.toLowerCase().endsWith('@demo.volunteerhub.test')
