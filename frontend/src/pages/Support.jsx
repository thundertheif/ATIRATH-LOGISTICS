import { useState, useEffect } from "react";
import { collection, addDoc, query, orderBy, getDocs, Timestamp, serverTimestamp, where } from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";
import "./Support.css";

export default function Support() {
  const { currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState("contact");
  const [faqSearch, setFaqSearch] = useState("");
  const [myTickets, setMyTickets] = useState([]);
  const [loadingTickets, setLoadingTickets] = useState(true);

  const [ticketData, setTicketData] = useState({
    category: "",
    priority: "medium",
    shipmentId: "",
    subject: "",
    message: "",
    acceptLegal: false
  });
  const [ticketErrors, setTicketErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (activeTab === "tickets" && currentUser?.uid) {
      const fetchTickets = async () => {
        try {
          setLoadingTickets(true);
          const q = query(
            collection(db, "support_tickets"), 
            where("userId", "==", currentUser.uid),
            orderBy("createdAt", "desc")
          );
          const querySnapshot = await getDocs(q);
          
          const ticketsList = querySnapshot.docs.map(docSnap => ({
            id: docSnap.id,
            ...docSnap.data(),
            createdAt: docSnap.data().createdAt instanceof Timestamp 
              ? docSnap.data().createdAt.toDate() 
              : new Date()
          }));
          
          setMyTickets(ticketsList);
        } catch (error) {
          console.error("Error fetching tickets:", error);
        } finally {
          setLoadingTickets(false);
        }
      };

      fetchTickets();
    }
  }, [activeTab, currentUser]);

  const handleTicketChange = (e) => {
    const { name, value, type, checked } = e.target;
    setTicketData(prev => ({ ...prev, [name]: type === "checkbox" ? checked : value }));
  };

  const handleTicketSubmit = async (e) => {
    e.preventDefault();
    const errors = {};
    
    if (!ticketData.category) errors.category = "Please select a category";
    if (!ticketData.subject.trim()) errors.subject = "Subject is required";
    if (!ticketData.message.trim()) errors.message = "Message is required";
    if (ticketData.message.trim().length < 20) errors.message = "Please provide at least 20 characters";
    if (!ticketData.acceptLegal) errors.acceptLegal = "You must accept the consent";

    setTicketErrors(errors);

    if (Object.keys(errors).length === 0 && currentUser) {
      setSubmitting(true);
      try {
        const ticketId = "TKT-" + Date.now().toString().slice(-6);

        await addDoc(collection(db, "support_tickets"), {
          ticketId,
          userId: currentUser.uid,
          userEmail: currentUser.email,
          category: ticketData.category,
          priority: ticketData.priority,
          shipmentId: ticketData.shipmentId || "N/A",
          subject: ticketData.subject,
          message: ticketData.message,
          status: "Open",
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });

        alert(`✅ Support Ticket Created!\n\n🎟️ Ticket ID: ${ticketId}\n\nOur team will respond soon.`);
        setTicketData({ category: "", priority: "medium", shipmentId: "", subject: "", message: "", acceptLegal: false });
        setActiveTab("tickets");
      } catch (error) {
        console.error("Error creating ticket:", error);
        alert("Failed to create ticket");
      } finally {
        setSubmitting(false);
      }
    }
  };

  const faqData = [
    { cat: "Shipments", q: "How do I track my international shipment?", a: "Use the Tracking ID in the 'Track Shipment' section." },
    { cat: "Customs", q: "What documents are required for global shipping?", a: "Commercial Invoice, Packing List, and Certificate of Origin." },
    { cat: "Billing", q: "How are volumetric weights calculated?", a: "Volumetric weight (kg) = (L × W × H in cm) / 5000." },
    { cat: "Claims", q: "What is the process for claiming damaged goods?", a: "Raise a 'Critical' priority ticket within 48 hours of delivery." },
  ];

  const filteredFaqs = faqData.filter(faq => 
    faq.q.toLowerCase().includes(faqSearch.toLowerCase()) || 
    faq.a.toLowerCase().includes(faqSearch.toLowerCase())
  );

  // ❌ REMOVED: .top-navbar, .green-sidebar
  return (
    <div className="support-page">
      {/* Page Header */}
      <div className="page-header">
        <div className="header-info">
          <h1>💬 Global Support Center</h1>
          <p>24/7 Enterprise Support for all your logistics and shipment needs</p>
        </div>
      </div>

      {/* Main Content */}
      <div className="support-main">
        {/* Tabs Navigation */}
        <div className="support-tabs">
          <button className={`tab-btn ${activeTab === "contact" ? "active" : ""}`} onClick={() => setActiveTab("contact")}>
            💬 Contact Support
          </button>
          <button className={`tab-btn ${activeTab === "tickets" ? "active" : ""}`} onClick={() => setActiveTab("tickets")}>
            🎟️ My Tickets
          </button>
          <button className={`tab-btn ${activeTab === "faq" ? "active" : ""}`} onClick={() => setActiveTab("faq")}>
            ❓ FAQ & Knowledge Base
          </button>
          <button className={`tab-btn ${activeTab === "settings" ? "active" : ""}`} onClick={() => setActiveTab("settings")}>
            ⚙️ Settings & Legal
          </button>
        </div>

        {/* TAB 1: CONTACT SUPPORT */}
        {activeTab === "contact" && (
          <>
            {/* Quick Contact Options */}
            <div className="quick-contact-grid">
              <div className="quick-contact-card">
                <div className="quick-icon-wrapper green">
                  <span className="quick-icon">📞</span>
                </div>
                <div className="quick-info">
                  <span className="quick-title">Global Toll-Free</span>
                  <span className="quick-value">+1 (800) 123-4567</span>
                  <span className="quick-subtitle">Available 24/7</span>
                </div>
              </div>

              <div className="quick-contact-card">
                <div className="quick-icon-wrapper green">
                  <span className="quick-icon">✉️</span>
                </div>
                <div className="quick-info">
                  <span className="quick-title">Email Support</span>
                  <span className="quick-value">support@atirath.com</span>
                  <span className="quick-subtitle">We reply within 24h</span>
                </div>
              </div>

              <div className="quick-contact-card">
                <div className="quick-icon-wrapper green">
                  <span className="quick-icon">💬</span>
                </div>
                <div className="quick-info">
                  <span className="quick-title">Live Chat</span>
                  <span className="quick-value">Available 24/7</span>
                  <span className="quick-subtitle">Instant Support</span>
                </div>
              </div>

              <div className="quick-contact-card emergency">
                <div className="quick-icon-wrapper red">
                  <span className="quick-icon">🚨</span>
                </div>
                <div className="quick-info">
                  <span className="quick-title">Emergency / Lost</span>
                  <span className="quick-value">Priority Escalation</span>
                  <span className="quick-subtitle">Immediate Assistance</span>
                </div>
              </div>
            </div>

            {/* Create Ticket Form */}
            <div className="content-grid">
              <div className="main-form-section">
                <div className="support-card">
                  <h2>📝 Create a Support Ticket</h2>
                  <p className="section-desc">Provide detailed information to help us resolve your issue faster.</p>
                  
                  <form onSubmit={handleTicketSubmit} className="support-form">
                    <div className="form-row">
                      <div className="form-group">
                        <label>Category *</label>
                        <select 
                          name="category" 
                          value={ticketData.category} 
                          onChange={handleTicketChange}
                          className={ticketErrors.category ? "error" : ""}
                        >
                          <option value="">-- Select Category --</option>
                          <option value="Tracking">Tracking & Status</option>
                          <option value="Delivery">Delivery Issues</option>
                          <option value="Billing">Billing & Invoices</option>
                          <option value="Damaged">Damaged / Lost Shipment</option>
                          <option value="Customs">Customs & International</option>
                          <option value="Account">Account & Profile</option>
                          <option value="Technical">Technical / Website Issue</option>
                        </select>
                        {ticketErrors.category && <span className="error-text">{ticketErrors.category}</span>}
                      </div>

                      <div className="form-group">
                        <label>Priority Level *</label>
                        <select name="priority" value={ticketData.priority} onChange={handleTicketChange}>
                          <option value="low">🟢 Low (General Inquiry)</option>
                          <option value="medium">🟡 Medium (Needs Attention)</option>
                          <option value="high">🟠 High (Urgent Issue)</option>
                          <option value="critical">🔴 Critical (Lost/Damaged/Legal)</option>
                        </select>
                      </div>
                    </div>

                    <div className="form-group">
                      <label>Related Shipment ID (Optional)</label>
                      <input 
                        type="text" 
                        name="shipmentId" 
                        value={ticketData.shipmentId} 
                        onChange={handleTicketChange}
                        placeholder="e.g., ATL-1234567890 (Leave blank if not applicable)" 
                      />
                    </div>

                    <div className="form-group">
                      <label>Subject *</label>
                      <input 
                        type="text" 
                        name="subject" 
                        value={ticketData.subject} 
                        onChange={handleTicketChange}
                        className={ticketErrors.subject ? "error" : ""}
                        placeholder="Brief description of your issue" 
                        maxLength="100"
                      />
                      {ticketErrors.subject && <span className="error-text">{ticketErrors.subject}</span>}
                    </div>

                    <div className="form-group">
                      <label>Detailed Message *</label>
                      <textarea 
                        name="message" 
                        value={ticketData.message} 
                        onChange={handleTicketChange}
                        className={ticketErrors.message ? "error" : ""}
                        rows="6" 
                        placeholder="Please explain your issue in detail. Include tracking IDs, dates, and any error messages..." 
                        maxLength="2000"
                      />
                      <div className="field-footer">
                        <span className="field-hint">Min 20 characters. Do not share passwords or sensitive payment info.</span>
                        <span className="char-count">{ticketData.message.length}/2000</span>
                      </div>
                      {ticketErrors.message && <span className="error-text">{ticketErrors.message}</span>}
                    </div>

                    <div className={`legal-consent ${ticketData.acceptLegal ? "accepted" : ""}`}>
                      <label>
                        <input 
                          type="checkbox" 
                          name="acceptLegal" 
                          checked={ticketData.acceptLegal} 
                          onChange={handleTicketChange} 
                        />
                        <span>
                          I consent to Atirath Logistics processing my personal data and shipment details to resolve this query, 
                          in accordance with the <strong>Global Privacy Policy (GDPR/DPDP)</strong>. I declare the information provided is accurate. *
                        </span>
                      </label>
                      {ticketErrors.acceptLegal && <span className="error-text">{ticketErrors.acceptLegal}</span>}
                    </div>

                    <button type="submit" className="submit-btn" disabled={submitting}>
                      {submitting ? "⏳ Submitting..." : "📤 Submit Support Ticket"}
                    </button>
                  </form>
                </div>
              </div>

              {/* Right Sidebar */}
              <div className="right-sidebar">
                <div className="sidebar-card">
                  <h3>🎧 Why Contact Us?</h3>
                  <div className="feature-list">
                    <div className="feature-item">
                      <div className="feature-icon green">👥</div>
                      <div className="feature-content">
                        <h4>Expert Support Team</h4>
                        <p>Trained logistics experts available 24/7</p>
                      </div>
                    </div>
                    <div className="feature-item">
                      <div className="feature-icon green">⚡</div>
                      <div className="feature-content">
                        <h4>Fast Response</h4>
                        <p>Get responses as per our SLA policy</p>
                      </div>
                    </div>
                    <div className="feature-item">
                      <div className="feature-icon green">🛡️</div>
                      <div className="feature-content">
                        <h4>Secure & Confidential</h4>
                        <p>Your data is encrypted and protected</p>
                      </div>
                    </div>
                    <div className="feature-item">
                      <div className="feature-icon green">💬</div>
                      <div className="feature-content">
                        <h4>Multi-Channel Support</h4>
                        <p>Phone, Email, Chat & Ticketing</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="sidebar-card">
                  <h3>🕐 Support Hours</h3>
                  <div className="support-hours">
                    <div className="hours-badge">24/7 • 365 Days a Year</div>
                    <p>We're always here when you need us</p>
                  </div>
                </div>
              </div>
            </div>

            {/* SLA Section */}
            <div className="support-card full-width">
              <h2>📊 Our Service Level Agreement (SLA)</h2>
              <p className="section-desc">We are committed to providing fast and reliable support.</p>
              
              <div className="table-wrapper">
                <table className="sla-table">
                  <thead>
                    <tr>
                      <th>Priority</th>
                      <th>Description</th>
                      <th>First Response</th>
                      <th>Resolution Target</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td><span className="priority-badge critical">🔴 Critical</span></td>
                      <td>Lost/Damaged/Legal Issues</td>
                      <td className="response-time critical">1 Hour</td>
                      <td className="response-time critical">24 Hours</td>
                    </tr>
                    <tr>
                      <td><span className="priority-badge high">🟠 High</span></td>
                      <td>Urgent Delivery/Customs</td>
                      <td className="response-time high">4 Hours</td>
                      <td className="response-time high">48 Hours</td>
                    </tr>
                    <tr>
                      <td><span className="priority-badge medium">🟡 Medium</span></td>
                      <td>Billing/Account Issues</td>
                      <td className="response-time medium">12 Hours</td>
                      <td className="response-time medium">3-5 Days</td>
                    </tr>
                    <tr>
                      <td><span className="priority-badge low">🟢 Low</span></td>
                      <td>General Inquiries</td>
                      <td className="response-time low">24 Hours</td>
                      <td className="response-time low">7 Days</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Data Privacy Card */}
            <div className="support-card full-width privacy-card">
              <h3>🛡️ Data Privacy & Compliance</h3>
              <p>Atirath Logistics is fully compliant with <strong>GDPR (Europe)</strong>, <strong>DPDP Act (India)</strong> and <strong>CCPA (California)</strong>. Your support ticket data is encrypted and retained for 24 months for quality and legal audits, after which it is permanently anonymized.</p>
              <p className="privacy-note">We never sell your personal data.</p>
            </div>
          </>
        )}

        {/* TAB 2: MY TICKETS */}
        {activeTab === "tickets" && (
          <div className="support-card">
            <h2>🎟️ My Support Tickets</h2>
            <p className="section-desc">Track the status of your previous and ongoing support requests.</p>
            
            {loadingTickets ? (
              <div className="loading">
                <div className="spinner"></div>
                <p>Loading tickets...</p>
              </div>
            ) : myTickets.length > 0 ? (
              <div className="ticket-list">
                {myTickets.map(ticket => (
                  <div key={ticket.id} className="ticket-card">
                    <div className="ticket-header">
                      <span className="ticket-id">{ticket.ticketId || ticket.id}</span>
                      <span className={`ticket-status status-${(ticket.status || 'open').toLowerCase()}`}>
                        {ticket.status || 'Open'}
                      </span>
                    </div>
                    <h3 className="ticket-subject">{ticket.subject}</h3>
                    <div className="ticket-meta">
                      <span>📂 {ticket.category}</span>
                      <span>⚡ {ticket.priority}</span>
                      <span>📅 {ticket.createdAt?.toLocaleDateString('en-IN')}</span>
                    </div>
                    <button className="view-ticket-btn">View Details & Reply →</button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <div className="empty-icon">🎫</div>
                <h3>No Support Tickets</h3>
                <p>Create your first ticket to get started!</p>
                <button className="create-ticket-btn" onClick={() => setActiveTab("contact")}>
                  Create New Ticket
                </button>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: FAQ */}
        {activeTab === "faq" && (
          <div className="support-card">
            <h2>❓ Frequently Asked Questions</h2>
            <p className="section-desc">Find instant answers to common logistics and shipping queries.</p>
            
            <div className="faq-search-box">
              <input 
                type="text" 
                placeholder="🔍 Search FAQs (e.g., customs, tracking, billing)..." 
                value={faqSearch} 
                onChange={(e) => setFaqSearch(e.target.value)} 
              />
            </div>

            <div className="faq-list">
              {filteredFaqs.length > 0 ? (
                filteredFaqs.map((faq, idx) => (
                  <div key={idx} className="faq-item">
                    <div className="faq-category-tag">{faq.cat}</div>
                    <h3>{faq.q}</h3>
                    <p>{faq.a}</p>
                  </div>
                ))
              ) : (
                <p className="no-results">No FAQs found matching your search.</p>
              )}
            </div>
          </div>
        )}

        {/* TAB 4: SETTINGS */}
        {activeTab === "settings" && (
          <div className="support-card">
            <h2>⚙️ Support Preferences & Privacy</h2>
            <p className="section-desc">Control how we communicate with you and what data support agents can access.</p>
            
            <div className="settings-list">
              <div className="setting-item">
                <div className="setting-info">
                  <h4>📧 Email Notifications</h4>
                  <p>Receive ticket updates and resolutions via email.</p>
                </div>
                <label className="toggle-switch">
                  <input type="checkbox" defaultChecked />
                  <span className="slider"></span>
                </label>
              </div>

              <div className="setting-item">
                <div className="setting-info">
                  <h4>📱 SMS Alerts</h4>
                  <p>Get critical updates via SMS.</p>
                </div>
                <label className="toggle-switch">
                  <input type="checkbox" />
                  <span className="slider"></span>
                </label>
              </div>

              <div className="setting-item">
                <div className="setting-info">
                  <h4>🌐 Preferred Support Language</h4>
                  <p>Get support in your preferred language.</p>
                </div>
                <select className="language-select">
                  <option>English (Global)</option>
                  <option>Hindi</option>
                  <option>Telugu</option>
                </select>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}