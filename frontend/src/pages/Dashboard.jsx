import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom'; 
// ❌ REMOVED: import DashboardLayout from "../components/DashboardLayout";
import { useAuth } from "../context/AuthContext";
import { collection, getDocs, query, where, doc, updateDoc, addDoc, serverTimestamp, orderBy, limit } from "firebase/firestore";
import { db } from "../firebase"; 
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import "./Dashboard.css";

// Fix Leaflet default marker icon issue
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

export default function Dashboard() {
  const { currentUser, loading: authLoading } = useAuth();
  
  // States
  const [stats, setStats] = useState([]);
  const [shipments, setShipments] = useState([]);
  const [totalShipmentsCount, setTotalShipmentsCount] = useState(0);
  const [pendingPayments, setPendingPayments] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isVisible, setIsVisible] = useState(false);
  
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('smart-demo');
  const [processingPayment, setProcessingPayment] = useState(false);
  const [paymentMode, setPaymentMode] = useState('test');

  // Enhanced features states
  const [revenueData, setRevenueData] = useState([]);
  const [activeShipments, setActiveShipments] = useState([]);
  const [quickStats, setQuickStats] = useState({
    avgDeliveryTime: 0,
    successRate: 0,
    activeDrivers: 12,
    pendingApprovals: 3
  });
  const [activities, setActivities] = useState([]);
  const [upcomingDeliveries, setUpcomingDeliveries] = useState([]);
  const [ratings, setRatings] = useState({ avg: 0, total: 0 });
  const [showQuickBook, setShowQuickBook] = useState(false);
  const [quickBookData, setQuickBookData] = useState({
    from: '',
    to: '',
    weight: '',
    serviceType: 'Standard'
  });
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([]);

  // Abort controller for cleanup
  const abortControllerRef = useRef(null);

  // Fetch all dashboard data
  useEffect(() => {
    abortControllerRef.current = new AbortController();
    
    const fetchDashboardData = async () => {
      if (authLoading || !currentUser?.uid) return;
      
      try {
        setLoading(true);

        // 1. Stats
        try {
          const statsSnap = await getDocs(collection(db, "dashboard_stats"));
          if (!abortControllerRef.current.signal.aborted) {
            setStats(statsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
          }
        } catch (err) {
          console.error("Stats Error:", err.message);
          if (!abortControllerRef.current.signal.aborted) {
            setStats([]);
          }
        }

        // 2. Shipments
        try {
          const shipQuery = query(
            collection(db, "shipments"), 
            where("userId", "==", currentUser.uid)
          );
          const shipSnap = await getDocs(shipQuery);
          const allShipments = shipSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          
          if (!abortControllerRef.current.signal.aborted) {
            setTotalShipmentsCount(allShipments.length);
          }
          
          const sortedShipments = allShipments.sort((a, b) => {
            const dateA = a.createdAt?.toDate?.() || new Date(0);
            const dateB = b.createdAt?.toDate?.() || new Date(0);
            return dateB - dateA;
          });
          
          if (!abortControllerRef.current.signal.aborted) {
            setShipments(sortedShipments.slice(0, 5));
          }

          // Calculate real revenue data
          const last7Days = [];
          for (let i = 6; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            const dateStr = date.toISOString().split('T')[0];
            
            const dayShipments = allShipments.filter(ship => {
              const shipDate = ship.createdAt?.toDate?.()?.toISOString()?.split('T')[0];
              return shipDate === dateStr && ship.status === "Delivered";
            });
            
            const total = dayShipments.reduce((sum, ship) => sum + (Number(ship.amount) || 0), 0);
            
            last7Days.push({
              day: date.toLocaleDateString('en-IN', { weekday: 'short' }),
              amount: total
            });
          }
          if (!abortControllerRef.current.signal.aborted) {
            setRevenueData(last7Days);
          }

          // Active shipments for map
          const active = allShipments.filter(ship => 
            ["In Transit", "Out for Delivery"].includes(ship.status)
          );
          if (!abortControllerRef.current.signal.aborted) {
            setActiveShipments(active);
          }

          // Quick stats
          const delivered = allShipments.filter(ship => ship.status === "Delivered");
          let totalDays = 0;
          delivered.forEach(ship => {
            if (ship.createdAt?.toDate && ship.deliveredAt?.toDate) {
              const days = (ship.deliveredAt.toDate() - ship.createdAt.toDate()) / (1000 * 60 * 60 * 24);
              totalDays += days;
            }
          });
          
          const avgDeliveryTime = delivered.length > 0 ? (totalDays / delivered.length).toFixed(1) : 0;
          const successRate = allShipments.length > 0 ? ((delivered.length / allShipments.length) * 100).toFixed(1) : 0;
          
          if (!abortControllerRef.current.signal.aborted) {
            setQuickStats(prev => ({
              ...prev,
              avgDeliveryTime,
              successRate
            }));
          }

          // Ratings
          const ratedShipments = allShipments.filter(ship => ship.rating && ship.rating > 0);
          if (ratedShipments.length > 0) {
            const totalRating = ratedShipments.reduce((sum, ship) => sum + Number(ship.rating), 0);
            const avgRating = (totalRating / ratedShipments.length).toFixed(1);
            if (!abortControllerRef.current.signal.aborted) {
              setRatings({ avg: avgRating, total: ratedShipments.length });
            }
          }

          // Upcoming deliveries
          const today = new Date();
          const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
          const upcoming = allShipments
            .filter(ship => {
              const deliveryDate = ship.estimatedDelivery?.toDate?.();
              return deliveryDate && deliveryDate >= today && deliveryDate <= nextWeek &&
                     ["In Transit", "Out for Delivery"].includes(ship.status);
            })
            .sort((a, b) => {
              const dateA = a.estimatedDelivery?.toDate?.() || new Date(0);
              const dateB = b.estimatedDelivery?.toDate?.() || new Date(0);
              return dateA - dateB;
            });
          if (!abortControllerRef.current.signal.aborted) {
            setUpcomingDeliveries(upcoming);
          }

        } catch (shipErr) {
          console.error("Shipment Fetch Error:", shipErr.message);
          if (!abortControllerRef.current.signal.aborted) {
            setShipments([]);
            setTotalShipmentsCount(0);
          }
        }

        // 3. Invoices
        try {
          const invQuery = query(
            collection(db, "invoices"), 
            where("userId", "==", currentUser.uid)
          );
          const invSnap = await getDocs(invQuery);
          const allInvoices = invSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          
          const unpaidInvoices = allInvoices.filter(inv => inv.status === "Unpaid");
          if (!abortControllerRef.current.signal.aborted) {
            setPendingPayments(unpaidInvoices.slice(0, 5));
          }
        } catch (invErr) {
          console.error("Invoice Fetch Error:", invErr.message);
          if (!abortControllerRef.current.signal.aborted) {
            setPendingPayments([]);
          }
        }

        // 4. Alerts
        try {
          const alertSnap = await getDocs(collection(db, "alerts"));
          const allAlerts = alertSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          
          const sortedAlerts = allAlerts.sort((a, b) => {
            const dateA = a.timestamp?.toDate?.() || new Date(0);
            const dateB = b.timestamp?.toDate?.() || new Date(0);
            return dateB - dateA;
          });
          
          if (!abortControllerRef.current.signal.aborted) {
            setAlerts(sortedAlerts.slice(0, 4));
          }
        } catch (err) {
          console.error("Alerts Error:", err.message);
          if (!abortControllerRef.current.signal.aborted) {
            setAlerts([]);
          }
        }

        // ACTIVITIES - Safe fetch
        try {
          const logsSnap = await getDocs(
            query(collection(db, "adminLogs"), limit(10))
          );
          if (!abortControllerRef.current.signal.aborted) {
            setActivities(logsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
          }
        } catch (err) {
          console.warn("⚠️ Activities not available:", err.message);
          if (!abortControllerRef.current.signal.aborted) {
            setActivities([]);
          }
        }

        // NOTIFICATIONS
        try {
          const notifSnap = await getDocs(
            query(
              collection(db, "notifications"),
              where("userId", "==", currentUser.uid),
              where("read", "==", false)
            )
          );
          
          const notifs = notifSnap.docs
            .map(doc => ({ id: doc.id, ...doc.data() }))
            .sort((a, b) => {
              const dateA = a.createdAt?.toDate?.() || new Date(0);
              const dateB = b.createdAt?.toDate?.() || new Date(0);
              return dateB - dateA;
            })
            .slice(0, 5);
          
          if (!abortControllerRef.current.signal.aborted) {
            setNotifications(notifs);
          }
        } catch (err) {
          console.warn("⚠️ Notifications not available:", err.message);
          if (!abortControllerRef.current.signal.aborted) {
            setNotifications([]);
          }
        }

      } catch (error) {
        console.error("Dashboard General Error:", error);
      } finally {
        if (!abortControllerRef.current?.signal?.aborted) {
          setLoading(false);
          setTimeout(() => setIsVisible(true), 50); 
        }
      }
    };

    fetchDashboardData();
    
    return () => {
      abortControllerRef.current?.abort();
    };
  }, [currentUser, authLoading]);

  const handlePayNow = (invoice) => {
    setSelectedInvoice(invoice);
    setShowPaymentModal(true);
    setPaymentMethod('smart-demo');
  };

  const closePaymentModal = () => {
    if (!processingPayment) {
      setShowPaymentModal(false);
      setSelectedInvoice(null);
      setPaymentMethod('smart-demo');
      setPaymentMode('test');
    }
  };

  const handleQuickBook = async () => {
    if (!quickBookData.from || !quickBookData.to || !quickBookData.weight || Number(quickBookData.weight) <= 0) {
      showToast('❌ Please fill all fields correctly (weight must be > 0)', 'error');
      return;
    }

    try {
      const trackingId = `ATL-${Date.now().toString().slice(-6)}`;
      
      await addDoc(collection(db, "shipments"), {
        ...quickBookData,
        weight: Number(quickBookData.weight),
        trackingId,
        userId: currentUser.uid,
        userEmail: currentUser.email || '',
        status: "Booked",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      await addDoc(collection(db, "invoices"), {
        userId: currentUser.uid,
        customer: currentUser.displayName || currentUser.email?.split('@')[0] || 'Customer',
        route: `${quickBookData.from} → ${quickBookData.to}`,
        amount: 100 + (Number(quickBookData.weight) * 80),
        status: "Unpaid",
        createdAt: serverTimestamp()
      });
      
      showToast(`✅ Shipment ${trackingId} booked!`, 'success');
      setShowQuickBook(false);
      setQuickBookData({ from: '', to: '', weight: '', serviceType: 'Standard' });
      
      window.location.reload();
      
    } catch (error) {
      console.error("Quick Book Error:", error);
      showToast(`❌ Booking failed: ${error.message}`, 'error');
    }
  };

  const exportToCSV = () => {
    const headers = ['Tracking ID', 'From', 'To', 'Status', 'Weight', 'Date'];
    const rows = shipments.map(ship => [
      ship.trackingId || ship.id,
      ship.pickupCity || ship.from || '',
      ship.dropCity || ship.to || '',
      ship.status || '',
      ship.weight || '',
      ship.createdAt?.toDate?.()?.toLocaleDateString() || ''
    ]);
    
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `shipments-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    
    showToast('✅ Data exported successfully!', 'success');
  };

  const markAllRead = async () => {
    try {
      for (const notif of notifications) {
        await updateDoc(doc(db, "notifications", notif.id), { read: true });
      }
      setNotifications([]);
      showToast('✅ All notifications marked as read', 'success');
    } catch (error) {
      console.error("Mark read error:", error);
      showToast('❌ Failed to mark notifications as read', 'error');
    }
  };

  const pureDemoPayment = () => {
    alert(`✅ Payment initiated for ${selectedInvoice?.id}`);
    closePaymentModal();
  };

  const smartDemoPayment = async () => {
    if (!selectedInvoice) return;
    
    setProcessingPayment(true);
    
    try {
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const paymentId = `pay_demo_${Date.now()}`;
      
      await updateDoc(doc(db, "invoices", selectedInvoice.id), {
        status: "Paid",
        paymentId: paymentId,
        paymentMethod: "Demo",
        paidAt: serverTimestamp(),
        paidAmount: selectedInvoice.amount
      });
      
      await addDoc(collection(db, "payments"), {
        invoiceId: selectedInvoice.id,
        shipmentId: selectedInvoice.shipmentId || '',
        userId: currentUser.uid,
        amount: selectedInvoice.amount,
        paymentId: paymentId,
        method: "Demo",
        status: "Success",
        createdAt: serverTimestamp()
      });
      
      showToast(`✅ Demo Payment Successful!\nID: ${paymentId}`, 'success');
      
      setPendingPayments(prev => prev.filter(inv => inv.id !== selectedInvoice.id));
      closePaymentModal();
      
    } catch (error) {
      console.error("Smart Demo Error:", error);
      showToast(`❌ Payment failed: ${error.message}`, 'error');
    } finally {
      setProcessingPayment(false);
    }
  };

  const processPayment = async () => {
    try {
      switch (paymentMethod) {
        case 'pure-demo':
          pureDemoPayment();
          break;
        case 'smart-demo':
          await smartDemoPayment();
          break;
        default:
          showToast("❌ Unknown payment method", 'error');
      }
    } catch (error) {
      console.error("Payment Error:", error);
      showToast(`❌ Payment failed: ${error.message}`, 'error');
    }
  };

  const showToast = (message, type = 'success') => {
    try {
      const toast = document.createElement("div");
      const bgColor = type === 'error' 
        ? 'linear-gradient(135deg, #ef4444, #dc2626)' 
        : type === 'warning'
        ? 'linear-gradient(135deg, #f59e0b, #d97706)'
        : 'linear-gradient(135deg, #10b981, #059669)';
      
      toast.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${bgColor};
        color: white;
        padding: 16px 24px;
        border-radius: 12px;
        box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
        z-index: 10000;
        font-weight: 600;
        animation: slideIn 0.3s ease;
        white-space: pre-line;
        max-width: 400px;
      `;
      toast.textContent = message;
      document.body.appendChild(toast);
      setTimeout(() => {
        if (document.body.contains(toast)) {
          document.body.removeChild(toast);
        }
      }, 5000);
    } catch (error) {
      console.error("Toast error:", error);
    }
  };

  if (authLoading || loading) {
    return (
      // ❌ REMOVED: <DashboardLayout>
      <div className="loading-screen">
        <div className="spinner"></div>
        <p>Loading Dashboard...</p>
      </div>
      // ❌ REMOVED: </DashboardLayout>
    );
  }

  const userName = currentUser?.displayName || 
                   (currentUser?.email ? currentUser.email.split('@')[0] : 'User');

  // ✅ FIXED: Process stats - 1st Revenue stays, 2nd duplicate Revenue becomes "In Transit"
  const processedStats = (() => {
    const list = [];
    let revenueCount = 0;
    let shipmentCount = 0;

    stats.forEach((stat) => {
      const label = (stat.label || '').toLowerCase();

      if (label.includes('revenue')) {
        revenueCount += 1;
        if (revenueCount === 1) {
          list.push(stat); // ✅ 1st Revenue card - untouched (₹8.4L)
        } else if (revenueCount === 2) {
          list.push({ ...stat, isInTransitCard: true }); // ✅ 2nd Revenue -> In Transit
        }
        // 3rd+ revenue duplicates completely ignored
      } else if (label === 'total shipments') {
        shipmentCount += 1;
        if (shipmentCount === 1) list.push(stat); // remove duplicate total shipments
      } else {
        list.push(stat);
      }
    });

    // Fallback: DB lo revenue docs 1 only unna (ledu 0 unna) In Transit card chupistundi
    if (revenueCount < 2) {
      list.push({ id: 'in-transit-fallback', isInTransitCard: true });
    }

    return list;
  })();

  return (
    // ❌ REMOVED: <DashboardLayout>
    <div className={`dashboard-container ${isVisible ? 'fade-in-visible' : 'fade-in-hidden'}`}>
      
      {/* Header Section */}
      <div className="dashboard-header">
        <div className="header-left">
          <h1 className="welcome-title">Welcome back, {userName}! 👋</h1>
          <p className="welcome-subtitle">
            {new Date().toLocaleDateString("en-IN", { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <div className="header-right">
          <div className="search-box">
            <span className="search-icon">🔍</span>
            <input type="text" placeholder="Search shipments, customers..." />
          </div>
          
          <div className="notification-wrapper">
            <button 
              className="notification-btn"
              onClick={() => setShowNotifications(!showNotifications)}
            >
              🔔
              {notifications.length > 0 && (
                <span className="notification-badge">{notifications.length}</span>
              )}
            </button>
            
            {showNotifications && (
              <div className="notification-dropdown">
                <h3>Notifications</h3>
                {notifications.length > 0 ? (
                  <>
                    {notifications.map(notif => (
                      <div key={notif.id} className="notification-item">
                        <p>{notif.message || 'No message'}</p>
                        <span className="notif-time">
                          {notif.createdAt?.toDate?.()?.toLocaleString() || 'Unknown time'}
                        </span>
                      </div>
                    ))}
                    <button onClick={markAllRead} className="mark-read-btn">
                      Mark all as read
                    </button>
                  </>
                ) : (
                  <p className="no-notifs">No new notifications</p>
                )}
              </div>
            )}
          </div>
          
          <div className="user-profile">
            <div className="user-avatar">{(userName || 'U').charAt(0).toUpperCase()}</div>
          </div>
        </div>
      </div>

      {/* Stats Grid - ✅ FIXED: Revenue only once + In Transit card */}
      <div className="stats-grid">
        {processedStats.length > 0 ? processedStats.map((stat, idx) => {
          
          // ✅ IN TRANSIT CARD (2nd Revenue ki badhulu)
          if (stat.isInTransitCard) {
            return (
              <div key={stat.id || `intransit-${idx}`} className="stat-card" style={{ '--accent-color': '#3b82f6' }}>
                <div className="stat-header">
                  <div className="stat-icon" style={{ background: '#3b82f620' }}>
                    🚚
                  </div>
                  <div className="stat-trend up">
                    ↑ 8.3%
                  </div>
                </div>
                <div className="stat-body">
                  <div className="stat-value">600</div>
                  <div className="stat-label">In Transit</div>
                </div>
              </div>
            );
          }
          
          // Normal stat cards (1st Revenue ₹8.4L included)
          return (
            <div key={stat.id || idx} className="stat-card" style={{ '--accent-color': stat.color || '#10b981' }}>
              <div className="stat-header">
                <div className="stat-icon" style={{ background: `${stat.color || '#10b981'}20` }}>
                  {stat.icon || '📊'}
                </div>
                {stat.trend && (
                  <div className={`stat-trend ${stat.trend}`}>
                    {stat.trend === 'up' ? '↑' : '↓'} {stat.change || '0%'}
                  </div>
                )}
              </div>
              <div className="stat-body">
                <div className="stat-value">{stat.value || '0'}</div>
                <div className="stat-label">{stat.label || 'No Label'}</div>
              </div>
            </div>
          );
        }) : (
          <div className="no-data-message">
            No statistics available
          </div>
        )}
      </div>

      {/* Quick Stats Widgets */}
      <div className="quick-stats-grid">
        <div className="quick-stat-card">
          <div className="quick-stat-icon">⏱️</div>
          <div className="quick-stat-info">
            <span className="quick-stat-value">{quickStats.avgDeliveryTime} days</span>
            <span className="quick-stat-label">Avg Delivery Time</span>
          </div>
        </div>
        
        <div className="quick-stat-card">
          <div className="quick-stat-icon">✅</div>
          <div className="quick-stat-info">
            <span className="quick-stat-value">{quickStats.successRate}%</span>
            <span className="quick-stat-label">Success Rate</span>
          </div>
        </div>
        
        <div className="quick-stat-card">
          <div className="quick-stat-icon">🚚</div>
          <div className="quick-stat-info">
            <span className="quick-stat-value">{quickStats.activeDrivers}</span>
            <span className="quick-stat-label">Active Drivers</span>
          </div>
        </div>
        
        <div className="quick-stat-card">
          <div className="quick-stat-icon">⏳</div>
          <div className="quick-stat-info">
            <span className="quick-stat-value">{quickStats.pendingApprovals}</span>
            <span className="quick-stat-label">Pending Approvals</span>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="quick-actions">
        <Link to="/book-shipment" className="action-btn primary">
          <span className="action-icon">📦</span>
          <span>Book Shipment</span>
        </Link>
        <Link to="/tracking" className="action-btn success">
          <span className="action-icon">📍</span>
          <span>Track Package</span>
        </Link>
        <Link to="/invoices" className="action-btn info">
          <span className="action-icon">🧾</span>
          <span>View Invoices</span>
        </Link>
        <Link to="/my-shipments" className="action-btn warning">
          <span className="action-icon">📊</span>
          <span>My Shipments</span>
        </Link>
        <button className="action-btn quick-book" onClick={() => setShowQuickBook(!showQuickBook)}>
          <span className="action-icon">⚡</span>
          <span>Quick Book</span>
        </button>
      </div>

      {/* Quick Booking Modal */}
      {showQuickBook && (
        <div className="quick-book-modal">
          <h3>⚡ Quick Book Shipment</h3>
          <input 
            type="text" 
            placeholder="From (City)" 
            value={quickBookData.from}
            onChange={(e) => setQuickBookData({...quickBookData, from: e.target.value})}
          />
          <input 
            type="text" 
            placeholder="To (City)" 
            value={quickBookData.to}
            onChange={(e) => setQuickBookData({...quickBookData, to: e.target.value})}
          />
          <input 
            type="number" 
            placeholder="Weight (kg)" 
            value={quickBookData.weight}
            onChange={(e) => setQuickBookData({...quickBookData, weight: e.target.value})}
            min="0.1"
            step="0.1"
          />
          <select 
            value={quickBookData.serviceType}
            onChange={(e) => setQuickBookData({...quickBookData, serviceType: e.target.value})}
          >
            <option value="Standard">Standard</option>
            <option value="Express">Express</option>
          </select>
          <div className="quick-book-actions">
            <button onClick={handleQuickBook} className="book-now-btn">Book Now</button>
            <button onClick={() => setShowQuickBook(false)} className="cancel-btn">Cancel</button>
          </div>
        </div>
      )}

      {/* Main Content Grid */}
      <div className="main-grid">
        <div className="left-column">
          {/* Revenue Chart */}
          <div className="chart-card">
            <div className="card-header">
              <h2>Revenue Overview</h2>
              <button className="export-btn" onClick={exportToCSV}>📥 Export</button>
            </div>
            <div className="chart-container">
              <div className="chart-bars">
                {revenueData.length > 0 ? revenueData.map((data, idx) => {
                  const maxAmount = Math.max(...revenueData.map(d => d.amount), 1);
                  const height = (data.amount / maxAmount) * 100;
                  
                  return (
                    <div key={idx} className="chart-bar-wrapper">
                      <div 
                        className="chart-bar" 
                        style={{ height: `${height}%` }}
                        title={`₹${data.amount.toLocaleString()}`}
                      ></div>
                      <span className="chart-label">{data.day}</span>
                    </div>
                  );
                }) : (
                  <div className="no-data-message">
                    No revenue data available
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Recent Shipments */}
          <div className="table-card">
            <div className="card-header">
              <h2>Recent Shipments</h2>
              <Link to="/my-shipments" className="view-all-link">View All →</Link>
            </div>
            <div className="table-wrapper">
              <table className="shipments-table">
                <thead>
                  <tr>
                    <th>Tracking ID</th>
                    <th>Route</th>
                    <th>Status</th>
                    <th>Weight</th>
                    <th>Date</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {shipments.length > 0 ? shipments.map((ship) => (
                    <tr key={ship.id}>
                      <td className="tracking-id">{ship.trackingId || ship.id}</td>
                      <td>{ship.pickupCity || ship.from || 'N/A'} → {ship.dropCity || ship.to || 'N/A'}</td>
                      <td>
                        <span className={`status-badge status-${ship.status?.toLowerCase().replace(/\s+/g, '-') || 'unknown'}`}>
                          {ship.status || 'Unknown'}
                        </span>
                      </td>
                      <td>{ship.weight || '0'} kg</td>
                      <td>{ship.createdAt?.toDate?.()?.toLocaleDateString() || 'N/A'}</td>
                      <td><Link to={`/tracking/${ship.id}`} className="track-btn">Track</Link></td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan="6" className="no-data-row">
                        No shipments found. Book your first shipment!
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Live Shipment Map */}
          {activeShipments.length > 0 && (
            <div className="map-card">
              <div className="card-header">
                <h2>🗺️ Live Shipments</h2>
                <span className="live-badge">● LIVE</span>
              </div>
              <MapContainer 
                center={[20.5937, 78.9629]} 
                zoom={5} 
                style={{ height: '400px', width: '100%', borderRadius: '0 0 12px 12px' }}
              >
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                {activeShipments.map(shipment => (
                  <Marker 
                    key={shipment.id} 
                    position={[
                      shipment.driverLocation?.lat || 20.5937, 
                      shipment.driverLocation?.lng || 78.9629
                    ]}
                  >
                    <Popup>
                      <strong>{shipment.trackingId || shipment.id}</strong><br/>
                      {shipment.pickupCity || shipment.from || 'N/A'} → {shipment.dropCity || shipment.to || 'N/A'}<br/>
                      Status: {shipment.status || 'Unknown'}<br/>
                      Driver: {shipment.driver?.name || 'N/A'}
                    </Popup>
                  </Marker>
                ))}
              </MapContainer>
            </div>
          )}
        </div>

        <div className="right-column">
          {/* Donut Chart */}
          <div className="donut-card">
            <div className="card-header"><h2>Shipment Status</h2></div>
            <div className="donut-chart">
              <svg viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="40" fill="none" stroke="#e5e7eb" strokeWidth="12" />
                <circle cx="50" cy="50" r="40" fill="none" stroke="#10b981" strokeWidth="12" strokeDasharray="180 251" strokeDashoffset="0" />
                <circle cx="50" cy="50" r="40" fill="none" stroke="#f97316" strokeWidth="12" strokeDasharray="68 251" strokeDashoffset="-180" />
                <circle cx="50" cy="50" r="40" fill="none" stroke="#3b82f6" strokeWidth="12" strokeDasharray="22 251" strokeDashoffset="-248" />
              </svg>
              <div className="donut-center">
                <div className="donut-value">{totalShipmentsCount}</div>
                <div className="donut-label">Total</div>
              </div>
            </div>
          </div>

          {/* Alerts */}
          <div className="alerts-card">
            <div className="card-header"><h2>Recent Alerts</h2></div>
            <div className="alerts-list">
              {alerts.length > 0 ? alerts.map((alert) => (
                <div key={alert.id} className={`alert-item alert-${alert.type || 'info'}`}>
                  <div className="alert-icon">
                    {alert.type === 'warning' && '⚠️'}
                    {alert.type === 'success' && '✅'}
                    {alert.type === 'info' && 'ℹ️'}
                    {alert.type === 'error' && '❌'}
                    {!alert.type && 'ℹ️'}
                  </div>
                  <div className="alert-content">
                    <div className="alert-message">{alert.message || 'No message'}</div>
                    <div className="alert-time">{alert.time || 'Just now'}</div>
                  </div>
                </div>
              )) : (
                <div className="no-data-message">No new alerts</div>
              )}
            </div>
          </div>

          {/* Upcoming Deliveries */}
          {upcomingDeliveries.length > 0 && (
            <div className="upcoming-card">
              <div className="card-header">
                <h2>📅 Upcoming Deliveries</h2>
                <span className="badge">{upcomingDeliveries.length}</span>
              </div>
              <div className="upcoming-list">
                {upcomingDeliveries.slice(0, 5).map(delivery => (
                  <div key={delivery.id} className="upcoming-item">
                    <div className="upcoming-date">
                      {delivery.estimatedDelivery?.toDate?.()?.toLocaleDateString('en-IN', { 
                        day: '2-digit', 
                        month: 'short' 
                      }) || 'TBD'}
                    </div>
                    <div className="upcoming-info">
                      <p className="upcoming-tracking">{delivery.trackingId || delivery.id}</p>
                      <p className="upcoming-route">
                        {delivery.pickupCity || delivery.from || 'N/A'} → {delivery.dropCity || delivery.to || 'N/A'}
                      </p>
                    </div>
                    <div className="upcoming-status">
                      <span className={`status-badge status-${delivery.status?.toLowerCase().replace(/\s+/g, '-') || 'unknown'}`}>
                        {delivery.status || 'Unknown'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Customer Ratings */}
          {ratings.total > 0 && (
            <div className="ratings-card">
              <div className="card-header">
                <h2>⭐ Customer Satisfaction</h2>
              </div>
              <div className="ratings-content">
                <div className="rating-big">
                  <span className="rating-value">{ratings.avg}</span>
                  <span className="rating-stars">
                    {'★'.repeat(Math.min(5, Math.max(0, Math.round(Number(ratings.avg)))))}
                    {'☆'.repeat(Math.max(0, 5 - Math.round(Number(ratings.avg))))}
                  </span>
                </div>
                <p className="rating-count">Based on {ratings.total} reviews</p>
              </div>
            </div>
          )}

          {/* Recent Activity */}
          {activities.length > 0 && (
            <div className="activity-card">
              <div className="card-header">
                <h2>📝 Recent Activity</h2>
              </div>
              <div className="activity-timeline">
                {activities.slice(0, 5).map(activity => (
                  <div key={activity.id} className="activity-item">
                    <div className="activity-icon">
                      {activity.action === 'UPDATE_STATUS' && '📦'}
                      {activity.action === 'RESOLVE_ISSUE' && '✅'}
                      {activity.action === 'GRANT_ACCESS' && '🔑'}
                      {activity.action === 'TOGGLE_USER_STATUS' && '👤'}
                      {!['UPDATE_STATUS', 'RESOLVE_ISSUE', 'GRANT_ACCESS', 'TOGGLE_USER_STATUS'].includes(activity.action) && '📝'}
                    </div>
                    <div className="activity-content">
                      <p className="activity-text">{activity.details || 'No details'}</p>
                      <p className="activity-time">
                        {activity.timestamp?.toDate?.()?.toLocaleString() || 'Unknown time'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Payment Section */}
      <div className="payment-section">
        <div className="section-header">
          <div>
            <h2>💳 Pending Payments & Invoices</h2>
            <span className="section-subtitle">Complete payment to confirm your shipments</span>
          </div>
          <Link to="/invoices" className="view-all-link">View All Invoices →</Link>
        </div>
        <div className="table-wrapper">
          <table className="payments-table">
            <thead>
              <tr>
                <th>Invoice ID</th>
                <th>Shipment ID</th>
                <th>Customer</th>
                <th>Route</th>
                <th>Amount</th>
                <th>Due Date</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {pendingPayments.length > 0 ? pendingPayments.map((inv) => (
                <tr key={inv.id}>
                  <td className="invoice-id">{inv.id}</td>
                  <td className="shipment-id">{inv.shipmentId || 'N/A'}</td>
                  <td className="customer-name">{inv.customer || 'N/A'}</td>
                  <td>{inv.route || 'N/A'}</td>
                  <td className="payment-amount">₹{inv.amount || 0}</td>
                  <td>{inv.dueDate || 'N/A'}</td>
                  <td><span className="status-badge status-unpaid">{inv.status || 'Unpaid'}</span></td>
                  <td>
                    <button className="pay-now-btn" onClick={() => handlePayNow(inv)}>
                      Pay Now
                    </button>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan="8" className="no-data-row">No pending payments</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Payment Modal */}
      {showPaymentModal && selectedInvoice && (
        <div className="modal-overlay" onClick={closePaymentModal}>
          <div className="payment-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>💳 Complete Payment</h2>
              <button className="close-modal" onClick={closePaymentModal} disabled={processingPayment}>✕</button>
            </div>
            <div className="modal-body">
              <div className="invoice-summary">
                <h3>Invoice Details</h3>
                <div className="summary-row">
                  <span>Invoice ID:</span>
                  <span className="summary-value">{selectedInvoice.id}</span>
                </div>
                <div className="summary-row">
                  <span>Shipment ID:</span>
                  <span className="summary-value">{selectedInvoice.shipmentId || 'N/A'}</span>
                </div>
                <div className="summary-row">
                  <span>Customer:</span>
                  <span className="summary-value">{selectedInvoice.customer || 'N/A'}</span>
                </div>
                <div className="summary-row total">
                  <span>Total Amount:</span>
                  <span className="summary-value amount">₹{selectedInvoice.amount || 0}</span>
                </div>
              </div>

              <div className="payment-method-selector">
                <h4>Select Payment Method:</h4>
                
                <div className="method-grid">
                  <label className={`method-card ${paymentMethod === 'pure-demo' ? 'active' : ''}`}>
                    <input 
                      type="radio" 
                      name="paymentMethod" 
                      value="pure-demo"
                      checked={paymentMethod === 'pure-demo'}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                    />
                    <div className="method-icon">🎭</div>
                    <div className="method-name">Pure Demo</div>
                    <div className="method-desc">Just alert, no DB update</div>
                  </label>

                  <label className={`method-card ${paymentMethod === 'smart-demo' ? 'active' : ''}`}>
                    <input 
                      type="radio" 
                      name="paymentMethod" 
                      value="smart-demo"
                      checked={paymentMethod === 'smart-demo'}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                    />
                    <div className="method-icon">🧪</div>
                    <div className="method-name">Smart Demo</div>
                    <div className="method-desc">Updates Firestore (Recommended)</div>
                  </label>
                </div>
              </div>

              <button 
                className="confirm-pay-btn" 
                onClick={processPayment}
                disabled={processingPayment}
              >
                {processingPayment ? (
                  <span className="processing-text">
                    <span className="spinner"></span>
                    Processing Payment...
                  </span>
                ) : (
                  <>
                    {paymentMethod === 'pure-demo' && '🎭 Confirm (Pure Demo)'}
                    {paymentMethod === 'smart-demo' && '🧪 Confirm (Smart Demo)'}
                  </>
                )}
              </button>

              <p className="secure-note">🔒 Your payment is secure and encrypted</p>
            </div>
          </div>
        </div>
      )}
    </div>
    // ❌ REMOVED: </DashboardLayout>
  );
}