// frontend/src/components/user/UpdateProfileForm.tsx
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { secureUpdateProfileSchema } from '@/utils/validators';
import { updateProfile } from '@/services/user.service';
import type { User } from '@/types/user';
import useAuth from '@/hooks/useAuth';

type FormData = z.infer<typeof secureUpdateProfileSchema>;

interface UpdateProfileFormProps {
  user: User;
}

export default function UpdateProfileForm({ user }: UpdateProfileFormProps) {
  const { setUser } = useAuth();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(secureUpdateProfileSchema),
    defaultValues: {
      username: user.username,
      name: user.name || '',
      birthdate: user.birthdate ? (typeof user.birthdate === 'string' ? user.birthdate.split('T')[0] : '') : '',
      profilePicture: user.profilePicture || '',
      notificationsEnabled: user.notificationsEnabled ?? false,
      notifyOnMention: user.notifyOnMention ?? false,
      notifyOnEventUpdate: user.notifyOnEventUpdate ?? false,
    },
  });

  const onSubmit = async (data: FormData) => {
    try {
      const response = await updateProfile(data);
      setUser(response.user); // Update user in useAuth
      alert('Profile updated successfully!');
    } catch (err: any) {
      const message = err.response?.data?.message || 'Unable to update profile. Please try again.';
      alert('Error: ' + message);
      console.error('Profile update error:', err);
    }
  };

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
          <Label htmlFor="profilePicture">Profile picture (URL)</Label>
          <Input
            id="profilePicture"
            placeholder="https://example.com/avatar.jpg"
            {...register('profilePicture')}
          />
          {errors.profilePicture && (
            <p className="text-sm text-red-600 mt-1">{errors.profilePicture.message}</p>
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
      </div>

      <Button type="submit" disabled={isSubmitting} className="w-full md:w-auto">
        {isSubmitting ? 'Saving...' : 'Save changes'}
      </Button>
    </form>
  );
}