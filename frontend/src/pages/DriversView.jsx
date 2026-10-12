import React, { useState, useEffect } from "react";
import API from "../api";
import { useTheme } from "../context/ThemeContext";

const STATUS_CONFIG = {
  Available: { bg: "rgba(16, 185, 129, 0.15)", text: "#10b981", border: "rgba(16, 185, 129, 0.3)" },
  "On Trip": { bg: "rgba(14, 165, 233, 0.15)", text: "#0ea5e9", border: "rgba(14, 165, 233, 0.3)" },
  "Off Duty": { bg: "rgba(148, 163, 184, 0.15)", text: "#94a3b8", border: "rgba(148, 163, 184, 0.3)" },
};

export default function DriversView() {
  const { theme, isDark } = useTheme();
  const [drivers, setDrivers] = useState([]);
  const [trips, setTrips] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [showAssign, setShowAssign] = useState(false);
  const [form, setForm] = useState({ user_id: "", license_number: "" });
  const [assignForm, setAssignForm] = useState({ trip_id: "", driver_id: "" });

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    try {
      const [drRes, trRes] = await Promise.all([API.get("/drivers/"), API.get("/tracking/trips")]);
      setDrivers(drRes.data);
      setTrips(trRes.data);
    } catch (e) {
      console.error("Failed to load driver data", e);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await API.post("/drivers/", { ...form, user_id: parseInt(form.user_id) });
      setShowForm(false);
      setForm({ user_id: "", license_number: "" });
      fetchAll();
    } catch (e) {
      alert("Failed to register driver: " + (e.response?.data?.detail || "Make sure the User ID exists."));
    }
  };

  const handleAssign = async (e) => {
    e.preventDefault();
    try {
      await API.post(`/drivers/trips/${assignForm.trip_id}/assign-driver`, {
        driver_id: parseInt(assignForm.driver_id),
      });
      alert("Driver assigned successfully!");
      setShowAssign(false);
      fetchAll();
    } catch (e) {
      alert(e.response?.data?.detail || "Assignment failed.");
    }
  };

  const updateStatus = async (id, status) => {
    try {
      await API.patch(`/drivers/${id}/status`, { status });
      fetchAll();
    } catch (e) {
      alert("Failed to update driver status.");
    }
  };

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "24px" }}>
        <div>
          <h1 style={{ margin: "0 0 6px", fontSize: "24px", fontWeight: 800, color: theme.text }}>
            Driver Operations & Duty Roster
          </h1>
          <p style={{ margin: 0, fontSize: "14px", color: theme.textMuted }}>
            Manage commercial driver licenses, real-time duty status, and vehicle trip allocations.
          </p>
        </div>

        <div style={{ display: "flex", gap: "10px" }}>
          <button
            onClick={() => {
              setShowAssign(!showAssign);
              setShowForm(false);
            }}
            style={{
              padding: "10px 18px",
              borderRadius: "10px",
              background: isDark ? "rgba(168, 85, 247, 0.15)" : "#f3e8ff",
              color: isDark ? "#c084fc" : "#7e22ce",
              border: `1px solid ${isDark ? "rgba(168, 85, 247, 0.4)" : "#d8b4fe"}`,
              fontWeight: 700,
              fontSize: "13px",
              cursor: "pointer",
            }}
          >
            {showAssign ? "Cancel" : "🔗 Assign Driver to Trip"}
          </button>
          <button
            onClick={() => {
              setShowForm(!showForm);
              setShowAssign(false);
            }}
            style={{
              padding: "10px 20px",
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
            {showForm ? "Cancel" : "+ Register Driver"}
          </button>
        </div>
      </div>

      {/* KPI Stats Row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "16px", marginBottom: "28px" }}>
        {[
          { label: "Total Drivers", value: drivers.length, color: isDark ? "#38bdf8" : "#0284c7" },
          { label: "Active On Trip", value: drivers.filter((d) => d.status === "On Trip").length, color: "#0ea5e9" },
          { label: "Available for Duty", value: drivers.filter((d) => d.status === "Available").length, color: "#10b981" },
          { label: "Off Duty / Standby", value: drivers.filter((d) => d.status === "Off Duty").length, color: "#94a3b8" },
        ].map((s) => (
          <div
            key={s.label}
            style={{
              padding: "20px 22px",
              backgroundColor: theme.cardBg,
              borderRadius: "14px",
              border: `1px solid ${theme.cardBorder}`,
              boxShadow: theme.shadow,
            }}
          >
            <div style={{ color: theme.textMuted, fontSize: "11px", fontWeight: 700, letterSpacing: "1px", marginBottom: "6px" }}>
              {s.label}
            </div>
            <div style={{ fontSize: "32px", fontWeight: 800, color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Register Driver Form */}
      {showForm && (
        <form
          onSubmit={handleCreate}
          style={{
            display: "flex",
            gap: "12px",
            flexWrap: "wrap",
            marginBottom: "20px",
            padding: "20px",
            backgroundColor: theme.surface,
            borderRadius: "14px",
            border: `1px solid ${theme.cardBorder}`,
          }}
        >
          <input
            placeholder="User ID (from registered Users)"
            type="number"
            value={form.user_id}
            onChange={(e) => setForm({ ...form, user_id: e.target.value })}
            style={{ flex: 1, padding: "10px", borderRadius: "8px", backgroundColor: theme.inputBg, border: `1px solid ${theme.inputBorder}`, color: theme.text }}
            required
          />
          <input
            placeholder="Commercial License # (e.g. MH-0123456789)"
            value={form.license_number}
            onChange={(e) => setForm({ ...form, license_number: e.target.value })}
            style={{ flex: 1, padding: "10px", borderRadius: "8px", backgroundColor: theme.inputBg, border: `1px solid ${theme.inputBorder}`, color: theme.text }}
            required
          />
          <button
            type="submit"
            style={{ padding: "10px 22px", background: "#10b981", color: "white", border: "none", borderRadius: "8px", fontWeight: 700, cursor: "pointer" }}
          >
            Register Profile
          </button>
        </form>
      )}

      {/* Assign Trip Form */}
      {showAssign && (
        <form
          onSubmit={handleAssign}
          style={{
            display: "flex",
            gap: "12px",
            flexWrap: "wrap",
            marginBottom: "20px",
            padding: "20px",
            backgroundColor: theme.surface,
            borderRadius: "14px",
            border: `1px solid ${theme.cardBorder}`,
          }}
        >
          <select
            value={assignForm.trip_id}
            onChange={(e) => setAssignForm({ ...assignForm, trip_id: e.target.value })}
            style={{ flex: 1, padding: "10px", borderRadius: "8px", backgroundColor: theme.inputBg, border: `1px solid ${theme.inputBorder}`, color: theme.text }}
            required
          >
            <option value="">Select Scheduled Trip...</option>
            {trips
              .filter((t) => t.status === "Scheduled" || t.status === "In Transit")
              .map((t) => (
                <option key={t.id} value={t.id}>
                  {t.reference} : {t.origin} ➔ {t.destination}
                </option>
              ))}
          </select>
          <select
            value={assignForm.driver_id}
            onChange={(e) => setAssignForm({ ...assignForm, driver_id: e.target.value })}
            style={{ flex: 1, padding: "10px", borderRadius: "8px", backgroundColor: theme.inputBg, border: `1px solid ${theme.inputBorder}`, color: theme.text }}
            required
          >
            <option value="">Select Driver...</option>
            {drivers
              .filter((d) => d.status !== "On Trip")
              .map((d) => (
                <option key={d.id} value={d.id}>
                  Driver #{d.id} — License: {d.license_number}
                </option>
              ))}
          </select>
          <button
            type="submit"
            style={{ padding: "10px 22px", background: "#8b5cf6", color: "white", border: "none", borderRadius: "8px", fontWeight: 700, cursor: "pointer" }}
          >
            Confirm Assignment
          </button>
        </form>
      )}

      {/* Driver Table */}
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
              {["DRIVER ID", "COMMERCIAL LICENSE #", "USER ACCOUNT", "DUTY STATUS", "UPDATE DUTY"].map((h) => (
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
            {drivers.map((d) => {
              const cfg = STATUS_CONFIG[d.status] || { bg: "rgba(100,116,139,0.15)", text: "#94a3b8", border: "transparent" };
              return (
                <tr key={d.id} style={{ borderBottom: `1px solid ${theme.tableRowBorder}` }}>
                  <td style={{ padding: "16px 18px", fontSize: "13px", fontWeight: 700, color: theme.textMuted }}>
                    #{d.id}
                  </td>
                  <td style={{ padding: "16px 18px", fontSize: "14px", fontWeight: 700, color: theme.text }}>
                    {d.license_number}
                  </td>
                  <td style={{ padding: "16px 18px", fontSize: "13px", color: theme.textSecondary }}>User #{d.user_id}</td>
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
                      {d.status}
                    </span>
                  </td>
                  <td style={{ padding: "16px 18px" }}>
                    <select
                      value={d.status}
                      onChange={(e) => updateStatus(d.id, e.target.value)}
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
                      <option value="Available">Available</option>
                      <option value="On Trip">On Trip</option>
                      <option value="Off Duty">Off Duty</option>
                    </select>
                  </td>
                </tr>
              );
            })}
            {drivers.length === 0 && (
              <tr>
                <td colSpan={5} style={{ padding: "32px", textAlign: "center", color: theme.textMuted }}>
                  No drivers registered yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
