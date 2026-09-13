import React from "react";
import ActionDropdown from "./ActionDropdown";
import { UserRoleBadge } from "../utils/userRoleHelper";
import { AlertCircleIcon, RerouteIcon } from "./Icons";

/**
 * Reusable Department Grievance List Component:
 * - Desktop View: Clean, full-featured data table.
 * - Mobile View: Touch-friendly, zero-overflow compact cards.
 */
function DepartmentGrievanceList({
  grievances = [],
  staffMap = {},
  setSelectedGrievance,
  openAssignPopup,
  onResolve,
  onReject,
  updateStatus,
  getDeadlineStatus,
  formatDate
}) {
  if (!grievances || grievances.length === 0) {
    return null;
  }

  const handleResolve = (e, g) => {
    e.stopPropagation();
    if (onResolve) {
      onResolve(g);
    }
  };

  const handleReject = (e, g) => {
    e.stopPropagation();
    if (onReject) {
      onReject(g);
    } else if (updateStatus) {
      if (window.confirm("Reject this grievance?")) {
        updateStatus(g._id, "Rejected");
      }
    }
  };


  return (
    <>
      {/* ── Desktop View: Standard Full Table ── */}
      <div className="table-container admin-desktop-only">
        <table className="grievance-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Name</th>
              <th>Assigned To</th>
              <th>Message</th>
              <th>Date</th>
              <th>Deadline</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {grievances.map((g) => {
              const staffName = staffMap[g.assignedTo];
              const ds = getDeadlineStatus
                ? getDeadlineStatus(g.deadlineDate || g.deadline || g.deadline_date, g.status)
                : null;

              return (
                <tr
                  key={g._id}
                  onClick={() => setSelectedGrievance && setSelectedGrievance(g)}
                  style={{ cursor: "pointer" }}
                >
                  <td style={{ fontWeight: "bold", color: "#333" }}>{g.userId}</td>
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <span>{g.name}</span>
                      <UserRoleBadge grievance={g} />
                    </div>
                  </td>

                  {/* Assigned To */}
                  <td>
                    {g.assignedTo ? (
                      <div>
                        <span style={{ fontWeight: "600", display: "block", color: "#1e293b" }}>
                          {staffName || "Staff"}
                        </span>
                        <span style={{ fontSize: "0.85rem", color: "#64748b" }}>({g.assignedTo})</span>
                      </div>
                    ) : (
                      <span style={{ color: "#94a3b8", fontStyle: "italic" }}>Not Assigned Yet</span>
                    )}
                  </td>

                  {/* Message */}
                  <td className="message-cell" style={{ maxWidth: "200px" }}>
                    <div
                      style={{ padding: "4px", borderRadius: "4px", transition: "background 0.2s" }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "#f1f5f9")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                    >
                      <span
                        style={{
                          wordBreak: "break-word",
                          lineHeight: "1.3",
                          color: "#334155",
                          fontWeight: "500"
                        }}
                      >
                        {g.message ? (g.message.length > 40 ? `${g.message.substring(0, 40)}...` : g.message) : "-"}
                      </span>
                    </div>
                  </td>

                  {/* Date */}
                  <td>{formatDate ? formatDate(g.createdAt) : new Date(g.createdAt).toLocaleDateString()}</td>

                  {/* Deadline */}
                  <td className="deadline-col">
                    {ds && (
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: "2px" }}>
                        <span style={{ color: ds.color, fontWeight: ds.isOverdue ? "700" : "500", fontSize: "0.85rem" }}>
                          {ds.label}
                        </span>
                        {ds.badge && (
                          <span
                            style={{
                              fontSize: "0.6rem",
                              padding: "1px 5px",
                              borderRadius: "4px",
                              fontWeight: "700",
                              background: ds.isOverdue ? "#fef2f2" : "#fffbeb",
                              color: ds.color,
                              border: `1px solid ${ds.color}30`
                            }}
                          >
                            {ds.badge}
                          </span>
                        )}
                      </div>
                    )}
                    {g.extensionRequest?.status === "Pending" && (
                      <div
                        style={{
                          fontSize: "0.7rem",
                          color: "#d97706",
                          fontWeight: "bold",
                          marginTop: "4px",
                          display: "flex",
                          alignItems: "center",
                          gap: "3px"
                        }}
                      >
                        <AlertCircleIcon width="12" height="12" style={{ color: "#d97706" }} /> EXT REQ
                      </div>
                    )}
                  </td>

                  {/* Status */}
                  <td>
                    <span className={`status-badge status-${(g.status || "").toLowerCase().replace(" ", "")}`}>
                      {g.status}
                    </span>
                  </td>

                  {/* Action */}
                  <td className="action-cell" onClick={(e) => e.stopPropagation()}>
                    <ActionDropdown>
                      {openAssignPopup && (
                        <button
                          type="button"
                          className="action-btn assign-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            openAssignPopup(g._id);
                          }}
                          disabled={g.status === "Resolved" || g.assignedTo}
                          style={{
                            opacity: g.status === "Resolved" || g.assignedTo ? 0.5 : 1,
                            cursor: g.status === "Resolved" || g.assignedTo ? "not-allowed" : "pointer"
                          }}
                        >
                          Assign
                        </button>
                      )}
                      {onResolve && (
                        <button
                          type="button"
                          className="action-btn resolve-btn"
                          onClick={(e) => handleResolve(e, g)}
                          disabled={g.status === "Resolved"}
                          style={{
                            opacity: g.status === "Resolved" ? 0.5 : 1,
                            cursor: g.status === "Resolved" ? "not-allowed" : "pointer",
                            marginLeft: "5px"
                          }}
                        >
                          Resolve
                        </button>
                      )}
                      {(onReject || updateStatus) && (
                        <button
                          type="button"
                          className="action-btn reject-btn"
                          onClick={(e) => handleReject(e, g)}
                          disabled={g.status === "Resolved" || g.status === "Rejected"}
                          style={{
                            opacity: g.status === "Resolved" || g.status === "Rejected" ? 0.5 : 1,
                            cursor: g.status === "Resolved" || g.status === "Rejected" ? "not-allowed" : "pointer",
                            marginLeft: "5px"
                          }}
                        >
                          Reject
                        </button>
                      )}
                    </ActionDropdown>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ── Mobile View: Compact Touch Cards (Zero Squishing, Perfect Layout) ── */}
      <div className="dept-mobile-cards-list admin-mobile-only">
        {grievances.map((g) => {
          const staffName = staffMap[g.assignedTo];
          const ds = getDeadlineStatus
            ? getDeadlineStatus(g.deadlineDate || g.deadline || g.deadline_date, g.status)
            : null;

          return (
            <div
              key={g._id}
              className="dept-mobile-card"
              onClick={() => setSelectedGrievance && setSelectedGrievance(g)}
              role="button"
              tabIndex={0}
            >
              {/* Header: User Info & Status */}
              <div className="dept-mcard-header">
                <div className="dept-mcard-user-wrap">
                  <span className="dept-mcard-name">{g.name || "Student"}</span>
                  <UserRoleBadge grievance={g} />
                  <span className="dept-mcard-id">#{g.userId}</span>
                </div>
                <div className="dept-mcard-status-wrap">
                  <span className={`status-badge status-${(g.status || "").toLowerCase().replace(" ", "")}`}>
                    {g.status}
                  </span>
                  {g.isRerouted && (
                    <span className="admin-reroute-icon-badge" title="Re-routed">
                      <RerouteIcon width="12" height="12" />
                    </span>
                  )}
                </div>
              </div>

              {/* Message Snippet */}
              <div className="dept-mcard-msg">
                {g.message || "No message content provided."}
              </div>

              {/* Meta Grid */}
              <div className="dept-mcard-meta">
                <div className="dept-mcard-meta-row">
                  <span className="dept-mcard-meta-label">Assigned Staff</span>
                  <span className="dept-mcard-meta-val">
                    {g.assignedTo ? (
                      <strong>{staffName || "Staff"} ({g.assignedTo})</strong>
                    ) : (
                      <em style={{ color: "#94a3b8" }}>Not Assigned Yet</em>
                    )}
                  </span>
                </div>

                <div className="dept-mcard-meta-row">
                  <span className="dept-mcard-meta-label">Deadline</span>
                  <span className="dept-mcard-meta-val">
                    {ds ? (
                      <span style={{ color: ds.color, fontWeight: ds.isOverdue ? "700" : "600" }}>
                        {ds.label} {ds.badge ? `(${ds.badge})` : ""}
                      </span>
                    ) : "-"}
                  </span>
                </div>

                <div className="dept-mcard-meta-row">
                  <span className="dept-mcard-meta-label">Submitted On</span>
                  <span className="dept-mcard-meta-val">
                    {formatDate ? formatDate(g.createdAt) : new Date(g.createdAt).toLocaleDateString()}
                  </span>
                </div>

                {g.extensionRequest?.status === "Pending" && (
                  <div className="dept-mcard-meta-row">
                    <span className="dept-mcard-meta-label">Extension</span>
                    <span className="dept-mcard-meta-val" style={{ color: "#d97706", fontWeight: "600", display: "inline-flex", alignItems: "center", gap: "3px" }}>
                      <AlertCircleIcon width="12" height="12" /> Req Pending
                    </span>
                  </div>
                )}
              </div>

              {/* Footer: Tap hint & Actions */}
              <div className="dept-mcard-footer" onClick={(e) => e.stopPropagation()}>
                <span
                  className="dept-mcard-details-hint"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (setSelectedGrievance) setSelectedGrievance(g);
                  }}
                >
                  Tap for details ➔
                </span>

                <div className="dept-mcard-actions">
                  <ActionDropdown>
                    {openAssignPopup && (
                      <button
                        type="button"
                        className="action-btn assign-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          openAssignPopup(g._id);
                        }}
                        disabled={g.status === "Resolved" || g.assignedTo}
                        style={{
                          opacity: g.status === "Resolved" || g.assignedTo ? 0.5 : 1,
                          cursor: g.status === "Resolved" || g.assignedTo ? "not-allowed" : "pointer"
                        }}
                      >
                        Assign
                      </button>
                    )}
                    {onResolve && (
                      <button
                        type="button"
                        className="action-btn resolve-btn"
                        onClick={(e) => handleResolve(e, g)}
                        disabled={g.status === "Resolved"}
                        style={{
                          opacity: g.status === "Resolved" ? 0.5 : 1,
                          cursor: g.status === "Resolved" ? "not-allowed" : "pointer",
                          marginLeft: "5px"
                        }}
                      >
                        Resolve
                      </button>
                    )}
                    {(onReject || updateStatus) && (
                      <button
                        type="button"
                        className="action-btn reject-btn"
                        onClick={(e) => handleReject(e, g)}
                        disabled={g.status === "Resolved" || g.status === "Rejected"}
                        style={{
                          opacity: g.status === "Resolved" || g.status === "Rejected" ? 0.5 : 1,
                          cursor: g.status === "Resolved" || g.status === "Rejected" ? "not-allowed" : "pointer",
                          marginLeft: "5px"
                        }}
                      >
                        Reject
                      </button>
                    )}
                  </ActionDropdown>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

export default DepartmentGrievanceList;
