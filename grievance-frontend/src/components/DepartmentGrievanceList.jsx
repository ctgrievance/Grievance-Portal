import React from "react";
import ActionDropdown from "./ActionDropdown";
import { UserRoleBadge, getSubmitterRole } from "../utils/userRoleHelper";
import { AlertCircleIcon, RerouteIcon, ArrowRightLeftIcon, UserIcon, ClockIcon, BuildingIcon, LockIcon } from "./Icons";
import { getIncomingTransferInfo } from "../utils/grievanceClassification";

/**
 * Reusable Department Grievance List Component:
 * - Desktop View: Clean, full-featured data table.
 * - Mobile View: Touch-friendly, zero-overflow compact cards.
 * - Supports Direct Grievances and Forwarded Grievances sections.
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
  formatDate,
  isForwardedSection = false,
  isStudentSection = false,
  currentDepartment = ""
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

  // Check if grievance is currently held by this department
  const isHeldByThisDept = (g) => {
    if (!currentDepartment) return true;
    const holdingDept = (g?.currentCustodian?.department || g?.category || "").trim().toLowerCase();
    const myDept = currentDepartment.trim().toLowerCase();
    return holdingDept === myDept || holdingDept.includes(myDept) || myDept.includes(holdingDept);
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
              {isForwardedSection ? (
                <>
                  <th>Forwarded From</th>
                  <th>Forward Reason</th>
                  <th>Assigned Faculty</th>
                </>
              ) : isStudentSection ? (
                <>
                  <th>Submitted To</th>
                  <th>Subject / Message</th>
                  <th>Assigned Faculty</th>
                </>
              ) : (
                <>
                  <th>Assigned To</th>
                  <th>Message</th>
                </>
              )}
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
              const fwdInfo = isForwardedSection ? getIncomingTransferInfo(g, currentDepartment) : null;

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

                  {/* Forwarded vs Student Outgoing vs Direct Columns */}
                  {isForwardedSection ? (
                    <>
                      {/* Forwarded From */}
                      <td>
                        <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                          <span style={{ fontWeight: "600", color: "#1e293b", fontSize: "0.85rem" }}>
                            {fwdInfo.fromDepartment}
                          </span>
                          <span style={{ fontSize: "0.74rem", color: "#64748b" }}>
                            By: {fwdInfo.transferredByName}
                          </span>
                        </div>
                      </td>

                      {/* Forward Reason */}
                      <td className="message-cell" style={{ maxWidth: "200px" }}>
                        <div
                          style={{ padding: "4px", borderRadius: "4px", transition: "background 0.2s" }}
                          onMouseEnter={(e) => (e.currentTarget.style.background = "#f1f5f9")}
                          onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                          title={fwdInfo.reason}
                        >
                          <span
                            style={{
                              wordBreak: "break-word",
                              lineHeight: "1.3",
                              color: "#475569",
                              fontWeight: "500",
                              fontSize: "0.82rem",
                              fontStyle: "italic"
                            }}
                          >
                            {fwdInfo.reason ? (fwdInfo.reason.length > 45 ? `${fwdInfo.reason.substring(0, 45)}...` : fwdInfo.reason) : "-"}
                          </span>
                        </div>
                      </td>

                      {/* Assigned Faculty */}
                      <td>
                        {g.assignedTo ? (
                          <div>
                            <span style={{ fontWeight: "600", display: "block", color: "#1e293b" }}>
                              {staffName || "Staff"}
                            </span>
                            <span style={{ fontSize: "0.85rem", color: "#64748b" }}>({g.assignedTo})</span>
                          </div>
                        ) : (
                          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                            <span
                              style={{
                                background: "#fef3c7",
                                color: "#92400e",
                                border: "1px solid #fde68a",
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "4px",
                                whiteSpace: "nowrap",
                                padding: "2px 7px",
                                borderRadius: "4px",
                                fontSize: "0.75rem",
                                fontWeight: "700"
                              }}
                            >
                              <AlertCircleIcon width="12" height="12" style={{ color: "#b45309" }} /> Unassigned
                            </span>
                            {openAssignPopup && isHeldByThisDept(g) && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openAssignPopup(g._id);
                                }}
                                style={{
                                  padding: "3px 8px",
                                  background: "#2563eb",
                                  color: "#ffffff",
                                  border: "none",
                                  borderRadius: "4px",
                                  fontSize: "0.72rem",
                                  fontWeight: "600",
                                  cursor: "pointer"
                                }}
                                title="Assign faculty to this forwarded grievance"
                              >
                                Assign
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                    </>
                  ) : isStudentSection ? (
                    <>
                      {/* Submitted To (Target Department) */}
                      <td>
                        <span style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "4px",
                          padding: "4px 9px",
                          borderRadius: "6px",
                          background: "#eff6ff",
                          color: "#1d4ed8",
                          fontWeight: "600",
                          fontSize: "0.82rem",
                          border: "1px solid #bfdbfe"
                        }}>
                          <BuildingIcon width="13" height="13" style={{ verticalAlign: "middle", marginRight: "4px" }} /> {g.currentCustodian?.department || g.category}
                        </span>
                      </td>

                      {/* Subject / Message */}
                      <td className="message-cell" style={{ maxWidth: "220px" }}>
                        <div
                          style={{ padding: "4px", borderRadius: "4px", transition: "background 0.2s" }}
                          onMouseEnter={(e) => (e.currentTarget.style.background = "#f1f5f9")}
                          onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                          title={g.message || g.issueTypeId?.issueName || "—"}
                        >
                          <div style={{ fontWeight: "600", color: "#0f172a", fontSize: "0.82rem", marginBottom: "2px" }}>
                            {g.issueTypeId?.issueName || "General Grievance"}
                          </div>
                          <span
                            style={{
                              wordBreak: "break-word",
                              lineHeight: "1.3",
                              color: "#475569",
                              fontSize: "0.78rem"
                            }}
                          >
                            {g.message ? (g.message.length > 45 ? `${g.message.substring(0, 45)}...` : g.message) : "—"}
                          </span>
                        </div>
                      </td>

                      {/* Assigned Faculty */}
                      <td>
                        {g.assignedTo ? (
                          <div>
                            <span style={{ fontWeight: "600", display: "block", color: "#1e293b", fontSize: "0.84rem" }}>
                              {staffName || "Staff"}
                            </span>
                            <span style={{ fontSize: "0.78rem", color: "#64748b" }}>({g.assignedTo})</span>
                          </div>
                        ) : (
                          <span style={{ color: "#94a3b8", fontStyle: "italic", fontSize: "0.78rem" }}>Unassigned</span>
                        )}
                      </td>
                    </>
                  ) : (
                    <>
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
                    </>
                  )}

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
                      {!isHeldByThisDept(g) ? (
                        <div style={{ padding: "8px 12px", fontSize: "0.78rem", color: "#64748b", fontStyle: "italic", whiteSpace: "nowrap" }}>
                          <LockIcon width="12" height="12" style={{ verticalAlign: "middle", marginRight: "4px" }} /> Assigned to {g.category}
                        </div>
                      ) : (
                        <>
                          {openAssignPopup && (
                            <button
                              type="button"
                              className="action-btn assign-btn"
                              onClick={(e) => {
                                e.stopPropagation();
                                openAssignPopup(g._id);
                              }}
                              disabled={g.status === "Resolved"}
                              style={{
                                opacity: g.status === "Resolved" ? 0.5 : 1,
                                cursor: g.status === "Resolved" ? "not-allowed" : "pointer"
                              }}
                            >
                              {g.assignedTo ? "Reassign" : "Assign"}
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
                        </>
                      )}
                    </ActionDropdown>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ── Mobile View: Compact Cards (Exact Super Admin Sleek Design) ── */}
      <div className="admin-mobile-cards-list admin-mobile-only">
        {grievances.map((g) => {
          const fwdInfo = isForwardedSection ? getIncomingTransferInfo(g, currentDepartment) : null;
          let deptLabel = g.category || g.school || "General";
          if (isForwardedSection && fwdInfo?.fromDepartment) {
            deptLabel = `From: ${fwdInfo.fromDepartment}`;
          } else if (isStudentSection) {
            deptLabel = `To: ${g.currentCustodian?.department || g.category || "General"}`;
          }

          return (
            <div
              key={g._id}
              className="admin-mobile-compact-card"
              onClick={() => setSelectedGrievance && setSelectedGrievance(g)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  if (setSelectedGrievance) setSelectedGrievance(g);
                }
              }}
              role="button"
              tabIndex={0}
            >
              <div className="admin-mcard-row-top">
                <div className="admin-mcard-user-info">
                  <span className="admin-mcard-user-name">
                    {g.name || (getSubmitterRole(g) === "staff" ? "Staff Member" : "Student")}
                  </span>
                  <UserRoleBadge grievance={g} />
                </div>
                <div className="admin-mcard-status-info">
                  <span
                    className={`status-badge status-${(g.status || "")
                      .toLowerCase()
                      .replace(" ", "")}`}
                  >
                    {g.status}
                  </span>
                  {g.isRerouted && (
                    <span
                      className="admin-reroute-icon-badge"
                      title={
                        g.transferHistory?.length > 1
                          ? `Re-routed (${g.transferHistory.length} times)`
                          : "Re-routed"
                      }
                    >
                      <RerouteIcon width="11" height="11" />
                    </span>
                  )}
                </div>
              </div>

              <div className="admin-mcard-row-bottom">
                <div className="admin-mcard-meta-wrap">
                  <span className="admin-mcard-dept-name">
                    {deptLabel}
                  </span>
                  <span className="admin-mcard-sep">•</span>
                  <span className="admin-mcard-user-id">{g.userId}</span>
                  <span className="admin-mcard-sep">•</span>
                  <span className="admin-mcard-date-str">
                    {new Date(g.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </span>
                </div>
                <span className="admin-mcard-chevron" aria-hidden="true">›</span>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

export default DepartmentGrievanceList;
