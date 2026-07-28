import { useState, useEffect } from "react";
import { doc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { updatePassword, EmailAuthProvider, reauthenticateWithCredential } from "firebase/auth";
import { db, auth } from "../firebase";
import { useAuth } from "../context/AuthContext";
import "./Profile.css";

export default function Profile() {
  const { currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState("personal");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [toast, setToast] = useState(null);

  const [profileData, setProfileData] = useState({
    displayName: "",
    email: "",
    phone: "",
    company: "",
    gstNumber: "",
    address: "",
    city: "",
    state: "",
    pincode: "",
    country: "India",
    bio: "",
    website: ""
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: ""
  });

  const [preferences, setPreferences] = useState({
    emailNotifications: true,
    smsAlerts: false,
    marketingEmails: false,
    orderUpdates: true,
    language: "English"
  });

  const [kycStatus, setKycStatus] = useState({
    aadhar: { status: "not-uploaded", date: null },
    pan: { status: "not-uploaded", date: null },
    gst: { status: "not-uploaded", date: null },
    business: { status: "not-uploaded", date: null }
  });

  useEffect(() => {
    const fetchProfile = async () => {
      if (!currentUser?.uid) return;
      
      try {
        setLoading(true);
        const userDoc = await getDoc(doc(db, "users", currentUser.uid));
        
        if (userDoc.exists()) {
          const data = userDoc.data();
          setProfileData({
            displayName: data.displayName || currentUser.displayName || "",
            email: data.email || currentUser.email || "",
            phone: data.phone || "",
            company: data.company || "",
            gstNumber: data.gstNumber || "",
            address: data.address || "",
            city: data.city || "",
            state: data.state || "",
            pincode: data.pincode || "",
            country: data.country || "India",
            bio: data.bio || "",
            website: data.website || ""
          });
          
          if (data.preferences) setPreferences(data.preferences);
          if (data.kycStatus) setKycStatus(data.kycStatus);
        } else {
          setProfileData(prev => ({
            ...prev,
            displayName: currentUser.displayName || "",
            email: currentUser.email || ""
          }));
        }
      } catch (error) {
        console.error("Error fetching profile:", error);
        showToast("Failed to load profile", 'error');
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [currentUser]);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const handleProfileChange = (e) => {
    const { name, value } = e.target;
    setProfileData(prev => ({ ...prev, [name]: value }));
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setSaving(true);
    
    try {
      await updateDoc(doc(db, "users", currentUser.uid), {
        ...profileData,
        preferences,
        kycStatus,
        updatedAt: serverTimestamp()
      });
      
      showToast("✅ Profile updated successfully!", 'success');
    } catch (error) {
      console.error("Error updating profile:", error);
      showToast("❌ Failed to update profile", 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      showToast("❌ Passwords don't match", 'error');
      return;
    }
    
    if (passwordData.newPassword.length < 8) {
      showToast("❌ Password must be at least 8 characters", 'error');
      return;
    }
    
    setSaving(true);
    
    try {
      const credential = EmailAuthProvider.credential(
        currentUser.email,
        passwordData.currentPassword
      );
      
      await reauthenticateWithCredential(currentUser, credential);
      await updatePassword(currentUser, passwordData.newPassword);
      
      showToast("✅ Password changed successfully!", 'success');
      setPasswordData({ currentPassword: "", newPassword: "", confirmPassword: "" });
      setShowPasswordModal(false);
    } catch (error) {
      console.error("Error changing password:", error);
      showToast("❌ Failed to change password. Check current password.", 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAccount = () => {
    if (!window.confirm("⚠️ Are you sure you want to delete your account? This action cannot be undone!")) {
      return;
    }
    
    showToast("Account deletion is disabled for safety. Contact support.", 'error');
  };

  if (loading) {
    return (
      <div id="profile-root">
        <div className="loading-screen">
          <div className="spinner"></div>
          <p>Loading your profile...</p>
        </div>
      </div>
    );
  }

  const userInitial = (profileData.displayName || 'U').charAt(0).toUpperCase();
  const verifiedCount = Object.values(kycStatus).filter(k => k.status === 'verified').length;

  return (
    <div id="profile-root">
      {/* Page Header */}
      <div className="page-header">
        <h1>👤 My Profile</h1>
        <p>Manage your account, security settings, and KYC verification</p>
      </div>

      {/* Profile Overview Card */}
      <div className="profile-overview">
        <div className="profile-avatar-section">
          <div className="profile-avatar-large">{userInitial}</div>
          <div className="profile-basic-info">
            <h2>{profileData.displayName || 'User'}</h2>
            <p className="profile-email">{profileData.email}</p>
            <div className="profile-badges">
              <span className="badge verified">✓ Verified</span>
              {profileData.gstNumber && <span className="badge gst">GST Registered</span>}
              {verifiedCount >= 3 && <span className="badge premium">⭐ Premium</span>}
            </div>
          </div>
        </div>

        <div className="profile-stats-grid">
          <div className="stat-card">
            <div className="stat-icon">📦</div>
            <div className="stat-value">0</div>
            <div className="stat-label">Total Shipments</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">✅</div>
            <div className="stat-value">{verifiedCount}/4</div>
            <div className="stat-label">KYC Verified</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">💰</div>
            <div className="stat-value">₹0</div>
            <div className="stat-label">Total Spent</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">📅</div>
            <div className="stat-value">{new Date().getFullYear()}</div>
            <div className="stat-label">Member Since</div>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="profile-tabs">
        <button className={`tab-btn ${activeTab === "personal" ? "active" : ""}`} onClick={() => setActiveTab("personal")}>
          👤 Personal Info
        </button>
        <button className={`tab-btn ${activeTab === "security" ? "active" : ""}`} onClick={() => setActiveTab("security")}>
          🔒 Security
        </button>
        <button className={`tab-btn ${activeTab === "preferences" ? "active" : ""}`} onClick={() => setActiveTab("preferences")}>
          ⚙️ Preferences
        </button>
        <button className={`tab-btn ${activeTab === "kyc" ? "active" : ""}`} onClick={() => setActiveTab("kyc")}>
          🆔 KYC Verification
        </button>
      </div>

      {/* TAB 1: PERSONAL INFO */}
      {activeTab === "personal" && (
        <div className="profile-card">
          <h2>📝 Personal Information</h2>
          <p className="section-desc">Update your personal and business details. This information will be used for invoices and communications.</p>
          
          <form onSubmit={handleSaveProfile} className="profile-form">
            <div className="form-grid">
              <div className="form-group">
                <label>Full Name *</label>
                <input 
                  type="text" 
                  name="displayName"
                  value={profileData.displayName}
                  onChange={handleProfileChange}
                  placeholder="Enter your full name"
                  required
                />
              </div>

              <div className="form-group">
                <label>Email Address *</label>
                <input 
                  type="email" 
                  name="email"
                  value={profileData.email}
                  onChange={handleProfileChange}
                  placeholder="your@email.com"
                  required
                  disabled
                />
                <span className="field-hint">Email cannot be changed. Contact support for email update.</span>
              </div>

              <div className="form-group">
                <label>Phone Number</label>
                <input 
                  type="tel" 
                  name="phone"
                  value={profileData.phone}
                  onChange={handleProfileChange}
                  placeholder="+91 XXXXX XXXXX"
                  maxLength="10"
                />
              </div>

              <div className="form-group">
                <label>Company / Business Name</label>
                <input 
                  type="text" 
                  name="company"
                  value={profileData.company}
                  onChange={handleProfileChange}
                  placeholder="Your company name"
                />
              </div>

              <div className="form-group">
                <label>GST Number (Optional)</label>
                <input 
                  type="text" 
                  name="gstNumber"
                  value={profileData.gstNumber}
                  onChange={handleProfileChange}
                  placeholder="22AAAAA0000A1Z5"
                  maxLength="15"
                />
                <span className="field-hint">Required for B2B invoices and tax compliance.</span>
              </div>

              <div className="form-group">
                <label>Website</label>
                <input 
                  type="url" 
                  name="website"
                  value={profileData.website}
                  onChange={handleProfileChange}
                  placeholder="https://yourcompany.com"
                />
              </div>

              <div className="form-group full-width">
                <label>Street Address</label>
                <input 
                  type="text" 
                  name="address"
                  value={profileData.address}
                  onChange={handleProfileChange}
                  placeholder="House no, Street, Area, Landmark"
                />
              </div>

              <div className="form-group">
                <label>City</label>
                <input 
                  type="text" 
                  name="city"
                  value={profileData.city}
                  onChange={handleProfileChange}
                  placeholder="City"
                />
              </div>

              <div className="form-group">
                <label>State</label>
                <input 
                  type="text" 
                  name="state"
                  value={profileData.state}
                  onChange={handleProfileChange}
                  placeholder="State"
                />
              </div>

              <div className="form-group">
                <label>Pincode</label>
                <input 
                  type="text" 
                  name="pincode"
                  value={profileData.pincode}
                  onChange={handleProfileChange}
                  placeholder="6-digit pincode"
                  maxLength="6"
                />
              </div>

              <div className="form-group">
                <label>Country</label>
                <select 
                  name="country"
                  value={profileData.country}
                  onChange={handleProfileChange}
                >
                  <option value="India">India</option>
                  <option value="USA">USA</option>
                  <option value="UK">UK</option>
                  <option value="Canada">Canada</option>
                  <option value="Australia">Australia</option>
                  <option value="UAE">UAE</option>
                </select>
              </div>

              <div className="form-group full-width">
                <label>Bio / About</label>
                <textarea 
                  name="bio"
                  value={profileData.bio}
                  onChange={handleProfileChange}
                  placeholder="Tell us about yourself or your business (max 500 characters)..."
                  rows="4"
                  maxLength="500"
                />
                <span className="field-hint">{profileData.bio.length}/500 characters</span>
              </div>
            </div>

            <button type="submit" className="submit-btn" disabled={saving}>
              {saving ? "⏳ Saving Changes..." : "💾 Save Profile Changes"}
            </button>
          </form>
        </div>
      )}

      {/* TAB 2: SECURITY */}
      {activeTab === "security" && (
        <div className="profile-card">
          <h2>🔒 Security Settings</h2>
          <p className="section-desc">Manage your password and account security. Keep your account safe with these options.</p>
          
          <div className="security-section">
            <div className="security-item">
              <div className="security-info">
                <h3>🔑 Password</h3>
                <p>Last changed: Never</p>
              </div>
              <button className="security-btn" onClick={() => setShowPasswordModal(true)}>
                Change Password
              </button>
            </div>

            <div className="security-item">
              <div className="security-info">
                <h3>📱 Two-Factor Authentication</h3>
                <p>Add extra security with SMS or authenticator app</p>
              </div>
              <label className="toggle-switch">
                <input type="checkbox" />
                <span className="slider"></span>
              </label>
            </div>

            <div className="security-item">
              <div className="security-info">
                <h3>📧 Login Alerts</h3>
                <p>Get notified when someone logs into your account</p>
              </div>
              <label className="toggle-switch">
                <input type="checkbox" defaultChecked />
                <span className="slider"></span>
              </label>
            </div>

            <div className="security-item">
              <div className="security-info">
                <h3>🔐 Active Sessions</h3>
                <p>1 device currently logged in</p>
              </div>
              <button className="security-btn">
                View Sessions
              </button>
            </div>

            <div className="security-item danger-zone">
              <div className="security-info">
                <h3>⚠️ Delete Account</h3>
                <p>Permanently delete your account and all data. This cannot be undone.</p>
              </div>
              <button className="security-btn danger" onClick={handleDeleteAccount}>
                Delete Account
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: PREFERENCES */}
      {activeTab === "preferences" && (
        <div className="profile-card">
          <h2>⚙️ Notification Preferences</h2>
          <p className="section-desc">Control how and when we communicate with you. Choose what notifications you want to receive.</p>
          
          <div className="preferences-section">
            <h3>📧 Communication Channels</h3>
            
            <div className="preference-item">
              <label className="toggle-label">
                <input 
                  type="checkbox"
                  checked={preferences.emailNotifications}
                  onChange={(e) => setPreferences({...preferences, emailNotifications: e.target.checked})}
                />
                <div className="toggle-text">
                  <strong>Email Notifications</strong>
                  <p>Receive shipment updates, invoices, and important alerts via email</p>
                </div>
              </label>
            </div>

            <div className="preference-item">
              <label className="toggle-label">
                <input 
                  type="checkbox"
                  checked={preferences.smsAlerts}
                  onChange={(e) => setPreferences({...preferences, smsAlerts: e.target.checked})}
                />
                <div className="toggle-text">
                  <strong>SMS Alerts</strong>
                  <p>Get critical updates via SMS (delivery confirmations, delays, emergencies)</p>
                </div>
              </label>
            </div>

            <div className="preference-item">
              <label className="toggle-label">
                <input 
                  type="checkbox"
                  checked={preferences.orderUpdates}
                  onChange={(e) => setPreferences({...preferences, orderUpdates: e.target.checked})}
                />
                <div className="toggle-text">
                  <strong>Order Status Updates</strong>
                  <p>Real-time notifications about your shipment status changes</p>
                </div>
              </label>
            </div>

            <div className="preference-item">
              <label className="toggle-label">
                <input 
                  type="checkbox"
                  checked={preferences.marketingEmails}
                  onChange={(e) => setPreferences({...preferences, marketingEmails: e.target.checked})}
                />
                <div className="toggle-text">
                  <strong>Marketing & Promotions</strong>
                  <p>Receive special offers, discounts, and newsletter updates</p>
                </div>
              </label>
            </div>
          </div>

          <div className="preferences-section">
            <h3>🌐 Regional Settings</h3>
            
            <div className="form-grid">
              <div className="form-group">
                <label>Preferred Language</label>
                <select 
                  value={preferences.language}
                  onChange={(e) => setPreferences({...preferences, language: e.target.value})}
                >
                  <option value="English">English (Global)</option>
                  <option value="Hindi">Hindi (हिंदी)</option>
                  <option value="Telugu">Telugu (తెలుగు)</option>
                  <option value="Tamil">Tamil (தமிழ்)</option>
                  <option value="Kannada">Kannada (ಕನ್ನಡ)</option>
                </select>
              </div>

              <div className="form-group">
                <label>Date Format</label>
                <select>
                  <option value="DD/MM/YYYY">DD/MM/YYYY (31/12/2024)</option>
                  <option value="MM/DD/YYYY">MM/DD/YYYY (12/31/2024)</option>
                  <option value="YYYY-MM-DD">YYYY-MM-DD (2024-12-31)</option>
                </select>
              </div>
            </div>
          </div>

          <button className="submit-btn" onClick={handleSaveProfile} disabled={saving}>
            {saving ? "⏳ Saving..." : "💾 Save Preferences"}
          </button>
        </div>
      )}

      {/* TAB 4: KYC VERIFICATION */}
      {activeTab === "kyc" && (
        <div className="profile-card">
          <h2>🆔 KYC Verification</h2>
          <p className="section-desc">Complete your KYC to unlock premium features, higher limits, and faster processing. Verified accounts get priority support.</p>
          
          <div className="kyc-grid">
            <div className={`kyc-item ${kycStatus.aadhar.status}`}>
              <div className="kyc-icon">🆔</div>
              <div className="kyc-info">
                <h3>Aadhar Card</h3>
                <p>Status: <strong>{kycStatus.aadhar.status === 'verified' ? '✓ Verified' : kycStatus.aadhar.status === 'pending' ? '⏳ Pending' : '❌ Not Uploaded'}</strong></p>
                {kycStatus.aadhar.date && <p className="kyc-date">Verified on: {kycStatus.aadhar.date}</p>}
                <p className="kyc-desc">Required for identity verification and compliance.</p>
                <button className={`kyc-btn ${kycStatus.aadhar.status === 'not-uploaded' ? 'primary' : ''}`}>
                  {kycStatus.aadhar.status === 'verified' ? 'View Document' : 'Upload Aadhar'}
                </button>
              </div>
            </div>

            <div className={`kyc-item ${kycStatus.pan.status}`}>
              <div className="kyc-icon">💳</div>
              <div className="kyc-info">
                <h3>PAN Card</h3>
                <p>Status: <strong>{kycStatus.pan.status === 'verified' ? '✓ Verified' : kycStatus.pan.status === 'pending' ? '⏳ Pending' : '❌ Not Uploaded'}</strong></p>
                {kycStatus.pan.date && <p className="kyc-date">Verified on: {kycStatus.pan.date}</p>}
                <p className="kyc-desc">Required for tax compliance and high-value transactions.</p>
                <button className={`kyc-btn ${kycStatus.pan.status === 'not-uploaded' ? 'primary' : ''}`}>
                  {kycStatus.pan.status === 'verified' ? 'View Document' : 'Upload PAN'}
                </button>
              </div>
            </div>

            <div className={`kyc-item ${kycStatus.gst.status}`}>
              <div className="kyc-icon">📋</div>
              <div className="kyc-info">
                <h3>GST Certificate</h3>
                <p>Status: <strong>{kycStatus.gst.status === 'verified' ? '✓ Verified' : kycStatus.gst.status === 'pending' ? '⏳ Pending' : '❌ Not Uploaded'}</strong></p>
                {kycStatus.gst.date && <p className="kyc-date">Verified on: {kycStatus.gst.date}</p>}
                <p className="kyc-desc">Required for B2B shipments and input tax credit.</p>
                <button className={`kyc-btn ${kycStatus.gst.status === 'not-uploaded' ? 'primary' : ''}`}>
                  {kycStatus.gst.status === 'verified' ? 'View Document' : 'Upload GST'}
                </button>
              </div>
            </div>

            <div className={`kyc-item ${kycStatus.business.status}`}>
              <div className="kyc-icon">🏢</div>
              <div className="kyc-info">
                <h3>Business Registration</h3>
                <p>Status: <strong>{kycStatus.business.status === 'verified' ? '✓ Verified' : kycStatus.business.status === 'pending' ? '⏳ Pending' : '❌ Not Uploaded'}</strong></p>
                {kycStatus.business.date && <p className="kyc-date">Verified on: {kycStatus.business.date}</p>}
                <p className="kyc-desc">Required for business accounts and bulk shipping.</p>
                <button className={`kyc-btn ${kycStatus.business.status === 'not-uploaded' ? 'primary' : ''}`}>
                  {kycStatus.business.status === 'verified' ? 'View Document' : 'Upload Certificate'}
                </button>
              </div>
            </div>
          </div>

          <div className="kyc-benefits">
            <h3>🎁 Benefits of KYC Verification</h3>
            <ul>
              <li>✓ Higher shipment value limits (up to ₹10 Lakhs)</li>
              <li>✓ Priority customer support (24/7 dedicated line)</li>
              <li>✓ Faster claim processing (within 24 hours)</li>
              <li>✓ Access to bulk shipping discounts (up to 30% off)</li>
              <li>✓ GST input tax credit on all invoices</li>
              <li>✓ Premium account badge and verification status</li>
            </ul>
          </div>
        </div>
      )}

      {/* Password Change Modal */}
      {showPasswordModal && (
        <div className="modal-overlay" onClick={() => setShowPasswordModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>🔑 Change Password</h3>
              <button className="modal-close" onClick={() => setShowPasswordModal(false)}>✕</button>
            </div>
            
            <form onSubmit={handleChangePassword} className="modal-form">
              <div className="modal-body">
                <div className="form-group">
                  <label>Current Password *</label>
                  <input 
                    type="password"
                    value={passwordData.currentPassword}
                    onChange={(e) => setPasswordData({...passwordData, currentPassword: e.target.value})}
                    placeholder="Enter current password"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>New Password *</label>
                  <input 
                    type="password"
                    value={passwordData.newPassword}
                    onChange={(e) => setPasswordData({...passwordData, newPassword: e.target.value})}
                    placeholder="Enter new password (min 8 characters)"
                    required
                    minLength="8"
                  />
                  <span className="field-hint">Use uppercase, lowercase, numbers, and special characters</span>
                </div>

                <div className="form-group">
                  <label>Confirm New Password *</label>
                  <input 
                    type="password"
                    value={passwordData.confirmPassword}
                    onChange={(e) => setPasswordData({...passwordData, confirmPassword: e.target.value})}
                    placeholder="Confirm new password"
                    required
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="modal-btn secondary" onClick={() => setShowPasswordModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="modal-btn primary" disabled={saving}>
                  {saving ? "⏳ Updating..." : "🔐 Update Password"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toast && (
        <div className={`toast-notification ${toast.type}`}>
          {toast.message}
        </div>
      )}
    </div>
  );
}