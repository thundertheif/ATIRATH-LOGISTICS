// =========================================
// ATIRATH LOGISTICS - CONTACT PAGE
// File: src/pages/Contact.jsx
// ✅ CORRECTED: Fixed import statement
// =========================================

import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import Layout from "../components/Layout";
import "./Contact.css";

// ✅ FIXED: Correct import statement
import contactHero from "../assets/contact-info.jpg";

export default function Contact() {
  useEffect(() => {
    console.log("✅ Contact page MOUNTED successfully!");
    return () => console.log("🔻 Contact page UNMOUNTED");
  }, []);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    subject: "",
    message: ""
  });

  const [submitted, setSubmitted] = useState(false);
  const [errors, setErrors] = useState({});
  const [heroImageLoaded, setHeroImageLoaded] = useState(false);
  const [heroImageError, setHeroImageError] = useState(false);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: "" }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.name.trim()) newErrors.name = "Name is required";
    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = "Please enter a valid email";
    }
    if (!formData.subject) newErrors.subject = "Please select a subject";
    if (!formData.message.trim()) newErrors.message = "Message is required";
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    
    console.log("Contact Form Submitted:", formData);
    setSubmitted(true);
    
    setTimeout(() => {
      setSubmitted(false);
      setFormData({ name: "", email: "", phone: "", subject: "", message: "" });
    }, 3000);
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // ✅ Handle hero image load/error
  const handleHeroImageLoad = () => {
    setHeroImageLoaded(true);
    setHeroImageError(false);
  };

  const handleHeroImageError = () => {
    setHeroImageError(true);
    setHeroImageLoaded(false);
    console.warn("Hero image failed to load, using placeholder background");
  };

  return (
    <Layout>
      
      {/* 🔍 HERO SECTION WITH BACKGROUND IMAGE + PLACEHOLDER FALLBACK */}
      <section className="contact-hero">
        <div 
          className={`hero-bg-contact ${heroImageError ? 'hero-bg-placeholder' : ''}`} 
          style={{ 
            backgroundImage: heroImageError 
              ? 'none' 
              : `url(${contactHero})` 
          }}
          role="img"
          aria-label="Contact background"
          onLoad={handleHeroImageLoad}
          onError={handleHeroImageError}
        />
        <div className="hero-gradient-overlay-contact" aria-hidden="true" />
        
        <div className="hero-content">
          <h1>Get In Touch</h1>
          <p>Have questions? We're here to help! Reach out to us and our team will get back to you as soon as possible.</p>
        </div>
      </section>

      {/* 📦 MAIN CONTENT */}
      <div className="contact-container">
        
        {/* ✉️ CONTACT FORM */}
        <div className="contact-form-section">
          <div className="form-header">
            <h2>Send Us a Message</h2>
            <p>Fill out the form below and we'll respond within 24 hours</p>
          </div>

          {submitted ? (
            <div className="success-message">
              <div className="success-icon">✓</div>
              <h3>Message Sent Successfully!</h3>
              <p>Thank you for contacting us. We'll get back to you soon.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="contact-form" noValidate>
              <div className="form-row">
                <div className="form-group">
                  <label>Full Name <span className="required">*</span></label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="John Doe"
                    required
                    className={errors.name ? "error" : ""}
                  />
                  {errors.name && <span className="error-text">{errors.name}</span>}
                </div>

                <div className="form-group">
                  <label>Email Address <span className="required">*</span></label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    placeholder="john@example.com"
                    required
                    className={errors.email ? "error" : ""}
                  />
                  {errors.email && <span className="error-text">{errors.email}</span>}
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Phone Number</label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    placeholder="+91 98765 43210"
                  />
                </div>

                <div className="form-group">
                  <label>Subject <span className="required">*</span></label>
                  <select 
                    name="subject" 
                    value={formData.subject} 
                    onChange={handleInputChange} 
                    required
                    className={errors.subject ? "error" : ""}
                  >
                    <option value="">Select a subject</option>
                    <option value="booking">Booking Inquiry</option>
                    <option value="tracking">Tracking Issue</option>
                    <option value="pricing">Pricing & Quotes</option>
                    <option value="support">Customer Support</option>
                    <option value="partnership">Business Partnership</option>
                    <option value="other">Other</option>
                  </select>
                  {errors.subject && <span className="error-text">{errors.subject}</span>}
                </div>
              </div>

              <div className="form-group">
                <label>Message <span className="required">*</span></label>
                <textarea
                  name="message"
                  value={formData.message}
                  onChange={handleInputChange}
                  placeholder="How can we help you?"
                  rows="6"
                  required
                  className={errors.message ? "error" : ""}
                ></textarea>
                {errors.message && <span className="error-text">{errors.message}</span>}
              </div>

              <button type="submit" className="submit-btn" disabled={submitted}>
                {submitted ? "Sending..." : "Send Message ✉️"}
              </button>
            </form>
          )}
        </div>

        {/* 📇 CONTACT INFO */}
        <div className="contact-info-section">
          <div className="info-header">
            <h2>Contact Information</h2>
            <p>Reach out to us through any of these channels</p>
          </div>

          <div className="info-cards">
            <div className="info-card">
              <div className="info-icon">📍</div>
              <div className="info-content">
                <h3>Our Office</h3>
                <p>Vamsiram Builders, Madhapur Road, Andra Basti, Guttala_Begumpet, Kavuri Hills, Madhapur<br />Hyderabad, Telangana, 500081<br />India</p>
              </div>
            </div>

            <div className="info-card">
              <div className="info-icon">📞</div>
              <div className="info-content">
                <h3>Phone Numbers</h3>
                <p>Toll-Free: <a href="tel:9553774933">9676464756</a><br />International: <a href="tel:+91XXXXXXXXXX">+91 XX XXX XX XXX</a></p>
              </div>
            </div>

            <div className="info-card">
              <div className="info-icon">✉️</div>
              <div className="info-content">
                <h3>Email Addresses</h3>
                <p>Support: <a href="mailto:info@atirathlogistics.com">info@atirathlogistics.com</a><br />Sales: <a href="mailto:sales@atirathlogistics.com">sales@atirathlogistics.com</a></p>
              </div>
            </div>

            <div className="info-card">
              <div className="info-icon">🕐</div>
              <div className="info-content">
                <h3>Business Hours</h3>
                <p>Monday - Saturday: 9:00 AM - 8:00 PM IST<br />Sunday: 10:00 AM - 4:00 PM IST<br />24/7 Support Available</p>
              </div>
            </div>
          </div>

          {/* 🔗 SOCIAL MEDIA */}
          <div className="social-section">
            <h3>Follow Us</h3>
            <div className="social-links">
              <a href="#" className="social-link" aria-label="LinkedIn"><span>in</span></a>
              <a href="#" className="social-link" aria-label="Twitter"><span>𝕏</span></a>
              <a href="#" className="social-link" aria-label="Facebook"><span>f</span></a>
              <a href="#" className="social-link" aria-label="Instagram"><span>📷</span></a>
              <a href="#" className="social-link" aria-label="YouTube"><span>▶</span></a>
            </div>
          </div>

          {/* 📞 QUICK CONTACT */}
          <div className="quick-contact">
            <h3>Need Immediate Assistance?</h3>
            <p>Our 24/7 support team is ready to help you</p>
            <a href="tel:9553774933" className="quick-call-btn">
              📞 Call Now: 9553774933
            </a>
          </div>
        </div>
      </div>

      {/* 🗺️ MAP SECTION - DARK */}
      <section className="map-section">
        <h2>Find Us Here</h2>
        <div className="map-container">
          <iframe
            src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d241317.14571420178!2d72.71637482812498!3d19.08219783873944!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3be7c6306644edc1%3A0x5da4ed8f8d648c69!2sMumbai%2C%20Maharashtra!5e0!3m2!1sen!2sin!4v1234567890123!5m2!1sen!2sin"
            width="100%"
            height="450"
            style={{ border: 0, filter: "invert(90%) hue-rotate(180deg)" }}
            allowFullScreen=""
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            title="ATIRATH Logistics Office Location"
          ></iframe>
        </div>
      </section>

      {/* ❓ FAQ PREVIEW - DARK */}
      <section className="faq-preview">
        <h2>Frequently Asked Questions</h2>
        <p>Quick answers to common questions</p>
        <div className="faq-grid">
          <div className="faq-item">
            <h3>How do I track my shipment?</h3>
            <p>Use our tracking page and enter your tracking number to get real-time updates on your delivery.</p>
          </div>
          <div className="faq-item">
            <h3>What are your delivery times?</h3>
            <p>Domestic: 1-5 days depending on service. International: 2-10 days based on destination.</p>
          </div>
          <div className="faq-item">
            <h3>Do you provide insurance?</h3>
            <p>Yes, we offer shipping insurance up to ₹10 lakhs at 2% of the declared value.</p>
          </div>
          <div className="faq-item">
            <h3>Can I schedule a pickup?</h3>
            <p>Yes! Book a shipment online and choose your preferred pickup date and time slot.</p>
          </div>
        </div>
        <Link to="/faq" className="view-all-faq" onClick={scrollToTop}>
          View All FAQs →
        </Link>
      </section>
      
    </Layout>
  );
}