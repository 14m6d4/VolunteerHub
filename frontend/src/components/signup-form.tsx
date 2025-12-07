import React, { useState } from "react"
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

export function SignupForm({
  className,
  onRegister,
  error,
  ...props
}: Omit<React.ComponentProps<"form">, "onSubmit"> & {
  onRegister?: (payload: { username: string; email: string; password: string; name?: string; birthdate?: string }) => void | Promise<void>
  error?: string | string[]
}) {
  const [localError, setLocalError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const form = e.currentTarget
    const fd = new FormData(form)

    const payload = {
      name: (fd.get('name') as string) || undefined,
      username: (fd.get('username') as string) || '',
      email: (fd.get('email') as string) || '',
      password: (fd.get('password') as string) || '',
      birthdate: (() => {
          const rawBirthdate = (fd.get('birthdate') as string) || '';

          if (rawBirthdate) {
              return rawBirthdate;
          }
          
          const defaultDate = new Date(1995, 0, 1); 
          
          return defaultDate.toISOString();
      })(),
    }

    // Clear previous local error
    setLocalError(null)

    const pw = (fd.get('password') as string) || ''
    const confirm = (fd.get('confirm-password') as string) || ''
    if (pw !== confirm) {
      setLocalError('Passwords do not match')
      return
    }

    try {
      await onRegister?.(payload)
    } catch (err: any) {
      try {
        const parsed = typeof err === 'string' ? err : (err?.message || JSON.stringify(err))
        setLocalError(parsed)
      } catch {
        setLocalError('Registration failed')
      }
    }
  }

  return (
    <form onSubmit={handleSubmit} className={cn("flex flex-col gap-6", className)} {...props}>
      <FieldGroup>
        {/* Error display: prefer external `error` prop, otherwise local client/server errors */}
        {(() => {
          const display = error ?? localError
          if (!display) return null
          return (
            <div className="rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-800">
              {Array.isArray(display)
                ? (display as string[]).map((m: string, i: number) => (
                    <div key={i}>{m}</div>
                  ))
                : display}
            </div>
          )
        })()}
        <div className="flex flex-col items-center gap-1 text-center">
          <h1 className="text-2xl font-bold">Create your account</h1>
          <p className="text-muted-foreground text-sm text-balance">
            Fill in the form below to create your account
          </p>
        </div>
        <Field>
          <FieldLabel htmlFor="name">Full Name</FieldLabel>
          <Input id="name" name="name" type="text" placeholder="John Doe" required />
        </Field>
        <Field>
          <FieldLabel htmlFor="username">Username</FieldLabel>
          <Input
            id="username"
            name="username"
            type="text"
            placeholder="john.doe"
            required
            pattern="[a-z0-9._]{5,12}"
            minLength={5}
            maxLength={12}
          />
          <FieldDescription>
            5-12 characters. Only lowercase letters, numbers, dots (.), and
            underscores (_).
          </FieldDescription>
        </Field>
        <Field>
          <FieldLabel htmlFor="email">Email</FieldLabel>
          <Input id="email" name="email" type="email" placeholder="m@example.com" required />
          <FieldDescription>
            We&apos;ll use this to contact you. We will not share your email
            with anyone else.
          </FieldDescription>
        </Field>
        <Field>
          <FieldLabel htmlFor="password">Password</FieldLabel>
          <Input id="password" name="password" type="password" placeholder="Must be at least 8 characters long." required />
        </Field>
        <Field>
          <FieldLabel htmlFor="confirm-password">Confirm Password</FieldLabel>
          <Input id="confirm-password" name="confirm-password" type="password" placeholder="Please confirm your password." required />
        </Field>
        <Field>
          <Button type="submit">Create Account</Button>
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
              Sign up with Google
            </Button>
          </a>
          <FieldDescription className="px-6 text-center">
            Already have an account? <a href="/login">Sign in</a>
          </FieldDescription>
        </Field>
      </FieldGroup>
    </form>
  )
}
