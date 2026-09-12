import React, { useEffect, useState, useCallback, useMemo } from "react";
import {
  ShieldIcon,
  LockIcon,
  AlertCircleIcon,
  CheckCircleIcon,
  XIcon,
  UserIcon,
  SearchIcon,
  EditIcon,
  StarIcon
} from "./Icons";

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
  const [msgType, setMsgType] = useState("info"); // success | error | info
  const [searchQuery, setSearchQuery] = useState("");
  const [filterDept, setFilterDept] = useState("all");
  const [filterRole, setFilterRole] = useState("all"); // all | admins | team | general
  const [sortMode, setSortMode] = useState("admins-first"); // admins-first | alpha | rating-high | rating-low

  // Current logged-in user details
  const requesterId = localStorage.getItem("grievance_id");
  const myDept = localStorage.getItem("admin_department"); // e.g. "Student Welfare"
  const isMasterAdmin = localStorage.getItem("is_master_admin") === "true";

  // Dynamic Departments State
  const [departmentsList, setDepartmentsList] = useState([]);

  // Modal States
  const [selectedStaffForManage, setSelectedStaffForManage] = useState(null);
  const [selectedReviewsStaff, setSelectedReviewsStaff] = useState(null);
  const [processingId, setProcessingId] = useState(null);
  const [selectedDeptToAssign, setSelectedDeptToAssign] = useState("");

  // Auto-clear message notification
  useEffect(() => {
    if (!msg) return;
    const timer = setTimeout(() => {
      setMsg("");
    }, 4000);
    return () => clearTimeout(timer);
  }, [msg]);

  // Fetch all departments
  useEffect(() => {
    const fetchDepartments = async () => {
      try {
        const res = await fetch(
          `${process.env.REACT_APP_API_URL || "http://localhost:5000"}/api/departments`
        );
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

  // Fetch staff list from backend
  const fetchStaffList = useCallback(async () => {
    try {
      const res = await fetch(
        `${process.env.REACT_APP_API_URL || "http://localhost:5000"}/api/admin-staff/all`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("grievance_token")}`
          }
        }
      );
      if (res.ok) {
        const data = await res.json();
        setStaffList(data);
        return data;
      }
    } catch (err) {
      console.error("Failed to fetch staff list:", err);
    } finally {
      setLoading(false);
    }
    return null;
  }, []);

  useEffect(() => {
    fetchStaffList();
  }, [fetchStaffList]);

  // Handle Role Promote or Demote
  const handleRoleChange = async (targetStaffId, action, department) => {
    if (action === "promote" && !department) {
      alert("Please select a department first.");
      return;
    }

    if (action === "promote") {
      const confirmed = window.confirm(
        `Appoint as Department Head for "${department}"?\n\nNote: If another admin currently exists for this department, they will be reassigned as General Staff.`
      );
      if (!confirmed) return;
    }

    setProcessingId(targetStaffId);
    setMsg("Updating staff role permissions...");
    setMsgType("info");

    try {
      const res = await fetch(
        `${process.env.REACT_APP_API_URL || "http://localhost:5000"}/api/admin-staff/role`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("grievance_token")}`
          },
          body: JSON.stringify({
            targetStaffId,
            action,
            department
          })
        }
      );

      const data = await res.json();
      if (res.ok) {
        setMsg(data.message || "Role updated successfully.");
        setMsgType("success");
        const updatedList = await fetchStaffList();

        // If managing modal is open for this user, refresh their data live inside the modal
        if (updatedList && selectedStaffForManage?.id === targetStaffId) {
          const fresh = updatedList.find((s) => s.id === targetStaffId);
          if (fresh) {
            setSelectedStaffForManage(fresh);
          }
        }
        setSelectedDeptToAssign("");
      } else {
        setMsg(data.message || "Failed to update role.");
        setMsgType("error");
      }
    } catch (err) {
      setMsg("Network connection error. Please try again.");
      setMsgType("error");
    } finally {
      setProcessingId(null);
    }
  };

  // Transfer Ownership (Master Admin Only)
  const handleTransferOwnership = async (newMasterId, staffName) => {
    const confirmTransfer = window.confirm(
      `CRITICAL: Transfer MASTER ADMINISTRATOR rights to ${staffName} (${newMasterId})?\n\nYou will forfeit master access and be logged out.`
    );
    if (!confirmTransfer) return;

    try {
      const res = await fetch(
        `${process.env.REACT_APP_API_URL || "http://localhost:5000"}/api/admin/transfer-ownership`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("grievance_token")}`
          },
          body: JSON.stringify({ newMasterId })
        }
      );
      const data = await res.json();
      if (res.ok) {
        alert("Ownership successfully transferred. Please login again.");
        localStorage.clear();
        window.location.href = "/";
      } else {
        alert("Error: " + (data.message || "Could not transfer ownership"));
      }
    } catch (err) {
      alert("Server error occurred while transferring ownership.");
    }
  };

  // Helper to check if a staff member belongs to a department
  // Matches registered department, profile department, or assigned admin department
  const isStaffInDepartment = (staff, targetDept) => {
    if (!staff || !targetDept) return false;
    const target = targetDept.trim().toLowerCase();

    // 1. Registered or profile department
    const registeredDept = (staff.staffDepartment || staff.department || "").trim().toLowerCase();

    // 2. Assigned admin departments
    const assignedDepts = [
      ...(Array.isArray(staff.adminDepartments) ? staff.adminDepartments : []),
      staff.adminDepartment
    ].filter(Boolean).map((d) => d.trim().toLowerCase());

    const checkMatch = (deptStr) => {
      if (!deptStr) return false;
      const d = deptStr.toLowerCase();
      if (d === target) return true;

      // Normalize '&' to 'and' for robust matching
      const normD = d.replace(/&/g, 'and');
      const normTarget = target.replace(/&/g, 'and');

      if (normD === normTarget) return true;

      // Special match for CRC / Placement variations
      const isCrcTarget = normTarget.includes("crc") || normTarget.includes("placement");
      if (isCrcTarget && (normD.includes("crc") || normD.includes("placement"))) return true;

      // Substring match for lengthy titles (e.g. "School of Engineering and Technology")
      if (normD.length > 4 && (normTarget.includes(normD) || normD.includes(normTarget))) return true;

      return false;
    };

    if (checkMatch(registeredDept)) return true;
    if (assignedDepts.some(checkMatch)) return true;

    return false;
  };

  // Check whether logged-in user can edit target staff
  const canEdit = (staff) => {
    if (isMasterAdmin) return true;
    if (staff.id === requesterId && staff.isDeptAdmin) return false;
    return isStaffInDepartment(staff, myDept);
  };

  // All valid departments list
  const allDepartments = useMemo(() => {
    return departmentsList.length > 0 ? departmentsList : DEFAULT_DEPARTMENTS;
  }, [departmentsList]);

  // Clean staff list (exclude student 8-digit IDs)
  // When logged in as Department Admin (!isMasterAdmin), scope ONLY to myDept!
  const validStaffList = useMemo(() => {
    const nonStudents = staffList.filter((s) => s.id && s.id.length !== 8);
    if (isMasterAdmin) {
      return nonStudents;
    }
    // Department Admin: ONLY show staff from their department (registration, profile, or assignment)
    return nonStudents.filter((s) => isStaffInDepartment(s, myDept));
  }, [staffList, isMasterAdmin, myDept]);

  // Summary Metrics
  const totalStaffCount = validStaffList.length;
  const adminStaffCount = validStaffList.filter((s) => s.isDeptAdmin).length;
  const teamStaffCount = validStaffList.filter((s) => s.adminDepartment && !s.isDeptAdmin).length;
  const generalStaffCount = validStaffList.filter((s) => !s.adminDepartment).length;

  // Filtered & Sorted Staff List
  const filteredStaffList = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    let list = [...validStaffList];

    // Role filter
    if (filterRole === "admins") {
      list = list.filter((s) => s.isDeptAdmin);
    } else if (filterRole === "team") {
      list = list.filter((s) => s.adminDepartment && !s.isDeptAdmin);
    } else if (filterRole === "general") {
      list = list.filter((s) => !s.adminDepartment);
    }

    // Department filter (only applicable when Master Admin selects a specific department)
    if (isMasterAdmin && filterDept !== "all") {
      list = list.filter((s) => isStaffInDepartment(s, filterDept));
    }

    // Search query
    if (q) {
      list = list.filter(
        (s) =>
          (s.fullName || "").toLowerCase().includes(q) ||
          (s.id || "").toLowerCase().includes(q) ||
          (s.adminDepartment || "").toLowerCase().includes(q) ||
          (s.staffDepartment || "").toLowerCase().includes(q) ||
          (s.department || "").toLowerCase().includes(q)
      );
    }

    // Sorting
    if (sortMode === "admins-first") {
      list.sort((a, b) => {
        if (a.isDeptAdmin && !b.isDeptAdmin) return -1;
        if (!a.isDeptAdmin && b.isDeptAdmin) return 1;
        const aTeam = a.adminDepartment && !a.isDeptAdmin;
        const bTeam = b.adminDepartment && !b.isDeptAdmin;
        if (aTeam && !bTeam) return -1;
        if (!aTeam && bTeam) return 1;
        return (a.fullName || "").localeCompare(b.fullName || "");
      });
    } else if (sortMode === "alpha") {
      list.sort((a, b) => (a.fullName || "").localeCompare(b.fullName || ""));
    } else if (sortMode === "rating-high") {
      list.sort((a, b) => {
        const aR = a.averageRating !== null && a.averageRating !== undefined ? a.averageRating : -1;
        const bR = b.averageRating !== null && b.averageRating !== undefined ? b.averageRating : -1;
        if (bR !== aR) return bR - aR;
        return (b.totalRatings || 0) - (a.totalRatings || 0);
      });
    } else if (sortMode === "rating-low") {
      list.sort((a, b) => {
        const aR = a.averageRating !== null && a.averageRating !== undefined ? a.averageRating : 999;
        const bR = b.averageRating !== null && b.averageRating !== undefined ? b.averageRating : 999;
        if (aR !== bR) return aR - bR;
        return (a.totalRatings || 0) - (b.totalRatings || 0);
      });
    }

    return list;
  }, [validStaffList, filterRole, filterDept, isMasterAdmin, searchQuery, sortMode]);

  // Helper to get array of assigned departments for a staff member
  const getStaffDepartments = (staff) => {
    if (!staff) return [];
    if (Array.isArray(staff.adminDepartments) && staff.adminDepartments.length > 0) {
      return staff.adminDepartments;
    }
    if (staff.adminDepartment) {
      return [staff.adminDepartment];
    }
    return [];
  };

  const hasActiveFilters = searchQuery !== "" || filterRole !== "all" || filterDept !== "all";

  const handleResetFilters = () => {
    setSearchQuery("");
    setFilterRole("all");
    setFilterDept("all");
    setSortMode("admins-first");
  };

  return (
    <div className="staff-mgr-container">
      {/* HEADER WITH AUTHORITY BADGE */}
      <div className="staff-mgr-header">
        <div className="staff-mgr-title-group">
          <h2>Staff & Role Management</h2>
          <p>
            {isMasterAdmin
              ? "Appoint department heads, assign team responsibilities, and monitor administrative coverage."
              : `Manage staff assignments and team roles for ${myDept}.`}
          </p>
        </div>

        <div className="staff-mgr-meta-badges">
          {isMasterAdmin ? (
            <span className="staff-authority-badge master">
              <ShieldIcon width="14" height="14" />
              Master Administrator • All Departments
            </span>
          ) : (
            <span className="staff-authority-badge dept">
              <ShieldIcon width="14" height="14" />
              Department Admin • {myDept}
            </span>
          )}
        </div>
      </div>

      {/* KPI METRIC SUMMARY */}
      <div className="staff-kpi-ribbon">
        <div className="staff-kpi-item">
          <span className="label">Total Staff</span>
          <div className="val">{totalStaffCount}</div>
        </div>
        <div className="staff-kpi-item">
          <span className="label">Department Heads</span>
          <div className="val">{adminStaffCount}</div>
        </div>
        <div className="staff-kpi-item">
          <span className="label">Team Members</span>
          <div className="val">{teamStaffCount}</div>
        </div>
        <div className="staff-kpi-item">
          <span className="label">General Staff</span>
          <div className="val">{generalStaffCount}</div>
        </div>
      </div>

      {/* ALERT NOTIFICATION */}
      {msg && (
        <div
          className={`reg-users-alert ${msgType === "error" ? "error" : "success"}`}
          style={{ marginBottom: "16px" }}
        >
          {msgType === "error" ? (
            <AlertCircleIcon width="16" height="16" />
          ) : (
            <CheckCircleIcon width="16" height="16" />
          )}
          <span>{msg}</span>
        </div>
      )}

      {/* COMPACT FILTER & SEARCH BAR (DESKTOP INLINE, MOBILE 2x2 GRID) */}
      <div className="staff-filters-bar">
        <div className="staff-search-box">
          <span className="staff-search-icon">
            <SearchIcon width="15" height="15" />
          </span>
          <input
            type="text"
            className="staff-search-input"
            placeholder="Search by name, ID, or department..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="staff-filter-actions">
          {/* Department Filter - Only for Master Admin, fixed for Department Admin */}
          {isMasterAdmin ? (
            <select
              className="staff-filter-select"
              value={filterDept}
              onChange={(e) => setFilterDept(e.target.value)}
            >
              <option value="all">All Departments</option>
              {allDepartments.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          ) : (
            <div
              className="staff-dept-badge-fixed"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "6px 12px",
                borderRadius: "6px",
                background: "#f1f5f9",
                border: "1px solid #cbd5e1",
                fontSize: "0.82rem",
                fontWeight: "600",
                color: "#334155"
              }}
            >
              <ShieldIcon width="13" height="13" color="#64748b" />
              <span>{myDept || "My Department"}</span>
            </div>
          )}

          {/* Role Filter */}
          <select
            className="staff-filter-select"
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value)}
          >
            <option value="all">All Roles</option>
            <option value="admins">Department Heads</option>
            <option value="team">Team Staff</option>
            <option value="general">General Staff</option>
          </select>

          {/* Sort Order */}
          <select
            className="staff-filter-select"
            value={sortMode}
            onChange={(e) => setSortMode(e.target.value)}
          >
            <option value="admins-first">Sort: Admins First</option>
            <option value="alpha">Sort: Name (A → Z)</option>
            <option value="rating-high">Sort: Highest Rated</option>
            <option value="rating-low">Sort: Lowest Rated</option>
          </select>

          {hasActiveFilters && (
            <button className="staff-btn-reset" onClick={handleResetFilters}>
              <XIcon width="13" height="13" /> Clear
            </button>
          )}
        </div>
      </div>

      {/* MAIN CONTENT AREA */}
      {loading ? (
        <div style={{ padding: "40px", textAlign: "center", color: "#64748b" }}>
          Loading staff directory...
        </div>
      ) : filteredStaffList.length === 0 ? (
        <div style={{ padding: "40px 20px", textAlign: "center", color: "#64748b", background: "#f8fafc", borderRadius: "12px", border: "1px dashed #cbd5e1" }}>
          <p style={{ margin: 0, fontWeight: "600", fontSize: "0.95rem" }}>No staff members match your criteria</p>
          <p style={{ margin: "4px 0 0 0", fontSize: "0.85rem" }}>Try adjusting your search query or role filter.</p>
        </div>
      ) : (
        <>
          {/* DESKTOP TABLE VIEW */}
          <div className="table-container staff-desktop-table">
            <table className="staff-desktop-table">
              <thead>
                <tr>
                  <th style={{ width: "38%" }}>Staff Member</th>
                  <th style={{ width: "42%" }}>Assigned Roles & Departments</th>
                  <th style={{ width: "20%", textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredStaffList.map((staff) => {
                  const staffDepts = getStaffDepartments(staff);
                  const isStaffAdmin = staff.isDeptAdmin;
                  const isStaffTeam = Boolean(staff.adminDepartment && !staff.isDeptAdmin);
                  const isEditable = canEdit(staff);

                  return (
                    <tr key={staff.id}>
                      {/* STAFF MEMBER COLUMN (CLEAN, NO LOGO CIRCLES) */}
                      <td>
                        <div className="staff-info-cell">
                          <div className="staff-name-wrap">
                            <span className="staff-full-name">{staff.fullName}</span>
                            <span className="staff-id-pill">#{staff.id}</span>

                            {/* Ratings Pill */}
                            {staff.totalRatings > 0 && staff.averageRating !== null ? (
                              <div
                                className="staff-rating-pill"
                                onClick={() => setSelectedReviewsStaff(staff)}
                                title={`Click to view ${staff.totalRatings} student reviews`}
                              >
                                <span className="star-icon">
                                  <StarIcon width="13" height="13" />
                                </span>
                                <span>{Number(staff.averageRating).toFixed(1)}</span>
                                <span className="count">({staff.totalRatings})</span>
                              </div>
                            ) : (
                              <span className="staff-rating-none">
                                <StarIcon width="11" height="11" /> No ratings yet
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* ASSIGNED ROLES COLUMN */}
                      <td>
                        <div className="staff-roles-container">
                          {isStaffAdmin ? (
                            staffDepts.length > 0 ? (
                              staffDepts.map((dept) => (
                                <span key={dept} className="staff-role-pill head">
                                  <ShieldIcon width="12" height="12" /> Head: {dept}
                                </span>
                              ))
                            ) : (
                              <span className="staff-role-pill head">
                                <ShieldIcon width="12" height="12" /> Department Admin
                              </span>
                            )
                          ) : isStaffTeam ? (
                            <span className="staff-role-pill team">
                              <UserIcon width="12" height="12" /> Team: {staff.adminDepartment}
                            </span>
                          ) : (
                            <span className="staff-role-pill general">
                              General Staff{staff.staffDepartment ? ` • ${staff.staffDepartment}` : ""}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* ACTION COLUMN */}
                      <td style={{ textAlign: "right" }}>
                        {isEditable ? (
                          <button
                            className="staff-manage-btn"
                            onClick={() => {
                              setSelectedStaffForManage(staff);
                              setSelectedDeptToAssign("");
                            }}
                          >
                            <EditIcon width="13" height="13" /> Manage Role
                          </button>
                        ) : (
                          <span className="staff-locked-pill" title="You do not have permission to modify this staff member's role">
                            <LockIcon width="12" height="12" /> Locked
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* MOBILE CARDS VIEW (CLEAN, NO LOGO CIRCLES) */}
          <div className="staff-mobile-cards">
            {filteredStaffList.map((staff) => {
              const staffDepts = getStaffDepartments(staff);
              const isStaffAdmin = staff.isDeptAdmin;
              const isStaffTeam = Boolean(staff.adminDepartment && !staff.isDeptAdmin);
              const isEditable = canEdit(staff);

              return (
                <div key={staff.id} className="staff-mobile-card">
                  <div className="staff-mobile-card-top">
                    <div className="staff-name-wrap">
                      <span className="staff-full-name">{staff.fullName}</span>
                      <span className="staff-id-pill">#{staff.id}</span>
                    </div>

                    {/* Ratings in top corner */}
                    {staff.totalRatings > 0 && staff.averageRating !== null ? (
                      <div
                        className="staff-rating-pill"
                        onClick={() => setSelectedReviewsStaff(staff)}
                      >
                        <span className="star-icon">
                          <StarIcon width="13" height="13" />
                        </span>
                        <span>{Number(staff.averageRating).toFixed(1)}</span>
                        <span className="count">({staff.totalRatings})</span>
                      </div>
                    ) : (
                      <span className="staff-rating-none">Unrated</span>
                    )}
                  </div>

                  {/* Roles */}
                  <div className="staff-roles-container">
                    {isStaffAdmin ? (
                      staffDepts.length > 0 ? (
                        staffDepts.map((dept) => (
                          <span key={dept} className="staff-role-pill head">
                            <ShieldIcon width="12" height="12" /> Head: {dept}
                          </span>
                        ))
                      ) : (
                        <span className="staff-role-pill head">
                          <ShieldIcon width="12" height="12" /> Department Admin
                        </span>
                      )
                    ) : isStaffTeam ? (
                      <span className="staff-role-pill team">
                        <UserIcon width="12" height="12" /> Team: {staff.adminDepartment}
                      </span>
                    ) : (
                      <span className="staff-role-pill general">
                        General Staff{staff.staffDepartment ? ` • ${staff.staffDepartment}` : ""}
                      </span>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="staff-mobile-card-actions">
                    {isEditable ? (
                      <button
                        className="staff-mobile-manage-btn"
                        onClick={() => {
                          setSelectedStaffForManage(staff);
                          setSelectedDeptToAssign("");
                        }}
                      >
                        <EditIcon width="14" height="14" /> Manage Role
                      </button>
                    ) : (
                      <span className="staff-locked-pill" style={{ width: "100%", justifyContent: "center" }}>
                        <LockIcon width="13" height="13" /> Locked
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* ========================================= */}
      {/* 🪟 SIMPLE MANAGE ROLE POPUP (NON-FLASHY)  */}
      {/* ========================================= */}
      {selectedStaffForManage && (
        <div
          className="staff-modal-overlay"
          onClick={() => setSelectedStaffForManage(null)}
        >
          <div
            className="staff-modal-card simple"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="staff-modal-header">
              <div>
                <h3 style={{ margin: 0, fontSize: "1.05rem", fontWeight: "700", color: "#0f172a" }}>
                  Manage Role
                </h3>
                <p style={{ margin: "2px 0 0 0", color: "#64748b", fontSize: "0.85rem" }}>
                  {selectedStaffForManage.fullName} <span className="staff-id-pill">#{selectedStaffForManage.id}</span>
                </p>
              </div>
              <button
                className="staff-modal-close-btn"
                onClick={() => setSelectedStaffForManage(null)}
                title="Close"
              >
                <XIcon width="16" height="16" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="staff-modal-body">
              {/* SECTION 1: Current Assigned Roles */}
              <div className="staff-modal-block">
                <div className="staff-modal-block-label">
                  <span>Current Roles</span>
                  {selectedStaffForManage.isDeptAdmin &&
                    getStaffDepartments(selectedStaffForManage).length > 1 &&
                    isMasterAdmin && (
                      <button
                        className="staff-btn-revoke-all"
                        onClick={() => {
                          if (
                            window.confirm(
                              `Are you sure you want to revoke all admin roles from ${selectedStaffForManage.fullName}?`
                            )
                          ) {
                            handleRoleChange(selectedStaffForManage.id, "demote");
                          }
                        }}
                      >
                        Remove All
                      </button>
                    )}
                </div>

                {selectedStaffForManage.isDeptAdmin ? (
                  <div className="staff-role-list-simple">
                    {getStaffDepartments(selectedStaffForManage).map((dept) => (
                      <div key={dept} className="staff-role-row-simple">
                        <div className="staff-role-row-title">
                          <ShieldIcon width="14" height="14" style={{ color: "#059669" }} />
                          <span>Head of <strong>{dept}</strong></span>
                        </div>

                        {isMasterAdmin && (
                          <button
                            className="staff-btn-remove-simple"
                            disabled={processingId === selectedStaffForManage.id}
                            onClick={() => {
                              if (
                                window.confirm(
                                  `Remove Head of "${dept}" role from ${selectedStaffForManage.fullName}?`
                                )
                              ) {
                                handleRoleChange(selectedStaffForManage.id, "demote", dept);
                              }
                            }}
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                ) : selectedStaffForManage.adminDepartment ? (
                  <div className="staff-role-row-simple">
                    <div className="staff-role-row-title">
                      <UserIcon width="14" height="14" style={{ color: "#2563eb" }} />
                      <span>Team: <strong>{selectedStaffForManage.adminDepartment}</strong></span>
                    </div>

                    <button
                      className="staff-btn-remove-simple"
                      disabled={processingId === selectedStaffForManage.id}
                      onClick={() => {
                        if (
                          window.confirm(
                            `Remove ${selectedStaffForManage.fullName} from ${selectedStaffForManage.adminDepartment}?`
                          )
                        ) {
                          handleRoleChange(selectedStaffForManage.id, "demote");
                        }
                      }}
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <p className="staff-modal-empty-text">No administrative roles assigned (General Staff)</p>
                )}
              </div>

              <div className="staff-modal-divider"></div>

              {/* SECTION 2: Assign Department Head or Team Role */}
              <div className="staff-modal-block">
                <div className="staff-modal-block-label">
                  <span>{isMasterAdmin ? "Appoint as Department Head" : `Add to ${myDept} Team`}</span>
                </div>

                {isMasterAdmin ? (
                  (() => {
                    const currentDepts = getStaffDepartments(selectedStaffForManage);
                    const availableToAdd = allDepartments.filter((d) => !currentDepts.includes(d));

                    if (availableToAdd.length === 0) {
                      return (
                        <p className="staff-modal-empty-text">Already assigned to all departments.</p>
                      );
                    }

                    return (
                      <div className="staff-assign-row-simple">
                        <select
                          className="staff-assign-select-simple"
                          value={selectedDeptToAssign}
                          onChange={(e) => setSelectedDeptToAssign(e.target.value)}
                        >
                          <option value="">Select Department...</option>
                          {availableToAdd.map((dept) => (
                            <option key={dept} value={dept}>
                              {dept}
                            </option>
                          ))}
                        </select>

                        <button
                          className="staff-assign-btn-simple"
                          disabled={!selectedDeptToAssign || processingId === selectedStaffForManage.id}
                          onClick={() => {
                            if (!selectedDeptToAssign) return;
                            handleRoleChange(
                              selectedStaffForManage.id,
                              "promote",
                              selectedDeptToAssign
                            );
                          }}
                        >
                          {processingId === selectedStaffForManage.id ? "Assigning..." : "Assign"}
                        </button>
                      </div>
                    );
                  })()
                ) : (
                  !selectedStaffForManage.adminDepartment && (
                    <button
                      className="staff-assign-btn-simple"
                      style={{ width: "100%", justifyContent: "center" }}
                      disabled={processingId === selectedStaffForManage.id}
                      onClick={() => {
                        handleRoleChange(selectedStaffForManage.id, "promote", myDept);
                      }}
                    >
                      {processingId === selectedStaffForManage.id ? "Adding..." : `Add to ${myDept} Team`}
                    </button>
                  )
                )}
              </div>

              {/* SECTION 3: Danger Zone - Master Admin Transfer */}
              {isMasterAdmin && selectedStaffForManage.id !== requesterId && (
                <>
                  <div className="staff-modal-divider"></div>
                  <div className="staff-modal-danger-simple">
                    <span style={{ fontSize: "0.82rem", color: "#64748b" }}>
                      Master Admin Rights
                    </span>
                    <button
                      className="staff-btn-transfer-simple"
                      onClick={() =>
                        handleTransferOwnership(
                          selectedStaffForManage.id,
                          selectedStaffForManage.fullName
                        )
                      }
                    >
                      Transfer Ownership
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* Modal Footer */}
            <div className="staff-modal-footer">
              <button
                className="staff-modal-done-btn"
                onClick={() => setSelectedStaffForManage(null)}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================= */}
      {/* ⭐ STUDENT REVIEWS & RATINGS MODAL        */}
      {/* ========================================= */}
      {selectedReviewsStaff && (
        <div
          className="staff-modal-overlay"
          onClick={() => setSelectedReviewsStaff(null)}
        >
          <div
            className="staff-modal-card simple"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: "520px" }}
          >
            {/* Header */}
            <div className="staff-modal-header">
              <div>
                <h3 style={{ margin: 0, fontSize: "1.05rem", fontWeight: "700", color: "#0f172a" }}>
                  Staff Ratings & Feedback
                </h3>
                <p style={{ margin: "2px 0 0 0", color: "#64748b", fontSize: "0.85rem" }}>
                  {selectedReviewsStaff.fullName} <span className="staff-id-pill">#{selectedReviewsStaff.id}</span>
                </p>
              </div>
              <button
                className="staff-modal-close-btn"
                onClick={() => setSelectedReviewsStaff(null)}
                title="Close"
              >
                <XIcon width="16" height="16" />
              </button>
            </div>

            {/* Body */}
            <div className="staff-modal-body">
              {/* Score Highlight Box */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "14px 18px",
                  background: "#fffbeb",
                  borderRadius: "10px",
                  border: "1px solid #fde68a"
                }}
              >
                <div>
                  <div style={{ fontSize: "2rem", fontWeight: "800", color: "#92400e", lineHeight: 1 }}>
                    {Number(selectedReviewsStaff.averageRating || 0).toFixed(1)}
                    <span style={{ fontSize: "1rem", fontWeight: "500", color: "#b45309" }}> / 5.0</span>
                  </div>
                  <div style={{ display: "flex", gap: "3px", color: "#f59e0b", marginTop: "4px" }}>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <span
                        key={star}
                        style={{
                          color:
                            star <= Math.round(selectedReviewsStaff.averageRating || 0)
                              ? "#f59e0b"
                              : "#cbd5e1"
                        }}
                      >
                        <StarIcon width="15" height="15" />
                      </span>
                    ))}
                  </div>
                </div>

                <div style={{ textAlign: "right" }}>
                  <span
                    style={{
                      display: "inline-block",
                      background: "#ffffff",
                      padding: "3px 10px",
                      borderRadius: "16px",
                      fontWeight: "700",
                      color: "#78350f",
                      fontSize: "0.8rem",
                      border: "1px solid #fde68a"
                    }}
                  >
                    {selectedReviewsStaff.totalRatings} Total{" "}
                    {selectedReviewsStaff.totalRatings === 1 ? "Rating" : "Ratings"}
                  </span>
                  <div style={{ fontSize: "0.74rem", color: "#92400e", marginTop: "4px" }}>
                    {selectedReviewsStaff.adminDepartment || "General Staff"}
                  </div>
                </div>
              </div>

              {/* Reviews List */}
              <div style={{ marginTop: "4px" }}>
                <h4 style={{ margin: "0 0 10px 0", color: "#1e293b", fontSize: "0.88rem", fontWeight: "700" }}>
                  Student Reviews ({selectedReviewsStaff.ratingsList?.length || 0})
                </h4>

                {!selectedReviewsStaff.ratingsList || selectedReviewsStaff.ratingsList.length === 0 ? (
                  <p style={{ color: "#94a3b8", fontSize: "0.85rem", textAlign: "center", padding: "20px 0", background: "#f8fafc", borderRadius: "6px", border: "1px dashed #e2e8f0" }}>
                    No written feedback recorded yet.
                  </p>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px", maxHeight: "300px", overflowY: "auto" }}>
                    {selectedReviewsStaff.ratingsList.map((rev, idx) => (
                      <div
                        key={idx}
                        style={{
                          padding: "10px 12px",
                          background: "#f8fafc",
                          borderRadius: "8px",
                          border: "1px solid #e2e8f0"
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "2px", color: "#f59e0b" }}>
                            {[1, 2, 3, 4, 5].map((star) => (
                              <span
                                key={star}
                                style={{
                                  color: star <= (rev.stars || 0) ? "#f59e0b" : "#cbd5e1"
                                }}
                              >
                                <StarIcon width="12" height="12" />
                              </span>
                            ))}
                            <span style={{ fontWeight: "700", color: "#334155", fontSize: "0.78rem", marginLeft: "4px" }}>
                              {rev.stars}.0
                            </span>
                          </div>

                          <span style={{ fontSize: "0.72rem", color: "#94a3b8" }}>
                            {rev.ratedAt
                              ? new Date(rev.ratedAt).toLocaleDateString("en-US", {
                                  month: "short",
                                  day: "numeric",
                                  year: "numeric"
                                })
                              : "Recently"}
                          </span>
                        </div>

                        {rev.feedback ? (
                          <p style={{ margin: "2px 0 0 0", color: "#1e293b", fontSize: "0.82rem", fontStyle: "italic" }}>
                            "{rev.feedback}"
                          </p>
                        ) : (
                          <p style={{ margin: "2px 0 0 0", color: "#94a3b8", fontSize: "0.76rem" }}>
                            (No written comment provided)
                          </p>
                        )}

                        {rev.category && (
                          <div style={{ marginTop: "4px", fontSize: "0.7rem", color: "#64748b" }}>
                            Category: <span style={{ fontWeight: "600" }}>{rev.category}</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="staff-modal-footer">
              <button
                className="staff-modal-done-btn"
                onClick={() => setSelectedReviewsStaff(null)}
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