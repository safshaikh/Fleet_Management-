import React, { useState, useEffect } from "react";
import API from "../api";
import { useTheme } from "../context/ThemeContext";

function BarChart({ data, valueKey, labelKey, color = "#0284c7" }) {
  const { theme, isDark } = useTheme();
  if (!data || data.length === 0) {
    return <p style={{ color: theme.textMuted, textAlign: "center", padding: "16px 0" }}>No data points recorded yet.</p>;
  }
  const max = Math.max(...data.map((d) => d[valueKey])) || 1;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
      {data.map((item, i) => (
        <div key={i}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "5px" }}>
            <span style={{ fontSize: "13px", color: theme.textSecondary }}>{item[labelKey]}</span>
            <span style={{ fontSize: "13px", color, fontWeight: 700 }}>{item[valueKey]}</span>
          </div>
          <div style={{ height: "9px", background: isDark ? "#1e293b" : "#e2e8f0", borderRadius: "6px", overflow: "hidden" }}>
            <div
              style={{
                height: "100%",
                width: `${(item[valueKey] / max) * 100}%`,
                background: color,
                borderRadius: "6px",
                transition: "width 0.6s ease",
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function AnalyticsView() {
  const { theme, isDark } = useTheme();
  const [summary, setSummary] = useState(null);
  const [fuelReport, setFuelReport] = useState([]);
  const [tripPerf, setTripPerf] = useState({ trip_status_breakdown: [], top_vehicles_by_trips: [] });
  const [maintReport, setMaintReport] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [sumRes, fuelRes, tripRes, maintRes] = await Promise.all([
        API.get("/analytics/fleet-summary"),
        API.get("/analytics/fuel-report"),
        API.get("/analytics/trip-performance"),
        API.get("/analytics/maintenance-report"),
      ]);
      setSummary(sumRes.data);
      setFuelReport(fuelRes.data.vehicles);
      setTripPerf(tripRes.data);
      setMaintReport(maintRes.data);
    } catch (e) {
      console.error("Failed to load analytics", e);
    }
    setLoading(false);
  };

  if (loading) {
    return (
      <div style={{ padding: "40px", textAlign: "center", color: theme.textMuted }}>
        Loading enterprise analytics...
      </div>
    );
  }

  const totalTrips = summary?.trips?.total || 0;
  const completedTrips = summary?.trips?.completed || 0;
  const completionRate = totalTrips > 0 ? Math.round((completedTrips / totalTrips) * 100) : 100;
  const utilizationPct = summary?.vehicles?.utilization_rate_pct || 0;
  const totalDistance = fuelReport.reduce((acc, v) => acc + (v.total_distance_trips_km || 0), 0);
  const totalEstFuel = fuelReport.reduce((acc, v) => acc + (v.estimated_fuel_used_litres || 0), 0);
  const estimatedFuelCost = Math.round(totalEstFuel * 94.5); // Average diesel price

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "24px" }}>
        <div>
          <h1 style={{ margin: "0 0 6px", fontSize: "24px", fontWeight: 800, color: theme.text }}>
            Fleet Analytics & Telematics
          </h1>
          <p style={{ margin: 0, fontSize: "14px", color: theme.textMuted }}>
            Operational performance, fuel expenditure, and logistics optimization insights.
          </p>
        </div>

        <button
          onClick={fetchAll}
          style={{
            padding: "9px 18px",
            borderRadius: "8px",
            backgroundColor: theme.cardBg,
            border: `1px solid ${theme.cardBorder}`,
            color: theme.textSecondary,
            fontSize: "13px",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          ↻ Refresh Metrics
        </button>
      </div>

      {/* ── 8 KPI Cards Grid matching Image 5 ── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: "16px",
          marginBottom: "28px",
        }}
      >
        <KPICard title="Total Trips" value={totalTrips} sub={`${completedTrips} trips completed`} color={isDark ? "#38bdf8" : "#0284c7"} theme={theme} />
        <KPICard title="Avg. Completion" value={`${completionRate}%`} sub="Delivery success index" color="#10b981" theme={theme} />
        <KPICard title="Total Distance" value={`${totalDistance.toFixed(1)} km`} sub="Recorded journey kilometers" color="#a855f7" theme={theme} />
        <KPICard title="Fleet Utilization" value={`${utilizationPct}%`} sub="Active transit load" color="#0ea5e9" theme={theme} />
        <KPICard title="Estimated Fuel (L)" value={`${totalEstFuel.toFixed(1)} L`} sub="Combined consumption" color="#f59e0b" theme={theme} />
        <KPICard title="Est. Fuel Cost" value={`₹${estimatedFuelCost.toLocaleString()}`} sub="At ₹94.5/L commercial rate" color="#ec4899" theme={theme} />
        <KPICard title="Vehicles In-Transit" value={summary?.vehicles?.in_transit || 0} sub={`${summary?.vehicles?.available || 0} ready for dispatch`} color="#06b6d4" theme={theme} />
        <KPICard
          title="Maintenance Alerts"
          value={summary?.maintenance?.overdue_alerts || 0}
          sub="Servicing & inspection"
          color={(summary?.maintenance?.overdue_alerts || 0) > 0 ? "#ef4444" : "#10b981"}
          theme={theme}
        />
      </div>

      {/* ── Visual Charts Row ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "28px" }}>
        {/* Trip Status Breakdown */}
        <div style={{ backgroundColor: theme.cardBg, borderRadius: "14px", border: `1px solid ${theme.cardBorder}`, padding: "22px", boxShadow: theme.shadow }}>
          <h3 style={{ margin: "0 0 16px", fontSize: "16px", fontWeight: 700, color: theme.text }}>
            Trip Status Breakdown
          </h3>
          <BarChart data={tripPerf.trip_status_breakdown} valueKey="count" labelKey="status" color="#0284c7" />
        </div>

        {/* Top Vehicles by Trips */}
        <div style={{ backgroundColor: theme.cardBg, borderRadius: "14px", border: `1px solid ${theme.cardBorder}`, padding: "22px", boxShadow: theme.shadow }}>
          <h3 style={{ margin: "0 0 16px", fontSize: "16px", fontWeight: 700, color: theme.text }}>
            Top Active Vehicles by Dispatches
          </h3>
          <BarChart data={tripPerf.top_vehicles_by_trips} valueKey="trips" labelKey="vehicle" color="#8b5cf6" />
        </div>
      </div>

      {/* ── Fuel Monitoring Table matching Image 5 ── */}
      <div
        style={{
          backgroundColor: theme.cardBg,
          borderRadius: "14px",
          border: `1px solid ${theme.cardBorder}`,
          boxShadow: theme.shadow,
          overflow: "hidden",
          marginBottom: "28px",
        }}
      >
        <div style={{ padding: "20px 24px", borderBottom: `1px solid ${theme.tableRowBorder}` }}>
          <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 700, color: theme.text }}>
            Fuel Telematics & Vehicle Efficiency Report
          </h3>
        </div>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ backgroundColor: theme.tableHeader, borderBottom: `1px solid ${theme.tableRowBorder}` }}>
              {["VEHICLE REG.", "FUEL TYPE", "EFFICIENCY (km/L)", "ODOMETER", "TRIP DISTANCE", "EST. FUEL USED", "DISPATCHES"].map((h) => (
                <th
                  key={h}
                  style={{
                    padding: "12px 18px",
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
            {fuelReport.map((v) => (
              <tr key={v.vehicle_id} style={{ borderBottom: `1px solid ${theme.tableRowBorder}` }}>
                <td style={{ padding: "14px 18px", fontWeight: 700, color: theme.text }}>{v.registration_number}</td>
                <td style={{ padding: "14px 18px", color: theme.textSecondary }}>{v.fuel_type}</td>
                <td style={{ padding: "14px 18px", color: theme.textSecondary }}>
                  {v.fuel_efficiency_kmpl ? `${v.fuel_efficiency_kmpl} km/L` : <span style={{ color: theme.textMuted }}>14.0 km/L</span>}
                </td>
                <td style={{ padding: "14px 18px", color: theme.textSecondary }}>{v.odometer_km?.toLocaleString()} km</td>
                <td style={{ padding: "14px 18px", color: theme.textSecondary }}>{v.total_distance_trips_km} km</td>
                <td style={{ padding: "14px 18px", fontWeight: 600, color: isDark ? "#38bdf8" : "#0284c7" }}>
                  {v.estimated_fuel_used_litres ? `${v.estimated_fuel_used_litres} L` : "—"}
                </td>
                <td style={{ padding: "14px 18px", color: theme.text }}>{v.trips_count}</td>
              </tr>
            ))}
            {fuelReport.length === 0 && (
              <tr>
                <td colSpan={7} style={{ padding: "28px", textAlign: "center", color: theme.textMuted }}>
                  No vehicle telemetry records available.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ── Maintenance Cost Summary ── */}
      {maintReport && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
          <div style={{ backgroundColor: theme.cardBg, borderRadius: "14px", border: `1px solid ${theme.cardBorder}`, padding: "22px", boxShadow: theme.shadow }}>
            <h3 style={{ margin: "0 0 16px", fontSize: "16px", fontWeight: 700, color: theme.text }}>
              Maintenance Financial Overview
            </h3>
            {[
              { label: "Total Service Records", value: maintReport.summary.total_records },
              { label: "Completed Operations", value: maintReport.summary.completed },
              { label: "Pending Scheduled", value: maintReport.summary.scheduled },
              { label: "Overdue Alerts", value: maintReport.summary.overdue },
              { label: "Total Expenditure", value: `₹${maintReport.summary.total_maintenance_cost.toLocaleString()}` },
            ].map((s) => (
              <div
                key={s.label}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  padding: "10px 0",
                  borderBottom: `1px solid ${theme.tableRowBorder}`,
                }}
              >
                <span style={{ color: theme.textMuted, fontSize: "13px" }}>{s.label}</span>
                <span style={{ fontWeight: 700, color: theme.text }}>{s.value}</span>
              </div>
            ))}
          </div>

          <div style={{ backgroundColor: theme.cardBg, borderRadius: "14px", border: `1px solid ${theme.cardBorder}`, padding: "22px", boxShadow: theme.shadow }}>
            <h3 style={{ margin: "0 0 16px", fontSize: "16px", fontWeight: 700, color: theme.text }}>
              Cost Breakdown by Service Category
            </h3>
            <BarChart data={maintReport.cost_by_type} valueKey="cost" labelKey="type" color="#f59e0b" />
          </div>
        </div>
      )}
    </div>
  );
}

function KPICard({ title, value, sub, color, theme }) {
  return (
    <div
      style={{
        padding: "20px 22px",
        backgroundColor: theme.cardBg,
        borderRadius: "14px",
        border: `1px solid ${theme.cardBorder}`,
        boxShadow: theme.shadow,
      }}
    >
      <div style={{ color: theme.textMuted, fontSize: "11px", fontWeight: 700, letterSpacing: "1px", marginBottom: "6px" }}>
        {title}
      </div>
      <div style={{ fontSize: "28px", fontWeight: 800, color, marginBottom: "4px" }}>{value}</div>
      <div style={{ color: theme.textSecondary, fontSize: "12px" }}>{sub}</div>
    </div>
  );
}
