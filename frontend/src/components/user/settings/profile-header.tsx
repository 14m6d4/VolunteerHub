import React from "react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Camera, Calendar } from "lucide-react"
import { formatDate } from "@/utils/formatDate"
import { useAuth } from "@/hooks/useAuth"

export function ProfileHeader(): React.ReactElement {
  const { user } = useAuth()

  if (!user) return <div>Loading...</div>

  const fullname = user.name || user.username || 'Anonymous'
  const username = user.username || ''
  const avatarUrl = user.profilePicture
  const role = user.role || 'volunteer'
  const createdAt = user.createdAt || new Date().toISOString()
  const initials = (fullname.split(' ').map(s => s[0] || '').join('') || username.slice(0, 2)).toUpperCase()

  // Get role badge
  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'admin':
        return <Badge className="bg-red-500 hover:bg-red-600">Admin</Badge>
      case 'manager':
        return <Badge className="bg-blue-500 hover:bg-blue-600">Manager</Badge>
      default:
        return <Badge variant="secondary">Volunteer</Badge>
    }
  }

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex flex-col md:flex-row gap-6 md:items-center">
          <div className="relative">
            <Avatar className="h-24 w-24">
              {avatarUrl ? (
                <AvatarImage src={avatarUrl} alt={fullname} />
              ) : (
                <AvatarImage src="/placeholder.svg?height=96&width=96" alt={fullname} />
              )}
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
            <Button
              size="icon"
              variant="outline"
              className="absolute -bottom-2 -right-2 h-8 w-8 rounded-full">
              <Camera className="h-4 w-4" />
              <span className="sr-only">Change avatar</span>
            </Button>
          </div>
          <div className="space-y-2">
            {/* Line 1: Full Name (Bold) */}
            <h2 className="text-2xl font-bold">{fullname}</h2>

            {/* Line 2: @username • Role Badge • Member since Date */}
            <div className="flex flex-wrap items-center gap-2 text-muted-foreground">
              <span>@{username}</span>
              <span className="hidden sm:inline">•</span>
              {getRoleBadge(role)}
              <span className="hidden sm:inline">•</span>
              <div className="flex items-center gap-1 text-sm">
                <Calendar className="h-4 w-4" />
                <span>Member since {formatDate(createdAt)}</span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
