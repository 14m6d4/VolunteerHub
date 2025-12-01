import { useState } from "react"
import { ForgotPwdForm } from "@/components/forgot-pwd-form"
import { OTPForm } from "@/components/otp-form"
import { ResetPwdForm } from "@/components/reset-pwd-form"

export default function PasswordResetPage() {
  const [step, setStep] = useState<1 | 2 | 3>(1)

  return (
    <div className="bg-background flex min-h-svh flex-col items-center justify-center gap-6 p-6 md:p-10">
      <div className="w-full max-w-sm">
        {step === 1 && <ForgotPwdForm onSubmit={() => setStep(2)} />}
        {step === 2 && <OTPForm onSubmit={() => setStep(3)} />}
        {step === 3 && <ResetPwdForm />}
      </div>
    </div>
  )
}
