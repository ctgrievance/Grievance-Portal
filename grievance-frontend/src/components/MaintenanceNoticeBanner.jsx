import React from "react";
import { useMaintenance } from "../context/MaintenanceContext";

export default function MaintenanceNoticeBanner({ mode = "dashboard", className = "" }) {
  const { isMaintenanceActive, maintenanceMessage, maintenanceReason } = useMaintenance();

  if (!isMaintenanceActive) return null;

  if (mode === "form") {
    return (
      <div
        className={`maintenance-form-banner ${className}`}
        style={{
          margin: "0 0 20px 0",
          padding: "16px 20px",
          background: "linear-gradient(135deg, #0f172a 0%, #1e1b4b 60%, #312e81 100%)",
          border: "1.5px solid rgba(99, 102, 241, 0.45)",
          borderRadius: "14px",
          color: "#ffffff",
          boxShadow: "0 6px 24px rgba(79, 70, 229, 0.18)",
          display: "flex",
          alignItems: "flex-start",
          gap: "14px",
          position: "relative",
          overflow: "hidden"
        }}
      >
        {/* Accent Top Gradient Line matching project theme */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: "3px",
            background: "linear-gradient(90deg, #6366f1, #9333ea, #ec4899)"
          }}
        />

        <div
          style={{
            width: "42px",
            height: "42px",
            borderRadius: "10px",
            background: "rgba(99, 102, 241, 0.2)",
            border: "1px solid rgba(129, 140, 248, 0.4)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "1.3rem",
            flexShrink: 0
          }}
        >
          🛑
        </div>

        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap", marginBottom: "4px" }}>
            <span
              style={{
                background: "linear-gradient(135deg, #6366f1, #9333ea)",
                color: "#ffffff",
                padding: "3px 10px",
                borderRadius: "12px",
                fontSize: "0.72rem",
                fontWeight: "700",
                textTransform: "uppercase",
                letterSpacing: "0.5px",
                boxShadow: "0 2px 8px rgba(99, 102, 241, 0.35)"
              }}
            >
              Submissions Paused
            </span>
            <strong style={{ fontSize: "0.98rem", color: "#ffffff" }}>
              {maintenanceReason || "Scheduled Portal Maintenance Active"}
            </strong>
          </div>
          <div style={{ fontSize: "0.88rem", color: "#c7d2fe", lineHeight: "1.5" }}>
            {maintenanceMessage ||
              "The Grievance Redressal Portal is currently under scheduled maintenance. Incoming grievance submissions are temporarily paused. Please check back shortly."}
          </div>
          <div
            style={{
              marginTop: "8px",
              paddingTop: "8px",
              borderTop: "1px dashed rgba(165, 180, 252, 0.25)",
              fontSize: "0.8rem",
              color: "#a5b4fc",
              fontWeight: "600",
              display: "flex",
              alignItems: "center",
              gap: "6px"
            }}
          >
            <span>🔒</span>
            <span>Grievance form is locked. Submissions will automatically resume once maintenance is completed.</span>
          </div>
        </div>
      </div>
    );
  }

  // Default Dashboard Banner
  return (
    <div
      className={`maintenance-dashboard-banner ${className}`}
      style={{
        margin: "0 0 20px 0",
        padding: "16px 22px",
        background: "linear-gradient(135deg, #0f172a 0%, #1e1b4b 55%, #312e81 100%)",
        border: "1.5px solid rgba(99, 102, 241, 0.4)",
        borderRadius: "14px",
        color: "#ffffff",
        boxShadow: "0 8px 25px -5px rgba(79, 70, 229, 0.2), 0 4px 12px rgba(15, 23, 42, 0.12)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flexWrap: "wrap",
        gap: "14px",
        position: "relative",
        overflow: "hidden"
      }}
    >
      {/* Accent Top Bar matching project theme gradient */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: "3px",
          background: "linear-gradient(90deg, #6366f1, #9333ea, #ec4899)"
        }}
      />

      <div style={{ display: "flex", alignItems: "center", gap: "14px", flex: 1, minWidth: "280px" }}>
        <div
          style={{
            width: "44px",
            height: "44px",
            borderRadius: "12px",
            background: "rgba(99, 102, 241, 0.2)",
            border: "1px solid rgba(129, 140, 248, 0.45)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "1.4rem",
            flexShrink: 0,
            boxShadow: "0 2px 10px rgba(99, 102, 241, 0.25)"
          }}
        >
          🛠️
        </div>

        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap", marginBottom: "3px" }}>
            <span
              style={{
                background: "linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)",
                color: "#ffffff",
                padding: "3px 10px",
                borderRadius: "12px",
                fontSize: "0.72rem",
                fontWeight: "700",
                textTransform: "uppercase",
                letterSpacing: "0.5px",
                boxShadow: "0 2px 8px rgba(99, 102, 241, 0.35)"
              }}
            >
              System Maintenance
            </span>
            <strong style={{ fontSize: "1.02rem", color: "#ffffff", letterSpacing: "0.2px" }}>
              Grievance Submissions Temporarily Paused
            </strong>
          </div>
          <div style={{ fontSize: "0.86rem", color: "#c7d2fe", lineHeight: "1.45" }}>
            {maintenanceMessage ||
              "The portal is undergoing scheduled maintenance. New grievance submissions are paused. You can still view your dashboard, history, and status updates."}
          </div>
        </div>
      </div>

      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "8px",
          padding: "6px 14px",
          borderRadius: "20px",
          backgroundColor: "rgba(99, 102, 241, 0.15)",
          border: "1px solid rgba(165, 180, 252, 0.3)",
          fontSize: "0.8rem",
          color: "#e0e7ff",
          fontWeight: "600",
          whiteSpace: "nowrap"
        }}
      >
        <span
          style={{
            width: "8px",
            height: "8px",
            borderRadius: "50%",
            backgroundColor: "#818cf8",
            boxShadow: "0 0 10px #6366f1"
          }}
        />
        <span>Dashboard Active & Browsable</span>
      </div>
    </div>
  );
}
