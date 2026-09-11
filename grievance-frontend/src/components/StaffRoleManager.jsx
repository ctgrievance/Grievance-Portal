import React, { useEffect, useState, useCallback } from "react";
import { ShieldIcon, LockIcon, AlertCircleIcon, AdminIcon, CheckCircleIcon, XIcon, UserIcon } from "./Icons";

const DEFAULT_DEPARTMENTS = [
  "Accounts",
  "Admission",
  "CRC (Placement)",
  "Examination",
  "HR",
  "School of Allied Health Sciences",
  "School of Design and innovation",
  "School of Engineering and Technology",
  "School of Hotel Management",
  "School of Law",
  "School of Management Studies",
  "School of Pharmaceutical Sciences",
  "School of Social Sciences and Liberal Arts",
  "Student Section",
  "Student Welfare",
  "Transport"
];

function StaffRoleManager() {
  const [staffList, setStaffList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterRole, setFilterRole] = useState("all"); // all | admins | team | general
  const [sortMode, setSortMode] = useState("admins-first"); // admins-first | alpha

  // Current logged-in user details
  const requesterId = localStorage.getItem("grievance_id");
  const myDept = localStorage.getItem("admin_department"); // e.g. "Student Welfare"
  const isMasterAdmin = localStorage.getItem("is_master_admin") === "true"; // ✅ Dynamic Master Check
  const token = localStorage.getItem("grievance_token");

  // 🔥 Dynamic Departments State
  const [departmentsList, setDepartmentsList] = useState([]);

  // 🔥 Toggle for Danger Zone
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [processingId, setProcessingId] = useState(null); // Tracks which staff ID is being updated
  const [selectedReviewsStaff, setSelectedReviewsStaff] = useState(null); // Staff selected for ratings modal

  useEffect(() => {
    const fetchDepartments = async () => {
      try {
        const res = await fetch(`${process.env.REACT_APP_API_URL || "http://localhost:5000"}/api/departments`);
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data) && data.length > 0) {
            setDepartmentsList(data.map((d) => d.name));
          }
        }
      } catch (err) {
        console.warn("Failed to fetch departments in StaffRoleManager:", err);
      }
    };
    fetchDepartments();
  }, []);

  const fetchStaffList = useCallback(async () => {
    try {
      const res = await fetch(`${process.env.REACT_APP_API_URL || "http://localhost:5000"}/api/admin-staff/all`, {
        headers: { "Authorization": `Bearer ${localStorage.getItem("grievance_token")}` }
      });
      if (res.ok) {
        const data = await res.json();
        setStaffList(data);
      }
    } catch (err) {
      console.error("Failed to fetch staff list");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchStaffList();
  }, [fetchStaffList]);

  const handleRoleChange = async (targetStaffId, action, department) => {
    setMsg("Processing...");

    // Validations
    if (action === "promote" && !department) {
      alert("Please select a department first.");
      setMsg("");
      return;
    }

    // 🔥 NEW: Confirmation for promotion
    if (action === "promote") {
      const confirmed = window.confirm(
        `Assign this person as Admin for ${department}?\n\nNote: If another admin exists for this department, they will be automatically removed.`
      );
      if (!confirmed) {
        setMsg("");
        return;
      }
    }

    setProcessingId(targetStaffId); // ⏳ START LOADING

    try {
      const res = await fetch(`${process.env.REACT_APP_API_URL || "http://localhost:5000"}/api/admin-staff/role`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("grievance_token")}`
        },
        body: JSON.stringify({
          targetStaffId,
          action,      // "promote" or "demote"
          department,  // Selected department
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setMsg(`Success: ${data.message}`);
        fetchStaffList(); // Refresh list to show new roles
      } else {
        setMsg(`Error: ${data.message}`);
      }
    } catch (err) {
      setMsg("❌ Network Error");
    } finally {
      setProcessingId(null); // ✅ STOP LOADING
    }
  };

  const handleTransferOwnership = async (newMasterId) => {
    if (!window.confirm(`⚠️ DANGER: Are you sure you want to transfer MASTER ADMIN rights to ${newMasterId}? You will lose your Master Admin access.`)) return;

    try {
      const res = await fetch(`${process.env.REACT_APP_API_URL || "http://localhost:5000"}/api/admin/transfer-ownership`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("grievance_token")}`
        },
        body: JSON.stringify({ newMasterId })
      });
      const data = await res.json();
      if (res.ok) {
        alert("Ownership Transferred! Please login again.");
        localStorage.clear();
        window.location.href = "/";
      } else {
        alert("Error: " + data.message);
      }
    } catch (err) {
      alert("Server Error");
    }
  };

  // Helper to check if current user can edit target user
  const canEdit = (staff) => {
    if (isMasterAdmin) return true; // Master can edit anyone

    // Dept Admin can only edit:
    // 1. General Staff (Unassigned)
    // 2. Staff assigned to THEIR own department (Team Members)
    // Dept Admin CANNOT edit other Admins or staff from other depts
    if (!staff.adminDepartment) return true;
    if (staff.adminDepartment === myDept && !staff.isDeptAdmin) return true;

    return false;
  };

  return (
    <div className="card" style={{ marginTop: "20px" }}>
      <h2>Manage Staff Roles</h2>
      <p style={{ color: "#64748b", marginBottom: "15px" }}>
        {isMasterAdmin
          ? "Master Privileges: You can appoint Admins for ANY department."
          : `Department Admin: You can add team members to ${myDept}.`}
      </p>

      {msg && <div className="alert-box info" style={{ marginBottom: "15px" }}>{msg}</div>}

      {/* Controls: Search + Filter + Sort */}
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 12, flexWrap: 'wrap' }}>
        <input
          placeholder="Search by name or ID..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{ padding: '8px 10px', flex: '1 1 200px', minWidth: '160px' }}
        />

        <select value={filterRole} onChange={(e) => setFilterRole(e.target.value)} style={{ padding: '8px', flex: '1 1 130px' }}>
          <option value="all">All</option>
          <option value="admins">Admins (Dept Admin)</option>
          <option value="team">Admin Staff (Team Members)</option>
          <option value="general">General Staff</option>
        </select>

        <select value={sortMode} onChange={(e) => setSortMode(e.target.value)} style={{ padding: '8px', flex: '1 1 130px' }}>
          <option value="admins-first">Admins First</option>
          <option value="alpha">Name A → Z</option>
          <option value="rating-high">Highest Rated</option>
          <option value="rating-low">Lowest Rated</option>
        </select>

        {/* 🔥 NEW: Advanced Toggle */}
        {isMasterAdmin && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px', marginLeft: 'auto' }}>
            <span style={{ fontSize: '0.75rem', color: showAdvanced ? '#ef4444' : '#64748b', fontWeight: '600', transition: 'color 0.3s' }}>
              Advanced Mode
            </span>
            <label className="toggle-switch-label">
              <input
                type="checkbox"
                className="toggle-switch-input"
                checked={showAdvanced}
                onChange={(e) => setShowAdvanced(e.target.checked)}
              />
              <span className="toggle-slider"></span>
            </label>
          </div>
        )}
      </div>

      {loading ? (
        <p>Loading staff list...</p>
      ) : (
        <div className="table-container">
          <table className="grievance-table">
            <thead>
              <tr>
                <th>Staff ID</th>
                <th>Name</th>
                <th>Current Role</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {(() => {
                const q = searchQuery.trim().toLowerCase();
                // ✅ Filter: Exclude Students (8-digit IDs)
                let list = staffList.filter(s => s.id.length !== 8);

                if (filterRole === 'admins') list = list.filter(s => s.isDeptAdmin);
                else if (filterRole === 'team') list = list.filter(s => s.adminDepartment && !s.isDeptAdmin);
                else if (filterRole === 'general') list = list.filter(s => !s.adminDepartment);

                if (q) {
                  list = list.filter(s => (s.fullName || '').toLowerCase().includes(q) || (s.id || '').toLowerCase().includes(q));
                }

                if (sortMode === 'admins-first') {
                  list.sort((a, b) => {
                    if (a.isDeptAdmin && !b.isDeptAdmin) return -1;
                    if (!a.isDeptAdmin && b.isDeptAdmin) return 1;
                    const aTeam = a.adminDepartment && !a.isDeptAdmin;
                    const bTeam = b.adminDepartment && !b.isDeptAdmin;
                    if (aTeam && !bTeam) return -1;
                    if (!aTeam && bTeam) return 1;
                    return (a.fullName || '').localeCompare(b.fullName || '');
                  });
                } else if (sortMode === 'alpha') {
                  list.sort((a, b) => (a.fullName || '').localeCompare(b.fullName || ''));
                } else if (sortMode === 'rating-high') {
                  list.sort((a, b) => {
                    const aR = a.averageRating !== null && a.averageRating !== undefined ? a.averageRating : -1;
                    const bR = b.averageRating !== null && b.averageRating !== undefined ? b.averageRating : -1;
                    if (bR !== aR) return bR - aR;
                    return (b.totalRatings || 0) - (a.totalRatings || 0);
                  });
                } else if (sortMode === 'rating-low') {
                  list.sort((a, b) => {
                    const aR = a.averageRating !== null && a.averageRating !== undefined ? a.averageRating : 999;
                    const bR = b.averageRating !== null && b.averageRating !== undefined ? b.averageRating : 999;
                    if (aR !== bR) return aR - bR;
                    return (a.totalRatings || 0) - (b.totalRatings || 0);
                  });
                }

                return list.map((staff) => (
                  <tr key={staff.id}>
                    <td>{staff.id}</td>
                    <td>
                      <div style={{ fontWeight: "600", color: "#1e293b", fontSize: "0.95rem" }}>
                        {staff.fullName}
                      </div>

                      {/* ⭐ Staff Average Rating in Marked Location */}
                      {staff.totalRatings > 0 && staff.averageRating !== null ? (
                        <div
                          onClick={() => setSelectedReviewsStaff(staff)}
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "6px",
                            marginTop: "4px",
                            background: "linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)",
                            border: "1px solid #fde68a",
                            padding: "2px 8px",
                            borderRadius: "14px",
                            fontSize: "0.78rem",
                            cursor: "pointer",
                            transition: "all 0.2s ease",
                            boxShadow: "0 1px 3px rgba(245, 158, 11, 0.1)"
                          }}
                          title={`Click to view ${staff.totalRatings} student reviews for ${staff.fullName}`}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.transform = "scale(1.03)";
                            e.currentTarget.style.boxShadow = "0 3px 8px rgba(245, 158, 11, 0.25)";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.transform = "scale(1)";
                            e.currentTarget.style.boxShadow = "0 1px 3px rgba(245, 158, 11, 0.1)";
                          }}
                        >
                          <span style={{ color: "#f59e0b", letterSpacing: "1px", fontSize: "0.85rem" }}>
                            {"★".repeat(Math.round(staff.averageRating))}
                            <span style={{ color: "#d1d5db" }}>{"★".repeat(5 - Math.round(staff.averageRating))}</span>
                          </span>
                          <span style={{ fontWeight: "700", color: "#b45309" }}>
                            {Number(staff.averageRating).toFixed(1)}
                          </span>
                          <span style={{ color: "#78350f", fontSize: "0.72rem", opacity: 0.85 }}>
                            ({staff.totalRatings})
                          </span>
                        </div>
                      ) : (
                        <div
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "4px",
                            marginTop: "4px",
                            color: "#94a3b8",
                            fontSize: "0.76rem"
                          }}
                          title="No student ratings received yet"
                        >
                          <span style={{ color: "#cbd5e1" }}>★</span>
                          <span>No ratings yet</span>
                        </div>
                      )}
                    </td>

                    <td>
                      {staff.isDeptAdmin ? (
                        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                          {(() => {
                            const depts = (Array.isArray(staff.adminDepartments) && staff.adminDepartments.length > 0)
                              ? staff.adminDepartments
                              : (staff.adminDepartment ? [staff.adminDepartment] : []);
                            return (
                              <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                                {depts.map(d => (
                                  <span
                                    key={d}
                                    className="status-badge status-resolved"
                                    style={{ border: '1px solid #16a34a', padding: '4px 8px', display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem' }}
                                  >
                                    <AdminIcon width="12" height="12" /> Admin: {d}
                                    {isMasterAdmin && (
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          if (window.confirm(`Remove Admin role for "${d}" from ${staff.fullName}?`)) {
                                            handleRoleChange(staff.id, "demote", d);
                                          }
                                        }}
                                        style={{
                                          background: "none",
                                          border: "none",
                                          color: "#dc2626",
                                          cursor: "pointer",
                                          fontWeight: "bold",
                                          padding: "0 2px",
                                          fontSize: "0.85rem",
                                          lineHeight: 1
                                        }}
                                        title={`Revoke ${d} admin role`}
                                      >
                                        ✕
                                      </button>
                                    )}
                                  </span>
                                ))}
                              </div>
                            );
                          })()}
                        </div>
                      ) : staff.adminDepartment ? (
                        <span
                          className="status-badge status-assigned"
                          style={{ border: '1px solid #2563eb', padding: '5px 10px', display: 'inline-flex', alignItems: 'center', gap: '5px' }}
                        >
                          <ShieldIcon width="14" height="14" /> Team: {staff.adminDepartment}
                        </span>
                      ) : (
                        <span className="status-badge status-pending">General Staff</span>
                      )}
                    </td>

                    <td>
                      {processingId === staff.id ? (
                        <div className="modern-loadbar"></div>
                      ) : (
                        !canEdit(staff) ? (
                          <span style={{ color: '#94a3b8', fontSize: '0.85rem', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                            <LockIcon width="14" height="14" /> Locked
                          </span>
                        ) : (
                          <>
                            {staff.isDeptAdmin && isMasterAdmin ? (
                              /* Multi-Dept Admin Action: Add Another Department or Remove */
                              <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
                                {(() => {
                                  const depts = (Array.isArray(staff.adminDepartments) && staff.adminDepartments.length > 0)
                                    ? staff.adminDepartments
                                    : (staff.adminDepartment ? [staff.adminDepartment] : []);
                                  const allDepts = departmentsList.length > 0 ? departmentsList : DEFAULT_DEPARTMENTS;
                                  const availableToAdd = allDepts.filter(d => !depts.includes(d));

                                  return (
                                    <>
                                      {availableToAdd.length > 0 && (
                                        <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                                          <select
                                            id={`add-dept-${staff.id}`}
                                            className="modern-select-dept"
                                            defaultValue=""
                                            style={{ minWidth: "140px", padding: "6px 8px", fontSize: "0.82rem" }}
                                          >
                                            <option value="" disabled>+ Add Dept Head...</option>
                                            {availableToAdd.map(d => (
                                              <option key={d} value={d}>{d}</option>
                                            ))}
                                          </select>
                                          <button
                                            className="btn-action-modern btn-action-modern-success"
                                            style={{ minWidth: "95px", padding: "6px 10px", fontSize: "0.82rem" }}
                                            onClick={() => {
                                              const selectElem = document.getElementById(`add-dept-${staff.id}`);
                                              if (!selectElem || !selectElem.value) return alert("Please select a department to add.");
                                              handleRoleChange(staff.id, "promote", selectElem.value);
                                            }}
                                            title="Assign an additional department head role"
                                          >
                                            <ShieldIcon width="12" height="12" /> + Add
                                          </button>
                                        </div>
                                      )}
                                      <button
                                        className="btn-action-modern btn-action-modern-danger"
                                        style={{ minWidth: "110px", padding: "6px 10px", fontSize: "0.82rem" }}
                                        onClick={() => {
                                          if (window.confirm(`Are you sure you want to remove all admin roles from ${staff.fullName}? They will revert to General Staff.`)) {
                                            handleRoleChange(staff.id, "demote");
                                          }
                                        }}
                                      >
                                        <XIcon width="12" height="12" /> Remove All
                                      </button>
                                    </>
                                  );
                                })()}
                              </div>
                            ) : staff.adminDepartment ? (
                              <button
                                className="btn-action-modern btn-action-modern-danger"
                                style={{ minWidth: "160px" }}
                                onClick={() => handleRoleChange(staff.id, "demote")}
                              >
                                <XIcon width="14" height="14" /> {staff.isDeptAdmin ? "Remove Admin" : "Remove from Team"}
                              </button>
                            ) : (
                              <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                                <select
                                  id={`dept-${staff.id}`}
                                  className="modern-select-dept"
                                  disabled={!isMasterAdmin}
                                  defaultValue={isMasterAdmin ? "" : myDept}
                                >
                                  <option value="" disabled>Select Dept...</option>
                                  {(departmentsList.length > 0 ? departmentsList : DEFAULT_DEPARTMENTS).map(d => (
                                    <option key={d} value={d}>{d}</option>
                                  ))}
                                </select>

                                <button
                                  className="btn-action-modern btn-action-modern-success"
                                  style={{ minWidth: "140px" }}
                                  onClick={() => {
                                    const deptSelect = document.getElementById(`dept-${staff.id}`);
                                    handleRoleChange(staff.id, "promote", deptSelect.value);
                                  }}
                                >
                                  <ShieldIcon width="14" height="14" /> {isMasterAdmin ? "Make Admin" : "Add to Team"}
                                </button>
                              </div>
                            )}
                            {/* 🔥 HIDDEN BY DEFAULT: Transfer Ownership Button */}
                            {isMasterAdmin && showAdvanced && (
                              <button
                                className="btn-action-modern btn-action-modern-purple"
                                style={{ marginLeft: "10px", minWidth: "140px" }}
                                onClick={() => handleTransferOwnership(staff.id)}
                                title="Transfer your Master Admin role to this user"
                              >
                                <UserIcon width="14" height="14" /> Transfer Owner
                              </button>
                            )}
                          </>
                        )
                      )}
                    </td>
                  </tr>
                ));
              })()}
            </tbody>
          </table>
        </div>
      )}

      {/* ⭐ STAFF STUDENT REVIEWS MODAL */}
      {selectedReviewsStaff && (
        <div
          className="modal-overlay"
          onClick={() => setSelectedReviewsStaff(null)}
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(15, 23, 42, 0.6)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: "20px"
          }}
        >
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: "#ffffff",
              borderRadius: "16px",
              maxWidth: "560px",
              width: "100%",
              maxHeight: "85vh",
              overflowY: "auto",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
              border: "1px solid #e2e8f0",
              padding: "24px"
            }}
          >
            {/* Modal Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px" }}>
              <div>
                <h3 style={{ margin: 0, color: "#0f172a", fontSize: "1.25rem", fontWeight: "700" }}>
                  Staff Ratings & Feedback
                </h3>
                <p style={{ margin: "4px 0 0 0", color: "#64748b", fontSize: "0.85rem" }}>
                  {selectedReviewsStaff.fullName} (ID: {selectedReviewsStaff.id})
                </p>
              </div>
              <button
                onClick={() => setSelectedReviewsStaff(null)}
                style={{
                  background: "#f1f5f9",
                  border: "none",
                  borderRadius: "8px",
                  padding: "6px 10px",
                  cursor: "pointer",
                  fontSize: "1rem",
                  color: "#64748b",
                  fontWeight: "700"
                }}
              >
                ✕
              </button>
            </div>

            {/* Score Summary Box */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "14px 18px",
                background: "linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)",
                borderRadius: "12px",
                border: "1px solid #fde68a",
                marginBottom: "20px"
              }}
            >
              <div>
                <div style={{ fontSize: "2rem", fontWeight: "800", color: "#92400e", lineHeight: 1 }}>
                  {Number(selectedReviewsStaff.averageRating || 0).toFixed(1)}
                  <span style={{ fontSize: "1rem", fontWeight: "500", color: "#b45309" }}> / 5.0</span>
                </div>
                <div style={{ marginTop: "4px", color: "#f59e0b", fontSize: "1.1rem" }}>
                  {"★".repeat(Math.round(selectedReviewsStaff.averageRating || 0))}
                  <span style={{ color: "#d1d5db" }}>{"★".repeat(5 - Math.round(selectedReviewsStaff.averageRating || 0))}</span>
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <span
                  style={{
                    display: "inline-block",
                    background: "#ffffff",
                    padding: "4px 12px",
                    borderRadius: "20px",
                    fontWeight: "600",
                    color: "#78350f",
                    fontSize: "0.85rem",
                    border: "1px solid #fde68a"
                  }}
                >
                  {selectedReviewsStaff.totalRatings} Total {selectedReviewsStaff.totalRatings === 1 ? "Rating" : "Ratings"}
                </span>
                <div style={{ fontSize: "0.75rem", color: "#92400e", marginTop: "4px" }}>
                  Department: {selectedReviewsStaff.adminDepartment || "General"}
                </div>
              </div>
            </div>

            {/* Individual Reviews List */}
            <h4 style={{ margin: "0 0 12px 0", color: "#334155", fontSize: "0.95rem", fontWeight: "600" }}>
              Student Reviews ({selectedReviewsStaff.ratingsList?.length || 0})
            </h4>

            {(!selectedReviewsStaff.ratingsList || selectedReviewsStaff.ratingsList.length === 0) ? (
              <p style={{ color: "#94a3b8", fontSize: "0.9rem", textAlign: "center", padding: "20px 0" }}>
                No student reviews recorded yet.
              </p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                {selectedReviewsStaff.ratingsList.map((rev, idx) => (
                  <div
                    key={idx}
                    style={{
                      padding: "14px",
                      background: "#f8fafc",
                      borderRadius: "10px",
                      border: "1px solid #e2e8f0"
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <span style={{ color: "#f59e0b", fontSize: "1rem" }}>
                          {"★".repeat(rev.stars || 0)}
                          <span style={{ color: "#cbd5e1" }}>{"★".repeat(5 - (rev.stars || 0))}</span>
                        </span>
                        <span style={{ fontWeight: "700", color: "#334155", fontSize: "0.85rem" }}>
                          {rev.stars}.0 / 5
                        </span>
                      </div>
                      <span style={{ fontSize: "0.75rem", color: "#94a3b8" }}>
                        {rev.ratedAt ? new Date(rev.ratedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "Recently"}
                      </span>
                    </div>

                    {rev.feedback ? (
                      <p style={{ margin: "6px 0 0 0", color: "#1e293b", fontSize: "0.88rem", fontStyle: "italic" }}>
                        “{rev.feedback}”
                      </p>
                    ) : (
                      <p style={{ margin: "6px 0 0 0", color: "#94a3b8", fontSize: "0.8rem" }}>
                        (No written feedback provided)
                      </p>
                    )}

                    <div style={{ marginTop: "6px", fontSize: "0.72rem", color: "#64748b" }}>
                      Category: {rev.category || "General"}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Modal Footer */}
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "20px" }}>
              <button
                onClick={() => setSelectedReviewsStaff(null)}
                style={{
                  padding: "8px 20px",
                  background: "#0f172a",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: "8px",
                  fontWeight: "600",
                  cursor: "pointer",
                  fontSize: "0.85rem"
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default StaffRoleManager;