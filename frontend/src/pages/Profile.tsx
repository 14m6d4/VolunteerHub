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
          <CardTitle>Profile</CardTitle>
          <CardDescription>
            Update your current profile. Please type your current password to confirm changes.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <UpdateProfileForm user={user} />
        </CardContent>
      </Card>
    </div>
  );
}