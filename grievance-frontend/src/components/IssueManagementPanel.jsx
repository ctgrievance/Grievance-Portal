import React, { useState, useEffect } from "react";
import {
  PlusIcon,
  TrashIcon,
  EditIcon,
  CheckCircleIcon,
  AlertCircleIcon,
  ShieldIcon,
  GraduationCapIcon,
  UsersIcon,
  ClipboardIcon
} from "./Icons";

function IssueManagementPanel({ department }) {
  const [issues, setIssues] = useState([]);
  const [routingRules, setRoutingRules] = useState([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingIssue, setEditingIssue] = useState(null);
  const [targetAudience, setTargetAudience] = useState("student"); // "student" | "staff"
  const [formData, setFormData] = useState({
    issueName: "",
    description: ""
  });
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("");

  useEffect(() => {
    if (department) {
      fetchIssues();
      fetchRoutingRules();
    }
  }, [department, targetAudience]);

  const fetchRoutingRules = async () => {
    try {
      const res = await fetch(`${process.env.REACT_APP_API_URL || "http://localhost:5000"}/api/routing-rules/department/${encodeURIComponent(department)}?targetAudience=${targetAudience}`);
      if (res.ok) {
        const data = await res.json();
        setRoutingRules(data);
      }
    } catch (err) {
      console.error("Error fetching routing rules in IssueManagementPanel:", err);
    }
  };

  const fetchIssues = async () => {
    try {
      const res = await fetch(`${process.env.REACT_APP_API_URL || "http://localhost:5000"}/api/issue-types/department/${encodeURIComponent(department)}?targetAudience=${targetAudience}`);
      if (!res.ok) {
        const errorText = await res.text();
        console.error("Fetch error response:", errorText);
        setMessage(`Failed to load issue types: ${res.status}`);
        setMessageType("error");
        return;
      }
      const data = await res.json();
      setIssues(data);
    } catch (error) {
      console.error("Error fetching issues:", error);
      setMessage("Failed to load issue types");
      setMessageType("error");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${process.env.REACT_APP_API_URL || "http://localhost:5000"}/api/issue-types`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          department,
          issueName: formData.issueName,
          description: formData.description,
          targetAudience: targetAudience
        })
      });

      if (res.ok) {
        setMessage("Issue type created successfully!");
        setMessageType("success");
        setFormData({ issueName: "", description: "" });
        setShowAddForm(false);
        fetchIssues();
        setTimeout(() => setMessage(""), 3000);
      } else {
        const error = await res.json();
        setMessage(error.message || "Failed to create issue type");
        setMessageType("error");
      }
    } catch (error) {
      console.error("Error creating issue:", error);
      setMessage("Failed to create issue type");
      setMessageType("error");
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!editingIssue) return;

    const trimmedName = (formData.issueName || "").trim();
    if (!trimmedName) {
      setMessage("Issue Name cannot be empty");
      setMessageType("error");
      return;
    }

    try {
      const res = await fetch(`${process.env.REACT_APP_API_URL || "http://localhost:5000"}/api/issue-types/${editingIssue._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          issueName: trimmedName,
          description: formData.description,
          isActive: editingIssue.isActive
        })
      });

      if (res.ok) {
        setMessage("Issue type updated successfully!");
        setMessageType("success");
        setEditingIssue(null);
        setFormData({ issueName: "", description: "" });
        fetchIssues();
        setTimeout(() => setMessage(""), 3000);
      } else {
        const errorData = await res.json().catch(() => ({}));
        setMessage(errorData.message || "Failed to update issue type");
        setMessageType("error");
      }
    } catch (error) {
      console.error("Error updating issue:", error);
      setMessage("Failed to update issue type");
      setMessageType("error");
    }
  };

  const handleDelete = async (issueId) => {
    if (!window.confirm("Are you sure you want to delete this issue type?")) return;

    try {
      const res = await fetch(`${process.env.REACT_APP_API_URL || "http://localhost:5000"}/api/issue-types/${issueId}`, {
        method: "DELETE"
      });

      if (res.ok) {
        setMessage("Issue type deleted successfully!");
        setMessageType("success");
        fetchIssues();
        setTimeout(() => setMessage(""), 3000);
      } else {
        setMessage("Failed to delete issue type");
        setMessageType("error");
      }
    } catch (error) {
      console.error("Error deleting issue:", error);
      setMessage("Failed to delete issue type");
      setMessageType("error");
    }
  };

  const handleToggleActive = async (issue) => {
    try {
      const res = await fetch(`${process.env.REACT_APP_API_URL || "http://localhost:5000"}/api/issue-types/${issue._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: issue.description,
          isActive: !issue.isActive
        })
      });

      if (res.ok) {
        fetchIssues();
      }
    } catch (error) {
      console.error("Error toggling issue:", error);
    }
  };

  const startEdit = (issue) => {
    setEditingIssue(issue);
    setFormData({
      issueName: issue.issueName,
      description: issue.description
    });
    setShowAddForm(false);
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
              <ClipboardIcon width="13" height="13" />
              <span>Smart Assignment</span>
            </div>
            <h2>
              Issue Types for <span className="smart-dept-tag">{department}</span>
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

            {!showAddForm && !editingIssue && (
              <button
                onClick={() => setShowAddForm(true)}
                className="smart-btn-obsidian"
              >
                <PlusIcon width="15" height="15" />
                <span>Add {targetAudience === "staff" ? "Staff" : "Student"} Issue</span>
              </button>
            )}
          </div>
        </div>

        {/* Add / Edit Form Card */}
        {(showAddForm || editingIssue) && (
          <form
            onSubmit={editingIssue ? handleUpdate : handleSubmit}
            className="smart-form-card"
          >
            <div className="smart-form-header">
              <h3>{editingIssue ? "Edit Issue Type" : `Create ${targetAudience === "staff" ? "Staff" : "Student"} Issue Type`}</h3>
              <p>Configure grievance issue category for automated or manual department routing.</p>
            </div>
            <div className="smart-form-grid">
              <div className="smart-form-field">
                <label>
                  Issue Name *
                  {(editingIssue?.isSystemReserved || editingIssue?.issueName === "Others") && (
                    <span className="smart-field-warn">
                      (System reserved name cannot be modified)
                    </span>
                  )}
                </label>
                <input
                  type="text"
                  value={formData.issueName}
                  onChange={(e) => setFormData({ ...formData, issueName: e.target.value })}
                  disabled={Boolean(editingIssue?.isSystemReserved || editingIssue?.issueName === "Others")}
                  placeholder="e.g., Leave Application, Fee Dispute, Course Change..."
                  className="smart-input"
                  required
                />
              </div>
              <div className="smart-form-field">
                <label>Description (Optional)</label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Brief explanation of this issue category..."
                  className="smart-input"
                />
              </div>
            </div>
            <div className="smart-form-actions">
              <button type="submit" className="smart-btn-obsidian">
                {editingIssue ? "Update Issue Type" : "Create Issue Type"}
              </button>
              <button
                type="button"
                className="smart-btn-ghost"
                onClick={() => {
                  setShowAddForm(false);
                  setEditingIssue(null);
                  setFormData({ issueName: "", description: "" });
                }}
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        {/* Content Body */}
        {issues.length === 0 ? (
          <div className="smart-empty-state">
            <ClipboardIcon width="34" height="34" />
            <h4>No {targetAudience} issue types configured</h4>
            <p>Define categories so incoming grievances can be filed and routed seamlessly.</p>
            {!showAddForm && (
              <button onClick={() => setShowAddForm(true)} className="smart-btn-obsidian" style={{ marginTop: "12px" }}>
                <PlusIcon width="14" height="14" /> Add First {targetAudience === "staff" ? "Staff" : "Student"} Issue
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
                    <th>Issue Name</th>
                    <th>Description</th>
                    <th>Status</th>
                    <th>Routing Rule</th>
                    <th style={{ textAlign: "right", paddingRight: "20px" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {issues.map((issue) => {
                    const hasRoute = routingRules.some(r => r.isActive && (r.issueTypeId?._id === issue._id || r.issueTypeId === issue._id));
                    const isProtected = issue.isSystemReserved || issue.issueName === "Others";

                    return (
                      <tr key={issue._id}>
                        <td>
                          <div className="smart-issue-name-cell">
                            <span className="smart-issue-name">{issue.issueName}</span>
                            {isProtected && (
                              <span className="smart-badge-protected">
                                <ShieldIcon width="10" height="10" />
                                Protected
                              </span>
                            )}
                          </div>
                        </td>
                        <td>
                          <span className="smart-desc-text" title={issue.description}>
                            {issue.description || "—"}
                          </span>
                        </td>
                        <td>
                          <button
                            type="button"
                            onClick={() => handleToggleActive(issue)}
                            className={`smart-badge-status ${issue.isActive ? "active" : "inactive"}`}
                            title="Click to toggle status"
                          >
                            <span className="smart-status-dot" />
                            {issue.isActive ? "Active" : "Inactive"}
                          </button>
                        </td>
                        <td>
                          {hasRoute ? (
                            <span className="smart-badge-routing configured">
                              <CheckCircleIcon width="12" height="12" />
                              <span>Configured</span>
                            </span>
                          ) : (
                            <span className="smart-badge-routing manual">
                              <AlertCircleIcon width="12" height="12" />
                              <span>Manual Only</span>
                            </span>
                          )}
                        </td>
                        <td style={{ textAlign: "right", paddingRight: "20px" }}>
                          <div className="smart-actions-group">
                            <button
                              onClick={() => startEdit(issue)}
                              className="smart-action-btn edit"
                              title="Edit Issue"
                            >
                              <EditIcon width="16" height="16" />
                            </button>
                            {!isProtected && (
                              <button
                                onClick={() => handleDelete(issue._id)}
                                className="smart-action-btn delete"
                                title="Delete Issue"
                              >
                                <TrashIcon width="16" height="16" />
                              </button>
                            )}
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
              {issues.map((issue) => {
                const hasRoute = routingRules.some(r => r.isActive && (r.issueTypeId?._id === issue._id || r.issueTypeId === issue._id));
                const isProtected = issue.isSystemReserved || issue.issueName === "Others";

                return (
                  <div key={issue._id} className="smart-mobile-card">
                    <div className="smart-mobile-card-top">
                      <div className="smart-issue-name-cell">
                        <span className="smart-issue-name">{issue.issueName}</span>
                        {isProtected && (
                          <span className="smart-badge-protected">
                            <ShieldIcon width="9" height="9" />
                            Protected
                          </span>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => handleToggleActive(issue)}
                        className={`smart-badge-status ${issue.isActive ? "active" : "inactive"}`}
                      >
                        <span className="smart-status-dot" />
                        {issue.isActive ? "Active" : "Inactive"}
                      </button>
                    </div>

                    {issue.description && (
                      <p className="smart-mobile-card-desc">{issue.description}</p>
                    )}

                    <div className="smart-mobile-card-bottom">
                      <div>
                        {hasRoute ? (
                          <span className="smart-badge-routing configured">
                            <CheckCircleIcon width="12" height="12" />
                            <span>Configured</span>
                          </span>
                        ) : (
                          <span className="smart-badge-routing manual">
                            <AlertCircleIcon width="12" height="12" />
                            <span>Manual Only</span>
                          </span>
                        )}
                      </div>

                      <div className="smart-actions-group">
                        <button
                          onClick={() => startEdit(issue)}
                          className="smart-action-btn edit"
                          title="Edit"
                        >
                          <EditIcon width="16" height="16" />
                        </button>
                        {!isProtected && (
                          <button
                            onClick={() => handleDelete(issue._id)}
                            className="smart-action-btn delete"
                            title="Delete"
                          >
                            <TrashIcon width="16" height="16" />
                          </button>
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

      {/* Scoped Executive CSS */}
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
          padding: 20px;
          margin-bottom: 24px;
          animation: slideDown 0.2s ease-out;
        }

        .smart-form-header h3 {
          margin: 0;
          color: #0f172a;
          font-size: 1.05rem;
          font-weight: 700;
        }

        .smart-form-header p {
          margin: 4px 0 16px 0;
          color: #64748b;
          font-size: 0.82rem;
        }

        .smart-form-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
        }

        .smart-form-field label {
          display: block;
          margin-bottom: 6px;
          font-size: 0.82rem;
          font-weight: 600;
          color: #334155;
        }

        .smart-field-warn {
          color: #e11d48;
          font-size: 0.75rem;
          font-weight: 500;
          margin-left: 6px;
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

        .smart-form-actions {
          display: flex;
          gap: 10px;
          margin-top: 18px;
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

        .smart-issue-name-cell {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
        }

        .smart-issue-name {
          font-weight: 600;
          color: #0f172a;
        }

        .smart-badge-protected {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 2px 7px;
          background: #f3e8ff;
          color: #7e22ce;
          border: 1px solid #d8b4fe;
          border-radius: 12px;
          font-size: 0.68rem;
          font-weight: 700;
          text-transform: uppercase;
        }

        .smart-desc-text {
          color: #64748b;
          max-width: 280px;
          display: inline-block;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        /* Status Badges */
        .smart-badge-status {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          padding: 3px 9px;
          border-radius: 12px;
          font-size: 0.74rem;
          font-weight: 700;
          border: none;
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .smart-badge-status.active {
          background: #dcfce7;
          color: #166534;
          border: 1px solid #86efac;
        }

        .smart-badge-status.inactive {
          background: #fee2e2;
          color: #991b1b;
          border: 1px solid #fca5a5;
        }

        .smart-status-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: currentColor;
        }

        /* Routing Badges */
        .smart-badge-routing {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          padding: 4px 10px;
          border-radius: 12px;
          font-size: 0.74rem;
          font-weight: 700;
        }

        .smart-badge-routing.configured {
          background: #dcfce7;
          color: #15803d;
          border: 1px solid #86efac;
        }

        .smart-badge-routing.manual {
          background: #fef3c7;
          color: #b45309;
          border: 1px solid #fde68a;
        }

        /* Action Buttons */
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

        .smart-action-btn.delete {
          color: #dc2626;
        }
        .smart-action-btn.delete:hover {
          background: #fef2f2;
          border-color: #fca5a5;
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

        /* Responsive Breakpoints */
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

          .smart-form-grid {
            grid-template-columns: 1fr;
            gap: 12px;
          }

          /* Hide Desktop Table, Show Mobile Cards */
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
            box-shadow: 0 1px 3px rgba(0,0,0,0.02);
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

          .smart-mobile-card-desc {
            margin: 0;
            font-size: 0.82rem;
            color: #64748b;
            line-height: 1.4;
          }

          .smart-mobile-card-bottom {
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-top: 1px solid #f1f5f9;
            padding-top: 10px;
            margin-top: 2px;
          }
        }
      `}</style>
    </div>
  );
}

export default IssueManagementPanel;

