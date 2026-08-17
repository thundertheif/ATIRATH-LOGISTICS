// src/pages/PickupScheduler.jsx
import React, { useState, useEffect } from "react";
import PickupCard from "../components/pickup/PickupCard";
import PickupCalendar from "../components/pickup/PickupCalendar";
import SchedulePickupModal from "../components/pickup/SchedulePickupModal";
import { pickupSchedulerService } from "../services/pickupSchedulerService";
import "./PickupScheduler.css";

const PickupScheduler = () => {
  const [pickups, setPickups] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState("list");
  const [isModalOpen, setIsModalOpen] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [p, s] = await Promise.all([
        pickupSchedulerService.getPickups(),
        pickupSchedulerService.getStats()
      ]);
      setPickups(p || []);
      setStats(s || {});
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const handleSchedule = async (data) => {
    try {
      await pickupSchedulerService.schedulePickup(data);
      setIsModalOpen(false);
      loadData();
      alert("Pickup Scheduled Successfully!");
    } catch (error) {
      alert("Failed to schedule pickup.");
    }
  };

  const handleCancel = async (id) => {
    if (window.confirm("Cancel this pickup?")) {
      try {
        await pickupSchedulerService.cancelPickup(id);
        loadData();
      } catch (error) {
        alert("Failed to cancel pickup.");
      }
    }
  };

  const statCards = [
    { label: "Today",     value: stats.today || 0,     icon: "📆", colorClass: "today" },
    { label: "Pending",   value: stats.pending || 0,   icon: "⏳", colorClass: "pending" },
    { label: "Completed", value: stats.completed || 0, icon: "✅", colorClass: "completed" },
    { label: "Missed",    value: stats.missed || 0,    icon: "❌", colorClass: "missed" },
  ];

  return (
    <div className="pickup-scheduler-container">
      {/* Header */}
      <div className="scheduler-header">
        <div>
          <h1 className="scheduler-title">📅 Pickup Scheduler</h1>
          <p className="scheduler-subtitle">Manage and schedule your shipment pickups</p>
        </div>
        <button onClick={() => setIsModalOpen(true)} className="schedule-btn">
          + Schedule New Pickup
        </button>
      </div>

      {/* Stats */}
      <div className="stats-grid">
        {statCards.map((s, i) => (
          <div key={i} className={`stat-card ${s.colorClass}`}>
            <div className="stat-top">
              <span className="stat-icon-bubble">{s.icon}</span>
              <p className="stat-label">{s.label}</p>
            </div>
            <p className="stat-value">{s.value}</p>
          </div>
        ))}
      </div>

      {/* View Toggle */}
      <div className="view-toggle-container">
        <button
          onClick={() => setViewMode("list")}
          className={`toggle-btn ${viewMode === "list" ? "active" : ""}`}
        >
          List View
        </button>
        <button
          onClick={() => setViewMode("calendar")}
          className={`toggle-btn ${viewMode === "calendar" ? "active" : ""}`}
        >
          Calendar View
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="loading-spinner-container">
          <div className="spinner"></div>
        </div>
      ) : viewMode === "list" ? (
        <div className="pickups-list">
          {pickups.length === 0 ? (
            <div className="empty-state">
              <p className="empty-state-text">
                No pickups scheduled. Click "Schedule New Pickup" to start.
              </p>
            </div>
          ) : (
            pickups.map(p => (
              <PickupCard key={p.id} pickup={p} onCancel={handleCancel} />
            ))
          )}
        </div>
      ) : (
        <div className="calendar-wrapper">
          <PickupCalendar pickups={pickups} />
        </div>
      )}

      <SchedulePickupModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleSchedule}
      />
    </div>
  );
};

export default PickupScheduler;