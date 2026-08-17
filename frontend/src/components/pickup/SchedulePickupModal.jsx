// src/components/pickup/SchedulePickupModal.jsx
import React, { useState } from "react";

const SchedulePickupModal = ({ isOpen, onClose, onSubmit }) => {
  const [formData, setFormData] = useState({
    pickupDate: "", pickupTimeSlot: "09:00-11:00", warehouseId: "wh-1",
    contactPerson: "", contactPhone: "", serviceType: "express",
    totalPackages: 1, totalWeight: "", status: "scheduled"
  });
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    await onSubmit(formData);
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="p-6 border-b flex justify-between items-center sticky top-0 bg-white z-10">
          <h2 className="text-xl font-bold text-gray-900">📅 Schedule New Pickup</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl">&times;</button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Pickup Date *</label>
              <input type="date" required min={new Date().toISOString().split('T')[0]} value={formData.pickupDate} onChange={e => setFormData({...formData, pickupDate: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Time Slot *</label>
              <select value={formData.pickupTimeSlot} onChange={e => setFormData({...formData, pickupTimeSlot: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg">
                <option value="09:00-11:00">09:00 AM - 11:00 AM</option>
                <option value="11:00-13:00">11:00 AM - 01:00 PM</option>
                <option value="15:00-17:00">03:00 PM - 05:00 PM</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Warehouse *</label>
            <select value={formData.warehouseId} onChange={e => setFormData({...formData, warehouseId: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg">
              <option value="wh-1">Hyderabad Central Warehouse</option>
              <option value="wh-2">Chennai Port Warehouse</option>
              <option value="wh-3">Mumbai Logistics Hub</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Contact Person *</label>
              <input type="text" required value={formData.contactPerson} onChange={e => setFormData({...formData, contactPerson: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg" placeholder="Full Name" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Phone Number *</label>
              <input type="tel" required maxLength={10} value={formData.contactPhone} onChange={e => setFormData({...formData, contactPhone: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg" placeholder="10-digit mobile" />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Service Type</label>
              <select value={formData.serviceType} onChange={e => setFormData({...formData, serviceType: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg">
                <option value="express">Express</option>
                <option value="standard">Standard</option>
                <option value="air">Air Cargo</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Packages</label>
              <input type="number" min="1" value={formData.totalPackages} onChange={e => setFormData({...formData, totalPackages: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Total Weight (kg) *</label>
              <input type="number" step="0.1" required value={formData.totalWeight} onChange={e => setFormData({...formData, totalWeight: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg" placeholder="e.g. 15.5" />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t mt-6">
            <button type="button" onClick={onClose} className="px-5 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 font-semibold">Cancel</button>
            <button type="submit" disabled={loading} className="px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold disabled:opacity-50 flex items-center gap-2">
              {loading ? "Scheduling..." : "✓ Confirm Pickup"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SchedulePickupModal;