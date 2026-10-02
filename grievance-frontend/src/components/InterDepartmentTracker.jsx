import React, { useState, useEffect, useCallback } from "react";
import { RerouteIcon, UserIcon, AlertCircleIcon, RefreshIcon } from "./Icons";
import { UserRoleBadge } from "../utils/userRoleHelper";

const formatDate = (dateString) => {
  if (!dateString) return "N/A";
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

function InterDepartmentTracker({ departmentName, staffMap = {}, onSelectGrievance }) {
  const [grievances, setGrievances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [deptFilter, setDeptFilter] = useState("All");

  const fetchTransfers = useCallback(async () => {
    if (!departmentName) return;
    setLoading(true);
    setErrorMsg("");
    try {
      const res = await fetch(
        `${process.env.REACT_APP_API_URL || "http://localhost:5000"}/api/grievances/department-transfers/${encodeURIComponent(departmentName)}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("grievance_token") || ""}`,
          },
        }
      );
      if (!res.ok) {
        throw new Error("Failed to load inter-department transfer records.");
      }
      const data = await res.json();
      setGrievances(data || []);
    } catch (err) {
      console.error("Error fetching inter-department transfers:", err);
      setErrorMsg(err.message || "Failed to load transfer history.");
    } finally {
      setLoading(false);
    }
  }, [departmentName]);

  useEffect(() => {
    fetchTransfers();
  }, [fetchTransfers]);

  // Extract all unique departments present in transfers
  const uniqueDepartments = Array.from(
    new Set(
      grievances.flatMap((g) => [
        g.category,
        g.originatingDepartment,
        ...(g.involvedDepartments || []),
        ...(g.transferHistory?.map((t) => t.toDepartment) || []),
      ]).filter(Boolean)
    )
  );

  // Filtered grievances
  const filtered = grievances.filter((g) => {
    // Search query
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      g._id?.toLowerCase().includes(q) ||
      g.name?.toLowerCase().includes(q) ||
      g.userId?.toLowerCase().includes(q) ||
      g.regid?.toLowerCase().includes(q) ||
      g.category?.toLowerCase().includes(q);

    // Status filter
    const matchesStatus = statusFilter === "All" || g.status === statusFilter;

    // Dept filter (current department)
    const matchesDept = deptFilter === "All" || g.category === deptFilter;

    return matchesSearch && matchesStatus && matchesDept;
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      {/* Top Banner / Card - Crisp White Theme matching project */}
      <div
        style={{
          background: "#ffffff",
          borderRadius: "14px",
          padding: "20px 24px",
          border: "1px solid #e2e8f0",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "16px",
          boxShadow: "0 2px 4px -1px rgba(0, 0, 0, 0.06), 0 2px 4px -1px rgba(0, 0, 0, 0.04)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
          <div
            style={{
              width: "48px",
              height: "48px",
              borderRadius: "12px",
              background: "#eef2ff",
              border: "1px solid #c7d2fe",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#4f46e5",
            }}
          >
            <RerouteIcon width="26" height="26" />
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: "1.25rem", fontWeight: "700", color: "#0f172a" }}>
              Inter-Department Communication Tracker
            </h2>
            <p style={{ margin: "4px 0 0 0", fontSize: "0.85rem", color: "#64748b" }}>
              Live custody and status monitoring for grievances routed through <strong style={{ color: "#1e293b" }}>{departmentName}</strong>
            </p>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div
            style={{
              background: "#f8fafc",
              border: "1px solid #e2e8f0",
              padding: "8px 18px",
              borderRadius: "10px",
              textAlign: "center"
            }}
          >
            <span style={{ fontSize: "0.75rem", color: "#64748b", display: "block", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.5px" }}>
              Total Tracked
            </span>
            <strong style={{ fontSize: "1.25rem", color: "#4f46e5", fontWeight: "800" }}>
              {grievances.length}
            </strong>
          </div>
          <button
            onClick={fetchTransfers}
            disabled={loading}
            style={{
              padding: "10px 18px",
              background: "#ffffff",
              border: "1.5px solid #cbd5e1",
              borderRadius: "10px",
              color: "#334155",
              fontWeight: "600",
              fontSize: "0.86rem",
              cursor: loading ? "not-allowed" : "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: "7px",
              boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
              transition: "all 0.2s",
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.background = "#f8fafc";
              e.currentTarget.style.borderColor = "#94a3b8";
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.background = "#ffffff";
              e.currentTarget.style.borderColor = "#cbd5e1";
            }}
          >
            <RefreshIcon width="16" height="16" /> Refresh
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div
        style={{
          background: "#ffffff",
          borderRadius: "12px",
          padding: "14px 18px",
          border: "1px solid #e2e8f0",
          display: "flex",
          flexWrap: "wrap",
          gap: "12px",
          alignItems: "center",
          justifyContent: "space-between",
          boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
        }}
      >
        <div style={{ display: "flex", flex: 1, minWidth: "240px", gap: "10px" }}>
          <input
            type="text"
            placeholder="Search by ID, Submitter Name, or Department..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: "100%",
              padding: "9px 14px",
              borderRadius: "8px",
              border: "1.5px solid #cbd5e1",
              fontSize: "0.88rem",
              outline: "none",
              color: "#1e293b",
            }}
          />
        </div>

        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{
              padding: "9px 12px",
              borderRadius: "8px",
              border: "1.5px solid #cbd5e1",
              fontSize: "0.86rem",
              color: "#334155",
              background: "#ffffff",
              cursor: "pointer",
            }}
          >
            <option value="All">All Statuses</option>
            <option value="Pending">Pending</option>
            <option value="Assigned">Assigned</option>
            <option value="In Progress">In Progress</option>
            <option value="Verification">Verification</option>
            <option value="Resolved">Resolved</option>
            <option value="Rejected">Rejected</option>
          </select>

          <select
            value={deptFilter}
            onChange={(e) => setDeptFilter(e.target.value)}
            style={{
              padding: "9px 12px",
              borderRadius: "8px",
              border: "1.5px solid #cbd5e1",
              fontSize: "0.86rem",
              color: "#334155",
              background: "#ffffff",
              cursor: "pointer",
            }}
          >
            <option value="All">All Current Departments</option>
            {uniqueDepartments.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Error state */}
      {errorMsg && (
        <div
          style={{
            padding: "12px 16px",
            background: "#fef2f2",
            border: "1px solid #fecaca",
            borderRadius: "8px",
            color: "#dc2626",
            fontSize: "0.88rem",
            fontWeight: "600",
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <AlertCircleIcon width="18" height="18" /> {errorMsg}
        </div>
      )}

      {/* Loading state */}
      {loading ? (
        <div style={{ padding: "40px", textAlign: "center", color: "#64748b" }}>
          <p style={{ fontSize: "1rem" }}>Loading inter-department tracking records...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div
          style={{
            padding: "50px 20px",
            textAlign: "center",
            background: "#ffffff",
            borderRadius: "14px",
            border: "1px dashed #cbd5e1",
          }}
        >
          <div style={{ display: "flex", justifyContent: "center", marginBottom: "12px" }}>
            <RerouteIcon width="44" height="44" style={{ color: "#cbd5e1" }} />
          </div>
          <h3 style={{ margin: "0 0 6px 0", color: "#1e293b", fontSize: "1.1rem" }}>
            No Inter-Department Grievances Found
          </h3>
          <p style={{ margin: 0, color: "#64748b", fontSize: "0.86rem" }}>
            Grievances forwarded to or from {departmentName} will appear here with live custodian details.
          </p>
        </div>
      ) : (
        <>
          {/* Desktop Table View */}
          <div className="table-container admin-desktop-only" style={{ background: "#ffffff", borderRadius: "12px", border: "1px solid #e2e8f0", overflowX: "auto" }}>
            <table className="grievance-table" style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#f8fafc", borderBottom: "1.5px solid #e2e8f0", textAlign: "left" }}>
                  <th style={{ padding: "12px 16px" }}>Ticket ID</th>
                  <th style={{ padding: "12px 16px" }}>Student</th>
                  <th style={{ padding: "12px 16px" }}>Originated At</th>
                  <th style={{ padding: "12px 16px" }}>Current Custodian Dept</th>
                  <th style={{ padding: "12px 16px" }}>Holding Faculty</th>
                  <th style={{ padding: "12px 16px" }}>Live Status</th>
                  <th style={{ padding: "12px 16px" }}>Last Transfer Note</th>
                  <th style={{ padding: "12px 16px", textAlign: "center" }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((g) => {
                  const lastTransfer = g.transferHistory?.slice(-1)[0];
                  const currentDept = g.currentCustodian?.department || g.category;
                  const holdingFacultyName =
                    g.currentCustodian?.staffName ||
                    staffMap[g.assignedTo] ||
                    (g.assignedTo ? `Faculty (${g.assignedTo})` : null);

                  return (
                    <tr
                      key={g._id}
                      onClick={() => onSelectGrievance && onSelectGrievance(g)}
                      style={{ cursor: "pointer", borderBottom: "1px solid #f1f5f9" }}
                    >
                      <td style={{ padding: "12px 16px" }}>
                        <span style={{ fontWeight: "700", fontFamily: "monospace", color: "#2563eb" }}>
                          #{g._id.slice(-6)}
                        </span>
                      </td>

                      <td style={{ padding: "12px 16px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          <strong style={{ color: "#1e293b" }}>{g.name}</strong>
                          <UserRoleBadge grievance={g} />
                        </div>
                        <span style={{ display: "block", fontSize: "0.78rem", color: "#64748b" }}>
                          {g.userId || g.regid} • {g.studentProgram}
                        </span>
                      </td>

                      <td style={{ padding: "12px 16px" }}>
                        <span style={{ fontSize: "0.83rem", color: "#475569", fontWeight: "600" }}>
                          {g.originatingDepartment || "Direct"}
                        </span>
                      </td>

                      <td style={{ padding: "12px 16px" }}>
                        <span
                          style={{
                            background: currentDept === departmentName ? "#ecfdf5" : "#eff6ff",
                            color: currentDept === departmentName ? "#047857" : "#1d4ed8",
                            border: `1px solid ${currentDept === departmentName ? "#a7f3d0" : "#bfdbfe"}`,
                            padding: "3px 10px",
                            borderRadius: "6px",
                            fontWeight: "700",
                            fontSize: "0.82rem",
                            display: "inline-block",
                          }}
                        >
                          {currentDept}
                        </span>
                        {(g.isMultiForwarded || (g.forwardedDepartments && g.forwardedDepartments.length > 1)) && (
                          <div style={{ marginTop: "4px" }}>
                            <span
                              style={{
                                background: "#e0e7ff",
                                color: "#4338ca",
                                border: "1px solid #c7d2fe",
                                padding: "2px 7px",
                                borderRadius: "4px",
                                fontSize: "0.72rem",
                                fontWeight: "700",
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "3px"
                              }}
                              title={`Forwarded concurrently to: ${(g.forwardedDepartments || []).join(", ")}`}
                            >
                              <span>🔀</span> Multi-Dept ({g.forwardedDepartments?.length || (g.linkedGrievances?.length ? g.linkedGrievances.length + 1 : 2)})
                            </span>
                          </div>
                        )}
                      </td>

                      <td style={{ padding: "12px 16px", fontSize: "0.85rem", color: "#334155" }}>
                        {holdingFacultyName ? (
                          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                            <UserIcon width="14" height="14" style={{ color: "#16a34a" }} />
                            <strong>{holdingFacultyName}</strong>
                          </div>
                        ) : (
                          <span style={{ color: "#94a3b8", fontStyle: "italic" }}>
                            Unassigned (With Dept Admin)
                          </span>
                        )}
                      </td>

                      <td style={{ padding: "12px 16px" }}>
                        <span className={`status-badge status-${(g.status || "pending").toLowerCase().replace(" ", "")}`}>
                          {g.status}
                        </span>
                      </td>

                      <td style={{ padding: "12px 16px", maxWidth: "220px", fontSize: "0.82rem" }}>
                        <div
                          style={{
                            background: "#f8fafc",
                            padding: "6px 8px",
                            borderRadius: "6px",
                            border: "1px dashed #cbd5e1",
                            fontStyle: "italic",
                            color: "#475569",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                          title={lastTransfer?.reason}
                        >
                          “{lastTransfer?.reason || "Inter-department routing"}”
                        </div>
                      </td>

                      <td style={{ padding: "12px 16px", textAlign: "center" }}>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (onSelectGrievance) onSelectGrievance(g);
                          }}
                          style={{
                            padding: "6px 12px",
                            backgroundColor: "#2563eb",
                            color: "white",
                            border: "none",
                            borderRadius: "6px",
                            fontWeight: "600",
                            fontSize: "0.8rem",
                            cursor: "pointer",
                            boxShadow: "0 2px 4px rgba(37, 99, 235, 0.2)",
                          }}
                        >
                          View Journey
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards View */}
          <div className="admin-mobile-only" style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {filtered.map((g) => {
              const currentDept = g.currentCustodian?.department || g.category;
              const holdingFacultyName =
                g.currentCustodian?.staffName ||
                staffMap[g.assignedTo] ||
                (g.assignedTo ? `Faculty (${g.assignedTo})` : "Unassigned (With Admin)");

              return (
                <div
                  key={g._id}
                  onClick={() => onSelectGrievance && onSelectGrievance(g)}
                  style={{
                    background: "#ffffff",
                    border: "1px solid #e2e8f0",
                    borderRadius: "12px",
                    padding: "14px",
                    boxShadow: "0 2px 6px rgba(0,0,0,0.04)",
                    cursor: "pointer",
                    display: "flex",
                    flexDirection: "column",
                    gap: "8px",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontWeight: "700", fontFamily: "monospace", color: "#2563eb" }}>
                      #{g._id.slice(-6)}
                    </span>
                    <span className={`status-badge status-${(g.status || "pending").toLowerCase().replace(" ", "")}`}>
                      {g.status}
                    </span>
                  </div>

                  <div>
                    <strong style={{ fontSize: "0.95rem", color: "#0f172a" }}>{g.name}</strong>
                    <span style={{ display: "block", fontSize: "0.8rem", color: "#64748b" }}>
                      {g.userId || g.regid} • {g.studentProgram}
                    </span>
                  </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", background: "#f8fafc", padding: "8px", borderRadius: "8px", fontSize: "0.8rem" }}>
                    <div>
                      <span style={{ color: "#64748b", display: "block" }}>Current Dept:</span>
                      <strong style={{ color: "#1d4ed8" }}>{currentDept}</strong>
                      {(g.isMultiForwarded || (g.forwardedDepartments && g.forwardedDepartments.length > 1)) && (
                        <span style={{ background: "#e0e7ff", color: "#4338ca", padding: "1px 5px", borderRadius: "4px", fontSize: "0.7rem", fontWeight: "700", display: "inline-block", marginTop: "3px" }}>
                          🔀 Multi-Dept
                        </span>
                      )}
                    </div>
                    <div>
                      <span style={{ color: "#64748b", display: "block" }}>Holding Staff:</span>
                      <strong style={{ color: "#1e293b" }}>{holdingFacultyName}</strong>
                    </div>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (onSelectGrievance) onSelectGrievance(g);
                    }}
                    style={{
                      width: "100%",
                      padding: "8px",
                      background: "#2563eb",
                      color: "white",
                      border: "none",
                      borderRadius: "6px",
                      fontWeight: "600",
                      fontSize: "0.82rem",
                      cursor: "pointer",
                      marginTop: "4px",
                    }}
                  >
                    View Custody Journey ➔
                  </button>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

export default InterDepartmentTracker;
