import React, { useState, useEffect, useCallback, useRef } from "react";

const DEFAULT_DEPARTMENTS = [
  "Accounts",
  "Student Welfare",
  "Student Section",
  "Admission",
  "Examination",
  "School of Engineering and Technology",
  "School of Management Studies",
  "School of Law",
  "School of Pharmaceutical Sciences",
  "School of Hotel Management",
  "School of Design and innovation",
  "School of Allied Health Sciences",
  "School of Social Sciences and Liberal Arts",
  "HR",
  "CRC (Placement)",
  "Transport"
];

/**
 * 🔍 SearchableFacultySelect
 * Combobox / Searchable Dropdown where the search bar is INSIDE the dropdown menu.
 */
function SearchableFacultySelect({
  dept,
  staffList,
  selectedStaffId,
  onSelect,
  isCurrentDept
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const dropdownRef = useRef(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const selectedStaff = staffList.find((s) => s.id === selectedStaffId);

  // Filter staff by search query (name, id, email)
  const q = searchQuery.toLowerCase().trim();
  const filteredStaff = staffList.filter((s) => {
    if (!q) return true;
    const name = (s.fullName || "").toLowerCase();
    const id = (s.id || "").toLowerCase();
    const email = (s.email || "").toLowerCase();
    return name.includes(q) || id.includes(q) || email.includes(q);
  });

  return (
    <div ref={dropdownRef} style={{ position: "relative", width: "100%" }}>
      {/* Dropdown Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        style={{
          width: "100%",
          padding: "10px 14px",
          borderRadius: "8px",
          border: isOpen ? "2px solid #2563eb" : "1.5px solid #cbd5e1",
          background: "#ffffff",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          cursor: "pointer",
          textAlign: "left",
          outline: "none",
          boxShadow: isOpen ? "0 0 0 3px rgba(37, 99, 235, 0.12)" : "none",
          transition: "all 0.15s ease"
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px", overflow: "hidden" }}>
          <span style={{ fontSize: "1rem", flexShrink: 0 }}>
            {selectedStaff ? "👤" : "⚡"}
          </span>
          <span
            style={{
              color: selectedStaff ? "#0f172a" : "#475569",
              fontWeight: selectedStaff ? "600" : "500",
              fontSize: "0.85rem",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap"
            }}
          >
            {selectedStaff
              ? `${selectedStaff.fullName || selectedStaff.id} (${selectedStaff.id})${selectedStaff.email ? ` • ${selectedStaff.email}` : ""}`
              : "Auto-Assign / Department Pool (Unassigned)"}
          </span>
        </div>
        <span
          style={{
            transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 0.2s",
            color: "#64748b",
            fontSize: "0.72rem",
            flexShrink: 0,
            marginLeft: "8px"
          }}
        >
          ▼
        </span>
      </button>

      {/* Dropdown Popover Menu with Search Bar */}
      {isOpen && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            left: 0,
            right: 0,
            zIndex: 150,
            background: "#ffffff",
            borderRadius: "10px",
            boxShadow: "0 14px 30px rgba(0, 0, 0, 0.15), 0 4px 10px rgba(0, 0, 0, 0.06)",
            border: "1.5px solid #cbd5e1",
            overflow: "hidden"
          }}
        >
          {/* Search Input INSIDE the Faculty Dropdown */}
          <div style={{ padding: "8px 10px", borderBottom: "1px solid #e2e8f0", background: "#f8fafc" }}>
            <div style={{ position: "relative" }}>
              <input
                type="text"
                autoFocus
                placeholder={`Search faculty in ${dept}...`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: "100%",
                  padding: "7px 10px 7px 28px",
                  borderRadius: "6px",
                  border: "1px solid #cbd5e1",
                  fontSize: "0.82rem",
                  boxSizing: "border-box",
                  outline: "none"
                }}
              />
              <span style={{ position: "absolute", left: "9px", top: "50%", transform: "translateY(-50%)", color: "#94a3b8", fontSize: "0.8rem" }}>
                🔍
              </span>
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  style={{
                    position: "absolute",
                    right: "8px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "transparent",
                    border: "none",
                    color: "#94a3b8",
                    cursor: "pointer",
                    fontSize: "0.8rem"
                  }}
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* Options List */}
          <div style={{ maxHeight: "200px", overflowY: "auto", padding: "4px" }}>
            {/* Auto-Assign Option */}
            {(!q || "auto-assign department pool queue unassigned".includes(q)) && (
              <div
                onClick={() => {
                  onSelect("");
                  setIsOpen(false);
                  setSearchQuery("");
                }}
                style={{
                  padding: "8px 10px",
                  borderRadius: "6px",
                  background: !selectedStaffId ? "#eff6ff" : "transparent",
                  color: !selectedStaffId ? "#1d4ed8" : "#334155",
                  fontWeight: !selectedStaffId ? "600" : "500",
                  fontSize: "0.82rem",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  transition: "background 0.1s"
                }}
                onMouseEnter={(e) => {
                  if (selectedStaffId) e.currentTarget.style.background = "#f1f5f9";
                }}
                onMouseLeave={(e) => {
                  if (selectedStaffId) e.currentTarget.style.background = "transparent";
                }}
              >
                <span>⚡ Auto-Assign / Department Pool (Unassigned)</span>
                {!selectedStaffId && <span style={{ color: "#2563eb", fontWeight: "700" }}>✓</span>}
              </div>
            )}

            {/* If no matches found */}
            {filteredStaff.length === 0 && q ? (
              <div style={{ padding: "14px", textAlign: "center", color: "#94a3b8", fontSize: "0.8rem" }}>
                No faculty matching "{searchQuery}"
              </div>
            ) : (
              filteredStaff.map((staff) => {
                const isSelected = selectedStaffId === staff.id;
                return (
                  <div
                    key={staff.id}
                    onClick={() => {
                      onSelect(staff.id);
                      setIsOpen(false);
                      setSearchQuery("");
                    }}
                    style={{
                      padding: "8px 10px",
                      borderRadius: "6px",
                      background: isSelected ? "#eff6ff" : "transparent",
                      color: isSelected ? "#1d4ed8" : "#1e293b",
                      fontWeight: isSelected ? "600" : "500",
                      fontSize: "0.82rem",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      transition: "background 0.1s"
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected) e.currentTarget.style.background = "#f1f5f9";
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected) e.currentTarget.style.background = "transparent";
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: isSelected ? "700" : "600", color: isSelected ? "#1d4ed8" : "#0f172a" }}>
                        👤 {staff.fullName || staff.id} <span style={{ color: "#64748b", fontWeight: "normal" }}>({staff.id})</span>
                      </div>
                      {staff.email && (
                        <div style={{ fontSize: "0.74rem", color: "#64748b", marginTop: "1px" }}>
                          ✉️ {staff.email}
                        </div>
                      )}
                    </div>
                    {isSelected && (
                      <span style={{ color: "#2563eb", fontWeight: "800", fontSize: "0.85rem" }}>
                        ✓
                      </span>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Selected Faculty Confirmation (Clean & subtle) */}
      {selectedStaff && (
        <div
          style={{
            marginTop: "6px",
            display: "flex",
            alignItems: "center",
            gap: "5px",
            fontSize: "0.78rem",
            color: "#15803d",
            fontWeight: "500"
          }}
        >
          <span>Assigned to:</span>
          <strong>{selectedStaff.fullName || selectedStaff.id} ({selectedStaff.id})</strong>
        </div>
      )}

      {isCurrentDept && !selectedStaff && (
        <div style={{ marginTop: "4px", fontSize: "0.76rem", color: "#dc2626", fontWeight: "600" }}>
          ⚠️ For internal reassignment within {dept}, please select a faculty member.
        </div>
      )}
    </div>
  );
}

function TransferDepartmentModal({ grievance, onClose, onTransferred }) {
  const [departmentsList, setDepartmentsList] = useState(DEFAULT_DEPARTMENTS);
  const [selectedDepartments, setSelectedDepartments] = useState([]);
  const [isDeptDropdownOpen, setIsDeptDropdownOpen] = useState(false);
  const [deptSearchQuery, setDeptSearchQuery] = useState("");
  const deptDropdownRef = useRef(null);

  const [deptStaffMap, setDeptStaffMap] = useState({});
  const [loadingStaffMap, setLoadingStaffMap] = useState({});
  const [deptAssignments, setDeptAssignments] = useState({});
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const currentDept = grievance?.category || "";
  const currentAssignedId = (grievance?.assignedTo || "").toString().trim().toUpperCase();

  const currentUserId = (
    localStorage.getItem("grievance_id") ||
    "STAFF"
  ).toString().trim().toUpperCase();

  const currentUserName =
    localStorage.getItem("grievance_user_name") ||
    localStorage.getItem("grievance_name") ||
    "Staff Member";
  const currentRole = localStorage.getItem("grievance_role") || "staff";

  // Check if current user has already forwarded this grievance once
  const hasAlreadyForwarded = Boolean(
    currentUserId &&
    grievance?.transferHistory?.some(
      (t) => t.transferredBy && t.transferredBy.toString().trim().toUpperCase() === currentUserId
    )
  );

  // Close department dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (deptDropdownRef.current && !deptDropdownRef.current.contains(event.target)) {
        setIsDeptDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Fetch dynamic active departments from API
  useEffect(() => {
    const fetchActiveDepts = async () => {
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
        console.warn("Could not fetch dynamic departments, using defaults:", err);
      }
    };
    fetchActiveDepts();
  }, []);

  // Fetch faculty / staff for a department
  const fetchStaffForDept = useCallback(async (dept) => {
    if (!dept) return;
    setLoadingStaffMap((prev) => ({ ...prev, [dept]: true }));
    try {
      const res = await fetch(
        `${process.env.REACT_APP_API_URL || "http://localhost:5000"}/api/admin/staff/${encodeURIComponent(dept)}`,
        { headers: { Authorization: `Bearer ${localStorage.getItem("grievance_token") || ""}` } }
      );
      if (res.ok) {
        const staffData = await res.json();
        const validStaff = Array.isArray(staffData)
          ? staffData.filter((s) => s.id && s.id.length !== 8) // exclude students
          : [];
        setDeptStaffMap((prev) => ({ ...prev, [dept]: validStaff }));
      } else {
        setDeptStaffMap((prev) => ({ ...prev, [dept]: [] }));
      }
    } catch (err) {
      console.warn(`Could not fetch staff for department "${dept}":`, err);
      setDeptStaffMap((prev) => ({ ...prev, [dept]: [] }));
    } finally {
      setLoadingStaffMap((prev) => ({ ...prev, [dept]: false }));
    }
  }, []);

  // Whenever selectedDepartments changes, fetch staff for any new department
  useEffect(() => {
    selectedDepartments.forEach((dept) => {
      if (dept && !deptStaffMap[dept] && !loadingStaffMap[dept]) {
        fetchStaffForDept(dept);
      }
    });
  }, [selectedDepartments, deptStaffMap, loadingStaffMap, fetchStaffForDept]);

  // Toggle department selection (single or multiple seamlessly)
  const toggleDepartment = (dept) => {
    setErrorMsg("");
    setSelectedDepartments((prev) => {
      if (prev.includes(dept)) {
        return prev.filter((d) => d !== dept);
      } else {
        return [...prev, dept];
      }
    });
  };

  // Change assigned faculty for a specific department
  const handleFacultyChange = (dept, staffId) => {
    setErrorMsg("");
    const staffList = deptStaffMap[dept] || [];
    const selected = staffList.find((s) => s.id === staffId);
    setDeptAssignments((prev) => ({
      ...prev,
      [dept]: {
        staffId: staffId || "",
        staffName: selected ? (selected.fullName || selected.id) : ""
      }
    }));
  };

  // Filter departments by search
  const filteredDepartments = departmentsList.filter((d) =>
    d.toLowerCase().includes(deptSearchQuery.toLowerCase().trim())
  );

  const isOnlySameDept =
    selectedDepartments.length === 1 && selectedDepartments[0] === currentDept;

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (hasAlreadyForwarded) {
      setErrorMsg("You have already forwarded this grievance once. You can only view its journey.");
      return;
    }

    if (selectedDepartments.length === 0) {
      setErrorMsg("Please select at least one destination department.");
      return;
    }

    // If forwarding internally within the same department only
    if (isOnlySameDept) {
      const chosenStaffId = deptAssignments[currentDept]?.staffId;
      if (!chosenStaffId) {
        setErrorMsg("Internal Reassignment: Please select a faculty member in this department.");
        return;
      }
      if (chosenStaffId.toUpperCase() === currentAssignedId) {
        setErrorMsg("This grievance is already assigned to this faculty member. Please choose a different faculty member to reassign.");
        return;
      }
    }

    if (!reason.trim() || reason.trim().length < 8) {
      setErrorMsg("Please provide a detailed reason for the forward (at least 8 characters).");
      return;
    }

    setSubmitting(true);
    setErrorMsg("");

    try {
      const departmentAssignments = selectedDepartments.map((dept) => {
        const assign = deptAssignments[dept];
        return {
          department: dept,
          staffId: assign?.staffId || null,
          staffName: assign?.staffName || null
        };
      });

      const primaryDept = selectedDepartments[0];
      const primaryAssign = deptAssignments[primaryDept];

      const payload = {
        targetDepartments: selectedDepartments,
        targetDepartment: primaryDept,
        departmentAssignments,
        targetStaffId: primaryAssign?.staffId || null,
        targetStaffName: primaryAssign?.staffName || null,
        reason: reason.trim(),
        transferredBy: currentUserId,
        transferredByName: currentUserName,
        transferredByRole: currentRole
      };

      const res = await fetch(
        `${process.env.REACT_APP_API_URL || "http://localhost:5000"}/api/grievances/transfer/${grievance._id}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("grievance_token") || ""}`
          },
          body: JSON.stringify(payload)
        }
      );

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Failed to forward grievance.");
      }

      if (onTransferred) {
        onTransferred(data.message, data.grievance);
      }
      onClose();
    } catch (err) {
      setErrorMsg(err.message || "Failed to forward grievance.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="transfer-modal-overlay"
      onClick={onClose}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        background: "rgba(15, 23, 42, 0.65)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 2000,
        padding: "16px",
        boxSizing: "border-box"
      }}
    >
      <div
        className="transfer-modal-card"
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#ffffff",
          borderRadius: "16px",
          width: "650px",
          maxWidth: "96%",
          maxHeight: "92vh",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
          overflow: "hidden",
          animation: "modalSlideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1)"
        }}
      >
        {/* Header */}
        <div
          className="transfer-modal-header"
          style={{
            padding: "16px 22px",
            borderBottom: "1px solid #e2e8f0",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: "linear-gradient(to right, #ffffff, #f8fafc)"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div
              style={{
                width: "38px",
                height: "38px",
                borderRadius: "8px",
                background: "#eff6ff",
                border: "1px solid #bfdbfe",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#2563eb",
                fontSize: "1.15rem"
              }}
            >
              🔄
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: "1.12rem", fontWeight: "700", color: "#0f172a" }}>
                Forward Grievance
              </h3>
              <span style={{ fontSize: "0.8rem", color: "#64748b" }}>
                Select destination department(s) and faculty
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: "transparent",
              border: "none",
              fontSize: "1.2rem",
              color: "#94a3b8",
              cursor: "pointer",
              padding: "4px 8px",
              borderRadius: "6px"
            }}
          >
            ✕
          </button>
        </div>

        {/* Form Body */}
        <form
          onSubmit={handleSubmit}
          className="transfer-modal-form"
          style={{
            padding: "18px 22px",
            overflowY: "auto",
            display: "flex",
            flexDirection: "column",
            gap: "16px"
          }}
        >
          {/* Notice if already forwarded */}
          {hasAlreadyForwarded && (
            <div
              style={{
                background: "#fef3c7",
                border: "1.5px solid #f59e0b",
                borderRadius: "8px",
                padding: "12px 14px",
                display: "flex",
                alignItems: "center",
                gap: "10px",
                color: "#92400e"
              }}
            >
              <span style={{ fontSize: "1.1rem" }}>🔒</span>
              <div style={{ fontSize: "0.84rem", lineHeight: "1.4" }}>
                <strong>Forwarding Limit Reached:</strong> You have already forwarded this grievance once. You can only view its live journey.
              </div>
            </div>
          )}

          {/* Grievance Quick Metadata Bar */}
          <div
            style={{
              background: "#f8fafc",
              border: "1px solid #e2e8f0",
              borderRadius: "8px",
              padding: "10px 14px",
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: "12px",
              alignItems: "center"
            }}
          >
            <div>
              <div style={{ fontSize: "0.72rem", color: "#64748b", fontWeight: "600", textTransform: "uppercase" }}>Ticket ID</div>
              <div style={{ fontSize: "0.84rem", fontWeight: "700", color: "#1e293b", fontFamily: "monospace", marginTop: "2px" }}>
                #{grievance?._id?.slice(-8)}
              </div>
            </div>
            <div>
              <div style={{ fontSize: "0.72rem", color: "#64748b", fontWeight: "600", textTransform: "uppercase" }}>Complainant</div>
              <div style={{ fontSize: "0.84rem", fontWeight: "600", color: "#1e293b", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginTop: "2px" }}>
                {grievance?.name || "N/A"}
              </div>
            </div>
            <div>
              <div style={{ fontSize: "0.72rem", color: "#64748b", fontWeight: "600", textTransform: "uppercase" }}>Current Dept</div>
              <div style={{ fontSize: "0.84rem", fontWeight: "700", color: "#b91c1c", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginTop: "2px" }}>
                {currentDept || "N/A"}
              </div>
            </div>
          </div>

          {/* ========================================================
              SECTION 1: SELECT DESTINATION DEPARTMENT(S)
             ======================================================== */}
          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "6px" }}>
              <label style={{ fontSize: "0.88rem", fontWeight: "600", color: "#0f172a" }}>
                Destination Department(s)
              </label>
              {selectedDepartments.length > 1 && (
                <span
                  style={{
                    fontSize: "0.75rem",
                    fontWeight: "600",
                    padding: "2px 8px",
                    borderRadius: "12px",
                    background: "#eff6ff",
                    color: "#1d4ed8"
                  }}
                >
                  {selectedDepartments.length} selected
                </span>
              )}
            </div>

            {/* Department Multi-Select Dropdown Component */}
            <div ref={deptDropdownRef} style={{ position: "relative" }}>
              {/* Dropdown Trigger */}
              <button
                type="button"
                onClick={() => setIsDeptDropdownOpen(!isDeptDropdownOpen)}
                style={{
                  width: "100%",
                  padding: "10px 14px",
                  borderRadius: "8px",
                  border: isDeptDropdownOpen ? "2px solid #2563eb" : "1.5px solid #cbd5e1",
                  background: "#ffffff",
                  color: "#0f172a",
                  fontSize: "0.88rem",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  cursor: "pointer",
                  boxShadow: isDeptDropdownOpen ? "0 0 0 3px rgba(37, 99, 235, 0.12)" : "none",
                  transition: "all 0.15s ease"
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "8px", overflow: "hidden" }}>
                  <span style={{ fontSize: "0.95rem" }}>🏛️</span>
                  <span
                    style={{
                      color: selectedDepartments.length === 0 ? "#94a3b8" : "#1e293b",
                      fontWeight: selectedDepartments.length === 0 ? "400" : "600",
                      textOverflow: "ellipsis",
                      overflow: "hidden",
                      whiteSpace: "nowrap"
                    }}
                  >
                    {selectedDepartments.length === 0
                      ? "Choose department(s)..."
                      : selectedDepartments.length === 1
                      ? selectedDepartments[0]
                      : `${selectedDepartments[0]} + ${selectedDepartments.length - 1} more`}
                  </span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
                  {selectedDepartments.length > 1 && (
                    <span
                      style={{
                        background: "#eff6ff",
                        color: "#2563eb",
                        borderRadius: "10px",
                        padding: "1px 7px",
                        fontSize: "0.72rem",
                        fontWeight: "700"
                      }}
                    >
                      {selectedDepartments.length}
                    </span>
                  )}
                  <span
                    style={{
                      transform: isDeptDropdownOpen ? "rotate(180deg)" : "rotate(0deg)",
                      transition: "transform 0.2s",
                      color: "#64748b",
                      fontSize: "0.72rem"
                    }}
                  >
                    ▼
                  </span>
                </div>
              </button>

              {/* Dropdown Menu Popover */}
              {isDeptDropdownOpen && (
                <div
                  style={{
                    position: "absolute",
                    top: "calc(100% + 5px)",
                    left: 0,
                    right: 0,
                    zIndex: 100,
                    background: "#ffffff",
                    borderRadius: "10px",
                    boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.15), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
                    border: "1.5px solid #cbd5e1",
                    overflow: "hidden"
                  }}
                >
                  {/* Search inside Dropdown */}
                  <div style={{ padding: "8px 10px", borderBottom: "1px solid #e2e8f0", background: "#f8fafc" }}>
                    <div style={{ position: "relative" }}>
                      <input
                        type="text"
                        placeholder="Search departments..."
                        value={deptSearchQuery}
                        onChange={(e) => setDeptSearchQuery(e.target.value)}
                        autoFocus
                        style={{
                          width: "100%",
                          padding: "7px 10px 7px 28px",
                          borderRadius: "6px",
                          border: "1px solid #cbd5e1",
                          fontSize: "0.82rem",
                          boxSizing: "border-box",
                          outline: "none"
                        }}
                      />
                      <span style={{ position: "absolute", left: "9px", top: "50%", transform: "translateY(-50%)", color: "#94a3b8", fontSize: "0.8rem" }}>
                        🔍
                      </span>
                      {deptSearchQuery && (
                        <button
                          type="button"
                          onClick={() => setDeptSearchQuery("")}
                          style={{
                            position: "absolute",
                            right: "8px",
                            top: "50%",
                            transform: "translateY(-50%)",
                            background: "transparent",
                            border: "none",
                            color: "#94a3b8",
                            cursor: "pointer",
                            fontSize: "0.8rem"
                          }}
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Scrollable Department Checklist */}
                  <div style={{ maxHeight: "200px", overflowY: "auto", padding: "4px 6px" }}>
                    {filteredDepartments.length === 0 ? (
                      <div style={{ padding: "14px", textAlign: "center", color: "#94a3b8", fontSize: "0.82rem" }}>
                        No departments found
                      </div>
                    ) : (
                      filteredDepartments.map((dept) => {
                        const isSelected = selectedDepartments.includes(dept);
                        const isCurrent = dept === currentDept;
                        return (
                          <div
                            key={dept}
                            onClick={() => toggleDepartment(dept)}
                            style={{
                              padding: "7px 10px",
                              borderRadius: "6px",
                              background: isSelected ? "#eff6ff" : "transparent",
                              color: isSelected ? "#1d4ed8" : "#334155",
                              fontWeight: isSelected ? "600" : "500",
                              fontSize: "0.84rem",
                              cursor: "pointer",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              transition: "background 0.1s"
                            }}
                            onMouseEnter={(e) => {
                              if (!isSelected) e.currentTarget.style.background = "#f1f5f9";
                            }}
                            onMouseLeave={(e) => {
                              if (!isSelected) e.currentTarget.style.background = "transparent";
                            }}
                          >
                            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => {}}
                                style={{ cursor: "pointer", accentColor: "#2563eb", width: "15px", height: "15px" }}
                              />
                              <span>
                                {dept}
                                {isCurrent && (
                                  <span style={{ marginLeft: "5px", fontSize: "0.7rem", color: "#dc2626", fontWeight: "600" }}>
                                    (Current)
                                  </span>
                                )}
                              </span>
                            </div>
                            {isSelected && (
                              <span style={{ fontSize: "0.72rem", color: "#2563eb", fontWeight: "700" }}>
                                Selected ✓
                              </span>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* Dropdown Menu Footer */}
                  <div
                    style={{
                      padding: "8px 12px",
                      borderTop: "1px solid #e2e8f0",
                      background: "#f8fafc",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      fontSize: "0.78rem"
                    }}
                  >
                    <span style={{ color: "#64748b" }}>
                      {selectedDepartments.length} selected
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsDeptDropdownOpen(false)}
                      style={{
                        padding: "4px 12px",
                        borderRadius: "6px",
                        background: "#2563eb",
                        color: "#ffffff",
                        border: "none",
                        fontWeight: "600",
                        fontSize: "0.78rem",
                        cursor: "pointer"
                      }}
                    >
                      Done
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Selected Departments Tags (Only show when MORE than 1 department selected) */}
            {selectedDepartments.length > 1 && (
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: "6px",
                  marginTop: "8px",
                  padding: "8px 10px",
                  background: "#f8fafc",
                  borderRadius: "8px",
                  border: "1px dashed #cbd5e1"
                }}
              >
                {selectedDepartments.map((dept) => (
                  <span
                    key={dept}
                    style={{
                      background: "#ffffff",
                      color: "#1e293b",
                      border: "1px solid #cbd5e1",
                      borderRadius: "6px",
                      padding: "3px 8px",
                      fontSize: "0.78rem",
                      fontWeight: "600",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "5px"
                    }}
                  >
                    <span>{dept}</span>
                    <button
                      type="button"
                      onClick={() => toggleDepartment(dept)}
                      title="Remove"
                      style={{
                        background: "transparent",
                        border: "none",
                        color: "#64748b",
                        cursor: "pointer",
                        padding: 0,
                        fontSize: "0.85rem",
                        lineHeight: 1
                      }}
                    >
                      ×
                    </button>
                  </span>
                ))}
                <button
                  type="button"
                  onClick={() => setSelectedDepartments([])}
                  style={{
                    background: "transparent",
                    border: "none",
                    color: "#dc2626",
                    fontSize: "0.75rem",
                    fontWeight: "600",
                    cursor: "pointer",
                    padding: "2px 6px",
                    alignSelf: "center",
                    marginLeft: "auto"
                  }}
                >
                  Clear All
                </button>
              </div>
            )}
          </div>

          {/* ========================================================
              SECTION 2: FACULTY ASSIGNMENT
             ======================================================== */}
          <div>
            <label style={{ display: "block", marginBottom: "8px", fontSize: "0.88rem", fontWeight: "600", color: "#0f172a" }}>
              Faculty Assignment
            </label>

            {selectedDepartments.length === 0 ? (
              <div
                style={{
                  background: "#f8fafc",
                  border: "1px dashed #cbd5e1",
                  borderRadius: "8px",
                  padding: "16px",
                  textAlign: "center",
                  color: "#64748b",
                  fontSize: "0.84rem"
                }}
              >
                Select destination department(s) above to assign faculty.
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {selectedDepartments.map((dept, index) => {
                  const staffList = deptStaffMap[dept] || [];
                  const isLoadingStaff = loadingStaffMap[dept];
                  const currentAssignment = deptAssignments[dept] || { staffId: "", staffName: "" };
                  const isCurrent = dept === currentDept;

                  return (
                    <div
                      key={dept}
                      style={{
                        background: "#ffffff",
                        border: "1px solid #e2e8f0",
                        borderRadius: "8px",
                        padding: "12px 14px",
                        boxShadow: "0 1px 2px rgba(0,0,0,0.02)",
                        borderLeft: selectedDepartments.length > 1
                          ? index === 0 ? "3px solid #2563eb" : "3px solid #10b981"
                          : "1px solid #e2e8f0"
                      }}
                    >
                      {/* Department Card Header */}
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          marginBottom: "8px"
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          {selectedDepartments.length > 1 && (
                            <span
                              style={{
                                background: index === 0 ? "#eff6ff" : "#f1f5f9",
                                color: index === 0 ? "#2563eb" : "#475569",
                                padding: "2px 7px",
                                borderRadius: "4px",
                                fontSize: "0.72rem",
                                fontWeight: "700"
                              }}
                            >
                              Target {index + 1}
                            </span>
                          )}
                          <strong style={{ fontSize: "0.88rem", color: "#0f172a" }}>
                            {dept}
                          </strong>
                          {isCurrent && (
                            <span style={{ fontSize: "0.7rem", padding: "1px 5px", background: "#fef2f2", color: "#dc2626", borderRadius: "4px", fontWeight: "600" }}>
                              Internal Reassign
                            </span>
                          )}
                        </div>

                        <span style={{ fontSize: "0.75rem", color: "#64748b" }}>
                          {isLoadingStaff
                            ? "Loading..."
                            : `${staffList.length} faculty`}
                        </span>
                      </div>

                      {/* Searchable Faculty Select */}
                      {isLoadingStaff ? (
                        <div style={{ fontSize: "0.8rem", color: "#64748b", padding: "6px 0" }}>
                          Loading faculty for {dept}...
                        </div>
                      ) : (
                        <SearchableFacultySelect
                          dept={dept}
                          staffList={staffList}
                          selectedStaffId={currentAssignment.staffId}
                          onSelect={(staffId) => handleFacultyChange(dept, staffId)}
                          isCurrentDept={isCurrent}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* ========================================================
              SECTION 3: REASON FOR FORWARDING (MANDATORY)
             ======================================================== */}
          <div>
            <label style={{ display: "block", marginBottom: "6px", fontSize: "0.88rem", fontWeight: "600", color: "#0f172a" }}>
              Reason for Forwarding <span style={{ color: "#ef4444" }}>*</span>
            </label>
            <textarea
              rows={3}
              placeholder="Enter reason for forwarding..."
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
                if (errorMsg) setErrorMsg("");
              }}
              style={{
                width: "100%",
                padding: "9px 12px",
                borderRadius: "8px",
                border: "1.5px solid #cbd5e1",
                fontSize: "0.85rem",
                color: "#1e293b",
                boxSizing: "border-box",
                outline: "none",
                resize: "vertical",
                fontFamily: "inherit"
              }}
            />
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: "4px", fontSize: "0.74rem", color: "#64748b" }}>
              <span>Minimum 8 characters</span>
              <span>{reason.trim().length} characters</span>
            </div>
          </div>

          {/* Error Message */}
          {errorMsg && (
            <div
              style={{
                background: "#fef2f2",
                border: "1.5px solid #fecaca",
                borderRadius: "8px",
                padding: "10px 14px",
                color: "#991b1b",
                fontSize: "0.84rem",
                display: "flex",
                alignItems: "center",
                gap: "8px"
              }}
            >
              <span>⚠️</span>
              <div>{errorMsg}</div>
            </div>
          )}

          {/* Footer Actions */}
          <div
            className="transfer-modal-footer"
            style={{
              paddingTop: "12px",
              borderTop: "1px solid #e2e8f0",
              display: "flex",
              alignItems: "center",
              justifyContent: "flex-end",
              gap: "10px"
            }}
          >
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="transfer-modal-cancel-btn"
              style={{
                padding: "9px 16px",
                borderRadius: "8px",
                border: "1px solid #cbd5e1",
                background: "#f8fafc",
                color: "#475569",
                fontWeight: "600",
                fontSize: "0.86rem",
                cursor: "pointer"
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={
                submitting ||
                hasAlreadyForwarded ||
                selectedDepartments.length === 0 ||
                !reason.trim() ||
                reason.trim().length < 8
              }
              className="transfer-modal-submit-btn"
              style={{
                padding: "9px 20px",
                borderRadius: "8px",
                border: "none",
                background:
                  submitting ||
                  hasAlreadyForwarded ||
                  selectedDepartments.length === 0 ||
                  !reason.trim() ||
                  reason.trim().length < 8
                    ? "#94a3b8"
                    : "linear-gradient(135deg, #2563eb, #1d4ed8)",
                color: "#ffffff",
                fontWeight: "600",
                fontSize: "0.86rem",
                cursor:
                  submitting ||
                  hasAlreadyForwarded ||
                  selectedDepartments.length === 0 ||
                  !reason.trim() ||
                  reason.trim().length < 8
                    ? "not-allowed"
                    : "pointer",
                boxShadow: "0 2px 8px rgba(37, 99, 235, 0.2)",
                display: "inline-flex",
                alignItems: "center",
                gap: "6px"
              }}
            >
              {submitting
                ? "Forwarding..."
                : hasAlreadyForwarded
                ? "Already Forwarded"
                : selectedDepartments.length === 0
                ? "Select a Department"
                : selectedDepartments.length === 1
                ? isOnlySameDept
                  ? "Confirm Reassignment ➔"
                  : "Confirm Forward ➔"
                : `Forward to ${selectedDepartments.length} Departments ➔`}
            </button>
          </div>
        </form>
      </div>

      <style>{`
        @keyframes modalSlideUp {
          from { opacity: 0; transform: translateY(15px) scale(0.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }

        .transfer-modal-form::-webkit-scrollbar {
          width: 6px;
        }
        .transfer-modal-form::-webkit-scrollbar-track {
          background: #f8fafc;
          border-radius: 4px;
        }
        .transfer-modal-form::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 4px;
        }
        .transfer-modal-form::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }

        @media (max-width: 768px) {
          .transfer-modal-overlay {
            padding: 8px !important;
          }
          .transfer-modal-card {
            width: 100% !important;
            max-width: 100% !important;
            max-height: 94vh !important;
            border-radius: 14px !important;
          }
          .transfer-modal-header {
            padding: 14px 16px !important;
          }
          .transfer-modal-form {
            padding: 14px 14px !important;
            gap: 14px !important;
          }
          .transfer-modal-footer {
            flex-direction: column-reverse !important;
            gap: 8px !important;
          }
          .transfer-modal-cancel-btn,
          .transfer-modal-submit-btn {
            width: 100% !important;
            justify-content: center !important;
            text-align: center !important;
          }
        }
      `}</style>
    </div>
  );
}

export default TransferDepartmentModal;
