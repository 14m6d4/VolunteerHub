import { Navigate, Outlet } from "react-router-dom";
import useAuth from "@/hooks/useAuth";
import Error404 from "@/components/errors/404";

const AdminGuard = () => {
    const { user, loading } = useAuth();

    if (loading) return <div>Loading...</div>;

    // not logged in or not admin, show 404
    if (!user || user.role !== 'admin') {
        return <Error404 />;
    }

    return <Outlet />;
};

export default AdminGuard;
