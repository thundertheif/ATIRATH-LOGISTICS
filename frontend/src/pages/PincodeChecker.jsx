import { useState, useEffect, useCallback } from "react";
import "./PincodeChecker.css";
import logo from "../assets/logo_3.png";
import { Link } from "react-router-dom";

export default function PincodeChecker() {
  const [pincode, setPincode] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [recentSearches, setRecentSearches] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Serviceable pincodes database (mock - replace with API)
  const SERVICEABLE_DATA = {
    "400001": { city: "Mumbai", state: "Maharashtra", deliveryDays: "1-2", charge: 80, serviceType: "Express" },
    "400002": { city: "Mumbai", state: "Maharashtra", deliveryDays: "1-2", charge: 80, serviceType: "Express" },
    "110001": { city: "New Delhi", state: "Delhi", deliveryDays: "2-3", charge: 100, serviceType: "Standard" },
    "110002": { city: "New Delhi", state: "Delhi", deliveryDays: "2-3", charge: 100, serviceType: "Standard" },
    "560001": { city: "Bangalore", state: "Karnataka", deliveryDays: "2-4", charge: 120, serviceType: "Standard" },
    "500001": { city: "Hyderabad", state: "Telangana", deliveryDays: "2-3", charge: 95, serviceType: "Express" },
    "600001": { city: "Chennai", state: "Tamil Nadu", deliveryDays: "3-4", charge: 110, serviceType: "Standard" },
    "700001": { city: "Kolkata", state: "West Bengal", deliveryDays: "3-5", charge: 130, serviceType: "Economy" },
    "380001": { city: "Ahmedabad", state: "Gujarat", deliveryDays: "2-3", charge: 90, serviceType: "Express" },
    "411001": { city: "Pune", state: "Maharashtra", deliveryDays: "1-2", charge: 75, serviceType: "Express" },
  };

  // Popular pincodes for suggestions
  const POPULAR_PINCODES = [
    "400001", "110001", "560001", "500001", "600001", 
    "700001", "380001", "411001", "500008", "400070"
  ];

  // Load recent searches from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("atirathRecentPincodes");
    if (saved) {
      setRecentSearches(JSON.parse(saved));
    }
  }, []);

  // Generate suggestions as user types
  useEffect(() => {
    if (pincode.length >= 3) {
      const filtered = POPULAR_PINCODES.filter(p => 
        p.startsWith(pincode)
      ).slice(0, 5);
      setSuggestions(filtered);
      setShowSuggestions(true);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  }, [pincode]);

  // Validate pincode format
  const validatePincode = useCallback((code) => {
    const pincodeRegex = /^[1-9][0-9]{5}$/;
    return pincodeRegex.test(code);
  }, []);

  // Handle pincode check
  const checkPincode = async (code = pincode) => {
    if (!code.trim()) {
      setError("Please enter a 6-digit PIN code");
      return;
    }

    if (!validatePincode(code)) {
      setError("Invalid PIN code format");
      return;
    }

    setLoading(true);
    setError("");
    setResult(null);

    try {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 800));
      
      // Mock API response - Replace with actual fetch
      // const res = await fetch(`https://api.atirathlogistics.com/v1/serviceability/${code}`);
      // const data = await res.json();
      
      const serviceData = SERVICEABLE_DATA[code];
      
      if (serviceData) {
        const resultData = {
          serviceable: true,
          pincode: code,
          ...serviceData,
          estimatedDate: calculateDeliveryDate(serviceData.deliveryDays),
          cutoffTime: "6:00 PM",
          restrictions: getRestrictions(serviceData.serviceType),
          services: getAvailableServices(serviceData.serviceType)
        };
        setResult(resultData);
        
        // Save to recent searches
        saveToRecent(code, serviceData.city);
      } else {
        setResult({
          serviceable: false,
          pincode: code,
          message: "Currently not serviceable in your area",
          alternatives: getNearbyServiceable(code)
        });
      }
    } catch (err) {
      setError("Unable to check serviceability. Please try again.");
      console.error("Pincode check error:", err);
    } finally {
      setLoading(false);
    }
  };

  // Calculate estimated delivery date
  const calculateDeliveryDate = (deliveryDays) => {
    const [min, max] = deliveryDays.split("-").map(Number);
    const today = new Date();
    const estimated = new Date(today);
    estimated.setDate(today.getDate() + Math.ceil((min + max) / 2));
    
    return estimated.toLocaleDateString("en-IN", {
      weekday: "short",
      day: "numeric",
      month: "short"
    });
  };

  // Get service restrictions
  const getRestrictions = (serviceType) => {
    const restrictions = {
      "Express": ["Max weight: 30kg", "No hazardous materials", "Signature required"],
      "Standard": ["Max weight: 50kg", "No liquids over 1L", "ID proof for delivery"],
      "Economy": ["Max weight: 70kg", "7-10 day delivery", "Self pickup option"]
    };
    return restrictions[serviceType] || [];
  };

  // Get available services
  const getAvailableServices = (serviceType) => {
    const services = {
      "Express": ["Same Day", "Next Day", "Time Slot Delivery", "Live Tracking"],
      "Standard": ["2-4 Day Delivery", "COD Available", "Insurance Option", "SMS Updates"],
      "Economy": ["Bulk Shipping", "Warehouse Pickup", "Flexible Delivery", "Email Updates"]
    };
    return services[serviceType] || [];
  };

  // Find nearby serviceable pincodes
  const getNearbyServiceable = (pincode) => {
    const prefix = pincode.slice(0, 3);
    return Object.keys(SERVICEABLE_DATA)
      .filter(p => p.startsWith(prefix) && p !== pincode)
      .slice(0, 3)
      .map(p => ({
        pincode: p,
        city: SERVICEABLE_DATA[p].city,
        deliveryDays: SERVICEABLE_DATA[p].deliveryDays
      }));
  };

  // Save to recent searches
  const saveToRecent = (code, city) => {
    const newSearch = { pincode: code, city, timestamp: Date.now() };
    const updated = [
      newSearch,
      ...recentSearches.filter(s => s.pincode !== code)
    ].slice(0, 5);
    
    setRecentSearches(updated);
    localStorage.setItem("atirathRecentPincodes", JSON.stringify(updated));
  };

  // Handle suggestion click
  const handleSuggestionClick = (suggestion) => {
    setPincode(suggestion);
    setShowSuggestions(false);
    checkPincode(suggestion);
  };

  // Clear result
  const handleClear = () => {
    setPincode("");
    setResult(null);
    setError("");
    setSuggestions([]);
  };

  // Copy result to clipboard
  const copyResult = () => {
    if (!result) return;
    const text = `Atirath Logistics - Pincode: ${result.pincode}\nService: ${result.serviceable ? "Available" : "Not Available"}\n${result.serviceable ? `Delivery: ${result.deliveryDays} days\nCharge: ₹${result.charge}` : result.message}`;
    navigator.clipboard.writeText(text);
    alert("✅ Copied to clipboard!");
  };

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 0
    }).format(amount);
  };

  return (
    <div className="pincode-checker-page">
      {/* Header */}
      <header className="pc-header">
        <div className="pc-header-content">
          <Link to="/" className="pc-logo">
            <img src={logo} alt="ATIRATH Logo" className="pc-logo-img" />
            <span className="pc-logo-text">ATIRATH LOGISTICS</span>
          </Link>
          <nav className="pc-nav">
            <Link to="/">Home</Link>
            <Link to="/tracking">Track</Link>
            <Link to="/booking">Book</Link>
            <Link to="/contact">Contact</Link>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pc-hero">
        <div className="pc-hero-content">
          <h1>Check Delivery Availability</h1>
          <p>Enter your PIN code to instantly check if we deliver to your location</p>
          
          {/* Search Box */}
          <div className="pc-search-container">
            <div className="pc-input-wrapper">
              <span className="pc-input-icon">📍</span>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength="6"
                placeholder="Enter 6-digit PIN code (e.g., 400001)"
                value={pincode}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, "").slice(0, 6);
                  setPincode(value);
                  setError("");
                }}
                onKeyPress={(e) => e.key === "Enter" && checkPincode()}
                className="pc-input"
                aria-label="Enter PIN code"
              />
              {pincode && (
                <button 
                  className="pc-clear-btn" 
                  onClick={handleClear}
                  aria-label="Clear input"
                >
                  ✕
                </button>
              )}
              
              {/* Suggestions Dropdown */}
              {showSuggestions && suggestions.length > 0 && (
                <ul className="pc-suggestions">
                  {suggestions.map((suggestion, idx) => (
                    <li 
                      key={idx}
                      onClick={() => handleSuggestionClick(suggestion)}
                      className="pc-suggestion-item"
                    >
                      <span className="pc-suggestion-pincode">{suggestion}</span>
                      <span className="pc-suggestion-city">
                        {SERVICEABLE_DATA[suggestion]?.city}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            
            <button 
              onClick={() => checkPincode()} 
              className="pc-check-btn"
              disabled={loading || pincode.length !== 6}
            >
              {loading ? (
                <span className="pc-loading">
                  <span className="pc-spinner"></span>
                  Checking...
                </span>
              ) : (
                "Check Availability"
              )}
            </button>
          </div>

          {error && (
            <div className="pc-error animate-shake">
              <span className="pc-error-icon">⚠️</span>
              {error}
            </div>
          )}

          {/* Recent Searches */}
          {recentSearches.length > 0 && !result && (
            <div className="pc-recent">
              <span>Recent:</span>
              {recentSearches.map((item, idx) => (
                <button 
                  key={idx}
                  onClick={() => {
                    setPincode(item.pincode);
                    checkPincode(item.pincode);
                  }}
                  className="pc-recent-item"
                >
                  {item.pincode} <span className="pc-recent-city">({item.city})</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Result Section */}
      {result && (
        <div className="pc-result-container">
          {/* Serviceable Result */}
          {result.serviceable ? (
            <div className="pc-result-card success">
              <div className="pc-result-header">
                <div className="pc-result-icon success">✅</div>
                <div>
                  <h2>Delivery Available!</h2>
                  <p className="pc-result-location">
                    {result.city}, {result.state} - {result.pincode}
                  </p>
                </div>
                <button className="pc-copy-btn" onClick={copyResult}>
                  📋 Copy
                </button>
              </div>

              {/* Delivery Info Grid */}
              <div className="pc-info-grid">
                <div className="pc-info-card">
                  <span className="pc-info-label">⏱️ Delivery Time</span>
                  <span className="pc-info-value">{result.deliveryDays} days</span>
                  <span className="pc-info-sub">Est. {result.estimatedDate}</span>
                </div>
                <div className="pc-info-card">
                  <span className="pc-info-label">💰 Starting Charge</span>
                  <span className="pc-info-value price">{formatCurrency(result.charge)}</span>
                  <span className="pc-info-sub">+ GST & weight charges</span>
                </div>
                <div className="pc-info-card">
                  <span className="pc-info-label">🚚 Service Type</span>
                  <span className="pc-info-value">{result.serviceType}</span>
                  <span className="pc-info-sub">Order before {result.cutoffTime}</span>
                </div>
                <div className="pc-info-card">
                  <span className="pc-info-label">📦 Max Weight</span>
                  <span className="pc-info-value">
                    {result.serviceType === "Express" ? "30 kg" : 
                     result.serviceType === "Standard" ? "50 kg" : "70 kg"}
                  </span>
                  <span className="pc-info-sub">Per package</span>
                </div>
              </div>

              {/* Available Services */}
              <div className="pc-services-section">
                <h3>✨ Available Services</h3>
                <div className="pc-services-list">
                  {result.services.map((service, idx) => (
                    <span key={idx} className="pc-service-tag">
                      {service}
                    </span>
                  ))}
                </div>
              </div>

              {/* Restrictions */}
              <div className="pc-restrictions-section">
                <h3>📋 Important Notes</h3>
                <ul className="pc-restrictions-list">
                  {result.restrictions.map((restriction, idx) => (
                    <li key={idx}>• {restriction}</li>
                  ))}
                </ul>
              </div>

              {/* Action Buttons */}
              <div className="pc-action-buttons">
                <Link to={`/booking?pincode=${result.pincode}`} className="pc-btn primary">
                  🚀 Book Now
                </Link>
                <Link to="/services" className="pc-btn secondary">
                  📦 View All Services
                </Link>
                <button className="pc-btn outline" onClick={() => window.print()}>
                  🖨️ Print Details
                </button>
              </div>
            </div>
          ) : (
            /* Not Serviceable Result */
            <div className="pc-result-card error">
              <div className="pc-result-header">
                <div className="pc-result-icon error">❌</div>
                <div>
                  <h2>Currently Not Available</h2>
                  <p className="pc-result-location">PIN: {result.pincode}</p>
                </div>
              </div>

              <p className="pc-not-available-msg">
                {result.message}. We're expanding daily!
              </p>

              {/* Nearby Alternatives */}
              {result.alternatives?.length > 0 && (
                <div className="pc-alternatives">
                  <h3>📍 Nearby Serviceable Areas</h3>
                  <div className="pc-alternatives-list">
                    {result.alternatives.map((alt, idx) => (
                      <div key={idx} className="pc-alternative-item">
                        <span className="pc-alt-pincode">{alt.pincode}</span>
                        <span className="pc-alt-city">{alt.city}</span>
                        <span className="pc-alt-delivery">{alt.deliveryDays} days</span>
                        <button 
                          className="pc-alt-btn"
                          onClick={() => {
                            setPincode(alt.pincode);
                            checkPincode(alt.pincode);
                          }}
                        >
                          Check
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Notify Me Option */}
              <div className="pc-notify-section">
                <h3>🔔 Get Notified When We Launch</h3>
                <p>Enter your email to receive updates when service starts in your area</p>
                <div className="pc-notify-form">
                  <input 
                    type="email" 
                    placeholder="your@email.com" 
                    className="pc-notify-input"
                  />
                  <button className="pc-notify-btn">Notify Me</button>
                </div>
              </div>

              {/* Contact Support */}
              <div className="pc-support-section">
                <p>Need urgent delivery? Contact our team:</p>
                <div className="pc-support-buttons">
                  <a href="tel:18001234567" className="pc-support-btn">
                    📞 1800-123-4567
                  </a>
                  <Link to="/contact" className="pc-support-btn secondary">
                    💬 Chat Support
                  </Link>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Features Section */}
      {!result && !loading && (
        <section className="pc-features">
          <h2>Why Choose Atirath Logistics?</h2>
          <div className="pc-features-grid">
            <div className="pc-feature-card">
              <div className="pc-feature-icon">🗺️</div>
              <h3>10,000+ PIN Codes</h3>
              <p>Serviceable across major cities and towns in India</p>
            </div>
            <div className="pc-feature-card">
              <div className="pc-feature-icon">⚡</div>
              <h3>Same-Day Delivery</h3>
              <p>Express options available in metro cities</p>
            </div>
            <div className="pc-feature-card">
              <div className="pc-feature-icon">💰</div>
              <h3>Transparent Pricing</h3>
              <p>No hidden charges. Know the cost before you book</p>
            </div>
            <div className="pc-feature-card">
              <div className="pc-feature-icon">🛡️</div>
              <h3>100% Secure</h3>
              <p>Insured shipments with real-time tracking</p>
            </div>
          </div>
        </section>
      )}

      {/* Service Coverage Map Placeholder */}
      <section className="pc-coverage">
        <div className="pc-coverage-content">
          <h2>Our Service Coverage</h2>
          <p>Currently serving 28 states and 500+ cities across India</p>
          <div className="pc-coverage-stats">
            <div className="pc-stat">
              <span className="pc-stat-number">28</span>
              <span className="pc-stat-label">States</span>
            </div>
            <div className="pc-stat">
              <span className="pc-stat-number">500+</span>
              <span className="pc-stat-label">Cities</span>
            </div>
            <div className="pc-stat">
              <span className="pc-stat-number">10K+</span>
              <span className="pc-stat-label">PIN Codes</span>
            </div>
            <div className="pc-stat">
              <span className="pc-stat-number">24/7</span>
              <span className="pc-stat-label">Support</span>
            </div>
          </div>
          <Link to="/services" className="pc-coverage-link">
            View Full Coverage Map →
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="pc-footer">
        <p>© 2026 ATIRATH Logistics. All rights reserved.</p>
        <div className="pc-footer-links">
          <Link to="/privacy">Privacy Policy</Link>
          <Link to="/terms">Terms of Service</Link>
          <Link to="/faq">FAQ</Link>
          <Link to="/contact">Contact Us</Link>
        </div>
      </footer>
    </div>
  );
}