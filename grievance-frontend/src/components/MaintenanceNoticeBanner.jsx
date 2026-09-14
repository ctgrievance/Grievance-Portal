import React from "react";
import { useMaintenance } from "../context/MaintenanceContext";
import { WrenchIcon, LockIcon, ShieldAlertIcon } from "./Icons";

export default function MaintenanceNoticeBanner({ mode = "dashboard", className = "" }) {
  const { isMaintenanceActive, maintenanceMessage, maintenanceReason } = useMaintenance();

  if (!isMaintenanceActive) return null;

  if (mode === "form") {
    return (
      <div
        className={`maintenance-form-banner ${className}`}
        style={{
          margin: "0 0 20px 0",
          padding: "16px 18px",
          background: "#ffffff",
          border: "1px solid #fecaca",
          borderLeft: "4px solid #dc2626",
          borderRadius: "12px",
          color: "#0f172a",
          boxShadow: "0 1px 3px rgba(15, 23, 42, 0.04)",
          display: "flex",
          alignItems: "flex-start",
          gap: "14px",
          position: "relative"
        }}
      >
        <div
          style={{
            width: "38px",
            height: "38px",
            borderRadius: "8px",
            background: "#fee2e2",
            color: "#dc2626",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0
          }}
        >
          <ShieldAlertIcon width="20" height="20" />
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap", marginBottom: "4px" }}>
            <span
              style={{
                backgroundColor: "#fee2e2",
                color: "#b91c1c",
                border: "1px solid #fca5a5",
                padding: "2px 8px",
                borderRadius: "10px",
                fontSize: "0.72rem",
                fontWeight: "700",
                textTransform: "uppercase",
                letterSpacing: "0.4px",
                display: "inline-flex",
                alignItems: "center",
                gap: "5px"
              }}
            >
              <span
                style={{
                  width: "6px",
                  height: "6px",
                  borderRadius: "50%",
                  backgroundColor: "#dc2626",
                  display: "inline-block"
                }}
              />
              Submissions Paused
            </span>
            <strong style={{ fontSize: "0.95rem", color: "#0f172a" }}>
              {maintenanceReason || "Scheduled Portal Maintenance Active"}
            </strong>
          </div>

          <div style={{ fontSize: "0.86rem", color: "#475569", lineHeight: "1.5" }}>
            {maintenanceMessage ||
              "The Grievance Redressal Portal is currently under scheduled maintenance. Incoming grievance submissions are temporarily paused. Please check back shortly."}
          </div>

          <div
            style={{
              marginTop: "10px",
              padding: "7px 12px",
              borderRadius: "6px",
              backgroundColor: "#fef2f2",
              border: "1px solid #fee2e2",
              fontSize: "0.8rem",
              color: "#991b1b",
              fontWeight: "600",
              display: "flex",
              alignItems: "center",
              gap: "7px"
            }}
          >
            <LockIcon width="13" height="13" />
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
        padding: "16px 20px",
        background: "#ffffff",
        border: "1px solid #e2e8f0",
        borderLeft: "4px solid #3b82f6",
        borderRadius: "12px",
        color: "#0f172a",
        boxShadow: "0 1px 4px rgba(15, 23, 42, 0.04)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flexWrap: "wrap",
        gap: "14px",
        position: "relative"
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "14px", flex: 1, minWidth: "260px" }}>
        <div
          style={{
            width: "40px",
            height: "40px",
            borderRadius: "10px",
            background: "#eff6ff",
            border: "1px solid #dbeafe",
            color: "#2563eb",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0
          }}
        >
          <WrenchIcon width="20" height="20" />
        </div>

        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap", marginBottom: "3px" }}>
            <span
              style={{
                backgroundColor: "#eff6ff",
                color: "#1d4ed8",
                border: "1px solid #bfdbfe",
                padding: "2px 8px",
                borderRadius: "10px",
                fontSize: "0.72rem",
                fontWeight: "700",
                textTransform: "uppercase",
                letterSpacing: "0.4px",
                display: "inline-flex",
                alignItems: "center",
                gap: "5px"
              }}
            >
              <span
                style={{
                  width: "6px",
                  height: "6px",
                  borderRadius: "50%",
                  backgroundColor: "#2563eb",
                  display: "inline-block"
                }}
              />
              System Maintenance
            </span>
            <strong style={{ fontSize: "0.98rem", color: "#0f172a" }}>
              Grievance Submissions Temporarily Paused
            </strong>
          </div>
          <div style={{ fontSize: "0.85rem", color: "#64748b", lineHeight: "1.45" }}>
            {maintenanceMessage ||
              "The portal is undergoing scheduled maintenance. New grievance submissions are paused. You can still view your dashboard, history, and status updates."}
          </div>
        </div>
      </div>

      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "7px",
          padding: "5px 12px",
          borderRadius: "20px",
          backgroundColor: "#f8fafc",
          border: "1px solid #e2e8f0",
          fontSize: "0.78rem",
          color: "#475569",
          fontWeight: "600",
          whiteSpace: "nowrap"
        }}
      >
        <span
          style={{
            width: "6px",
            height: "6px",
            borderRadius: "50%",
            backgroundColor: "#10b981",
            display: "inline-block"
          }}
        />
        <span>Dashboard Active & Browsable</span>
      </div>
    </div>
  );
}

