import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { 
  collection, query, getDocs, orderBy, limit, where
} from "firebase/firestore";
import { db } from "../firebase";
import "./AdminDashboard.css";

export default function AdminDashboard() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  
  // Real-time Data States
  const [stats, setStats] = useState({
    totalShipments: 0,
    todayShipments: 0,
    inTransit: 0,
    delivered: 0,
    pending: 0,
    totalRevenue: 0,
    todayRevenue: 0,
    activeCustomers: 0,
    activeDrivers: 0,
    totalVehicles: 0,
    openTickets: 0,
    warehouseUtilization: 0
  });

  const [recentShipments, setRecentShipments] = useState([]);
  const [topRoutes, setTopRoutes] = useState([]);
  const [shipmentStatus, setShipmentStatus] = useState([]);
  const [revenueData, setRevenueData] = useState([]);
  const [topCustomers, setTopCustomers] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [activities, setActivities] = useState([]);

  useEffect(() => {
    if (currentUser?.uid) {
      fetchDashboardData();
    }
  }, [currentUser]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      // Fetch Shipments
      const shipmentsSnap = await getDocs(
        query(collection(db, "shipments"), orderBy("createdAt", "desc"), limit(50))
      );
      const shipments = shipmentsSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate?.() || new Date()
      }));

      // Fetch Users
      const usersSnap = await getDocs(collection(db, "users"));
      const users = usersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      // Fetch Drivers
      const driversSnap = await getDocs(collection(db, "drivers"));
      const drivers = driversSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      // Fetch Vehicles
      const vehiclesSnap = await getDocs(collection(db, "vehicles"));
      const vehicles = vehiclesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      // Fetch Support Tickets
      const ticketsSnap = await getDocs(
        query(collection(db, "support_tickets"), where("status", "==", "Open"))
      );

      // Fetch Invoices
      const invoicesSnap = await getDocs(collection(db, "invoices"));
      const invoices = invoicesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      calculateDashboardStats(shipments, users, drivers, vehicles, ticketsSnap.docs.length, invoices);
      
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  const calculateDashboardStats = (shipments, users, drivers, vehicles, openTickets, invoices) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Today's shipments
    const todayShipments = shipments.filter(s => {
      const shipDate = s.createdAt;
      return shipDate >= today;
    });

    // Today's revenue
    const todayRevenue = todayShipments
      .filter(s => s.status === "Delivered")
      .reduce((sum, s) => sum + (Number(s.amount) || 0), 0);

    // Status breakdown
    const delivered = shipments.filter(s => s.status === "Delivered").length;
    const inTransit = shipments.filter(s => s.status === "In Transit").length;
    const pending = shipments.filter(s => s.status === "Pending" || s.status === "Booked").length;
    const totalRevenue = shipments
      .filter(s => s.status === "Delivered")
      .reduce((sum, s) => sum + (Number(s.amount) || 0), 0);

    // Active drivers
    const activeDrivers = drivers.filter(d => d.status === "active").length;

    // Top routes
    const routeMap = {};
    shipments.forEach(s => {
      if (s.pickupCity && s.dropCity) {
        const route = `${s.pickupCity} → ${s.dropCity}`;
        routeMap[route] = (routeMap[route] || 0) + 1;
      }
    });

    const topRoutesData = Object.entries(routeMap)
      .map(([route, count]) => ({ route, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Top customers
    const customerMap = {};
    shipments.forEach(s => {
      const customer = s.userEmail || s.customerName || 'Unknown';
      if (!customerMap[customer]) {
        customerMap[customer] = { count: 0, revenue: 0 };
      }
      customerMap[customer].count++;
      customerMap[customer].revenue += Number(s.amount) || 0;
    });

    const topCustomersData = Object.entries(customerMap)
      .map(([name, data]) => ({ name, shipments: data.count, revenue: data.revenue }))
      .sort((a, b) => b.shipments - a.shipments)
      .slice(0, 5);

    // Revenue last 7 days
    const last7Days = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);

      const dayRevenue = shipments
        .filter(s => {
          const shipDate = s.createdAt;
          return shipDate >= date && shipDate < nextDate && s.status === "Delivered";
        })
        .reduce((sum, s) => sum + (Number(s.amount) || 0), 0);

      last7Days.push({
        day: date.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric' }),
        revenue: dayRevenue
      });
    }

    // Recent activities (mock for now)
    const recentActivities = [
      { id: 1, type: "shipment", message: "New shipment booked", time: "5 mins ago", icon: "📦" },
      { id: 2, type: "delivery", message: "Shipment delivered successfully", time: "15 mins ago", icon: "✅" },
      { id: 3, type: "payment", message: "Payment received - ₹4,250", time: "30 mins ago", icon: "💰" },
      { id: 4, type: "ticket", message: "New support ticket created", time: "1 hour ago", icon: "🎫" },
      { id: 5, type: "driver", message: "Driver assigned to shipment", time: "2 hours ago", icon: "👷" },
    ];

    setStats({
      totalShipments: shipments.length,
      todayShipments: todayShipments.length,
      inTransit,
      delivered,
      pending,
      totalRevenue,
      todayRevenue,
      activeCustomers: users.filter(u => u.status !== "banned").length,
      activeDrivers,
      totalVehicles: vehicles.length,
      openTickets,
      warehouseUtilization: vehicles.length > 0 ? ((activeDrivers / vehicles.length) * 100).toFixed(0) : 0
    });

    setRecentShipments(shipments.slice(0, 10));
    setTopRoutes(topRoutesData);
    setShipmentStatus([
      { name: 'Delivered', value: delivered, percentage: shipments.length > 0 ? ((delivered / shipments.length) * 100).toFixed(0) : 0, color: '#10b981' },
      { name: 'In Transit', value: inTransit, percentage: shipments.length > 0 ? ((inTransit / shipments.length) * 100).toFixed(0) : 0, color: '#3b82f6' },
      { name: 'Pending', value: pending, percentage: shipments.length > 0 ? ((pending / shipments.length) * 100).toFixed(0) : 0, color: '#f59e0b' }
    ]);
    setRevenueData(last7Days);
    setTopCustomers(topCustomersData);
    setActivities(recentActivities);
  };

  if (loading) {
    return (
      <div className="dashboard-loading">
        <div className="spinner-large"></div>
        <p>Loading Dashboard...</p>
      </div>
    );
  }

  return (
    <div className="admin-dashboard">
      {/* Welcome Section */}
      <div className="dashboard-welcome">
        <div>
          <h1>Welcome back, Admin! 👋</h1>
          <p>Here's what's happening with your logistics operations today.</p>
        </div>
        <div className="quick-actions">
          <button className="quick-action-btn" onClick={() => navigate("/admin/all-shipments")}>
            <span>📦</span> View Shipments
          </button>
          <button className="quick-action-btn" onClick={() => navigate("/admin/drivers")}>
            <span></span> Manage Drivers
          </button>
          <button className="quick-action-btn" onClick={() => navigate("/admin/reports")}>
            <span>📊</span> Generate Report
          </button>
        </div>
      </div>

      {/* Key Metrics Grid */}
      <div className="metrics-grid">
        <div className="metric-card primary">
          <div className="metric-icon">📦</div>
          <div className="metric-content">
            <div className="metric-label">Total Shipments</div>
            <div className="metric-value">{stats.totalShipments.toLocaleString()}</div>
            <div className="metric-subtitle">Today: {stats.todayShipments}</div>
          </div>
        </div>

        <div className="metric-card success">
          <div className="metric-icon">✅</div>
          <div className="metric-content">
            <div className="metric-label">Delivered</div>
            <div className="metric-value">{stats.delivered}</div>
            <div className="metric-subtitle">{shipmentStatus.find(s => s.name === 'Delivered')?.percentage || 0}% success rate</div>
          </div>
        </div>

        <div className="metric-card warning">
          <div className="metric-icon"></div>
          <div className="metric-content">
            <div className="metric-label">In Transit</div>
            <div className="metric-value">{stats.inTransit}</div>
            <div className="metric-subtitle">Active deliveries</div>
          </div>
        </div>

        <div className="metric-card info">
          <div className="metric-icon">⏳</div>
          <div className="metric-content">
            <div className="metric-label">Pending</div>
            <div className="metric-value">{stats.pending}</div>
            <div className="metric-subtitle">Awaiting action</div>
          </div>
        </div>

        <div className="metric-card revenue">
          <div className="metric-icon">💰</div>
          <div className="metric-content">
            <div className="metric-label">Total Revenue</div>
            <div className="metric-value">₹{(stats.totalRevenue / 100000).toFixed(1)}L</div>
            <div className="metric-subtitle">Today: ₹{(stats.todayRevenue / 1000).toFixed(1)}K</div>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon">👥</div>
          <div className="metric-content">
            <div className="metric-label">Active Customers</div>
            <div className="metric-value">{stats.activeCustomers}</div>
            <div className="metric-subtitle">Registered users</div>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon"></div>
          <div className="metric-content">
            <div className="metric-label">Active Drivers</div>
            <div className="metric-value">{stats.activeDrivers}</div>
            <div className="metric-subtitle">On duty</div>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon">🎫</div>
          <div className="metric-content">
            <div className="metric-label">Open Tickets</div>
            <div className="metric-value">{stats.openTickets}</div>
            <div className="metric-subtitle">Support pending</div>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="charts-row">
        {/* Revenue Chart */}
        <div className="chart-card large">
          <div className="card-header">
            <h3>📈 Revenue Overview (Last 7 Days)</h3>
          </div>
          <div className="chart-container">
            <div className="bar-chart">
              {revenueData.map((d, i) => (
                <div key={i} className="bar-item">
                  <div 
                    className="bar" 
                    style={{ 
                      height: `${(d.revenue / Math.max(...revenueData.map(x => x.revenue), 1)) * 100}%` 
                    }}
                  >
                    <span className="bar-value">₹{(d.revenue / 1000).toFixed(0)}K</span>
                  </div>
                  <span className="bar-label">{d.day}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Shipment Status */}
        <div className="chart-card">
          <div className="card-header">
            <h3>📊 Shipment Status</h3>
          </div>
          <div className="donut-chart-wrapper">
            <svg viewBox="0 0 200 200" className="donut-chart">
              {shipmentStatus.map((segment, i) => {
                const total = shipmentStatus.reduce((sum, s) => sum + s.value, 0) || 1;
                const circumference = 2 * Math.PI * 80;
                const dashArray = `${(segment.value / total) * circumference} ${circumference}`;
                const rotation = (shipmentStatus.slice(0, i).reduce((sum, s) => sum + s.value, 0) / total) * 360;
                
                return (
                  <circle
                    key={i}
                    cx="100"
                    cy="100"
                    r="80"
                    fill="none"
                    stroke={segment.color}
                    strokeWidth="20"
                    strokeDasharray={dashArray}
                    transform={`rotate(${rotation - 90} 100 100)`}
                  />
                );
              })}
            </svg>
            <div className="donut-center">
              <div className="donut-value">{stats.totalShipments}</div>
              <div className="donut-label">Total</div>
            </div>
          </div>
          <div className="chart-legend">
            {shipmentStatus.map((item, index) => (
              <div key={index} className="legend-item">
                <span className="legend-color" style={{ background: item.color }}></span>
                <span className="legend-label">{item.name}</span>
                <span className="legend-value">{item.value} ({item.percentage}%)</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Tables Row */}
      <div className="tables-row">
        {/* Recent Shipments */}
        <div className="table-card">
          <div className="card-header">
            <h3>📦 Recent Shipments</h3>
            <button className="view-all-btn" onClick={() => navigate("/admin/all-shipments")}>View All →</button>
          </div>
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Tracking ID</th>
                  <th>Route</th>
                  <th>Status</th>
                  <th>Amount</th>
                </tr>
              </thead>
              <tbody>
                {recentShipments.map((shipment) => (
                  <tr key={shipment.id}>
                    <td className="tracking-id">{shipment.trackingId || shipment.id.slice(0, 10)}</td>
                    <td>{shipment.pickupCity || 'N/A'} → {shipment.dropCity || 'N/A'}</td>
                    <td>
                      <span className={`status-badge status-${(shipment.status || 'pending').toLowerCase().replace(' ', '-')}`}>
                        {shipment.status || 'Pending'}
                      </span>
                    </td>
                    <td className="amount">₹{(Number(shipment.amount) || 0).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Top Routes */}
        <div className="table-card">
          <div className="card-header">
            <h3>🗺️ Top Delivery Routes</h3>
          </div>
          <div className="routes-list">
            {topRoutes.map((route, index) => (
              <div key={index} className="route-item">
                <div className="route-rank">#{index + 1}</div>
                <div className="route-info">
                  <div className="route-name">{route.route}</div>
                  <div className="route-count">{route.count} shipments</div>
                </div>
                <div className="route-bar">
                  <div 
                    className="route-progress" 
                    style={{ width: `${(route.count / topRoutes[0].count) * 100}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top Customers */}
        <div className="table-card">
          <div className="card-header">
            <h3>👑 Top Customers</h3>
          </div>
          <div className="customers-list">
            {topCustomers.map((customer, index) => (
              <div key={index} className="customer-item">
                <div className="customer-rank">#{index + 1}</div>
                <div className="customer-avatar">{customer.name.charAt(0)}</div>
                <div className="customer-info">
                  <div className="customer-name">{customer.name}</div>
                  <div className="customer-stats">{customer.shipments} shipments</div>
                </div>
                <div className="customer-revenue">{(customer.revenue / 1000).toFixed(1)}K</div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Activities */}
        <div className="table-card">
          <div className="card-header">
            <h3>⚡ Recent Activities</h3>
          </div>
          <div className="activities-list">
            {activities.map((activity) => (
              <div key={activity.id} className="activity-item">
                <div className="activity-icon">{activity.icon}</div>
                <div className="activity-content">
                  <div className="activity-message">{activity.message}</div>
                  <div className="activity-time">{activity.time}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Fleet & Warehouse Stats */}
      <div className="fleet-section">
        <div className="fleet-card">
          <h3>🚛 Fleet Utilization</h3>
          <div className="fleet-stats">
            <div className="fleet-stat">
              <div className="stat-label">Total Vehicles</div>
              <div className="stat-value">{stats.totalVehicles}</div>
            </div>
            <div className="fleet-stat">
              <div className="stat-label">Active Drivers</div>
              <div className="stat-value success">{stats.activeDrivers}</div>
            </div>
            <div className="fleet-stat">
              <div className="stat-label">Utilization</div>
              <div className="stat-value warning">{stats.warehouseUtilization}%</div>
            </div>
          </div>
          <div className="fleet-progress">
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${stats.warehouseUtilization}%` }}></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}