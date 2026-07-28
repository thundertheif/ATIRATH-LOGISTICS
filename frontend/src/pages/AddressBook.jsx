import { useState, useEffect } from "react";
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  writeBatch,
  getDocs,
} from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";
import "../styles/AddressBook.css";

export default function AddressBook() {
  const { currentUser } = useAuth();

  // ========== TABS & SEARCH ==========
  const [activeTab, setActiveTab] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  // ========== MODAL STATE ==========
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingAddress, setEditingAddress] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [setAsDefault, setSetAsDefault] = useState(null);

  // ========== FORM STATE ==========
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    type: "Home",
    addressLine1: "",
    addressLine2: "",
    city: "",
    state: "",
    pincode: "",
    landmark: "",
    gstin: "",
    isDefault: false,
  });

  // ========== REAL DATA FROM FIREBASE ==========
  const [addresses, setAddresses] = useState([]);

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
      collection(db, "addresses"),
      where("userId", "==", currentUser.uid),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const addressList = snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data(),
          createdAt: docSnap.data().createdAt?.toDate?.() || new Date(),
          updatedAt: docSnap.data().updatedAt?.toDate?.() || new Date(),
        }));
        setAddresses(addressList);
        setLoading(false);
      },
      (error) => {
        console.error("Error fetching addresses:", error);
        showToast("❌ Failed to load addresses", "error");
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [currentUser]);

  // ========== FILTERING ==========
  const filteredAddresses = addresses.filter((addr) => {
    const matchesTab =
      activeTab === "all" || addr.type?.toLowerCase() === activeTab;
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      searchQuery === "" ||
      addr.name?.toLowerCase().includes(q) ||
      addr.city?.toLowerCase().includes(q) ||
      addr.pincode?.includes(q) ||
      addr.phone?.includes(q);
    return matchesTab && matchesSearch;
  });

  const stats = {
    total: addresses.length,
    home: addresses.filter((a) => a.type === "Home").length,
    office: addresses.filter((a) => a.type === "Office").length,
    warehouse: addresses.filter((a) => a.type === "Warehouse").length,
    customer: addresses.filter((a) => a.type === "Customer").length,
  };

  // ========== INPUT HANDLERS ==========
  const handleNumericInput = (e, maxLength) => {
    const { name, value } = e.target;
    const numericValue = value.replace(/\D/g, "").slice(0, maxLength);
    setFormData((prev) => ({ ...prev, [name]: numericValue }));
    if (formErrors[name]) {
      setFormErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === "checkbox" ? checked : value,
    });
    if (formErrors[name]) {
      setFormErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  // ========== VALIDATION ==========
  const validateForm = () => {
    const errors = {};
    if (!formData.name.trim()) errors.name = "Name required";
    if (!formData.phone) errors.phone = "Phone required";
    else if (!/^[0-9]{10}$/.test(formData.phone))
      errors.phone = "Enter 10-digit number";
    if (!formData.addressLine1.trim())
      errors.addressLine1 = "Address required";
    if (!formData.city.trim()) errors.city = "City required";
    if (!formData.state.trim()) errors.state = "State required";
    if (!formData.pincode) errors.pincode = "Pincode required";
    else if (!/^[0-9]{6}$/.test(formData.pincode))
      errors.pincode = "Enter 6-digit pincode";
    if (formData.gstin && !/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(formData.gstin)) {
      errors.gstin = "Invalid GSTIN format";
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // ========== CRUD OPERATIONS ==========

  // CREATE / UPDATE
  const handleFormSubmit = async (e) => {
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
      // If setting as default, first unset other defaults
      if (formData.isDefault) {
        const defaultAddresses = addresses.filter(
          (a) => a.isDefault && a.id !== editingAddress?.id
        );
        const batch = writeBatch(db);
        defaultAddresses.forEach((addr) => {
          batch.update(doc(db, "addresses", addr.id), { isDefault: false });
        });
        await batch.commit();
      }

      if (editingAddress) {
        // UPDATE
        await updateDoc(doc(db, "addresses", editingAddress.id), {
          ...formData,
          updatedAt: serverTimestamp(),
        });
        showToast("✅ Address updated successfully!");
      } else {
        // CREATE
        await addDoc(collection(db, "addresses"), {
          ...formData,
          userId: currentUser.uid,
          userEmail: currentUser.email,
          shipmentsUsed: 0,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        showToast("✅ Address added successfully!");
      }

      setShowAddModal(false);
      setFormErrors({});
    } catch (error) {
      console.error("Error saving address:", error);
      showToast("❌ Failed to save address", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  // DELETE
  const handleDelete = async (id) => {
    try {
      await deleteDoc(doc(db, "addresses", id));
      setDeleteConfirm(null);
      showToast("✅ Address deleted successfully!");
    } catch (error) {
      console.error("Error deleting address:", error);
      showToast("❌ Failed to delete address", "error");
    }
  };

  // SET AS DEFAULT
  const handleSetDefault = async (id) => {
    try {
      const batch = writeBatch(db);
      
      // Unset all defaults
      addresses.forEach((addr) => {
        if (addr.isDefault) {
          batch.update(doc(db, "addresses", addr.id), { isDefault: false });
        }
      });
      
      // Set new default
      batch.update(doc(db, "addresses", id), {
        isDefault: true,
        updatedAt: serverTimestamp(),
      });
      
      await batch.commit();
      setSetAsDefault(null);
      showToast("⭐ Default address set successfully!");
    } catch (error) {
      console.error("Error setting default:", error);
      showToast("❌ Failed to set default", "error");
    }
  };

  // ========== MODAL HANDLERS ==========
  const handleAddNew = () => {
    setEditingAddress(null);
    setFormData({
      name: "",
      phone: "",
      email: "",
      type: "Home",
      addressLine1: "",
      addressLine2: "",
      city: "",
      state: "",
      pincode: "",
      landmark: "",
      gstin: "",
      isDefault: false,
    });
    setFormErrors({});
    setShowAddModal(true);
  };

  const handleEdit = (addr) => {
    setEditingAddress(addr);
    setFormData({
      name: addr.name || "",
      phone: addr.phone || "",
      email: addr.email || "",
      type: addr.type || "Home",
      addressLine1: addr.addressLine1 || "",
      addressLine2: addr.addressLine2 || "",
      city: addr.city || "",
      state: addr.state || "",
      pincode: addr.pincode || "",
      landmark: addr.landmark || "",
      gstin: addr.gstin || "",
      isDefault: addr.isDefault || false,
    });
    setFormErrors({});
    setShowAddModal(true);
  };

  // ========== HELPERS ==========
  const getTypeIcon = (type) => {
    const icons = {
      Home: "🏠",
      Office: "🏢",
      Warehouse: "🏭",
      Customer: "👤",
    };
    return icons[type] || "📍";
  };

  const getTypeColor = (type) => {
    const colors = {
      Home: "ab-type--home",
      Office: "ab-type--office",
      Warehouse: "ab-type--warehouse",
      Customer: "ab-type--customer",
    };
    return colors[type] || "ab-type--default";
  };

  const formatDate = (date) => {
    if (!date) return "N/A";
    if (typeof date === "string") return date;
    if (date.toDate) return date.toDate().toLocaleDateString("en-IN", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
    if (date instanceof Date) {
      return date.toLocaleDateString("en-IN", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    }
    return "N/A";
  };

  // ========== LOADING STATE ==========
  if (loading) {
    return (
      <div className="ab-page">
        <div className="ab-loading">
          <div className="ab-spinner"></div>
          <p>Loading your addresses...</p>
        </div>
      </div>
    );
  }

  // ========== RENDER ==========
  return (
    <div className="ab-page">
      {/* Toast Notification */}
      {toast && (
        <div className={`ab-toast ab-toast--${toast.type}`}>
          {toast.message}
        </div>
      )}

      {/* Header */}
      <div className="ab-header">
        <div className="ab-header__content">
          <div>
            <h1 className="ab-header__title">
              <span className="ab-header__emoji">📒</span>
              Address Book
            </h1>
            <p className="ab-header__subtitle">
              Manage your saved pickup & delivery addresses
            </p>
          </div>
          <button onClick={handleAddNew} className="ab-btn ab-btn--white">
            <span>➕</span> Add New Address
          </button>
        </div>
      </div>

      <div className="ab-container">
        {/* Stats */}
        <div className="ab-stats">
          <div className="ab-stat-card">
            <div className="ab-stat-card__icon ab-stat--blue">
              <span>📍</span>
            </div>
            <div className="ab-stat-card__info">
              <p className="ab-stat-card__label">Total Addresses</p>
              <p className="ab-stat-card__value">{stats.total}</p>
            </div>
          </div>
          <div className="ab-stat-card">
            <div className="ab-stat-card__icon ab-stat--emerald">
              <span>🏠</span>
            </div>
            <div className="ab-stat-card__info">
              <p className="ab-stat-card__label">Home</p>
              <p className="ab-stat-card__value">{stats.home}</p>
            </div>
          </div>
          <div className="ab-stat-card">
            <div className="ab-stat-card__icon ab-stat--amber">
              <span>🏢</span>
            </div>
            <div className="ab-stat-card__info">
              <p className="ab-stat-card__label">Office</p>
              <p className="ab-stat-card__value">{stats.office}</p>
            </div>
          </div>
          <div className="ab-stat-card">
            <div className="ab-stat-card__icon ab-stat--purple">
              <span>🏭</span>
            </div>
            <div className="ab-stat-card__info">
              <p className="ab-stat-card__label">Warehouse</p>
              <p className="ab-stat-card__value">{stats.warehouse}</p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="ab-tabs-wrapper">
          <div className="ab-tabs">
            <button
              onClick={() => setActiveTab("all")}
              className={`ab-tab ${activeTab === "all" ? "ab-tab--active" : ""}`}
            >
              <span>📋</span> All ({stats.total})
            </button>
            <button
              onClick={() => setActiveTab("home")}
              className={`ab-tab ${activeTab === "home" ? "ab-tab--active" : ""}`}
            >
              <span>🏠</span> Home ({stats.home})
            </button>
            <button
              onClick={() => setActiveTab("office")}
              className={`ab-tab ${activeTab === "office" ? "ab-tab--active" : ""}`}
            >
              <span>🏢</span> Office ({stats.office})
            </button>
            <button
              onClick={() => setActiveTab("warehouse")}
              className={`ab-tab ${activeTab === "warehouse" ? "ab-tab--active" : ""}`}
            >
              <span>🏭</span> Warehouse ({stats.warehouse})
            </button>
            <button
              onClick={() => setActiveTab("customer")}
              className={`ab-tab ${activeTab === "customer" ? "ab-tab--active" : ""}`}
            >
              <span>👤</span> Customer ({stats.customer})
            </button>
          </div>

          <div className="ab-tab-content">
            {/* Search */}
            <div className="ab-filter-bar">
              <div className="ab-search-box">
                <span className="ab-search-box__icon">🔍</span>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by name, city, pincode, or phone..."
                  className="ab-search-box__input"
                />
              </div>
            </div>

            {/* Address List */}
            {filteredAddresses.length === 0 ? (
              <div className="ab-empty-state">
                <span className="ab-empty-state__icon">📭</span>
                <h3 className="ab-empty-state__title">
                  {searchQuery ? "No addresses found" : "No addresses yet"}
                </h3>
                <p className="ab-empty-state__desc">
                  {searchQuery
                    ? "Try a different search term"
                    : "Add your first address to get started"}
                </p>
                {!searchQuery && (
                  <button
                    onClick={handleAddNew}
                    className="ab-btn ab-btn--primary"
                  >
                    <span>➕</span> Add New Address
                  </button>
                )}
              </div>
            ) : (
              <div className="ab-address-grid">
                {filteredAddresses.map((addr) => (
                  <div
                    key={addr.id}
                    className={`ab-address-card ${addr.isDefault ? "ab-address-card--default" : ""}`}
                  >
                    {addr.isDefault && (
                      <div className="ab-address-card__default-badge">
                        <span>⭐</span> Default Address
                      </div>
                    )}

                    <div className="ab-address-card__header">
                      <div className={`ab-type-badge ${getTypeColor(addr.type)}`}>
                        <span>{getTypeIcon(addr.type)}</span>
                        <span>{addr.type}</span>
                      </div>
                      <div className="ab-address-card__menu">
                        <button
                          onClick={() => handleEdit(addr)}
                          className="ab-icon-btn"
                          title="Edit"
                        >
                          <span>✏️</span>
                        </button>
                        <button
                          onClick={() => setDeleteConfirm(addr.id)}
                          className="ab-icon-btn danger"
                          title="Delete"
                        >
                          <span>🗑️</span>
                        </button>
                      </div>
                    </div>

                    <div className="ab-address-card__body">
                      <h3 className="ab-address-card__name">{addr.name}</h3>
                      <p className="ab-address-card__phone">📞 {addr.phone}</p>
                      {addr.email && (
                        <p className="ab-address-card__email">✉️ {addr.email}</p>
                      )}
                      <p className="ab-address-card__address">
                        {addr.addressLine1}
                        {addr.addressLine2 && <>, {addr.addressLine2}</>}
                      </p>
                      <p className="ab-address-card__city">
                        {addr.city}, {addr.state} - {addr.pincode}
                      </p>
                      {addr.landmark && (
                        <p className="ab-address-card__landmark">
                          <span>📍</span> {addr.landmark}
                        </p>
                      )}
                      {addr.gstin && (
                        <p className="ab-address-card__gstin">
                          <span>🧾</span> GSTIN: {addr.gstin}
                        </p>
                      )}
                    </div>

                    <div className="ab-address-card__footer">
                      <span className="ab-address-card__date">
                        Added: {formatDate(addr.createdAt)} • Used:{" "}
                        {addr.shipmentsUsed || 0} times
                      </span>
                      {!addr.isDefault && (
                        <button
                          onClick={() => setSetAsDefault(addr.id)}
                          className="ab-link-btn"
                        >
                          <span>⭐</span> Set as Default
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add/Edit Modal */}
      {showAddModal && (
        <div
          className="ab-modal-overlay"
          onClick={() => !isSubmitting && setShowAddModal(false)}
        >
          <div className="ab-modal" onClick={(e) => e.stopPropagation()}>
            <div className="ab-modal__header">
              <div>
                <h2>{editingAddress ? "Edit Address" : "Add New Address"}</h2>
                <p className="ab-modal__subtitle">
                  {editingAddress
                    ? "Update address details"
                    : "Save a new address for quick access"}
                </p>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="ab-modal__close"
                disabled={isSubmitting}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleFormSubmit}>
              <div className="ab-modal__body">
                <div className="ab-form-row ab-form-row-2">
                  <div className="ab-form-group">
                    <label className="ab-form-label">Full Name *</label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      placeholder="Enter full name"
                      className={`ab-form-input ${formErrors.name ? "error" : ""}`}
                    />
                    {formErrors.name && (
                      <span className="ab-field-error">⚠️ {formErrors.name}</span>
                    )}
                  </div>
                  <div className="ab-form-group">
                    <label className="ab-form-label">Phone Number *</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      name="phone"
                      value={formData.phone}
                      onChange={(e) => handleNumericInput(e, 10)}
                      placeholder="10-digit mobile"
                      maxLength="10"
                      className={`ab-form-input ${formErrors.phone ? "error" : ""}`}
                    />
                    {formErrors.phone && (
                      <span className="ab-field-error">⚠️ {formErrors.phone}</span>
                    )}
                  </div>
                </div>

                <div className="ab-form-group">
                  <label className="ab-form-label">Email</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    placeholder="email@example.com"
                    className="ab-form-input"
                  />
                </div>

                <div className="ab-form-group">
                  <label className="ab-form-label">Address Type *</label>
                  <div className="ab-type-selector">
                    {["Home", "Office", "Warehouse", "Customer"].map((type) => (
                      <button
                        key={type}
                        type="button"
                        onClick={() =>
                          setFormData({ ...formData, type })
                        }
                        className={`ab-type-option ${formData.type === type ? "selected" : ""}`}
                      >
                        <span>{getTypeIcon(type)}</span>
                        <span>{type}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="ab-form-group">
                  <label className="ab-form-label">Address Line 1 *</label>
                  <input
                    type="text"
                    name="addressLine1"
                    value={formData.addressLine1}
                    onChange={handleInputChange}
                    placeholder="House/Plot No, Street, Area"
                    className={`ab-form-input ${formErrors.addressLine1 ? "error" : ""}`}
                  />
                  {formErrors.addressLine1 && (
                    <span className="ab-field-error">⚠️ {formErrors.addressLine1}</span>
                  )}
                </div>

                <div className="ab-form-group">
                  <label className="ab-form-label">Address Line 2</label>
                  <input
                    type="text"
                    name="addressLine2"
                    value={formData.addressLine2}
                    onChange={handleInputChange}
                    placeholder="Locality, Landmark (optional)"
                    className="ab-form-input"
                  />
                </div>

                <div className="ab-form-row ab-form-row-3">
                  <div className="ab-form-group">
                    <label className="ab-form-label">City *</label>
                    <input
                      type="text"
                      name="city"
                      value={formData.city}
                      onChange={handleInputChange}
                      placeholder="City"
                      className={`ab-form-input ${formErrors.city ? "error" : ""}`}
                    />
                    {formErrors.city && (
                      <span className="ab-field-error">⚠️ {formErrors.city}</span>
                    )}
                  </div>
                  <div className="ab-form-group">
                    <label className="ab-form-label">State *</label>
                    <input
                      type="text"
                      name="state"
                      value={formData.state}
                      onChange={handleInputChange}
                      placeholder="State"
                      className={`ab-form-input ${formErrors.state ? "error" : ""}`}
                    />
                    {formErrors.state && (
                      <span className="ab-field-error">⚠️ {formErrors.state}</span>
                    )}
                  </div>
                  <div className="ab-form-group">
                    <label className="ab-form-label">Pincode *</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      name="pincode"
                      value={formData.pincode}
                      onChange={(e) => handleNumericInput(e, 6)}
                      placeholder="6-digit pincode"
                      maxLength="6"
                      className={`ab-form-input ${formErrors.pincode ? "error" : ""}`}
                    />
                    {formErrors.pincode && (
                      <span className="ab-field-error">⚠️ {formErrors.pincode}</span>
                    )}
                  </div>
                </div>

                <div className="ab-form-row ab-form-row-2">
                  <div className="ab-form-group">
                    <label className="ab-form-label">Landmark</label>
                    <input
                      type="text"
                      name="landmark"
                      value={formData.landmark}
                      onChange={handleInputChange}
                      placeholder="Nearby landmark"
                      className="ab-form-input"
                    />
                  </div>
                  <div className="ab-form-group">
                    <label className="ab-form-label">GSTIN (Optional)</label>
                    <input
                      type="text"
                      name="gstin"
                      value={formData.gstin}
                      onChange={handleInputChange}
                      placeholder="For business addresses"
                      maxLength="15"
                      className={`ab-form-input ${formErrors.gstin ? "error" : ""}`}
                      style={{ textTransform: "uppercase" }}
                    />
                    {formErrors.gstin && (
                      <span className="ab-field-error">⚠️ {formErrors.gstin}</span>
                    )}
                  </div>
                </div>

                <label className="ab-checkbox-label">
                  <input
                    type="checkbox"
                    name="isDefault"
                    checked={formData.isDefault}
                    onChange={handleInputChange}
                  />
                  <span>Set as default address</span>
                </label>
              </div>

              <div className="ab-modal__footer">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="ab-btn ab-btn--outline"
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="ab-btn ab-btn--primary"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <span className="ab-spinner-sm"></span>
                      {editingAddress ? "Updating..." : "Saving..."}
                    </>
                  ) : editingAddress ? (
                    "Update Address"
                  ) : (
                    "Save Address"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {deleteConfirm && (
        <div
          className="ab-modal-overlay"
          onClick={() => setDeleteConfirm(null)}
        >
          <div className="ab-modal ab-modal--sm" onClick={(e) => e.stopPropagation()}>
            <div className="ab-modal__body ab-modal__body--center">
              <span className="ab-confirm-icon">🗑️</span>
              <h3 className="ab-confirm-title">Delete Address?</h3>
              <p className="ab-confirm-desc">
                This action cannot be undone. The address will be permanently removed.
              </p>
            </div>
            <div className="ab-modal__footer">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="ab-btn ab-btn--outline"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                className="ab-btn ab-btn--danger"
              >
                <span>🗑️</span> Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Set Default Confirmation */}
      {setAsDefault && (
        <div
          className="ab-modal-overlay"
          onClick={() => setSetAsDefault(null)}
        >
          <div className="ab-modal ab-modal--sm" onClick={(e) => e.stopPropagation()}>
            <div className="ab-modal__body ab-modal__body--center">
              <span className="ab-confirm-icon">⭐</span>
              <h3 className="ab-confirm-title">Set as Default?</h3>
              <p className="ab-confirm-desc">
                This address will be used as the default for new shipments.
              </p>
            </div>
            <div className="ab-modal__footer">
              <button
                onClick={() => setSetAsDefault(null)}
                className="ab-btn ab-btn--outline"
              >
                Cancel
              </button>
              <button
                onClick={() => handleSetDefault(setAsDefault)}
                className="ab-btn ab-btn--primary"
              >
                <span>⭐</span> Set as Default
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}