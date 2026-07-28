import { useState, useEffect } from "react";
import { collection, query, orderBy, getDocs, Timestamp, updateDoc, doc, writeBatch } from "firebase/firestore";
import { db } from "../firebase";
import "./Notifications.css";

export default function Notifications() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        setLoading(true);
        const q = query(collection(db, "notifications"), orderBy("createdAt", "desc"));
        const querySnapshot = await getDocs(q);
        
        const allNotifications = querySnapshot.docs.map(docSnap => {
          const data = docSnap.data();
          return {
            id: docSnap.id,
            ...data,
            createdAt: data.createdAt instanceof Timestamp 
              ? data.createdAt.toDate() 
              : new Date(),
            time: getRelativeTime(data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date())
          };
        });

        setNotifications(allNotifications);
      } catch (error) {
        console.error("Error fetching notifications:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchNotifications();
  }, []);

  const getRelativeTime = (date) => {
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);
    
    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)} days ago`;
    return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  };

  const filteredNotifications = notifications.filter(notif => {
    if (filter === "all") return true;
    if (filter === "unread") return !notif.read;
    return notif.type === filter;
  });

  const groupedNotifications = filteredNotifications.reduce((acc, notif) => {
    const dateObj = notif.createdAt;
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    let dateLabel = "Earlier";
    if (dateObj.toDateString() === today.toDateString()) dateLabel = "Today";
    else if (dateObj.toDateString() === yesterday.toDateString()) dateLabel = "Yesterday";
    else dateLabel = dateObj.toLocaleDateString('en-IN', { day: 'numeric', month: 'long' });

    if (!acc[dateLabel]) acc[dateLabel] = [];
    acc[dateLabel].push(notif);
    return acc;
  }, {});

  const unreadCount = notifications.filter(n => !n.read).length;

  const markAsRead = async (id) => {
    try {
      await updateDoc(doc(db, "notifications", id), { read: true });
      setNotifications(prev => 
        prev.map(notif => notif.id === id ? { ...notif, read: true } : notif)
      );
    } catch (error) {
      console.error("Error marking as read:", error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const batch = writeBatch(db);
      const unreadIds = notifications.filter(n => !n.read).map(n => n.id);
      
      unreadIds.forEach(id => {
        const ref = doc(db, "notifications", id);
        batch.update(ref, { read: true });
      });
      
      await batch.commit();
      setNotifications(prev => prev.map(notif => ({ ...notif, read: true })));
    } catch (error) {
      console.error("Error marking all as read:", error);
    }
  };

  const handleAction = (notif) => {
    if (notif.trackingId) {
      window.location.href = `/tracking/${notif.trackingId}`;
    } else if (notif.action === "Pay Now") {
      window.location.href = `/invoices`;
    }
    markAsRead(notif.id);
  };

  const getIcon = (type) => {
    const icons = {
      delivery: "✅", transit: "🚚", payment: "💰", alert: "⚠️",
      pickup: "📦", "out-for-delivery": "🛵", delay: "⏰", customs: "🛃"
    };
    return icons[type] || "🔔";
  };

  const getColor = (type) => {
    const colors = {
      delivery: "#10b981", transit: "#3b82f6", payment: "#f97316", alert: "#ef4444",
      pickup: "#8b5cf6", "out-for-delivery": "#06b6d4", delay: "#f59e0b", customs: "#ec4899"
    };
    return colors[type] || "#64748b";
  };

  if (loading) {
    return (
      <div className="notifications-page">
        <div className="loading-screen">
          <div className="spinner"></div>
          <p>Loading notifications...</p>
        </div>
      </div>
    );
  }

  // ❌ REMOVED: .top-navbar, .green-sidebar
  return (
    <div className="notifications-page">
      {/* Page Header */}
      <div className="page-header">
        <div className="header-info">
          <h1>🔔 Notifications</h1>
          <p>Stay updated with your shipment activities and alerts</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="summary-cards">
        <div className="summary-card">
          <div className="summary-icon-wrapper green">
            <div className="summary-icon">🔔</div>
          </div>
          <div className="summary-details">
            <div className="summary-label">Total Notifications</div>
            <div className="summary-value">{notifications.length}</div>
            <div className="summary-subtitle">All notifications</div>
          </div>
        </div>

        <div className="summary-card">
          <div className="summary-icon-wrapper orange">
            <div className="summary-icon">✉️</div>
          </div>
          <div className="summary-details">
            <div className="summary-label">Unread Notifications</div>
            <div className="summary-value">{unreadCount}</div>
            <div className="summary-subtitle">Require your attention</div>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="filter-tabs-container">
        <div className="filter-tabs">
          <button 
            className={`filter-tab ${filter === "all" ? "active" : ""}`} 
            onClick={() => setFilter("all")}
          >
            All ({notifications.length})
          </button>
          <button 
            className={`filter-tab ${filter === "unread" ? "active" : ""}`} 
            onClick={() => setFilter("unread")}
          >
            Unread ({unreadCount})
          </button>
          <button 
            className={`filter-tab ${filter === "delivery" ? "active" : ""}`} 
            onClick={() => setFilter("delivery")}
          >
            Deliveries
          </button>
          <button 
            className={`filter-tab ${filter === "transit" ? "active" : ""}`} 
            onClick={() => setFilter("transit")}
          >
            Transit
          </button>
          <button 
            className={`filter-tab ${filter === "payment" ? "active" : ""}`} 
            onClick={() => setFilter("payment")}
          >
            Payments
          </button>
          <button 
            className={`filter-tab ${filter === "alert" ? "active" : ""}`} 
            onClick={() => setFilter("alert")}
          >
            Alerts
          </button>
          <button 
            className={`filter-tab ${filter === "pickup" ? "active" : ""}`} 
            onClick={() => setFilter("pickup")}
          >
            Pickups
          </button>
          <button 
            className={`filter-tab ${filter === "customs" ? "active" : ""}`} 
            onClick={() => setFilter("customs")}
          >
            Customs
          </button>
        </div>
        
        {unreadCount > 0 && (
          <button className="mark-all-read-btn" onClick={markAllAsRead}>
            ✓ Mark All as Read
          </button>
        )}
      </div>

      {/* Notifications List */}
      <div className="notifications-list-container">
        {filteredNotifications.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🔕</div>
            <h3>No Notifications</h3>
            <p>You're all caught up! Check back later for updates.</p>
          </div>
        ) : (
          Object.entries(groupedNotifications).map(([date, notifs]) => (
            <div key={date} className="notification-group">
              <div className="group-header">
                <span className="group-label">{date}</span>
                <span className="group-count">{notifs.length} notifications</span>
              </div>
              
              <div className="notifications-list">
                {notifs.map((notif) => (
                  <div 
                    key={notif.id} 
                    className={`notification-item ${notif.read ? "read" : "unread"}`}
                    onClick={() => !notif.read && markAsRead(notif.id)}
                  >
                    <div 
                      className="notif-icon"
                      style={{ background: `${getColor(notif.type)}15`, color: getColor(notif.type) }}
                    >
                      {getIcon(notif.type)}
                    </div>
                    
                    <div className="notif-content">
                      <div className="notif-header">
                        <h3>{notif.title}</h3>
                        <span className="notif-time">{notif.time}</span>
                      </div>
                      
                      <p className="notif-message">{notif.message}</p>
                      
                      <div className="notif-footer">
                        <span className="notif-tracking">
                          {notif.trackingId || notif.invoiceId || 'N/A'}
                        </span>
                        <button 
                          className="notif-action-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAction(notif);
                          }}
                          style={{
                            borderColor: getColor(notif.type),
                            color: getColor(notif.type)
                          }}
                        >
                          {notif.action === "Pay Now" ? "Pay Now" : 
                           notif.action === "Track Now" ? "Track Now" : "View Details"} →
                        </button>
                      </div>
                    </div>
                    
                    {!notif.read && <div className="unread-dot"></div>}
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}