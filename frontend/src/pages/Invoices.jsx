import { useState, useEffect } from "react";
import { collection, query, where, getDocs, Timestamp, doc, updateDoc } from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";
import "./Invoices.css";

export default function Invoices() {
  const { currentUser, loading: authLoading } = useAuth();
  
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [processingPayment, setProcessingPayment] = useState(null);

  useEffect(() => {
    const fetchInvoices = async () => {
      if (authLoading || !currentUser?.uid) return;
      
      try {
        setLoading(true);
        const q = query(
          collection(db, "invoices"), 
          where("userId", "==", currentUser.uid)
        );
        const querySnapshot = await getDocs(q);
        
        const allInvoices = querySnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: data.id || doc.id,
            docId: doc.id,
            ...data,
            createdAt: data.createdAt instanceof Timestamp 
              ? data.createdAt.toDate() 
              : (data.createdAt?.toDate ? data.createdAt.toDate() : new Date())
          };
        });

        const sortedInvoices = allInvoices.sort((a, b) => {
          const dateA = a.createdAt || new Date(0);
          const dateB = b.createdAt || new Date(0);
          return dateB - dateA;
        });

        setInvoices(sortedInvoices);
      } catch (error) {
        console.error("Error fetching invoices:", error);
        setInvoices([]);
      } finally {
        setLoading(false);
      }
    };

    fetchInvoices();
  }, [currentUser, authLoading]);

  const parseAmount = (amount) => {
    if (typeof amount === 'number') return amount;
    if (typeof amount === 'string') {
      const cleaned = amount.replace(/[₹,\s]/g, '');
      const parsed = parseFloat(cleaned);
      return isNaN(parsed) ? 0 : parsed;
    }
    return 0;
  };

  const handlePayment = async (invoice) => {
    if (!currentUser) {
      showToast("❌ Please login to make payment", 'error');
      return;
    }

    const amount = parseAmount(invoice.amount);
    const invoiceId = invoice.docId || invoice.id;
    const userId = currentUser.uid;

    if (!amount || amount <= 0) {
      showToast(`❌ Invalid amount: ${invoice.amount}`, 'error');
      return;
    }

    setProcessingPayment(invoice.id);
    showToast("🔄 Processing payment...", 'info');

    try {
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      document.body.appendChild(script);

      script.onload = async () => {
        try {
          const orderResponse = await fetch('http://localhost:5000/payment/create-order', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ amount, invoiceId, userId }),
          });

          const orderData = await orderResponse.json();

          if (!orderData.success) {
            throw new Error(orderData.error || 'Failed to create order');
          }

          const options = {
            key: orderData.keyId,
            amount: orderData.amount,
            currency: orderData.currency,
            name: 'ATIRATH Logistics',
            description: `Payment for Invoice ${invoiceId}`,
            order_id: orderData.orderId,
            handler: async function (response) {
              try {
                const verifyResponse = await fetch('http://localhost:5000/payment/verify-payment', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    razorpay_order_id: response.razorpay_order_id,
                    razorpay_payment_id: response.razorpay_payment_id,
                    razorpay_signature: response.razorpay_signature,
                    invoiceId,
                    userId,
                    amount,
                  }),
                });

                const verifyData = await verifyResponse.json();

                if (verifyData.success) {
                  await updateDoc(doc(db, "invoices", invoiceId), {
                    status: "Paid",
                    paymentId: response.razorpay_payment_id,
                    paidAt: new Date()
                  });

                  setInvoices(prev => 
                    prev.map(inv => 
                      inv.id === invoice.id 
                        ? { ...inv, status: 'Paid', paymentId: response.razorpay_payment_id }
                        : inv
                    )
                  );

                  showToast(`✅ Payment Successful!\nPayment ID: ${response.razorpay_payment_id}`, 'success');
                } else {
                  throw new Error(verifyData.error || 'Verification failed');
                }
              } catch (error) {
                console.error('Verification error:', error);
                showToast('❌ Payment verification failed', 'error');
              } finally {
                setProcessingPayment(null);
              }
            },
            prefill: {
              name: currentUser.displayName || currentUser.email?.split('@')[0] || 'Customer',
              email: currentUser.email || '',
            },
            theme: { color: '#059669' },
            modal: {
              ondismiss: () => {
                showToast('⚠️ Payment cancelled', 'info');
                setProcessingPayment(null);
              },
            },
          };

          const rzp = new window.Razorpay(options);
          rzp.open();
        } catch (error) {
          console.error('Payment error:', error);
          showToast(`❌ ${error.message}`, 'error');
          setProcessingPayment(null);
        }
      };
    } catch (error) {
      console.error('Error:', error);
      showToast('❌ Failed to load payment system', 'error');
      setProcessingPayment(null);
    }
  };

  const showToast = (message, type = 'success') => {
    const toast = document.createElement("div");
    let bgColor = type === 'success' ? 'linear-gradient(135deg, #10b981, #059669)' :
                  type === 'error' ? 'linear-gradient(135deg, #ef4444, #dc2626)' :
                  'linear-gradient(135deg, #3b82f6, #2563eb)';
    
    toast.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: ${bgColor};
      color: white;
      padding: 16px 24px;
      border-radius: 12px;
      box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
      z-index: 10000;
      font-weight: 600;
      animation: slideIn 0.3s ease;
      white-space: pre-line;
      max-width: 400px;
    `;
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 5000);
  };

  const filteredInvoices = invoices.filter(inv => {
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = 
      (inv.id || '').toLowerCase().includes(searchLower) || 
      (inv.trackingId || '').toLowerCase().includes(searchLower) ||
      (inv.customer || '').toLowerCase().includes(searchLower);
      
    const matchesFilter = filterStatus === "all" || 
      inv.status?.toLowerCase() === filterStatus;
    
    return matchesSearch && matchesFilter;
  });

  const totalInvoices = invoices.length;
  const totalAmount = invoices.reduce((sum, inv) => sum + (parseAmount(inv.amount) || 0), 0);
  const paidAmount = invoices
    .filter(inv => inv.status === "Paid")
    .reduce((sum, inv) => sum + (parseAmount(inv.amount) || 0), 0);
  const pendingAmount = totalAmount - paidAmount;

  if (authLoading || loading) {
    return (
      <div className="invoices-page">
        <div className="loading-screen">
          <div className="spinner"></div>
          <p>Loading invoices...</p>
        </div>
      </div>
    );
  }

  // ❌ REMOVED: .top-navbar, .green-sidebar
  return (
    <div className="invoices-page">
      {/* Page Header */}
      <div className="page-header">
        <div className="header-info">
          <h1>📄 Invoices</h1>
          <p>Manage and track all your invoices and payments</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="summary-cards">
        <div className="summary-card">
          <div className="summary-icon-wrapper">
            <div className="summary-icon">📄</div>
          </div>
          <div className="summary-details">
            <div className="summary-label">Total Invoices</div>
            <div className="summary-value">{totalInvoices}</div>
            <div className="summary-subtitle">This Month</div>
          </div>
        </div>

        <div className="summary-card">
          <div className="summary-icon-wrapper green">
            <div className="summary-icon">₹</div>
          </div>
          <div className="summary-details">
            <div className="summary-label">Total Amount</div>
            <div className="summary-value">₹{totalAmount.toLocaleString()}</div>
            <div className="summary-subtitle">This Month</div>
          </div>
        </div>

        <div className="summary-card">
          <div className="summary-icon-wrapper orange">
            <div className="summary-icon">🕐</div>
          </div>
          <div className="summary-details">
            <div className="summary-label">Pending Amount</div>
            <div className="summary-value pending">₹{pendingAmount.toLocaleString()}</div>
            <div className="summary-subtitle">{invoices.filter(inv => inv.status !== "Paid").length} Invoices</div>
          </div>
        </div>

        <div className="summary-card">
          <div className="summary-icon-wrapper success">
            <div className="summary-icon">✓</div>
          </div>
          <div className="summary-details">
            <div className="summary-label">Paid Amount</div>
            <div className="summary-value paid">₹{paidAmount.toLocaleString()}</div>
            <div className="summary-subtitle">{invoices.filter(inv => inv.status === "Paid").length} Invoices</div>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="invoices-toolbar">
        <div className="search-box">
          <span className="search-icon">🔍</span>
          <input 
            type="text" 
            placeholder="Search invoices by ID, tracking ID..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="toolbar-actions">
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
            <option value="all">All Status</option>
            <option value="paid">Paid</option>
            <option value="pending">Pending</option>
            <option value="overdue">Overdue</option>
          </select>
          <button className="export-btn">
            <span>⬇</span> Export
          </button>
        </div>
      </div>

      {/* Invoices Table */}
      <div className="invoices-table-wrapper">
        <table className="invoices-table">
          <thead>
            <tr>
              <th>INVOICE ID</th>
              <th>TRACKING ID</th>
              <th>SERVICE TYPE</th>
              <th>AMOUNT</th>
              <th>STATUS</th>
              <th>DATE</th>
              <th>ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {filteredInvoices.length > 0 ? (
              filteredInvoices.map((invoice) => (
                <tr key={invoice.id}>
                  <td className="invoice-id">{invoice.id}</td>
                  <td><span className="tracking-badge">{invoice.trackingId || 'N/A'}</span></td>
                  <td>{invoice.serviceType || invoice.category || 'Document Delivery'}</td>
                  <td className="amount">₹{(parseAmount(invoice.amount) || 0).toLocaleString()}</td>
                  <td>
                    <span className={`status-badge ${invoice.status?.toLowerCase()}`}>
                      {invoice.status || 'Pending'}
                    </span>
                  </td>
                  <td>
                    {invoice.createdAt?.toLocaleDateString("en-IN", { 
                      day: 'numeric', month: 'short', year: 'numeric' 
                    }) || 'N/A'}
                  </td>
                  <td className="actions">
                    <button className="download-btn">
                      <span>⬇</span> Download
                    </button>
                    {(invoice.status === "Unpaid" || invoice.status === "Pending" || invoice.status === "Overdue") && (
                      <button 
                        className="pay-now-btn" 
                        disabled={processingPayment === invoice.id}
                        onClick={() => handlePayment(invoice)}
                      >
                        {processingPayment === invoice.id ? '⏳ Processing...' : 'Pay Now'}
                      </button>
                    )}
                    {invoice.status === "Paid" && (
                      <button className="paid-btn" disabled>Paid</button>
                    )}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="7" className="no-invoices">
                  <div className="empty-state">
                    <div className="empty-icon">📭</div>
                    <h3>No Invoices Found</h3>
                    <p>Book a shipment to see invoices here</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Support Banner */}
      <div className="support-banner">
        <div className="support-banner-content">
          <div className="support-icon">💼</div>
          <div>
            <h3>Have questions about your invoices?</h3>
            <p>Contact our billing support team for any queries related to payments and invoices.</p>
          </div>
        </div>
        <button className="contact-support-banner-btn">Contact Support →</button>
      </div>
    </div>
  );
}