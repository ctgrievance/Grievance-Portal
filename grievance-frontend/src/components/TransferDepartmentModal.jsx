import { ArrowRightLeftIcon, BuildingIcon, AlertCircleIcon, LockIcon, XIcon, ShieldIcon } from "./Icons";
import React, { useState, useEffect, useRef } from "react";

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

function TransferDepartmentModal({ grievance, onClose, onTransferred }) {
  const [departmentsList, setDepartmentsList] = useState(DEFAULT_DEPARTMENTS);
  const [selectedDepartments, setSelectedDepartments] = useState([]);
  const [isDeptDropdownOpen, setIsDeptDropdownOpen] = useState(false);
  const [deptSearchQuery, setDeptSearchQuery] = useState("");
  const deptDropdownRef = useRef(null);

        const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const currentDept = grievance?.category || "";
  
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

    if (!reason.trim() || reason.trim().length < 8) {
      setErrorMsg("Please provide a detailed reason for the forward (at least 8 characters).");
      return;
    }

    setSubmitting(true);
    setErrorMsg("");

    try {
      const departmentAssignments = selectedDepartments.map((dept) => ({
        department: dept,
        staffId: null,
        staffName: null
      }));

      const primaryDept = selectedDepartments[0];

      const payload = {
        targetDepartments: selectedDepartments,
        targetDepartment: primaryDept,
        departmentAssignments,
        targetStaffId: null,
        targetStaffName: null,
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
          width: "500px",
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
            padding: "16px 20px",
            borderBottom: "1px solid #e2e8f0",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: "#ffffff"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "8px",
                background: "#eff6ff",
                border: "1px solid #dbeafe",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#2563eb"
              }}
            >
              <ArrowRightLeftIcon width="16" height="16" />
            </div>
            <h3 style={{ margin: 0, fontSize: "1.05rem", fontWeight: "700", color: "#0f172a" }}>
              Forward Grievance
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            style={{
              background: "transparent",
              border: "none",
              color: "#94a3b8",
              cursor: "pointer",
              padding: "6px",
              borderRadius: "6px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "all 0.15s ease"
            }}
          >
            <XIcon width="16" height="16" />
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
              <LockIcon width="16" height="16" style={{ color: "#d97706", flexShrink: 0 }} />
              <div style={{ fontSize: "0.84rem", lineHeight: "1.4" }}>
                <strong>Forwarding Limit Reached:</strong> You have already forwarded this grievance once. You can only view its live journey.
              </div>
            </div>
          )}

          {/* Grievance Reference Chip */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "8px 12px",
              background: "#f8fafc",
              border: "1px solid #e2e8f0",
              borderRadius: "8px",
              fontSize: "0.8rem",
              color: "#64748b"
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <span>Forwarding</span>
              <span style={{ fontFamily: "monospace", fontWeight: "700", color: "#0f172a" }}>
                #{grievance?._id?.slice(-8)}
              </span>
              {grievance?.name && (
                <>
                  <span>•</span>
                  <span style={{ fontWeight: "600", color: "#334155" }}>{grievance.name}</span>
                </>
              )}
            </div>
            {currentDept && (
              <div style={{ fontSize: "0.75rem", color: "#64748b" }}>
                From: <strong style={{ color: "#334155" }}>{currentDept}</strong>
              </div>
            )}
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
                  <BuildingIcon width="15" height="15" style={{ color: "#64748b", flexShrink: 0 }} />
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
              SECTION 2: ASSIGNED RECIPIENT - DEPARTMENT ADMIN ONLY
             ======================================================== */}
          {selectedDepartments.length > 0 && (
            <div
              style={{
                background: "#f0fdf4",
                border: "1.5px solid #86efac",
                borderRadius: "10px",
                padding: "12px 14px",
                display: "flex",
                flexDirection: "column",
                gap: "8px"
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span
                  style={{
                    fontSize: "0.78rem",
                    fontWeight: "700",
                    color: "#166534",
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                    display: "flex",
                    alignItems: "center",
                    gap: "5px"
                  }}
                >
                  <ShieldIcon width="14" height="14" style={{ color: "#16a34a" }} />
                  Forwarding Target
                </span>
                <span
                  style={{
                    fontSize: "0.72rem",
                    fontWeight: "700",
                    padding: "2px 8px",
                    borderRadius: "12px",
                    background: "#dcfce7",
                    color: "#15803d",
                    border: "1px solid #bbf7d0"
                  }}
                >
                  Department Admin Only
                </span>
              </div>

              <div
                style={{
                  background: "#ffffff",
                  border: "1px solid #bbf7d0",
                  borderRadius: "8px",
                  padding: "10px 12px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between"
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <div
                    style={{
                      width: "36px",
                      height: "36px",
                      borderRadius: "8px",
                      background: "#dcfce7",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#16a34a",
                      flexShrink: 0
                    }}
                  >
                    <BuildingIcon width="18" height="18" />
                  </div>
                  <div>
                    <div style={{ fontWeight: "700", fontSize: "0.88rem", color: "#0f172a" }}>
                      {selectedDepartments.length === 1
                        ? `${selectedDepartments[0]} — Department Administrator`
                        : `${selectedDepartments.join(", ")} — Department Administrators`}
                    </div>
                    <div style={{ fontSize: "0.76rem", color: "#166534", marginTop: "1px", fontWeight: "500" }}>
                      Target: Head of Department / Department Pool
                    </div>
                  </div>
                </div>
                <span
                  style={{
                    fontSize: "0.74rem",
                    color: "#15803d",
                    fontWeight: "700",
                    background: "#f0fdf4",
                    padding: "3px 8px",
                    borderRadius: "6px",
                    border: "1px solid #bbf7d0",
                    whiteSpace: "nowrap"
                  }}
                >
                  ✓ Direct Routing to Admin
                </span>
              </div>

              <div
                style={{
                  fontSize: "0.75rem",
                  color: "#475569",
                  background: "#f8fafc",
                  padding: "7px 10px",
                  borderRadius: "6px",
                  border: "1px solid #e2e8f0",
                  lineHeight: "1.4"
                }}
              >
                ℹ️ <strong>Routing Policy:</strong> Faculty members cannot assign grievances directly to other faculty members. This grievance will be sent directly to the destination <strong>Department Administrator</strong>, who will evaluate and assign it.
              </div>
            </div>
          )}

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
              <AlertCircleIcon width="16" height="16" style={{ color: "#dc2626", flexShrink: 0 }} />
              <div>{errorMsg}</div>
            </div>
          )}

          {/* Footer Actions */}
          <div
            className="transfer-modal-footer"
            style={{
              paddingTop: "14px",
              borderTop: "1px solid #f1f5f9",
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
                padding: "9px 18px",
                borderRadius: "8px",
                border: "1px solid #cbd5e1",
                background: "#ffffff",
                color: "#475569",
                fontWeight: "600",
                fontSize: "0.86rem",
                cursor: "pointer",
                transition: "all 0.15s ease"
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
                padding: "9px 22px",
                borderRadius: "8px",
                border: "none",
                background:
                  submitting ||
                  hasAlreadyForwarded ||
                  selectedDepartments.length === 0 ||
                  !reason.trim() ||
                  reason.trim().length < 8
                    ? "#e2e8f0"
                    : "#2563eb",
                color:
                  submitting ||
                  hasAlreadyForwarded ||
                  selectedDepartments.length === 0 ||
                  !reason.trim() ||
                  reason.trim().length < 8
                    ? "#94a3b8"
                    : "#ffffff",
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
                boxShadow:
                  submitting ||
                  hasAlreadyForwarded ||
                  selectedDepartments.length === 0 ||
                  !reason.trim() ||
                  reason.trim().length < 8
                    ? "none"
                    : "0 1px 3px rgba(37, 99, 235, 0.3)",
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                transition: "all 0.15s ease"
              }}
            >
              {submitting ? (
                "Forwarding..."
              ) : (
                <>
                  <span>
                    {isOnlySameDept
                      ? "Reassign Faculty"
                      : selectedDepartments.length > 1
                      ? `Forward to ${selectedDepartments.length} Departments`
                      : "Confirm Forward"}
                  </span>
                  <span style={{ fontSize: "0.9rem" }}>→</span>
                </>
              )}
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
