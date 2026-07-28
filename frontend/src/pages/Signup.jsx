import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../context/AuthContext";
import "./Signup.css";
import logoImg from "../assets/logo_3.png"; // ✅ Import logo

export default function Signup() {
  const { signup } = useAuth();
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    agree: false,
  });
  
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
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

  const getPasswordStrength = (password) => {
    if (!password) return { score: 0, label: "", color: "" };
    let score = 0;
    if (password.length >= 6) score++;
    if (password.length >= 10) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;
    
    const labels = ["", "Weak", "Fair", "Good", "Strong", "Excellent"];
    const colors = ["", "#ef4444", "#f97316", "#eab308", "#22c55e", "#16a34a"];
    return { score, label: labels[score], color: colors[score] };
  };

  const passwordStrength = getPasswordStrength(formData.password);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!formData.name || !formData.email || !formData.password || !formData.confirmPassword) {
      setError("Please fill in all required fields");
      return;
    }

    if (!/\S+@\S+\.\S+/.test(formData.email)) {
      setError("Please enter a valid email address");
      return;
    }

    if (formData.password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (!formData.agree) {
      setError("You must agree to the Terms of Service");
      return;
    }

    setIsLoading(true);
    
    try {
      await signup(formData.email, formData.password, formData.name);
      setSuccess("✅ Account created successfully! Redirecting to KYC Verification...");
      
      setTimeout(() => {
        navigate("/kyc-verification", { replace: true }); // ✅ Redirect to KYC
      }, 1500);
      
    } catch (err) {
      if (err.code === "auth/email-already-in-use") {
        setError("This email is already registered. Please login instead.");
      } else {
        setError(err.message || "Signup failed. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="signup-page">
      <div className="signup-bg">
        <img 
          src="https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?w=1920&q=80" 
          alt="Logistics Background"
        />
        <div className="signup-bg-overlay"></div>
      </div>

      <motion.div 
        className="signup-card"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        {/* Logo */}
        <Link to="/" className="signup-logo-link">
          <div className="signup-logo">
            <img 
              src={logoImg} // ✅ Using imported logo
              alt="Atirath Logistics Logo" 
              className="signup-logo-img"
            />
            <span className="signup-logo-text">ATIRATH LOGISTICS</span>
          </div>
        </Link>

        {/* Header */}
        <div className="signup-header">
          <h1>Create Your Account 🎉</h1>
          <p>Join 5,000+ businesses shipping globally</p>
        </div>

        {/* Messages */}
        <AnimatePresence>
          {error && (
            <motion.div 
              className="alert-box alert-error"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
            >
              ⚠️ {error}
            </motion.div>
          )}
          {success && (
            <motion.div 
              className="alert-box alert-success"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
            >
              ✅ {success}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Form */}
        <form onSubmit={handleSubmit} className="signup-form">
          <div className="form-field">
            <label className="field-label">Full Name <span className="req">*</span></label>
            <div className="input-box">
              <span className="field-icon">👤</span>
              <input
                type="text"
                name="name"
                className="text-input"
                placeholder="John Doe"
                value={formData.name}
                onChange={handleChange}
                disabled={isLoading}
                required
              />
            </div>
          </div>

          <div className="form-field">
            <label className="field-label">Email Address <span className="req">*</span></label>
            <div className="input-box">
              <span className="field-icon">📧</span>
              <input
                type="email"
                name="email"
                className="text-input"
                placeholder="you@company.com"
                value={formData.email}
                onChange={handleChange}
                disabled={isLoading}
                required
              />
            </div>
          </div>

          <div className="form-field">
            <label className="field-label">Password <span className="req">*</span></label>
            <div className="input-box">
              <span className="field-icon">🔐</span>
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                className="text-input"
                placeholder="••••••••"
                value={formData.password}
                onChange={handleChange}
                disabled={isLoading}
                required
              />
              <button
                type="button"
                className="eye-btn"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? "🙈" : "👁️"}
              </button>
            </div>
            {formData.password && (
              <div className="password-strength">
                <div className="strength-bars">
                  {[1, 2, 3, 4, 5].map((level) => (
                    <div
                      key={level}
                      className={`strength-bar ${level <= passwordStrength.score ? "active" : ""}`}
                      style={{ backgroundColor: level <= passwordStrength.score ? passwordStrength.color : "#e5e7eb" }}
                    />
                  ))}
                </div>
                <span className="strength-label" style={{ color: passwordStrength.color }}>
                  {passwordStrength.label}
                </span>
              </div>
            )}
          </div>

          <div className="form-field">
            <label className="field-label">Confirm Password <span className="req">*</span></label>
            <div className="input-box">
              <span className="field-icon">🔐</span>
              <input
                type={showConfirmPassword ? "text" : "password"}
                name="confirmPassword"
                className="text-input"
                placeholder="••••••••"
                value={formData.confirmPassword}
                onChange={handleChange}
                disabled={isLoading}
                required
              />
              <button
                type="button"
                className="eye-btn"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                {showConfirmPassword ? "🙈" : "👁️"}
              </button>
            </div>
          </div>

          <div className="form-row">
            <label className="check-label">
              <input
                type="checkbox"
                name="agree"
                checked={formData.agree}
                onChange={handleChange}
                required
              />
              <span>
                I agree to the{" "}
                <Link to="/terms" target="_blank" className="link-terms">Terms</Link> &{" "}
                <Link to="/privacy" target="_blank" className="link-terms">Privacy</Link>
              </span>
            </label>
          </div>

          <button type="submit" className="submit-btn" disabled={isLoading}>
            {isLoading ? (
              <>
                <motion.span
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                >
                  🔄
                </motion.span>
                Creating account...
              </>
            ) : (
              <>🚀 Start Shipping Today</>
            )}
          </button>
        </form>

        <p className="switch-text">
          Already have an account?{" "}
          <Link to="/login" className="link-switch">Sign In →</Link>
        </p>

        <div className="benefits-row">
          <span>✓ Free 14-day trial</span>
          <span>✓ No credit card</span>
          <span>✓ 24/7 support</span>
        </div>
      </motion.div>
    </div>
  );
}