import React, { useState, useEffect, useCallback, useMemo } from "react";
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

  // Memoize static data to prevent unnecessary re-renders
  const statCards = useMemo(() => [
    { label: "Today", value: stats.today || 0, icon: "📅", colorClass: "today" },
    { label: "Pending", value: stats.pending || 0, icon: "⏳", colorClass: "pending" },
    { label: "Completed", value: stats.completed || 0, icon: "✅", colorClass: "completed" },
    { label: "Missed", value: stats.missed || 0, icon: "❌", colorClass: "missed" },
  ], [stats]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [p, s] = await Promise.all([
        pickupSchedulerService.getPickups(),
        pickupSchedulerService.getStats()
      ]);
      setPickups(p || []);
      setStats(s || {});
    } catch (error) {
      console.error("Error loading pickup data:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    const fetchData = async () => {
      setLoading(true);
      try {
        const [p, s] = await Promise.all([
          pickupSchedulerService.getPickups(),
          pickupSchedulerService.getStats()
        ]);
        if (isMounted) {
          setPickups(p || []);
          setStats(s || {});
        }
      } catch (error) {
        console.error("Error loading pickup data:", error);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchData();

    return () => {
      isMounted = false; // Prevent state update if component unmounts
    };
  }, [loadData]);

  const handleSchedule = useCallback(async (data) => {
    try {
      await pickupSchedulerService.schedulePickup(data);
      setIsModalOpen(false);
      await loadData();
      alert("Pickup Scheduled Successfully!");
    } catch (error) {
      console.error("Failed to schedule:", error);
      alert("Failed to schedule pickup. Please try again.");
    }
  }, [loadData]);

  const handleCancel = useCallback(async (id) => {
    if (window.confirm("Are you sure you want to cancel this pickup?")) {
      try {
        await pickupSchedulerService.cancelPickup(id);
        await loadData();
      } catch (error) {
        console.error("Failed to cancel:", error);
        alert("Failed to cancel pickup. Please try again.");
      }
    }
  }, [loadData]);

  return (
    <div className="pickup-scheduler-page" role="main">
      <div className="pickup-scheduler-container">
        
        {/* 1. Header Section */}
        <header className="page-header">
          <div className="header-text">
            <h1 className="page-title">Pickup Scheduler</h1>
            <p className="page-subtitle">Manage and track your shipment pickups efficiently.</p>
          </div>
          <button 
            onClick={() => setIsModalOpen(true)} 
            className="primary-action-btn"
            aria-label="Schedule a new pickup"
          >
            <span className="btn-icon" aria-hidden="true">+</span> Schedule New Pickup
          </button>
        </header>

        {/* 2. Stats Section */}
        <section className="stats-grid" aria-label="Pickup statistics">
          {statCards.map((stat, index) => (
            <article key={index} className={`stat-card ${stat.colorClass}`}>
              <div className="stat-icon-wrapper" aria-hidden="true">{stat.icon}</div>
              <div className="stat-details">
                <span className="stat-value">{stat.value}</span>
                <span className="stat-label">{stat.label}</span>
              </div>
            </article>
          ))}
        </section>

        {/* 3. View Toggle Section */}
        <div className="view-controls" role="tablist" aria-label="View mode selection">
          <div className="segmented-toggle">
            <button
              onClick={() => setViewMode("list")}
              className={`toggle-option ${viewMode === "list" ? "active" : ""}`}
              role="tab"
              aria-selected={viewMode === "list"}
            >
              📋 List View
            </button>
            <button
              onClick={() => setViewMode("calendar")}
              className={`toggle-option ${viewMode === "calendar" ? "active" : ""}`}
              role="tab"
              aria-selected={viewMode === "calendar"}
            >
              🗓️ Calendar View
            </button>
          </div>
        </div>

        {/* 4. Main Content Section */}
        <section className="content-area" aria-live="polite">
          {loading ? (
            <div className="loading-state">
              <div className="spinner" role="status">
                <span className="sr-only">Loading pickups...</span>
              </div>
              <p className="loading-text">Loading pickups...</p>
            </div>
          ) : viewMode === "list" ? (
            <div className="list-view-container">
              {pickups.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-icon" aria-hidden="true">📦</div>
                  <h3 className="empty-title">No Pickups Scheduled</h3>
                  <p className="empty-subtitle">Get started by scheduling your first pickup.</p>
                  <button 
                    onClick={() => setIsModalOpen(true)} 
                    className="secondary-action-btn"
                  >
                    Schedule First Pickup
                  </button>
                </div>
              ) : (
                <div className="pickups-list">
                  {pickups.map(p => (
                    <PickupCard key={p.id} pickup={p} onCancel={handleCancel} />
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="calendar-view-container">
              <PickupCalendar pickups={pickups} />
            </div>
          )}
        </section>

      </div>

      <SchedulePickupModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleSchedule}
      />
    </div>
  );
};

export default PickupScheduler;