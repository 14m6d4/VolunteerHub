import illustration from "@/assets/login-illustration.jpg"
import logoImage from "@/assets/logo.png"
import { LoginForm } from "@/components/login-form"
import { useEffect } from "react"
import { useSearchParams, Link } from "react-router-dom"
import * as authService from "@/services/auth.service"

export default function LoginPage() {
  const [searchParams] = useSearchParams()

  useEffect(() => {
    const accessToken = searchParams.get('accessToken')
    if (accessToken) {
      authService.setAuthToken(accessToken)
      window.location.href = '/feed'
    }
  }, [searchParams])

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
          <div className="w-full max-w-xs">
            <LoginForm />
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
