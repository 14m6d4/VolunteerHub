import { useState } from "react"
import { useNavigate, Link } from "react-router-dom"
import { Check } from "lucide-react"
import illustration from "@/assets/login-illustration.jpg"
import logoImage from "@/assets/logo.png"
import { SignupForm } from "@/components/signup-form"
import { OTPForm } from "@/components/otp-form"
import * as authService from '@/services/auth.service'
import { Button } from "@/components/ui/button"

export default function SignupPage() {
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [registeredEmail, setRegisteredEmail] = useState<string | null>(null)
  const [signupError, setSignupError] = useState<string | string[] | null>(null)

  const handleRegister = async (payload: { username: string; email: string; password: string; name?: string }) => {
    try {
      await authService.register(payload)
      setRegisteredEmail(payload.email)
      setStep(2)
      setSignupError(null)
    } catch (err: any) {
      console.error('Register failed', err)
      try {
        const msg = err?.message || String(err)
        let parsed: any = msg
        try {
          parsed = JSON.parse(msg)
        } catch { }

        if (typeof parsed === 'string') setSignupError(parsed)
        else if (Array.isArray(parsed)) setSignupError(parsed)
        else if (parsed && typeof parsed === 'object') {
          if (parsed.message) setSignupError(parsed.message)
          else setSignupError(JSON.stringify(parsed))
        } else setSignupError(String(msg))
      } catch (parseErr) {
        setSignupError('Registration failed')
      }
    }
  }

  const handleVerify = async ({ otp }: { otp: string }) => {
    try {
      if (!registeredEmail) throw new Error('Missing registered email')
      await authService.verifyOTP({ email: registeredEmail, otp })
      window.location.href = '/login'
    } catch (err: any) {
      console.error('OTP verify failed', err)
    }
  }

  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      <div className="flex flex-col gap-4 p-6 md:p-10">
        <div className="flex justify-center gap-2 md:justify-start">
          <Link to="/feed" className="flex items-center gap-2 font-medium">
            <img src={logoImage} alt="VolunteerHub Logo" className="h-10 w-10" />
            <span className="text-xl font-bold">VolunteerHub</span>
          </Link>
        </div>
        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-sm">
            {step === 1 && <SignupForm onRegister={handleRegister} error={signupError ?? undefined} />}
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
