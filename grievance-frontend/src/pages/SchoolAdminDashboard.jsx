import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/Dashboard.css"; // Existing CSS for table structure
import AssignStaffPopup from "../components/AssignStaffPopup";
import ExportPreviewModal from "../components/ExportPreviewModal";
import GrievanceDetailsModal from "../components/GrievanceDetailsModal";

import AdminStudentRecords from "../components/AdminStudentRecords";
import StaffRecordsTab from "../components/StaffRecordsTab";
import RegisteredUsersView from "../components/RegisteredUsersView";
import StaffRoleManager from "../components/StaffRoleManager";
import useDepartmentPermissions from "../hooks/useDepartmentPermissions";
import ctLogo from "../assets/ct-logo.png";
import { SearchIcon, UserIcon, HomeIcon, DownloadIcon, ShieldIcon, AlertCircleIcon } from "../components/Icons";
import { UserRoleBadge } from "../utils/userRoleHelper";
import ProfileHeaderButton from "../components/ProfileHeaderButton";
import DepartmentSwitcher from "../components/DepartmentSwitcher";
import DepartmentAdminNavbar from "../components/DepartmentAdminNavbar";
import ActionDropdown from "../components/ActionDropdown";
import DepartmentFilterBar from "../components/DepartmentFilterBar";
import DepartmentGrievanceList from "../components/DepartmentGrievanceList";
import InterDepartmentTracker from "../components/InterDepartmentTracker";
import { splitGrievancesByOrigin } from "../utils/grievanceClassification";

const formatDate = (dateString) => {
  if (!dateString) return "N/A";
  return new Date(dateString).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
};

// Date-only formatter for deadlines (no time)
const formatDateDateOnly = (dateString) => {
  if (!dateString) return "-";
  const options = { year: "numeric", month: "short", day: "numeric" };
  return new Date(dateString).toLocaleDateString("en-US", options);
};

// Deadline status helper: returns { label, color, isOverdue, badge }
const getDeadlineStatus = (deadlineDateStr, status) => {
  if (!deadlineDateStr) return { label: "-", color: "#64748b", isOverdue: false };
  if (status === "Resolved" || status === "Rejected") return { label: formatDateDateOnly(deadlineDateStr), color: "#64748b", isOverdue: false };
  const now = new Date();
  const deadline = new Date(deadlineDateStr);
  const hoursLeft = (deadline - now) / (1000 * 60 * 60);
  if (hoursLeft < 0) return { label: formatDateDateOnly(deadlineDateStr), color: "#dc2626", isOverdue: true, badge: "OVERDUE" };
  if (hoursLeft < 24) return { label: formatDateDateOnly(deadlineDateStr), color: "#d97706", isOverdue: false, badge: "DUE SOON" };
  return { label: formatDateDateOnly(deadlineDateStr), color: "#16a34a", isOverdue: false };
};

function SchoolAdminDashboard() {
  const navigate = useNavigate();
  const userId = localStorage.getItem("grievance_id")?.toUpperCase();

  const mySchoolName = localStorage.getItem("admin_department");
  const isAuthorized = !!mySchoolName;

  const [activeTab, setActiveTab] = useState("grievances");
  const { allowStudentRecords, allowStaffRecords, allowRegisteredStudents, allowRegisteredStaff } = useDepartmentPermissions(mySchoolName);

  // Data States
  const [grievances, setGrievances] = useState([]);
  const [staffMap, setStaffMap] = useState({});
  const [grievanceSection, setGrievanceSection] = useState("direct"); // "direct" | "forwarded"

  // ✅ FILTER STATES
  const [searchId, setSearchId] = useState("");
  const [searchStaffId, setSearchStaffId] = useState(""); // Search by Staff ID
  const [statusFilter, setStatusFilter] = useState("All");
  const [filterMonth, setFilterMonth] = useState(""); // ✅ Month Filter

  // ✅ Feedback States (Added to fix "not working" issue)
  const [msg, setMsg] = useState("");
  const [statusType, setStatusType] = useState("");

  // Popup States
  const [isAssignPopupOpen, setIsAssignPopupOpen] = useState(false);
  const [assignGrievanceId, setAssignGrievanceId] = useState(null);
  const [selectedGrievance, setSelectedGrievance] = useState(null);
  const [showExportModal, setShowExportModal] = useState(false);

  useEffect(() => {
    if (!isAuthorized) {
      navigate("/");
    } else {
      fetchMySchoolGrievances();
      fetchStaffNames();
    }
  }, [navigate, isAuthorized]);

  const fetchMySchoolGrievances = async () => {
    try {
      const category = encodeURIComponent(mySchoolName);
      const res = await fetch(`${process.env.REACT_APP_API_URL || "http://localhost:5000"}/api/grievances/category/${category}`);
      if (res.ok) {
        const data = await res.json();
        console.log("Fetched grievances (category):", data.slice(0, 5));
        const prevScrollY = window.scrollY || window.pageYOffset;
        setGrievances(data);
        requestAnimationFrame(() => window.scrollTo(0, prevScrollY));
      } else console.error("Failed to fetch grievances");
    } catch (error) {
      console.error(error);
    }
  };

  const fetchStaffNames = async () => {
    try {
      const res = await fetch(`${process.env.REACT_APP_API_URL || "http://localhost:5000"}/api/admin-staff/all`);
      if (res.ok) {
        const data = await res.json();
        const map = {};
        data.forEach(staff => {
          map[staff.id] = staff.fullName;
        });
        setStaffMap(map);
      }
    } catch (err) {
      console.error("Error assigning stuff:", err);
      setMsg("Failed to assign staff.");
      setStatusType("error");
    }
  };



  const updateStatus = async (id, newStatus) => {
    setMsg("Updating status...");
    setStatusType("info");
    try {
      const res = await fetch(`${process.env.REACT_APP_API_URL || "http://localhost:5000"}/api/grievances/update/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus, resolvedBy: userId }),
      });
      if (!res.ok) throw new Error("Update failed");

      setMsg("Status updated successfully!");
      setStatusType("success");
      fetchMySchoolGrievances();
    } catch (err) {
      setMsg(`Error: ${err.message}`);
      setStatusType("error");
    }
  };

  const confirmResolve = (g) => {
    const confirmMsg = g.assignedTo
      ? `Professional Action Required\n\nThis grievance is currently assigned to Staff ID: ${g.assignedTo}.\n\nMarking it as 'Resolved' will close the ticket and override the active assignment.\n\nAre you sure you want to proceed?`
      : "Are you sure you want to mark this grievance as Resolved?";

    if (window.confirm(confirmMsg)) {
      updateStatus(g._id, "Resolved");
    }
  };

  const openAssignPopup = (id) => {
    const targetG = typeof id === "object" ? id : (selectedGrievance?._id === id ? selectedGrievance : grievances.find(g => g._id === id));
    if (targetG) {
      const targetDept = (targetG.currentCustodian?.department || targetG.category || "").trim().toLowerCase();
      const myDept = (mySchoolName || "").trim().toLowerCase();
      if (targetDept && myDept && targetDept !== myDept && !targetDept.includes(myDept) && !myDept.includes(targetDept)) {
        alert(`❌ This grievance has been assigned to ${targetG.currentCustodian?.department || targetG.category}. You cannot assign faculty to it.`);
        return;
      }
    }
    setAssignGrievanceId(typeof id === "object" ? id._id : id);
    setIsAssignPopupOpen(true);
  };
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

  // ✅ 2 SECTIONS: DIRECT GRIEVANCES vs FORWARDED GRIEVANCES
  const { directGrievances, forwardedGrievances, unassignedForwardedCount } = splitGrievancesByOrigin(grievances, mySchoolName);
  const currentSectionGrievances = grievanceSection === "forwarded" ? forwardedGrievances : directGrievances;

  // ✅ FILTER LOGIC
  const filteredGrievances = currentSectionGrievances.filter((g) => {
    const matchId = (g.userId || "").toLowerCase().includes(searchId.toLowerCase());
    const matchStaff = (g.assignedTo || "").toLowerCase().includes(searchStaffId.toLowerCase());
    const matchStatus = statusFilter === "All" || g.status === statusFilter;

    let matchMonth = true;
    if (filterMonth) {
      const gDate = new Date(g.createdAt);
      const [year, month] = filterMonth.split("-");
      matchMonth = gDate.getFullYear() === parseInt(year) && (gDate.getMonth() + 1) === parseInt(month);
    }

    return matchId && matchStaff && matchStatus && matchMonth;
  });

  const resetFilters = () => { setSearchId(""); setSearchStaffId(""); setStatusFilter("All"); setFilterMonth(""); };
  const handleOpenExportModal = () => setShowExportModal(true);
  const handleExportSelected = (selectedData, selectedColumns) => {
    const token = localStorage.getItem("grievance_token");
    fetch(`${process.env.REACT_APP_API_URL || "http://localhost:5000"}/api/grievances/export-selected`, {
      method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ grievanceIds: selectedData.map((g) => g._id), columns: selectedColumns }),
    }).then((res) => { if (!res.ok) throw new Error(); return res.blob(); })
      .then((blob) => {
        const url = window.URL.createObjectURL(blob); const a = document.createElement("a");
        a.href = url; a.download = `${(mySchoolName || "school").toLowerCase().replace(/\s+/g, '_')}_${grievanceSection}_grievances_${new Date().toISOString().split('T')[0]}.xlsx`;
        document.body.appendChild(a); a.click(); a.remove();
        setMsg("Export successful!"); setStatusType("success"); setTimeout(() => setMsg(""), 3000);
      }).catch(() => alert("Excel export failed"));
  };

  const handleResolveExtension = async (grievanceId, action) => {
    try {
      const res = await fetch(`${process.env.REACT_APP_API_URL || "http://localhost:5000"}/api/grievances/extension/resolve/${grievanceId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action })
      });
      if (!res.ok) throw new Error("Failed to resolve extension");
      alert(`Extension ${action.toLowerCase()} successfully`);
      window.location.reload();
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div className="dashboard-container">
      <header className="dashboard-header admin-dashboard-header">
        <div className="admin-header-brand-wrap">
          <img src={ctLogo} alt="CT University" className="admin-header-logo" />
          <div className="header-content">
            <h1>{mySchoolName} Department</h1>
            <p className="admin-header-user-info">
              Welcome, <strong>{userId}</strong>
              <span className="admin-master-badge">
                <ShieldIcon width="12" height="12" /> {mySchoolName}
              </span>
            </p>
          </div>
        </div>
        <div className="admin-header-actions">
          <ProfileHeaderButton />
          <DepartmentSwitcher currentDepartment={mySchoolName} />
          <button className="logout-btn-header" onClick={handleLogout}>Logout</button>
        </div>
      </header>

      <DepartmentAdminNavbar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        allowStudentRecords={allowStudentRecords}
        allowStaffRecords={allowStaffRecords}
        allowRegisteredStudents={allowRegisteredStudents}
        allowRegisteredStaff={allowRegisteredStaff}
        departmentName={mySchoolName}
      />

      <main className="dashboard-body">
        {activeTab === "student_records" && <AdminStudentRecords />}
        {activeTab === "staff_records" && <StaffRecordsTab />}
        {activeTab === "registered_users" && (allowRegisteredStudents || allowRegisteredStaff) && (
          <RegisteredUsersView
            allowRegisteredStudents={allowRegisteredStudents}
            allowRegisteredStaff={allowRegisteredStaff}
          />
        )}
        {activeTab === "manage_staff" && <StaffRoleManager />}
        {activeTab === "inter_department" && (
          <InterDepartmentTracker
            departmentName={mySchoolName}
            staffMap={staffMap}
            onSelectGrievance={setSelectedGrievance}
          />
        )}
        {activeTab === "grievances" && (
          <div className="card">
            {/* ── SECTION HEADER & 2-SECTION SWITCHER ── */}
            <div className="dept-grievance-header-wrap">
              <div className="dept-grievance-title-area">
                <h2>{mySchoolName} Grievances</h2>
                <span className="dept-grievance-total-tag">
                  Total: {grievances.length}
                </span>
              </div>

              {/* ── 2 SECTIONS: DIRECT GRIEVANCES vs FORWARDED GRIEVANCES ── */}
              <div className="dept-section-tabs">
                <button
                  type="button"
                  className={`dept-section-tab-btn ${grievanceSection === "direct" ? "active" : ""}`}
                  onClick={() => {
                    setGrievanceSection("direct");
                    resetFilters();
                  }}
                >
                  <div className="dept-sec-btn-icon direct">📥</div>
                  <div className="dept-sec-btn-text">
                    <div className="dept-sec-btn-title">
                      Direct Grievances
                      <span className="dept-sec-count direct">{directGrievances.length}</span>
                    </div>
                    <small className="dept-sec-btn-sub">Directly submitted by students to {mySchoolName}</small>
                  </div>
                </button>

                <button
                  type="button"
                  className={`dept-section-tab-btn ${grievanceSection === "forwarded" ? "active" : ""}`}
                  onClick={() => {
                    setGrievanceSection("forwarded");
                    resetFilters();
                  }}
                >
                  <div className="dept-sec-btn-icon forward">🔁</div>
                  <div className="dept-sec-btn-text">
                    <div className="dept-sec-btn-title">
                      Forwarded Grievances
                      <span className="dept-sec-count forward">{forwardedGrievances.length}</span>
                      {unassignedForwardedCount > 0 && (
                        <span className="dept-sec-attention-pill" title={`${unassignedForwardedCount} grievance(s) require faculty assignment`}>
                          ⚡ {unassignedForwardedCount} Action Needed
                        </span>
                      )}
                    </div>
                    <small className="dept-sec-btn-sub">Transferred from other departments</small>
                  </div>
                </button>
              </div>
            </div>

            {/* ✅ Feedback Message Alert Box */}
            {msg && <div className={`alert-box ${statusType}`}>{msg}</div>}

            {/* Informative hint for Forwarded Section */}
            {grievanceSection === "forwarded" && (
              <div style={{
                background: "#f0fdf4",
                border: "1px solid #bbf7d0",
                borderRadius: "8px",
                padding: "10px 14px",
                marginBottom: "14px",
                display: "flex",
                alignItems: "center",
                gap: "10px",
                fontSize: "0.82rem",
                color: "#166534"
              }}>
                <span style={{ fontSize: "1.1rem" }}>💡</span>
                <div>
                  <strong>Forwarded Grievances:</strong> These complaints were transferred into {mySchoolName} from other departments. As department admin, you can review the forward reason and assign your faculty members manually.
                </div>
              </div>
            )}

            {/* ✅ MODERN RESPONSIVE FILTER BAR */}
            <DepartmentFilterBar
              searchId={searchId}
              setSearchId={setSearchId}
              searchStaffId={searchStaffId}
              setSearchStaffId={setSearchStaffId}
              statusFilter={statusFilter}
              setStatusFilter={setStatusFilter}
              filterMonth={filterMonth}
              setFilterMonth={setFilterMonth}
              onReset={resetFilters}
              onExport={handleOpenExportModal}
            />

            {/* GRIEVANCES LIST (Desktop Table + Mobile Touch Cards) */}
            {filteredGrievances.length === 0 ? (
              <div className="empty-state">
                <p>
                  {currentSectionGrievances.length === 0
                    ? (grievanceSection === "forwarded"
                        ? "No forwarded grievances received from other departments."
                        : "No direct grievances received from students yet.")
                    : "No grievances found matching filters."}
                </p>
              </div>
            ) : (
              <DepartmentGrievanceList
                grievances={filteredGrievances}
                staffMap={staffMap}
                setSelectedGrievance={setSelectedGrievance}
                openAssignPopup={openAssignPopup}
                onResolve={confirmResolve}
                updateStatus={updateStatus}
                getDeadlineStatus={getDeadlineStatus}
                formatDate={formatDate}
                isForwardedSection={grievanceSection === "forwarded"}
                currentDepartment={mySchoolName}
              />
            )}
          </div>
        )}
      </main>

      {selectedGrievance && (
        <GrievanceDetailsModal
          grievance={selectedGrievance}
          staffMap={staffMap}
          canTransfer={true}
          onClose={() => setSelectedGrievance(null)}
          onDelete={handleDeleteGrievance}
          onResolveExtension={handleResolveExtension}
          onAssign={openAssignPopup}
          onTransferred={() => {
            fetchMySchoolGrievances();
            setSelectedGrievance(null);
          }}
        />
      )}

      <AssignStaffPopup isOpen={isAssignPopupOpen} onClose={() => setIsAssignPopupOpen(false)} department={mySchoolName} grievanceId={assignGrievanceId} adminId={userId} onAssigned={(m, t) => { fetchMySchoolGrievances() }} />
      <ExportPreviewModal isOpen={showExportModal} onClose={() => setShowExportModal(false)} grievances={filteredGrievances} staffMap={staffMap} onExport={handleExportSelected} />

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

        /* Reject Button Style */
        .reject-btn { background-color: #fef2f2; color: #dc2626; border: 1px solid #fee2e2; }
        .reject-btn:hover {
          background-color: #dc2626; color: white; border-color: #dc2626;
          transform: translateY(-1px);
          box-shadow: 0 2px 4px rgba(220, 38, 38, 0.2);
        }

        /* 2-Section Switcher Styles */
        .dept-grievance-header-wrap {
          display: flex;
          flex-direction: column;
          gap: 14px;
          margin-bottom: 16px;
        }
        .dept-grievance-title-area {
          display: flex;
          align-items: center;
          justifyContent: space-between;
          flex-wrap: wrap;
          gap: 10px;
        }
        .dept-grievance-title-area h2 {
          margin: 0;
          font-size: 1.35rem;
          color: #0f172a;
          font-weight: 700;
        }
        .dept-grievance-total-tag {
          background: #f1f5f9;
          color: #475569;
          font-size: 0.8rem;
          font-weight: 700;
          padding: 4px 12px;
          border-radius: 20px;
          border: 1px solid #e2e8f0;
        }
        .dept-section-tabs {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
          background: #f8fafc;
          padding: 6px;
          border-radius: 12px;
          border: 1px solid #e2e8f0;
        }
        .dept-section-tab-btn {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 16px;
          border-radius: 10px;
          border: 1.5px solid transparent;
          background: transparent;
          cursor: pointer;
          text-align: left;
          transition: all 0.25s cubic-bezier(0.2, 0.8, 0.2, 1);
        }
        .dept-section-tab-btn:hover {
          background: #ffffff;
          border-color: #cbd5e1;
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(0,0,0,0.03);
        }
        .dept-section-tab-btn.active {
          background: #ffffff;
          border-color: #2563eb;
          box-shadow: 0 4px 14px rgba(37, 99, 235, 0.12);
        }
        .dept-sec-btn-icon {
          width: 40px;
          height: 40px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justifyContent: center;
          font-size: 1.25rem;
          flex-shrink: 0;
          transition: transform 0.2s;
        }
        .dept-section-tab-btn:hover .dept-sec-btn-icon {
          transform: scale(1.08);
        }
        .dept-sec-btn-icon.direct {
          background: #eff6ff;
          border: 1px solid #bfdbfe;
        }
        .dept-sec-btn-icon.forward {
          background: #f0fdf4;
          border: 1px solid #bbf7d0;
        }
        .dept-sec-btn-text {
          display: flex;
          flex-direction: column;
          gap: 2px;
          min-width: 0;
          flex: 1;
        }
        .dept-sec-btn-title {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 0.92rem;
          font-weight: 700;
          color: #0f172a;
          flex-wrap: wrap;
        }
        .dept-sec-btn-sub {
          font-size: 0.74rem;
          color: #64748b;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .dept-sec-count {
          display: inline-flex;
          align-items: center;
          justifyContent: center;
          font-size: 0.75rem;
          font-weight: 800;
          padding: 2px 8px;
          border-radius: 12px;
        }
        .dept-sec-count.direct {
          background: #eff6ff;
          color: #1d4ed8;
          border: 1px solid #dbeafe;
        }
        .dept-section-tab-btn.active .dept-sec-count.direct {
          background: #2563eb;
          color: #ffffff;
        }
        .dept-sec-count.forward {
          background: #f0fdf4;
          color: #166534;
          border: 1px solid #dcfce7;
        }
        .dept-section-tab-btn.active .dept-sec-count.forward {
          background: #16a34a;
          color: #ffffff;
        }
        .dept-sec-attention-pill {
          font-size: 0.7rem;
          font-weight: 800;
          background: #fef3c7;
          color: #b45309;
          border: 1px solid #fde68a;
          padding: 2px 7px;
          border-radius: 6px;
          display: inline-flex;
          align-items: center;
          gap: 3px;
        }
        @media (max-width: 640px) {
          .dept-section-tabs {
            grid-template-columns: 1fr;
            gap: 8px;
          }
        }

        /* Inputs */
        input:focus, select:focus, textarea:focus {
          transform: scale(1.01);
          border-color: #2563eb !important;
          box-shadow: 0 0 0 4px rgba(37, 99, 235, 0.1) !important;
        }

        /* Table */
        tr { transition: background-color 0.2s ease; }
        tr:hover { background-color: #f8fafc !important; }
      `}</style>
    </div>
  );
}

export default SchoolAdminDashboard;