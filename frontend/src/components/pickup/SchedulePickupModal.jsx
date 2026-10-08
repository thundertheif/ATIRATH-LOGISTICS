import React, { useState } from "react";

const SchedulePickupModal = ({ isOpen, onClose, onSubmit }) => {
  const [formData, setFormData] = useState({
    pickupDate: "",
    timeSlot: "",
    warehouse: "",
    contactPerson: "",
    phoneNumber: "",
    serviceType: "Air Cargo",
    packages: "1",
    totalWeight: ""
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault(); // Prevents page reload
    onSubmit(formData); // Sends data to parent component
  };

  if (!isOpen) return null;

  return (
    <>
      {/* INLINE STYLES: No external CSS file needed, preventing Vite errors */}
      <style>{`
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(15, 23, 42, 0.6);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 9999;
          padding: 1rem;
        }
        .modal-content {
          background: #ffffff;
          border-radius: 1rem;
          max-width: 550px;
          width: 100%;
          max-height: 90vh;
          overflow-y: auto;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
          border: 1px solid #e2e8f0;
        }
        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1.25rem 1.5rem;
          border-bottom: 1px solid #e2e8f0;
          position: sticky;
          top: 0;
          background: #ffffff;
          z-index: 10;
        }
        .modal-header h2 {
          margin: 0;
          color: #0f172a;
          font-size: 1.25rem;
          font-weight: 700;
        }
        .modal-close {
          background: #f1f5f9;
          border: none;
          font-size: 1.5rem;
          cursor: pointer;
          color: #64748b;
          line-height: 1;
          width: 36px;
          height: 36px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 0.5rem;
          transition: all 0.2s;
        }
        .modal-close:hover {
          background: #e2e8f0;
          color: #0f172a;
        }
        .pickup-form {
          padding: 1.5rem;
        }
        .form-group {
          margin-bottom: 1rem;
        }
        .form-group label {
          display: block;
          margin-bottom: 0.375rem;
          font-weight: 600;
          color: #334155;
          font-size: 0.875rem;
        }
        .form-group input,
        .form-group select {
          width: 100%;
          padding: 0.625rem 0.875rem;
          border: 1px solid #cbd5e1;
          border-radius: 0.5rem;
          font-size: 0.95rem;
          color: #0f172a;
          background: #ffffff;
          transition: all 0.2s;
          box-sizing: border-box;
        }
        .form-group input:focus,
        .form-group select:focus {
          outline: none;
          border-color: #2563eb;
          box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
        }
        .modal-actions {
          display: flex;
          gap: 0.75rem;
          justify-content: flex-end;
          margin-top: 1.5rem;
          padding-top: 1.25rem;
          border-top: 1px solid #e2e8f0;
        }
        .btn-cancel,
        .btn-submit {
          padding: 0.625rem 1.25rem;
          border-radius: 0.5rem;
          font-weight: 600;
          font-size: 0.95rem;
          cursor: pointer;
          transition: all 0.2s;
          border: none;
        }
        .btn-cancel {
          background: #f1f5f9;
          color: #475569;
          border: 1px solid #cbd5e1;
        }
        .btn-cancel:hover {
          background: #e2e8f0;
          color: #0f172a;
        }
        .btn-submit {
          background: #2563eb;
          color: #ffffff !important;
          box-shadow: 0 4px 6px -1px rgba(37, 99, 235, 0.2);
        }
        .btn-submit:hover {
          background: #1d4ed8;
          transform: translateY(-1px);
          box-shadow: 0 6px 8px -1px rgba(37, 99, 235, 0.3);
        }
        @media (max-width: 640px) {
          .modal-actions {
            flex-direction: column-reverse;
          }
          .btn-cancel, .btn-submit {
            width: 100%;
          }
        }
      `}</style>

      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-content" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <h2>📅 Schedule New Pickup</h2>
            <button className="modal-close" onClick={onClose} type="button">&times;</button>
          </div>
          
          <form onSubmit={handleSubmit} className="pickup-form">
            <div className="form-group">
              <label>Pickup Date *</label>
              <input
                type="date"
                name="pickupDate"
                value={formData.pickupDate}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label>Time Slot *</label>
              <select name="timeSlot" value={formData.timeSlot} onChange={handleChange} required>
                <option value="">Select Time Slot</option>
                <option value="09:00 AM - 11:00 AM">09:00 AM - 11:00 AM</option>
                <option value="11:00 AM - 01:00 PM">11:00 AM - 01:00 PM</option>
                <option value="02:00 PM - 04:00 PM">02:00 PM - 04:00 PM</option>
                <option value="04:00 PM - 06:00 PM">04:00 PM - 06:00 PM</option>
              </select>
            </div>

            <div className="form-group">
              <label>Warehouse *</label>
              <select name="warehouse" value={formData.warehouse} onChange={handleChange} required>
                <option value="">Select Warehouse</option>
                <option value="Hyderabad Central Warehouse">Hyderabad Central Warehouse</option>
                <option value="Bangalore Warehouse">Bangalore Warehouse</option>
                <option value="Chennai Port">Chennai Port</option>
                <option value="Mumbai Warehouse">Mumbai Warehouse</option>
              </select>
            </div>

            <div className="form-group">
              <label>Contact Person *</label>
              <input
                type="text"
                name="contactPerson"
                value={formData.contactPerson}
                onChange={handleChange}
                required
                placeholder="e.g., FAROOQ"
              />
            </div>

            <div className="form-group">
              <label>Phone Number *</label>
              <input
                type="tel"
                name="phoneNumber"
                value={formData.phoneNumber}
                onChange={handleChange}
                required
                pattern="[0-9]{10}"
                placeholder="e.g., 9848022338"
              />
            </div>

            <div className="form-group">
              <label>Service Type</label>
              <select name="serviceType" value={formData.serviceType} onChange={handleChange}>
                <option value="Air Cargo">Air Cargo</option>
                <option value="Road Transport">Road Transport</option>
                <option value="Express Delivery">Express Delivery</option>
                <option value="Standard">Standard</option>
              </select>
            </div>

            <div className="form-group">
              <label>Packages</label>
              <input
                type="number"
                name="packages"
                value={formData.packages}
                onChange={handleChange}
                min="1"
              />
            </div>

            <div className="form-group">
              <label>Total Weight (kg) *</label>
              <input
                type="number"
                name="totalWeight"
                value={formData.totalWeight}
                onChange={handleChange}
                required
                min="0.1"
                step="0.1"
                placeholder="e.g., 25"
              />
            </div>

            <div className="modal-actions">
              <button type="button" className="btn-cancel" onClick={onClose}>
                Cancel
              </button>
              <button type="submit" className="btn-submit">
                ✓ Confirm Pickup
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
};

export default SchedulePickupModal;