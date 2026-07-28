// ========================================
// ATIRATH LOGISTICS - GET QUOTE PAGE
// File: GetQuote.jsx
// ✅ FIXED: Text visibility, input contrast, card readability, responsive
// ========================================

import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import Layout from "../components/Layout";
import "./GetQuote.css";

export default function GetQuote() {
  const navigate = useNavigate();
  
  // Form state
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    // Contact Info
    name: "",
    email: "",
    phone: "",
    company: "",
    
    // Pickup
    pickupAddress: "",
    pickupCity: "",
    pickupState: "",
    pickupPincode: "",
    
    // Delivery
    deliveryAddress: "",
    deliveryCity: "",
    deliveryState: "",
    deliveryPincode: "",
    
    // Shipment
    serviceType: "standard",
    weight: "",
    length: "",
    width: "",
    height: "",
    packageCount: "1",
    declaredValue: "",
    
    // Preferences
    preferredDate: "",
    preferredTime: "",
    specialInstructions: "",
    insurance: false,
    cod: false,
  });
  
  const [quote, setQuote] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [showBreakdown, setShowBreakdown] = useState(false);

  // Auto-calculate quote when shipment details change
  useEffect(() => {
    if (formData.weight && formData.pickupPincode && formData.deliveryPincode) {
      const estimatedQuote = calculateQuote();
      setQuote(estimatedQuote);
    } else {
      setQuote(null);
    }
  }, [formData.weight, formData.serviceType, formData.pickupPincode, formData.deliveryPincode]);

  // Handle input changes
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value
    }));
    
    // Clear error when user types
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  // Validate current step
  const validateStep = (step) => {
    const newErrors = {};
    let isValid = true;

    if (step === 1) {
      if (!formData.name.trim()) newErrors.name = "Name is required";
      if (!formData.email.trim()) {
        newErrors.email = "Email is required";
      } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
        newErrors.email = "Enter valid email";
      }
      if (!formData.phone.trim()) {
        newErrors.phone = "Phone is required";
      } else if (!/^[6-9]\d{9}$/.test(formData.phone)) {
        newErrors.phone = "Enter valid 10-digit number";
      }
    }

    if (step === 2) {
      if (!formData.pickupAddress.trim()) newErrors.pickupAddress = "Pickup address required";
      if (!formData.pickupCity.trim()) newErrors.pickupCity = "City required";
      if (!formData.pickupPincode.trim()) {
        newErrors.pickupPincode = "Pincode required";
      } else if (!/^[1-9][0-9]{5}$/.test(formData.pickupPincode)) {
        newErrors.pickupPincode = "Enter valid 6-digit pincode";
      }
    }

    if (step === 3) {
      if (!formData.deliveryAddress.trim()) newErrors.deliveryAddress = "Delivery address required";
      if (!formData.deliveryCity.trim()) newErrors.deliveryCity = "City required";
      if (!formData.deliveryPincode.trim()) {
        newErrors.deliveryPincode = "Pincode required";
      } else if (!/^[1-9][0-9]{5}$/.test(formData.deliveryPincode)) {
        newErrors.deliveryPincode = "Enter valid 6-digit pincode";
      }
    }

    if (step === 4) {
      if (!formData.weight || parseFloat(formData.weight) <= 0) {
        newErrors.weight = "Enter valid weight";
      }
      if (!formData.serviceType) newErrors.serviceType = "Select service type";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      isValid = false;
      // Scroll to first error
      const firstError = Object.keys(newErrors)[0];
      const element = document.querySelector(`[name="${firstError}"]`);
      if (element) element.scrollIntoView({ behavior: "smooth", block: "center" });
    }

    return isValid;
  };

  // Navigate between steps
  const nextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, 5));
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const prevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
    setErrors({});
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Calculate quote estimate
  const calculateQuote = () => {
    const weight = parseFloat(formData.weight) || 0;
    const volumetricWeight = (parseFloat(formData.length) || 0) * 
                            (parseFloat(formData.width) || 0) * 
                            (parseFloat(formData.height) || 0) / 5000;
    const chargeableWeight = Math.max(weight, volumetricWeight);
    
    // Base rates by service type
    const baseRates = {
      standard: 50,
      express: 120,
      "same-day": 250,
      international: 800
    };
    
    const perKgRate = 10;
    const distanceFactor = formData.pickupPincode === formData.deliveryPincode ? 1 : 
                          formData.pickupState === formData.deliveryState ? 1.5 : 2.5;
    
    let subtotal = baseRates[formData.serviceType] + (chargeableWeight * perKgRate * distanceFactor);
    
    // Add-ons
    if (formData.insurance) subtotal += parseFloat(formData.declaredValue || 0) * 0.02;
    if (formData.cod) subtotal += parseFloat(formData.declaredValue || 0) * 0.02;
    if (formData.packageCount > 1) subtotal += (formData.packageCount - 1) * 20;
    
    // GST 18%
    const gst = subtotal * 0.18;
    const total = subtotal + gst;
    
    // Delivery estimate
    const deliveryDays = {
      standard: "3-5 business days",
      express: "1-2 business days",
      "same-day": "Today (if booked before 2 PM)",
      international: "5-10 business days"
    };
    
    return {
      subtotal: Math.round(subtotal),
      gst: Math.round(gst),
      total: Math.round(total),
      deliveryEstimate: deliveryDays[formData.serviceType],
      chargeableWeight: Math.round(chargeableWeight * 100) / 100
    };
  };

  // Submit quote request
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateStep(4)) return;
    
    setLoading(true);
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // In production: send to backend
      console.log("Quote request submitted:", { ...formData, quote });
      
      // Show success & redirect
      navigate("/quote-confirmed", { 
        state: { formData, quote, timestamp: new Date().toISOString() } 
      });
      
    } catch (error) {
      console.error("Quote submission failed:", error);
      setErrors({ submit: "Failed to submit request. Please try again." });
    } finally {
      setLoading(false);
    }
  };

  // Render form step
  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="form-step fade-in">
            <div className="step-header">
              <span className="step-number">1</span>
              <h3>👤 Contact Details</h3>
              <p>Let us know how to reach you</p>
            </div>
            
            <div className="form-grid">
              <div className="form-group">
                <label htmlFor="name">Full Name *</label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Enter your name"
                  className={errors.name ? "error" : ""}
                  autoComplete="name"
                />
                {errors.name && <span className="error-msg">{errors.name}</span>}
              </div>
              
              <div className="form-group">
                <label htmlFor="email">Email Address *</label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="you@example.com"
                  className={errors.email ? "error" : ""}
                  autoComplete="email"
                />
                {errors.email && <span className="error-msg">{errors.email}</span>}
              </div>
              
              <div className="form-group">
                <label htmlFor="phone">Phone Number *</label>
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="9876543210"
                  maxLength="10"
                  inputMode="numeric"
                  className={errors.phone ? "error" : ""}
                  autoComplete="tel"
                />
                {errors.phone && <span className="error-msg">{errors.phone}</span>}
              </div>
              
              <div className="form-group">
                <label htmlFor="company">Company Name (Optional)</label>
                <input
                  type="text"
                  id="company"
                  name="company"
                  value={formData.company}
                  onChange={handleChange}
                  placeholder="Your company name"
                  autoComplete="organization"
                />
              </div>
            </div>
            
            <div className="step-footer">
              <button type="button" className="btn-secondary" onClick={() => navigate("/")}>
                Cancel
              </button>
              <button type="button" className="btn-primary" onClick={nextStep}>
                Continue →
              </button>
            </div>
          </div>
        );
        
      case 2:
        return (
          <div className="form-step fade-in">
            <div className="step-header">
              <span className="step-number">2</span>
              <h3>📍 Pickup Location</h3>
              <p>Where should we collect your shipment?</p>
            </div>
            
            <div className="form-group full-width">
              <label htmlFor="pickupAddress">Street Address *</label>
              <textarea
                id="pickupAddress"
                name="pickupAddress"
                value={formData.pickupAddress}
                onChange={handleChange}
                placeholder="House/Building, Street, Area"
                rows="2"
                className={errors.pickupAddress ? "error" : ""}
              />
              {errors.pickupAddress && <span className="error-msg">{errors.pickupAddress}</span>}
            </div>
            
            <div className="form-grid">
              <div className="form-group">
                <label htmlFor="pickupCity">City *</label>
                <input
                  type="text"
                  id="pickupCity"
                  name="pickupCity"
                  value={formData.pickupCity}
                  onChange={handleChange}
                  placeholder="Enter city"
                  className={errors.pickupCity ? "error" : ""}
                  autoComplete="address-level2"
                />
                {errors.pickupCity && <span className="error-msg">{errors.pickupCity}</span>}
              </div>
              
              <div className="form-group">
                <label htmlFor="pickupState">State *</label>
                <input
                  type="text"
                  id="pickupState"
                  name="pickupState"
                  value={formData.pickupState}
                  onChange={handleChange}
                  placeholder="Enter state"
                  autoComplete="address-level1"
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="pickupPincode">Pincode *</label>
                <input
                  type="text"
                  id="pickupPincode"
                  name="pickupPincode"
                  value={formData.pickupPincode}
                  onChange={handleChange}
                  placeholder="6-digit pincode"
                  maxLength="6"
                  pattern="[0-9]*"
                  inputMode="numeric"
                  className={errors.pickupPincode ? "error" : ""}
                />
                {errors.pickupPincode && <span className="error-msg">{errors.pickupPincode}</span>}
              </div>
            </div>
            
            <div className="step-footer">
              <button type="button" className="btn-secondary" onClick={prevStep}>
                ← Back
              </button>
              <button type="button" className="btn-primary" onClick={nextStep}>
                Continue →
              </button>
            </div>
          </div>
        );
        
      case 3:
        return (
          <div className="form-step fade-in">
            <div className="step-header">
              <span className="step-number">3</span>
              <h3>🏠 Delivery Location</h3>
              <p>Where should we deliver your shipment?</p>
            </div>
            
            <div className="form-group full-width">
              <label htmlFor="deliveryAddress">Street Address *</label>
              <textarea
                id="deliveryAddress"
                name="deliveryAddress"
                value={formData.deliveryAddress}
                onChange={handleChange}
                placeholder="House/Building, Street, Area"
                rows="2"
                className={errors.deliveryAddress ? "error" : ""}
              />
              {errors.deliveryAddress && <span className="error-msg">{errors.deliveryAddress}</span>}
            </div>
            
            <div className="form-grid">
              <div className="form-group">
                <label htmlFor="deliveryCity">City *</label>
                <input
                  type="text"
                  id="deliveryCity"
                  name="deliveryCity"
                  value={formData.deliveryCity}
                  onChange={handleChange}
                  placeholder="Enter city"
                  className={errors.deliveryCity ? "error" : ""}
                  autoComplete="address-level2"
                />
                {errors.deliveryCity && <span className="error-msg">{errors.deliveryCity}</span>}
              </div>
              
              <div className="form-group">
                <label htmlFor="deliveryState">State *</label>
                <input
                  type="text"
                  id="deliveryState"
                  name="deliveryState"
                  value={formData.deliveryState}
                  onChange={handleChange}
                  placeholder="Enter state"
                  autoComplete="address-level1"
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="deliveryPincode">Pincode *</label>
                <input
                  type="text"
                  id="deliveryPincode"
                  name="deliveryPincode"
                  value={formData.deliveryPincode}
                  onChange={handleChange}
                  placeholder="6-digit pincode"
                  maxLength="6"
                  pattern="[0-9]*"
                  inputMode="numeric"
                  className={errors.deliveryPincode ? "error" : ""}
                />
                {errors.deliveryPincode && <span className="error-msg">{errors.deliveryPincode}</span>}
              </div>
            </div>
            
            <div className="step-footer">
              <button type="button" className="btn-secondary" onClick={prevStep}>
                ← Back
              </button>
              <button type="button" className="btn-primary" onClick={nextStep}>
                Continue →
              </button>
            </div>
          </div>
        );
        
      case 4:
        return (
          <div className="form-step fade-in">
            <div className="step-header">
              <span className="step-number">4</span>
              <h3>📦 Shipment Details</h3>
              <p>Tell us about your package</p>
            </div>
            
            {/* Service Type Selection */}
            <div className="form-group full-width">
              <label>Service Type *</label>
              <div className="service-options">
                {[
                  { value: "standard", label: "Standard", desc: "3-5 days", icon: "📦" },
                  { value: "express", label: "Express", desc: "1-2 days", icon: "🚀" },
                  { value: "same-day", label: "Same Day", desc: "Today", icon: "⚡" },
                  { value: "international", label: "International", desc: "5-10 days", icon: "🌍" }
                ].map(service => (
                  <label 
                    key={service.value}
                    className={`service-option ${formData.serviceType === service.value ? "selected" : ""}`}
                  >
                    <input
                      type="radio"
                      name="serviceType"
                      value={service.value}
                      checked={formData.serviceType === service.value}
                      onChange={handleChange}
                    />
                    <div className="service-card">
                      <span className="service-icon">{service.icon}</span>
                      <div className="service-text">
                        <strong>{service.label}</strong>
                        <span className="service-desc">{service.desc}</span>
                      </div>
                    </div>
                  </label>
                ))}
              </div>
              {errors.serviceType && <span className="error-msg">{errors.serviceType}</span>}
            </div>
            
            {/* Weight & Dimensions */}
            <div className="form-grid">
              <div className="form-group">
                <label htmlFor="weight">Weight (kg) *</label>
                <input
                  type="number"
                  id="weight"
                  name="weight"
                  value={formData.weight}
                  onChange={handleChange}
                  placeholder="0.5"
                  min="0.1"
                  step="0.1"
                  className={errors.weight ? "error" : ""}
                />
                {errors.weight && <span className="error-msg">{errors.weight}</span>}
              </div>
              
              <div className="form-group">
                <label htmlFor="packageCount">Number of Packages</label>
                <input
                  type="number"
                  id="packageCount"
                  name="packageCount"
                  value={formData.packageCount}
                  onChange={handleChange}
                  min="1"
                  max="100"
                />
              </div>
            </div>
            
            {/* Dimensions Toggle */}
            <details className="dimensions-toggle">
              <summary>📐 Add Dimensions (Optional)</summary>
              <div className="form-grid">
                <div className="form-group">
                  <label htmlFor="length">Length (cm)</label>
                  <input
                    type="number"
                    id="length"
                    name="length"
                    value={formData.length}
                    onChange={handleChange}
                    placeholder="0"
                    min="0"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="width">Width (cm)</label>
                  <input
                    type="number"
                    id="width"
                    name="width"
                    value={formData.width}
                    onChange={handleChange}
                    placeholder="0"
                    min="0"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="height">Height (cm)</label>
                  <input
                    type="number"
                    id="height"
                    name="height"
                    value={formData.height}
                    onChange={handleChange}
                    placeholder="0"
                    min="0"
                  />
                </div>
              </div>
            </details>
            
            {/* Add-ons */}
            <div className="addons-grid">
              <label className="addon-option">
                <input
                  type="checkbox"
                  name="insurance"
                  checked={formData.insurance}
                  onChange={handleChange}
                />
                <div className="addon-card">
                  <span className="addon-icon">🛡️</span>
                  <div className="addon-text">
                    <strong>Shipping Insurance</strong>
                    <span>2% of declared value</span>
                  </div>
                </div>
              </label>
              
              <label className="addon-option">
                <input
                  type="checkbox"
                  name="cod"
                  checked={formData.cod}
                  onChange={handleChange}
                />
                <div className="addon-card">
                  <span className="addon-icon">💰</span>
                  <div className="addon-text">
                    <strong>Cash on Delivery</strong>
                    <span>2% of COD amount</span>
                  </div>
                </div>
              </label>
            </div>
            
            {/* Declared Value for Insurance/COD */}
            {(formData.insurance || formData.cod) && (
              <div className="form-group">
                <label htmlFor="declaredValue">Declared Value (₹)</label>
                <input
                  type="number"
                  id="declaredValue"
                  name="declaredValue"
                  value={formData.declaredValue}
                  onChange={handleChange}
                  placeholder="Enter package value"
                  min="0"
                />
              </div>
            )}
            
            {/* Real-time Quote Preview */}
            {quote && (
              <div className="quote-preview">
                <div className="quote-header" onClick={() => setShowBreakdown(!showBreakdown)} role="button" tabIndex={0}>
                  <div>
                    <strong>Estimated Quote: ₹{quote.total.toLocaleString()}</strong>
                    <p className="quote-delivery">{quote.deliveryEstimate}</p>
                  </div>
                  <span className="toggle-icon" aria-hidden="true">{showBreakdown ? "▼" : "▶"}</span>
                </div>
                
                {showBreakdown && (
                  <div className="quote-breakdown">
                    <div className="breakdown-row">
                      <span>Chargeable Weight</span>
                      <span>{quote.chargeableWeight} kg</span>
                    </div>
                    <div className="breakdown-row">
                      <span>Base Rate</span>
                      <span>₹{{ standard: 50, express: 120, "same-day": 250, international: 800 }[formData.serviceType]}</span>
                    </div>
                    <div className="breakdown-row">
                      <span>Weight Charges</span>
                      <span>₹{Math.round((quote.chargeableWeight * 10 * (formData.pickupState === formData.deliveryState ? 1.5 : 2.5)))}</span>
                    </div>
                    {formData.insurance && formData.declaredValue && (
                      <div className="breakdown-row">
                        <span>Insurance (2%)</span>
                        <span>₹{Math.round(formData.declaredValue * 0.02)}</span>
                      </div>
                    )}
                    {formData.cod && formData.declaredValue && (
                      <div className="breakdown-row">
                        <span>COD Fee (2%)</span>
                        <span>₹{Math.round(formData.declaredValue * 0.02)}</span>
                      </div>
                    )}
                    {formData.packageCount > 1 && (
                      <div className="breakdown-row">
                        <span>Extra Packages</span>
                        <span>₹{(formData.packageCount - 1) * 20}</span>
                      </div>
                    )}
                    <div className="breakdown-row">
                      <span>GST (18%)</span>
                      <span>₹{quote.gst.toLocaleString()}</span>
                    </div>
                    <div className="breakdown-total">
                      <span>Total</span>
                      <strong>₹{quote.total.toLocaleString()}</strong>
                    </div>
                  </div>
                )}
              </div>
            )}
            
            <div className="step-footer">
              <button type="button" className="btn-secondary" onClick={prevStep}>
                ← Back
              </button>
              <button type="button" className="btn-primary" onClick={nextStep}>
                Review & Submit →
              </button>
            </div>
          </div>
        );
        
      case 5:
        return (
          <div className="form-step fade-in">
            <div className="step-header">
              <span className="step-number">5</span>
              <h3>✅ Review & Submit</h3>
              <p>Confirm your quote request</p>
            </div>
            
            {/* Summary Card */}
            <div className="summary-card">
              <h4>📋 Quote Summary</h4>
              
              <div className="summary-section">
                <h5>👤 Contact</h5>
                <p><strong>{formData.name}</strong><br/>
                {formData.email} • +91 {formData.phone}<br/>
                {formData.company && <>{formData.company}<br/></>}</p>
              </div>
              
              <div className="summary-section">
                <h5>📍 Route</h5>
                <p><strong>From:</strong> {formData.pickupCity}, {formData.pickupState}<br/>
                <strong>To:</strong> {formData.deliveryCity}, {formData.deliveryState}</p>
              </div>
              
              <div className="summary-section">
                <h5>📦 Shipment</h5>
                <p>
                  Service: <strong>{formData.serviceType.replace("-", " ").toUpperCase()}</strong><br/>
                  Weight: <strong>{formData.weight} kg</strong><br/>
                  Packages: <strong>{formData.packageCount}</strong><br/>
                  {formData.insurance && <>Insurance: <strong>Yes</strong><br/></>}
                  {formData.cod && <>COD: <strong>Yes</strong><br/></>}
                </p>
              </div>
              
              {quote && (
                <div className="summary-section highlight">
                  <h5>💰 Estimated Cost</h5>
                  <p className="quote-total">₹{quote.total.toLocaleString()}</p>
                  <p className="quote-note">* Final price may vary after physical verification</p>
                </div>
              )}
            </div>
            
            {/* Terms */}
            <label className="terms-checkbox">
              <input type="checkbox" required />
              <span>I agree to the <a href="/terms" target="_blank" rel="noopener">Terms of Service</a> and <a href="/privacy" target="_blank" rel="noopener">Privacy Policy</a></span>
            </label>
            
            {errors.submit && (
              <div className="global-error" role="alert">⚠️ {errors.submit}</div>
            )}
            
            <div className="step-footer">
              <button type="button" className="btn-secondary" onClick={prevStep} disabled={loading}>
                ← Edit
              </button>
              <button 
                type="submit" 
                className="btn-primary btn-submit"
                onClick={handleSubmit}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <span className="spinner"></span>
                    Submitting...
                  </>
                ) : (
                  `Get Quote - ₹${quote?.total.toLocaleString() || "0"}`
                )}
              </button>
            </div>
          </div>
        );
        
      default:
        return null;
    }
  };

  return (
    <Layout>
      {/* Hero Section */}
      <section className="quote-hero">
        <div className="hero-content">
          <h1>Get Your Instant Quote</h1>
          <p>Transparent pricing with no hidden fees. Get a customized quote in seconds.</p>
          
          {/* Progress Indicator */}
          <div className="progress-indicator">
            {[1, 2, 3, 4, 5].map(step => (
              <div 
                key={step} 
                className={`progress-dot ${step === currentStep ? "active" : step < currentStep ? "completed" : ""}`}
              />
            ))}
            <div className="progress-line" style={{ width: `${(currentStep - 1) * 25}%` }} />
          </div>
        </div>
      </section>
      
      {/* Quote Form */}
      <main className="quote-form-container">
        <form className="quote-form" onSubmit={handleSubmit}>
          {renderStep()}
        </form>
        
        {/* Trust Badges */}
        <div className="trust-badges">
          <div className="badge">
            <span>🔒</span>
            <span>Secure & Encrypted</span>
          </div>
          <div className="badge">
            <span>⚡</span>
            <span>Instant Response</span>
          </div>
          <div className="badge">
            <span>💯</span>
            <span>No Hidden Charges</span>
          </div>
        </div>
      </main>
      
      {/* Features Section */}
      <section className="quote-features">
        <h2>Why Get a Quote With ATIRATH?</h2>
        <div className="features-grid">
          <div className="feature-card">
            <span className="feature-icon">🎯</span>
            <h3>Accurate Pricing</h3>
            <p>Real-time calculation based on weight, distance, and service type.</p>
          </div>
          <div className="feature-card">
            <span className="feature-icon">🔄</span>
            <h3>Flexible Options</h3>
            <p>Choose from standard, express, same-day, or international shipping.</p>
          </div>
          <div className="feature-card">
            <span className="feature-icon">🛡️</span>
            <h3>Fully Insured</h3>
            <p>Optional insurance coverage up to ₹10 lakhs for peace of mind.</p>
          </div>
          <div className="feature-card">
            <span className="feature-icon">💬</span>
            <h3>Expert Support</h3>
            <p>Our logistics experts are available 24/7 to help you choose the best option.</p>
          </div>
        </div>
      </section>
    </Layout>
  );
}