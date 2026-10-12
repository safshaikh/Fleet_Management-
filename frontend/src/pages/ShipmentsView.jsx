import React, { useState, useEffect } from "react";
import { getShipments, createShipment, updateShipmentStatus, getTrips } from "../api";
import { useTheme } from "../context/ThemeContext";

const STATUS_CONFIG = {
  Created: { bg: "rgba(59, 130, 246, 0.15)", text: "#3b82f6", border: "rgba(59, 130, 246, 0.3)" },
  Assigned: { bg: "rgba(168, 85, 247, 0.15)", text: "#a855f7", border: "rgba(168, 85, 247, 0.3)" },
  "In Transit": { bg: "rgba(14, 165, 233, 0.15)", text: "#0ea5e9", border: "rgba(14, 165, 233, 0.3)" },
  Delivered: { bg: "rgba(16, 185, 129, 0.15)", text: "#10b981", border: "rgba(16, 185, 129, 0.3)" },
  Delayed: { bg: "rgba(245, 158, 11, 0.15)", text: "#f59e0b", border: "rgba(245, 158, 11, 0.3)" },
  Cancelled: { bg: "rgba(239, 68, 68, 0.15)", text: "#ef4444", border: "rgba(239, 68, 68, 0.3)" },
};

export default function ShipmentsView() {
  const { theme, isDark } = useTheme();
  const [shipments, setShipments] = useState([]);
  const [trips, setTrips] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [filter, setFilter] = useState("All");

  const [form, setForm] = useState({
    tracking_number: "",
    delivery_address: "",
    weight: 0,
    trip_id: "",
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [shipmentsRes, tripsRes] = await Promise.all([getShipments(), getTrips()]);
      setShipments(shipmentsRes.data);
      setTrips(tripsRes.data);
    } catch (e) {
      console.error("Failed to load shipments data", e);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      const payload = { ...form, trip_id: form.trip_id ? parseInt(form.trip_id) : null };
      const res = await createShipment(payload);
      setShipments([...shipments, res.data]);
      setShowModal(false);
      setForm({ tracking_number: "", delivery_address: "", weight: 0, trip_id: "" });
    } catch (e) {
      alert("Failed to create shipment: " + (e.response?.data?.detail || e.message));
    }
  };

  const handleStatusUpdate = async (id, status) => {
    try {
      const res = await updateShipmentStatus(id, { status });
      setShipments((curr) => curr.map((s) => (s.id === id ? res.data : s)));
    } catch (e) {
      alert("Failed to update status.");
    }
  };

  const filteredShipments = shipments.filter((s) => {
    if (filter === "All") return true;
    return s.status === filter;
  });

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "24px" }}>
        <div>
          <h1 style={{ margin: "0 0 6px", fontSize: "24px", fontWeight: 800, color: theme.text }}>
            Shipment Dispatch & Logistics
          </h1>
          <p style={{ margin: 0, fontSize: "14px", color: theme.textMuted }}>
            Create parcels, allocate vehicles, and monitor end-to-end transport milestones.
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          style={{
            padding: "11px 22px",
            borderRadius: "10px",
            background: "linear-gradient(135deg, #0284c7 0%, #2563eb 100%)",
            color: "white",
            border: "none",
            fontWeight: 700,
            fontSize: "13px",
            cursor: "pointer",
            boxShadow: "0 4px 14px rgba(37, 99, 235, 0.35)",
          }}
        >
          + New Shipment
        </button>
      </div>

      {/* Filter Tabs */}
      <div style={{ display: "flex", gap: "8px", marginBottom: "20px" }}>
        {["All", "Created", "Assigned", "In Transit", "Delivered", "Delayed"].map((status) => {
          const isSelected = filter === status;
          return (
            <button
              key={status}
              onClick={() => setFilter(status)}
              style={{
                padding: "8px 18px",
                borderRadius: "20px",
                fontSize: "13px",
                fontWeight: isSelected ? 700 : 500,
                border: isSelected
                  ? `1px solid ${isDark ? "#38bdf8" : "#0284c7"}`
                  : `1px solid ${theme.cardBorder}`,
                backgroundColor: isSelected
                  ? isDark
                    ? "rgba(56, 189, 248, 0.15)"
                    : "rgba(2, 132, 199, 0.1)"
                  : theme.cardBg,
                color: isSelected ? (isDark ? "#38bdf8" : "#0284c7") : theme.textSecondary,
                cursor: "pointer",
              }}
            >
              {status}
            </button>
          );
        })}
      </div>

      {/* Table */}
      <div
        style={{
          backgroundColor: theme.cardBg,
          borderRadius: "14px",
          border: `1px solid ${theme.cardBorder}`,
          boxShadow: theme.shadow,
          overflow: "hidden",
        }}
      >
        <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
          <thead>
            <tr style={{ backgroundColor: theme.tableHeader, borderBottom: `1px solid ${theme.tableRowBorder}` }}>
              {["TRACKING CODE", "DESTINATION ADDRESS", "WEIGHT", "TRIP ALLOCATION", "DELIVERY STATUS", "UPDATE STATUS"].map((h) => (
                <th
                  key={h}
                  style={{
                    padding: "14px 18px",
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
            {filteredShipments.map((s) => {
              const assignedTrip = trips.find((t) => t.id === s.trip_id);
              const cfg = STATUS_CONFIG[s.status] || { bg: "rgba(100,116,139,0.15)", text: "#94a3b8", border: "transparent" };
              return (
                <tr key={s.id} style={{ borderBottom: `1px solid ${theme.tableRowBorder}` }}>
                  <td style={{ padding: "16px 18px", fontWeight: 700, color: theme.text }}>
                    {s.tracking_number}
                  </td>
                  <td style={{ padding: "16px 18px", color: theme.textSecondary }}>{s.delivery_address}</td>
                  <td style={{ padding: "16px 18px", fontWeight: 600, color: theme.text }}>{s.weight} kg</td>
                  <td style={{ padding: "16px 18px", color: assignedTrip ? (isDark ? "#38bdf8" : "#0284c7") : theme.textMuted }}>
                    {assignedTrip ? `${assignedTrip.reference} (${assignedTrip.origin} ➔ ${assignedTrip.destination})` : "Unassigned"}
                  </td>
                  <td style={{ padding: "16px 18px" }}>
                    <span
                      style={{
                        padding: "4px 12px",
                        borderRadius: "20px",
                        fontSize: "12px",
                        fontWeight: 700,
                        backgroundColor: cfg.bg,
                        color: cfg.text,
                        border: `1px solid ${cfg.border}`,
                      }}
                    >
                      {s.status}
                    </span>
                  </td>
                  <td style={{ padding: "16px 18px" }}>
                    <select
                      value={s.status}
                      onChange={(e) => handleStatusUpdate(s.id, e.target.value)}
                      style={{
                        padding: "6px 10px",
                        borderRadius: "8px",
                        backgroundColor: theme.inputBg,
                        border: `1px solid ${theme.inputBorder}`,
                        color: theme.text,
                        fontSize: "12px",
                        cursor: "pointer",
                      }}
                    >
                      <option value="Created">Created</option>
                      <option value="Assigned">Assigned</option>
                      <option value="In Transit">In Transit</option>
                      <option value="Delayed">Delayed</option>
                      <option value="Delivered">Delivered</option>
                      <option value="Cancelled">Cancelled</option>
                    </select>
                  </td>
                </tr>
              );
            })}
            {filteredShipments.length === 0 && (
              <tr>
                <td colSpan={6} style={{ padding: "32px", textAlign: "center", color: theme.textMuted }}>
                  No shipments found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal: New Shipment */}
      {showModal && (
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
              <h3 style={{ margin: 0, fontSize: "18px", color: theme.text }}>Register New Cargo Shipment</h3>
              <button
                onClick={() => setShowModal(false)}
                style={{ background: "none", border: "none", fontSize: "20px", color: theme.textMuted, cursor: "pointer" }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreate}>
              <div style={{ marginBottom: "12px" }}>
                <label style={{ fontSize: "12px", color: theme.textMuted, display: "block", marginBottom: "4px" }}>
                  Tracking Number / Cargo Barcode
                </label>
                <input
                  placeholder="e.g. PKG-8801"
                  value={form.tracking_number}
                  onChange={(e) => setForm({ ...form, tracking_number: e.target.value })}
                  required
                  style={{ width: "100%", padding: "10px", borderRadius: "8px", backgroundColor: theme.inputBg, border: `1px solid ${theme.inputBorder}`, color: theme.text }}
                />
              </div>

              <div style={{ marginBottom: "12px" }}>
                <label style={{ fontSize: "12px", color: theme.textMuted, display: "block", marginBottom: "4px" }}>
                  Delivery Destination Address
                </label>
                <input
                  placeholder="e.g. 42 MG Road, Nariman Point, Mumbai"
                  value={form.delivery_address}
                  onChange={(e) => setForm({ ...form, delivery_address: e.target.value })}
                  required
                  style={{ width: "100%", padding: "10px", borderRadius: "8px", backgroundColor: theme.inputBg, border: `1px solid ${theme.inputBorder}`, color: theme.text }}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "16px" }}>
                <div>
                  <label style={{ fontSize: "12px", color: theme.textMuted, display: "block", marginBottom: "4px" }}>
                    Weight (kg)
                  </label>
                  <input
                    type="number"
                    placeholder="e.g. 150"
                    value={form.weight}
                    onChange={(e) => setForm({ ...form, weight: parseFloat(e.target.value) || 0 })}
                    required
                    style={{ width: "100%", padding: "10px", borderRadius: "8px", backgroundColor: theme.inputBg, border: `1px solid ${theme.inputBorder}`, color: theme.text }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: "12px", color: theme.textMuted, display: "block", marginBottom: "4px" }}>
                    Assign to Trip (Optional)
                  </label>
                  <select
                    value={form.trip_id}
                    onChange={(e) => setForm({ ...form, trip_id: e.target.value })}
                    style={{ width: "100%", padding: "10px", borderRadius: "8px", backgroundColor: theme.inputBg, border: `1px solid ${theme.inputBorder}`, color: theme.text }}
                  >
                    <option value="">Unassigned</option>
                    {trips.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.reference} ({t.origin} ➔ {t.destination})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ display: "flex", gap: "10px" }}>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  style={{ flex: 1, padding: "10px", borderRadius: "8px", backgroundColor: "transparent", border: `1px solid ${theme.cardBorder}`, color: theme.textSecondary, cursor: "pointer" }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{ flex: 1, padding: "10px", borderRadius: "8px", backgroundColor: "#2563eb", border: "none", color: "white", fontWeight: 700, cursor: "pointer" }}
                >
                  Save Shipment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
