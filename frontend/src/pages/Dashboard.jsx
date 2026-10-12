import React, { useState, useEffect, useRef } from "react";
import {
  getVehicles,
  registerVehicle,
  updateVehicleStatus,
  getTrips,
  createTrip,
  updateTripStatus,
  optimizeRoute,
  createTrackingWebSocket,
  getMaintenanceAlerts,
} from "../api";
import { useNavigate } from "react-router-dom";
import GoogleMapView from "../components/GoogleMapView";
import TrackingSimulator from "../components/TrackingSimulator";
import { useTheme } from "../context/ThemeContext";

import ShipmentsView from "./ShipmentsView";
import MaintenanceView from "./MaintenanceView";
import DriversView from "./DriversView";
import AnalyticsView from "./AnalyticsView";

export default function Dashboard() {
  const { theme, isDark, toggleTheme } = useTheme();
  const [activeTab, setActiveTab] = useState("Command Center");
  const [vehicles, setVehicles] = useState([]);
  const [showVehicleModal, setShowVehicleModal] = useState(false);
  const [vehicleFilter, setVehicleFilter] = useState("All");
  const [form, setForm] = useState({
    registration_number: "",
    vehicle_type: "Truck",
    capacity: 5000,
    fuel_type: "Diesel",
  });
  const [error, setError] = useState("");
  const [trips, setTrips] = useState([]);
  const [selectedTrip, setSelectedTrip] = useState(null);
  const [liveLocation, setLiveLocation] = useState(null);
  const [showTripModal, setShowTripModal] = useState(false);
  const [routeResult, setRouteResult] = useState(null);
  const [maintenanceAlerts, setMaintenanceAlerts] = useState({ overdue: [], upcoming: [], overdue_count: 0 });
  const [optimizing, setOptimizing] = useState(false);

  const [tripForm, setTripForm] = useState({
    reference: "",
    vehicle_id: "",
    origin: "",
    destination: "",
    origin_lat: 18.5204,
    origin_lng: 73.8567,
    destination_lat: 19.076,
    destination_lng: 72.8777,
    scheduled_departure: new Date().toISOString().slice(0, 16),
    traffic_level: "Moderate",
  });

  const mapSectionRef = useRef(null);
  const navigate = useNavigate();
  const userEmail = localStorage.getItem("userEmail") || localStorage.getItem("email") || "admin@fleetflow.com";
  const userRole = localStorage.getItem("role") || "Administrator";

  const fetchVehicles = async () => {
    try {
      const res = await getVehicles();
      setVehicles(res.data);
    } catch {
      setError("Failed to load vehicles. Please log in again.");
    }
  };

  const fetchTrips = async () => {
    try {
      const res = await getTrips();
      setTrips(res.data);
      setSelectedTrip((current) => current || res.data[0] || null);
    } catch {
      console.error("Failed to load trips");
    }
  };

  const fetchAlerts = async () => {
    try {
      const res = await getMaintenanceAlerts();
      setMaintenanceAlerts(res.data);
    } catch (e) {
      console.error("Failed to load maintenance alerts", e);
    }
  };

  useEffect(() => {
    fetchVehicles();
    fetchTrips();
    fetchAlerts();
  }, []);

  // WebSocket Live GPS stream
  useEffect(() => {
    if (!selectedTrip) return;
    setLiveLocation(null);

    const ws = createTrackingWebSocket(
      selectedTrip.id,
      (payload) => {
        if (payload.latitude && payload.longitude) {
          setLiveLocation({ latitude: payload.latitude, longitude: payload.longitude, speed: payload.speed_kph });
        }
        setTrips((curr) => curr.map((t) => (t.id === payload.trip_id ? { ...t, ...payload } : t)));
      },
      () => console.log("WebSocket Disconnected")
    );

    return () => {
      if (ws) ws.close();
    };
  }, [selectedTrip]);

  const geocodeCity = async (city) => {
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(city)}`);
      const data = await response.json();
      if (data && data.length > 0) {
        return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
      }
    } catch (e) {
      console.error("Geocoding failed for", city);
    }
    return null;
  };

  const handleCreateTrip = async (e) => {
    e.preventDefault();
    try {
      const originCoords = (await geocodeCity(tripForm.origin)) || { lat: tripForm.origin_lat, lng: tripForm.origin_lng };
      const destCoords = (await geocodeCity(tripForm.destination)) || { lat: tripForm.destination_lat, lng: tripForm.destination_lng };

      const updatedTripForm = {
        ...tripForm,
        vehicle_id: parseInt(tripForm.vehicle_id),
        origin_lat: originCoords.lat,
        origin_lng: originCoords.lng,
        destination_lat: destCoords.lat,
        destination_lng: destCoords.lng,
      };

      const res = await createTrip(updatedTripForm);
      setTrips([...trips, res.data]);
      setSelectedTrip(res.data);
      setShowTripModal(false);
      setTripForm({
        reference: "",
        vehicle_id: "",
        origin: "",
        destination: "",
        origin_lat: 18.5204,
        origin_lng: 73.8567,
        destination_lat: 19.076,
        destination_lng: 72.8777,
        scheduled_departure: new Date().toISOString().slice(0, 16),
        traffic_level: "Moderate",
      });
      fetchVehicles();
    } catch {
      alert("Failed to create trip. Please verify vehicle and inputs.");
    }
  };

  const handleAddVehicle = async (e) => {
    e.preventDefault();
    try {
      const res = await registerVehicle(form);
      setVehicles([...vehicles, res.data]);
      setShowVehicleModal(false);
      setForm({ registration_number: "", vehicle_type: "Truck", capacity: 5000, fuel_type: "Diesel" });
    } catch {
      setError("Failed to register vehicle. Ensure you are an Admin or Fleet Manager.");
    }
  };

  const handleVehicleStatusChange = async (vehicleId, newStatus) => {
    try {
      const res = await updateVehicleStatus(vehicleId, { current_status: newStatus });
      setVehicles((curr) => curr.map((v) => (v.id === vehicleId ? res.data : v)));
      fetchAlerts();
    } catch (err) {
      alert("Failed to update status: " + (err.response?.data?.detail || err.message));
    }
  };

  const handleTripStatus = async (status) => {
    if (!selectedTrip) return;
    try {
      const res = await updateTripStatus(selectedTrip.id, status);
      setSelectedTrip(res.data);
      setTrips((curr) => curr.map((t) => (t.id === res.data.id ? res.data : t)));
      fetchVehicles();
    } catch (e) {
      alert("Failed to update trip status.");
    }
  };

  const handleOptimizeRoute = async () => {
    if (!selectedTrip) return;
    setOptimizing(true);
    try {
      const res = await optimizeRoute({
        stops: [
          { name: selectedTrip.origin, latitude: selectedTrip.origin_lat, longitude: selectedTrip.origin_lng },
          { name: selectedTrip.destination, latitude: selectedTrip.destination_lat, longitude: selectedTrip.destination_lng },
        ],
        traffic_level: selectedTrip.traffic_level || "Moderate",
      });
      setRouteResult(res.data);
    } catch (e) {
      alert("Optimization failed.");
    } finally {
      setOptimizing(false);
    }
  };

  // Metrics calculation
  const totalFleet = vehicles.length;
  const availableCount = vehicles.filter((v) => v.current_status === "Available").length;
  const inTransitCount = vehicles.filter((v) => v.current_status === "In Transit").length;
  const maintenanceCount = vehicles.filter((v) => v.current_status === "Maintenance").length;
  const utilizationRate = totalFleet > 0 ? Math.round((inTransitCount / totalFleet) * 100) : 0;

  const filteredVehicles = vehicles.filter((v) => {
    if (vehicleFilter === "All") return true;
    return v.current_status === vehicleFilter || v.vehicle_type === vehicleFilter;
  });

  const navTabs = [
    { id: "Command Center", label: "Command Center", icon: "⚡" },
    { id: "Fleet Registry", label: "Fleet Registry", icon: "🚙" },
    { id: "Shipment Tracking", label: "Shipment Tracking", icon: "📦" },
    { id: "Route Optimizer", label: "Route Optimizer", icon: "🗺️" },
    { id: "Driver Roster", label: "Driver Roster", icon: "🧑‍✈️" },
    {
      id: "Maintenance",
      label: maintenanceAlerts.overdue_count > 0 ? `Maintenance (${maintenanceAlerts.overdue_count}!)` : "Maintenance",
      icon: "🔧",
    },
    { id: "Analytics", label: "Analytics", icon: "📈" },
  ];

  return (
    <div style={{ minHeight: "100vh", backgroundColor: theme.bg, color: theme.text, display: "flex", flexDirection: "column" }}>
      {/* ── TOP NAVIGATION BAR ── */}
      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 100,
          backgroundColor: theme.headerBg,
          backdropFilter: "blur(12px)",
          borderBottom: `1px solid ${theme.cardBorder}`,
          padding: "10px 24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          boxShadow: theme.shadow,
        }}
      >
        {/* Brand */}
        <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "38px",
              height: "38px",
              borderRadius: "10px",
              background: "linear-gradient(135deg, #0284c7 0%, #2563eb 100%)",
              color: "white",
              fontWeight: 800,
              fontSize: "18px",
            }}
          >
            🚚
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ fontWeight: 800, letterSpacing: "1px", fontSize: "16px", color: theme.text }}>
                FLEETFLOW
              </span>
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "5px",
                  fontSize: "10px",
                  fontWeight: 700,
                  letterSpacing: "0.5px",
                  padding: "2px 8px",
                  borderRadius: "20px",
                  backgroundColor: "rgba(16, 185, 129, 0.15)",
                  color: "#10b981",
                  border: "1px solid rgba(16, 185, 129, 0.3)",
                }}
              >
                <span style={{ width: "6px", height: "6px", borderRadius: "50%", backgroundColor: "#10b981" }} />
                LIVE OPERATIONS
              </span>
            </div>
            <div style={{ fontSize: "10px", color: theme.textMuted, letterSpacing: "1.2px", fontWeight: 600 }}>
              INTELLIGENT LOGISTICS
            </div>
          </div>
        </div>

        {/* Center Nav Tabs */}
        <nav style={{ display: "flex", alignItems: "center", gap: "4px" }}>
          {navTabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "8px 14px",
                  borderRadius: "8px",
                  fontSize: "13px",
                  fontWeight: isActive ? 700 : 500,
                  color: isActive ? (isDark ? "#38bdf8" : "#0284c7") : theme.textSecondary,
                  backgroundColor: isActive
                    ? isDark
                      ? "rgba(56, 189, 248, 0.12)"
                      : "rgba(2, 132, 199, 0.1)"
                    : "transparent",
                  border: isActive
                    ? `1px solid ${isDark ? "rgba(56, 189, 248, 0.3)" : "rgba(2, 132, 199, 0.25)"}`
                    : "1px solid transparent",
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                }}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Right Actions: Day/Night Mode & User Profile */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          {/* Day / Night Mode Toggle */}
          <button
            onClick={toggleTheme}
            title={isDark ? "Switch to Day Mode" : "Switch to Night Mode"}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "7px",
              padding: "7px 14px",
              borderRadius: "20px",
              border: `1px solid ${theme.cardBorder}`,
              backgroundColor: isDark ? "rgba(30, 41, 59, 0.7)" : "#ffffff",
              color: theme.text,
              fontSize: "12px",
              fontWeight: 600,
              cursor: "pointer",
              boxShadow: "0 2px 5px rgba(0,0,0,0.06)",
              transition: "all 0.2s ease",
            }}
          >
            <span style={{ fontSize: "14px" }}>{isDark ? "☀️" : "🌙"}</span>
            <span>{isDark ? "Day Mode" : "Night Mode"}</span>
          </button>

          {/* User Profile Tag */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-end",
              paddingLeft: "8px",
              borderLeft: `1px solid ${theme.cardBorder}`,
            }}
          >
            <span style={{ fontSize: "12px", fontWeight: 600, color: theme.text }}>{userEmail}</span>
            <span
              style={{
                fontSize: "10px",
                fontWeight: 700,
                color: isDark ? "#93c5fd" : "#2563eb",
                textTransform: "uppercase",
                letterSpacing: "0.5px",
              }}
            >
              {userRole}
            </span>
          </div>

          {/* Logout */}
          <button
            onClick={() => {
              localStorage.removeItem("token");
              navigate("/");
            }}
            style={{
              padding: "7px 14px",
              borderRadius: "8px",
              border: "1px solid rgba(239, 68, 68, 0.3)",
              backgroundColor: "rgba(239, 68, 68, 0.1)",
              color: "#ef4444",
              fontSize: "12px",
              fontWeight: 600,
              cursor: "pointer",
              transition: "all 0.2s ease",
            }}
          >
            Sign Out
          </button>
        </div>
      </header>

      {/* ── MAIN BODY CONTENT ── */}
      <main style={{ flex: 1, padding: "24px 28px", maxWidth: "1600px", margin: "0 auto", width: "100%" }}>
        {error && (
          <div
            style={{
              marginBottom: "20px",
              padding: "12px 18px",
              borderRadius: "8px",
              backgroundColor: "rgba(239, 68, 68, 0.15)",
              border: "1px solid #ef4444",
              color: "#f87171",
              fontSize: "13px",
            }}
          >
            {error}
          </div>
        )}

        {/* ══════════ TAB 1: COMMAND CENTER ══════════ */}
        {activeTab === "Command Center" && (
          <div>
            {/* 1. Hero Dispatch Card matching Image 1 */}
            <div
              style={{
                background: theme.heroGradient,
                borderRadius: "16px",
                padding: "32px 36px",
                marginBottom: "24px",
                border: `1px solid ${theme.cardBorder}`,
                boxShadow: theme.shadow,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                position: "relative",
                overflow: "hidden",
              }}
            >
              <div style={{ maxWidth: "720px", zIndex: 1 }}>
                <span
                  style={{
                    display: "inline-block",
                    fontSize: "11px",
                    fontWeight: 800,
                    letterSpacing: "1.5px",
                    color: isDark ? "#38bdf8" : "#0284c7",
                    marginBottom: "8px",
                  }}
                >
                  OPERATIONAL DISPATCH PLATFORM
                </span>
                <h1 style={{ margin: "0 0 10px", fontSize: "28px", fontWeight: 800, color: theme.text }}>
                  FleetFlow Logistics Command Center
                </h1>
                <p style={{ margin: 0, fontSize: "14px", color: theme.textSecondary, lineHeight: "1.6" }}>
                  Centralized intelligent logistics hub coordinating vehicle telemetry, traffic-aware route
                  optimization, and driver dispatching in real time.
                </p>
              </div>

              {/* Action Buttons */}
              <div style={{ display: "flex", gap: "12px", zIndex: 1 }}>
                <button
                  onClick={() => {
                    mapSectionRef.current?.scrollIntoView({ behavior: "smooth" });
                  }}
                  style={{
                    padding: "12px 22px",
                    borderRadius: "10px",
                    border: "none",
                    background: "linear-gradient(135deg, #0284c7 0%, #0ea5e9 100%)",
                    color: "white",
                    fontWeight: 700,
                    fontSize: "14px",
                    cursor: "pointer",
                    boxShadow: "0 4px 14px rgba(14, 165, 233, 0.4)",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                  }}
                >
                  <span>🗺️</span>
                  <span>Launch Live Map</span>
                </button>

                <button
                  onClick={() => setShowTripModal(true)}
                  style={{
                    padding: "12px 22px",
                    borderRadius: "10px",
                    border: `1px solid ${isDark ? "#38bdf8" : "#0284c7"}`,
                    background: isDark ? "rgba(56, 189, 248, 0.12)" : "rgba(2, 132, 199, 0.08)",
                    color: isDark ? "#38bdf8" : "#0284c7",
                    fontWeight: 700,
                    fontSize: "14px",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                  }}
                >
                  <span>+</span>
                  <span>Dispatch Trip</span>
                </button>
              </div>
            </div>

            {/* 2. Overdue Maintenance Alert Banner */}
            {maintenanceAlerts.overdue_count > 0 && (
              <div
                style={{
                  marginBottom: "24px",
                  padding: "14px 22px",
                  borderRadius: "12px",
                  backgroundColor: "rgba(239, 68, 68, 0.12)",
                  border: "1px solid rgba(239, 68, 68, 0.4)",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <span style={{ fontSize: "22px" }}>⚠️</span>
                  <div>
                    <strong style={{ color: "#f87171", fontSize: "14px" }}>
                      Maintenance Alert: {maintenanceAlerts.overdue_count} vehicle(s) require urgent service!
                    </strong>
                    <div style={{ color: theme.textSecondary, fontSize: "12px", marginTop: "2px" }}>
                      {maintenanceAlerts.overdue.map((r) => `Vehicle #${r.vehicle_id} (${r.maintenance_type})`).join(" · ")}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setActiveTab("Maintenance")}
                  style={{
                    padding: "8px 16px",
                    background: "#ef4444",
                    color: "white",
                    border: "none",
                    borderRadius: "8px",
                    fontWeight: 600,
                    fontSize: "12px",
                    cursor: "pointer",
                  }}
                >
                  Resolve in Maintenance
                </button>
              </div>
            )}

            {/* 3. The 5-Metric Command Center Cards matching Image 1 */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(5, 1fr)",
                gap: "16px",
                marginBottom: "28px",
              }}
            >
              {/* Card 1: Total Fleet */}
              <div
                style={{
                  background: theme.kpiGradients.total,
                  border: `1px solid ${theme.cardBorder}`,
                  borderRadius: "14px",
                  padding: "20px 22px",
                  boxShadow: theme.shadow,
                }}
              >
                <div style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "1px", color: theme.textMuted, marginBottom: "8px" }}>
                  TOTAL FLEET
                </div>
                <div style={{ fontSize: "32px", fontWeight: 800, color: theme.text, marginBottom: "4px" }}>
                  {totalFleet}
                </div>
                <div style={{ fontSize: "12px", color: theme.textSecondary }}>Units in enterprise fleet</div>
              </div>

              {/* Card 2: Available For Dispatch */}
              <div
                style={{
                  background: theme.kpiGradients.avail,
                  border: `1px solid ${isDark ? "rgba(16, 185, 129, 0.3)" : "rgba(16, 185, 129, 0.2)"}`,
                  borderRadius: "14px",
                  padding: "20px 22px",
                  boxShadow: theme.shadow,
                }}
              >
                <div style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "1px", color: "#10b981", marginBottom: "8px" }}>
                  AVAILABLE FOR DISPATCH
                </div>
                <div style={{ fontSize: "32px", fontWeight: 800, color: "#10b981", marginBottom: "4px" }}>
                  {availableCount}
                </div>
                <div style={{ fontSize: "12px", color: theme.textSecondary }}>Ready for assignment</div>
              </div>

              {/* Card 3: Active in Transit */}
              <div
                style={{
                  background: theme.kpiGradients.transit,
                  border: `1px solid ${isDark ? "rgba(14, 165, 233, 0.3)" : "rgba(14, 165, 233, 0.2)"}`,
                  borderRadius: "14px",
                  padding: "20px 22px",
                  boxShadow: theme.shadow,
                }}
              >
                <div style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "1px", color: isDark ? "#38bdf8" : "#0284c7", marginBottom: "8px" }}>
                  ACTIVE IN TRANSIT
                </div>
                <div style={{ fontSize: "32px", fontWeight: 800, color: isDark ? "#38bdf8" : "#0284c7", marginBottom: "4px" }}>
                  {inTransitCount}
                </div>
                <div style={{ fontSize: "12px", color: theme.textSecondary }}>Live GPS tracked</div>
              </div>

              {/* Card 4: Under Maintenance */}
              <div
                onClick={() => setActiveTab("Maintenance")}
                style={{
                  background: theme.kpiGradients.maint,
                  border: `1px solid ${isDark ? "rgba(239, 68, 68, 0.3)" : "rgba(239, 68, 68, 0.2)"}`,
                  borderRadius: "14px",
                  padding: "20px 22px",
                  boxShadow: theme.shadow,
                  cursor: "pointer",
                }}
              >
                <div style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "1px", color: "#ef4444", marginBottom: "8px" }}>
                  UNDER MAINTENANCE
                </div>
                <div style={{ fontSize: "32px", fontWeight: 800, color: "#ef4444", marginBottom: "4px" }}>
                  {maintenanceCount}
                </div>
                <div style={{ fontSize: "12px", color: theme.textSecondary }}>Servicing & inspection</div>
              </div>

              {/* Card 5: Fleet Utilization */}
              <div
                style={{
                  background: theme.kpiGradients.util,
                  border: `1px solid ${isDark ? "rgba(245, 158, 11, 0.3)" : "rgba(245, 158, 11, 0.2)"}`,
                  borderRadius: "14px",
                  padding: "20px 22px",
                  boxShadow: theme.shadow,
                }}
              >
                <div style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "1px", color: "#f59e0b", marginBottom: "8px" }}>
                  FLEET UTILIZATION
                </div>
                <div style={{ fontSize: "32px", fontWeight: 800, color: "#f59e0b", marginBottom: "4px" }}>
                  {utilizationRate}%
                </div>
                <div style={{ fontSize: "12px", color: theme.textSecondary }}>Operational load index</div>
              </div>
            </div>

            {/* 4. Platform Functional Modules Cards matching Image 1 */}
            <div style={{ marginBottom: "32px" }}>
              <div style={{ fontSize: "16px", fontWeight: 700, marginBottom: "14px", color: theme.text }}>
                Platform Functional Modules
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px" }}>
                {/* Module 1 */}
                <div
                  onClick={() => setActiveTab("Fleet Registry")}
                  style={{
                    background: theme.cardBg,
                    border: `1px solid ${theme.cardBorder}`,
                    borderRadius: "14px",
                    padding: "20px 24px",
                    cursor: "pointer",
                    boxShadow: theme.shadow,
                    transition: "transform 0.2s ease, border-color 0.2s ease",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                    <span style={{ fontSize: "24px" }}>🚙</span>
                    <span
                      style={{
                        fontSize: "11px",
                        padding: "3px 10px",
                        borderRadius: "20px",
                        backgroundColor: isDark ? "rgba(56, 189, 248, 0.15)" : "#e0f2fe",
                        color: isDark ? "#38bdf8" : "#0284c7",
                        fontWeight: 700,
                      }}
                    >
                      {totalFleet} Registered Vehicles
                    </span>
                  </div>
                  <h3 style={{ margin: "0 0 6px", fontSize: "16px", fontWeight: 700, color: theme.text }}>
                    Fleet Management Module
                  </h3>
                  <p style={{ margin: 0, fontSize: "13px", color: theme.textMuted }}>
                    Vehicle registration, capacity monitoring, fuel classification, and status tracking.
                  </p>
                </div>

                {/* Module 2 */}
                <div
                  onClick={() => setActiveTab("Shipment Tracking")}
                  style={{
                    background: theme.cardBg,
                    border: `1px solid ${theme.cardBorder}`,
                    borderRadius: "14px",
                    padding: "20px 24px",
                    cursor: "pointer",
                    boxShadow: theme.shadow,
                    transition: "transform 0.2s ease, border-color 0.2s ease",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                    <span style={{ fontSize: "24px" }}>📦</span>
                    <span
                      style={{
                        fontSize: "11px",
                        padding: "3px 10px",
                        borderRadius: "20px",
                        backgroundColor: isDark ? "rgba(16, 185, 129, 0.15)" : "#d1fae5",
                        color: "#10b981",
                        fontWeight: 700,
                      }}
                    >
                      Live WebSocket Stream
                    </span>
                  </div>
                  <h3 style={{ margin: "0 0 6px", fontSize: "16px", fontWeight: 700, color: theme.text }}>
                    Shipment Tracking & Dispatch
                  </h3>
                  <p style={{ margin: 0, fontSize: "13px", color: theme.textMuted }}>
                    Real-time GPS satellite tracking, dynamic ETA prediction, and cargo parcel milestones.
                  </p>
                </div>

                {/* Module 3 */}
                <div
                  onClick={() => setActiveTab("Route Optimizer")}
                  style={{
                    background: theme.cardBg,
                    border: `1px solid ${theme.cardBorder}`,
                    borderRadius: "14px",
                    padding: "20px 24px",
                    cursor: "pointer",
                    boxShadow: theme.shadow,
                    transition: "transform 0.2s ease, border-color 0.2s ease",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                    <span style={{ fontSize: "24px" }}>🗺️</span>
                    <span
                      style={{
                        fontSize: "11px",
                        padding: "3px 10px",
                        borderRadius: "20px",
                        backgroundColor: isDark ? "rgba(245, 158, 11, 0.15)" : "#fef3c7",
                        color: "#f59e0b",
                        fontWeight: 700,
                      }}
                    >
                      Traffic-Aware AI Engine
                    </span>
                  </div>
                  <h3 style={{ margin: "0 0 6px", fontSize: "16px", fontWeight: 700, color: theme.text }}>
                    Route Optimization & Navigation
                  </h3>
                  <p style={{ margin: 0, fontSize: "13px", color: theme.textMuted }}>
                    Multi-stop shortest path algorithms, real-time traffic avoidance, and fuel-optimal routing.
                  </p>
                </div>
              </div>
            </div>

            {/* 5. Live Operations Map & Telemetry matching Image 2 */}
            <div ref={mapSectionRef} style={{ marginBottom: "32px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                <div>
                  <span style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "1.2px", color: isDark ? "#38bdf8" : "#0284c7" }}>
                    REAL-TIME TELEMETRY
                  </span>
                  <h2 style={{ margin: "4px 0 0", fontSize: "20px", fontWeight: 800, color: theme.text }}>
                    Live Vehicle Tracking & Route Navigation
                  </h2>
                </div>

                <div style={{ display: "flex", gap: "10px" }}>
                  <button
                    onClick={() => setShowTripModal(true)}
                    style={{
                      padding: "8px 16px",
                      borderRadius: "8px",
                      background: "#2563eb",
                      color: "white",
                      border: "none",
                      fontWeight: 600,
                      fontSize: "13px",
                      cursor: "pointer",
                    }}
                  >
                    + Schedule Trip
                  </button>
                </div>
              </div>

              {/* Grid: Left Map (Image 2), Right Telemetry Panel */}
              <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: "20px" }}>
                {/* Map Card */}
                <div
                  style={{
                    height: "460px",
                    borderRadius: "14px",
                    overflow: "hidden",
                    border: `1px solid ${theme.cardBorder}`,
                    boxShadow: theme.shadow,
                    backgroundColor: theme.surface,
                  }}
                >
                  <GoogleMapView trip={selectedTrip} liveLocation={liveLocation} />
                </div>

                {/* Right Telemetry Card */}
                <div
                  style={{
                    backgroundColor: theme.cardBg,
                    border: `1px solid ${theme.cardBorder}`,
                    borderRadius: "14px",
                    padding: "24px",
                    boxShadow: theme.shadow,
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                  }}
                >
                  <div>
                    {/* Header */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "18px" }}>
                      <div>
                        <span style={{ fontSize: "11px", color: theme.textMuted, fontWeight: 700, letterSpacing: "1px" }}>
                          SELECTED TRIP TELEMETRY
                        </span>
                        <h3 style={{ margin: "4px 0 0", fontSize: "18px", color: theme.text }}>
                          {selectedTrip ? selectedTrip.reference : "No Trip Selected"}
                        </h3>
                      </div>
                      {selectedTrip && (
                        <span
                          style={{
                            padding: "4px 10px",
                            borderRadius: "20px",
                            fontSize: "12px",
                            fontWeight: 700,
                            backgroundColor:
                              selectedTrip.status === "In Transit"
                                ? "rgba(14, 165, 233, 0.15)"
                                : selectedTrip.status === "Delivered"
                                ? "rgba(16, 185, 129, 0.15)"
                                : "rgba(148, 163, 184, 0.15)",
                            color:
                              selectedTrip.status === "In Transit"
                                ? "#0ea5e9"
                                : selectedTrip.status === "Delivered"
                                ? "#10b981"
                                : "#94a3b8",
                          }}
                        >
                          {selectedTrip.status}
                        </span>
                      )}
                    </div>

                    {/* Quick Trip Selector */}
                    <div style={{ marginBottom: "18px" }}>
                      <label style={{ fontSize: "12px", color: theme.textMuted, display: "block", marginBottom: "6px" }}>
                        Active Scheduled Trips:
                      </label>
                      <select
                        value={selectedTrip?.id || ""}
                        onChange={(e) => {
                          const trip = trips.find((t) => t.id === parseInt(e.target.value));
                          setSelectedTrip(trip || null);
                          setRouteResult(null);
                        }}
                        style={{
                          width: "100%",
                          padding: "10px",
                          borderRadius: "8px",
                          backgroundColor: theme.inputBg,
                          border: `1px solid ${theme.inputBorder}`,
                          color: theme.text,
                          fontSize: "13px",
                          outline: "none",
                        }}
                      >
                        {trips.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.reference} : {t.origin} → {t.destination} ({t.status})
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Telemetry Stats (Velocity & Distance) */}
                    {selectedTrip && (
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "1fr 1fr",
                          gap: "12px",
                          padding: "16px",
                          borderRadius: "10px",
                          backgroundColor: isDark ? "rgba(15, 23, 42, 0.5)" : "rgba(241, 245, 249, 0.7)",
                          marginBottom: "16px",
                        }}
                      >
                        <div>
                          <div style={{ fontSize: "11px", color: theme.textMuted }}>Current Velocity</div>
                          <div style={{ fontSize: "24px", fontWeight: 800, color: theme.text }}>
                            {liveLocation?.speed ? `${liveLocation.speed} km/h` : "45.0 km/h"}
                          </div>
                        </div>
                        <div>
                          <div style={{ fontSize: "11px", color: theme.textMuted }}>Trip Distance</div>
                          <div style={{ fontSize: "24px", fontWeight: 800, color: isDark ? "#38bdf8" : "#0284c7" }}>
                            {selectedTrip.distance_km ? `${selectedTrip.distance_km} km` : "240 km"}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Route Details */}
                    {selectedTrip && (
                      <div style={{ fontSize: "13px", color: theme.textSecondary, marginBottom: "16px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                          <span>Origin: <strong>{selectedTrip.origin}</strong></span>
                          <span>Destination: <strong>{selectedTrip.destination}</strong></span>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                          <span>Traffic Condition: <strong style={{ color: "#10b981" }}>{selectedTrip.traffic_level || "Optimal"}</strong></span>
                          <span>ETA: <strong>{selectedTrip.duration_minutes ? `${selectedTrip.duration_minutes} min` : "4.5 hrs"}</strong></span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Actions & Simulator */}
                  <div>
                    {selectedTrip && (
                      <div style={{ display: "flex", gap: "8px", marginBottom: "10px" }}>
                        <button
                          onClick={handleOptimizeRoute}
                          disabled={optimizing}
                          style={{
                            flex: 1,
                            padding: "9px 12px",
                            borderRadius: "8px",
                            border: `1px solid ${theme.cardBorder}`,
                            backgroundColor: isDark ? "#1e293b" : "#f1f5f9",
                            color: theme.text,
                            fontSize: "12px",
                            fontWeight: 600,
                            cursor: optimizing ? "not-allowed" : "pointer",
                          }}
                        >
                          {optimizing ? "Optimizing..." : "⚡ Optimize Route"}
                        </button>
                        <select
                          value={selectedTrip.status}
                          onChange={(e) => handleTripStatus(e.target.value)}
                          style={{
                            padding: "9px 12px",
                            borderRadius: "8px",
                            backgroundColor: theme.inputBg,
                            border: `1px solid ${theme.inputBorder}`,
                            color: theme.text,
                            fontSize: "12px",
                            cursor: "pointer",
                          }}
                        >
                          <option value="Scheduled">Scheduled</option>
                          <option value="In Transit">In Transit</option>
                          <option value="Delivered">Delivered</option>
                          <option value="Delayed">Delayed</option>
                          <option value="Cancelled">Cancelled</option>
                        </select>
                      </div>
                    )}

                    {routeResult && (
                      <div
                        style={{
                          marginBottom: "10px",
                          padding: "10px 14px",
                          borderRadius: "8px",
                          backgroundColor: "rgba(56, 189, 248, 0.1)",
                          border: "1px solid rgba(56, 189, 248, 0.3)",
                          fontSize: "12px",
                          color: isDark ? "#7dd3fc" : "#0369a1",
                        }}
                      >
                        ⚡ Optimized: {routeResult.ordered_stops.map((s) => s.name).join(" → ")} ({routeResult.distance_km} km in {routeResult.duration_minutes} min)
                      </div>
                    )}

                    <TrackingSimulator trip={selectedTrip} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ══════════ TAB 2: FLEET REGISTRY ══════════ */}
        {activeTab === "Fleet Registry" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <div>
                <h2 style={{ margin: "0 0 4px", fontSize: "22px", fontWeight: 800, color: theme.text }}>
                  Fleet Vehicle Registry
                </h2>
                <p style={{ margin: 0, fontSize: "13px", color: theme.textMuted }}>
                  Manage enterprise assets, fuel specifications, and real-time maintenance statuses.
                </p>
              </div>

              <div style={{ display: "flex", gap: "10px" }}>
                <select
                  value={vehicleFilter}
                  onChange={(e) => setVehicleFilter(e.target.value)}
                  style={{
                    padding: "8px 14px",
                    borderRadius: "8px",
                    backgroundColor: theme.inputBg,
                    border: `1px solid ${theme.inputBorder}`,
                    color: theme.text,
                    fontSize: "13px",
                  }}
                >
                  <option value="All">All Vehicles</option>
                  <option value="Available">Available</option>
                  <option value="In Transit">In Transit</option>
                  <option value="Maintenance">Maintenance</option>
                  <option value="Truck">Trucks</option>
                  <option value="Van">Vans</option>
                  <option value="Bus">Buses</option>
                </select>

                <button
                  onClick={() => setShowVehicleModal(true)}
                  style={{
                    padding: "9px 18px",
                    borderRadius: "8px",
                    background: "#2563eb",
                    color: "white",
                    border: "none",
                    fontWeight: 600,
                    fontSize: "13px",
                    cursor: "pointer",
                  }}
                >
                  + Register Vehicle
                </button>
              </div>
            </div>

            {/* Vehicle Table */}
            <div
              style={{
                backgroundColor: theme.cardBg,
                borderRadius: "14px",
                border: `1px solid ${theme.cardBorder}`,
                boxShadow: theme.shadow,
                overflow: "hidden",
              }}
            >
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ backgroundColor: theme.tableHeader, borderBottom: `1px solid ${theme.tableRowBorder}` }}>
                    {["ID", "Registration", "Type", "Capacity (kg)", "Fuel Type", "Current Status", "Actions"].map((h) => (
                      <th
                        key={h}
                        style={{
                          padding: "14px 18px",
                          textAlign: "left",
                          fontSize: "12px",
                          fontWeight: 700,
                          color: theme.textMuted,
                          letterSpacing: "0.5px",
                        }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredVehicles.map((v) => (
                    <tr
                      key={v.id}
                      style={{
                        borderBottom: `1px solid ${theme.tableRowBorder}`,
                        transition: "background-color 0.15s ease",
                      }}
                    >
                      <td style={{ padding: "14px 18px", fontSize: "13px", color: theme.textMuted }}>#{v.id}</td>
                      <td style={{ padding: "14px 18px", fontSize: "14px", fontWeight: 700, color: theme.text }}>
                        {v.registration_number}
                      </td>
                      <td style={{ padding: "14px 18px", fontSize: "13px", color: theme.textSecondary }}>{v.vehicle_type}</td>
                      <td style={{ padding: "14px 18px", fontSize: "13px", color: theme.textSecondary }}>{v.capacity} kg</td>
                      <td style={{ padding: "14px 18px", fontSize: "13px", color: theme.textSecondary }}>{v.fuel_type}</td>
                      <td style={{ padding: "14px 18px" }}>
                        <span
                          style={{
                            padding: "4px 12px",
                            borderRadius: "20px",
                            fontSize: "12px",
                            fontWeight: 700,
                            backgroundColor:
                              v.current_status === "Available"
                                ? "rgba(16, 185, 129, 0.15)"
                                : v.current_status === "In Transit"
                                ? "rgba(14, 165, 233, 0.15)"
                                : "rgba(245, 158, 11, 0.15)",
                            color:
                              v.current_status === "Available"
                                ? "#10b981"
                                : v.current_status === "In Transit"
                                ? "#0ea5e9"
                                : "#f59e0b",
                          }}
                        >
                          {v.current_status}
                        </span>
                      </td>
                      <td style={{ padding: "14px 18px" }}>
                        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                          <select
                            value={v.current_status}
                            onChange={(e) => handleVehicleStatusChange(v.id, e.target.value)}
                            style={{
                              padding: "5px 8px",
                              borderRadius: "6px",
                              backgroundColor: theme.inputBg,
                              border: `1px solid ${theme.inputBorder}`,
                              color: theme.text,
                              fontSize: "12px",
                              cursor: "pointer",
                            }}
                          >
                            <option value="Available">Available</option>
                            <option value="Maintenance">Maintenance</option>
                            <option value="In Transit">In Transit</option>
                          </select>
                          <button
                            onClick={() => setActiveTab("Maintenance")}
                            style={{
                              padding: "5px 10px",
                              borderRadius: "6px",
                              background: "#3b82f6",
                              color: "white",
                              border: "none",
                              fontSize: "12px",
                              cursor: "pointer",
                              fontWeight: 600,
                            }}
                          >
                            🔧 Service
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredVehicles.length === 0 && (
                    <tr>
                      <td colSpan={7} style={{ padding: "32px", textAlign: "center", color: theme.textMuted }}>
                        No vehicles found matching current filter.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ══════════ OTHER TABS ══════════ */}
        {activeTab === "Shipment Tracking" && <ShipmentsView />}
        {activeTab === "Route Optimizer" && (
          <div style={{ backgroundColor: theme.cardBg, borderRadius: "14px", border: `1px solid ${theme.cardBorder}`, padding: "24px" }}>
            <h2 style={{ margin: "0 0 10px", fontSize: "20px", color: theme.text }}>Route Optimization & Waypoint Planning</h2>
            <p style={{ color: theme.textMuted, fontSize: "13px", marginBottom: "20px" }}>
              Select any active trip to optimize path ordering with live traffic mitigation.
            </p>
            <div style={{ height: "420px", borderRadius: "10px", overflow: "hidden", marginBottom: "20px" }}>
              <GoogleMapView trip={selectedTrip} liveLocation={liveLocation} />
            </div>
            <button
              onClick={handleOptimizeRoute}
              disabled={optimizing}
              style={{
                padding: "10px 20px",
                background: "linear-gradient(135deg, #0284c7 0%, #2563eb 100%)",
                color: "white",
                border: "none",
                borderRadius: "8px",
                fontWeight: 700,
                cursor: optimizing ? "not-allowed" : "pointer",
              }}
            >
              {optimizing ? "Calculating Optimal Trajectory..." : "Run AI Route Optimizer"}
            </button>
            {routeResult && (
              <div style={{ marginTop: "16px", padding: "14px", borderRadius: "8px", backgroundColor: isDark ? "#0f172a" : "#f1f5f9" }}>
                <strong>Optimal Sequence:</strong> {routeResult.ordered_stops.map((s) => s.name).join(" ➔ ")} |{" "}
                {routeResult.distance_km} km ({routeResult.duration_minutes} minutes)
              </div>
            )}
          </div>
        )}
        {activeTab === "Driver Roster" && <DriversView />}
        {activeTab === "Maintenance" && <MaintenanceView />}
        {activeTab === "Analytics" && <AnalyticsView />}

        {/* ── MODAL: SCHEDULE TRIP ── */}
        {showTripModal && (
          <div
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: "rgba(0, 0, 0, 0.65)",
              backdropFilter: "blur(4px)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 1000,
            }}
          >
            <div
              style={{
                backgroundColor: theme.surface,
                borderRadius: "16px",
                padding: "28px 32px",
                width: "480px",
                border: `1px solid ${theme.cardBorder}`,
                boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "18px" }}>
                <h3 style={{ margin: 0, fontSize: "18px", color: theme.text }}>Dispatch New Trip</h3>
                <button
                  onClick={() => setShowTripModal(false)}
                  style={{ background: "none", border: "none", fontSize: "20px", color: theme.textMuted, cursor: "pointer" }}
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleCreateTrip}>
                <div style={{ marginBottom: "12px" }}>
                  <label style={{ fontSize: "12px", color: theme.textMuted, display: "block", marginBottom: "4px" }}>
                    Trip Reference Code
                  </label>
                  <input
                    placeholder="e.g. TRIP-101"
                    value={tripForm.reference}
                    onChange={(e) => setTripForm({ ...tripForm, reference: e.target.value })}
                    required
                    style={{ width: "100%", padding: "10px", borderRadius: "8px", backgroundColor: theme.inputBg, border: `1px solid ${theme.inputBorder}`, color: theme.text }}
                  />
                </div>

                <div style={{ marginBottom: "12px" }}>
                  <label style={{ fontSize: "12px", color: theme.textMuted, display: "block", marginBottom: "4px" }}>
                    Available Vehicle
                  </label>
                  <select
                    value={tripForm.vehicle_id}
                    onChange={(e) => setTripForm({ ...tripForm, vehicle_id: e.target.value })}
                    required
                    style={{ width: "100%", padding: "10px", borderRadius: "8px", backgroundColor: theme.inputBg, border: `1px solid ${theme.inputBorder}`, color: theme.text }}
                  >
                    <option value="">Select an Available Vehicle</option>
                    {vehicles
                      .filter((v) => v.current_status === "Available")
                      .map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.registration_number} ({v.vehicle_type} - {v.capacity}kg)
                        </option>
                      ))}
                  </select>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "12px" }}>
                  <div>
                    <label style={{ fontSize: "12px", color: theme.textMuted, display: "block", marginBottom: "4px" }}>
                      Origin City
                    </label>
                    <input
                      placeholder="e.g. Pune"
                      value={tripForm.origin}
                      onChange={(e) => setTripForm({ ...tripForm, origin: e.target.value })}
                      required
                      style={{ width: "100%", padding: "10px", borderRadius: "8px", backgroundColor: theme.inputBg, border: `1px solid ${theme.inputBorder}`, color: theme.text }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: "12px", color: theme.textMuted, display: "block", marginBottom: "4px" }}>
                      Destination City
                    </label>
                    <input
                      placeholder="e.g. Mumbai"
                      value={tripForm.destination}
                      onChange={(e) => setTripForm({ ...tripForm, destination: e.target.value })}
                      required
                      style={{ width: "100%", padding: "10px", borderRadius: "8px", backgroundColor: theme.inputBg, border: `1px solid ${theme.inputBorder}`, color: theme.text }}
                    />
                  </div>
                </div>

                <div style={{ display: "flex", gap: "10px", marginTop: "20px" }}>
                  <button
                    type="button"
                    onClick={() => setShowTripModal(false)}
                    style={{ flex: 1, padding: "10px", borderRadius: "8px", backgroundColor: "transparent", border: `1px solid ${theme.cardBorder}`, color: theme.textSecondary, cursor: "pointer" }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    style={{ flex: 1, padding: "10px", borderRadius: "8px", backgroundColor: "#2563eb", border: "none", color: "white", fontWeight: 700, cursor: "pointer" }}
                  >
                    Create & Dispatch
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ── MODAL: REGISTER VEHICLE ── */}
        {showVehicleModal && (
          <div
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: "rgba(0, 0, 0, 0.65)",
              backdropFilter: "blur(4px)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 1000,
            }}
          >
            <div
              style={{
                backgroundColor: theme.surface,
                borderRadius: "16px",
                padding: "28px 32px",
                width: "440px",
                border: `1px solid ${theme.cardBorder}`,
                boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "18px" }}>
                <h3 style={{ margin: 0, fontSize: "18px", color: theme.text }}>Register Enterprise Vehicle</h3>
                <button
                  onClick={() => setShowVehicleModal(false)}
                  style={{ background: "none", border: "none", fontSize: "20px", color: theme.textMuted, cursor: "pointer" }}
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleAddVehicle}>
                <div style={{ marginBottom: "12px" }}>
                  <label style={{ fontSize: "12px", color: theme.textMuted, display: "block", marginBottom: "4px" }}>
                    License Plate / Registration
                  </label>
                  <input
                    placeholder="e.g. MH-12-QW-9999"
                    value={form.registration_number}
                    onChange={(e) => setForm({ ...form, registration_number: e.target.value })}
                    required
                    style={{ width: "100%", padding: "10px", borderRadius: "8px", backgroundColor: theme.inputBg, border: `1px solid ${theme.inputBorder}`, color: theme.text }}
                  />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "12px" }}>
                  <div>
                    <label style={{ fontSize: "12px", color: theme.textMuted, display: "block", marginBottom: "4px" }}>
                      Vehicle Class
                    </label>
                    <select
                      value={form.vehicle_type}
                      onChange={(e) => setForm({ ...form, vehicle_type: e.target.value })}
                      style={{ width: "100%", padding: "10px", borderRadius: "8px", backgroundColor: theme.inputBg, border: `1px solid ${theme.inputBorder}`, color: theme.text }}
                    >
                      <option>Truck</option>
                      <option>Van</option>
                      <option>Bus</option>
                      <option>Car</option>
                      <option>Trailer</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: "12px", color: theme.textMuted, display: "block", marginBottom: "4px" }}>
                      Payload Capacity (kg)
                    </label>
                    <input
                      type="number"
                      value={form.capacity}
                      onChange={(e) => setForm({ ...form, capacity: parseInt(e.target.value) || 0 })}
                      required
                      style={{ width: "100%", padding: "10px", borderRadius: "8px", backgroundColor: theme.inputBg, border: `1px solid ${theme.inputBorder}`, color: theme.text }}
                    />
                  </div>
                </div>

                <div style={{ marginBottom: "16px" }}>
                  <label style={{ fontSize: "12px", color: theme.textMuted, display: "block", marginBottom: "4px" }}>
                    Fuel Architecture
                  </label>
                  <select
                    value={form.fuel_type}
                    onChange={(e) => setForm({ ...form, fuel_type: e.target.value })}
                    style={{ width: "100%", padding: "10px", borderRadius: "8px", backgroundColor: theme.inputBg, border: `1px solid ${theme.inputBorder}`, color: theme.text }}
                  >
                    <option>Diesel</option>
                    <option>Petrol</option>
                    <option>Electric (EV)</option>
                    <option>CNG</option>
                  </select>
                </div>

                <div style={{ display: "flex", gap: "10px" }}>
                  <button
                    type="button"
                    onClick={() => setShowVehicleModal(false)}
                    style={{ flex: 1, padding: "10px", borderRadius: "8px", backgroundColor: "transparent", border: `1px solid ${theme.cardBorder}`, color: theme.textSecondary, cursor: "pointer" }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    style={{ flex: 1, padding: "10px", borderRadius: "8px", backgroundColor: "#2563eb", border: "none", color: "white", fontWeight: 700, cursor: "pointer" }}
                  >
                    Register
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
