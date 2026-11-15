import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  PlusIcon,
  TrashIcon,
  SaveIcon,
  GraduationCapIcon,
  UsersIcon,
  UserIcon,
  RerouteIcon,
  RepeatIcon,
  ZapIcon,
  AlertCircleIcon,
  EditIcon
} from "./Icons";

function RoutingRuleConfig({ department }) {
  const [routingRules, setRoutingRules] = useState([]);
  const [issues, setIssues] = useState([]);
  const [departmentStaff, setDepartmentStaff] = useState([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingRule, setEditingRule] = useState(null);
  const formRef = useRef(null);
  const [targetAudience, setTargetAudience] = useState("student"); // "student" | "staff"
  const [formData, setFormData] = useState({
    issueTypeId: "",
    assignedStaff: [],
    assignmentMode: "single"
  });
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("");

  useEffect(() => {
    if (department) {
      fetchRoutingRules();
      fetchIssues();
      fetchDepartmentStaff();
    }
  }, [department, targetAudience]);

  const fetchRoutingRules = async () => {
    try {
      const res = await fetch(
        `${process.env.REACT_APP_API_URL || "http://localhost:5000"}/api/routing-rules/department/${encodeURIComponent(department)}?targetAudience=${targetAudience}`
      );
      if (!res.ok) {
        const errorText = await res.text();
        console.error("Fetch routing rules error:", errorText);
        return;
      }
      const data = await res.json();
      setRoutingRules(data);
    } catch (error) {
      console.error("Error fetching routing rules:", error);
    }
  };

  const fetchIssues = async () => {
    try {
      const res = await fetch(
        `${process.env.REACT_APP_API_URL || "http://localhost:5000"}/api/issue-types/department/${encodeURIComponent(department)}?targetAudience=${targetAudience}`
      );
      if (!res.ok) {
        const errorText = await res.text();
        console.error("Fetch issues error:", errorText);
        return;
      }
      const data = await res.json();
      setIssues(data);
    } catch (error) {
      console.error("Error fetching issues:", error);
    }
  };

  const fetchDepartmentStaff = async () => {
    try {
      const token = localStorage.getItem("grievance_token");
      if (!token) {
        console.error("No token found");
        return;
      }
      const res = await fetch(
        `${process.env.REACT_APP_API_URL || "http://localhost:5000"}/api/admin/staff/${encodeURIComponent(department)}`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      if (!res.ok) {
        const errorText = await res.text();
        console.error("Fetch department staff error:", errorText);
        return;
      }
      const data = await res.json();
      setDepartmentStaff(data);
    } catch (error) {
      console.error("Error fetching department staff:", error);
    }
  };

  // Merge currently assigned staff with department staff list so assigned personnel always render
  const combinedStaffList = useMemo(() => {
    const list = [...departmentStaff];
    formData.assignedStaff.forEach((assigned) => {
      const exists = list.some(
        (s) => String(s.id) === String(assigned.staffId) || String(s._id) === String(assigned.staffId)
      );
      if (!exists && assigned.staffName) {
        list.push({
          id: assigned.staffId,
          fullName: assigned.staffName,
          email: assigned.staffEmail || "",
          isCurrentAssignmentOnly: true
        });
      }
    });
    return list;
  }, [departmentStaff, formData.assignedStaff]);

  const handleModeChange = (newMode) => {
    let updatedStaff = [...formData.assignedStaff];
    if (newMode === "single" && updatedStaff.length > 1) {
      updatedStaff = [updatedStaff[0]]; // keep only first selected
    }
    setFormData({
      ...formData,
      assignmentMode: newMode,
      assignedStaff: updatedStaff
    });
  };

  const handleStaffToggle = (staffId, staffName, staffEmail) => {
    const sId = String(staffId);
    if (formData.assignmentMode === "single") {
      // In Single Assign, exactly 1 staff member is selected at a time
      const isAlreadySelected = formData.assignedStaff.some((s) => String(s.staffId) === sId);
      if (isAlreadySelected) {
        setFormData({ ...formData, assignedStaff: [] });
      } else {
        setFormData({
          ...formData,
          assignedStaff: [{ staffId: sId, staffName, staffEmail: staffEmail || "", isAvailable: true }]
        });
      }
      return;
    }

    // In Round Robin & Team Pool, multi-select is enabled
    const currentStaff = formData.assignedStaff.find((s) => String(s.staffId) === sId);
    if (currentStaff) {
      setFormData({
        ...formData,
        assignedStaff: formData.assignedStaff.filter((s) => String(s.staffId) !== sId)
      });
    } else {
      setFormData({
        ...formData,
        assignedStaff: [
          ...formData.assignedStaff,
          { staffId: sId, staffName, staffEmail: staffEmail || "", isAvailable: true }
        ]
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.issueTypeId) {
      setMessage("Please select an issue type.");
      setMessageType("error");
      return;
    }

    if (formData.assignmentMode === "single") {
      if (formData.assignedStaff.length !== 1) {
        setMessage("For Single Assign mode, please select exactly 1 dedicated staff member.");
        setMessageType("error");
        return;
      }
    } else if (formData.assignedStaff.length === 0) {
      setMessage("Please select at least one staff member.");
      setMessageType("error");
      return;
    }

    try {
      const res = await fetch(`${process.env.REACT_APP_API_URL || "http://localhost:5000"}/api/routing-rules`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          issueTypeId: formData.issueTypeId,
          department,
          assignedStaff:
            formData.assignmentMode === "single" ? [formData.assignedStaff[0]] : formData.assignedStaff,
          assignmentMode: formData.assignmentMode,
          targetAudience: targetAudience
        })
      });

      if (res.ok) {
        setMessage("Routing rule created successfully!");
        setMessageType("success");
        setFormData({
          issueTypeId: "",
          assignedStaff: [],
          assignmentMode: "single"
        });
        setShowAddForm(false);
        fetchRoutingRules();
        setTimeout(() => setMessage(""), 3000);
      } else {
        const error = await res.json();
        setMessage(error.message || "Failed to create routing rule");
        setMessageType("error");
      }
    } catch (error) {
      console.error("Error creating routing rule:", error);
      setMessage("Failed to create routing rule");
      setMessageType("error");
    }
  };

  const handleStartEdit = (rule) => {
    setEditingRule(rule);
    setShowAddForm(false);

    if (rule.targetAudience && rule.targetAudience !== targetAudience) {
      setTargetAudience(rule.targetAudience);
    }

    setFormData({
      issueTypeId: rule.issueTypeId?._id || rule.issueTypeId || "",
      assignedStaff: rule.assignedStaff
        ? rule.assignedStaff.map((s) => ({
            staffId: String(s.staffId),
            staffName: s.staffName,
            staffEmail: s.staffEmail || "",
            isAvailable: s.isAvailable !== undefined ? s.isAvailable : true,
            roundRobinIndex: s.roundRobinIndex || 0
          }))
        : [],
      assignmentMode: rule.assignmentMode || "single"
    });

    setMessage("");
    if (formRef.current) {
      formRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    } else {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handleCancel = () => {
    setShowAddForm(false);
    setEditingRule(null);
    setFormData({
      issueTypeId: "",
      assignedStaff: [],
      assignmentMode: "single"
    });
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!editingRule) return;

    if (!formData.issueTypeId) {
      setMessage("Please select an issue type.");
      setMessageType("error");
      return;
    }

    if (formData.assignmentMode === "single") {
      if (formData.assignedStaff.length !== 1) {
        setMessage("For Single Assign mode, please select exactly 1 dedicated staff member.");
        setMessageType("error");
        return;
      }
    } else if (formData.assignedStaff.length === 0) {
      setMessage("Please select at least one staff member.");
      setMessageType("error");
      return;
    }

    try {
      const res = await fetch(
        `${process.env.REACT_APP_API_URL || "http://localhost:5000"}/api/routing-rules/${editingRule._id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            issueTypeId: formData.issueTypeId,
            department,
            assignedStaff:
              formData.assignmentMode === "single" ? [formData.assignedStaff[0]] : formData.assignedStaff,
            assignmentMode: formData.assignmentMode,
            targetAudience: targetAudience
          })
        }
      );

      if (res.ok) {
        setMessage("Routing rule updated successfully!");
        setMessageType("success");
        setEditingRule(null);
        setFormData({
          issueTypeId: "",
          assignedStaff: [],
          assignmentMode: "single"
        });
        fetchRoutingRules();
        setTimeout(() => setMessage(""), 3000);
      } else {
        const error = await res.json().catch(() => ({}));
        setMessage(error.message || "Failed to update routing rule");
        setMessageType("error");
      }
    } catch (error) {
      console.error("Error updating routing rule:", error);
      setMessage("Failed to update routing rule");
      setMessageType("error");
    }
  };

  const handleDelete = async (ruleId) => {
    if (!window.confirm("Are you sure you want to delete this routing rule?")) return;

    try {
      const res = await fetch(
        `${process.env.REACT_APP_API_URL || "http://localhost:5000"}/api/routing-rules/${ruleId}`,
        {
          method: "DELETE"
        }
      );

      if (res.ok) {
        setMessage("Routing rule deleted successfully!");
        setMessageType("success");
        fetchRoutingRules();
        setTimeout(() => setMessage(""), 3000);
      } else {
        setMessage("Failed to delete routing rule");
        setMessageType("error");
      }
    } catch (error) {
      console.error("Error deleting routing rule:", error);
      setMessage("Failed to delete routing rule");
      setMessageType("error");
    }
  };

  const renderModeBadge = (mode) => {
    switch (mode) {
      case "single":
        return (
          <span className="rule-mode-badge single">
            <ZapIcon width="13" height="13" />
            <span>Single Dedicated</span>
          </span>
        );
      case "round_robin":
        return (
          <span className="rule-mode-badge round-robin">
            <RepeatIcon width="13" height="13" />
            <span>Series Rotation</span>
          </span>
        );
      case "pool_accept":
        return (
          <span className="rule-mode-badge pool">
            <UsersIcon width="13" height="13" />
            <span>Team Pool Queue</span>
          </span>
        );
      default:
        return <span className="rule-mode-badge default">{mode}</span>;
    }
  };

  return (
    <div className="smart-mgmt-container">
      <div className="smart-mgmt-card">
        {message && (
          <div className={`alert-box ${messageType}`} style={{ marginBottom: "20px" }}>
            {message}
          </div>
        )}

        {/* Top Header & Executive Controls */}
        <div className="smart-mgmt-header">
          <div className="smart-mgmt-title-group">
            <div className="smart-mgmt-pill-badge">
              <RerouteIcon width="13" height="13" />
              <span>Automated Routing</span>
            </div>
            <h2>
              Routing Rules for <span className="smart-dept-tag">{department}</span>
            </h2>
          </div>

          <div className="smart-mgmt-controls">
            {/* Sleek Segmented Switcher */}
            <div className="smart-segmented-switcher">
              <button
                type="button"
                className={`smart-segmented-btn ${targetAudience === "student" ? "active" : ""}`}
                onClick={() => setTargetAudience("student")}
              >
                <GraduationCapIcon width="14" height="14" />
                <span>Student</span>
              </button>
              <button
                type="button"
                className={`smart-segmented-btn ${targetAudience === "staff" ? "active" : ""}`}
                onClick={() => setTargetAudience("staff")}
              >
                <UsersIcon width="14" height="14" />
                <span>Staff</span>
              </button>
            </div>

            {!showAddForm && !editingRule && (
              <button
                onClick={() => {
                  setEditingRule(null);
                  setFormData({ issueTypeId: "", assignedStaff: [], assignmentMode: "single" });
                  setShowAddForm(true);
                }}
                className="smart-btn-obsidian"
              >
                <PlusIcon width="15" height="15" />
                <span>Create {targetAudience === "staff" ? "Staff" : "Student"} Rule</span>
              </button>
            )}
          </div>
        </div>

        {/* Add / Edit Rule Form */}
        {(showAddForm || editingRule) && (
          <form
            ref={formRef}
            onSubmit={editingRule ? handleUpdate : handleSubmit}
            className="smart-form-card"
          >
            <div className="smart-form-header">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "10px" }}>
                <div>
                  <h3>
                    {editingRule
                      ? `Edit ${targetAudience === "staff" ? "Staff" : "Student"} Routing Rule`
                      : `Create ${targetAudience === "staff" ? "Staff" : "Student"} Routing Rule`}
                  </h3>
                  <p>
                    {editingRule
                      ? "Modify assignment mode, issue type, and assigned personnel for this routing rule."
                      : "Configure automated grievance dispatching mode and assigned staff personnel."}
                  </p>
                </div>
                {editingRule && (
                  <div className="smart-editing-pill">
                    <EditIcon width="13" height="13" />
                    <span>Editing Mode</span>
                  </div>
                )}
              </div>
            </div>

            {/* Field 1: Issue Type */}
            <div className="rule-form-section">
              <label className="rule-form-label">
                Select Issue Type *
                <span className="rule-form-sublabel">The complaint category this routing rule applies to</span>
              </label>
              <select
                value={formData.issueTypeId}
                onChange={(e) => setFormData({ ...formData, issueTypeId: e.target.value })}
                className="smart-input"
                required
              >
                <option value="">Select an issue type...</option>
                {editingRule &&
                  editingRule.issueTypeId &&
                  !issues.some(
                    (i) => i._id === (editingRule.issueTypeId?._id || editingRule.issueTypeId)
                  ) && (
                    <option value={editingRule.issueTypeId?._id || editingRule.issueTypeId}>
                      {editingRule.issueTypeId?.issueName || "Current Issue"}
                    </option>
                  )}
                {issues.map((issue) => (
                  <option key={issue._id} value={issue._id}>
                    {issue.issueName} {!issue.isActive ? "(Inactive)" : ""}
                  </option>
                ))}
              </select>
            </div>

            {/* Field 2: Assignment Mode Selector Cards */}
            <div className="rule-form-section">
              <label className="rule-form-label">
                Select Assignment Mode *
                <span className="rule-form-sublabel">Choose how complaints should be dispatched to assigned staff</span>
              </label>

              <div className="rule-mode-selector-grid">
                {/* Single Assign */}
                <div
                  className={`rule-mode-card ${formData.assignmentMode === "single" ? "active" : ""}`}
                  onClick={() => handleModeChange("single")}
                >
                  <div className="rule-mode-card-header">
                    <div className="rule-mode-card-title-group">
                      <div className="rule-mode-icon-box single">
                        <ZapIcon width="16" height="16" />
                      </div>
                      <span className="rule-mode-card-title">Single Dedicated</span>
                    </div>
                    <div className={`rule-radio-indicator ${formData.assignmentMode === "single" ? "checked" : ""}`} />
                  </div>
                  <p className="rule-mode-card-desc">
                    Every complaint goes directly and immediately to 1 dedicated staff member.
                  </p>
                </div>

                {/* Round Robin */}
                <div
                  className={`rule-mode-card ${formData.assignmentMode === "round_robin" ? "active" : ""}`}
                  onClick={() => handleModeChange("round_robin")}
                >
                  <div className="rule-mode-card-header">
                    <div className="rule-mode-card-title-group">
                      <div className="rule-mode-icon-box round-robin">
                        <RepeatIcon width="16" height="16" />
                      </div>
                      <span className="rule-mode-card-title">Series Rotation</span>
                    </div>
                    <div className={`rule-radio-indicator ${formData.assignmentMode === "round_robin" ? "checked" : ""}`} />
                  </div>
                  <p className="rule-mode-card-desc">
                    Evenly distributes workload by cycling tickets 1-by-1 across all selected staff in series.
                  </p>
                </div>

                {/* Team Pool */}
                <div
                  className={`rule-mode-card ${formData.assignmentMode === "pool_accept" ? "active" : ""}`}
                  onClick={() => handleModeChange("pool_accept")}
                >
                  <div className="rule-mode-card-header">
                    <div className="rule-mode-card-title-group">
                      <div className="rule-mode-icon-box pool">
                        <UsersIcon width="16" height="16" />
                      </div>
                      <span className="rule-mode-card-title">Team Pool Queue</span>
                    </div>
                    <div className={`rule-radio-indicator ${formData.assignmentMode === "pool_accept" ? "checked" : ""}`} />
                  </div>
                  <p className="rule-mode-card-desc">
                    Holds tickets in an open pool queue; any selected team member can claim and accept tickets first.
                  </p>
                </div>
              </div>
            </div>

            {/* Field 3: Staff Selection Grid */}
            <div className="rule-form-section">
              <label className="rule-form-label">
                {formData.assignmentMode === "single" ? (
                  <>
                    Select 1 Dedicated Staff Member{" "}
                    <span
                      style={{
                        color: formData.assignedStaff.length === 1 ? "#16a34a" : "#dc2626",
                        fontWeight: "700"
                      }}
                    >
                      ({formData.assignedStaff.length}/1 selected)
                    </span>
                    <span className="rule-form-sublabel">
                      Click any card below to assign that single dedicated officer.
                    </span>
                  </>
                ) : formData.assignmentMode === "round_robin" ? (
                  <>
                    Select Staff Team for Rotation & Load Balancing{" "}
                    <span
                      style={{
                        color: formData.assignedStaff.length > 0 ? "#0f172a" : "#dc2626",
                        fontWeight: "700"
                      }}
                    >
                      ({formData.assignedStaff.length} selected)
                    </span>
                    <span className="rule-form-sublabel">
                      Tickets will rotate 1-by-1 sequentially across the chosen personnel.
                    </span>
                  </>
                ) : (
                  <>
                    Select Staff Members for Team Pool{" "}
                    <span
                      style={{
                        color: formData.assignedStaff.length > 0 ? "#0f172a" : "#dc2626",
                        fontWeight: "700"
                      }}
                    >
                      ({formData.assignedStaff.length} selected)
                    </span>
                    <span className="rule-form-sublabel">
                      All chosen personnel will see incoming tickets in their Pool Queue and can accept them on first-come basis.
                    </span>
                  </>
                )}
              </label>

              {combinedStaffList.length === 0 ? (
                <div className="rule-empty-staff">
                  <AlertCircleIcon width="18" height="18" />
                  <span>No staff available in department "{department}". Please add staff first.</span>
                </div>
              ) : (
                <div className="rule-staff-grid">
                  {combinedStaffList.map((staff) => {
                    const isSelected = !!formData.assignedStaff.find(
                      (s) =>
                        String(s.staffId) === String(staff.id) ||
                        String(s.staffId) === String(staff._id)
                    );
                    return (
                      <div
                        key={staff.id || staff._id}
                        onClick={() =>
                          handleStaffToggle(staff.id || staff._id, staff.fullName, staff.email)
                        }
                        className={`rule-staff-card ${isSelected ? "selected" : ""}`}
                      >
                        <div className="rule-staff-card-left">
                          <div className={`rule-staff-avatar ${isSelected ? "active" : ""}`}>
                            {staff.fullName ? staff.fullName.charAt(0).toUpperCase() : "U"}
                          </div>
                          <div>
                            <div className="rule-staff-name">{staff.fullName}</div>
                            <div className="rule-staff-id">
                              ID: {staff.id || staff._id}
                              {staff.isCurrentAssignmentOnly && " (Current)"}
                            </div>
                          </div>
                        </div>

                        {formData.assignmentMode === "single" ? (
                          <div className={`rule-radio-indicator ${isSelected ? "checked" : ""}`} />
                        ) : (
                          <div className={`rule-checkbox-indicator ${isSelected ? "checked" : ""}`}>
                            {isSelected ? "✓" : ""}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Form Action Buttons */}
            <div className="smart-form-actions">
              <button type="submit" className="smart-btn-obsidian">
                <SaveIcon width="15" height="15" />
                <span>{editingRule ? "Update Routing Rule" : "Save Routing Rule"}</span>
              </button>
              <button
                type="button"
                className="smart-btn-ghost"
                onClick={handleCancel}
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        {/* Content Body: Empty State or Desktop Table + Mobile Cards */}
        {routingRules.length === 0 ? (
          <div className="smart-empty-state">
            <RerouteIcon width="34" height="34" />
            <h4>No {targetAudience} routing rules configured</h4>
            <p>Define automated rules so incoming tickets are immediately dispatched to officers.</p>
            {!showAddForm && !editingRule && (
              <button
                onClick={() => {
                  setEditingRule(null);
                  setFormData({ issueTypeId: "", assignedStaff: [], assignmentMode: "single" });
                  setShowAddForm(true);
                }}
                className="smart-btn-obsidian"
                style={{ marginTop: "12px" }}
              >
                <PlusIcon width="14" height="14" />
                <span>Create First {targetAudience === "staff" ? "Staff" : "Student"} Rule</span>
              </button>
            )}
          </div>
        ) : (
          <>
            {/* 1. Desktop Executive Table */}
            <div className="smart-table-wrapper">
              <table className="smart-table">
                <thead>
                  <tr>
                    <th>Issue Type</th>
                    <th>Assignment Mode</th>
                    <th>Assigned Personnel</th>
                    <th style={{ textAlign: "right", paddingRight: "20px" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {routingRules.map((rule) => {
                    const isCurrentlyEditing = editingRule && editingRule._id === rule._id;
                    return (
                      <tr key={rule._id} className={isCurrentlyEditing ? "rule-row-editing" : ""}>
                        <td>
                          <div className="rule-issue-name-cell">
                            <span className="smart-issue-name">
                              {rule.issueTypeId?.issueName || "Unknown Issue"}
                            </span>
                            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                              <span className="rule-audience-tag">
                                {rule.targetAudience === "staff" ? "👔 Staff" : "🎓 Student"}
                              </span>
                              {isCurrentlyEditing && (
                                <span className="rule-editing-badge">Editing</span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td>{renderModeBadge(rule.assignmentMode)}</td>
                        <td>
                          <div className="rule-staff-chips-wrap">
                            {rule.assignedStaff && rule.assignedStaff.length > 0 ? (
                              rule.assignedStaff.map((staff, idx) => (
                                <span key={idx} className="rule-staff-chip">
                                  <UserIcon width="12" height="12" />
                                  <span>{staff.staffName}</span>
                                </span>
                              ))
                            ) : (
                              <span className="rule-staff-none">None assigned</span>
                            )}
                          </div>
                        </td>
                        <td style={{ textAlign: "right", paddingRight: "20px" }}>
                          <div className="smart-actions-group">
                            <button
                              onClick={() => handleStartEdit(rule)}
                              className={`smart-action-btn edit ${isCurrentlyEditing ? "active" : ""}`}
                              title="Edit Routing Rule"
                            >
                              <EditIcon width="15" height="15" />
                            </button>
                            <button
                              onClick={() => handleDelete(rule._id)}
                              className="smart-action-btn delete"
                              title="Delete Routing Rule"
                            >
                              <TrashIcon width="16" height="16" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* 2. Mobile Clean Cards View (< 768px) */}
            <div className="smart-mobile-cards">
              {routingRules.map((rule) => {
                const isCurrentlyEditing = editingRule && editingRule._id === rule._id;
                return (
                  <div
                    key={rule._id}
                    className={`smart-mobile-card ${isCurrentlyEditing ? "rule-card-editing" : ""}`}
                  >
                    <div className="smart-mobile-card-top">
                      <div>
                        <div className="smart-issue-name">
                          {rule.issueTypeId?.issueName || "Unknown Issue"}
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "4px" }}>
                          <span className="rule-audience-tag">
                            {rule.targetAudience === "staff" ? "👔 Staff Rule" : "🎓 Student Rule"}
                          </span>
                          {isCurrentlyEditing && (
                            <span className="rule-editing-badge">Editing</span>
                          )}
                        </div>
                      </div>
                      <div className="smart-actions-group">
                        <button
                          onClick={() => handleStartEdit(rule)}
                          className={`smart-action-btn edit ${isCurrentlyEditing ? "active" : ""}`}
                          title="Edit"
                        >
                          <EditIcon width="15" height="15" />
                        </button>
                        <button
                          onClick={() => handleDelete(rule._id)}
                          className="smart-action-btn delete"
                          title="Delete"
                        >
                          <TrashIcon width="16" height="16" />
                        </button>
                      </div>
                    </div>

                  <div style={{ marginTop: "4px" }}>{renderModeBadge(rule.assignmentMode)}</div>

                  <div className="rule-mobile-staff-section">
                    <div className="rule-mobile-staff-label">
                      Assigned Personnel ({rule.assignedStaff?.length || 0}):
                    </div>
                    <div className="rule-staff-chips-wrap">
                      {rule.assignedStaff && rule.assignedStaff.length > 0 ? (
                        rule.assignedStaff.map((staff, idx) => (
                          <span key={idx} className="rule-staff-chip">
                            <UserIcon width="12" height="12" />
                            <span>{staff.staffName}</span>
                          </span>
                        ))
                      ) : (
                        <span className="rule-staff-none">None assigned</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            </div>
          </>
        )}
      </div>

      {/* Scoped Executive Obsidian Theme CSS */}
      <style>{`
        .smart-mgmt-container {
          width: 100%;
          box-sizing: border-box;
        }

        .smart-mgmt-card {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 16px;
          box-shadow: 0 4px 20px -2px rgba(15, 23, 42, 0.05);
          padding: 24px;
          box-sizing: border-box;
        }

        .smart-mgmt-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 16px;
          margin-bottom: 24px;
          flex-wrap: wrap;
        }

        .smart-mgmt-title-group h2 {
          margin: 0;
          color: #0f172a;
          font-size: 1.28rem;
          font-weight: 700;
          letter-spacing: -0.01em;
        }

        .smart-mgmt-pill-badge {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          padding: 2px 8px;
          background: #f1f5f9;
          color: #475569;
          border: 1px solid #e2e8f0;
          border-radius: 6px;
          font-size: 0.72rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          margin-bottom: 6px;
        }

        .smart-dept-tag {
          color: #0f172a;
          background: #f1f5f9;
          padding: 2px 8px;
          border-radius: 6px;
          border: 1px solid #e2e8f0;
          font-size: 1.15rem;
        }

        .smart-mgmt-controls {
          display: flex;
          align-items: center;
          gap: 12px;
          flex-wrap: wrap;
        }

        /* Segmented Audience Switcher */
        .smart-segmented-switcher {
          display: inline-flex;
          align-items: center;
          background: #f1f5f9;
          padding: 3px;
          border-radius: 10px;
          border: 1px solid #e2e8f0;
          gap: 2px;
        }

        .smart-segmented-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 14px;
          border-radius: 7px;
          border: none;
          font-size: 0.84rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.15s ease;
          background: transparent;
          color: #64748b;
        }

        .smart-segmented-btn:hover {
          color: #0f172a;
        }

        .smart-segmented-btn.active {
          background: #0f172a;
          color: #ffffff;
          box-shadow: 0 2px 6px rgba(15, 23, 42, 0.2);
        }

        /* Obsidian Black Primary Button */
        .smart-btn-obsidian {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          background: #0f172a;
          color: #ffffff;
          border: 1px solid #0f172a;
          border-radius: 8px;
          padding: 8px 16px;
          font-size: 0.84rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.15s ease;
          box-shadow: 0 2px 6px rgba(15, 23, 42, 0.12);
          white-space: nowrap;
        }

        .smart-btn-obsidian:hover {
          background: #1e293b;
          border-color: #1e293b;
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(15, 23, 42, 0.2);
        }

        .smart-btn-ghost {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: #ffffff;
          color: #475569;
          border: 1px solid #cbd5e1;
          border-radius: 8px;
          padding: 8px 16px;
          font-size: 0.84rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .smart-btn-ghost:hover {
          background: #f8fafc;
          color: #0f172a;
          border-color: #94a3b8;
        }

        /* Form Card */
        .smart-form-card {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 14px;
          padding: 22px;
          margin-bottom: 24px;
          animation: slideDown 0.2s ease-out;
        }

        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .smart-form-header h3 {
          margin: 0;
          color: #0f172a;
          font-size: 1.08rem;
          font-weight: 700;
        }

        .smart-form-header p {
          margin: 4px 0 18px 0;
          color: #64748b;
          font-size: 0.82rem;
        }

        .rule-form-section {
          margin-bottom: 18px;
        }

        .rule-form-label {
          display: block;
          font-size: 0.84rem;
          font-weight: 700;
          color: #0f172a;
          margin-bottom: 6px;
        }

        .rule-form-sublabel {
          display: block;
          font-size: 0.76rem;
          color: #64748b;
          font-weight: 400;
          margin-top: 2px;
          margin-bottom: 8px;
        }

        .smart-input {
          width: 100%;
          padding: 9px 13px;
          border-radius: 8px;
          border: 1px solid #cbd5e1;
          font-size: 0.88rem;
          color: #0f172a;
          background: #ffffff;
          outline: none;
          box-sizing: border-box;
          transition: all 0.15s ease;
        }

        .smart-input:focus {
          border-color: #0f172a;
          box-shadow: 0 0 0 3px rgba(15, 23, 42, 0.08);
        }

        /* Assignment Mode Cards Grid */
        .rule-mode-selector-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 12px;
        }

        .rule-mode-card {
          background: #ffffff;
          border: 1.5px solid #e2e8f0;
          border-radius: 12px;
          padding: 14px;
          cursor: pointer;
          transition: all 0.15s ease;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .rule-mode-card:hover {
          border-color: #94a3b8;
          transform: translateY(-1px);
        }

        .rule-mode-card.active {
          border-color: #0f172a;
          background: #f8fafc;
          box-shadow: 0 4px 12px rgba(15, 23, 42, 0.06);
        }

        .rule-mode-card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .rule-mode-card-title-group {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .rule-mode-icon-box {
          width: 28px;
          height: 28px;
          border-radius: 7px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .rule-mode-icon-box.single {
          background: #eff6ff;
          color: #2563eb;
        }

        .rule-mode-icon-box.round-robin {
          background: #ecfdf5;
          color: #059669;
        }

        .rule-mode-icon-box.pool {
          background: #faf5ff;
          color: #9333ea;
        }

        .rule-mode-card-title {
          font-size: 0.88rem;
          font-weight: 700;
          color: #0f172a;
        }

        .rule-mode-card-desc {
          margin: 0;
          font-size: 0.77rem;
          color: #64748b;
          line-height: 1.35;
        }

        /* Radio & Checkbox Indicators */
        .rule-radio-indicator {
          width: 18px;
          height: 18px;
          border-radius: 50%;
          border: 2px solid #cbd5e1;
          background: #ffffff;
          flex-shrink: 0;
          transition: all 0.15s ease;
          box-sizing: border-box;
        }

        .rule-radio-indicator.checked {
          border-color: #0f172a;
          border-width: 5px;
        }

        .rule-checkbox-indicator {
          width: 18px;
          height: 18px;
          border-radius: 5px;
          border: 2px solid #cbd5e1;
          background: #ffffff;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #ffffff;
          font-size: 11px;
          font-weight: bold;
          flex-shrink: 0;
          transition: all 0.15s ease;
          box-sizing: border-box;
        }

        .rule-checkbox-indicator.checked {
          background: #0f172a;
          border-color: #0f172a;
        }

        /* Staff Grid */
        .rule-staff-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(210px, 1fr));
          gap: 10px;
        }

        .rule-staff-card {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 10px;
          padding: 10px 14px;
          cursor: pointer;
          transition: all 0.15s ease;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
        }

        .rule-staff-card:hover {
          border-color: #cbd5e1;
          background: #fafafa;
        }

        .rule-staff-card.selected {
          border-color: #0f172a;
          background: #f8fafc;
          box-shadow: 0 2px 8px rgba(15, 23, 42, 0.05);
        }

        .rule-staff-card-left {
          display: flex;
          align-items: center;
          gap: 10px;
          min-width: 0;
        }

        .rule-staff-avatar {
          width: 30px;
          height: 30px;
          border-radius: 50%;
          background: #e2e8f0;
          color: #475569;
          font-size: 0.8rem;
          font-weight: 700;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          transition: all 0.15s ease;
        }

        .rule-staff-avatar.active {
          background: #0f172a;
          color: #ffffff;
        }

        .rule-staff-name {
          font-size: 0.84rem;
          font-weight: 600;
          color: #0f172a;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .rule-staff-id {
          font-size: 0.74rem;
          color: #64748b;
        }

        .rule-empty-staff {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 12px 16px;
          background: #fffbeb;
          border: 1px solid #fef3c7;
          border-radius: 8px;
          color: #b45309;
          font-size: 0.82rem;
        }

        .smart-form-actions {
          display: flex;
          gap: 10px;
          margin-top: 20px;
        }

        /* Desktop Table */
        .smart-table-wrapper {
          overflow-x: auto;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          background: #ffffff;
        }

        .smart-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 0.86rem;
          text-align: left;
        }

        .smart-table thead tr {
          background: #f8fafc;
          border-bottom: 1px solid #e2e8f0;
        }

        .smart-table th {
          padding: 12px 16px;
          font-size: 0.72rem;
          font-weight: 700;
          color: #475569;
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }

        .smart-table tbody tr {
          border-bottom: 1px solid #f1f5f9;
          transition: background 0.1s ease;
        }

        .smart-table tbody tr:last-child {
          border-bottom: none;
        }

        .smart-table tbody tr:hover {
          background: #f8fafc;
        }

        .smart-table td {
          padding: 13px 16px;
          vertical-align: middle;
        }

        .rule-issue-name-cell {
          display: flex;
          flex-direction: column;
          gap: 3px;
        }

        .smart-issue-name {
          font-weight: 600;
          color: #0f172a;
        }

        .rule-audience-tag {
          display: inline-block;
          font-size: 0.74rem;
          color: #64748b;
          font-weight: 500;
        }

        /* Mode Badges */
        .rule-mode-badge {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          padding: 3px 9px;
          border-radius: 12px;
          font-size: 0.74rem;
          font-weight: 700;
          white-space: nowrap;
        }

        .rule-mode-badge.single {
          background: #eff6ff;
          color: #1d4ed8;
          border: 1px solid #bfdbfe;
        }

        .rule-mode-badge.round-robin {
          background: #ecfdf5;
          color: #047857;
          border: 1px solid #a7f3d0;
        }

        .rule-mode-badge.pool {
          background: #faf5ff;
          color: #6b21a8;
          border: 1px solid #e9d5ff;
        }

        .rule-mode-badge.default {
          background: #f1f5f9;
          color: #334155;
          border: 1px solid #e2e8f0;
        }

        /* Staff Chips */
        .rule-staff-chips-wrap {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          max-width: 440px;
        }

        .rule-staff-chip {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 3px 8px;
          background: #f1f5f9;
          border: 1px solid #e2e8f0;
          border-radius: 6px;
          font-size: 0.75rem;
          color: #334155;
          font-weight: 500;
          white-space: nowrap;
        }

        .rule-staff-chip svg {
          color: #64748b;
        }

        .rule-staff-none {
          font-size: 0.78rem;
          color: #94a3b8;
          font-style: italic;
        }

        /* Actions */
        .smart-actions-group {
          display: inline-flex;
          align-items: center;
          gap: 6px;
        }

        .smart-action-btn {
          width: 32px;
          height: 32px;
          border-radius: 7px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          background: #ffffff;
          border: 1px solid #e2e8f0;
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .smart-action-btn.edit {
          color: #2563eb;
        }
        .smart-action-btn.edit:hover {
          background: #eff6ff;
          border-color: #93c5fd;
        }
        .smart-action-btn.edit.active {
          background: #dbeafe;
          border-color: #3b82f6;
          color: #1d4ed8;
        }

        .smart-action-btn.delete {
          color: #dc2626;
        }
        .smart-action-btn.delete:hover {
          background: #fef2f2;
          border-color: #fca5a5;
        }

        .smart-editing-pill {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          padding: 4px 10px;
          background: #eff6ff;
          color: #1d4ed8;
          border: 1px solid #bfdbfe;
          border-radius: 9999px;
          font-size: 0.74rem;
          font-weight: 700;
          letter-spacing: 0.02em;
          text-transform: uppercase;
        }

        .rule-editing-badge {
          display: inline-flex;
          align-items: center;
          padding: 1px 6px;
          background: #eff6ff;
          color: #1d4ed8;
          border: 1px solid #bfdbfe;
          border-radius: 4px;
          font-size: 0.68rem;
          font-weight: 700;
        }

        .rule-row-editing {
          background-color: #f0f7ff !important;
        }

        .smart-mobile-card.rule-card-editing {
          border-color: #93c5fd;
          background: #f8fbff;
          box-shadow: 0 0 0 1px #3b82f6;
        }

        /* Empty State */
        .smart-empty-state {
          text-align: center;
          padding: 48px 24px;
          color: #64748b;
        }
        .smart-empty-state svg {
          color: #94a3b8;
          margin-bottom: 10px;
        }
        .smart-empty-state h4 {
          margin: 0;
          color: #1e293b;
          font-size: 1.05rem;
        }
        .smart-empty-state p {
          margin: 6px 0 0 0;
          font-size: 0.85rem;
        }

        /* Mobile Layout */
        .smart-mobile-cards {
          display: none;
        }

        @media (max-width: 768px) {
          .smart-mgmt-card {
            padding: 16px;
            border-radius: 12px;
          }

          .smart-mgmt-header {
            flex-direction: column;
            align-items: stretch;
            gap: 12px;
          }

          .smart-mgmt-controls {
            flex-direction: column;
            align-items: stretch;
            gap: 10px;
          }

          .smart-segmented-switcher {
            width: 100%;
            display: flex;
          }

          .smart-segmented-btn {
            flex: 1;
            justify-content: center;
          }

          .smart-btn-obsidian {
            width: 100%;
            justify-content: center;
          }

          .rule-mode-selector-grid {
            grid-template-columns: 1fr;
            gap: 10px;
          }

          .rule-staff-grid {
            grid-template-columns: 1fr;
          }

          /* Hide Desktop Table, Show Native Mobile Cards */
          .smart-table-wrapper {
            display: none;
          }

          .smart-mobile-cards {
            display: flex;
            flex-direction: column;
            gap: 10px;
          }

          .smart-mobile-card {
            background: #ffffff;
            border: 1px solid #e2e8f0;
            border-radius: 12px;
            padding: 14px;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.02);
            display: flex;
            flex-direction: column;
            gap: 10px;
          }

          .smart-mobile-card-top {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            gap: 8px;
          }

          .rule-mobile-staff-section {
            border-top: 1px solid #f1f5f9;
            padding-top: 10px;
            margin-top: 2px;
            display: flex;
            flex-direction: column;
            gap: 6px;
          }

          .rule-mobile-staff-label {
            font-size: 0.76rem;
            font-weight: 700;
            color: #475569;
            text-transform: uppercase;
            letter-spacing: 0.03em;
          }
        }
      `}</style>
    </div>
  );
}

export default RoutingRuleConfig;
