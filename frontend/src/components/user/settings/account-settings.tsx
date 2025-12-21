import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import React, { useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { updateProfile } from '@/services/user.service'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

interface AccountSettingsProps {
  avatarFile?: File | null
  onAvatarSaved?: () => void
}

export function AccountSettings({ avatarFile, onAvatarSaved }: AccountSettingsProps): React.ReactElement {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [fullname, setFullname] = useState(user?.name || '')
  const [username, setUsername] = useState(user?.username || '')
  const [email] = useState(user?.email || '')
  const [currentPassword, setCurrentPassword] = useState<string>('')
  const [newPassword, setNewPassword] = useState<string>('')
  const [confirmPassword, setConfirmPassword] = useState<string>('')
  const [loading, setLoading] = useState<boolean>(false)

  if (!user) return <div>Loading...</div>

  const onSaveProfile = async (): Promise<void> => {
    if (!currentPassword) {
      toast.error('Please enter your current password')
      return
    }

    setLoading(true)
    try {
      // Prepare update data
      const updateData: any = {
        name: fullname,
        username: username,
        currentPassword
      }

      // Add avatar if file is provided
      if (avatarFile) {
        // Convert file to data URL
        const dataUrl = await new Promise<string>((resolve) => {
          const reader = new FileReader()
          reader.onloadend = () => resolve(reader.result as string)
          reader.readAsDataURL(avatarFile)
        })
        updateData.profilePicture = dataUrl
      }

      const response = await updateProfile(updateData)

      // Update localStorage with new user data
      if (response.user) {
        localStorage.setItem('user', JSON.stringify(response.user))
        // Trigger storage event to update AuthContext
        window.dispatchEvent(new Event('storage'))
      }

      toast.success('Profile updated')
      setCurrentPassword('')
      onAvatarSaved?.()
      // Just stay on the page, no need to navigate
    } catch (err: any) {
      // Try multiple paths to get the error message
      const errorMessage = err.response?.data?.message || err.message || 'Update failed'
      toast.error(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const onChangePassword = async (): Promise<void> => {
    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match')
      return
    }
    if (!currentPassword) {
      toast.error('Please enter your current password')
      return
    }
    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters')
      return
    }

    setLoading(true)
    try {
      await updateProfile({
        password: newPassword,
        currentPassword
      })
      toast.success('Password changed')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Password change failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Account Settings</CardTitle>
        <CardDescription>Update your account information and email preferences.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Full Name</Label>
            <Input id="name" value={fullname} onChange={e => setFullname(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="username">Username</Label>
            <Input id="username" value={username} onChange={e => setUsername(e.target.value)} />
            <p className="text-xs text-muted-foreground">Your unique username</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" value={email} disabled className="bg-muted" />
            <p className="text-xs text-muted-foreground">Email cannot be changed</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="current-pass-profile">Current Password (required to save)</Label>
            <Input
              id="current-pass-profile"
              type="password"
              value={currentPassword}
              onChange={e => setCurrentPassword(e.target.value)}
              placeholder="Enter your current password"
            />
          </div>
        </div>
        <Separator />
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Change Password</h3>
          <div className="space-y-2">
            <Label htmlFor="current-password">Current Password</Label>
            <Input id="current-password" type="password" value={currentPassword}
              onChange={e => setCurrentPassword(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="new-password">New Password</Label>
            <Input id="new-password" type="password" value={newPassword}
              onChange={e => setNewPassword(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm-password">Confirm Password</Label>
            <Input id="confirm-password" type="password" value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)} />
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex justify-start gap-2">
        <Button onClick={onSaveProfile} disabled={loading}>
          {loading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving...</> : 'Save Changes'}
        </Button>
        <Button onClick={onChangePassword} disabled={loading} variant="outline">
          {loading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Changing...</> : 'Change Password'}
        </Button>
      </CardFooter>

    </Card>
  );
}
