import { useState, useEffect, useMemo, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import "./RateCalculator.css";

// ========================================
// CONSTANTS & CONFIGURATION
// ========================================
const SERVICE_TYPES = [
  { id: "standard", label: "Standard Delivery", multiplier: 1.5, days: "3-5 days", icon: "📦" },
  { id: "express", label: "Express Delivery", multiplier: 2, days: "1-2 days", icon: "🚀" },
  { id: "sameday", label: "Same-Day Delivery", multiplier: 3, days: "Today", icon: "⚡" },
  { id: "international", label: "International", multiplier: 4, days: "7-15 days", icon: "🌍" }
];

const PACKAGE_TYPES = [
  { id: "document", label: "Document", baseWeight: 0.5, icon: "📄" },
  { id: "parcel", label: "Small Parcel", baseWeight: 2, icon: "📦" },
  { id: "box", label: "Medium Box", baseWeight: 5, icon: "📦" },
  { id: "large", label: "Large Box", baseWeight: 15, icon: "📦" },
  { id: "pallet", label: "Pallet", baseWeight: 50, icon: "🏗️" }
];

const ZONES = [
  { id: "local", label: "Local (0-100 km)", ratePerKg: 10, multiplier: 1 },
  { id: "regional", label: "Regional (100-500 km)", ratePerKg: 15, multiplier: 1.2 },
  { id: "national", label: "National (500-1500 km)", ratePerKg: 20, multiplier: 1.5 },
  { id: "remote", label: "Remote Area", ratePerKg: 30, multiplier: 2 },
  { id: "international", label: "International", ratePerKg: 100, multiplier: 4 }
];

const PRICING = {
  baseRate: 50,
  perKgRate: 10,
  volumetricDivisorCm: 5000,
  volumetricDivisorIn: 139,
  fuelSurcharge: 0.12,
  gstRate: 0.18,
  insuranceRate: 0.02,
  codRate: 0.02,
  remoteSurcharge: 100,
  minCharge: 50,
  maxWeight: 10000,
  maxDimensions: 300
};

const PROHIBITED_ITEMS = [
  "Explosives", "Flammable liquids", "Weapons", "Drugs", 
  "Live animals", "Currency", "Perishable food"
];

// ========================================
// HELPER FUNCTIONS
// ========================================

// ✅ Convert weight to kg
const convertWeightToKg = (weight, unit) => {
  const w = parseFloat(weight) || 0;
  return unit === "lbs" ? w * 0.453592 : w;
};

// ✅ Convert dimension to cm
const convertDimensionToCm = (dim, unit) => {
  const d = parseFloat(dim) || 0;
  return unit === "in" ? d * 2.54 : d;
};

// ✅ Auto-detect zone from pincodes
const detectZoneFromPincodes = (originPin, destPin) => {
  if (!originPin || !destPin || originPin.length !== 6 || destPin.length !== 6) {
    return null;
  }
  
  if (originPin[0] === destPin[0]) return "local";
  if (originPin.slice(0, 2) === destPin.slice(0, 2)) return "regional";
  
  const remotePrefixes = ["74", "75", "76", "79", "85"];
  if (remotePrefixes.includes(destPin.slice(0, 2)) || 
      remotePrefixes.includes(originPin.slice(0, 2))) {
    return "remote";
  }
  
  return "national";
};

// ✅ Calculate rate for specific service
const calculateRateForService = (formData, serviceId) => {
  const weightInKg = convertWeightToKg(formData.weight, formData.weightUnit);
  
  const lengthCm = convertDimensionToCm(formData.length, formData.dimensionUnit);
  const widthCm = convertDimensionToCm(formData.width, formData.dimensionUnit);
  const heightCm = convertDimensionToCm(formData.height, formData.dimensionUnit);
  
  let volumetricWeight = 0;
  if (lengthCm > 0 && widthCm > 0 && heightCm > 0) {
    volumetricWeight = (lengthCm * widthCm * heightCm) / PRICING.volumetricDivisorCm;
  }
  
  const chargeableWeight = Math.max(weightInKg, volumetricWeight);
  const zone = ZONES.find(z => z.id === formData.zone);
  const service = SERVICE_TYPES.find(s => s.id === serviceId);
  
  if (!zone || !service || chargeableWeight <= 0) return null;
  
  let subtotal = PRICING.baseRate;
  subtotal += chargeableWeight * PRICING.perKgRate * zone.multiplier;
  subtotal *= service.multiplier;
  
  let addons = 0;
  if (formData.insurance && formData.declaredValue) {
    addons += parseFloat(formData.declaredValue) * PRICING.insuranceRate;
  }
  if (formData.cod && formData.codAmount) {
    addons += parseFloat(formData.codAmount) * PRICING.codRate;
  }
  if (formData.fragile) addons += 50;
  if (formData.zone === "remote") addons += PRICING.remoteSurcharge;
  
  if (formData.weekendDelivery) subtotal *= 1.25;
  if (formData.pickupType === "dropoff") subtotal *= 0.95;
  if (formData.customerType === "business") subtotal *= 0.9;
  
  const fuelCharge = subtotal * PRICING.fuelSurcharge;
  let total = subtotal + addons + fuelCharge;
  const gst = total * PRICING.gstRate;
  total += gst;
  total = Math.max(total, PRICING.minCharge);
  
  return {
    chargeableWeight: chargeableWeight.toFixed(2),
    actualWeight: weightInKg.toFixed(2),
    volumetricWeight: volumetricWeight.toFixed(2),
    baseRate: PRICING.baseRate,
    weightCharge: (chargeableWeight * PRICING.perKgRate * zone.multiplier).toFixed(2),
    serviceMultiplier: service.multiplier,
    serviceLabel: service.label,
    serviceDays: service.days,
    subtotal: subtotal.toFixed(2),
    addons: addons.toFixed(2),
    fuelSurcharge: fuelCharge.toFixed(2),
    gst: gst.toFixed(2),
    total: Math.round(total),
    zone: zone.label,
    zoneId: zone.id
  };
};

// ========================================
// MAIN COMPONENT
// ========================================
export default function RateCalculator() {
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState({
    weight: "",
    weightUnit: "kg",
    length: "",
    width: "",
    height: "",
    dimensionUnit: "cm",
    packageType: "parcel",
    originPincode: "",
    destinationPincode: "",
    originCity: "",
    destinationCity: "",
    zone: "regional",
    serviceType: "standard",
    insurance: false,
    declaredValue: "",
    cod: false,
    codAmount: "",
    pickupType: "door",
    fragile: false,
    weekendDelivery: false,
    customerType: "personal"
  });

  const [errors, setErrors] = useState({});
  const [showBreakdown, setShowBreakdown] = useState(false);
  const [recentQuotes, setRecentQuotes] = useState([]);
  const [toast, setToast] = useState(null);
  const [showComparison, setShowComparison] = useState(false);
  const [quoteGeneratedAt, setQuoteGeneratedAt] = useState(null);

  // Load recent quotes
  useEffect(() => {
    try {
      const saved = localStorage.getItem("atirath_recent_quotes");
      if (saved) setRecentQuotes(JSON.parse(saved));
    } catch (e) {
      console.error("Error loading quotes:", e);
    }
  }, []);

  // ✅ Auto-detect zone
  useEffect(() => {
    const detectedZone = detectZoneFromPincodes(formData.originPincode, formData.destinationPincode);
    if (detectedZone && detectedZone !== formData.zone) {
      setFormData(prev => ({ ...prev, zone: detectedZone }));
      showToast(`🗺️ Zone auto-detected: ${ZONES.find(z => z.id === detectedZone)?.label}`, "info");
    }
  }, [formData.originPincode, formData.destinationPincode]);

  // ✅ Toast helper
  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // ✅ Memoized handlers
  const handleChange = useCallback((e) => {
    const { name, value, type, checked } = e.target;
    
    let processedValue = value;
    if (name === "weight" || name === "declaredValue" || name === "codAmount") {
      processedValue = value.replace(/[^0-9.]/g, "");
    }
    if (name === "originPincode" || name === "destinationPincode") {
      processedValue = value.replace(/\D/g, "").slice(0, 6);
    }
    if (["length", "width", "height"].includes(name)) {
      processedValue = value.replace(/[^0-9.]/g, "");
      if (parseFloat(processedValue) > PRICING.maxDimensions) {
        processedValue = PRICING.maxDimensions.toString();
      }
    }
    if (name === "weight" && parseFloat(processedValue) > PRICING.maxWeight) {
      processedValue = PRICING.maxWeight.toString();
    }
    
    setFormData(prev => ({
      ...prev,
      [name]: type === "checkbox" ? checked : processedValue
    }));
    
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  }, [errors]);

  const handlePackageTypeChange = useCallback((packageTypeId) => {
    const pkg = PACKAGE_TYPES.find(p => p.id === packageTypeId);
    if (pkg) {
      setFormData(prev => ({
        ...prev,
        packageType: packageTypeId,
        weight: prev.weight || pkg.baseWeight.toString()
      }));
    }
  }, []);

  const validateForm = useCallback(() => {
    const newErrors = {};
    const weightInKg = convertWeightToKg(formData.weight, formData.weightUnit);
    
    if (!formData.weight || weightInKg <= 0) {
      newErrors.weight = "Enter valid weight";
    } else if (weightInKg > PRICING.maxWeight) {
      newErrors.weight = `Max weight is ${PRICING.maxWeight}kg`;
    }
    
    ["length", "width", "height"].forEach(dim => {
      if (formData[dim]) {
        const val = convertDimensionToCm(formData[dim], formData.dimensionUnit);
        if (val <= 0 || val > PRICING.maxDimensions) {
          newErrors[dim] = `0-${PRICING.maxDimensions}cm`;
        }
      }
    });
    
    if (formData.originPincode && !/^[1-9][0-9]{5}$/.test(formData.originPincode)) {
      newErrors.originPincode = "Invalid 6-digit PIN";
    }
    if (formData.destinationPincode && !/^[1-9][0-9]{5}$/.test(formData.destinationPincode)) {
      newErrors.destinationPincode = "Invalid 6-digit PIN";
    }
    
    if (formData.insurance && (!formData.declaredValue || parseFloat(formData.declaredValue) <= 0)) {
      newErrors.declaredValue = "Enter declared value";
    }
    if (formData.cod && (!formData.codAmount || parseFloat(formData.codAmount) <= 0)) {
      newErrors.codAmount = "Enter COD amount";
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData]);

  // ✅ Auto-calculate via useMemo (no infinite loop)
  const result = useMemo(() => {
    if (!formData.weight || parseFloat(formData.weight) <= 0) return null;
    return calculateRateForService(formData, formData.serviceType);
  }, [formData]);

  // ✅ Comparison results
  const comparisonResults = useMemo(() => {
    if (!formData.weight || parseFloat(formData.weight) <= 0) return [];
    return SERVICE_TYPES.map(service => ({
      ...service,
      result: calculateRateForService(formData, service.id)
    })).filter(s => s.result !== null);
  }, [formData]);

  const handleCalculate = useCallback(() => {
    if (!validateForm()) {
      showToast("⚠️ Please fix the errors", "error");
      return;
    }
    setQuoteGeneratedAt(new Date());
    showToast("✅ Rate calculated successfully!");
  }, [validateForm]);

  const handleClear = useCallback(() => {
    if (!window.confirm("🗑️ Clear all entered data?")) return;
    
    setFormData({
      weight: "", weightUnit: "kg",
      length: "", width: "", height: "", dimensionUnit: "cm",
      packageType: "parcel",
      originPincode: "", destinationPincode: "",
      originCity: "", destinationCity: "",
      zone: "regional", serviceType: "standard",
      insurance: false, declaredValue: "",
      cod: false, codAmount: "",
      pickupType: "door", fragile: false,
      weekendDelivery: false, customerType: "personal"
    });
    setErrors({});
    setShowBreakdown(false);
    setQuoteGeneratedAt(null);
    showToast("🗑️ Form cleared");
  }, []);

  const handleCopyQuote = useCallback(async () => {
    if (!result) return;
    
    const quoteText = `📦 ATIRATH LOGISTICS - Rate Quote
━━━━━━━━━━━━━━━━━━━━━━
Service: ${result.serviceLabel}
Zone: ${result.zone}
━━━━━━━━━━━━━━━━━━━━━━
Actual Weight: ${result.actualWeight} kg
Volumetric: ${result.volumetricWeight} kg
Chargeable: ${result.chargeableWeight} kg
━━━━━━━━━━━━━━━━━━━━━━
Base Rate: ₹${result.baseRate}
Weight Charge: ₹${result.weightCharge}
Add-ons: ₹${result.addons}
Fuel Surcharge: ₹${result.fuelSurcharge}
Subtotal: ₹${result.subtotal}
GST (18%): ₹${result.gst}
━━━━━━━━━━━━━━━━━━━━━━
💰 TOTAL: ₹${result.total}
━━━━━━━━━━━━━━━━━━━━━━
📅 Delivery: ${result.serviceDays}
🔖 Quote ID: ATL-${Date.now().toString(36).toUpperCase()}
⏰ Valid till: ${new Date(Date.now() + 24*60*60*1000).toLocaleString("en-IN")}
    `.trim();
    
    try {
      await navigator.clipboard.writeText(quoteText);
      showToast("✅ Quote copied to clipboard!");
    } catch (err) {
      showToast("❌ Copy failed", "error");
    }
  }, [result]);

  const handleShareWhatsApp = useCallback(() => {
    if (!result) return;
    const text = encodeURIComponent(
      `📦 ATIRATH Logistics Quote\n` +
      `Service: ${result.serviceLabel}\n` +
      `Route: ${result.zone}\n` +
      `Weight: ${result.chargeableWeight}kg\n` +
      `💰 Total: ₹${result.total}\n` +
      `📅 Delivery: ${result.serviceDays}`
    );
    window.open(`https://wa.me/?text=${text}`, "_blank");
  }, [result]);

  const handleShareEmail = useCallback(() => {
    if (!result) return;
    const subject = encodeURIComponent(`ATIRATH Logistics Quote - ₹${result.total}`);
    const body = encodeURIComponent(
      `Hello,\n\nHere's my shipping quote from ATIRATH Logistics:\n\n` +
      `Service: ${result.serviceLabel}\n` +
      `Zone: ${result.zone}\n` +
      `Weight: ${result.chargeableWeight} kg\n` +
      `Total: ₹${result.total}\n` +
      `Delivery: ${result.serviceDays}\n\n` +
      `Quote ID: ATL-${Date.now().toString(36).toUpperCase()}\n` +
      `Valid for 24 hours`
    );
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  }, [result]);

  const handleSaveQuote = useCallback(() => {
    if (!result) return;
    
    const quote = {
      id: Date.now(),
      timestamp: new Date().toISOString(),
      formData: { ...formData },
      result: { ...result }
    };
    
    const updatedQuotes = [quote, ...recentQuotes.filter(q => 
      JSON.stringify(q.formData) !== JSON.stringify(formData)
    ).slice(0, 4)];
    
    setRecentQuotes(updatedQuotes);
    try {
      localStorage.setItem("atirath_recent_quotes", JSON.stringify(updatedQuotes));
      showToast("💾 Quote saved!");
    } catch (e) {
      showToast("❌ Save failed", "error");
    }
  }, [result, formData, recentQuotes]);

  const handleBookShipment = useCallback(() => {
    if (!result) return;
    const params = new URLSearchParams({
      service: formData.serviceType,
      weight: formData.weight,
      zone: formData.zone,
      total: result.total,
      fromQuote: "true"
    });
    navigate(`/book-shipment?${params.toString()}`);
  }, [result, formData, navigate]);

  const renderError = (fieldName) => (
    errors[fieldName] && <span className="error-text">⚠️ {errors[fieldName]}</span>
  );

  const quoteValidUntil = quoteGeneratedAt 
    ? new Date(quoteGeneratedAt.getTime() + 24 * 60 * 60 * 1000)
    : null;

  return (
    <div className="rate-calculator-page">
      {/* Toast Notification */}
      {toast && (
        <div className={`toast toast-${toast.type}`}>
          {toast.message}
        </div>
      )}

      {/* Header */}
      <header className="calculator-header">
        <button className="btn-back" onClick={() => navigate(-1)} title="Go back">←</button>
        <h1>💰 Rate Calculator</h1>
        <div className="header-spacer" />
      </header>

      <main className="calculator-container">
        {/* Left Column: Form */}
        <div className="calculator-form">
          
          {/* Package Type */}
          <section className="form-section">
            <h3>📦 Package Type</h3>
            <div className="package-type-grid">
              {PACKAGE_TYPES.map(pkg => (
                <button
                  key={pkg.id}
                  className={`package-type-btn ${formData.packageType === pkg.id ? "selected" : ""}`}
                  onClick={() => handlePackageTypeChange(pkg.id)}
                  type="button"
                >
                  <span className="pkg-icon">{pkg.icon}</span>
                  <span className="pkg-label">{pkg.label}</span>
                  <span className="pkg-weight">~{pkg.baseWeight}kg</span>
                </button>
              ))}
            </div>
          </section>

          {/* Weight & Dimensions */}
          <section className="form-section">
            <h3>⚖️ Weight & Dimensions</h3>
            
            <div className="form-row">
              <div className="form-group">
                <label>Weight *</label>
                <div className="input-with-unit">
                  <input
                    type="text"
                    inputMode="decimal"
                    name="weight"
                    value={formData.weight}
                    onChange={handleChange}
                    placeholder="0.0"
                    className={errors.weight ? "error" : ""}
                  />
                  <select 
                    name="weightUnit" 
                    value={formData.weightUnit} 
                    onChange={handleChange}
                    className="unit-select"
                  >
                    <option value="kg">kg</option>
                    <option value="lbs">lbs</option>
                  </select>
                </div>
                {formData.weightUnit === "lbs" && formData.weight && (
                  <small className="unit-hint">
                    = {convertWeightToKg(formData.weight, "lbs").toFixed(2)} kg
                  </small>
                )}
                {renderError("weight")}
              </div>
            </div>

            <details className="dimensions-details">
              <summary>📐 Add Dimensions (for volumetric weight)</summary>
              <div className="form-row three-col">
                {["length", "width", "height"].map(dim => (
                  <div className="form-group" key={dim}>
                    <label className="capitalize">{dim}</label>
                    <div className="input-with-unit">
                      <input
                        type="text"
                        inputMode="decimal"
                        name={dim}
                        value={formData[dim]}
                        onChange={handleChange}
                        placeholder="0"
                        className={errors[dim] ? "error" : ""}
                      />
                      <select 
                        name="dimensionUnit" 
                        value={formData.dimensionUnit} 
                        onChange={handleChange}
                        className="unit-select small"
                      >
                        <option value="cm">cm</option>
                        <option value="in">in</option>
                      </select>
                    </div>
                    {renderError(dim)}
                  </div>
                ))}
              </div>
              
              {formData.dimensionUnit === "in" && (formData.length || formData.width || formData.height) && (
                <small className="unit-hint">
                  Dimensions in cm: {convertDimensionToCm(formData.length, "in").toFixed(1)} × {convertDimensionToCm(formData.width, "in").toFixed(1)} × {convertDimensionToCm(formData.height, "in").toFixed(1)} cm
                </small>
              )}
              
              {parseFloat(result?.volumetricWeight) > 0 && (
                <div className="volumetric-info">
                  📊 Volumetric Weight: <strong>{result.volumetricWeight} kg</strong>
                  <br/>
                  <small>Chargeable weight = max(actual {result.actualWeight}kg, volumetric {result.volumetricWeight}kg) = <strong>{result.chargeableWeight}kg</strong></small>
                </div>
              )}
            </details>
          </section>

          {/* Route Details */}
          <section className="form-section">
            <h3>📍 Route Details</h3>
            
            <div className="form-row">
              <div className="form-group">
                <label>Origin PIN Code</label>
                <input
                  type="text"
                  inputMode="numeric"
                  name="originPincode"
                  value={formData.originPincode}
                  onChange={handleChange}
                  placeholder="e.g., 500001"
                  maxLength="6"
                  className={errors.originPincode ? "error" : ""}
                />
                {renderError("originPincode")}
              </div>
              <div className="form-group">
                <label>Destination PIN Code</label>
                <input
                  type="text"
                  inputMode="numeric"
                  name="destinationPincode"
                  value={formData.destinationPincode}
                  onChange={handleChange}
                  placeholder="e.g., 110001"
                  maxLength="6"
                  className={errors.destinationPincode ? "error" : ""}
                />
                {renderError("destinationPincode")}
              </div>
            </div>

            <div className="form-group">
              <label>
                Shipping Zone *
                <span className="help-icon" title="Zone is auto-detected from pincodes">ℹ️</span>
              </label>
              <select 
                name="zone" 
                value={formData.zone} 
                onChange={handleChange}
                className="zone-select"
              >
                {ZONES.map(zone => (
                  <option key={zone.id} value={zone.id}>
                    {zone.label} - ₹{zone.ratePerKg}/kg
                  </option>
                ))}
              </select>
            </div>
          </section>

          {/* Service Type */}
          <section className="form-section">
            <h3>🚚 Service Type</h3>
            <div className="service-type-grid">
              {SERVICE_TYPES.map(service => (
                <label 
                  key={service.id}
                  className={`service-type-option ${formData.serviceType === service.id ? "selected" : ""}`}
                >
                  <input
                    type="radio"
                    name="serviceType"
                    value={service.id}
                    checked={formData.serviceType === service.id}
                    onChange={handleChange}
                  />
                  <div className="service-card">
                    <span className="service-icon">{service.icon}</span>
                    <strong>{service.label}</strong>
                    <span className="service-time">{service.days}</span>
                    <span className="service-multiplier">×{service.multiplier}</span>
                  </div>
                </label>
              ))}
            </div>
          </section>

          {/* Add-ons */}
          <section className="form-section">
            <h3>✨ Add-ons</h3>
            
            <label className="checkbox-row">
              <input 
                type="checkbox" 
                name="insurance" 
                checked={formData.insurance} 
                onChange={handleChange} 
              />
              <div className="checkbox-content">
                <strong>🛡️ Shipping Insurance</strong>
                <span>Protect against loss/damage (2% of value)</span>
              </div>
            </label>
            {formData.insurance && (
              <div className="addon-field">
                <label>Declared Value (₹) *</label>
                <input
                  type="text"
                  inputMode="decimal"
                  name="declaredValue"
                  value={formData.declaredValue}
                  onChange={handleChange}
                  placeholder="e.g., 5000"
                  className={errors.declaredValue ? "error" : ""}
                />
                {renderError("declaredValue")}
                {formData.declaredValue && (
                  <small>Premium: ₹{(parseFloat(formData.declaredValue) * PRICING.insuranceRate).toFixed(2)}</small>
                )}
              </div>
            )}

            <label className="checkbox-row">
              <input 
                type="checkbox" 
                name="cod" 
                checked={formData.cod} 
                onChange={handleChange} 
              />
              <div className="checkbox-content">
                <strong>💵 Cash on Delivery (COD)</strong>
                <span>Collect payment from receiver (2% fee)</span>
              </div>
            </label>
            {formData.cod && (
              <div className="addon-field">
                <label>COD Amount (₹) *</label>
                <input
                  type="text"
                  inputMode="decimal"
                  name="codAmount"
                  value={formData.codAmount}
                  onChange={handleChange}
                  placeholder="e.g., 2500"
                  className={errors.codAmount ? "error" : ""}
                />
                {renderError("codAmount")}
                {formData.codAmount && (
                  <small>Fee: ₹{(parseFloat(formData.codAmount) * PRICING.codRate).toFixed(2)}</small>
                )}
              </div>
            )}

            <div className="form-row two-col">
              <label className="checkbox-row compact">
                <input 
                  type="checkbox" 
                  name="fragile" 
                  checked={formData.fragile} 
                  onChange={handleChange} 
                />
                <span>🔶 Fragile Handling (+₹50)</span>
              </label>
              <label className="checkbox-row compact">
                <input 
                  type="checkbox" 
                  name="weekendDelivery" 
                  checked={formData.weekendDelivery} 
                  onChange={handleChange} 
                />
                <span>📅 Weekend Delivery (+25%)</span>
              </label>
            </div>

            <div className="form-group">
              <label>Pickup Type</label>
              <div className="radio-group">
                <label className={`radio-option ${formData.pickupType === "door" ? "selected" : ""}`}>
                  <input 
                    type="radio" 
                    name="pickupType" 
                    value="door" 
                    checked={formData.pickupType === "door"} 
                    onChange={handleChange} 
                  />
                  🚪 Door Pickup
                </label>
                <label className={`radio-option ${formData.pickupType === "dropoff" ? "selected" : ""}`}>
                  <input 
                    type="radio" 
                    name="pickupType" 
                    value="dropoff" 
                    checked={formData.pickupType === "dropoff"} 
                    onChange={handleChange} 
                  />
                  🏪 Drop-off at Hub <span className="discount-badge">-5%</span>
                </label>
              </div>
            </div>
          </section>

          {/* Customer Type */}
          <section className="form-section">
            <h3>👤 Customer Type</h3>
            <div className="radio-group">
              <label className={`radio-option ${formData.customerType === "personal" ? "selected" : ""}`}>
                <input 
                  type="radio" 
                  name="customerType" 
                  value="personal" 
                  checked={formData.customerType === "personal"} 
                  onChange={handleChange} 
                />
                👤 Personal
              </label>
              <label className={`radio-option ${formData.customerType === "business" ? "selected" : ""}`}>
                <input 
                  type="radio" 
                  name="customerType" 
                  value="business" 
                  checked={formData.customerType === "business"} 
                  onChange={handleChange} 
                />
                🏢 Business <span className="discount-badge">-10%</span>
              </label>
            </div>
          </section>

          {/* Prohibited Items Warning */}
          <section className="form-section warning-section">
            <h3>⚠️ Important: Prohibited Items</h3>
            <p className="warning-text">
              Do NOT ship the following items:
            </p>
            <ul className="prohibited-list">
              {PROHIBITED_ITEMS.map((item, i) => (
                <li key={i}>❌ {item}</li>
              ))}
            </ul>
          </section>

          {/* Action Buttons */}
          <div className="form-actions">
            <button type="button" className="btn-secondary" onClick={handleClear}>
              🗑️ Clear All
            </button>
            <button 
              type="button" 
              className="btn-primary btn-calculate" 
              onClick={handleCalculate}
            >
              💰 Calculate Rate
            </button>
          </div>
        </div>

        {/* Right Column: Results */}
        <div className="calculator-results">
          {result ? (
            <>
              {/* Price Card */}
              <div className="price-card">
                <div className="price-header">
                  <h3>Estimated Rate</h3>
                  <span className="service-badge">{result.serviceLabel}</span>
                </div>
                
                <div className="price-amount">
                  <span className="currency">₹</span>
                  <span className="amount">{result.total}</span>
                  <span className="gst-note">incl. GST</span>
                </div>
                
                <div className="delivery-estimate">
                  📅 Delivery in <strong>{result.serviceDays}</strong>
                </div>

                {quoteValidUntil && (
                  <div className="quote-validity">
                    ⏰ Quote valid till: <strong>{quoteValidUntil.toLocaleString("en-IN", { 
                      day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
                    })}</strong>
                  </div>
                )}
                
                <button 
                  className="btn-toggle-breakdown" 
                  onClick={() => setShowBreakdown(!showBreakdown)}
                >
                  {showBreakdown ? "Hide Breakdown ▲" : "Show Breakdown ▼"}
                </button>
                
                {showBreakdown && (
                  <div className="price-breakdown">
                    <div className="breakdown-row">
                      <span>Base Rate</span>
                      <span>₹{result.baseRate}</span>
                    </div>
                    <div className="breakdown-row">
                      <span>Chargeable Weight ({result.chargeableWeight}kg)</span>
                      <span>₹{result.weightCharge}</span>
                    </div>
                    <div className="breakdown-row">
                      <span>Zone: {result.zone}</span>
                      <span>×{ZONES.find(z => z.label === result.zone)?.multiplier}</span>
                    </div>
                    <div className="breakdown-row">
                      <span>Service Multiplier</span>
                      <span>×{result.serviceMultiplier}</span>
                    </div>
                    {parseFloat(result.addons) > 0 && (
                      <div className="breakdown-row">
                        <span>Add-ons</span>
                        <span>₹{result.addons}</span>
                      </div>
                    )}
                    <div className="breakdown-row">
                      <span>Fuel Surcharge (12%)</span>
                      <span>₹{result.fuelSurcharge}</span>
                    </div>
                    <div className="breakdown-subtotal">
                      <span>Subtotal</span>
                      <span>₹{result.subtotal}</span>
                    </div>
                    <div className="breakdown-row">
                      <span>GST (18%)</span>
                      <span>₹{result.gst}</span>
                    </div>
                    <div className="breakdown-total">
                      <span>Total</span>
                      <strong>₹{result.total}</strong>
                    </div>
                  </div>
                )}
              </div>

              {/* Comparison View */}
              <div className="comparison-section">
                <button 
                  className="btn-toggle-comparison"
                  onClick={() => setShowComparison(!showComparison)}
                >
                  📊 {showComparison ? "Hide" : "Compare"} All Services
                </button>
                
                {showComparison && (
                  <div className="comparison-table">
                    {comparisonResults.map(service => (
                      <div 
                        key={service.id}
                        className={`comparison-row ${service.id === formData.serviceType ? "selected" : ""}`}
                        onClick={() => setFormData(prev => ({ ...prev, serviceType: service.id }))}
                      >
                        <div className="comparison-service">
                          <span className="comparison-icon">{service.icon}</span>
                          <div>
                            <strong>{service.label}</strong>
                            <small>{service.days}</small>
                          </div>
                        </div>
                        <div className="comparison-price">
                          ₹{service.result.total}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="result-actions">
                <button 
                  className="btn-primary btn-book"
                  onClick={handleBookShipment}
                >
                  📦 Book This Shipment
                </button>
                
                <div className="action-row">
                  <button className="btn-secondary" onClick={handleCopyQuote}>
                    📋 Copy
                  </button>
                  <button className="btn-secondary" onClick={handleShareWhatsApp}>
                    💬 WhatsApp
                  </button>
                  <button className="btn-secondary" onClick={handleShareEmail}>
                    ✉️ Email
                  </button>
                </div>
                
                <div className="action-row">
                  <button className="btn-secondary" onClick={handleSaveQuote}>
                    💾 Save Quote
                  </button>
                  <button className="btn-secondary" onClick={() => window.print()}>
                    🖨️ Print
                  </button>
                </div>
              </div>

              {/* Important Notes */}
              <div className="info-box">
                <strong>ℹ️ Important Notes:</strong>
                <ul>
                  <li>Final price may vary based on actual weight & dimensions</li>
                  <li>Remote area delivery may incur additional charges</li>
                  <li>Insurance claims require proper documentation</li>
                  <li>COD remittance within 2-3 business days</li>
                  <li>Quote valid for 24 hours from generation</li>
                </ul>
              </div>
            </>
          ) : (
            <div className="empty-state">
              <div className="empty-icon">🧮</div>
              <h3>Calculate Your Rate</h3>
              <p>Enter shipment details on the left to get an instant quote</p>
              <div className="empty-tips">
                <span>💡 Add dimensions for accurate volumetric weight</span>
                <span>💡 Business accounts get 10% discount</span>
                <span>💡 Drop-off at hub saves 5%</span>
                <span>💡 Enter pincodes for auto zone detection</span>
              </div>
            </div>
          )}

          {/* Recent Quotes */}
          {recentQuotes.length > 0 && (
            <div className="recent-quotes">
              <h4>🕐 Recent Quotes</h4>
              <div className="quotes-list">
                {recentQuotes.slice(0, 3).map(quote => (
                  <button 
                    key={quote.id}
                    className="quote-item"
                    onClick={() => {
                      setFormData(quote.formData);
                      setQuoteGeneratedAt(new Date(quote.timestamp));
                      window.scrollTo({ top: 0, behavior: "smooth" });
                      showToast("📋 Quote loaded");
                    }}
                  >
                    <div className="quote-summary">
                      <strong>₹{quote.result.total}</strong>
                      <span>{quote.result.serviceLabel}</span>
                    </div>
                    <small>{new Date(quote.timestamp).toLocaleDateString("en-IN")}</small>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="calculator-footer">
        <p>
          Need a custom quote for bulk shipments? 
          <Link to="/contact"> Contact our sales team</Link> or 
          call <a href="tel:18001234567">📞 1800-123-4567</a>
        </p>
      </footer>
    </div>
  );
}