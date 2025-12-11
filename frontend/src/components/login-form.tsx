import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldSeparator,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { useState } from 'react'
import useAuth from '@/hooks/useAuth'

function stripHtml(html: string) {
  // basic HTML tag stripper
  return html.replace(/<[^>]*>/g, '').trim()
}

function parseApiError(raw: string) {
  // Try to detect JSON-like messages
  let title = 'Login failed'
  const details: string[] = []

  // If looks like JSON, try parse
  try {
    const maybe = JSON.parse(raw)
    if (maybe) {
      if (typeof maybe === 'string') title = stripHtml(maybe)
      else if (maybe.message) title = stripHtml(String(maybe.message))
      if (maybe.errors && Array.isArray(maybe.errors)) {
        maybe.errors.forEach((e: any) => details.push(stripHtml(String(e))))
      }
      // If Zod style issues
      if (maybe.errors && typeof maybe.errors === 'object' && maybe.errors.length) {
        maybe.errors.forEach((it: any) => details.push(stripHtml(String(it))))
      }
    }
  } catch (_e) {
    // not JSON — maybe HTML or text
    const cleaned = stripHtml(raw)
    // If message contains multiple lines or separators, split
    if (cleaned.includes('\n')) {
      const parts = cleaned.split('\n').map(s => s.trim()).filter(Boolean)
      title = parts.shift() || title
      parts.forEach(p => details.push(p))
    } else if (cleaned.includes(':')) {
      // common "field: message" -> show first as title and rest as details
      const parts = cleaned.split(/[,;]\s*|\:\s*/)
      title = parts.shift() || title
      parts.forEach(p => details.push(p))
    } else {
      title = cleaned || title
    }
  }

  // Ensure details are unique and not duplicating title
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
      // redirect to homepage after login
      window.location.href = '/'
    } catch (err: any) {
      // Parse error message: support plain text, JSON ({message, errors}), or HTML
      const raw = err?.message || String(err) || 'Login failed'
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
        </Field>
        <FieldSeparator>Or continue with</FieldSeparator>
        <Field>
          <a href="http://localhost:5000/api/auth/google" style={{ width: '100%' }}>
            <Button variant="outline" type="button" className="w-full">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                <path
                  d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z"
                  fill="currentColor"
                />
              </svg>
              Login with Google
            </Button>
          </a>
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
