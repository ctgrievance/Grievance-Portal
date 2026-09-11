import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/Dashboard.css";
import StaffRoleManager from "../components/StaffRoleManager";
import AdminDepartments from "./AdminDepartments";
import RegisteredUsersView from "../components/RegisteredUsersView";
import ExportPreviewModal from "../components/ExportPreviewModal";
import GrievanceDetailsModal from "../components/GrievanceDetailsModal";
import ctLogo from "../assets/ct-logo.png";
import {
  ShieldIcon,
  PaperclipIcon,
  TrashIcon,
  DownloadIcon,
  RerouteIcon,
  SearchIcon,
  ClipboardIcon,
  UsersIcon,
  BuildingIcon,
  UserIcon
} from "../components/Icons";
import { UserRoleBadge, getSubmitterRole } from "../utils/userRoleHelper";
import ProfileHeaderButton from "../components/ProfileHeaderButton";
import { getDeptAdminRoute } from "../App";

const formatDate = (dateString) => {
  if (!dateString) return "N/A";
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};
const ReadOnlyStars = ({ stars = 0 }) => (
  <div style={{ fontSize: "1.4rem", color: "#facc15" }}>
    {"★".repeat(stars)}
    <span style={{ color: "#cbd5e1" }}>
      {"★".repeat(5 - stars)}
    </span>
  </div>
);


function AdminDashboard() {
  const navigate = useNavigate();

  const userId = localStorage.getItem("grievance_id")?.toUpperCase();
  const isDeptAdmin = localStorage.getItem("is_dept_admin") === "true";
  const myDept = localStorage.getItem("admin_department");

  const isMasterAdmin = localStorage.getItem("is_master_admin") === "true"; // 🔥 Dynamic Check
  const canManageStaff = isMasterAdmin || isDeptAdmin;

  useEffect(() => {
    if (!isMasterAdmin && (isDeptAdmin || myDept)) {
      navigate(getDeptAdminRoute(myDept), { replace: true });
    }
  }, [isMasterAdmin, isDeptAdmin, myDept, navigate]);

  const [activeTab, setActiveTab] = useState("triage");
  const [grievances, setGrievances] = useState([]);
  const [msg, setMsg] = useState("");
  const [statusType, setStatusType] = useState("");
  const [selectedGrievance, setSelectedGrievance] = useState(null);
  const [staffMap, setStaffMap] = useState({}); // ✅ Store Staff Names

  // ✅ FILTER STATES
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("All");
  const [filterRole, setFilterRole] = useState("All"); // All, student, staff
  const [filterDepartment, setFilterDepartment] = useState("All");
  const [filterMonth, setFilterMonth] = useState("");

  // ✅ EXPORT MODAL STATE
  const [showExportModal, setShowExportModal] = useState(false);

  // ✅ MOBILE VIEW SELECTOR STATE
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

  // Navigation Tabs Definition (SVG icons only, no emojis)
  const adminNavTabs = useMemo(() => [
    {
      id: "triage",
      label: "All Grievances",
      IconComponent: ClipboardIcon,
      description: "Review incoming grievances, status & triage"
    },
    ...(canManageStaff
      ? [
          {
            id: "staff",
            label: "Manage Staff",
            IconComponent: UsersIcon,
            description: "Manage staff roles & assignments"
          }
        ]
      : []),
    ...(isMasterAdmin
      ? [
          {
            id: "departments",
            label: "Departments",
            IconComponent: BuildingIcon,
            description: "Configure academic departments & rules"
          },
          {
            id: "registered_users",
            label: "Registered Users",
            IconComponent: UserIcon,
            description: "Verified student and staff accounts"
          }
        ]
      : [])
  ], [canManageStaff, isMasterAdmin]);

  const currentTab = adminNavTabs.find((t) => t.id === activeTab) || adminNavTabs[0];



  const fetchAllGrievances = useCallback(async () => {
    try {
      const res = await fetch(`${process.env.REACT_APP_API_URL || "http://localhost:5000"}/api/grievances/all`);
      if (!res.ok) throw new Error("Failed to fetch grievances");
      const data = await res.json();
      setGrievances(data);
    } catch (err) {
      setMsg(err.message);
      setStatusType("error");
    }
  }, []);

  // Fetch Staff List to Map IDs to Names
  const fetchStaffNames = useCallback(async () => {
    try {
      const token = localStorage.getItem("grievance_token"); // Get Token
      const res = await fetch(`${process.env.REACT_APP_API_URL || "http://localhost:5000"}/api/admin-staff/all`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        const map = {};
        data.forEach((staff) => {
          map[staff.id] = staff.fullName;
        });
        setStaffMap(map);
      }
    } catch (error) {
      console.error("Error fetching staff list:", error);
    }
  }, []);

  useEffect(() => {
    if (!isMasterAdmin && !isDeptAdmin) {
      navigate("/");
    } else {
      fetchAllGrievances();
      fetchStaffNames(); // Fetch staff details
    }
  }, [navigate, isMasterAdmin, isDeptAdmin, fetchAllGrievances, fetchStaffNames]);

  const handleLogout = () => {
    localStorage.clear();
    navigate("/");
  };

  const handleDeleteGrievance = async (id) => {
    if (!window.confirm("Are you sure you want to remove this grievance from your list?")) return;
    try {
      const token = localStorage.getItem("grievance_token");
      const res = await fetch(`${process.env.REACT_APP_API_URL || "http://localhost:5000"}/api/grievances/hide/${id}`, {
        method: "PUT",
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        setGrievances(prev => prev.filter(g => g._id !== id));
        setSelectedGrievance(null);
        setMsg("Grievance removed from view.");
        setStatusType("success");
        setTimeout(() => setMsg(""), 3000);
      } else {
        throw new Error("Failed to delete.");
      }
    } catch (err) {
      console.error(err);
      alert("Error removing grievance.");
    }
  };

  // ✅ FILTER LOGIC
  const filteredGrievances = grievances.filter((g) => {
    const submitterRole = getSubmitterRole(g);
    const query = searchQuery.trim().toLowerCase();
    const assignedStaffName = staffMap[g.assignedTo] || "";
    const matchSearch = !query ||
      (g.userId || "").toLowerCase().includes(query) ||
      (g.name || "").toLowerCase().includes(query) ||
      submitterRole.toLowerCase().includes(query) ||
      (g.assignedTo || "").toLowerCase().includes(query) ||
      assignedStaffName.toLowerCase().includes(query);

    const matchStatus = filterStatus === "All"
      ? true
      : filterStatus === "Rerouted"
        ? !!g.isRerouted
        : g.status === filterStatus;

    const categoryOrSchool = g.category || g.school || "";
    const matchDept = filterDepartment === "All" || categoryOrSchool === filterDepartment;

    let matchMonth = true;
    if (filterMonth) {
      const gDate = new Date(g.createdAt);
      const [year, month] = filterMonth.split("-");
      matchMonth = gDate.getFullYear() === parseInt(year) && (gDate.getMonth() + 1) === parseInt(month);
    }

    const matchRole = filterRole === "All" || submitterRole === filterRole;

    return matchSearch && matchStatus && matchRole && matchDept && matchMonth;
  });
  // ✅ OPEN EXPORT PREVIEW MODAL
  const handleOpenExportModal = () => {
    setShowExportModal(true);
  };

  // ✅ EXPORT SELECTED DATA TO EXCEL
  const handleExportSelected = (selectedData, selectedColumns) => {
    const token = localStorage.getItem("grievance_token");

    // Send selected IDs and columns to backend
    fetch(`${process.env.REACT_APP_API_URL || "http://localhost:5000"}/api/grievances/export-selected`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        grievanceIds: selectedData.map((g) => g._id),
        columns: selectedColumns,
      }),
    })
      .then((res) => {
        if (!res.ok) throw new Error("Export failed");
        return res.blob();
      })
      .then((blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `grievances_export_${new Date().toISOString().split('T')[0]}.xlsx`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setMsg("Export successful!");
        setStatusType("success");
        setTimeout(() => setMsg(""), 3000);
      })
      .catch(() => {
        alert("Excel export failed");
      });
  };

  // ✅ Reset all filters
  const resetFilters = () => {
    setSearchQuery("");
    setFilterStatus("All");
    setFilterRole("All");
    setFilterDepartment("All");
    setFilterMonth("");
  };

  // ✅ Unique Departments for Dropdown
  const uniqueDepartments = [...new Set(grievances.map(g => g.category || g.school).filter(Boolean))];

  return (
    <div className="dashboard-container">
      {/* HEADER */}
      <header className="dashboard-header admin-dashboard-header">
        <div className="admin-header-brand-wrap">
          <img src={ctLogo} alt="CT University" className="admin-header-logo" />
          <div className="header-content">
            <h1>Admin Dashboard</h1>
            <p className="admin-header-user-info">
              Welcome, <strong>{userId}</strong>
              <span className="admin-master-badge">
                <ShieldIcon width="12" height="12" /> {isMasterAdmin ? "Master Admin" : `${localStorage.getItem("admin_department") || "Dept"} Admin`}
              </span>
            </p>
          </div>
        </div>
        <div className="admin-header-actions">
          <ProfileHeaderButton />
          <button className="logout-btn-header" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </header>

      {/* NAV */}
      <nav className="navbar admin-navbar">
        <div className="admin-nav-container">
          {/* Desktop Navigation: Segmented Control Tabs */}
          <ul className="admin-nav-tabs admin-desktop-only">
            {adminNavTabs.map((tab) => (
              <li
                key={tab.id}
                className={activeTab === tab.id ? "active" : ""}
                onClick={() => setActiveTab(tab.id)}
              >
                <span className="tab-link-button">
                  {tab.label}
                  {tab.isLive && <span className="admin-tab-live-badge">Live</span>}
                </span>
              </li>
            ))}
          </ul>

          {/* Mobile Navigation: View Selector Dropdown (Zero Scrolling) */}
          <div className="admin-mobile-nav-wrapper admin-mobile-only">
            <button
              type="button"
              className={`admin-mobile-view-trigger ${isMobileNavOpen ? "open" : ""}`}
              onClick={() => setIsMobileNavOpen(!isMobileNavOpen)}
              aria-expanded={isMobileNavOpen}
              aria-haspopup="true"
            >
              <div className="admin-mobile-trigger-left">
                {currentTab?.IconComponent && (
                  <span className="admin-mobile-trigger-icon">
                    <currentTab.IconComponent width="18" height="18" />
                  </span>
                )}
                <span className="admin-mobile-trigger-label">{currentTab?.label || "All Grievances"}</span>
                {currentTab?.isLive && <span className="admin-tab-live-badge">Live</span>}
              </div>
              <div className="admin-mobile-trigger-right">
                <span className="admin-mobile-trigger-hint">Switch View</span>
                <span className={`admin-mobile-trigger-chevron ${isMobileNavOpen ? "rotated" : ""}`}>
                  ▾
                </span>
              </div>
            </button>

            {isMobileNavOpen && (
              <>
                <div
                  className="admin-mobile-nav-backdrop"
                  onClick={() => setIsMobileNavOpen(false)}
                />
                <div className="admin-mobile-nav-dropdown" role="menu">
                  <div className="admin-mobile-dropdown-header">
                    <span className="admin-mobile-dropdown-title">Select Section</span>
                    <button
                      type="button"
                      className="admin-mobile-dropdown-close"
                      onClick={() => setIsMobileNavOpen(false)}
                      title="Close menu"
                    >
                      ✕
                    </button>
                  </div>
                  <div className="admin-mobile-dropdown-list">
                    {adminNavTabs.map((tab) => {
                      const isActive = activeTab === tab.id;
                      const TabIcon = tab.IconComponent;
                      return (
                        <button
                          key={tab.id}
                          type="button"
                          className={`admin-mobile-dropdown-item ${isActive ? "active" : ""}`}
                          onClick={() => {
                            setActiveTab(tab.id);
                            setIsMobileNavOpen(false);
                          }}
                          role="menuitem"
                        >
                          {TabIcon && (
                            <span className="admin-mitem-icon">
                              <TabIcon width="18" height="18" />
                            </span>
                          )}
                          <div className="admin-mitem-content">
                            <div className="admin-mitem-label-wrap">
                              <span className="admin-mitem-label">{tab.label}</span>
                              {tab.isLive && <span className="admin-tab-live-badge">Live</span>}
                            </div>
                            <span className="admin-mitem-desc">{tab.description}</span>
                          </div>
                          {isActive ? (
                            <span className="admin-mitem-check" aria-hidden="true">✓</span>
                          ) : (
                            <span className="admin-mitem-arrow" aria-hidden="true">›</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* BODY */}
      <main className="dashboard-body admin-dashboard-body">
        {activeTab === "staff" && canManageStaff && <StaffRoleManager />}
        {activeTab === "departments" && isMasterAdmin && <AdminDepartments />}
        {activeTab === "registered_users" && isMasterAdmin && (
          <RegisteredUsersView
            allowRegisteredStudents={true}
            allowRegisteredStaff={true}
            isSuperAdmin={true}
          />
        )}

        {activeTab === "triage" && (
          <div className="card admin-triage-card">
            <div className="admin-card-header">
              <div className="admin-card-title-wrap">
                <h2 className="admin-card-title">All Incoming Grievances (Read Only)</h2>
                {grievances.filter(g => g.isRerouted).length > 0 && (
                  <span
                    className="admin-reroute-summary-badge"
                    title="Re-routed grievances requiring triage"
                  >
                    <RerouteIcon width="13" height="13" />
                    <span>{grievances.filter(g => g.isRerouted).length} Re-routed</span>
                  </span>
                )}
              </div>
            </div>

            {/* ✅ FILTER BAR */}
            <div className="admin-filter-bar">
              {/* Row 1: Search & Action Buttons */}
              <div className="admin-filter-top-row">
                <div className="admin-filter-search-box">
                  <SearchIcon width="16" height="16" className="admin-search-icon" />
                  <input
                    type="text"
                    placeholder="Search Student / Staff (ID or Name)..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="admin-search-input"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery("")}
                      className="admin-search-clear-btn"
                      title="Clear search"
                    >
                      ×
                    </button>
                  )}
                </div>

                <div className="admin-filter-actions">
                  {(searchQuery || filterStatus !== "All" || filterRole !== "All" || filterDepartment !== "All" || filterMonth) && (
                    <button onClick={resetFilters} className="admin-btn-reset">
                      Reset Filters
                    </button>
                  )}
                  <button onClick={handleOpenExportModal} className="admin-btn-export">
                    <DownloadIcon width="15" height="15" />
                    <span>Export to Excel</span>
                  </button>
                </div>
              </div>

              {/* Row 2: Filter Selects */}
              <div className="admin-filter-bottom-row">
                <div className="admin-filter-pill-group">
                  <span className="admin-filter-pill-label">Status</span>
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="admin-select"
                  >
                    <option value="All">All Status</option>
                    <option value="Pending">Pending</option>
                    <option value="Assigned">Assigned</option>
                    <option value="Resolved">Resolved</option>
                    <option value="Rejected">Rejected</option>
                    <option value="Rerouted">Re-routed Only</option>
                  </select>
                </div>

                <div className="admin-filter-pill-group">
                  <span className="admin-filter-pill-label">User</span>
                  <select
                    value={filterRole}
                    onChange={(e) => setFilterRole(e.target.value)}
                    className="admin-select"
                  >
                    <option value="All">All Users</option>
                    <option value="student">Student</option>
                    <option value="staff">Staff</option>
                  </select>
                </div>

                <div className="admin-filter-pill-group">
                  <span className="admin-filter-pill-label">Dept</span>
                  <select
                    value={filterDepartment}
                    onChange={(e) => setFilterDepartment(e.target.value)}
                    className="admin-select"
                  >
                    <option value="All">All Departments</option>
                    {uniqueDepartments.map((dept) => (
                      <option key={dept} value={dept}>{dept}</option>
                    ))}
                  </select>
                </div>

                <div className="admin-filter-pill-group">
                  <span className="admin-filter-pill-label">Month</span>
                  <input
                    type="month"
                    value={filterMonth}
                    onChange={(e) => setFilterMonth(e.target.value)}
                    className="admin-select admin-month-input"
                    title="Filter by month"
                  />
                </div>
              </div>
            </div>

            {msg && <div className={`alert-box ${statusType}`}>{msg}</div>}

            {filteredGrievances.length === 0 ? (
              <p>No grievances found matching criteria.</p>
            ) : (
              <>
                {/* Desktop View: Full Table */}
                <div className="table-container admin-table-container admin-desktop-only">
                  <table className="grievance-table admin-grievance-table">
                    <thead>
                      <tr>
                        <th>Student / User</th>
                        <th>Department / Category</th>
                        <th>Message</th>
                        <th>Status</th>
                        <th>Assigned Staff</th>
                        <th>Created</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredGrievances.map((g) => (
                        <tr key={g._id} onClick={() => setSelectedGrievance(g)} style={{ cursor: "pointer" }}>
                          <td data-label="Student / User">
                            <div>
                              <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap", marginBottom: "2px" }}>
                                <span style={{ fontWeight: "600", color: "#1e293b" }}>
                                  {g.name || (getSubmitterRole(g) === "staff" ? "Staff Member" : "Student")}
                                </span>
                                <UserRoleBadge grievance={g} />
                              </div>
                              <span style={{ fontSize: "0.85rem", color: "#64748b", fontFamily: "monospace" }}>
                                {g.userId}
                              </span>
                            </div>
                          </td>
                          <td data-label="Department / Category">{g.category || g.school || "N/A"}</td>

                          <td data-label="Message" className="message-cell" style={{ maxWidth: '200px' }}>
                            <div
                              style={{ padding: "4px", borderRadius: "4px", transition: "background 0.2s" }}
                              onMouseEnter={(e) => e.currentTarget.style.background = "#f1f5f9"}
                              onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                            >
                              <span style={{ wordBreak: 'break-word', lineHeight: '1.3', color: "#334155", fontWeight: "500" }}>
                                {g.message.substring(0, 40)}{g.message.length > 40 ? "..." : ""}
                              </span>
                            </div>
                          </td>

                          <td data-label="Status">
                            <div className="admin-status-cell">
                              <span
                                className={`status-badge status-${(g.status || "")
                                  .toLowerCase()
                                  .replace(" ", "")}`}
                              >
                                {g.status}
                              </span>
                              {g.isRerouted && (
                                <span
                                  className="admin-reroute-icon-badge"
                                  title={
                                    g.transferHistory?.length > 1
                                      ? `Re-routed (${g.transferHistory.length} times)`
                                      : "Re-routed"
                                  }
                                  aria-label="Re-routed"
                                >
                                  <RerouteIcon width="13" height="13" />
                                  {g.transferHistory?.length > 1 && (
                                    <span className="admin-reroute-count">{g.transferHistory.length}</span>
                                  )}
                                </span>
                              )}
                            </div>

                            {/* Rating under Resolved */}
                            {g.status?.toLowerCase() === "resolved" && (
                              <div style={{ marginTop: "4px", fontSize: "0.9rem" }}>
                                {g.rating?.stars ? (
                                  <span style={{ color: "#facc15" }}>
                                    {"★".repeat(g.rating.stars)}
                                    <span style={{ color: "#cbd5e1" }}>
                                      {"★".repeat(5 - g.rating.stars)}
                                    </span>
                                  </span>
                                ) : (
                                  <span style={{ color: "#94a3b8", fontSize: "0.75rem" }}>
                                    No rating yet
                                  </span>
                                )}
                              </div>
                            )}
                          </td>


                          {/* ✅ ASSIGNED STAFF COLUMN */}
                          <td data-label="Assigned Staff">
                            {g.assignedTo ? (
                              <div>
                                <span style={{ fontWeight: "600", display: "block", color: "#1e293b" }}>
                                  {staffMap[g.assignedTo] || "Staff"}
                                </span>
                                <span style={{ fontSize: "0.85rem", color: "#64748b" }}>({g.assignedTo})</span>
                              </div>
                            ) : (
                              <span style={{ color: "#94a3b8", fontStyle: "italic" }}>Not Assigned Yet</span>
                            )}
                          </td>

                          <td data-label="Created">{formatDate(g.createdAt)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile App View: Compact Cards (No message text on front, tap to view modal) */}
                <div className="admin-mobile-cards-list admin-mobile-only">
                  {filteredGrievances.map((g) => (
                    <div
                      key={g._id}
                      className="admin-mobile-compact-card"
                      onClick={() => setSelectedGrievance(g)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          setSelectedGrievance(g);
                        }
                      }}
                      role="button"
                      tabIndex={0}
                    >
                      <div className="admin-mcard-row-top">
                        <div className="admin-mcard-user-info">
                          <span className="admin-mcard-user-name">
                            {g.name || (getSubmitterRole(g) === "staff" ? "Staff Member" : "Student")}
                          </span>
                          <UserRoleBadge grievance={g} />
                        </div>
                        <div className="admin-mcard-status-info">
                          <span
                            className={`status-badge status-${(g.status || "")
                              .toLowerCase()
                              .replace(" ", "")}`}
                          >
                            {g.status}
                          </span>
                          {g.isRerouted && (
                            <span
                              className="admin-reroute-icon-badge"
                              title={
                                g.transferHistory?.length > 1
                                  ? `Re-routed (${g.transferHistory.length} times)`
                                  : "Re-routed"
                              }
                            >
                              <RerouteIcon width="11" height="11" />
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="admin-mcard-row-bottom">
                        <div className="admin-mcard-meta-wrap">
                          <span className="admin-mcard-dept-name">
                            {g.category || g.school || "General"}
                          </span>
                          <span className="admin-mcard-sep">•</span>
                          <span className="admin-mcard-user-id">{g.userId}</span>
                          <span className="admin-mcard-sep">•</span>
                          <span className="admin-mcard-date-str">
                            {new Date(g.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                          </span>
                        </div>
                        <span className="admin-mcard-chevron" aria-hidden="true">›</span>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* MODAL */}
        {selectedGrievance && (
          <GrievanceDetailsModal
            grievance={selectedGrievance}
            staffMap={staffMap}
            canTransfer={false}
            onClose={() => setSelectedGrievance(null)}
            onDelete={handleDeleteGrievance}
            onTransferred={() => {
              fetchAllGrievances();
              setSelectedGrievance(null);
            }}
          />
        )}

        {/* ✅ SUPER SMOOTH INTERACTIONS (Makhan UI) */}
        <style>{`
          .dashboard-container { animation: fadeIn 0.4s ease-out; }
          @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }

          /* Smooth Transitions */
          .card, .navbar, input, select, textarea, button, .action-btn, .submit-btn, .logout-btn-header {
            transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1) !important;
          }

          /* Hover Effects */
          .card:hover { box-shadow: 0 15px 30px rgba(0,0,0,0.1) !important; }
          
          button:hover, .action-btn:hover, .submit-btn:hover, .logout-btn-header:hover {
            transform: translateY(-2px);
            box-shadow: 0 5px 15px rgba(0,0,0,0.1);
          }
          button:active, .action-btn:active { transform: scale(0.95); }

          /* Inputs */
          input:not(.admin-search-input):focus, select:focus, textarea:focus {
            transform: scale(1.01);
            border-color: #2563eb !important;
            box-shadow: 0 0 0 4px rgba(37, 99, 235, 0.1) !important;
          }

          /* Table */
          tr { transition: background-color 0.2s ease; }
          tr:hover { background-color: #f8fafc !important; }
        `}</style>
      </main>

      {/* EXPORT PREVIEW MODAL */}
      <ExportPreviewModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        grievances={filteredGrievances}
        staffMap={staffMap}
        onExport={handleExportSelected}
      />
    </div>
  );
}

export default AdminDashboard;
