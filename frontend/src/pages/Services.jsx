import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import Footer from "../components/Footer";
import "./Services.css";

export default function Services() {
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

    const services = [
    {
      icon: "📦",
      title: "Freight Forwarding",
      desc: "Efficient air, sea & land freight solutions worldwide with full tracking and customs support.",
      img: "https://images.unsplash.com/photo-1578575437130-527eed3abbec?w=600&h=400&fit=crop",
    },
    {
      icon: "✈️",
      title: "Air Freight",
      desc: "Fast and reliable air cargo services for time-critical shipments across 120+ countries.",
      img: "https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=600&h=400&fit=crop",
    },
    {
      icon: "🚢",
      title: "Sea Freight",
      desc: "Cost-effective ocean freight solutions for FCL and LCL shipments of any size.",
      // ✅ FIXED: Replaced broken URL with a working cargo ship image
      img: "https://images.unsplash.com/photo-1550631392-26e6823af219?w=600&h=400&fit=crop", 
    },
    {
      icon: "🚛",
      title: "Land Transportation",
      desc: "Safe and efficient road transportation across India with GPS tracking.",
      img: "https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?w=600&h=400&fit=crop",
    },
    {
      icon: "🏭",
      title: "Warehousing & Distribution",
      desc: "Secure storage and seamless distribution solutions with inventory management.",
      img: "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=600&h=400&fit=crop",
    },
  ];
  
  const features = [
    { icon: "📦", title: "End-to-End Solutions", desc: "From pickup to delivery, we handle it all." },
    { icon: "🌍", title: "Global Network", desc: "Strong connections across 150+ countries." },
    { icon: "️", title: "Safe & Reliable", desc: "Your cargo is secure in our hands." },
    { icon: "⏰", title: "On-Time Delivery", desc: "99.7% punctuality is our promise." },
  ];

  const stats = [
    { num: "150+", label: "Countries Served" },
    { num: "50K+", label: "Monthly Shipments" },
    { num: "500+", label: "Warehouses" },
    { num: "99.7%", label: "On-Time Rate" },
  ];

  return (
    <main className="sv-page">
      {/* ===== HERO SECTION ===== */}
      <section className="sv-hero">
        <div className="sv-hero-overlay"></div>
        <div className="sv-hero-bg"></div>
        <div className="container sv-hero-content">
          <div className="sv-hero-text">
            <div className="sv-hero-label">
              <span className="sv-label-icon">≡</span>
              <span>SMARTER LOGISTICS. STRONGER CONNECTIONS.</span>
            </div>
            <h1 className="sv-hero-title">
              Logistics Services<br />
              <span className="sv-yellow">Built Right</span> For You.
            </h1>
            <p className="sv-hero-desc">
              End-to-end logistics solutions that connect your business to the world – safely, efficiently and on time. From documents to heavy cargo, domestic to global.
            </p>
            <div className="sv-hero-btns">
              <Link to="/booking" className="sv-btn sv-btn-yellow">
                Explore Services <span>→</span>
              </Link>
              <Link to="/tracking" className="sv-btn sv-btn-outline">
                Track Shipment <span>📦</span>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ===== FEATURES STRIP ===== */}
      <section className="sv-features">
        <div className="container">
          <div className="sv-features-grid">
            {features.map((f, i) => (
              <div key={i} className="sv-feature-item">
                <div className="sv-feature-icon">{f.icon}</div>
                <div>
                  <h4>{f.title}</h4>
                  <p>{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== SERVICES SECTION ===== */}
      <section className="sv-services">
        <div className="container">
          <div className="sv-section-head">
            <div className="sv-label">
              <span className="sv-label-icon">≡</span>
              OUR SERVICES
            </div>
            <h2>
              Logistics Solutions Built<br />
              Around <span className="sv-yellow">Your Business</span>
            </h2>
            <p>We offer a comprehensive range of logistics services designed to meet your unique needs and drive your business forward.</p>
            <Link to="/booking" className="sv-btn sv-btn-dark">
              View All Services <span>→</span>
            </Link>
          </div>
          <div className="sv-services-grid">
            {services.map((s, i) => (
              <div key={i} className="sv-service-card">
                <div className="sv-card-img-wrap">
                  <img src={s.img} alt={s.title} loading="lazy" />
                  <div className="sv-card-icon">{s.icon}</div>
                </div>
                <div className="sv-card-body">
                  <h3>{s.title}</h3>
                  <p>{s.desc}</p>
                  <Link to="/booking" className="sv-card-arrow">→</Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== STATS BAR ===== */}
      <section className="sv-stats">
        <div className="container">
          <div className="sv-stats-grid">
            {stats.map((s, i) => (
              <div key={i} className="sv-stat">
                <div className="sv-stat-num">{s.num}</div>
                <div className="sv-stat-label">{s.label}</div>
              </div>
            ))}
            <div className="sv-stat-cta">
              <div className="sv-stat-cta-icon">🤝</div>
              <div>
                <strong>Partner with ATIRATH</strong>
                <p>Experience logistics that deliver more than just cargo.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== SPECIALIZED SERVICES ===== */}
      <section className="sv-specialized">
        <div className="container">
          <div className="sv-section-head sv-head-light">
            <div className="sv-label">
              <span className="sv-label-icon">≡</span>
              SPECIALIZED SERVICES
            </div>
            <h2>
              Advanced Solutions For<br />
              <span className="sv-yellow">Complex Needs</span>
            </h2>
            <p>Tailored logistics services for industries that demand precision, compliance and expertise.</p>
          </div>
          <div className="sv-spec-grid">
            {[
              { icon: "🌡️", title: "Cold Chain Logistics", desc: "Temperature-controlled pharma and food transport with 2-8°C monitoring and GDP compliance." },
              { icon: "💎", title: "High-Value Shipping", desc: "Insured and secure handling for jewelry, electronics and valuable goods with chain of custody." },
              { icon: "", title: "Customs Clearance", desc: "Expert import/export documentation and regulatory compliance for smooth border crossing." },
              { icon: "🛒", title: "E-commerce Logistics", desc: "Complete online seller solutions with API integration, COD and returns management." },
              { icon: "⚠️", title: "Hazardous Materials", desc: "Certified DG transport with proper documentation, safety compliance and special packaging." },
              { icon: "💰", title: "COD Management", desc: "Secure cash collection and fast remittance with NDR management and reconciliation." },
            ].map((s, i) => (
              <div key={i} className="sv-spec-card">
                <div className="sv-spec-icon">{s.icon}</div>
                <h3>{s.title}</h3>
                <p>{s.desc}</p>
                <Link to="/booking" className="sv-spec-link">Learn More <span>→</span></Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== COVERAGE ===== */}
      <section className="sv-coverage">
        <div className="container">
          <div className="sv-section-head">
            <div className="sv-label">
              <span className="sv-label-icon">≡</span>
              OUR COVERAGE
            </div>
            <h2>
              Serving You Across<br />
              <span className="sv-yellow">India & Worldwide</span>
            </h2>
          </div>
          <div className="sv-coverage-grid">
            <div className="sv-coverage-card">
              <div className="sv-coverage-icon">🇳</div>
              <h3>Domestic Network</h3>
              <p>28,000+ PIN codes across India</p>
              <ul>
                <li>All major metro cities</li>
                <li>Tier 2 & 3 cities</li>
                <li>Remote area delivery</li>
              </ul>
            </div>
            <div className="sv-coverage-card">
              <div className="sv-coverage-icon">🌍</div>
              <h3>International Network</h3>
              <p>150+ countries worldwide</p>
              <ul>
                <li>USA, UK, UAE, Singapore</li>
                <li>Europe & Asia Pacific</li>
                <li>Customs clearance included</li>
              </ul>
            </div>
            <div className="sv-coverage-card">
              <div className="sv-coverage-icon">📍</div>
              <h3>PIN Code Checker</h3>
              <p>Verify serviceability instantly</p>
              <div className="sv-pin-check">
                <input type="text" placeholder="Enter PIN code" />
                <button>Check</button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== TOOLS ===== */}
      <section className="sv-tools">
        <div className="container">
          <div className="sv-section-head sv-head-light">
            <div className="sv-label">
              <span className="sv-label-icon">≡</span>
              SHIPPING TOOLS
            </div>
            <h2>
              Everything You Need To<br />
              <span className="sv-yellow">Manage Shipments</span>
            </h2>
          </div>
          <div className="sv-tools-grid">
            {[
              { icon: "🧮", title: "Rate Calculator", desc: "Get instant shipping quotes" },
              { icon: "🔍", title: "Track Shipment", desc: "Real-time package tracking" },
              { icon: "", title: "PIN Code Checker", desc: "Verify delivery areas" },
              { icon: "📤", title: "Bulk Upload", desc: "Upload multiple shipments via CSV" },
              { icon: "🔗", title: "API Documentation", desc: "Integrate shipping into your app" },
              { icon: "📐", title: "Volumetric Weight", desc: "Calculate dimensional weight" },
            ].map((t, i) => (
              <div key={i} className="sv-tool-card">
                <div className="sv-tool-icon">{t.icon}</div>
                <h3>{t.title}</h3>
                <p>{t.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== CTA SECTION ===== */}
      <section className="sv-cta">
        <div className="container">
          <div className="sv-cta-box">
            <div className="sv-cta-text">
              <div className="sv-label sv-label-light">
                <span className="sv-label-icon">≡</span>
                READY TO SHIP?
              </div>
              <h2>
                Got cargo to move?<br />
                <span className="sv-yellow">Let's plan the route.</span>
              </h2>
              <p>Talk to a logistics specialist — no IVR mazes, no wait times. Just answers.</p>
            </div>
            <div className="sv-cta-btns">
              <a href="tel:+919676464756" className="sv-btn sv-btn-yellow">
                📞 Call Now <span>→</span>
              </a>
              <Link to="/booking" className="sv-btn sv-btn-dark">
                Book a Shipment <span>→</span>
              </Link>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}