import React, { useState, useEffect } from "react";
import API from "../api";
import { useTheme } from "../context/ThemeContext";

const MAINTENANCE_TYPES = ["Oil Change", "Tyre Replacement", "Brake Service", "Full Service", "Inspection", "Battery Service", "Other"];

const STATUS_CONFIG = {
  Scheduled: { bg: "rgba(59, 130, 246, 0.15)", text: "#3b82f6", border: "rgba(59, 130, 246, 0.3)" },
  "In Progress": { bg: "rgba(14, 165, 233, 0.15)", text: "#0ea5e9", border: "rgba(14, 165, 233, 0.3)" },
  Completed: { bg: "rgba(16, 185, 129, 0.15)", text: "#10b981", border: "rgba(16, 185, 129, 0.3)" },
  Overdue: { bg: "rgba(239, 68, 68, 0.15)", text: "#ef4444", border: "rgba(239, 68, 68, 0.3)" },
};

export default function MaintenanceView() {
  const { theme, isDark } = useTheme();
  const [records, setRecords] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [alerts, setAlerts] = useState({ overdue: [], upcoming: [], overdue_count: 0 });
  const [showModal, setShowModal] = useState(false);
  const [statusFilter, setStatusFilter] = useState("All");

  const [form, setForm] = useState({
    vehicle_id: "",
    maintenance_type: "Oil Change",
    description: "",
    scheduled_date: new Date().toISOString().slice(0, 16),
    cost: "",
    technician: "",
  });

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    try {
      const [recRes, vehRes, alertRes] = await Promise.all([
        API.get("/maintenance/"),
        API.get("/vehicles/"),
        API.get("/maintenance/alerts"),
      ]);
      setRecords(recRes.data);
      setVehicles(vehRes.data);
      setAlerts(alertRes.data);
    } catch (e) {
      console.error("Failed to load maintenance data", e);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.vehicle_id) {
      alert("Please select a vehicle.");
      return;
    }
    try {
      const payload = {
        vehicle_id: parseInt(form.vehicle_id),
        maintenance_type: form.maintenance_type,
        description: form.description || null,
        scheduled_date: form.scheduled_date ? new Date(form.scheduled_date).toISOString() : new Date().toISOString(),
        cost: form.cost ? parseFloat(form.cost) : null,
        technician: form.technician || null,
      };
      await API.post("/maintenance/", payload);
      setShowModal(false);
      setForm({
        vehicle_id: "",
        maintenance_type: "Oil Change",
        description: "",
        scheduled_date: new Date().toISOString().slice(0, 16),
        cost: "",
        technician: "",
      });
      fetchAll();
    } catch (e) {
      const msg = e.response?.data?.detail || e.message || "Failed to schedule maintenance.";
      alert(`Error scheduling: ${msg}`);
    }
  };

  const updateStatus = async (id, status) => {
    try {
      const payload = { status, completed_date: status === "Completed" ? new Date().toISOString() : null };
      await API.patch(`/maintenance/${id}/status`, payload);
      fetchAll();
    } catch (e) {
      const msg = e.response?.data?.detail || e.message || "Failed to update status.";
      alert(`Error updating: ${msg}`);
    }
  };

  const vehicleName = (id) => vehicles.find((v) => v.id === id)?.registration_number || `#${id}`;

  const totalTasks = records.length;
  const scheduledCount = records.filter((r) => r.status === "Scheduled").length;
  const inProgressCount = records.filter((r) => r.status === "In Progress").length;
  const completedCount = records.filter((r) => r.status === "Completed").length;

  const filteredRecords = records.filter((r) => {
    if (statusFilter === "All") return true;
    return r.status === statusFilter;
  });

  return (
    <div>
      {/* ── HEADER ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "24px" }}>
        <div>
          <h1 style={{ margin: "0 0 6px", fontSize: "24px", fontWeight: 800, color: theme.text }}>
            Maintenance & Service Hub
          </h1>
          <p style={{ margin: 0, fontSize: "14px", color: theme.textMuted }}>
            Schedule inspections, monitor lifecycle repairs, and automate preventive alerts.
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
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <span>+</span>
          <span>Schedule Maintenance</span>
        </button>
      </div>

      {/* ── OVERDUE ALERT BANNER ── */}
      {alerts.overdue_count > 0 && (
        <div
          style={{
            marginBottom: "24px",
            padding: "14px 20px",
            borderRadius: "12px",
            backgroundColor: "rgba(239, 68, 68, 0.12)",
            border: "1px solid rgba(239, 68, 68, 0.4)",
            display: "flex",
            alignItems: "center",
            gap: "12px",
          }}
        >
          <span style={{ fontSize: "22px" }}>⚠️</span>
          <div>
            <strong style={{ color: "#f87171", fontSize: "14px" }}>
              {alerts.overdue_count} Overdue Maintenance Alert{alerts.overdue_count > 1 ? "s" : ""}!
            </strong>
            <div style={{ color: theme.textSecondary, fontSize: "12px", marginTop: "2px" }}>
              {alerts.overdue.map((r) => `${vehicleName(r.vehicle_id)} — ${r.maintenance_type}`).join(" · ")}
            </div>
          </div>
        </div>
      )}

      {/* ── 4 GRADIENT KPI CARDS matching Images 3 & 4 ── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: "18px",
          marginBottom: "28px",
        }}
      >
        {/* KPI 1: Total Tasks */}
        <div
          style={{
            background: isDark
              ? "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)"
              : "linear-gradient(135deg, #eff6ff 0%, #ffffff 100%)",
            border: `1px solid ${theme.cardBorder}`,
            borderRadius: "14px",
            padding: "22px 24px",
            boxShadow: theme.shadow,
          }}
        >
          <div style={{ fontSize: "12px", fontWeight: 700, color: theme.textMuted, marginBottom: "8px" }}>
            Total Tasks
          </div>
          <div style={{ fontSize: "36px", fontWeight: 800, color: theme.text }}>
            {totalTasks}
          </div>
        </div>

        {/* KPI 2: Scheduled */}
        <div
          style={{
            background: isDark
              ? "linear-gradient(135deg, #2e1065 0%, #1e1b4b 100%)"
              : "linear-gradient(135deg, #f5f3ff 0%, #ffffff 100%)",
            border: `1px solid ${isDark ? "rgba(168, 85, 247, 0.3)" : "rgba(168, 85, 247, 0.2)"}`,
            borderRadius: "14px",
            padding: "22px 24px",
            boxShadow: theme.shadow,
          }}
        >
          <div style={{ fontSize: "12px", fontWeight: 700, color: isDark ? "#c084fc" : "#7e22ce", marginBottom: "8px" }}>
            Scheduled
          </div>
          <div style={{ fontSize: "36px", fontWeight: 800, color: isDark ? "#d8b4fe" : "#6b21a8" }}>
            {scheduledCount}
          </div>
        </div>

        {/* KPI 3: In Progress */}
        <div
          style={{
            background: isDark
              ? "linear-gradient(135deg, #083344 0%, #042f2e 100%)"
              : "linear-gradient(135deg, #ecfeff 0%, #ffffff 100%)",
            border: `1px solid ${isDark ? "rgba(6, 182, 212, 0.3)" : "rgba(6, 182, 212, 0.2)"}`,
            borderRadius: "14px",
            padding: "22px 24px",
            boxShadow: theme.shadow,
          }}
        >
          <div style={{ fontSize: "12px", fontWeight: 700, color: isDark ? "#22d3ee" : "#0891b2", marginBottom: "8px" }}>
            In Progress
          </div>
          <div style={{ fontSize: "36px", fontWeight: 800, color: isDark ? "#67e8f9" : "#0e7490" }}>
            {inProgressCount}
          </div>
        </div>

        {/* KPI 4: Completed */}
        <div
          style={{
            background: isDark
              ? "linear-gradient(135deg, #451a03 0%, #1c1917 100%)"
              : "linear-gradient(135deg, #fffbeb 0%, #ffffff 100%)",
            border: `1px solid ${isDark ? "rgba(245, 158, 11, 0.3)" : "rgba(245, 158, 11, 0.2)"}`,
            borderRadius: "14px",
            padding: "22px 24px",
            boxShadow: theme.shadow,
          }}
        >
          <div style={{ fontSize: "12px", fontWeight: 700, color: isDark ? "#fbbf24" : "#d97706", marginBottom: "8px" }}>
            Completed
          </div>
          <div style={{ fontSize: "36px", fontWeight: 800, color: isDark ? "#fde68a" : "#b45309" }}>
            {completedCount}
          </div>
        </div>
      </div>

      {/* ── FILTER PILLS matching Image 3 ── */}
      <div style={{ display: "flex", gap: "8px", marginBottom: "20px" }}>
        {["All", "Scheduled", "In Progress", "Completed", "Overdue"].map((status) => {
          const isSelected = statusFilter === status;
          return (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
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
                transition: "all 0.2s ease",
              }}
            >
              {status}
            </button>
          );
        })}
      </div>

      {/* ── MAINTENANCE TABLE matching Images 3 & 4 ── */}
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
              {["JOB ID", "VEHICLE", "CATEGORY", "SERVICE DETAILS", "SCHEDULED DATE", "EST. COST", "TECHNICIAN", "STATUS", "ACTIONS"].map((h) => (
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
            {filteredRecords.map((r) => {
              const statusCfg = STATUS_CONFIG[r.status] || { bg: "rgba(100,116,139,0.15)", text: "#94a3b8", border: "transparent" };
              return (
                <tr
                  key={r.id}
                  style={{
                    borderBottom: `1px solid ${theme.tableRowBorder}`,
                    transition: "background-color 0.15s ease",
                  }}
                >
                  <td style={{ padding: "14px 18px", fontSize: "13px", fontWeight: 700, color: theme.textMuted }}>
                    #{r.id}
                  </td>
                  <td style={{ padding: "14px 18px", fontSize: "14px", fontWeight: 700, color: theme.text }}>
                    {vehicleName(r.vehicle_id)}
                  </td>
                  <td style={{ padding: "14px 18px", fontSize: "13px", color: theme.textSecondary }}>
                    {r.maintenance_type}
                  </td>
                  <td style={{ padding: "14px 18px", fontSize: "13px", color: theme.textSecondary }}>
                    {r.description || "Routine standard maintenance"}
                  </td>
                  <td style={{ padding: "14px 18px", fontSize: "13px", color: theme.textMuted }}>
                    {new Date(r.scheduled_date).toLocaleDateString()}
                  </td>
                  <td style={{ padding: "14px 18px", fontSize: "13px", fontWeight: 700, color: theme.text }}>
                    {r.cost ? `₹${r.cost.toLocaleString()}` : "—"}
                  </td>
                  <td style={{ padding: "14px 18px", fontSize: "13px", color: theme.textSecondary }}>
                    {r.technician || "Authorized Depot"}
                  </td>
                  <td style={{ padding: "14px 18px" }}>
                    <span
                      style={{
                        padding: "4px 12px",
                        borderRadius: "20px",
                        fontSize: "12px",
                        fontWeight: 700,
                        backgroundColor: statusCfg.bg,
                        color: statusCfg.text,
                        border: `1px solid ${statusCfg.border}`,
                      }}
                    >
                      {r.status}
                    </span>
                  </td>
                  <td style={{ padding: "14px 18px" }}>
                    <select
                      value={r.status}
                      onChange={(e) => updateStatus(r.id, e.target.value)}
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
                      <option value="Scheduled">Scheduled</option>
                      <option value="In Progress">In Progress</option>
                      <option value="Completed">Completed</option>
                      <option value="Overdue">Overdue</option>
                    </select>
                  </td>
                </tr>
              );
            })}
            {filteredRecords.length === 0 && (
              <tr>
                <td colSpan={9} style={{ padding: "36px", textAlign: "center", color: theme.textMuted }}>
                  No maintenance records found for filter "{statusFilter}".
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ── MODAL: SCHEDULE MAINTENANCE ── */}
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
              <h3 style={{ margin: 0, fontSize: "18px", color: theme.text }}>Schedule Vehicle Maintenance</h3>
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
                  Select Vehicle
                </label>
                <select
                  value={form.vehicle_id}
                  onChange={(e) => setForm({ ...form, vehicle_id: e.target.value })}
                  required
                  style={{ width: "100%", padding: "10px", borderRadius: "8px", backgroundColor: theme.inputBg, border: `1px solid ${theme.inputBorder}`, color: theme.text }}
                >
                  <option value="">Choose vehicle...</option>
                  {vehicles.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.registration_number} ({v.current_status})
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "12px" }}>
                <div>
                  <label style={{ fontSize: "12px", color: theme.textMuted, display: "block", marginBottom: "4px" }}>
                    Service Category
                  </label>
                  <select
                    value={form.maintenance_type}
                    onChange={(e) => setForm({ ...form, maintenance_type: e.target.value })}
                    style={{ width: "100%", padding: "10px", borderRadius: "8px", backgroundColor: theme.inputBg, border: `1px solid ${theme.inputBorder}`, color: theme.text }}
                  >
                    {MAINTENANCE_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: "12px", color: theme.textMuted, display: "block", marginBottom: "4px" }}>
                    Scheduled Date & Time
                  </label>
                  <input
                    type="datetime-local"
                    value={form.scheduled_date}
                    onChange={(e) => setForm({ ...form, scheduled_date: e.target.value })}
                    required
                    style={{ width: "100%", padding: "10px", borderRadius: "8px", backgroundColor: theme.inputBg, border: `1px solid ${theme.inputBorder}`, color: theme.text }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: "12px" }}>
                <label style={{ fontSize: "12px", color: theme.textMuted, display: "block", marginBottom: "4px" }}>
                  Description / Service Details
                </label>
                <input
                  placeholder="e.g. Regular 15,000 km oil change and filter replacement"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  style={{ width: "100%", padding: "10px", borderRadius: "8px", backgroundColor: theme.inputBg, border: `1px solid ${theme.inputBorder}`, color: theme.text }}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "16px" }}>
                <div>
                  <label style={{ fontSize: "12px", color: theme.textMuted, display: "block", marginBottom: "4px" }}>
                    Estimated Cost (₹)
                  </label>
                  <input
                    type="number"
                    placeholder="e.g. 2500"
                    value={form.cost}
                    onChange={(e) => setForm({ ...form, cost: e.target.value })}
                    style={{ width: "100%", padding: "10px", borderRadius: "8px", backgroundColor: theme.inputBg, border: `1px solid ${theme.inputBorder}`, color: theme.text }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: "12px", color: theme.textMuted, display: "block", marginBottom: "4px" }}>
                    Technician / Workshop
                  </label>
                  <input
                    placeholder="e.g. Rajesh Kumar"
                    value={form.technician}
                    onChange={(e) => setForm({ ...form, technician: e.target.value })}
                    style={{ width: "100%", padding: "10px", borderRadius: "8px", backgroundColor: theme.inputBg, border: `1px solid ${theme.inputBorder}`, color: theme.text }}
                  />
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
                  Confirm & Schedule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
