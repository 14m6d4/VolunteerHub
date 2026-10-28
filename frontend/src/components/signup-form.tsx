import React, { useState } from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
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

    setLocalError(null)

    const pw = (fd.get('password') as string) || ''
    const confirm = (fd.get('confirm-password') as string) || ''
    if (pw !== confirm) {
      setLocalError('Passwords do not match')
      return
    }

    try {
      await onRegister?.(payload)
    } catch (err) {
      try {
        const parsed = typeof err === 'string' ? err : ((err instanceof Error ? err.message : '') || JSON.stringify(err))
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
          <FieldDescription className="px-6 text-center">
            Already have an account? <a href="/login">Sign in</a>
          </FieldDescription>
        </Field>
      </FieldGroup>
    </form>
  )
}
