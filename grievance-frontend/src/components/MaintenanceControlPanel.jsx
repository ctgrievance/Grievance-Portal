import React, { useState } from "react";
import { useMaintenance } from "../context/MaintenanceContext";
import {
  ShieldAlertIcon,
  CheckCircleIcon,
  PlayIcon,
  PauseIcon,
  XIcon,
  SpinnerIcon
} from "./Icons";

export default function MaintenanceControlPanel({ onStatusChanged }) {
  const {
    isMaintenanceActive,
    maintenanceMessage,
    maintenanceReason,
    activatedAt,
    activatedBy,
    allowStaffLogin,
    toggleMaintenance
  } = useMaintenance();

  const [showModal, setShowModal] = useState(false);
  const [customMsg, setCustomMsg] = useState("");
  const [reason, setReason] = useState("Scheduled System Maintenance");
  const [allowStaff, setAllowStaff] = useState(false);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState("");

  const handleOpenModal = () => {
    setCustomMsg(
      maintenanceMessage ||
        "The Grievance Redressal Portal is currently under scheduled maintenance. Grievance submissions and services are temporarily paused. Please check back shortly."
    );
    setReason(maintenanceReason || "Scheduled System Maintenance");
    setAllowStaff(Boolean(allowStaffLogin));
    setShowModal(true);
  };

  const handleConfirmToggle = async (targetActive) => {
    setLoading(true);
    try {
      const res = await toggleMaintenance({
        isMaintenanceActive: targetActive,
        maintenanceMessage: customMsg,
        maintenanceReason: reason,
        allowStaffLogin: allowStaff
      });
      setShowModal(false);
      setToast(res.message || "Maintenance status updated successfully.");
      setTimeout(() => setToast(""), 4000);
      if (onStatusChanged) onStatusChanged(targetActive);
    } catch (err) {
      alert(`Error updating maintenance mode: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const formattedActivatedAt = activatedAt
    ? new Date(activatedAt).toLocaleString("en-IN", {
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true
      })
    : null;

  return (
    <div
      style={{
        margin: "0 0 20px 0",
        background: isMaintenanceActive ? "#fffdfd" : "#ffffff",
        border: `1px solid ${isMaintenanceActive ? "#fecaca" : "#e2e8f0"}`,
        borderLeft: `4px solid ${isMaintenanceActive ? "#dc2626" : "#0f172a"}`,
        borderRadius: "12px",
        padding: "16px 20px",
        color: "#0f172a",
        boxShadow: "0 1px 4px rgba(15, 23, 42, 0.04)",
        position: "relative",
        transition: "all 0.2s ease"
      }}
    >
      {toast && (
        <div
          style={{
            position: "absolute",
            top: "-12px",
            right: "20px",
            backgroundColor: "#0f172a",
            color: "#ffffff",
            padding: "5px 14px",
            borderRadius: "20px",
            fontSize: "0.8rem",
            fontWeight: "600",
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            boxShadow: "0 4px 12px rgba(15, 23, 42, 0.2)",
            zIndex: 10
          }}
        >
          <CheckCircleIcon width="14" height="14" style={{ color: "#34d399" }} />
          <span>{toast}</span>
        </div>
      )}

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "14px"
        }}
      >
        {/* Left: Status & Info */}
        <div style={{ display: "flex", alignItems: "center", gap: "14px", flex: 1, minWidth: "260px" }}>
          <div
            style={{
              width: "40px",
              height: "40px",
              borderRadius: "10px",
              backgroundColor: isMaintenanceActive ? "#fee2e2" : "#f1f5f9",
              border: `1px solid ${isMaintenanceActive ? "#fca5a5" : "#e2e8f0"}`,
              color: isMaintenanceActive ? "#dc2626" : "#0f172a",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0
            }}
          >
            {isMaintenanceActive ? (
              <ShieldAlertIcon width="20" height="20" />
            ) : (
              <CheckCircleIcon width="20" height="20" />
            )}
          </div>

          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
              <span
                style={{
                  fontSize: "0.72rem",
                  fontWeight: "700",
                  textTransform: "uppercase",
                  letterSpacing: "0.4px",
                  padding: "2px 8px",
                  borderRadius: "12px",
                  backgroundColor: isMaintenanceActive ? "#fee2e2" : "#ecfdf5",
                  color: isMaintenanceActive ? "#b91c1c" : "#047857",
                  border: `1px solid ${isMaintenanceActive ? "#fca5a5" : "#a7f3d0"}`,
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
                    backgroundColor: isMaintenanceActive ? "#dc2626" : "#10b981",
                    display: "inline-block"
                  }}
                />
                {isMaintenanceActive ? "Maintenance Active" : "Portal Live"}
              </span>

              <span style={{ fontSize: "0.98rem", fontWeight: "700", color: "#0f172a" }}>
                {isMaintenanceActive
                  ? "Incoming Grievances Paused"
                  : "Accepting Grievances & Normal Operations"}
              </span>
            </div>

            <p style={{ margin: "4px 0 0 0", fontSize: "0.84rem", color: "#64748b", lineHeight: "1.4" }}>
              {isMaintenanceActive
                ? `Active since ${formattedActivatedAt || "recently"}${activatedBy ? ` by ${activatedBy}` : ""}. Students and staff see the maintenance notice.`
                : "Students and staff can lodge and view grievances freely across all departments."}
            </p>
          </div>
        </div>

        {/* Right: Action Button */}
        <div>
          {isMaintenanceActive ? (
            <button
              type="button"
              disabled={loading}
              onClick={() => handleConfirmToggle(false)}
              style={{
                backgroundColor: "#0f172a",
                color: "#ffffff",
                border: "none",
                borderRadius: "8px",
                padding: "9px 18px",
                fontSize: "0.86rem",
                fontWeight: "600",
                cursor: loading ? "not-allowed" : "pointer",
                boxShadow: "0 1px 3px rgba(15, 23, 42, 0.15)",
                display: "inline-flex",
                alignItems: "center",
                gap: "7px",
                transition: "all 0.15s ease",
                opacity: loading ? 0.7 : 1
              }}
              onMouseEnter={(e) => {
                if (!loading) e.currentTarget.style.backgroundColor = "#1e293b";
              }}
              onMouseLeave={(e) => {
                if (!loading) e.currentTarget.style.backgroundColor = "#0f172a";
              }}
            >
              {loading ? (
                <>
                  <SpinnerIcon size={14} />
                  <span>Resuming...</span>
                </>
              ) : (
                <>
                  <PlayIcon width="13" height="13" />
                  <span>Resume Portal & Grievances</span>
                </>
              )}
            </button>
          ) : (
            <button
              type="button"
              onClick={handleOpenModal}
              style={{
                backgroundColor: "#ffffff",
                color: "#dc2626",
                border: "1px solid #fca5a5",
                borderRadius: "8px",
                padding: "8px 16px",
                fontSize: "0.86rem",
                fontWeight: "600",
                cursor: "pointer",
                boxShadow: "0 1px 2px rgba(220, 38, 38, 0.05)",
                display: "inline-flex",
                alignItems: "center",
                gap: "7px",
                transition: "all 0.15s ease"
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "#fef2f2";
                e.currentTarget.style.borderColor = "#ef4444";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "#ffffff";
                e.currentTarget.style.borderColor = "#fca5a5";
              }}
            >
              <PauseIcon width="13" height="13" />
              <span>Pause Grievances (Maintenance)</span>
            </button>
          )}
        </div>
      </div>

      {/* Confirmation & Customization Modal */}
      {showModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(15, 23, 42, 0.5)",
            backdropFilter: "blur(3px)",
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "16px"
          }}
        >
          <div
            style={{
              backgroundColor: "#ffffff",
              borderRadius: "14px",
              maxWidth: "520px",
              width: "100%",
              padding: "24px",
              border: "1px solid #e2e8f0",
              boxShadow: "0 20px 30px -5px rgba(15, 23, 42, 0.2)",
              color: "#0f172a"
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "14px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div
                  style={{
                    width: "36px",
                    height: "36px",
                    borderRadius: "8px",
                    background: "#fee2e2",
                    color: "#dc2626",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center"
                  }}
                >
                  <ShieldAlertIcon width="20" height="20" />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: "700", color: "#0f172a" }}>
                    Enable Maintenance Mode
                  </h3>
                  <span style={{ fontSize: "0.78rem", color: "#64748b" }}>
                    Pause incoming student & staff grievance submissions
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                style={{
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  color: "#94a3b8",
                  padding: "4px",
                  borderRadius: "6px"
                }}
              >
                <XIcon width="18" height="18" />
              </button>
            </div>

            <p style={{ fontSize: "0.86rem", color: "#475569", lineHeight: "1.5", margin: "0 0 16px 0" }}>
              Activating maintenance pauses all new grievance lodging across the portal. Students and staff will see the maintenance notice. As Super Admin, you will retain full access to review, re-route, and resolve tickets.
            </p>

            <div style={{ marginBottom: "14px" }}>
              <label style={{ fontSize: "0.8rem", fontWeight: "600", color: "#475569", display: "block", marginBottom: "6px" }}>
                Maintenance Reason / Title
              </label>
              <input
                type="text"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g. Scheduled System Upgrade"
                style={{
                  width: "100%",
                  padding: "9px 12px",
                  borderRadius: "8px",
                  border: "1px solid #cbd5e1",
                  backgroundColor: "#f8fafc",
                  color: "#0f172a",
                  fontSize: "0.88rem",
                  boxSizing: "border-box"
                }}
              />
            </div>

            <div style={{ marginBottom: "18px" }}>
              <label style={{ fontSize: "0.8rem", fontWeight: "600", color: "#475569", display: "block", marginBottom: "6px" }}>
                Notice Message (Shown to Students & Staff)
              </label>
              <textarea
                rows={3}
                value={customMsg}
                onChange={(e) => setCustomMsg(e.target.value)}
                placeholder="Message displayed to users..."
                style={{
                  width: "100%",
                  padding: "9px 12px",
                  borderRadius: "8px",
                  border: "1px solid #cbd5e1",
                  backgroundColor: "#f8fafc",
                  color: "#0f172a",
                  fontSize: "0.88rem",
                  resize: "vertical",
                  boxSizing: "border-box"
                }}
              />
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                disabled={loading}
                style={{
                  padding: "9px 16px",
                  borderRadius: "8px",
                  border: "1px solid #cbd5e1",
                  backgroundColor: "#ffffff",
                  color: "#475569",
                  fontSize: "0.85rem",
                  fontWeight: "600",
                  cursor: "pointer"
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleConfirmToggle(true)}
                disabled={loading}
                style={{
                  padding: "9px 18px",
                  borderRadius: "8px",
                  border: "none",
                  backgroundColor: "#dc2626",
                  color: "#ffffff",
                  fontSize: "0.85rem",
                  fontWeight: "600",
                  cursor: loading ? "not-allowed" : "pointer",
                  boxShadow: "0 1px 3px rgba(220, 38, 38, 0.2)",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px"
                }}
              >
                {loading ? (
                  <>
                    <SpinnerIcon size={14} />
                    <span>Activating...</span>
                  </>
                ) : (
                  <>
                    <PauseIcon width="13" height="13" />
                    <span>Confirm & Activate Now</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

