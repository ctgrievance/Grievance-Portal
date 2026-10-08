import React, { useState, useEffect, useMemo } from "react";
import {
  AlertCircleIcon,
  CheckCircleIcon,
  MailIcon,
  SendIcon,
  SpinnerIcon,
  UserIcon,
  ClockIcon,
  ShieldIcon
} from "./Icons";

// Minimal clean SVG icons
const ChevronDown = ({ style }) => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={style}>
    <polyline points="6 9 12 15 18 9" />
  </svg>
);

const RefreshSvg = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="23 4 23 10 17 10" />
    <polyline points="1 20 1 14 7 14" />
    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
  </svg>
);

function RoutingAuditPanel() {
  const [loading, setLoading] = useState(true);
  const [auditData, setAuditData] = useState({ summary: {}, departments: [] });
  const [filterMode, setFilterMode] = useState("needs_attention"); // "needs_attention" | "all" | "configured"
  const [searchQuery, setSearchQuery] = useState("");
  
  // Single Department Reminder Modal
  const [selectedDeptForReminder, setSelectedDeptForReminder] = useState(null);
  const [customNote, setCustomNote] = useState("");
  const [selectedRecipient, setSelectedRecipient] = useState("");
  const [sendingEmail, setSendingEmail] = useState(false);

  // Universal Broadcast Modal
  const [showBroadcastModal, setShowBroadcastModal] = useState(false);
  const [broadcastNote, setBroadcastNote] = useState("");
  const [sendingBroadcast, setSendingBroadcast] = useState(false);

  // Accordion state (expanded department dropdowns) - default all collapsed
  const [expandedDepartments, setExpandedDepartments] = useState({});

  const [feedbackMessage, setFeedbackMessage] = useState({ text: "", type: "" });

  useEffect(() => {
    fetchAuditData();
  }, []);

  const fetchAuditData = async () => {
    try {
      setLoading(true);
      const apiUrl = process.env.REACT_APP_API_URL || "http://localhost:5000";
      const res = await fetch(`${apiUrl}/api/routing-rules/audit/health-matrix`);
      if (res.ok) {
        const data = await res.json();
        setAuditData(data);
      } else {
        setFeedbackMessage({ text: "Failed to load routing audit data.", type: "error" });
      }
    } catch (err) {
      console.error("Error fetching routing audit:", err);
      setFeedbackMessage({ text: "Network error loading audit.", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  const toggleExpand = (deptName) => {
    setExpandedDepartments((prev) => ({
      ...prev,
      [deptName]: !prev[deptName]
    }));
  };

  const handleExpandAll = () => {
    const nextState = {};
    filteredDepartments.forEach((d) => {
      nextState[d.department] = true;
    });
    setExpandedDepartments(nextState);
  };

  const handleCollapseAll = () => {
    setExpandedDepartments({});
  };

  // Single reminder flow
  const handleOpenReminderModal = (dept) => {
    setSelectedDeptForReminder(dept);
    setCustomNote("");
    if (dept.admins && dept.admins.length > 0) {
      setSelectedRecipient(dept.admins[0].email);
    } else {
      setSelectedRecipient("");
    }
  };

  const handleCloseReminderModal = () => {
    setSelectedDeptForReminder(null);
    setCustomNote("");
    setSelectedRecipient("");
  };

  const handleSendReminder = async (e) => {
    e.preventDefault();
    if (!selectedDeptForReminder || !selectedRecipient) return;

    try {
      setSendingEmail(true);
      const apiUrl = process.env.REACT_APP_API_URL || "http://localhost:5000";
      const superAdminName = localStorage.getItem("user_name") || "Super Administrator";

      const res = await fetch(`${apiUrl}/api/routing-rules/audit/send-reminder`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          department: selectedDeptForReminder.department,
          recipientEmail: selectedRecipient,
          customNote: customNote.trim(),
          superAdminName
        })
      });

      const data = await res.json();

      if (res.ok) {
        setFeedbackMessage({
          text: `Reminder email successfully sent to ${selectedRecipient} for ${selectedDeptForReminder.department}.`,
          type: "success"
        });

        setAuditData((prev) => ({
          ...prev,
          departments: prev.departments.map((d) =>
            d.department === selectedDeptForReminder.department
              ? { ...d, lastRoutingReminderAt: new Date().toISOString(), lastRoutingReminderTo: selectedRecipient }
              : d
          )
        }));

        handleCloseReminderModal();
        setTimeout(() => setFeedbackMessage({ text: "", type: "" }), 5000);
      } else {
        setFeedbackMessage({
          text: data.message || "Failed to send reminder email.",
          type: "error"
        });
      }
    } catch (err) {
      console.error("Error sending reminder:", err);
      setFeedbackMessage({ text: "Failed to send reminder email.", type: "error" });
    } finally {
      setSendingEmail(false);
    }
  };

  // Universal Broadcast Reminder Flow
  const handleSendBroadcast = async (e) => {
    e.preventDefault();
    try {
      setSendingBroadcast(true);
      const apiUrl = process.env.REACT_APP_API_URL || "http://localhost:5000";
      const superAdminName = localStorage.getItem("user_name") || "Super Administrator";

      const res = await fetch(`${apiUrl}/api/routing-rules/audit/broadcast-reminders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customNote: broadcastNote.trim(),
          superAdminName
        })
      });

      const data = await res.json();

      if (res.ok) {
        setFeedbackMessage({
          text: `Universal reminder dispatched to ${data.sentCount || 0} department administrators.`,
          type: "success"
        });

        setShowBroadcastModal(false);
        setBroadcastNote("");
        fetchAuditData(); // Refresh timestamps
        setTimeout(() => setFeedbackMessage({ text: "", type: "" }), 6000);
      } else {
        setFeedbackMessage({
          text: data.message || "Failed to broadcast reminders.",
          type: "error"
        });
      }
    } catch (err) {
      console.error("Error broadcasting reminders:", err);
      setFeedbackMessage({ text: "Error broadcasting reminders.", type: "error" });
    } finally {
      setSendingBroadcast(false);
    }
  };

  // Filtering
  const filteredDepartments = useMemo(() => {
    if (!auditData.departments) return [];

    return auditData.departments.filter((dept) => {
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesName = dept.department.toLowerCase().includes(query);
        const matchesCode = dept.code && dept.code.toLowerCase().includes(query);
        const matchesAdmin = dept.admins && dept.admins.some((a) =>
          a.fullName.toLowerCase().includes(query) || a.email.toLowerCase().includes(query)
        );
        if (!matchesName && !matchesCode && !matchesAdmin) return false;
      }

      if (filterMode === "needs_attention") {
        return dept.needsAttention;
      }
      if (filterMode === "configured") {
        return dept.totalIssues > 0 && !dept.needsAttention;
      }
      return true;
    });
  }, [auditData.departments, filterMode, searchQuery]);

  const departmentsNeedingReminderCount = useMemo(() => {
    if (!auditData.departments) return 0;
    return auditData.departments.filter(
      (d) => d.needsAttention && d.admins && d.admins.length > 0 && d.admins[0].email
    ).length;
  }, [auditData.departments]);

  const formatReminderTime = (isoString) => {
    if (!isoString) return "Never";
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now - date;
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

    if (diffHours < 1) {
      const diffMinutes = Math.floor(diffMs / (1000 * 60));
      return diffMinutes <= 1 ? "Just now" : `${diffMinutes}m ago`;
    }
    if (diffHours < 24) {
      return `${diffHours}h ago`;
    }
    return date.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "60px 20px", color: "#64748b" }}>
        <SpinnerIcon size={28} />
        <div style={{ marginTop: "12px", fontSize: "0.9rem", fontWeight: "600" }}>
          Loading routing audit data...
        </div>
      </div>
    );
  }

  const { summary = {} } = auditData;

  return (
    <div style={{ width: "100%", maxWidth: "1280px", margin: "0 auto", paddingBottom: "40px" }}>
      {/* Toast Feedback */}
      {feedbackMessage.text && (
        <div
          style={{
            marginBottom: "16px",
            padding: "12px 16px",
            borderRadius: "8px",
            fontSize: "0.88rem",
            fontWeight: "600",
            display: "flex",
            alignItems: "center",
            gap: "10px",
            backgroundColor: feedbackMessage.type === "success" ? "#f0fdf4" : "#fef2f2",
            color: feedbackMessage.type === "success" ? "#166534" : "#991b1b",
            border: `1px solid ${feedbackMessage.type === "success" ? "#bbf7d0" : "#fecaca"}`
          }}
        >
          {feedbackMessage.type === "success" ? (
            <CheckCircleIcon width="16" height="16" />
          ) : (
            <AlertCircleIcon width="16" height="16" />
          )}
          <span>{feedbackMessage.text}</span>
        </div>
      )}

      {/* Main Executive Container - Matches Portal Clean Theme */}
      <div
        style={{
          background: "#ffffff",
          borderRadius: "12px",
          border: "1px solid #e2e8f0",
          boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
          overflow: "hidden"
        }}
      >
        {/* Header Section */}
        <div
          style={{
            padding: "20px 24px",
            borderBottom: "1px solid #f1f5f9",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "16px"
          }}
        >
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
              <span
                style={{
                  fontSize: "0.72rem",
                  fontWeight: "700",
                  textTransform: "uppercase",
                  letterSpacing: "0.6px",
                  color: "#475569",
                  background: "#f1f5f9",
                  padding: "3px 8px",
                  borderRadius: "6px"
                }}
              >
                Governance
              </span>
              <h2 style={{ margin: 0, fontSize: "1.25rem", fontWeight: "700", color: "#0f172a" }}>
                Smart Routing Coverage & Reminders
              </h2>
            </div>
            <p style={{ margin: 0, color: "#64748b", fontSize: "0.85rem" }}>
              Department-wise routing rule audit. Identify unassigned categories and notify department admins.
            </p>
          </div>

          {/* Action Buttons: Universal Remind & Refresh */}
          <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
            <button
              onClick={fetchAuditData}
              style={{
                background: "#ffffff",
                border: "1px solid #cbd5e1",
                color: "#334155",
                padding: "8px 14px",
                borderRadius: "8px",
                fontSize: "0.82rem",
                fontWeight: "600",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "6px"
              }}
              title="Refresh audit data"
            >
              <RefreshSvg />
              <span>Refresh</span>
            </button>

            {/* Universal One-Click Reminder Button */}
            <button
              onClick={() => setShowBroadcastModal(true)}
              disabled={departmentsNeedingReminderCount === 0}
              style={{
                background: departmentsNeedingReminderCount > 0 ? "#0f172a" : "#94a3b8",
                border: "none",
                color: "#ffffff",
                padding: "8px 16px",
                borderRadius: "8px",
                fontSize: "0.82rem",
                fontWeight: "600",
                cursor: departmentsNeedingReminderCount > 0 ? "pointer" : "not-allowed",
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                boxShadow: departmentsNeedingReminderCount > 0 ? "0 2px 4px rgba(15, 23, 42, 0.12)" : "none"
              }}
              title="Send reminder email to all department admins with unrouted categories at once"
            >
              <MailIcon width="14" height="14" />
              <span>Remind All Incomplete Departments</span>
              <span
                style={{
                  background: "rgba(255, 255, 255, 0.2)",
                  color: "#ffffff",
                  fontSize: "0.72rem",
                  padding: "1px 6px",
                  borderRadius: "999px",
                  fontWeight: "700"
                }}
              >
                {departmentsNeedingReminderCount}
              </span>
            </button>
          </div>
        </div>

        {/* Minimal Metrics Grid - Aligned with Portal Theme */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: "1px",
            background: "#f1f5f9",
            borderBottom: "1px solid #f1f5f9"
          }}
        >
          <div style={{ background: "#ffffff", padding: "16px 20px" }}>
            <div style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: "600", textTransform: "uppercase" }}>
              Total Departments
            </div>
            <div style={{ fontSize: "1.45rem", fontWeight: "800", color: "#0f172a", marginTop: "2px" }}>
              {summary.totalDepartments || 0}
            </div>
          </div>

          <div style={{ background: "#ffffff", padding: "16px 20px" }}>
            <div style={{ fontSize: "0.75rem", color: "#b91c1c", fontWeight: "600", textTransform: "uppercase", display: "flex", alignItems: "center", gap: "6px" }}>
              <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#ef4444" }}></span>
              Needs Attention
            </div>
            <div style={{ fontSize: "1.45rem", fontWeight: "800", color: "#b91c1c", marginTop: "2px" }}>
              {summary.needsAttentionCount || 0}
            </div>
          </div>

          <div style={{ background: "#ffffff", padding: "16px 20px" }}>
            <div style={{ fontSize: "0.75rem", color: "#15803d", fontWeight: "600", textTransform: "uppercase", display: "flex", alignItems: "center", gap: "6px" }}>
              <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#22c55e" }}></span>
              Fully Automated
            </div>
            <div style={{ fontSize: "1.45rem", fontWeight: "800", color: "#15803d", marginTop: "2px" }}>
              {summary.fullyConfiguredCount || 0}
            </div>
          </div>

          <div style={{ background: "#ffffff", padding: "16px 20px" }}>
            <div style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: "600", textTransform: "uppercase" }}>
              Unrouted Categories
            </div>
            <div style={{ fontSize: "1.45rem", fontWeight: "800", color: "#0f172a", marginTop: "2px" }}>
              {summary.totalUnroutedIssues || 0}
            </div>
          </div>
        </div>

        {/* Toolbar: Filters, Search, Expand/Collapse Toggle */}
        <div
          style={{
            padding: "14px 20px",
            background: "#fafbfc",
            borderBottom: "1px solid #e2e8f0",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "12px"
          }}
        >
          {/* Filter Pills */}
          <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
            <button
              onClick={() => setFilterMode("needs_attention")}
              style={{
                padding: "6px 12px",
                borderRadius: "6px",
                fontSize: "0.82rem",
                fontWeight: "600",
                cursor: "pointer",
                border: "1px solid",
                borderColor: filterMode === "needs_attention" ? "#b91c1c" : "#cbd5e1",
                background: filterMode === "needs_attention" ? "#fef2f2" : "#ffffff",
                color: filterMode === "needs_attention" ? "#991b1b" : "#475569"
              }}
            >
              Needs Attention ({summary.needsAttentionCount || 0})
            </button>

            <button
              onClick={() => setFilterMode("all")}
              style={{
                padding: "6px 12px",
                borderRadius: "6px",
                fontSize: "0.82rem",
                fontWeight: "600",
                cursor: "pointer",
                border: "1px solid",
                borderColor: filterMode === "all" ? "#0f172a" : "#cbd5e1",
                background: filterMode === "all" ? "#0f172a" : "#ffffff",
                color: filterMode === "all" ? "#ffffff" : "#475569"
              }}
            >
              All ({summary.totalDepartments || 0})
            </button>

            <button
              onClick={() => setFilterMode("configured")}
              style={{
                padding: "6px 12px",
                borderRadius: "6px",
                fontSize: "0.82rem",
                fontWeight: "600",
                cursor: "pointer",
                border: "1px solid",
                borderColor: filterMode === "configured" ? "#15803d" : "#cbd5e1",
                background: filterMode === "configured" ? "#f0fdf4" : "#ffffff",
                color: filterMode === "configured" ? "#15803d" : "#475569"
              }}
            >
              Configured ({summary.fullyConfiguredCount || 0})
            </button>
          </div>

          {/* Right Controls: Search & Expand/Collapse All */}
          <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap", flex: "1 1 auto", justifyContent: "flex-end" }}>
            <div style={{ minWidth: "200px", maxWidth: "280px", width: "100%" }}>
              <input
                type="text"
                placeholder="Search department or admin..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: "100%",
                  padding: "7px 12px",
                  borderRadius: "6px",
                  border: "1px solid #cbd5e1",
                  fontSize: "0.82rem",
                  outline: "none",
                  color: "#0f172a",
                  boxSizing: "border-box",
                  background: "#ffffff"
                }}
              />
            </div>

            <div style={{ display: "flex", gap: "6px" }}>
              <button
                onClick={handleExpandAll}
                style={{
                  background: "#ffffff",
                  border: "1px solid #cbd5e1",
                  color: "#475569",
                  padding: "6px 10px",
                  borderRadius: "6px",
                  fontSize: "0.78rem",
                  fontWeight: "600",
                  cursor: "pointer"
                }}
                title="Expand all department issue lists"
              >
                Expand All
              </button>
              <button
                onClick={handleCollapseAll}
                style={{
                  background: "#ffffff",
                  border: "1px solid #cbd5e1",
                  color: "#475569",
                  padding: "6px 10px",
                  borderRadius: "6px",
                  fontSize: "0.78rem",
                  fontWeight: "600",
                  cursor: "pointer"
                }}
                title="Collapse all department issue lists"
              >
                Collapse All
              </button>
            </div>
          </div>
        </div>

        {/* Compact Department Accordion Rows */}
        {filteredDepartments.length === 0 ? (
          <div style={{ padding: "48px 20px", textAlign: "center", color: "#64748b" }}>
            <CheckCircleIcon width="32" height="32" style={{ color: "#16a34a", margin: "0 auto" }} />
            <h4 style={{ margin: "12px 0 4px", color: "#0f172a", fontSize: "1rem" }}>
              No departments found for this filter
            </h4>
            <p style={{ margin: 0, fontSize: "0.85rem" }}>
              {filterMode === "needs_attention"
                ? "All departments have active automated routing rules configured."
                : "Try adjusting your search query."}
            </p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column" }}>
            {filteredDepartments.map((dept, idx) => {
              const isDeficient = dept.needsAttention;
              const isFullyConfigured = dept.totalIssues > 0 && dept.unroutedCount === 0;
              const isExpanded = !!expandedDepartments[dept.department];
              const primaryAdmin = dept.admins && dept.admins.length > 0 ? dept.admins[0] : null;

              return (
                <div
                  key={dept.department}
                  style={{
                    borderBottom: "1px solid #f1f5f9",
                    background: isExpanded ? "#fafbfc" : "#ffffff",
                    transition: "background 0.15s ease"
                  }}
                >
                  {/* Collapsed Compact Row Header */}
                  <div
                    style={{
                      padding: "12px 20px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      flexWrap: "wrap",
                      gap: "12px",
                      cursor: "pointer"
                    }}
                    onClick={() => toggleExpand(dept.department)}
                  >
                    {/* Left: Number, Department Name & Admin */}
                    <div style={{ display: "flex", alignItems: "center", gap: "12px", minWidth: "260px", flex: "1 1 300px" }}>
                      <span
                        style={{
                          fontSize: "0.75rem",
                          fontWeight: "700",
                          color: "#94a3b8",
                          width: "22px",
                          textAlign: "right"
                        }}
                      >
                        {idx + 1}.
                      </span>

                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                          <span style={{ fontWeight: "700", color: "#0f172a", fontSize: "0.92rem" }}>
                            {dept.department}
                          </span>
                          {dept.code && (
                            <span
                              style={{
                                fontSize: "0.7rem",
                                background: "#f1f5f9",
                                color: "#475569",
                                padding: "1px 6px",
                                borderRadius: "4px",
                                fontWeight: "600"
                              }}
                            >
                              {dept.code}
                            </span>
                          )}
                        </div>

                        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginTop: "3px", fontSize: "0.78rem", color: "#64748b", flexWrap: "wrap" }}>
                          <span>
                            Admin:{" "}
                            <strong style={{ color: primaryAdmin ? "#334155" : "#b91c1c" }}>
                              {primaryAdmin ? primaryAdmin.fullName : "Not Assigned"}
                            </strong>
                            {primaryAdmin && <span style={{ color: "#94a3b8" }}> ({primaryAdmin.email})</span>}
                          </span>

                          <span style={{ color: "#cbd5e1" }}>•</span>

                          <span>
                            Reminded:{" "}
                            <span style={{ color: dept.lastRoutingReminderAt ? "#0284c7" : "#94a3b8", fontWeight: "600" }}>
                              {formatReminderTime(dept.lastRoutingReminderAt)}
                            </span>
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Right: Status Pill & Action Buttons */}
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                        flexWrap: "wrap"
                      }}
                      onClick={(e) => e.stopPropagation()} // Prevent row click when interacting with buttons
                    >
                      {/* Deficiency Badge */}
                      <span
                        style={{
                          fontSize: "0.75rem",
                          fontWeight: "700",
                          padding: "4px 9px",
                          borderRadius: "999px",
                          background: isDeficient ? "#fef2f2" : isFullyConfigured ? "#f0fdf4" : "#f8fafc",
                          color: isDeficient ? "#991b1b" : isFullyConfigured ? "#15803d" : "#64748b",
                          border: `1px solid ${isDeficient ? "#fecaca" : isFullyConfigured ? "#bbf7d0" : "#e2e8f0"}`
                        }}
                      >
                        {isDeficient
                          ? `${dept.unroutedCount} of ${dept.totalIssues} unrouted (${dept.coveragePercent}%)`
                          : isFullyConfigured
                          ? `100% routed (${dept.routedCount})`
                          : "0 categories"}
                      </span>

                      {/* Expand / Collapse Dropdown Button */}
                      {dept.totalIssues > 0 && (
                        <button
                          onClick={() => toggleExpand(dept.department)}
                          style={{
                            background: isExpanded ? "#f1f5f9" : "#ffffff",
                            border: "1px solid #cbd5e1",
                            color: "#334155",
                            padding: "6px 11px",
                            borderRadius: "6px",
                            fontSize: "0.78rem",
                            fontWeight: "600",
                            cursor: "pointer",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "5px"
                          }}
                        >
                          <span>{isExpanded ? "Hide Categories" : `View ${dept.unroutedCount || dept.totalIssues}`}</span>
                          <ChevronDown
                            style={{
                              transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)",
                              transition: "transform 0.2s ease"
                            }}
                          />
                        </button>
                      )}

                      {/* Remind Admin Action Button */}
                      {isDeficient ? (
                        <button
                          onClick={() => handleOpenReminderModal(dept)}
                          disabled={!primaryAdmin}
                          style={{
                            background: primaryAdmin ? "#0f172a" : "#cbd5e1",
                            color: "#ffffff",
                            border: "none",
                            padding: "6px 13px",
                            borderRadius: "6px",
                            fontSize: "0.78rem",
                            fontWeight: "600",
                            cursor: primaryAdmin ? "pointer" : "not-allowed",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "5px"
                          }}
                          title={primaryAdmin ? "Send email reminder to department admin" : "No admin assigned to this department"}
                        >
                          <MailIcon width="13" height="13" />
                          <span>Remind</span>
                        </button>
                      ) : isFullyConfigured ? (
                        <span style={{ fontSize: "0.78rem", color: "#15803d", fontWeight: "600", display: "inline-flex", alignItems: "center", gap: "4px" }}>
                          <CheckCircleIcon width="13" height="13" />
                          <span>Automated</span>
                        </span>
                      ) : null}
                    </div>
                  </div>

                  {/* Expandable Dropdown Drawer for Unrouted & Configured Categories */}
                  {isExpanded && (
                    <div
                      style={{
                        padding: "14px 20px 18px 54px",
                        background: "#fafbfc",
                        borderTop: "1px dashed #e2e8f0"
                      }}
                    >
                      {/* Unrouted Section */}
                      {dept.unroutedIssues && dept.unroutedIssues.length > 0 && (
                        <div>
                          <div style={{ fontSize: "0.75rem", fontWeight: "700", color: "#991b1b", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "8px" }}>
                            Unrouted Categories Requiring Staff Assignment ({dept.unroutedIssues.length})
                          </div>

                          {/* Compact Category Chips Grid */}
                          <div
                            style={{
                              display: "grid",
                              gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
                              gap: "8px"
                            }}
                          >
                            {dept.unroutedIssues.map((issue) => (
                              <div
                                key={issue.issueId}
                                style={{
                                  background: "#ffffff",
                                  border: "1px solid #fecaca",
                                  borderLeft: "3px solid #ef4444",
                                  borderRadius: "6px",
                                  padding: "7px 10px",
                                  fontSize: "0.8rem"
                                }}
                              >
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "6px" }}>
                                  <strong style={{ color: "#0f172a", fontSize: "0.82rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                    {issue.issueName}
                                  </strong>
                                  <span
                                    style={{
                                      fontSize: "0.68rem",
                                      padding: "1px 5px",
                                      borderRadius: "4px",
                                      fontWeight: "600",
                                      background: issue.targetAudience === "staff" ? "#f1f5f9" : "#e0f2fe",
                                      color: issue.targetAudience === "staff" ? "#475569" : "#0369a1"
                                    }}
                                  >
                                    {issue.targetAudience === "staff" ? "Staff" : "Student"}
                                  </span>
                                </div>
                                {issue.description && (
                                  <div style={{ color: "#64748b", fontSize: "0.72rem", marginTop: "2px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                    {issue.description}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Configured Section (if any) */}
                      {dept.routedIssues && dept.routedIssues.length > 0 && (
                        <div style={{ marginTop: dept.unroutedIssues.length > 0 ? "14px" : "0" }}>
                          <div style={{ fontSize: "0.75rem", fontWeight: "700", color: "#15803d", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "6px" }}>
                            Configured Routing Rules ({dept.routedIssues.length})
                          </div>
                          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                            {dept.routedIssues.map((r) => (
                              <span
                                key={r.issueId}
                                style={{
                                  background: "#ffffff",
                                  border: "1px solid #bbf7d0",
                                  color: "#166534",
                                  padding: "3px 8px",
                                  borderRadius: "5px",
                                  fontSize: "0.75rem",
                                  fontWeight: "500"
                                }}
                              >
                                {r.issueName} <span style={{ color: "#94a3b8", fontSize: "0.7rem" }}>({r.assignmentMode})</span>
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Universal Broadcast Modal */}
      {showBroadcastModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(15, 23, 42, 0.55)",
            backdropFilter: "blur(2px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            padding: "16px"
          }}
          onClick={() => setShowBroadcastModal(false)}
        >
          <div
            style={{
              background: "#ffffff",
              borderRadius: "12px",
              maxWidth: "520px",
              width: "100%",
              boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.2)",
              overflow: "hidden",
              border: "1px solid #e2e8f0"
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: "18px 22px",
                borderBottom: "1px solid #f1f5f9",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start"
              }}
            >
              <div>
                <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: "700", color: "#0f172a" }}>
                  Broadcast Reminders to All Departments
                </h3>
                <p style={{ margin: "4px 0 0", color: "#64748b", fontSize: "0.82rem" }}>
                  Notify all department admins whose categories currently lack routing rules.
                </p>
              </div>
              <button
                onClick={() => setShowBroadcastModal(false)}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "#94a3b8",
                  fontSize: "1.3rem",
                  cursor: "pointer",
                  lineHeight: 1
                }}
              >
                &times;
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSendBroadcast} style={{ padding: "20px 22px" }}>
              <div
                style={{
                  background: "#f8fafc",
                  border: "1px solid #e2e8f0",
                  borderRadius: "8px",
                  padding: "12px 14px",
                  fontSize: "0.85rem",
                  color: "#334155",
                  marginBottom: "16px"
                }}
              >
                <strong>Summary of Recipients:</strong>
                <div style={{ marginTop: "4px", color: "#64748b" }}>
                  • <strong>{departmentsNeedingReminderCount}</strong> department administrators will receive an automated email listing their specific unrouted categories.
                </div>
              </div>

              <div style={{ marginBottom: "18px" }}>
                <label style={{ display: "block", fontSize: "0.82rem", fontWeight: "700", color: "#334155", marginBottom: "6px" }}>
                  Optional Note from Super Administrator
                </label>
                <textarea
                  rows="3"
                  placeholder="e.g. Please configure your staff assignments before the start of the week..."
                  value={broadcastNote}
                  onChange={(e) => setBroadcastNote(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "9px 12px",
                    borderRadius: "6px",
                    border: "1px solid #cbd5e1",
                    fontSize: "0.82rem",
                    outline: "none",
                    boxSizing: "border-box",
                    fontFamily: "inherit"
                  }}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px" }}>
                <button
                  type="button"
                  onClick={() => setShowBroadcastModal(false)}
                  disabled={sendingBroadcast}
                  style={{
                    padding: "8px 16px",
                    borderRadius: "6px",
                    border: "1px solid #cbd5e1",
                    background: "#ffffff",
                    color: "#475569",
                    fontSize: "0.82rem",
                    fontWeight: "600",
                    cursor: "pointer"
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={sendingBroadcast}
                  style={{
                    padding: "8px 18px",
                    borderRadius: "6px",
                    border: "none",
                    background: "#0f172a",
                    color: "#ffffff",
                    fontSize: "0.82rem",
                    fontWeight: "600",
                    cursor: sendingBroadcast ? "not-allowed" : "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px"
                  }}
                >
                  {sendingBroadcast ? (
                    <>
                      <SpinnerIcon size={14} />
                      <span>Sending Broadcast...</span>
                    </>
                  ) : (
                    <>
                      <SendIcon width="13" height="13" />
                      <span>Send to All ({departmentsNeedingReminderCount})</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Single Department Reminder Modal */}
      {selectedDeptForReminder && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(15, 23, 42, 0.55)",
            backdropFilter: "blur(2px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            padding: "16px"
          }}
          onClick={handleCloseReminderModal}
        >
          <div
            style={{
              background: "#ffffff",
              borderRadius: "12px",
              maxWidth: "500px",
              width: "100%",
              boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.2)",
              overflow: "hidden",
              border: "1px solid #e2e8f0"
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                padding: "16px 20px",
                borderBottom: "1px solid #f1f5f9",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start"
              }}
            >
              <div>
                <h3 style={{ margin: 0, fontSize: "1.05rem", fontWeight: "700", color: "#0f172a" }}>
                  Send Routing Reminder
                </h3>
                <div style={{ fontSize: "0.8rem", color: "#64748b", marginTop: "2px" }}>
                  Department: <strong>{selectedDeptForReminder.department}</strong>
                </div>
              </div>
              <button
                onClick={handleCloseReminderModal}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "#94a3b8",
                  fontSize: "1.3rem",
                  cursor: "pointer",
                  lineHeight: 1
                }}
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSendReminder} style={{ padding: "18px 20px" }}>
              <div style={{ marginBottom: "14px" }}>
                <label style={{ display: "block", fontSize: "0.8rem", fontWeight: "700", color: "#334155", marginBottom: "5px" }}>
                  Recipient (Admin Email) *
                </label>
                {selectedDeptForReminder.admins && selectedDeptForReminder.admins.length > 1 ? (
                  <select
                    value={selectedRecipient}
                    onChange={(e) => setSelectedRecipient(e.target.value)}
                    required
                    style={{
                      width: "100%",
                      padding: "8px 10px",
                      borderRadius: "6px",
                      border: "1px solid #cbd5e1",
                      fontSize: "0.82rem",
                      color: "#0f172a",
                      outline: "none"
                    }}
                  >
                    {selectedDeptForReminder.admins.map((a) => (
                      <option key={a.id || a.email} value={a.email}>
                        {a.fullName} ({a.email})
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="email"
                    value={selectedRecipient}
                    onChange={(e) => setSelectedRecipient(e.target.value)}
                    required
                    style={{
                      width: "100%",
                      padding: "8px 10px",
                      borderRadius: "6px",
                      border: "1px solid #cbd5e1",
                      fontSize: "0.82rem",
                      color: "#0f172a",
                      outline: "none",
                      boxSizing: "border-box"
                    }}
                  />
                )}
              </div>

              {/* Pre-filled Issues Preview */}
              <div
                style={{
                  background: "#f8fafc",
                  border: "1px solid #e2e8f0",
                  borderRadius: "6px",
                  padding: "10px 12px",
                  marginBottom: "14px"
                }}
              >
                <div style={{ fontSize: "0.72rem", fontWeight: "700", color: "#475569", textTransform: "uppercase", marginBottom: "4px" }}>
                  Missing Categories ({selectedDeptForReminder.unroutedIssues.length}):
                </div>
                <div style={{ maxHeight: "100px", overflowY: "auto" }}>
                  <ul style={{ margin: 0, paddingLeft: "16px", fontSize: "0.8rem", color: "#334155" }}>
                    {selectedDeptForReminder.unroutedIssues.map((i) => (
                      <li key={i.issueId} style={{ marginBottom: "2px" }}>
                        <strong>{i.issueName}</strong>{" "}
                        <span style={{ fontSize: "0.7rem", color: "#64748b" }}>
                          ({i.targetAudience === "staff" ? "Staff" : "Student"})
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Custom Note */}
              <div style={{ marginBottom: "16px" }}>
                <label style={{ display: "block", fontSize: "0.8rem", fontWeight: "700", color: "#334155", marginBottom: "5px" }}>
                  Custom Note (Optional)
                </label>
                <textarea
                  rows="2"
                  placeholder="Optional note to include in email..."
                  value={customNote}
                  onChange={(e) => setCustomNote(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "8px 10px",
                    borderRadius: "6px",
                    border: "1px solid #cbd5e1",
                    fontSize: "0.82rem",
                    color: "#0f172a",
                    outline: "none",
                    boxSizing: "border-box",
                    fontFamily: "inherit"
                  }}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px" }}>
                <button
                  type="button"
                  onClick={handleCloseReminderModal}
                  disabled={sendingEmail}
                  style={{
                    padding: "7px 14px",
                    borderRadius: "6px",
                    border: "1px solid #cbd5e1",
                    background: "#ffffff",
                    color: "#475569",
                    fontSize: "0.82rem",
                    fontWeight: "600",
                    cursor: "pointer"
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={sendingEmail || !selectedRecipient}
                  style={{
                    padding: "7px 16px",
                    borderRadius: "6px",
                    border: "none",
                    background: "#0f172a",
                    color: "#ffffff",
                    fontSize: "0.82rem",
                    fontWeight: "600",
                    cursor: sendingEmail ? "not-allowed" : "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px"
                  }}
                >
                  {sendingEmail ? (
                    <>
                      <SpinnerIcon size={14} />
                      <span>Sending...</span>
                    </>
                  ) : (
                    <>
                      <SendIcon width="13" height="13" />
                      <span>Send Reminder</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default RoutingAuditPanel;
