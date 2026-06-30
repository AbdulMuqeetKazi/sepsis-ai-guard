import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { LoadingState } from '../common/UiPrimitives';

export function ProtectedRoute() {
  const { user, loading, loggingOut } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f9f9ff]">
        <LoadingState message="Checking authentication…" />
      </div>
    );
  }

  // During intentional logout, window.location.href = '/' is already in flight.
  // Return null to prevent a flash-redirect to /login.
  if (loggingOut) {
    return null;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
