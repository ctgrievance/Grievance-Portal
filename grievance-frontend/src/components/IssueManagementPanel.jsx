import React, { useState, useEffect } from "react";
import { PlusIcon, TrashIcon, EditIcon, CheckCircleIcon, RefreshIcon } from "./Icons";

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
      console.log("Fetched issues:", data);
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

    try {
      const res = await fetch(`${process.env.REACT_APP_API_URL || "http://localhost:5000"}/api/issue-types/${editingIssue._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
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
        setMessage("Failed to update issue type");
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
    <div className="dashboard-content" style={{ padding: 0 }}>
      <div className="card" style={{ padding: "20px" }}>
        {message && (
          <div className={`alert-box ${messageType}`} style={{ marginBottom: "20px" }}>
            {message}
          </div>
        )}

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", flexWrap: "wrap", gap: "15px" }}>
          <h2 style={{ margin: 0, color: "#1e293b", fontSize: "1.2rem", fontWeight: "700" }}>
            Issue Types for {department}
          </h2>

          <div style={{ display: "flex", gap: "15px", alignItems: "center", flexWrap: "wrap" }}>
            <div className="admin-filter-bar" style={{ padding: "4px", margin: 0, width: "auto" }}>
              <button
                type="button"
                onClick={() => setTargetAudience("student")}
                style={{ 
                  padding: "6px 14px", 
                  borderRadius: "20px", 
                  background: targetAudience === "student" ? "#2563eb" : "transparent", 
                  color: targetAudience === "student" ? "#fff" : "#475569",
                  border: "none",
                  fontWeight: "600",
                  fontSize: "0.85rem",
                  cursor: "pointer",
                  transition: "all 0.2s"
                }}
              >
                Student
              </button>
              <button
                type="button"
                onClick={() => setTargetAudience("staff")}
                style={{ 
                  padding: "6px 14px", 
                  borderRadius: "20px", 
                  background: targetAudience === "staff" ? "#2563eb" : "transparent", 
                  color: targetAudience === "staff" ? "#fff" : "#475569",
                  border: "none",
                  fontWeight: "600",
                  fontSize: "0.85rem",
                  cursor: "pointer",
                  transition: "all 0.2s"
                }}
              >
                Staff
              </button>
            </div>

            {!showAddForm && !editingIssue && (
              <button
                onClick={() => setShowAddForm(true)}
                className="admin-btn-primary"
                style={{ display: "flex", alignItems: "center", gap: "8px" }}
              >
                <PlusIcon width="16" height="16" /> Add {targetAudience === "staff" ? "Staff" : "Student"} Issue
              </button>
            )}
          </div>
        </div>

        {(showAddForm || editingIssue) && (
          <form
            onSubmit={editingIssue ? handleUpdate : handleSubmit}
            style={{
              background: "#f8fafc",
              padding: "20px",
              borderRadius: "12px",
              marginBottom: "20px",
              border: "1px solid #e2e8f0"
            }}
          >
            <h3 style={{ margin: "0 0 15px 0", color: "#334155", fontSize: "1.1rem" }}>
              {editingIssue ? "Edit Issue Type" : "Create New Issue Type"}
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
              <div>
                <label style={{ display: "block", marginBottom: "5px", fontSize: "0.85rem", fontWeight: "600", color: "#475569" }}>Issue Name</label>
                <input
                  type="text"
                  value={formData.issueName}
                  onChange={(e) => setFormData({ ...formData, issueName: e.target.value })}
                  disabled={!!editingIssue}
                  placeholder="e.g., Grade Dispute"
                  style={{ width: "100%", padding: "10px 14px", borderRadius: "20px", border: "1px solid #cbd5e1", fontSize: "0.9rem" }}
                  required
                />
              </div>
              <div>
                <label style={{ display: "block", marginBottom: "5px", fontSize: "0.85rem", fontWeight: "600", color: "#475569" }}>Description</label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Brief description..."
                  style={{ width: "100%", padding: "10px 14px", borderRadius: "20px", border: "1px solid #cbd5e1", fontSize: "0.9rem" }}
                />
              </div>
            </div>
            <div style={{ display: "flex", gap: "10px", marginTop: "15px" }}>
              <button type="submit" className="admin-btn-primary">{editingIssue ? "Update" : "Create"}</button>
              <button type="button" className="admin-btn-secondary" onClick={() => { setShowAddForm(false); setEditingIssue(null); setFormData({ issueName: "", description: "" }); }}>Cancel</button>
            </div>
          </form>
        )}

        {issues.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px", color: "#64748b" }}>
            No {targetAudience} issue types defined yet.
          </div>
        ) : (
          <div className="table-container">
            <table className="grievance-table">
              <thead>
                <tr>
                  <th>Issue Name</th>
                  <th>Description</th>
                  <th>Status</th>
                  <th>Routing Rule</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {issues.map((issue) => {
                  const hasRoute = routingRules.some(r => r.isActive && (r.issueTypeId?._id === issue._id || r.issueTypeId === issue._id));
                  const isProtected = issue.isSystemReserved || issue.issueName === "Others";

                  return (
                    <tr key={issue._id}>
                      <td style={{ fontWeight: "600", color: "#1e293b" }}>
                        {issue.issueName}
                        {isProtected && <span style={{ marginLeft: "8px", fontSize: "0.7rem", background: "#f3e8ff", color: "#7e22ce", padding: "3px 8px", borderRadius: "12px", fontWeight: "600" }}>Protected</span>}
                      </td>
                      <td style={{ color: "#64748b", maxWidth: "250px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {issue.description || "-"}
                      </td>
                      <td>
                        <span className={`status-badge status-${issue.isActive ? "resolved" : "pending"}`}>
                          {issue.isActive ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td>
                        {hasRoute ? (
                          <span style={{ color: "#16a34a", fontSize: "0.85rem", fontWeight: "600", display: "flex", alignItems: "center", gap: "4px" }}>
                            <CheckCircleIcon width="14" height="14" /> Configured
                          </span>
                        ) : (
                          <span style={{ color: "#d97706", fontSize: "0.85rem", fontWeight: "600", display: "flex", alignItems: "center", gap: "4px" }}>
                            ⚠️ Manual Only
                          </span>
                        )}
                      </td>
                      <td>
                        <div style={{ display: "flex", gap: "10px" }}>
                          <button onClick={() => startEdit(issue)} style={{ background: "transparent", border: "none", cursor: "pointer", color: "#2563eb" }} title="Edit">
                            <EditIcon width="18" height="18" />
                          </button>
                          {!isProtected && (
                            <button onClick={() => handleToggleActive(issue)} style={{ background: "transparent", border: "none", cursor: "pointer", color: issue.isActive ? "#16a34a" : "#64748b" }} title={issue.isActive ? "Deactivate" : "Activate"}>
                              <RefreshIcon width="18" height="18" />
                            </button>
                          )}
                          {!isProtected && (
                            <button onClick={() => handleDelete(issue._id)} style={{ background: "transparent", border: "none", cursor: "pointer", color: "#ef4444" }} title="Delete">
                              <TrashIcon width="18" height="18" />
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
        )}
      </div>
    </div>
  );
}

export default IssueManagementPanel;
