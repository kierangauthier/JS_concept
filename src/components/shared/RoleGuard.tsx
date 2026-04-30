import { Navigate } from 'react-router-dom';
import { useApp } from '@/contexts/AppContext';
import type { UserRole } from '@/types';

interface RoleGuardProps {
  roles: UserRole[];
  children: React.ReactNode;
  /** Optional override for the redirect target. Defaults to the role's home. */
  fallback?: string;
}

/**
 * Front-end fence on top of the backend @Roles() guards. Renders children only
 * when the current user's role is in `roles`; otherwise redirects to a sane
 * home for that role. Backend remains the source of truth — this guard only
 * closes the visual leak (showing a page shape the user can't actually use).
 */
export function RoleGuard({ roles, children, fallback }: RoleGuardProps) {
  const { currentUser, isLoading } = useApp();

  // While the session is being restored, render nothing so we don't flash a
  // forbidden page before the redirect.
  if (isLoading) return null;
  if (!currentUser) return <Navigate to="/login" replace />;
  if (!roles.includes(currentUser.role)) {
    return <Navigate to={fallback ?? defaultHomeForRole(currentUser.role)} replace />;
  }
  return <>{children}</>;
}

export function defaultHomeForRole(role: UserRole): string {
  if (role === 'technicien') return '/terrain';
  return '/';
}
