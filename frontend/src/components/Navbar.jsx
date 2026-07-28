// =========================================
// ATIRATH LOGISTICS - NAVBAR COMPONENT
// File: src/components/Navbar/Navbar.jsx
// ✅ UPDATED: Professional White Theme with Orange Accents
// =========================================

import { useState, useEffect, useRef, useCallback } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import logo from "../assets/logo_3.png";
import "./Navbar.css";

export default function Navbar() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const menuRef = useRef(null);
  const toggleRef = useRef(null);
  const profileRef = useRef(null);
  
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  /* =========================
     📜 SCROLL EFFECT
  ========================= */
  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  /* =========================
     🔄 CLOSE MENUS ON ROUTE CHANGE
  ========================= */
  useEffect(() => {
    setIsMobileMenuOpen(false);
    setIsProfileOpen(false);
  }, [location.pathname]);

  /* =========================
     🔒 BODY LOCK FOR MOBILE MENU
  ========================= */
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.classList.add("menu-open");
    } else {
      document.body.classList.remove("menu-open");
    }
    return () => document.body.classList.remove("menu-open");
  }, [isMobileMenuOpen]);

  /* =========================
     ⌨️ ESC KEY CLOSES MENUS
  ========================= */
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === "Escape") {
        setIsMobileMenuOpen(false);
        setIsProfileOpen(false);
        toggleRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, []);

  /* =========================
     👆 CLICK OUTSIDE TO CLOSE PROFILE
  ========================= */
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (isMobileMenuOpen && menuRef.current && !menuRef.current.contains(e.target) && toggleRef.current && !toggleRef.current.contains(e.target)) {
        setIsMobileMenuOpen(false);
      }
      if (isProfileOpen && profileRef.current && !profileRef.current.contains(e.target)) {
        setIsProfileOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isMobileMenuOpen, isProfileOpen]);

  /* =========================
     🎯 HELPERS
  ========================= */
  const toggleMenu = useCallback(() => setIsMobileMenuOpen(p => !p), []);
  const closeMenu = useCallback(() => setIsMobileMenuOpen(false), []);
  const toggleProfile = useCallback(() => setIsProfileOpen(p => !p), []);
  
  const handleLogout = () => {
    logout();
    setIsProfileOpen(false);
    closeMenu();
  };

  const navItems = [
    { path: "/", label: "Home" },
    { path: "/services", label: "Services" },
    { path: "/booking", label: "Booking" },
    { path: "/about", label: "About Us" },
    { path: "/tracking", label: "Track Shipment" },
    { path: "/contact", label: "Contact Us" },
  ];

  return (
    <>
      <header className={`navbar ${scrolled ? "scrolled" : ""}`}>
        
        {/* 🔷 LEFT - BRAND (Logo + Name Side-by-Side) */}
        <div className="navbar-left">
          <Link to="/" className="brand" onClick={closeMenu}>
            <img 
              src={logo} 
              alt="Atirath Logistics" 
              className="logo" 
              width="48"
              height="48"
              loading="eager"
            />
            <div className="brand-text">
              <span className="brand-main">ATIRATH</span>
              <span className="brand-sub">LOGISTICS</span>
            </div>
          </Link>
        </div>

        {/* 🔷 MOBILE TOGGLE */}
        <button
          ref={toggleRef}
          type="button"
          className={`nav-toggle ${isMobileMenuOpen ? "active" : ""}`}
          onClick={toggleMenu}
          aria-label={isMobileMenuOpen ? "Close menu" : "Open menu"}
          aria-expanded={isMobileMenuOpen}
          aria-controls="nav-menu"
        >
          <span className="hamburger" aria-hidden="true"></span>
        </button>

        {/* 🔷 CENTER - NAVIGATION */}
        <nav
          ref={menuRef}
          id="nav-menu"
          className={`nav-links ${isMobileMenuOpen ? "active" : ""}`}
          role="navigation"
          aria-label="Main navigation"
        >
          {navItems.map(({ path, label }) => (
            <NavLink
              key={path}
              to={path}
              end={path === "/"}
              onClick={closeMenu}
              className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}
            >
              {label}
            </NavLink>
          ))}

          {/* 🔷 RIGHT - UNIFIED PROFILE BOX (Corner) */}
          <div className="nav-right" ref={profileRef}>
            <div className="profile-wrapper">
              {/* Profile Trigger Button - Works for BOTH Guest & Authenticated */}
              <button
                className="profile-trigger"
                onClick={toggleProfile}
                aria-expanded={isProfileOpen}
                aria-haspopup="true"
                aria-label={user ? "Open profile menu" : "Open login menu"}
              >
                <div className="profile-avatar">
                  {user 
                    ? (user.name?.charAt(0).toUpperCase() || "U") 
                    : (
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" strokeLinecap="round"/>
                          <circle cx="12" cy="7" r="4" strokeLinecap="round"/>
                        </svg>
                      )
                  }
                </div>
                {/* Show name only for authenticated users on desktop */}
                {user && (
                  <span className="profile-name desktop-only">
                    {user.name || user.email?.split('@')[0]}
                  </span>
                )}
                <svg className="profile-arrow" width="12" height="8" viewBox="0 0 12 8" fill="none">
                  <path d="M1 1L6 6L11 1" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </button>
              
              {/* Profile Dropdown - Dynamic based on auth state */}
              {isProfileOpen && (
                <div className="profile-dropdown" role="menu">
                  {user ? (
                    // 👤 AUTHENTICATED: User Profile Options
                    <>
                      <div className="profile-header">
                        <div className="profile-avatar large">
                          {user.name?.charAt(0).toUpperCase() || "U"}
                        </div>
                        <div>
                          <p className="profile-email">{user.email}</p>
                          <span className="profile-role">
                            {user.role === 'admin' ? '👑 Administrator' : '👤 Customer'}
                          </span>
                        </div>
                      </div>
                      <Link 
                        to={user.role === "admin" ? "/admin" : "/dashboard"} 
                        className="profile-item"
                        onClick={() => setIsProfileOpen(false)}
                      >
                        📊 Dashboard
                      </Link>
                      <Link to="/profile" className="profile-item" onClick={() => setIsProfileOpen(false)}>
                        👤 My Profile
                      </Link>
                      <Link to="/bookings" className="profile-item" onClick={() => setIsProfileOpen(false)}>
                        📦 My Bookings
                      </Link>
                      <hr className="profile-divider" />
                      <button className="profile-item logout" onClick={handleLogout}>
                        🚪 Logout
                      </button>
                    </>
                  ) : (
                    // 🔐 GUEST: Login/Signup Options
                    <>
                      <div className="profile-header guest-header">
                        <div className="profile-avatar large guest-avatar">
                          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" strokeLinecap="round"/>
                            <circle cx="12" cy="7" r="4" strokeLinecap="round"/>
                          </svg>
                        </div>
                        <div>
                          <p className="profile-title">Welcome to Atirath</p>
                          <span className="profile-subtitle">Login or create an account</span>
                        </div>
                      </div>
                      
                      {/* ✅ LOGIN BUTTON - Goes to /login */}
                      <Link 
                        to="/login" 
                        className="profile-item auth-option"
                        onClick={() => setIsProfileOpen(false)}
                      >
                        🔐 Login to Account
                      </Link>
                      
                      {/* ✅ SIGNUP BUTTON - Goes to /signup */}
                      <Link 
                        to="/signup" 
                        className="profile-item auth-option primary"
                        onClick={() => setIsProfileOpen(false)}
                      >
                        🚀 Create Free Account
                      </Link>
                      
                      <hr className="profile-divider" />
                      <p className="profile-guest-note">
                        Track shipments, manage bookings & more with your account.
                      </p>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </nav>
      </header>

      {/* 🌑 MOBILE BACKDROP */}
      {isMobileMenuOpen && (
        <div className="nav-backdrop" onClick={closeMenu} aria-hidden="true" />
      )}
    </>
  );
}