import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Field,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Lock } from "lucide-react"
export function ForgotPwdForm({ className, onSubmit, ...props }: React.ComponentProps<"div"> & { onSubmit?: () => void }) {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit?.()
  }

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <form onSubmit={handleSubmit}>
        <FieldGroup>
          <div className="flex flex-col items-center gap-2 text-center">
            <div className="flex size-10 items-center justify-center rounded-full bg-muted">
              <Lock className="size-5" />
            </div>
            <h1 className="text-2xl font-bold">Forgot password</h1>
            <p className="text-muted-foreground text-sm text-balance">
              Enter your email address below and we&apos;ll send you a link to reset your password.
            </p>
          </div>
          <Field>
            <FieldLabel htmlFor="email">Email address</FieldLabel>
            <Input id="email" type="email" placeholder="m@example.com" required />
          </Field>
          <Field>
            <Button type="submit" className="w-full">Continue</Button>
          </Field>
          <div className="text-center text-sm text-muted-foreground">
            <a href="/login" className="underline underline-offset-4">
              Back to login
            </a>
          </div>
        </FieldGroup>
      </form>
    </div>
  )
}
