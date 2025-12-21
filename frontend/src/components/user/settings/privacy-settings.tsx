import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import React from "react"

export function PrivacySettings(): React.ReactElement {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Privacy Settings</CardTitle>
        <CardDescription>Manage your privacy preferences.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="profile-visibility">Profile Visibility</Label>
              <div className="text-sm text-muted-foreground">Control who can see your profile.</div>
            </div>
            <Switch id="profile-visibility" defaultChecked />
          </div>
          <Separator />
          <div className="space-y-3">
            <Label>Who can see your activity</Label>
            <RadioGroup defaultValue="everyone">
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="everyone" id="everyone" />
                <Label htmlFor="everyone">Everyone</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="followers" id="followers" />
                <Label htmlFor="followers">Followers only</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="nobody" id="nobody" />
                <Label htmlFor="nobody">Nobody</Label>
              </div>
            </RadioGroup>
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="data-collection">Data Collection</Label>
              <div className="text-sm text-muted-foreground">
                Allow us to collect usage data to improve our service.
              </div>
            </div>
            <Switch id="data-collection" defaultChecked />
          </div>
        </div>
      </CardContent>
      <CardFooter>
        <Button>Save Privacy Settings</Button>
      </CardFooter>
    </Card>
  );
}
