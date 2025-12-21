import {Button} from "@/components/ui/button"
import {Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle} from "@/components/ui/card"
import {Input} from "@/components/ui/input"
import {Label} from "@/components/ui/label"
import {Separator} from "@/components/ui/separator"
import React, {useState} from 'react'

// import { fetchUserProfile, updateUserProfile, changeUserPassword } from '@/lib/api'


interface UserProfileData {
  fullname?: string
  name?: string
  email?: string
}

interface MessageState {
  text: string
  type: 'success' | 'error'
}

export function AccountSettings(): React.ReactElement {
  const [fullname, setFullname] = useState(() => {
    const user = localStorage.getItem('user')
    if (!user) return ''
    const userData: UserProfileData = JSON.parse(user)
    return userData.fullname || userData.name || ''
  })

  const [username, setUsername] = useState(() => {
    const user = localStorage.getItem('user')
    if (!user) return ''
    const userData: UserProfileData = JSON.parse(user)
    return userData.email || ''
  })
  const [currentPassword, setCurrentPassword] = useState<string>('')
  const [newPassword, setNewPassword] = useState<string>('')
  const [confirmPassword, setConfirmPassword] = useState<string>('')
  const [loading, setLoading] = useState<boolean>(false)
  const [message, setMessage] = useState<string | null>(null)

  // const onSaveProfile = async (): Promise<void> => {
  //   const token = localStorage.getItem('token')
  //   if (!token) return setMessage('Please sign in')
  //   setLoading(true)
  //   try {
  //     await updateUserProfile(token, { fullname, username })
  //     setMessage('Profile updated')
  //   } catch (err) {
  //     setMessage((err as Error).message || 'Update failed')
  //   } finally { setLoading(false) }
  // }

  // const onChangePassword = async (): Promise<void> => {
  //   if (newPassword !== confirmPassword) return setMessage('New passwords do not match')
  //   const token = localStorage.getItem('token')
  //   if (!token) return setMessage('Please sign in')
  //   setLoading(true)
  //   try {
  //     await changeUserPassword(token, currentPassword, newPassword)
  //     setMessage('Password changed')
  //     setCurrentPassword('')
  //     setNewPassword('')
  //     setConfirmPassword('')
  //   } catch (err) {
  //     setMessage((err as Error).message || 'Password change failed')
  //   } finally { setLoading(false) }
  // }

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
              <Input id="name" value={fullname} onChange={e => setFullname(e.target.value)}/>
            </div>
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input id="username" value={username} onChange={e => setUsername(e.target.value)}/>
            </div>
          </div>
          <Separator/>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="current-password">Current Password</Label>
              <Input id="current-password" type="password" value={currentPassword}
                     onChange={e => setCurrentPassword(e.target.value)}/>
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-password">New Password</Label>
              <Input id="new-password" type="password" value={newPassword}
                     onChange={e => setNewPassword(e.target.value)}/>
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirm Password</Label>
              <Input id="confirm-password" type="password" value={confirmPassword}
                     onChange={e => setConfirmPassword(e.target.value)}/>
            </div>
          </div>
          {message && <div style={{color: 'red'}}>{message}</div>}
        </CardContent>
        <CardFooter className="flex justify-start gap-2">
          <Button disabled={loading}>Save Changes</Button>
        </CardFooter>

      </Card>
  );
}
