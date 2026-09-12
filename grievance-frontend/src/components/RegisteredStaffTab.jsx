import React, { useState, useEffect, useCallback } from "react";
import {
  CheckCircleIcon,
  AlertCircleIcon,
  TrashIcon,
  EditIcon,
  XIcon,
  ShieldIcon,
  SearchIcon,
  RefreshIcon,
  PhoneIcon,
  MailIcon,
  UserIcon
} from "./Icons";

const formatDate = (dateString) => {
  if (!dateString) return "N/A";
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
};

function RegisteredStaffTab() {
  const [staffList, setStaffList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [totalVerified, setTotalVerified] = useState(0);
  const [totalAdmins, setTotalAdmins] = useState(0);
  const [totalRegularStaff, setTotalRegularStaff] = useState(0);
  const [totalPending, setTotalPending] = useState(0);
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

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [departments, setDepartments] = useState(DEFAULT_DEPARTMENTS);

  // Filters
  const [search, setSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState("all");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("registered");

  // Notifications
  const [msg, setMsg] = useState("");
  const [msgType, setMsgType] = useState("success");

  // Edit Modal State
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [editFormData, setEditFormData] = useState({
    fullName: "",
    email: "",
    phone: "",
    department: "",
    role: "staff",
    isDeptAdmin: false,
    isVerified: true
  });
  const [savingEdit, setSavingEdit] = useState(false);

  // Delete Modal State
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [staffToDelete, setStaffToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const BASE_URL = `${process.env.REACT_APP_API_URL || "http://localhost:5000"}/api/registered-users/staff`;

  const showNotification = (message, type = "success") => {
    setMsg(message);
    setMsgType(type);
    setTimeout(() => {
      setMsg("");
      setMsgType("");
    }, 4500);
  };

  const fetchStaff = useCallback(async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams({
        search: search.trim(),
        department: deptFilter,
        role: roleFilter,
        status: statusFilter,
        page: page.toString(),
        limit: "25"
      });

      const res = await fetch(`${BASE_URL}?${queryParams.toString()}`);
      if (!res.ok) throw new Error("Failed to load registered staff");
      const data = await res.json();

      setStaffList(data.staff || []);
      setTotal(data.total || 0);
      setTotalVerified(data.totalVerified || 0);
      setTotalAdmins(data.totalAdmins || 0);
      setTotalRegularStaff(data.totalRegularStaff || 0);
      setTotalPending(data.totalPending || 0);
      setTotalPages(data.totalPages || 1);
      if (data.departments && Array.isArray(data.departments) && data.departments.length > 0) {
        setDepartments(prev => {
          const set = new Set([...prev, ...data.departments]);
          return Array.from(set).sort((a, b) => a.localeCompare(b));
        });
      }
    } catch (err) {
      console.error(err);
      showNotification(err.message, "error");
    } finally {
      setLoading(false);
    }
  }, [search, deptFilter, roleFilter, statusFilter, page, BASE_URL]);

  useEffect(() => {
    fetchStaff();
  }, [fetchStaff]);

  // Dynamic fetch of active departments
  useEffect(() => {
    const fetchDepts = async () => {
      try {
        const res = await fetch(`${process.env.REACT_APP_API_URL || "http://localhost:5000"}/api/departments`);
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data) && data.length > 0) {
            const names = data.map(d => (typeof d === "string" ? d : d.name)).filter(Boolean);
            setDepartments(prev => {
              const set = new Set([...prev, ...names]);
              return Array.from(set).sort((a, b) => a.localeCompare(b));
            });
          }
        }
      } catch (err) {
        console.warn("Could not load departments list:", err);
      }
    };
    fetchDepts();
  }, []);

  // Open Edit Modal
  const handleOpenEdit = (staff) => {
    setSelectedStaff(staff);
    const isActuallyVerified = !staff.otpPending && staff.isVerified === true;
    setEditFormData({
      fullName: staff.fullName || "",
      email: staff.email || "",
      phone: staff.phone || "",
      department: staff.staffDepartment || staff.adminDepartment || "",
      role: staff.role || "staff",
      isDeptAdmin: !!staff.isDeptAdmin,
      isVerified: isActuallyVerified
    });
    setShowEditModal(true);
  };

  // Submit Edit
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!selectedStaff) return;

    setSavingEdit(true);
    try {
      const res = await fetch(`${BASE_URL}/${selectedStaff.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editFormData)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to update staff member");

      showNotification(`Staff member ${selectedStaff.id} updated successfully.`, "success");
      setShowEditModal(false);
      setSelectedStaff(null);
      fetchStaff();
    } catch (err) {
      showNotification(err.message, "error");
    } finally {
      setSavingEdit(false);
    }
  };

  // Open Delete Modal
  const handleOpenDelete = (staff) => {
    if (staff.id === "10001" || staff.isMasterAdmin) {
      alert("Master Admin account is protected and cannot be deleted.");
      return;
    }
    setStaffToDelete(staff);
    setShowDeleteModal(true);
  };

  // Confirm Delete
  const handleConfirmDelete = async () => {
    if (!staffToDelete) return;

    setDeleting(true);
    try {
      const res = await fetch(`${BASE_URL}/${staffToDelete.id}`, {
        method: "DELETE"
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to delete staff member");

      const grievanceNote = data.resetGrievancesCount > 0
        ? ` (${data.resetGrievancesCount} assigned tickets reset to Pending)`
        : "";
      showNotification(`Staff member ${staffToDelete.fullName || staffToDelete.id} deleted successfully${grievanceNote}.`, "success");
      setShowDeleteModal(false);
      setStaffToDelete(null);
      fetchStaff();
    } catch (err) {
      showNotification(err.message, "error");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="registered-tab-wrapper">
      {/* EXECUTIVE KPI METRICS */}
      <div className="reg-users-kpi-grid">
        <div className="reg-users-kpi-card verified">
          <span className="reg-users-kpi-label">Verified Staff</span>
          <div className="reg-users-kpi-val">{totalVerified}</div>
        </div>
        <div className="reg-users-kpi-card admin">
          <span className="reg-users-kpi-label">Admins & Heads</span>
          <div className="reg-users-kpi-val">{totalAdmins}</div>
        </div>
        <div className="reg-users-kpi-card regular">
          <span className="reg-users-kpi-label">Regular Staff</span>
          <div className="reg-users-kpi-val">{totalRegularStaff}</div>
        </div>
      </div>

      {/* NOTIFICATION BANNER */}
      {msg && (
        <div className={`reg-users-alert ${msgType === "error" ? "error" : "success"}`}>
          {msgType === "error" ? <AlertCircleIcon width="16" height="16" /> : <CheckCircleIcon width="16" height="16" />}
          <span>{msg}</span>
        </div>
      )}

      {/* FILTER & SEARCH CONTROLS */}
      <div className="reg-users-filters-bar">
        <div className="reg-users-search-box">
          <span className="reg-users-search-icon">
            <SearchIcon width="16" height="16" />
          </span>
          <input
            type="text"
            className="reg-users-search-input"
            placeholder="Search by ID, name, email, department..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
          {search && (
            <button
              type="button"
              className="reg-users-search-clear"
              onClick={() => {
                setSearch("");
                setPage(1);
              }}
              title="Clear search"
            >
              <XIcon width="14" height="14" />
            </button>
          )}
        </div>

        <div className="reg-users-filter-controls">
          <div className="reg-users-select-wrap dept">
            <select
              className="reg-users-select"
              value={deptFilter}
              onChange={(e) => {
                setDeptFilter(e.target.value);
                setPage(1);
              }}
              title={deptFilter !== "all" ? deptFilter : "Filter by department"}
            >
              <option value="all">All Departments</option>
              {departments.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>

          <div className="reg-users-select-wrap role">
            <select
              className="reg-users-select"
              value={roleFilter}
              onChange={(e) => {
                setRoleFilter(e.target.value);
                setPage(1);
              }}
            >
              <option value="all">All Roles</option>
              <option value="admin">Admins & Heads</option>
              <option value="staff">Regular Staff</option>
            </select>
          </div>

          <div className="reg-users-select-wrap status">
            <select
              className="reg-users-select"
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
            >
              <option value="registered">Verified Only</option>
              <option value="pending">Pending OTP</option>
              <option value="all">All Accounts</option>
            </select>
          </div>

          <div className="reg-users-btn-group">
            <button
              type="button"
              className="reg-users-btn-reset"
              onClick={() => {
                setSearch("");
                setDeptFilter("all");
                setRoleFilter("all");
                setStatusFilter("registered");
                setPage(1);
              }}
              title="Reset all filters"
            >
              Reset
            </button>

            <button
              type="button"
              className="reg-users-btn-refresh"
              onClick={fetchStaff}
              title="Refresh staff list"
            >
              <RefreshIcon width="14" height="14" />
              <span>Refresh</span>
            </button>
          </div>
        </div>
      </div>

      {/* VIEW 1: DESKTOP TABLE VIEW */}
      <div className="reg-users-desktop-table">
        <div className="reg-users-table-card">
          <div className="table-responsive">
            <table className="reg-users-table">
              <thead>
                <tr>
                  <th>Staff ID</th>
                  <th>Full Name</th>
                  <th>Contact Info</th>
                  <th>Department</th>
                  <th>Role & Authority</th>
                  <th>Status</th>
                  <th>Joined Date</th>
                  <th style={{ textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="8" className="reg-users-empty-cell">
                      <div className="reg-users-loading-spinner">Loading registered staff members...</div>
                    </td>
                  </tr>
                ) : staffList.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="reg-users-empty-cell">
                      <SearchIcon width="28" height="28" style={{ color: "#94a3b8", marginBottom: "8px" }} />
                      <div style={{ fontWeight: "600", color: "#334155" }}>No registered staff found</div>
                      <p style={{ margin: "4px 0 0 0", fontSize: "0.82rem", color: "#64748b" }}>
                        {search || deptFilter !== "all" ? "Try adjusting your search criteria" : "Staff accounts will appear here once registered."}
                      </p>
                    </td>
                  </tr>
                ) : (
                  staffList.map((staff) => {
                    const isMaster = staff.id === "10001" || staff.isMasterAdmin;
                    const isDeptBoss = staff.isDeptAdmin || staff.role === "admin";

                    return (
                      <tr key={staff._id || staff.id}>
                        {/* ID */}
                        <td>
                          <span className="reg-user-id-badge">{staff.id}</span>
                        </td>

                        {/* Name */}
                        <td>
                          <div className="reg-user-name">{staff.fullName || "Staff Member"}</div>
                        </td>

                        {/* Contact */}
                        <td>
                          <div className="reg-user-contact-item">
                            <MailIcon width="12" height="12" />
                            <span>{staff.email}</span>
                          </div>
                          {staff.phone && (
                            <div className="reg-user-contact-item secondary">
                              <PhoneIcon width="12" height="12" />
                              <span>{staff.phone}</span>
                            </div>
                          )}
                        </td>

                        {/* Department */}
                        <td>
                          <span className="reg-user-dept-badge">
                            {staff.staffDepartment || staff.adminDepartment || "General"}
                          </span>
                        </td>

                        {/* Role & Authority */}
                        <td>
                          {isMaster ? (
                            <span className="reg-role-badge master">
                              <ShieldIcon width="12" height="12" />
                              <span>Master Admin</span>
                            </span>
                          ) : isDeptBoss ? (
                            <span className="reg-role-badge dept-admin">
                              <ShieldIcon width="12" height="12" />
                              <span>Dept Admin</span>
                            </span>
                          ) : (
                            <span className="reg-role-badge staff">
                              <UserIcon width="12" height="12" />
                              <span>Staff Member</span>
                            </span>
                          )}
                        </td>

                        {/* Status */}
                        <td>
                          {staff.isOtpVerified || (staff.isVerified && !staff.otpPending) ? (
                            <span className="reg-status-badge verified">
                              <CheckCircleIcon width="12" height="12" />
                              <span>Verified</span>
                            </span>
                          ) : (
                            <span className="reg-status-badge pending">
                              <AlertCircleIcon width="12" height="12" />
                              <span>Pending OTP</span>
                            </span>
                          )}
                        </td>

                        {/* Date */}
                        <td className="reg-user-date">{formatDate(staff.createdAt)}</td>

                        {/* Actions */}
                        <td style={{ textAlign: "right" }}>
                          <div className="reg-user-actions-wrap">
                            <button
                              type="button"
                              className="reg-user-action-btn edit"
                              onClick={() => handleOpenEdit(staff)}
                              title="Edit Staff Member"
                            >
                              <EditIcon width="13" height="13" />
                              <span>Edit</span>
                            </button>
                            {!isMaster && (
                              <button
                                type="button"
                                className="reg-user-action-btn delete"
                                onClick={() => handleOpenDelete(staff)}
                                title="Delete Staff Member"
                              >
                                <TrashIcon width="13" height="13" />
                                <span>Delete</span>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* VIEW 2: MOBILE COMPACT CARDS VIEW (SLEEK ZERO HORIZONTAL SCROLL) */}
      <div className="reg-users-mobile-cards">
        {loading ? (
          <div className="reg-user-mobile-card empty-card">
            <span>Loading registered staff members...</span>
          </div>
        ) : staffList.length === 0 ? (
          <div className="reg-user-mobile-card empty-card">
            <SearchIcon width="24" height="24" style={{ color: "#94a3b8" }} />
            <span style={{ fontWeight: "600", color: "#334155" }}>No staff found</span>
            <p style={{ margin: "4px 0 0 0", fontSize: "0.8rem", color: "#64748b" }}>
              {search || deptFilter !== "all" ? "Adjust your search criteria" : "Staff accounts will appear here once registered."}
            </p>
          </div>
        ) : (
          staffList.map((staff) => {
            const isMaster = staff.id === "10001" || staff.isMasterAdmin;
            const isDeptBoss = staff.isDeptAdmin || staff.role === "admin";
            const isVerified = staff.isOtpVerified || (staff.isVerified && !staff.otpPending);

            return (
              <div key={staff._id || staff.id} className="reg-user-mobile-card">
                {/* Header Row: Name + ID + Role */}
                <div className="reg-user-mcard-header">
                  <div className="reg-user-mcard-title-group">
                    <span className="reg-user-mcard-name">{staff.fullName || "Staff Member"}</span>
                    <span className="reg-user-id-badge">{staff.id}</span>
                  </div>
                  {isMaster ? (
                    <span className="reg-role-badge master">
                      <ShieldIcon width="11" height="11" />
                      <span>Master</span>
                    </span>
                  ) : isDeptBoss ? (
                    <span className="reg-role-badge dept-admin">
                      <ShieldIcon width="11" height="11" />
                      <span>Dept Admin</span>
                    </span>
                  ) : (
                    <span className="reg-role-badge staff">
                      <UserIcon width="11" height="11" />
                      <span>Staff</span>
                    </span>
                  )}
                </div>

                {/* Metadata Row: Department & Status */}
                <div className="reg-user-mcard-meta">
                  <span className="reg-user-dept-badge">
                    {staff.staffDepartment || staff.adminDepartment || "General"}
                  </span>
                  {isVerified ? (
                    <span className="reg-status-badge verified">
                      <CheckCircleIcon width="11" height="11" />
                      <span>Verified</span>
                    </span>
                  ) : (
                    <span className="reg-status-badge pending">
                      <AlertCircleIcon width="11" height="11" />
                      <span>Pending OTP</span>
                    </span>
                  )}
                </div>

                {/* Contact Row */}
                <div className="reg-user-mcard-contacts">
                  <div className="reg-user-contact-item">
                    <MailIcon width="12" height="12" />
                    <span>{staff.email}</span>
                  </div>
                  {staff.phone && (
                    <div className="reg-user-contact-item">
                      <PhoneIcon width="12" height="12" />
                      <span>{staff.phone}</span>
                    </div>
                  )}
                </div>

                {/* Footer Row: Joined Date & Actions */}
                <div className="reg-user-mcard-footer">
                  <span className="reg-user-mcard-date">{formatDate(staff.createdAt)}</span>
                  <div className="reg-user-actions-wrap">
                    <button
                      type="button"
                      className="reg-user-action-btn edit"
                      onClick={() => handleOpenEdit(staff)}
                    >
                      <EditIcon width="13" height="13" />
                      <span>Edit</span>
                    </button>
                    {!isMaster && (
                      <button
                        type="button"
                        className="reg-user-action-btn delete"
                        onClick={() => handleOpenDelete(staff)}
                      >
                        <TrashIcon width="13" height="13" />
                        <span>Delete</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* PAGINATION BAR */}
      <div className="reg-users-pagination">
        <div className="reg-users-pag-info">
          Showing <strong>{staffList.length}</strong> of <strong>{total}</strong> staff members
        </div>
        <div className="reg-users-pag-controls">
          <button
            type="button"
            className="reg-users-pag-btn"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(p - 1, 1))}
          >
            Previous
          </button>
          <span className="reg-users-pag-count">
            Page {page} of {totalPages}
          </span>
          <button
            type="button"
            className="reg-users-pag-btn"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
          >
            Next
          </button>
        </div>
      </div>

      {/* MODAL: EDIT STAFF */}
      {showEditModal && selectedStaff && (
        <div className="reg-users-modal-overlay">
          <div className="reg-users-modal-box">
            <div className="reg-users-modal-header">
              <div>
                <h3 className="reg-users-modal-title">Edit Staff Member</h3>
                <span className="reg-users-modal-subtitle">Staff ID: {selectedStaff.id}</span>
              </div>
              <button
                type="button"
                className="reg-users-modal-close"
                onClick={() => setShowEditModal(false)}
              >
                <XIcon width="18" height="18" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="reg-users-modal-form">
              <div className="form-group">
                <label>Full Name *</label>
                <input
                  type="text"
                  required
                  value={editFormData.fullName}
                  onChange={(e) => setEditFormData({ ...editFormData, fullName: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label>Email Address *</label>
                <input
                  type="email"
                  required
                  value={editFormData.email}
                  onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label>Phone Number</label>
                <input
                  type="text"
                  value={editFormData.phone}
                  onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label>Department *</label>
                <select
                  value={editFormData.department}
                  onChange={(e) => setEditFormData({ ...editFormData, department: e.target.value })}
                  required
                >
                  <option value="">Select Department...</option>
                  {editFormData.department && !departments.includes(editFormData.department) && (
                    <option value={editFormData.department}>{editFormData.department}</option>
                  )}
                  {departments.map((dept) => (
                    <option key={dept} value={dept}>
                      {dept}
                    </option>
                  ))}
                </select>
              </div>

              {selectedStaff.id !== "10001" && !selectedStaff.isMasterAdmin && (
                <div className="form-row-2">
                  <div className="form-group">
                    <label>Role</label>
                    <select
                      value={editFormData.role}
                      onChange={(e) => setEditFormData({ ...editFormData, role: e.target.value })}
                    >
                      <option value="staff">Staff</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                  <div className="form-checkbox-group" style={{ marginTop: "24px" }}>
                    <label>
                      <input
                        type="checkbox"
                        checked={editFormData.isDeptAdmin}
                        onChange={(e) => setEditFormData({ ...editFormData, isDeptAdmin: e.target.checked })}
                      />
                      <span>Is Department Admin</span>
                    </label>
                  </div>
                </div>
              )}

              {selectedStaff && (selectedStaff.otpPending || !selectedStaff.isVerified) ? (
                <div className="reg-users-alert pending" style={{ marginBottom: "16px" }}>
                  <AlertCircleIcon width="16" height="16" />
                  <span>
                    <strong>OTP Pending:</strong> This staff member has not completed registration OTP verification. They cannot be marked as verified until OTP verification is completed.
                  </span>
                </div>
              ) : (
                <div className="form-checkbox-group" style={{ marginBottom: "16px" }}>
                  <label>
                    <input
                      type="checkbox"
                      checked={editFormData.isVerified}
                      onChange={(e) => setEditFormData({ ...editFormData, isVerified: e.target.checked })}
                    />
                    <span>Account Verified (OTP Completed)</span>
                  </label>
                </div>
              )}

              <div className="reg-users-modal-actions">
                <button
                  type="button"
                  className="reg-users-btn-cancel"
                  onClick={() => setShowEditModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="reg-users-btn-save"
                >
                  {savingEdit ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: DELETE CONFIRMATION */}
      {showDeleteModal && staffToDelete && (
        <div className="reg-users-modal-overlay">
          <div className="reg-users-modal-box delete-box">
            <div className="reg-users-delete-icon">
              <TrashIcon width="20" height="20" />
            </div>
            <h3 className="reg-users-modal-title" style={{ marginTop: "12px" }}>Delete Staff Member</h3>
            <p className="reg-users-delete-text">
              Are you sure you want to permanently delete{" "}
              <strong>
                {staffToDelete.fullName} ({staffToDelete.id})
              </strong>
              ?
            </p>

            <div className="reg-users-alert pending" style={{ marginBottom: "16px", textAlign: "left" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "6px", fontWeight: "700", marginBottom: "4px" }}>
                <ShieldIcon width="14" height="14" />
                <span>Automatic Ticket Protection</span>
              </div>
              <p style={{ margin: 0, fontSize: "0.8rem", lineHeight: "1.4" }}>
                Any active grievances currently assigned to this staff member will be automatically reset to <strong>Pending</strong> so tickets will not be lost.
              </p>
            </div>

            <div className="reg-users-modal-actions">
              <button
                type="button"
                className="reg-users-btn-cancel"
                onClick={() => setShowDeleteModal(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={handleConfirmDelete}
                className="reg-users-btn-danger"
              >
                {deleting ? "Deleting..." : "Yes, Delete Staff"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default RegisteredStaffTab;
