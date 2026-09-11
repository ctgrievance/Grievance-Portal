import React, { useState, useEffect, useCallback } from "react";
import {
  CheckCircleIcon,
  AlertCircleIcon,
  TrashIcon,
  EditIcon,
  XIcon,
  SearchIcon,
  RefreshIcon,
  PhoneIcon,
  MailIcon
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

function RegisteredStudentsTab() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [totalVerified, setTotalVerified] = useState(0);
  const [totalPending, setTotalPending] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Filters
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("registered");

  // Notification state
  const [msg, setMsg] = useState("");
  const [msgType, setMsgType] = useState("success");

  // Edit Student Modal state
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [editFormData, setEditFormData] = useState({
    fullName: "",
    email: "",
    phone: "",
    program: "",
    studentType: "",
    isVerified: true
  });
  const [savingEdit, setSavingEdit] = useState(false);

  // Delete Student Modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [studentToDelete, setStudentToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const BASE_URL = `${process.env.REACT_APP_API_URL || "http://localhost:5000"}/api/registered-users/students`;

  const showNotification = (message, type = "success") => {
    setMsg(message);
    setMsgType(type);
    setTimeout(() => {
      setMsg("");
      setMsgType("");
    }, 4500);
  };

  const fetchStudents = useCallback(async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams({
        search: search.trim(),
        status: statusFilter,
        page: page.toString(),
        limit: "25"
      });

      const res = await fetch(`${BASE_URL}?${queryParams.toString()}`);
      if (!res.ok) throw new Error("Failed to load registered students");
      const data = await res.json();

      setStudents(data.students || []);
      setTotal(data.total || 0);
      setTotalVerified(data.totalVerified || 0);
      setTotalPending(data.totalPending || 0);
      setTotalPages(data.totalPages || 1);
    } catch (err) {
      console.error(err);
      showNotification(err.message, "error");
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, page, BASE_URL]);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  // Open Edit Modal
  const handleOpenEdit = (student) => {
    setSelectedStudent(student);
    const isActuallyVerified = !student.otpPending && student.isVerified === true;
    setEditFormData({
      fullName: student.fullName || "",
      email: student.email || "",
      phone: student.phone || "",
      program: student.program || "",
      studentType: student.studentType || "",
      isVerified: isActuallyVerified
    });
    setShowEditModal(true);
  };

  // Submit Edit
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!selectedStudent) return;

    setSavingEdit(true);
    try {
      const res = await fetch(`${BASE_URL}/${selectedStudent.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editFormData)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to update student");

      showNotification(`Student ${selectedStudent.id} updated successfully.`, "success");
      setShowEditModal(false);
      setSelectedStudent(null);
      fetchStudents();
    } catch (err) {
      showNotification(err.message, "error");
    } finally {
      setSavingEdit(false);
    }
  };

  // Open Delete Modal
  const handleOpenDelete = (student) => {
    setStudentToDelete(student);
    setShowDeleteModal(true);
  };

  // Confirm Delete
  const handleConfirmDelete = async () => {
    if (!studentToDelete) return;

    setDeleting(true);
    try {
      const res = await fetch(`${BASE_URL}/${studentToDelete.id}`, {
        method: "DELETE"
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to delete student");

      showNotification(data.message || `Student ${studentToDelete.id} deleted successfully.`, "success");
      setShowDeleteModal(false);
      setStudentToDelete(null);
      fetchStudents();
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
          <span className="reg-users-kpi-label">Registered Students</span>
          <div className="reg-users-kpi-val">{totalVerified}</div>
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
            placeholder="Search by ID, name, email, phone, program..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>

        <div className="reg-users-filter-actions">
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

          <button
            type="button"
            className="reg-users-btn-reset"
            onClick={() => {
              setSearch("");
              setStatusFilter("registered");
              setPage(1);
            }}
          >
            Reset
          </button>

          <button
            type="button"
            className="reg-users-btn-refresh"
            onClick={fetchStudents}
          >
            <RefreshIcon width="14" height="14" />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* VIEW 1: DESKTOP TABLE VIEW */}
      <div className="reg-users-desktop-table">
        <div className="reg-users-table-card">
          <div className="table-responsive">
            <table className="reg-users-table">
              <thead>
                <tr>
                  <th>Student ID</th>
                  <th>Full Name</th>
                  <th>Contact Info</th>
                  <th>Program / Course</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th>Registered At</th>
                  <th style={{ textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="8" className="reg-users-empty-cell">
                      <div className="reg-users-loading-spinner">Loading registered students...</div>
                    </td>
                  </tr>
                ) : students.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="reg-users-empty-cell">
                      <SearchIcon width="28" height="28" style={{ color: "#94a3b8", marginBottom: "8px" }} />
                      <div style={{ fontWeight: "600", color: "#334155" }}>No registered students found</div>
                      <p style={{ margin: "4px 0 0 0", fontSize: "0.82rem", color: "#64748b" }}>
                        {search ? "Try adjusting your search criteria" : "Students will appear here once registered."}
                      </p>
                    </td>
                  </tr>
                ) : (
                  students.map((student) => (
                    <tr key={student._id || student.id}>
                      {/* ID */}
                      <td>
                        <span className="reg-user-id-badge">{student.id}</span>
                      </td>

                      {/* Name */}
                      <td>
                        <div className="reg-user-name">{student.fullName || "Student"}</div>
                      </td>

                      {/* Contact */}
                      <td>
                        <div className="reg-user-contact-item">
                          <MailIcon width="12" height="12" />
                          <span>{student.email}</span>
                        </div>
                        {student.phone && (
                          <div className="reg-user-contact-item secondary">
                            <PhoneIcon width="12" height="12" />
                            <span>{student.phone}</span>
                          </div>
                        )}
                      </td>

                      {/* Program */}
                      <td>
                        <span className="reg-user-dept-text">{student.program || "-"}</span>
                      </td>

                      {/* Type */}
                      <td>
                        <span className="reg-user-type-badge">{student.studentType || "Regular"}</span>
                      </td>

                      {/* Verification Status */}
                      <td>
                        {student.isOtpVerified || (student.isVerified && !student.otpPending) ? (
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
                      <td className="reg-user-date">{formatDate(student.createdAt)}</td>

                      {/* Actions */}
                      <td style={{ textAlign: "right" }}>
                        <div className="reg-user-actions-wrap">
                          <button
                            type="button"
                            className="reg-user-action-btn edit"
                            onClick={() => handleOpenEdit(student)}
                            title="Edit Student"
                          >
                            <EditIcon width="13" height="13" />
                            <span>Edit</span>
                          </button>
                          <button
                            type="button"
                            className="reg-user-action-btn delete"
                            onClick={() => handleOpenDelete(student)}
                            title="Delete Student"
                          >
                            <TrashIcon width="13" height="13" />
                            <span>Delete</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
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
            <span>Loading registered students...</span>
          </div>
        ) : students.length === 0 ? (
          <div className="reg-user-mobile-card empty-card">
            <SearchIcon width="24" height="24" style={{ color: "#94a3b8" }} />
            <span style={{ fontWeight: "600", color: "#334155" }}>No students found</span>
            <p style={{ margin: "4px 0 0 0", fontSize: "0.8rem", color: "#64748b" }}>
              {search ? "Adjust your search criteria" : "Students will appear here once registered."}
            </p>
          </div>
        ) : (
          students.map((student) => {
            const isVerified = student.isOtpVerified || (student.isVerified && !student.otpPending);

            return (
              <div key={student._id || student.id} className="reg-user-mobile-card">
                {/* Header Row: Name + ID + Status */}
                <div className="reg-user-mcard-header">
                  <div className="reg-user-mcard-title-group">
                    <span className="reg-user-mcard-name">{student.fullName || "Student"}</span>
                    <span className="reg-user-id-badge">{student.id}</span>
                  </div>
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

                {/* Metadata Row: Program & Type */}
                <div className="reg-user-mcard-meta">
                  <span className="reg-user-mcard-prog">{student.program || "Unassigned"}</span>
                  <span className="reg-user-mcard-dot">•</span>
                  <span className="reg-user-type-badge">{student.studentType || "Regular"}</span>
                </div>

                {/* Contact Row */}
                <div className="reg-user-mcard-contacts">
                  <div className="reg-user-contact-item">
                    <MailIcon width="12" height="12" />
                    <span>{student.email}</span>
                  </div>
                  {student.phone && (
                    <div className="reg-user-contact-item">
                      <PhoneIcon width="12" height="12" />
                      <span>{student.phone}</span>
                    </div>
                  )}
                </div>

                {/* Footer Row: Date & Actions */}
                <div className="reg-user-mcard-footer">
                  <span className="reg-user-mcard-date">{formatDate(student.createdAt)}</span>
                  <div className="reg-user-actions-wrap">
                    <button
                      type="button"
                      className="reg-user-action-btn edit"
                      onClick={() => handleOpenEdit(student)}
                    >
                      <EditIcon width="13" height="13" />
                      <span>Edit</span>
                    </button>
                    <button
                      type="button"
                      className="reg-user-action-btn delete"
                      onClick={() => handleOpenDelete(student)}
                    >
                      <TrashIcon width="13" height="13" />
                      <span>Delete</span>
                    </button>
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
          Showing <strong>{students.length}</strong> of <strong>{total}</strong> students
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

      {/* MODAL: EDIT STUDENT */}
      {showEditModal && selectedStudent && (
        <div className="reg-users-modal-overlay">
          <div className="reg-users-modal-box">
            <div className="reg-users-modal-header">
              <div>
                <h3 className="reg-users-modal-title">Edit Registered Student</h3>
                <span className="reg-users-modal-subtitle">Student ID: {selectedStudent.id}</span>
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

              <div className="form-row-2">
                <div className="form-group">
                  <label>Program / Course</label>
                  <input
                    type="text"
                    value={editFormData.program}
                    onChange={(e) => setEditFormData({ ...editFormData, program: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Student Type</label>
                  <input
                    type="text"
                    placeholder="Regular, Lateral, etc."
                    value={editFormData.studentType}
                    onChange={(e) => setEditFormData({ ...editFormData, studentType: e.target.value })}
                  />
                </div>
              </div>

              {selectedStudent && (selectedStudent.otpPending || !selectedStudent.isVerified) ? (
                <div className="reg-users-alert pending" style={{ marginBottom: "16px" }}>
                  <AlertCircleIcon width="16" height="16" />
                  <span>
                    <strong>OTP Pending:</strong> This student has not verified their registration OTP yet. They cannot be marked as verified until OTP verification is completed.
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
      {showDeleteModal && studentToDelete && (
        <div className="reg-users-modal-overlay">
          <div className="reg-users-modal-box delete-box">
            <div className="reg-users-delete-icon">
              <TrashIcon width="20" height="20" />
            </div>
            <h3 className="reg-users-modal-title" style={{ marginTop: "12px" }}>Delete Student Account</h3>
            <p className="reg-users-delete-text">
              Are you sure you want to delete registered student{" "}
              <strong>
                {studentToDelete.fullName} ({studentToDelete.id})
              </strong>
              ? This will remove their login account from the portal.
            </p>

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
                {deleting ? "Deleting..." : "Yes, Delete Student"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default RegisteredStudentsTab;
