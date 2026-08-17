// src/components/pickup/PickupCard.jsx
import React from "react";

const PickupCard = ({ pickup, onCancel }) => {
  const getStatusBadge = (status) => {
    const styles = {
      scheduled: "bg-blue-100 text-blue-700",
      pending: "bg-amber-100 text-amber-700",
      confirmed: "bg-green-100 text-green-700",
      completed: "bg-emerald-100 text-emerald-700",
      cancelled: "bg-red-100 text-red-700",
      missed: "bg-gray-100 text-gray-700",
    };
    return styles[status] || "bg-gray-100 text-gray-700";
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 hover:shadow-lg transition p-5">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-xl">
            {pickup.contactPerson?.charAt(0)}
          </div>
          <div>
            <h3 className="font-bold text-gray-900">{pickup.contactPerson}</h3>
            <p className="text-sm text-gray-500">ID: {pickup.pickupId} • {pickup.warehouseName}</p>
          </div>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm flex-1">
          <div><p className="text-gray-500 text-xs">Date</p><p className="font-semibold">{pickup.pickupDate}</p></div>
          <div><p className="text-gray-500 text-xs">Time</p><p className="font-semibold">{pickup.pickupTimeSlot}</p></div>
          <div><p className="text-gray-500 text-xs">Weight</p><p className="font-semibold">{pickup.totalWeight} kg</p></div>
          <div><p className="text-gray-500 text-xs">Service</p><p className="font-semibold capitalize">{pickup.serviceType}</p></div>
        </div>

        <div className="flex items-center gap-3">
          <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${getStatusBadge(pickup.status)}`}>
            {pickup.status}
          </span>
          {(pickup.status === 'scheduled' || pickup.status === 'pending') && (
            <button onClick={() => onCancel(pickup.id)} className="text-red-500 hover:text-red-700 text-sm font-semibold">Cancel</button>
          )}
        </div>
      </div>
    </div>
  );
};

export default PickupCard;