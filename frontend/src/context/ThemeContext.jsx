import React, { createContext, useContext, useState, useEffect } from "react";

const ThemeContext = createContext();

export const themes = {
  dark: {
    name: "dark",
    bg: "#070d19",
    bgSecondary: "#0b1329",
    surface: "#111c38",
    cardBg: "#142142",
    cardBorder: "#1f325d",
    cardBorderHover: "#2d4a88",
    headerBg: "rgba(11, 19, 41, 0.85)",
    text: "#f8fafc",
    textSecondary: "#cbd5e1",
    textMuted: "#64748b",
    accent: "#38bdf8",
    accentGlow: "rgba(56, 189, 248, 0.2)",
    accentBlue: "#2563eb",
    inputBg: "#0a1226",
    inputBorder: "#203460",
    tableHeader: "#0d1730",
    tableRowBorder: "#17264a",
    tableRowHover: "#182a52",
    heroGradient: "linear-gradient(135deg, #112042 0%, #0d1730 100%)",
    kpiGradients: {
      total: "linear-gradient(135deg, rgba(37, 99, 235, 0.2) 0%, rgba(15, 23, 42, 0.6) 100%)",
      avail: "linear-gradient(135deg, rgba(16, 185, 129, 0.2) 0%, rgba(15, 23, 42, 0.6) 100%)",
      transit: "linear-gradient(135deg, rgba(14, 165, 233, 0.2) 0%, rgba(15, 23, 42, 0.6) 100%)",
      maint: "linear-gradient(135deg, rgba(239, 68, 68, 0.2) 0%, rgba(15, 23, 42, 0.6) 100%)",
      util: "linear-gradient(135deg, rgba(245, 158, 11, 0.2) 0%, rgba(15, 23, 42, 0.6) 100%)",
    },
    shadow: "0 10px 30px -10px rgba(0, 0, 0, 0.6)",
  },
  light: {
    name: "light",
    bg: "#f8fafc",
    bgSecondary: "#f1f5f9",
    surface: "#ffffff",
    cardBg: "#ffffff",
    cardBorder: "#e2e8f0",
    cardBorderHover: "#cbd5e1",
    headerBg: "rgba(255, 255, 255, 0.9)",
    text: "#0f172a",
    textSecondary: "#334155",
    textMuted: "#64748b",
    accent: "#0284c7",
    accentGlow: "rgba(2, 132, 199, 0.15)",
    accentBlue: "#2563eb",
    inputBg: "#f8fafc",
    inputBorder: "#cbd5e1",
    tableHeader: "#f1f5f9",
    tableRowBorder: "#e2e8f0",
    tableRowHover: "#f8fafc",
    heroGradient: "linear-gradient(135deg, #e0f2fe 0%, #f0f9ff 100%)",
    kpiGradients: {
      total: "linear-gradient(135deg, #eff6ff 0%, #ffffff 100%)",
      avail: "linear-gradient(135deg, #ecfdf5 0%, #ffffff 100%)",
      transit: "linear-gradient(135deg, #f0f9ff 0%, #ffffff 100%)",
      maint: "linear-gradient(135deg, #fef2f2 0%, #ffffff 100%)",
      util: "linear-gradient(135deg, #fffbeb 0%, #ffffff 100%)",
    },
    shadow: "0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.03)",
  },
};

export function ThemeProvider({ children }) {
  const [themeMode, setThemeMode] = useState(() => {
    return localStorage.getItem("fleetflow_theme") || "dark";
  });

  const toggleTheme = () => {
    const nextMode = themeMode === "dark" ? "light" : "dark";
    setThemeMode(nextMode);
    localStorage.setItem("fleetflow_theme", nextMode);
  };

  useEffect(() => {
    document.body.style.backgroundColor = themes[themeMode].bg;
    document.body.style.color = themes[themeMode].text;
  }, [themeMode]);

  const value = {
    theme: themes[themeMode],
    mode: themeMode,
    isDark: themeMode === "dark",
    toggleTheme,
  };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};

