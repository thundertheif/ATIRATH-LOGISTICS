import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { collection, query, getDocs, where, Timestamp } from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";
import "./MyShipments.css";

export default function MyShipments() {
  const { currentUser, loading: authLoading } = useAuth();
  
  const [shipments, setShipments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // ✅ NEW: Safe date formatter - handles string, Date, Firestore Timestamp
  const formatDate = (dateValue, includeTime = false) => {
    if (!dateValue) return "N/A";
    
    let dateObj = null;
    
    // Case 1: Firestore Timestamp
    if (dateValue && typeof dateValue === 'object' && dateValue.toDate) {
      dateObj = dateValue.toDate();
    }
    // Case 2: Already a Date object
    else if (dateValue instanceof Date) {
      dateObj = dateValue;
    }
    // Case 3: String (ISO format or formatted)
    else if (typeof dateValue === 'string') {
      // If it's already a formatted string like "Mon, Jul 15", return as-is
      if (dateValue.match(/[A-Za-z]{3},/)) {
        return dateValue;
      }
      // Try to parse as date
      const parsed = new Date(dateValue);
      if (!isNaN(parsed.getTime())) {
        dateObj = parsed;
      } else {
        return dateValue; // Return original string if can't parse
      }
    }
    // Case 4: Number (timestamp)
    else if (typeof dateValue === 'number') {
      dateObj = new Date(dateValue);
    }
    
    if (!dateObj || isNaN(dateObj.getTime())) return "N/A";
    
    if (includeTime) {
      return dateObj.toLocaleDateString("en-IN", {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    }
    
    return dateObj.toLocaleDateString("en-IN", {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  // ✅ NEW: Safe delivery date formatter
  const formatDeliveryDate = (delivery) => {
    if (!delivery) return "N/A";
    
    // If it's already a formatted string (from new BookShipment)
    if (typeof delivery === 'string') {
      // Check if it's a formatted date string like "Mon, Jul 15"
      if (delivery.match(/[A-Za-z]{3},/)) {
        return delivery;
      }
      // Try to parse as date
      const parsed = new Date(delivery);
      if (!isNaN(parsed.getTime())) {
        return parsed.toLocaleDateString("en-IN", {
          day: 'numeric',
          month: 'short',
          year: 'numeric'
        });
      }
      return delivery;
    }
    
    // Firestore Timestamp
    if (delivery && typeof delivery === 'object' && delivery.toDate) {
      return delivery.toDate().toLocaleDateString("en-IN", {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      });
    }
    
    // Date object
    if (delivery instanceof Date) {
      return delivery.toLocaleDateString("en-IN", {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      });
    }
    
    return String(delivery);
  };

  useEffect(() => {
    const fetchShipments = async () => {
      if (authLoading || !currentUser?.uid) return;
      
      try {
        setLoading(true);
        const q = query(
          collection(db, "shipments"), 
          where("userId", "==", currentUser.uid)
        );
        const querySnapshot = await getDocs(q);
        
        const allShipments = querySnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            createdAt: data.createdAt instanceof Timestamp 
              ? data.createdAt.toDate() 
              : (data.createdAt?.toDate ? data.createdAt.toDate() : new Date())
          };
        });

        const sortedShipments = allShipments.sort((a, b) => {
          const dateA = a.createdAt || new Date(0);
          const dateB = b.createdAt || new Date(0);
          return dateB - dateA;
        });

        setShipments(sortedShipments);
      } catch (error) {
        console.error("Error fetching shipments:", error);
        setShipments([]);
      } finally {
        setLoading(false);
      }
    };

    fetchShipments();
  }, [currentUser, authLoading]);

  const filteredShipments = shipments.filter(s => {
    const matchesFilter = filter === "all" || s.status?.toLowerCase().replace(/\s+/g, '-') === filter;
    const searchLower = searchQuery.toLowerCase();
    const matchesSearch = 
      (s.trackingId || s.id).toLowerCase().includes(searchLower) || 
      (s.dropCity || '').toLowerCase().includes(searchLower) ||
      (s.pickupCity || '').toLowerCase().includes(searchLower);
    
    return matchesFilter && matchesSearch;
  });

  // Pagination
  const totalPages = Math.ceil(filteredShipments.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentShipments = filteredShipments.slice(startIndex, endIndex);

  const totalShipments = shipments.length;
  const inTransitCount = shipments.filter(s => s.status === "In Transit").length;
  const deliveredCount = shipments.filter(s => s.status === "Delivered").length;
  const outForDeliveryCount = shipments.filter(s => s.status === "Out for Delivery").length;
  const pickedUpCount = shipments.filter(s => s.status === "Picked Up").length;

  const getStatusClass = (status) => {
    return status?.toLowerCase().replace(/\s+/g, '-') || 'default';
  };

  const getStatusColor = (status) => {
    const colors = {
      'in-transit': '#fbbf24',
      'delivered': '#10b981',
      'out-for-delivery': '#3b82f6',
      'picked-up': '#8b5cf6'
    };
    return colors[getStatusClass(status)] || '#6b7280';
  };

  if (authLoading || loading) {
    return (
      <div className="my-shipments-page">
        <div className="loading-screen">
          <div className="spinner"></div>
          <p>Loading your shipments...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="my-shipments-page">
      {/* Page Header */}
      <div className="page-header">
        <div className="header-info">
          <h1>🚚 My Shipments</h1>
          <p>Track and manage all your shipments in one place</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="stats-cards-container">
        <div className="stat-card">
          <div className="stat-icon-wrapper green">
            <div className="stat-icon">📦</div>
          </div>
          <div className="stat-info">
            <div className="stat-number">{totalShipments}</div>
            <div className="stat-label">Total Shipments</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-wrapper orange">
            <div className="stat-icon">🚚</div>
          </div>
          <div className="stat-info">
            <div className="stat-number">{inTransitCount}</div>
            <div className="stat-label">In Transit</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-wrapper blue">
            <div className="stat-icon">📍</div>
          </div>
          <div className="stat-info">
            <div className="stat-number">{outForDeliveryCount}</div>
            <div className="stat-label">Out for Delivery</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-wrapper purple">
            <div className="stat-icon">📋</div>
          </div>
          <div className="stat-info">
            <div className="stat-number">{pickedUpCount}</div>
            <div className="stat-label">Picked Up</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-wrapper success">
            <div className="stat-icon">✅</div>
          </div>
          <div className="stat-info">
            <div className="stat-number">{deliveredCount}</div>
            <div className="stat-label">Delivered</div>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="search-filters-section">
        <div className="search-box">
          <span className="search-icon">🔍</span>
          <input 
            type="text" 
            placeholder="Search by tracking ID, origin, or destination..." 
            value={searchQuery} 
            onChange={(e) => setSearchQuery(e.target.value)} 
            className="search-input"
          />
        </div>
        
        <div className="filter-buttons">
          <button 
            className={`filter-btn ${filter === "all" ? "active" : ""}`} 
            onClick={() => { setFilter("all"); setCurrentPage(1); }}
          >
            All ({totalShipments})
          </button>
          <button 
            className={`filter-btn ${filter === "in-transit" ? "active" : ""}`} 
            onClick={() => { setFilter("in-transit"); setCurrentPage(1); }}
          >
            In Transit ({inTransitCount})
          </button>
          <button 
            className={`filter-btn ${filter === "delivered" ? "active" : ""}`} 
            onClick={() => { setFilter("delivered"); setCurrentPage(1); }}
          >
            Delivered ({deliveredCount})
          </button>
          <button 
            className={`filter-btn ${filter === "out-for-delivery" ? "active" : ""}`} 
            onClick={() => { setFilter("out-for-delivery"); setCurrentPage(1); }}
          >
            Out for Delivery ({outForDeliveryCount})
          </button>
          <button 
            className={`filter-btn ${filter === "picked-up" ? "active" : ""}`} 
            onClick={() => { setFilter("picked-up"); setCurrentPage(1); }}
          >
            Picked Up ({pickedUpCount})
          </button>
        </div>
      </div>

      {/* Shipments Grid */}
      <div className="shipments-grid">
        {currentShipments.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📦</div>
            <h3>No Shipments Found</h3>
            <p>{searchQuery ? "Try adjusting your search criteria" : "Book a shipment to see it here!"}</p>
            {!searchQuery && (
              <Link to="/book-shipment" className="btn-book-new">Book New Shipment</Link>
            )}
          </div>
        ) : (
          currentShipments.map((shipment) => (
            <div key={shipment.id} className="shipment-card">
              <div className="shipment-card-header">
                <div className="tracking-info">
                  <div className="tracking-id">{shipment.trackingId || shipment.id}</div>
                  <div className="shipment-date">
                    {/* ✅ FIXED: Use safe formatDate function */}
                    {formatDate(shipment.createdAt, true)}
                  </div>
                </div>
                <span className={`status-badge status-${getStatusClass(shipment.status)}`} style={{ backgroundColor: `${getStatusColor(shipment.status)}20`, color: getStatusColor(shipment.status) }}>
                  {shipment.status || 'Unknown'}
                </span>
              </div>

              <div className="route-info">
                <div className="route-city-group">
                  <div className="city-name">{shipment.pickupCity || 'N/A'}</div>
                  <div className="state-name">{shipment.pickupState || shipment.pickupCity || ''}</div>
                </div>
                <div className="route-line">
                  <div className="route-dot"></div>
                  <div className="route-truck">🚚</div>
                  <div className="route-dot"></div>
                </div>
                <div className="route-city-group">
                  <div className="city-name">{shipment.dropCity || 'N/A'}</div>
                  <div className="state-name">{shipment.dropState || shipment.dropCity || ''}</div>
                </div>
              </div>

              <div className="shipment-meta">
                <div className="meta-item">
                  <span className="meta-icon">📦</span>
                  <span className="meta-text">{shipment.products?.[0]?.category || shipment.category || 'General'}</span>
                </div>
                <div className="meta-item">
                  <span className="meta-icon">⚖️</span>
                  <span className="meta-text">{shipment.weight || 0} kg</span>
                </div>
                <div className="meta-item">
                  <span className="meta-icon">📅</span>
                  <span className="meta-text">
                    {shipment.status === 'Delivered' 
                      ? `Delivered on: ${formatDate(shipment.deliveredAt)}`
                      : `Est. Delivery: ${formatDeliveryDate(shipment.estimatedDelivery)}`
                    }
                  </span>
                </div>
              </div>

              <Link to={`/tracking/${shipment.trackingId || shipment.id}`} className="view-details-btn">
                View Details →
              </Link>
            </div>
          ))
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="pagination">
          <button 
            className="page-btn" 
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
          >
            ‹
          </button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
            <button
              key={page}
              className={`page-btn ${currentPage === page ? 'active' : ''}`}
              onClick={() => setCurrentPage(page)}
            >
              {page}
            </button>
          ))}
          <button 
            className="page-btn" 
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
          >
            ›
          </button>
          <div className="pagination-info">
            Showing {startIndex + 1} to {Math.min(endIndex, filteredShipments.length)} of {filteredShipments.length} shipments
          </div>
        </div>
      )}
    </div>
  );
}