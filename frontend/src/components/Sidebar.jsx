import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import logoImage from "../assets/logo_3.png";
import "./Sidebar.css";

export default function Sidebar() {
  const location = useLocation();
  const { logout, currentUser } = useAuth();

  // ✅ UPDATED: Added essential logistics features
  const menuItems = [
    // --- Main Navigation ---
    { path: "/dashboard", icon: "📊", label: "Dashboard" },
    { path: "/book-shipment", icon: "", label: "Book Shipment" },
    { path: "/my-shipments", icon: "🚚", label: "My Shipments" },
    { path: "/tracking", icon: "📍", label: "Track Shipment" },
    
    // --- Tools & Financials (New) ---
    { path: "/rate-calculator", icon: "🧮", label: "Rate Calculator" },
    { path: "/invoices", icon: "🧾", label: "Invoices" },
    { path: "/wallets-payments", icon: "💳", label: "Wallets & Payments" }, // ✅ FIXED PATH
    
    // --- Management (New) ---
    { path: "/address-book", icon: "📒", label: "Address Book" },
    { path: "/returns", icon: "↩️", label: "Returns" },
    { path: "/documents", icon: "", label: "Documents" },
    { path: "/reports", icon: "📈", label: "Reports & Analytics" },
    
    // --- Support & Account ---
    { path: "/notifications", icon: "🔔", label: "Notifications", badge: 3 },
    { path: "/support", icon: "💬", label: "Support" },
    { path: "/profile", icon: "", label: "Profile" },
  ];

  const handleLogout = async () => {
    console.log("🔴 Sidebar Logout Clicked!");
    if (logout) {
      await logout();
    } else {
      console.error("❌ Logout function is undefined in Sidebar");
    }
  };

  return (
    <aside className="sidebar">
      {/* Logo Section */}
      <div className="sidebar-header">
        <div className="sidebar-logo">
          <img 
            src={logoImage} 
            alt="ATIRATH Logo" 
            style={{ width: "100px", height: "64px", objectFit: "contain" }}
          />
        </div>
      </div>

      {/* Navigation Menu */}
      <nav className="sidebar-nav">
        <div className="nav-section">
          {menuItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`nav-item ${location.pathname === item.path ? 'active' : ''}`}
            >
              <span className="nav-icon">{item.icon}</span>
              <span className="nav-label">{item.label}</span>
              {item.badge && <span className="nav-badge">{item.badge}</span>}
            </Link>
          ))}
        </div>
      </nav>

      {/* Footer with Logout */}
      <div className="sidebar-footer">
        <button onClick={handleLogout} className="nav-item logout-btn">
          <span className="nav-icon">🚪</span>
          <span className="nav-label">Logout</span>
        </button>
      </div>
    </aside>
  );
}