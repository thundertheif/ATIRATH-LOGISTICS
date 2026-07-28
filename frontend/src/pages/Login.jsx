import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../context/AuthContext";
import "./Login.css";
import logoImg from "../assets/logo_3.png";

export default function Login() {
  const { login, loginWithGoogle, loginWithMicrosoft, resetPassword } = useAuth();
  
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    email: "",
    password: "",
    remember: false,
  });
  
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value
    }));
  };

  // ✅ IMPROVED FORGOT PASSWORD HANDLER
  const handleForgotPassword = async () => {
    if (!formData.email) {
      setError("Please enter your email address first!");
      return;
    }
    
    setIsLoading(true);
    try {
      setError("");
      await resetPassword(formData.email);
      
      // ✅ CLEAR MESSAGE WITH INSTRUCTIONS
      setSuccess(`✅ Reset link sent to ${formData.email}. Please check your inbox and Spam folder.`);
    } catch (err) {
      if (err.code === 'auth/user-not-found') {
        setError("No account found with this email address.");
      } else if (err.code === 'auth/invalid-email') {
        setError("Invalid email format.");
      } else if (err.code === 'auth/too-many-requests') {
        setError("Too many requests. Please try again later.");
      } else {
        setError(err.message || "Failed to send reset email.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  // ✅ SAFE LOGIN HANDLER: CUSTOMERS NEVER GO TO ADMIN PAGE
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
      const result = await login(formData.email, formData.password);
      
      // 🛑 SAFETY CHECK: If result is missing, treat as customer safely
      if (!result || !result.role) {
        console.warn("Login returned invalid data, defaulting to customer dashboard");
        setSuccess("✅ Login successful! Redirecting...");
        setTimeout(() => navigate("/dashboard", { replace: true }), 600);
        return;
      }

      // 🛑 BLOCK ADMINS ONLY IF ROLE IS EXPLICITLY 'ADMIN'
      if (result.role === 'admin') {
        setError("⚠️ Administrators must use the Admin Portal to sign in.");
        setTimeout(() => navigate("/admin/login", { replace: true }), 2000);
        return; 
      }
      
      // ✅ ALL NON-ADMINS (CUSTOMERS) GO HERE
      setSuccess("✅ Login successful! Redirecting...");
      setTimeout(() => {
        navigate("/dashboard", { replace: true });
      }, 600); 
      
    } catch (err) {
      console.error("Login Error:", err);
      
      // ✅ HANDLE SERVER DOWN GRACEFULLY
      if (err.message?.includes("Network Error") || err.code === "ERR_NETWORK") {
        // Even if server is down, Firebase auth succeeded → let customer in
        setSuccess("✅ Login successful! (Offline mode) Redirecting...");
        setTimeout(() => navigate("/dashboard", { replace: true }), 600);
      } else if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password') {
        setError("Invalid email or password. Please try again.");
      } else {
        setError(err.message || "Login failed. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  // ✅ SOCIAL LOGIN WITH SAME SAFETY LOGIC
  const handleSocialLogin = async (loginFn) => {
    setError("");
    setIsLoading(true);
    try {
      const result = await loginFn();
      
      if (!result || !result.role) {
        navigate("/dashboard", { replace: true });
        return;
      }

      if (result.role === 'admin') {
        setError("⚠️ Administrators must use the Admin Portal to sign in.");
        setTimeout(() => navigate("/admin/login", { replace: true }), 2000);
        return;
      }

      setSuccess("✅ Login successful! Verifying access...");
      setTimeout(() => navigate("/dashboard", { replace: true }), 600);
      
    } catch (err) {
      setError(err.message || "Social login failed.");
      setIsLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-bg">
        <img 
          src="https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=1920&q=80" 
          alt="Logistics"
        />
        <div className="login-bg-overlay"></div>
      </div>

      <motion.div 
        className="login-card"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <Link to="/" className="back-home-link">← Back to Home</Link>

        <Link 
          to="/admin/login" 
          className="admin-portal-link"
          style={{ color: "#000000", borderColor: "#000000", backgroundColor: "#ffffff" }}
        >
           Admin Portal
        </Link>

        <Link to="/" className="login-logo-link">
          <div className="login-logo">
            <img src={logoImg} alt="Atirath Logistics Logo" className="real-logo-img" />
          </div>
        </Link>

        <div className="login-header">
          <h1>Welcome Back 👋</h1>
          <p>Sign in to manage shipments & track deliveries</p>
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

        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-field">
            <label className="field-label">Email Address <span className="req">*</span></label>
            <div className="input-box">
              <span className="field-icon">👤</span>
              <input type="email" name="email" className="text-input"
                placeholder="you@company.com" value={formData.email}
                onChange={handleChange} disabled={isLoading} required />
            </div>
          </div>

          <div className="form-field">
            <label className="field-label">Password <span className="req">*</span></label>
            <div className="input-box">
              <span className="field-icon">🔐</span>
              <input type={showPassword ? "text" : "password"} name="password"
                className="text-input" placeholder="Enter your password"
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
                Signing in...
              </>
            ) : (
              <> Sign In to Dashboard</>
            )}
          </button>
        </form>

        <div className="divider-line"><span>or continue with</span></div>

        <div className="social-row">
          <button type="button" className="social-btn" 
            onClick={() => handleSocialLogin(loginWithGoogle)} disabled={isLoading}>
            <span>🔴</span> Google
          </button>
          <button type="button" className="social-btn" 
            onClick={() => handleSocialLogin(loginWithMicrosoft)} disabled={isLoading}>
            <span>🟦</span> Microsoft
          </button>
        </div>

        <p className="switch-text">
          Don't have an account?{" "}
          <Link to="/signup" className="link-switch">Create Free Account →</Link>
        </p>

        <div className="trust-row">
          <span> Secure Login</span>
          <span>✅ 256-bit Encryption</span>
          <span>🌍 Global Access</span>
        </div>
      </motion.div>
    </div>
  );
}