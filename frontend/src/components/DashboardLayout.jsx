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
      {/* ✅ SIDEBAR - MUST BE HERE */}
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