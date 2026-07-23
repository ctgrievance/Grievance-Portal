import React, { useEffect, useState, useCallback } from "react";
import { ShieldIcon, LockIcon, AlertCircleIcon, AdminIcon, CheckCircleIcon, XIcon, UserIcon } from "./Icons";

function StaffRoleManager() {
  const [staffList, setStaffList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterRole, setFilterRole] = useState("all"); // all | admins | team | general
  const [sortMode, setSortMode] = useState("admins-first"); // admins-first | alpha

  // Current logged-in user details
  const requesterId = localStorage.getItem("grievance_id");
  const myDept = localStorage.getItem("admin_department"); // e.g. "Student Welfare"
  const isMasterAdmin = localStorage.getItem("is_master_admin") === "true"; // ✅ Dynamic Master Check
  const token = localStorage.getItem("grievance_token");

  // 🔥 Toggle for Danger Zone
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [processingId, setProcessingId] = useState(null); // Tracks which staff ID is being updated




  // ... (omitting middle part which is handled by other tool call or unchanged) ...

  const fetchStaffList = useCallback(async () => {
    try {
      const res = await fetch(`${process.env.REACT_APP_API_URL || "http://localhost:5000"}/api/admin-staff/all`, {
        headers: { "Authorization": `Bearer ${localStorage.getItem("grievance_token")}` }
      });
      if (res.ok) {
        const data = await res.json();
        setStaffList(data);
      }
    } catch (err) {
      console.error("Failed to fetch staff list");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchStaffList();
  }, [fetchStaffList]);

  const handleRoleChange = async (targetStaffId, action, department) => {
    setMsg("Processing...");

    // Validations
    if (action === "promote" && !department) {
      alert("Please select a department first.");
      setMsg("");
      return;
    }

    // 🔥 NEW: Confirmation for promotion
    if (action === "promote") {
      const confirmed = window.confirm(
        `Assign this person as Admin for ${department}?\n\nNote: If another admin exists for this department, they will be automatically removed.`
      );
      if (!confirmed) {
        setMsg("");
        return;
      }
    }

    setProcessingId(targetStaffId); // ⏳ START LOADING

    try {
      const res = await fetch(`${process.env.REACT_APP_API_URL || "http://localhost:5000"}/api/admin-staff/role`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("grievance_token")}`
        },
        body: JSON.stringify({
          targetStaffId,
          action,      // "promote" or "demote"
          department,  // Selected department
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setMsg(`Success: ${data.message}`);
        fetchStaffList(); // Refresh list to show new roles
      } else {
        setMsg(`Error: ${data.message}`);
      }
    } catch (err) {
      setMsg("❌ Network Error");
    } finally {
      setProcessingId(null); // ✅ STOP LOADING
    }
  };

  const handleTransferOwnership = async (newMasterId) => {
    if (!window.confirm(`⚠️ DANGER: Are you sure you want to transfer MASTER ADMIN rights to ${newMasterId}? You will lose your Master Admin access.`)) return;

    try {
      const res = await fetch(`${process.env.REACT_APP_API_URL || "http://localhost:5000"}/api/admin/transfer-ownership`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("grievance_token")}`
        },
        body: JSON.stringify({ newMasterId })
      });
      const data = await res.json();
      if (res.ok) {
        alert("Ownership Transferred! Please login again.");
        localStorage.clear();
        window.location.href = "/";
      } else {
        alert("Error: " + data.message);
      }
    } catch (err) {
      alert("Server Error");
    }
  };

  // Helper to check if current user can edit target user
  const canEdit = (staff) => {
    if (isMasterAdmin) return true; // Master can edit anyone

    // Dept Admin can only edit:
    // 1. General Staff (Unassigned)
    // 2. Staff assigned to THEIR own department (Team Members)
    // Dept Admin CANNOT edit other Admins or staff from other depts
    if (!staff.adminDepartment) return true;
    if (staff.adminDepartment === myDept && !staff.isDeptAdmin) return true;

    return false;
  };

  return (
    <div className="card" style={{ marginTop: "20px" }}>
      <h2>Manage Staff Roles</h2>
      <p style={{ color: "#64748b", marginBottom: "15px" }}>
        {isMasterAdmin
          ? "Master Privileges: You can appoint Admins for ANY department."
          : `Department Admin: You can add team members to ${myDept}.`}
      </p>

      {msg && <div className="alert-box info" style={{ marginBottom: "15px" }}>{msg}</div>}

      {/* Controls: Search + Filter + Sort */}
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 12 }}>
        <input
          placeholder="Search by name or ID..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{ padding: '8px 10px', flex: 1 }}
        />

        <select value={filterRole} onChange={(e) => setFilterRole(e.target.value)} style={{ padding: '8px' }}>
          <option value="all">All</option>
          <option value="admins">Admins (Dept Admin)</option>
          <option value="team">Admin Staff (Team Members)</option>
          <option value="general">General Staff</option>
        </select>

        <select value={sortMode} onChange={(e) => setSortMode(e.target.value)} style={{ padding: '8px' }}>
          <option value="admins-first">Admins First</option>
          <option value="alpha">Name A → Z</option>
        </select>

        {/* 🔥 NEW: Advanced Toggle */}
        {isMasterAdmin && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px', marginLeft: 'auto' }}>
            <span style={{ fontSize: '0.75rem', color: showAdvanced ? '#ef4444' : '#64748b', fontWeight: '600', transition: 'color 0.3s' }}>
              Advanced Mode
            </span>
            <label className="toggle-switch-label">
              <input
                type="checkbox"
                className="toggle-switch-input"
                checked={showAdvanced}
                onChange={(e) => setShowAdvanced(e.target.checked)}
              />
              <span className="toggle-slider"></span>
            </label>
          </div>
        )}
      </div>

      {loading ? (
        <p>Loading staff list...</p>
      ) : (
        <div className="table-container">
          <table className="grievance-table">
            <thead>
              <tr>
                <th>Staff ID</th>
                <th>Name</th>
                <th>Current Role</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {(() => {
                const q = searchQuery.trim().toLowerCase();
                // ✅ Filter: Exclude Students (8-digit IDs)
                let list = staffList.filter(s => s.id.length !== 8);

                if (filterRole === 'admins') list = list.filter(s => s.isDeptAdmin);
                else if (filterRole === 'team') list = list.filter(s => s.adminDepartment && !s.isDeptAdmin);
                else if (filterRole === 'general') list = list.filter(s => !s.adminDepartment);

                if (q) {
                  list = list.filter(s => (s.fullName || '').toLowerCase().includes(q) || (s.id || '').toLowerCase().includes(q));
                }

                if (sortMode === 'admins-first') {
                  list.sort((a, b) => {
                    if (a.isDeptAdmin && !b.isDeptAdmin) return -1;
                    if (!a.isDeptAdmin && b.isDeptAdmin) return 1;
                    const aTeam = a.adminDepartment && !a.isDeptAdmin;
                    const bTeam = b.adminDepartment && !b.isDeptAdmin;
                    if (aTeam && !bTeam) return -1;
                    if (!aTeam && bTeam) return 1;
                    return (a.fullName || '').localeCompare(b.fullName || '');
                  });
                } else if (sortMode === 'alpha') {
                  list.sort((a, b) => (a.fullName || '').localeCompare(b.fullName || ''));
                }

                return list.map((staff) => (
                  <tr key={staff.id}>
                    <td>{staff.id}</td>
                    <td>{staff.fullName}</td>

                    <td>
                      {staff.isDeptAdmin ? (
                        <span
                          className="status-badge status-resolved"
                          style={{ border: '1px solid #16a34a', padding: '5px 10px', display: 'inline-flex', alignItems: 'center', gap: '5px' }}
                        >
                          <AdminIcon width="14" height="14" /> Admin: {staff.adminDepartment}
                        </span>
                      ) : staff.adminDepartment ? (
                        <span
                          className="status-badge status-assigned"
                          style={{ border: '1px solid #2563eb', padding: '5px 10px', display: 'inline-flex', alignItems: 'center', gap: '5px' }}
                        >
                          <ShieldIcon width="14" height="14" /> Team: {staff.adminDepartment}
                        </span>
                      ) : (
                        <span className="status-badge status-pending">General Staff</span>
                      )}
                    </td>

                    <td>
                      {processingId === staff.id ? (
                        <div className="modern-loadbar"></div>
                      ) : (
                        !canEdit(staff) ? (
                          <span style={{ color: '#94a3b8', fontSize: '0.85rem', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                            <LockIcon width="14" height="14" /> Locked
                          </span>
                        ) : (
                          <>
                            {staff.adminDepartment ? (
                              <button
                                className="btn-action-modern btn-action-modern-danger"
                                style={{ minWidth: "160px" }}
                                onClick={() => handleRoleChange(staff.id, "demote")}
                              >
                                <XIcon width="14" height="14" /> {staff.isDeptAdmin ? "Remove Admin" : "Remove from Team"}
                              </button>
                            ) : (
                              <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                                <select
                                  id={`dept-${staff.id}`}
                                  className="modern-select-dept"
                                  disabled={!isMasterAdmin}
                                  defaultValue={isMasterAdmin ? "" : myDept}
                                >
                                  <option value="" disabled>Select Dept...</option>
                                  {[
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
                                  ].map(d => (
                                    <option key={d} value={d}>{d}</option>
                                  ))}
                                </select>

                                <button
                                  className="btn-action-modern btn-action-modern-success"
                                  style={{ minWidth: "140px" }}
                                  onClick={() => {
                                    const deptSelect = document.getElementById(`dept-${staff.id}`);
                                    handleRoleChange(staff.id, "promote", deptSelect.value);
                                  }}
                                >
                                  <ShieldIcon width="14" height="14" /> {isMasterAdmin ? "Make Admin" : "Add to Team"}
                                </button>
                              </div>
                            )}
                            {/* 🔥 HIDDEN BY DEFAULT: Transfer Ownership Button */}
                            {isMasterAdmin && showAdvanced && (
                              <button
                                className="btn-action-modern btn-action-modern-purple"
                                style={{ marginLeft: "10px", minWidth: "140px" }}
                                onClick={() => handleTransferOwnership(staff.id)}
                                title="Transfer your Master Admin role to this user"
                              >
                                <UserIcon width="14" height="14" /> Transfer Owner
                              </button>
                            )}
                          </>
                        )
                      )}
                    </td>
                  </tr>
                ));
              })()}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default StaffRoleManager;