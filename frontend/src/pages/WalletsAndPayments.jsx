import { useState, useEffect } from "react";
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  doc, 
  serverTimestamp,
  getDocs,
  limit
} from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";
import "../styles/WalletsAndPayments.css";

export default function WalletsAndPayments() {
  const { currentUser } = useAuth();
  
  // ========== TABS STATE ==========
  const [mainTab, setMainTab] = useState("wallets");
  const [walletSubTab, setWalletSubTab] = useState("overview");
  const [paymentSubTab, setPaymentSubTab] = useState("pay-shipment");
  
  // ========== MODAL STATE ==========
  const [showAddMoney, setShowAddMoney] = useState(false);
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [showPayModal, setShowPayModal] = useState(false);
  const [selectedShipment, setSelectedShipment] = useState(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState("wallet");
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  
  // ========== FORM STATE ==========
  const [amount, setAmount] = useState("");
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [addMoneyMethod, setAddMoneyMethod] = useState("UPI");
  
  // ========== DATA STATE (Real from Firebase) ==========
  const [walletData, setWalletData] = useState(null);
  const [walletTransactions, setWalletTransactions] = useState([]);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [pendingShipments, setPendingShipments] = useState([]);
  const [paymentHistory, setPaymentHistory] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [codCollections, setCodCollections] = useState([]);
  const [driverPayouts, setDriverPayouts] = useState([]);
  
  // ========== UI STATE ==========
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState(null);

  // ========== TOAST HELPER ==========
  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // ========== REAL-TIME DATA FETCHING ==========
  useEffect(() => {
    if (!currentUser?.uid) {
      setLoading(false);
      return;
    }

    setLoading(true);

    // 1. Wallet Data (Real-time)
    const walletQuery = query(
      collection(db, "wallets"),
      where("userId", "==", currentUser.uid),
      limit(1)
    );
    
    const unsubWallet = onSnapshot(walletQuery, (snapshot) => {
      if (!snapshot.empty) {
        const walletDoc = snapshot.docs[0];
        setWalletData({ id: walletDoc.id, ...walletDoc.data() });
      } else {
        // Create wallet if not exists
        createDefaultWallet();
      }
      setLoading(false);
    }, (error) => {
      console.error("Wallet fetch error:", error);
      showToast("❌ Failed to load wallet data", "error");
      setLoading(false);
    });

    // 2. Wallet Transactions (Real-time, latest 20)
    const txnQuery = query(
      collection(db, "walletTransactions"),
      where("userId", "==", currentUser.uid),
      orderBy("createdAt", "desc"),
      limit(20)
    );
    
    const unsubTxn = onSnapshot(txnQuery, (snapshot) => {
      const txns = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate?.() || new Date()
      }));
      setWalletTransactions(txns);
    }, (error) => {
      console.error("Transactions fetch error:", error);
    });

    // 3. Payment Methods (Real-time)
    const methodsQuery = query(
      collection(db, "paymentMethods"),
      where("userId", "==", currentUser.uid)
    );
    
    const unsubMethods = onSnapshot(methodsQuery, (snapshot) => {
      const methods = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setPaymentMethods(methods);
    }, (error) => {
      console.error("Payment methods fetch error:", error);
    });

    // 4. Pending Shipments (Real-time)
    const pendingQuery = query(
      collection(db, "shipments"),
      where("userId", "==", currentUser.uid),
      where("paymentStatus", "==", "pending"),
      orderBy("createdAt", "desc"),
      limit(10)
    );
    
    const unsubPending = onSnapshot(pendingQuery, (snapshot) => {
      const shipments = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setPendingShipments(shipments);
    }, (error) => {
      console.error("Pending shipments fetch error:", error);
    });

    // 5. Payment History (Real-time)
    const historyQuery = query(
      collection(db, "payments"),
      where("userId", "==", currentUser.uid),
      orderBy("createdAt", "desc"),
      limit(20)
    );
    
    const unsubHistory = onSnapshot(historyQuery, (snapshot) => {
      const payments = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate?.() || new Date()
      }));
      setPaymentHistory(payments);
    }, (error) => {
      console.error("Payment history fetch error:", error);
    });

    // 6. Invoices (Real-time)
    const invoicesQuery = query(
      collection(db, "invoices"),
      where("userId", "==", currentUser.uid),
      orderBy("createdAt", "desc"),
      limit(20)
    );
    
    const unsubInvoices = onSnapshot(invoicesQuery, (snapshot) => {
      const invoiceList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate?.() || new Date()
      }));
      setInvoices(invoiceList);
    }, (error) => {
      console.error("Invoices fetch error:", error);
    });

    // 7. COD Collections (Real-time)
    const codQuery = query(
      collection(db, "codCollections"),
      where("userId", "==", currentUser.uid),
      orderBy("createdAt", "desc"),
      limit(15)
    );
    
    const unsubCod = onSnapshot(codQuery, (snapshot) => {
      const cods = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate?.() || new Date()
      }));
      setCodCollections(cods);
    }, (error) => {
      console.error("COD collections fetch error:", error);
    });

    // 8. Driver Payouts (Real-time)
    const payoutsQuery = query(
      collection(db, "driverPayouts"),
      where("userId", "==", currentUser.uid),
      orderBy("createdAt", "desc"),
      limit(15)
    );
    
    const unsubPayouts = onSnapshot(payoutsQuery, (snapshot) => {
      const payouts = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate?.() || new Date()
      }));
      setDriverPayouts(payouts);
    }, (error) => {
      console.error("Driver payouts fetch error:", error);
    });

    // Cleanup listeners
    return () => {
      unsubWallet();
      unsubTxn();
      unsubMethods();
      unsubPending();
      unsubHistory();
      unsubInvoices();
      unsubCod();
      unsubPayouts();
    };
  }, [currentUser]);

  // ========== CREATE DEFAULT WALLET ==========
  const createDefaultWallet = async () => {
    try {
      const newWallet = {
        userId: currentUser.uid,
        userEmail: currentUser.email,
        balance: 0,
        totalRecharged: 0,
        totalWithdrawn: 0,
        cashbackEarned: 0,
        kycVerified: false,
        walletId: "WLT-" + Date.now().toString().slice(-8),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };
      
      await addDoc(collection(db, "wallets"), newWallet);
      showToast("✅ Wallet created successfully!");
    } catch (error) {
      console.error("Error creating wallet:", error);
    }
  };

  // ========== HANDLERS ==========
  
  // Add Money to Wallet
  const handleAddMoney = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      showToast("⚠️ Please enter valid amount", "error");
      return;
    }

    if (!walletData) {
      showToast("⚠️ Wallet not found", "error");
      return;
    }

    setIsSubmitting(true);
    
    try {
      const amountNum = parseFloat(amount);
      
      // 1. Update wallet balance
      await updateDoc(doc(db, "wallets", walletData.id), {
        balance: (walletData.balance || 0) + amountNum,
        totalRecharged: (walletData.totalRecharged || 0) + amountNum,
        updatedAt: serverTimestamp()
      });
      
      // 2. Add transaction record
      await addDoc(collection(db, "walletTransactions"), {
        userId: currentUser.uid,
        type: "credit",
        title: `Wallet Recharge via ${addMoneyMethod}`,
        description: `Added ₹${amountNum} to wallet`,
        amount: amountNum,
        method: addMoneyMethod,
        reference: "TXN-" + Date.now().toString().slice(-10),
        status: "success",
        createdAt: serverTimestamp()
      });
      
      showToast(`✅ ₹${amountNum} added to wallet successfully!`);
      setAmount("");
      setShowAddMoney(false);
    } catch (error) {
      console.error("Error adding money:", error);
      showToast("❌ Failed to add money. Please try again.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Withdraw from Wallet
  const handleWithdraw = async () => {
    if (!withdrawAmount || parseFloat(withdrawAmount) <= 0) {
      showToast("⚠️ Please enter valid amount", "error");
      return;
    }

    if (!walletData) {
      showToast("⚠️ Wallet not found", "error");
      return;
    }

    const amountNum = parseFloat(withdrawAmount);
    
    if (amountNum > walletData.balance) {
      showToast("⚠️ Insufficient balance", "error");
      return;
    }

    setIsSubmitting(true);
    
    try {
      // 1. Update wallet balance
      await updateDoc(doc(db, "wallets", walletData.id), {
        balance: walletData.balance - amountNum,
        totalWithdrawn: (walletData.totalWithdrawn || 0) + amountNum,
        updatedAt: serverTimestamp()
      });
      
      // 2. Add transaction record
      await addDoc(collection(db, "walletTransactions"), {
        userId: currentUser.uid,
        type: "debit",
        title: "Withdrawal to Bank",
        description: `Withdrawn ₹${amountNum} to bank account`,
        amount: amountNum,
        method: "Bank Transfer",
        reference: "WDR-" + Date.now().toString().slice(-10),
        status: "pending",
        createdAt: serverTimestamp()
      });
      
      showToast(`✅ ₹${amountNum} withdrawal initiated! Will be processed in 24 hours.`);
      setWithdrawAmount("");
      setShowWithdraw(false);
    } catch (error) {
      console.error("Error withdrawing:", error);
      showToast("❌ Failed to withdraw. Please try again.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Pay for Shipment
  const handlePayShipment = (shipment) => {
    setSelectedShipment(shipment);
    setShowPayModal(true);
    setPaymentSuccess(false);
    setSelectedPaymentMethod("wallet");
  };

  // Confirm Payment
  const handleConfirmPayment = async () => {
    if (!selectedShipment || !walletData) {
      showToast("⚠️ Invalid payment data", "error");
      return;
    }

    const amount = selectedShipment.amount;
    
    if (selectedPaymentMethod === "wallet") {
      if (amount > walletData.balance) {
        showToast("⚠️ Insufficient wallet balance", "error");
        return;
      }
    }

    setIsSubmitting(true);
    
    try {
      // 1. If wallet payment, update balance
      if (selectedPaymentMethod === "wallet") {
        await updateDoc(doc(db, "wallets", walletData.id), {
          balance: walletData.balance - amount,
          updatedAt: serverTimestamp()
        });
        
        // Add wallet transaction
        await addDoc(collection(db, "walletTransactions"), {
          userId: currentUser.uid,
          type: "debit",
          title: `Shipment Payment - ${selectedShipment.trackingId || selectedShipment.id}`,
          description: `${selectedShipment.pickupCity || ''} → ${selectedShipment.dropCity || ''}`,
          amount: amount,
          method: "Wallet",
          reference: "PAY-" + Date.now().toString().slice(-10),
          status: "success",
          shipmentId: selectedShipment.id,
          createdAt: serverTimestamp()
        });
      }
      
      // 2. Update shipment payment status
      await updateDoc(doc(db, "shipments", selectedShipment.id), {
        paymentStatus: "paid",
        paymentMethod: selectedPaymentMethod,
        paidAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      
      // 3. Add payment record
      await addDoc(collection(db, "payments"), {
        userId: currentUser.uid,
        shipmentId: selectedShipment.id,
        trackingId: selectedShipment.trackingId || selectedShipment.id,
        amount: amount,
        method: selectedPaymentMethod,
        status: "success",
        route: `${selectedShipment.pickupCity || ''} → ${selectedShipment.dropCity || ''}`,
        createdAt: serverTimestamp()
      });
      
      // Show success
      setTimeout(() => {
        setPaymentSuccess(true);
        setTimeout(() => {
          setShowPayModal(false);
          setSelectedShipment(null);
        }, 2000);
      }, 500);
      
      showToast(`✅ Payment of ₹${amount} successful!`);
    } catch (error) {
      console.error("Error processing payment:", error);
      showToast("❌ Payment failed. Please try again.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  // ========== COMPUTED STATS ==========
  const walletStats = walletData ? [
    { 
      label: "Wallet Balance", 
      value: `₹ ${(walletData.balance || 0).toLocaleString('en-IN')}`, 
      icon: "💰", 
      color: "wp-stat--blue",
      change: walletData.balance > 0 ? "Active" : "Empty",
      up: walletData.balance > 0
    },
    { 
      label: "Total Recharged", 
      value: `₹ ${(walletData.totalRecharged || 0).toLocaleString('en-IN')}`, 
      icon: "⬇️", 
      color: "wp-stat--emerald",
      change: "Lifetime",
      up: true
    },
    { 
      label: "Total Withdrawn", 
      value: `₹ ${(walletData.totalWithdrawn || 0).toLocaleString('en-IN')}`, 
      icon: "⬆️", 
      color: "wp-stat--amber",
      change: "Lifetime",
      up: false
    },
    { 
      label: "Cashback Earned", 
      value: `₹ ${(walletData.cashbackEarned || 0).toLocaleString('en-IN')}`, 
      icon: "📈", 
      color: "wp-stat--purple",
      change: "Rewards",
      up: true
    },
  ] : [];

  // Payment stats
  const totalPendingAmount = pendingShipments.reduce((sum, s) => sum + (s.amount || 0), 0);
  const totalPaidAmount = paymentHistory
    .filter(p => p.status === "success")
    .reduce((sum, p) => sum + (p.amount || 0), 0);
  const totalCodAmount = codCollections
    .filter(c => c.status === "collected")
    .reduce((sum, c) => sum + (c.amount || 0), 0);
  const totalPayoutAmount = driverPayouts
    .filter(d => d.status === "paid")
    .reduce((sum, d) => sum + (d.amount || 0), 0);

  // ========== LOADING STATE ==========
  if (loading) {
    return (
      <div className="wp-page">
        <div className="wp-loading">
          <div className="wp-spinner"></div>
          <p>Loading your wallet data...</p>
        </div>
      </div>
    );
  }

  // ========== RENDER ==========
  return (
    <div className="wp-page">
      {/* Toast */}
      {toast && (
        <div className={`wp-toast wp-toast--${toast.type}`}>
          {toast.message}
        </div>
      )}

      {/* Header */}
      <div className="wp-header">
        <div className="wp-header__content">
          <div>
            <h1 className="wp-header__title">
              <span className="wp-header__emoji">💳</span>
              Wallets & Payments
            </h1>
            <p className="wp-header__subtitle">
              Manage your logistics wallet, make payments & track transactions
            </p>
          </div>
        </div>

        {/* Main Tabs */}
        <div className="wp-main-tabs">
          <button
            onClick={() => setMainTab("wallets")}
            className={`wp-main-tab ${mainTab === "wallets" ? "wp-main-tab--active" : ""}`}
          >
            <span className="wp-main-tab__emoji">💰</span>
            <div className="wp-main-tab__text">
              <span className="wp-main-tab__label">Wallets</span>
              <span className="wp-main-tab__desc">Balance, Recharge, Withdraw</span>
            </div>
          </button>
          <button
            onClick={() => setMainTab("payments")}
            className={`wp-main-tab ${mainTab === "payments" ? "wp-main-tab--active" : ""}`}
          >
            <span className="wp-main-tab__emoji">💸</span>
            <div className="wp-main-tab__text">
              <span className="wp-main-tab__label">Payments</span>
              <span className="wp-main-tab__desc">Shipments, Invoices, COD</span>
            </div>
          </button>
        </div>
      </div>

      <div className="wp-container">
        {/* ================== WALLETS SECTION ================== */}
        {mainTab === "wallets" && (
          <>
            <div className="wp-stats">
              {walletStats.map((s, i) => (
                <div key={i} className="wp-stat-card">
                  <div className="wp-stat-card__header">
                    <div className={`wp-stat-card__icon ${s.color}`}>
                      <span className="wp-stat-emoji">{s.icon}</span>
                    </div>
                    <span className={`wp-stat-card__change ${s.up ? "up" : "down"}`}>
                      {s.change}
                    </span>
                  </div>
                  <p className="wp-stat-card__label">{s.label}</p>
                  <p className="wp-stat-card__value">{s.value}</p>
                </div>
              ))}
            </div>

            <div className="wp-tabs-wrapper">
              <div className="wp-tabs">
                <button
                  onClick={() => setWalletSubTab("overview")}
                  className={`wp-tab ${walletSubTab === "overview" ? "wp-tab--active" : ""}`}
                >
                  <span>💰</span> Overview
                </button>
                <button
                  onClick={() => setWalletSubTab("history")}
                  className={`wp-tab ${walletSubTab === "history" ? "wp-tab--active" : ""}`}
                >
                  <span>📜</span> Wallet History
                </button>
                <button
                  onClick={() => setWalletSubTab("methods")}
                  className={`wp-tab ${walletSubTab === "methods" ? "wp-tab--active" : ""}`}
                >
                  <span>💳</span> Linked Methods
                </button>
              </div>

              <div className="wp-tab-content">
                {/* WALLET OVERVIEW */}
                {walletSubTab === "overview" && (
                  <div className="wp-grid-2-1">
                    <div>
                      <div className="wp-section-header">
                        <h3 className="wp-section-title">Recent Wallet Activity</h3>
                        <button onClick={() => setWalletSubTab("history")} className="wp-link-btn">
                          View All →
                        </button>
                      </div>
                      <div className="wp-txn-list">
                        {walletTransactions.length === 0 ? (
                          <div className="wp-empty-state">
                            <span>📭</span>
                            <p>No transactions yet</p>
                          </div>
                        ) : (
                          walletTransactions.slice(0, 4).map((t) => (
                            <div key={t.id} className="wp-txn-item">
                              <div className={`wp-txn-item__icon ${t.type}`}>
                                <span>{t.type === "credit" ? "⬇️" : "⬆️"}</span>
                              </div>
                              <div className="wp-txn-item__info">
                                <p className="wp-txn-item__title">{t.title}</p>
                                <p className="wp-txn-item__desc">
                                  {t.description} • {t.reference}
                                </p>
                              </div>
                              <div className="wp-txn-item__amount">
                                <p className={`wp-amount ${t.type}`}>
                                  {t.type === "credit" ? "+" : "-"}₹ {t.amount?.toLocaleString('en-IN')}
                                </p>
                                <p className="wp-txn-item__time">
                                  {t.createdAt?.toLocaleDateString('en-IN', {
                                    day: 'numeric',
                                    month: 'short',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })}
                                </p>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    <div className="wp-sidebar">
                      <div className="wp-balance-card">
                        <div className="wp-balance-card__header">
                          <span>🛡️</span>
                          <span>Secure Wallet</span>
                        </div>
                        <p className="wp-balance-card__label">Available Balance</p>
                        <p className="wp-balance-card__amount">
                          ₹ {(walletData?.balance || 0).toLocaleString('en-IN')}
                        </p>
                        <div className="wp-balance-card__details">
                          <p>Wallet ID: <span className="mono">{walletData?.walletId || 'N/A'}</span></p>
                          <p>KYC: <span className={walletData?.kycVerified ? "verified" : "pending"}>
                            {walletData?.kycVerified ? "✓ Verified" : "⏳ Pending"}
                          </span></p>
                        </div>
                        <div className="wp-balance-card__actions">
                          <button onClick={() => setShowAddMoney(true)} className="wp-btn wp-btn--white">
                            <span>➕</span> Add Money
                          </button>
                          <button onClick={() => setShowWithdraw(true)} className="wp-btn wp-btn--outline-white">
                            <span>⬆️</span> Withdraw
                          </button>
                        </div>
                      </div>

                      <div className="wp-quick-card">
                        <h4 className="wp-quick-card__title">Quick Actions</h4>
                        <div className="wp-quick-card__options">
                          <button onClick={() => setShowAddMoney(true)} className="wp-quick-option">
                            <span className="wp-quick-option__emoji">➕</span>
                            <div>
                              <p className="wp-quick-option__label">Recharge Wallet</p>
                              <p className="wp-quick-option__desc">Add funds instantly</p>
                            </div>
                          </button>
                          <button onClick={() => setShowWithdraw(true)} className="wp-quick-option">
                            <span className="wp-quick-option__emoji">💸</span>
                            <div>
                              <p className="wp-quick-option__label">Withdraw to Bank</p>
                              <p className="wp-quick-option__desc">Transfer to account</p>
                            </div>
                          </button>
                          <button onClick={() => setMainTab("payments")} className="wp-quick-option">
                            <span className="wp-quick-option__emoji">🚚</span>
                            <div>
                              <p className="wp-quick-option__label">Pay Shipment</p>
                              <p className="wp-quick-option__desc">Using wallet balance</p>
                            </div>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* WALLET HISTORY */}
                {walletSubTab === "history" && (
                  <div>
                    <div className="wp-section-header">
                      <h3 className="wp-section-title">All Transactions</h3>
                      <span className="wp-info-chip">
                        Total: {walletTransactions.length} transactions
                      </span>
                    </div>
                    <div className="wp-txn-list">
                      {walletTransactions.length === 0 ? (
                        <div className="wp-empty-state">
                          <span>📭</span>
                          <p>No transactions yet. Add money to get started!</p>
                          <button 
                            onClick={() => setShowAddMoney(true)} 
                            className="wp-btn wp-btn--primary"
                          >
                            ➕ Add Money Now
                          </button>
                        </div>
                      ) : (
                        walletTransactions.map((t) => (
                          <div key={t.id} className="wp-txn-item">
                            <div className={`wp-txn-item__icon ${t.type}`}>
                              <span>{t.type === "credit" ? "⬇️" : "⬆️"}</span>
                            </div>
                            <div className="wp-txn-item__info">
                              <p className="wp-txn-item__title">{t.title}</p>
                              <p className="wp-txn-item__desc">
                                {t.description} • Ref: {t.reference}
                              </p>
                            </div>
                            <div className="wp-txn-item__amount">
                              <p className={`wp-amount ${t.type}`}>
                                {t.type === "credit" ? "+" : "-"}₹ {t.amount?.toLocaleString('en-IN')}
                              </p>
                              <p className="wp-txn-item__time">
                                {t.createdAt?.toLocaleDateString('en-IN', {
                                  day: 'numeric',
                                  month: 'short',
                                  year: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </p>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}

                {/* LINKED METHODS */}
                {walletSubTab === "methods" && (
                  <div>
                    <div className="wp-section-header">
                      <h3 className="wp-section-title">Linked Payment Methods</h3>
                      <button 
                        className="wp-btn wp-btn--primary wp-btn--sm"
                        onClick={() => showToast("🔧 Add method feature coming soon!", "info")}
                      >
                        <span>➕</span> Add New
                      </button>
                    </div>
                    <div className="wp-methods-grid">
                      {paymentMethods.length === 0 ? (
                        <div className="wp-empty-state">
                          <span>💳</span>
                          <p>No payment methods linked yet</p>
                        </div>
                      ) : (
                        paymentMethods.map((m) => (
                          <div key={m.id} className="wp-method-card">
                            <div className="wp-method-card__header">
                              <div className="wp-method-card__icon">
                                <span>{m.icon || "💳"}</span>
                              </div>
                              {m.isPrimary && <span className="wp-method-card__badge">Primary</span>}
                            </div>
                            <p className="wp-method-card__type">{m.type}</p>
                            <p className="wp-method-card__name">{m.name}</p>
                            <p className="wp-method-card__bank">{m.bank}</p>
                            <div className="wp-method-card__actions">
                              <button className="wp-link-btn">Edit</button>
                              {!m.isPrimary && <button className="wp-link-btn danger">Remove</button>}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {/* ================= PAYMENTS SECTION ================== */}
        {mainTab === "payments" && (
          <>
            <div className="wp-stats">
              <div className="wp-stat-card">
                <div className="wp-stat-card__header">
                  <div className="wp-stat-card__icon wp-stat--blue">
                    <span className="wp-stat-emoji">📦</span>
                  </div>
                  <span className="wp-stat-card__change up">{pendingShipments.length} pending</span>
                </div>
                <p className="wp-stat-card__label">Pending Shipments</p>
                <p className="wp-stat-card__value">₹ {totalPendingAmount.toLocaleString('en-IN')}</p>
              </div>
              <div className="wp-stat-card">
                <div className="wp-stat-card__header">
                  <div className="wp-stat-card__icon wp-stat--emerald">
                    <span className="wp-stat-emoji">✅</span>
                  </div>
                  <span className="wp-stat-card__change up">
                    {paymentHistory.filter(p => p.status === "success").length} payments
                  </span>
                </div>
                <p className="wp-stat-card__label">Payments Made</p>
                <p className="wp-stat-card__value">₹ {totalPaidAmount.toLocaleString('en-IN')}</p>
              </div>
              <div className="wp-stat-card">
                <div className="wp-stat-card__header">
                  <div className="wp-stat-card__icon wp-stat--amber">
                    <span className="wp-stat-emoji">💵</span>
                  </div>
                  <span className="wp-stat-card__change down">
                    {codCollections.filter(c => c.status === "pending").length} pending
                  </span>
                </div>
                <p className="wp-stat-card__label">COD Collections</p>
                <p className="wp-stat-card__value">₹ {totalCodAmount.toLocaleString('en-IN')}</p>
              </div>
              <div className="wp-stat-card">
                <div className="wp-stat-card__header">
                  <div className="wp-stat-card__icon wp-stat--purple">
                    <span className="wp-stat-emoji">👥</span>
                  </div>
                  <span className="wp-stat-card__change up">
                    {driverPayouts.filter(d => d.status === "pending").length} pending
                  </span>
                </div>
                <p className="wp-stat-card__label">Driver Payouts</p>
                <p className="wp-stat-card__value">₹ {totalPayoutAmount.toLocaleString('en-IN')}</p>
              </div>
            </div>

            <div className="wp-tabs-wrapper">
              <div className="wp-tabs">
                <button
                  onClick={() => setPaymentSubTab("pay-shipment")}
                  className={`wp-tab ${paymentSubTab === "pay-shipment" ? "wp-tab--active" : ""}`}
                >
                  <span>🚚</span> Pay Shipments ({pendingShipments.length})
                </button>
                <button
                  onClick={() => setPaymentSubTab("history")}
                  className={`wp-tab ${paymentSubTab === "history" ? "wp-tab--active" : ""}`}
                >
                  <span>📜</span> Payment History
                </button>
                <button
                  onClick={() => setPaymentSubTab("invoices")}
                  className={`wp-tab ${paymentSubTab === "invoices" ? "wp-tab--active" : ""}`}
                >
                  <span>🧾</span> Invoices
                </button>
                <button
                  onClick={() => setPaymentSubTab("cod")}
                  className={`wp-tab ${paymentSubTab === "cod" ? "wp-tab--active" : ""}`}
                >
                  <span>💵</span> COD & Payouts
                </button>
              </div>

              <div className="wp-tab-content">
                {/* PAY SHIPMENTS */}
                {paymentSubTab === "pay-shipment" && (
                  <div>
                    <div className="wp-section-header">
                      <h3 className="wp-section-title">Pending Shipment Payments</h3>
                      <div className="wp-section-actions">
                        <span className="wp-info-chip">
                          <span>💰</span>
                          Wallet: ₹ {(walletData?.balance || 0).toLocaleString('en-IN')}
                        </span>
                      </div>
                    </div>
                    <div className="wp-shipments-grid">
                      {pendingShipments.length === 0 ? (
                        <div className="wp-empty-state">
                          <span>✅</span>
                          <p>No pending shipments! All paid.</p>
                        </div>
                      ) : (
                        pendingShipments.map((s) => (
                          <div key={s.id} className="wp-shipment-card">
                            <div className="wp-shipment-card__header">
                              <span className="mono">{s.trackingId || s.id}</span>
                              <span className="wp-status-badge ready">Ready to Pay</span>
                            </div>
                            <div className="wp-shipment-card__route">
                              <div className="wp-route-point">
                                <div className="wp-route-dot from"></div>
                                <span>{s.pickupCity || 'N/A'}</span>
                              </div>
                              <span className="wp-route-arrow">➜</span>
                              <div className="wp-route-point">
                                <div className="wp-route-dot to"></div>
                                <span>{s.dropCity || 'N/A'}</span>
                              </div>
                            </div>
                            <div className="wp-shipment-card__details">
                              <div>
                                <p className="wp-shipment-card__detail-label">Weight</p>
                                <p className="wp-shipment-card__detail-value">{s.weight || 0} KG</p>
                              </div>
                              <div>
                                <p className="wp-shipment-card__detail-label">Date</p>
                                <p className="wp-shipment-card__detail-value">
                                  {s.createdAt?.toDate?.().toLocaleDateString('en-IN') || 'N/A'}
                                </p>
                              </div>
                            </div>
                            <div className="wp-shipment-card__footer">
                              <div>
                                <p className="wp-shipment-card__amount-label">Amount</p>
                                <p className="wp-shipment-card__amount">
                                  ₹ {(s.amount || 0).toLocaleString('en-IN')}
                                </p>
                              </div>
                              <button
                                onClick={() => handlePayShipment(s)}
                                className="wp-btn wp-btn--primary wp-btn--sm"
                              >
                                Pay Now ➜
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}

                {/* PAYMENT HISTORY */}
                {paymentSubTab === "history" && (
                  <div>
                    <div className="wp-section-header">
                      <h3 className="wp-section-title">Payment History</h3>
                      <span className="wp-info-chip">
                        Total: {paymentHistory.length} payments
                      </span>
                    </div>
                    <div className="wp-table-wrapper">
                      <table className="wp-table">
                        <thead>
                          <tr>
                            <th>Shipment</th>
                            <th>Route</th>
                            <th>Amount</th>
                            <th>Method</th>
                            <th>Status</th>
                            <th>Date</th>
                          </tr>
                        </thead>
                        <tbody>
                          {paymentHistory.length === 0 ? (
                            <tr>
                              <td colSpan="6" style={{ textAlign: 'center', padding: '40px' }}>
                                No payment history yet
                              </td>
                            </tr>
                          ) : (
                            paymentHistory.map((p) => (
                              <tr key={p.id}>
                                <td className="mono">{p.trackingId || p.shipmentId}</td>
                                <td>{p.route || 'N/A'}</td>
                                <td className="font-semibold">₹ {(p.amount || 0).toLocaleString('en-IN')}</td>
                                <td>
                                  <span className="wp-method-chip">{p.method}</span>
                                </td>
                                <td>
                                  <span className={`wp-status-badge ${p.status}`}>
                                    {p.status}
                                  </span>
                                </td>
                                <td>
                                  {p.createdAt?.toLocaleDateString('en-IN', {
                                    day: 'numeric',
                                    month: 'short',
                                    year: 'numeric'
                                  })}
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* INVOICES */}
                {paymentSubTab === "invoices" && (
                  <div>
                    <div className="wp-section-header">
                      <h3 className="wp-section-title">Invoice History</h3>
                      <span className="wp-info-chip">
                        Total: {invoices.length} invoices
                      </span>
                    </div>
                    <div className="wp-table-wrapper">
                      <table className="wp-table">
                        <thead>
                          <tr>
                            <th>Invoice ID</th>
                            <th>Tracking</th>
                            <th>Customer</th>
                            <th>Amount</th>
                            <th>Status</th>
                            <th>Date</th>
                          </tr>
                        </thead>
                        <tbody>
                          {invoices.length === 0 ? (
                            <tr>
                              <td colSpan="6" style={{ textAlign: 'center', padding: '40px' }}>
                                No invoices yet
                              </td>
                            </tr>
                          ) : (
                            invoices.map((inv) => (
                              <tr key={inv.id}>
                                <td className="mono">{inv.id.slice(-8).toUpperCase()}</td>
                                <td className="mono">{inv.trackingId || inv.shipmentId}</td>
                                <td>{inv.customer || 'N/A'}</td>
                                <td className="font-semibold">₹ {(inv.amount || 0).toLocaleString('en-IN')}</td>
                                <td>
                                  <span className={`wp-status-badge ${inv.status?.toLowerCase()}`}>
                                    {inv.status}
                                  </span>
                                </td>
                                <td>
                                  {inv.createdAt?.toLocaleDateString('en-IN', {
                                    day: 'numeric',
                                    month: 'short',
                                    year: 'numeric'
                                  })}
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* COD & PAYOUTS */}
                {paymentSubTab === "cod" && (
                  <div className="wp-grid-1-1">
                    <div>
                      <div className="wp-section-header">
                        <h3 className="wp-section-title">COD Collections</h3>
                        <span className="wp-info-chip">
                          Total: ₹ {totalCodAmount.toLocaleString('en-IN')}
                        </span>
                      </div>
                      <div className="wp-cod-list">
                        {codCollections.length === 0 ? (
                          <div className="wp-empty-state">
                            <span>💵</span>
                            <p>No COD collections yet</p>
                          </div>
                        ) : (
                          codCollections.map((c) => (
                            <div key={c.id} className="wp-cod-item">
                              <div className="wp-cod-item__icon">
                                <span>💵</span>
                              </div>
                              <div className="wp-cod-item__info">
                                <p className="wp-cod-item__title">{c.orderId || c.id}</p>
                                <p className="wp-cod-item__desc">
                                  {c.customerName} • {c.createdAt?.toLocaleDateString('en-IN')}
                                </p>
                              </div>
                              <div className="wp-cod-item__right">
                                <p className="wp-cod-item__amount">
                                  ₹ {(c.amount || 0).toLocaleString('en-IN')}
                                </p>
                                <span className={`wp-status-badge ${c.status?.toLowerCase()}`}>
                                  {c.status}
                                </span>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    <div>
                      <div className="wp-section-header">
                        <h3 className="wp-section-title">Driver Payouts</h3>
                        <button 
                          className="wp-btn wp-btn--primary wp-btn--sm"
                          onClick={() => showToast("🔧 Bulk pay feature coming soon!", "info")}
                        >
                          <span>💸</span> Pay All
                        </button>
                      </div>
                      <div className="wp-cod-list">
                        {driverPayouts.length === 0 ? (
                          <div className="wp-empty-state">
                            <span>👤</span>
                            <p>No driver payouts yet</p>
                          </div>
                        ) : (
                          driverPayouts.map((d) => (
                            <div key={d.id} className="wp-cod-item">
                              <div className="wp-cod-item__icon driver">
                                <span>👤</span>
                              </div>
                              <div className="wp-cod-item__info">
                                <p className="wp-cod-item__title">{d.driverName}</p>
                                <p className="wp-cod-item__desc">
                                  {d.vehicleNumber} • {d.trips || 0} trips
                                </p>
                              </div>
                              <div className="wp-cod-item__right">
                                <p className="wp-cod-item__amount">
                                  ₹ {(d.amount || 0).toLocaleString('en-IN')}
                                </p>
                                <span className={`wp-status-badge ${d.status?.toLowerCase()}`}>
                                  {d.status}
                                </span>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {/* ============ ADD MONEY MODAL ============ */}
      {showAddMoney && (
        <div className="wp-modal-overlay" onClick={() => !isSubmitting && setShowAddMoney(false)}>
          <div className="wp-modal" onClick={(e) => e.stopPropagation()}>
            <div className="wp-modal__header">
              <div>
                <h2>Add Money to Wallet</h2>
                <p className="wp-modal__subtitle">Recharge your logistics wallet</p>
              </div>
              <button onClick={() => setShowAddMoney(false)} className="wp-modal__close">
                ✕
              </button>
            </div>
            <div className="wp-modal__body">
              <label className="wp-form-label">Enter Amount</label>
              <div className="wp-amount-input">
                <span className="wp-amount-input__icon">₹</span>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="wp-amount-input__field"
                  min="1"
                />
              </div>
              <div className="wp-quick-amounts">
                {["500", "1000", "2500", "5000", "10000"].map((v) => (
                  <button key={v} onClick={() => setAmount(v)} className="wp-quick-amount-btn">
                    ₹{v}
                  </button>
                ))}
              </div>
              <label className="wp-form-label">Payment Method</label>
              <div className="wp-method-selector">
                {["UPI", "Card", "NetBanking"].map((m) => (
                  <button 
                    key={m} 
                    onClick={() => setAddMoneyMethod(m)}
                    className={`wp-method-option ${addMoneyMethod === m ? "selected" : ""}`}
                  >
                    <span className="wp-method-option__emoji">
                      {m === "UPI" ? "📱" : m === "Card" ? "💳" : "🏦"}
                    </span>
                    <span>{m}</span>
                  </button>
                ))}
              </div>
            </div>
            <div className="wp-modal__footer">
              <button onClick={() => setShowAddMoney(false)} className="wp-btn wp-btn--outline">
                Cancel
              </button>
              <button 
                onClick={handleAddMoney} 
                className="wp-btn wp-btn--primary"
                disabled={isSubmitting}
              >
                {isSubmitting ? "⏳ Processing..." : `Add ₹${amount || "0"}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============ WITHDRAW MODAL ============ */}
      {showWithdraw && (
        <div className="wp-modal-overlay" onClick={() => !isSubmitting && setShowWithdraw(false)}>
          <div className="wp-modal" onClick={(e) => e.stopPropagation()}>
            <div className="wp-modal__header">
              <div>
                <h2>Withdraw to Bank</h2>
                <p className="wp-modal__subtitle">Transfer funds to your bank account</p>
              </div>
              <button onClick={() => setShowWithdraw(false)} className="wp-modal__close">
                ✕
              </button>
            </div>
            <div className="wp-modal__body">
              <div className="wp-withdraw-info">
                <span className="wp-withdraw-info__emoji">💰</span>
                <div>
                  <p className="wp-withdraw-info__label">Available Balance</p>
                  <p className="wp-withdraw-info__amount">
                    ₹ {(walletData?.balance || 0).toLocaleString('en-IN')}
                  </p>
                </div>
              </div>
              <label className="wp-form-label">Withdraw Amount</label>
              <div className="wp-amount-input">
                <span className="wp-amount-input__icon">₹</span>
                <input
                  type="number"
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  placeholder="0.00"
                  className="wp-amount-input__field"
                  min="1"
                  max={walletData?.balance || 0}
                />
              </div>
              <label className="wp-form-label">Bank Account</label>
              <div className="wp-bank-select">
                <span className="wp-bank-select__emoji">🏦</span>
                <div>
                  <p className="wp-bank-select__name">Default Bank Account</p>
                  <p className="wp-bank-select__acc">
                    {paymentMethods.find(m => m.type === "Bank")?.name || "Add bank account first"}
                  </p>
                </div>
              </div>
              <div className="wp-withdraw-note">
                <span>⚠️</span>
                <span>Funds will be transferred within 24 working hours</span>
              </div>
            </div>
            <div className="wp-modal__footer">
              <button onClick={() => setShowWithdraw(false)} className="wp-btn wp-btn--outline">
                Cancel
              </button>
              <button 
                onClick={handleWithdraw} 
                className="wp-btn wp-btn--primary"
                disabled={isSubmitting}
              >
                {isSubmitting ? "⏳ Processing..." : `Withdraw ₹${withdrawAmount || "0"}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============ PAY SHIPMENT MODAL ============ */}
      {showPayModal && selectedShipment && (
        <div className="wp-modal-overlay" onClick={() => !isSubmitting && setShowPayModal(false)}>
          <div className="wp-modal" onClick={(e) => e.stopPropagation()}>
            <div className="wp-modal__header">
              <div>
                <h2>{paymentSuccess ? "Payment Successful!" : "Confirm Payment"}</h2>
                <p className="wp-modal__subtitle">
                  {paymentSuccess ? "Your shipment payment is complete" : "Pay for shipment charges"}
                </p>
              </div>
              {!paymentSuccess && (
                <button onClick={() => setShowPayModal(false)} className="wp-modal__close">
                  ✕
                </button>
              )}
            </div>
            <div className="wp-modal__body">
              {!paymentSuccess ? (
                <>
                  <div className="wp-pay-summary">
                    <div className="wp-pay-summary__row">
                      <span>Shipment ID</span>
                      <span className="mono">{selectedShipment.trackingId || selectedShipment.id}</span>
                    </div>
                    <div className="wp-pay-summary__row">
                      <span>Route</span>
                      <span>{selectedShipment.pickupCity || 'N/A'} → {selectedShipment.dropCity || 'N/A'}</span>
                    </div>
                    <div className="wp-pay-summary__row">
                      <span>Weight</span>
                      <span>{selectedShipment.weight || 0} KG</span>
                    </div>
                    <div className="wp-pay-summary__row total">
                      <span>Total Amount</span>
                      <span>₹ {(selectedShipment.amount || 0).toLocaleString('en-IN')}</span>
                    </div>
                  </div>
                  <label className="wp-form-label">Select Payment Method</label>
                  <div className="wp-pay-methods">
                    <button
                      onClick={() => setSelectedPaymentMethod("wallet")}
                      className={`wp-pay-method ${selectedPaymentMethod === "wallet" ? "selected" : ""}`}
                    >
                      <span className="wp-pay-method__emoji">💰</span>
                      <div>
                        <p className="wp-pay-method__name">Wallet</p>
                        <p className="wp-pay-method__desc">
                          Balance: ₹ {(walletData?.balance || 0).toLocaleString('en-IN')}
                        </p>
                      </div>
                      {selectedPaymentMethod === "wallet" && <span className="wp-pay-method__check">✓</span>}
                    </button>
                    <button
                      onClick={() => setSelectedPaymentMethod("upi")}
                      className={`wp-pay-method ${selectedPaymentMethod === "upi" ? "selected" : ""}`}
                    >
                      <span className="wp-pay-method__emoji">📱</span>
                      <div>
                        <p className="wp-pay-method__name">UPI</p>
                        <p className="wp-pay-method__desc">GPay, PhonePe, Paytm</p>
                      </div>
                      {selectedPaymentMethod === "upi" && <span className="wp-pay-method__check">✓</span>}
                    </button>
                    <button
                      onClick={() => setSelectedPaymentMethod("card")}
                      className={`wp-pay-method ${selectedPaymentMethod === "card" ? "selected" : ""}`}
                    >
                      <span className="wp-pay-method__emoji">💳</span>
                      <div>
                        <p className="wp-pay-method__name">Card</p>
                        <p className="wp-pay-method__desc">Credit/Debit Card</p>
                      </div>
                      {selectedPaymentMethod === "card" && <span className="wp-pay-method__check">✓</span>}
                    </button>
                  </div>
                </>
              ) : (
                <div className="wp-pay-success">
                  <div className="wp-pay-success__icon">
                    <span>✅</span>
                  </div>
                  <p className="wp-pay-success__amount">
                    ₹ {(selectedShipment.amount || 0).toLocaleString('en-IN')}
                  </p>
                  <p className="wp-pay-success__text">
                    Paid successfully for {selectedShipment.trackingId || selectedShipment.id}
                  </p>
                  <p className="wp-pay-success__ref">
                    Transaction Ref: TXN-{Date.now().toString().slice(-8)}
                  </p>
                </div>
              )}
            </div>
            {!paymentSuccess && (
              <div className="wp-modal__footer">
                <button onClick={() => setShowPayModal(false)} className="wp-btn wp-btn--outline">
                  Cancel
                </button>
                <button 
                  onClick={handleConfirmPayment} 
                  className="wp-btn wp-btn--primary"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "⏳ Processing..." : `Pay ₹${(selectedShipment.amount || 0).toLocaleString('en-IN')}`}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}