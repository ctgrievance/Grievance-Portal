import React, { useState } from "react";
import { Link } from "react-router-dom";
import ctLogo from "../assets/ct-logo.png";
import { useMaintenance } from "../context/MaintenanceContext";

export default function MaintenanceScreen() {
  const {
    maintenanceMessage,
    maintenanceReason,
    activatedAt,
    refreshStatus
  } = useMaintenance();

  const [checking, setChecking] = useState(false);

  const handleRefresh = async () => {
    setChecking(true);
    try {
      await refreshStatus();
    } finally {
      setTimeout(() => setChecking(false), 800);
    }
  };

  const formattedDate = activatedAt
    ? new Date(activatedAt).toLocaleString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true
      })
    : "Recently";

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#0b0f19",
        backgroundImage: "radial-gradient(ellipse at top, #1e1b4b 0%, #0b0f19 70%)",
        padding: "24px 16px",
        fontFamily: "'Outfit', 'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
        color: "#f8fafc",
        position: "relative",
        overflow: "hidden"
      }}
    >
      {/* Background Decorative Rings */}
      <div
        style={{
          position: "absolute",
          top: "-15%",
          left: "50%",
          transform: "translateX(-50%)",
          width: "600px",
          height: "600px",
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(245, 158, 11, 0.08) 0%, rgba(245, 158, 11, 0) 70%)",
          pointerEvents: "none"
        }}
      />

      {/* Main Glassmorphic Card */}
      <div
        style={{
          maxWidth: "560px",
          width: "100%",
          background: "rgba(15, 23, 42, 0.75)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          border: "1px solid rgba(245, 158, 11, 0.25)",
          borderRadius: "20px",
          padding: "36px 28px",
          boxShadow: "0 20px 50px rgba(0, 0, 0, 0.5), 0 0 30px rgba(245, 158, 11, 0.08)",
          textAlign: "center",
          position: "relative",
          zIndex: 1
        }}
      >
        {/* University Logo */}
        <div style={{ marginBottom: "24px" }}>
          <img
            src={ctLogo}
            alt="CT University Logo"
            style={{
              height: "56px",
              objectFit: "contain",
              filter: "drop-shadow(0 4px 12px rgba(0, 0, 0, 0.4))"
            }}
          />
        </div>

        {/* Pulsing Status Badge */}
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            background: "rgba(245, 158, 11, 0.15)",
            border: "1px solid rgba(245, 158, 11, 0.4)",
            color: "#fde68a",
            padding: "6px 16px",
            borderRadius: "50px",
            fontSize: "0.82rem",
            fontWeight: "700",
            letterSpacing: "0.5px",
            textTransform: "uppercase",
            marginBottom: "20px"
          }}
        >
          <span
            style={{
              width: "8px",
              height: "8px",
              borderRadius: "50%",
              backgroundColor: "#f59e0b",
              boxShadow: "0 0 10px #f59e0b",
              animation: "pulse 2s infinite"
            }}
          />
          Scheduled Portal Maintenance
        </div>

        {/* Animated Maintenance Icon */}
        <div
          style={{
            fontSize: "3.5rem",
            lineHeight: 1,
            marginBottom: "16px",
            filter: "drop-shadow(0 4px 16px rgba(245, 158, 11, 0.3))"
          }}
        >
          🛠️
        </div>

        {/* Headings */}
        <h1
          style={{
            fontSize: "1.75rem",
            fontWeight: "700",
            color: "#ffffff",
            margin: "0 0 8px 0",
            letterSpacing: "-0.5px"
          }}
        >
          Portal Under Maintenance
        </h1>

        <p
          style={{
            fontSize: "0.98rem",
            color: "#94a3b8",
            margin: "0 0 24px 0",
            fontWeight: "500"
          }}
        >
          Incoming Grievances & Services are Temporarily Paused
        </p>

        {/* Message Box */}
        <div
          style={{
            backgroundColor: "rgba(30, 41, 59, 0.7)",
            border: "1px solid rgba(148, 163, 184, 0.15)",
            borderRadius: "12px",
            padding: "16px 20px",
            color: "#e2e8f0",
            fontSize: "0.92rem",
            lineHeight: "1.55",
            marginBottom: "24px",
            textAlign: "left"
          }}
        >
          <div style={{ display: "flex", alignItems: "flex-start", gap: "10px" }}>
            <span style={{ fontSize: "1.1rem" }}>📢</span>
            <div>
              <div style={{ fontWeight: "600", color: "#f8fafc", marginBottom: "4px" }}>
                {maintenanceReason || "System Notice"}
              </div>
              <div style={{ color: "#cbd5e1" }}>
                {maintenanceMessage ||
                  "The Grievance Redressal Portal is currently undergoing scheduled maintenance. Grievance submissions are temporarily paused. Please check back shortly."}
              </div>
            </div>
          </div>
        </div>

        {/* Status Info Row */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "10px 14px",
            background: "rgba(15, 23, 42, 0.5)",
            borderRadius: "8px",
            fontSize: "0.82rem",
            color: "#94a3b8",
            marginBottom: "24px"
          }}
        >
          <span>Initiated: <strong>{formattedDate}</strong></span>
          <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span
              style={{
                width: "6px",
                height: "6px",
                borderRadius: "50%",
                backgroundColor: "#10b981"
              }}
            />
            Live Sync Active
          </span>
        </div>

        {/* Action Button: Check Status */}
        <button
          type="button"
          onClick={handleRefresh}
          disabled={checking}
          style={{
            width: "100%",
            padding: "12px 24px",
            background: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
            color: "#ffffff",
            border: "none",
            borderRadius: "10px",
            fontSize: "0.95rem",
            fontWeight: "600",
            cursor: checking ? "not-allowed" : "pointer",
            boxShadow: "0 4px 14px rgba(245, 158, 11, 0.35)",
            transition: "all 0.2s ease",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px"
          }}
        >
          <span>{checking ? "Checking System Status..." : "🔄 Refresh Status"}</span>
        </button>

        {/* Super Admin Bypass Link */}
        <div style={{ marginTop: "24px", fontSize: "0.82rem", color: "#64748b" }}>
          <span>Super Administrator? </span>
          <Link
            to="/"
            style={{
              color: "#38bdf8",
              textDecoration: "none",
              fontWeight: "600"
            }}
          >
            Admin Sign In & Dashboard →
          </Link>
        </div>
      </div>

      {/* University Footer */}
      <div
        style={{
          marginTop: "24px",
          fontSize: "0.8rem",
          color: "#64748b",
          textAlign: "center"
        }}
      >
        © {new Date().getFullYear()} CT University — Grievance Redressal Monitoring System (RMS)
      </div>
    </div>
  );
}
