import React, { useState, useEffect, useCallback } from "react";
import {
  PlusIcon,
  TrashIcon,
  EditIcon,
  CheckCircleIcon,
  AlertCircleIcon,
  XIcon,
  GraduationCapIcon
} from "../components/Icons";

function AdminDepartments() {
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");
  const [statusType, setStatusType] = useState("");

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("all"); // all | active | inactive
  const [filterType, setFilterType] = useState("all"); // all | academic | admin
  const [filterAudience, setFilterAudience] = useState("all"); // all | both | student | staff

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedDept, setSelectedDept] = useState(null);

  // Form State
  const [formData, setFormData] = useState({
    name: "",
    code: "",
    description: "",
    targetAudience: "both",
    isAcademic: false,
    isActive: true,
    allowStudentRecords: false,
    allowStaffRecords: false,
    allowRegisteredStudents: false,
    allowRegisteredStaff: false
  });
  const [modalTab, setModalTab] = useState("general"); // "general" | "advanced"

  const [submitting, setSubmitting] = useState(false);

  // Fetch all departments with live stats for Super Admin
  const fetchDepartments = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(
        `${process.env.REACT_APP_API_URL || "http://localhost:5000"}/api/departments/all`
      );
      if (!res.ok) throw new Error("Failed to load departments");
      const data = await res.json();
      setDepartments(data);
    } catch (err) {
      console.error(err);
      setMsg("Failed to load departments");
      setStatusType("error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDepartments();
  }, [fetchDepartments]);

  const showNotification = (message, type = "success") => {
    setMsg(message);
    setStatusType(type);
    setTimeout(() => {
      setMsg("");
      setStatusType("");
    }, 4500);
  };

  // Open Add Modal
  const handleOpenAdd = () => {
    setFormData({
      name: "",
      code: "",
      description: "",
      targetAudience: "both",
      isAcademic: false,
      isActive: true,
      allowStudentRecords: false,
      allowStaffRecords: false,
      allowRegisteredStudents: false,
      allowRegisteredStaff: false
    });
    setModalTab("general");
    setShowAddModal(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (dept) => {
    setSelectedDept(dept);
    setFormData({
      name: dept.name,
      code: dept.code || "",
      description: dept.description || "",
      targetAudience: dept.targetAudience || "both",
      isAcademic: !!dept.isAcademic,
      isActive: dept.isActive !== false,
      allowStudentRecords: dept.allowStudentRecords !== undefined ? !!dept.allowStudentRecords : dept.name.toLowerCase() === "student section",
      allowStaffRecords: dept.allowStaffRecords !== undefined ? !!dept.allowStaffRecords : dept.name.toLowerCase() === "hr",
      allowRegisteredStudents: !!dept.allowRegisteredStudents,
      allowRegisteredStaff: !!dept.allowRegisteredStaff
    });
    setModalTab("general");
    setShowEditModal(true);
  };

  // Handle Add Department
  const handleAddSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      showNotification("Please provide a department name.", "error");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(
        `${process.env.REACT_APP_API_URL || "http://localhost:5000"}/api/departments`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData)
        }
      );

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to create department");

      showNotification(`✅ Department "${formData.name}" added successfully!`, "success");
      setShowAddModal(false);
      fetchDepartments();
    } catch (err) {
      showNotification(err.message, "error");
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Edit Department
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      showNotification("Please provide a department name.", "error");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(
        `${process.env.REACT_APP_API_URL || "http://localhost:5000"}/api/departments/${selectedDept._id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData)
        }
      );

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to update department");

      showNotification(`✅ Department "${formData.name}" updated successfully!`, "success");
      setShowEditModal(false);
      fetchDepartments();
    } catch (err) {
      showNotification(err.message, "error");
    } finally {
      setSubmitting(false);
    }
  };

  // Toggle Active / Inactive (Safe soft toggle)
  const handleToggleStatus = async (dept) => {
    try {
      const res = await fetch(
        `${process.env.REACT_APP_API_URL || "http://localhost:5000"}/api/departments/${dept._id}/toggle`,
        {
          method: "PATCH"
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to update status");

      showNotification(data.message, "success");
      fetchDepartments();
    } catch (err) {
      showNotification(err.message, "error");
    }
  };

  // Delete Department (Guarded)
  const handleDelete = async (dept) => {
    const confirmDelete = window.confirm(
      `Are you sure you want to permanently delete "${dept.name}"?\n\nNote: If any active grievances or staff members are currently associated with this department, the system will prevent deletion to protect your data.`
    );
    if (!confirmDelete) return;

    try {
      const res = await fetch(
        `${process.env.REACT_APP_API_URL || "http://localhost:5000"}/api/departments/${dept._id}`,
        {
          method: "DELETE"
        }
      );
      const data = await res.json();

      if (!res.ok) {
        // Backend blocked delete due to existing records
        alert(data.message);
        showNotification(data.message, "error");
        return;
      }

      showNotification(data.message, "success");
      fetchDepartments();
    } catch (err) {
      showNotification(err.message, "error");
    }
  };

  // Filtered List
  const filteredDepartments = departments.filter((d) => {
    if (filterStatus === "active" && !d.isActive) return false;
    if (filterStatus === "inactive" && d.isActive) return false;

    if (filterType === "academic" && !d.isAcademic) return false;
    if (filterType === "admin" && d.isAcademic) return false;

    if (filterAudience !== "all" && d.targetAudience !== filterAudience) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchName = d.name.toLowerCase().includes(q);
      const matchCode = (d.code || "").toLowerCase().includes(q);
      const matchDesc = (d.description || "").toLowerCase().includes(q);
      return matchName || matchCode || matchDesc;
    }

    return true;
  });

  const totalActive = departments.filter((d) => d.isActive).length;
  const totalInactive = departments.filter((d) => !d.isActive).length;
  const totalGrievancesAll = departments.reduce(
    (sum, d) => sum + (d.stats?.totalGrievances || 0),
    0
  );

  return (
    <div style={{ marginTop: "10px" }}>
      {/* Alert Notification */}
      {msg && (
        <div
          style={{
            padding: "12px 16px",
            marginBottom: "20px",
            borderRadius: "8px",
            display: "flex",
            alignItems: "center",
            gap: "10px",
            fontWeight: "500",
            backgroundColor: statusType === "error" ? "#fee2e2" : "#dcfce7",
            color: statusType === "error" ? "#991b1b" : "#166534",
            border: `1px solid ${statusType === "error" ? "#fca5a5" : "#86efac"}`
          }}
        >
          {statusType === "error" ? (
            <AlertCircleIcon width="18" height="18" />
          ) : (
            <CheckCircleIcon width="18" height="18" />
          )}
          <span>{msg}</span>
        </div>
      )}

      {/* Summary KPI Cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: "16px",
          marginBottom: "20px"
        }}
      >
        <div
          style={{
            background: "#fff",
            padding: "16px 20px",
            borderRadius: "10px",
            boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
            border: "1px solid #e2e8f0"
          }}
        >
          <div style={{ fontSize: "0.85rem", color: "#64748b", fontWeight: "600", textTransform: "uppercase" }}>
            Total Departments
          </div>
          <div style={{ fontSize: "1.8rem", fontWeight: "700", color: "#1e293b", marginTop: "4px" }}>
            {departments.length}
          </div>
        </div>

        <div
          style={{
            background: "#fff",
            padding: "16px 20px",
            borderRadius: "10px",
            boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
            border: "1px solid #e2e8f0"
          }}
        >
          <div style={{ fontSize: "0.85rem", color: "#16a34a", fontWeight: "600", textTransform: "uppercase" }}>
            Active Departments
          </div>
          <div style={{ fontSize: "1.8rem", fontWeight: "700", color: "#16a34a", marginTop: "4px" }}>
            {totalActive}
          </div>
        </div>

        <div
          style={{
            background: "#fff",
            padding: "16px 20px",
            borderRadius: "10px",
            boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
            border: "1px solid #e2e8f0"
          }}
        >
          <div style={{ fontSize: "0.85rem", color: "#64748b", fontWeight: "600", textTransform: "uppercase" }}>
            Deactivated
          </div>
          <div style={{ fontSize: "1.8rem", fontWeight: "700", color: "#94a3b8", marginTop: "4px" }}>
            {totalInactive}
          </div>
        </div>

        <div
          style={{
            background: "#fff",
            padding: "16px 20px",
            borderRadius: "10px",
            boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
            border: "1px solid #e2e8f0"
          }}
        >
          <div style={{ fontSize: "0.85rem", color: "#2563eb", fontWeight: "600", textTransform: "uppercase" }}>
            Total Grievances
          </div>
          <div style={{ fontSize: "1.8rem", fontWeight: "700", color: "#2563eb", marginTop: "4px" }}>
            {totalGrievancesAll}
          </div>
        </div>
      </div>

      {/* Main Card with Toolbar & Table */}
      <div className="card" style={{ padding: "20px" }}>
        {/* Header Toolbar */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "12px",
            marginBottom: "16px"
          }}
        >
          <div>
            <h2 style={{ margin: 0, fontSize: "1.3rem", color: "#1e293b" }}>
              University Departments Directory
            </h2>
            <p style={{ margin: "4px 0 0", color: "#64748b", fontSize: "0.85rem" }}>
              Add, edit, or deactivate departments dynamically. Changes reflect instantly across student forms, staff routing, and triage.
            </p>
          </div>

          <button
            onClick={handleOpenAdd}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              padding: "9px 18px",
              backgroundColor: "#2563eb",
              color: "#fff",
              border: "none",
              borderRadius: "6px",
              fontWeight: "600",
              cursor: "pointer",
              fontSize: "0.9rem",
              boxShadow: "0 2px 4px rgba(37, 99, 235, 0.2)"
            }}
          >
            <PlusIcon width="16" height="16" />
            Add Department
          </button>
        </div>

        {/* Filter Bar */}
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "12px",
            marginBottom: "16px",
            padding: "12px",
            background: "#f8fafc",
            borderRadius: "8px",
            border: "1px solid #e2e8f0"
          }}
        >
          <input
            type="text"
            placeholder="Search by department name, code..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              padding: "7px 12px",
              border: "1px solid #cbd5e1",
              borderRadius: "6px",
              flex: "1 1 240px",
              fontSize: "0.88rem"
            }}
          />

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            style={{
              padding: "7px 12px",
              border: "1px solid #cbd5e1",
              borderRadius: "6px",
              fontSize: "0.88rem",
              background: "#fff"
            }}
          >
            <option value="all">All Statuses</option>
            <option value="active">Active Only</option>
            <option value="inactive">Inactive Only</option>
          </select>

          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            style={{
              padding: "7px 12px",
              border: "1px solid #cbd5e1",
              borderRadius: "6px",
              fontSize: "0.88rem",
              background: "#fff"
            }}
          >
            <option value="all">All Categories</option>
            <option value="academic">Academic Schools</option>
            <option value="admin">Administrative</option>
          </select>

          <select
            value={filterAudience}
            onChange={(e) => setFilterAudience(e.target.value)}
            style={{
              padding: "7px 12px",
              border: "1px solid #cbd5e1",
              borderRadius: "6px",
              fontSize: "0.88rem",
              background: "#fff"
            }}
          >
            <option value="all">All Audiences</option>
            <option value="both">Student & Staff</option>
            <option value="student">Student Only</option>
            <option value="staff">Staff Only</option>
          </select>

          {(searchQuery || filterStatus !== "all" || filterType !== "all" || filterAudience !== "all") && (
            <button
              onClick={() => {
                setSearchQuery("");
                setFilterStatus("all");
                setFilterType("all");
                setFilterAudience("all");
              }}
              style={{
                padding: "7px 14px",
                background: "#e2e8f0",
                color: "#475569",
                border: "none",
                borderRadius: "6px",
                fontSize: "0.85rem",
                cursor: "pointer"
              }}
            >
              Reset Filters
            </button>
          )}
        </div>

        {/* Table */}
        {loading ? (
          <div style={{ textAlign: "center", padding: "40px", color: "#64748b" }}>
            Loading university departments...
          </div>
        ) : filteredDepartments.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px", color: "#64748b" }}>
            No departments match your filters.
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
              <thead>
                <tr style={{ borderBottom: "2px solid #e2e8f0", color: "#475569", fontSize: "0.85rem" }}>
                  <th style={{ padding: "10px 12px" }}>Department Name</th>
                  <th style={{ padding: "10px 12px" }}>Code</th>
                  <th style={{ padding: "10px 12px" }}>Category</th>
                  <th style={{ padding: "10px 12px" }}>Audience</th>
                  <th style={{ padding: "10px 12px" }}>Record Permissions</th>
                  <th style={{ padding: "10px 12px" }}>Dept Admin</th>
                  <th style={{ padding: "10px 12px" }}>Assigned Staff</th>
                  <th style={{ padding: "10px 12px" }}>Pending / Total</th>
                  <th style={{ padding: "10px 12px" }}>Status</th>
                  <th style={{ padding: "10px 12px", textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredDepartments.map((dept) => (
                  <tr
                    key={dept._id}
                    style={{
                      borderBottom: "1px solid #f1f5f9",
                      opacity: dept.isActive ? 1 : 0.65,
                      transition: "background 0.15s"
                    }}
                  >
                    {/* Name & Desc */}
                    <td style={{ padding: "12px", maxWidth: "260px" }}>
                      <div style={{ fontWeight: "600", color: "#1e293b", fontSize: "0.92rem" }}>
                        {dept.name}
                      </div>
                      {dept.description && (
                        <div
                          style={{
                            color: "#64748b",
                            fontSize: "0.78rem",
                            marginTop: "2px",
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis"
                          }}
                          title={dept.description}
                        >
                          {dept.description}
                        </div>
                      )}
                    </td>

                    {/* Code Badge */}
                    <td style={{ padding: "12px" }}>
                      <span
                        style={{
                          background: "#f1f5f9",
                          color: "#334155",
                          padding: "3px 7px",
                          borderRadius: "4px",
                          fontSize: "0.78rem",
                          fontWeight: "700",
                          fontFamily: "monospace"
                        }}
                      >
                        {dept.code || "-"}
                      </span>
                    </td>

                    {/* Category */}
                    <td style={{ padding: "12px", fontSize: "0.85rem" }}>
                      {dept.isAcademic ? (
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "4px",
                            color: "#0369a1",
                            background: "#e0f2fe",
                            padding: "2px 8px",
                            borderRadius: "12px",
                            fontSize: "0.75rem",
                            fontWeight: "600"
                          }}
                        >
                          <GraduationCapIcon width="13" height="13" /> Academic
                        </span>
                      ) : (
                        <span
                          style={{
                            color: "#475569",
                            background: "#f1f5f9",
                            padding: "2px 8px",
                            borderRadius: "12px",
                            fontSize: "0.75rem",
                            fontWeight: "600"
                          }}
                        >
                          Administrative
                        </span>
                      )}
                    </td>

                    {/* Audience */}
                    <td style={{ padding: "12px", fontSize: "0.82rem", color: "#475569" }}>
                      {dept.targetAudience === "both"
                        ? "Student & Staff"
                        : dept.targetAudience === "student"
                        ? "Students Only"
                        : "Staff Only"}
                    </td>

                    {/* Record & User Permissions Badges */}
                    <td style={{ padding: "12px", fontSize: "0.82rem" }}>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
                        {dept.allowRegisteredStudents && (
                          <span
                            title="Allowed to View, Edit & Delete Live Registered Students"
                            style={{
                              background: "#ecfdf5",
                              color: "#047857",
                              border: "1px solid #a7f3d0",
                              padding: "2px 7px",
                              borderRadius: "10px",
                              fontSize: "0.72rem",
                              fontWeight: "700",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "3px"
                            }}
                          >
                            🟢 Live Students
                          </span>
                        )}
                        {dept.allowRegisteredStaff && (
                          <span
                            title="Allowed to View, Edit & Delete Live Registered Staff / Faculty"
                            style={{
                              background: "#faf5ff",
                              color: "#7e22ce",
                              border: "1px solid #e9d5ff",
                              padding: "2px 7px",
                              borderRadius: "10px",
                              fontSize: "0.72rem",
                              fontWeight: "700",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "3px"
                            }}
                          >
                            🟣 Live Staff
                          </span>
                        )}
                        {(dept.allowStudentRecords || dept.name === "Student Section") && (
                          <span
                            title="Allowed to manage Student Verification Records (Excel)"
                            style={{
                              background: "#dbeafe",
                              color: "#1e40af",
                              padding: "2px 7px",
                              borderRadius: "10px",
                              fontSize: "0.72rem",
                              fontWeight: "600",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "3px"
                            }}
                          >
                            🎓 Student Records
                          </span>
                        )}
                        {(dept.allowStaffRecords || dept.name === "HR") && (
                          <span
                            title="Allowed to manage Staff Verification Records (Excel)"
                            style={{
                              background: "#f3e8ff",
                              color: "#6b21a8",
                              padding: "2px 7px",
                              borderRadius: "10px",
                              fontSize: "0.72rem",
                              fontWeight: "600",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "3px"
                            }}
                          >
                            👥 Staff Records
                          </span>
                        )}
                        {!dept.allowStudentRecords && !dept.allowStaffRecords && !dept.allowRegisteredStudents && !dept.allowRegisteredStaff && dept.name !== "Student Section" && dept.name !== "HR" && (
                          <span style={{ color: "#94a3b8", fontSize: "0.75rem", fontStyle: "italic" }}>
                            None
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Dept Admin */}
                    <td style={{ padding: "12px", fontSize: "0.85rem" }}>
                      {dept.currentAdmin ? (
                        <span style={{ color: "#047857", fontWeight: "600" }}>
                          {dept.currentAdmin.fullName || dept.currentAdmin.id}
                        </span>
                      ) : (
                        <span style={{ color: "#94a3b8", fontStyle: "italic", fontSize: "0.82rem" }}>
                          Unassigned
                        </span>
                      )}
                    </td>

                    {/* Staff Count */}
                    <td style={{ padding: "12px", fontSize: "0.85rem", color: "#334155", fontWeight: "500" }}>
                      {dept.stats?.assignedStaffCount || 0} staff
                    </td>

                    {/* Grievance Count */}
                    <td style={{ padding: "12px", fontSize: "0.85rem" }}>
                      <span
                        style={{
                          fontWeight: "700",
                          color: (dept.stats?.pendingGrievances || 0) > 0 ? "#dc2626" : "#16a34a"
                        }}
                      >
                        {dept.stats?.pendingGrievances || 0}
                      </span>{" "}
                      <span style={{ color: "#94a3b8" }}>/ {dept.stats?.totalGrievances || 0}</span>
                    </td>

                    {/* Active Status Pill */}
                    <td style={{ padding: "12px" }}>
                      <span
                        style={{
                          padding: "3px 9px",
                          borderRadius: "12px",
                          fontSize: "0.76rem",
                          fontWeight: "700",
                          backgroundColor: dept.isActive ? "#dcfce7" : "#fee2e2",
                          color: dept.isActive ? "#166534" : "#991b1b"
                        }}
                      >
                        {dept.isActive ? "ACTIVE" : "INACTIVE"}
                      </span>
                    </td>

                    {/* Actions */}
                    <td style={{ padding: "12px", textAlign: "right" }}>
                      <div style={{ display: "inline-flex", gap: "6px", alignItems: "center" }}>
                        {/* Toggle Active Button */}
                        <button
                          onClick={() => handleToggleStatus(dept)}
                          title={dept.isActive ? "Deactivate department (Safe)" : "Activate department"}
                          style={{
                            padding: "5px 9px",
                            fontSize: "0.75rem",
                            borderRadius: "4px",
                            border: "1px solid #cbd5e1",
                            background: dept.isActive ? "#fff7ed" : "#f0fdf4",
                            color: dept.isActive ? "#c2410c" : "#15803d",
                            fontWeight: "600",
                            cursor: "pointer"
                          }}
                        >
                          {dept.isActive ? "Deactivate" : "Activate"}
                        </button>

                        {/* Edit Button */}
                        <button
                          onClick={() => handleOpenEdit(dept)}
                          title="Edit Department"
                          style={{
                            padding: "5px 8px",
                            fontSize: "0.75rem",
                            borderRadius: "4px",
                            border: "1px solid #cbd5e1",
                            background: "#fff",
                            color: "#2563eb",
                            cursor: "pointer",
                            display: "inline-flex",
                            alignItems: "center"
                          }}
                        >
                          <EditIcon width="13" height="13" />
                        </button>

                        {/* Delete Button */}
                        <button
                          onClick={() => handleDelete(dept)}
                          title="Delete Department"
                          style={{
                            padding: "5px 8px",
                            fontSize: "0.75rem",
                            borderRadius: "4px",
                            border: "1px solid #fecaca",
                            background: "#fef2f2",
                            color: "#dc2626",
                            cursor: "pointer",
                            display: "inline-flex",
                            alignItems: "center"
                          }}
                        >
                          <TrashIcon width="13" height="13" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL: ADD DEPARTMENT */}
      {showAddModal && (
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
              <h3 style={{ margin: 0, fontSize: "1.2rem", color: "#1e293b" }}>Add New Department</h3>
              <button
                onClick={() => setShowAddModal(false)}
                style={{ background: "none", border: "none", cursor: "pointer", color: "#64748b" }}
              >
                <XIcon width="20" height="20" />
              </button>
            </div>

            {/* Modal Tabs */}
            <div style={{ display: "flex", gap: "8px", borderBottom: "1px solid #e2e8f0", marginBottom: "18px" }}>
              <button
                type="button"
                onClick={() => setModalTab("general")}
                style={{
                  padding: "8px 16px",
                  border: "none",
                  background: "none",
                  borderBottom: modalTab === "general" ? "2px solid #2563eb" : "2px solid transparent",
                  color: modalTab === "general" ? "#2563eb" : "#64748b",
                  fontWeight: modalTab === "general" ? "700" : "500",
                  fontSize: "0.88rem",
                  cursor: "pointer",
                  transition: "all 0.15s"
                }}
              >
                General Information
              </button>
              <button
                type="button"
                onClick={() => setModalTab("advanced")}
                style={{
                  padding: "8px 16px",
                  border: "none",
                  background: "none",
                  borderBottom: modalTab === "advanced" ? "2px solid #2563eb" : "2px solid transparent",
                  color: modalTab === "advanced" ? "#2563eb" : "#64748b",
                  fontWeight: modalTab === "advanced" ? "700" : "500",
                  fontSize: "0.88rem",
                  cursor: "pointer",
                  transition: "all 0.15s",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px"
                }}
              >
                Advanced & Permissions
                {(formData.allowStudentRecords || formData.allowStaffRecords || formData.allowRegisteredStudents || formData.allowRegisteredStaff) && (
                  <span style={{ background: "#dbeafe", color: "#1e40af", fontSize: "0.68rem", padding: "1px 6px", borderRadius: "10px", fontWeight: "700" }}>
                    Active
                  </span>
                )}
              </button>
            </div>

            <form onSubmit={handleAddSubmit}>
              {modalTab === "general" && (
                <>
                  <div style={{ marginBottom: "14px" }}>
                    <label style={{ display: "block", fontSize: "0.85rem", fontWeight: "600", color: "#334155", marginBottom: "5px" }}>
                      Department Name *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Sports & Athletics, Hostel Office"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      style={{
                        width: "100%",
                        padding: "8px 12px",
                        border: "1px solid #cbd5e1",
                        borderRadius: "6px",
                        fontSize: "0.9rem"
                      }}
                    />
                  </div>

                  <div style={{ marginBottom: "14px" }}>
                    <label style={{ display: "block", fontSize: "0.85rem", fontWeight: "600", color: "#334155", marginBottom: "5px" }}>
                      Short Code (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. SPO, HST (Auto-generated if empty)"
                      value={formData.code}
                      onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                      style={{
                        width: "100%",
                        padding: "8px 12px",
                        border: "1px solid #cbd5e1",
                        borderRadius: "6px",
                        fontSize: "0.9rem"
                      }}
                    />
                  </div>

                  <div style={{ marginBottom: "14px" }}>
                    <label style={{ display: "block", fontSize: "0.85rem", fontWeight: "600", color: "#334155", marginBottom: "5px" }}>
                      Description
                    </label>
                    <textarea
                      rows="2"
                      placeholder="Brief summary of grievances handled by this department"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      style={{
                        width: "100%",
                        padding: "8px 12px",
                        border: "1px solid #cbd5e1",
                        borderRadius: "6px",
                        fontSize: "0.88rem",
                        resize: "vertical"
                      }}
                    />
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "16px" }}>
                    <div>
                      <label style={{ display: "block", fontSize: "0.85rem", fontWeight: "600", color: "#334155", marginBottom: "5px" }}>
                        Target Audience
                      </label>
                      <select
                        value={formData.targetAudience}
                        onChange={(e) => setFormData({ ...formData, targetAudience: e.target.value })}
                        style={{
                          width: "100%",
                          padding: "8px 12px",
                          border: "1px solid #cbd5e1",
                          borderRadius: "6px",
                          fontSize: "0.88rem",
                          background: "#fff"
                        }}
                      >
                        <option value="both">Both (Students & Staff)</option>
                        <option value="student">Students Only</option>
                        <option value="staff">Staff Only</option>
                      </select>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", marginTop: "22px" }}>
                      <label style={{ display: "inline-flex", alignItems: "center", gap: "8px", fontSize: "0.85rem", color: "#334155", cursor: "pointer" }}>
                        <input
                          type="checkbox"
                          checked={formData.isAcademic}
                          onChange={(e) => setFormData({ ...formData, isAcademic: e.target.checked })}
                          style={{ width: "16px", height: "16px" }}
                        />
                        Is Academic School?
                      </label>
                    </div>
                  </div>
                </>
              )}

              {modalTab === "advanced" && (
                <div style={{ padding: "4px 0", maxHeight: "420px", overflowY: "auto" }}>
                  {/* SECTION 1: LIVE REGISTERED USERS MANAGEMENT */}
                  <div style={{ marginBottom: "16px", background: "#f0fdf4", padding: "12px", borderRadius: "8px", border: "1px solid #bbf7d0" }}>
                    <h4 style={{ margin: "0 0 4px 0", fontSize: "0.92rem", color: "#166534", fontWeight: "700", display: "flex", alignItems: "center", gap: "6px" }}>
                      ⚡ Live Registered Users Access (Live Accounts)
                    </h4>
                    <p style={{ margin: 0, fontSize: "0.78rem", color: "#15803d", lineHeight: "1.4" }}>
                      Empower this department admin to view real-time registered students and faculty on the portal, including capabilities to edit profiles or delete accounts.
                    </p>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "18px" }}>
                    {/* Live Registered Students Card */}
                    <div
                      onClick={() => setFormData({ ...formData, allowRegisteredStudents: !formData.allowRegisteredStudents })}
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        gap: "12px",
                        padding: "12px 14px",
                        borderRadius: "8px",
                        border: formData.allowRegisteredStudents ? "2px solid #059669" : "1px solid #cbd5e1",
                        background: formData.allowRegisteredStudents ? "#ecfdf5" : "#fff",
                        cursor: "pointer",
                        transition: "all 0.15s"
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={formData.allowRegisteredStudents}
                        onChange={(e) => {
                          e.stopPropagation();
                          setFormData({ ...formData, allowRegisteredStudents: e.target.checked });
                        }}
                        style={{ marginTop: "3px", width: "18px", height: "18px", accentColor: "#059669", cursor: "pointer" }}
                      />
                      <div>
                        <div style={{ fontWeight: "700", color: "#1e293b", fontSize: "0.88rem", display: "flex", alignItems: "center", gap: "6px" }}>
                          🎓 Allow Managing Live Registered Students
                          <span style={{ background: "#d1fae5", color: "#065f46", fontSize: "0.7rem", padding: "1px 6px", borderRadius: "8px", fontWeight: "700" }}>Live</span>
                        </div>
                        <p style={{ margin: "4px 0 0 0", fontSize: "0.78rem", color: "#64748b", lineHeight: "1.4" }}>
                          Authorized admin can view all live registered students, view verified status, and <strong>edit or delete</strong> student accounts.
                        </p>
                      </div>
                    </div>

                    {/* Live Registered Staff Card */}
                    <div
                      onClick={() => setFormData({ ...formData, allowRegisteredStaff: !formData.allowRegisteredStaff })}
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        gap: "12px",
                        padding: "12px 14px",
                        borderRadius: "8px",
                        border: formData.allowRegisteredStaff ? "2px solid #7c3aed" : "1px solid #cbd5e1",
                        background: formData.allowRegisteredStaff ? "#faf5ff" : "#fff",
                        cursor: "pointer",
                        transition: "all 0.15s"
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={formData.allowRegisteredStaff}
                        onChange={(e) => {
                          e.stopPropagation();
                          setFormData({ ...formData, allowRegisteredStaff: e.target.checked });
                        }}
                        style={{ marginTop: "3px", width: "18px", height: "18px", accentColor: "#7c3aed", cursor: "pointer" }}
                      />
                      <div>
                        <div style={{ fontWeight: "700", color: "#1e293b", fontSize: "0.88rem", display: "flex", alignItems: "center", gap: "6px" }}>
                          👥 Allow Managing Live Registered Staff & Faculty
                          <span style={{ background: "#ede9fe", color: "#5b21b6", fontSize: "0.7rem", padding: "1px 6px", borderRadius: "8px", fontWeight: "700" }}>Live + Edit/Delete</span>
                        </div>
                        <p style={{ margin: "4px 0 0 0", fontSize: "0.78rem", color: "#64748b", lineHeight: "1.4" }}>
                          Authorized admin can view all registered staff/faculty, and has full access to <strong>edit details/department</strong> and <strong>delete</strong> existing staff.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* SECTION 2: PRE-LOADED VERIFICATION RECORDS */}
                  <div style={{ marginBottom: "12px", background: "#f8fafc", padding: "10px 12px", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                    <h4 style={{ margin: "0 0 3px 0", fontSize: "0.88rem", color: "#334155", fontWeight: "700" }}>
                      📋 Verification Records (Excel Pre-Upload)
                    </h4>
                    <p style={{ margin: 0, fontSize: "0.75rem", color: "#64748b", lineHeight: "1.3" }}>
                      Allow admin to upload Excel spreadsheets to pre-verify IDs before registration.
                    </p>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                    {/* Student Records Card */}
                    <div
                      onClick={() => setFormData({ ...formData, allowStudentRecords: !formData.allowStudentRecords })}
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        gap: "12px",
                        padding: "10px 12px",
                        borderRadius: "8px",
                        border: formData.allowStudentRecords ? "2px solid #3b82f6" : "1px solid #cbd5e1",
                        background: formData.allowStudentRecords ? "#eff6ff" : "#fff",
                        cursor: "pointer",
                        transition: "all 0.15s"
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={formData.allowStudentRecords}
                        onChange={(e) => {
                          e.stopPropagation();
                          setFormData({ ...formData, allowStudentRecords: e.target.checked });
                        }}
                        style={{ marginTop: "3px", width: "16px", height: "16px", accentColor: "#2563eb", cursor: "pointer" }}
                      />
                      <div>
                        <div style={{ fontWeight: "700", color: "#1e293b", fontSize: "0.85rem" }}>
                          Allow Managing Student Verification Records (.xlsx)
                        </div>
                      </div>
                    </div>

                    {/* Staff Records Card */}
                    <div
                      onClick={() => setFormData({ ...formData, allowStaffRecords: !formData.allowStaffRecords })}
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        gap: "12px",
                        padding: "10px 12px",
                        borderRadius: "8px",
                        border: formData.allowStaffRecords ? "2px solid #8b5cf6" : "1px solid #cbd5e1",
                        background: formData.allowStaffRecords ? "#f5f3ff" : "#fff",
                        cursor: "pointer",
                        transition: "all 0.15s"
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={formData.allowStaffRecords}
                        onChange={(e) => {
                          e.stopPropagation();
                          setFormData({ ...formData, allowStaffRecords: e.target.checked });
                        }}
                        style={{ marginTop: "3px", width: "16px", height: "16px", accentColor: "#7c3aed", cursor: "pointer" }}
                      />
                      <div>
                        <div style={{ fontWeight: "700", color: "#1e293b", fontSize: "0.85rem" }}>
                          Allow Managing Staff Verification Records (.xlsx)
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "20px" }}>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  style={{
                    padding: "8px 16px",
                    background: "#f1f5f9",
                    color: "#475569",
                    border: "none",
                    borderRadius: "6px",
                    cursor: "pointer",
                    fontSize: "0.88rem"
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{
                    padding: "8px 18px",
                    background: "#2563eb",
                    color: "#fff",
                    border: "none",
                    borderRadius: "6px",
                    fontWeight: "600",
                    cursor: "pointer",
                    fontSize: "0.88rem"
                  }}
                >
                  {submitting ? "Creating..." : "Save Department"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: EDIT DEPARTMENT */}
      {showEditModal && (
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
              <h3 style={{ margin: 0, fontSize: "1.2rem", color: "#1e293b" }}>Edit Department</h3>
              <button
                onClick={() => setShowEditModal(false)}
                style={{ background: "none", border: "none", cursor: "pointer", color: "#64748b" }}
              >
                <XIcon width="20" height="20" />
              </button>
            </div>

            {/* Modal Tabs */}
            <div style={{ display: "flex", gap: "8px", borderBottom: "1px solid #e2e8f0", marginBottom: "18px" }}>
              <button
                type="button"
                onClick={() => setModalTab("general")}
                style={{
                  padding: "8px 16px",
                  border: "none",
                  background: "none",
                  borderBottom: modalTab === "general" ? "2px solid #2563eb" : "2px solid transparent",
                  color: modalTab === "general" ? "#2563eb" : "#64748b",
                  fontWeight: modalTab === "general" ? "700" : "500",
                  fontSize: "0.88rem",
                  cursor: "pointer",
                  transition: "all 0.15s"
                }}
              >
                General Information
              </button>
              <button
                type="button"
                onClick={() => setModalTab("advanced")}
                style={{
                  padding: "8px 16px",
                  border: "none",
                  background: "none",
                  borderBottom: modalTab === "advanced" ? "2px solid #2563eb" : "2px solid transparent",
                  color: modalTab === "advanced" ? "#2563eb" : "#64748b",
                  fontWeight: modalTab === "advanced" ? "700" : "500",
                  fontSize: "0.88rem",
                  cursor: "pointer",
                  transition: "all 0.15s",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px"
                }}
              >
                Advanced & Permissions
                {(formData.allowStudentRecords || formData.allowStaffRecords || formData.allowRegisteredStudents || formData.allowRegisteredStaff) && (
                  <span style={{ background: "#dbeafe", color: "#1e40af", fontSize: "0.68rem", padding: "1px 6px", borderRadius: "10px", fontWeight: "700" }}>
                    Active
                  </span>
                )}
              </button>
            </div>

            <form onSubmit={handleEditSubmit}>
              {modalTab === "general" && (
                <>
                  <div style={{ marginBottom: "14px" }}>
                    <label style={{ display: "block", fontSize: "0.85rem", fontWeight: "600", color: "#334155", marginBottom: "5px" }}>
                      Department Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      style={{
                        width: "100%",
                        padding: "8px 12px",
                        border: "1px solid #cbd5e1",
                        borderRadius: "6px",
                        fontSize: "0.9rem"
                      }}
                    />
                    <small style={{ color: "#64748b", fontSize: "0.76rem" }}>
                      Note: Renaming will automatically update all existing grievances and staff records.
                    </small>
                  </div>

                  <div style={{ marginBottom: "14px" }}>
                    <label style={{ display: "block", fontSize: "0.85rem", fontWeight: "600", color: "#334155", marginBottom: "5px" }}>
                      Short Code
                    </label>
                    <input
                      type="text"
                      value={formData.code}
                      onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                      style={{
                        width: "100%",
                        padding: "8px 12px",
                        border: "1px solid #cbd5e1",
                        borderRadius: "6px",
                        fontSize: "0.9rem"
                      }}
                    />
                  </div>

                  <div style={{ marginBottom: "14px" }}>
                    <label style={{ display: "block", fontSize: "0.85rem", fontWeight: "600", color: "#334155", marginBottom: "5px" }}>
                      Description
                    </label>
                    <textarea
                      rows="2"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      style={{
                        width: "100%",
                        padding: "8px 12px",
                        border: "1px solid #cbd5e1",
                        borderRadius: "6px",
                        fontSize: "0.88rem",
                        resize: "vertical"
                      }}
                    />
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "16px" }}>
                    <div>
                      <label style={{ display: "block", fontSize: "0.85rem", fontWeight: "600", color: "#334155", marginBottom: "5px" }}>
                        Target Audience
                      </label>
                      <select
                        value={formData.targetAudience}
                        onChange={(e) => setFormData({ ...formData, targetAudience: e.target.value })}
                        style={{
                          width: "100%",
                          padding: "8px 12px",
                          border: "1px solid #cbd5e1",
                          borderRadius: "6px",
                          fontSize: "0.88rem",
                          background: "#fff"
                        }}
                      >
                        <option value="both">Both (Students & Staff)</option>
                        <option value="student">Students Only</option>
                        <option value="staff">Staff Only</option>
                      </select>
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "12px" }}>
                      <label style={{ display: "inline-flex", alignItems: "center", gap: "8px", fontSize: "0.85rem", color: "#334155", cursor: "pointer" }}>
                        <input
                          type="checkbox"
                          checked={formData.isAcademic}
                          onChange={(e) => setFormData({ ...formData, isAcademic: e.target.checked })}
                          style={{ width: "16px", height: "16px" }}
                        />
                        Is Academic School?
                      </label>

                      <label style={{ display: "inline-flex", alignItems: "center", gap: "8px", fontSize: "0.85rem", color: "#334155", cursor: "pointer" }}>
                        <input
                          type="checkbox"
                          checked={formData.isActive}
                          onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                          style={{ width: "16px", height: "16px" }}
                        />
                        Department is Active
                      </label>
                    </div>
                  </div>
                </>
              )}

              {modalTab === "advanced" && (
                <div style={{ padding: "4px 0", maxHeight: "420px", overflowY: "auto" }}>
                  {/* SECTION 1: LIVE REGISTERED USERS MANAGEMENT */}
                  <div style={{ marginBottom: "16px", background: "#f0fdf4", padding: "12px", borderRadius: "8px", border: "1px solid #bbf7d0" }}>
                    <h4 style={{ margin: "0 0 4px 0", fontSize: "0.92rem", color: "#166534", fontWeight: "700", display: "flex", alignItems: "center", gap: "6px" }}>
                      ⚡ Live Registered Users Access (Live Accounts)
                    </h4>
                    <p style={{ margin: 0, fontSize: "0.78rem", color: "#15803d", lineHeight: "1.4" }}>
                      Empower this department admin to view real-time registered students and faculty on the portal, including capabilities to edit profiles or delete accounts.
                    </p>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "18px" }}>
                    {/* Live Registered Students Card */}
                    <div
                      onClick={() => setFormData({ ...formData, allowRegisteredStudents: !formData.allowRegisteredStudents })}
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        gap: "12px",
                        padding: "12px 14px",
                        borderRadius: "8px",
                        border: formData.allowRegisteredStudents ? "2px solid #059669" : "1px solid #cbd5e1",
                        background: formData.allowRegisteredStudents ? "#ecfdf5" : "#fff",
                        cursor: "pointer",
                        transition: "all 0.15s"
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={formData.allowRegisteredStudents}
                        onChange={(e) => {
                          e.stopPropagation();
                          setFormData({ ...formData, allowRegisteredStudents: e.target.checked });
                        }}
                        style={{ marginTop: "3px", width: "18px", height: "18px", accentColor: "#059669", cursor: "pointer" }}
                      />
                      <div>
                        <div style={{ fontWeight: "700", color: "#1e293b", fontSize: "0.88rem", display: "flex", alignItems: "center", gap: "6px" }}>
                          🎓 Allow Managing Live Registered Students
                          <span style={{ background: "#d1fae5", color: "#065f46", fontSize: "0.7rem", padding: "1px 6px", borderRadius: "8px", fontWeight: "700" }}>Live</span>
                        </div>
                        <p style={{ margin: "4px 0 0 0", fontSize: "0.78rem", color: "#64748b", lineHeight: "1.4" }}>
                          Authorized admin can view all live registered students, view verified status, and <strong>edit or delete</strong> student accounts.
                        </p>
                      </div>
                    </div>

                    {/* Live Registered Staff Card */}
                    <div
                      onClick={() => setFormData({ ...formData, allowRegisteredStaff: !formData.allowRegisteredStaff })}
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        gap: "12px",
                        padding: "12px 14px",
                        borderRadius: "8px",
                        border: formData.allowRegisteredStaff ? "2px solid #7c3aed" : "1px solid #cbd5e1",
                        background: formData.allowRegisteredStaff ? "#faf5ff" : "#fff",
                        cursor: "pointer",
                        transition: "all 0.15s"
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={formData.allowRegisteredStaff}
                        onChange={(e) => {
                          e.stopPropagation();
                          setFormData({ ...formData, allowRegisteredStaff: e.target.checked });
                        }}
                        style={{ marginTop: "3px", width: "18px", height: "18px", accentColor: "#7c3aed", cursor: "pointer" }}
                      />
                      <div>
                        <div style={{ fontWeight: "700", color: "#1e293b", fontSize: "0.88rem", display: "flex", alignItems: "center", gap: "6px" }}>
                          👥 Allow Managing Live Registered Staff & Faculty
                          <span style={{ background: "#ede9fe", color: "#5b21b6", fontSize: "0.7rem", padding: "1px 6px", borderRadius: "8px", fontWeight: "700" }}>Live + Edit/Delete</span>
                        </div>
                        <p style={{ margin: "4px 0 0 0", fontSize: "0.78rem", color: "#64748b", lineHeight: "1.4" }}>
                          Authorized admin can view all registered staff/faculty, and has full access to <strong>edit details/department</strong> and <strong>delete</strong> existing staff.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* SECTION 2: PRE-LOADED VERIFICATION RECORDS */}
                  <div style={{ marginBottom: "12px", background: "#f8fafc", padding: "10px 12px", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                    <h4 style={{ margin: "0 0 3px 0", fontSize: "0.88rem", color: "#334155", fontWeight: "700" }}>
                      📋 Verification Records (Excel Pre-Upload)
                    </h4>
                    <p style={{ margin: 0, fontSize: "0.75rem", color: "#64748b", lineHeight: "1.3" }}>
                      Allow admin to upload Excel spreadsheets to pre-verify IDs before registration.
                    </p>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                    {/* Student Records Card */}
                    <div
                      onClick={() => setFormData({ ...formData, allowStudentRecords: !formData.allowStudentRecords })}
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        gap: "12px",
                        padding: "10px 12px",
                        borderRadius: "8px",
                        border: formData.allowStudentRecords ? "2px solid #3b82f6" : "1px solid #cbd5e1",
                        background: formData.allowStudentRecords ? "#eff6ff" : "#fff",
                        cursor: "pointer",
                        transition: "all 0.15s"
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={formData.allowStudentRecords}
                        onChange={(e) => {
                          e.stopPropagation();
                          setFormData({ ...formData, allowStudentRecords: e.target.checked });
                        }}
                        style={{ marginTop: "3px", width: "16px", height: "16px", accentColor: "#2563eb", cursor: "pointer" }}
                      />
                      <div>
                        <div style={{ fontWeight: "700", color: "#1e293b", fontSize: "0.85rem" }}>
                          Allow Managing Student Verification Records (.xlsx)
                        </div>
                      </div>
                    </div>

                    {/* Staff Records Card */}
                    <div
                      onClick={() => setFormData({ ...formData, allowStaffRecords: !formData.allowStaffRecords })}
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        gap: "12px",
                        padding: "10px 12px",
                        borderRadius: "8px",
                        border: formData.allowStaffRecords ? "2px solid #8b5cf6" : "1px solid #cbd5e1",
                        background: formData.allowStaffRecords ? "#f5f3ff" : "#fff",
                        cursor: "pointer",
                        transition: "all 0.15s"
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={formData.allowStaffRecords}
                        onChange={(e) => {
                          e.stopPropagation();
                          setFormData({ ...formData, allowStaffRecords: e.target.checked });
                        }}
                        style={{ marginTop: "3px", width: "16px", height: "16px", accentColor: "#7c3aed", cursor: "pointer" }}
                      />
                      <div>
                        <div style={{ fontWeight: "700", color: "#1e293b", fontSize: "0.85rem" }}>
                          Allow Managing Staff Verification Records (.xlsx)
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "20px" }}>
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
                    fontSize: "0.88rem"
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{
                    padding: "8px 18px",
                    background: "#2563eb",
                    color: "#fff",
                    border: "none",
                    borderRadius: "6px",
                    fontWeight: "600",
                    cursor: "pointer",
                    fontSize: "0.88rem"
                  }}
                >
                  {submitting ? "Updating..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminDepartments;
