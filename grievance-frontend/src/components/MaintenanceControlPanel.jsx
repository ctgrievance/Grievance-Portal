import React, { useState } from "react";
import { useMaintenance } from "../context/MaintenanceContext";
import { ShieldIcon, AlertCircleIcon, CheckCircleIcon } from "./Icons";

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
      setToast(res.message || "Maintenance mode updated successfully!");
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
        margin: "0 0 24px 0",
        background: isMaintenanceActive
          ? "linear-gradient(135deg, #450a0a 0%, #1f1212 100%)"
          : "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
        border: `1.5px solid ${isMaintenanceActive ? "#ef4444" : "#334155"}`,
        borderRadius: "14px",
        padding: "18px 22px",
        color: "#ffffff",
        boxShadow: isMaintenanceActive
          ? "0 4px 25px rgba(239, 68, 68, 0.25)"
          : "0 4px 20px rgba(15, 23, 42, 0.15)",
        position: "relative",
        transition: "all 0.3s ease"
      }}
    >
      {toast && (
        <div
          style={{
            position: "absolute",
            top: "-14px",
            right: "20px",
            backgroundColor: "#10b981",
            color: "#ffffff",
            padding: "6px 14px",
            borderRadius: "20px",
            fontSize: "0.82rem",
            fontWeight: "600",
            boxShadow: "0 4px 12px rgba(16, 185, 129, 0.4)",
            zIndex: 10
          }}
        >
          {toast}
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
              width: "44px",
              height: "44px",
              borderRadius: "12px",
              backgroundColor: isMaintenanceActive ? "rgba(239, 68, 68, 0.2)" : "rgba(16, 185, 129, 0.2)",
              border: `1px solid ${isMaintenanceActive ? "#ef4444" : "#10b981"}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "1.4rem",
              flexShrink: 0
            }}
          >
            {isMaintenanceActive ? "🛑" : "🟢"}
          </div>

          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
              <span
                style={{
                  fontSize: "0.76rem",
                  fontWeight: "700",
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                  padding: "3px 10px",
                  borderRadius: "20px",
                  backgroundColor: isMaintenanceActive ? "#ef4444" : "#10b981",
                  color: "#ffffff"
                }}
              >
                {isMaintenanceActive ? "Maintenance Active" : "Portal Live"}
              </span>

              <span style={{ fontSize: "1.02rem", fontWeight: "700", color: "#f8fafc" }}>
                {isMaintenanceActive
                  ? "Incoming Grievances Paused"
                  : "Accepting Grievances & Normal Operations"}
              </span>
            </div>

            <p style={{ margin: "4px 0 0 0", fontSize: "0.85rem", color: "#94a3b8" }}>
              {isMaintenanceActive
                ? `Active since ${formattedActivatedAt || "recently"}${activatedBy ? ` by ${activatedBy}` : ""}. Students and staff see the maintenance screen.`
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
                background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                color: "#ffffff",
                border: "none",
                borderRadius: "10px",
                padding: "10px 20px",
                fontSize: "0.9rem",
                fontWeight: "700",
                cursor: loading ? "not-allowed" : "pointer",
                boxShadow: "0 4px 14px rgba(16, 185, 129, 0.4)",
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                transition: "all 0.2s ease"
              }}
            >
              <span>{loading ? "Updating..." : "▶️ Resume Portal & Grievances"}</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleOpenModal}
              style={{
                background: "linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)",
                color: "#ffffff",
                border: "none",
                borderRadius: "10px",
                padding: "10px 20px",
                fontSize: "0.9rem",
                fontWeight: "700",
                cursor: "pointer",
                boxShadow: "0 4px 14px rgba(239, 68, 68, 0.35)",
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                transition: "all 0.2s ease"
              }}
            >
              <span>🛑 Pause Grievances (Maintenance Mode)</span>
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
            backgroundColor: "rgba(0, 0, 0, 0.75)",
            backdropFilter: "blur(6px)",
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px"
          }}
        >
          <div
            style={{
              backgroundColor: "#1e293b",
              borderRadius: "16px",
              maxWidth: "520px",
              width: "100%",
              padding: "26px",
              border: "1.5px solid #ef4444",
              boxShadow: "0 20px 40px rgba(0, 0, 0, 0.6)",
              color: "#f8fafc"
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "14px" }}>
              <span style={{ fontSize: "1.5rem" }}>🛑</span>
              <h3 style={{ margin: 0, fontSize: "1.2rem", fontWeight: "700", color: "#f87171" }}>
                Pause Incoming Grievances & Enable Maintenance
              </h3>
            </div>

            <p style={{ fontSize: "0.88rem", color: "#cbd5e1", lineHeight: "1.5", margin: "0 0 16px 0" }}>
              Activating maintenance mode will immediately pause all new grievance submissions. Students and staff will see the maintenance screen. You as Super Admin will retain full access to this dashboard.
            </p>

            <div style={{ marginBottom: "14px" }}>
              <label style={{ fontSize: "0.82rem", fontWeight: "600", color: "#94a3b8", display: "block", marginBottom: "6px" }}>
                Maintenance Reason / Title
              </label>
              <input
                type="text"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g. Scheduled System Upgrade"
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  borderRadius: "8px",
                  border: "1px solid #475569",
                  backgroundColor: "#0f172a",
                  color: "#ffffff",
                  fontSize: "0.9rem"
                }}
              />
            </div>

            <div style={{ marginBottom: "18px" }}>
              <label style={{ fontSize: "0.82rem", fontWeight: "600", color: "#94a3b8", display: "block", marginBottom: "6px" }}>
                Notice Message (Shown to Students & Staff)
              </label>
              <textarea
                rows={3}
                value={customMsg}
                onChange={(e) => setCustomMsg(e.target.value)}
                placeholder="Message displayed to users..."
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  borderRadius: "8px",
                  border: "1px solid #475569",
                  backgroundColor: "#0f172a",
                  color: "#ffffff",
                  fontSize: "0.9rem",
                  resize: "vertical"
                }}
              />
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                disabled={loading}
                style={{
                  padding: "10px 18px",
                  borderRadius: "8px",
                  border: "1px solid #475569",
                  backgroundColor: "transparent",
                  color: "#cbd5e1",
                  fontSize: "0.88rem",
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
                  padding: "10px 20px",
                  borderRadius: "8px",
                  border: "none",
                  backgroundColor: "#ef4444",
                  color: "#ffffff",
                  fontSize: "0.88rem",
                  fontWeight: "700",
                  cursor: loading ? "not-allowed" : "pointer",
                  boxShadow: "0 4px 12px rgba(239, 68, 68, 0.4)"
                }}
              >
                {loading ? "Activating..." : "Confirm & Activate Now"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
