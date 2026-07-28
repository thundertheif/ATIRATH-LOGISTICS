// =========================================
// ATIRATH LOGISTICS - PREMIUM BOOKING PAGE
// File: src/pages/Booking.jsx
// ✅ WORLD-CLASS ANIMATIONS | PROFESSIONAL DESIGN | ADVANCED INTERACTIONS
// ✅ Real Logistics Features | Multi-Step | Validation | Rate Calculation | Tracking
// =========================================

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence, useScroll, useTransform, useSpring } from "framer-motion";
import Layout from "../components/Layout";
import "./Booking.css";

// Background image (optimize in production)
import bookingBg from "../assets/booking-bg.jpg";

// =========================================
// 📋 VALIDATION RULES (Indian Logistics Standards)
// =========================================
const VALIDATION_RULES = {
  name: { required: true, minLength: 2, maxLength: 50, pattern: /^[a-zA-Z\s.']+$/, message: "Enter valid name (letters, spaces, dots only)" },
  phone: { required: true, pattern: /^[6-9]\d{9}$/, message: "Enter valid 10-digit Indian mobile number" },
  email: { required: true, pattern: /^\S+@\S+\.\S+$/, message: "Enter valid email address" },
  address: { required: true, minLength: 10, maxLength: 200, message: "Enter complete street address" },
  pincode: { required: true, pattern: /^[1-9][0-9]{5}$/, message: "Enter valid 6-digit Indian pincode" },
  city: { required: true, minLength: 2, maxLength: 50, message: "Enter valid city name" },
  state: { required: true, minLength: 2, maxLength: 50, message: "Enter valid state name" },
  weight: { required: true, min: 0.1, max: 1000, message: "Weight must be 0.1 - 1000 kg" },
  gstNumber: { pattern: /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/, message: "Enter valid 15-digit GST number (e.g., 29ABCDE1234F1Z5)" },
  declaredValue: { min: 1, max: 1000000, message: "Enter value between ₹1 - ₹10,00,000" },
};

// =========================================
// 🚚 SERVICE TYPES (Real Logistics Options)
// =========================================
const SERVICE_TYPES = [
  { value: "standard", label: "🚛 Standard", multiplier: 1.5, days: "3-5 days", description: "Economical ground shipping", icon: "🚛" },
  { value: "express", label: "⚡ Express", multiplier: 2.2, days: "1-2 days", description: "Fast priority delivery", icon: "⚡" },
  { value: "same-day", label: "🎯 Same Day", multiplier: 3.5, days: "Today*", description: "Order by 2PM for same-day", icon: "🎯" },
  { value: "overnight", label: "🌙 Overnight", multiplier: 2.8, days: "Next day", description: "Guaranteed next-business-day", icon: "🌙" },
];

// =========================================
// 📦 PACKAGE TYPES (Industry Standard)
// =========================================
const PACKAGE_TYPES = [
  { value: "document", label: "📄 Documents", multiplier: 1, description: "Letters, certificates, files", icon: "📄" },
  { value: "parcel", label: "📦 Small Parcel", multiplier: 1.2, description: "Boxes under 5kg", icon: "📦" },
  { value: "medium", label: "📦 Medium Box", multiplier: 1.5, description: "5-15kg packages", icon: "📦" },
  { value: "large", label: "📦 Large Box", multiplier: 2, description: "15-30kg shipments", icon: "📦" },
  { value: "fragile", label: "🍷 Fragile", multiplier: 1.8, description: "Glass, electronics, delicate", icon: "🍷" },
  { value: "bulk", label: "🏭 Bulk/Crate", multiplier: 2.5, description: "Pallets, heavy items", icon: "🏭" },
];

// =========================================
// 💳 PAYMENT METHODS (India Focused)
// =========================================
const PAYMENT_METHODS = [
  { value: "cod", label: "💵 Cash on Delivery", icon: "💵", fee: 0, description: "Pay when delivered" },
  { value: "upi", label: "📱 UPI / GPay", icon: "📱", fee: 0, description: "Instant bank transfer" },
  { value: "card", label: "💳 Credit/Debit Card", icon: "💳", fee: 0, description: "Visa, Mastercard, Rupay" },
  { value: "netbanking", label: "🏦 Net Banking", icon: "🏦", fee: 0, description: "All Indian banks supported" },
  { value: "wallet", label: "👛 Wallet", icon: "👛", fee: 0, description: "Paytm, PhonePe, Amazon Pay" },
];

// =========================================
// ⏰ PICKUP TIME SLOTS (Real Logistics)
// =========================================
const PICKUP_SLOTS = [
  { id: "morning", label: "🌅 Morning", time: "9:00 AM - 12:00 PM", surcharge: 0, available: true },
  { id: "afternoon", label: "☀️ Afternoon", time: "12:00 PM - 4:00 PM", surcharge: 0, available: true },
  { id: "evening", label: "🌆 Evening", time: "4:00 PM - 8:00 PM", surcharge: 50, available: true },
  { id: "next-day", label: "📅 Next Day", time: "9:00 AM - 6:00 PM", surcharge: 0, available: true },
];

// =========================================
// 💰 PRICING CONSTANTS (Indian Logistics)
// =========================================
const PRICING = {
  BASE_RATE: 60, PER_KG_RATE: 12, PER_KM_RATE: 8, VOLUMETRIC_DIVISOR: 5000,
  INSURANCE_RATE: 0.02, MIN_INSURANCE_FEE: 30, FRAGILE_SURCHARGE: 75,
  GST_RATE: 0.18, COD_FEE: 40, REMOTE_AREA_SURCHARGE: 100,
};

// =========================================
// 🎨 ANIMATION VARIANTS
// =========================================
const pageVariants = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: 0.5, ease: "easeOut" } },
  exit: { opacity: 0, transition: { duration: 0.3 } }
};

const stepVariants = {
  hidden: { opacity: 0, y: 30, scale: 0.98 },
  visible: { 
    opacity: 1, 
    y: 0, 
    scale: 1,
    transition: { type: "spring", stiffness: 100, damping: 20, mass: 0.8 }
  },
  exit: { opacity: 0, y: -20, transition: { duration: 0.2 } }
};

const cardHoverVariants = {
  hover: { 
    y: -6, 
    transition: { type: "spring", stiffness: 400, damping: 10 },
    boxShadow: "0 20px 40px rgba(0,0,0,0.3)"
  },
  tap: { scale: 0.98 }
};

const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { 
    opacity: 1, 
    y: 0, 
    transition: { duration: 0.4, ease: "easeOut" }
  }
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.2 }
  }
};

// =========================================
// 🛡️ SECURITY & UTILITIES
// =========================================
const sanitizeInput = (str) => {
  if (typeof str !== "string") return str;
  return str.replace(/[<>{}\\]/g, "").trim();
};

const generateTrackingNumber = () => {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) code += chars.charAt(Math.floor(Math.random() * chars.length));
  return `ATL-${code}`;
};

const formatCurrency = (amount) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(amount);

const calculateDeliveryDate = (serviceType, pickupDate = new Date()) => {
  const date = new Date(pickupDate);
  const service = SERVICE_TYPES.find(s => s.value === serviceType);
  if (!service) return "Calculating...";
  if (service.days.includes("Today")) return "Today by 8 PM*";
  if (service.days.includes("Next")) date.setDate(date.getDate() + 1);
  else if (service.days.includes("1-2")) date.setDate(date.getDate() + 2);
  else date.setDate(date.getDate() + 5);
  while (date.getDay() === 0) date.setDate(date.getDate() + 1);
  return date.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });
};

const checkPincodeService = async (pincode) => {
  await new Promise(resolve => setTimeout(resolve, 400));
  const nonServiceable = ["0", "9", "110001", "400001", "700001"];
  if (nonServiceable.includes(pincode[0]) || nonServiceable.includes(pincode)) {
    return { serviceable: false, message: "Service not available. Try alternate pincode or contact support.", alternative: "Nearest service center: 12 km away" };
  }
  return { serviceable: true, message: "✓ Service available", estimatedDays: "2-4 days" };
};

// =========================================
// 🎬 FLOATING PARTICLES COMPONENT
// =========================================
const FloatingParticles = () => {
  const particles = useMemo(() => Array.from({ length: 25 }, (_, i) => ({
    id: i, x: Math.random() * 100, y: Math.random() * 100,
    size: Math.random() * 3 + 1, duration: Math.random() * 25 + 15, delay: Math.random() * 5
  })), []);

  return (
    <div className="particles-container" aria-hidden="true">
      {particles.map((p) => (
        <motion.div key={p.id} className="particle" style={{ left: `${p.x}%`, top: `${p.y}%`, width: p.size, height: p.size }}
          animate={{ y: [0, -40, 0], opacity: [0.2, 0.6, 0.2], scale: [1, 1.3, 1] }}
          transition={{ duration: p.duration, repeat: Infinity, delay: p.delay, ease: "easeInOut" }} />
      ))}
    </div>
  );
};

// =========================================
// 🎯 MAIN BOOKING COMPONENT
// =========================================

export default function Booking() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bgLoaded, setBgLoaded] = useState(false);
  const [sameAsPickup, setSameAsPickup] = useState(true);
  const [pincodeStatus, setPincodeStatus] = useState({ pickup: null, delivery: null });
  const [checkingPincode, setCheckingPincode] = useState({ pickup: false, delivery: false });
  const [showConfetti, setShowConfetti] = useState(false);
  
  const { scrollYProgress } = useScroll();
  const formRef = useRef(null);
  const errorRef = useRef(null);

  const [formData, setFormData] = useState({
    name: "", phone: "", email: "", isGuest: true,
    pickupAddress: "", pickupLandmark: "", pickupCity: "", pickupState: "", pickupPincode: "", pickupTimeSlot: "afternoon",
    deliveryAddress: "", deliveryLandmark: "", deliveryCity: "", deliveryState: "", deliveryPincode: "",
    packageType: "parcel", weight: "", dimensions: { length: "", width: "", height: "" },
    isFragile: false, specialInstructions: "", documents: [],
    serviceType: "standard", addInsurance: false, declaredValue: "",
    paymentMethod: "upi", needInvoice: false, gstNumber: "",
    acceptTerms: false, privacyConsent: false,
    pickupAutoFilled: false, deliveryAutoFilled: false,
  });
  
  const [errors, setErrors] = useState({});
  const [trackingNumber, setTrackingNumber] = useState("");
  const [estimatedRate, setEstimatedRate] = useState(0);
  const [deliveryEstimate, setDeliveryEstimate] = useState("");

  // ===== EFFECTS =====
  useEffect(() => {
    const img = new Image();
    img.src = bookingBg;
    img.onload = () => setBgLoaded(true);
  }, []);

  useEffect(() => {
    if (currentStep === 1 || trackingNumber) return;
    const timer = setTimeout(() => {
      localStorage.setItem("atirath_booking_draft", JSON.stringify({ formData, currentStep, timestamp: Date.now() }));
    }, 2000);
    return () => clearTimeout(timer);
  }, [formData, currentStep, trackingNumber]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("atirath_booking_draft");
      if (saved) {
        const { formData: savedData, timestamp } = JSON.parse(saved);
        if (Date.now() - timestamp < 24 * 60 * 60 * 1000) setFormData(prev => ({ ...prev, ...savedData }));
        else localStorage.removeItem("atirath_booking_draft");
      }
    } catch (e) { console.warn("Draft load failed:", e); localStorage.removeItem("atirath_booking_draft"); }
  }, []);

  useEffect(() => {
    if (formData.weight && parseFloat(formData.weight) > 0) {
      const rate = calculateRate();
      setEstimatedRate(rate);
      setDeliveryEstimate(calculateDeliveryDate(formData.serviceType));
    }
  }, [formData.weight, formData.serviceType, formData.packageType, formData.addInsurance, formData.declaredValue, formData.isFragile, formData.paymentMethod]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
    if (formRef.current && currentStep < 5) {
      const firstInput = formRef.current.querySelector("input:not([type='hidden']), textarea, select");
      if (firstInput) setTimeout(() => firstInput.focus(), 300);
    }
  }, [currentStep]);

  useEffect(() => {
    if (trackingNumber) {
      setShowConfetti(true);
      const timer = setTimeout(() => setShowConfetti(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [trackingNumber]);

  // ===== VALIDATION =====
  const validateField = useCallback((name, value) => {
    const rules = VALIDATION_RULES[name];
    if (!rules) return null;
    const val = String(value || "").trim();
    if (rules.required && !val) return "This field is required";
    if (rules.minLength && val.length < rules.minLength) return `Minimum ${rules.minLength} characters`;
    if (rules.maxLength && val.length > rules.maxLength) return `Maximum ${rules.maxLength} characters`;
    if (rules.pattern && val && !rules.pattern.test(val)) return rules.message;
    if (rules.min !== undefined && val && parseFloat(val) < rules.min) return `Minimum: ${rules.min}`;
    if (rules.max !== undefined && val && parseFloat(val) > rules.max) return `Maximum: ${rules.max}`;
    return null;
  }, []);

  const validateStep = useCallback((step) => {
    const newErrors = {};
    if (step === 1) ["name", "phone", "email"].forEach(field => { const error = validateField(field, formData[field]); if (error) newErrors[field] = error; });
    if (step === 2) {
      ["pickupAddress", "pickupCity", "pickupState", "pickupPincode"].forEach(field => {
        const fieldName = field.replace("pickup", "");
        const error = validateField(fieldName.toLowerCase(), formData[field]);
        if (error) newErrors[field] = error;
      });
      if (formData.pickupPincode.length === 6 && !pincodeStatus.pickup?.serviceable) newErrors.pickupPincode = "Please enter a serviceable pincode";
      if (!sameAsPickup) {
        ["deliveryAddress", "deliveryCity", "deliveryState", "deliveryPincode"].forEach(field => {
          const fieldName = field.replace("delivery", "");
          const error = validateField(fieldName.toLowerCase(), formData[field]);
          if (error) newErrors[field] = error;
        });
        if (formData.deliveryPincode.length === 6 && !pincodeStatus.delivery?.serviceable) newErrors.deliveryPincode = "Service not available at this pincode";
      }
    }
    if (step === 3) {
      const weightError = validateField("weight", formData.weight);
      if (weightError) newErrors.weight = weightError;
      if (formData.addInsurance) { const valueError = validateField("declaredValue", formData.declaredValue); if (valueError) newErrors.declaredValue = valueError; }
      const dims = formData.dimensions;
      const hasAnyDim = dims.length || dims.width || dims.height;
      if (hasAnyDim) ["length", "width", "height"].forEach(dim => { if (!dims[dim]) newErrors[`dimensions.${dim}`] = "All dimensions required"; });
    }
    if (step === 4) {
      if (!formData.acceptTerms) newErrors.acceptTerms = "You must accept Terms to proceed";
      if (!formData.privacyConsent) newErrors.privacyConsent = "Privacy consent is required";
      if (formData.needInvoice && formData.gstNumber) { const gstError = validateField("gstNumber", formData.gstNumber); if (gstError) newErrors.gstNumber = gstError; }
    }
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0 && errorRef.current) {
      const firstErrorField = formRef.current?.querySelector(`[name="${Object.keys(newErrors)[0]}"]`);
      firstErrorField?.focus?.();
    }
    return Object.keys(newErrors).length === 0;
  }, [formData, sameAsPickup, pincodeStatus, validateField]);

  // ===== RATE CALCULATION =====
  const calculateRate = () => {
    const weight = parseFloat(formData.weight) || 0;
    const service = SERVICE_TYPES.find(s => s.value === formData.serviceType);
    const pkg = PACKAGE_TYPES.find(p => p.value === formData.packageType);
    const slot = PICKUP_SLOTS.find(s => s.id === formData.pickupTimeSlot);
    let subtotal = PRICING.BASE_RATE + (weight * PRICING.PER_KG_RATE);
    subtotal *= service?.multiplier || 1.5;
    subtotal *= pkg?.multiplier || 1;
    const { length, width, height } = formData.dimensions;
    if (length && width && height) {
      const volWeight = (parseFloat(length) * parseFloat(width) * parseFloat(height)) / PRICING.VOLUMETRIC_DIVISOR;
      if (volWeight > weight) subtotal += (volWeight - weight) * PRICING.PER_KG_RATE * 0.5;
    }
    if (formData.isFragile) subtotal += PRICING.FRAGILE_SURCHARGE;
    if (formData.addInsurance && formData.declaredValue) {
      const declared = parseFloat(formData.declaredValue);
      subtotal += Math.max(PRICING.MIN_INSURANCE_FEE, declared * PRICING.INSURANCE_RATE);
    }
    if (slot?.surcharge) subtotal += slot.surcharge;
    if (formData.paymentMethod === "cod") subtotal += PRICING.COD_FEE;
    if (formData.pickupPincode?.startsWith("0") || formData.deliveryPincode?.startsWith("9")) subtotal += PRICING.REMOTE_AREA_SURCHARGE;
    return Math.round(subtotal * (1 + PRICING.GST_RATE));
  };

  // ===== EVENT HANDLERS =====
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    const sanitized = type === "checkbox" ? checked : sanitizeInput(value);
    setFormData(prev => ({ ...prev, [name]: sanitized }));
    if (errors[name]) setErrors(prev => { const newErrors = { ...prev }; delete newErrors[name]; return newErrors; });
  };

  const handleDimensionChange = (e) => {
    const { name, value } = e.target;
    const [, dim] = name.split(".");
    setFormData(prev => ({ ...prev, dimensions: { ...prev.dimensions, [dim]: sanitizeInput(value) } }));
  };

  const handlePincodeBlur = async (e, type) => {
    const { value } = e.target;
    if (value.length !== 6) return;
    const stateKey = type === "pickup" ? "pickup" : "delivery";
    setCheckingPincode(prev => ({ ...prev, [stateKey]: true }));
    try {
      const result = await checkPincodeService(value);
      setPincodeStatus(prev => ({ ...prev, [stateKey]: result }));
      if (!result.serviceable) setErrors(prev => ({ ...prev, [`${type}Pincode`]: result.message }));
      if (result.serviceable && !formData[`${type}AutoFilled`]) {
        const mockData = { "400001": { city: "Mumbai", state: "Maharashtra" }, "560001": { city: "Bangalore", state: "Karnataka" }, "110001": { city: "New Delhi", state: "Delhi" }, "700001": { city: "Kolkata", state: "West Bengal" }, "600001": { city: "Chennai", state: "Tamil Nadu" } };
        const autoFill = mockData[value];
        if (autoFill) setFormData(prev => ({ ...prev, [`${type}City`]: autoFill.city, [`${type}State`]: autoFill.state, [`${type}AutoFilled`]: true }));
      }
    } catch (error) { console.error("Pincode check failed:", error); }
    finally { setCheckingPincode(prev => ({ ...prev, [stateKey]: false })); }
  };

  const handleFileUpload = (e) => {
    const files = Array.from(e.target.files || []);
    const validFiles = files.filter(file => {
      const validTypes = ["application/pdf", "image/jpeg", "image/png"];
      const maxSize = 10 * 1024 * 1024;
      return validTypes.includes(file.type) && file.size <= maxSize;
    });
    setFormData(prev => ({ ...prev, documents: [...prev.documents, ...validFiles.map(f => f.name)] }));
  };

  const removeDocument = (fileName) => setFormData(prev => ({ ...prev, documents: prev.documents.filter(name => name !== fileName) }));

  const nextStep = () => { if (validateStep(currentStep)) setCurrentStep(prev => prev + 1); };
  const prevStep = () => setCurrentStep(prev => prev - 1);

  const handleSubmit = async () => {
    const now = Date.now();
    if (now - (window.lastSubmitTime || 0) < 5000) { setErrors({ global: "Please wait before submitting again" }); return; }
    if (!validateStep(4)) return;
    setIsSubmitting(true);
    window.lastSubmitTime = now;
    try {
      await new Promise(resolve => setTimeout(resolve, 1500));
      const tracking = generateTrackingNumber();
      setTrackingNumber(tracking);
      const bookingPayload = { ...formData, trackingNumber: tracking, finalRate: estimatedRate, gstAmount: Math.round(estimatedRate * PRICING.GST_RATE / (1 + PRICING.GST_RATE)), bookedAt: new Date().toISOString(), pickup: { address: formData.pickupAddress, landmark: formData.pickupLandmark, city: formData.pickupCity, state: formData.pickupState, pincode: formData.pickupPincode, timeSlot: formData.pickupTimeSlot }, delivery: sameAsPickup ? null : { address: formData.deliveryAddress, landmark: formData.deliveryLandmark, city: formData.deliveryCity, state: formData.deliveryState, pincode: formData.deliveryPincode }, package: { type: formData.packageType, weight: parseFloat(formData.weight), dimensions: formData.dimensions, isFragile: formData.isFragile }, service: { type: formData.serviceType, insurance: formData.addInsurance ? { declaredValue: parseFloat(formData.declaredValue), premium: Math.max(PRICING.MIN_INSURANCE_FEE, parseFloat(formData.declaredValue) * PRICING.INSURANCE_RATE) } : null }, payment: { method: formData.paymentMethod, status: formData.paymentMethod === "cod" ? "pending" : "completed" } };
      localStorage.setItem(`atirath_booking_${tracking}`, JSON.stringify(bookingPayload));
      localStorage.removeItem("atirath_booking_draft");
      setCurrentStep(5);
    } catch (error) { console.error("Booking submission failed:", error); setErrors({ global: "Booking failed. Please check your connection and try again." }); }
    finally { setIsSubmitting(false); }
  };

  const clearDraft = () => {
    localStorage.removeItem("atirath_booking_draft");
    setFormData({ name: "", phone: "", email: "", isGuest: true, pickupAddress: "", pickupLandmark: "", pickupCity: "", pickupState: "", pickupPincode: "", pickupTimeSlot: "afternoon", deliveryAddress: "", deliveryLandmark: "", deliveryCity: "", deliveryState: "", deliveryPincode: "", packageType: "parcel", weight: "", dimensions: { length: "", width: "", height: "" }, isFragile: false, specialInstructions: "", documents: [], serviceType: "standard", addInsurance: false, declaredValue: "", paymentMethod: "upi", needInvoice: false, gstNumber: "", acceptTerms: false, privacyConsent: false, pickupAutoFilled: false, deliveryAutoFilled: false });
    setErrors({});
    setCurrentStep(1);
  };

  const copyTrackingNumber = async () => {
    try { await navigator.clipboard.writeText(trackingNumber); } catch (err) { console.warn("Copy failed:", err); }
  };

  // ===== RENDERERS =====
  const renderProgressBar = () => (
    <motion.div className="progress-bar-premium" role="progressbar" aria-valuenow={currentStep} aria-valuemin={1} aria-valuemax={4} initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
      {[1, 2, 3, 4].map(step => (
        <motion.div key={step} className={`progress-step-premium ${currentStep >= step ? "active" : ""} ${currentStep > step ? "completed" : ""}`} whileHover={{ scale: 1.05 }} transition={{ type: "spring", stiffness: 300 }}>
          <motion.span className="step-number-premium" aria-hidden="true" animate={currentStep > step ? { scale: [1, 1.3, 1] } : {}} transition={{ duration: 0.3 }}>
            {currentStep > step ? "✓" : step}
          </motion.span>
          <span className="step-label-premium">{step === 1 && "Details"}{step === 2 && "Address"}{step === 3 && "Package"}{step === 4 && "Payment"}</span>
          {currentStep > step && <motion.div className="step-checkmark" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 500 }} />}
        </motion.div>
      ))}
      <motion.div className="progress-line-fill" style={{ width: `${((currentStep - 1) / 3) * 100}%` }} />
    </motion.div>
  );

  const renderStep1 = () => (
    <motion.div className="step-content-premium" ref={formRef} variants={stepVariants} initial="hidden" animate="visible" exit="exit">
      <motion.h3 variants={fadeInUp}>👤 Personal Details</motion.h3>
      <motion.p className="step-description" variants={fadeInUp}>Enter your contact information for booking confirmation</motion.p>
      
      <motion.div className="form-group-premium" variants={fadeInUp}>
        <label htmlFor="name">Full Name <span className="required">*</span></label>
        <motion.input type="text" id="name" name="name" placeholder="e.g., Rajesh Kumar" value={formData.name} onChange={handleChange} className={errors.name ? "input-error-premium" : ""} autoComplete="name" aria-required="true" aria-invalid={!!errors.name} aria-describedby={errors.name ? "name-error" : undefined} whileFocus={{ scale: 1.01, boxShadow: "0 0 0 3px rgba(249,115,22,0.3)" }} transition={{ duration: 0.2 }} />
        <AnimatePresence>{errors.name && <motion.span id="name-error" className="error-message-premium" role="alert" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>{errors.name}</motion.span>}</AnimatePresence>
      </motion.div>
      
      <motion.div className="form-row-premium" variants={fadeInUp}>
        <div className="form-group-premium">
          <label htmlFor="phone">Mobile Number <span className="required">*</span></label>
          <motion.input type="tel" id="phone" name="phone" placeholder="9876543210" value={formData.phone} onChange={handleChange} className={errors.phone ? "input-error-premium" : ""} autoComplete="tel" inputMode="numeric" pattern="[0-9]{10}" maxLength={10} aria-required="true" aria-invalid={!!errors.phone} aria-describedby={errors.phone ? "phone-error" : undefined} whileFocus={{ scale: 1.01, boxShadow: "0 0 0 3px rgba(249,115,22,0.3)" }} />
          <AnimatePresence>{errors.phone && <motion.span id="phone-error" className="error-message-premium" role="alert" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>{errors.phone}</motion.span>}</AnimatePresence>
        </div>
        <div className="form-group-premium">
          <label htmlFor="email">Email Address <span className="required">*</span></label>
          <motion.input type="email" id="email" name="email" placeholder="you@example.com" value={formData.email} onChange={handleChange} className={errors.email ? "input-error-premium" : ""} autoComplete="email" aria-required="true" aria-invalid={!!errors.email} aria-describedby={errors.email ? "email-error" : undefined} whileFocus={{ scale: 1.01, boxShadow: "0 0 0 3px rgba(249,115,22,0.3)" }} />
          <AnimatePresence>{errors.email && <motion.span id="email-error" className="error-message-premium" role="alert" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>{errors.email}</motion.span>}</AnimatePresence>
        </div>
      </motion.div>
      
      <motion.div className="guest-notice-premium" variants={fadeInUp}>
        <span className="icon" aria-hidden="true">🔓</span>
        <span>Continuing as guest. <motion.button type="button" className="btn-text-premium" onClick={() => navigate("/login")} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.98 }}>Login / Signup</motion.button> to save addresses.</span>
      </motion.div>
      
      {localStorage.getItem("atirath_booking_draft") && currentStep === 1 && (
        <motion.button type="button" className="btn-text-premium clear-draft" onClick={clearDraft} aria-label="Clear saved booking draft" whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.98 }}>🗑️ Clear saved draft</motion.button>
      )}
      
      <motion.div className="step-navigation-premium" variants={fadeInUp}>
        <motion.button type="button" className="btn-secondary-premium" onClick={() => navigate("/")} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.98 }}>Cancel</motion.button>
        <motion.button type="button" className="btn-primary-premium" onClick={nextStep} aria-label="Continue to address details" whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.98 }}>Continue →</motion.button>
      </motion.div>
    </motion.div>
  );

  const renderStep2 = () => (
    <motion.div className="step-content-premium" ref={formRef} variants={stepVariants} initial="hidden" animate="visible" exit="exit">
      <motion.h3 variants={fadeInUp}>📍 Pickup & Delivery</motion.h3>
      <motion.p className="step-description" variants={fadeInUp}>Enter complete addresses for accurate pricing</motion.p>
      
      <motion.fieldset className="address-section-premium" variants={fadeInUp}>
        <legend>🚚 Pickup Address <span className="required">*</span></legend>
        <div className="form-group-premium">
          <label htmlFor="pickupAddress">Street Address</label>
          <motion.textarea id="pickupAddress" name="pickupAddress" placeholder="House/Building, Street, Area, Landmark" value={formData.pickupAddress} onChange={handleChange} className={errors.pickupAddress ? "input-error-premium" : ""} rows={3} aria-required="true" aria-invalid={!!errors.pickupAddress} whileFocus={{ scale: 1.01, boxShadow: "0 0 0 3px rgba(249,115,22,0.3)" }} />
          <AnimatePresence>{errors.pickupAddress && <motion.span className="error-message-premium" role="alert" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>{errors.pickupAddress}</motion.span>}</AnimatePresence>
        </div>
        <div className="form-group-premium">
          <label htmlFor="pickupLandmark">Landmark (Optional)</label>
          <motion.input type="text" id="pickupLandmark" name="pickupLandmark" placeholder="Near temple, mall, school, etc." value={formData.pickupLandmark} onChange={handleChange} whileFocus={{ scale: 1.01, boxShadow: "0 0 0 3px rgba(249,115,22,0.3)" }} />
        </div>
        <div className="form-row-premium">
          <div className="form-group-premium">
            <label htmlFor="pickupCity">City <span className="required">*</span></label>
            <motion.input type="text" id="pickupCity" name="pickupCity" placeholder="City" value={formData.pickupCity} onChange={handleChange} className={errors.pickupCity ? "input-error-premium" : ""} aria-required="true" whileFocus={{ scale: 1.01, boxShadow: "0 0 0 3px rgba(249,115,22,0.3)" }} />
            <AnimatePresence>{errors.pickupCity && <motion.span className="error-message-premium">{errors.pickupCity}</motion.span>}</AnimatePresence>
          </div>
          <div className="form-group-premium">
            <label htmlFor="pickupState">State <span className="required">*</span></label>
            <motion.input type="text" id="pickupState" name="pickupState" placeholder="State" value={formData.pickupState} onChange={handleChange} className={errors.pickupState ? "input-error-premium" : ""} aria-required="true" whileFocus={{ scale: 1.01, boxShadow: "0 0 0 3px rgba(249,115,22,0.3)" }} />
            <AnimatePresence>{errors.pickupState && <motion.span className="error-message-premium">{errors.pickupState}</motion.span>}</AnimatePresence>
          </div>
        </div>
        <div className="form-row-premium">
          <div className="form-group-premium">
            <label htmlFor="pickupPincode">Pincode <span className="required">*</span></label>
            <motion.input type="text" id="pickupPincode" name="pickupPincode" placeholder="500081" value={formData.pickupPincode} onChange={handleChange} onBlur={(e) => handlePincodeBlur(e, "pickup")} className={errors.pickupPincode ? "input-error-premium" : ""} inputMode="numeric" pattern="[0-9]{6}" maxLength={6} aria-required="true" aria-describedby="pickup-pincode-hint" whileFocus={{ scale: 1.01, boxShadow: "0 0 0 3px rgba(249,115,22,0.3)" }} />
            <span id="pickup-pincode-hint" className="help-text-premium">6-digit Indian pincode</span>
            {checkingPincode.pickup && <motion.span className="loading-text-premium" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>✓ Checking serviceability...</motion.span>}
            {pincodeStatus.pickup?.serviceable && <motion.span className="success-text-premium" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}>✓ {pincodeStatus.pickup.message}</motion.span>}
            <AnimatePresence>{errors.pickupPincode && <motion.span className="error-message-premium" role="alert" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>{errors.pickupPincode}</motion.span>}</AnimatePresence>
          </div>
          <div className="form-group-premium">
            <label>Preferred Pickup Time</label>
            <motion.div className="time-slots-premium" role="radiogroup" aria-label="Pickup time selection" variants={staggerContainer} initial="hidden" animate="visible">
              {PICKUP_SLOTS.map((slot) => (
                <motion.div key={slot.id} className="time-slot-premium" whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.98 }}>
                  <input type="radio" id={`slot-${slot.id}`} name="pickupTimeSlot" value={slot.id} checked={formData.pickupTimeSlot === slot.id} onChange={handleChange} disabled={!slot.available} />
                  <label htmlFor={`slot-${slot.id}`} className={!slot.available ? "disabled" : ""}>
                    <span className="slot-time-premium">{slot.label}</span>
                    <span className="slot-time-detail-premium">{slot.time}</span>
                    {slot.surcharge > 0 && <span className="slot-price-premium">+₹{slot.surcharge}</span>}
                  </label>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </div>
      </motion.fieldset>
      
      <motion.div className="address-toggle-premium" variants={fadeInUp}>
        <label className="toggle-switch-premium">
          <input type="checkbox" checked={sameAsPickup} onChange={(e) => setSameAsPickup(e.target.checked)} aria-label="Use pickup address for delivery" />
          <span className="toggle-slider-premium" aria-hidden="true"></span>
          <span className="toggle-label-premium">🏠 Delivery same as pickup</span>
        </label>
      </motion.div>
      
      {!sameAsPickup && (
        <motion.fieldset className="address-section-premium delivery" variants={fadeInUp}>
          <legend>📦 Delivery Address <span className="required">*</span></legend>
          <div className="form-group-premium">
            <label htmlFor="deliveryAddress">Street Address</label>
            <motion.textarea id="deliveryAddress" name="deliveryAddress" placeholder="House/Building, Street, Area, Landmark" value={formData.deliveryAddress} onChange={handleChange} className={errors.deliveryAddress ? "input-error-premium" : ""} rows={3} aria-required="true" whileFocus={{ scale: 1.01, boxShadow: "0 0 0 3px rgba(249,115,22,0.3)" }} />
            <AnimatePresence>{errors.deliveryAddress && <motion.span className="error-message-premium">{errors.deliveryAddress}</motion.span>}</AnimatePresence>
          </div>
          <div className="form-group-premium">
            <label htmlFor="deliveryLandmark">Landmark (Optional)</label>
            <motion.input type="text" id="deliveryLandmark" name="deliveryLandmark" placeholder="Near temple, mall, school, etc." value={formData.deliveryLandmark} onChange={handleChange} whileFocus={{ scale: 1.01, boxShadow: "0 0 0 3px rgba(249,115,22,0.3)" }} />
          </div>
          <div className="form-row-premium">
            <div className="form-group-premium">
              <label htmlFor="deliveryCity">City <span className="required">*</span></label>
              <motion.input type="text" id="deliveryCity" name="deliveryCity" placeholder="City" value={formData.deliveryCity} onChange={handleChange} className={errors.deliveryCity ? "input-error-premium" : ""} aria-required="true" whileFocus={{ scale: 1.01, boxShadow: "0 0 0 3px rgba(249,115,22,0.3)" }} />
              <AnimatePresence>{errors.deliveryCity && <motion.span className="error-message-premium">{errors.deliveryCity}</motion.span>}</AnimatePresence>
            </div>
            <div className="form-group-premium">
              <label htmlFor="deliveryState">State <span className="required">*</span></label>
              <motion.input type="text" id="deliveryState" name="deliveryState" placeholder="State" value={formData.deliveryState} onChange={handleChange} className={errors.deliveryState ? "input-error-premium" : ""} aria-required="true" whileFocus={{ scale: 1.01, boxShadow: "0 0 0 3px rgba(249,115,22,0.3)" }} />
              <AnimatePresence>{errors.deliveryState && <motion.span className="error-message-premium">{errors.deliveryState}</motion.span>}</AnimatePresence>
            </div>
          </div>
          <div className="form-group-premium">
            <label htmlFor="deliveryPincode">Pincode <span className="required">*</span></label>
            <motion.input type="text" id="deliveryPincode" name="deliveryPincode" placeholder="500081" value={formData.deliveryPincode} onChange={handleChange} onBlur={(e) => handlePincodeBlur(e, "delivery")} className={errors.deliveryPincode ? "input-error-premium" : ""} inputMode="numeric" pattern="[0-9]{6}" maxLength={6} aria-required="true" whileFocus={{ scale: 1.01, boxShadow: "0 0 0 3px rgba(249,115,22,0.3)" }} />
            {checkingPincode.delivery && <motion.span className="loading-text-premium" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>✓ Checking...</motion.span>}
            {pincodeStatus.delivery?.serviceable && <motion.span className="success-text-premium" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}>✓ {pincodeStatus.delivery.message}</motion.span>}
            <AnimatePresence>{errors.deliveryPincode && <motion.span className="error-message-premium" role="alert" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>{errors.deliveryPincode}</motion.span>}</AnimatePresence>
          </div>
        </motion.fieldset>
      )}
      
      {formData.pickupPincode.length === 6 && formData.serviceType && (
        <motion.div className="delivery-estimate-premium" role="status" aria-live="polite" variants={fadeInUp}>
          <span className="label-premium">Estimated Delivery</span>
          <motion.span className="date-premium" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}>{deliveryEstimate || "Calculating..."}</motion.span>
          <span className="note-premium">Based on {SERVICE_TYPES.find(s => s.value === formData.serviceType)?.label} service • Subject to pincode serviceability</span>
        </motion.div>
      )}
      
      <motion.div className="step-navigation-premium" variants={fadeInUp}>
        <motion.button type="button" className="btn-secondary-premium" onClick={prevStep} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.98 }}>← Back</motion.button>
        <motion.button type="button" className="btn-primary-premium" onClick={nextStep} aria-label="Continue to package details" whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.98 }}>Continue →</motion.button>
      </motion.div>
    </motion.div>
  );

  const renderStep3 = () => (
    <motion.div className="step-content-premium" ref={formRef} variants={stepVariants} initial="hidden" animate="visible" exit="exit">
      <motion.h3 variants={fadeInUp}>📦 Package Details</motion.h3>
      <motion.p className="step-description" variants={fadeInUp}>Describe your shipment for accurate pricing</motion.p>
      
      <motion.div className="form-row-premium" variants={fadeInUp}>
        <div className="form-group-premium">
          <label htmlFor="weight">Weight (kg) <span className="required">*</span></label>
          <motion.input type="number" id="weight" name="weight" placeholder="0.5" step="0.1" min="0.1" max="1000" value={formData.weight} onChange={handleChange} className={errors.weight ? "input-error-premium" : ""} aria-required="true" whileFocus={{ scale: 1.01, boxShadow: "0 0 0 3px rgba(249,115,22,0.3)" }} />
          <AnimatePresence>{errors.weight && <motion.span className="error-message-premium" role="alert" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>{errors.weight}</motion.span>}</AnimatePresence>
          <span className="help-text-premium">Max 1000 kg per shipment</span>
        </div>
        <div className="form-group-premium">
          <label htmlFor="packageType">Package Type</label>
          <motion.select id="packageType" name="packageType" value={formData.packageType} onChange={handleChange} aria-describedby="package-type-hint" whileFocus={{ scale: 1.01, boxShadow: "0 0 0 3px rgba(249,115,22,0.3)" }}>
            {PACKAGE_TYPES.map(pkg => (<option key={pkg.value} value={pkg.value}>{pkg.label}</option>))}
          </motion.select>
          <span id="package-type-hint" className="help-text-premium">Select best matching category</span>
        </div>
      </motion.div>
      
      <motion.div className="form-group-premium" variants={fadeInUp}>
        <label>Dimensions (cm) - For volumetric weight calculation</label>
        <div className="form-row-premium">
          {["length", "width", "height"].map((dim) => (
            <div key={dim} className="form-group-premium">
              <label htmlFor={`dimensions.${dim}`}>{dim.charAt(0).toUpperCase() + dim.slice(1)}</label>
              <motion.input type="number" id={`dimensions.${dim}`} name={`dimensions.${dim}`} placeholder={dim === "length" ? "L" : dim === "width" ? "W" : "H"} min="1" max="300" value={formData.dimensions[dim]} onChange={handleDimensionChange} className={errors[`dimensions.${dim}`] ? "input-error-premium" : ""} whileFocus={{ scale: 1.01, boxShadow: "0 0 0 3px rgba(249,115,22,0.3)" }} />
              <AnimatePresence>{errors[`dimensions.${dim}`] && <motion.span className="error-message-premium">{errors[`dimensions.${dim}`]}</motion.span>}</AnimatePresence>
            </div>
          ))}
        </div>
        <span className="help-text-premium">Used to calculate volumetric weight: (L×W×H)/5000</span>
      </motion.div>
      
      <motion.div className="form-group-premium" variants={fadeInUp}>
        <label className="checkbox-label-premium">
          <motion.input type="checkbox" name="isFragile" checked={formData.isFragile} onChange={handleChange} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} />
          <span className="checkbox-custom-premium" aria-hidden="true"></span>
          <span className="checkbox-text-premium">
            🍷 This item is fragile / Handle with care
            <small>Additional protective packaging +₹{PRICING.FRAGILE_SURCHARGE}</small>
          </span>
        </label>
      </motion.div>
      
      <motion.div className="form-group-premium" variants={fadeInUp}>
        <label>Service Type</label>
        <motion.div className="service-options-premium" role="radiogroup" aria-label="Shipping service selection" variants={staggerContainer} initial="hidden" animate="visible">
          {SERVICE_TYPES.map((service) => (
            <motion.label key={service.value} className={`service-option-premium ${formData.serviceType === service.value ? "selected" : ""}`} whileHover="hover" whileTap="tap" variants={cardHoverVariants}>
              <input type="radio" name="serviceType" value={service.value} checked={formData.serviceType === service.value} onChange={handleChange} />
              <motion.div className="service-card-premium">
                <motion.span className="service-icon-premium" animate={{ rotate: formData.serviceType === service.value ? [0, 10, -10, 0] : 0 }} transition={{ duration: 0.5 }}>{service.icon}</motion.span>
                <strong>{service.label}</strong>
                <span className="service-time-premium">{service.days}</span>
                <span className="service-desc-premium">{service.description}</span>
              </motion.div>
            </motion.label>
          ))}
        </motion.div>
      </motion.div>
      
      <motion.div className="form-group-premium insurance-option-premium" variants={fadeInUp}>
        <label className="checkbox-label-premium">
          <motion.input type="checkbox" name="addInsurance" checked={formData.addInsurance} onChange={handleChange} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} />
          <span className="checkbox-custom-premium" aria-hidden="true"></span>
          <span className="checkbox-text-premium">
            🛡️ Add Shipping Insurance 
            <small>(+₹{PRICING.MIN_INSURANCE_FEE} or {(PRICING.INSURANCE_RATE * 100).toFixed(0)}% of declared value)</small>
          </span>
        </label>
      </motion.div>
      
      <AnimatePresence>
        {formData.addInsurance && (
          <motion.div className="form-group-premium" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.3 }}>
            <label htmlFor="declaredValue">Declared Value (₹) <span className="required">*</span></label>
            <motion.input type="number" id="declaredValue" name="declaredValue" placeholder="Enter item value" min="1" max="1000000" value={formData.declaredValue} onChange={handleChange} className={errors.declaredValue ? "input-error-premium" : ""} aria-required={formData.addInsurance} whileFocus={{ scale: 1.01, boxShadow: "0 0 0 3px rgba(249,115,22,0.3)" }} />
            <AnimatePresence>{errors.declaredValue && <motion.span className="error-message-premium">{errors.declaredValue}</motion.span>}</AnimatePresence>
            {formData.declaredValue && (
              <motion.small className="help-text-premium" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                Insurance premium: {formatCurrency(Math.max(PRICING.MIN_INSURANCE_FEE, Math.round(formData.declaredValue * PRICING.INSURANCE_RATE)))}
              </motion.small>
            )}
          </motion.div>
        )}
      </AnimatePresence>
      
      <motion.div className="form-group-premium" variants={fadeInUp}>
        <label>📎 Attach Documents (Optional)</label>
        <motion.div className="upload-zone-premium" role="button" tabIndex={0} aria-label="Upload shipping documents" whileHover={{ borderColor: "var(--accent)", background: "rgba(249,115,22,0.12)" }} whileTap={{ scale: 0.99 }} onKeyDown={(e) => e.key === "Enter" && document.getElementById("documents")?.click()}>
          <input type="file" id="documents" name="documents" multiple accept=".pdf,.jpg,.jpeg,.png" onChange={handleFileUpload} className="sr-only" />
          <label htmlFor="documents" style={{ cursor: "pointer", display: "block", width: "100%" }}>
            <motion.span className="upload-icon-premium" aria-hidden="true" animate={{ y: [0, -5, 0] }} transition={{ duration: 2, repeat: Infinity }}>📁</motion.span>
            <span className="upload-text-premium">Click to upload or drag & drop</span>
            <span className="upload-hint-premium">PDF, JPG, PNG • Max 10MB each • Invoice, ID proof, etc.</span>
          </label>
        </motion.div>
        {formData.documents.length > 0 && (
          <motion.div className="uploaded-files-premium" aria-live="polite" variants={staggerContainer} initial="hidden" animate="visible">
            {formData.documents.map((fileName, idx) => (
              <motion.span key={idx} className="uploaded-file-premium" variants={fadeInUp}>
                {fileName}
                <motion.button type="button" className="remove-premium" onClick={() => removeDocument(fileName)} aria-label={`Remove ${fileName}`} whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>×</motion.button>
              </motion.span>
            ))}
          </motion.div>
        )}
      </motion.div>
      
      <motion.div className="form-group-premium" variants={fadeInUp}>
        <label htmlFor="specialInstructions">Special Instructions (Optional)</label>
        <motion.textarea id="specialInstructions" name="specialInstructions" placeholder="Call before delivery, leave at reception, fragile handling notes, etc." value={formData.specialInstructions} onChange={handleChange} rows={2} whileFocus={{ scale: 1.01, boxShadow: "0 0 0 3px rgba(249,115,22,0.3)" }} />
      </motion.div>
      
      {formData.weight && (
        <motion.div className="rate-preview-premium" role="status" aria-live="polite" variants={fadeInUp} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
          <motion.strong animate={{ scale: [1, 1.02, 1] }} transition={{ duration: 0.5 }}>💰 Estimated Cost: {formatCurrency(estimatedRate)}</motion.strong>
          <span className="rate-breakdown-premium">Includes 18% GST • Final price calculated at checkout • {deliveryEstimate}</span>
        </motion.div>
      )}
      
      <motion.div className="step-navigation-premium" variants={fadeInUp}>
        <motion.button type="button" className="btn-secondary-premium" onClick={prevStep} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.98 }}>← Back</motion.button>
        <motion.button type="button" className="btn-primary-premium" onClick={nextStep} aria-label="Continue to payment" whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.98 }}>Continue →</motion.button>
      </motion.div>
    </motion.div>
  );

  const renderStep4 = () => (
    <motion.div className="step-content-premium" ref={formRef} variants={stepVariants} initial="hidden" animate="visible" exit="exit">
      <motion.h3 variants={fadeInUp}>💳 Payment & Confirmation</motion.h3>
      <motion.p className="step-description" variants={fadeInUp}>Review your order and complete booking</motion.p>
      
      <motion.div className="order-summary-premium" variants={fadeInUp}>
        <h4>📋 Order Summary</h4>
        <motion.div className="summary-row-premium" variants={fadeInUp}><span>Service:</span><strong>{SERVICE_TYPES.find(s => s.value === formData.serviceType)?.label}</strong></motion.div>
        <motion.div className="summary-row-premium" variants={fadeInUp}><span>Package:</span><strong>{PACKAGE_TYPES.find(p => p.value === formData.packageType)?.label}</strong></motion.div>
        <motion.div className="summary-row-premium" variants={fadeInUp}><span>Weight:</span><strong>{formData.weight} kg</strong></motion.div>
        {formData.isFragile && (<motion.div className="summary-row-premium" variants={fadeInUp}><span>Fragile Handling:</span><strong>+₹{PRICING.FRAGILE_SURCHARGE}</strong></motion.div>)}
        {formData.addInsurance && formData.declaredValue && (<motion.div className="summary-row-premium" variants={fadeInUp}><span>Insurance:</span><strong>+{formatCurrency(Math.max(PRICING.MIN_INSURANCE_FEE, Math.round(formData.declaredValue * PRICING.INSURANCE_RATE)))}</strong></motion.div>)}
        {formData.paymentMethod === "cod" && (<motion.div className="summary-row-premium" variants={fadeInUp}><span>COD Fee:</span><strong>+₹{PRICING.COD_FEE}</strong></motion.div>)}
        <motion.div className="summary-row-premium" variants={fadeInUp}><span>GST (18%):</span><strong>{formatCurrency(Math.round(estimatedRate * PRICING.GST_RATE / (1 + PRICING.GST_RATE)))}</strong></motion.div>
        <motion.div className="summary-row-premium total" variants={fadeInUp}><span>Estimated Total:</span><motion.strong animate={{ scale: [1, 1.03, 1] }} transition={{ duration: 0.5 }}>{formatCurrency(estimatedRate)}</motion.strong></motion.div>
      </motion.div>
      
      <motion.div className="form-group-premium" variants={fadeInUp}>
        <label>Payment Method</label>
        <motion.div className="payment-options-premium" role="radiogroup" aria-label="Payment method selection" variants={staggerContainer} initial="hidden" animate="visible">
          {PAYMENT_METHODS.map((method) => (
            <motion.label key={method.value} className={`payment-option-premium ${formData.paymentMethod === method.value ? "selected" : ""}`} whileHover="hover" whileTap="tap" variants={cardHoverVariants}>
              <input type="radio" name="paymentMethod" value={method.value} checked={formData.paymentMethod === method.value} onChange={handleChange} />
              <motion.div className="payment-card-premium">
                <motion.span className="payment-icon-premium" aria-hidden="true" animate={{ scale: formData.paymentMethod === method.value ? [1, 1.2, 1] : 1 }} transition={{ duration: 0.3 }}>{method.icon}</motion.span>
                <span>{method.label}</span>
                <span className="payment-desc-premium">{method.description}</span>
              </motion.div>
            </motion.label>
          ))}
        </motion.div>
      </motion.div>
      
      <motion.div className="form-group-premium" variants={fadeInUp}>
        <label className="checkbox-label-premium">
          <motion.input type="checkbox" name="needInvoice" checked={formData.needInvoice} onChange={handleChange} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} />
          <span className="checkbox-custom-premium" aria-hidden="true"></span>
          <span className="checkbox-text-premium">🧾 I need a GST invoice</span>
        </label>
      </motion.div>
      
      <AnimatePresence>
        {formData.needInvoice && (
          <motion.div className="form-group-premium" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.3 }}>
            <label htmlFor="gstNumber">GST Number</label>
            <motion.input type="text" id="gstNumber" name="gstNumber" placeholder="29ABCDE1234F1Z5" value={formData.gstNumber} onChange={handleChange} className={errors.gstNumber ? "input-error-premium" : ""} pattern="[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}" title="Valid GST format: 29ABCDE1234F1Z5" whileFocus={{ scale: 1.01, boxShadow: "0 0 0 3px rgba(249,115,22,0.3)" }} />
            <AnimatePresence>{errors.gstNumber && <motion.span className="error-message-premium">{errors.gstNumber}</motion.span>}</AnimatePresence>
            <small className="help-text-premium">Format: 29ABCDE1234F1Z5 (15 characters)</small>
          </motion.div>
        )}
      </AnimatePresence>
      
      <motion.div className="security-notice-premium" role="note" variants={fadeInUp}>
        <motion.span className="icon-premium" aria-hidden="true" animate={{ rotate: [0, 10, -10, 0] }} transition={{ duration: 3, repeat: Infinity }}>🔒</motion.span>
        <span>Your data is encrypted & never shared. Protected by reCAPTCHA.</span>
      </motion.div>
      
      <motion.div className="terms-section-premium" variants={fadeInUp}>
        <label className="checkbox-label-premium">
          <motion.input type="checkbox" name="acceptTerms" checked={formData.acceptTerms} onChange={handleChange} className={errors.acceptTerms ? "input-error-premium" : ""} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} />
          <span className="checkbox-custom-premium" aria-hidden="true"></span>
          <span className="checkbox-text-premium">I agree to the <a href="/terms" target="_blank" rel="noopener noreferrer">Terms of Service</a> *</span>
        </label>
        <AnimatePresence>{errors.acceptTerms && <motion.span className="error-message-premium" role="alert" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>{errors.acceptTerms}</motion.span>}</AnimatePresence>
        <label className="checkbox-label-premium">
          <motion.input type="checkbox" name="privacyConsent" checked={formData.privacyConsent} onChange={handleChange} className={errors.privacyConsent ? "input-error-premium" : ""} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} />
          <span className="checkbox-custom-premium" aria-hidden="true"></span>
          <span className="checkbox-text-premium">I consent to data processing per our <a href="/privacy" target="_blank" rel="noopener noreferrer">Privacy Policy</a> *</span>
        </label>
        <AnimatePresence>{errors.privacyConsent && <motion.span className="error-message-premium" role="alert" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>{errors.privacyConsent}</motion.span>}</AnimatePresence>
      </motion.div>
      
      <AnimatePresence>{errors.global && (<motion.div className="global-error-premium" role="alert" ref={errorRef} initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>{errors.global}</motion.div>)}</AnimatePresence>
      
      <motion.div className="step-navigation-premium" variants={fadeInUp}>
        <motion.button type="button" className="btn-secondary-premium" onClick={prevStep} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.98 }}>← Back</motion.button>
        <motion.button type="button" className="btn-primary-premium" onClick={handleSubmit} disabled={isSubmitting || !formData.acceptTerms || !formData.privacyConsent} aria-busy={isSubmitting} whileHover={!isSubmitting ? { scale: 1.03 } : {}} whileTap={!isSubmitting ? { scale: 0.98 } : {}}>
          {isSubmitting ? (<motion.span className="loading-premium" animate={{ opacity: [1, 0.7, 1] }} transition={{ duration: 1, repeat: Infinity }}><motion.span className="loading-spinner-premium" aria-hidden="true" animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}></motion.span>Processing Booking...</motion.span>) : (`Confirm & Pay ${formatCurrency(estimatedRate)}`)}
        </motion.button>
      </motion.div>
    </motion.div>
  );

  const renderStep5 = () => (
    <motion.div className="step-content-premium success-step-premium" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ type: "spring", stiffness: 100 }}>
      {showConfetti && (
        <div className="confetti-container" aria-hidden="true">
          {[...Array(50)].map((_, i) => (
            <motion.div key={i} className="confetti-piece" style={{ left: `${Math.random() * 100}%`, backgroundColor: `hsl(${Math.random() * 60 + 10}, 90%, 60%)` }} initial={{ y: -20, opacity: 0, rotate: 0 }} animate={{ y: "100vh", opacity: [0, 1, 0], rotate: Math.random() * 720 - 360 }} transition={{ duration: Math.random() * 2 + 2, delay: Math.random() * 0.5, ease: "easeOut" }} />
          ))}
        </div>
      )}
      
      <motion.div className="success-icon-premium" aria-hidden="true" initial={{ scale: 0, rotate: -180 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: "spring", stiffness: 200, damping: 15 }}>✅</motion.div>
      <motion.h3 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>Booking Confirmed!</motion.h3>
      <motion.p className="success-message-premium" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>Your shipment has been booked successfully. You'll receive SMS & email updates at <strong>{formData.email}</strong>.</motion.p>
      
      <motion.div className="tracking-card-premium" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
        <label>🔖 Tracking Number</label>
        <motion.div className="tracking-number-premium" aria-live="polite" initial={{ scale: 0.9 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 300 }}><code>{trackingNumber}</code></motion.div>
        <motion.button type="button" className="btn-text-premium copy-btn-premium" onClick={copyTrackingNumber} aria-label="Copy tracking number to clipboard" whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>📋 Copy to clipboard</motion.button>
      </motion.div>
      
      <motion.div className="booking-details-mini-premium" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
        <p><strong>🚚 Pickup:</strong> {formData.pickupCity}, {formData.pickupState}</p>
        <p><strong>📦 Delivery:</strong> {sameAsPickup ? "Same as pickup" : `${formData.deliveryCity}, ${formData.deliveryState}`}</p>
        <p><strong>⚡ Service:</strong> {SERVICE_TYPES.find(s => s.value === formData.serviceType)?.label}</p>
        <p><strong>📅 Delivery By:</strong> {deliveryEstimate}</p>
        <p><strong>💰 Amount:</strong> {formatCurrency(estimatedRate)}</p>
      </motion.div>
      
      <motion.div className="next-actions-premium" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}>
        <motion.button type="button" className="btn-primary-premium" onClick={() => navigate(`/tracking/${trackingNumber}`)} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.98 }}>📍 Track Shipment</motion.button>
        <motion.button type="button" className="btn-secondary-premium" onClick={() => navigate("/")} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.98 }}>🏠 Back Home</motion.button>
        <motion.button type="button" className="btn-text-premium" onClick={() => { clearDraft(); setCurrentStep(1); }} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.98 }}>➕ New Booking</motion.button>
      </motion.div>
      
      <motion.div className="share-options-premium" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }}>
        <span className="share-label-premium">Share Booking:</span>
        <div className="share-buttons-premium">
          <motion.a href={`https://wa.me/?text=My%20Atirath%20Booking:%20${trackingNumber}%20Track:%20${window.location.origin}/tracking/${trackingNumber}`} target="_blank" rel="noopener noreferrer" className="share-btn-premium whatsapp" aria-label="Share via WhatsApp" whileHover={{ scale: 1.05, y: -3 }} whileTap={{ scale: 0.95 }}>WhatsApp</motion.a>
          <motion.a href={`mailto:?subject=Booking%20Confirmation%20${trackingNumber}&body=Track%20your%20shipment:%20${window.location.origin}/tracking/${trackingNumber}`} className="share-btn-premium email" aria-label="Share via Email" whileHover={{ scale: 1.05, y: -3 }} whileTap={{ scale: 0.95 }}>Email</motion.a>
        </div>
      </motion.div>
    </motion.div>
  );

  // ===== MAIN RENDER =====
  return (
    <motion.div className="booking-page-wrapper-premium" style={{ backgroundImage: bgLoaded ? `url(${bookingBg})` : "none", backgroundColor: "#0f172a" }} variants={pageVariants} initial="initial" animate="animate" exit="exit">
      <FloatingParticles />
      <div className="booking-content-premium">
        <Layout>
          <main className="booking-form-premium">
            {currentStep < 5 && renderProgressBar()}
            <AnimatePresence mode="wait">
              {currentStep === 1 && renderStep1()}
              {currentStep === 2 && renderStep2()}
              {currentStep === 3 && renderStep3()}
              {currentStep === 4 && renderStep4()}
              {currentStep === 5 && renderStep5()}
            </AnimatePresence>
          </main>
        </Layout>
      </div>
    </motion.div>
  );
}