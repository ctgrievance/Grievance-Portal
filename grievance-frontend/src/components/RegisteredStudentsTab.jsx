import React, { useState, useEffect, useCallback } from "react";
import {
  GraduationCapIcon,
  CheckCircleIcon,
  AlertCircleIcon,
  TrashIcon,
  EditIcon,
  XIcon
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
  const [statusFilter, setStatusFilter] = useState("all");

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
    setEditFormData({
      fullName: student.fullName || "",
      email: student.email || "",
      phone: student.phone || "",
      program: student.program || "",
      studentType: student.studentType || "",
      isVerified: student.isVerified !== false
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

      showNotification(`✅ Student ${selectedStudent.id} updated successfully!`, "success");
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
    <div style={{ padding: "8px 0" }}>
      {/* HEADER BAR */}
      <div
        style={{
          background: "#fff",
          borderRadius: "12px",
          padding: "20px 24px",
          marginBottom: "20px",
          boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
          border: "1px solid #e2e8f0",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "16px"
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "4px" }}>
            <span style={{ fontSize: "1.3rem" }}>🎓</span>
            <h2 style={{ margin: 0, fontSize: "1.35rem", color: "#1e293b", fontWeight: "700" }}>
              Live Registered Students
            </h2>
            <span
              style={{
                background: "#ecfdf5",
                color: "#059669",
                border: "1px solid #a7f3d0",
                fontSize: "0.75rem",
                padding: "2px 10px",
                borderRadius: "20px",
                fontWeight: "700",
                display: "inline-flex",
                alignItems: "center",
                gap: "5px"
              }}
            >
              <span style={{ width: "7px", height: "7px", background: "#10b981", borderRadius: "50%" }}></span>
              LIVE DATA
            </span>
          </div>
          <p style={{ margin: 0, fontSize: "0.86rem", color: "#64748b" }}>
            Real-time directory of students who have registered on the CT University Grievance Portal.
          </p>
        </div>

        {/* STAT BADGES */}
        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          <div
            style={{
              background: "#f8fafc",
              padding: "8px 16px",
              borderRadius: "8px",
              border: "1px solid #e2e8f0",
              textAlign: "center"
            }}
          >
            <span style={{ display: "block", fontSize: "0.72rem", color: "#64748b", fontWeight: "600", textTransform: "uppercase" }}>
              Total Registered
            </span>
            <span style={{ fontSize: "1.25rem", fontWeight: "700", color: "#1e293b" }}>{total}</span>
          </div>
          <div
            style={{
              background: "#ecfdf5",
              padding: "8px 16px",
              borderRadius: "8px",
              border: "1px solid #a7f3d0",
              textAlign: "center"
            }}
          >
            <span style={{ display: "block", fontSize: "0.72rem", color: "#065f46", fontWeight: "600", textTransform: "uppercase" }}>
              Verified (OTP)
            </span>
            <span style={{ fontSize: "1.25rem", fontWeight: "700", color: "#047857" }}>{totalVerified}</span>
          </div>
          <div
            style={{
              background: "#fffbeb",
              padding: "8px 16px",
              borderRadius: "8px",
              border: "1px solid #fde68a",
              textAlign: "center"
            }}
          >
            <span style={{ display: "block", fontSize: "0.72rem", color: "#92400e", fontWeight: "600", textTransform: "uppercase" }}>
              Pending OTP
            </span>
            <span style={{ fontSize: "1.25rem", fontWeight: "700", color: "#b45309" }}>{totalPending}</span>
          </div>
        </div>
      </div>

      {/* NOTIFICATION */}
      {msg && (
        <div
          style={{
            padding: "12px 18px",
            borderRadius: "8px",
            marginBottom: "16px",
            display: "flex",
            alignItems: "center",
            gap: "10px",
            background: msgType === "error" ? "#fee2e2" : "#dcfce7",
            color: msgType === "error" ? "#991b1b" : "#166534",
            border: `1px solid ${msgType === "error" ? "#fca5a5" : "#86efac"}`,
            fontWeight: "500",
            fontSize: "0.9rem"
          }}
        >
          {msgType === "error" ? <AlertCircleIcon width="18" height="18" /> : <CheckCircleIcon width="18" height="18" />}
          <span>{msg}</span>
        </div>
      )}

      {/* FILTER CONTROLS */}
      <div
        style={{
          background: "#fff",
          borderRadius: "10px",
          padding: "14px 18px",
          marginBottom: "18px",
          display: "flex",
          gap: "12px",
          flexWrap: "wrap",
          alignItems: "center",
          border: "1px solid #e2e8f0"
        }}
      >
        <div style={{ flex: "1 1 280px" }}>
          <input
            type="text"
            placeholder="🔍 Search by Student ID, Name, Email, Phone, Program..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            style={{
              width: "100%",
              padding: "9px 14px",
              borderRadius: "6px",
              border: "1px solid #cbd5e1",
              fontSize: "0.88rem",
              outline: "none"
            }}
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
          }}
          style={{
            padding: "9px 14px",
            borderRadius: "6px",
            border: "1px solid #cbd5e1",
            fontSize: "0.88rem",
            background: "#fff",
            cursor: "pointer"
          }}
        >
          <option value="all">All Verification Status</option>
          <option value="verified">Verified Only</option>
          <option value="pending">Pending OTP Only</option>
        </select>

        <button
          onClick={() => {
            setSearch("");
            setStatusFilter("all");
            setPage(1);
            fetchStudents();
          }}
          style={{
            padding: "9px 16px",
            borderRadius: "6px",
            border: "1px solid #cbd5e1",
            background: "#f8fafc",
            color: "#475569",
            fontWeight: "600",
            cursor: "pointer",
            fontSize: "0.85rem"
          }}
        >
          Reset Filters
        </button>

        <button
          onClick={fetchStudents}
          style={{
            padding: "9px 16px",
            borderRadius: "6px",
            border: "none",
            background: "#2563eb",
            color: "#fff",
            fontWeight: "600",
            cursor: "pointer",
            fontSize: "0.85rem",
            display: "inline-flex",
            alignItems: "center",
            gap: "6px"
          }}
        >
          🔄 Refresh
        </button>
      </div>

      {/* TABLE SECTION */}
      <div
        style={{
          background: "#fff",
          borderRadius: "10px",
          border: "1px solid #e2e8f0",
          boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
          overflow: "hidden"
        }}
      >
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
            <thead>
              <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
                <th style={{ padding: "12px 16px", fontSize: "0.78rem", fontWeight: "700", color: "#64748b", textTransform: "uppercase" }}>
                  Student ID
                </th>
                <th style={{ padding: "12px 16px", fontSize: "0.78rem", fontWeight: "700", color: "#64748b", textTransform: "uppercase" }}>
                  Full Name
                </th>
                <th style={{ padding: "12px 16px", fontSize: "0.78rem", fontWeight: "700", color: "#64748b", textTransform: "uppercase" }}>
                  Contact (Email / Phone)
                </th>
                <th style={{ padding: "12px 16px", fontSize: "0.78rem", fontWeight: "700", color: "#64748b", textTransform: "uppercase" }}>
                  Program / Course
                </th>
                <th style={{ padding: "12px 16px", fontSize: "0.78rem", fontWeight: "700", color: "#64748b", textTransform: "uppercase" }}>
                  Type
                </th>
                <th style={{ padding: "12px 16px", fontSize: "0.78rem", fontWeight: "700", color: "#64748b", textTransform: "uppercase" }}>
                  Status
                </th>
                <th style={{ padding: "12px 16px", fontSize: "0.78rem", fontWeight: "700", color: "#64748b", textTransform: "uppercase" }}>
                  Registered At
                </th>
                <th style={{ padding: "12px 16px", fontSize: "0.78rem", fontWeight: "700", color: "#64748b", textTransform: "uppercase", textAlign: "right" }}>
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="8" style={{ padding: "40px", textAlign: "center", color: "#64748b" }}>
                    <div style={{ fontSize: "1.1rem", fontWeight: "500" }}>Loading registered students...</div>
                  </td>
                </tr>
              ) : students.length === 0 ? (
                <tr>
                  <td colSpan="8" style={{ padding: "40px", textAlign: "center", color: "#64748b" }}>
                    <div style={{ fontSize: "1.3rem", marginBottom: "8px" }}>🔍</div>
                    <div style={{ fontWeight: "600", fontSize: "1rem", color: "#334155" }}>No registered students found</div>
                    <p style={{ margin: "4px 0 0 0", fontSize: "0.85rem" }}>
                      {search ? "Try adjusting your search criteria" : "Students will appear here once they create accounts on the portal."}
                    </p>
                  </td>
                </tr>
              ) : (
                students.map((student) => (
                  <tr
                    key={student._id || student.id}
                    style={{
                      borderBottom: "1px solid #f1f5f9",
                      transition: "background 0.15s"
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#f8fafc")}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                  >
                    {/* Student ID */}
                    <td style={{ padding: "12px 16px" }}>
                      <span
                        style={{
                          fontWeight: "700",
                          fontFamily: "monospace",
                          color: "#1e293b",
                          background: "#f1f5f9",
                          padding: "3px 8px",
                          borderRadius: "4px",
                          fontSize: "0.82rem"
                        }}
                      >
                        {student.id}
                      </span>
                    </td>

                    {/* Name */}
                    <td style={{ padding: "12px 16px" }}>
                      <div style={{ fontWeight: "600", color: "#1e293b", fontSize: "0.88rem" }}>
                        {student.fullName || "Student"}
                      </div>
                    </td>

                    {/* Contact */}
                    <td style={{ padding: "12px 16px", fontSize: "0.82rem" }}>
                      <div style={{ color: "#334155" }}>{student.email}</div>
                      {student.phone && <div style={{ color: "#64748b", fontSize: "0.78rem" }}>📞 {student.phone}</div>}
                    </td>

                    {/* Program */}
                    <td style={{ padding: "12px 16px", fontSize: "0.82rem", color: "#334155" }}>
                      {student.program || "-"}
                    </td>

                    {/* Type */}
                    <td style={{ padding: "12px 16px", fontSize: "0.82rem" }}>
                      <span
                        style={{
                          background: "#f1f5f9",
                          color: "#475569",
                          padding: "2px 8px",
                          borderRadius: "10px",
                          fontSize: "0.75rem",
                          fontWeight: "500"
                        }}
                      >
                        {student.studentType || "Regular"}
                      </span>
                    </td>

                    {/* Verification Status */}
                    <td style={{ padding: "12px 16px" }}>
                      {student.isVerified ? (
                        <span
                          style={{
                            background: "#dcfce7",
                            color: "#15803d",
                            padding: "2px 8px",
                            borderRadius: "12px",
                            fontSize: "0.72rem",
                            fontWeight: "700",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "4px"
                          }}
                        >
                          <CheckCircleIcon width="12" height="12" /> Verified
                        </span>
                      ) : (
                        <span
                          style={{
                            background: "#fef3c7",
                            color: "#b45309",
                            padding: "2px 8px",
                            borderRadius: "12px",
                            fontSize: "0.72rem",
                            fontWeight: "700",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "4px"
                          }}
                        >
                          <AlertCircleIcon width="12" height="12" /> Pending OTP
                        </span>
                      )}
                    </td>

                    {/* Registered Date */}
                    <td style={{ padding: "12px 16px", fontSize: "0.8rem", color: "#64748b" }}>
                      {formatDate(student.createdAt)}
                    </td>

                    {/* Actions */}
                    <td style={{ padding: "12px 16px", textAlign: "right" }}>
                      <div style={{ display: "inline-flex", gap: "6px" }}>
                        <button
                          onClick={() => handleOpenEdit(student)}
                          title="Edit Student Account"
                          style={{
                            padding: "5px 9px",
                            borderRadius: "6px",
                            border: "1px solid #cbd5e1",
                            background: "#fff",
                            color: "#2563eb",
                            cursor: "pointer",
                            fontSize: "0.78rem",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "4px",
                            fontWeight: "600"
                          }}
                        >
                          <EditIcon width="14" height="14" /> Edit
                        </button>
                        <button
                          onClick={() => handleOpenDelete(student)}
                          title="Delete Student Account"
                          style={{
                            padding: "5px 9px",
                            borderRadius: "6px",
                            border: "1px solid #fecaca",
                            background: "#fff5f5",
                            color: "#dc2626",
                            cursor: "pointer",
                            fontSize: "0.78rem",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "4px",
                            fontWeight: "600"
                          }}
                        >
                          <TrashIcon width="14" height="14" /> Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* PAGINATION */}
        <div
          style={{
            padding: "12px 18px",
            background: "#f8fafc",
            borderTop: "1px solid #e2e8f0",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontSize: "0.84rem",
            color: "#64748b"
          }}
        >
          <div>
            Showing <strong>{students.length}</strong> of <strong>{total}</strong> students
          </div>
          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(p - 1, 1))}
              style={{
                padding: "5px 12px",
                borderRadius: "5px",
                border: "1px solid #cbd5e1",
                background: page <= 1 ? "#f1f5f9" : "#fff",
                color: page <= 1 ? "#94a3b8" : "#334155",
                cursor: page <= 1 ? "not-allowed" : "pointer"
              }}
            >
              Previous
            </button>
            <span style={{ fontWeight: "600", color: "#1e293b" }}>
              Page {page} of {totalPages}
            </span>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
              style={{
                padding: "5px 12px",
                borderRadius: "5px",
                border: "1px solid #cbd5e1",
                background: page >= totalPages ? "#f1f5f9" : "#fff",
                color: page >= totalPages ? "#94a3b8" : "#334155",
                cursor: page >= totalPages ? "not-allowed" : "pointer"
              }}
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* MODAL: EDIT STUDENT */}
      {showEditModal && selectedStudent && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 1000,
            padding: "20px"
          }}
        >
          <div
            style={{
              background: "#fff",
              borderRadius: "10px",
              maxWidth: "520px",
              width: "100%",
              padding: "24px",
              boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1)"
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <div>
                <h3 style={{ margin: 0, fontSize: "1.15rem", color: "#1e293b" }}>Edit Registered Student</h3>
                <span style={{ fontSize: "0.78rem", color: "#64748b" }}>Student ID: {selectedStudent.id}</span>
              </div>
              <button
                onClick={() => setShowEditModal(false)}
                style={{ background: "none", border: "none", cursor: "pointer", color: "#64748b" }}
              >
                <XIcon width="20" height="20" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit}>
              <div style={{ marginBottom: "12px" }}>
                <label style={{ display: "block", fontSize: "0.82rem", fontWeight: "600", color: "#334155", marginBottom: "4px" }}>
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={editFormData.fullName}
                  onChange={(e) => setEditFormData({ ...editFormData, fullName: e.target.value })}
                  style={{ width: "100%", padding: "8px 12px", border: "1px solid #cbd5e1", borderRadius: "6px", fontSize: "0.88rem" }}
                />
              </div>

              <div style={{ marginBottom: "12px" }}>
                <label style={{ display: "block", fontSize: "0.82rem", fontWeight: "600", color: "#334155", marginBottom: "4px" }}>
                  Email Address *
                </label>
                <input
                  type="email"
                  required
                  value={editFormData.email}
                  onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                  style={{ width: "100%", padding: "8px 12px", border: "1px solid #cbd5e1", borderRadius: "6px", fontSize: "0.88rem" }}
                />
              </div>

              <div style={{ marginBottom: "12px" }}>
                <label style={{ display: "block", fontSize: "0.82rem", fontWeight: "600", color: "#334155", marginBottom: "4px" }}>
                  Phone Number
                </label>
                <input
                  type="text"
                  value={editFormData.phone}
                  onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
                  style={{ width: "100%", padding: "8px 12px", border: "1px solid #cbd5e1", borderRadius: "6px", fontSize: "0.88rem" }}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "16px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.82rem", fontWeight: "600", color: "#334155", marginBottom: "4px" }}>
                    Program / Course
                  </label>
                  <input
                    type="text"
                    value={editFormData.program}
                    onChange={(e) => setEditFormData({ ...editFormData, program: e.target.value })}
                    style={{ width: "100%", padding: "8px 12px", border: "1px solid #cbd5e1", borderRadius: "6px", fontSize: "0.88rem" }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "0.82rem", fontWeight: "600", color: "#334155", marginBottom: "4px" }}>
                    Student Type
                  </label>
                  <input
                    type="text"
                    placeholder="Regular, Lateral, etc."
                    value={editFormData.studentType}
                    onChange={(e) => setEditFormData({ ...editFormData, studentType: e.target.value })}
                    style={{ width: "100%", padding: "8px 12px", border: "1px solid #cbd5e1", borderRadius: "6px", fontSize: "0.88rem" }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: "18px" }}>
                <label style={{ display: "inline-flex", alignItems: "center", gap: "8px", fontSize: "0.85rem", color: "#334155", cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={editFormData.isVerified}
                    onChange={(e) => setEditFormData({ ...editFormData, isVerified: e.target.checked })}
                    style={{ width: "16px", height: "16px", accentColor: "#16a34a" }}
                  />
                  Mark Student as Verified (OTP Cleared)
                </label>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  style={{
                    padding: "8px 16px",
                    background: "#f1f5f9",
                    color: "#475569",
                    border: "none",
                    borderRadius: "6px",
                    cursor: "pointer",
                    fontSize: "0.86rem"
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  style={{
                    padding: "8px 18px",
                    background: "#2563eb",
                    color: "#fff",
                    border: "none",
                    borderRadius: "6px",
                    fontWeight: "600",
                    cursor: "pointer",
                    fontSize: "0.86rem"
                  }}
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
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 1000,
            padding: "20px"
          }}
        >
          <div
            style={{
              background: "#fff",
              borderRadius: "10px",
              maxWidth: "460px",
              width: "100%",
              padding: "24px",
              boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.15)"
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px" }}>
              <div
                style={{
                  width: "40px",
                  height: "40px",
                  borderRadius: "50%",
                  background: "#fee2e2",
                  color: "#dc2626",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center"
                }}
              >
                <TrashIcon width="20" height="20" />
              </div>
              <h3 style={{ margin: 0, fontSize: "1.15rem", color: "#1e293b" }}>Delete Student Account</h3>
            </div>

            <p style={{ fontSize: "0.88rem", color: "#475569", lineHeight: "1.5", margin: "0 0 16px 0" }}>
              Are you sure you want to delete registered student{" "}
              <strong>
                {studentToDelete.fullName} ({studentToDelete.id})
              </strong>
              ? This will remove their login account from the portal.
            </p>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                style={{
                  padding: "8px 16px",
                  background: "#f1f5f9",
                  color: "#475569",
                  border: "none",
                  borderRadius: "6px",
                  cursor: "pointer",
                  fontSize: "0.86rem"
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={handleConfirmDelete}
                style={{
                  padding: "8px 18px",
                  background: "#dc2626",
                  color: "#fff",
                  border: "none",
                  borderRadius: "6px",
                  fontWeight: "600",
                  cursor: "pointer",
                  fontSize: "0.86rem"
                }}
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
