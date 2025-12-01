import { useState } from "react"
import { Check, Lock } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"

export function ResetPwdForm({ className, ...props }: React.ComponentProps<"div">) {
  const [isSuccess, setIsSuccess] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // In a real application, validate and submit to API here
    setIsSuccess(true)
  }

  if (isSuccess) {
    return (
      <div className={cn("flex flex-col gap-6", className)} {...props}>
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="flex size-16 items-center justify-center rounded-full bg-green-100">
            <Check className="size-8 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold">Password Reset Complete</h1>
          <p className="text-muted-foreground text-sm text-balance">
            Your password has been successfully reset. You can now log in with your new credentials.
          </p>
        </div>
        <Button asChild className="w-full">
          <a href="/login">Sign In</a>
        </Button>
        <div className="rounded-lg bg-muted/50 p-4 text-sm">
          <p className="font-medium mb-2">Security Recommendations</p>
          <ul className="list-disc pl-4 space-y-1 text-muted-foreground">
            <li>Use a different password for each account</li>
            <li>Enable two-factor authentication where available</li>
            <li>Consider using a password manager</li>
          </ul>
        </div>
      </div>
    )
  }

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <form onSubmit={handleSubmit}>
        <FieldGroup>
          <div className="flex flex-col items-center gap-2 text-center">
            <div className="flex size-10 items-center justify-center rounded-full bg-muted">
              <Lock className="size-5" />
            </div>
            <h1 className="text-2xl font-bold">Reset Password</h1>
            <p className="text-muted-foreground text-sm text-balance">
              Create a new password for your account
            </p>
          </div>
          <Field>
            <FieldLabel htmlFor="password">New Password</FieldLabel>
            <Input 
              id="password" 
              type="password" 
              required 
              placeholder="••••••••"
            />
            <FieldDescription>
              Password must be at least 8 characters long.
            </FieldDescription>
          </Field>
          <Field>
            <FieldLabel htmlFor="confirm-password">Confirm Password</FieldLabel>
            <Input 
              id="confirm-password" 
              type="password" 
              required 
              placeholder="••••••••"
            />
          </Field>
          <Field>
            <Button type="submit" className="w-full">Reset Password</Button>
          </Field>
          <div className="text-center text-sm text-muted-foreground">
            Remember your password?{" "}
            <a href="/login" className="underline underline-offset-4">
              Sign in
            </a>
          </div>
        </FieldGroup>
      </form>
    </div>
  )
}
