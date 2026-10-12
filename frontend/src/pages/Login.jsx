import { useState } from "react";
import { loginUser, registerUser } from "../api";
import { useNavigate } from "react-router-dom";
import { useTheme } from "../context/ThemeContext";

function Login() {
  const { theme, isDark, toggleTheme } = useTheme();
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("Administrator");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    try {
      if (isRegister) {
        await registerUser({ email, password, role });
        setIsRegister(false);
        alert("Registration successful! Please sign in with your credentials.");
      } else {
        const res = await loginUser({ email, password });
        localStorage.setItem("token", res.data.access_token);
        localStorage.setItem("userEmail", email);
        try {
          const payload = JSON.parse(atob(res.data.access_token.split(".")[1]));
          if (payload.role) {
            localStorage.setItem("role", payload.role);
          }
        } catch (e) {
          console.error("JWT parse failed", e);
        }
        navigate("/dashboard");
      }
    } catch (err) {
      setError(err.response?.data?.detail || "Authentication failed. Please verify credentials.");
    }
  };

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        minHeight: "100vh",
        backgroundColor: theme.bg,
        background: isDark
          ? "radial-gradient(ellipse at top, #112042 0%, #070d19 100%)"
          : "radial-gradient(ellipse at top, #e0f2fe 0%, #f8fafc 100%)",
        position: "relative",
      }}
    >
      {/* Day / Night Toggle on Login Screen */}
      <div style={{ position: "absolute", top: "24px", right: "28px" }}>
        <button
          onClick={toggleTheme}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            padding: "8px 16px",
            borderRadius: "20px",
            backgroundColor: theme.surface,
            border: `1px solid ${theme.cardBorder}`,
            color: theme.text,
            fontSize: "12px",
            fontWeight: 600,
            cursor: "pointer",
            boxShadow: theme.shadow,
          }}
        >
          <span>{isDark ? "☀️" : "🌙"}</span>
          <span>{isDark ? "Day Mode" : "Night Mode"}</span>
        </button>
      </div>

      <div
        style={{
          backgroundColor: theme.cardBg,
          padding: "44px 40px",
          borderRadius: "20px",
          width: "420px",
          boxShadow: theme.shadow,
          border: `1px solid ${theme.cardBorder}`,
        }}
      >
        <div style={{ textAlign: "center", marginBottom: "28px" }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: "52px",
              height: "52px",
              borderRadius: "14px",
              background: "linear-gradient(135deg, #0284c7 0%, #2563eb 100%)",
              fontSize: "26px",
              marginBottom: "12px",
              boxShadow: "0 8px 20px rgba(37, 99, 235, 0.35)",
            }}
          >
            🚚
          </div>
          <h1 style={{ margin: 0, fontSize: "24px", fontWeight: 800, letterSpacing: "1px", color: theme.text }}>
            FLEETFLOW
          </h1>
          <p style={{ margin: "4px 0 0", fontSize: "12px", color: theme.textMuted, letterSpacing: "1px", fontWeight: 700 }}>
            INTELLIGENT LOGISTICS PLATFORM
          </p>
        </div>

        <h2 style={{ textAlign: "center", color: theme.text, margin: "0 0 20px", fontWeight: 600, fontSize: "18px" }}>
          {isRegister ? "Create Enterprise Account" : "Sign In to Dispatch Hub"}
        </h2>

        {error && (
          <div
            style={{
              padding: "10px 14px",
              borderRadius: "8px",
              backgroundColor: "rgba(239, 68, 68, 0.15)",
              border: "1px solid #ef4444",
              color: "#f87171",
              fontSize: "13px",
              textAlign: "center",
              marginBottom: "16px",
            }}
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: "14px" }}>
            <label style={{ fontSize: "12px", color: theme.textMuted, display: "block", marginBottom: "4px" }}>
              Corporate Email
            </label>
            <input
              type="email"
              placeholder="e.g. dispatcher@fleetflow.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{
                width: "100%",
                padding: "12px",
                borderRadius: "10px",
                backgroundColor: theme.inputBg,
                border: `1px solid ${theme.inputBorder}`,
                color: theme.text,
                fontSize: "14px",
                outline: "none",
              }}
              required
            />
          </div>

          <div style={{ marginBottom: "16px" }}>
            <label style={{ fontSize: "12px", color: theme.textMuted, display: "block", marginBottom: "4px" }}>
              Password
            </label>
            <input
              type="password"
              placeholder="••••••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{
                width: "100%",
                padding: "12px",
                borderRadius: "10px",
                backgroundColor: theme.inputBg,
                border: `1px solid ${theme.inputBorder}`,
                color: theme.text,
                fontSize: "14px",
                outline: "none",
              }}
              required
            />
          </div>

          {isRegister && (
            <div style={{ marginBottom: "18px" }}>
              <label style={{ fontSize: "12px", color: theme.textMuted, display: "block", marginBottom: "4px" }}>
                Enterprise Access Role
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                style={{
                  width: "100%",
                  padding: "12px",
                  borderRadius: "10px",
                  backgroundColor: theme.inputBg,
                  border: `1px solid ${theme.inputBorder}`,
                  color: theme.text,
                  fontSize: "14px",
                  outline: "none",
                }}
              >
                <option value="Administrator">Administrator</option>
                <option value="Fleet Manager">Fleet Manager</option>
                <option value="Dispatcher">Dispatcher</option>
                <option value="Driver">Driver</option>
              </select>
            </div>
          )}

          <button
            type="submit"
            style={{
              width: "100%",
              padding: "13px",
              borderRadius: "10px",
              border: "none",
              background: "linear-gradient(135deg, #0284c7 0%, #2563eb 100%)",
              color: "white",
              fontSize: "15px",
              cursor: "pointer",
              fontWeight: 700,
              boxShadow: "0 4px 15px rgba(37, 99, 235, 0.35)",
              marginTop: "4px",
            }}
          >
            {isRegister ? "Register Account" : "Access Platform"}
          </button>
        </form>

        <p
          style={{
            color: isDark ? "#38bdf8" : "#0284c7",
            textAlign: "center",
            cursor: "pointer",
            marginTop: "20px",
            fontSize: "13px",
            fontWeight: 600,
          }}
          onClick={() => {
            setIsRegister(!isRegister);
            setError("");
          }}
        >
          {isRegister ? "Already registered? Sign in here" : "Need access? Register new corporate account"}
        </p>
      </div>
    </div>
  );
}

export default Login;
