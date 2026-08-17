import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { 
  collection, query, getDocs, addDoc, updateDoc, doc, setDoc,
  orderBy, limit, where, serverTimestamp, onSnapshot, increment,
  deleteDoc, writeBatch, Timestamp
} from "firebase/firestore";
import { db } from "../firebase";
import logoImage from "../assets/logo_3.png";
import "./Admin.css";

// 📊 Charts
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, 
  PieChart, Pie, Legend, LineChart, Line, AreaChart, Area,
  CartesianGrid, RadialBarChart, RadialBar, ScatterChart, Scatter,
  ComposedChart, Treemap
} from 'recharts';

// 🗺️ Map
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// =========================================
// CONSTANTS & HELPERS
// =========================================
const KEYBOARD_SHORTCUTS = {
  'g+d': 'dashboard', 'g+c': 'clients', 'g+s': 'shipments',
  'g+f': 'fleet', 'g+h': 'hubs', 'g+a': 'analytics',
  'g+r': 'reports', 'g+t': 'support', 'g+p': 'pricing',
  'g+n': 'notifications', 'g+o': 'settings',
  'ctrl+k': 'command-palette', 'escape': 'close-modal'
};

const FILTER_PRESETS = {
  'High Value Clients': { filter: 'active', search: '', minShipments: 10 },
  'New Clients (30 days)': { filter: 'all', search: '', recentOnly: true },
  'Problematic Shipments': { filter: 'all', search: '', problemStatuses: ['Cancelled', 'Delayed'] },
  'Top Performers': { filter: 'active', search: '', sortBy: 'revenue' }
};

const EMAIL_TEMPLATES = [
  { id: 1, name: 'Welcome Email', subject: 'Welcome to ATIRATH Logistics!', body: 'Dear {{name}}, Welcome aboard...' },
  { id: 2, name: 'Shipment Delayed', subject: 'Update on your shipment {{trackingId}}', body: 'Dear {{name}}, We regret to inform...' },
  { id: 3, name: 'Payment Reminder', subject: 'Invoice {{invoiceId}} Reminder', body: 'Dear {{name}}, This is a gentle reminder...' },
  { id: 4, name: 'Delivery Confirmation', subject: 'Shipment {{trackingId}} Delivered!', body: 'Dear {{name}}, Great news...' }
];

// =========================================
// MAIN COMPONENT
// =========================================
export default function Admin() {
  const { logout, currentUser } = useAuth();
  const navigate = useNavigate();
  
  // =========================================
  // CORE STATES
  // =========================================
  const [activeTab, setActiveTab] = useState("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // 🌙 Dark Mode
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('adminDarkMode') === 'true');
  
  // ⌨️ Command Palette
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [commandSearch, setCommandSearch] = useState("");
  const commandInputRef = useRef(null);
  
  // 📊 Multi-tab management
  const [openTabs, setOpenTabs] = useState([{ id: 'dashboard', label: 'Dashboard', icon: '📊' }]);
  const [tabHistory, setTabHistory] = useState([]);
  
  // Real-time Data States
  const [shipments, setShipments] = useState([]);
  const [users, setUsers] = useState([]);
  const [wallets, setWallets] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [hubs, setHubs] = useState([]);
  const [trackingEvents, setTrackingEvents] = useState([]);
  const [systemSettings, setSystemSettings] = useState({ 
    baseRate: 10, gst: 18, notice: "", 
    companyName: "ATIRATH Logistics", supportEmail: "support@atirath.com", 
    supportPhone: "+91 9876543210", maintenanceMode: false, allowRegistrations: true 
  });
  
  // 🚀 NEW MODULE STATES
  const [rateCards, setRateCards] = useState([]);
  const [broadcasts, setBroadcasts] = useState([]);
  const [ticketFilter, setTicketFilter] = useState("all");
  const [auditLogs, setAuditLogs] = useState([]);
  const [emailTemplates, setEmailTemplates] = useState(EMAIL_TEMPLATES);
  const [fuelRecords, setFuelRecords] = useState([]);
  const [maintenanceRecords, setMaintenanceRecords] = useState([]);
  const [apiKeys, setApiKeys] = useState([]);
  
  // Modal States
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState(""); 
  const [selectedItem, setSelectedItem] = useState(null);
  const [formData, setFormData] = useState({});
  const [notification, setNotification] = useState(null);
  const [modalLoading, setModalLoading] = useState(false);
  
  // Advanced Filter States
  const [selectedClients, setSelectedClients] = useState([]);
  const [clientFilter, setClientFilter] = useState("all");
  const [selectedShipments, setSelectedShipments] = useState([]);
  const [shipmentFilter, setShipmentFilter] = useState("all");
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [activePreset, setActivePreset] = useState(null);
  
  // 🧠 AI Insights State
  const [aiInsights, setAiInsights] = useState([]);
  const [showAiPanel, setShowAiPanel] = useState(false);
  
  // =========================================
  // SECURITY & INITIALIZATION
  // =========================================
  useEffect(() => {
    if (!currentUser) {
      navigate("/admin/login", { replace: true });
      return;
    }
    fetchInitialData();
    const cleanup = setupRealTimeListeners();
    generateAiInsights();
    
    return () => { if (cleanup) cleanup(); };
    // eslint-disable-next-line
  }, [currentUser, navigate]);

  useEffect(() => {
    document.documentElement.classList.toggle('dark-mode', darkMode);
    localStorage.setItem('adminDarkMode', darkMode);
  }, [darkMode]);

  // Debounce search
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedSearch(searchQuery), 300);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // ⌨️ Keyboard Shortcuts Handler
  useEffect(() => {
    let lastKey = '';
    let lastKeyTime = 0;
    
    const handleKeyDown = (e) => {
      // Command Palette (Ctrl+K)
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setShowCommandPalette(prev => !prev);
        setTimeout(() => commandInputRef.current?.focus(), 100);
        return;
      }
      
      // Escape to close
      if (e.key === 'Escape') {
        if (showModal) setShowModal(false);
        if (showCommandPalette) setShowCommandPalette(false);
        if (showAiPanel) setShowAiPanel(false);
        return;
      }
      
      // 🛡️ THEME GUARD — strips hardcoded inline colors so both themes are always readable
useEffect(() => {
  const root = document.querySelector(".admin-page");
  if (!root) return;

  const stripInlineColors = () => {
    root.querySelectorAll("[style]").forEach((el) => {
      el.style.removeProperty("background");
      el.style.removeProperty("background-color");
      el.style.removeProperty("color");
      el.style.removeProperty("-webkit-text-fill-color");
    });
  };

  stripInlineColors();
  const observer = new MutationObserver(stripInlineColors);
  observer.observe(root, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["style"],
  });

  return () => observer.disconnect();
}, [activeTab, darkMode]);

      // Go-to shortcuts (g + key)
      const now = Date.now();
      if (lastKey === 'g' && now - lastKeyTime < 1000) {
        const shortcuts = {
          'd': 'dashboard', 'c': 'clients', 's': 'shipments',
          'f': 'fleet', 'h': 'hubs', 'a': 'analytics',
          'r': 'reports', 't': 'support', 'p': 'pricing',
          'n': 'notifications', 'o': 'settings', 'l': 'audit'
        };
        if (shortcuts[e.key]) {
          e.preventDefault();
          handleTabChange(shortcuts[e.key]);
        }
        lastKey = '';
        return;
      }
      
      if (e.key === 'g') {
        lastKey = 'g';
        lastKeyTime = now;
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showModal, showCommandPalette, showAiPanel]);

  // =========================================
  // UTILITY FUNCTIONS
  // =========================================
  const showNotification = (message, type = "success", duration = 4000) => {
    setNotification({ message, type, id: Date.now() });
    setTimeout(() => setNotification(null), duration);
  };

  const logAuditAction = async (action, details, targetType = null, targetId = null) => {
    try {
      await addDoc(collection(db, "audit_logs"), {
        action, details,
        performedBy: currentUser?.email || 'Unknown',
        performedById: currentUser?.uid,
        targetType, targetId,
        timestamp: serverTimestamp(),
        userAgent: navigator.userAgent
      });
    } catch (error) {
      console.error("Audit log error:", error);
    }
  };

  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    setTabHistory(prev => [...prev.slice(-9), activeTab]);
    
    // Add to open tabs if not exists
    if (!openTabs.find(t => t.id === tabId)) {
      const tabConfig = {
        dashboard: { label: 'Dashboard', icon: '📊' },
        clients: { label: 'Clients', icon: '👥' },
        shipments: { label: 'Shipments', icon: '🚚' },
        fleet: { label: 'Fleet', icon: '🚛' },
        hubs: { label: 'Hubs', icon: '🏭' },
        analytics: { label: 'Analytics', icon: '📈' },
        reports: { label: 'Reports', icon: '📊' },
        pricing: { label: 'Pricing', icon: '💲' },
        support: { label: 'Support', icon: '🎫' },
        notifications: { label: 'Broadcast', icon: '📢' },
        audit: { label: 'Audit', icon: '📋' },
        settings: { label: 'Settings', icon: '⚙️' },
        communications: { label: 'Comms', icon: '📧' },
        routes: { label: 'Routes', icon: '🗺️' },
        'fleet-health': { label: 'Fleet Health', icon: '🔧' },
        'system-health': { label: 'System', icon: '🖥️' }
      };
      setOpenTabs(prev => [...prev, { id: tabId, ...tabConfig[tabId] }]);
    }
  };

  const closeTab = (tabId, e) => {
    e?.stopPropagation();
    const newTabs = openTabs.filter(t => t.id !== tabId);
    setOpenTabs(newTabs);
    if (activeTab === tabId && newTabs.length > 0) {
      setActiveTab(newTabs[newTabs.length - 1].id);
    }
  };

  // =========================================
  // AI INSIGHTS GENERATOR
  // =========================================
  const generateAiInsights = useCallback(() => {
    const insights = [];
    
    // Revenue trend analysis
    const totalRevenue = shipments.filter(s => s.status === "Delivered").reduce((sum, s) => sum + (Number(s.amount) || 0), 0);
    if (totalRevenue > 1000000) {
      insights.push({
        type: 'success', icon: '💰',
        title: 'Strong Revenue Performance',
        message: `You've generated ₹${(totalRevenue/100000).toFixed(1)}L this period. Consider expanding fleet capacity.`,
        priority: 'high'
      });
    }
    
    // Unassigned shipments alert
    const unassigned = shipments.filter(s => !s.assignedDriverId && ['Booked', 'Picked Up'].includes(s.status));
    if (unassigned.length > 5) {
      insights.push({
        type: 'warning', icon: '⚠️',
        title: 'Critical: Unassigned Shipments',
        message: `${unassigned.length} shipments waiting for driver assignment. This impacts delivery SLA.`,
        priority: 'urgent', action: () => { setActiveTab('shipments'); setShipmentFilter('Booked'); }
      });
    }
    
    // Driver utilization
    const busyDrivers = drivers.filter(d => d.status === 'busy').length;
    const availableDrivers = drivers.filter(d => d.status === 'available').length;
    if (busyDrivers > 0 && availableDrivers === 0) {
      insights.push({
        type: 'warning', icon: '🚛',
        title: 'Fleet Capacity Alert',
        message: 'All drivers are busy. Consider adding more drivers to meet demand.',
        priority: 'high', action: () => setActiveTab('fleet')
      });
    }
    
    // Pending tickets
    const openTickets = tickets.filter(t => t.status === 'Open').length;
    if (openTickets > 3) {
      insights.push({
        type: 'info', icon: '🎫',
        title: 'Support Backlog',
        message: `${openTickets} support tickets pending. Average response time may be affected.`,
        priority: 'medium', action: () => setActiveTab('support')
      });
    }
    
    // High-value clients at risk
    const inactiveHighValue = users.filter(u => 
      u.totalShipments > 10 && 
      !shipments.some(s => s.userId === u.id && s.createdAt > new Date(Date.now() - 30*24*60*60*1000))
    );
    if (inactiveHighValue.length > 0) {
      insights.push({
        type: 'warning', icon: '👥',
        title: 'Client Retention Alert',
        message: `${inactiveHighValue.length} high-value clients haven't shipped in 30 days. Send re-engagement campaign.`,
        priority: 'high', action: () => setActiveTab('clients')
      });
    }
    
    // Route efficiency
    const cancelled = shipments.filter(s => s.status === 'Cancelled').length;
    if (cancelled > shipments.length * 0.1 && shipments.length > 10) {
      insights.push({
        type: 'error', icon: '❌',
        title: 'High Cancellation Rate',
        message: `${((cancelled/shipments.length)*100).toFixed(1)}% cancellation rate detected. Investigate root causes.`,
        priority: 'high', action: () => setActiveTab('analytics')
      });
    }
    
    // Positive: Good delivery rate
    const delivered = shipments.filter(s => s.status === 'Delivered').length;
    if (delivered > 0 && (delivered/shipments.length) > 0.85) {
      insights.push({
        type: 'success', icon: '✅',
        title: 'Excellent Delivery Performance',
        message: `${((delivered/shipments.length)*100).toFixed(1)}% on-time delivery rate. Outstanding work!`,
        priority: 'low'
      });
    }
    
    setAiInsights(insights);
  }, [shipments, drivers, tickets, users]);

  // Regenerate insights when data changes
  useEffect(() => {
    generateAiInsights();
  }, [shipments, drivers, tickets, users, generateAiInsights]);

  // =========================================
  // REAL-TIME LISTENERS
  // =========================================
  const setupRealTimeListeners = () => {
    const unsubShipments = onSnapshot(query(collection(db, "shipments"), orderBy("createdAt", "desc")), (snap) => {
      setShipments(snap.docs.map(d => ({ id: d.id, ...d.data(), createdAt: d.data().createdAt?.toDate?.() || new Date() })));
    });
    const unsubTickets = onSnapshot(query(collection(db, "support_tickets"), orderBy("createdAt", "desc")), (snap) => {
      setTickets(snap.docs.map(d => ({ id: d.id, ...d.data(), createdAt: d.data().createdAt?.toDate?.() || new Date() })));
    });
    const unsubDrivers = onSnapshot(collection(db, "drivers"), (snap) => { 
      setDrivers(snap.docs.map(d => ({ id: d.id, ...d.data() }))); 
    });
    const unsubHubs = onSnapshot(collection(db, "hubs"), (snap) => { 
      setHubs(snap.docs.map(d => ({ id: d.id, ...d.data() }))); 
    });
    const unsubEvents = onSnapshot(query(collection(db, "tracking_events"), orderBy("timestamp", "desc"), limit(100)), (snap) => {
      setTrackingEvents(snap.docs.map(d => ({ id: d.id, ...d.data(), timestamp: d.data().timestamp?.toDate?.() || new Date() })));
    });
    const unsubRateCards = onSnapshot(collection(db, "rate_cards"), (snap) => { 
      setRateCards(snap.docs.map(d => ({ id: d.id, ...d.data() }))); 
    });
    const unsubBroadcasts = onSnapshot(query(collection(db, "broadcasts"), orderBy("createdAt", "desc")), (snap) => {
      setBroadcasts(snap.docs.map(d => ({ id: d.id, ...d.data(), createdAt: d.data().createdAt?.toDate?.() || new Date() })));
    });
    const unsubAudit = onSnapshot(query(collection(db, "audit_logs"), orderBy("timestamp", "desc"), limit(100)), (snap) => {
      setAuditLogs(snap.docs.map(d => ({ id: d.id, ...d.data(), timestamp: d.data().timestamp?.toDate?.() || new Date() })));
    });

    return () => { 
      unsubShipments(); unsubTickets(); unsubDrivers(); unsubHubs(); 
      unsubEvents(); unsubRateCards(); unsubBroadcasts(); unsubAudit();
    };
  };

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      const [usersSnap, walletsSnap, settingsSnap, fuelSnap, maintSnap, apiSnap] = await Promise.all([
        getDocs(collection(db, "users")),
        getDocs(collection(db, "wallets")),
        getDocs(query(collection(db, "system_settings"), limit(1))),
        getDocs(collection(db, "fuel_records")).catch(() => ({ docs: [] })),
        getDocs(collection(db, "maintenance_records")).catch(() => ({ docs: [] })),
        getDocs(collection(db, "api_keys")).catch(() => ({ docs: [] }))
      ]);
      
      setUsers(usersSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      setWallets(walletsSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      if (!settingsSnap.empty) setSystemSettings(prev => ({ ...prev, ...settingsSnap.docs[0].data() }));
      setFuelRecords(fuelSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      setMaintenanceRecords(maintSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      setApiKeys(apiSnap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (error) {
      console.error("Error fetching data:", error);
      showNotification("Error loading data", "error");
    } finally {
      setLoading(false);
    }
  };

  // =========================================
  // COMPUTED METRICS (Memoized for performance)
  // =========================================
  const metrics = useMemo(() => {
    const activeClients = users.filter(u => u.status !== "banned").length;
    const activeShipments = shipments.filter(s => ["In Transit", "Booked", "Picked Up"].includes(s.status)).length;
    const openTickets = tickets.filter(t => t.status === "Open").length;
    const totalRevenue = shipments.filter(s => s.status === "Delivered").reduce((sum, s) => sum + (Number(s.amount) || 0), 0);
    const deliveredCount = shipments.filter(s => s.status === "Delivered").length;
    const cancelledCount = shipments.filter(s => s.status === "Cancelled").length;
    const offlineDrivers = drivers.filter(d => d.status === "offline").length;
    const busyDrivers = drivers.filter(d => d.status === "busy").length;
    const availableDrivers = drivers.filter(d => d.status === "available").length;
    const highPriorityTickets = tickets.filter(t => t.priority === "High" || t.priority === "Urgent").length;
    const unassignedShipments = shipments.filter(s => !s.assignedDriverId && ["Booked", "Picked Up"].includes(s.status));
    const avgOrderValue = shipments.length > 0 ? totalRevenue / shipments.length : 0;
    const successRate = shipments.length > 0 ? ((deliveredCount / shipments.length) * 100).toFixed(1) : 0;
    const cancellationRate = shipments.length > 0 ? ((cancelledCount / shipments.length) * 100).toFixed(1) : 0;
    
    return {
      activeClients, activeShipments, openTickets, totalRevenue,
      deliveredCount, cancelledCount, offlineDrivers, busyDrivers, availableDrivers,
      highPriorityTickets, unassignedShipments, avgOrderValue, successRate, cancellationRate,
      totalUsers: users.length, totalShipments: shipments.length, totalDrivers: drivers.length
    };
  }, [users, shipments, tickets, drivers]);

  // =========================================
  // DATA OPERATIONS
  // =========================================
  const exportToCSV = (data, filename) => {
    if (!data || data.length === 0) { 
      showNotification("No data to export", "error"); 
      return; 
    }
    const headers = ["Tracking ID", "Client", "Route", "Weight", "Status", "Amount", "Date"];
    const rows = data.map(s => [
      s.trackingId || s.id, 
      getClientName(s.userId, s.clientName, s.userEmail), 
      `${s.pickupCity || ''} → ${s.dropCity || ''}`, 
      s.weight || 0, 
      s.status, 
      s.amount || 0, 
      s.createdAt?.toLocaleDateString() || new Date().toLocaleDateString()
    ]);
    const csvContent = [headers.join(","), ...rows.map(r => r.map(cell => `"${cell}"`).join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url; 
    link.setAttribute("download", `${filename}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link); 
    link.click(); 
    document.body.removeChild(link);
    showNotification(`Exported ${data.length} records to ${filename}.csv`);
    logAuditAction('EXPORT_DATA', `Exported ${filename} with ${data.length} records`);
  };

  const exportToJSON = (data, filename) => {
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url; 
    link.setAttribute("download", `${filename}_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(link); 
    link.click(); 
    document.body.removeChild(link);
    showNotification(`Exported ${data.length} records to JSON`);
  };

  const getClientName = (userId, fallbackName, fallbackEmail) => {
    if (fallbackName) return fallbackName;
    if (fallbackEmail) return fallbackEmail;
    if (!userId) return "N/A";
    const user = users.find(u => u.id === userId);
    return user?.name || user?.email || "Unknown Client";
  };

  const getWalletBalance = (userId) => { 
    const w = wallets.find(w => w.userId === userId); 
    return w ? w.balance : 0; 
  };

  const getStatusBadge = (status) => {
    const statusClass = { 
      "active": "badge-success", "banned": "badge-danger", "Booked": "badge-warning", 
      "Picked Up": "badge-info", "In Transit": "badge-info", "Out for Delivery": "badge-warning", 
      "Delivered": "badge-success", "Cancelled": "badge-danger", "Open": "badge-warning", 
      "In Progress": "badge-info", "Resolved": "badge-success", "Closed": "badge-secondary", 
      "available": "badge-success", "busy": "badge-warning", "offline": "badge-danger", 
      "Verified": "badge-success", "Pending": "badge-warning", "Rejected": "badge-danger", 
      "Good": "badge-success", "Service Due": "badge-warning", "Critical": "badge-danger",
      "inactive": "badge-secondary"
    }[status] || "badge-secondary";
    return <span className={`badge ${statusClass}`}>{status}</span>;
  };

  const getShipmentTimeline = (shipmentId) => 
    trackingEvents
      .filter(e => e.shipmentId === shipmentId)
      .sort((a, b) => (b.timestamp?.getTime?.() || 0) - (a.timestamp?.getTime?.() || 0))
      .slice(0, 10);
      
  const getAvailableDrivers = () => drivers.filter(d => d.status === "available");
  const getClientShipments = (userId) => shipments.filter(s => s.userId === userId).slice(0, 5);
  const getDriverShipments = (driverId) => shipments.filter(s => s.assignedDriverId === driverId && !["Delivered", "Cancelled"].includes(s.status)).slice(0, 5);

  // =========================================
  // ACTION HANDLERS
  // =========================================
  const handleToggleClientStatus = async (userId, currentStatus) => {
    if (!window.confirm(`Are you sure you want to ${currentStatus === "banned" ? "unblock" : "block"} this client?`)) return;
    try {
      setSaving(true);
      const newStatus = currentStatus === "banned" ? "active" : "banned";
      await updateDoc(doc(db, "users", userId), { status: newStatus, updatedAt: serverTimestamp() });
      showNotification(`Client ${newStatus === "banned" ? "blocked" : "unblocked"} successfully!`, "success");
      logAuditAction('TOGGLE_CLIENT_STATUS', `${newStatus === "banned" ? "Blocked" : "Unblocked"} client`, 'user', userId);
    } catch (error) { 
      showNotification("Failed to update client status", "error"); 
    } finally { 
      setSaving(false); 
    }
  };

  const handleUpdateWallet = async (userId, amount, type) => {
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) { 
      showNotification("Please enter a valid amount greater than 0", "error"); 
      return; 
    }
    try {
      setModalLoading(true);
      const walletQuery = query(collection(db, "wallets"), where("userId", "==", userId));
      const walletSnap = await getDocs(walletQuery);
      const numericAmount = Number(amount);
      const change = type === "add" ? numericAmount : -numericAmount;

      if (!walletSnap.empty) {
        await updateDoc(doc(db, "wallets", walletSnap.docs[0].id), { 
          balance: increment(change), 
          totalRecharged: type === "add" ? increment(numericAmount) : increment(0), 
          updatedAt: serverTimestamp() 
        });
      } else {
        await addDoc(collection(db, "wallets"), { 
          userId, 
          balance: type === "add" ? numericAmount : -numericAmount, 
          totalRecharged: type === "add" ? numericAmount : 0, 
          createdAt: serverTimestamp(), 
          updatedAt: serverTimestamp() 
        });
      }
      await addDoc(collection(db, "notifications"), { 
        userId, 
        message: `Admin has ${type === "add" ? "added" : "deducted"} ₹${amount} to your wallet.`, 
        type: "wallet", amount: numericAmount, action: type, 
        read: false, createdAt: serverTimestamp() 
      });
      await addDoc(collection(db, "transactions"), { 
        userId, type, amount: numericAmount, 
        performedBy: currentUser?.uid, 
        performedByEmail: currentUser?.email, 
        timestamp: serverTimestamp() 
      });
      
      showNotification(`Wallet ${type === "add" ? "credited" : "debited"} successfully! Client notified.`, "success");
      logAuditAction('UPDATE_WALLET', `${type} ₹${amount} to wallet`, 'user', userId);
      setShowModal(false); 
      setFormData({}); 
    } catch (error) { 
      showNotification("Failed to update wallet", "error"); 
    } finally { 
      setModalLoading(false); 
    }
  };

  const handleUpdateShipmentStatus = async (shipmentId, newStatus, assignedDriverId = null) => {
    if (!newStatus) { 
      showNotification("Please select a status", "error"); 
      return; 
    }
    try {
      setModalLoading(true);
      const shipment = shipments.find(s => s.id === shipmentId);
      if (!shipment) { 
        showNotification("Shipment not found", "error"); 
        return; 
      }

      const updateData = { status: newStatus, updatedAt: serverTimestamp() };
      if (assignedDriverId) {
        updateData.assignedDriverId = assignedDriverId;
        updateData.assignedDriverName = drivers.find(d => d.id === assignedDriverId)?.name || "";
      }
      if (newStatus === "Delivered") {
        updateData.deliveredAt = serverTimestamp();
      }

      await updateDoc(doc(db, "shipments", shipmentId), updateData);
      await addDoc(collection(db, "tracking_events"), { 
        shipmentId, userId: shipment?.userId, status: newStatus, 
        location: "Admin Update", 
        description: assignedDriverId 
          ? `Status updated to ${newStatus}. Assigned to driver.` 
          : `Status updated to ${newStatus} by Admin`, 
        performedBy: currentUser?.email, 
        timestamp: serverTimestamp() 
      });

      if (shipment?.userId) {
        await addDoc(collection(db, "notifications"), { 
          userId: shipment.userId, 
          message: `Your shipment ${shipment.trackingId || shipmentId} status updated to ${newStatus}`, 
          type: "shipment", shipmentId, status: newStatus, 
          read: false, createdAt: serverTimestamp() 
        });
      }
      if (assignedDriverId && newStatus === "In Transit") {
        await updateDoc(doc(db, "drivers", assignedDriverId), { 
          status: "busy", currentShipment: shipmentId, updatedAt: serverTimestamp() 
        });
      }

      showNotification(`Shipment status updated to ${newStatus} successfully!`, "success");
      logAuditAction('UPDATE_SHIPMENT_STATUS', `Updated to ${newStatus}`, 'shipment', shipmentId);
      setShowModal(false); 
      setFormData({});
    } catch (error) { 
      showNotification("Failed to update shipment status", "error"); 
    } finally { 
      setModalLoading(false); 
    }
  };

  const handleReplyToTicket = async () => {
    if (!formData.replyMessage || formData.replyMessage.trim() === "") { 
      showNotification("Please enter a reply message", "error"); 
      return; 
    }
    try {
      setModalLoading(true);
      const ticket = tickets.find(t => t.id === selectedItem.id);
      if (!ticket) return;

      await updateDoc(doc(db, "support_tickets", selectedItem.id), { 
        replies: [...(ticket.replies || []), { 
          message: formData.replyMessage.trim(), 
          from: "admin", role: "Support Team", 
          adminEmail: currentUser?.email, 
          createdAt: serverTimestamp() 
        }], 
        status: formData.ticketStatus || ticket.status || "In Progress", 
        lastReplyAt: serverTimestamp(), 
        updatedAt: serverTimestamp() 
      });
      if (ticket.userId) {
        await addDoc(collection(db, "notifications"), { 
          userId: ticket.userId, 
          message: `New reply to your ticket: ${ticket.subject || "Support Ticket"}`, 
          type: "ticket", ticketId: selectedItem.id, 
          read: false, createdAt: serverTimestamp() 
        });
      }
      showNotification("Reply sent successfully! Client notified.", "success");
      logAuditAction('REPLY_TO_TICKET', `Replied to ticket`, 'ticket', selectedItem.id);
      setShowModal(false); 
      setFormData({});
    } catch (error) { 
      showNotification("Failed to send reply", "error"); 
    } finally { 
      setModalLoading(false); 
    }
  };

  const handleTicketStatusChange = async (ticketId, newStatus) => {
    try { 
      await updateDoc(doc(db, "support_tickets", ticketId), { 
        status: newStatus, updatedAt: serverTimestamp() 
      }); 
      showNotification("Ticket status updated", "success");
      logAuditAction('UPDATE_TICKET_STATUS', `Changed to ${newStatus}`, 'ticket', ticketId);
    } catch (error) { 
      showNotification("Failed to update ticket", "error"); 
    }
  };

  const handleAddDriver = async () => {
    if (!formData.name || !formData.phone || !formData.vehicleNumber) { 
      showNotification("Please fill all required fields", "error"); 
      return; 
    }
    try {
      setModalLoading(true);
      await addDoc(collection(db, "drivers"), { 
        name: formData.name.trim(), 
        phone: formData.phone.trim(), 
        vehicleNumber: formData.vehicleNumber.trim().toUpperCase(), 
        vehicleType: formData.vehicleType || "Truck", 
        licenseNumber: formData.licenseNumber?.trim() || "", 
        status: "available", vehicleHealth: "Good", 
        currentLocation: "", currentShipment: null, 
        assignedShipments: [], rating: 5.0, totalDeliveries: 0, 
        createdAt: serverTimestamp(), updatedAt: serverTimestamp() 
      });
      showNotification("Driver added successfully!", "success"); 
      logAuditAction('ADD_DRIVER', `Added driver: ${formData.name}`, 'driver');
      setShowModal(false); 
      setFormData({});
    } catch (error) { 
      showNotification("Failed to add driver", "error"); 
    } finally { 
      setModalLoading(false); 
    }
  };

  const handleUpdateDriverStatus = async (driverId, newStatus) => {
    try { 
      await updateDoc(doc(db, "drivers", driverId), { 
        status: newStatus, updatedAt: serverTimestamp() 
      }); 
      showNotification("Driver status updated", "success");
      logAuditAction('UPDATE_DRIVER_STATUS', `Changed to ${newStatus}`, 'driver', driverId);
    } catch (error) { 
      showNotification("Failed to update driver", "error"); 
    }
  };

  const handleUpdateDriverVehicleHealth = async (driverId, healthStatus) => {
    try { 
      await updateDoc(doc(db, "drivers", driverId), { 
        vehicleHealth: healthStatus, updatedAt: serverTimestamp() 
      }); 
      showNotification("Vehicle health status updated!", "success");
      logAuditAction('UPDATE_VEHICLE_HEALTH', `Changed to ${healthStatus}`, 'driver', driverId);
    } catch (error) { 
      showNotification("Failed to update vehicle health", "error"); 
    }
  };

  const handleAddHub = async () => {
    if (!formData.name || !formData.location) { 
      showNotification("Please fill required fields", "error"); 
      return; 
    }
    try {
      setModalLoading(true);
      await addDoc(collection(db, "hubs"), { 
        name: formData.name.trim(), 
        location: formData.location.trim(), 
        address: formData.address?.trim() || "", 
        contactNumber: formData.contactNumber?.trim() || "", 
        capacity: Number(formData.capacity) || 1000, 
        currentLoad: 0, status: "active", 
        managerName: "", operatingHours: "24/7", 
        createdAt: serverTimestamp(), updatedAt: serverTimestamp() 
      });
      showNotification("Hub added successfully!", "success"); 
      logAuditAction('ADD_HUB', `Added hub: ${formData.name}`, 'hub');
      setShowModal(false); 
      setFormData({});
    } catch (error) { 
      showNotification("Failed to add hub", "error"); 
    } finally { 
      setModalLoading(false); 
    }
  };

  const handleSaveSettings = async () => {
    try { 
      setSaving(true); 
      await setDoc(doc(db, "system_settings", "global_config"), systemSettings, { merge: true }); 
      showNotification("Settings saved successfully!", "success");
      logAuditAction('UPDATE_SETTINGS', 'Updated system settings', 'settings');
    } catch (error) { 
      showNotification("Failed to save settings", "error"); 
    } finally { 
      setSaving(false); 
    }
  };

  const handleLogout = async () => {
    if (window.confirm("Are you sure you want to logout?")) {
      try { 
        await logout(); 
        logAuditAction('LOGOUT', 'Admin logged out', 'auth');
        navigate("/admin/login", { replace: true }); 
      } catch (error) { 
        showNotification("Logout failed", "error"); 
      }
    }
  };

  const handleKYCVerification = async (userId, newKycStatus) => {
    try { 
      await updateDoc(doc(db, "users", userId), { 
        kycStatus: newKycStatus, 
        kycVerifiedAt: serverTimestamp(), 
        verifiedBy: currentUser?.email 
      }); 
      showNotification(`Client KYC marked as ${newKycStatus}!`, "success");
      logAuditAction('KYC_VERIFICATION', `Marked as ${newKycStatus}`, 'user', userId);
    } catch (error) { 
      showNotification("Failed to update KYC status", "error"); 
    }
  };

  const handleBulkClientAction = async (action) => {
    if (selectedClients.length === 0) { 
      showNotification("Please select at least one client", "error"); 
      return; 
    }
    if (!window.confirm(`Are you sure you want to ${action} ${selectedClients.length} client(s)?`)) return;
    try {
      setSaving(true); 
      const batch = writeBatch(db); 
      const newStatus = action === "block" ? "banned" : "active";
      selectedClients.forEach(id => { 
        const userRef = doc(db, "users", id); 
        batch.update(userRef, { status: newStatus, updatedAt: serverTimestamp() }); 
      });
      await batch.commit(); 
      showNotification(`${selectedClients.length} clients ${action}ed successfully!`, "success"); 
      logAuditAction('BULK_CLIENT_ACTION', `${action}ed ${selectedClients.length} clients`, 'user');
      setSelectedClients([]);
    } catch (error) { 
      showNotification("Failed to perform bulk action", "error"); 
    } finally { 
      setSaving(false); 
    }
  };

  const handleContactClient = (client, method) => {
    if (method === "email" && client.email) {
      window.open(`mailto:${client.email}?subject=ATIRATH Logistics: Account Update`);
      logAuditAction('CONTACT_CLIENT', `Emailed client`, 'user', client.id);
    } else if (method === "phone" && client.phone) {
      window.open(`tel:${client.phone}`);
      logAuditAction('CONTACT_CLIENT', `Called client`, 'user', client.id);
    } else {
      showNotification("Contact information not available", "error");
    }
  };

  const toggleClientSelection = (clientId) => 
    setSelectedClients(prev => prev.includes(clientId) ? prev.filter(id => id !== clientId) : [...prev, clientId]);
    
  const toggleSelectAll = (filteredUsers) => { 
    if (selectedClients.length === filteredUsers.length && filteredUsers.length > 0) {
      setSelectedClients([]); 
    } else {
      setSelectedClients(filteredUsers.map(u => u.id)); 
    }
  };

  const getShipmentDetails = (shipmentId) => {
    const shipment = shipments.find(s => s.id === shipmentId);
    if (!shipment) return null;
    return { 
      ...shipment, 
      driver: shipment.assignedDriverId ? drivers.find(d => d.id === shipment.assignedDriverId) : null, 
      client: users.find(u => u.id === shipment.userId), 
      timeline: getShipmentTimeline(shipmentId) 
    };
  };

  const handleBulkShipmentAction = async (action, newStatus = null) => {
    if (selectedShipments.length === 0) { 
      showNotification("Please select at least one shipment", "error"); 
      return; 
    }
    if (!window.confirm(`Are you sure you want to ${action} ${selectedShipments.length} shipment(s)?`)) return;
    try {
      setSaving(true); 
      const batch = writeBatch(db);
      selectedShipments.forEach(id => { 
        const shipmentRef = doc(db, "shipments", id); 
        const updateData = { updatedAt: serverTimestamp() }; 
        if (newStatus) updateData.status = newStatus; 
        batch.update(shipmentRef, updateData); 
      });
      await batch.commit(); 
      showNotification(`${selectedShipments.length} shipments ${action}ed successfully!`, "success"); 
      logAuditAction('BULK_SHIPMENT_ACTION', `${action}ed ${selectedShipments.length} shipments`, 'shipment');
      setSelectedShipments([]);
    } catch (error) { 
      showNotification("Failed to perform bulk action", "error"); 
    } finally { 
      setSaving(false); 
    }
  };

  const toggleShipmentSelection = (shipmentId) => 
    setSelectedShipments(prev => prev.includes(shipmentId) ? prev.filter(id => id !== shipmentId) : [...prev, shipmentId]);
    
  const toggleSelectAllShipments = (filteredShipments) => { 
    if (selectedShipments.length === filteredShipments.length && filteredShipments.length > 0) {
      setSelectedShipments([]); 
    } else {
      setSelectedShipments(filteredShipments.map(s => s.id)); 
    }
  };
  
  const handlePrintLabel = (shipment) => { 
    showNotification("Generating shipping label...", "info"); 
    setTimeout(() => window.print(), 500); 
  };

  // =========================================
  // COMMAND PALETTE COMMANDS
  // =========================================
  const commandPaletteCommands = useMemo(() => {
    const commands = [
      { id: 'dashboard', label: 'Go to Dashboard', icon: '📊', action: () => handleTabChange('dashboard'), category: 'Navigation' },
      { id: 'clients', label: 'Go to Clients', icon: '👥', action: () => handleTabChange('clients'), category: 'Navigation' },
      { id: 'shipments', label: 'Go to Shipments', icon: '🚚', action: () => handleTabChange('shipments'), category: 'Navigation' },
      { id: 'fleet', label: 'Go to Fleet', icon: '🚛', action: () => handleTabChange('fleet'), category: 'Navigation' },
      { id: 'analytics', label: 'Go to Analytics', icon: '📈', action: () => handleTabChange('analytics'), category: 'Navigation' },
      { id: 'reports', label: 'Go to Reports', icon: '📊', action: () => handleTabChange('reports'), category: 'Navigation' },
      { id: 'settings', label: 'Go to Settings', icon: '⚙️', action: () => handleTabChange('settings'), category: 'Navigation' },
      { id: 'support', label: 'Go to Support', icon: '🎫', action: () => handleTabChange('support'), category: 'Navigation' },
      { id: 'add-driver', label: 'Add New Driver', icon: '🚛', action: () => { setModalType('add-driver'); setFormData({}); setShowModal(true); setShowCommandPalette(false); }, category: 'Actions' },
      { id: 'add-hub', label: 'Add New Hub', icon: '🏭', action: () => { setModalType('add-hub'); setFormData({}); setShowModal(true); setShowCommandPalette(false); }, category: 'Actions' },
      { id: 'add-rate', label: 'Add Rate Card', icon: '💲', action: () => { setModalType('add-rate-card'); setFormData({ basePrice: 100, perKg: 10, minWeight: 1, status: 'active' }); setShowModal(true); setShowCommandPalette(false); }, category: 'Actions' },
      { id: 'export-shipments', label: 'Export Shipments CSV', icon: '📥', action: () => { exportToCSV(shipments, 'all_shipments'); setShowCommandPalette(false); }, category: 'Actions' },
      { id: 'export-clients', label: 'Export Clients CSV', icon: '📥', action: () => { exportToCSV(users, 'all_clients'); setShowCommandPalette(false); }, category: 'Actions' },
      { id: 'dark-mode', label: darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode', icon: darkMode ? '☀️' : '🌙', action: () => { setDarkMode(!darkMode); setShowCommandPalette(false); }, category: 'Settings' },
      { id: 'logout', label: 'Logout', icon: '🚪', action: () => { handleLogout(); setShowCommandPalette(false); }, category: 'Settings' },
    ];
    
    // Add shipment quick actions
    shipments.slice(0, 5).forEach(s => {
      commands.push({
        id: `ship-${s.id}`,
        label: `Update Shipment ${s.trackingId || s.id.slice(0, 10)}`,
        icon: '📦',
        action: () => { setSelectedItem(s); setModalType('update-status'); setFormData({}); setShowModal(true); setShowCommandPalette(false); },
        category: 'Quick Actions'
      });
    });
    
    return commands;
  }, [shipments, darkMode]);

  const filteredCommands = commandPaletteCommands.filter(cmd => 
    cmd.label.toLowerCase().includes(commandSearch.toLowerCase()) ||
    cmd.category.toLowerCase().includes(commandSearch.toLowerCase())
  );

  const executeCommand = (command) => {
    command.action();
    setShowCommandPalette(false);
    setCommandSearch("");
  };

  // =========================================
  // LOADING STATE
  // =========================================
  if (loading) {
    return (
      <div className="admin-loading">
        <div className="loading-logo">
          <img src={logoImage} alt="Loading" style={{ width: '100px', marginBottom: '24px' }} />
        </div>
        <div className="spinner-large"></div>
        <p style={{ color: '#000', marginTop: '16px', fontWeight: 600 }}>Loading Admin Dashboard...</p>
        <p style={{ color: '#64748b', fontSize: '14px' }}>Initializing real-time connections...</p>
      </div>
    );
  }

  // =========================================
  // RENDER CONTENT (By Tab)
  // =========================================
  const renderContent = () => {
    switch (activeTab) {
      // =========================================
      // DASHBOARD TAB
      // =========================================
      case "dashboard": {
        const recentActivities = trackingEvents.slice(0, 5);
        const topHubs = hubs.slice(0, 3);
        
        const chartData = [
          { name: 'Mon', revenue: 25000, shipments: 12 }, 
          { name: 'Tue', revenue: 32000, shipments: 18 },
          { name: 'Wed', revenue: 28000, shipments: 15 }, 
          { name: 'Thu', revenue: 45000, shipments: 22 },
          { name: 'Fri', revenue: 52000, shipments: 28 }, 
          { name: 'Sat', revenue: 61000, shipments: 35 }, 
          { name: 'Sun', revenue: 38000, shipments: 20 },
        ];

        return (
          <>
            {notification && <div className={`toast toast-${notification.type}`}>{notification.message}</div>}
            
            {/* 🧠 AI Insights Banner */}
            {aiInsights.filter(i => i.priority === 'urgent').length > 0 && (
              <div className="ai-insight-banner urgent">
                <div className="ai-banner-content">
                  <span className="ai-icon">🧠</span>
                  <div className="ai-text">
                    <strong>AI Alert:</strong> {aiInsights.find(i => i.priority === 'urgent')?.message}
                  </div>
                </div>
                {aiInsights.find(i => i.priority === 'urgent')?.action && (
                  <button className="btn-sm btn-primary" onClick={aiInsights.find(i => i.priority === 'urgent').action}>
                    Take Action
                  </button>
                )}
              </div>
            )}
            
            {metrics.unassignedShipments.length > 0 && (
              <div className="broadcast-notice" style={{ background: '#fee2e2', borderColor: '#ef4444', color: '#991b1b' }}>
                <span>⚠️ <strong>Action Required:</strong> {metrics.unassignedShipments.length} shipment(s) are pending driver assignment!</span>
                <button className="btn-sm btn-danger" onClick={() => { setActiveTab("shipments"); setShipmentFilter("Booked"); }}>
                  Assign Now
                </button>
              </div>
            )}

            {/* Main Stats Grid */}
            <div className="stats-grid">
              <div className="stat-card stat-primary">
                <div className="stat-icon">👥</div>
                <div className="stat-info">
                  <div className="stat-label">Active Clients</div>
                  <div className="stat-value">{metrics.activeClients}</div>
                  <div className="stat-subtitle">Total: {metrics.totalUsers}</div>
                </div>
              </div>
              <div className="stat-card stat-warning">
                <div className="stat-icon">🚚</div>
                <div className="stat-info">
                  <div className="stat-label">Active Shipments</div>
                  <div className="stat-value">{metrics.activeShipments}</div>
                  <div className="stat-subtitle">{metrics.successRate}% success rate</div>
                </div>
              </div>
              <div className="stat-card stat-danger">
                <div className="stat-icon">🎫</div>
                <div className="stat-info">
                  <div className="stat-label">Pending Tickets</div>
                  <div className="stat-value">{metrics.openTickets}</div>
                  <div className="stat-subtitle">{metrics.highPriorityTickets} high priority</div>
                </div>
              </div>
              <div className="stat-card stat-success">
                <div className="stat-icon">💰</div>
                <div className="stat-info">
                  <div className="stat-label">Total Revenue</div>
                  <div className="stat-value">₹{(metrics.totalRevenue / 100000).toFixed(2)}L</div>
                  <div className="stat-subtitle">{metrics.deliveredCount} deliveries</div>
                </div>
              </div>
            </div>

            {systemSettings.notice && (
              <div className="broadcast-notice">
                <span>📢 {systemSettings.notice}</span>
                <button className="btn-sm btn-danger" onClick={() => { 
                  setSystemSettings({...systemSettings, notice: ""}); 
                  handleSaveSettings(); 
                }}>
                  Dismiss
                </button>
              </div>
            )}
            
            {/* Two-column layout */}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px' }}>
              {/* Recent Shipments */}
              <div className="admin-section" style={{ marginBottom: 0 }}>
                <div className="section-header">
                  <h2 className="section-title">Recent Shipments</h2>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button className="btn-xs btn-secondary" onClick={() => exportToCSV(shipments.slice(0, 5), 'recent_shipments')}>
                      📥 Export
                    </button>
                    <button className="btn-sm btn-primary" onClick={() => setActiveTab("shipments")}>
                      View All
                    </button>
                  </div>
                </div>
                <div className="table-wrapper">
                  <table>
                    <thead>
                      <tr>
                        <th>Tracking ID</th>
                        <th>Client</th>
                        <th>Route</th>
                        <th>Status</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {shipments.slice(0, 5).map((s) => (
                        <tr key={s.id}>
                          <td><span className="mono-text">{s.trackingId || s.id.slice(0, 10)}</span></td>
                          <td>{getClientName(s.userId, s.clientName, s.userEmail)}</td>
                          <td>{s.pickupCity || 'N/A'} → {s.dropCity || 'N/A'}</td>
                          <td>{getStatusBadge(s.status)}</td>
                          <td>
                            <button 
                              className="btn-xs btn-primary" 
                              onClick={() => { 
                                setSelectedItem(s); 
                                setModalType("update-status"); 
                                setFormData({}); 
                                setShowModal(true); 
                              }}
                            >
                              Update
                            </button>
                          </td>
                        </tr>
                      ))}
                      {shipments.length === 0 && <tr><td colSpan="5" className="empty-cell">No shipments found</td></tr>}
                    </tbody>
                  </table>
                </div>
              </div>
              
              {/* Right Column: Quick Actions + AI Insights + Activity */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                {/* Quick Actions */}
                <div className="admin-section" style={{ marginBottom: 0 }}>
                  <h2 className="section-title" style={{ fontSize: '16px', marginBottom: '16px' }}>⚡ Quick Actions</h2>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <button className="btn-sm btn-primary" onClick={() => { setModalType("add-driver"); setFormData({}); setShowModal(true); }}>🚛 Add Driver</button>
                    <button className="btn-sm btn-secondary" onClick={() => setActiveTab("clients")}>👥 Manage Funds</button>
                    <button className="btn-sm btn-secondary" onClick={() => setActiveTab("support")}>🎫 View Tickets</button>
                    <button className="btn-sm btn-secondary" onClick={() => setActiveTab("hubs")}>🏭 Add Hub</button>
                    <button className="btn-sm btn-secondary" onClick={() => setShowCommandPalette(true)}>⌘ Command Palette</button>
                    <button className="btn-sm btn-secondary" onClick={() => setShowAiPanel(!showAiPanel)}>🧠 AI Insights</button>
                  </div>
                </div>
                
                {/* AI Insights Panel */}
                {showAiPanel && aiInsights.length > 0 && (
                  <div className="admin-section ai-insights-panel" style={{ marginBottom: 0, background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                      <h2 className="section-title" style={{ fontSize: '16px', margin: 0 }}>🧠 AI Insights</h2>
                      <button className="btn-xs btn-secondary" onClick={() => setShowAiPanel(false)}>✕</button>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '280px', overflowY: 'auto' }}>
                      {aiInsights.slice(0, 4).map((insight, idx) => (
                        <div key={idx} className={`ai-insight-item ai-${insight.type}`} style={{
                          padding: '12px', borderRadius: '8px', background: 'white',
                          border: `1px solid ${insight.type === 'urgent' ? '#ef4444' : insight.type === 'warning' ? '#f59e0b' : insight.type === 'success' ? '#10b981' : '#3b82f6'}`,
                          display: 'flex', gap: '10px', alignItems: 'flex-start'
                        }}>
                          <span style={{ fontSize: '20px' }}>{insight.icon}</span>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 600, fontSize: '13px', marginBottom: '4px' }}>{insight.title}</div>
                            <div style={{ fontSize: '12px', color: '#475569' }}>{insight.message}</div>
                            {insight.action && (
                              <button 
                                className="btn-xs btn-primary" 
                                style={{ marginTop: '6px' }}
                                onClick={insight.action}
                              >
                                Take Action →
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Urgent Alerts */}
                <div className="admin-section" style={{ marginBottom: 0, borderLeft: '4px solid var(--danger)' }}>
                  <h2 className="section-title" style={{ fontSize: '16px', marginBottom: '12px', color: 'var(--danger)' }}>⚠️ Urgent Alerts</h2>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '14px' }}>Offline Drivers</span>
                      <span className="badge badge-danger">{metrics.offlineDrivers}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '14px' }}>High Priority Tickets</span>
                      <span className="badge badge-warning">{metrics.highPriorityTickets}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '14px' }}>Pending Assignments</span>
                      <span className="badge badge-danger">{metrics.unassignedShipments.length}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '14px' }}>Cancellation Rate</span>
                      <span className={`badge ${parseFloat(metrics.cancellationRate) > 10 ? 'badge-danger' : 'badge-success'}`}>
                        {metrics.cancellationRate}%
                      </span>
                    </div>
                  </div>
                </div>
                
                {/* Recent Activity */}
                <div className="admin-section" style={{ marginBottom: 0 }}>
                  <h2 className="section-title" style={{ fontSize: '16px', marginBottom: '12px' }}>🕒 Recent Activity</h2>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '250px', overflowY: 'auto' }}>
                    {recentActivities.length > 0 ? recentActivities.map((activity, idx) => (
                      <div key={idx} style={{ fontSize: '13px', padding: '8px', background: '#f8fafc', borderRadius: '6px' }}>
                        <div style={{ fontWeight: '600', color: '#0f172a', marginBottom: '4px' }}>
                          {activity.status === "Delivered" ? "✅" : "🚚"} {activity.description}
                        </div>
                        <div style={{ color: '#64748b', fontSize: '11px' }}>
                          {activity.timestamp?.toLocaleString() || 'Just now'}
                        </div>
                      </div>
                    )) : <p className="text-muted" style={{ fontSize: '13px' }}>No recent activity.</p>}
                  </div>
                </div>
              </div>
            </div>

            {/* Weekly Revenue Chart */}
            <div className="admin-section" style={{ marginTop: '24px' }}>
              <div className="section-header">
                <h2 className="section-title">📈 Weekly Revenue Trend</h2>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button className="btn-xs btn-secondary" onClick={() => exportToCSV(chartData, 'weekly_revenue')}>📥 CSV</button>
                  <button className="btn-xs btn-secondary" onClick={() => exportToJSON(chartData, 'weekly_revenue')}>📥 JSON</button>
                </div>
              </div>
              <div style={{ height: '300px', width: '100%' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="name" stroke="#64748b" fontSize={12} />
                    <YAxis yAxisId="left" stroke="#64748b" fontSize={12} tickFormatter={(value) => `₹${value/1000}k`} />
                    <YAxis yAxisId="right" orientation="right" stroke="#64748b" fontSize={12} />
                    <Tooltip cursor={{ fill: '#f1f5f9' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }} />
                    <Legend />
                    <Bar yAxisId="left" dataKey="revenue" fill="#2563eb" radius={[4, 4, 0, 0]} name="Revenue" />
                    <Line yAxisId="right" type="monotone" dataKey="shipments" stroke="#10b981" strokeWidth={3} name="Shipments" />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Live Fleet Map */}
            <div className="admin-section" style={{ marginTop: '24px' }}>
              <div className="section-header">
                <h2 className="section-title">🗺️ Live Fleet Tracking</h2>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <span className="badge badge-success">{metrics.availableDrivers} Available</span>
                  <span className="badge badge-warning">{metrics.busyDrivers} Busy</span>
                  <span className="badge badge-danger">{metrics.offlineDrivers} Offline</span>
                </div>
              </div>
              <div style={{ height: '400px', background: '#f1f5f9', borderRadius: '8px', overflow: 'hidden' }}>
                <MapContainer 
                  center={[20.5937, 78.9629]} 
                  zoom={5} 
                  style={{ height: '100%', width: '100%' }}
                >
                  <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                  {drivers.map(driver => (
                    <Marker 
                      key={driver.id} 
                      position={[
                        driver.currentLocation?.lat || 20.5937 + (Math.random() - 0.5) * 10, 
                        driver.currentLocation?.lng || 78.9629 + (Math.random() - 0.5) * 10
                      ]}
                    >
                      <Popup>
                        <strong>{driver.name}</strong><br/>
                        {driver.vehicleNumber} | {driver.vehicleType}<br/>
                        Status: {driver.status}<br/>
                        Phone: {driver.phone}
                      </Popup>
                    </Marker>
                  ))}
                  {hubs.map(hub => (
                    <Marker 
                      key={`hub-${hub.id}`}
                      position={[
                        hub.location?.lat || 20.5937 + (Math.random() - 0.5) * 5,
                        hub.location?.lng || 78.9629 + (Math.random() - 0.5) * 5
                      ]}
                    >
                      <Popup>
                        <strong>🏭 {hub.name}</strong><br/>
                        Capacity: {hub.currentLoad}/{hub.capacity} kg<br/>
                        Status: {hub.status}
                      </Popup>
                    </Marker>
                  ))}
                </MapContainer>
              </div>
            </div>

            {/* Hub Capacity */}
            <div className="admin-section" style={{ marginTop: '24px' }}>
              <div className="section-header">
                <h2 className="section-title">🏭 Hub Capacity Overview</h2>
                <button className="btn-sm btn-secondary" onClick={() => setActiveTab("hubs")}>Manage Hubs</button>
              </div>
              {topHubs.length > 0 ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' }}>
                  {topHubs.map(hub => {
                    const loadPercentage = Math.min((hub.currentLoad / hub.capacity) * 100, 100);
                    const barColor = loadPercentage > 80 ? 'var(--danger)' : loadPercentage > 50 ? 'var(--warning)' : 'var(--success)';
                    return (
                      <div key={hub.id} style={{ padding: '16px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                          <span style={{ fontWeight: '600', fontSize: '14px' }}>{hub.name}</span>
                          <span style={{ fontSize: '12px', color: '#64748b' }}>{hub.location}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '6px' }}>
                          <span>Load: {hub.currentLoad} / {hub.capacity} kg</span>
                          <span style={{ fontWeight: '600', color: barColor }}>{loadPercentage.toFixed(0)}%</span>
                        </div>
                        <div style={{ width: '100%', height: '8px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                          <div style={{ width: `${loadPercentage}%`, height: '100%', background: barColor, transition: 'width 0.5s ease' }}></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : <p className="text-muted" style={{ textAlign: 'center', padding: '20px' }}>No hubs added yet.</p>}
            </div>
          </>
        );
      }

      // =========================================
      // CLIENTS TAB
      // =========================================
      case "clients": {
        const filteredUsers = users.filter(u => {
          const matchesSearch = u.name?.toLowerCase().includes(debouncedSearch.toLowerCase()) || 
                               u.email?.toLowerCase().includes(debouncedSearch.toLowerCase()) || 
                               u.phone?.includes(debouncedSearch);
          const matchesFilter = clientFilter === "all" ? true : 
                               clientFilter === "pending-kyc" ? (u.kycStatus === "Pending" || !u.kycStatus) : 
                               u.status === clientFilter;
          return matchesSearch && matchesFilter;
        });
        
        return (
          <div className="admin-section">
            <div className="section-header">
              <h2 className="section-title">Client Management ({filteredUsers.length})</h2>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                {/* Filter Presets */}
                <select 
                  className="status-select" 
                  value={activePreset || ''}
                  onChange={(e) => {
                    const preset = FILTER_PRESETS[e.target.value];
                    if (preset) {
                      setActivePreset(e.target.value);
                      setClientFilter(preset.filter);
                      showNotification(`Applied preset: ${e.target.value}`);
                    }
                  }}
                  style={{ width: '180px' }}
                >
                  <option value="">Saved Filters...</option>
                  {Object.keys(FILTER_PRESETS).map(key => (
                    <option key={key} value={key}>{key}</option>
                  ))}
                </select>
                
                {selectedClients.length > 0 && (
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center', background: '#f1f5f9', padding: '4px 12px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                    <span className="text-small font-semibold">{selectedClients.length} Selected</span>
                    <button className="btn-xs btn-danger" onClick={() => handleBulkClientAction("block")}>Block</button>
                    <button className="btn-xs btn-success" onClick={() => handleBulkClientAction("unblock")}>Unblock</button>
                  </div>
                )}
                <select className="status-select" value={clientFilter} onChange={(e) => setClientFilter(e.target.value)} style={{ width: '140px' }}>
                  <option value="all">All Clients</option>
                  <option value="active">Active</option>
                  <option value="banned">Blocked</option>
                  <option value="pending-kyc">Pending KYC</option>
                </select>
                <input 
                  type="text" 
                  placeholder="Search name, email, phone..." 
                  className="search-input" 
                  value={searchQuery} 
                  onChange={(e) => setSearchQuery(e.target.value)} 
                />
                <button className="btn-xs btn-secondary" onClick={() => exportToCSV(filteredUsers, 'clients')}>📥 Export</button>
              </div>
            </div>
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th style={{ width: '40px' }}>
                      <input 
                        type="checkbox" 
                        checked={filteredUsers.length > 0 && selectedClients.length === filteredUsers.length} 
                        onChange={() => toggleSelectAll(filteredUsers)} 
                        style={{ cursor: 'pointer' }} 
                      />
                    </th>
                    <th>Client Profile</th>
                    <th>Contact</th>
                    <th>KYC Status</th>
                    <th>Wallet Balance</th>
                    <th>Total Shipments</th>
                    <th>Account Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((u) => (
                    <tr key={u.id} style={{ background: selectedClients.includes(u.id) ? '#f8fafc' : 'transparent' }}>
                      <td>
                        <input 
                          type="checkbox" 
                          checked={selectedClients.includes(u.id)} 
                          onChange={() => toggleClientSelection(u.id)} 
                          style={{ cursor: 'pointer' }} 
                        />
                      </td>
                      <td>
                        <div className="user-info-cell">
                          <div className="user-avatar">{u.name?.charAt(0) || u.email?.charAt(0) || 'U'}</div>
                          <div>
                            <div className="font-semibold">{u.name || 'Unnamed'}</div>
                            <div className="text-small text-muted">{u.email}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="text-small">{u.phone || 'N/A'}</div>
                        <div className="text-small text-muted">{u.gstin || 'No GST'}</div>
                      </td>
                      <td>{getStatusBadge(u.kycStatus || 'Pending')}</td>
                      <td className="amount-text">₹{getWalletBalance(u.id).toLocaleString()}</td>
                      <td>{u.totalShipments || 0}</td>
                      <td>{getStatusBadge(u.status || 'active')}</td>
                      <td className="actions-cell">
                        <button 
                          className="btn-xs btn-secondary" 
                          onClick={() => { setSelectedItem(u); setModalType("client-details"); setShowModal(true); }} 
                          title="View Full Profile"
                        >
                          👁️ View
                        </button>
                        <button 
                          className="btn-xs btn-primary" 
                          onClick={() => { setSelectedItem(u); setModalType("add-funds"); setFormData({ amount: "", action: "add" }); setShowModal(true); }} 
                          title="Manage Wallet"
                        >
                          💰
                        </button>
                        <button 
                          className={`btn-xs ${u.status === "banned" ? "btn-success" : "btn-danger"}`} 
                          onClick={() => handleToggleClientStatus(u.id, u.status || 'active')} 
                          disabled={saving} 
                          title={u.status === "banned" ? "Unblock Client" : "Block Client"}
                        >
                          {u.status === "banned" ? "✅" : "🚫"}
                        </button>
                      </td>
                    </tr>
                  ))}
                  {filteredUsers.length === 0 && <tr><td colSpan="8" className="empty-cell">No clients found matching your criteria</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        );
      }

      // =========================================
      // SHIPMENTS TAB
      // =========================================
      case "shipments": {
        const filteredShipments = shipments.filter(s => {
          const matchesSearch = s.trackingId?.toLowerCase().includes(debouncedSearch.toLowerCase()) || 
                               getClientName(s.userId, s.clientName, s.userEmail).toLowerCase().includes(debouncedSearch.toLowerCase());
          const matchesFilter = shipmentFilter === "all" ? true : s.status === shipmentFilter;
          const matchesDateRange = !dateRange.start || !dateRange.end || 
                                   (s.createdAt >= new Date(dateRange.start) && s.createdAt <= new Date(dateRange.end));
          return matchesSearch && matchesFilter && matchesDateRange;
        });
        
        const unassignedInFilter = filteredShipments.filter(s => !s.assignedDriverId && ["Booked", "Picked Up"].includes(s.status));

        return (
          <div className="admin-section">
            <div className="section-header">
              <h2 className="section-title">Live Shipments ({filteredShipments.length})</h2>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                {selectedShipments.length > 0 && (
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center', background: '#f1f5f9', padding: '4px 12px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                    <span className="text-small font-semibold">{selectedShipments.length} Selected</span>
                    <button className="btn-xs btn-primary" onClick={() => { setModalType("bulk-update"); setShowModal(true); }}>
                      ⚡ Bulk Update
                    </button>
                    <button className="btn-xs btn-danger" onClick={() => handleBulkShipmentAction("cancel", "Cancelled")}>
                      ❌ Cancel
                    </button>
                  </div>
                )}
                {unassignedInFilter.length > 0 && <span className="badge badge-danger">⚠️ {unassignedInFilter.length} Unassigned</span>}
                <select className="status-select" value={shipmentFilter} onChange={(e) => setShipmentFilter(e.target.value)} style={{ width: '160px' }}>
                  <option value="all">All Statuses</option>
                  <option value="Booked">Booked</option>
                  <option value="Picked Up">Picked Up</option>
                  <option value="In Transit">In Transit</option>
                  <option value="Out for Delivery">Out for Delivery</option>
                  <option value="Delivered">Delivered</option>
                  <option value="Cancelled">Cancelled</option>
                </select>
                <input 
                  type="date" 
                  value={dateRange.start}
                  onChange={(e) => setDateRange({...dateRange, start: e.target.value})}
                  className="search-input"
                  style={{ width: '140px' }}
                />
                <input 
                  type="date" 
                  value={dateRange.end}
                  onChange={(e) => setDateRange({...dateRange, end: e.target.value})}
                  className="search-input"
                  style={{ width: '140px' }}
                />
                <input 
                  type="text" 
                  placeholder="Search tracking ID or client..." 
                  className="search-input" 
                  value={searchQuery} 
                  onChange={(e) => setSearchQuery(e.target.value)} 
                />
                <button className="btn-xs btn-secondary" onClick={() => exportToCSV(filteredShipments, "live_shipments_report")}>
                  📥 CSV
                </button>
                <button className="btn-xs btn-secondary" onClick={() => exportToJSON(filteredShipments, "live_shipments")}>
                  📥 JSON
                </button>
              </div>
            </div>
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th style={{ width: '40px' }}>
                      <input 
                        type="checkbox" 
                        checked={filteredShipments.length > 0 && selectedShipments.length === filteredShipments.length} 
                        onChange={() => toggleSelectAllShipments(filteredShipments)} 
                        style={{ cursor: 'pointer' }} 
                      />
                    </th>
                    <th>Tracking Details</th>
                    <th>Client</th>
                    <th>Route</th>
                    <th>Weight / Amount</th>
                    <th>Assigned Driver</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredShipments.map((s) => {
                    const driver = s.assignedDriverId ? drivers.find(d => d.id === s.assignedDriverId) : null;
                    const isUnassigned = !s.assignedDriverId && ["Booked", "Picked Up"].includes(s.status);
                    return (
                      <tr 
                        key={s.id} 
                        style={{ 
                          background: selectedShipments.includes(s.id) ? '#f8fafc' : (isUnassigned ? '#fffbeb' : 'transparent'), 
                          borderLeft: isUnassigned ? '3px solid var(--warning)' : 'none' 
                        }}
                      >
                        <td>
                          <input 
                            type="checkbox" 
                            checked={selectedShipments.includes(s.id)} 
                            onChange={() => toggleShipmentSelection(s.id)} 
                            style={{ cursor: 'pointer' }} 
                          />
                        </td>
                        <td>
                          <div 
                            className="font-semibold mono-text" 
                            style={{ cursor: 'pointer', color: 'var(--primary)' }} 
                            onClick={() => { setSelectedItem(s); setModalType("shipment-details"); setShowModal(true); }}
                          >
                            {s.trackingId || s.id.slice(0, 10)}
                          </div>
                          <div className="text-small text-muted">{s.createdAt?.toLocaleDateString() || 'N/A'}</div>
                        </td>
                        <td>
                          <div className="font-semibold">{getClientName(s.userId, s.clientName, s.userEmail)}</div>
                          <div className="text-small text-muted">{s.userEmail || 'No Email'}</div>
                        </td>
                        <td><div className="text-small">{s.pickupCity || 'N/A'} → {s.dropCity || 'N/A'}</div></td>
                        <td>
                          <div className="text-small">{s.weight || 0} kg</div>
                          <div className="amount-text text-small">₹{Number(s.amount || 0).toLocaleString()}</div>
                        </td>
                        <td>
                          {driver ? (
                            <div>
                              <div className="font-semibold text-small">{driver.name}</div>
                              <div className="text-small text-muted">{driver.vehicleNumber}</div>
                            </div>
                          ) : (
                            <span 
                              className="text-small" 
                              style={{ 
                                color: isUnassigned ? '#92400e' : '#64748b', 
                                fontWeight: isUnassigned ? '600' : '400' 
                              }}
                            >
                              {isUnassigned ? '⚠️ Unassigned' : 'Unassigned'}
                            </span>
                          )}
                        </td>
                        <td>{getStatusBadge(s.status)}</td>
                        <td className="actions-cell">
                          <button 
                            className="btn-xs btn-secondary" 
                            onClick={() => { setSelectedItem(s); setModalType("shipment-details"); setShowModal(true); }} 
                            title="View Full Details"
                          >
                            👁️ View
                          </button>
                          <button 
                            className="btn-xs btn-primary" 
                            onClick={() => { setSelectedItem(s); setModalType("update-status"); setFormData({}); setShowModal(true); }} 
                            title="Update Status"
                          >
                            🚚 Update
                          </button>
                          <button 
                            className="btn-xs btn-secondary" 
                            onClick={() => handlePrintLabel(s)} 
                            title="Print Shipping Label"
                          >
                            🖨️
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredShipments.length === 0 && <tr><td colSpan="8" className="empty-cell">No shipments found matching your criteria</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        );
      }

      // =========================================
      // FLEET TAB
      // =========================================
      case "fleet":
        return (
          <div className="admin-section">
            <div className="section-header">
              <h2 className="section-title">Fleet & Drivers Management</h2>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button className="btn-sm btn-secondary" onClick={() => exportToCSV(drivers, 'drivers')}>📥 Export</button>
                <button className="btn-sm btn-primary" onClick={() => { setModalType("add-driver"); setFormData({}); setShowModal(true); }}>
                  ➕ Add New Driver
                </button>
              </div>
            </div>
            
            {/* Fleet Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
              <div className="stat-card stat-success">
                <div className="stat-info">
                  <div className="stat-label">Available</div>
                  <div className="stat-value">{metrics.availableDrivers}</div>
                </div>
              </div>
              <div className="stat-card stat-warning">
                <div className="stat-info">
                  <div className="stat-label">Busy</div>
                  <div className="stat-value">{metrics.busyDrivers}</div>
                </div>
              </div>
              <div className="stat-card stat-danger">
                <div className="stat-info">
                  <div className="stat-label">Offline</div>
                  <div className="stat-value">{metrics.offlineDrivers}</div>
                </div>
              </div>
              <div className="stat-card stat-primary">
                <div className="stat-info">
                  <div className="stat-label">Total Fleet</div>
                  <div className="stat-value">{metrics.totalDrivers}</div>
                </div>
              </div>
            </div>
            
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Driver Details</th>
                    <th>Vehicle Info</th>
                    <th>Performance</th>
                    <th>Vehicle Health</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {drivers.length === 0 ? (
                    <tr><td colSpan="6" className="empty-cell">No drivers added yet. Click "Add New Driver" to start.</td></tr>
                  ) : (
                    drivers.map((driver) => (
                      <tr key={driver.id}>
                        <td>
                          <div className="font-semibold">{driver.name}</div>
                          <div className="text-small text-muted">{driver.phone}</div>
                        </td>
                        <td>
                          <div className="font-semibold text-small">{driver.vehicleNumber}</div>
                          <div className="text-small text-muted">{driver.vehicleType}</div>
                        </td>
                        <td>
                          <div className="text-small">⭐ {driver.rating || 5.0} Rating</div>
                          <div className="text-small text-muted">{driver.totalDeliveries || 0} Deliveries</div>
                        </td>
                        <td>
                          <select 
                            className="status-select" 
                            style={{ width: '110px', fontSize: '11px', padding: '4px' }} 
                            value={driver.vehicleHealth || "Good"} 
                            onChange={(e) => handleUpdateDriverVehicleHealth(driver.id, e.target.value)}
                          >
                            <option value="Good">🟢 Good</option>
                            <option value="Service Due">🟡 Service Due</option>
                            <option value="Critical">🔴 Critical</option>
                          </select>
                        </td>
                        <td>{getStatusBadge(driver.status || 'offline')}</td>
                        <td className="actions-cell">
                          <button 
                            className="btn-xs btn-secondary" 
                            onClick={() => { setSelectedItem(driver); setModalType("driver-details"); setShowModal(true); }}
                          >
                            👁️ View
                          </button>
                          <select 
                            className="status-select" 
                            style={{ width: '90px' }} 
                            value={driver.status || 'offline'} 
                            onChange={(e) => handleUpdateDriverStatus(driver.id, e.target.value)}
                          >
                            <option value="available">Available</option>
                            <option value="busy">Busy</option>
                            <option value="offline">Offline</option>
                          </select>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        );

      // =========================================
      // HUBS TAB
      // =========================================
      case "hubs":
        return (
          <div className="admin-section">
            <div className="section-header">
              <h2 className="section-title">Hubs & Warehouses</h2>
              <button className="btn-xs btn-primary" onClick={() => { setModalType("add-hub"); setFormData({}); setShowModal(true); }}>
                ➕ Add Hub
              </button>
            </div>
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Hub Name</th>
                    <th>Location</th>
                    <th>Capacity</th>
                    <th>Utilization</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {hubs.length === 0 ? (
                    <tr><td colSpan="5" className="empty-cell">No hubs added yet. Click "Add" to add one.</td></tr>
                  ) : hubs.map((hub) => {
                    const utilization = Math.min((hub.currentLoad / hub.capacity) * 100, 100);
                    const color = utilization > 80 ? 'var(--danger)' : utilization > 50 ? 'var(--warning)' : 'var(--success)';
                    return (
                      <tr key={hub.id}>
                        <td className="font-semibold">{hub.name}</td>
                        <td>
                          <div>{hub.location}</div>
                          <div className="text-small text-muted">{hub.address}</div>
                        </td>
                        <td>{hub.currentLoad} / {hub.capacity} kg</td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{ width: '80px', height: '6px', background: '#e2e8f0', borderRadius: '3px', overflow: 'hidden' }}>
                              <div style={{ width: `${utilization}%`, height: '100%', background: color }}></div>
                            </div>
                            <span style={{ fontSize: '12px', fontWeight: 600, color }}>{utilization.toFixed(0)}%</span>
                          </div>
                        </td>
                        <td>{getStatusBadge(hub.status || 'active')}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        );

      // =========================================
      // ANALYTICS TAB (Enhanced)
      // =========================================
      case "analytics": {
        const statusData = [
          { name: 'Delivered', value: shipments.filter(s => s.status === 'Delivered').length, color: '#10b981' },
          { name: 'In Transit', value: shipments.filter(s => s.status === 'In Transit').length, color: '#3b82f6' },
          { name: 'Booked', value: shipments.filter(s => s.status === 'Booked').length, color: '#f59e0b' },
          { name: 'Cancelled', value: shipments.filter(s => s.status === 'Cancelled').length, color: '#ef4444' },
        ].filter(d => d.value > 0);

        const monthlyTrend = [
          { month: 'Jan', revenue: 450000, shipments: 120, customers: 45 },
          { month: 'Feb', revenue: 520000, shipments: 145, customers: 52 },
          { month: 'Mar', revenue: 610000, shipments: 168, customers: 61 },
          { month: 'Apr', revenue: 580000, shipments: 152, customers: 58 },
          { month: 'May', revenue: 720000, shipments: 195, customers: 72 },
          { month: 'Jun', revenue: 680000, shipments: 178, customers: 68 },
          { month: 'Jul', revenue: 750000, shipments: 205, customers: 75 },
          { month: 'Aug', revenue: 820000, shipments: 225, customers: 82 },
        ];

        // Route profitability
        const routeData = {};
        shipments.filter(s => s.status === 'Delivered').forEach(s => {
          const route = `${s.pickupCity || 'Unknown'} → ${s.dropCity || 'Unknown'}`;
          if (!routeData[route]) routeData[route] = { route, shipments: 0, revenue: 0 };
          routeData[route].shipments += 1;
          routeData[route].revenue += Number(s.amount || 0);
        });
        const topRoutes = Object.values(routeData).sort((a, b) => b.revenue - a.revenue).slice(0, 5);

        // Customer Lifetime Value
        const customerCLV = users.map(u => {
          const userShipments = shipments.filter(s => s.userId === u.id && s.status === 'Delivered');
          const totalRev = userShipments.reduce((sum, s) => sum + (Number(s.amount) || 0), 0);
          return {
            name: u.name || u.email || 'Unknown',
            clv: totalRev,
            shipments: userShipments.length,
            avgOrder: userShipments.length > 0 ? totalRev / userShipments.length : 0
          };
        }).filter(c => c.clv > 0).sort((a, b) => b.clv - a.clv).slice(0, 10);

        // Hub utilization data
        const hubUtilization = hubs.map(h => ({
          name: h.name?.slice(0, 15) || 'Hub',
          utilization: Math.min((h.currentLoad / h.capacity) * 100, 100),
          fill: h.currentLoad / h.capacity > 0.8 ? '#ef4444' : h.currentLoad / h.capacity > 0.5 ? '#f59e0b' : '#10b981'
        }));

        return (
          <>
            {/* Summary Stats */}
            <div className="stats-grid">
              <div className="stat-card stat-success">
                <div className="stat-icon">💰</div>
                <div className="stat-info">
                  <div className="stat-label">Total Revenue</div>
                  <div className="stat-value">₹{(metrics.totalRevenue / 100000).toFixed(2)}L</div>
                  <div className="stat-subtitle">From {metrics.deliveredCount} deliveries</div>
                </div>
              </div>
              <div className="stat-card stat-primary">
                <div className="stat-icon">📦</div>
                <div className="stat-info">
                  <div className="stat-label">Total Shipments</div>
                  <div className="stat-value">{metrics.totalShipments}</div>
                  <div className="stat-subtitle">{metrics.successRate}% success rate</div>
                </div>
              </div>
              <div className="stat-card stat-warning">
                <div className="stat-icon">📊</div>
                <div className="stat-info">
                  <div className="stat-label">Avg Order Value</div>
                  <div className="stat-value">₹{metrics.avgOrderValue.toFixed(0)}</div>
                </div>
              </div>
              <div className="stat-card stat-info">
                <div className="stat-icon">📈</div>
                <div className="stat-info">
                  <div className="stat-label">Conversion Rate</div>
                  <div className="stat-value">{users.length > 0 ? ((users.filter(u => u.totalShipments > 0).length / users.length) * 100).toFixed(1) : 0}%</div>
                </div>
              </div>
            </div>

            {/* Charts Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
              {/* Status Distribution */}
              <div className="admin-section">
                <h2 className="section-title">📊 Shipment Status Distribution</h2>
                <div style={{ height: '300px', width: '100%' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie 
                        data={statusData} 
                        cx="50%" 
                        cy="50%" 
                        innerRadius={60} 
                        outerRadius={100} 
                        paddingAngle={5} 
                        dataKey="value" 
                        label={({name, percent}) => `${name} ${(percent*100).toFixed(0)}%`}
                      >
                        {statusData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Monthly Trend */}
              <div className="admin-section">
                <h2 className="section-title">📈 Monthly Revenue & Volume</h2>
                <div style={{ height: '300px', width: '100%' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={monthlyTrend}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis dataKey="month" stroke="#64748b" fontSize={12} />
                      <YAxis yAxisId="left" stroke="#64748b" fontSize={12} tickFormatter={(v) => `₹${v/1000}k`} />
                      <YAxis yAxisId="right" orientation="right" stroke="#64748b" fontSize={12} />
                      <Tooltip formatter={(value, name) => name === 'revenue' ? `₹${value.toLocaleString()}` : value} />
                      <Legend />
                      <Bar yAxisId="left" dataKey="revenue" fill="#2563eb" name="Revenue" radius={[4, 4, 0, 0]} />
                      <Line yAxisId="right" type="monotone" dataKey="shipments" stroke="#10b981" strokeWidth={3} name="Shipments" />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Top Routes */}
              <div className="admin-section">
                <h2 className="section-title">🗺️ Top Revenue Routes</h2>
                <div style={{ height: '300px', width: '100%' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={topRoutes} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis type="number" stroke="#64748b" fontSize={12} tickFormatter={(v) => `₹${v/1000}k`} />
                      <YAxis type="category" dataKey="route" stroke="#64748b" fontSize={11} width={140} />
                      <Tooltip formatter={(value) => `₹${value.toLocaleString()}`} />
                      <Bar dataKey="revenue" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Hub Utilization */}
              <div className="admin-section">
                <h2 className="section-title">🏭 Hub Utilization</h2>
                <div style={{ height: '300px', width: '100%' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={hubUtilization}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis dataKey="name" stroke="#64748b" fontSize={11} />
                      <YAxis stroke="#64748b" fontSize={12} tickFormatter={(v) => `${v}%`} />
                      <Tooltip formatter={(value) => `${value.toFixed(1)}%`} />
                      <Bar dataKey="utilization" radius={[4, 4, 0, 0]}>
                        {hubUtilization.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Customer Lifetime Value */}
            <div className="admin-section" style={{ marginTop: '24px' }}>
              <div className="section-header">
                <h2 className="section-title">💎 Top Customers by Lifetime Value</h2>
                <button className="btn-xs btn-secondary" onClick={() => exportToCSV(customerCLV, 'customer_clv')}>📥 Export</button>
              </div>
              <div className="table-wrapper">
                <table>
                  <thead>
                    <tr>
                      <th>Rank</th>
                      <th>Customer</th>
                      <th>Total Shipments</th>
                      <th>Total Revenue</th>
                      <th>Avg Order Value</th>
                      <th>Tier</th>
                    </tr>
                  </thead>
                  <tbody>
                    {customerCLV.length === 0 ? (
                      <tr><td colSpan="6" className="empty-cell">No customer data available</td></tr>
                    ) : customerCLV.map((c, idx) => {
                      const tier = c.clv > 500000 ? 'Platinum' : c.clv > 100000 ? 'Gold' : c.clv > 25000 ? 'Silver' : 'Bronze';
                      const tierColor = tier === 'Platinum' ? '#a855f7' : tier === 'Gold' ? '#f59e0b' : tier === 'Silver' ? '#94a3b8' : '#d97706';
                      return (
                        <tr key={idx}>
                          <td style={{ fontWeight: 700, fontSize: '16px' }}>#{idx + 1}</td>
                          <td className="font-semibold">{c.name}</td>
                          <td>{c.shipments}</td>
                          <td className="amount-text">₹{c.clv.toLocaleString()}</td>
                          <td>₹{c.avgOrder.toFixed(0)}</td>
                          <td>
                            <span 
                              className="badge" 
                              style={{ 
                                background: `${tierColor}20`, 
                                color: tierColor,
                                border: `1px solid ${tierColor}`
                              }}
                            >
                              {tier}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        );
      }

      // =========================================
      // SUPPORT TICKETS TAB
      // =========================================
      case "support": {
        const filteredTickets = tickets.filter(t => {
          const matchesSearch = t.subject?.toLowerCase().includes(debouncedSearch.toLowerCase()) || 
                               t.userName?.toLowerCase().includes(debouncedSearch.toLowerCase());
          const matchesFilter = ticketFilter === "all" ? true : t.status === ticketFilter;
          return matchesSearch && matchesFilter;
        });
        
        return (
          <div className="admin-section">
            <div className="section-header">
              <h2 className="section-title">Support Tickets ({filteredTickets.length})</h2>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <select className="status-select" value={ticketFilter} onChange={(e) => setTicketFilter(e.target.value)} style={{ width: '140px' }}>
                  <option value="all">All Tickets</option>
                  <option value="Open">Open</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Resolved">Resolved</option>
                  <option value="Closed">Closed</option>
                </select>
                <input 
                  type="text" 
                  placeholder="Search tickets..." 
                  className="search-input" 
                  value={searchQuery} 
                  onChange={(e) => setSearchQuery(e.target.value)} 
                />
              </div>
            </div>
            
            {/* Ticket Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
              <div className="stat-card stat-warning">
                <div className="stat-info">
                  <div className="stat-label">Open</div>
                  <div className="stat-value">{tickets.filter(t => t.status === 'Open').length}</div>
                </div>
              </div>
              <div className="stat-card stat-info">
                <div className="stat-info">
                  <div className="stat-label">In Progress</div>
                  <div className="stat-value">{tickets.filter(t => t.status === 'In Progress').length}</div>
                </div>
              </div>
              <div className="stat-card stat-success">
                <div className="stat-info">
                  <div className="stat-label">Resolved</div>
                  <div className="stat-value">{tickets.filter(t => t.status === 'Resolved').length}</div>
                </div>
              </div>
              <div className="stat-card stat-primary">
                <div className="stat-info">
                  <div className="stat-label">Total</div>
                  <div className="stat-value">{tickets.length}</div>
                </div>
              </div>
            </div>
            
            <div className="tickets-grid">
              {filteredTickets.length === 0 ? (
                <div className="empty-state-box"><p>No support tickets found</p></div>
              ) : filteredTickets.map(ticket => (
                <div key={ticket.id} className={`ticket-card ${ticket.status === "Open" ? "ticket-open" : ""}`}>
                  <div className="ticket-header">
                    <div>
                      <h3 className="ticket-title">{ticket.subject || 'No Subject'}</h3>
                      <div className="ticket-meta">
                        <span>Client: {ticket.userName || 'Unknown'}</span>
                        <span>•</span>
                        <span>{ticket.createdAt?.toLocaleDateString() || 'N/A'}</span>
                      </div>
                    </div>
                    <div className="ticket-badges">
                      <span className={`badge badge-${ticket.priority || 'normal'}`}>{ticket.priority || 'Normal'}</span>
                      <span className={`badge badge-${ticket.status === 'Open' ? 'warning' : 'success'}`}>{ticket.status}</span>
                    </div>
                  </div>
                  <div className="ticket-body">
                    <p className="ticket-message">{ticket.message || 'No message'}</p>
                    {ticket.replies && ticket.replies.length > 0 && (
                      <div className="ticket-replies">
                        <h4 className="replies-title">Conversation ({ticket.replies.length})</h4>
                        {ticket.replies.map((reply, idx) => (
                          <div key={idx} className={`reply ${reply.from === "admin" ? "reply-admin" : "reply-client"}`}>
                            <div className="reply-header">
                              <span className="reply-from">
                                {reply.from === "admin" ? "👨‍💼 Admin" : "👤 Client"}
                              </span>
                              <span className="reply-time">
                                {reply.createdAt?.toDate?.().toLocaleString() || 'N/A'}
                              </span>
                            </div>
                            <p className="reply-message">{reply.message}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="ticket-actions">
                    <button 
                      className="btn-sm btn-primary" 
                      onClick={() => { setSelectedItem(ticket); setModalType("reply-ticket"); setFormData({}); setShowModal(true); }}
                    >
                      Reply
                    </button>
                    <select 
                      className="status-select" 
                      value={ticket.status} 
                      onChange={(e) => handleTicketStatusChange(ticket.id, e.target.value)}
                    >
                      <option value="Open">Open</option>
                      <option value="In Progress">In Progress</option>
                      <option value="Resolved">Resolved</option>
                      <option value="Closed">Closed</option>
                    </select>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      }

      // =========================================
      // RATE CARDS TAB
      // =========================================
      case "pricing": {
        return (
          <div className="admin-section">
            <div className="section-header">
              <h2 className="section-title">Rate Cards & Pricing Zones</h2>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button className="btn-sm btn-secondary" onClick={() => exportToCSV(rateCards, 'rate_cards')}>📥 Export</button>
                <button 
                  className="btn-sm btn-primary" 
                  onClick={() => { 
                    setModalType("add-rate-card"); 
                    setFormData({ basePrice: 100, perKg: 10, minWeight: 1, status: "active" }); 
                    setShowModal(true); 
                  }}
                >
                  ➕ Add Rate Card
                </button>
              </div>
            </div>
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Route / Zone</th>
                    <th>Vehicle Type</th>
                    <th>Base Price</th>
                    <th>Per KG Rate</th>
                    <th>Min Weight</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rateCards.length === 0 ? (
                    <tr><td colSpan="7" className="empty-cell">No rate cards configured. Add one to enable auto-pricing.</td></tr>
                  ) : rateCards.map(card => (
                    <tr key={card.id}>
                      <td className="font-semibold">{card.route}</td>
                      <td>{card.vehicleType}</td>
                      <td className="amount-text">₹{card.basePrice}</td>
                      <td className="amount-text">₹{card.perKg}/kg</td>
                      <td>{card.minWeight} kg</td>
                      <td>{getStatusBadge(card.status)}</td>
                      <td className="actions-cell">
                        <button 
                          className="btn-xs btn-primary" 
                          onClick={() => { 
                            setSelectedItem(card); 
                            setModalType("edit-rate-card"); 
                            setFormData(card); 
                            setShowModal(true); 
                          }}
                        >
                          ✏️ Edit
                        </button>
                        <button 
                          className="btn-xs btn-danger" 
                          onClick={async () => {
                            if (window.confirm("Delete this rate card?")) {
                              await deleteDoc(doc(db, "rate_cards", card.id));
                              showNotification("Rate card deleted", "success");
                              logAuditAction('DELETE_RATE_CARD', `Deleted: ${card.route}`, 'rate_card', card.id);
                            }
                          }}
                        >
                          🗑️
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      }

      // =========================================
      // REPORTS TAB
      // =========================================
      case "reports": {
        const statusData = [
          { name: 'Delivered', value: shipments.filter(s => s.status === 'Delivered').length, color: '#10b981' },
          { name: 'In Transit', value: shipments.filter(s => s.status === 'In Transit').length, color: '#3b82f6' },
          { name: 'Booked', value: shipments.filter(s => s.status === 'Booked').length, color: '#f59e0b' },
          { name: 'Cancelled', value: shipments.filter(s => s.status === 'Cancelled').length, color: '#ef4444' },
        ].filter(d => d.value > 0);

        const topClients = Object.values(users.reduce((acc, user) => {
          const userShipments = shipments.filter(s => s.userId === user.id && s.status === 'Delivered');
          const rev = userShipments.reduce((sum, s) => sum + (Number(s.amount) || 0), 0);
          if (rev > 0) acc[user.id] = { name: user.name || user.email, revenue: rev };
          return acc;
        }, {})).sort((a, b) => b.revenue - a.revenue).slice(0, 5);

        // GST calculations
        const totalGST = metrics.totalRevenue * (systemSettings.gst / 100);
        const netRevenue = metrics.totalRevenue - totalGST;

        return (
          <>
            <div className="stats-grid">
              <div className="stat-card stat-success">
                <div className="stat-icon">💰</div>
                <div className="stat-info">
                  <div className="stat-label">Total Revenue</div>
                  <div className="stat-value">₹{(metrics.totalRevenue / 100000).toFixed(2)}L</div>
                </div>
              </div>
              <div className="stat-card stat-warning">
                <div className="stat-icon">🧾</div>
                <div className="stat-info">
                  <div className="stat-label">GST Collected</div>
                  <div className="stat-value">₹{(totalGST / 100000).toFixed(2)}L</div>
                  <div className="stat-subtitle">{systemSettings.gst}% GST</div>
                </div>
              </div>
              <div className="stat-card stat-primary">
                <div className="stat-icon">💼</div>
                <div className="stat-info">
                  <div className="stat-label">Net Revenue</div>
                  <div className="stat-value">₹{(netRevenue / 100000).toFixed(2)}L</div>
                </div>
              </div>
              <div className="stat-card stat-info">
                <div className="stat-icon">📊</div>
                <div className="stat-info">
                  <div className="stat-label">Avg Order Value</div>
                  <div className="stat-value">₹{metrics.avgOrderValue.toFixed(0)}</div>
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
              <div className="admin-section">
                <h2 className="section-title">Shipment Status Distribution</h2>
                <div style={{ height: '300px', width: '100%' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie 
                        data={statusData} 
                        cx="50%" 
                        cy="50%" 
                        innerRadius={60} 
                        outerRadius={100} 
                        paddingAngle={5} 
                        dataKey="value" 
                        label={({name, percent}) => `${name} ${(percent*100).toFixed(0)}%`}
                      >
                        {statusData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="admin-section">
                <h2 className="section-title">Top 5 Clients by Revenue</h2>
                <div style={{ height: '300px', width: '100%' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={topClients} layout="vertical">
                      <XAxis type="number" stroke="#64748b" fontSize={12} tickFormatter={(v) => `₹${v/1000}k`} />
                      <YAxis type="category" dataKey="name" stroke="#64748b" fontSize={12} width={100} />
                      <Tooltip formatter={(value) => `₹${value.toLocaleString()}`} />
                      <Bar dataKey="revenue" fill="#2563eb" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Financial Summary */}
            <div className="admin-section" style={{ marginTop: '24px' }}>
              <div className="section-header">
                <h2 className="section-title">💼 Financial Summary</h2>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button className="btn-xs btn-secondary" onClick={() => exportToCSV([{
                    metric: 'Total Revenue', value: metrics.totalRevenue
                  }, {
                    metric: 'GST Collected', value: totalGST
                  }, {
                    metric: 'Net Revenue', value: netRevenue
                  }], 'financial_summary')}>
                    📥 Export Report
                  </button>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
                <div style={{ padding: '20px', background: '#f0fdf4', borderRadius: '8px', border: '1px solid #86efac' }}>
                  <div style={{ fontSize: '12px', color: '#15803d', fontWeight: 600, marginBottom: '8px' }}>GROSS REVENUE</div>
                  <div style={{ fontSize: '28px', fontWeight: 700, color: '#14532d' }}>₹{metrics.totalRevenue.toLocaleString()}</div>
                </div>
                <div style={{ padding: '20px', background: '#fef3c7', borderRadius: '8px', border: '1px solid #fcd34d' }}>
                  <div style={{ fontSize: '12px', color: '#92400e', fontWeight: 600, marginBottom: '8px' }}>GST ({systemSettings.gst}%)</div>
                  <div style={{ fontSize: '28px', fontWeight: 700, color: '#78350f' }}>₹{totalGST.toLocaleString()}</div>
                </div>
                <div style={{ padding: '20px', background: '#dbeafe', borderRadius: '8px', border: '1px solid #93c5fd' }}>
                  <div style={{ fontSize: '12px', color: '#1e40af', fontWeight: 600, marginBottom: '8px' }}>NET REVENUE</div>
                  <div style={{ fontSize: '28px', fontWeight: 700, color: '#1e3a8a' }}>₹{netRevenue.toLocaleString()}</div>
                </div>
              </div>
            </div>
          </>
        );
      }

      // =========================================
      // BROADCASTS TAB
      // =========================================
      case "notifications": {
        return (
          <div className="admin-section">
            <div className="section-header">
              <h2 className="section-title">Broadcast Messages</h2>
            </div>
            <div style={{ padding: '20px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '24px' }}>
              <h3 style={{ fontSize: '16px', marginBottom: '16px', color: '#000' }}>📢 Send New Broadcast</h3>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Title</label>
                  <input 
                    type="text" 
                    className="form-input-large" 
                    placeholder="e.g., System Maintenance" 
                    value={formData.broadcastTitle || ''} 
                    onChange={(e) => setFormData({...formData, broadcastTitle: e.target.value})} 
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Target Audience</label>
                  <select 
                    className="form-select-large" 
                    value={formData.broadcastTarget || 'all'} 
                    onChange={(e) => setFormData({...formData, broadcastTarget: e.target.value})}
                  >
                    <option value="all">All Users</option>
                    <option value="active">Active Clients Only</option>
                    <option value="drivers">Drivers Only</option>
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Message</label>
                <textarea 
                  rows="3" 
                  className="form-textarea-large" 
                  placeholder="Type your broadcast message..." 
                  value={formData.broadcastMessage || ''} 
                  onChange={(e) => setFormData({...formData, broadcastMessage: e.target.value})}
                ></textarea>
              </div>
              <button 
                className="btn-sm btn-primary" 
                onClick={async () => {
                  if (!formData.broadcastTitle || !formData.broadcastMessage) {
                    return showNotification("Please fill title and message", "error");
                  }
                  try {
                    await addDoc(collection(db, "broadcasts"), {
                      title: formData.broadcastTitle, 
                      message: formData.broadcastMessage,
                      target: formData.broadcastTarget || 'all', 
                      createdBy: currentUser.email, 
                      createdAt: serverTimestamp()
                    });
                    showNotification("Broadcast sent successfully!", "success");
                    logAuditAction('SEND_BROADCAST', `Sent broadcast: ${formData.broadcastTitle}`, 'broadcast');
                    setFormData({});
                  } catch (err) { 
                    showNotification("Failed to send broadcast", "error"); 
                  }
                }}
              >
                🚀 Send Broadcast
              </button>
            </div>

            <h3 style={{ fontSize: '16px', marginBottom: '16px', color: '#000' }}>📜 Broadcast History ({broadcasts.length})</h3>
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Title</th>
                    <th>Message</th>
                    <th>Target</th>
                    <th>Sent By</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {broadcasts.length === 0 ? (
                    <tr><td colSpan="5" className="empty-cell">No broadcasts sent yet.</td></tr>
                  ) : broadcasts.map(b => (
                    <tr key={b.id}>
                      <td className="font-semibold">{b.title}</td>
                      <td>{b.message}</td>
                      <td><span className="badge badge-info">{b.target}</span></td>
                      <td>{b.createdBy}</td>
                      <td>{b.createdAt?.toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      }

      // =========================================
      // AUDIT TRAIL TAB (NEW)
      // =========================================
      case "audit": {
        const filteredLogs = auditLogs.filter(log => {
          if (!debouncedSearch) return true;
          return log.action?.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
                 log.details?.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
                 log.performedBy?.toLowerCase().includes(debouncedSearch.toLowerCase());
        });

        return (
          <div className="admin-section">
            <div className="section-header">
              <h2 className="section-title">📋 Audit Trail ({filteredLogs.length})</h2>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input 
                  type="text" 
                  placeholder="Search actions..." 
                  className="search-input" 
                  value={searchQuery} 
                  onChange={(e) => setSearchQuery(e.target.value)} 
                  style={{ width: '200px' }}
                />
                <button className="btn-xs btn-secondary" onClick={() => exportToCSV(filteredLogs, 'audit_logs')}>📥 Export CSV</button>
                <button className="btn-xs btn-secondary" onClick={() => exportToJSON(filteredLogs, 'audit_logs')}>📥 JSON</button>
              </div>
            </div>
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Timestamp</th>
                    <th>Action</th>
                    <th>Details</th>
                    <th>Performed By</th>
                    <th>Target</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLogs.length === 0 ? (
                    <tr><td colSpan="5" className="empty-cell">No audit logs yet</td></tr>
                  ) : filteredLogs.map(log => (
                    <tr key={log.id}>
                      <td className="text-small">{log.timestamp?.toLocaleString() || 'N/A'}</td>
                      <td><span className="badge badge-info">{log.action}</span></td>
                      <td>{log.details}</td>
                      <td>{log.performedBy}</td>
                      <td>{log.targetType ? `${log.targetType} (${log.targetId?.slice(0, 8) || 'N/A'})` : 'N/A'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      }

      // =========================================
      // SETTINGS TAB
      // =========================================
      case "settings":
        return (
          <div className="admin-section">
            <div className="section-header">
              <h2 className="section-title">System Settings</h2>
            </div>
            <div className="settings-form">
              <h3 style={{ fontSize: '16px', marginBottom: '16px', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px' }}>⚙️ Pricing & Tax</h3>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Base Rate per KG (₹)</label>
                  <input 
                    type="number" 
                    className="form-input-large" 
                    value={systemSettings.baseRate || 10} 
                    onChange={(e) => setSystemSettings({...systemSettings, baseRate: Number(e.target.value)})} 
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">GST Percentage (%)</label>
                  <input 
                    type="number" 
                    className="form-input-large" 
                    value={systemSettings.gst || 18} 
                    onChange={(e) => setSystemSettings({...systemSettings, gst: Number(e.target.value)})} 
                  />
                </div>
              </div>
              
              <h3 style={{ fontSize: '16px', marginBottom: '16px', marginTop: '24px', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px' }}>🏢 Company Profile</h3>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Company Name</label>
                  <input 
                    type="text" 
                    className="form-input-large" 
                    value={systemSettings.companyName || 'ATIRATH Logistics'} 
                    onChange={(e) => setSystemSettings({...systemSettings, companyName: e.target.value})} 
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Support Email</label>
                  <input 
                    type="email" 
                    className="form-input-large" 
                    value={systemSettings.supportEmail || 'support@atirath.com'} 
                    onChange={(e) => setSystemSettings({...systemSettings, supportEmail: e.target.value})} 
                  />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Support Phone</label>
                <input 
                  type="text" 
                  className="form-input-large" 
                  value={systemSettings.supportPhone || '+91 9876543210'} 
                  onChange={(e) => setSystemSettings({...systemSettings, supportPhone: e.target.value})} 
                />
              </div>

              <h3 style={{ fontSize: '16px', marginBottom: '16px', marginTop: '24px', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px' }}>📢 Global Broadcast Notice</h3>
              <div className="form-group">
                <label className="form-label">Banner Message (Shows on Client Dashboard)</label>
                <textarea 
                  rows="2" 
                  className="form-textarea-large" 
                  value={systemSettings.notice || ""} 
                  onChange={(e) => setSystemSettings({...systemSettings, notice: e.target.value})} 
                  placeholder="e.g., 'Delays expected in Mumbai due to rains'" 
                />
              </div>

              <h3 style={{ fontSize: '16px', marginBottom: '16px', marginTop: '24px', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px' }}>🔒 System Preferences</h3>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Maintenance Mode</label>
                  <select 
                    className="form-select-large" 
                    value={systemSettings.maintenanceMode ? 'true' : 'false'} 
                    onChange={(e) => setSystemSettings({...systemSettings, maintenanceMode: e.target.value === 'true'})}
                  >
                    <option value="false">Disabled (System Live)</option>
                    <option value="true">Enabled (Clients see maintenance page)</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Allow New Client Registrations</label>
                  <select 
                    className="form-select-large" 
                    value={systemSettings.allowRegistrations ? 'true' : 'false'} 
                    onChange={(e) => setSystemSettings({...systemSettings, allowRegistrations: e.target.value === 'true'})}
                  >
                    <option value="true">Allowed</option>
                    <option value="false">Paused</option>
                  </select>
                </div>
              </div>

              <button 
                className="btn-sm btn-primary" 
                style={{ marginTop: '24px' }} 
                onClick={handleSaveSettings} 
                disabled={saving}
              >
                {saving ? "💾 Saving..." : "💾 Save All Settings"}
              </button>
            </div>
          </div>
        );

      default:
        return (
          <div className="admin-section">
            <div className="empty-state-box">
              <h2>{activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}</h2>
              <p>This module is under development</p>
            </div>
          </div>
        );
    }
  };

  // =========================================
  // MAIN RENDER
  // =========================================
  return (
    <div className={`admin-page ${darkMode ? 'dark-mode' : ''}`}>
      {/* ⌨️ Command Palette */}
      {showCommandPalette && (
        <div className="command-palette-overlay" onClick={() => setShowCommandPalette(false)}>
          <div className="command-palette" onClick={(e) => e.stopPropagation()}>
            <div className="command-palette-header">
              <span className="command-icon">⌘</span>
              <input 
                ref={commandInputRef}
                type="text" 
                className="command-input" 
                placeholder="Type a command or search..." 
                value={commandSearch}
                onChange={(e) => setCommandSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && filteredCommands.length > 0) {
                    executeCommand(filteredCommands[0]);
                  }
                }}
                autoFocus
              />
              <kbd className="command-esc">ESC</kbd>
            </div>
            <div className="command-results">
              {filteredCommands.length === 0 ? (
                <div className="command-empty">No commands found</div>
              ) : (
                Object.entries(
                  filteredCommands.reduce((acc, cmd) => {
                    if (!acc[cmd.category]) acc[cmd.category] = [];
                    acc[cmd.category].push(cmd);
                    return acc;
                  }, {})
                ).map(([category, commands]) => (
                  <div key={category}>
                    <div className="command-category">{category}</div>
                    {commands.map(cmd => (
                      <button 
                        key={cmd.id} 
                        className="command-item"
                        onClick={() => executeCommand(cmd)}
                      >
                        <span className="command-item-icon">{cmd.icon}</span>
                        <span className="command-item-label">{cmd.label}</span>
                        <span className="command-item-arrow">→</span>
                      </button>
                    ))}
                  </div>
                ))
              )}
            </div>
            <div className="command-palette-footer">
              <span>💡 Press <kbd>Ctrl+K</kbd> to toggle • <kbd>Enter</kbd> to execute • <kbd>Esc</kbd> to close</span>
            </div>
          </div>
        </div>
      )}

      {/* Notification Toast */}
      {notification && (
        <div key={notification.id} className={`toast toast-${notification.type}`}>
          {notification.message}
        </div>
      )}

      {/* Sidebar */}
      <aside className={`admin-sidebar ${sidebarOpen ? 'open' : 'closed'}`}>
        <div className="sidebar-header">
          <img src={logoImage} alt="ATIRATH" className="logo-image" />
          <button className="sidebar-toggle" onClick={() => setSidebarOpen(!sidebarOpen)}>
            {sidebarOpen ? '◀' : '▶'}
          </button>
        </div>
        <nav className="sidebar-nav">
          <div className="nav-section">
            <button 
              className={`nav-item ${activeTab === "dashboard" ? "nav-active" : ""}`} 
              onClick={() => handleTabChange("dashboard")}
            >
              <span className="nav-icon">📊</span>
              <span className="nav-text">Dashboard</span>
            </button>
          </div>
          <div className="nav-section">
            <div className="nav-section-title">Operations</div>
            <button 
              className={`nav-item ${activeTab === "clients" ? "nav-active" : ""}`} 
              onClick={() => handleTabChange("clients")}
            >
              <span className="nav-icon">👥</span>
              <span className="nav-text">Manage Clients</span>
            </button>
            <button 
              className={`nav-item ${activeTab === "shipments" ? "nav-active" : ""}`} 
              onClick={() => handleTabChange("shipments")}
            >
              <span className="nav-icon">🚚</span>
              <span className="nav-text">Live Shipments</span>
            </button>
            <button 
              className={`nav-item ${activeTab === "fleet" ? "nav-active" : ""}`} 
              onClick={() => handleTabChange("fleet")}
            >
              <span className="nav-icon">🚛</span>
              <span className="nav-text">Fleet & Drivers</span>
            </button>
            <button 
              className={`nav-item ${activeTab === "hubs" ? "nav-active" : ""}`} 
              onClick={() => handleTabChange("hubs")}
            >
              <span className="nav-icon">🏭</span>
              <span className="nav-text">Hubs & Warehouses</span>
            </button>
          </div>
          <div className="nav-section">
            <div className="nav-section-title">Analytics</div>
            <button 
              className={`nav-item ${activeTab === "analytics" ? "nav-active" : ""}`} 
              onClick={() => handleTabChange("analytics")}
            >
              <span className="nav-icon">📈</span>
              <span className="nav-text">Advanced Analytics</span>
            </button>
            <button 
              className={`nav-item ${activeTab === "pricing" ? "nav-active" : ""}`} 
              onClick={() => handleTabChange("pricing")}
            >
              <span className="nav-icon">💲</span>
              <span className="nav-text">Rate Cards</span>
            </button>
            <button 
              className={`nav-item ${activeTab === "reports" ? "nav-active" : ""}`} 
              onClick={() => handleTabChange("reports")}
            >
              <span className="nav-icon">📊</span>
              <span className="nav-text">Reports</span>
            </button>
          </div>
          <div className="nav-section">
            <div className="nav-section-title">System</div>
            <button 
              className={`nav-item ${activeTab === "support" ? "nav-active" : ""}`} 
              onClick={() => handleTabChange("support")}
            >
              <span className="nav-icon">🎫</span>
              <span className="nav-text">Tickets</span>
              {tickets.filter(t => t.status === "Open").length > 0 && (
                <span className="nav-badge">{tickets.filter(t => t.status === "Open").length}</span>
              )}
            </button>
            <button 
              className={`nav-item ${activeTab === "notifications" ? "nav-active" : ""}`} 
              onClick={() => handleTabChange("notifications")}
            >
              <span className="nav-icon">📢</span>
              <span className="nav-text">Broadcast</span>
            </button>
            <button 
              className={`nav-item ${activeTab === "audit" ? "nav-active" : ""}`} 
              onClick={() => handleTabChange("audit")}
            >
              <span className="nav-icon">📋</span>
              <span className="nav-text">Audit Trail</span>
            </button>
            <button 
              className={`nav-item ${activeTab === "settings" ? "nav-active" : ""}`} 
              onClick={() => handleTabChange("settings")}
            >
              <span className="nav-icon">⚙️</span>
              <span className="nav-text">Settings</span>
            </button>
          </div>
        </nav>
        <div className="sidebar-footer">
          <button className="nav-item" onClick={() => setDarkMode(!darkMode)}>
            <span className="nav-icon">{darkMode ? '☀️' : '🌙'}</span>
            <span className="nav-text">{darkMode ? 'Light Mode' : 'Dark Mode'}</span>
          </button>
          <button className="nav-item logout-item" onClick={handleLogout}>
            <span className="nav-icon">🚪</span>
            <span className="nav-text">Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="admin-main">
        <header className="admin-topbar">
          <div className="topbar-left">
            <button className="menu-toggle" onClick={() => setSidebarOpen(!sidebarOpen)}>☰</button>
            <div>
              <h1 className="topbar-title">Admin Dashboard</h1>
              <p className="topbar-subtitle">Manage your logistics operations</p>
            </div>
          </div>
          <div className="topbar-right">
            <button 
              className="btn-sm btn-secondary" 
              onClick={() => setShowCommandPalette(true)}
              style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              <span>⌘</span>
              <span>Commands</span>
              <kbd style={{ background: '#e5e7eb', padding: '2px 6px', borderRadius: '4px', fontSize: '10px' }}>Ctrl+K</kbd>
            </button>
            <button 
              className="btn-sm btn-secondary" 
              onClick={() => setShowAiPanel(!showAiPanel)}
              style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              <span>🧠</span>
              <span>AI Insights</span>
              {aiInsights.filter(i => i.priority === 'urgent').length > 0 && (
                <span className="badge badge-danger" style={{ marginLeft: '4px' }}>
                  {aiInsights.filter(i => i.priority === 'urgent').length}
                </span>
              )}
            </button>
            <button className="btn-sm btn-secondary" onClick={() => setDarkMode(!darkMode)}>
              {darkMode ? '☀️ Light' : '🌙 Dark'}
            </button>
            <div className="user-profile">
              <div className="user-avatar">A</div>
              <div className="user-info">
                <div className="user-name">Super Admin</div>
                <div className="user-role">Administrator</div>
              </div>
            </div>
            <button className="topbar-logout-btn" onClick={handleLogout} title="Logout">
              <span>🚪</span>
              <span>Logout</span>
            </button>
          </div>
        </header>
        
        {/* Open Tabs Bar */}
        {openTabs.length > 1 && (
          <div className="open-tabs-bar">
            {openTabs.map(tab => (
              <button 
                key={tab.id}
                className={`open-tab ${activeTab === tab.id ? 'active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                <span className="open-tab-icon">{tab.icon}</span>
                <span className="open-tab-label">{tab.label}</span>
                {tab.id !== 'dashboard' && (
                  <button 
                    className="open-tab-close"
                    onClick={(e) => closeTab(tab.id, e)}
                  >
                    ×
                  </button>
                )}
              </button>
            ))}
          </div>
        )}
        
        <div className="dashboard-content">
          {renderContent()}
        </div>
      </div>

      {/* All Modals (from original code - kept intact for brevity, but include all existing modal types) */}
      {showModal && (
        <div className="modal-overlay" onClick={() => !modalLoading && setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">
                {modalType === "client-details" && `👤 ${selectedItem?.name || 'Client'} Profile`}
                {modalType === "driver-details" && `🚛 ${selectedItem?.name || 'Driver'} Details`}
                {modalType === "shipment-details" && `📦 Shipment Details: ${selectedItem?.trackingId || selectedItem?.id.slice(0,10)}`}
                {modalType === "bulk-update" && `⚡ Bulk Update (${selectedShipments.length} Selected)`}
                {modalType === "update-status" && "🚚 Update Shipment"}
                {modalType === "add-funds" && "💰 Manage Wallet"}
                {modalType === "reply-ticket" && "💬 Reply to Ticket"}
                {modalType === "add-driver" && "🚛 Add New Driver"}
                {modalType === "add-hub" && "🏭 Add Hub"}
                {(modalType === "add-rate-card" || modalType === "edit-rate-card") && "💲 Manage Rate Card"}
              </h2>
              <button className="modal-close" onClick={() => !modalLoading && setShowModal(false)}>✕</button>
            </div>
            
            <div className="modal-body">
              {/* Client Details Modal */}
              {modalType === "client-details" && selectedItem && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  <div style={{ display: 'flex', gap: '16px', alignItems: 'center', padding: '16px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                    <div className="user-avatar" style={{ width: '64px', height: '64px', fontSize: '28px', flexShrink: 0 }}>
                      {selectedItem.name?.charAt(0) || selectedItem.email?.charAt(0) || 'U'}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <h3 style={{ margin: 0, fontSize: '20px', fontWeight: '700' }}>{selectedItem.name || 'Unnamed Client'}</h3>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          {getStatusBadge(selectedItem.status || 'active')}
                          {getStatusBadge(selectedItem.kycStatus || 'Pending')}
                        </div>
                      </div>
                      <p style={{ margin: '4px 0 0 0', color: '#64748b', fontSize: '14px' }}>{selectedItem.email}</p>
                      <div style={{ marginTop: '8px', display: 'flex', gap: '12px' }}>
                        <button className="btn-xs btn-secondary" onClick={() => handleContactClient(selectedItem, "email")}>📧 Email</button>
                        <button className="btn-xs btn-secondary" onClick={() => handleContactClient(selectedItem, "phone")}>📞 Call</button>
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
                    <div style={{ padding: '12px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                      <div className="text-small text-muted">Wallet Balance</div>
                      <div className="amount-text" style={{ fontSize: '20px', fontWeight: '700' }}>
                        ₹{getWalletBalance(selectedItem.id).toLocaleString()}
                      </div>
                    </div>
                    <div style={{ padding: '12px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                      <div className="text-small text-muted">Total Shipments</div>
                      <div className="font-semibold" style={{ fontSize: '20px' }}>{selectedItem.totalShipments || 0}</div>
                    </div>
                    <div style={{ padding: '12px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                      <div className="text-small text-muted">Phone Number</div>
                      <div className="font-semibold">{selectedItem.phone || 'Not Provided'}</div>
                    </div>
                    <div style={{ padding: '12px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                      <div className="text-small text-muted">GST / Tax ID</div>
                      <div className="font-semibold">{selectedItem.gstin || 'Not Provided'}</div>
                    </div>
                  </div>
                  {(!selectedItem.kycStatus || selectedItem.kycStatus === "Pending") && (
                    <div style={{ padding: '12px', background: '#fffbeb', borderRadius: '8px', border: '1px solid #fcd34d' }}>
                      <div className="font-semibold" style={{ fontSize: '14px', marginBottom: '8px', color: '#92400e' }}>
                        ⚠️ KYC Verification Required
                      </div>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button className="btn-xs btn-success" onClick={() => handleKYCVerification(selectedItem.id, "Verified")}>
                          ✅ Approve KYC
                        </button>
                        <button className="btn-xs btn-danger" onClick={() => handleKYCVerification(selectedItem.id, "Rejected")}>
                          ❌ Reject KYC
                        </button>
                      </div>
                    </div>
                  )}
                  <div>
                    <h4 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '12px', color: '#334155' }}>📦 Recent Shipments</h4>
                    <div className="table-wrapper">
                      <table style={{ fontSize: '13px' }}>
                        <thead>
                          <tr>
                            <th>Tracking ID</th>
                            <th>Route</th>
                            <th>Status</th>
                            <th>Date</th>
                          </tr>
                        </thead>
                        <tbody>
                          {getClientShipments(selectedItem.id).length > 0 ? getClientShipments(selectedItem.id).map(s => (
                            <tr key={s.id}>
                              <td><span className="mono-text">{s.trackingId || s.id.slice(0,8)}</span></td>
                              <td>{s.pickupCity} → {s.dropCity}</td>
                              <td>{getStatusBadge(s.status)}</td>
                              <td className="text-small text-muted">{s.createdAt?.toLocaleDateString() || 'N/A'}</td>
                            </tr>
                          )) : <tr><td colSpan="4" className="empty-cell" style={{ padding: '12px' }}>No shipments recorded yet</td></tr>}
                        </tbody>
                      </table>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '12px', marginTop: '8px', paddingTop: '16px', borderTop: '1px solid #e2e8f0' }}>
                    <button 
                      className="btn-sm btn-primary" 
                      style={{ flex: 1 }} 
                      onClick={() => { setModalType("add-funds"); setFormData({ amount: "", action: "add" }); }}
                    >
                      💰 Add / Deduct Funds
                    </button>
                    <button 
                      className={`btn-sm ${selectedItem.status === "banned" ? "btn-success" : "btn-danger"}`} 
                      style={{ flex: 1 }} 
                      onClick={() => { handleToggleClientStatus(selectedItem.id, selectedItem.status || 'active'); setShowModal(false); }}
                    >
                      {selectedItem.status === "banned" ? "✅ Unblock Client" : "🚫 Block Client"}
                    </button>
                  </div>
                </div>
              )}

              {/* Driver Details Modal */}
              {modalType === "driver-details" && selectedItem && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  <div style={{ display: 'flex', gap: '16px', alignItems: 'center', padding: '16px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                    <div className="user-avatar" style={{ width: '64px', height: '64px', fontSize: '28px', flexShrink: 0, background: 'var(--info)' }}>
                      {selectedItem.name?.charAt(0) || 'D'}
                    </div>
                    <div style={{ flex: 1 }}>
                      <h3 style={{ margin: 0, fontSize: '20px', fontWeight: '700' }}>{selectedItem.name}</h3>
                      <p style={{ margin: '4px 0 0 0', color: '#64748b', fontSize: '14px' }}>{selectedItem.phone}</p>
                      <div style={{ marginTop: '8px' }}>{getStatusBadge(selectedItem.status || 'offline')}</div>
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div style={{ padding: '12px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                      <div className="text-small text-muted">Vehicle Number</div>
                      <div className="font-semibold">{selectedItem.vehicleNumber}</div>
                    </div>
                    <div style={{ padding: '12px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                      <div className="text-small text-muted">Vehicle Type</div>
                      <div className="font-semibold">{selectedItem.vehicleType}</div>
                    </div>
                    <div style={{ padding: '12px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                      <div className="text-small text-muted">License Number</div>
                      <div className="font-semibold">{selectedItem.licenseNumber || 'Not Provided'}</div>
                    </div>
                    <div style={{ padding: '12px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                      <div className="text-small text-muted">Performance Rating</div>
                      <div className="font-semibold">⭐ {selectedItem.rating || 5.0} / 5.0</div>
                    </div>
                  </div>
                  <div>
                    <h4 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '12px', color: '#334155' }}>
                      📦 Currently Assigned Shipments
                    </h4>
                    <div className="table-wrapper">
                      <table style={{ fontSize: '13px' }}>
                        <thead>
                          <tr>
                            <th>Tracking ID</th>
                            <th>Route</th>
                            <th>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {getDriverShipments(selectedItem.id).length > 0 ? getDriverShipments(selectedItem.id).map(s => (
                            <tr key={s.id}>
                              <td><span className="mono-text">{s.trackingId || s.id.slice(0,8)}</span></td>
                              <td>{s.pickupCity} → {s.dropCity}</td>
                              <td>{getStatusBadge(s.status)}</td>
                            </tr>
                          )) : <tr><td colSpan="3" className="empty-cell" style={{ padding: '12px' }}>No active shipments assigned</td></tr>}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* Shipment Details Modal */}
              {modalType === "shipment-details" && selectedItem && (() => {
                const details = getShipmentDetails(selectedItem.id);
                if (!details) return null;
                return (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                      <div>
                        <div className="text-small text-muted">Tracking ID</div>
                        <div className="font-semibold mono-text" style={{ fontSize: '18px' }}>{details.trackingId || details.id}</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div className="text-small text-muted">Current Status</div>
                        <div style={{ marginTop: '4px' }}>{getStatusBadge(details.status)}</div>
                      </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                      <div style={{ padding: '16px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                        <h4 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '12px', color: '#334155' }}>👤 Client Information</h4>
                        <div className="font-semibold">{getClientName(details.userId, details.clientName, details.userEmail)}</div>
                        <div className="text-small text-muted">{details.userEmail || 'No Email'}</div>
                        <div className="text-small text-muted">{details.client?.phone || 'No Phone'}</div>
                      </div>
                      <div style={{ padding: '16px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                        <h4 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '12px', color: '#334155' }}>🚛 Driver & Vehicle</h4>
                        {details.driver ? (
                          <>
                            <div className="font-semibold">{details.driver.name}</div>
                            <div className="text-small text-muted">{details.driver.vehicleType} | {details.driver.vehicleNumber}</div>
                            <div className="text-small text-muted">{details.driver.phone}</div>
                          </>
                        ) : (
                          <div className="text-small text-muted">No driver assigned yet.</div>
                        )}
                      </div>
                      <div style={{ padding: '16px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                        <h4 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '12px', color: '#334155' }}>📍 Route Details</h4>
                        <div className="text-small"><strong>Pickup:</strong> {details.pickupCity || 'N/A'}</div>
                        <div className="text-small"><strong>Drop:</strong> {details.dropCity || 'N/A'}</div>
                        <div className="text-small"><strong>Weight:</strong> {details.weight || 0} kg</div>
                      </div>
                      <div style={{ padding: '16px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                        <h4 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '12px', color: '#334155' }}>💰 Financials</h4>
                        <div className="amount-text" style={{ fontSize: '20px', fontWeight: '700' }}>₹{Number(details.amount || 0).toLocaleString()}</div>
                        <div className="text-small text-muted">Payment Status: {details.paymentStatus || 'Pending'}</div>
                      </div>
                    </div>
                    <div>
                      <h4 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '12px', color: '#334155' }}>🕒 Live Tracking Timeline</h4>
                      <div style={{ padding: '16px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0', maxHeight: '250px', overflowY: 'auto' }}>
                        {details.timeline.length > 0 ? details.timeline.map((event, idx) => (
                          <div key={idx} style={{ display: 'flex', gap: '12px', marginBottom: idx < details.timeline.length - 1 ? '16px' : '0', position: 'relative' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                              <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: 'var(--primary)', flexShrink: 0 }}></div>
                              {idx < details.timeline.length - 1 && <div style={{ width: '2px', flex: 1, background: '#e2e8f0', marginTop: '4px' }}></div>}
                            </div>
                            <div style={{ flex: 1, paddingBottom: '8px' }}>
                              <div className="font-semibold" style={{ fontSize: '14px' }}>{event.status}</div>
                              <div className="text-small" style={{ color: '#475569' }}>{event.description}</div>
                              <div className="text-small text-muted" style={{ fontSize: '11px', marginTop: '4px' }}>
                                {event.location} • {event.timestamp?.toLocaleString() || 'Just now'}
                              </div>
                            </div>
                          </div>
                        )) : <p className="text-small text-muted">No tracking events recorded yet.</p>}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '12px', marginTop: '8px', paddingTop: '16px', borderTop: '1px solid #e2e8f0' }}>
                      <button 
                        className="btn-sm btn-primary" 
                        style={{ flex: 1 }} 
                        onClick={() => { setModalType("update-status"); setFormData({}); }}
                      >
                        🚚 Update Status
                      </button>
                      <button 
                        className="btn-sm btn-secondary" 
                        style={{ flex: 1 }} 
                        onClick={() => handlePrintLabel(details)}
                      >
                        🖨️ Print Label
                      </button>
                    </div>
                  </div>
                );
              })()}

              {/* Bulk Update Modal */}
              {modalType === "bulk-update" && (
                <div className="form-group">
                  <div style={{ padding: '12px', background: '#fffbeb', borderRadius: '8px', border: '1px solid #fcd34d', marginBottom: '16px' }}>
                    <div className="font-semibold" style={{ fontSize: '14px', color: '#92400e' }}>
                      ⚠️ You are about to update {selectedShipments.length} shipments.
                    </div>
                  </div>
                  <label className="form-label">Select New Status for All Selected:</label>
                  <select 
                    className="form-select-large" 
                    onChange={(e) => setFormData({...formData, bulkNewStatus: e.target.value})} 
                    value={formData.bulkNewStatus || ""}
                  >
                    <option value="" disabled>Choose a status...</option>
                    <option value="Picked Up">📦 Picked Up</option>
                    <option value="In Transit">🚚 In Transit</option>
                    <option value="Out for Delivery">🛵 Out for Delivery</option>
                    <option value="Delivered">✅ Delivered</option>
                  </select>
                  <label className="form-label" style={{ marginTop: '16px' }}>Assign Driver to All (Optional):</label>
                  <select 
                    className="form-select-large" 
                    onChange={(e) => setFormData({...formData, bulkDriverId: e.target.value})} 
                    value={formData.bulkDriverId || ""}
                  >
                    <option value="">-- Keep Current / Unassigned --</option>
                    {getAvailableDrivers().map(driver => (
                      <option key={driver.id} value={driver.id}>
                        {driver.name} ({driver.vehicleNumber})
                      </option>
                    ))}
                  </select>
                  <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
                    <button 
                      className="btn-sm btn-primary" 
                      style={{ flex: 1 }} 
                      onClick={async () => {
                        if (!formData.bulkNewStatus) { 
                          showNotification("Please select a status", "error"); 
                          return; 
                        }
                        setModalLoading(true);
                        try {
                          const batch = writeBatch(db);
                          selectedShipments.forEach(id => {
                            const ref = doc(db, "shipments", id);
                            const updateData = { status: formData.bulkNewStatus, updatedAt: serverTimestamp() };
                            if (formData.bulkDriverId) { 
                              updateData.assignedDriverId = formData.bulkDriverId; 
                              const d = drivers.find(dr => dr.id === formData.bulkDriverId); 
                              updateData.assignedDriverName = d?.name || ""; 
                            }
                            batch.update(ref, updateData);
                          });
                          await batch.commit();
                          showNotification(`${selectedShipments.length} shipments updated successfully!`, "success");
                          setSelectedShipments([]); 
                          setShowModal(false); 
                          setFormData({});
                        } catch (error) { 
                          showNotification("Failed to update shipments", "error"); 
                        } finally { 
                          setModalLoading(false); 
                        }
                      }} 
                      disabled={modalLoading || !formData.bulkNewStatus}
                    >
                      {modalLoading ? "Processing..." : "Confirm Bulk Update"}
                    </button>
                  </div>
                </div>
              )}

              {/* Update Status Modal */}
              {modalType === "update-status" && selectedItem && (
                <div className="form-group">
                  <div style={{ marginBottom: '16px' }}>
                    <p><strong>Tracking:</strong> <span className="mono-text">{selectedItem.trackingId || selectedItem.id}</span></p>
                    <p><strong>Current Status:</strong> {getStatusBadge(selectedItem.status)}</p>
                    <p><strong>Client:</strong> {getClientName(selectedItem.userId, selectedItem.clientName, selectedItem.userEmail)}</p>
                  </div>
                  <div style={{ marginTop: '16px', padding: '16px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0', maxHeight: '200px', overflowY: 'auto' }}>
                    <p style={{ fontSize: '12px', fontWeight: '700', marginBottom: '12px', color: '#475569', textTransform: 'uppercase' }}>
                      📍 Recent Tracking Events:
                    </p>
                    {getShipmentTimeline(selectedItem.id).length > 0 ? getShipmentTimeline(selectedItem.id).map((event, idx) => (
                      <div key={idx} style={{ 
                        fontSize: '13px', color: '#334155', marginBottom: '8px', paddingBottom: '8px', 
                        borderBottom: idx < getShipmentTimeline(selectedItem.id).length - 1 ? '1px solid #e2e8f0' : 'none', 
                        display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' 
                      }}>
                        <span style={{ flex: 1 }}>• {event.description}</span>
                        <span style={{ color: '#94a3b8', fontSize: '11px', marginLeft: '12px', whiteSpace: 'nowrap' }}>
                          {event.timestamp?.toLocaleString() || 'Just now'}
                        </span>
                      </div>
                    )) : <p style={{ fontSize: '13px', color: '#94a3b8', fontStyle: 'italic' }}>No events recorded yet.</p>}
                  </div>
                  <label className="form-label" style={{ marginTop: '20px', display: 'block' }}>New Status:</label>
                  <select 
                    className="form-select-large" 
                    onChange={(e) => setFormData({...formData, newStatus: e.target.value})} 
                    value={formData.newStatus || ""}
                  >
                    <option value="" disabled>Select status...</option>
                    <option value="Booked">📝 Booked</option>
                    <option value="Picked Up">📦 Picked Up</option>
                    <option value="In Transit">🚚 In Transit</option>
                    <option value="Out for Delivery">🛵 Out for Delivery</option>
                    <option value="Delivered">✅ Delivered</option>
                    <option value="Cancelled">❌ Cancelled</option>
                  </select>
                  <label className="form-label" style={{ marginTop: '16px', display: 'block' }}>Assign Driver (Optional):</label>
                  <select 
                    className="form-select-large" 
                    onChange={(e) => setFormData({...formData, assignedDriverId: e.target.value})} 
                    value={formData.assignedDriverId || ""}
                  >
                    <option value="">-- Keep Current / Unassigned --</option>
                    {getAvailableDrivers().map(driver => (
                      <option key={driver.id} value={driver.id}>
                        {driver.name} ({driver.vehicleNumber}) - {driver.vehicleType}
                      </option>
                    ))}
                    {getAvailableDrivers().length === 0 && <option disabled>No available drivers</option>}
                  </select>
                  <p className="form-hint" style={{ marginTop: '12px' }}>⚠️ Client will be notified instantly upon update.</p>
                </div>
              )}

              {/* Add Funds Modal */}
              {modalType === "add-funds" && selectedItem && (
                <div className="form-group">
                  <div style={{ marginBottom: '20px', padding: '16px', background: '#f8fafc', borderRadius: '8px' }}>
                    <p><strong>Client:</strong> {selectedItem.name || selectedItem.email}</p>
                    <p><strong>Current Balance:</strong> <span className="amount-text">₹{getWalletBalance(selectedItem.id).toLocaleString()}</span></p>
                  </div>
                  <div className="form-row" style={{ marginTop: '16px' }}>
                    <div className="form-group" style={{ flex: 1 }}>
                      <label className="form-label">Amount (₹) *</label>
                      <input 
                        type="number" 
                        className="form-input-large" 
                        value={formData.amount || ""} 
                        onChange={(e) => setFormData({...formData, amount: e.target.value})} 
                        placeholder="Enter amount" 
                        min="1" 
                      />
                    </div>
                    <div className="form-group" style={{ flex: 1 }}>
                      <label className="form-label">Action *</label>
                      <div className="action-buttons" style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                        <button 
                          type="button" 
                          className={`btn-sm ${formData.action === "add" ? "btn-success" : "btn-secondary"}`} 
                          onClick={() => setFormData({...formData, action: "add"})} 
                          style={{ flex: 1 }}
                        >
                          ➕ Add
                        </button>
                        <button 
                          type="button" 
                          className={`btn-sm ${formData.action === "deduct" ? "btn-danger" : "btn-secondary"}`} 
                          onClick={() => setFormData({...formData, action: "deduct"})} 
                          style={{ flex: 1 }}
                        >
                          ➖ Deduct
                        </button>
                      </div>
                    </div>
                  </div>
                  <p className="form-hint" style={{ marginTop: '12px' }}>Client will receive a notification about this transaction.</p>
                </div>
              )}

              {/* Reply Ticket Modal */}
              {modalType === "reply-ticket" && (
                <>
                  <div className="form-group">
                    <label className="form-label">Reply Message *</label>
                    <textarea 
                      rows="6" 
                      className="form-textarea-large" 
                      value={formData.replyMessage || ''} 
                      onChange={(e) => setFormData({...formData, replyMessage: e.target.value})} 
                      placeholder="Type your professional reply to the client..." 
                      required 
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Update Ticket Status</label>
                    <select 
                      className="form-select-large" 
                      value={formData.ticketStatus || selectedItem?.status || "In Progress"} 
                      onChange={(e) => setFormData({...formData, ticketStatus: e.target.value})}
                    >
                      <option value="Open">Open</option>
                      <option value="In Progress">In Progress</option>
                      <option value="Resolved">Resolved</option>
                      <option value="Closed">Closed</option>
                    </select>
                  </div>
                </>
              )}

              {/* Add Driver Modal */}
              {modalType === "add-driver" && (
                <>
                  <div className="form-row">
                    <div className="form-group" style={{ flex: 1 }}>
                      <label className="form-label">Driver Name *</label>
                      <input 
                        type="text" 
                        className="form-input-large" 
                        value={formData.name || ''} 
                        onChange={(e) => setFormData({...formData, name: e.target.value})} 
                        placeholder="Enter driver name" 
                      />
                    </div>
                    <div className="form-group" style={{ flex: 1 }}>
                      <label className="form-label">Phone Number *</label>
                      <input 
                        type="tel" 
                        className="form-input-large" 
                        value={formData.phone || ''} 
                        onChange={(e) => setFormData({...formData, phone: e.target.value})} 
                        placeholder="+91 XXXXX XXXXX" 
                      />
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Vehicle Number *</label>
                    <input 
                      type="text" 
                      className="form-input-large" 
                      value={formData.vehicleNumber || ''} 
                      onChange={(e) => setFormData({...formData, vehicleNumber: e.target.value})} 
                      placeholder="e.g., TS07AB1234" 
                    />
                  </div>
                  <div className="form-row">
                    <div className="form-group" style={{ flex: 1 }}>
                      <label className="form-label">Vehicle Type</label>
                      <select 
                        className="form-select-large" 
                        value={formData.vehicleType || 'Truck'} 
                        onChange={(e) => setFormData({...formData, vehicleType: e.target.value})}
                      >
                        <option value="Truck">Truck</option>
                        <option value="Mini Truck">Mini Truck</option>
                        <option value="Tempo">Tempo</option>
                        <option value="Bike">Bike</option>
                        <option value="Auto">Auto</option>
                      </select>
                    </div>
                    <div className="form-group" style={{ flex: 1 }}>
                      <label className="form-label">License Number</label>
                      <input 
                        type="text" 
                        className="form-input-large" 
                        value={formData.licenseNumber || ''} 
                        onChange={(e) => setFormData({...formData, licenseNumber: e.target.value})} 
                        placeholder="Enter license number" 
                      />
                    </div>
                  </div>
                </>
              )}

              {/* Add Hub Modal */}
              {modalType === "add-hub" && (
                <>
                  <div className="form-row">
                    <div className="form-group" style={{ flex: 1 }}>
                      <label className="form-label">Hub Name *</label>
                      <input 
                        type="text" 
                        className="form-input-large" 
                        value={formData.name || ''} 
                        onChange={(e) => setFormData({...formData, name: e.target.value})} 
                        placeholder="e.g., Hyderabad Central Hub" 
                      />
                    </div>
                    <div className="form-group" style={{ flex: 1 }}>
                      <label className="form-label">Location/City *</label>
                      <input 
                        type="text" 
                        className="form-input-large" 
                        value={formData.location || ''} 
                        onChange={(e) => setFormData({...formData, location: e.target.value})} 
                        placeholder="e.g., Hyderabad" 
                      />
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Full Address</label>
                    <textarea 
                      rows="3" 
                      className="form-textarea-large" 
                      value={formData.address || ''} 
                      onChange={(e) => setFormData({...formData, address: e.target.value})} 
                      placeholder="Enter complete address" 
                    />
                  </div>
                  <div className="form-row">
                    <div className="form-group" style={{ flex: 1 }}>
                      <label className="form-label">Contact Number</label>
                      <input 
                        type="tel" 
                        className="form-input-large" 
                        value={formData.contactNumber || ''} 
                        onChange={(e) => setFormData({...formData, contactNumber: e.target.value})} 
                        placeholder="Phone number" 
                      />
                    </div>
                    <div className="form-group" style={{ flex: 1 }}>
                      <label className="form-label">Capacity (kg)</label>
                      <input 
                        type="number" 
                        className="form-input-large" 
                        value={formData.capacity || ''} 
                        onChange={(e) => setFormData({...formData, capacity: e.target.value})} 
                        placeholder="1000" 
                      />
                    </div>
                  </div>
                </>
              )}

              {/* Rate Card Modal */}
              {(modalType === "add-rate-card" || modalType === "edit-rate-card") && (
                <>
                  <div className="form-row">
                    <div className="form-group" style={{ flex: 1 }}>
                      <label className="form-label">Route / Zone Name *</label>
                      <input 
                        type="text" 
                        className="form-input-large" 
                        value={formData.route || ''} 
                        onChange={(e) => setFormData({...formData, route: e.target.value})} 
                        placeholder="e.g., Mumbai to Delhi" 
                      />
                    </div>
                    <div className="form-group" style={{ flex: 1 }}>
                      <label className="form-label">Vehicle Type *</label>
                      <select 
                        className="form-select-large" 
                        value={formData.vehicleType || 'Truck'} 
                        onChange={(e) => setFormData({...formData, vehicleType: e.target.value})}
                      >
                        <option value="Truck">Truck</option>
                        <option value="Mini Truck">Mini Truck</option>
                        <option value="Tempo">Tempo</option>
                        <option value="Bike">Bike</option>
                      </select>
                    </div>
                  </div>
                  <div className="form-row">
                    <div className="form-group" style={{ flex: 1 }}>
                      <label className="form-label">Base Price (₹) *</label>
                      <input 
                        type="number" 
                        className="form-input-large" 
                        value={formData.basePrice || ''} 
                        onChange={(e) => setFormData({...formData, basePrice: Number(e.target.value)})} 
                      />
                    </div>
                    <div className="form-group" style={{ flex: 1 }}>
                      <label className="form-label">Per KG Rate (₹) *</label>
                      <input 
                        type="number" 
                        className="form-input-large" 
                        value={formData.perKg || ''} 
                        onChange={(e) => setFormData({...formData, perKg: Number(e.target.value)})} 
                      />
                    </div>
                  </div>
                  <div className="form-row">
                    <div className="form-group" style={{ flex: 1 }}>
                      <label className="form-label">Min Weight (kg)</label>
                      <input 
                        type="number" 
                        className="form-input-large" 
                        value={formData.minWeight || 1} 
                        onChange={(e) => setFormData({...formData, minWeight: Number(e.target.value)})} 
                      />
                    </div>
                    <div className="form-group" style={{ flex: 1 }}>
                      <label className="form-label">Status</label>
                      <select 
                        className="form-select-large" 
                        value={formData.status || 'active'} 
                        onChange={(e) => setFormData({...formData, status: e.target.value})}
                      >
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                      </select>
                    </div>
                  </div>
                </>
              )}
            </div>
            
            <div className="modal-footer">
              <button 
                type="button" 
                className="btn-sm btn-secondary" 
                onClick={() => !modalLoading && setShowModal(false)} 
                disabled={modalLoading}
              >
                Cancel
              </button>
              {modalType === "add-funds" && (
                <button 
                  type="button" 
                  className="btn-sm btn-primary" 
                  onClick={() => handleUpdateWallet(selectedItem.id, formData.amount, formData.action)} 
                  disabled={modalLoading || !formData.amount || !formData.action}
                >
                  {modalLoading ? "Processing..." : "Confirm Transaction"}
                </button>
              )}
              {modalType === "update-status" && (
                <button 
                  type="button" 
                  className="btn-sm btn-primary" 
                  onClick={() => handleUpdateShipmentStatus(selectedItem.id, formData.newStatus, formData.assignedDriverId)} 
                  disabled={modalLoading || !formData.newStatus}
                >
                  {modalLoading ? "Updating..." : "Confirm Update"}
                </button>
              )}
              {modalType === "reply-ticket" && (
                <button 
                  type="button" 
                  className="btn-sm btn-primary" 
                  onClick={handleReplyToTicket} 
                  disabled={modalLoading || !formData.replyMessage}
                >
                  {modalLoading ? "Sending..." : "Send Reply"}
                </button>
              )}
              {modalType === "add-driver" && (
                <button 
                  type="button" 
                  className="btn-sm btn-primary" 
                  onClick={handleAddDriver} 
                  disabled={modalLoading || !formData.name || !formData.phone || !formData.vehicleNumber}
                >
                  {modalLoading ? "Adding..." : "Add Driver"}
                </button>
              )}
              {modalType === "add-hub" && (
                <button 
                  type="button" 
                  className="btn-sm btn-primary" 
                  onClick={handleAddHub} 
                  disabled={modalLoading || !formData.name || !formData.location}
                >
                  {modalLoading ? "Adding..." : "Add Hub"}
                </button>
              )}
              {(modalType === "add-rate-card" || modalType === "edit-rate-card") && (
                <button 
                  type="button" 
                  className="btn-sm btn-primary" 
                  onClick={async () => {
                    if (!formData.route || !formData.basePrice) {
                      return showNotification("Please fill required fields", "error");
                    }
                    try {
                      setModalLoading(true);
                      const data = { ...formData, updatedAt: serverTimestamp() };
                      if (modalType === "add-rate-card") {
                        await addDoc(collection(db, "rate_cards"), { ...data, createdAt: serverTimestamp() });
                      } else {
                        await updateDoc(doc(db, "rate_cards", selectedItem.id), data);
                      }
                      showNotification(`Rate card ${modalType === "add-rate-card" ? "added" : "updated"}!`, "success");
                      setShowModal(false); 
                      setFormData({});
                    } catch (err) { 
                      showNotification("Failed to save rate card", "error"); 
                    } finally { 
                      setModalLoading(false); 
                    }
                  }} 
                  disabled={modalLoading || !formData.route}
                >
                  {modalLoading ? "Saving..." : "Save Rate Card"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}