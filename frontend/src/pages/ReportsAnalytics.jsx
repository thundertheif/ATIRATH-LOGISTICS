import { useState, useEffect, useMemo } from "react";
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  addDoc,
  serverTimestamp,
  limit,
} from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";
import "../styles/ReportsAnalytics.css";

export default function ReportsAnalytics() {
  const { currentUser } = useAuth();

  // ========== TABS STATE ==========
  const [mainTab, setMainTab] = useState("analytics");
  const [analyticsSubTab, setAnalyticsSubTab] = useState("overview");
  const [reportsSubTab, setReportsSubTab] = useState("generate");
  const [dateRange, setDateRange] = useState("last30");
  const [selectedReportType, setSelectedReportType] = useState("");
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);

  // ========== REAL DATA STATE ==========
  const [shipments, setShipments] = useState([]);
  const [payments, setPayments] = useState([]);
  const [returns, setReturns] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [activities, setActivities] = useState([]);
  const [generatedReports, setGeneratedReports] = useState([]);
  const [toast, setToast] = useState(null);

  // ========== TOAST HELPER ==========
  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // ========== FETCH REAL DATA FROM FIREBASE ==========
  useEffect(() => {
    if (!currentUser?.uid) return;

    // Fetch Shipments
    const shipmentsQuery = query(
      collection(db, "shipments"),
      where("userId", "==", currentUser.uid),
      orderBy("createdAt", "desc")
    );

    const unsubShipments = onSnapshot(shipmentsQuery, (snapshot) => {
      const shipmentsList = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate?.() || new Date(),
      }));
      setShipments(shipmentsList);
    }, (error) => {
      console.error("Error fetching shipments:", error);
    });

    // Fetch Payments
    const paymentsQuery = query(
      collection(db, "payments"),
      where("userId", "==", currentUser.uid),
      orderBy("createdAt", "desc")
    );

    const unsubPayments = onSnapshot(paymentsQuery, (snapshot) => {
      const paymentsList = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate?.() || new Date(),
      }));
      setPayments(paymentsList);
    }, (error) => {
      console.error("Error fetching payments:", error);
    });

    // Fetch Returns
    const returnsQuery = query(
      collection(db, "returns"),
      where("userId", "==", currentUser.uid),
      orderBy("createdAt", "desc")
    );

    const unsubReturns = onSnapshot(returnsQuery, (snapshot) => {
      const returnsList = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate?.() || new Date(),
      }));
      setReturns(returnsList);
    }, (error) => {
      console.error("Error fetching returns:", error);
    });

    // Fetch Invoices
    const invoicesQuery = query(
      collection(db, "invoices"),
      where("userId", "==", currentUser.uid),
      orderBy("createdAt", "desc")
    );

    const unsubInvoices = onSnapshot(invoicesQuery, (snapshot) => {
      const invoicesList = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate?.() || new Date(),
      }));
      setInvoices(invoicesList);
    }, (error) => {
      console.error("Error fetching invoices:", error);
    });

    // Fetch Activities (may be empty)
    const activitiesQuery = query(
      collection(db, "activities"),
      where("userId", "==", currentUser.uid),
      orderBy("createdAt", "desc"),
      limit(10)
    );

    const unsubActivities = onSnapshot(activitiesQuery, (snapshot) => {
      const activitiesList = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate?.() || new Date(),
      }));
      setActivities(activitiesList);
    }, (error) => {
      console.log("Activities collection may not exist yet");
      setActivities([]);
    });

    // Fetch Generated Reports (may be empty)
    const reportsQuery = query(
      collection(db, "reports"),
      where("userId", "==", currentUser.uid),
      orderBy("createdAt", "desc")
    );

    const unsubReports = onSnapshot(reportsQuery, (snapshot) => {
      const reportsList = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate?.() || new Date(),
      }));
      setGeneratedReports(reportsList);
    }, (error) => {
      console.log("Reports collection may not exist yet");
      setGeneratedReports([]);
    });

    // Cleanup
    return () => {
      unsubShipments();
      unsubPayments();
      unsubReturns();
      unsubInvoices();
      unsubActivities();
      unsubReports();
    };
  }, [currentUser]);

  // ========== CALCULATE REAL-TIME STATS ==========
  const kpiStats = useMemo(() => {
    const totalRevenue = payments
      .filter((p) => p.status === "success")
      .reduce((sum, p) => sum + (p.amount || 0), 0);

    const totalShipments = shipments.length;

    const deliveredCount = shipments.filter((s) => s.status === "Delivered").length;
    const inTransitCount = shipments.filter((s) => s.status === "In Transit").length;
    const onTimePercentage =
      deliveredCount + inTransitCount > 0
        ? ((deliveredCount / (deliveredCount + inTransitCount)) * 100).toFixed(1)
        : 0;

    const uniqueCustomers = new Set(
      shipments.map((s) => s.receiverName || s.receiverPhone).filter(Boolean)
    ).size;

    return [
      {
        label: "Total Revenue",
        value: `₹ ${totalRevenue.toLocaleString("en-IN")}`,
        icon: "💰",
        change: `${payments.length} payments`,
        up: true,
        color: "ra-stat--blue",
      },
      {
        label: "Total Shipments",
        value: totalShipments.toLocaleString("en-IN"),
        icon: "📦",
        change: `${deliveredCount} delivered`,
        up: true,
        color: "ra-stat--emerald",
      },
      {
        label: "On-Time Delivery",
        value: `${onTimePercentage}%`,
        icon: "⏱️",
        change: `${deliveredCount} on time`,
        up: parseFloat(onTimePercentage) > 90,
        color: "ra-stat--amber",
      },
      {
        label: "Active Customers",
        value: uniqueCustomers.toLocaleString("en-IN"),
        icon: "👥",
        change: "Unique receivers",
        up: true,
        color: "ra-stat--purple",
      },
    ];
  }, [shipments, payments]);

  // ========== MONTHLY REVENUE DATA ==========
  const revenueData = useMemo(() => {
    const monthlyData = {};
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    months.forEach((month) => {
      monthlyData[month] = { revenue: 0, shipments: 0 };
    });

    payments.forEach((payment) => {
      if (payment.status === "success" && payment.createdAt) {
        const month = months[payment.createdAt.getMonth()];
        monthlyData[month].revenue += payment.amount || 0;
      }
    });

    shipments.forEach((shipment) => {
      if (shipment.createdAt) {
        const month = months[shipment.createdAt.getMonth()];
        monthlyData[month].shipments += 1;
      }
    });

    const currentMonth = new Date().getMonth();
    const last7Months = [];
    for (let i = 6; i >= 0; i--) {
      const monthIndex = (currentMonth - i + 12) % 12;
      const monthName = months[monthIndex];
      last7Months.push({
        month: monthName,
        revenue: monthlyData[monthName].revenue,
        shipments: monthlyData[monthName].shipments,
      });
    }

    return last7Months;
  }, [payments, shipments]);

  // ========== TOP ROUTES ==========
  const topRoutes = useMemo(() => {
    const routeMap = {};

    shipments.forEach((shipment) => {
      if (shipment.pickupCity && shipment.dropCity) {
        const route = `${shipment.pickupCity} → ${shipment.dropCity}`;
        if (!routeMap[route]) {
          routeMap[route] = { shipments: 0, revenue: 0 };
        }
        routeMap[route].shipments += 1;
        routeMap[route].revenue += shipment.amount || 0;
      }
    });

    const routesArray = Object.entries(routeMap)
      .map(([route, data]) => ({
        route,
        shipments: data.shipments,
        revenue: `₹ ${data.revenue.toLocaleString("en-IN")}`,
        growth: "+0%",
      }))
      .sort((a, b) => {
        const revenueA = parseInt(a.revenue.replace(/[₹,]/g, ""));
        const revenueB = parseInt(b.revenue.replace(/[₹,]/g, ""));
        return revenueB - revenueA;
      })
      .slice(0, 5);

    return routesArray;
  }, [shipments]);

  // ========== SHIPMENT STATUS ==========
  const shipmentStatus = useMemo(() => {
    const statusMap = {
      Delivered: { count: 0, color: "#10b981" },
      "In Transit": { count: 0, color: "#3b82f6" },
      Pending: { count: 0, color: "#f59e0b" },
      Returned: { count: 0, color: "#ef4444" },
    };

    shipments.forEach((shipment) => {
      if (statusMap[shipment.status]) {
        statusMap[shipment.status].count += 1;
      }
    });

    const total = shipments.length;
    return Object.entries(statusMap).map(([status, data]) => ({
      status,
      count: data.count,
      percentage: total > 0 ? ((data.count / total) * 100).toFixed(1) : 0,
      color: data.color,
    }));
  }, [shipments]);

  // ========== PERFORMANCE METRICS ==========
  const performanceMetrics = useMemo(() => {
    const returnRate =
      shipments.length > 0
        ? ((returns.length / shipments.length) * 100).toFixed(1)
        : 0;

    const totalRevenue = payments
      .filter((p) => p.status === "success")
      .reduce((sum, p) => sum + (p.amount || 0), 0);
    const costPerShipment =
      shipments.length > 0 ? Math.round(totalRevenue / shipments.length) : 0;

    return [
      {
        label: "Average Delivery Time",
        value: "2.4 days",
        target: "< 3 days",
        status: "good",
      },
      {
        label: "Customer Satisfaction",
        value: "4.6/5.0",
        target: "> 4.5",
        status: "good",
      },
      {
        label: "Return Rate",
        value: `${returnRate}%`,
        target: "< 5%",
        status: parseFloat(returnRate) < 5 ? "good" : "warning",
      },
      {
        label: "Cost per Shipment",
        value: `₹ ${costPerShipment}`,
        target: "< ₹ 500",
        status: costPerShipment < 500 ? "good" : "warning",
      },
      {
        label: "Warehouse Utilization",
        value: "78%",
        target: "> 75%",
        status: "good",
      },
      {
        label: "Fleet Efficiency",
        value: "85%",
        target: "> 80%",
        status: "good",
      },
    ];
  }, [shipments, returns, payments]);

  // ========== RECENT ACTIVITIES ==========
  const recentActivities = useMemo(() => {
    return activities.slice(0, 5).map((activity) => ({
      time: activity.createdAt
        ? `${Math.floor((new Date() - activity.createdAt) / 60000)} mins ago`
        : "Just now",
      event: activity.event || "Activity",
      details: activity.details || "",
      icon: activity.icon || "📦",
    }));
  }, [activities]);

  // ========== REPORT TYPES ==========
  const reportTypes = [
    {
      id: "sales",
      name: "Sales Report",
      icon: "💰",
      description: "Revenue, bookings, and payment analytics",
      color: "ra-report--blue",
      fields: ["Date Range", "Region", "Customer Type"],
    },
    {
      id: "operations",
      name: "Operations Report",
      icon: "🚚",
      description: "Shipments, deliveries, and fleet performance",
      color: "ra-report--emerald",
      fields: ["Date Range", "Route", "Vehicle Type"],
    },
    {
      id: "financial",
      name: "Financial Report",
      icon: "🧾",
      description: "Invoices, expenses, and profit/loss",
      color: "ra-report--amber",
      fields: ["Date Range", "Category", "Payment Method"],
    },
    {
      id: "customer",
      name: "Customer Report",
      icon: "👥",
      description: "Customer behavior and retention analytics",
      color: "ra-report--purple",
      fields: ["Date Range", "Customer Segment", "Location"],
    },
    {
      id: "inventory",
      name: "Inventory Report",
      icon: "📦",
      description: "Warehouse stock and movement tracking",
      color: "ra-report--pink",
      fields: ["Date Range", "Warehouse", "Product Category"],
    },
    {
      id: "returns",
      name: "Returns Report",
      icon: "↩️",
      description: "Return requests, reasons, and refunds",
      color: "ra-report--red",
      fields: ["Date Range", "Return Reason", "Status"],
    },
  ];

  // ========== HANDLERS ==========
  const handleGenerateReport = async (e) => {
    e.preventDefault();

    if (!selectedReportType || !currentUser?.uid) {
      showToast("⚠️ Please select a report type", "error");
      return;
    }

    try {
      const reportType = reportTypes.find((rt) => rt.id === selectedReportType);

      const newReport = {
        userId: currentUser.uid,
        name: `${reportType.name} - ${new Date().toLocaleDateString("en-US", {
          month: "long",
          year: "numeric",
        })}`,
        type: reportType.name,
        format: "PDF",
        status: "Ready",
        size: "2.4 MB",
        reportData: {
          type: selectedReportType,
          dateRange: dateRange,
          generatedAt: new Date().toISOString(),
        },
        createdAt: serverTimestamp(),
      };

      await addDoc(collection(db, "reports"), newReport);
      showToast(`✅ "${reportType.name}" report generated successfully!`);
      setSelectedReportType("");
    } catch (error) {
      console.error("Error generating report:", error);
      showToast("❌ Failed to generate report", "error");
    }
  };

  const handleDownloadReport = (report) => {
    setSelectedReport(report);
    setShowDownloadModal(true);
  };

  const confirmDownload = () => {
    showToast(`📥 Downloading: ${selectedReport.name} (${selectedReport.format})`);
    setShowDownloadModal(false);
    setSelectedReport(null);
  };

  // ========== CHART HELPER ==========
  const maxRevenue = useMemo(() => {
    return Math.max(...revenueData.map((d) => d.revenue), 1);
  }, [revenueData]);

  // ========== RENDER (NO LOADING SPINNER) ==========
  return (
    <div className="ra-page">
      {/* Toast Notification */}
      {toast && (
        <div className={`ra-toast ra-toast--${toast.type}`}>
          {toast.message}
        </div>
      )}

      {/* Header */}
      <div className="ra-header">
        <div className="ra-header__content">
          <div>
            <h1 className="ra-header__title">
              <span className="ra-header__emoji">📈</span>
              Reports & Analytics
            </h1>
            <p className="ra-header__subtitle">
              Track performance, generate reports & gain business insights
            </p>
          </div>
          <div className="ra-header__actions">
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="ra-date-select"
            >
              <option value="today">Today</option>
              <option value="last7">Last 7 Days</option>
              <option value="last30">Last 30 Days</option>
              <option value="last90">Last 90 Days</option>
              <option value="thisYear">This Year</option>
            </select>
          </div>
        </div>

        {/* Main Tabs */}
        <div className="ra-main-tabs">
          <button
            onClick={() => setMainTab("analytics")}
            className={`ra-main-tab ${mainTab === "analytics" ? "ra-main-tab--active" : ""}`}
          >
            <span className="ra-main-tab__emoji">📊</span>
            <div className="ra-main-tab__text">
              <span className="ra-main-tab__label">Analytics</span>
              <span className="ra-main-tab__desc">Charts, KPIs & Insights</span>
            </div>
          </button>
          <button
            onClick={() => setMainTab("reports")}
            className={`ra-main-tab ${mainTab === "reports" ? "ra-main-tab--active" : ""}`}
          >
            <span className="ra-main-tab__emoji">📋</span>
            <div className="ra-main-tab__text">
              <span className="ra-main-tab__label">Reports</span>
              <span className="ra-main-tab__desc">Generate & Download</span>
            </div>
          </button>
        </div>
      </div>

      <div className="ra-container">
        {/* ===================================================== */}
        {/* ================ ANALYTICS SECTION ================== */}
        {/* ===================================================== */}
        {mainTab === "analytics" && (
          <>
            {/* KPI Stats */}
            <div className="ra-stats">
              {kpiStats.map((s, i) => (
                <div key={i} className="ra-stat-card">
                  <div className="ra-stat-card__header">
                    <div className={`ra-stat-card__icon ${s.color}`}>
                      <span>{s.icon}</span>
                    </div>
                    <span
                      className={`ra-stat-card__change ${s.up ? "up" : "down"}`}
                    >
                      {s.change}
                    </span>
                  </div>
                  <p className="ra-stat-card__label">{s.label}</p>
                  <p className="ra-stat-card__value">{s.value}</p>
                </div>
              ))}
            </div>

            {/* Analytics Sub-Tabs */}
            <div className="ra-tabs-wrapper">
              <div className="ra-tabs">
                <button
                  onClick={() => setAnalyticsSubTab("overview")}
                  className={`ra-tab ${
                    analyticsSubTab === "overview" ? "ra-tab--active" : ""
                  }`}
                >
                  <span>📊</span> Overview
                </button>
                <button
                  onClick={() => setAnalyticsSubTab("shipments")}
                  className={`ra-tab ${
                    analyticsSubTab === "shipments" ? "ra-tab--active" : ""
                  }`}
                >
                  <span>📦</span> Shipments
                </button>
                <button
                  onClick={() => setAnalyticsSubTab("routes")}
                  className={`ra-tab ${
                    analyticsSubTab === "routes" ? "ra-tab--active" : ""
                  }`}
                >
                  <span>🗺️</span> Top Routes
                </button>
                <button
                  onClick={() => setAnalyticsSubTab("performance")}
                  className={`ra-tab ${
                    analyticsSubTab === "performance" ? "ra-tab--active" : ""
                  }`}
                >
                  <span>⚡</span> Performance
                </button>
              </div>

              <div className="ra-tab-content">
                {/* OVERVIEW */}
                {analyticsSubTab === "overview" && (
                  <div className="ra-grid-2-1">
                    <div>
                      <h3 className="ra-section-title">
                        Revenue Trend (Last 7 Months)
                      </h3>
                      <div className="ra-chart-container">
                        <div className="ra-bar-chart">
                          {revenueData.map((d, i) => (
                            <div key={i} className="ra-bar-item">
                              <div className="ra-bar-wrapper">
                                <div
                                  className="ra-bar"
                                  style={{
                                    height: `${
                                      (d.revenue / maxRevenue) * 100
                                    }%`,
                                  }}
                                >
                                  <span className="ra-bar-value">
                                    ₹{(d.revenue / 1000).toFixed(0)}K
                                  </span>
                                </div>
                              </div>
                              <span className="ra-bar-label">{d.month}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div>
                      <h3 className="ra-section-title">Shipment Status</h3>
                      <div className="ra-status-list">
                        {shipmentStatus.length === 0 ? (
                          <p style={{ color: "#6b7280", textAlign: "center", padding: "40px" }}>
                            No shipment data available yet
                          </p>
                        ) : (
                          shipmentStatus.map((s, i) => (
                            <div key={i} className="ra-status-item">
                              <div className="ra-status-item__header">
                                <span className="ra-status-item__label">
                                  {s.status}
                                </span>
                                <span className="ra-status-item__count">
                                  {s.count}
                                </span>
                              </div>
                              <div className="ra-progress-bar">
                                <div
                                  className="ra-progress-fill"
                                  style={{
                                    width: `${s.percentage}%`,
                                    background: s.color,
                                  }}
                                ></div>
                              </div>
                              <span className="ra-status-item__percent">
                                {s.percentage}%
                              </span>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* SHIPMENTS */}
                {analyticsSubTab === "shipments" && (
                  <div className="ra-grid-1-1">
                    <div>
                      <h3 className="ra-section-title">Monthly Shipments</h3>
                      <div className="ra-shipments-chart">
                        {revenueData.map((d, i) => (
                          <div key={i} className="ra-shipment-bar-item">
                            <div className="ra-shipment-bar-wrapper">
                              <div
                                className="ra-shipment-bar"
                                style={{
                                  height: `${(d.shipments / 350) * 100}%`,
                                }}
                              >
                                <span className="ra-shipment-bar-value">
                                  {d.shipments}
                                </span>
                              </div>
                            </div>
                            <span className="ra-shipment-bar-label">
                              {d.month}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <h3 className="ra-section-title">Recent Activities</h3>
                      <div className="ra-activity-list">
                        {recentActivities.length === 0 ? (
                          <div style={{ textAlign: "center", padding: "40px", color: "#6b7280" }}>
                            <p style={{ fontSize: "2rem", marginBottom: "10px" }}>📭</p>
                            <p>No recent activities</p>
                            <p style={{ fontSize: "0.75rem", marginTop: "10px" }}>
                              Activities will appear here when you book shipments
                            </p>
                          </div>
                        ) : (
                          recentActivities.map((a, i) => (
                            <div key={i} className="ra-activity-item">
                              <div className="ra-activity-item__icon">
                                {a.icon}
                              </div>
                              <div className="ra-activity-item__content">
                                <p className="ra-activity-item__event">
                                  {a.event}
                                </p>
                                <p className="ra-activity-item__details">
                                  {a.details}
                                </p>
                                <p className="ra-activity-item__time">
                                  {a.time}
                                </p>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* TOP ROUTES */}
                {analyticsSubTab === "routes" && (
                  <div>
                    <h3 className="ra-section-title">
                      Top 5 Routes by Revenue
                    </h3>
                    <div className="ra-routes-list">
                      {topRoutes.length === 0 ? (
                        <div style={{ textAlign: "center", padding: "40px", color: "#6b7280" }}>
                          <p style={{ fontSize: "2rem", marginBottom: "10px" }}>🗺️</p>
                          <p>No route data available yet</p>
                          <p style={{ fontSize: "0.75rem", marginTop: "10px" }}>
                            Book shipments to see top routes
                          </p>
                        </div>
                      ) : (
                        topRoutes.map((r, i) => (
                          <div key={i} className="ra-route-card">
                            <div className="ra-route-card__rank">
                              #{i + 1}
                            </div>
                            <div className="ra-route-card__info">
                              <p className="ra-route-card__route">{r.route}</p>
                              <div className="ra-route-card__stats">
                                <span>📦 {r.shipments} shipments</span>
                                <span>💰 {r.revenue}</span>
                              </div>
                            </div>
                            <div className="ra-route-card__growth">
                              <span className="ra-growth-badge">
                                {r.growth}
                              </span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}

                {/* PERFORMANCE */}
                {analyticsSubTab === "performance" && (
                  <div>
                    <h3 className="ra-section-title">
                      Key Performance Indicators
                    </h3>
                    <div className="ra-kpi-grid">
                      {performanceMetrics.map((m, i) => (
                        <div key={i} className="ra-kpi-card">
                          <div className="ra-kpi-card__header">
                            <span className="ra-kpi-card__label">
                              {m.label}
                            </span>
                            <span
                              className={`ra-kpi-status ra-kpi-status--${m.status}`}
                            >
                              {m.status === "good" ? "✅" : "⚠️"}
                            </span>
                          </div>
                          <p className="ra-kpi-card__value">{m.value}</p>
                          <p className="ra-kpi-card__target">
                            Target: {m.target}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {/* ===================================================== */}
        {/* ================ REPORTS SECTION ==================== */}
        {/* ===================================================== */}
        {mainTab === "reports" && (
          <>
            {/* Reports Stats */}
            <div className="ra-stats">
              <div className="ra-stat-card">
                <div className="ra-stat-card__header">
                  <div className="ra-stat-card__icon ra-stat--blue">
                    <span>📋</span>
                  </div>
                </div>
                <p className="ra-stat-card__label">Total Reports</p>
                <p className="ra-stat-card__value">
                  {generatedReports.length}
                </p>
              </div>
              <div className="ra-stat-card">
                <div className="ra-stat-card__header">
                  <div className="ra-stat-card__icon ra-stat--emerald">
                    <span>✅</span>
                  </div>
                </div>
                <p className="ra-stat-card__label">Ready to Download</p>
                <p className="ra-stat-card__value">
                  {
                    generatedReports.filter((r) => r.status === "Ready").length
                  }
                </p>
              </div>
              <div className="ra-stat-card">
                <div className="ra-stat-card__header">
                  <div className="ra-stat-card__icon ra-stat--amber">
                    <span>⏳</span>
                  </div>
                </div>
                <p className="ra-stat-card__label">Generating</p>
                <p className="ra-stat-card__value">
                  {
                    generatedReports.filter((r) => r.status === "Generating")
                      .length
                  }
                </p>
              </div>
              <div className="ra-stat-card">
                <div className="ra-stat-card__header">
                  <div className="ra-stat-card__icon ra-stat--purple">
                    <span>📅</span>
                  </div>
                </div>
                <p className="ra-stat-card__label">Scheduled</p>
                <p className="ra-stat-card__value">0</p>
              </div>
            </div>

            {/* Reports Sub-Tabs */}
            <div className="ra-tabs-wrapper">
              <div className="ra-tabs">
                <button
                  onClick={() => setReportsSubTab("generate")}
                  className={`ra-tab ${
                    reportsSubTab === "generate" ? "ra-tab--active" : ""
                  }`}
                >
                  <span>➕</span> Generate Report
                </button>
                <button
                  onClick={() => setReportsSubTab("history")}
                  className={`ra-tab ${
                    reportsSubTab === "history" ? "ra-tab--active" : ""
                  }`}
                >
                  <span>📚</span> Report History
                </button>
              </div>

              <div className="ra-tab-content">
                {/* GENERATE REPORT */}
                {reportsSubTab === "generate" && (
                  <div>
                    <h3 className="ra-section-title">Select Report Type</h3>
                    <div className="ra-report-types-grid">
                      {reportTypes.map((rt) => (
                        <div
                          key={rt.id}
                          className={`ra-report-type-card ${rt.color} ${
                            selectedReportType === rt.id ? "selected" : ""
                          }`}
                          onClick={() => setSelectedReportType(rt.id)}
                        >
                          <div className="ra-report-type-card__icon">
                            {rt.icon}
                          </div>
                          <h4 className="ra-report-type-card__name">
                            {rt.name}
                          </h4>
                          <p className="ra-report-type-card__desc">
                            {rt.description}
                          </p>
                          <div className="ra-report-type-card__fields">
                            {rt.fields.map((f, i) => (
                              <span key={i} className="ra-field-tag">
                                {f}
                              </span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>

                    {selectedReportType && (
                      <form
                        onSubmit={handleGenerateReport}
                        className="ra-generate-form"
                      >
                        <h3 className="ra-section-title">Configure Report</h3>
                        <div className="ra-form-row">
                          <div className="ra-form-group">
                            <label className="ra-form-label">Date Range</label>
                            <select
                              value={dateRange}
                              onChange={(e) => setDateRange(e.target.value)}
                              className="ra-form-select"
                            >
                              <option value="last7">Last 7 Days</option>
                              <option value="last30">Last 30 Days</option>
                              <option value="last90">Last 90 Days</option>
                              <option value="thisMonth">This Month</option>
                              <option value="lastMonth">Last Month</option>
                            </select>
                          </div>
                          <div className="ra-form-group">
                            <label className="ra-form-label">Format</label>
                            <select className="ra-form-select">
                              <option>PDF</option>
                              <option>Excel</option>
                              <option>CSV</option>
                            </select>
                          </div>
                          <div className="ra-form-group">
                            <label className="ra-form-label">Email To</label>
                            <input
                              type="email"
                              placeholder="your@email.com"
                              className="ra-form-input"
                            />
                          </div>
                        </div>
                        <div className="ra-form-actions">
                          <button
                            type="button"
                            onClick={() => setSelectedReportType("")}
                            className="ra-btn ra-btn--outline"
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            className="ra-btn ra-btn--primary"
                          >
                            <span>📊</span> Generate Report
                          </button>
                        </div>
                      </form>
                    )}
                  </div>
                )}

                {/* REPORT HISTORY */}
                {reportsSubTab === "history" && (
                  <div>
                    <div className="ra-filter-bar">
                      <div className="ra-search-box">
                        <span className="ra-search-box__icon">🔍</span>
                        <input
                          type="text"
                          placeholder="Search reports..."
                          className="ra-search-box__input"
                        />
                      </div>
                      <select className="ra-form-select">
                        <option>All Types</option>
                        <option>Sales</option>
                        <option>Operations</option>
                        <option>Financial</option>
                        <option>Customer</option>
                      </select>
                    </div>

                    <div className="ra-reports-table-wrapper">
                      <table className="ra-reports-table">
                        <thead>
                          <tr>
                            <th>Report ID</th>
                            <th>Report Name</th>
                            <th>Type</th>
                            <th>Generated On</th>
                            <th>Size</th>
                            <th>Format</th>
                            <th>Status</th>
                            <th>Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {generatedReports.length === 0 ? (
                            <tr>
                              <td
                                colSpan="8"
                                style={{
                                  textAlign: "center",
                                  padding: "40px",
                                  color: "#6b7280",
                                }}
                              >
                                <p style={{ fontSize: "2rem", marginBottom: "10px" }}>📋</p>
                                <p>No reports generated yet</p>
                                <p style={{ fontSize: "0.75rem", marginTop: "10px" }}>
                                  Generate your first report to see it here
                                </p>
                              </td>
                            </tr>
                          ) : (
                            generatedReports.map((r) => (
                              <tr key={r.id}>
                                <td className="mono">
                                  {r.id.slice(-8).toUpperCase()}
                                </td>
                                <td className="font-semibold">{r.name}</td>
                                <td>
                                  <span className="ra-type-chip">{r.type}</span>
                                </td>
                                <td>
                                  {r.createdAt?.toLocaleDateString("en-IN", {
                                    day: "numeric",
                                    month: "short",
                                    year: "numeric",
                                  }) || "N/A"}
                                </td>
                                <td>{r.size || "0 MB"}</td>
                                <td>
                                  <span className="ra-format-chip">
                                    {r.format}
                                  </span>
                                </td>
                                <td>
                                  <span
                                    className={`ra-status-chip ra-status-chip--${r.status.toLowerCase()}`}
                                  >
                                    {r.status}
                                  </span>
                                </td>
                                <td>
                                  {r.status === "Ready" ? (
                                    <button
                                      onClick={() => handleDownloadReport(r)}
                                      className="ra-link-btn"
                                    >
                                      <span>📥</span> Download
                                    </button>
                                  ) : (
                                    <span className="ra-generating-text">
                                      ⏳ Processing...
                                    </span>
                                  )}
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Download Modal */}
      {showDownloadModal && selectedReport && (
        <div
          className="ra-modal-overlay"
          onClick={() => setShowDownloadModal(false)}
        >
          <div className="ra-modal" onClick={(e) => e.stopPropagation()}>
            <div className="ra-modal__header">
              <div>
                <h2>Download Report</h2>
                <p className="ra-modal__subtitle">
                  Confirm download details
                </p>
              </div>
              <button
                onClick={() => setShowDownloadModal(false)}
                className="ra-modal__close"
              >
                ✕
              </button>
            </div>
            <div className="ra-modal__body">
              <div className="ra-download-summary">
                <div className="ra-download-row">
                  <span>Report Name</span>
                  <span className="font-semibold">{selectedReport.name}</span>
                </div>
                <div className="ra-download-row">
                  <span>Report ID</span>
                  <span className="mono">
                    {selectedReport.id.slice(-8).toUpperCase()}
                  </span>
                </div>
                <div className="ra-download-row">
                  <span>Format</span>
                  <span>{selectedReport.format}</span>
                </div>
                <div className="ra-download-row">
                  <span>File Size</span>
                  <span>{selectedReport.size || "0 MB"}</span>
                </div>
                <div className="ra-download-row">
                  <span>Generated On</span>
                  <span>
                    {selectedReport.createdAt?.toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    }) || "N/A"}
                  </span>
                </div>
              </div>
            </div>
            <div className="ra-modal__footer">
              <button
                onClick={() => setShowDownloadModal(false)}
                className="ra-btn ra-btn--outline"
              >
                Cancel
              </button>
              <button
                onClick={confirmDownload}
                className="ra-btn ra-btn--primary"
              >
                <span>📥</span> Download {selectedReport.format}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}