import React, { useEffect } from "react";

export default function ChatNotificationToast({ notification, onOpenChat, onClose }) {
  useEffect(() => {
    if (!notification) return;
    const timer = setTimeout(() => {
      onClose();
    }, 6000);
    return () => clearTimeout(timer);
  }, [notification, onClose]);

  if (!notification) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: "24px",
        right: "24px",
        zIndex: 99999,
        minWidth: "320px",
        maxWidth: "420px",
        background: "linear-gradient(135deg, #1e293b, #0f172a)",
        color: "#ffffff",
        borderRadius: "14px",
        boxShadow: "0 20px 40px rgba(0, 0, 0, 0.35), 0 0 0 1px rgba(255, 255, 255, 0.1)",
        padding: "16px",
        display: "flex",
        flexDirection: "column",
        gap: "10px",
        animation: "slideInToast 0.35s cubic-bezier(0.16, 1, 0.3, 1)",
        backdropFilter: "blur(8px)",
      }}
    >
      <style>{`
        @keyframes slideInToast {
          from {
            transform: translateX(120%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
      `}</style>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: "28px",
              height: "28px",
              borderRadius: "50%",
              background: "#3b82f6",
              color: "#fff",
              fontSize: "14px",
            }}
          >
            💬
          </span>
          <div>
            <span style={{ fontWeight: "700", fontSize: "14px", color: "#f8fafc" }}>
              {notification.sender || "New Message"}
            </span>
            <span
              style={{
                marginLeft: "6px",
                fontSize: "10px",
                textTransform: "uppercase",
                padding: "2px 6px",
                borderRadius: "4px",
                background: notification.senderRole === "student" ? "#22c55e" : "#3b82f6",
                color: "#fff",
                fontWeight: "600",
              }}
            >
              {notification.senderRole || "User"}
            </span>
          </div>
        </div>

        <button
          onClick={onClose}
          style={{
            background: "transparent",
            border: "none",
            color: "#94a3b8",
            cursor: "pointer",
            fontSize: "18px",
            lineHeight: "1",
            padding: "2px 6px",
          }}
          title="Dismiss"
        >
          ×
        </button>
      </div>

      {/* Grievance Category Tag */}
      <div style={{ fontSize: "11px", color: "#94a3b8", display: "flex", gap: "6px", alignItems: "center" }}>
        <span>📌 Grievance:</span>
        <span style={{ color: "#38bdf8", fontWeight: "600" }}>{notification.category || "General"}</span>
      </div>

      {/* Message Snippet */}
      <div
        style={{
          fontSize: "13px",
          color: "#e2e8f0",
          background: "rgba(255, 255, 255, 0.05)",
          padding: "8px 12px",
          borderRadius: "8px",
          borderLeft: "3px solid #3b82f6",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {notification.message || "Sent an attachment"}
      </div>

      {/* Actions */}
      <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px", marginTop: "2px" }}>
        <button
          onClick={() => {
            onClose();
            if (onOpenChat && notification.grievanceId) {
              onOpenChat(notification.grievanceId);
            }
          }}
          style={{
            background: "linear-gradient(135deg, #3b82f6, #2563eb)",
            color: "#fff",
            border: "none",
            padding: "7px 14px",
            borderRadius: "8px",
            fontSize: "12px",
            fontWeight: "600",
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            boxShadow: "0 4px 12px rgba(37, 99, 235, 0.4)",
            transition: "transform 0.15s ease",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.03)")}
          onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
        >
          <span>Open Chat</span>
          <span>→</span>
        </button>
      </div>
    </div>
  );
}
