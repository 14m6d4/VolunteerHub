import { GalleryVerticalEnd } from "lucide-react"
import illustration from "@/assets/login-illustration.jpg"
import { LoginForm } from "@/components/login-form"
import { useEffect } from "react"
import { useSearchParams } from "react-router-dom"
import * as authService from "@/services/auth.service"

export default function LoginPage() {
  const [searchParams] = useSearchParams()

  useEffect(() => {
    // If accessToken in URL (from Google OAuth redirect), store it and fetch profile
    const accessToken = searchParams.get('accessToken')
    if (accessToken) {
      authService.setAuthToken(accessToken)
      // Redirect to home so useAuth hook can fetch profile
      window.location.href = '/'
    }
  }, [searchParams])

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
