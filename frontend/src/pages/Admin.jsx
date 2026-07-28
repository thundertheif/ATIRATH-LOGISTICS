import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { 
  collection, query, getDocs, addDoc, updateDoc, doc, setDoc,
  orderBy, limit, where, serverTimestamp, onSnapshot, increment,
  deleteDoc, writeBatch
} from "firebase/firestore";
import { db } from "../firebase";
import logoImage from "../assets/logo_3.png";
import "./Admin.css";

// 📊 Import Recharts for Analytics (Run: npm install recharts)
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

export default function Admin() {
  const { logout, currentUser } = useAuth();
  const navigate = useNavigate();
  
  const [activeTab, setActiveTab] = useState("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Real-time Data States
  const [shipments, setShipments] = useState([]);
  const [users, setUsers] = useState([]);
  const [wallets, setWallets] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [hubs, setHubs] = useState([]);
  const [trackingEvents, setTrackingEvents] = useState([]);
  const [systemSettings, setSystemSettings] = useState({ baseRate: 10, gst: 18, notice: "" });
  
  // Modal States
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState(""); 
  const [selectedItem, setSelectedItem] = useState(null);
  const [formData, setFormData] = useState({});
  const [notification, setNotification] = useState(null);
  const [modalLoading, setModalLoading] = useState(false);
  
  // Advanced States
  const [selectedClients, setSelectedClients] = useState([]);
  const [clientFilter, setClientFilter] = useState("all");
  const [selectedShipments, setSelectedShipments] = useState([]);
  const [shipmentFilter, setShipmentFilter] = useState("all");

  // 🔒 SECURITY CHECK: Ensure user is logged in (and ideally an admin)
  useEffect(() => {
    if (!currentUser) {
      navigate("/admin/login", { replace: true });
      return;
    }
    
    // TODO: Add role check here if you have a 'role' field in users collection
    // if (currentUser.role !== 'admin' && currentUser.role !== 'super_admin') {
    //   navigate("/", { replace: true });
    //   return;
    // }

    fetchInitialData();
    const cleanup = setupRealTimeListeners();
    return () => { if (cleanup) cleanup(); };
  }, [currentUser, navigate]);

  // Debounce search
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedSearch(searchQuery), 300);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  const showNotification = (message, type = "success") => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const setupRealTimeListeners = () => {
    const unsubShipments = onSnapshot(query(collection(db, "shipments"), orderBy("createdAt", "desc")), (snap) => {
      setShipments(snap.docs.map(d => ({ id: d.id, ...d.data(), createdAt: d.data().createdAt?.toDate?.() || new Date() })));
    });
    const unsubTickets = onSnapshot(query(collection(db, "support_tickets"), orderBy("createdAt", "desc")), (snap) => {
      setTickets(snap.docs.map(d => ({ id: d.id, ...d.data(), createdAt: d.data().createdAt?.toDate?.() || new Date() })));
    });
    const unsubDrivers = onSnapshot(collection(db, "drivers"), (snap) => { setDrivers(snap.docs.map(d => ({ id: d.id, ...d.data() }))); });
    const unsubHubs = onSnapshot(collection(db, "hubs"), (snap) => { setHubs(snap.docs.map(d => ({ id: d.id, ...d.data() }))); });
    const unsubEvents = onSnapshot(query(collection(db, "tracking_events"), orderBy("timestamp", "desc"), limit(100)), (snap) => {
      setTrackingEvents(snap.docs.map(d => ({ id: d.id, ...d.data(), timestamp: d.data().timestamp?.toDate?.() || new Date() })));
    });

    return () => { unsubShipments(); unsubTickets(); unsubDrivers(); unsubHubs(); unsubEvents(); };
  };

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      const usersSnap = await getDocs(collection(db, "users"));
      setUsers(usersSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      const walletsSnap = await getDocs(collection(db, "wallets"));
      setWallets(walletsSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      const settingsSnap = await getDocs(query(collection(db, "system_settings"), limit(1)));
      if (!settingsSnap.empty) setSystemSettings(settingsSnap.docs[0].data());
    } catch (error) {
      console.error("Error fetching data:", error);
      showNotification("Error loading data", "error");
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = (data, filename) => {
    if (!data || data.length === 0) { showNotification("No data to export", "error"); return; }
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
    link.href = url; link.setAttribute("download", `${filename}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
    showNotification("Data exported successfully!");
  };

  // ✅ FIXED: Robust Client Name Resolver with Fallbacks
  const getClientName = (userId, fallbackName, fallbackEmail) => {
    if (fallbackName) return fallbackName;
    if (fallbackEmail) return fallbackEmail;
    if (!userId) return "N/A";
    const user = users.find(u => u.id === userId);
    return user?.name || user?.email || "Unknown Client";
  };

  const getWalletBalance = (userId) => { const w = wallets.find(w => w.userId === userId); return w ? w.balance : 0; };

  const getStatusBadge = (status) => {
    const statusClass = { 
      "active": "badge-success", "banned": "badge-danger", "Booked": "badge-warning", 
      "Picked Up": "badge-info", "In Transit": "badge-info", "Out for Delivery": "badge-warning", 
      "Delivered": "badge-success", "Cancelled": "badge-danger", "Open": "badge-warning", 
      "In Progress": "badge-info", "Resolved": "badge-success", "Closed": "badge-secondary", 
      "available": "badge-success", "busy": "badge-warning", "offline": "badge-danger", 
      "Verified": "badge-success", "Pending": "badge-warning", "Rejected": "badge-danger", 
      "Good": "badge-success", "Service Due": "badge-warning", "Critical": "badge-danger" 
    }[status] || "badge-secondary";
    return <span className={`badge ${statusClass}`}>{status}</span>;
  };

  const getShipmentTimeline = (shipmentId) => trackingEvents.filter(e => e.shipmentId === shipmentId).sort((a, b) => (b.timestamp?.getTime?.() || 0) - (a.timestamp?.getTime?.() || 0)).slice(0, 5);
  const getAvailableDrivers = () => drivers.filter(d => d.status === "available");
  const getClientShipments = (userId) => shipments.filter(s => s.userId === userId).slice(0, 5);
  const getDriverShipments = (driverId) => shipments.filter(s => s.assignedDriverId === driverId && s.status !== "Delivered" && s.status !== "Cancelled").slice(0, 5);

  const handleToggleClientStatus = async (userId, currentStatus) => {
    if (!window.confirm(`Are you sure you want to ${currentStatus === "banned" ? "unblock" : "block"} this client?`)) return;
    try {
      setSaving(true);
      const newStatus = currentStatus === "banned" ? "active" : "banned";
      await updateDoc(doc(db, "users", userId), { status: newStatus, updatedAt: serverTimestamp() });
      showNotification(`Client ${newStatus === "banned" ? "blocked" : "unblocked"} successfully!`, "success");
      fetchInitialData();
    } catch (error) {
      showNotification("Failed to update client status", "error");
    } finally { setSaving(false); }
  };

  const handleUpdateWallet = async (userId, amount, type) => {
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) { showNotification("Please enter a valid amount greater than 0", "error"); return; }
    try {
      setModalLoading(true);
      const walletQuery = query(collection(db, "wallets"), where("userId", "==", userId));
      const walletSnap = await getDocs(walletQuery);
      const numericAmount = Number(amount);
      const change = type === "add" ? numericAmount : -numericAmount;

      if (!walletSnap.empty) {
        await updateDoc(doc(db, "wallets", walletSnap.docs[0].id), { balance: increment(change), totalRecharged: type === "add" ? increment(numericAmount) : increment(0), updatedAt: serverTimestamp() });
      } else {
        await addDoc(collection(db, "wallets"), { userId, balance: type === "add" ? numericAmount : -numericAmount, totalRecharged: type === "add" ? numericAmount : 0, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
      }
      await addDoc(collection(db, "notifications"), { userId, message: `Admin has ${type === "add" ? "added" : "deducted"} ₹${amount} to your wallet.`, type: "wallet", amount: numericAmount, action: type, read: false, createdAt: serverTimestamp() });
      await addDoc(collection(db, "transactions"), { userId, type, amount: numericAmount, performedBy: currentUser?.uid, performedByEmail: currentUser?.email, timestamp: serverTimestamp() });
      
      showNotification(`Wallet ${type === "add" ? "credited" : "debited"} successfully! Client notified.`, "success");
      setShowModal(false); setFormData({}); fetchInitialData();
    } catch (error) {
      showNotification("Failed to update wallet", "error");
    } finally { setModalLoading(false); }
  };

  const handleUpdateShipmentStatus = async (shipmentId, newStatus, assignedDriverId = null) => {
    if (!newStatus) { showNotification("Please select a status", "error"); return; }
    try {
      setModalLoading(true);
      const shipment = shipments.find(s => s.id === shipmentId);
      if (!shipment) { showNotification("Shipment not found", "error"); return; }

      const updateData = { status: newStatus, updatedAt: serverTimestamp() };
      if (assignedDriverId) {
        updateData.assignedDriverId = assignedDriverId;
        updateData.assignedDriverName = drivers.find(d => d.id === assignedDriverId)?.name || "";
      }

      await updateDoc(doc(db, "shipments", shipmentId), updateData);
      await addDoc(collection(db, "tracking_events"), { shipmentId, userId: shipment?.userId, status: newStatus, location: "Admin Update", description: assignedDriverId ? `Status updated to ${newStatus}. Assigned to driver.` : `Status updated to ${newStatus} by Admin`, performedBy: currentUser?.email, timestamp: serverTimestamp() });

      if (shipment?.userId) {
        await addDoc(collection(db, "notifications"), { userId: shipment.userId, message: `Your shipment ${shipment.trackingId || shipmentId} status updated to ${newStatus}`, type: "shipment", shipmentId, status: newStatus, read: false, createdAt: serverTimestamp() });
      }
      if (assignedDriverId && newStatus === "In Transit") {
        await updateDoc(doc(db, "drivers", assignedDriverId), { status: "busy", currentShipment: shipmentId, updatedAt: serverTimestamp() });
      }

      showNotification(`Shipment status updated to ${newStatus} successfully!`, "success");
      setShowModal(false); setFormData({});
    } catch (error) {
      showNotification("Failed to update shipment status", "error");
    } finally { setModalLoading(false); }
  };

  const handleReplyToTicket = async () => {
    if (!formData.replyMessage || formData.replyMessage.trim() === "") { showNotification("Please enter a reply message", "error"); return; }
    try {
      setModalLoading(true);
      const ticket = tickets.find(t => t.id === selectedItem.id);
      if (!ticket) return;

      await updateDoc(doc(db, "support_tickets", selectedItem.id), { replies: [...(ticket.replies || []), { message: formData.replyMessage.trim(), from: "admin", role: "Support Team", adminEmail: currentUser?.email, createdAt: serverTimestamp() }], status: formData.ticketStatus || ticket.status || "In Progress", lastReplyAt: serverTimestamp(), updatedAt: serverTimestamp() });
      if (ticket.userId) {
        await addDoc(collection(db, "notifications"), { userId: ticket.userId, message: `New reply to your ticket: ${ticket.subject || "Support Ticket"}`, type: "ticket", ticketId: selectedItem.id, read: false, createdAt: serverTimestamp() });
      }
      showNotification("Reply sent successfully! Client notified.", "success");
      setShowModal(false); setFormData({});
    } catch (error) {
      showNotification("Failed to send reply", "error");
    } finally { setModalLoading(false); }
  };

  const handleTicketStatusChange = async (ticketId, newStatus) => {
    try { await updateDoc(doc(db, "support_tickets", ticketId), { status: newStatus, updatedAt: serverTimestamp() }); showNotification("Ticket status updated", "success"); } 
    catch (error) { showNotification("Failed to update ticket", "error"); }
  };

  const handleAddDriver = async () => {
    if (!formData.name || !formData.phone || !formData.vehicleNumber) {
      showNotification("Please fill all required fields", "error");
      return;
    }
    try {
      setModalLoading(true);
      await addDoc(collection(db, "drivers"), { 
        name: formData.name.trim(), phone: formData.phone.trim(), vehicleNumber: formData.vehicleNumber.trim().toUpperCase(), 
        vehicleType: formData.vehicleType || "Truck", licenseNumber: formData.licenseNumber?.trim() || "", 
        status: "available", vehicleHealth: "Good", currentLocation: "", currentShipment: null, assignedShipments: [], 
        rating: 5.0, totalDeliveries: 0, createdAt: serverTimestamp(), updatedAt: serverTimestamp() 
      });
      showNotification("Driver added successfully!", "success"); 
      setShowModal(false); setFormData({});
    } catch (error) { 
      showNotification("Failed to add driver", "error"); 
    } finally { 
      setModalLoading(false); 
    }
  };

  const handleUpdateDriverStatus = async (driverId, newStatus) => {
    try { 
      await updateDoc(doc(db, "drivers", driverId), { status: newStatus, updatedAt: serverTimestamp() }); 
      showNotification("Driver status updated", "success"); 
    } catch (error) { 
      showNotification("Failed to update driver", "error"); 
    }
  };

  const handleUpdateDriverVehicleHealth = async (driverId, healthStatus) => {
    try {
      await updateDoc(doc(db, "drivers", driverId), { vehicleHealth: healthStatus, updatedAt: serverTimestamp() });
      showNotification("Vehicle health status updated!", "success");
    } catch (error) {
      showNotification("Failed to update vehicle health", "error");
    }
  };

  const handleAddHub = async () => {
    if (!formData.name || !formData.location) { showNotification("Please fill required fields", "error"); return; }
    try {
      setModalLoading(true);
      await addDoc(collection(db, "hubs"), { name: formData.name.trim(), location: formData.location.trim(), address: formData.address?.trim() || "", contactNumber: formData.contactNumber?.trim() || "", capacity: Number(formData.capacity) || 1000, currentLoad: 0, status: "active", managerName: "", operatingHours: "24/7", createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
      showNotification("Hub added successfully!", "success"); setShowModal(false); setFormData({});
    } catch (error) { showNotification("Failed to add hub", "error"); } finally { setModalLoading(false); }
  };

  const handleSaveSettings = async () => {
    try { setSaving(true); await setDoc(doc(db, "system_settings", "global_config"), systemSettings, { merge: true }); showNotification("Settings saved successfully!", "success"); } 
    catch (error) { showNotification("Failed to save settings", "error"); } finally { setSaving(false); }
  };

  const handleLogout = async () => {
    if (window.confirm("Are you sure you want to logout?")) {
      try { await logout(); navigate("/admin/login", { replace: true }); } 
      catch (error) { showNotification("Logout failed", "error"); }
    }
  };

  const handleKYCVerification = async (userId, newKycStatus) => {
    try { await updateDoc(doc(db, "users", userId), { kycStatus: newKycStatus, kycVerifiedAt: serverTimestamp(), verifiedBy: currentUser?.email }); showNotification(`Client KYC marked as ${newKycStatus}!`, "success"); fetchInitialData(); } 
    catch (error) { showNotification("Failed to update KYC status", "error"); }
  };

  const handleBulkClientAction = async (action) => {
    if (selectedClients.length === 0) { showNotification("Please select at least one client", "error"); return; }
    if (!window.confirm(`Are you sure you want to ${action} ${selectedClients.length} client(s)?`)) return;
    try {
      setSaving(true); const batch = writeBatch(db); const newStatus = action === "block" ? "banned" : "active";
      selectedClients.forEach(id => { const userRef = doc(db, "users", id); batch.update(userRef, { status: newStatus, updatedAt: serverTimestamp() }); });
      await batch.commit(); showNotification(`${selectedClients.length} clients ${action}ed successfully!`, "success"); setSelectedClients([]); fetchInitialData();
    } catch (error) { showNotification("Failed to perform bulk action", "error"); } finally { setSaving(false); }
  };

  const handleContactClient = (client, method) => {
    if (method === "email" && client.email) window.open(`mailto:${client.email}?subject=ATIRATH Logistics: Account Update`);
    else if (method === "phone" && client.phone) window.open(`tel:${client.phone}`);
    else showNotification("Contact information not available", "error");
  };

  const toggleClientSelection = (clientId) => setSelectedClients(prev => prev.includes(clientId) ? prev.filter(id => id !== clientId) : [...prev, clientId]);
  const toggleSelectAll = (filteredUsers) => { if (selectedClients.length === filteredUsers.length && filteredUsers.length > 0) setSelectedClients([]); else setSelectedClients(filteredUsers.map(u => u.id)); };

  const getShipmentDetails = (shipmentId) => {
    const shipment = shipments.find(s => s.id === shipmentId);
    if (!shipment) return null;
    return { ...shipment, driver: shipment.assignedDriverId ? drivers.find(d => d.id === shipment.assignedDriverId) : null, client: users.find(u => u.id === shipment.userId), timeline: getShipmentTimeline(shipmentId) };
  };

  const handleBulkShipmentAction = async (action, newStatus = null) => {
    if (selectedShipments.length === 0) { showNotification("Please select at least one shipment", "error"); return; }
    if (!window.confirm(`Are you sure you want to ${action} ${selectedShipments.length} shipment(s)?`)) return;
    try {
      setSaving(true); const batch = writeBatch(db);
      selectedShipments.forEach(id => { const shipmentRef = doc(db, "shipments", id); const updateData = { updatedAt: serverTimestamp() }; if (newStatus) updateData.status = newStatus; batch.update(shipmentRef, updateData); });
      await batch.commit(); showNotification(`${selectedShipments.length} shipments ${action}ed successfully!`, "success"); setSelectedShipments([]);
    } catch (error) { showNotification("Failed to perform bulk action", "error"); } finally { setSaving(false); }
  };

  const toggleShipmentSelection = (shipmentId) => setSelectedShipments(prev => prev.includes(shipmentId) ? prev.filter(id => id !== shipmentId) : [...prev, shipmentId]);
  const toggleSelectAllShipments = (filteredShipments) => { if (selectedShipments.length === filteredShipments.length && filteredShipments.length > 0) setSelectedShipments([]); else setSelectedShipments(filteredShipments.map(s => s.id)); };
  const handlePrintLabel = (shipment) => { showNotification("Generating shipping label...", "info"); setTimeout(() => window.print(), 500); };

  if (loading) return <div className="admin-loading"><div className="spinner-large"></div><p style={{ color: '#000000 !important' }}>Loading Admin Dashboard...</p></div>;

  const renderContent = () => {
    switch (activeTab) {
      case "dashboard": {
        const activeClients = users.filter(u => u.status !== "banned").length;
        const activeShipments = shipments.filter(s => s.status === "In Transit" || s.status === "Booked" || s.status === "Picked Up").length;
        const openTickets = tickets.filter(t => t.status === "Open").length;
        
        // ✅ FIXED: Accurate Revenue Calculation
        const totalRevenue = shipments
          .filter(s => s.status === "Delivered")
          .reduce((sum, s) => sum + (Number(s.amount) || 0), 0);
          
        const deliveredCount = shipments.filter(s => s.status === "Delivered").length;
        const offlineDrivers = drivers.filter(d => d.status === "offline").length;
        const highPriorityTickets = tickets.filter(t => t.priority === "High" || t.priority === "Urgent").length;
        const recentActivities = trackingEvents.slice(0, 5);
        const topHubs = hubs.slice(0, 3);
        
        // 🚨 NEW: Unassigned Shipments Alert
        const unassignedShipments = shipments.filter(s => !s.assignedDriverId && (s.status === "Booked" || s.status === "Picked Up"));

        // 📊 Chart Data Preparation
        const chartData = [
          { name: 'Mon', revenue: 25000 }, { name: 'Tue', revenue: 32000 },
          { name: 'Wed', revenue: 28000 }, { name: 'Thu', revenue: 45000 },
          { name: 'Fri', revenue: 52000 }, { name: 'Sat', revenue: 61000 }, { name: 'Sun', revenue: 38000 },
        ];

        return (
          <>
            {notification && <div className={`toast toast-${notification.type}`}>{notification.message}</div>}
            
            {unassignedShipments.length > 0 && (
              <div className="broadcast-notice" style={{ background: '#fee2e2', borderColor: '#ef4444', color: '#991b1b' }}>
                <span>⚠️ <strong>Action Required:</strong> {unassignedShipments.length} shipment(s) are pending driver assignment!</span>
                <button className="btn-sm btn-danger" onClick={() => { setActiveTab("shipments"); setShipmentFilter("Booked"); }}>Assign Now</button>
              </div>
            )}

            <div className="stats-grid">
              <div className="stat-card stat-primary"><div className="stat-icon">👥</div><div className="stat-info"><div className="stat-label">Active Clients</div><div className="stat-value">{activeClients}</div><div className="stat-subtitle">Total: {users.length}</div></div></div>
              <div className="stat-card stat-warning"><div className="stat-icon">🚚</div><div className="stat-info"><div className="stat-label">Active Shipments</div><div className="stat-value">{activeShipments}</div><div className="stat-subtitle">In transit / Booked</div></div></div>
              <div className="stat-card stat-danger"><div className="stat-icon">🎫</div><div className="stat-info"><div className="stat-label">Pending Tickets</div><div className="stat-value">{openTickets}</div><div className="stat-subtitle">Needs attention</div></div></div>
              <div className="stat-card stat-success"><div className="stat-icon">💰</div><div className="stat-info"><div className="stat-label">Total Revenue</div><div className="stat-value">₹{(totalRevenue / 100000).toFixed(2)}L</div><div className="stat-subtitle">{deliveredCount} deliveries</div></div></div>
            </div>

            {systemSettings.notice && (<div className="broadcast-notice"><span>📢 {systemSettings.notice}</span><button className="btn-sm btn-danger" onClick={() => { setSystemSettings({...systemSettings, notice: ""}); handleSaveSettings(); }}>Dismiss</button></div>)}
            
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px' }}>
              <div className="admin-section" style={{ marginBottom: 0 }}>
                <div className="section-header"><h2 className="section-title">Recent Shipments</h2><button className="btn-sm btn-primary" onClick={() => setActiveTab("shipments")}>View All</button></div>
                <div className="table-wrapper">
                  <table>
                    <thead><tr><th>Tracking ID</th><th>Client</th><th>Route</th><th>Status</th><th>Action</th></tr></thead>
                    <tbody>
                      {shipments.slice(0, 5).map((s) => (
                        <tr key={s.id}>
                          <td><span className="mono-text">{s.trackingId || s.id.slice(0, 10)}</span></td>
                          <td>{getClientName(s.userId, s.clientName, s.userEmail)}</td>
                          <td>{s.pickupCity || 'N/A'} → {s.dropCity || 'N/A'}</td>
                          <td>{getStatusBadge(s.status)}</td>
                          <td><button className="btn-xs btn-primary" onClick={() => { setSelectedItem(s); setModalType("update-status"); setFormData({}); setShowModal(true); }}>Update</button></td>
                        </tr>
                      ))}
                      {shipments.length === 0 && <tr><td colSpan="5" className="empty-cell">No shipments found</td></tr>}
                    </tbody>
                  </table>
                </div>
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                <div className="admin-section" style={{ marginBottom: 0 }}>
                  <h2 className="section-title" style={{ fontSize: '16px', marginBottom: '16px' }}>⚡ Quick Actions</h2>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <button className="btn-sm btn-primary" onClick={() => { setModalType("add-driver"); setFormData({}); setShowModal(true); }}>🚛 Add Driver</button>
                    <button className="btn-sm btn-secondary" onClick={() => setActiveTab("clients")}>👥 Manage Funds</button>
                    <button className="btn-sm btn-secondary" onClick={() => setActiveTab("support")}>🎫 View Tickets</button>
                    <button className="btn-sm btn-secondary" onClick={() => setActiveTab("hubs")}>🏭 Add Hub</button>
                  </div>
                </div>
                
                <div className="admin-section" style={{ marginBottom: 0, borderLeft: '4px solid var(--danger)' }}>
                  <h2 className="section-title" style={{ fontSize: '16px', marginBottom: '12px', color: 'var(--danger)' }}>⚠️ Urgent Alerts</h2>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><span style={{ fontSize: '14px' }}>Offline Drivers</span><span className="badge badge-danger">{offlineDrivers}</span></div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><span style={{ fontSize: '14px' }}>High Priority Tickets</span><span className="badge badge-warning">{highPriorityTickets}</span></div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><span style={{ fontSize: '14px' }}>Pending Assignments</span><span className="badge badge-danger">{unassignedShipments.length}</span></div>
                  </div>
                </div>
                
                <div className="admin-section" style={{ marginBottom: 0 }}>
                  <h2 className="section-title" style={{ fontSize: '16px', marginBottom: '12px' }}>🕒 Recent Activity</h2>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '250px', overflowY: 'auto' }}>
                    {recentActivities.length > 0 ? recentActivities.map((activity, idx) => (
                      <div key={idx} style={{ fontSize: '13px', padding: '8px', background: '#f8fafc', borderRadius: '6px' }}>
                        <div style={{ fontWeight: '600', color: '#0f172a', marginBottom: '4px' }}>{activity.status === "Delivered" ? "✅" : "🚚"} {activity.description}</div>
                        <div style={{ color: '#64748b', fontSize: '11px' }}>{activity.timestamp?.toLocaleString() || 'Just now'}</div>
                      </div>
                    )) : <p className="text-muted" style={{ fontSize: '13px' }}>No recent activity.</p>}
                  </div>
                </div>
              </div>
            </div>

            {/* 📊 NEW: Revenue Analytics Chart */}
            <div className="admin-section" style={{ marginTop: '24px' }}>
              <div className="section-header"><h2 className="section-title">📈 Weekly Revenue Trend</h2></div>
              <div style={{ height: '300px', width: '100%' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <XAxis dataKey="name" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `₹${value/1000}k`} />
                    <Tooltip cursor={{ fill: '#f1f5f9' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }} />
                    <Bar dataKey="revenue" fill="#2563eb" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* 🗺️ NEW: Live Fleet Tracking Placeholder */}
            <div className="admin-section" style={{ marginTop: '24px' }}>
              <div className="section-header">
                <h2 className="section-title">🗺️ Live Fleet Tracking</h2>
                <span className="badge badge-success">{drivers.filter(d => d.status === 'available').length} Available</span>
              </div>
              <div style={{ height: '400px', background: '#f1f5f9', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px dashed #cbd5e1' }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '48px', marginBottom: '12px' }}>🗺️</div>
                  <p className="font-semibold" style={{ fontSize: '16px', color: '#334155' }}>Interactive Map Integration</p>
                  <p className="text-muted" style={{ fontSize: '14px' }}>Track all {drivers.length} vehicles in real-time (Mapbox/Google Maps API)</p>
                </div>
              </div>
            </div>

            <div className="admin-section" style={{ marginTop: '24px' }}>
              <div className="section-header"><h2 className="section-title">🏭 Hub Capacity Overview</h2><button className="btn-sm btn-secondary" onClick={() => setActiveTab("hubs")}>Manage Hubs</button></div>
              {topHubs.length > 0 ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' }}>
                  {topHubs.map(hub => {
                    const loadPercentage = Math.min((hub.currentLoad / hub.capacity) * 100, 100);
                    const barColor = loadPercentage > 80 ? 'var(--danger)' : loadPercentage > 50 ? 'var(--warning)' : 'var(--success)';
                    return (<div key={hub.id} style={{ padding: '16px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}><div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}><span style={{ fontWeight: '600', fontSize: '14px' }}>{hub.name}</span><span style={{ fontSize: '12px', color: '#64748b' }}>{hub.location}</span></div><div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '6px' }}><span>Load: {hub.currentLoad} / {hub.capacity} kg</span><span style={{ fontWeight: '600', color: barColor }}>{loadPercentage.toFixed(0)}%</span></div><div style={{ width: '100%', height: '8px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}><div style={{ width: `${loadPercentage}%`, height: '100%', background: barColor, transition: 'width 0.5s ease' }}></div></div></div>);
                  })}
                </div>
              ) : <p className="text-muted" style={{ textAlign: 'center', padding: '20px' }}>No hubs added yet.</p>}
            </div>
          </>
        );
      }

      case "clients": {
        const filteredUsers = users.filter(u => {
          const matchesSearch = u.name?.toLowerCase().includes(debouncedSearch.toLowerCase()) || u.email?.toLowerCase().includes(debouncedSearch.toLowerCase()) || u.phone?.includes(debouncedSearch);
          const matchesFilter = clientFilter === "all" ? true : clientFilter === "pending-kyc" ? (u.kycStatus === "Pending" || !u.kycStatus) : u.status === clientFilter;
          return matchesSearch && matchesFilter;
        });
        return (
          <div className="admin-section">
            <div className="section-header">
              <h2 className="section-title">Client Management</h2>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                {selectedClients.length > 0 && (<div style={{ display: 'flex', gap: '8px', alignItems: 'center', background: '#f1f5f9', padding: '4px 12px', borderRadius: '6px', border: '1px solid #e2e8f0' }}><span className="text-small font-semibold">{selectedClients.length} Selected</span><button className="btn-xs btn-danger" onClick={() => handleBulkClientAction("block")}>Block</button><button className="btn-xs btn-success" onClick={() => handleBulkClientAction("unblock")}>Unblock</button></div>)}
                <select className="status-select" value={clientFilter} onChange={(e) => setClientFilter(e.target.value)} style={{ width: '140px' }}><option value="all">All Clients</option><option value="active">Active</option><option value="banned">Blocked</option><option value="pending-kyc">Pending KYC</option></select>
                <input type="text" placeholder="Search name, email, phone..." className="search-input" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
              </div>
            </div>
            <div className="table-wrapper">
              <table>
                <thead><tr><th style={{ width: '40px' }}><input type="checkbox" checked={filteredUsers.length > 0 && selectedClients.length === filteredUsers.length} onChange={() => toggleSelectAll(filteredUsers)} style={{ cursor: 'pointer' }} /></th><th>Client Profile</th><th>Contact</th><th>KYC Status</th><th>Wallet Balance</th><th>Total Shipments</th><th>Account Status</th><th>Actions</th></tr></thead>
                <tbody>
                  {filteredUsers.map((u) => (
                    <tr key={u.id} style={{ background: selectedClients.includes(u.id) ? '#f8fafc' : 'transparent' }}>
                      <td><input type="checkbox" checked={selectedClients.includes(u.id)} onChange={() => toggleClientSelection(u.id)} style={{ cursor: 'pointer' }} /></td>
                      <td><div className="user-info-cell"><div className="user-avatar">{u.name?.charAt(0) || u.email?.charAt(0) || 'U'}</div><div><div className="font-semibold">{u.name || 'Unnamed'}</div><div className="text-small text-muted">{u.email}</div></div></div></td>
                      <td><div className="text-small">{u.phone || 'N/A'}</div><div className="text-small text-muted">{u.gstin || 'No GST'}</div></td>
                      <td>{getStatusBadge(u.kycStatus || 'Pending')}</td>
                      <td className="amount-text">₹{getWalletBalance(u.id).toLocaleString()}</td>
                      <td>{u.totalShipments || 0}</td>
                      <td>{getStatusBadge(u.status || 'active')}</td>
                      <td className="actions-cell">
                        <button className="btn-xs btn-secondary" onClick={() => { setSelectedItem(u); setModalType("client-details"); setShowModal(true); }} title="View Full Profile">👁️ View</button>
                        <button className="btn-xs btn-primary" onClick={() => { setSelectedItem(u); setModalType("add-funds"); setFormData({ amount: "", action: "add" }); setShowModal(true); }} title="Manage Wallet">💰</button>
                        <button className={`btn-xs ${u.status === "banned" ? "btn-success" : "btn-danger"}`} onClick={() => handleToggleClientStatus(u.id, u.status || 'active')} disabled={saving} title={u.status === "banned" ? "Unblock Client" : "Block Client"}>{u.status === "banned" ? "✅" : "🚫"}</button>
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

      case "shipments": {
        const filteredShipments = shipments.filter(s => {
          const matchesSearch = s.trackingId?.toLowerCase().includes(debouncedSearch.toLowerCase()) || getClientName(s.userId, s.clientName, s.userEmail).toLowerCase().includes(debouncedSearch.toLowerCase());
          const matchesFilter = shipmentFilter === "all" ? true : s.status === shipmentFilter;
          return matchesSearch && matchesFilter;
        });
        
        const unassignedInFilter = filteredShipments.filter(s => !s.assignedDriverId && (s.status === "Booked" || s.status === "Picked Up"));

        return (
          <div className="admin-section">
            <div className="section-header">
              <h2 className="section-title">Live Shipments</h2>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                {selectedShipments.length > 0 && (<div style={{ display: 'flex', gap: '8px', alignItems: 'center', background: '#f1f5f9', padding: '4px 12px', borderRadius: '6px', border: '1px solid #e2e8f0' }}><span className="text-small font-semibold">{selectedShipments.length} Selected</span><button className="btn-xs btn-primary" onClick={() => { setModalType("bulk-update"); setShowModal(true); }}>⚡ Bulk Update</button><button className="btn-xs btn-danger" onClick={() => handleBulkShipmentAction("cancel", "Cancelled")}>❌ Cancel</button></div>)}
                {unassignedInFilter.length > 0 && <span className="badge badge-danger">⚠️ {unassignedInFilter.length} Unassigned</span>}
                <select className="status-select" value={shipmentFilter} onChange={(e) => setShipmentFilter(e.target.value)} style={{ width: '160px' }}><option value="all">All Statuses</option><option value="Booked">Booked</option><option value="Picked Up">Picked Up</option><option value="In Transit">In Transit</option><option value="Out for Delivery">Out for Delivery</option><option value="Delivered">Delivered</option><option value="Cancelled">Cancelled</option></select>
                <input type="text" placeholder="Search tracking ID or client..." className="search-input" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                <button className="btn-xs btn-secondary" onClick={() => exportToCSV(filteredShipments, "live_shipments_report")}>📥 Export CSV</button>
              </div>
            </div>
            <div className="table-wrapper">
              <table>
                <thead><tr><th style={{ width: '40px' }}><input type="checkbox" checked={filteredShipments.length > 0 && selectedShipments.length === filteredShipments.length} onChange={() => toggleSelectAllShipments(filteredShipments)} style={{ cursor: 'pointer' }} /></th><th>Tracking Details</th><th>Client</th><th>Route</th><th>Weight / Amount</th><th>Assigned Driver</th><th>Status</th><th>Actions</th></tr></thead>
                <tbody>
                  {filteredShipments.map((s) => {
                    const driver = s.assignedDriverId ? drivers.find(d => d.id === s.assignedDriverId) : null;
                    const isUnassigned = !s.assignedDriverId && (s.status === "Booked" || s.status === "Picked Up");
                    return (
                      <tr key={s.id} style={{ background: selectedShipments.includes(s.id) ? '#f8fafc' : (isUnassigned ? '#fffbeb' : 'transparent'), borderLeft: isUnassigned ? '3px solid var(--warning)' : 'none' }}>
                        <td><input type="checkbox" checked={selectedShipments.includes(s.id)} onChange={() => toggleShipmentSelection(s.id)} style={{ cursor: 'pointer' }} /></td>
                        <td><div className="font-semibold mono-text" style={{ cursor: 'pointer', color: 'var(--primary)' }} onClick={() => { setSelectedItem(s); setModalType("shipment-details"); setShowModal(true); }}>{s.trackingId || s.id.slice(0, 10)}</div><div className="text-small text-muted">{s.createdAt?.toLocaleDateString() || 'N/A'}</div></td>
                        <td><div className="font-semibold">{getClientName(s.userId, s.clientName, s.userEmail)}</div><div className="text-small text-muted">{s.userEmail || 'No Email'}</div></td>
                        <td><div className="text-small">{s.pickupCity || 'N/A'} → {s.dropCity || 'N/A'}</div></td>
                        <td><div className="text-small">{s.weight || 0} kg</div><div className="amount-text text-small">₹{Number(s.amount || 0).toLocaleString()}</div></td>
                        <td>{driver ? <div><div className="font-semibold text-small">{driver.name}</div><div className="text-small text-muted">{driver.vehicleNumber}</div></div> : <span className="text-small" style={{ color: isUnassigned ? '#92400e' : '#64748b', fontWeight: isUnassigned ? '600' : '400' }}>{isUnassigned ? '⚠️ Unassigned' : 'Unassigned'}</span>}</td>
                        <td>{getStatusBadge(s.status)}</td>
                        <td className="actions-cell">
                          <button className="btn-xs btn-secondary" onClick={() => { setSelectedItem(s); setModalType("shipment-details"); setShowModal(true); }} title="View Full Details">👁️ View</button>
                          <button className="btn-xs btn-primary" onClick={() => { setSelectedItem(s); setModalType("update-status"); setFormData({}); setShowModal(true); }} title="Update Status">🚚 Update</button>
                          <button className="btn-xs btn-secondary" onClick={() => handlePrintLabel(s)} title="Print Shipping Label">🖨️</button>
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

      case "fleet":
        return (
          <div className="admin-section">
            <div className="section-header">
              <h2 className="section-title">Fleet & Drivers Management</h2>
              <button className="btn-sm btn-primary" onClick={() => { setModalType("add-driver"); setFormData({}); setShowModal(true); }}>➕ Add New Driver</button>
            </div>
            <div className="table-wrapper">
              <table>
                <thead><tr><th>Driver Details</th><th>Vehicle Info</th><th>Performance</th><th>Vehicle Health</th><th>Status</th><th>Actions</th></tr></thead>
                <tbody>
                  {drivers.length === 0 ? (<tr><td colSpan="6" className="empty-cell">No drivers added yet. Click "Add New Driver" to start.</td></tr>) : (
                    drivers.map((driver) => (
                      <tr key={driver.id}>
                        <td><div className="font-semibold">{driver.name}</div><div className="text-small text-muted">{driver.phone}</div></td>
                        <td><div className="font-semibold text-small">{driver.vehicleNumber}</div><div className="text-small text-muted">{driver.vehicleType}</div></td>
                        <td><div className="text-small">⭐ {driver.rating || 5.0} Rating</div><div className="text-small text-muted">{driver.totalDeliveries || 0} Deliveries</div></td>
                        <td>
                          <select className="status-select" style={{ width: '110px', fontSize: '11px', padding: '4px' }} value={driver.vehicleHealth || "Good"} onChange={(e) => handleUpdateDriverVehicleHealth(driver.id, e.target.value)}>
                            <option value="Good">🟢 Good</option><option value="Service Due">🟡 Service Due</option><option value="Critical">🔴 Critical</option>
                          </select>
                        </td>
                        <td>{getStatusBadge(driver.status || 'offline')}</td>
                        <td className="actions-cell">
                          <button className="btn-xs btn-secondary" onClick={() => { setSelectedItem(driver); setModalType("driver-details"); setShowModal(true); }}>👁️ View</button>
                          <select className="status-select" style={{ width: '90px' }} value={driver.status || 'offline'} onChange={(e) => handleUpdateDriverStatus(driver.id, e.target.value)}>
                            <option value="available">Available</option><option value="busy">Busy</option><option value="offline">Offline</option>
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

      case "hubs":
        return (
          <div className="admin-section">
            <div className="section-header"><h2 className="section-title">Hubs & Warehouses</h2><button className="btn-xs btn-primary" onClick={() => { setModalType("add-hub"); setFormData({}); setShowModal(true); }}>➕ Add</button></div>
            <div className="table-wrapper">
              <table>
                <thead><tr><th>Hub Name</th><th>Location</th><th>Capacity</th><th>Status</th></tr></thead>
                <tbody>
                  {hubs.length === 0 ? <tr><td colSpan="4" className="empty-cell">No hubs added yet. Click "Add" to add one.</td></tr> : hubs.map((hub) => (<tr key={hub.id}><td className="font-semibold">{hub.name}</td><td><div>{hub.location}</div><div className="text-small text-muted">{hub.address}</div></td><td>{hub.currentLoad} / {hub.capacity} kg</td><td>{getStatusBadge(hub.status || 'active')}</td></tr>))}
                </tbody>
              </table>
            </div>
          </div>
        );

      case "support":
        return (
          <div className="admin-section">
            <div className="section-header"><h2 className="section-title">Support Tickets</h2><div className="section-actions"><span className="badge badge-warning">{tickets.filter(t => t.status === "Open").length} Open</span><span className="badge badge-success">{tickets.filter(t => t.status === "Resolved").length} Resolved</span></div></div>
            <div className="tickets-grid">
              {tickets.length === 0 ? <div className="empty-state-box"><p>No support tickets yet</p></div> : tickets.map(ticket => (
                <div key={ticket.id} className={`ticket-card ${ticket.status === "Open" ? "ticket-open" : ""}`}>
                  <div className="ticket-header">
                    <div><h3 className="ticket-title">{ticket.subject || 'No Subject'}</h3><div className="ticket-meta"><span>Client: {ticket.userName || 'Unknown'}</span><span>•</span><span>{ticket.createdAt?.toLocaleDateString() || 'N/A'}</span></div></div>
                    <div className="ticket-badges"><span className={`badge badge-${ticket.priority || 'normal'}`}>{ticket.priority || 'Normal'}</span><span className={`badge badge-${ticket.status === 'Open' ? 'warning' : 'success'}`}>{ticket.status}</span></div>
                  </div>
                  <div className="ticket-body">
                    <p className="ticket-message">{ticket.message || 'No message'}</p>
                    {ticket.replies && ticket.replies.length > 0 && (
                      <div className="ticket-replies">
                        <h4 className="replies-title">Conversation ({ticket.replies.length})</h4>
                        {ticket.replies.map((reply, idx) => (<div key={idx} className={`reply ${reply.from === "admin" ? "reply-admin" : "reply-client"}`}><div className="reply-header"><span className="reply-from">{reply.from === "admin" ? "👨‍💼 Admin" : "👤 Client"}</span><span className="reply-time">{reply.createdAt?.toDate?.().toLocaleString() || 'N/A'}</span></div><p className="reply-message">{reply.message}</p></div>))}
                      </div>
                    )}
                  </div>
                  <div className="ticket-actions">
                    <button className="btn-sm btn-primary" onClick={() => { setSelectedItem(ticket); setModalType("reply-ticket"); setFormData({}); setShowModal(true); }}>Reply</button>
                    <select className="status-select" value={ticket.status} onChange={(e) => handleTicketStatusChange(ticket.id, e.target.value)}><option value="Open">Open</option><option value="In Progress">In Progress</option><option value="Resolved">Resolved</option><option value="Closed">Closed</option></select>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );

      case "settings":
        return (
          <div className="admin-section">
            <div className="section-header"><h2 className="section-title">Website Settings</h2><p className="text-muted">Global settings for the client website</p></div>
            <div className="settings-form">
              <div className="form-row">
                <div className="form-group"><label className="form-label">Base Rate per KG (₹)</label><input type="number" className="form-input-large" value={systemSettings.baseRate || 10} onChange={(e) => setSystemSettings({...systemSettings, baseRate: Number(e.target.value)})} /><span className="form-hint">Used in rate calculator</span></div>
                <div className="form-group"><label className="form-label">GST Percentage (%)</label><input type="number" className="form-input-large" value={systemSettings.gst || 18} onChange={(e) => setSystemSettings({...systemSettings, gst: Number(e.target.value)})} /><span className="form-hint">Added to final invoice</span></div>
              </div>
              <div className="form-group"><label className="form-label">Broadcast Notice</label><textarea rows="3" className="form-textarea-large" value={systemSettings.notice || ""} onChange={(e) => setSystemSettings({...systemSettings, notice: e.target.value})} placeholder="e.g., 'Delays expected in Mumbai due to rains'" /><span className="form-hint">Shows as banner on client dashboard</span></div>
              <button className="btn-sm btn-primary" onClick={handleSaveSettings} disabled={saving}>{saving ? "💾 Saving..." : "💾 Save Settings"}</button>
            </div>
          </div>
        );

      default:
        return <div className="admin-section"><div className="empty-state-box"><h2>{activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}</h2><p>This module is under development</p></div></div>;
    }
  };

  return (
    <div className="admin-page">
      <aside className={`admin-sidebar ${sidebarOpen ? 'open' : 'closed'}`}>
        <div className="sidebar-header">
          <img src={logoImage} alt="ATIRATH" className="logo-image" />
          <button className="sidebar-toggle" onClick={() => setSidebarOpen(!sidebarOpen)}>{sidebarOpen ? '◀' : '▶'}</button>
        </div>
        <nav className="sidebar-nav">
          <div className="nav-section"><button className={`nav-item ${activeTab === "dashboard" ? "nav-active" : ""}`} onClick={() => setActiveTab("dashboard")}><span className="nav-icon">📊</span><span className="nav-text">Dashboard</span></button></div>
          <div className="nav-section">
            <div className="nav-section-title">Operations</div>
            <button className={`nav-item ${activeTab === "clients" ? "nav-active" : ""}`} onClick={() => setActiveTab("clients")}><span className="nav-icon">👥</span><span className="nav-text">Manage Clients</span></button>
            <button className={`nav-item ${activeTab === "shipments" ? "nav-active" : ""}`} onClick={() => setActiveTab("shipments")}><span className="nav-icon">🚚</span><span className="nav-text">Live Shipments</span></button>
            <button className={`nav-item ${activeTab === "fleet" ? "nav-active" : ""}`} onClick={() => setActiveTab("fleet")}><span className="nav-icon">🚛</span><span className="nav-text">Fleet & Drivers</span></button>
            <button className={`nav-item ${activeTab === "hubs" ? "nav-active" : ""}`} onClick={() => setActiveTab("hubs")}><span className="nav-icon">🏭</span><span className="nav-text">Hubs & Warehouses</span></button>
          </div>
          <div className="nav-section">
            <div className="nav-section-title">Finance</div>
            <button className={`nav-item ${activeTab === "pricing" ? "nav-active" : ""}`} onClick={() => setActiveTab("pricing")}><span className="nav-icon">💲</span><span className="nav-text">Rate Cards</span></button>
            <button className={`nav-item ${activeTab === "reports" ? "nav-active" : ""}`} onClick={() => setActiveTab("reports")}><span className="nav-icon">📈</span><span className="nav-text">Reports</span></button>
          </div>
          <div className="nav-section">
            <div className="nav-section-title">Support</div>
            <button className={`nav-item ${activeTab === "support" ? "nav-active" : ""}`} onClick={() => setActiveTab("support")}><span className="nav-icon">🎫</span><span className="nav-text">Tickets</span>{tickets.filter(t => t.status === "Open").length > 0 && <span className="nav-badge">{tickets.filter(t => t.status === "Open").length}</span>}</button>
            <button className={`nav-item ${activeTab === "notifications" ? "nav-active" : ""}`} onClick={() => setActiveTab("notifications")}><span className="nav-icon">📢</span><span className="nav-text">Broadcast</span></button>
            <button className={`nav-item ${activeTab === "settings" ? "nav-active" : ""}`} onClick={() => setActiveTab("settings")}><span className="nav-icon">⚙️</span><span className="nav-text">Settings</span></button>
          </div>
        </nav>
        <div className="sidebar-footer"><button className="nav-item logout-item" onClick={handleLogout}><span className="nav-icon">🚪</span><span className="nav-text">Logout</span></button></div>
      </aside>

      <div className="admin-main">
        <header className="admin-topbar">
          <div className="topbar-left">
            <button className="menu-toggle" onClick={() => setSidebarOpen(!sidebarOpen)}>☰</button>
            <div><h1 className="topbar-title">Admin Dashboard</h1><p className="topbar-subtitle">Manage your logistics operations</p></div>
          </div>
          <div className="topbar-right">
            <div className="user-profile"><div className="user-avatar">A</div><div className="user-info"><div className="user-name">Super Admin</div><div className="user-role">Administrator</div></div></div>
            <button className="topbar-logout-btn" onClick={handleLogout} title="Logout"><span>🚪</span><span>Logout</span></button>
          </div>
        </header>
        <div className="dashboard-content">{renderContent()}</div>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
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
              </h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>
            
            <div className="modal-body">
              {modalType === "client-details" && selectedItem && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  <div style={{ display: 'flex', gap: '16px', alignItems: 'center', padding: '16px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                    <div className="user-avatar" style={{ width: '64px', height: '64px', fontSize: '28px', flexShrink: 0 }}>{selectedItem.name?.charAt(0) || selectedItem.email?.charAt(0) || 'U'}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}><h3 style={{ margin: 0, fontSize: '20px', fontWeight: '700' }}>{selectedItem.name || 'Unnamed Client'}</h3><div style={{ display: 'flex', gap: '8px' }}>{getStatusBadge(selectedItem.status || 'active')}{getStatusBadge(selectedItem.kycStatus || 'Pending')}</div></div>
                      <p style={{ margin: '4px 0 0 0', color: '#64748b', fontSize: '14px' }}>{selectedItem.email}</p>
                      <div style={{ marginTop: '8px', display: 'flex', gap: '12px' }}><button className="btn-xs btn-secondary" onClick={() => handleContactClient(selectedItem, "email")}>📧 Email</button><button className="btn-xs btn-secondary" onClick={() => handleContactClient(selectedItem, "phone")}>📞 Call</button></div>
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
                    <div style={{ padding: '12px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}><div className="text-small text-muted">Wallet Balance</div><div className="amount-text" style={{ fontSize: '20px', fontWeight: '700' }}>₹{getWalletBalance(selectedItem.id).toLocaleString()}</div></div>
                    <div style={{ padding: '12px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}><div className="text-small text-muted">Total Shipments</div><div className="font-semibold" style={{ fontSize: '20px' }}>{selectedItem.totalShipments || 0}</div></div>
                    <div style={{ padding: '12px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}><div className="text-small text-muted">Phone Number</div><div className="font-semibold">{selectedItem.phone || 'Not Provided'}</div></div>
                    <div style={{ padding: '12px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}><div className="text-small text-muted">GST / Tax ID</div><div className="font-semibold">{selectedItem.gstin || 'Not Provided'}</div></div>
                  </div>
                  {(!selectedItem.kycStatus || selectedItem.kycStatus === "Pending") && (<div style={{ padding: '12px', background: '#fffbeb', borderRadius: '8px', border: '1px solid #fcd34d' }}><div className="font-semibold" style={{ fontSize: '14px', marginBottom: '8px', color: '#92400e' }}>⚠️ KYC Verification Required</div><div style={{ display: 'flex', gap: '8px' }}><button className="btn-xs btn-success" onClick={() => handleKYCVerification(selectedItem.id, "Verified")}>✅ Approve KYC</button><button className="btn-xs btn-danger" onClick={() => handleKYCVerification(selectedItem.id, "Rejected")}>❌ Reject KYC</button></div></div>)}
                  <div>
                    <h4 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '12px', color: '#334155' }}>📦 Recent Shipments</h4>
                    <div className="table-wrapper">
                      <table style={{ fontSize: '13px' }}>
                        <thead><tr><th>Tracking ID</th><th>Route</th><th>Status</th><th>Date</th></tr></thead>
                        <tbody>{getClientShipments(selectedItem.id).length > 0 ? getClientShipments(selectedItem.id).map(s => (<tr key={s.id}><td><span className="mono-text">{s.trackingId || s.id.slice(0,8)}</span></td><td>{s.pickupCity} → {s.dropCity}</td><td>{getStatusBadge(s.status)}</td><td className="text-small text-muted">{s.createdAt?.toLocaleDateString() || 'N/A'}</td></tr>)) : <tr><td colSpan="4" className="empty-cell" style={{ padding: '12px' }}>No shipments recorded yet</td></tr>}</tbody>
                      </table>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '12px', marginTop: '8px', paddingTop: '16px', borderTop: '1px solid #e2e8f0' }}>
                    <button className="btn-sm btn-primary" style={{ flex: 1 }} onClick={() => { setModalType("add-funds"); setFormData({ amount: "", action: "add" }); }}>💰 Add / Deduct Funds</button>
                    <button className={`btn-sm ${selectedItem.status === "banned" ? "btn-success" : "btn-danger"}`} style={{ flex: 1 }} onClick={() => { handleToggleClientStatus(selectedItem.id, selectedItem.status || 'active'); setShowModal(false); }}>{selectedItem.status === "banned" ? "✅ Unblock Client" : "🚫 Block Client"}</button>
                  </div>
                </div>
              )}

              {modalType === "driver-details" && selectedItem && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  <div style={{ display: 'flex', gap: '16px', alignItems: 'center', padding: '16px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                    <div className="user-avatar" style={{ width: '64px', height: '64px', fontSize: '28px', flexShrink: 0, background: 'var(--info)' }}>{selectedItem.name?.charAt(0) || 'D'}</div>
                    <div style={{ flex: 1 }}>
                      <h3 style={{ margin: 0, fontSize: '20px', fontWeight: '700' }}>{selectedItem.name}</h3>
                      <p style={{ margin: '4px 0 0 0', color: '#64748b', fontSize: '14px' }}>{selectedItem.phone}</p>
                      <div style={{ marginTop: '8px' }}>{getStatusBadge(selectedItem.status || 'offline')}</div>
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div style={{ padding: '12px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}><div className="text-small text-muted">Vehicle Number</div><div className="font-semibold">{selectedItem.vehicleNumber}</div></div>
                    <div style={{ padding: '12px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}><div className="text-small text-muted">Vehicle Type</div><div className="font-semibold">{selectedItem.vehicleType}</div></div>
                    <div style={{ padding: '12px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}><div className="text-small text-muted">License Number</div><div className="font-semibold">{selectedItem.licenseNumber || 'Not Provided'}</div></div>
                    <div style={{ padding: '12px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}><div className="text-small text-muted">Performance Rating</div><div className="font-semibold">⭐ {selectedItem.rating || 5.0} / 5.0</div></div>
                  </div>
                  <div>
                    <h4 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '12px', color: '#334155' }}>📦 Currently Assigned Shipments</h4>
                    <div className="table-wrapper">
                      <table style={{ fontSize: '13px' }}>
                        <thead><tr><th>Tracking ID</th><th>Route</th><th>Status</th></tr></thead>
                        <tbody>
                          {getDriverShipments(selectedItem.id).length > 0 ? getDriverShipments(selectedItem.id).map(s => (<tr key={s.id}><td><span className="mono-text">{s.trackingId || s.id.slice(0,8)}</span></td><td>{s.pickupCity} → {s.dropCity}</td><td>{getStatusBadge(s.status)}</td></tr>)) : <tr><td colSpan="3" className="empty-cell" style={{ padding: '12px' }}>No active shipments assigned</td></tr>}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {modalType === "shipment-details" && selectedItem && (() => {
                const details = getShipmentDetails(selectedItem.id);
                if (!details) return null;
                return (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                      <div><div className="text-small text-muted">Tracking ID</div><div className="font-semibold mono-text" style={{ fontSize: '18px' }}>{details.trackingId || details.id}</div></div>
                      <div style={{ textAlign: 'right' }}><div className="text-small text-muted">Current Status</div><div style={{ marginTop: '4px' }}>{getStatusBadge(details.status)}</div></div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                      <div style={{ padding: '16px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}><h4 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '12px', color: '#334155' }}>👤 Client Information</h4><div className="font-semibold">{getClientName(details.userId, details.clientName, details.userEmail)}</div><div className="text-small text-muted">{details.userEmail || 'No Email'}</div><div className="text-small text-muted">{details.client?.phone || 'No Phone'}</div></div>
                      <div style={{ padding: '16px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}><h4 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '12px', color: '#334155' }}>🚛 Driver & Vehicle</h4>{details.driver ? (<><div className="font-semibold">{details.driver.name}</div><div className="text-small text-muted">{details.driver.vehicleType} | {details.driver.vehicleNumber}</div><div className="text-small text-muted">{details.driver.phone}</div></>) : (<div className="text-small text-muted">No driver assigned yet.</div>)}</div>
                      <div style={{ padding: '16px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}><h4 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '12px', color: '#334155' }}>📍 Route Details</h4><div className="text-small"><strong>Pickup:</strong> {details.pickupCity || 'N/A'}</div><div className="text-small"><strong>Drop:</strong> {details.dropCity || 'N/A'}</div><div className="text-small"><strong>Weight:</strong> {details.weight || 0} kg</div></div>
                      <div style={{ padding: '16px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}><h4 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '12px', color: '#334155' }}>💰 Financials</h4><div className="amount-text" style={{ fontSize: '20px', fontWeight: '700' }}>₹{Number(details.amount || 0).toLocaleString()}</div><div className="text-small text-muted">Payment Status: {details.paymentStatus || 'Pending'}</div></div>
                    </div>
                    <div>
                      <h4 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '12px', color: '#334155' }}>🕒 Live Tracking Timeline</h4>
                      <div style={{ padding: '16px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0', maxHeight: '250px', overflowY: 'auto' }}>
                        {details.timeline.length > 0 ? details.timeline.map((event, idx) => (<div key={idx} style={{ display: 'flex', gap: '12px', marginBottom: idx < details.timeline.length - 1 ? '16px' : '0', position: 'relative' }}><div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}><div style={{ width: '12px', height: '12px', borderRadius: '50%', background: 'var(--primary)', flexShrink: 0 }}></div>{idx < details.timeline.length - 1 && <div style={{ width: '2px', flex: 1, background: '#e2e8f0', marginTop: '4px' }}></div>}</div><div style={{ flex: 1, paddingBottom: '8px' }}><div className="font-semibold" style={{ fontSize: '14px' }}>{event.status}</div><div className="text-small" style={{ color: '#475569' }}>{event.description}</div><div className="text-small text-muted" style={{ fontSize: '11px', marginTop: '4px' }}>{event.location} • {event.timestamp?.toLocaleString() || 'Just now'}</div></div></div>)) : <p className="text-small text-muted">No tracking events recorded yet.</p>}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '12px', marginTop: '8px', paddingTop: '16px', borderTop: '1px solid #e2e8f0' }}>
                      <button className="btn-sm btn-primary" style={{ flex: 1 }} onClick={() => { setModalType("update-status"); setFormData({}); }}>🚚 Update Status</button>
                      <button className="btn-sm btn-secondary" style={{ flex: 1 }} onClick={() => handlePrintLabel(details)}>🖨️ Print Label</button>
                    </div>
                  </div>
                );
              })()}

              {modalType === "bulk-update" && (
                <div className="form-group">
                  <div style={{ padding: '12px', background: '#fffbeb', borderRadius: '8px', border: '1px solid #fcd34d', marginBottom: '16px' }}><div className="font-semibold" style={{ fontSize: '14px', color: '#92400e' }}>⚠️ You are about to update {selectedShipments.length} shipments.</div></div>
                  <label className="form-label">Select New Status for All Selected:</label>
                  <select className="form-select-large" onChange={(e) => setFormData({...formData, bulkNewStatus: e.target.value})} value={formData.bulkNewStatus || ""}><option value="" disabled>Choose a status...</option><option value="Picked Up">📦 Picked Up</option><option value="In Transit">🚚 In Transit</option><option value="Out for Delivery">🛵 Out for Delivery</option><option value="Delivered">✅ Delivered</option></select>
                  <label className="form-label" style={{ marginTop: '16px' }}>Assign Driver to All (Optional):</label>
                  <select className="form-select-large" onChange={(e) => setFormData({...formData, bulkDriverId: e.target.value})} value={formData.bulkDriverId || ""}><option value="">-- Keep Current / Unassigned --</option>{getAvailableDrivers().map(driver => (<option key={driver.id} value={driver.id}>{driver.name} ({driver.vehicleNumber})</option>))}</select>
                  <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
                    <button className="btn-sm btn-primary" style={{ flex: 1 }} onClick={async () => {
                      if (!formData.bulkNewStatus) { showNotification("Please select a status", "error"); return; }
                      setModalLoading(true);
                      try {
                        const batch = writeBatch(db);
                        selectedShipments.forEach(id => {
                          const ref = doc(db, "shipments", id);
                          const updateData = { status: formData.bulkNewStatus, updatedAt: serverTimestamp() };
                          if (formData.bulkDriverId) { updateData.assignedDriverId = formData.bulkDriverId; const d = drivers.find(dr => dr.id === formData.bulkDriverId); updateData.assignedDriverName = d?.name || ""; }
                          batch.update(ref, updateData);
                        });
                        await batch.commit();
                        showNotification(`${selectedShipments.length} shipments updated successfully!`, "success");
                        setSelectedShipments([]); setShowModal(false); setFormData({});
                      } catch (error) { showNotification("Failed to update shipments", "error"); } finally { setModalLoading(false); }
                    }} disabled={modalLoading || !formData.bulkNewStatus}>{modalLoading ? "Processing..." : "Confirm Bulk Update"}</button>
                  </div>
                </div>
              )}

              {modalType === "update-status" && selectedItem && (
                <div className="form-group">
                  <div style={{ marginBottom: '16px' }}><p><strong>Tracking:</strong> <span className="mono-text">{selectedItem.trackingId || selectedItem.id}</span></p><p><strong>Current Status:</strong> {getStatusBadge(selectedItem.status)}</p><p><strong>Client:</strong> {getClientName(selectedItem.userId, selectedItem.clientName, selectedItem.userEmail)}</p></div>
                  <div style={{ marginTop: '16px', padding: '16px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0', maxHeight: '200px', overflowY: 'auto' }}>
                    <p style={{ fontSize: '12px', fontWeight: '700', marginBottom: '12px', color: '#475569', textTransform: 'uppercase' }}>📍 Recent Tracking Events:</p>
                    {getShipmentTimeline(selectedItem.id).length > 0 ? getShipmentTimeline(selectedItem.id).map((event, idx) => (<div key={idx} style={{ fontSize: '13px', color: '#334155', marginBottom: '8px', paddingBottom: '8px', borderBottom: idx < getShipmentTimeline(selectedItem.id).length - 1 ? '1px solid #e2e8f0' : 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}><span style={{ flex: 1 }}>• {event.description}</span><span style={{ color: '#94a3b8', fontSize: '11px', marginLeft: '12px', whiteSpace: 'nowrap' }}>{event.timestamp?.toLocaleString() || 'Just now'}</span></div>)) : <p style={{ fontSize: '13px', color: '#94a3b8', fontStyle: 'italic' }}>No events recorded yet.</p>}
                  </div>
                  <label className="form-label" style={{ marginTop: '20px', display: 'block' }}>New Status:</label>
                  <select className="form-select-large" onChange={(e) => setFormData({...formData, newStatus: e.target.value})} value={formData.newStatus || ""}><option value="" disabled>Select status...</option><option value="Booked">📝 Booked</option><option value="Picked Up">📦 Picked Up</option><option value="In Transit">🚚 In Transit</option><option value="Out for Delivery">🛵 Out for Delivery</option><option value="Delivered">✅ Delivered</option><option value="Cancelled">❌ Cancelled</option></select>
                  <label className="form-label" style={{ marginTop: '16px', display: 'block' }}>Assign Driver (Optional):</label>
                  <select className="form-select-large" onChange={(e) => setFormData({...formData, assignedDriverId: e.target.value})} value={formData.assignedDriverId || ""}><option value="">-- Keep Current / Unassigned --</option>{getAvailableDrivers().map(driver => (<option key={driver.id} value={driver.id}>{driver.name} ({driver.vehicleNumber}) - {driver.vehicleType}</option>))}{getAvailableDrivers().length === 0 && <option disabled>No available drivers</option>}</select>
                  <p className="form-hint" style={{ marginTop: '12px' }}>⚠️ Client will be notified instantly upon update.</p>
                </div>
              )}

              {modalType === "add-funds" && selectedItem && (
                <div className="form-group">
                  <div style={{ marginBottom: '20px', padding: '16px', background: '#f8fafc', borderRadius: '8px' }}><p><strong>Client:</strong> {selectedItem.name || selectedItem.email}</p><p><strong>Current Balance:</strong> <span className="amount-text">₹{getWalletBalance(selectedItem.id).toLocaleString()}</span></p></div>
                  <div className="form-row" style={{ marginTop: '16px' }}>
                    <div className="form-group" style={{ flex: 1 }}><label className="form-label">Amount (₹) *</label><input type="number" className="form-input-large" value={formData.amount || ""} onChange={(e) => setFormData({...formData, amount: e.target.value})} placeholder="Enter amount" min="1" /></div>
                    <div className="form-group" style={{ flex: 1 }}><label className="form-label">Action *</label><div className="action-buttons" style={{ display: 'flex', gap: '8px', marginTop: '8px' }}><button type="button" className={`btn-sm ${formData.action === "add" ? "btn-success" : "btn-secondary"}`} onClick={() => setFormData({...formData, action: "add"})} style={{ flex: 1 }}>➕ Add</button><button type="button" className={`btn-sm ${formData.action === "deduct" ? "btn-danger" : "btn-secondary"}`} onClick={() => setFormData({...formData, action: "deduct"})} style={{ flex: 1 }}>➖ Deduct</button></div></div>
                  </div>
                  <p className="form-hint" style={{ marginTop: '12px' }}>Client will receive a notification about this transaction.</p>
                </div>
              )}

              {modalType === "reply-ticket" && (
                <>
                  <div className="form-group"><label className="form-label">Reply Message *</label><textarea rows="6" className="form-textarea-large" value={formData.replyMessage || ''} onChange={(e) => setFormData({...formData, replyMessage: e.target.value})} placeholder="Type your professional reply to the client..." required /></div>
                  <div className="form-group"><label className="form-label">Update Ticket Status</label><select className="form-select-large" value={formData.ticketStatus || selectedItem?.status || "In Progress"} onChange={(e) => setFormData({...formData, ticketStatus: e.target.value})}><option value="Open">Open</option><option value="In Progress">In Progress</option><option value="Resolved">Resolved</option><option value="Closed">Closed</option></select></div>
                </>
              )}

              {modalType === "add-driver" && (
                <>
                  <div className="form-row">
                    <div className="form-group" style={{ flex: 1 }}><label className="form-label">Driver Name *</label><input type="text" className="form-input-large" value={formData.name || ''} onChange={(e) => setFormData({...formData, name: e.target.value})} placeholder="Enter driver name" /></div>
                    <div className="form-group" style={{ flex: 1 }}><label className="form-label">Phone Number *</label><input type="tel" className="form-input-large" value={formData.phone || ''} onChange={(e) => setFormData({...formData, phone: e.target.value})} placeholder="+91 XXXXX XXXXX" /></div>
                  </div>
                  <div className="form-group"><label className="form-label">Vehicle Number *</label><input type="text" className="form-input-large" value={formData.vehicleNumber || ''} onChange={(e) => setFormData({...formData, vehicleNumber: e.target.value})} placeholder="e.g., TS07AB1234" /></div>
                  <div className="form-row">
                    <div className="form-group" style={{ flex: 1 }}><label className="form-label">Vehicle Type</label><select className="form-select-large" value={formData.vehicleType || 'Truck'} onChange={(e) => setFormData({...formData, vehicleType: e.target.value})}><option value="Truck">Truck</option><option value="Mini Truck">Mini Truck</option><option value="Tempo">Tempo</option><option value="Bike">Bike</option><option value="Auto">Auto</option></select></div>
                    <div className="form-group" style={{ flex: 1 }}><label className="form-label">License Number</label><input type="text" className="form-input-large" value={formData.licenseNumber || ''} onChange={(e) => setFormData({...formData, licenseNumber: e.target.value})} placeholder="Enter license number" /></div>
                  </div>
                </>
              )}

              {modalType === "add-hub" && (
                <>
                  <div className="form-row">
                    <div className="form-group" style={{ flex: 1 }}><label className="form-label">Hub Name *</label><input type="text" className="form-input-large" value={formData.name || ''} onChange={(e) => setFormData({...formData, name: e.target.value})} placeholder="e.g., Hyderabad Central Hub" /></div>
                    <div className="form-group" style={{ flex: 1 }}><label className="form-label">Location/City *</label><input type="text" className="form-input-large" value={formData.location || ''} onChange={(e) => setFormData({...formData, location: e.target.value})} placeholder="e.g., Hyderabad" /></div>
                  </div>
                  <div className="form-group"><label className="form-label">Full Address</label><textarea rows="3" className="form-textarea-large" value={formData.address || ''} onChange={(e) => setFormData({...formData, address: e.target.value})} placeholder="Enter complete address" /></div>
                  <div className="form-row">
                    <div className="form-group" style={{ flex: 1 }}><label className="form-label">Contact Number</label><input type="tel" className="form-input-large" value={formData.contactNumber || ''} onChange={(e) => setFormData({...formData, contactNumber: e.target.value})} placeholder="Phone number" /></div>
                    <div className="form-group" style={{ flex: 1 }}><label className="form-label">Capacity (kg)</label><input type="number" className="form-input-large" value={formData.capacity || ''} onChange={(e) => setFormData({...formData, capacity: e.target.value})} placeholder="1000" /></div>
                  </div>
                </>
              )}
            </div>
            
            <div className="modal-footer">
              <button type="button" className="btn-sm btn-secondary" onClick={() => setShowModal(false)} disabled={modalLoading}>Cancel</button>
              {modalType === "add-funds" && <button type="button" className="btn-sm btn-primary" onClick={() => handleUpdateWallet(selectedItem.id, formData.amount, formData.action)} disabled={modalLoading || !formData.amount || !formData.action}>{modalLoading ? "Processing..." : "Confirm Transaction"}</button>}
              {modalType === "update-status" && <button type="button" className="btn-sm btn-primary" onClick={() => handleUpdateShipmentStatus(selectedItem.id, formData.newStatus, formData.assignedDriverId)} disabled={modalLoading || !formData.newStatus}>{modalLoading ? "Updating..." : "Confirm Update"}</button>}
              {modalType === "reply-ticket" && <button type="button" className="btn-sm btn-primary" onClick={handleReplyToTicket} disabled={modalLoading || !formData.replyMessage}>{modalLoading ? "Sending..." : "Send Reply"}</button>}
              {modalType === "add-driver" && <button type="button" className="btn-sm btn-primary" onClick={handleAddDriver} disabled={modalLoading || !formData.name || !formData.phone || !formData.vehicleNumber}>{modalLoading ? "Adding..." : "Add Driver"}</button>}
              {modalType === "add-hub" && <button type="button" className="btn-sm btn-primary" onClick={handleAddHub} disabled={modalLoading || !formData.name || !formData.location}>{modalLoading ? "Adding..." : "Add Hub"}</button>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}