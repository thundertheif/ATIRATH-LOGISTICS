import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext"; 

export default function ProtectedRoute({ children, adminOnly = false }) {
  const { currentUser, userRole, loading } = useAuth();
  const location = useLocation();

  // 1. Show loading while checking token
  if (loading) {
    return (
      <div style={{ 
        display: 'flex', justifyContent: 'center', alignItems: 'center', 
        height: '100vh', fontSize: '1.5rem', color: '#0a1a2f' 
      }}>
        Loading...
      </div>
    );
  }

  // 2. Redirect to login if no user is logged in
  if (!currentUser) {
    const loginPath = adminOnly ? "/admin/login" : "/login";
    return <Navigate to={loginPath} state={{ from: location }} replace />;
  }

  // 3. Role Check: If the route is adminOnly, block non-admins
  if (adminOnly && userRole !== "admin") {
    console.warn("Access Denied: User role is", userRole, "on route", location.pathname);
    return <Navigate to="/dashboard" replace />; // Redirect customers away from admin pages
  }

  // 4. Render the protected page 
  // (Admins can now access customer routes like /book-shipment, and customers can access their own routes)
  return children;
}