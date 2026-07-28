// =========================================
// ATIRATH LOGISTICS - REAL-TIME TRACKING (SWIGGY/ZOMATO STYLE)
// =========================================

import { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import { doc, onSnapshot, collection, query, where, getDocs, Timestamp } from "firebase/firestore";
import { db } from "../firebase"; 
import Layout from "../components/Layout";
import { useAuth } from "../context/AuthContext";
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "./Tracking.css";

import trackingHero from "../assets/tracking-hero.jpg";  

// ✅ Fix Leaflet default marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

// ✅ Custom icons for pickup, delivery, driver
const pickupIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png",
  iconSize: [25, 41], iconAnchor: [12, 41]
});

const deliveryIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png",
  iconSize: [25, 41], iconAnchor: [12, 41]
});

const driverIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-blue.png",
  iconSize: [30, 50], iconAnchor: [15, 50]
});

// ✅ Map auto-center component
function MapUpdater({ center }) {
  const map = useMap();
  useEffect(() => {
    if (center) map.setView(center, 14);
  }, [center, map]);
  return null;
}

export default function Tracking() {
  const { trackingId: urlTrackingId } = useParams();
  const { currentUser } = useAuth();
  const [trackingId, setTrackingId] = useState(urlTrackingId || "");
  const [result, setResult] = useState(null);
  const [shipmentId, setShipmentId] = useState(null); // ✅ For real-time listener
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [recentTrackings, setRecentTrackings] = useState([]);
  const [activeTab, setActiveTab] = useState("overview");
  const [countdown, setCountdown] = useState({});
  const [liveLocation, setLiveLocation] = useState(null); // ✅ Real-time driver location
  const [isListening, setIsListening] = useState(false);
  const unsubscribeRef = useRef(null);
  
  // Modal States
  const [showProofModal, setShowProofModal] = useState(false);
  const [deliveryProof, setDeliveryProof] = useState(null);
  const [showDriverModal, setShowDriverModal] = useState(false);

  // ✅ Load recent trackings
  useEffect(() => {
    const saved = localStorage.getItem("recentTrackings");
    if (saved) { 
      try { setRecentTrackings(JSON.parse(saved)); } catch (e) { console.error(e); } 
    }
  }, []);

  // ✅ Auto-track if ID in URL
  useEffect(() => {
    if (urlTrackingId) { 
      setTrackingId(urlTrackingId.toUpperCase()); 
      handleTrack(urlTrackingId.toUpperCase()); 
    }
  }, [urlTrackingId]);

  // ✅ REAL-TIME LISTENER - Swiggy/Zomato style!
  useEffect(() => {
    if (!shipmentId) return;

    console.log("🔴 Starting real-time listener for shipment:", shipmentId);

    // Cleanup previous listener
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
    }

    // ✅ Listen to shipment document in real-time
    const shipmentDocRef = doc(db, "shipments", shipmentId);
    
    unsubscribeRef.current = onSnapshot(
      shipmentDocRef,
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          console.log("🔄 Real-time update received:", data);

          // ✅ Update live location if driver location exists
          if (data.driverLocation) {
            setLiveLocation({
              lat: data.driverLocation.lat,
              lng: data.driverLocation.lng,
              lastUpdate: data.driverLocation.updatedAt || new Date(),
              speed: data.driverLocation.speed || 0
            });
          }

          // ✅ Transform data for UI
          const shipmentData = {
            trackingNumber: data.trackingId || docSnap.id,
            status: data.status || "Label Created",
            estimatedDelivery: data.dropDate || data.deliveryDate || data.createdAt || new Date(),
            serviceType: data.serviceType || "Standard Delivery",
            weight: data.weight || 0,
            sender: {
              name: data.senderName || "Sender",
              address: data.senderAddress || "",
              city: data.pickupCity || "Unknown",
              state: data.senderState || "India",
              pincode: data.senderPincode || "",
              contact: data.senderPhone || "",
              location: data.pickupLocation || null
            },
            receiver: {
              name: data.receiverName || "Receiver",
              address: data.receiverAddress || "",
              city: data.dropCity || "Unknown",
              state: data.receiverState || "India",
              pincode: data.receiverPincode || "",
              contact: data.receiverPhone || "",
              location: data.dropLocation || null
            },
            driver: data.driver || null, // ✅ Driver details
            driverLocation: data.driverLocation || null,
            history: data.trackingHistory || [{
              status: data.status,
              timestamp: data.updatedAt || data.createdAt,
              location: data.pickupCity,
              description: `Shipment is ${data.status}`
            }],
            deliveryInstructions: data.specialInstructions || ""
          };

          setResult(shipmentData);
          setIsListening(true);
        }
      },
      (err) => {
        console.error("❌ Real-time listener error:", err);
        setError("Lost connection. Retrying...");
      }
    );

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
    };
  }, [shipmentId]);

  // ✅ Countdown Timer
  useEffect(() => {
    if (result?.estimatedDelivery && result.status !== "Delivered") {
      const timer = setInterval(() => {
        const now = new Date().getTime();
        const deliveryTime = result.estimatedDelivery instanceof Timestamp 
          ? result.estimatedDelivery.toDate().getTime() 
          : new Date(result.estimatedDelivery).getTime();
        const distance = deliveryTime - now;
        
        if (distance > 0) {
          setCountdown({
            days: Math.floor(distance / (1000 * 60 * 60 * 24)),
            hours: Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
            minutes: Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60)),
            seconds: Math.floor((distance % (1000 * 60)) / 1000)
          });
        } else { 
          setCountdown({ days: 0, hours: 0, minutes: 0, seconds: 0 }); 
        }
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [result]);

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: "smooth" });

  // ✅ INITIAL TRACK - Find shipment & start real-time listener
  const handleTrack = async (id = trackingId) => {
    if (!currentUser) {
      setError("Please login to track shipments");
      return;
    }

    if (!id.trim()) { 
      setError("Please enter a tracking number"); 
      return; 
    }
    
    const cleanId = id.trim().toUpperCase();
    
    if (!cleanId.startsWith("ATL-")) { 
      setError("Invalid format. Tracking ID must start with ATL-"); 
      return; 
    }

    setLoading(true); 
    setError(""); 
    setResult(null);
    setShipmentId(null);

    try {
      console.log("🔍 Searching for:", cleanId);
      
      const q = query(
        collection(db, "shipments"), 
        where("trackingId", "==", cleanId),
        where("userId", "==", currentUser.uid)
      );
      
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        setError(`No shipment found with ID: ${cleanId}`);
        setLoading(false);
        return;
      }

      const docSnap = querySnapshot.docs[0];
      const data = docSnap.data();
      
      // ✅ Set shipment ID to start real-time listener
      setShipmentId(docSnap.id);

      // ✅ Initial data load
      const shipmentData = {
        trackingNumber: data.trackingId || docSnap.id,
        status: data.status || "Label Created",
        estimatedDelivery: data.dropDate || data.deliveryDate || data.createdAt || new Date(),
        serviceType: data.serviceType || "Standard Delivery",
        weight: data.weight || 0,
        sender: {
          name: data.senderName || "Sender",
          city: data.pickupCity || "Unknown",
          state: data.senderState || "India",
          pincode: data.senderPincode || "",
          location: data.pickupLocation || null
        },
        receiver: {
          name: data.receiverName || "Receiver",
          city: data.dropCity || "Unknown",
          state: data.receiverState || "India",
          pincode: data.receiverPincode || "",
          location: data.dropLocation || null
        },
        driver: data.driver || null,
        driverLocation: data.driverLocation || null,
        history: data.trackingHistory || [{
          status: data.status,
          timestamp: data.updatedAt || data.createdAt,
          location: data.pickupCity,
          description: `Shipment is ${data.status}`
        }],
        deliveryInstructions: data.specialInstructions || ""
      };

      setResult(shipmentData);
      
      if (data.driverLocation) {
        setLiveLocation({
          lat: data.driverLocation.lat,
          lng: data.driverLocation.lng,
          lastUpdate: data.driverLocation.updatedAt
        });
      }

      saveToRecent(shipmentData);
      
    } catch (err) {
      console.error("❌ Error:", err);
      setError(`Failed to fetch: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const saveToRecent = (data) => {
    const newRecent = [
      { id: data.trackingNumber, status: data.status, date: new Date().toISOString(), destination: data.receiver.city },
      ...recentTrackings.filter(r => r.id !== data.trackingNumber)
    ].slice(0, 5);
    setRecentTrackings(newRecent);
    localStorage.setItem("recentTrackings", JSON.stringify(newRecent));
  };

  const getStatusStep = (status) => ({ 
    "Label Created": 1, "Picked Up": 2, "In Transit": 3, 
    "Out for Delivery": 4, "Delivered": 5 
  }[status] || 0);
  
  const currentStep = result ? getStatusStep(result.status) : 0;
  
  const getStatusIcon = (status) => ({ 
    "Label Created": "📋", "Picked Up": "📦", "In Transit": "🚚", 
    "Out for Delivery": "🏃", "Delivered": "✅" 
  }[status] || "📦");
  
  const getStatusColor = (status) => ({ 
    "Label Created": "#64748b", "Picked Up": "#3b82f6", "In Transit": "#f59e0b", 
    "Out for Delivery": "#10b981", "Delivered": "#22c55e" 
  }[status] || "#64748b");
  
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      const d = dateString instanceof Timestamp ? dateString.toDate() : new Date(dateString);
      return d.toLocaleString("en-IN", { 
        day: "2-digit", month: "short", year: "numeric", 
        hour: "2-digit", minute: "2-digit", hour12: true 
      });
    } catch (e) { return 'Invalid Date'; }
  };

  const copyToClipboard = (text) => { 
    navigator.clipboard.writeText(text); 
    showToast("Tracking ID Copied!"); 
  };
  
  const showToast = (message) => { 
    const toast = document.createElement("div"); 
    toast.className = "toast-notification"; 
    toast.textContent = message; 
    document.body.appendChild(toast); 
    setTimeout(() => toast.remove(), 3000); 
  };

  const clearTracking = () => { 
    if (unsubscribeRef.current) unsubscribeRef.current();
    setResult(null); 
    setShipmentId(null);
    setTrackingId(""); 
    setError(""); 
    setLiveLocation(null);
    setIsListening(false);
    setActiveTab("overview"); 
    scrollToTop(); 
  };

  // ✅ Calculate distance between driver and destination
  const calculateDistance = () => {
    if (!liveLocation || !result?.receiver?.location) return null;
    const R = 6371; // Earth radius in km
    const dLat = (result.receiver.location.lat - liveLocation.lat) * Math.PI / 180;
    const dLon = (result.receiver.location.lng - liveLocation.lng) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(liveLocation.lat * Math.PI / 180) * Math.cos(result.receiver.location.lat * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return (R * c).toFixed(1);
  };

  // ✅ Map center - prioritize driver location
  const getMapCenter = () => {
    if (liveLocation) return [liveLocation.lat, liveLocation.lng];
    if (result?.sender?.location) return [result.sender.location.lat, result.sender.location.lng];
    return [20.5937, 78.9629]; // India center
  };

  return (
    <Layout>
      <section className="tracking-hero">
        <div className="hero-bg-tracking" style={{ backgroundImage: `url(${trackingHero})` }} />
        <div className="hero-gradient-overlay-tracking" />
        <div className="hero-content">
          <h1>Track Your Shipment</h1>
          <p>Real-time tracking updates for your packages across India</p>
          <div className="tracking-input-container">
            <input 
              type="text" 
              placeholder="Enter Tracking Number (e.g., ATL-1234567890)" 
              value={trackingId} 
              onChange={(e) => setTrackingId(e.target.value.toUpperCase())} 
              onKeyPress={(e) => e.key === "Enter" && handleTrack()} 
              className="tracking-input" 
              maxLength="20" 
            />
            <button onClick={() => handleTrack()} className="track-btn" disabled={loading}>
              {loading ? "Tracking..." : "🔍 Track"}
            </button>
          </div>
          {error && (
            <div className="error-message animate-shake">
              <span>⚠️</span> {error}
              <button onClick={() => setError("")}>×</button>
            </div>
          )}
          {recentTrackings.length > 0 && (
            <div className="quick-links">
              <span>🕐 Recent:</span>
              {recentTrackings.map((item, idx) => (
                <button key={idx} onClick={() => { setTrackingId(item.id); handleTrack(item.id); }} className="recent-link">
                  {item.id}
                </button>
              ))}
            </div>
          )}
        </div>
      </section>

      {result && (
        <div className="tracking-result">
          
          {/* ✅ LIVE STATUS BANNER - Swiggy Style */}
          {isListening && (
            <div className="live-status-banner">
              <div className="live-dot"></div>
              <span>LIVE TRACKING ACTIVE</span>
              {liveLocation && <span>• Updated {formatDate(liveLocation.lastUpdate)}</span>}
            </div>
          )}

          {/* ✅ COUNTDOWN */}
          {result.status !== "Delivered" && (
            <div className="countdown-banner">
              <h3>⏰ Estimated Delivery In:</h3>
              <div className="countdown-timer">
                {["days", "hours", "minutes", "seconds"].map((unit) => (
                  <div key={unit} className="countdown-item">
                    <span className="countdown-value">{String(countdown[unit] || 0).padStart(2, '0')}</span>
                    <span className="countdown-label">{unit}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ✅ LIVE MAP - Swiggy/Zomato Style */}
          {(currentStep >= 2) && (
            <div className="live-map-card">
              <div className="map-header">
                <h3>🗺️ Live Tracking Map</h3>
                {liveLocation && (
                  <span className="distance-badge">
                    📍 {calculateDistance() || '?'} km away
                  </span>
                )}
              </div>
              <div className="map-container">
                <MapContainer 
                  center={getMapCenter()} 
                  zoom={13} 
                  style={{ height: '400px', width: '100%', borderRadius: '12px' }}
                >
                  <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution='© OpenStreetMap'
                  />
                  <MapUpdater center={getMapCenter()} />
                  
                  {/* Pickup Marker */}
                  {result.sender?.location && (
                    <Marker position={[result.sender.location.lat, result.sender.location.lng]} icon={pickupIcon}>
                      <Popup><strong>Pickup:</strong> {result.sender.city}</Popup>
                    </Marker>
                  )}
                  
                  {/* Delivery Marker */}
                  {result.receiver?.location && (
                    <Marker position={[result.receiver.location.lat, result.receiver.location.lng]} icon={deliveryIcon}>
                      <Popup><strong>Delivery:</strong> {result.receiver.city}</Popup>
                    </Marker>
                  )}
                  
                  {/* Driver Live Marker */}
                  {liveLocation && (
                    <Marker position={[liveLocation.lat, liveLocation.lng]} icon={driverIcon}>
                      <Popup>
                        <strong>🚚 Driver Location</strong><br/>
                        {result.driver?.name && `Driver: ${result.driver.name}`}<br/>
                        {result.driver?.vehicle && `Vehicle: ${result.driver.vehicle}`}<br/>
                        Last updated: {formatDate(liveLocation.lastUpdate)}
                      </Popup>
                    </Marker>
                  )}

                  {/* Route Line */}
                  {result.sender?.location && result.receiver?.location && (
                    <Polyline
                      positions={[
                        [result.sender.location.lat, result.sender.location.lng],
                        [result.receiver.location.lat, result.receiver.location.lng]
                      ]}
                      color="#f97316"
                      weight={3}
                      dashArray="10, 10"
                    />
                  )}
                </MapContainer>
              </div>
            </div>
          )}

          {/* ✅ DRIVER INFO CARD - Swiggy/Zomato/Rapido Style */}
          {result.driver && currentStep >= 2 && (
            <div className="driver-card">
              <div className="driver-header">
                <div className="driver-avatar">
                  {result.driver.photo ? (
                    <img src={result.driver.photo} alt={result.driver.name} />
                  ) : (
                    <div className="driver-avatar-placeholder">
                      {result.driver.name?.charAt(0).toUpperCase() || 'D'}
                    </div>
                  )}
                </div>
                <div className="driver-info">
                  <h3>{result.driver.name || 'Delivery Partner'}</h3>
                  <p className="driver-rating">⭐ {result.driver.rating || '4.8'} • {result.driver.deliveries || '500+'} deliveries</p>
                  <p className="driver-vehicle">🚚 {result.driver.vehicle || 'Vehicle'} • {result.driver.vehicleNumber || ''}</p>
                </div>
              </div>
              <div className="driver-actions">
                <a href={`tel:${result.driver.phone}`} className="driver-action-btn call">
                  📞 Call Driver
                </a>
                <button 
                  className="driver-action-btn location"
                  onClick={() => setShowDriverModal(true)}
                >
                  📍 View Location
                </button>
              </div>
              {liveLocation && (
                <div className="driver-live-status">
                  <div className="live-dot"></div>
                  <span>Live • {calculateDistance() || '?'} km from destination</span>
                </div>
              )}
            </div>
          )}

          {/* ✅ NO DRIVER ASSIGNED YET */}
          {!result.driver && currentStep >= 2 && currentStep < 5 && (
            <div className="driver-card pending">
              <div className="driver-header">
                <div className="driver-avatar">
                  <div className="driver-avatar-placeholder">⏳</div>
                </div>
                <div className="driver-info">
                  <h3>Finding Delivery Partner...</h3>
                  <p className="driver-rating">We're assigning a driver to your shipment</p>
                </div>
              </div>
            </div>
          )}

          {/* Status Badge */}
          <div className="status-badge-container">
            <span className="status-badge" style={{ background: getStatusColor(result.status) }}>
              {getStatusIcon(result.status)} {result.status}
            </span>
            <span className="service-type-badge">{result.serviceType}</span>
          </div>

          {/* Tabs */}
          <div className="tracking-tabs">
            {["overview", "details", "actions"].map((tab) => (
              <button key={tab} className={`tab ${activeTab === tab ? "active" : ""}`} onClick={() => setActiveTab(tab)}>
                {tab === "overview" ? "📊 Overview" : tab === "details" ? "📋 Details" : "⚡ Actions"}
              </button>
            ))}
          </div>

          {activeTab === "overview" && (
            <>
              <div className="status-overview">
                <div className="progress-container">
                  <div className="progress-steps">
                    {["Label Created", "Picked Up", "In Transit", "Out for Delivery", "Delivered"].map((step, idx) => (
                      <div key={step} className={`step ${idx + 1 <= currentStep ? "completed" : ""} ${idx + 1 === currentStep ? "active" : ""}`}>
                        <div className="step-icon">{getStatusIcon(step)}</div>
                        <div className="step-label">{step}</div>
                      </div>
                    ))}
                  </div>
                  <div className="progress-bar">
                    <div className="progress-fill" style={{ width: `${(currentStep / 5) * 100}%`, background: getStatusColor(result.status) }}></div>
                  </div>
                </div>
              </div>

              <div className="route-card">
                <h3>📍 Shipment Route</h3>
                <div className="location from">
                  <div className="location-icon">🏢</div>
                  <div>
                    <div className="location-label">From</div>
                    <div className="location-address">
                      <strong>{result.sender.name}</strong><br />
                      {result.sender.city}, {result.sender.state} {result.sender.pincode}
                    </div>
                  </div>
                </div>
                <div className="route-arrow">⬇️</div>
                <div className="location to">
                  <div className="location-icon">🏠</div>
                  <div>
                    <div className="location-label">To</div>
                    <div className="location-address">
                      <strong>{result.receiver.name}</strong><br />
                      {result.receiver.city}, {result.receiver.state} {result.receiver.pincode}
                    </div>
                  </div>
                </div>
              </div>

              <div className="detail-card full-width">
                <h3>📜 Tracking History</h3>
                <div className="timeline">
                  {result.history.map((event, idx) => (
                    <div key={idx} className="timeline-item">
                      <div className="timeline-icon" style={{ background: getStatusColor(event.status) }}>
                        {getStatusIcon(event.status)}
                      </div>
                      <div className="timeline-content">
                        <div className="timeline-header">
                          <span className="timeline-status">{event.status}</span>
                          <span className="timeline-date">{formatDate(event.timestamp)}</span>
                        </div>
                        <div className="timeline-location">📍 {event.location}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {activeTab === "details" && (
            <div className="tracking-details-grid">
              <div className="detail-card">
                <h3>📦 Shipment Information</h3>
                <div className="info-grid">
                  <div className="info-item"><span className="label">Tracking:</span><span className="value">{result.trackingNumber}</span></div>
                  <div className="info-item"><span className="label">Service:</span><span className="value">{result.serviceType}</span></div>
                  <div className="info-item"><span className="label">Weight:</span><span className="value">{result.weight} kg</span></div>
                  <div className="info-item"><span className="label">From:</span><span className="value">{result.sender.city}</span></div>
                  <div className="info-item"><span className="label">To:</span><span className="value">{result.receiver.city}</span></div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "actions" && (
            <div className="tracking-details-grid">
              <div className="detail-card full-width">
                <h3>⚡ Quick Actions</h3>
                <div className="action-buttons">
                  <button className="action-btn primary" onClick={() => copyToClipboard(result.trackingNumber)}>📋 Copy Tracking ID</button>
                  <button className="action-btn primary" onClick={() => window.print()}>📄 Print Details</button>
                </div>
              </div>
            </div>
          )}

          <div className="clear-tracking-container">
            <button className="clear-tracking-btn" onClick={clearTracking}>🔍 Track Another Package</button>
          </div>
        </div>
      )}

      {/* Driver Location Modal */}
      {showDriverModal && liveLocation && (
        <div className="modal-overlay" onClick={() => setShowDriverModal(false)}>
          <div className="modal-content modal-large" onClick={e => e.stopPropagation()}>
            <h3>📍 Driver's Live Location</h3>
            <MapContainer 
              center={[liveLocation.lat, liveLocation.lng]} 
              zoom={15} 
              style={{ height: '400px', width: '100%', borderRadius: '12px', marginTop: '16px' }}
            >
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              <Marker position={[liveLocation.lat, liveLocation.lng]} icon={driverIcon}>
                <Popup>
                  <strong>{result.driver?.name}</strong><br/>
                  🚚 {result.driver?.vehicle}<br/>
                  Last updated: {formatDate(liveLocation.lastUpdate)}
                </Popup>
              </Marker>
            </MapContainer>
            <button className="btn-primary" onClick={() => setShowDriverModal(false)} style={{ width: '100%', marginTop: '16px' }}>Close</button>
          </div>
        </div>
      )}

      {!result && !loading && (
        <section className="tracking-features">
          <h2>Why Track With ATIRATH?</h2>
          <div className="features-grid">
            <div className="feature-card"><div className="feature-icon">📍</div><h3>Real-Time GPS</h3><p>Live location updates for your shipments</p></div>
            <div className="feature-card"><div className="feature-icon">🔔</div><h3>Instant Alerts</h3><p>SMS and email alerts at every milestone</p></div>
            <div className="feature-card"><div className="feature-icon">🛡️</div><h3>Secure & Insured</h3><p>Full insurance coverage and proof of delivery</p></div>
          </div>
        </section>
      )}
    </Layout>
  );
}