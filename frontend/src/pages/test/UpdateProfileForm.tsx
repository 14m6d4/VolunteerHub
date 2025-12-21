
import { useForm } from 'react-hook-form';
import { useState, useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { secureUpdateProfileSchema } from '@/utils/validators';
import { updateProfile } from '@/services/user.service';
import type { User } from '@/types/user';

type FormData = z.infer<typeof secureUpdateProfileSchema>;

interface UpdateProfileFormProps {
  user: User;
}

export default function UpdateProfileForm({ user }: UpdateProfileFormProps) {
  // Note: AuthContext does not expose setUser publicly; we'll reload after save to refresh profile
  const [preview, setPreview] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(secureUpdateProfileSchema),
    defaultValues: {
      username: user.username,
      name: user.name || '',
      // Ensure date input receives YYYY-MM-DD string
      birthdate: user.birthdate ? (typeof user.birthdate === 'string' ? user.birthdate.split('T')[0] : new Date(user.birthdate).toISOString().split('T')[0]) : '',
      profilePicture: '',
      notificationsEnabled: user.notificationsEnabled ?? false,
      notifyOnMention: user.notifyOnMention ?? false,
      notifyOnEventUpdate: user.notifyOnEventUpdate ?? false,
    },
  });


  const onSubmit = async (data: FormData) => {
    try {
      // Filter out empty profilePicture so we don't accidentally clear it
      const payload: any = { ...data };
      if (!payload.profilePicture) {
        delete payload.profilePicture;
      }

      // If user signed in via Google, don't send currentPassword
      if ((user as any).authProvider === 'google' && ('currentPassword' in payload)) {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { currentPassword, ...rest } = payload;
        await updateProfile(rest);
      } else {
        await updateProfile(payload);
      }

      alert('Profile updated successfully! Refreshing...');
      window.location.reload();
    } catch (err: any) {
      const message = err.response?.data?.message || 'Unable to update profile. Please try again.';
      alert('Error: ' + message);
      console.error('Profile update error:', err);
    }
  };

  // Keep preview in sync with the profilePicture form value
  const watchedPic = watch('profilePicture');
  useEffect(() => {
    if (typeof watchedPic === 'string' && watchedPic) setPreview(watchedPic);
    else setPreview(null);
  }, [watchedPic]);

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <Label htmlFor="username">Username</Label>
          <Input id="username" {...register('username')} />
          {errors.username && <p className="text-sm text-red-600 mt-1">{errors.username.message}</p>}
        </div>

        <div>
          <Label htmlFor="name">Full name</Label>
          <Input id="name" {...register('name')} />
          {errors.name && <p className="text-sm text-red-600 mt-1">{errors.name.message}</p>}
        </div>

        <div>
          <Label htmlFor="birthdate">Birthdate</Label>
          <Input id="birthdate" type="date" {...register('birthdate')} />
          {errors.birthdate && <p className="text-sm text-red-600 mt-1">{errors.birthdate.message}</p>}
        </div>

        <div>
          <Label htmlFor="profilePicture">Profile picture</Label>
          <Input
            id="profilePicture"
            placeholder="https://example.com/avatar.jpg"
            {...register('profilePicture')}
          />
          {errors.profilePicture && (
            <p className="text-sm text-red-600 mt-1">{errors.profilePicture.message}</p>
          )}

          <div className="mt-3">
            <Label htmlFor="profileFile">Or choose a file</Label>
            <input id="profileFile" type="file" accept="image/*" onChange={(e) => {
              const file = e.target.files && e.target.files[0];
              if (!file) return;
              if (!file.type.startsWith('image/')) {
                alert('Please select an image file');
                return;
              }
              const reader = new FileReader();
              reader.onload = () => {
                const result = reader.result as string;
                // set into the form
                try { (setValue ?? ((register as any).setValue))?.('profilePicture', result); } catch { };
                setPreview(result);
              };
              reader.readAsDataURL(file);
            }} />
          </div>

          {preview && (
            <div className="mt-3">
              <p className="text-sm text-muted-foreground"></p>
              <img src={preview} alt="Preview" className="w-28 h-28 rounded-full object-cover mt-2" />
            </div>
          )}
        </div>
      </div>

      <div className="space-y-4">
        <Label>Notification settings</Label>
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium">Enable notifications</p>
            <p className="text-sm text-muted-foreground">Receive notifications from the system</p>
          </div>
          <Switch {...register('notificationsEnabled')} defaultChecked={user.notificationsEnabled} />
        </div>

        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium">Notify on mention</p>
          </div>
          <Switch {...register('notifyOnMention')} defaultChecked={user.notifyOnMention} />
        </div>

        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium">Notify on event updates</p>
          </div>
          <Switch {...register('notifyOnEventUpdate')} defaultChecked={user.notifyOnEventUpdate} />
        </div>
      </div>

      <div className="border-t pt-6">
        {(user as any).authProvider === 'google' ? (
          <div className="text-sm text-muted-foreground">No password required for Google accounts to update profile.</div>
        ) : (
          <>
            <Label htmlFor="currentPassword" className="text-red-600">
              Enter current password to confirm changes *
            </Label>
            <Input
              id="currentPassword"
              type="password"
              {...register('currentPassword')}
              placeholder="••••••••"
            />
            {errors.currentPassword && (
              <p className="text-sm text-red-600 mt-1">{errors.currentPassword.message}</p>
            )}
          </>
        )}
      </div>

      <Button type="submit" disabled={isSubmitting} className="w-full md:w-auto">
        {isSubmitting ? 'Saving...' : 'Save changes'}
      </Button>
    </form>
  );
}