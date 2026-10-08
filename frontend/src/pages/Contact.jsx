// =========================================
// ATIRATH LOGISTICS - CONTACT PAGE (PREMIUM LIGHT THEME)
// ✅ Complete, Corrected & Fully Responsive
// =========================================

import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import Layout from "../components/Layout";
import "./Contact.css";
import contactHero from "../assets/contact-info.jpg";

export default function Contact() {
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const [formData, setFormData] = useState({
    name: "", email: "", phone: "", subject: "", message: ""
  });
  const [submitted, setSubmitted] = useState(false);
  const [errors, setErrors] = useState({});
  const [heroError, setHeroError] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showFaqModal, setShowFaqModal] = useState(false);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: "" }));
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.name.trim()) newErrors.name = "Name is required";
    if (!formData.email.trim()) newErrors.email = "Email is required";
    else if (!/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = "Please enter a valid email";
    if (!formData.subject) newErrors.subject = "Please select a subject";
    if (!formData.message.trim()) newErrors.message = "Message is required";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      setSubmitted(true);
      setTimeout(() => {
        setSubmitted(false);
        setFormData({ name: "", email: "", phone: "", subject: "", message: "" });
      }, 4000);
    }, 1500);
  };

  const handleModalClose = (e) => {
    if (e.target === e.currentTarget) {
      setShowFaqModal(false);
    }
  };

  const faqData = [
    {
      icon: "📦",
      question: "How do I track my shipment?",
      answer: "Use our tracking portal and enter your Bill of Lading (B/L) or tracking number for live GPS updates."
    },
    {
      icon: "⏱️",
      question: "What are standard transit times?",
      answer: "Domestic: 1-5 days. International Air: 2-5 days. Ocean Freight: 15-45 days based on destination."
    },
    {
      icon: "🛡️",
      question: "Do you provide cargo insurance?",
      answer: "Yes, we offer comprehensive shipping insurance up to ₹10 lakhs at 2% of the declared invoice value."
    },
    {
      icon: "🚛",
      question: "Can I schedule a warehouse pickup?",
      answer: "Absolutely. Book online and choose your preferred pickup date and time slot. Same-day available in metros."
    }
  ];

  return (
    <Layout>
      <div className="contact-page">

        {/* ✅ HERO SECTION - Background image ONLY (no text) */}
        <section className="contact-hero">
          <img src={contactHero} alt="" aria-hidden="true"
            onError={() => setHeroError(true)} style={{ display: "none" }} />
          <div className={`hero-bg-contact ${heroError ? "hero-bg-placeholder" : ""}`}
            style={!heroError ? { backgroundImage: `url(${contactHero})` } : undefined} />
        </section>

        {/* MAIN CONTAINER */}
        <div className="contact-container">
          
          {/* ✅ FORM SECTION - WITH HERO TEXT INSIDE */}
          <div className="contact-form-section">
            
            {/* ✅ HERO CONTENT MOVED INSIDE FORM CARD */}
            <div className="form-hero-content">
              <div className="hero-badge">
                <span className="pulse-dot"></span>
                24/7 Global Logistics Support
              </div>
              <h1>Get In Touch</h1>
              <p>Have questions about freight, customs, or tracking? Reach out to our expert team and we'll respond within 24 hours.</p>
            </div>

            <div className="form-header">
              <h2>Send Us a Message</h2>
              <p>Fill out the form below and we'll respond promptly</p>
            </div>

            {submitted ? (
              <div className="success-message">
                <div className="success-icon">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                </div>
                <h3>Message Sent Successfully!</h3>
                <p>Thank you for contacting Atirath Logistics. Our team will review your request and get back to you shortly.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="contact-form" noValidate>
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="c-name">Full Name <span className="required">*</span></label>
                    <input id="c-name" type="text" name="name" value={formData.name}
                      onChange={handleInputChange} placeholder="John Doe" required
                      className={errors.name ? "error" : ""} autoComplete="name" />
                    {errors.name && <span className="error-text">{errors.name}</span>}
                  </div>
                  <div className="form-group">
                    <label htmlFor="c-email">Email Address <span className="required">*</span></label>
                    <input id="c-email" type="email" name="email" value={formData.email}
                      onChange={handleInputChange} placeholder="john@company.com" required
                      className={errors.email ? "error" : ""} autoComplete="email" />
                    {errors.email && <span className="error-text">{errors.email}</span>}
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="c-phone">Phone Number</label>
                    <input id="c-phone" type="tel" name="phone" value={formData.phone}
                      onChange={handleInputChange} placeholder="+91 98765 43210" autoComplete="tel" />
                  </div>
                  <div className="form-group">
                    <label htmlFor="c-subject">Subject <span className="required">*</span></label>
                    <select id="c-subject" name="subject" value={formData.subject}
                      onChange={handleInputChange} required className={errors.subject ? "error" : ""}>
                      <option value="">Select a subject</option>
                      <option value="booking">Freight & Booking Inquiry</option>
                      <option value="tracking">Shipment Tracking Issue</option>
                      <option value="pricing">Pricing & Custom Quotes</option>
                      <option value="support">Customer Support</option>
                      <option value="partnership">B2B Partnership</option>
                      <option value="other">Other</option>
                    </select>
                    {errors.subject && <span className="error-text">{errors.subject}</span>}
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="c-msg">Message <span className="required">*</span></label>
                  <textarea id="c-msg" name="message" value={formData.message}
                    onChange={handleInputChange} placeholder="Tell us about your cargo, dimensions, or specific requirements..." rows="5" required
                    className={errors.message ? "error" : ""}></textarea>
                  {errors.message && <span className="error-text">{errors.message}</span>}
                </div>

                <button type="submit" className="submit-btn" disabled={isSubmitting || submitted}>
                  {isSubmitting ? (
                    <span className="btn-loader">
                      <svg className="spinner" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" fill="none" strokeDasharray="31.415" strokeDashoffset="31.415"><animate attributeName="stroke-dashoffset" values="31.415;0" dur="1s" repeatCount="indefinite" /></circle></svg>
                      Processing...
                    </span>
                  ) : submitted ? "Sent!" : (
                    <>Send Message <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg></>
                  )}
                </button>
              </form>
            )}

            {/* ✅ WHY CHOOSE US - Fills empty space */}
            <div className="why-choose-us">
              <h3>Why Choose Atirath Logistics?</h3>
              <div className="features-grid">
                <div className="feature-item">
                  <div className="feature-icon">⚡</div>
                  <div className="feature-text">
                    <h4>Fast Response</h4>
                    <p>Reply within 24 hours</p>
                  </div>
                </div>
                <div className="feature-item">
                  <div className="feature-icon">🌍</div>
                  <div className="feature-text">
                    <h4>Global Reach</h4>
                    <p>150+ countries served</p>
                  </div>
                </div>
                <div className="feature-item">
                  <div className="feature-icon">🛡️</div>
                  <div className="feature-text">
                    <h4>Secure Cargo</h4>
                    <p>Full insurance coverage</p>
                  </div>
                </div>
                <div className="feature-item">
                  <div className="feature-icon">🎧</div>
                  <div className="feature-text">
                    <h4>24/7 Support</h4>
                    <p>Always here to help</p>
                  </div>
                </div>
              </div>
            </div>

          </div>

          {/* INFO SECTION */}
          <div className="contact-info-section">
            <div className="info-header">
              <h2>Contact Information</h2>
              <p>Reach out to us through any of these dedicated channels</p>
            </div>

            <div className="info-cards">
              <div className="info-card">
                <div className="info-icon">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
                </div>
                <div className="info-content">
                  <h3>Headquarters</h3>
                  <p>Vamsiram Builders, Madhapur Road,<br />Kavuri Hills, Hyderabad,<br />Telangana, 500081, India</p>
                </div>
              </div>

              <div className="info-card">
                <div className="info-icon">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                </div>
                <div className="info-content">
                  <h3>Operations Desk</h3>
                  <p>Toll-Free: <a href="tel:9553774933" className="contact-link">9553774933</a><br />Support: <a href="tel:+919876543210" className="contact-link">+91 98765 43210</a></p>
                </div>
              </div>

              <div className="info-card">
                <div className="info-icon">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
                </div>
                <div className="info-content">
                  <h3>Email Channels</h3>
                  <p>Support: <a href="mailto:info@atirathlogistics.com" className="contact-link">info@atirathlogistics.com</a><br />Sales: <a href="mailto:sales@atirathlogistics.com" className="contact-link">sales@atirathlogistics.com</a></p>
                </div>
              </div>

              <div className="info-card">
                <div className="info-icon">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                </div>
                <div className="info-content">
                  <h3>Business Hours</h3>
                  <p>Mon – Sat: 9:00 AM – 8:00 PM IST<br />Sun: 10:00 AM – 4:00 PM IST<br /><span className="highlight-text">24/7 Emergency Freight Support</span></p>
                </div>
              </div>
            </div>

            <div className="social-section">
              <h3>Follow Our Journey</h3>
              <div className="social-links">
                <a href="#" className="social-link" aria-label="LinkedIn">
                  <svg viewBox="0 0 24 24" fill="currentColor"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/></svg>
                </a>
                <a href="#" className="social-link" aria-label="Twitter">
                  <svg viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                </a>
                <a href="#" className="social-link" aria-label="Facebook">
                  <svg viewBox="0 0 24 24" fill="currentColor"><path d="M9 8h-3v4h3v12h5v-12h3.642l.358-4h-4v-1.667c0-.955.192-1.333 1.115-1.333h2.885v-5h-3.808c-3.596 0-5.192 1.583-5.192 4.615v3.385z"/></svg>
                </a>
                <a href="#" className="social-link" aria-label="Instagram">
                  <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
                </a>
              </div>
            </div>

            <div className="quick-contact">
              <div className="qc-icon">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
              </div>
              <h3>Need Immediate Assistance?</h3>
              <p>Our 24/7 dispatch team is standing by.</p>
              <a href="tel:9553774933" className="quick-call-btn">
                Call Dispatch: 9553774933
              </a>
            </div>
          </div>
        </div>

        {/* MAP SECTION */}
        <section className="map-section">
          <div className="map-header">
            <h2>Locate Our Hub</h2>
            <p className="map-subtitle">Visit our headquarters for in-person consultations</p>
          </div>
          <div className="map-container">
            <iframe
              title="ATIRATH Logistics Office Location"
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d241317.14571420178!2d72.71637482812498!3d19.08219783873944!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3be7c6306644edc1%3A0x5da4ed8f8d648c69!2sMumbai%2C%20Maharashtra!5e0!3m2!1sen!2sin!4v1234567890123!5m2!1sen!2sin"
              width="100%" 
              height="500" 
              style={{ border: 0 }}
              allowFullScreen 
              loading="lazy" 
              referrerPolicy="no-referrer-when-downgrade" 
            />
          </div>
        </section>

        {/* FAQ PREVIEW */}
        <section className="faq-preview">
          <div className="faq-header">
            <h2>Logistics Knowledge Base</h2>
            <p>Quick answers to common freight and shipping queries</p>
          </div>
          <div className="faq-grid">
            {faqData.map((faq, index) => (
              <div className="faq-item" key={index}>
                <div className="faq-icon">{faq.icon}</div>
                <h3>{faq.question}</h3>
                <p>{faq.answer}</p>
              </div>
            ))}
          </div>
          <button className="view-all-faq" onClick={() => setShowFaqModal(true)}>
            View Full Knowledge Base 
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
          </button>
        </section>

        {/* ✅ FAQ MODAL - IMPROVED SPACING & LAYOUT */}
        {showFaqModal && (
          <div className="faq-modal" onClick={handleModalClose}>
            <div className="faq-modal-content" onClick={(e) => e.stopPropagation()}>
              <button className="faq-modal-close" onClick={() => setShowFaqModal(false)}>
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
              <div className="faq-modal-header">
                <h2>Frequently Asked Questions</h2>
                <p>Find answers to common questions about our logistics services</p>
              </div>
              <div className="faq-modal-body">
                {faqData.map((faq, index) => (
                  <div className="faq-modal-item" key={index}>
                    <div className="faq-modal-icon">{faq.icon}</div>
                    <div className="faq-modal-text">
                      <h3>{faq.question}</h3>
                      <p>{faq.answer}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="faq-modal-footer">
                <p>Still have questions?</p>
                <a href="tel:9553774933" className="faq-modal-contact">
                  Call our support team: 9553774933
                </a>
              </div>
            </div>
          </div>
        )}

      </div>
    </Layout>
  );
}