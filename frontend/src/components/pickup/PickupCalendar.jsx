// src/components/pickup/PickupCalendar.jsx
import React, { useState } from "react";

const PickupCalendar = ({ pickups }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const today = new Date(); today.setHours(0,0,0,0);

  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    return { firstDay: new Date(year, month, 1).getDay(), daysInMonth: new Date(year, month + 1, 0).getDate() };
  };

  const getPickupsForDate = (date) => {
    const dateStr = date.toISOString().split("T")[0];
    return pickups.filter((p) => p.pickupDate === dateStr);
  };

  const { firstDay, daysInMonth } = getDaysInMonth(currentDate);
  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

  const renderDays = () => {
    const days = [];
    for (let i = 0; i < firstDay; i++) days.push(<div key={`e-${i}`} className="h-24 bg-gray-50 border border-gray-100"></div>);
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
      const dayPickups = getPickupsForDate(date);
      const isToday = date.getTime() === today.getTime();
      days.push(
        <div key={day} className={`h-24 p-2 border border-gray-200 bg-white hover:bg-blue-50 transition ${isToday ? 'ring-2 ring-blue-500' : ''}`}>
          <div className="flex justify-between items-center mb-1">
            <span className={`text-sm font-bold ${isToday ? 'bg-blue-600 text-white w-6 h-6 rounded-full flex items-center justify-center' : 'text-gray-700'}`}>{day}</span>
            {dayPickups.length > 0 && <span className="text-[10px] bg-blue-100 text-blue-800 px-1.5 rounded-full">{dayPickups.length}</span>}
          </div>
          <div className="space-y-1">
            {dayPickups.slice(0, 2).map(p => (
              <div key={p.id} className="text-[10px] bg-blue-500 text-white px-1 py-0.5 rounded truncate">{p.pickupTimeSlot}</div>
            ))}
          </div>
        </div>
      );
    }
    return days;
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-3 flex items-center justify-between">
        <button onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))} className="p-2 hover:bg-white/20 rounded-lg">←</button>
        <h2 className="text-lg font-bold">{monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}</h2>
        <button onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))} className="p-2 hover:bg-white/20 rounded-lg">→</button>
      </div>
      <div className="grid grid-cols-7 bg-gray-50 border-b border-gray-200">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(d => <div key={d} className="py-2 text-center text-xs font-bold text-gray-600">{d}</div>)}
      </div>
      <div className="grid grid-cols-7">{renderDays()}</div>
    </div>
  );
};

export default PickupCalendar;