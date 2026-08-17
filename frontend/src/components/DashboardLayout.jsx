// DashboardLayout.jsx lo main content ki mundu add cheyandi:
<div style={{ 
  padding: "12px 24px", 
  background: "#fff", 
  borderBottom: "1px solid #e2e8f0",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
}}>
  {/* Mobile Menu Button */}
  <button 
    onClick={() => setSidebarOpen(true)}
    style={{
      display: "none", // Desktop lo hide
      background: "none",
      border: "none",
      fontSize: "24px",
      cursor: "pointer",
    }}
    className="mobile-menu-btn"
  >
    ☰
  </button>
  <h2 style={{ fontSize: "18px", fontWeight: "600", margin: 0 }}>
    {location.pathname === "/dashboard" && "Dashboard"}
    {location.pathname === "/pickup-scheduler" && "Pickup Scheduler"}
    {location.pathname === "/pickup-history" && "Pickup History"}
  </h2>
</div>

import { useState } from "react";
import Sidebar from "./Sidebar";

export default function DashboardLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  return (
    <div style={{ 
      display: "flex",
      minHeight: "100vh",
      background: "#f8fafc",
      width: "100%"
    }}>
      {/* ✅ SIDEBAR */}
      <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />
      
      {/* ✅ MAIN CONTENT */}
      <main style={{ 
        flex: 1,
        padding: "24px",
        color: "#1f2937",
        overflowY: "auto",
        background: "#f8fafc",
        minHeight: "100vh",
        width: "100%",
        boxSizing: "border-box"
      }}>
        {children}
      </main>
    </div>
  );
}