// src/pages/PickupHistory.jsx
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { pickupSchedulerService } from "../services/pickupSchedulerService";
import "./PickupHistory.css";

const PickupHistory = () => {
  const navigate = useNavigate();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const data = await pickupSchedulerService.getHistory();
        setHistory(data?.records || []);
      } catch (error) {
        console.error("Error fetching history:", error);
        setHistory([]);
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, []);

  const getStatusBadgeClass = (status) => {
    const statusMap = {
      completed: "completed",
      missed: "missed",
      cancelled: "cancelled",
      scheduled: "scheduled",
    };
    return statusMap[status?.toLowerCase()] || "scheduled";
  };

  return (
    <div className="pickup-history-container">
      {/* Header */}
      <div className="history-header">
        <button onClick={() => navigate("/pickup-scheduler")} className="back-btn">
          ←
        </button>
        <div>
          <h1 className="history-title">📊 Pickup History</h1>
          <p className="history-subtitle">View all your past and missed pickups</p>
        </div>
      </div>

      {/* Table Card */}
      <div className="table-card">
        {loading ? (
          <div className="loading-spinner-container">
            <div className="spinner"></div>
          </div>
        ) : history.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📭</div>
            <p className="empty-state-text">No pickup history available</p>
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="history-table">
              <thead>
                <tr>
                  <th>Pickup ID</th>
                  <th>Date & Time</th>
                  <th>Contact</th>
                  <th>Weight</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {history.map((record) => (
                  <tr key={record.id}>
                    <td className="pickup-id-cell" data-label="Pickup ID">
                      {record.pickupId}
                    </td>
                    <td data-label="Date & Time">
                      <div className="date-primary">{record.pickupDate}</div>
                      <div className="date-secondary">{record.pickupTimeSlot}</div>
                    </td>
                    <td data-label="Contact">
                      <div className="contact-name">{record.contactPerson}</div>
                      <div className="contact-phone">{record.contactPhone}</div>
                    </td>
                    <td className="weight-cell" data-label="Weight">
                      {record.totalWeight} kg
                    </td>
                    <td data-label="Status">
                      <span className={`status-badge ${getStatusBadgeClass(record.status)}`}>
                        {record.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default PickupHistory;