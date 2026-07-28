import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { Link, useLocation } from "react-router-dom";
import { motion, useScroll, useTransform } from "framer-motion";
import Layout from "../components/Layout";
import "./AboutUs.css";

// IMAGE IMPORTS
import mdFaizImg from "../assets/md-faiz.jpg";
import waseemLalaImg from "../assets/WaseemLala sir.jpg";
import mdRiyazatullahImg from "../assets/md-riyazatullah-khan.jpg";
import aboutHero from "../assets/about-hero.jpg";
import missionImg from "../assets/mission.jpg";

// VIDEO IMPORT
import ourStoryVideo from "../assets/our-story.mp4";

// =========================================
// 🎯 ANIMATED COUNTER
// =========================================
const AnimatedCounter = ({ end, duration = 2000, suffix = "", label }) => {
  const [count, setCount] = useState(0);
  const ref = useRef(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (!ref.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.unobserve(entry.target);
        }
      },
      { threshold: 0.5 }
    );
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!isVisible) return;
    let startTime;
    const animate = (currentTime) => {
      if (!startTime) startTime = currentTime;
      const progress = Math.min((currentTime - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 4);
      setCount(Math.floor(eased * end));
      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [isVisible, end, duration]);

  return (
    <motion.div
      ref={ref}
      className="stat-item"
      initial={{ scale: 0.9, opacity: 0 }}
      animate={isVisible ? { scale: 1, opacity: 1 } : {}}
    >
      <h3 className="stat-number">{count.toLocaleString()}{suffix}</h3>
      <p className="stat-label">{label}</p>
    </motion.div>
  );
};

// =========================================
// ⏱️ TIMELINE ITEM
// =========================================
const TimelineItem = ({ year, title, desc, isLeft, index }) => {
  const ref = useRef(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    if (!ref.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.unobserve(entry.target);
        }
      },
      { threshold: 0.2 }
    );
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return (
    <motion.div
      ref={ref}
      className={`timeline-item ${isLeft ? "left" : "right"}`}
      initial={{ opacity: 0, x: isLeft ? -40 : 40 }}
      animate={isVisible ? { opacity: 1, x: 0 } : {}}
      transition={{ delay: index * 0.15 }}
    >
      <div className="timeline-dot" />
      <div className="timeline-content">
        <span className="timeline-year">{year}</span>
        <button
          className="timeline-title-btn"
          onClick={() => setIsExpanded(!isExpanded)}
          type="button"
        >
          <h4 className="timeline-title">{title}</h4>
          <span className="timeline-toggle-icon">{isExpanded ? "−" : "+"}</span>
        </button>
        {(isExpanded || (typeof window !== "undefined" && window.innerWidth >= 768)) && (
          <motion.p
            className="timeline-desc"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
          >
            {desc}
          </motion.p>
        )}
      </div>
    </motion.div>
  );
};

// =========================================
// 👥 TEAM CARD
// =========================================
const TeamCard = ({ member, index, onImageError }) => {
  return (
    <motion.article
      className="team-card"
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.15 }}
      whileHover={{ y: -10 }}
    >
      <div className="team-image-container">
        <div className="team-image-wrapper">
          <img
            src={member.img}
            alt={`${member.name} - ${member.role}`}
            loading="lazy"
            onError={(e) =>
              onImageError(
                e,
                `https://ui-avatars.com/api/?name=${encodeURIComponent(
                  member.name
                )}&size=200&background=f97316&color=fff`
              )
            }
          />
        </div>
        <span className="team-role-badge">{member.role}</span>
      </div>

      <h3 className="team-name">{member.name}</h3>
      <p className="team-bio">{member.bio}</p>

      <div className="team-social">
        {member.social.linkedin && (
          <a
            href={member.social.linkedin}
            className="social-link"
            target="_blank"
            rel="noopener noreferrer"
          >
            in
          </a>
        )}
        {member.social.email && (
          <a href={`mailto:${member.social.email}`} className="social-link">
            ✉️
          </a>
        )}
      </div>
    </motion.article>
  );
};

// =========================================
// 🏠 MAIN COMPONENT
// =========================================
export default function AboutUs() {
  const location = useLocation();
  const [activeTab, setActiveTab] = useState("mission");
  const [scrollProgress, setScrollProgress] = useState(0);
  const [hasVideo, setHasVideo] = useState(false);

  const { scrollY } = useScroll();
  const heroParallax = useTransform(scrollY, [0, 500], [0, 100]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [location.pathname]);

  useEffect(() => {
    const handleScroll = () => {
      const total = document.documentElement.scrollHeight - window.innerHeight;
      setScrollProgress(
        total > 0 ? Math.min((window.scrollY / total) * 100, 100) : 0
      );
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleImageError = useCallback((e, fallback) => {
    try {
      e.target.onerror = null;
      e.target.src = fallback;
    } catch {}
  }, []);

  const teamMembers = useMemo(
    () => [
      {
        name: "MD. FAIZ",
        role: "COO & Founder",
        img: mdFaizImg,
        bio: "20+ years in logistics & supply chain management. Visionary leader driving global expansion.",
        social: {
          linkedin: "#",
          email: "faiz@atirathlogistics.com",
        },
      },
      {
        name: "MD. RIYAZATULLAH KHAN",
        role: "Operations Head",
        img: mdRiyazatullahImg,
        bio: "Expert in global operations & process optimization. Ensuring seamless delivery worldwide.",
        social: {
          linkedin: "#",
          email: "riyaz@atirathlogistics.com",
        },
      },
      {
        name: "WASEEM LALA",
        role: "Logistics Manager",
        img: waseemLalaImg,
        bio: "Specialist in last-mile delivery & fleet management. Master of operational excellence.",
        social: {
          linkedin: "#",
          email: "waseem@atirathlogistics.com",
        },
      },
    ],
    []
  );

  const timelineData = useMemo(
    () => [
      {
        year: "2010",
        title: "Foundation",
        desc: "Atirath Logistics founded with a vision to simplify shipping across India.",
      },
      {
        year: "2013",
        title: "National Expansion",
        desc: "Expanded operations to 500+ cities across India with dedicated fleet.",
      },
      {
        year: "2016",
        title: "Global Network",
        desc: "Launched international shipping to 50+ countries with trusted partners.",
      },
      {
        year: "2019",
        title: "Tech Innovation",
        desc: "AI-powered tracking & route optimization system launched.",
      },
      {
        year: "2022",
        title: "120+ Countries",
        desc: "Became a trusted global logistics partner serving enterprises worldwide.",
      },
      {
        year: "2024",
        title: "Sustainability",
        desc: "Carbon-neutral shipping initiative launched for eco-friendly logistics.",
      },
    ],
    []
  );

  const whyChooseData = useMemo(
    () => [
      {
        icon: "🛡️",
        title: "Secure Handling",
        desc: "Your cargo is fully insured and handled with military-grade care protocols.",
        color: "#f97316",
      },
      {
        icon: "⚡",
        title: "Fast Delivery",
        desc: "AI-optimized routes ensure the quickest delivery times in the industry.",
        color: "#2563eb",
      },
      {
        icon: "🌍",
        title: "Global Network",
        desc: "Seamlessly connected to 120+ countries with trusted local partners.",
        color: "#16a34a",
      },
      {
        icon: "💰",
        title: "Best Pricing",
        desc: "Transparent, competitive rates with zero hidden fees or surprises.",
        color: "#8b5cf6",
      },
    ],
    []
  );

  const tabContent = useMemo(
    () => ({
      mission: {
        title: "Our Mission",
        content:
          "To eliminate complexity from global trade by providing intelligent, scalable, and human-centered shipping solutions that empower businesses to grow without boundaries.",
        icon: "🎯",
        features: [
          "Customer-First Approach",
          "Technology-Driven",
          "Sustainable Practices",
        ],
      },
      vision: {
        title: "Our Vision",
        content:
          "To be the world's most trusted logistics partner by 2030, setting new standards in speed, reliability, and sustainability.",
        icon: "🔭",
        features: [
          "Global Leadership",
          "Innovation Hub",
          "Zero-Carbon Future",
        ],
      },
      values: {
        title: "Our Values",
        content:
          "Integrity in every shipment, innovation in every solution, and partnership in every relationship.",
        icon: "❤️",
        features: [
          "Trust & Transparency",
          "Continuous Improvement",
          "People First",
        ],
      },
    }),
    []
  );

  return (
    <Layout>
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>

      <motion.div
        className="scroll-progress-bar"
        style={{ scaleX: scrollProgress / 100, originX: 0 }}
      />

      <main id="main-content" className="about-page">
        {/* ============================================
             HERO SECTION
            ============================================ */}
        <section className="about-hero">
          <motion.div
            className="hero-bg"
            style={{
              background: `linear-gradient(135deg, rgba(2, 6, 23, 0.92), rgba(10, 14, 39, 0.90)), url(${aboutHero})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
              y: heroParallax,
            }}
          />

          <div className="hero-container">
            {/* LEFT - TEXT */}
            <motion.div
              className="hero-text-content"
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.3 }}
            >
              <span className="hero-badge">🚀 Since 2010</span>

              <h1 className="hero-title">
                ATIRATH
                <span className="title-accent"> LOGISTICS</span>
              </h1>

              <p className="hero-tagline">
                Delivering Trust. Connecting Possibilities.
              </p>

              <p className="hero-description">
                Seamless global supply chain solutions powered by innovation
                and integrity. We move your business forward, across borders
                and beyond expectations.
              </p>

              <ul className="hero-features-list">
                {[
                  "Reliable & Secure Shipping",
                  "99.7% On-Time Delivery",
                  "120+ Countries Global Reach",
                ].map((feature, i) => (
                  <motion.li
                    key={i}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.6 + i * 0.1 }}
                  >
                    <span className="feature-check-icon">✓</span>
                    <span className="feature-text">{feature}</span>
                  </motion.li>
                ))}
              </ul>

              <div className="hero-buttons">
                <Link to="/contact" className="btn-primary">
                  Get a Free Quote →
                </Link>
                <Link to="/services" className="btn-outline">
                  Explore Services
                </Link>
              </div>
            </motion.div>

            {/* RIGHT - VIDEO */}
            <motion.div
              className="hero-video-section"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.5 }}
            >
              <div className="video-container">
                <video
                  className="main-video"
                  autoPlay
                  loop
                  muted
                  playsInline
                  poster={aboutHero}
                  onLoadedData={() => setHasVideo(true)}
                  onError={() => setHasVideo(false)}
                >
                  <source src={ourStoryVideo} type="video/mp4" />
                </video>

                {!hasVideo && (
                  <div className="video-image-fallback">
                    <img src={aboutHero} alt="Logistics Operations" />
                    <div className="fallback-overlay">
                      <div className="play-button">▶</div>
                      <p className="fallback-text">Logistics in Motion</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="video-live-indicator">
                <span className="live-red-dot" />
                <span>Live Operations</span>
              </div>
            </motion.div>
          </div>

          <a href="#stats" className="scroll-down-indicator">
            <div className="mouse-icon">
              <div className="mouse-wheel" />
            </div>
          </a>
        </section>

        {/* ============================================
            📊 STATS SECTION
            ============================================ */}
        <section className="about-section stats-section" id="stats">
          <div className="container">
            <motion.div
              className="section-header"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <span className="section-subheading">OUR IMPACT</span>
              <h2 className="section-heading">
                Numbers That Define Excellence
              </h2>
            </motion.div>
            <div className="stats-grid">
              <AnimatedCounter end={120} suffix="+" label="Countries Worldwide" />
              <AnimatedCounter end={5000} suffix="+" label="Happy Clients" />
              <AnimatedCounter
                end={1000000}
                suffix="+"
                label="Packages Delivered"
              />
              <AnimatedCounter end={99} suffix=".7%" label="On-Time Rate" />
            </div>
          </div>
        </section>

        {/* ============================================
             STORY SECTION
            ============================================ */}
        <section className="about-section story-section">
          <div className="container">
            <div className="story-two-column">
              <motion.div
                className="story-left-text"
                initial={{ opacity: 0, x: -30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
              >
                <span className="section-subheading">WHO WE ARE</span>
                <h2>Delivering Excellence Since 2010</h2>
                <p>
                  Trusted by 5,000+ businesses worldwide for reliable,
                  efficient, and secure logistics solutions. We combine
                  cutting-edge technology with human expertise to deliver
                  exceptional service.
                </p>
                <ul className="features-checklist">
                  {[
                    "15+ Years Experience",
                    "ISO 9001:2015 Certified",
                    "120+ Countries",
                    "99.7% On-Time Rate",
                  ].map((item, i) => (
                    <li key={i}>
                      <span className="checkmark">✓</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </motion.div>
              <motion.div
                className="story-right-image"
                initial={{ opacity: 0, x: 30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
              >
                <img
                  src={missionImg}
                  alt="Atirath Operations"
                  className="story-image"
                />
                <div className="years-badge">
                  <span className="years-number">15+</span>
                  <span className="years-label">Years</span>
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* ============================================
             WHY CHOOSE US
            ============================================ */}
        <section className="about-section why-section">
          <div className="container">
            <motion.div
              className="section-header"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <span className="section-subheading">WHY CHOOSE US</span>
              <h2 className="section-heading">The Atirath Advantage</h2>
            </motion.div>
            <div className="why-grid">
              {whyChooseData.map((item, i) => (
                <motion.div
                  key={i}
                  className="why-card"
                  style={{ "--card-color": item.color }}
                  initial={{ opacity: 0, y: 50 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.15 }}
                  whileHover={{ y: -8 }}
                >
                  <div className="why-icon">
                    <span>{item.icon}</span>
                  </div>
                  <h3>{item.title}</h3>
                  <div className="card-line" />
                  <p>{item.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* ============================================
            ⏱️ TIMELINE
            ============================================ */}
        <section className="about-section timeline-section">
          <div className="container">
            <motion.div
              className="section-header"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <span className="section-subheading">OUR JOURNEY</span>
              <h2 className="section-heading">Milestones of Excellence</h2>
            </motion.div>
            <div className="timeline-wrapper">
              <div className="timeline-center-line" />
              {timelineData.map((item, i) => (
                <TimelineItem
                  key={i}
                  year={item.year}
                  title={item.title}
                  desc={item.desc}
                  index={i}
                  isLeft={i % 2 === 0}
                />
              ))}
            </div>
          </div>
        </section>

        {/* ============================================
             MISSION TABS
            ============================================ */}
        <section className="about-section mission-section">
          <div className="container">
            <motion.div
              className="section-header"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <span className="section-subheading">OUR PURPOSE</span>
              <h2 className="section-heading">Driven by Purpose</h2>
            </motion.div>
            <div className="tabs-container">
              <div className="tabs-buttons">
                {Object.keys(tabContent).map((key) => (
                  <button
                    key={key}
                    className={`tab-button ${
                      activeTab === key ? "active" : ""
                    }`}
                    onClick={() => setActiveTab(key)}
                    type="button"
                  >
                    <span>{tabContent[key].icon}</span>{" "}
                    {tabContent[key].title}
                  </button>
                ))}
              </div>
              <div className="tabs-content-box">
                {Object.entries(tabContent).map(([key, content]) =>
                  activeTab === key ? (
                    <motion.div
                      key={key}
                      className="tab-content"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                    >
                      <span className="big-icon">{content.icon}</span>
                      <h3>{content.title}</h3>
                      <p>{content.content}</p>
                      {content.features && (
                        <ul className="feature-list">
                          {content.features.map((f, i) => (
                            <li key={i}>• {f}</li>
                          ))}
                        </ul>
                      )}
                    </motion.div>
                  ) : null
                )}
              </div>
            </div>
          </div>
        </section>

        {/* ============================================
            👥 TEAM
            ============================================ */}
        <section className="about-section team-section">
          <div className="container">
            <motion.div
              className="section-header"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <span className="section-subheading">LEADERSHIP</span>
              <h2 className="section-heading">Meet Our Experts</h2>
            </motion.div>
            <div className="team-grid">
              {teamMembers.map((member, index) => (
                <TeamCard
                  key={member.name}
                  member={member}
                  index={index}
                  onImageError={handleImageError}
                />
              ))}
            </div>
          </div>
        </section>

        {/* ============================================
             CERTIFICATIONS
            ============================================ */}
        <section className="about-section cert-section">
          <div className="container">
            <motion.div
              className="section-header"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <span className="section-subheading">CERTIFICATIONS</span>
              <h2 className="section-heading">Recognitions & Awards</h2>
            </motion.div>
            <div className="cert-grid">
              {[
                "ISO 9001:2015",
                "IATA Certified",
                "Green Logistics",
                "AEO Certified",
              ].map((cert, i) => (
                <motion.div
                  key={i}
                  className="cert-card"
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  whileHover={{ y: -8 }}
                >
                  <div className="cert-icon">🏆</div>
                  <h3>{cert}</h3>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* ============================================
            📣 CTA
            ============================================ */}
        <section className="about-section cta-section">
          <div className="container">
            <motion.div
              className="cta-content"
              initial={{ y: 40, opacity: 0 }}
              whileInView={{ y: 0, opacity: 1 }}
              viewport={{ once: true }}
            >
              <h2>Ready to Move Forward?</h2>
              <p>
                Partner with Atirath Logistics today and experience seamless
                global shipping.
              </p>
              <div className="cta-buttons">
                <Link to="/contact" className="btn-primary btn-large">
                  Get a Free Quote →
                </Link>
                <Link to="/services" className="btn-outline btn-large">
                  Explore Services
                </Link>
              </div>
              <div className="trust-badges">
                <span>✓ 5,000+ Happy Clients</span>
                <span>✓ 99.7% On-Time Rate</span>
                <span>✓ 24/7 Support</span>
              </div>
            </motion.div>
          </div>
        </section>
      </main>
    </Layout>
  );
}