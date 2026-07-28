import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import "./ForgotPassword.css";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");

    if (!email) {
      setError("Please enter your email address");
      return;
    }

    setIsLoading(true);
    
    // Simulate password reset email
    setTimeout(() => {
      setMessage("Password reset link sent to your email!");
      setIsLoading(false);
      setEmail("");
    }, 1500);
  };

  return (
    <div className="forgot-page">
      {/* Background */}
      <div className="forgot-bg">
        <div className="forgot-bg-overlay"></div>
      </div>

      {/* Card */}
      <motion.div 
        className="forgot-card"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        {/* Logo */}
        <Link to="/" className="forgot-logo-link">
          <div className="forgot-logo">
            <span className="logo-icon">🚀</span>
            <span className="logo-text">ATIRATH LOGISTICS</span>
          </div>
        </Link>

        {/* Header */}
        <div className="forgot-header">
          <h1>Forgot Password? 🔐</h1>
          <p>No worries! Enter your email and we'll send you reset instructions.</p>
        </div>

        {/* Messages */}
        {error && (
          <div className="alert-box alert-error">
            ⚠️ {error}
          </div>
        )}
        {message && (
          <div className="alert-box alert-success">
            ✅ {message}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="forgot-form">
          <div className="form-field">
            <label className="field-label">Email Address <span className="req">*</span></label>
            <div className="input-box">
              <span className="field-icon">📧</span>
              <input
                type="email"
                className="text-input"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
                required
              />
            </div>
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
                Sending...
              </>
            ) : (
              <>📨 Send Reset Link</>
            )}
          </button>
        </form>

        {/* Back to Login */}
        <p className="back-text">
          Remember your password?{" "}
          <Link to="/login" className="link-back">Sign In →</Link>
        </p>
      </motion.div>
    </div>
  );
}