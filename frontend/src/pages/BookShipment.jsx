import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";
import "./BookShipment.css";

export default function BookShipment() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [formErrors, setFormErrors] = useState({});
  const [saveSuccess, setSaveSuccess] = useState("");

  const today = useMemo(() => new Date().toISOString().split('T')[0], []);

  // ✅ Load saved data from localStorage on mount
  const loadSavedData = () => {
    try {
      const saved = localStorage.getItem("bookShipmentData");
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          ...parsed,
          products: parsed.products || [{ name: "", category: "", quantity: 1, description: "" }],
        };
      }
    } catch (e) {
      console.error("Error loading saved data:", e);
    }
    return null;
  };

  const initialData = loadSavedData() || {
    pickupType: "",
    pickupAddress: "",
    pickupCity: "",
    pickupPincode: "",
    pickupDate: "",
    pickupTime: "",
    dropType: "",
    dropAddress: "",
    dropCity: "",
    dropPincode: "",
    dropDate: "",
    dropTime: "",
    products: [{ name: "", category: "", quantity: 1, description: "" }],
    senderName: "",
    senderPhone: "",
    senderAddress: "",
    senderCity: "",
    senderPincode: "",
    receiverName: "",
    receiverPhone: "",
    receiverAddress: "",
    receiverCity: "",
    receiverPincode: "",
    weight: "",
    length: "",
    width: "",
    height: "",
    serviceType: "standard",
    insurance: false,
    cod: false,
    codAmount: "",
    specialInstructions: "",
    acceptTerms: false,
    acceptDeclaration: false,
    acceptPrivacy: false,
  };

  const [formData, setFormData] = useState(initialData);

  // ✅ Save data to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem("bookShipmentData", JSON.stringify(formData));
  }, [formData]);

  const totalSteps = 6;

  const steps = [
    { num: 1, title: "Pickup", icon: "📍" },
    { num: 2, title: "Drop", icon: "🎯" },
    { num: 3, title: "Products", icon: "📦" },
    { num: 4, title: "People", icon: "👤" },
    { num: 5, title: "Package", icon: "📐" },
    { num: 6, title: "Review", icon: "✅" },
  ];

  const locationTypes = [
    { value: "home", label: "🏠 Home" },
    { value: "office", label: "🏢 Office" },
    { value: "warehouse", label: "🏭 Warehouse" },
    { value: "store", label: "🏪 Store/Shop" },
    { value: "factory", label: "🏗️ Factory" },
    { value: "other", label: "📍 Other" }
  ];

  const productCategories = [
    { value: "electronics", label: "📱 Electronics" },
    { value: "clothing", label: "👕 Clothing" },
    { value: "documents", label: "📄 Documents" },
    { value: "food", label: "🍔 Food" },
    { value: "fragile", label: "⚠️ Fragile Items" },
    { value: "others", label: "📦 Others" }
  ];

  const timeSlots = [
    { value: "morning", label: "🌅 Morning (8AM - 12PM)" },
    { value: "afternoon", label: "☀️ Afternoon (12PM - 4PM)" },
    { value: "evening", label: "🌆 Evening (4PM - 8PM)" }
  ];

  // ✅ Handle numeric input (phone, pincode)
  const handleNumericInput = (e, maxLength) => {
    const { name, value } = e.target;
    const numericValue = value.replace(/\D/g, '').slice(0, maxLength);
    setFormData(prev => ({ ...prev, [name]: numericValue }));
    if (formErrors[name]) {
      setFormErrors(prev => ({ ...prev, [name]: "" }));
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({ ...prev, [name]: type === "checkbox" ? checked : value }));
    if (formErrors[name]) {
      setFormErrors(prev => ({ ...prev, [name]: "" }));
    }
  };

  const handleProductChange = (index, e) => {
    const { name, value } = e.target;
    const updatedProducts = [...formData.products];
    updatedProducts[index] = { ...updatedProducts[index], [name]: value };
    setFormData(prev => ({ ...prev, products: updatedProducts }));
  };

  const addProduct = () => {
    if (formData.products.length >= 10) {
      alert("⚠️ Maximum 10 products allowed");
      return;
    }
    setFormData(prev => ({
      ...prev,
      products: [...prev.products, { name: "", category: "", quantity: 1, description: "" }]
    }));
  };

  const removeProduct = (index) => {
    if (formData.products.length === 1) {
      alert("⚠️ At least one product is required!");
      return;
    }
    const updatedProducts = formData.products.filter((_, i) => i !== index);
    setFormData(prev => ({ ...prev, products: updatedProducts }));
  };

  const calculateVolumetricWeight = () => {
    const l = parseFloat(formData.length) || 0;
    const w = parseFloat(formData.width) || 0;
    const h = parseFloat(formData.height) || 0;
    if (l > 0 && w > 0 && h > 0) {
      return (l * w * h / 5000).toFixed(2);
    }
    return 0;
  };

  const calculateCharges = () => {
    let baseCharge = formData.serviceType === "express" ? 199 : formData.serviceType === "sameday" ? 399 : 99;
    const actualWeight = parseFloat(formData.weight) || 0;
    const volumetricWeight = parseFloat(calculateVolumetricWeight()) || 0;
    const chargeableWeight = Math.max(actualWeight, volumetricWeight);
    let weightCharge = chargeableWeight * 10;
    let insuranceCharge = formData.insurance ? 99 : 0;
    let codCharge = formData.cod ? parseFloat(formData.codAmount || 0) * 0.02 : 0;
    return (baseCharge + weightCharge + insuranceCharge + codCharge).toFixed(2);
  };

  const getEstimatedDelivery = () => {
    if (!formData.pickupDate || !formData.serviceType) return "—";
    const pickup = new Date(formData.pickupDate);
    let days = 3;
    if (formData.serviceType === "express") days = 2;
    else if (formData.serviceType === "sameday") days = 0;
    pickup.setDate(pickup.getDate() + days);
    return pickup.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  // ✅ STEP VALIDATION FUNCTIONS
  const validateStep1 = () => {
    const errors = {};
    const pincodeRegex = /^[0-9]{6}$/;
    
    if (!formData.pickupType) errors.pickupType = "Please select pickup type";
    if (!formData.pickupAddress.trim()) errors.pickupAddress = "Please enter pickup address";
    if (!formData.pickupCity.trim()) errors.pickupCity = "Please enter city";
    if (!formData.pickupPincode) errors.pickupPincode = "Please enter pincode";
    else if (!pincodeRegex.test(formData.pickupPincode)) errors.pickupPincode = "Enter valid 6-digit pincode";
    if (!formData.pickupDate) errors.pickupDate = "Please select pickup date";
    else if (formData.pickupDate < today) errors.pickupDate = "Pickup date cannot be in the past";
    if (!formData.pickupTime) errors.pickupTime = "Please select pickup time";
    
    return errors;
  };

  const validateStep2 = () => {
    const errors = {};
    const pincodeRegex = /^[0-9]{6}$/;
    
    if (!formData.dropType) errors.dropType = "Please select drop type";
    if (!formData.dropAddress.trim()) errors.dropAddress = "Please enter drop address";
    if (!formData.dropCity.trim()) errors.dropCity = "Please enter city";
    if (!formData.dropPincode) errors.dropPincode = "Please enter pincode";
    else if (!pincodeRegex.test(formData.dropPincode)) errors.dropPincode = "Enter valid 6-digit pincode";
    if (!formData.dropDate) errors.dropDate = "Please select drop date";
    else if (formData.pickupDate && formData.dropDate < formData.pickupDate) {
      errors.dropDate = "Drop date must be after pickup date";
    }
    if (!formData.dropTime) errors.dropTime = "Please select drop time";
    
    return errors;
  };

  const validateStep3 = () => {
    const errors = {};
    formData.products.forEach((product, index) => {
      if (!product.name.trim()) errors[`product_name_${index}`] = "Product name required";
      if (!product.category) errors[`product_category_${index}`] = "Category required";
      if (!product.quantity || product.quantity < 1) errors[`product_quantity_${index}`] = "Quantity required";
    });
    return errors;
  };

  const validateStep4 = () => {
    const errors = {};
    const phoneRegex = /^[0-9]{10}$/;
    const pincodeRegex = /^[0-9]{6}$/;
    
    if (!formData.senderName.trim()) errors.senderName = "Sender name required";
    if (!formData.senderPhone) errors.senderPhone = "Sender phone required";
    else if (!phoneRegex.test(formData.senderPhone)) errors.senderPhone = "Enter valid 10-digit number";
    if (!formData.senderAddress.trim()) errors.senderAddress = "Sender address required";
    if (!formData.senderCity.trim()) errors.senderCity = "Sender city required";
    if (!formData.senderPincode) errors.senderPincode = "Sender pincode required";
    else if (!pincodeRegex.test(formData.senderPincode)) errors.senderPincode = "Enter valid 6-digit pincode";
    
    if (!formData.receiverName.trim()) errors.receiverName = "Receiver name required";
    if (!formData.receiverPhone) errors.receiverPhone = "Receiver phone required";
    else if (!phoneRegex.test(formData.receiverPhone)) errors.receiverPhone = "Enter valid 10-digit number";
    if (!formData.receiverAddress.trim()) errors.receiverAddress = "Receiver address required";
    if (!formData.receiverCity.trim()) errors.receiverCity = "Receiver city required";
    if (!formData.receiverPincode) errors.receiverPincode = "Receiver pincode required";
    else if (!pincodeRegex.test(formData.receiverPincode)) errors.receiverPincode = "Enter valid 6-digit pincode";
    
    return errors;
  };

  const validateStep5 = () => {
    const errors = {};
    if (!formData.weight || parseFloat(formData.weight) <= 0) {
      errors.weight = "Please enter package weight";
    } else if (parseFloat(formData.weight) > 500) {
      errors.weight = "Maximum weight is 500 kg";
    }
    if (!formData.serviceType) errors.serviceType = "Please select service type";
    if (formData.cod && (!formData.codAmount || parseFloat(formData.codAmount) <= 0)) {
      errors.codAmount = "Please enter COD amount";
    }
    return errors;
  };

  const validateStep6 = () => {
    const errors = {};
    if (!formData.acceptTerms || !formData.acceptDeclaration || !formData.acceptPrivacy) {
      errors.declarations = "Please accept all declarations";
    }
    return errors;
  };

  const getStepValidator = (step) => {
    switch(step) {
      case 1: return validateStep1;
      case 2: return validateStep2;
      case 3: return validateStep3;
      case 4: return validateStep4;
      case 5: return validateStep5;
      case 6: return validateStep6;
      default: return () => ({});
    }
  };

  // ✅ SAVE & NEXT HANDLER
  const handleSaveAndNext = () => {
    const validator = getStepValidator(currentStep);
    const errors = validator();
    
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      const firstError = Object.values(errors)[0];
      alert(`⚠️ Please fix the following:\n\n${firstError}`);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    
    // Save to localStorage
    localStorage.setItem("bookShipmentData", JSON.stringify(formData));
    setSaveSuccess(`✅ Step ${currentStep} saved successfully!`);
    setTimeout(() => setSaveSuccess(""), 3000);
    
    // Move to next step
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
      setFormErrors({});
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleSaveOnly = () => {
    const validator = getStepValidator(currentStep);
    const errors = validator();
    
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      alert("⚠️ Please fix errors before saving");
      return;
    }
    
    localStorage.setItem("bookShipmentData", JSON.stringify(formData));
    setSaveSuccess(`✅ Progress saved! You can continue later.`);
    setTimeout(() => setSaveSuccess(""), 3000);
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
      setFormErrors({});
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleFinalSubmit = () => {
    const errors = validateStep6();
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      alert("⚠️ Please accept all declarations");
      return;
    }
    setShowConfirmModal(true);
  };

  const confirmBooking = async () => {
    if (!currentUser || !currentUser.uid) {
      alert("⚠️ Please login to book a shipment");
      navigate('/login');
      return;
    }

    setShowConfirmModal(false);
    setIsSubmitting(true);

    try {
      const trackingId = "ATL-" + Date.now().toString().slice(-10);
      const actualWeight = parseFloat(formData.weight) || 0;
      const volumetricWeight = parseFloat(calculateVolumetricWeight()) || 0;
      const chargeableWeight = Math.max(actualWeight, volumetricWeight);

      await addDoc(collection(db, 'shipments'), {
        trackingId,
        userId: currentUser.uid,
        userEmail: currentUser.email,
        ...formData,
        volumetricWeight: calculateVolumetricWeight(),
        chargeableWeight,
        estimatedCharges: calculateCharges(),
        estimatedDelivery: getEstimatedDelivery(),
        status: "Booked",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      await addDoc(collection(db, 'invoices'), {
        userId: currentUser.uid,
        userEmail: currentUser.email,
        trackingId,
        shipmentId: trackingId,
        customer: formData.senderName || currentUser.email,
        route: `${formData.pickupCity} → ${formData.dropCity}`,
        amount: calculateCharges(),
        status: "Unpaid",
        createdAt: serverTimestamp()
      });

      // ✅ Clear saved data after successful booking
      localStorage.removeItem("bookShipmentData");
      
      alert(`✅ Shipment Booked Successfully!\n\n📋 Tracking ID: ${trackingId}\n💰 Charges: ₹${calculateCharges()}\n📅 Est. Delivery: ${getEstimatedDelivery()}`);
      navigate('/dashboard');
    } catch (error) {
      console.error("Error booking shipment:", error);
      alert("❌ Failed to book shipment. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const clearAllData = () => {
    if (window.confirm("⚠️ Are you sure? All entered data will be cleared!")) {
      localStorage.removeItem("bookShipmentData");
      setFormData({
        pickupType: "", pickupAddress: "", pickupCity: "", pickupPincode: "", pickupDate: "", pickupTime: "",
        dropType: "", dropAddress: "", dropCity: "", dropPincode: "", dropDate: "", dropTime: "",
        products: [{ name: "", category: "", quantity: 1, description: "" }],
        senderName: "", senderPhone: "", senderAddress: "", senderCity: "", senderPincode: "",
        receiverName: "", receiverPhone: "", receiverAddress: "", receiverCity: "", receiverPincode: "",
        weight: "", length: "", width: "", height: "",
        serviceType: "standard", insurance: false, cod: false, codAmount: "",
        specialInstructions: "", acceptTerms: false, acceptDeclaration: false, acceptPrivacy: false,
      });
      setCurrentStep(1);
      setFormErrors({});
    }
  };

  return (
    <div className="book-shipment-page">
      {/* Page Header */}
      <div className="page-header">
        <div className="header-info">
          <h1>📦 Book New Shipment</h1>
          <p>Complete all steps to book your shipment</p>
        </div>
        <div className="header-actions">
          <button onClick={clearAllData} className="clear-btn" title="Clear all data">
            🗑️ Clear All
          </button>
          <button onClick={() => navigate('/dashboard')} className="back-btn">
            ← Dashboard
          </button>
        </div>
      </div>

      {/* ✅ PROGRESS STEPPER */}
      <div className="progress-stepper">
        {steps.map((step) => (
          <div 
            key={step.num} 
            className={`step-item ${currentStep === step.num ? 'active' : ''} ${currentStep > step.num ? 'completed' : ''}`}
            onClick={() => currentStep > step.num && setCurrentStep(step.num)}
          >
            <div className="step-circle">
              {currentStep > step.num ? "✓" : step.icon}
            </div>
            <div className="step-label">{step.title}</div>
            {step.num < totalSteps && <div className="step-line"></div>}
          </div>
        ))}
      </div>

      {/* ✅ SUCCESS MESSAGE */}
      {saveSuccess && (
        <div className="save-success-message">
          {saveSuccess}
        </div>
      )}

      {/* ✅ STEP INDICATOR */}
      <div className="step-indicator">
        <span>Step {currentStep} of {totalSteps}</span>
        <span className="step-indicator__title">
          {steps[currentStep - 1].icon} {steps[currentStep - 1].title} Details
        </span>
      </div>

      {/* ============ STEP 1: PICKUP DETAILS ============ */}
      {currentStep === 1 && (
        <div className="form-section">
          <h3><span className="section-icon">📍</span> PICKUP DETAILS</h3>
          <p className="section-description">Where should we pick up the shipment from?</p>
          
          <div className="form-grid">
            <div className="form-group">
              <label>Pickup Location Type *</label>
              <select name="pickupType" value={formData.pickupType} onChange={handleChange}>
                <option value="">-- Select Type --</option>
                {locationTypes.map(type => (
                  <option key={type.value} value={type.value}>{type.label}</option>
                ))}
              </select>
              {formErrors.pickupType && <span className="field-error">⚠️ {formErrors.pickupType}</span>}
            </div>

            <div className="form-group">
              <label>City *</label>
              <input 
                type="text" 
                name="pickupCity" 
                value={formData.pickupCity} 
                onChange={handleChange} 
                placeholder="Enter city name"
              />
              {formErrors.pickupCity && <span className="field-error">⚠️ {formErrors.pickupCity}</span>}
            </div>

            <div className="form-group full-width">
              <label>Complete Address *</label>
              <input
                 type="text"
                  name="pickupAddress"
                 value={formData.pickupAddress}
                  onChange={handleChange}
                 placeholder="Enter pickup address"
                    required
                    style={{
                  backgroundColor: '#ffffff',
                  color: '#1f2937',
                 WebkitTextFillColor: '#1f2937'
                 }}
                />
              {formErrors.pickupAddress && <span className="field-error">⚠️ {formErrors.pickupAddress}</span>}
            </div>

            <div className="form-group">
              <label>Pincode *</label>
              <input 
                type="text" 
                inputMode="numeric"
                name="pickupPincode" 
                value={formData.pickupPincode} 
                onChange={(e) => handleNumericInput(e, 6)}
                placeholder="6-digit pincode"
                maxLength="6"
              />
              {formErrors.pickupPincode && <span className="field-error">⚠️ {formErrors.pickupPincode}</span>}
            </div>

            <div className="form-group">
              <label>Pickup Date *</label>
              <input 
                type="date" 
                name="pickupDate" 
                value={formData.pickupDate} 
                onChange={handleChange}
                min={today}
              />
              {formErrors.pickupDate && <span className="field-error">⚠️ {formErrors.pickupDate}</span>}
            </div>

            <div className="form-group">
              <label>Pickup Time Slot *</label>
              <select name="pickupTime" value={formData.pickupTime} onChange={handleChange}>
                <option value="">-- Select Time --</option>
                {timeSlots.map(slot => (
                  <option key={slot.value} value={slot.value}>{slot.label}</option>
                ))}
              </select>
              {formErrors.pickupTime && <span className="field-error">⚠️ {formErrors.pickupTime}</span>}
            </div>
          </div>

          <div className="step-actions">
            <button type="button" onClick={() => navigate('/dashboard')} className="btn-cancel">
              Cancel
            </button>
            <div className="step-actions-right">
              <button type="button" onClick={handleSaveOnly} className="btn-save">
                💾 Save Progress
              </button>
              <button type="button" onClick={handleSaveAndNext} className="btn-next">
                Save & Next →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============ STEP 2: DROP DETAILS ============ */}
      {currentStep === 2 && (
        <div className="form-section">
          <h3><span className="section-icon">🎯</span> DROP DETAILS</h3>
          <p className="section-description">Where should we deliver the shipment?</p>
          
          <div className="form-grid">
            <div className="form-group">
              <label>Drop Location Type *</label>
              <select name="dropType" value={formData.dropType} onChange={handleChange}>
                <option value="">-- Select Type --</option>
                {locationTypes.map(type => (
                  <option key={type.value} value={type.value}>{type.label}</option>
                ))}
              </select>
              {formErrors.dropType && <span className="field-error">⚠️ {formErrors.dropType}</span>}
            </div>

            <div className="form-group">
              <label>City *</label>
              <input 
                type="text" 
                name="dropCity" 
                value={formData.dropCity} 
                onChange={handleChange} 
                placeholder="Enter city name"
              />
              {formErrors.dropCity && <span className="field-error">⚠️ {formErrors.dropCity}</span>}
            </div>

            <div className="form-group full-width">
              <label>Complete Address *</label>
              <input 
                type="text" 
                name="dropAddress" 
                value={formData.dropAddress} 
                onChange={handleChange} 
                placeholder="House/Plot No, Street, Area, Landmark"
              />
              {formErrors.dropAddress && <span className="field-error">⚠️ {formErrors.dropAddress}</span>}
            </div>

            <div className="form-group">
              <label>Pincode *</label>
              <input 
                type="text" 
                inputMode="numeric"
                name="dropPincode" 
                value={formData.dropPincode} 
                onChange={(e) => handleNumericInput(e, 6)}
                placeholder="6-digit pincode"
                maxLength="6"
              />
              {formErrors.dropPincode && <span className="field-error">⚠️ {formErrors.dropPincode}</span>}
            </div>

            <div className="form-group">
              <label>Drop Date *</label>
              <input 
                type="date" 
                name="dropDate" 
                value={formData.dropDate} 
                onChange={handleChange}
                min={formData.pickupDate || today}
              />
              {formErrors.dropDate && <span className="field-error">⚠️ {formErrors.dropDate}</span>}
            </div>

            <div className="form-group">
              <label>Drop Time Slot *</label>
              <select name="dropTime" value={formData.dropTime} onChange={handleChange}>
                <option value="">-- Select Time --</option>
                {timeSlots.map(slot => (
                  <option key={slot.value} value={slot.value}>{slot.label}</option>
                ))}
              </select>
              {formErrors.dropTime && <span className="field-error">⚠️ {formErrors.dropTime}</span>}
            </div>
          </div>

          <div className="step-actions">
            <button type="button" onClick={handleBack} className="btn-back">
              ← Back
            </button>
            <div className="step-actions-right">
              <button type="button" onClick={handleSaveOnly} className="btn-save">
                💾 Save Progress
              </button>
              <button type="button" onClick={handleSaveAndNext} className="btn-next">
                Save & Next →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============ STEP 3: PRODUCT DETAILS ============ */}
      {currentStep === 3 && (
        <div className="form-section">
          <h3><span className="section-icon">📦</span> PRODUCT DETAILS</h3>
          <p className="section-description">What are you shipping? Add all products.</p>
          
          <div className="product-list">
            {formData.products.map((product, index) => (
              <div key={index} className="product-card">
                <div className="product-card-header">
                  <span className="product-number">Product #{index + 1}</span>
                  {formData.products.length > 1 && (
                    <button type="button" className="remove-product-btn" onClick={() => removeProduct(index)}>
                      🗑️ Remove
                    </button>
                  )}
                </div>
                
                <div className="product-grid">
                  <div className="form-group">
                    <label>Product Name *</label>
                    <input 
                      type="text" 
                      name="name" 
                      value={product.name} 
                      onChange={(e) => handleProductChange(index, e)} 
                      placeholder="e.g., Mobile Phone, T-Shirt"
                    />
                    {formErrors[`product_name_${index}`] && <span className="field-error">⚠️ {formErrors[`product_name_${index}`]}</span>}
                  </div>

                  <div className="form-group">
                    <label>Category *</label>
                    <select name="category" value={product.category} onChange={(e) => handleProductChange(index, e)}>
                      <option value="">-- Select Category --</option>
                      {productCategories.map(cat => (
                        <option key={cat.value} value={cat.value}>{cat.label}</option>
                      ))}
                    </select>
                    {formErrors[`product_category_${index}`] && <span className="field-error">⚠️ {formErrors[`product_category_${index}`]}</span>}
                  </div>

                  <div className="form-group">
                    <label>Quantity *</label>
                    <div className="quantity-control">
                      <button type="button" onClick={() => {
                        if (product.quantity > 1) {
                          const updated = [...formData.products];
                          updated[index].quantity -= 1;
                          setFormData(prev => ({ ...prev, products: updated }));
                        }
                      }}>−</button>
                      <input 
                        type="number" 
                        name="quantity" 
                        value={product.quantity} 
                        onChange={(e) => handleProductChange(index, e)} 
                        min="1"
                      />
                      <button type="button" onClick={() => {
                        const updated = [...formData.products];
                        updated[index].quantity += 1;
                        setFormData(prev => ({ ...prev, products: updated }));
                      }}>+</button>
                    </div>
                  </div>

                  <div className="form-group full-width">
                    <label>Description (Optional)</label>
                    <input 
                      type="text" 
                      name="description" 
                      value={product.description} 
                      onChange={(e) => handleProductChange(index, e)} 
                      placeholder="Color, size, special features..."
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <button type="button" className="add-product-btn" onClick={addProduct}>
            ➕ Add Another Product
          </button>

          <div className="step-actions">
            <button type="button" onClick={handleBack} className="btn-back">
              ← Back
            </button>
            <div className="step-actions-right">
              <button type="button" onClick={handleSaveOnly} className="btn-save">
                💾 Save Progress
              </button>
              <button type="button" onClick={handleSaveAndNext} className="btn-next">
                Save & Next →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============ STEP 4: SENDER & RECEIVER ============ */}
      {currentStep === 4 && (
        <div className="form-section">
          <h3><span className="section-icon">👤</span> SENDER & RECEIVER DETAILS</h3>
          <p className="section-description">Who is sending and who will receive?</p>
          
          <div className="two-column">
            {/* SENDER */}
            <div className="person-section">
              <h4>📤 Sender Details</h4>
              <div className="form-grid">
                <div className="form-group full-width">
                  <label>Full Name *</label>
                  <input type="text" name="senderName" value={formData.senderName} onChange={handleChange} placeholder="Sender's full name" />
                  {formErrors.senderName && <span className="field-error">⚠️ {formErrors.senderName}</span>}
                </div>
                <div className="form-group full-width">
                  <label>Phone Number *</label>
                  <input 
                    type="tel" 
                    inputMode="numeric"
                    name="senderPhone" 
                    value={formData.senderPhone} 
                    onChange={(e) => handleNumericInput(e, 10)}
                    placeholder="10-digit mobile number"
                    maxLength="10"
                  />
                  {formErrors.senderPhone && <span className="field-error">⚠️ {formErrors.senderPhone}</span>}
                </div>
                <div className="form-group full-width">
                  <label>Address *</label>
                  <input type="text" name="senderAddress" value={formData.senderAddress} onChange={handleChange} placeholder="Complete address" />
                  {formErrors.senderAddress && <span className="field-error">⚠️ {formErrors.senderAddress}</span>}
                </div>
                <div className="form-group">
                  <label>City *</label>
                  <input type="text" name="senderCity" value={formData.senderCity} onChange={handleChange} placeholder="City" />
                  {formErrors.senderCity && <span className="field-error">⚠️ {formErrors.senderCity}</span>}
                </div>
                <div className="form-group">
                  <label>Pincode *</label>
                  <input 
                    type="text" 
                    inputMode="numeric"
                    name="senderPincode" 
                    value={formData.senderPincode} 
                    onChange={(e) => handleNumericInput(e, 6)}
                    placeholder="6-digit pincode"
                    maxLength="6"
                  />
                  {formErrors.senderPincode && <span className="field-error">⚠️ {formErrors.senderPincode}</span>}
                </div>
              </div>
            </div>

            {/* RECEIVER */}
            <div className="person-section">
              <h4>📥 Receiver Details</h4>
              <div className="form-grid">
                <div className="form-group full-width">
                  <label>Full Name *</label>
                  <input type="text" name="receiverName" value={formData.receiverName} onChange={handleChange} placeholder="Receiver's full name" />
                  {formErrors.receiverName && <span className="field-error">⚠️ {formErrors.receiverName}</span>}
                </div>
                <div className="form-group full-width">
                  <label>Phone Number *</label>
                  <input 
                    type="tel" 
                    inputMode="numeric"
                    name="receiverPhone" 
                    value={formData.receiverPhone} 
                    onChange={(e) => handleNumericInput(e, 10)}
                    placeholder="10-digit mobile number"
                    maxLength="10"
                  />
                  {formErrors.receiverPhone && <span className="field-error">⚠️ {formErrors.receiverPhone}</span>}
                </div>
                <div className="form-group full-width">
                  <label>Address *</label>
                  <input type="text" name="receiverAddress" value={formData.receiverAddress} onChange={handleChange} placeholder="Complete address" />
                  {formErrors.receiverAddress && <span className="field-error">⚠️ {formErrors.receiverAddress}</span>}
                </div>
                <div className="form-group">
                  <label>City *</label>
                  <input type="text" name="receiverCity" value={formData.receiverCity} onChange={handleChange} placeholder="City" />
                  {formErrors.receiverCity && <span className="field-error">⚠️ {formErrors.receiverCity}</span>}
                </div>
                <div className="form-group">
                  <label>Pincode *</label>
                  <input 
                    type="text" 
                    inputMode="numeric"
                    name="receiverPincode" 
                    value={formData.receiverPincode} 
                    onChange={(e) => handleNumericInput(e, 6)}
                    placeholder="6-digit pincode"
                    maxLength="6"
                  />
                  {formErrors.receiverPincode && <span className="field-error">⚠️ {formErrors.receiverPincode}</span>}
                </div>
              </div>
            </div>
          </div>

          <div className="step-actions">
            <button type="button" onClick={handleBack} className="btn-back">
              ← Back
            </button>
            <div className="step-actions-right">
              <button type="button" onClick={handleSaveOnly} className="btn-save">
                💾 Save Progress
              </button>
              <button type="button" onClick={handleSaveAndNext} className="btn-next">
                Save & Next →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============ STEP 5: PACKAGE & SERVICE ============ */}
      {currentStep === 5 && (
        <div className="form-section">
          <h3><span className="section-icon">📐</span> PACKAGE & SERVICE</h3>
          <p className="section-description">Package dimensions and service options</p>
          
          <div className="form-grid">
            <div className="form-group">
              <label>Weight (kg) *</label>
              <input 
                type="number" 
                name="weight" 
                value={formData.weight} 
                onChange={handleChange} 
                placeholder="e.g., 2.5"
                step="0.1" 
                min="0.1" 
                max="500"
              />
              {formErrors.weight && <span className="field-error">⚠️ {formErrors.weight}</span>}
              <span className="field-hint">Max: 500 kg</span>
            </div>

            <div className="form-group">
              <label>Service Type *</label>
              <select name="serviceType" value={formData.serviceType} onChange={handleChange}>
                <option value="standard">📦 Standard (3-5 Days) - ₹99 base</option>
                <option value="express">⚡ Express (1-2 Days) - ₹199 base</option>
                <option value="sameday">🚀 Same Day Delivery - ₹399 base</option>
              </select>
            </div>

            <div className="form-group">
              <label>Length (cm)</label>
              <input type="number" name="length" value={formData.length} onChange={handleChange} placeholder="Length" min="0" max="300" />
            </div>
            <div className="form-group">
              <label>Width (cm)</label>
              <input type="number" name="width" value={formData.width} onChange={handleChange} placeholder="Width" min="0" max="300" />
            </div>
            <div className="form-group">
              <label>Height (cm)</label>
              <input type="number" name="height" value={formData.height} onChange={handleChange} placeholder="Height" min="0" max="300" />
            </div>

            {calculateVolumetricWeight() > 0 && (
              <div className="form-group">
                <label>Volumetric Weight</label>
                <div className="volumetric-display">
                  ⚖️ {calculateVolumetricWeight()} kg
                </div>
                <span className="field-hint">Charges apply on greater of actual or volumetric weight</span>
              </div>
            )}
          </div>

          {/* Additional Options */}
          <div className="options-section">
            <h4>⚙️ Additional Options</h4>
            <label className="checkbox-option">
              <input type="checkbox" name="insurance" checked={formData.insurance} onChange={handleChange} />
              <div className="checkbox-content">
                <div className="checkbox-title">🛡️ Add Insurance (+₹99)</div>
                <div className="checkbox-desc">Protect your shipment against damage/loss</div>
              </div>
            </label>
            <label className="checkbox-option">
              <input type="checkbox" name="cod" checked={formData.cod} onChange={handleChange} />
              <div className="checkbox-content">
                <div className="checkbox-title">💵 Cash on Delivery (2% fee)</div>
                <div className="checkbox-desc">Collect payment from receiver</div>
              </div>
            </label>
            {formData.cod && (
              <div className="cod-amount-field">
                <label>COD Amount (₹) *</label>
                <input 
                  type="text"
                  inputMode="numeric"
                  name="codAmount" 
                  value={formData.codAmount} 
                  onChange={(e) => handleNumericInput(e, 10)}
                  placeholder="Enter amount to collect"
                />
                {formErrors.codAmount && <span className="field-error">⚠️ {formErrors.codAmount}</span>}
              </div>
            )}
            <div className="form-group" style={{marginTop: "16px"}}>
              <label>Special Instructions (Optional)</label>
              <textarea 
                name="specialInstructions" 
                value={formData.specialInstructions} 
                onChange={handleChange} 
                placeholder="e.g., Fragile - Handle with care, Do not bend, etc."
                rows="3"
                maxLength="500"
              />
              <span className="field-hint">{formData.specialInstructions.length}/500 characters</span>
            </div>
          </div>

          <div className="step-actions">
            <button type="button" onClick={handleBack} className="btn-back">
              ← Back
            </button>
            <div className="step-actions-right">
              <button type="button" onClick={handleSaveOnly} className="btn-save">
                💾 Save Progress
              </button>
              <button type="button" onClick={handleSaveAndNext} className="btn-next">
                Save & Review →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============ STEP 6: REVIEW & CONFIRM ============ */}
      {currentStep === 6 && (
        <div className="form-section">
          <h3><span className="section-icon">✅</span> REVIEW & CONFIRM</h3>
          <p className="section-description">Please verify all details before booking</p>
          
          <div className="review-section">
            {/* Pickup */}
            <div className="review-block">
              <h4>📍 Pickup Details</h4>
              <div className="review-grid">
                <div><span className="review-label">Type:</span> <span className="review-value">{formData.pickupType}</span></div>
                <div><span className="review-label">City:</span> <span className="review-value">{formData.pickupCity}</span></div>
                <div className="full-width"><span className="review-label">Address:</span> <span className="review-value">{formData.pickupAddress}</span></div>
                <div><span className="review-label">Pincode:</span> <span className="review-value">{formData.pickupPincode}</span></div>
                <div><span className="review-label">Date:</span> <span className="review-value">{formData.pickupDate}</span></div>
                <div><span className="review-label">Time:</span> <span className="review-value">{formData.pickupTime}</span></div>
              </div>
              <button type="button" onClick={() => setCurrentStep(1)} className="edit-btn">✏️ Edit</button>
            </div>

            {/* Drop */}
            <div className="review-block">
              <h4>🎯 Drop Details</h4>
              <div className="review-grid">
                <div><span className="review-label">Type:</span> <span className="review-value">{formData.dropType}</span></div>
                <div><span className="review-label">City:</span> <span className="review-value">{formData.dropCity}</span></div>
                <div className="full-width"><span className="review-label">Address:</span> <span className="review-value">{formData.dropAddress}</span></div>
                <div><span className="review-label">Pincode:</span> <span className="review-value">{formData.dropPincode}</span></div>
                <div><span className="review-label">Date:</span> <span className="review-value">{formData.dropDate}</span></div>
                <div><span className="review-label">Time:</span> <span className="review-value">{formData.dropTime}</span></div>
              </div>
              <button type="button" onClick={() => setCurrentStep(2)} className="edit-btn">✏️ Edit</button>
            </div>

            {/* Products */}
            <div className="review-block">
              <h4>📦 Products ({formData.products.length})</h4>
              {formData.products.map((p, i) => (
                <div key={i} className="review-product">
                  <strong>{p.name}</strong> - {p.category} × {p.quantity}
                  {p.description && <span className="review-desc"> ({p.description})</span>}
                </div>
              ))}
              <button type="button" onClick={() => setCurrentStep(3)} className="edit-btn">✏️ Edit</button>
            </div>

            {/* People */}
            <div className="review-block">
              <h4>👤 Sender & Receiver</h4>
              <div className="review-people">
                <div className="review-person">
                  <strong>📤 Sender:</strong> {formData.senderName}<br/>
                  📞 {formData.senderPhone}<br/>
                  📍 {formData.senderAddress}, {formData.senderCity} - {formData.senderPincode}
                </div>
                <div className="review-person">
                  <strong>📥 Receiver:</strong> {formData.receiverName}<br/>
                  📞 {formData.receiverPhone}<br/>
                  📍 {formData.receiverAddress}, {formData.receiverCity} - {formData.receiverPincode}
                </div>
              </div>
              <button type="button" onClick={() => setCurrentStep(4)} className="edit-btn">✏️ Edit</button>
            </div>

            {/* Package */}
            <div className="review-block">
              <h4>📐 Package & Service</h4>
              <div className="review-grid">
                <div><span className="review-label">Weight:</span> <span className="review-value">{formData.weight} kg</span></div>
                <div><span className="review-label">Service:</span> <span className="review-value">{formData.serviceType}</span></div>
                <div><span className="review-label">Insurance:</span> <span className="review-value">{formData.insurance ? "✅ Yes" : "❌ No"}</span></div>
                <div><span className="review-label">COD:</span> <span className="review-value">{formData.cod ? `₹${formData.codAmount}` : "❌ No"}</span></div>
              </div>
              <button type="button" onClick={() => setCurrentStep(5)} className="edit-btn">✏️ Edit</button>
            </div>

            {/* Charges Summary */}
            <div className="charges-summary">
              <h4>💰 Charges Summary</h4>
              <div className="charges-grid">
                <div><span>Route:</span> <strong>{formData.pickupCity} → {formData.dropCity}</strong></div>
                <div><span>Chargeable Weight:</span> <strong>{Math.max(parseFloat(formData.weight) || 0, parseFloat(calculateVolumetricWeight()) || 0).toFixed(2)} kg</strong></div>
                <div><span>Est. Delivery:</span> <strong className="delivery-date">{getEstimatedDelivery()}</strong></div>
                <div className="total-charge">
                  <span>Total Charges:</span> 
                  <strong>₹{calculateCharges()}</strong>
                </div>
              </div>
            </div>
          </div>

          {/* Declarations */}
          <div className="declarations-section">
            <h4>📄 Terms & Declarations</h4>
            <label className="checkbox-label">
              <input type="checkbox" name="acceptTerms" checked={formData.acceptTerms} onChange={handleChange} />
              <span>I accept the <a href="#" className="green-link">Terms & Conditions</a> *</span>
            </label>
            <label className="checkbox-label">
              <input type="checkbox" name="acceptDeclaration" checked={formData.acceptDeclaration} onChange={handleChange} />
              <span>I accept the <a href="#" className="green-link">Declaration</a> *</span>
            </label>
            <label className="checkbox-label">
              <input type="checkbox" name="acceptPrivacy" checked={formData.acceptPrivacy} onChange={handleChange} />
              <span>I accept the <a href="#" className="green-link">Privacy Policy</a> *</span>
            </label>
            {formErrors.declarations && <span className="field-error">⚠️ {formErrors.declarations}</span>}
          </div>

          <div className="step-actions">
            <button type="button" onClick={handleBack} className="btn-back">
              ← Back
            </button>
            <div className="step-actions-right">
              <button type="button" onClick={handleFinalSubmit} className="btn-book" disabled={isSubmitting}>
                {isSubmitting ? (
                  <><span className="spinner"></span> Processing...</>
                ) : (
                  <>📦 Book Shipment - ₹{calculateCharges()}</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
      

      {/* ============ CONFIRMATION MODAL ============ */}
      {showConfirmModal && (
        <div className="confirm-modal-overlay" onClick={() => setShowConfirmModal(false)}>
          <div className="confirm-modal" onClick={(e) => e.stopPropagation()}>
            <div className="confirm-modal__header">
              <h2>📋 Confirm Shipment Booking</h2>
              <button onClick={() => setShowConfirmModal(false)} className="confirm-modal__close">✕</button>
            </div>
            <div className="confirm-modal__body">
              <div className="confirm-summary">
                <div className="confirm-row">
                  <span>Route:</span>
                  <strong>{formData.pickupCity} → {formData.dropCity}</strong>
                </div>
                <div className="confirm-row">
                  <span>Service:</span>
                  <strong>{formData.serviceType}</strong>
                </div>
                <div className="confirm-row">
                  <span>Pickup:</span>
                  <strong>{formData.pickupDate}</strong>
                </div>
                <div className="confirm-row">
                  <span>Est. Delivery:</span>
                  <strong>{getEstimatedDelivery()}</strong>
                </div>
                <div className="confirm-row total-row">
                  <span>Total Charges:</span>
                  <strong>₹{calculateCharges()}</strong>
                </div>
              </div>
              <div className="confirm-notice">
                <span>ℹ️</span>
                <p>Please verify all details. You can track your shipment after booking.</p>
              </div>
            </div>
            <div className="confirm-modal__footer">
              <button onClick={() => setShowConfirmModal(false)} className="confirm-btn confirm-btn--outline">
                ← Edit Details
              </button>
              <button onClick={confirmBooking} className="confirm-btn confirm-btn--primary" disabled={isSubmitting}>
                {isSubmitting ? <><span className="spinner"></span> Processing...</> : <>✅ Confirm & Book</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}