// frontend/src/pages/[username].tsx
import { useParams, Navigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import UpdateProfileForm from '@/components/user/UpdateProfileForm';
import useAuth from '@/hooks/useAuth';
import { getPublicProfile } from '@/services/user.service';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import type { User, UserRole } from '@/types/user';

export default function UserProfilePage() {
  const { username } = useParams<{ username: string }>();
  const { user: currentUser } = useAuth();
  console.log('[UserProfilePage] route username param:', username, 'currentUser:', currentUser && currentUser.username);
  console.log("Enable:", Boolean(username));

  const { data, isLoading, error } = useQuery({
    queryKey: ['publicProfile', username],
    queryFn: () => getPublicProfile(username!),
    enabled: Boolean(username),
  });

  const profileUser = data?.user;
  console.log("ProfileUser:", data, "\nerror: ", error);

  if (isLoading) return <div className="container py-10">Đang tải...</div>;
  if (error || !profileUser) return <div className="container py-10">Không tìm thấy người dùng</div>;

  const isOwnProfile = currentUser && profileUser.username === currentUser.username;

  // Nếu không phải profile của mình và chưa đăng nhập → vẫn cho xem public info
  if (!isOwnProfile && !currentUser) {
    return <PublicProfileView user={profileUser} />;
  }

  return (
    <div className="container max-w-4xl mx-auto py-10">
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <Avatar className="h-20 w-20">
                <AvatarImage src={profileUser.profilePicture} />
                <AvatarFallback>{profileUser.username[0].toUpperCase()}</AvatarFallback>
              </Avatar>
              <div>
                <CardTitle className="text-2xl">{profileUser.name || profileUser.username}</CardTitle>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-muted-foreground">@{profileUser.username}</span>
                  <Badge variant="secondary">{profileUser.role}</Badge>
                </div>
              </div>
            </div>
          </div>
          <CardDescription className="mt-4">
            {isOwnProfile ? (
              <>Chỉnh sửa thông tin cá nhân của bạn</>
            ) : (
              <>Thông tin công khai của người dùng</>
            )}
          </CardDescription>
        </CardHeader>

        <CardContent>
          {isOwnProfile ? (
            // Chỉ hiện form khi là chính mình
            currentUser && <UpdateProfileForm user={currentUser as User} />
          ) : (
            <PublicProfileView user={profileUser} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// Component con để hiển thị public info
function PublicProfileView({ user }: { user: any }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
        <div>
          <span className="font-medium text-muted-foreground">Họ và tên</span>
          <p className="mt-1">{user.name || 'Chưa cập nhật'}</p>
        </div>
        <div>
          <span className="font-medium text-muted-foreground">Ngày sinh</span>
          <p className="mt-1">
            {user.birthdate ? format(new Date(user.birthdate), 'dd/MM/yyyy') : 'Chưa cập nhật'}
          </p>
        </div>
        <div>
          <span className="font-medium text-muted-foreground">Vai trò</span>
          <p className="mt-1 capitalize">{user.role}</p>
        </div>
        <div>
          <span className="font-medium text-muted-foreground">Tham gia từ</span>
          <p className="mt-1">{format(new Date(user.createdAt), 'MMMM yyyy')}</p>
        </div>
      </div>

      <Separator className="my-8" />

      <p className="text-center text-muted-foreground">
        Đây là thông tin công khai. Email và các cài đặt riêng tư không được hiển thị.
      </p>
    </div>
  );
}