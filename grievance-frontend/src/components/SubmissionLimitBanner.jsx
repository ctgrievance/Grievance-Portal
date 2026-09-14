import React, { useState, useEffect, useCallback, useRef } from "react";
import { useMaintenance } from "../context/MaintenanceContext";
import MaintenanceNoticeBanner from "./MaintenanceNoticeBanner";

/**
 * ⏱️ SubmissionLimitBanner
 * Displays 24-hour grievance cooldown status with a live ticking countdown timer.
 * Automatically refreshes and unlocks when the countdown reaches zero.
 * Also synchronizes with system-wide maintenance mode.
 */
export default function SubmissionLimitBanner({
  userId,
  onLimitStatusChange,
  showCompact = false,
  timerOnly = false,
  className = ""
}) {
  const { isMaintenanceActive } = useMaintenance();
  const [loading, setLoading] = useState(true);
  const [limitData, setLimitData] = useState(null);
  const [secondsLeft, setSecondsLeft] = useState(0);

  // Keep a ref to onLimitStatusChange to avoid effect re-triggers
  const statusCallbackRef = useRef(onLimitStatusChange);
  useEffect(() => {
    statusCallbackRef.current = onLimitStatusChange;
  }, [onLimitStatusChange]);

  const notifyParent = useCallback((data) => {
    if (!statusCallbackRef.current) return;
    if (isMaintenanceActive) {
      statusCallbackRef.current({
        canSubmit: false,
        isMaintenance: true,
        cooldownActive: data?.cooldownActive || false,
        remainingMs: data?.remainingMs || 0,
        nextAllowedAt: data?.nextAllowedAt || null
      });
    } else {
      statusCallbackRef.current(data || { canSubmit: true, isMaintenance: false });
    }
  }, [isMaintenanceActive]);

  // Synchronize maintenance state changes with parent
  useEffect(() => {
    notifyParent(limitData);
  }, [isMaintenanceActive, limitData, notifyParent]);

  const fetchLimitStatus = useCallback(async () => {
    if (!userId) return;
    try {
      const baseUrl = process.env.REACT_APP_API_URL || "http://localhost:5000";
      const res = await fetch(`${baseUrl}/api/grievances/submission-limit/${encodeURIComponent(userId)}`);
      if (!res.ok) throw new Error("Failed to check submission limit");

      const data = await res.json();
      setLimitData(data);

      if (data.cooldownActive && data.remainingMs > 0) {
        setSecondsLeft(Math.ceil(data.remainingMs / 1000));
      } else {
        setSecondsLeft(0);
      }

      notifyParent(data);
    } catch (err) {
      console.warn("Could not check submission limit:", err.message);
    } finally {
      setLoading(false);
    }
  }, [userId, notifyParent]);

  // Initial fetch
  useEffect(() => {
    fetchLimitStatus();
  }, [fetchLimitStatus]);

  // Live 1-second countdown timer
  useEffect(() => {
    if (secondsLeft <= 0) return;

    const timer = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          // 🔄 Auto-refresh when cooldown reaches 0!
          setTimeout(() => {
            fetchLimitStatus();
          }, 1000);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [secondsLeft, fetchLimitStatus]);

  // 🛠️ SYSTEM MAINTENANCE MODE
  if (isMaintenanceActive) {
    // If timerOnly (Student Dashboard), don't render duplicate banner as dashboard displays MaintenanceNoticeBanner mode="dashboard"
    if (timerOnly) {
      return null;
    }

    if (showCompact) {
      return (
        <div
          className={`submission-limit-badge ${className}`}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            padding: "6px 14px",
            background: "linear-gradient(135deg, #eef2ff 0%, #e0e7ff 100%)",
            border: "1px solid #c7d2fe",
            borderRadius: "20px",
            color: "#3730a3",
            fontSize: "0.85rem",
            fontWeight: "600",
            boxShadow: "0 1px 4px rgba(99, 102, 241, 0.12)"
          }}
        >
          <span
            style={{
              width: "8px",
              height: "8px",
              borderRadius: "50%",
              backgroundColor: "#6366f1",
              boxShadow: "0 0 6px #6366f1",
              display: "inline-block"
            }}
          />
          <span>🔒 Submissions Paused (Maintenance)</span>
        </div>
      );
    }

    // Default: Form mode - Render the dedicated maintenance warning banner
    return <MaintenanceNoticeBanner mode="form" />;
  }

  if (loading || !limitData || !limitData.cooldownActive || secondsLeft <= 0) {
    return null;
  }

  // Format time strings
  const hours = Math.floor(secondsLeft / 3600);
  const minutes = Math.floor((secondsLeft % 3600) / 60);
  const seconds = secondsLeft % 60;

  const formattedCountdown = `${hours.toString().padStart(2, "0")}h ${minutes
    .toString()
    .padStart(2, "0")}m ${seconds.toString().padStart(2, "0")}s`;

  const unlockDate = limitData.nextAllowedAt
    ? new Date(limitData.nextAllowedAt).toLocaleTimeString("en-IN", {
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true
      })
    : "";

  // Timer-only mode (strictly countdown timer for Student Dashboard)
  if (timerOnly) {
    return (
      <div
        className={`submission-limit-timer-only ${className}`}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexWrap: "wrap",
          gap: "10px",
          padding: "12px 20px",
          background: "linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)",
          border: "1.5px solid #f59e0b",
          borderRadius: "12px",
          color: "#92400e",
          boxShadow: "0 2px 10px rgba(245, 158, 11, 0.12)",
          marginBottom: "20px"
        }}
      >
        <span style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontWeight: "600", fontSize: "0.95rem" }}>
          <span>⏳</span>
          <span>Next Grievance Submission Available In:</span>
        </span>
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            background: "#78350f",
            color: "#ffffff",
            padding: "4px 14px",
            borderRadius: "20px",
            fontFamily: "monospace",
            fontSize: "1.05rem",
            fontWeight: "700",
            letterSpacing: "0.5px",
            boxShadow: "0 2px 6px rgba(120, 53, 15, 0.2)"
          }}
        >
          {formattedCountdown}
        </span>
      </div>
    );
  }

  // Compact badge mode (e.g. for student dashboard)
  if (showCompact) {
    return (
      <div
        className={`submission-limit-badge ${className}`}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "8px",
          padding: "6px 12px",
          background: "#fef3c7",
          border: "1px solid #fde68a",
          borderRadius: "20px",
          color: "#92400e",
          fontSize: "0.85rem",
          fontWeight: "600",
          boxShadow: "0 1px 3px rgba(0,0,0,0.05)"
        }}
      >
        <span
          style={{
            width: "8px",
            height: "8px",
            borderRadius: "50%",
            backgroundColor: "#f59e0b",
            display: "inline-block",
            animation: "pulse 1.5s infinite"
          }}
        />
        <span>Cooldown Active: <strong>{formattedCountdown}</strong></span>
      </div>
    );
  }

  // Full alert banner mode (for submit forms)
  return (
    <div
      className={`submission-limit-card ${className}`}
      style={{
        background: "linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)",
        border: "1.5px solid #f59e0b",
        borderRadius: "14px",
        padding: "16px 20px",
        marginBottom: "24px",
        boxShadow: "0 4px 16px rgba(245, 158, 11, 0.12)",
        position: "relative",
        overflow: "hidden"
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          gap: "14px"
        }}
      >
        {/* Animated Clock Icon */}
        <div
          style={{
            width: "42px",
            height: "42px",
            borderRadius: "10px",
            backgroundColor: "#fbbf24",
            color: "#78350f",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            boxShadow: "0 2px 6px rgba(245, 158, 11, 0.25)"
          }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
        </div>

        {/* Text Content */}
        <div style={{ flex: 1 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "8px",
              marginBottom: "6px"
            }}
          >
            <h4
              style={{
                margin: 0,
                color: "#92400e",
                fontSize: "1rem",
                fontWeight: "700",
                display: "flex",
                alignItems: "center",
                gap: "8px"
              }}
            >
              <span>Daily Submission Limit Active</span>
              <span
                style={{
                  background: "#fef3c7",
                  border: "1px solid #f59e0b",
                  padding: "2px 8px",
                  borderRadius: "12px",
                  fontSize: "0.75rem",
                  color: "#b45309",
                  fontWeight: "600"
                }}
              >
                1 Grievance / 24 Hours
              </span>
            </h4>

            {/* Countdown Badge */}
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                background: "#78350f",
                color: "#ffffff",
                padding: "4px 12px",
                borderRadius: "20px",
                fontSize: "0.85rem",
                fontFamily: "monospace",
                fontWeight: "700",
                letterSpacing: "0.5px",
                boxShadow: "0 2px 6px rgba(120, 53, 15, 0.2)"
              }}
            >
              <span>⏳ {formattedCountdown}</span>
            </div>
          </div>

          <p
            style={{
              margin: "0 0 8px 0",
              color: "#78350f",
              fontSize: "0.875rem",
              lineHeight: 1.5
            }}
          >
            To prevent duplicate tickets and ensure fair redressal, university policy permits <strong>one grievance per 24 hours</strong>.
          </p>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: "10px",
              paddingTop: "8px",
              borderTop: "1px dashed rgba(245, 158, 11, 0.4)",
              fontSize: "0.8rem",
              color: "#92400e"
            }}
          >
            <div>
              {unlockDate && (
                <span>
                  Next submission unlocks: <strong>{unlockDate}</strong>
                </span>
              )}
            </div>

            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                color: "#166534",
                fontWeight: "600"
              }}
            >
              <span
                style={{
                  width: "6px",
                  height: "6px",
                  borderRadius: "50%",
                  backgroundColor: "#16a34a",
                  display: "inline-block"
                }}
              />
              <span>Form will unlock automatically when timer reaches 0</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
