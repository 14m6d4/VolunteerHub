import { ProfileHeader } from "@/components/user/settings/profile-header"
import { AccountSettings } from "@/components/user/settings/account-settings"
import { NotificationSettings } from "@/components/user/settings/notification-settings"
import { PrivacySettings } from "@/components/user/settings/privacy-settings"
import { AppearanceSettings } from "@/components/user/settings/appearance-settings"
import { useAuth } from "@/hooks/useAuth"
import { useParams, useNavigate, Navigate } from "react-router-dom"
import { useEffect, useState } from "react"


export default function SettingsPage() {
  const { user } = useAuth()
  const { username } = useParams<{ username: string }>()
  const navigate = useNavigate()

  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)

  const handleAvatarChange = (file: File, previewUrl: string) => {
    setAvatarFile(file)
    setAvatarPreview(previewUrl)
  }

  const handleAvatarSaved = () => {
    setAvatarFile(null)
    setAvatarPreview(null)
  }

  // Access control: only allow user to view their own settings
  useEffect(() => {
    if (user && username && user.username !== username) {
      navigate(`/u/${username}`)
    }
  }, [user, username, navigate])

  if (!user) {
    return <Navigate to="/login" />
  }

  if (username && user.username !== username) {
    return <Navigate to={`/u/${username}`} />
  }

  return (
    <div className="container mx-auto py-10 space-y-8">
      <h1 className="text-3xl font-bold">Profile & Settings</h1>
      <div className="grid gap-8">
        <ProfileHeader avatarPreview={avatarPreview} onAvatarChange={handleAvatarChange} />
        <div className="grid gap-8 md:grid-cols-[250px_1fr]">
          <div className="hidden md:block space-y-2">
            <div className="font-medium text-lg">Settings</div>
            <nav className="grid gap-1">
              <a href="#account" className="px-3 py-2 text-sm rounded-md bg-muted">
                Account
              </a>
              <a href="#notifications" className="px-3 py-2 text-sm rounded-md hover:bg-muted">
                Notifications
              </a>
              <a href="#privacy" className="px-3 py-2 text-sm rounded-md hover:bg-muted">
                Privacy
              </a>
              <a href="#appearance" className="px-3 py-2 text-sm rounded-md hover:bg-muted">
                Appearance
              </a>
            </nav>
          </div>
          <div className="space-y-10">
            <section id="account">
              <AccountSettings avatarFile={avatarFile} onAvatarSaved={handleAvatarSaved} />
            </section>
            <section id="notifications">
              <NotificationSettings />
            </section>
            <section id="privacy">
              <PrivacySettings />
            </section>
            <section id="appearance">
              <AppearanceSettings />
            </section>
          </div>
        </div>
      </div>
    </div>
  )
}