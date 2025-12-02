import { useState } from "react"
import { ForgotPwdForm } from "@/components/forgot-pwd-form"
import { OTPForm } from "@/components/otp-form"
import { ResetPwdForm } from "@/components/reset-pwd-form"

export default function PasswordResetPage() {
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [email, setEmail] = useState<string | null>(null)
  const [otp, setOtp] = useState<string | null>(null)

  // Send OTP to email; only advance when API confirms
  const handleSendOtp = async (emailInput: string) => {
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: emailInput }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => null)
        throw new Error(body?.message || "Failed to send OTP")
      }
      setEmail(emailInput)
      setStep(2)
    } catch (err: any) {
      alert(err.message || "Unable to send OTP")
    }
  }

  // Verify OTP with backend; only advance when API confirms
  const handleVerifyOtp = async (otpInput: string) => {
    if (!email) {
      alert("Email is missing. Please restart the flow.")
      setStep(1)
      return
    }
    try {
      const res = await fetch("/api/auth/verify-reset-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp: otpInput }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => null)
        throw new Error(body?.message || "Invalid OTP")
      }
      setOtp(otpInput)
      setStep(3)
    } catch (err: any) {
      alert(err.message || "OTP verification failed")
    }
  }

  return (
    <div className="bg-background flex min-h-svh flex-col items-center justify-center gap-6 p-6 md:p-10">
      <div className="w-full max-w-sm">
        {step === 1 && <ForgotPwdForm onSubmit={handleSendOtp} />}
        {step === 2 && <OTPForm email={email ?? ""} onSubmit={handleVerifyOtp} />}
        {step === 3 && <ResetPwdForm email={email ?? ""} otp={otp ?? ""} />}
      </div>
    </div>
  )
}
