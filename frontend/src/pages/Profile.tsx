// frontend/src/pages/Profile.tsx
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import UpdateProfileForm from '@/components/user/UpdateProfileForm';
import useAuth from '@/hooks/useAuth';
import { Navigate } from 'react-router-dom';

export default function Profile() {
  const { user } = useAuth();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="container max-w-4xl mx-auto py-10">
      <Card>
        <CardHeader>
          <CardTitle>Thông tin cá nhân</CardTitle>
          <CardDescription>
            Cập nhật hồ sơ của bạn. Bạn cần nhập mật khẩu hiện tại để xác nhận thay đổi.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <UpdateProfileForm user={user} />
        </CardContent>
      </Card>
    </div>
  );
}