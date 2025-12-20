import { Outlet } from "react-router-dom";
import useAuth from "@/hooks/useAuth";
import Error403 from "@/components/errors/403";
import Error401 from "@/components/errors/401";

interface ProtectedRouteProps {
    allowedRoles?: string[];
}

const ProtectedRoute = ({ allowedRoles }: ProtectedRouteProps) => {
    const { user, loading } = useAuth();

    if (loading) {
        return <div className="flex h-screen items-center justify-center">Loading...</div>;
    }

    // Not logged in -> 401 Unauthorized
    if (!user) {
        return <Error401 />;
    }

    // Logged in but role not allowed -> 403 Forbidden
    if (allowedRoles && !allowedRoles.includes(user.role)) {
        return <Error403 />;
    }

    // Authorized -> Render content
    return <Outlet />;
};

export default ProtectedRoute;
