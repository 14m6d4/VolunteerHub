import { Navigate, Outlet } from "react-router-dom";
import useAuth from "@/hooks/useAuth";
import Error404 from "@/components/errors/404";

const AdminGuard = () => {
    const { user, loading } = useAuth();

    if (loading) return <div>Loading...</div>;

    // If user is not logged in OR user is not admin, show 404
    // This effectively hides the existence of the route
    if (!user || user.role !== 'admin') {
        return <Error404 />;
    }

    return <Outlet />;
};

export default AdminGuard;
