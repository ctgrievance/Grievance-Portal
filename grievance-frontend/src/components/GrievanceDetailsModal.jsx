import React, { useState } from "react";
import {
  XIcon,
  TrashIcon,
  ClockIcon,
  UserIcon,
  MailIcon,
  PhoneIcon,
  GraduationCapIcon,
  BookIcon,
  ShieldIcon,
  PaperclipIcon,
  CheckCircleIcon,
  AlertCircleIcon,
  FileIcon
} from "./Icons";

// Helper: Format date with time
const formatDateTime = (dateString) => {
  if (!dateString) return "N/A";
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return "N/A";
    return d.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "N/A";
  }
};

// Helper: Format date only (no time)
const formatDateOnly = (dateString) => {
  if (!dateString) return "N/A";
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return "N/A";
    return d.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return "N/A";
  }
};

// Helper: Format duration in human-readable words
const formatDuration = (ms) => {
  if (!ms || ms <= 0) return "< 1 min";
  const totalMins = Math.floor(ms / (1000 * 60));
  const days = Math.floor(totalMins / (60 * 24));
  const hours = Math.floor((totalMins % (60 * 24)) / 60);
  const mins = totalMins % 60;

  const parts = [];
  if (days > 0) parts.push(`${days} day${days > 1 ? "s" : ""}`);
  if (hours > 0) parts.push(`${hours} hr${hours > 1 ? "s" : ""}`);
  if (mins > 0 || parts.length === 0) parts.push(`${mins} min${mins !== 1 ? "s" : ""}`);

  return parts.join(" ");
};

// Helper: Get Deadline Status
const getDeadlineStatus = (deadlineDateStr, status) => {
  if (!deadlineDateStr) return { label: "No Deadline Set", color: "#64748b", isOverdue: false };
  if (status === "Resolved" || status === "Rejected") {
    return { label: formatDateOnly(deadlineDateStr), color: "#64748b", isOverdue: false };
  }
  const now = new Date();
  const deadline = new Date(deadlineDateStr);
  const diffMs = deadline - now;
  const hoursLeft = diffMs / (1000 * 60 * 60);

  if (hoursLeft < 0) {
    const overdueDays = Math.max(1, Math.ceil(Math.abs(hoursLeft) / 24));
    return {
      label: `${formatDateOnly(deadlineDateStr)} (Overdue by ${overdueDays}d)`,
      color: "#dc2626",
      isOverdue: true,
      badge: "OVERDUE",
    };
  }
  if (hoursLeft < 24) {
    return {
      label: `${formatDateOnly(deadlineDateStr)} (Due Today)`,
      color: "#d97706",
      isOverdue: false,
      badge: "DUE SOON",
    };
  }
  return {
    label: `${formatDateOnly(deadlineDateStr)} (On Track)`,
    color: "#16a34a",
    isOverdue: false,
  };
};

// Component: GrievanceDetailsModal
const GrievanceDetailsModal = ({
  grievance,
  staffMap = {},
  onClose,
  onDelete,
  onResolveExtension,
  onRequestExtension,
}) => {
  const [copied, setCopied] = useState(false);

  if (!grievance) return null;

  const apiUrl = process.env.REACT_APP_API_URL || "http://localhost:5000";

  // Calculate resolution time or open duration
  const isResolved = grievance.status === "Resolved";
  const isRejected = grievance.status === "Rejected";
  const createdAt = grievance.createdAt ? new Date(grievance.createdAt) : null;
  const resolvedAt = grievance.resolutionProposedAt
    ? new Date(grievance.resolutionProposedAt)
    : isResolved && grievance.updatedAt
    ? new Date(grievance.updatedAt)
    : null;

  let timeTakenText = null;
  let openDurationText = null;

  if (isResolved && createdAt && resolvedAt) {
    const diff = resolvedAt.getTime() - createdAt.getTime();
    timeTakenText = formatDuration(diff);
  } else if (!isResolved && !isRejected && createdAt) {
    const diff = Date.now() - createdAt.getTime();
    openDurationText = formatDuration(diff);
  }

  // Deadline calculation
  const deadlineInfo = getDeadlineStatus(
    grievance.deadlineDate || grievance.deadline,
    grievance.status
  );

  // Copy ID handler
  const handleCopyId = () => {
    navigator.clipboard?.writeText(grievance._id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Staff mapping helper
  const getStaffDisplayName = (sId) => {
    if (!sId) return null;
    const name = staffMap[sId];
    return name ? `${name} (${sId})` : sId;
  };

  // Issue Type display
  const issueTypeName =
    grievance.issueTypeId?.issueName ||
    (typeof grievance.issueTypeId === "string" ? grievance.issueTypeId : null);
  const issueTypeDesc = grievance.issueTypeId?.description || null;

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        backgroundColor: "rgba(15, 23, 42, 0.65)",
        backdropFilter: "blur(4px)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        zIndex: 1100,
        padding: "16px",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#ffffff",
          borderRadius: "16px",
          width: "100%",
          maxWidth: "760px",
          maxHeight: "90vh",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
          overflow: "hidden",
          border: "1px solid #e2e8f0",
          animation: "modalFadeIn 0.25s ease-out",
        }}
      >
        {/* ================= HEADER ================= */}
        <div
          style={{
            padding: "20px 24px",
            borderBottom: "1px solid #f1f5f9",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            background: "#ffffff",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
            <h2 style={{ margin: 0, fontSize: "1.3rem", fontWeight: "700", color: "#0f172a" }}>
              Grievance Details
            </h2>

            {/* Grievance ID with 1-click copy */}
            <button
              onClick={handleCopyId}
              title="Click to copy ID"
              style={{
                background: "#f1f5f9",
                border: "1px solid #e2e8f0",
                borderRadius: "6px",
                padding: "3px 8px",
                fontSize: "0.75rem",
                fontFamily: "monospace",
                color: "#475569",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
                transition: "all 0.2s",
              }}
            >
              #{grievance._id}
              <span style={{ fontSize: "0.7rem", color: copied ? "#16a34a" : "#94a3b8" }}>
                {copied ? "✓ Copied" : "📋"}
              </span>
            </button>

            {/* Status Pill */}
            <span
              className={`status-badge status-${(grievance.status || "").toLowerCase().replace(" ", "")}`}
              style={{ fontSize: "0.8rem", padding: "4px 10px", fontWeight: "700" }}
            >
              {grievance.status}
            </span>
          </div>

          <button
            onClick={onClose}
            aria-label="Close modal"
            style={{
              background: "#f8fafc",
              border: "1px solid #e2e8f0",
              borderRadius: "50%",
              width: "36px",
              height: "36px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              color: "#64748b",
              transition: "all 0.2s",
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.background = "#fee2e2";
              e.currentTarget.style.color = "#dc2626";
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.background = "#f8fafc";
              e.currentTarget.style.color = "#64748b";
            }}
          >
            <XIcon width="18" height="18" />
          </button>
        </div>

        {/* ================= SCROLLABLE BODY ================= */}
        <div
          style={{
            padding: "24px",
            overflowY: "auto",
            display: "flex",
            flexDirection: "column",
            gap: "20px",
          }}
        >
          {/* ⚡ HERO RESOLUTION & TIME METRICS BANNER */}
          {isResolved ? (
            <div
              style={{
                background: "linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)",
                border: "1px solid #86efac",
                borderRadius: "12px",
                padding: "16px 20px",
                display: "flex",
                flexWrap: "wrap",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "16px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <div
                  style={{
                    background: "#22c55e",
                    color: "white",
                    borderRadius: "50%",
                    width: "40px",
                    height: "40px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "1.2rem",
                    boxShadow: "0 4px 10px rgba(34, 197, 94, 0.3)",
                  }}
                >
                  ⚡
                </div>
                <div>
                  <div style={{ fontSize: "0.78rem", fontWeight: "700", textTransform: "uppercase", color: "#15803d", letterSpacing: "0.5px" }}>
                    Resolution Time Metric
                  </div>
                  <div style={{ fontSize: "1.25rem", fontWeight: "800", color: "#14532d" }}>
                    Solved in {timeTakenText || "Quick Turnaround"}
                  </div>
                  {grievance.autoClosed && (
                    <div style={{ fontSize: "0.75rem", color: "#166534", marginTop: "2px" }}>
                      ✓ Auto-closed upon completion of student verification window
                    </div>
                  )}
                </div>
              </div>

              <div style={{ display: "flex", gap: "20px", fontSize: "0.82rem", color: "#166534" }}>
                <div>
                  <strong style={{ display: "block", color: "#14532d" }}>Submitted:</strong>
                  {formatDateTime(grievance.createdAt)}
                </div>
                <div>
                  <strong style={{ display: "block", color: "#14532d" }}>Resolved:</strong>
                  {formatDateTime(resolvedAt || grievance.updatedAt)}
                </div>
              </div>
            </div>
          ) : !isRejected ? (
            <div
              style={{
                background: "linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)",
                border: "1px solid #cbd5e1",
                borderRadius: "12px",
                padding: "16px 20px",
                display: "flex",
                flexWrap: "wrap",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "16px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <div
                  style={{
                    background: "#0284c7",
                    color: "white",
                    borderRadius: "50%",
                    width: "40px",
                    height: "40px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "1.1rem",
                  }}
                >
                  <ClockIcon width="20" height="20" />
                </div>
                <div>
                  <div style={{ fontSize: "0.78rem", fontWeight: "700", textTransform: "uppercase", color: "#0369a1", letterSpacing: "0.5px" }}>
                    Active Grievance Age
                  </div>
                  <div style={{ fontSize: "1.2rem", fontWeight: "800", color: "#0f172a" }}>
                    Open for {openDurationText || "Just submitted"}
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: "600" }}>
                    Target Deadline:
                  </div>
                  <div style={{ fontSize: "0.9rem", fontWeight: "700", color: deadlineInfo.color }}>
                    {deadlineInfo.label}
                  </div>
                </div>
                {deadlineInfo.badge && (
                  <span
                    style={{
                      fontSize: "0.7rem",
                      padding: "3px 8px",
                      borderRadius: "4px",
                      fontWeight: "700",
                      background: deadlineInfo.isOverdue ? "#fef2f2" : "#fffbeb",
                      color: deadlineInfo.color,
                      border: `1px solid ${deadlineInfo.color}40`,
                    }}
                  >
                    {deadlineInfo.badge}
                  </span>
                )}
              </div>
            </div>
          ) : (
            <div
              style={{
                background: "#fef2f2",
                border: "1px solid #fecaca",
                borderRadius: "12px",
                padding: "14px 20px",
                color: "#dc2626",
                display: "flex",
                alignItems: "center",
                gap: "10px",
              }}
            >
              <AlertCircleIcon width="20" height="20" />
              <span style={{ fontWeight: "700" }}>This grievance was rejected.</span>
            </div>
          )}

          {/* 👤 SECTION 1: STUDENT COMPLETE PROFILE */}
          <div
            style={{
              background: "#ffffff",
              border: "1px solid #e2e8f0",
              borderRadius: "12px",
              padding: "18px 20px",
              boxShadow: "0 1px 3px rgba(0,0,0,0.02)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                marginBottom: "14px",
                borderBottom: "1px solid #f1f5f9",
                paddingBottom: "8px",
              }}
            >
              <UserIcon width="18" height="18" style={{ color: "#3b82f6" }} />
              <h4 style={{ margin: 0, fontSize: "0.95rem", color: "#1e293b", fontWeight: "700" }}>
                Student / Submitter Information
              </h4>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                gap: "14px 20px",
                fontSize: "0.88rem",
              }}
            >
              <div>
                <span style={{ color: "#64748b", display: "block", fontSize: "0.78rem" }}>Student Name</span>
                <strong style={{ color: "#0f172a", fontSize: "0.95rem" }}>
                  {grievance.name || "N/A"}
                </strong>
              </div>

              <div>
                <span style={{ color: "#64748b", display: "block", fontSize: "0.78rem" }}>Student ID / Roll No</span>
                <span style={{ color: "#0f172a", fontWeight: "600", fontFamily: "monospace", fontSize: "0.9rem" }}>
                  {grievance.userId || "N/A"}
                </span>
              </div>

              <div>
                <span style={{ color: "#64748b", display: "block", fontSize: "0.78rem" }}>Registration ID</span>
                <span style={{ color: "#0f172a", fontWeight: "600" }}>
                  {grievance.regid || "—"}
                </span>
              </div>

              <div>
                <span style={{ color: "#64748b", display: "block", fontSize: "0.78rem" }}>Academic Program / Course</span>
                <span
                  style={{
                    color: "#1e40af",
                    fontWeight: "600",
                    background: "#eff6ff",
                    padding: "2px 8px",
                    borderRadius: "6px",
                    display: "inline-block",
                    fontSize: "0.82rem",
                  }}
                >
                  <GraduationCapIcon width="13" height="13" style={{ verticalAlign: "-2px", marginRight: "4px" }} />
                  {grievance.studentProgram || "Not Specified"}
                </span>
              </div>

              <div>
                <span style={{ color: "#64748b", display: "block", fontSize: "0.78rem" }}>Email Address</span>
                {grievance.email ? (
                  <a
                    href={`mailto:${grievance.email}`}
                    style={{ color: "#2563eb", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "4px" }}
                  >
                    <MailIcon width="13" height="13" />
                    {grievance.email}
                  </a>
                ) : (
                  <span style={{ color: "#94a3b8" }}>—</span>
                )}
              </div>

              <div>
                <span style={{ color: "#64748b", display: "block", fontSize: "0.78rem" }}>Phone Number</span>
                {grievance.phone ? (
                  <a
                    href={`tel:${grievance.phone}`}
                    style={{ color: "#0f172a", fontWeight: "600", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "4px" }}
                  >
                    <PhoneIcon width="13" height="13" style={{ color: "#16a34a" }} />
                    {grievance.phone}
                  </a>
                ) : (
                  <span style={{ color: "#94a3b8" }}>—</span>
                )}
              </div>
            </div>
          </div>

          {/* 📂 SECTION 2: CATEGORY & ASSIGNMENT DETAILS */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
              gap: "16px",
            }}
          >
            {/* Card A: Category & Routing */}
            <div
              style={{
                background: "#ffffff",
                border: "1px solid #e2e8f0",
                borderRadius: "12px",
                padding: "16px 18px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  marginBottom: "12px",
                  borderBottom: "1px solid #f1f5f9",
                  paddingBottom: "8px",
                }}
              >
                <BookIcon width="17" height="17" style={{ color: "#8b5cf6" }} />
                <h4 style={{ margin: 0, fontSize: "0.92rem", color: "#1e293b", fontWeight: "700" }}>
                  Category & Classification
                </h4>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "10px", fontSize: "0.85rem" }}>
                <div>
                  <span style={{ color: "#64748b", fontSize: "0.78rem", display: "block" }}>Department / Category</span>
                  <strong style={{ color: "#0f172a", fontSize: "0.92rem" }}>
                    {grievance.category || grievance.school || "N/A"}
                  </strong>
                </div>

                {issueTypeName && (
                  <div>
                    <span style={{ color: "#64748b", fontSize: "0.78rem", display: "block" }}>Specific Issue Topic</span>
                    <span style={{ color: "#4338ca", fontWeight: "600" }}>{issueTypeName}</span>
                    {issueTypeDesc && (
                      <span style={{ display: "block", fontSize: "0.78rem", color: "#64748b" }}>{issueTypeDesc}</span>
                    )}
                  </div>
                )}

                <div style={{ display: "flex", justifyContent: "space-between", gap: "10px" }}>
                  <div>
                    <span style={{ color: "#64748b", fontSize: "0.78rem", display: "block" }}>Routing Mode</span>
                    <span style={{ textTransform: "capitalize", color: "#334155", fontWeight: "600" }}>
                      {(grievance.assignmentMode || "Manual").replace("_", " ")}
                    </span>
                  </div>
                  <div>
                    <span style={{ color: "#64748b", fontSize: "0.78rem", display: "block" }}>Creation Date</span>
                    <span style={{ color: "#334155", fontWeight: "600" }}>
                      {formatDateTime(grievance.createdAt)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Card B: Staff Assignment Details */}
            <div
              style={{
                background: "#ffffff",
                border: "1px solid #e2e8f0",
                borderRadius: "12px",
                padding: "16px 18px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  marginBottom: "12px",
                  borderBottom: "1px solid #f1f5f9",
                  paddingBottom: "8px",
                }}
              >
                <ShieldIcon width="17" height="17" style={{ color: "#f59e0b" }} />
                <h4 style={{ margin: 0, fontSize: "0.92rem", color: "#1e293b", fontWeight: "700" }}>
                  Assignment & Tracking
                </h4>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "10px", fontSize: "0.85rem" }}>
                <div>
                  <span style={{ color: "#64748b", fontSize: "0.78rem", display: "block" }}>Assigned Staff Member</span>
                  {grievance.assignedTo ? (
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <strong style={{ color: "#0f172a" }}>
                        {getStaffDisplayName(grievance.assignedTo)}
                      </strong>
                      {grievance.assignedRole && (
                        <span style={{ fontSize: "0.7rem", padding: "1px 6px", background: "#f1f5f9", borderRadius: "4px", color: "#475569" }}>
                          {grievance.assignedRole}
                        </span>
                      )}
                    </div>
                  ) : (
                    <span style={{ color: "#94a3b8", fontStyle: "italic" }}>Not Assigned Yet</span>
                  )}
                </div>

                {grievance.assignedBy && (
                  <div>
                    <span style={{ color: "#64748b", fontSize: "0.78rem", display: "block" }}>Assigned By (Admin)</span>
                    <span style={{ color: "#334155", fontWeight: "600" }}>
                      {getStaffDisplayName(grievance.assignedBy)}
                    </span>
                  </div>
                )}

                <div style={{ display: "flex", justifyContent: "space-between", gap: "10px" }}>
                  <div>
                    <span style={{ color: "#64748b", fontSize: "0.78rem", display: "block" }}>Assigned Deadline</span>
                    <span style={{ fontWeight: "700", color: deadlineInfo.color }}>
                      {formatDateOnly(grievance.deadlineDate || grievance.deadline)}
                    </span>
                  </div>
                  <div>
                    <span style={{ color: "#64748b", fontSize: "0.78rem", display: "block" }}>Last Updated</span>
                    <span style={{ color: "#334155", fontWeight: "500" }}>
                      {formatDateOnly(grievance.updatedAt)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ⏳ SECTION 3: EXTENSION REQUEST (IF ANY) */}
          {grievance.extensionRequest &&
            grievance.extensionRequest.status &&
            grievance.extensionRequest.status !== "None" && (
              <div
                style={{
                  background:
                    grievance.extensionRequest.status === "Pending"
                      ? "#fffbeb"
                      : grievance.extensionRequest.status === "Approved"
                      ? "#f0fdf4"
                      : "#fef2f2",
                  border: `1px solid ${
                    grievance.extensionRequest.status === "Pending"
                      ? "#fde68a"
                      : grievance.extensionRequest.status === "Approved"
                      ? "#bbf7d0"
                      : "#fecaca"
                  }`,
                  borderRadius: "12px",
                  padding: "16px 18px",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                  <h4
                    style={{
                      margin: 0,
                      fontSize: "0.92rem",
                      fontWeight: "700",
                      color:
                        grievance.extensionRequest.status === "Pending"
                          ? "#b45309"
                          : grievance.extensionRequest.status === "Approved"
                          ? "#15803d"
                          : "#dc2626",
                    }}
                  >
                    ⏳ Deadline Extension Request
                  </h4>
                  <span
                    style={{
                      fontSize: "0.75rem",
                      fontWeight: "700",
                      padding: "2px 8px",
                      borderRadius: "6px",
                      textTransform: "uppercase",
                      background:
                        grievance.extensionRequest.status === "Pending"
                          ? "#fef3c7"
                          : grievance.extensionRequest.status === "Approved"
                          ? "#dcfce7"
                          : "#fee2e2",
                      color:
                        grievance.extensionRequest.status === "Pending"
                          ? "#92400e"
                          : grievance.extensionRequest.status === "Approved"
                          ? "#166534"
                          : "#991b1b",
                    }}
                  >
                    {grievance.extensionRequest.status}
                  </span>
                </div>

                <div style={{ fontSize: "0.85rem", color: "#334155" }}>
                  <p style={{ margin: "4px 0" }}>
                    <strong>Requested New Deadline:</strong>{" "}
                    {formatDateOnly(grievance.extensionRequest.requestedDate)}
                  </p>
                  <p style={{ margin: "4px 0" }}>
                    <strong>Reason for Extension:</strong> {grievance.extensionRequest.reason || "No reason given"}
                  </p>
                </div>

                {/* Admin Approve / Reject actions */}
                {grievance.extensionRequest.status === "Pending" && onResolveExtension && (
                  <div style={{ display: "flex", gap: "10px", marginTop: "12px" }}>
                    <button
                      onClick={() => onResolveExtension(grievance._id, "Approve")}
                      style={{
                        padding: "6px 14px",
                        background: "#16a34a",
                        color: "white",
                        border: "none",
                        borderRadius: "6px",
                        cursor: "pointer",
                        fontWeight: "700",
                        fontSize: "0.85rem",
                      }}
                    >
                      Approve Extension
                    </button>
                    <button
                      onClick={() => onResolveExtension(grievance._id, "Reject")}
                      style={{
                        padding: "6px 14px",
                        background: "#dc2626",
                        color: "white",
                        border: "none",
                        borderRadius: "6px",
                        cursor: "pointer",
                        fontWeight: "700",
                        fontSize: "0.85rem",
                      }}
                    >
                      Reject Extension
                    </button>
                  </div>
                )}
              </div>
            )}

          {/* Staff Extension Request Action Trigger */}
          {onRequestExtension &&
            grievance.deadlineDate &&
            !isResolved &&
            !isRejected &&
            (!grievance.extensionRequest ||
              grievance.extensionRequest.status === "None" ||
              grievance.extensionRequest.status === "Rejected") && (
              <div>
                <button
                  onClick={() => onRequestExtension(grievance)}
                  style={{
                    padding: "8px 16px",
                    background: "#4f46e5",
                    color: "white",
                    border: "none",
                    borderRadius: "8px",
                    fontWeight: "600",
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    fontSize: "0.85rem",
                  }}
                >
                  <ClockIcon width="15" height="15" /> Request Deadline Extension
                </button>
              </div>
            )}

          {/* 📝 SECTION 4: GRIEVANCE MESSAGE & STATEMENT */}
          <div
            style={{
              background: "#f8fafc",
              border: "1px solid #e2e8f0",
              borderRadius: "12px",
              padding: "16px 18px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
              <FileIcon width="16" height="16" style={{ color: "#475569" }} />
              <strong style={{ color: "#1e293b", fontSize: "0.92rem" }}>Grievance Statement / Query:</strong>
            </div>

            <div
              style={{
                color: "#1e293b",
                lineHeight: "1.6",
                fontSize: "0.92rem",
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
                background: "#ffffff",
                padding: "14px 16px",
                borderRadius: "8px",
                border: "1px solid #e2e8f0",
              }}
            >
              {grievance.message || <span style={{ color: "#94a3b8", fontStyle: "italic" }}>No message provided.</span>}
            </div>

            {/* Document Attachment Button */}
            {grievance.attachment && (
              <div style={{ marginTop: "14px", display: "flex", alignItems: "center", gap: "10px" }}>
                <span style={{ fontSize: "0.85rem", fontWeight: "600", color: "#475569" }}>
                  Attached File:
                </span>
                <a
                  href={`${apiUrl}/api/file/${grievance.attachment}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    padding: "6px 14px",
                    background: "#eff6ff",
                    color: "#1d4ed8",
                    border: "1px solid #bfdbfe",
                    borderRadius: "6px",
                    fontSize: "0.85rem",
                    fontWeight: "600",
                    textDecoration: "none",
                    transition: "all 0.2s",
                  }}
                  onMouseOver={(e) => (e.currentTarget.style.background = "#dbeafe")}
                  onMouseOut={(e) => (e.currentTarget.style.background = "#eff6ff")}
                >
                  <PaperclipIcon width="14" height="14" />
                  View / Download Document
                </a>
              </div>
            )}
          </div>

          {/* ✅ SECTION 5: RESOLUTION REMARKS (IF RESOLVED OR REMARKS EXIST) */}
          {(grievance.resolutionRemarks || grievance.resolvedBy || isResolved) && (
            <div
              style={{
                background: "#f0fdf4",
                border: "1px solid #bbf7d0",
                borderRadius: "12px",
                padding: "16px 18px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                <CheckCircleIcon width="18" height="18" style={{ color: "#16a34a" }} />
                <h4 style={{ margin: 0, fontSize: "0.95rem", color: "#14532d", fontWeight: "700" }}>
                  Resolution Summary & Action Taken
                </h4>
              </div>

              {grievance.resolvedBy && (
                <p style={{ margin: "0 0 6px 0", fontSize: "0.85rem", color: "#166534" }}>
                  <strong>Resolved By:</strong> {getStaffDisplayName(grievance.resolvedBy)}
                </p>
              )}

              {grievance.resolutionRemarks ? (
                <div
                  style={{
                    background: "#ffffff",
                    padding: "12px 14px",
                    borderRadius: "8px",
                    border: "1px solid #dcfce7",
                    fontSize: "0.9rem",
                    color: "#14532d",
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
                    marginTop: "6px",
                  }}
                >
                  {grievance.resolutionRemarks}
                </div>
              ) : (
                <p style={{ margin: 0, fontSize: "0.85rem", color: "#166534", fontStyle: "italic" }}>
                  Resolved without extra written remarks.
                </p>
              )}
            </div>
          )}

          {/* ⭐ SECTION 6: STUDENT FEEDBACK & STAR RATING */}
          {grievance.rating?.stars && (
            <div
              style={{
                background: "linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)",
                border: "1px solid #fde68a",
                borderRadius: "12px",
                padding: "16px 18px",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                <h4 style={{ margin: 0, fontSize: "0.95rem", color: "#92400e", fontWeight: "700" }}>
                  ⭐ Student Review & Satisfaction Rating
                </h4>
                <div style={{ fontSize: "1.1rem", color: "#f59e0b", letterSpacing: "2px" }}>
                  {"★".repeat(grievance.rating.stars)}
                  <span style={{ color: "#d1d5db" }}>{"★".repeat(5 - grievance.rating.stars)}</span>
                </div>
              </div>

              {grievance.rating.feedback && (
                <p
                  style={{
                    margin: "6px 0 0 0",
                    fontStyle: "italic",
                    fontSize: "0.9rem",
                    color: "#78350f",
                    background: "rgba(255,255,255,0.6)",
                    padding: "10px 12px",
                    borderRadius: "8px",
                  }}
                >
                  “{grievance.rating.feedback}”
                </p>
              )}

              {grievance.rating.ratedAt && (
                <div style={{ marginTop: "6px", fontSize: "0.75rem", color: "#b45309" }}>
                  Rated on {formatDateTime(grievance.rating.ratedAt)}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ================= FOOTER ACTIONS ================= */}
        <div
          style={{
            padding: "16px 24px",
            borderTop: "1px solid #f1f5f9",
            background: "#f8fafc",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          {onDelete ? (
            <button
              onClick={() => onDelete(grievance._id)}
              style={{
                padding: "8px 16px",
                backgroundColor: "#fee2e2",
                border: "1px solid #ef4444",
                borderRadius: "8px",
                cursor: "pointer",
                fontWeight: "600",
                color: "#dc2626",
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                fontSize: "0.85rem",
                transition: "all 0.2s",
              }}
              onMouseOver={(e) => (e.currentTarget.style.backgroundColor = "#fecaca")}
              onMouseOut={(e) => (e.currentTarget.style.backgroundColor = "#fee2e2")}
            >
              <TrashIcon width="15" height="15" /> Remove from View
            </button>
          ) : (
            <div></div>
          )}

          <button
            onClick={onClose}
            style={{
              padding: "9px 22px",
              backgroundColor: "#e2e8f0",
              border: "none",
              borderRadius: "8px",
              cursor: "pointer",
              fontWeight: "600",
              color: "#334155",
              fontSize: "0.9rem",
              transition: "all 0.2s",
            }}
            onMouseOver={(e) => (e.currentTarget.style.backgroundColor = "#cbd5e1")}
            onMouseOut={(e) => (e.currentTarget.style.backgroundColor = "#e2e8f0")}
          >
            Close
          </button>
        </div>
      </div>

      <style>{`
        @keyframes modalFadeIn {
          from { opacity: 0; transform: scale(0.97); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
};

export default GrievanceDetailsModal;
