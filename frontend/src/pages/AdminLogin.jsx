import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../context/AuthContext";
import { auth } from "../firebase"; // ✅ ADD THIS
import "./AdminLogin.css";
import logoImg from "../assets/logo_3.png";

export default function AdminLogin() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  const [redirectPath, setRedirectPath] = useState("/admin");
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    remember: false,
  });
  
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    const from = location.state?.from?.pathname || "/admin";
    setRedirectPath(from);
  }, [location]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value
    }));
  };

  const handleForgotPassword = async () => {
    if (!formData.email) {
      setError("Please enter your admin email address first!");
      return;
    }
    
    setIsLoading(true);
    try {
      setError("");
      const { resetPassword } = useAuth();
      await resetPassword(formData.email);
      setSuccess("✅ Password reset link sent! Check your Gmail inbox.");
    } catch (err) {
      setError(err.code === 'auth/user-not-found' 
        ? "No admin account found with this email." 
        : err.message || "Failed to send reset email.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!formData.email || !formData.password) {
      setError("Please fill in all fields");
      return;
    }

    setIsLoading(true);
    
    try {
      // ✅ Login and get result
      const result = await login(formData.email, formData.password);
      
      console.log("Login result:", result); // Debug
      
      // ✅ Check if admin
      if (result && result.role === 'admin') {
        setSuccess("✅ Admin login successful! Redirecting...");
        setTimeout(() => {
          navigate(redirectPath, { replace: true });
        }, 800);
      } else {
        // ✅ NOT ADMIN - Logout and show error
        setError("⚠️ Access denied. This portal is for administrators only.");
        
        // Logout immediately
        setTimeout(async () => {
          const { logout } = useAuth();
          await logout();
          navigate("/admin/login", { replace: true });
        }, 2000);
      }
      
    } catch (err) {
      console.error("Admin Login Error:", err);
      
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password') {
        setError("Invalid admin credentials. Please try again.");
      } else if (err.code === 'auth/user-not-found') {
        setError("No account found with this email.");
      } else {
        setError(err.message || "Admin login failed. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="admin-login-page">
      <div className="admin-login-bg">
        <img 
          src="https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1920&q=80" 
          alt="Admin Dashboard"
        />
        <div className="admin-login-bg-overlay"></div>
      </div>

      <motion.div 
        className="admin-login-card"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <Link 
          to="/" 
          className="back-home-link"
          style={{
            position: "absolute", top: "24px", left: "24px",
            display: "inline-flex", alignItems: "center", gap: "0.5rem",
            color: "#ffffff", textDecoration: "none", fontSize: "0.9rem",
            fontWeight: "500", transition: "all 0.3s ease", zIndex: 10
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = "#f97316";
            e.currentTarget.style.transform = "translateX(-4px)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = "#ffffff";
            e.currentTarget.style.transform = "translateX(0)";
          }}
        >
          ← Back to Home
        </Link>

        <Link 
          to="/login" 
          className="user-login-link"
          style={{
            position: "absolute", top: "24px", right: "24px",
            display: "inline-flex", alignItems: "center", gap: "0.5rem",
            color: "#f97316", textDecoration: "none", fontSize: "0.9rem",
            fontWeight: "600", padding: "8px 16px",
            backgroundColor: "rgba(255, 255, 255, 0.9)", borderRadius: "8px",
            border: "2px solid #f97316", transition: "all 0.3s ease", zIndex: 10,
            boxShadow: "0 2px 8px rgba(249, 115, 22, 0.15)"
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = "#f97316";
            e.currentTarget.style.color = "#ffffff";
            e.currentTarget.style.transform = "translateY(-2px)";
            e.currentTarget.style.boxShadow = "0 4px 12px rgba(249, 115, 22, 0.3)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.9)";
            e.currentTarget.style.color = "#f97316";
            e.currentTarget.style.transform = "translateY(0)";
            e.currentTarget.style.boxShadow = "0 2px 8px rgba(249, 115, 22, 0.15)";
          }}
        >
          👤 User Login
        </Link>

        <Link to="/" className="admin-login-logo-link">
          <div className="admin-login-logo">
            <img src={logoImg} alt="Atirath Logistics Logo" className="real-logo-img" />
          </div>
        </Link>

        <div className="admin-login-header">
          <h1>Admin Portal</h1>
          <p>Authorized personnel only - Manage system & users</p>
        </div>

        <AnimatePresence>
          {error && (
            <motion.div className="alert-box alert-error"
              initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              ⚠️ {error}
            </motion.div>
          )}
          {success && (
            <motion.div className="alert-box alert-success"
              initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              ✅ {success}
            </motion.div>
          )}
        </AnimatePresence>

        <form onSubmit={handleSubmit} className="admin-login-form">
          <div className="form-field">
            <label className="field-label">Admin Email <span className="req">*</span></label>
            <div className="input-box">
              <span className="field-icon">👤</span>
              <input type="email" name="email" className="text-input"
                placeholder="admin@company.com" value={formData.email}
                onChange={handleChange} disabled={isLoading} required />
            </div>
          </div>

          <div className="form-field">
            <label className="field-label">Admin Password <span className="req">*</span></label>
            <div className="input-box">
              <span className="field-icon">🔐</span>
              <input type={showPassword ? "text" : "password"} name="password"
                className="text-input" placeholder="Enter admin password"
                value={formData.password} onChange={handleChange}
                disabled={isLoading} required />
              <button type="button" className="eye-btn"
                onClick={() => setShowPassword(!showPassword)}
                aria-label="Toggle password visibility">
                {showPassword ? "🙈" : "👁️"}
              </button>
            </div>
          </div>

          <div className="form-row">
            <label className="check-label">
              <input type="checkbox" name="remember" checked={formData.remember}
                onChange={handleChange} />
              <span>Remember me</span>
            </label>
            <button type="button" className="link-forgot"
              onClick={handleForgotPassword} disabled={isLoading}>
              Forgot password?
            </button>
          </div>

          <button type="submit" className="submit-btn" disabled={isLoading}>
            {isLoading ? (
              <>
                <motion.span animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}>
                  🔄
                </motion.span>
                Authenticating...
              </>
            ) : (
              <>🔐 Admin Sign In</>
            )}
          </button>
        </form>

        <div className="divider-line"><span>secure admin access</span></div>

        <p className="switch-text">
          Not an administrator?{" "}
          <Link to="/login" className="link-switch">User Login →</Link>
        </p>

        <div className="trust-row">
          <span>🔒 Admin Only</span>
          <span>✅ Encrypted Connection</span>
          <span>🛡️ Protected Access</span>
        </div>
      </motion.div>
    </div>
  );
}