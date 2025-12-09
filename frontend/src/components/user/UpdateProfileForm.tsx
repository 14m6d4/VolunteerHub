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
      setUser(response.user); // Cập nhật user trong useAuth
      alert('Thông tin cá nhân đã được cập nhật thành công!');
    } catch (err: any) {
      const message = err.response?.data?.message || 'Không thể cập nhật thông tin. Vui lòng thử lại.';
      alert('Lỗi: ' + message);
      console.error('Profile update error:', err);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <Label htmlFor="username">Tên người dùng</Label>
          <Input id="username" {...register('username')} />
          {errors.username && <p className="text-sm text-red-600 mt-1">{errors.username.message}</p>}
        </div>

        <div>
          <Label htmlFor="name">Họ và tên</Label>
          <Input id="name" {...register('name')} />
          {errors.name && <p className="text-sm text-red-600 mt-1">{errors.name.message}</p>}
        </div>

        <div>
          <Label htmlFor="birthdate">Ngày sinh</Label>
          <Input id="birthdate" type="date" {...register('birthdate')} />
          {errors.birthdate && <p className="text-sm text-red-600 mt-1">{errors.birthdate.message}</p>}
        </div>

        <div>
          <Label htmlFor="profilePicture">Ảnh đại diện (URL)</Label>
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
        <Label>Cài đặt thông báo</Label>
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium">Bật thông báo</p>
            <p className="text-sm text-muted-foreground">Nhận thông báo từ hệ thống</p>
          </div>
          <Switch {...register('notificationsEnabled')} defaultChecked={user.notificationsEnabled} />
        </div>

        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium">Thông báo khi được nhắc</p>
          </div>
          <Switch {...register('notifyOnMention')} defaultChecked={user.notifyOnMention} />
        </div>

        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium">Thông báo cập nhật sự kiện</p>
          </div>
          <Switch {...register('notifyOnEventUpdate')} defaultChecked={user.notifyOnEventUpdate} />
        </div>
      </div>

      <div className="border-t pt-6">
        <Label htmlFor="currentPassword" className="text-red-600">
          Nhập mật khẩu hiện tại để xác nhận thay đổi *
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
        {isSubmitting ? 'Đang lưu...' : 'Lưu thay đổi'}
      </Button>
    </form>
  );
}