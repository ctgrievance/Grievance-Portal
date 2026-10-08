import React, { useState, useEffect, useCallback, useRef } from "react";
import ReactDOM from "react-dom";
import { getSocket } from "../services/socket";
import {
  PlusIcon,
  TrashIcon,
  EditIcon,
  EyeIcon,
  CheckCircleIcon,
  AlertCircleIcon,
  XIcon,
  GraduationCapIcon,
  SearchIcon,
  UserIcon,
  UsersIcon,
  FileIcon,
  ShieldIcon,
  ChevronDownIcon
} from "../components/Icons";

// Portal-powered floating permissions dropdown to avoid table overflow cutoff
function DepartmentPermissionsDropdown({ dept, perms, isOpen, onToggle }) {
  const buttonRef = useRef(null);
  const menuRef = useRef(null);
  const [coords, setCoords] = useState({
    top: undefined,
    bottom: undefined,
    left: 0,
    isDropup: false,
    maxHeight: 300
  });

  const updatePosition = useCallback(() => {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    const dropdownWidth = 270;
    const estimatedHeight = 240;
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;

    // Open upward if space below is insufficient and there is more space above
    const shouldDropup = spaceBelow < estimatedHeight && spaceAbove > spaceBelow;

    let left = rect.left;
    if (left + dropdownWidth > window.innerWidth - 12) {
      left = Math.max(12, window.innerWidth - dropdownWidth - 12);
    }

    if (shouldDropup) {
      setCoords({
        bottom: window.innerHeight - rect.top + 6,
        top: undefined,
        left,
        isDropup: true,
        maxHeight: Math.min(320, spaceAbove - 20)
      });
    } else {
      setCoords({
        top: rect.bottom + 6,
        bottom: undefined,
        left,
        isDropup: false,
        maxHeight: Math.min(320, spaceBelow - 20)
      });
    }
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    updatePosition();

    const handleClickOutside = (e) => {
      if (
        buttonRef.current &&
        !buttonRef.current.contains(e.target) &&
        menuRef.current &&
        !menuRef.current.contains(e.target)
      ) {
        onToggle(null);
      }
    };

    const handleKeyDown = (e) => {
      if (e.key === "Escape") onToggle(null);
    };

    const handleScroll = (e) => {
      // Keep open if user scrolls inside the dropdown menu list itself
      if (menuRef.current && menuRef.current.contains(e.target)) return;
      onToggle(null);
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    window.addEventListener("scroll", handleScroll, true);
    window.addEventListener("resize", handleScroll);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("scroll", handleScroll, true);
      window.removeEventListener("resize", handleScroll);
    };
  }, [isOpen, onToggle, updatePosition]);

  return (
    <div className="dept-perm-dropdown-wrap">
      <button
        ref={buttonRef}
        type="button"
        className={`dept-perm-badge-btn ${isOpen ? "active" : ""}`}
        onClick={(e) => {
          e.stopPropagation();
          onToggle(isOpen ? null : dept._id);
        }}
        title="Click to view granted permissions"
      >
        <ShieldIcon width="12" height="12" />
        <span>
          {perms.length} {perms.length === 1 ? "Permission" : "Permissions"}
        </span>
        <ChevronDownIcon
          width="11"
          height="11"
          className={`dept-perm-chevron ${isOpen ? "open" : ""}`}
        />
      </button>

      {isOpen &&
        ReactDOM.createPortal(
          <div
            ref={menuRef}
            className={`dept-perm-menu ${coords.isDropup ? "dropup" : ""}`}
            style={{
              position: "fixed",
              top: coords.top !== undefined ? `${coords.top}px` : "auto",
              bottom: coords.bottom !== undefined ? `${coords.bottom}px` : "auto",
              left: `${coords.left}px`,
              width: "270px",
              maxHeight: `${coords.maxHeight}px`,
              zIndex: 99999,
              display: "flex",
              flexDirection: "column"
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="dept-perm-menu-header">
              <span className="dept-perm-menu-title">
                Active Permissions ({perms.length})
              </span>
            </div>
            <div
              className="dept-perm-menu-list"
              style={{
                overflowY: "auto",
                maxHeight: `${Math.max(120, coords.maxHeight - 45)}px`
              }}
            >
              {perms.map((p) => (
                <div key={p.id} className="dept-perm-menu-item">
                  <span className={`dept-perm-pill ${p.type}`}>
                    {p.icon}
                    <span>{p.badge}</span>
                  </span>
                  <div className="dept-perm-item-info">
                    <div className="dept-perm-item-label">{p.label}</div>
                    <div className="dept-perm-item-desc">{p.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}

function AdminDepartments() {
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");
  const [statusType, setStatusType] = useState("");
  const [openPermDropdownId, setOpenPermDropdownId] = useState(null);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState("all"); // all | academic | admin
  const [filterAudience, setFilterAudience] = useState("all"); // all | both | student | staff

  // Modal State (Unified for Add and Edit)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedDept, setSelectedDept] = useState(null);
  const [modalTab, setModalTab] = useState("general"); // "general" | "permissions" | "programs"
  const [newProgramInput, setNewProgramInput] = useState("");

  // Form State
  const [formData, setFormData] = useState({
    name: "",
    code: "",
    description: "",
    targetAudience: "both",
    isAcademic: false,
    isActive: true,
    allowStudentRecords: false,
    studentRecordsMode: "write",
    allowStaffRecords: false,
    staffRecordsMode: "write",
    allowRegisteredStudents: false,
    registeredStudentsMode: "write",
    allowRegisteredStaff: false,
    registeredStaffMode: "write",
    programs: []
  });

  const [submitting, setSubmitting] = useState(false);

  // Fetch all departments with live stats for Super Admin
  const fetchDepartments = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const res = await fetch(
        `${process.env.REACT_APP_API_URL || "http://localhost:5000"}/api/departments/all`
      );
      if (!res.ok) throw new Error("Failed to load departments");
      const data = await res.json();
      setDepartments(data);
    } catch (err) {
      console.error(err);
      if (!silent) {
        setMsg("Failed to load departments");
        setStatusType("error");
      }
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDepartments();
  }, [fetchDepartments]);

  // 🔌 Real-Time Socket.IO updates (reflects changes live without manual page refresh)
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const handleRealtimeUpdate = () => {
      fetchDepartments(true);
    };

    socket.on("departments:updated", handleRealtimeUpdate);
    socket.on("staff:updated", handleRealtimeUpdate);
    socket.on("grievance:created", handleRealtimeUpdate);
    socket.on("grievance:updated", handleRealtimeUpdate);

    return () => {
      socket.off("departments:updated", handleRealtimeUpdate);
      socket.off("staff:updated", handleRealtimeUpdate);
      socket.off("grievance:created", handleRealtimeUpdate);
      socket.off("grievance:updated", handleRealtimeUpdate);
    };
  }, [fetchDepartments]);

  // ⏱️ Auto background polling fallback every 60 seconds (silent, zero UI flicker)
  useEffect(() => {
    const interval = setInterval(() => {
      fetchDepartments(true);
    }, 60000);
    return () => clearInterval(interval);
  }, [fetchDepartments]);

  // Helper to extract granted permissions with clean metadata
  const getDepartmentPermissions = (dept) => {
    const perms = [];
    if (dept.allowRegisteredStudents) {
      const isReadOnly = dept.registeredStudentsMode === "read";
      perms.push({
        id: "students",
        label: `Live Students (${isReadOnly ? "Read Only" : "Read & Write"})`,
        badge: isReadOnly ? "Students (Read)" : "Students",
        desc: isReadOnly ? "View and export live student accounts" : "Allowed to manage live student accounts",
        type: "students",
        icon: <UserIcon width="11" height="11" />
      });
    }
    if (dept.allowRegisteredStaff) {
      const isReadOnly = dept.registeredStaffMode === "read";
      perms.push({
        id: "staff",
        label: `Live Staff (${isReadOnly ? "Read Only" : "Read & Write"})`,
        badge: isReadOnly ? "Staff (Read)" : "Staff",
        desc: isReadOnly ? "View and export live staff accounts" : "Allowed to manage live staff accounts",
        type: "staff",
        icon: <UsersIcon width="11" height="11" />
      });
    }
    if (dept.allowStudentRecords) {
      const isReadOnly = dept.studentRecordsMode === "read";
      perms.push({
        id: "student-records",
        label: `Student Records (${isReadOnly ? "Read Only" : "Read & Write"})`,
        badge: isReadOnly ? "Student Rec (Read)" : "Student Records",
        desc: isReadOnly ? "View and download student verification records" : "Allowed to manage student verification database",
        type: "records",
        icon: <FileIcon width="11" height="11" />
      });
    }
    if (dept.allowStaffRecords) {
      const isReadOnly = dept.staffRecordsMode === "read";
      perms.push({
        id: "staff-records",
        label: `Staff Records (${isReadOnly ? "Read Only" : "Read & Write"})`,
        badge: isReadOnly ? "Staff Rec (Read)" : "Staff Records",
        desc: isReadOnly ? "View and download staff verification records" : "Allowed to manage staff verification database",
        type: "records",
        icon: <FileIcon width="11" height="11" />
      });
    }
    return perms;
  };

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
    setSelectedDept(null);
    setIsEditMode(false);
    setFormData({
      name: "",
      code: "",
      description: "",
      targetAudience: "both",
      isAcademic: false,
      isActive: true,
      allowStudentRecords: false,
      studentRecordsMode: "write",
      allowStaffRecords: false,
      staffRecordsMode: "write",
      allowRegisteredStudents: false,
      registeredStudentsMode: "write",
      allowRegisteredStaff: false,
      registeredStaffMode: "write",
      programs: []
    });
    setNewProgramInput("");
    setModalTab("general");
    setIsModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (dept) => {
    setSelectedDept(dept);
    setIsEditMode(true);
    setFormData({
      name: dept.name,
      code: dept.code || "",
      description: dept.description || "",
      targetAudience: dept.targetAudience || "both",
      isAcademic: !!dept.isAcademic,
      isActive: dept.isActive !== false,
      allowStudentRecords: !!dept.allowStudentRecords,
      studentRecordsMode: dept.studentRecordsMode || "write",
      allowStaffRecords: !!dept.allowStaffRecords,
      staffRecordsMode: dept.staffRecordsMode || "write",
      allowRegisteredStudents: !!dept.allowRegisteredStudents,
      registeredStudentsMode: dept.registeredStudentsMode || "write",
      allowRegisteredStaff: !!dept.allowRegisteredStaff,
      registeredStaffMode: dept.registeredStaffMode || "write",
      programs: Array.isArray(dept.programs) ? [...dept.programs] : []
    });
    setNewProgramInput("");
    setModalTab("general");
    setIsModalOpen(true);
  };

  // Program Management in Modal
  const handleAddProgram = () => {
    const trimmed = newProgramInput.trim();
    if (!trimmed) return;
    if (formData.programs && formData.programs.some(p => p.toLowerCase() === trimmed.toLowerCase())) {
      showNotification(`Program "${trimmed}" is already in the list.`, "error");
      return;
    }
    setFormData((prev) => ({
      ...prev,
      programs: [...(prev.programs || []), trimmed]
    }));
    setNewProgramInput("");
  };

  const handleRemoveProgram = (programToRemove) => {
    setFormData((prev) => ({
      ...prev,
      programs: (prev.programs || []).filter((p) => p !== programToRemove)
    }));
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedDept(null);
  };

  // Handle Form Submit (Add or Edit)
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      showNotification("Please provide a department name.", "error");
      return;
    }

    setSubmitting(true);
    try {
      const url = isEditMode
        ? `${process.env.REACT_APP_API_URL || "http://localhost:5000"}/api/departments/${selectedDept._id}`
        : `${process.env.REACT_APP_API_URL || "http://localhost:5000"}/api/departments`;

      const method = isEditMode ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || `Failed to ${isEditMode ? "update" : "create"} department`);

      // Optimistically update local department in state for instant UI response
      if (isEditMode && data.department) {
        setDepartments((prev) =>
          prev.map((d) =>
            d._id === data.department._id
              ? { ...d, ...data.department, stats: d.stats, currentAdmin: d.currentAdmin, currentAdmins: d.currentAdmins }
              : d
          )
        );
      } else if (!isEditMode && data.department) {
        setDepartments((prev) => [data.department, ...prev]);
      }

      showNotification(
        `Department "${formData.name}" ${isEditMode ? "updated" : "added"} successfully.`,
        "success"
      );
      handleCloseModal();
      fetchDepartments(true);
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

  const totalAcademic = departments.filter((d) => d.isAcademic).length;
  const totalAdministrative = departments.filter((d) => !d.isAcademic).length;
  const totalGrievancesAll = departments.reduce(
    (sum, d) => sum + (d.stats?.totalGrievances || 0),
    0
  );

  const hasActivePermissions =
    formData.allowStudentRecords ||
    formData.allowStaffRecords ||
    formData.allowRegisteredStudents ||
    formData.allowRegisteredStaff;

  return (
    <div className="dept-directory-container">
      {/* Alert Notification */}
      {msg && (
        <div
          style={{
            padding: "12px 16px",
            marginBottom: "16px",
            borderRadius: "8px",
            display: "flex",
            alignItems: "center",
            gap: "10px",
            fontWeight: "500",
            fontSize: "0.88rem",
            backgroundColor: statusType === "error" ? "#fee2e2" : "#f0fdf4",
            color: statusType === "error" ? "#991b1b" : "#166534",
            border: `1px solid ${statusType === "error" ? "#fca5a5" : "#bbf7d0"}`
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

      {/* KPI Cards Row */}
      <div className="dept-kpi-ribbon">
        <div className="dept-kpi-item total">
          <span className="label">Total Departments</span>
          <div className="val">{departments.length}</div>
        </div>
        <div className="dept-kpi-item active">
          <span className="label">Academic Schools</span>
          <div className="val">{totalAcademic}</div>
        </div>
        <div className="dept-kpi-item admin">
          <span className="label">Administrative</span>
          <div className="val">{totalAdministrative}</div>
        </div>
        <div className="dept-kpi-item grievances">
          <span className="label">Total Grievances</span>
          <div className="val">{totalGrievancesAll}</div>
        </div>
      </div>

      {/* Main Directory Card */}
      <div className="dept-main-card">
        {/* Card Header */}
        <div className="dept-card-header">
          <div className="dept-card-title-group">
            <h2>University Departments Directory</h2>
            <p>
              Add, edit, and manage departments dynamically. Changes reflect instantly across student forms, staff routing, and triage.
            </p>
          </div>
          <button className="dept-add-btn" onClick={handleOpenAdd}>
            <PlusIcon width="16" height="16" />
            <span>Add Department</span>
          </button>
        </div>

        {/* Filters Toolbar */}
        <div className="dept-filters-toolbar">
          <div className="dept-search-box">
            <span className="dept-search-icon">
              <SearchIcon width="16" height="16" />
            </span>
            <input
              type="text"
              className="dept-search-input"
              placeholder="Search by department name, code..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="dept-filter-actions">
            <select
              className="dept-filter-select"
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
            >
              <option value="all">All Categories</option>
              <option value="academic">Academic Schools</option>
              <option value="admin">Administrative</option>
            </select>

            <select
              className="dept-filter-select"
              value={filterAudience}
              onChange={(e) => setFilterAudience(e.target.value)}
            >
              <option value="all">All Audiences</option>
              <option value="both">Student & Staff</option>
              <option value="student">Student Only</option>
              <option value="staff">Staff Only</option>
            </select>

            {(searchQuery || filterType !== "all" || filterAudience !== "all") && (
              <button
                type="button"
                className="dept-filter-reset"
                onClick={() => {
                  setSearchQuery("");
                  setFilterType("all");
                  setFilterAudience("all");
                }}
              >
                Reset
              </button>
            )}
          </div>
        </div>

        {/* Directory Content */}
        {loading ? (
          <div style={{ textAlign: "center", padding: "48px 20px", color: "#64748b" }}>
            Loading university departments...
          </div>
        ) : filteredDepartments.length === 0 ? (
          <div style={{ textAlign: "center", padding: "48px 20px", color: "#64748b" }}>
            No departments match your filters.
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="dept-table-wrapper">
              <table className="dept-table">
                <thead>
                  <tr>
                    <th style={{ width: "28%", minWidth: "220px" }}>Department Name</th>
                    <th style={{ width: "130px", minWidth: "130px" }}>Category</th>
                    <th style={{ width: "140px", minWidth: "140px" }}>Audience</th>
                    <th style={{ width: "160px", minWidth: "160px" }}>Permissions</th>
                    <th style={{ width: "160px", minWidth: "160px" }}>Dept Admin</th>
                    <th style={{ width: "120px", minWidth: "120px" }}>Assigned Staff</th>
                    <th style={{ width: "90px", minWidth: "90px", textAlign: "right" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredDepartments.map((dept, index) => (
                    <tr
                      key={dept._id}
                      style={{ opacity: dept.isActive ? 1 : 0.65 }}
                    >
                      <td>
                        <div className="dept-name-cell">
                          <span className="dept-name-title" title={dept.name}>{dept.name}</span>
                          {dept.description ? (
                            <span className="dept-desc-text" title={dept.description}>
                              {dept.description}
                            </span>
                          ) : (
                            <span className="dept-desc-text dept-desc-empty">—</span>
                          )}
                        </div>
                      </td>

                      <td>
                        {dept.isAcademic ? (
                          <span className="dept-type-badge academic">
                            <GraduationCapIcon width="13" height="13" /> Academic
                          </span>
                        ) : (
                          <span className="dept-type-badge admin">
                            Administrative
                          </span>
                        )}
                      </td>

                      <td style={{ color: "#475569", fontSize: "0.82rem", whiteSpace: "nowrap" }}>
                        {dept.targetAudience === "both"
                          ? "Student & Staff"
                          : dept.targetAudience === "student"
                          ? "Students Only"
                          : "Staff Only"}
                      </td>

                      <td>
                        {(() => {
                          const perms = getDepartmentPermissions(dept);
                          if (perms.length === 0) {
                            return <span className="dept-perm-empty">None</span>;
                          }

                          return (
                            <DepartmentPermissionsDropdown
                              dept={dept}
                              perms={perms}
                              isOpen={openPermDropdownId === dept._id}
                              onToggle={(id) => setOpenPermDropdownId(id)}
                            />
                          );
                        })()}
                      </td>

                      <td style={{ fontSize: "0.84rem" }}>
                        {dept.currentAdmin ? (
                          <span
                            className="dept-admin-name"
                            title={dept.currentAdmin.fullName || dept.currentAdmin.id}
                          >
                            {dept.currentAdmin.fullName || dept.currentAdmin.id}
                          </span>
                        ) : (
                          <span className="dept-admin-unassigned">
                            Unassigned
                          </span>
                        )}
                      </td>

                      <td style={{ fontWeight: "500", color: "#334155", whiteSpace: "nowrap" }}>
                        {dept.stats?.assignedStaffCount || 0} staff
                      </td>

                      <td style={{ textAlign: "right" }}>
                        <div className="dept-action-group">
                          <button
                            className="dept-icon-btn edit"
                            onClick={() => handleOpenEdit(dept)}
                            title="Edit Department"
                          >
                            <EditIcon width="13" height="13" />
                          </button>
                          <button
                            className="dept-icon-btn delete"
                            onClick={() => handleDelete(dept)}
                            title="Delete Department"
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

            {/* Mobile Cards View */}
            <div className="dept-mobile-cards">
              {filteredDepartments.map((dept) => (
                <div
                  key={dept._id}
                  className="dept-mobile-card"
                  style={{ opacity: dept.isActive ? 1 : 0.65 }}
                >
                  <div className="dept-mcard-top">
                    <div>
                      <div style={{ fontWeight: "700", fontSize: "0.95rem", color: "#0f172a" }}>
                        {dept.name}
                      </div>
                      {dept.description && (
                        <div style={{ fontSize: "0.78rem", color: "#64748b", marginTop: "2px" }}>
                          {dept.description}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="dept-mcard-meta-row">
                    {dept.isAcademic ? (
                      <span className="dept-type-badge academic">
                        <GraduationCapIcon width="12" height="12" /> Academic
                      </span>
                    ) : (
                      <span className="dept-type-badge admin">Administrative</span>
                    )}
                    <span style={{ fontSize: "0.75rem", color: "#64748b" }}>
                      {dept.targetAudience === "both"
                        ? "Student & Staff"
                        : dept.targetAudience === "student"
                        ? "Students"
                        : "Staff"}
                    </span>
                  </div>

                  {(() => {
                    const perms = getDepartmentPermissions(dept);
                    if (perms.length === 0) return null;
                    return (
                      <div className="dept-mcard-perm-row">
                        <DepartmentPermissionsDropdown
                          dept={dept}
                          perms={perms}
                          isOpen={openPermDropdownId === `m_${dept._id}`}
                          onToggle={(id) => setOpenPermDropdownId(id ? `m_${dept._id}` : null)}
                        />
                      </div>
                    );
                  })()}

                  <div className="dept-mcard-details">
                    <div className="dept-mcard-detail-item">
                      <span className="lbl">Dept Admin</span>
                      <span className="val">
                        {dept.currentAdmin?.fullName || dept.currentAdmin?.id || "Unassigned"}
                      </span>
                    </div>
                    <div className="dept-mcard-detail-item">
                      <span className="lbl">Staff Count</span>
                      <span className="val">{dept.stats?.assignedStaffCount || 0}</span>
                    </div>
                  </div>

                  <div className="dept-mcard-actions">
                    <button
                      className="dept-icon-btn edit"
                      onClick={() => handleOpenEdit(dept)}
                      title="Edit Department"
                    >
                      <EditIcon width="14" height="14" />
                    </button>
                    <button
                      className="dept-icon-btn delete"
                      onClick={() => handleDelete(dept)}
                      title="Delete Department"
                    >
                      <TrashIcon width="14" height="14" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* UNIFIED SLEEK MODAL (Add & Edit) */}
      {isModalOpen && (
        <div className="dept-modal-overlay" onClick={handleCloseModal}>
          <div className="dept-modal-card" onClick={(e) => e.stopPropagation()}>
            {/* Modal Header */}
            <div className="dept-modal-header">
              <h3>{isEditMode ? "Edit Department" : "Add New Department"}</h3>
              <button
                type="button"
                onClick={handleCloseModal}
                style={{ background: "none", border: "none", cursor: "pointer", color: "#64748b", display: "flex" }}
              >
                <XIcon width="20" height="20" />
              </button>
            </div>

            {/* Modal Tabs */}
            <div className="dept-modal-tabs">
              <button
                type="button"
                className={`dept-modal-tab-btn ${modalTab === "general" ? "active" : ""}`}
                onClick={() => setModalTab("general")}
              >
                General Information
              </button>
              <button
                type="button"
                className={`dept-modal-tab-btn ${modalTab === "permissions" ? "active" : ""}`}
                onClick={() => setModalTab("permissions")}
              >
                Permissions
                {hasActivePermissions && (
                  <span
                    style={{
                      background: "#f1f5f9",
                      color: "#0f172a",
                      fontSize: "0.68rem",
                      padding: "1px 6px",
                      borderRadius: "10px",
                      fontWeight: "700"
                    }}
                  >
                    Active
                  </span>
                )}
              </button>
            </div>

            {/* Modal Form */}
            <form className="dept-modal-form" onSubmit={handleSubmit}>
              <div className="dept-modal-body">
                {modalTab === "general" && (
                  <>
                    <div className="dept-form-group">
                      <label className="dept-form-label">
                        Department Name *
                      </label>
                      <input
                        type="text"
                        required
                        className="dept-form-input"
                        placeholder="e.g. Sports & Athletics, Hostel Office"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      />
                      {isEditMode && (
                        <span style={{ color: "#64748b", fontSize: "0.74rem", marginTop: "2px" }}>
                          Renaming will automatically update linked grievances and staff records.
                        </span>
                      )}
                    </div>


                    <div className="dept-form-group">
                      <label className="dept-form-label">
                        Description
                      </label>
                      <textarea
                        rows="2"
                        className="dept-form-textarea"
                        placeholder="Brief summary of grievances handled by this department"
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      />
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                      <div className="dept-form-group">
                        <label className="dept-form-label">
                          Target Audience
                        </label>
                        <select
                          className="dept-form-select"
                          value={formData.targetAudience}
                          onChange={(e) => setFormData({ ...formData, targetAudience: e.target.value })}
                        >
                          <option value="both">Both (Students & Staff)</option>
                          <option value="student">Students Only</option>
                          <option value="staff">Staff Only</option>
                        </select>
                      </div>

                      <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", gap: "8px", paddingTop: "14px" }}>
                        <label className="dept-checkbox-row">
                          <input
                            type="checkbox"
                            checked={formData.isAcademic}
                            onChange={(e) => setFormData({ ...formData, isAcademic: e.target.checked })}
                          />
                          <span>Academic School</span>
                        </label>

                        {isEditMode && (
                          <label className="dept-checkbox-row">
                            <input
                              type="checkbox"
                              checked={formData.isActive}
                              onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                            />
                            <span>Department Active</span>
                          </label>
                        )}
                      </div>
                    </div>
                  </>
                )}

                {modalTab === "permissions" && (
                  <div className="dept-perm-section">
                    <div className="dept-perm-section-title">Directory Management Access</div>

                    {/* Live Students Permission Card */}
                    <div
                      className={`dept-perm-card ${formData.allowRegisteredStudents ? "enabled" : ""}`}
                    >
                      <div
                        className="dept-perm-card-main"
                        onClick={() =>
                          setFormData({
                            ...formData,
                            allowRegisteredStudents: !formData.allowRegisteredStudents
                          })
                        }
                      >
                        <div className="dept-perm-info">
                          <div className="dept-perm-icon-box">
                            <UserIcon width="16" height="16" />
                          </div>
                          <div className="dept-perm-text-wrap">
                            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                              <h5>Student Directory Access</h5>
                              {formData.allowRegisteredStudents && (
                                <span className={`dept-perm-level-badge ${formData.registeredStudentsMode === "read" ? "read" : "write"}`}>
                                  {formData.registeredStudentsMode === "read" ? "Read Only" : "Read & Write"}
                                </span>
                              )}
                            </div>
                            <p>
                              Allow department admin to view registered student accounts.
                            </p>
                          </div>
                        </div>
                        <input
                          type="checkbox"
                          className="dept-perm-checkbox"
                          checked={formData.allowRegisteredStudents}
                          onChange={(e) => {
                            e.stopPropagation();
                            setFormData({ ...formData, allowRegisteredStudents: e.target.checked });
                          }}
                        />
                      </div>

                      {formData.allowRegisteredStudents && (
                        <div className="dept-perm-mode-bar" onClick={(e) => e.stopPropagation()}>
                          <span className="dept-perm-mode-label">Access Level:</span>
                          <div className="dept-perm-mode-pill-group">
                            <button
                              type="button"
                              className={`dept-perm-mode-pill ${formData.registeredStudentsMode === "read" ? "active" : ""}`}
                              onClick={() => setFormData({ ...formData, registeredStudentsMode: "read" })}
                            >
                              <EyeIcon width="13" height="13" />
                              <span>Read Only</span>
                            </button>
                            <button
                              type="button"
                              className={`dept-perm-mode-pill ${formData.registeredStudentsMode !== "read" ? "active" : ""}`}
                              onClick={() => setFormData({ ...formData, registeredStudentsMode: "write" })}
                            >
                              <EditIcon width="13" height="13" />
                              <span>Read & Write</span>
                            </button>
                          </div>
                          <span className="dept-perm-mode-desc">
                            {formData.registeredStudentsMode === "read"
                              ? "View & export only (no edit/delete)"
                              : "Full access (can edit & delete)"}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Live Staff Permission Card */}
                    <div
                      className={`dept-perm-card ${formData.allowRegisteredStaff ? "enabled" : ""}`}
                    >
                      <div
                        className="dept-perm-card-main"
                        onClick={() =>
                          setFormData({
                            ...formData,
                            allowRegisteredStaff: !formData.allowRegisteredStaff
                          })
                        }
                      >
                        <div className="dept-perm-info">
                          <div className="dept-perm-icon-box">
                            <UsersIcon width="16" height="16" />
                          </div>
                          <div className="dept-perm-text-wrap">
                            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                              <h5>Staff Directory Access</h5>
                              {formData.allowRegisteredStaff && (
                                <span className={`dept-perm-level-badge ${formData.registeredStaffMode === "read" ? "read" : "write"}`}>
                                  {formData.registeredStaffMode === "read" ? "Read Only" : "Read & Write"}
                                </span>
                              )}
                            </div>
                            <p>
                              Allow department admin to view registered staff and faculty accounts.
                            </p>
                          </div>
                        </div>
                        <input
                          type="checkbox"
                          className="dept-perm-checkbox"
                          checked={formData.allowRegisteredStaff}
                          onChange={(e) => {
                            e.stopPropagation();
                            setFormData({ ...formData, allowRegisteredStaff: e.target.checked });
                          }}
                        />
                      </div>

                      {formData.allowRegisteredStaff && (
                        <div className="dept-perm-mode-bar" onClick={(e) => e.stopPropagation()}>
                          <span className="dept-perm-mode-label">Access Level:</span>
                          <div className="dept-perm-mode-pill-group">
                            <button
                              type="button"
                              className={`dept-perm-mode-pill ${formData.registeredStaffMode === "read" ? "active" : ""}`}
                              onClick={() => setFormData({ ...formData, registeredStaffMode: "read" })}
                            >
                              <EyeIcon width="13" height="13" />
                              <span>Read Only</span>
                            </button>
                            <button
                              type="button"
                              className={`dept-perm-mode-pill ${formData.registeredStaffMode !== "read" ? "active" : ""}`}
                              onClick={() => setFormData({ ...formData, registeredStaffMode: "write" })}
                            >
                              <EditIcon width="13" height="13" />
                              <span>Read & Write</span>
                            </button>
                          </div>
                          <span className="dept-perm-mode-desc">
                            {formData.registeredStaffMode === "read"
                              ? "View & export only (no edit/delete)"
                              : "Full access (can edit & delete)"}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="dept-perm-section-title" style={{ marginTop: "10px" }}>
                      Verification Records (Excel Pre-Upload)
                    </div>

                    {/* Student Verification Records */}
                    <div
                      className={`dept-perm-card ${formData.allowStudentRecords ? "enabled" : ""}`}
                    >
                      <div
                        className="dept-perm-card-main"
                        onClick={() =>
                          setFormData({
                            ...formData,
                            allowStudentRecords: !formData.allowStudentRecords
                          })
                        }
                      >
                        <div className="dept-perm-info">
                          <div className="dept-perm-icon-box">
                            <FileIcon width="16" height="16" />
                          </div>
                          <div className="dept-perm-text-wrap">
                            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                              <h5>Student Verification Records</h5>
                              {formData.allowStudentRecords && (
                                <span className={`dept-perm-level-badge ${formData.studentRecordsMode === "read" ? "read" : "write"}`}>
                                  {formData.studentRecordsMode === "read" ? "Read Only" : "Read & Write"}
                                </span>
                              )}
                            </div>
                            <p>
                              Allow access to student spreadsheet records for pre-registration verification.
                            </p>
                          </div>
                        </div>
                        <input
                          type="checkbox"
                          className="dept-perm-checkbox"
                          checked={formData.allowStudentRecords}
                          onChange={(e) => {
                            e.stopPropagation();
                            setFormData({ ...formData, allowStudentRecords: e.target.checked });
                          }}
                        />
                      </div>

                      {formData.allowStudentRecords && (
                        <div className="dept-perm-mode-bar" onClick={(e) => e.stopPropagation()}>
                          <span className="dept-perm-mode-label">Access Level:</span>
                          <div className="dept-perm-mode-pill-group">
                            <button
                              type="button"
                              className={`dept-perm-mode-pill ${formData.studentRecordsMode === "read" ? "active" : ""}`}
                              onClick={() => setFormData({ ...formData, studentRecordsMode: "read" })}
                            >
                              <EyeIcon width="13" height="13" />
                              <span>Read Only</span>
                            </button>
                            <button
                              type="button"
                              className={`dept-perm-mode-pill ${formData.studentRecordsMode !== "read" ? "active" : ""}`}
                              onClick={() => setFormData({ ...formData, studentRecordsMode: "write" })}
                            >
                              <EditIcon width="13" height="13" />
                              <span>Read & Write</span>
                            </button>
                          </div>
                          <span className="dept-perm-mode-desc">
                            {formData.studentRecordsMode === "read"
                              ? "View & download only (no Excel upload, add, edit, or delete)"
                              : "Full access (can upload Excel, add, edit, and delete records)"}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Staff Verification Records */}
                    <div
                      className={`dept-perm-card ${formData.allowStaffRecords ? "enabled" : ""}`}
                    >
                      <div
                        className="dept-perm-card-main"
                        onClick={() =>
                          setFormData({
                            ...formData,
                            allowStaffRecords: !formData.allowStaffRecords
                          })
                        }
                      >
                        <div className="dept-perm-info">
                          <div className="dept-perm-icon-box">
                            <FileIcon width="16" height="16" />
                          </div>
                          <div className="dept-perm-text-wrap">
                            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                              <h5>Staff Verification Records</h5>
                              {formData.allowStaffRecords && (
                                <span className={`dept-perm-level-badge ${formData.staffRecordsMode === "read" ? "read" : "write"}`}>
                                  {formData.staffRecordsMode === "read" ? "Read Only" : "Read & Write"}
                                </span>
                              )}
                            </div>
                            <p>
                              Allow access to staff spreadsheet records for pre-registration verification.
                            </p>
                          </div>
                        </div>
                        <input
                          type="checkbox"
                          className="dept-perm-checkbox"
                          checked={formData.allowStaffRecords}
                          onChange={(e) => {
                            e.stopPropagation();
                            setFormData({ ...formData, allowStaffRecords: e.target.checked });
                          }}
                        />
                      </div>

                      {formData.allowStaffRecords && (
                        <div className="dept-perm-mode-bar" onClick={(e) => e.stopPropagation()}>
                          <span className="dept-perm-mode-label">Access Level:</span>
                          <div className="dept-perm-mode-pill-group">
                            <button
                              type="button"
                              className={`dept-perm-mode-pill ${formData.staffRecordsMode === "read" ? "active" : ""}`}
                              onClick={() => setFormData({ ...formData, staffRecordsMode: "read" })}
                            >
                              <EyeIcon width="13" height="13" />
                              <span>Read Only</span>
                            </button>
                            <button
                              type="button"
                              className={`dept-perm-mode-pill ${formData.staffRecordsMode !== "read" ? "active" : ""}`}
                              onClick={() => setFormData({ ...formData, staffRecordsMode: "write" })}
                            >
                              <EditIcon width="13" height="13" />
                              <span>Read & Write</span>
                            </button>
                          </div>
                          <span className="dept-perm-mode-desc">
                            {formData.staffRecordsMode === "read"
                              ? "View & download only (no Excel upload, add, edit, or delete)"
                              : "Full access (can upload Excel, add, edit, and delete records)"}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="dept-modal-footer">
                <button
                  type="button"
                  className="dept-btn-cancel"
                  onClick={handleCloseModal}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="dept-btn-save"
                >
                  {submitting ? "Saving..." : isEditMode ? "Save Changes" : "Save Department"}
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
