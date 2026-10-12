import React, { useState, useEffect } from "react";
import { updateTripLocation } from "../api";
import { useTheme } from "../context/ThemeContext";

export default function TrackingSimulator({ trip }) {
  const { theme, isDark } = useTheme();
  const [simulating, setSimulating] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!simulating || !trip) return;
    
    let currentStep = progress;
    const points = 20;
    const latStep = (trip.destination_lat - trip.origin_lat) / points;
    const lngStep = (trip.destination_lng - trip.origin_lng) / points;
    
    const interval = setInterval(() => {
      currentStep += 1;
      
      if (currentStep > points) {
        setSimulating(false);
        clearInterval(interval);
        return;
      }
      
      setProgress(currentStep);
      
      const currentLat = trip.origin_lat + (latStep * currentStep);
      const currentLng = trip.origin_lng + (lngStep * currentStep);
      
      updateTripLocation(trip.id, {
        latitude: currentLat,
        longitude: currentLng,
        speed_kph: Math.floor(45 + Math.random() * 25)
      }).catch(console.error);

    }, 1200);

    return () => clearInterval(interval);
  }, [simulating, trip]);

  if (!trip) return null;

  return (
    <div style={{
      marginTop: "14px",
      padding: "16px",
      background: isDark ? "rgba(15, 23, 42, 0.6)" : "rgba(241, 245, 249, 0.8)",
      borderRadius: "12px",
      border: `1px solid ${theme.cardBorder}`
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: simulating ? "10px" : "0" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span style={{ fontSize: "14px" }}>📡</span>
            <span style={{ fontSize: "13px", fontWeight: 700, color: theme.text }}>Real-Time GPS Hardware Stream</span>
          </div>
          <small style={{ color: theme.textMuted, fontSize: "11px" }}>WebSocket satellite telemetry simulator</small>
        </div>
        <button 
          onClick={() => { setSimulating(true); setProgress(0); }}
          disabled={simulating}
          style={{ 
            background: simulating 
              ? (isDark ? "#334155" : "#cbd5e1")
              : "linear-gradient(135deg, #0284c7 0%, #2563eb 100%)", 
            color: "white", 
            border: "none", 
            padding: "8px 16px", 
            borderRadius: "8px", 
            fontWeight: 600,
            fontSize: "12px",
            cursor: simulating ? "not-allowed" : "pointer",
            boxShadow: simulating ? "none" : "0 4px 12px rgba(37, 99, 235, 0.35)",
            transition: "all 0.2s ease"
          }}
        >
          {simulating ? `🛰️ Broadcasting (${progress * 5}%)` : "▶ Simulate Real-Time GPS Tracking"}
        </button>
      </div>

      {simulating && (
        <div style={{ height: "6px", width: "100%", background: isDark ? "#1e293b" : "#e2e8f0", borderRadius: "3px", overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${progress * 5}%`, background: "linear-gradient(90deg, #38bdf8, #10b981)", transition: "width 0.4s ease" }} />
        </div>
      )}
    </div>
  );
}
