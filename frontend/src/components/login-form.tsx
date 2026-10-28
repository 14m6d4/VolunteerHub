import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { useState } from 'react'
import useAuth from '@/hooks/useAuth'

function stripHtml(html: string) {
  return html.replace(/<[^>]*>/g, '').trim()
}

function parseApiError(raw: string) {
  let title = 'Login failed'
  const details: string[] = []

  try {
    const maybe = JSON.parse(raw)
    if (maybe) {
      if (typeof maybe === 'string') title = stripHtml(maybe)
      else if (maybe.message) title = stripHtml(String(maybe.message))
      if (maybe.errors && Array.isArray(maybe.errors)) {
        maybe.errors.forEach((e: unknown) => details.push(stripHtml(String(e))))
      }
      if (maybe.errors && typeof maybe.errors === 'object' && maybe.errors.length) {
        maybe.errors.forEach((it: unknown) => details.push(stripHtml(String(it))))
      }
    }
  } catch {
    const cleaned = stripHtml(raw)
    if (cleaned.includes('\n')) {
      const parts = cleaned.split('\n').map(s => s.trim()).filter(Boolean)
      title = parts.shift() || title
      parts.forEach(p => details.push(p))
    } else if (cleaned.includes(':')) {
      const parts = cleaned.split(/[,;]\s*|:\s*/)
      title = parts.shift() || title
      parts.forEach(p => details.push(p))
    } else {
      title = cleaned || title
    }
  }

  const uniq = details.filter((d, i, arr) => d && arr.indexOf(d) === i && d !== title)
  return { title, details: uniq }
}

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<"form">) {
  const { login } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [errorDetails, setErrorDetails] = useState<string[] | null>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const form = e.currentTarget
    const formData = new FormData(form)
    const email = (formData.get('email') as string) || undefined
    const password = (formData.get('password') as string) || ''

    try {
      await login({ email, password })
      window.location.href = '/feed'
    } catch (err) {
      const raw = (err instanceof Error ? err.message : '') || String(err) || 'Login failed'
      const parsed = parseApiError(raw)
      setError(parsed.title)
      setErrorDetails(parsed.details.length ? parsed.details : null)
    } finally {
      setLoading(false)
    }
  }
  return (
    <form onSubmit={handleSubmit} className={cn("flex flex-col gap-6", className)} {...props}>
      <FieldGroup>
        <div className="flex flex-col items-center gap-1 text-center">
          <h1 className="text-2xl font-bold">Login to your account</h1>
          <p className="text-muted-foreground text-sm text-balance">
            Enter your info below to login to your account
          </p>
        </div>
        <Field>
          <FieldLabel htmlFor="email">Email</FieldLabel>
          <Input id="email" name="email" type="email" placeholder="m@example.com" required />
        </Field>
        <Field>
          <div className="flex items-center">
            <FieldLabel htmlFor="password">Password</FieldLabel>
            <a
              href="/password_reset"
              className="ml-auto text-sm underline-offset-4 hover:underline"
            >
              Forgot your password?
            </a>
          </div>
          <Input id="password" name="password" type="password" required />
        </Field>
        {error && (
          <div
            role="alert"
            className="w-full rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
          >
            <div className="font-medium">{error}</div>
            {errorDetails && (
              <ul className="mt-2 list-disc list-inside space-y-1">
                {errorDetails.map((d, i) => (
                  <li key={i} className="text-xs text-red-700">{d}</li>
                ))}
              </ul>
            )}
          </div>
        )}
        <Field>
          <Button type="submit" disabled={loading}>{loading ? 'Logging in...' : 'Login'}</Button>
          <FieldDescription className="text-center">
            Don&apos;t have an account?{" "}
            <a href="/register" className="underline underline-offset-4">
              Sign up
            </a>
          </FieldDescription>
        </Field>
      </FieldGroup>
    </form>
  )
}
