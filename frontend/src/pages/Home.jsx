import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import Footer from "../components/Footer";
import "./Home.css";

export default function Home() {
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const features = [
    { icon: "📦", title: "End-to-End Solutions", desc: "From pickup to delivery, we handle it all." },
    { icon: "🌍", title: "Global Network", desc: "Strong connections across 150+ countries." },
    { icon: "🛡️", title: "Safe & Reliable", desc: "Your cargo is fully insured and secure." },
    { icon: "⏰", title: "On-Time Delivery", desc: "Punctuality is our core promise to you." },
  ];

  const services = [
    { icon: "🏭", title: "Freight Forwarding", desc: "Efficient air, sea & land freight solutions worldwide tailored to your cargo size.", link: "/services" },
    { icon: "✈️", title: "Air Freight", desc: "Fast and reliable air cargo services for time-critical and high-value shipments.", link: "/services" },
    { icon: "🚢", title: "Sea Freight", desc: "Cost-effective ocean freight solutions for bulk shipments and international trade.", link: "/services" },
    { icon: "🚛", title: "Road Transport", desc: "Safe, efficient, and tracked road transportation across domestic and cross-border regions.", link: "/services" },
    { icon: "🏢", title: "Warehousing", desc: "Secure storage, inventory management, and seamless distribution solutions.", link: "/services" },
    { icon: "📋", title: "Customs Clearance", desc: "Expert import/export documentation, compliance, and hassle-free border clearance.", link: "/services" },
  ];

  const processSteps = [
    { num: "01", title: "Request a Quote", desc: "Share your cargo details, dimensions, and destination with our experts.", icon: "📝" },
    { num: "02", title: "Custom Planning", desc: "We design the most efficient, cost-effective, and fastest route for you.", icon: "🗺️" },
    { num: "03", title: "Secure Transit", desc: "Your shipment is handled with extreme care and tracked in real-time.", icon: "🚚" },
    { num: "04", title: "Safe Delivery", desc: "On-time delivery right to your doorstep, warehouse, or final destination.", icon: "✅" },
  ];

  const stats = [
    { num: "150+", label: "Countries Served" },
    { num: "50K+", label: "Monthly Shipments" },
    { num: "500+", label: "Global Warehouses" },
    { num: "99.7%", label: "On-Time Delivery" },
  ];

  const testimonials = [
    { name: "Rajesh Kumar", role: "CEO, SpiceExports", text: "ATIRATH transformed our supply chain. Exceptional reliability and real-time visibility made our global expansion seamless.", avatar: "RK" },
    { name: "Priya Sharma", role: "Ops Head, Global Traders", text: "Complex multi-modal shipments handled with absolute ease. They are a true logistics partner, not just a vendor.", avatar: "PS" },
    { name: "Amit Patel", role: "Director, Patel Enterprises", text: "Fair pricing, brutal honesty about timelines, and 24/7 support. It's a rare combination in this industry.", avatar: "AP" },
  ];

  const partners = ["MAERSK", "DHL", "FEDEX", "UPS", "BLUEDART", "DELHIVERY", "MSC", "HAPAG-LLOYD"];

  return (
    <main className="home-page">
      {/* ===== HERO SECTION ===== */}
      <motion.section 
        className="home-hero"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8 }}
      >
        <div className="home-hero-bg"></div>
        <div className="home-hero-overlay"></div>
        <div className="container home-hero-content">
          <motion.div 
            className="home-hero-text"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            <div className="home-hero-label">
              <span>≡</span>
              <span>GLOBAL LOGISTICS PARTNER</span>
            </div>
            <h1 className="home-hero-title">
              Seamless Global <br />
              <span className="home-accent">Logistics</span> & Freight Solutions
            </h1>
            <p className="home-hero-desc">
              We connect your business to the world with fast, secure, and reliable transportation across air, sea, and land. Track shipments in real-time and manage cargo effortlessly.
            </p>
            <div className="home-hero-btns">
              <Link to="/tracking" className="home-btn home-btn-accent">
                Track Shipment <span>📦</span>
              </Link>
              <Link to="/services" className="home-btn home-btn-outline">
                Explore Services <span>→</span>
              </Link>
            </div>
            
            {/* Trust Bar */}
            <div className="home-hero-trust">
              <div className="home-hero-trust-item"><span>⭐</span> 4.9/5 Rated</div>
              <div className="home-hero-trust-item"><span>🌍</span> 500+ Global Clients</div>
              <div className="home-hero-trust-item"><span>⏱️</span> 24/7 Support</div>
            </div>
          </motion.div>
        </div>
      </motion.section>

      {/* ===== FEATURES STRIP ===== */}
      <section className="home-features">
        <div className="container">
          <div className="home-features-grid">
            {features.map((f, i) => (
              <motion.div 
                key={i} 
                className="home-feature-item"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
              >
                <div className="home-feature-icon">{f.icon}</div>
                <div>
                  <h4>{f.title}</h4>
                  <p>{f.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== NEW: ABOUT INTRO SECTION ===== */}
      <section className="home-intro">
        <div className="container">
          <div className="home-intro-grid">
            <motion.div 
              className="home-intro-text"
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <div className="home-label"><span>≡</span> WHO WE ARE</div>
              <h2>Moving the World, <span className="home-accent">One Shipment</span> at a Time</h2>
              <p>At Atirath Logistics, we don't just move cargo; we deliver peace of mind. With over a decade of expertise in freight forwarding, customs clearance, and supply chain management, we provide tailored solutions that drive your business forward.</p>
              <Link to="/about" className="home-btn home-btn-dark">Discover Our Story <span>→</span></Link>
            </motion.div>
            
            <motion.div 
              className="home-intro-visual"
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <div className="home-intro-card">
                <div className="home-intro-card-icon">🌐</div>
                <h3>Global Reach</h3>
                <p>Operating in over 150 countries with a network of trusted, vetted partners.</p>
              </div>
              <div className="home-intro-card">
                <div className="home-intro-card-icon">⚡</div>
                <h3>Fast Turnaround</h3>
                <p>Industry-leading transit times without ever compromising on safety or compliance.</p>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ===== SERVICES PREVIEW ===== */}
      <section className="home-services">
        <div className="container">
          <div className="home-section-head">
            <div className="home-label">
              <span>≡</span>
              OUR SERVICES
            </div>
            <h2>
              Comprehensive Logistics <br />
              <span className="home-accent">Solutions</span> Built for You
            </h2>
            <p>From local deliveries to international freight, we offer end-to-end solutions tailored to your specific supply chain needs.</p>
          </div>
          <div className="home-services-grid">
            {services.map((s, i) => (
              <motion.div 
                key={i} 
                className="home-service-card"
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
              >
                <div className="home-card-icon-large">{s.icon}</div>
                <h3>{s.title}</h3>
                <p>{s.desc}</p>
                <Link to={s.link} className="home-card-arrow">Learn More <span>→</span></Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== NEW: HOW WE WORK (PROCESS) ===== */}
      <section className="home-process">
        <div className="container">
          <div className="home-section-head">
            <div className="home-label"><span>≡</span> OUR PROCESS</div>
            <h2>How We <span className="home-accent">Work</span></h2>
            <p>Our streamlined 4-step process ensures your cargo reaches its destination safely, efficiently, and on time.</p>
          </div>
          <div className="home-process-grid">
            {processSteps.map((step, i) => (
              <motion.div 
                key={i} 
                className="home-process-card"
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.15 }}
              >
                <div className="home-process-num">{step.num}</div>
                <div className="home-process-icon">{step.icon}</div>
                <h3>{step.title}</h3>
                <p>{step.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== STATS BAR ===== */}
      <section className="home-stats">
        <div className="container">
          <div className="home-stats-grid">
            {stats.map((s, i) => (
              <motion.div 
                key={i} 
                className="home-stat"
                initial={{ opacity: 0, scale: 0.5 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
              >
                <div className="home-stat-num">{s.num}</div>
                <div className="home-stat-label">{s.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== TESTIMONIALS ===== */}
      <section className="home-testimonials">
        <div className="container">
          <div className="home-section-head">
            <div className="home-label"><span>≡</span> TESTIMONIALS</div>
            <h2>What Our <span className="home-accent">Clients Say</span></h2>
            <p>Trusted by businesses across industries to deliver excellence.</p>
          </div>
          <div className="home-testimonials-grid">
            {testimonials.map((t, i) => (
              <motion.div 
                key={i} 
                className="home-testimonial-card"
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
              >
                <div className="home-testimonial-stars">★★★★★</div>
                <p className="home-testimonial-text">"{t.text}"</p>
                <div className="home-testimonial-author">
                  <div className="home-testimonial-avatar">{t.avatar}</div>
                  <div>
                    <div className="home-testimonial-name">{t.name}</div>
                    <div className="home-testimonial-role">{t.role}</div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== PARTNERS MARQUEE ===== */}
      <section className="home-partners">
        <div className="container">
          <div className="home-partners-title">TRUSTED BY GLOBAL CARRIERS</div>
          <div className="home-partners-marquee">
            {[...partners, ...partners].map((p, i) => (
              <div key={i} className="home-partner-word">{p}</div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== CTA SECTION ===== */}
      <section className="home-cta">
        <div className="container">
          <div className="home-cta-box">
            <div className="home-cta-text">
              <div className="home-label home-label-light">
                <span>≡</span>
                READY TO SHIP?
              </div>
              <h2>
                Ready to Optimize <br />
                <span className="home-accent">Your Supply Chain?</span>
              </h2>
              <p>Get a free consultation and custom quote for your next shipment. Our logistics experts are standing by to help you move faster and smarter.</p>
            </div>
            <div className="home-cta-btns">
              <Link to="/contact" className="home-btn home-btn-accent">
                Get Free Quote <span>→</span>
              </Link>
              <a href="tel:+919676464756" className="home-btn home-btn-outline-light">
                📞 Call Now
              </a>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}