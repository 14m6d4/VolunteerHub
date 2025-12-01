import { useState } from "react"
import { GalleryVerticalEnd, Check } from "lucide-react"
import illustration from "@/assets/login-illustration.jpg"
import { SignupForm } from "@/components/signup-form"
import { OTPForm } from "@/components/otp-form"
import * as authService from '@/services/auth.service'
import { Button } from "@/components/ui/button"

export default function SignupPage() {
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [registeredEmail, setRegisteredEmail] = useState<string | null>(null)

  const handleRegister = async (payload: { username: string; email: string; password: string; name?: string }) => {
    try {
      await authService.register(payload)
      setRegisteredEmail(payload.email)
      setStep(2)
    } catch (err: any) {
      // eslint-disable-next-line no-console
      console.error('Register failed', err)
      // TODO: show UI error
    }
  }

  const handleVerify = async ({ otp }: { otp: string }) => {
    try {
      if (!registeredEmail) throw new Error('Missing registered email')
      await authService.verifyOTP({ email: registeredEmail, otp })
      // on success, redirect to login
      window.location.href = '/login'
    } catch (err: any) {
      // eslint-disable-next-line no-console
      console.error('OTP verify failed', err)
      // TODO: show UI error
    }
  }

  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      <div className="flex flex-col gap-4 p-6 md:p-10">
        <div className="flex justify-center gap-2 md:justify-start">
          <a href="#" className="flex items-center gap-2 font-medium">
            <div className="bg-primary text-primary-foreground flex size-6 items-center justify-center rounded-md">
              <GalleryVerticalEnd className="size-4" />
            </div>
            VolunteerHub
          </a>
        </div>
        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-sm">
            {step === 1 && <SignupForm onRegister={handleRegister} />}
            {step === 2 && <OTPForm onVerify={handleVerify} />}
            {step === 3 && (
              <div className="flex flex-col gap-6">
                <div className="flex flex-col items-center gap-4 text-center">
                  <div className="flex size-16 items-center justify-center rounded-full bg-green-100">
                    <Check className="size-8 text-green-600" />
                  </div>
                  <h1 className="text-2xl font-bold">Account Created</h1>
                  <p className="text-muted-foreground text-sm text-balance">
                    Your account has been successfully created. Welcome to VolunteerHub!
                  </p>
                </div>
                <Button asChild className="w-full">
                  <a href="/login">Sign In</a>
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
      <div className="bg-muted relative hidden lg:block">
        <img
          src={illustration}
          alt="Image"
          className="absolute inset-0 h-full w-full object-cover"
        />
      </div>
    </div>
  )
}
