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
} from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";
import "../styles/Returns.css";

export default function Returns() {
  const { currentUser } = useAuth();

  // ========== TABS & SEARCH ==========
  const [activeTab, setActiveTab] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  // ========== MODAL STATE ==========
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showTrackModal, setShowTrackModal] = useState(false);
  const [selectedReturn, setSelectedReturn] = useState(null);
  const [cancelConfirm, setCancelConfirm] = useState(null);

  // ========== FORM STATE ==========
  const [formData, setFormData] = useState({
    shipmentId: "",
    reason: "",
    description: "",
    pickupDate: "",
    pickupTime: "",
    refundMethod: "wallet",
  });

  // ========== REAL DATA FROM FIREBASE ==========
  const [returns, setReturns] = useState([]);

  // ========== UI STATE ==========
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState(null);
  const [formErrors, setFormErrors] = useState({});

  // ========== TOAST HELPER ==========
  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // ========== REAL-TIME DATA FETCH ==========
  useEffect(() => {
    if (!currentUser?.uid) {
      setLoading(false);
      return;
    }

    setLoading(true);

    const q = query(
      collection(db, "returns"),
      where("userId", "==", currentUser.uid),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const returnsList = snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data(),
          createdAt: docSnap.data().createdAt?.toDate?.() || new Date(),
          updatedAt: docSnap.data().updatedAt?.toDate?.() || new Date(),
        }));
        setReturns(returnsList);
        setLoading(false);
      },
      (error) => {
        console.error("Error fetching returns:", error);
        showToast("❌ Failed to load returns", "error");
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [currentUser]);

  // ========== FILTERING ==========
  const filteredReturns = returns.filter((ret) => {
    const matchesTab =
      activeTab === "all" ||
      ret.status?.toLowerCase().replace(" ", "-") === activeTab;
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      searchQuery === "" ||
      ret.id?.toLowerCase().includes(q) ||
      ret.shipmentId?.toLowerCase().includes(q) ||
      ret.customerName?.toLowerCase().includes(q) ||
      ret.reason?.toLowerCase().includes(q);
    return matchesTab && matchesSearch;
  });

  // ========== STATS ==========
  const stats = {
    total: returns.length,
    pending: returns.filter((r) => r.status === "Pending").length,
    approved: returns.filter((r) => r.status === "Approved").length,
    inTransit: returns.filter((r) => r.status === "In Transit").length,
    completed: returns.filter((r) => r.status === "Completed").length,
    rejected: returns.filter((r) => r.status === "Rejected").length,
    totalRefund: returns.reduce((sum, r) => sum + (r.refundAmount || 0), 0),
  };

  // ========== INPUT HANDLERS ==========
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    if (formErrors[name]) {
      setFormErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  // ========== VALIDATION ==========
  const validateForm = () => {
    const errors = {};
    if (!formData.shipmentId.trim()) errors.shipmentId = "Shipment ID required";
    if (!formData.reason) errors.reason = "Reason required";
    if (!formData.pickupDate) errors.pickupDate = "Pickup date required";
    else {
      const pickupDate = new Date(formData.pickupDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (pickupDate < today) {
        errors.pickupDate = "Pickup date cannot be in the past";
      }
    }
    if (!formData.pickupTime) errors.pickupTime = "Pickup time required";
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // ========== CREATE RETURN ==========
  const handleCreateReturn = async (e) => {
    e.preventDefault();
    if (!validateForm()) {
      showToast("⚠️ Please fix the errors", "error");
      return;
    }

    if (!currentUser?.uid) {
      showToast("⚠️ Please login first", "error");
      return;
    }

    setIsSubmitting(true);

    try {
      const refundMethodMap = {
        wallet: "Wallet",
        upi: "UPI",
        bank: "Bank Transfer",
      };

      const newReturn = {
        userId: currentUser.uid,
        userEmail: currentUser.email,
        shipmentId: formData.shipmentId,
        customerName: currentUser.displayName || currentUser.email,
        customerPhone: "",
        reason: formData.reason,
        description: formData.description,
        status: "Pending",
        pickupDate: formData.pickupDate,
        pickupTime: formData.pickupTime,
        refundAmount: 0,
        refundMethod: refundMethodMap[formData.refundMethod],
        refundStatus: "Pending",
        origin: "",
        destination: "",
        weight: 0,
        trackingUpdates: [
          {
            status: "Return Request Created",
            date: new Date().toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            }),
            time: new Date().toLocaleTimeString("en-US", {
              hour: "2-digit",
              minute: "2-digit",
            }),
            location: "System",
          },
        ],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      await addDoc(collection(db, "returns"), newReturn);
      showToast("✅ Return request submitted successfully!");
      setShowCreateModal(false);
      setFormData({
        shipmentId: "",
        reason: "",
        description: "",
        pickupDate: "",
        pickupTime: "",
        refundMethod: "wallet",
      });
      setFormErrors({});
    } catch (error) {
      console.error("Error creating return:", error);
      showToast("❌ Failed to create return request", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  // ========== TRACK RETURN ==========
  const handleTrackReturn = (ret) => {
    setSelectedReturn(ret);
    setShowTrackModal(true);
  };

  // ========== CANCEL RETURN ==========
  const handleCancelReturn = async (id) => {
    try {
      await updateDoc(doc(db, "returns", id), {
        status: "Cancelled",
        updatedAt: serverTimestamp(),
        trackingUpdates: [
          ...(returns.find((r) => r.id === id)?.trackingUpdates || []),
          {
            status: "Return Request Cancelled",
            date: new Date().toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            }),
            time: new Date().toLocaleTimeString("en-US", {
              hour: "2-digit",
              minute: "2-digit",
            }),
            location: "System",
          },
        ],
      });
      setCancelConfirm(null);
      showToast("✅ Return request cancelled");
    } catch (error) {
      console.error("Error cancelling return:", error);
      showToast(" Failed to cancel return", "error");
    }
  };

  // ========== HELPERS ==========
  const getStatusColor = (status) => {
    const colors = {
      Pending: "rt-status--pending",
      Approved: "rt-status--approved",
      "In Transit": "rt-status--transit",
      Completed: "rt-status--completed",
      Rejected: "rt-status--rejected",
      Cancelled: "rt-status--cancelled",
    };
    return colors[status] || "rt-status--default";
  };

  const getRefundStatusColor = (status) => {
    const colors = {
      Pending: "rt-refund--pending",
      Refunded: "rt-refund--refunded",
      "N/A": "rt-refund--na",
    };
    return colors[status] || "rt-refund--default";
  };

  const formatDate = (date) => {
    if (!date) return "N/A";
    if (typeof date === "string") return date;
    if (date.toDate)
      return date.toDate().toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    if (date instanceof Date) {
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    }
    return "N/A";
  };

  const getTodayDate = () => {
    return new Date().toISOString().split("T")[0];
  };

  // ========== LOADING STATE ==========
  if (loading) {
    return (
      <div className="rt-page">
        <div className="rt-loading">
          <div className="rt-spinner"></div>
          <p>Loading your returns...</p>
        </div>
      </div>
    );
  }

  // ========== RENDER ==========
  return (
    <div className="rt-page">
      {/* Toast Notification */}
      {toast && (
        <div className={`rt-toast rt-toast--${toast.type}`}>
          {toast.message}
        </div>
      )}

      {/* Header */}
      <div className="rt-header">
        <div className="rt-header__content">
          <div>
            <h1 className="rt-header__title">
              <span className="rt-header__emoji">↩️</span>
              Returns Management
            </h1>
            <p className="rt-header__subtitle">
              Manage return requests, track pickups & process refunds
            </p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="rt-btn rt-btn--white"
          >
            <span>➕</span> Initiate Return
          </button>
        </div>
      </div>

      <div className="rt-container">
        {/* Stats */}
        <div className="rt-stats">
          <div className="rt-stat-card">
            <div className="rt-stat-card__icon rt-stat--blue">
              <span>📦</span>
            </div>
            <div className="rt-stat-card__info">
              <p className="rt-stat-card__label">Total Returns</p>
              <p className="rt-stat-card__value">{stats.total}</p>
            </div>
          </div>
          <div className="rt-stat-card">
            <div className="rt-stat-card__icon rt-stat--amber">
              <span>⏳</span>
            </div>
            <div className="rt-stat-card__info">
              <p className="rt-stat-card__label">Pending</p>
              <p className="rt-stat-card__value">{stats.pending}</p>
            </div>
          </div>
          <div className="rt-stat-card">
            <div className="rt-stat-card__icon rt-stat--purple">
              <span>🚚</span>
            </div>
            <div className="rt-stat-card__info">
              <p className="rt-stat-card__label">In Transit</p>
              <p className="rt-stat-card__value">{stats.inTransit}</p>
            </div>
          </div>
          <div className="rt-stat-card">
            <div className="rt-stat-card__icon rt-stat--emerald">
              <span></span>
            </div>
            <div className="rt-stat-card__info">
              <p className="rt-stat-card__label">Total Refund Amount</p>
              <p className="rt-stat-card__value">
                ₹ {stats.totalRefund.toLocaleString("en-IN")}
              </p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="rt-tabs-wrapper">
          <div className="rt-tabs">
            <button
              onClick={() => setActiveTab("all")}
              className={`rt-tab ${activeTab === "all" ? "rt-tab--active" : ""}`}
            >
              <span>📋</span> All ({stats.total})
            </button>
            <button
              onClick={() => setActiveTab("pending")}
              className={`rt-tab ${activeTab === "pending" ? "rt-tab--active" : ""}`}
            >
              <span>⏳</span> Pending ({stats.pending})
            </button>
            <button
              onClick={() => setActiveTab("approved")}
              className={`rt-tab ${activeTab === "approved" ? "rt-tab--active" : ""}`}
            >
              <span>✅</span> Approved ({stats.approved})
            </button>
            <button
              onClick={() => setActiveTab("in-transit")}
              className={`rt-tab ${activeTab === "in-transit" ? "rt-tab--active" : ""}`}
            >
              <span></span> In Transit ({stats.inTransit})
            </button>
            <button
              onClick={() => setActiveTab("completed")}
              className={`rt-tab ${activeTab === "completed" ? "rt-tab--active" : ""}`}
            >
              <span>✅</span> Completed ({stats.completed})
            </button>
            <button
              onClick={() => setActiveTab("rejected")}
              className={`rt-tab ${activeTab === "rejected" ? "rt-tab--active" : ""}`}
            >
              <span>❌</span> Rejected ({stats.rejected})
            </button>
          </div>

          <div className="rt-tab-content">
            {/* Search */}
            <div className="rt-filter-bar">
              <div className="rt-search-box">
                <span className="rt-search-box__icon">🔍</span>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by return ID, shipment ID, customer name, or reason..."
                  className="rt-search-box__input"
                />
              </div>
            </div>

            {/* Returns List */}
            {filteredReturns.length === 0 ? (
              <div className="rt-empty-state">
                <span className="rt-empty-state__icon">📭</span>
                <h3 className="rt-empty-state__title">
                  {searchQuery ? "No returns found" : "No return requests yet"}
                </h3>
                <p className="rt-empty-state__desc">
                  {searchQuery
                    ? "Try a different search term"
                    : "Initiate your first return request"}
                </p>
                {!searchQuery && (
                  <button
                    onClick={() => setShowCreateModal(true)}
                    className="rt-btn rt-btn--primary"
                  >
                    <span></span> Initiate Return
                  </button>
                )}
              </div>
            ) : (
              <div className="rt-returns-list">
                {filteredReturns.map((ret) => (
                  <div key={ret.id} className="rt-return-card">
                    <div className="rt-return-card__header">
                      <div className="rt-return-card__id-section">
                        <h3 className="rt-return-card__id">
                          RTN-{ret.id.slice(-6).toUpperCase()}
                        </h3>
                        <span
                          className={`rt-status-badge ${getStatusColor(
                            ret.status
                          )}`}
                        >
                          {ret.status}
                        </span>
                      </div>
                      <div className="rt-return-card__actions">
                        <button
                          onClick={() => handleTrackReturn(ret)}
                          className="rt-icon-btn"
                          title="Track"
                        >
                          <span>📍</span>
                        </button>
                        {(ret.status === "Pending" ||
                          ret.status === "Approved") && (
                          <button
                            onClick={() => setCancelConfirm(ret.id)}
                            className="rt-icon-btn danger"
                            title="Cancel"
                          >
                            <span>❌</span>
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="rt-return-card__body">
                      <div className="rt-return-card__info-grid">
                        <div className="rt-info-item">
                          <span className="rt-info-label">Shipment ID</span>
                          <span className="rt-info-value mono">
                            {ret.shipmentId || "N/A"}
                          </span>
                        </div>
                        <div className="rt-info-item">
                          <span className="rt-info-label">Customer</span>
                          <span className="rt-info-value">
                            {ret.customerName || "N/A"}
                          </span>
                        </div>
                        <div className="rt-info-item">
                          <span className="rt-info-label">Phone</span>
                          <span className="rt-info-value">
                            {ret.customerPhone || "N/A"}
                          </span>
                        </div>
                        <div className="rt-info-item">
                          <span className="rt-info-label">Reason</span>
                          <span className="rt-info-value">{ret.reason}</span>
                        </div>
                        <div className="rt-info-item">
                          <span className="rt-info-label">Route</span>
                          <span className="rt-info-value">
                            {ret.origin || "?"} → {ret.destination || "?"}
                          </span>
                        </div>
                        <div className="rt-info-item">
                          <span className="rt-info-label">Weight</span>
                          <span className="rt-info-value">
                            {ret.weight ? `${ret.weight} KG` : "N/A"}
                          </span>
                        </div>
                      </div>

                      {ret.description && (
                        <p className="rt-return-card__description">
                          <span>📝</span> {ret.description}
                        </p>
                      )}

                      {ret.pickupDate && (
                        <div className="rt-return-card__pickup">
                          <span>📅</span>
                          <span>
                            Pickup: {ret.pickupDate} • {ret.pickupTime}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="rt-return-card__footer">
                      <div className="rt-return-card__refund">
                        <div className="rt-refund-info">
                          <span className="rt-refund-label">Refund Amount</span>
                          <span className="rt-refund-amount">
                            ₹ {(ret.refundAmount || 0).toLocaleString("en-IN")}
                          </span>
                        </div>
                        <div className="rt-refund-info">
                          <span className="rt-refund-label">Method</span>
                          <span className="rt-refund-method">
                            {ret.refundMethod || "N/A"}
                          </span>
                        </div>
                        <div className="rt-refund-info">
                          <span className="rt-refund-label">Status</span>
                          <span
                            className={`rt-refund-badge ${getRefundStatusColor(
                              ret.refundStatus
                            )}`}
                          >
                            {ret.refundStatus || "N/A"}
                          </span>
                        </div>
                      </div>
                      <div className="rt-return-card__meta">
                        <span className="rt-return-card__date">
                          Created: {formatDate(ret.createdAt)}
                        </span>
                        <button
                          onClick={() => handleTrackReturn(ret)}
                          className="rt-link-btn"
                        >
                          <span></span> Track Return
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Create Return Modal */}
      {showCreateModal && (
        <div
          className="rt-modal-overlay"
          onClick={() => !isSubmitting && setShowCreateModal(false)}
        >
          <div className="rt-modal" onClick={(e) => e.stopPropagation()}>
            <div className="rt-modal__header">
              <div>
                <h2>Initiate Return Request</h2>
                <p className="rt-modal__subtitle">
                  Create a new return for a shipment
                </p>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="rt-modal__close"
                disabled={isSubmitting}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateReturn}>
              <div className="rt-modal__body">
                <div className="rt-form-group">
                  <label className="rt-form-label">Shipment ID *</label>
                  <input
                    type="text"
                    name="shipmentId"
                    value={formData.shipmentId}
                    onChange={handleInputChange}
                    placeholder="Enter shipment ID (e.g., SHP-2026-4821)"
                    className={`rt-form-input ${
                      formErrors.shipmentId ? "error" : ""
                    }`}
                  />
                  {formErrors.shipmentId && (
                    <span className="rt-field-error">
                      ⚠️ {formErrors.shipmentId}
                    </span>
                  )}
                </div>

                <div className="rt-form-group">
                  <label className="rt-form-label">Reason for Return *</label>
                  <select
                    name="reason"
                    value={formData.reason}
                    onChange={handleInputChange}
                    className={`rt-form-select ${
                      formErrors.reason ? "error" : ""
                    }`}
                  >
                    <option value="">Select a reason</option>
                    <option value="Wrong Product">Wrong Product</option>
                    <option value="Damaged Product">Damaged Product</option>
                    <option value="Quality Issue">Quality Issue</option>
                    <option value="Missing Items">Missing Items</option>
                    <option value="Wrong Address">Wrong Address</option>
                    <option value="Customer Request">Customer Request</option>
                    <option value="Other">Other</option>
                  </select>
                  {formErrors.reason && (
                    <span className="rt-field-error">
                      ⚠️ {formErrors.reason}
                    </span>
                  )}
                </div>

                <div className="rt-form-group">
                  <label className="rt-form-label">Description</label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    placeholder="Provide details about the return reason..."
                    className="rt-form-textarea"
                    rows="3"
                    maxLength="500"
                  />
                  <span className="rt-field-hint">
                    {formData.description.length}/500 characters
                  </span>
                </div>

                <div className="rt-form-row">
                  <div className="rt-form-group">
                    <label className="rt-form-label">Pickup Date *</label>
                    <input
                      type="date"
                      name="pickupDate"
                      value={formData.pickupDate}
                      onChange={handleInputChange}
                      min={getTodayDate()}
                      className={`rt-form-input ${
                        formErrors.pickupDate ? "error" : ""
                      }`}
                    />
                    {formErrors.pickupDate && (
                      <span className="rt-field-error">
                        ⚠️ {formErrors.pickupDate}
                      </span>
                    )}
                  </div>
                  <div className="rt-form-group">
                    <label className="rt-form-label">Pickup Time Slot *</label>
                    <select
                      name="pickupTime"
                      value={formData.pickupTime}
                      onChange={handleInputChange}
                      className={`rt-form-select ${
                        formErrors.pickupTime ? "error" : ""
                      }`}
                    >
                      <option value="">Select time slot</option>
                      <option value="9:00 AM - 11:00 AM">
                        9:00 AM - 11:00 AM
                      </option>
                      <option value="11:00 AM - 1:00 PM">
                        11:00 AM - 1:00 PM
                      </option>
                      <option value="2:00 PM - 4:00 PM">
                        2:00 PM - 4:00 PM
                      </option>
                      <option value="4:00 PM - 6:00 PM">
                        4:00 PM - 6:00 PM
                      </option>
                    </select>
                    {formErrors.pickupTime && (
                      <span className="rt-field-error">
                        ⚠️ {formErrors.pickupTime}
                      </span>
                    )}
                  </div>
                </div>

                <div className="rt-form-group">
                  <label className="rt-form-label">Refund Method *</label>
                  <div className="rt-refund-selector">
                    <button
                      type="button"
                      onClick={() =>
                        setFormData({ ...formData, refundMethod: "wallet" })
                      }
                      className={`rt-refund-option ${
                        formData.refundMethod === "wallet" ? "selected" : ""
                      }`}
                    >
                      <span>💰</span>
                      <span>Wallet</span>
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setFormData({ ...formData, refundMethod: "upi" })
                      }
                      className={`rt-refund-option ${
                        formData.refundMethod === "upi" ? "selected" : ""
                      }`}
                    >
                      <span>📱</span>
                      <span>UPI</span>
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setFormData({ ...formData, refundMethod: "bank" })
                      }
                      className={`rt-refund-option ${
                        formData.refundMethod === "bank" ? "selected" : ""
                      }`}
                    >
                      <span>🏦</span>
                      <span>Bank</span>
                    </button>
                  </div>
                </div>

                <div className="rt-notice-box">
                  <span>ℹ️</span>
                  <div>
                    <p className="rt-notice-title">Return Policy</p>
                    <p className="rt-notice-text">
                      Returns must be initiated within 7 days of delivery.
                      Refund will be processed after quality check at origin
                      warehouse.
                    </p>
                  </div>
                </div>
              </div>

              <div className="rt-modal__footer">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="rt-btn rt-btn--outline"
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rt-btn rt-btn--primary"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <span className="rt-spinner-sm"></span>
                      Submitting...
                    </>
                  ) : (
                    <>
                      <span>↩️</span> Submit Return Request
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Track Return Modal */}
      {showTrackModal && selectedReturn && (
        <div
          className="rt-modal-overlay"
          onClick={() => setShowTrackModal(false)}
        >
          <div
            className="rt-modal rt-modal--lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="rt-modal__header">
              <div>
                <h2>
                  Track Return: RTN-{selectedReturn.id.slice(-6).toUpperCase()}
                </h2>
                <p className="rt-modal__subtitle">
                  Shipment: {selectedReturn.shipmentId || "N/A"}
                </p>
              </div>
              <button
                onClick={() => setShowTrackModal(false)}
                className="rt-modal__close"
              >
                ✕
              </button>
            </div>

            <div className="rt-modal__body">
              <div className="rt-track-summary">
                <div className="rt-track-summary__item">
                  <span className="rt-track-label">Status</span>
                  <span
                    className={`rt-status-badge ${getStatusColor(
                      selectedReturn.status
                    )}`}
                  >
                    {selectedReturn.status}
                  </span>
                </div>
                <div className="rt-track-summary__item">
                  <span className="rt-track-label">Route</span>
                  <span className="rt-track-value">
                    {selectedReturn.origin || "?"} →{" "}
                    {selectedReturn.destination || "?"}
                  </span>
                </div>
                <div className="rt-track-summary__item">
                  <span className="rt-track-label">Refund</span>
                  <span className="rt-track-value">
                    ₹ {(selectedReturn.refundAmount || 0).toLocaleString(
                      "en-IN"
                    )}
                  </span>
                </div>
              </div>

              <h3 className="rt-timeline-title">Tracking Timeline</h3>
              <div className="rt-timeline">
                {selectedReturn.trackingUpdates &&
                selectedReturn.trackingUpdates.length > 0 ? (
                  selectedReturn.trackingUpdates.map((update, index) => (
                    <div key={index} className="rt-timeline__item">
                      <div className="rt-timeline__dot"></div>
                      <div className="rt-timeline__content">
                        <div className="rt-timeline__header">
                          <span className="rt-timeline__status">
                            {update.status}
                          </span>
                          <span className="rt-timeline__time">
                            {update.date} • {update.time}
                          </span>
                        </div>
                        <p className="rt-timeline__location">
                          📍 {update.location}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p style={{ color: "#6b7280", textAlign: "center" }}>
                    No tracking updates yet
                  </p>
                )}
              </div>
            </div>

            <div className="rt-modal__footer">
              <button
                onClick={() => setShowTrackModal(false)}
                className="rt-btn rt-btn--outline"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Confirmation */}
      {cancelConfirm && (
        <div
          className="rt-modal-overlay"
          onClick={() => setCancelConfirm(null)}
        >
          <div
            className="rt-modal rt-modal--sm"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="rt-modal__body rt-modal__body--center">
              <span className="rt-confirm-icon">❌</span>
              <h3 className="rt-confirm-title">Cancel Return Request?</h3>
              <p className="rt-confirm-desc">
                This action cannot be undone. The return request will be
                permanently cancelled.
              </p>
            </div>
            <div className="rt-modal__footer">
              <button
                onClick={() => setCancelConfirm(null)}
                className="rt-btn rt-btn--outline"
              >
                Keep Request
              </button>
              <button
                onClick={() => handleCancelReturn(cancelConfirm)}
                className="rt-btn rt-btn--danger"
              >
                <span>❌</span> Cancel Return
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}