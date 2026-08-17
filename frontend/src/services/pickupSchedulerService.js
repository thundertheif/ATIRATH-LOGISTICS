// src/services/pickupSchedulerService.js

// Dummy data for immediate testing (No backend required yet)
const mockPickups = [
  { id: 1, pickupId: "PKP-2026-001", pickupDate: new Date().toISOString().split("T")[0], pickupTimeSlot: "09:00-11:00", warehouseId: "wh-1", warehouseName: "Hyderabad Central", contactPerson: "Rajesh Kumar", contactPhone: "9876543210", serviceType: "express", totalPackages: 3, totalWeight: 15.5, status: "confirmed", assignedDriver: "Driver Ramesh" },
  { id: 2, pickupId: "PKP-2026-002", pickupDate: new Date().toISOString().split("T")[0], pickupTimeSlot: "11:00-13:00", warehouseId: "wh-1", warehouseName: "Hyderabad Central", contactPerson: "Priya Sharma", contactPhone: "9876543211", serviceType: "standard", totalPackages: 5, totalWeight: 25.0, status: "scheduled" },
  { id: 3, pickupId: "PKP-2026-003", pickupDate: new Date(Date.now() + 86400000).toISOString().split("T")[0], pickupTimeSlot: "15:00-17:00", warehouseId: "wh-2", warehouseName: "Chennai Port", contactPerson: "Anand Reddy", contactPhone: "9876543212", serviceType: "air", totalPackages: 2, totalWeight: 8.0, status: "pending" },
];

export const pickupSchedulerService = {
  getPickups: async () => {
    return new Promise((resolve) => setTimeout(() => resolve(mockPickups), 500));
  },
  getStats: async () => {
    return new Promise((resolve) => setTimeout(() => resolve({ today: 5, thisWeek: 23, pending: 8, completed: 142, missed: 3, rescheduled: 7 }), 300));
  },
  getHistory: async () => {
    const historyData = [
      { id: 101, pickupId: "PKP-2026-050", pickupDate: "2026-08-01", pickupTimeSlot: "09:00-11:00", contactPerson: "Suresh Kumar", contactPhone: "9876543200", totalWeight: 18.5, status: "completed" },
      { id: 102, pickupId: "PKP-2026-051", pickupDate: "2026-07-31", pickupTimeSlot: "13:00-15:00", contactPerson: "Lakshmi Devi", contactPhone: "9876543201", totalWeight: 7.2, status: "completed" },
      { id: 103, pickupId: "PKP-2026-052", pickupDate: "2026-07-30", pickupTimeSlot: "11:00-13:00", contactPerson: "Venkat Rao", contactPhone: "9876543202", totalWeight: 32.0, status: "missed" },
    ];
    return new Promise((resolve) => setTimeout(() => resolve({ records: historyData, totalPages: 1, totalRecords: 3 }), 500));
  },
  schedulePickup: async (data) => {
    return new Promise((resolve) => setTimeout(() => resolve({ id: Date.now(), ...data, status: "scheduled" }), 800));
  },
  cancelPickup: async (id) => {
    return new Promise((resolve) => setTimeout(() => resolve({ success: true, id }), 500));
  }
};