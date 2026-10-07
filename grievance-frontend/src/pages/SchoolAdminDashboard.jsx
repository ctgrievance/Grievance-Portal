import React, { useEffect, useState, useMemo } from "react";
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
import DepartmentGrievanceSectionTabs from "../components/DepartmentGrievanceSectionTabs";
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

// Helper to check if a department name matches the admin's own school/department
const isOwnSchool = (deptName, mySchool) => {
  if (!deptName || !mySchool) return false;
  const d = deptName.trim().toLowerCase().replace(/\s*-\s*\d+$/, "").replace(/\s+/g, " ");
  const m = mySchool.trim().toLowerCase().replace(/\s*-\s*\d+$/, "").replace(/\s+/g, " ");
  return d === m || d.includes(m) || m.includes(d);
};

function SchoolAdminDashboard() {
  const navigate = useNavigate();
  const userId = localStorage.getItem("grievance_id")?.toUpperCase();

  const mySchoolName = localStorage.getItem("admin_department");
  const isAuthorized = !!mySchoolName;

  const [activeTab, setActiveTab] = useState("grievances");
  const {
    allowStudentRecords,
    studentRecordsMode,
    allowStaffRecords,
    staffRecordsMode,
    allowRegisteredStudents,
    registeredStudentsMode,
    allowRegisteredStaff,
    registeredStaffMode
  } = useDepartmentPermissions(mySchoolName);

  // Data States
  const [grievances, setGrievances] = useState([]);
  const [studentGrievances, setStudentGrievances] = useState([]);
  const [staffMap, setStaffMap] = useState({});
  const [grievanceSection, setGrievanceSection] = useState("direct"); // "direct" | "forwarded" | "student_grievances"

  // ✅ FILTER STATES
  const [searchId, setSearchId] = useState("");
  const [searchStaffId, setSearchStaffId] = useState(""); // Search by Staff ID
  const [statusFilter, setStatusFilter] = useState("All");
  const [filterDepartment, setFilterDepartment] = useState("All"); // ✅ Department Filter for Student Grievances
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
      fetchStudentGrievances();
      fetchStaffNames();
    }
  }, [navigate, isAuthorized]);

  const fetchMySchoolGrievances = async () => {
    try {
      const category = encodeURIComponent(mySchoolName);
      const res = await fetch(`${process.env.REACT_APP_API_URL || "http://localhost:5000"}/api/grievances/category/${category}`);
      if (res.ok) {
        const data = await res.json();
        const prevScrollY = window.scrollY || window.pageYOffset;
        setGrievances(data);
        requestAnimationFrame(() => window.scrollTo(0, prevScrollY));
      } else console.error("Failed to fetch grievances");
    } catch (error) {
      console.error(error);
    }
  };

  const fetchStudentGrievances = async () => {
    try {
      const category = encodeURIComponent(mySchoolName);
      const res = await fetch(`${process.env.REACT_APP_API_URL || "http://localhost:5000"}/api/grievances/by-student-school/${category}`);
      if (res.ok) {
        const data = await res.json();
        setStudentGrievances(data);
      } else console.error("Failed to fetch student grievances");
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

  // ✅ 2 SECTIONS: DIRECT GRIEVANCES vs OUR STUDENTS' GRIEVANCES
  const { directGrievances, forwardedGrievances, unassignedForwardedCount } = splitGrievancesByOrigin(grievances, mySchoolName);

  // ✅ OPTION 1: Strictly isolate external student grievances (held by other campus departments)
  // This avoids duplicating grievances that are already handled within our school in Direct or Transferred In tabs.
  const externalStudentGrievances = useMemo(() => {
    return studentGrievances.filter((g) => {
      const currentDept = g.currentCustodian?.department || g.category || "";
      // Exclude grievances currently held by or categorized under our own school
      if (isOwnSchool(currentDept, mySchoolName) || isOwnSchool(g.category, mySchoolName)) {
        return false;
      }
      return true;
    });
  }, [studentGrievances, mySchoolName]);

  const currentSectionGrievances =
    grievanceSection === "student_grievances"
      ? externalStudentGrievances
      : grievanceSection === "forwarded"
      ? forwardedGrievances
      : directGrievances;

  // ✅ Departments where our students have grievances, excluding our own school/department
  const studentDepartments = useMemo(() => {
    const map = new Map();

    externalStudentGrievances.forEach((g) => {
      const candidates = [
        g.category,
        g.currentCustodian?.department,
        g.originatingDepartment,
        ...(g.involvedDepartments || []),
        ...(g.transferHistory?.map((t) => t.toDepartment) || []),
        ...(g.transferHistory?.map((t) => t.fromDepartment) || []),
      ].filter(Boolean);

      candidates.forEach((deptRaw) => {
        const dept = deptRaw.trim();
        if (!dept) return;

        // Exclude own school / department
        if (!isOwnSchool(dept, mySchoolName)) {
          const norm = dept.toLowerCase();
          if (!map.has(norm)) {
            map.set(norm, dept);
          }
        }
      });
    });

    return Array.from(map.values()).sort((a, b) => a.localeCompare(b));
  }, [externalStudentGrievances, mySchoolName]);

  // ✅ FILTER LOGIC
  const filteredGrievances = currentSectionGrievances.filter((g) => {
    const q = (searchId || searchStaffId || "").toLowerCase().trim();
    const matchSearch = !q ||
      (g.userId || "").toLowerCase().includes(q) ||
      (g.name || "").toLowerCase().includes(q) ||
      (g.category || "").toLowerCase().includes(q) ||
      (g.assignedTo || "").toLowerCase().includes(q) ||
      (staffMap[g.assignedTo] || "").toLowerCase().includes(q) ||
      (g.subject || "").toLowerCase().includes(q) ||
      (g.description || "").toLowerCase().includes(q);

    const matchStatus = statusFilter === "All" || g.status === statusFilter;

    // Department match (especially for Our Students' Grievances)
    let matchDept = true;
    if (filterDepartment && filterDepartment !== "All") {
      const selected = filterDepartment.trim().toLowerCase();
      const associatedDepts = [
        g.category,
        g.currentCustodian?.department,
        g.originatingDepartment,
        ...(g.involvedDepartments || []),
        ...(g.transferHistory?.map((t) => t.toDepartment) || [])
      ].filter(Boolean);

      matchDept = associatedDepts.some((d) => {
        const norm = d.trim().toLowerCase();
        return norm === selected || norm.includes(selected) || selected.includes(norm);
      });
    }

    let matchMonth = true;
    if (filterMonth) {
      const gDate = new Date(g.createdAt);
      const [year, month] = filterMonth.split("-");
      matchMonth = gDate.getFullYear() === parseInt(year) && (gDate.getMonth() + 1) === parseInt(month);
    }

    return matchSearch && matchStatus && matchDept && matchMonth;
  });

  const resetFilters = () => {
    setSearchId("");
    setSearchStaffId("");
    setStatusFilter("All");
    setFilterDepartment("All");
    setFilterMonth("");
  };
  const handleOpenExportModal = () => setShowExportModal(true);
  const handleExportSelected = (selectedData, selectedColumns, customName) => {
    const token = localStorage.getItem("grievance_token");
    const dateStr = new Date().toISOString().split('T')[0];
    const sectionSuffix =
      grievanceSection === "student_grievances"
        ? "student_grievances"
        : grievanceSection === "forwarded"
        ? "forwarded_grievances"
        : "direct_grievances";
    const defaultPrefix = `${(mySchoolName || "school").toLowerCase().replace(/\s+/g, '_')}_${sectionSuffix}`;
    const rawName = (customName && customName.trim()) ? customName.trim() : defaultPrefix;
    const safeBase = rawName.replace(/[*?:/\\\[\]]/g, "").trim().replace(/\s+/g, "_") || defaultPrefix;
    const fileName = `${safeBase}_${dateStr}.xlsx`;
    const sheetName = rawName;

    fetch(`${process.env.REACT_APP_API_URL || "http://localhost:5000"}/api/grievances/export-selected`, {
      method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ grievanceIds: selectedData.map((g) => g._id), columns: selectedColumns, sheetName, fileName }),
    }).then((res) => { if (!res.ok) throw new Error(); return res.blob(); })
      .then((blob) => {
        const url = window.URL.createObjectURL(blob); const a = document.createElement("a");
        a.href = url; a.download = fileName;
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
        {activeTab === "student_records" && <AdminStudentRecords isReadOnly={studentRecordsMode === "read"} />}
        {activeTab === "staff_records" && <StaffRecordsTab isReadOnly={staffRecordsMode === "read"} />}
        {activeTab === "registered_users" && (allowRegisteredStudents || allowRegisteredStaff) && (
          <RegisteredUsersView
            allowRegisteredStudents={allowRegisteredStudents}
            allowRegisteredStaff={allowRegisteredStaff}
            studentReadOnly={registeredStudentsMode === "read"}
            staffReadOnly={registeredStaffMode === "read"}
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
            <DepartmentGrievanceSectionTabs
              grievanceSection={grievanceSection}
              setGrievanceSection={setGrievanceSection}
              directCount={directGrievances.length}
              forwardedCount={forwardedGrievances.length}
              studentGrievancesCount={externalStudentGrievances.length}
              unassignedForwardedCount={unassignedForwardedCount}
              departmentName={mySchoolName}
              showTracker={true}
              onTabChange={() => resetFilters()}
            />

            {/* ✅ Feedback Message Alert Box */}
            {msg && <div className={`alert-box ${statusType}`}>{msg}</div>}

            {(grievanceSection === "outgoing_tracker" || grievanceSection === "tracker") ? (
              <InterDepartmentTracker
                departmentName={mySchoolName}
                staffMap={staffMap}
                onSelectGrievance={setSelectedGrievance}
                embedded={true}
              />
            ) : (
              <>
                {/* ✅ MODERN RESPONSIVE FILTER BAR */}
            <DepartmentFilterBar
              searchId={searchId}
              setSearchId={setSearchId}
              searchStaffId={searchStaffId}
              setSearchStaffId={setSearchStaffId}
              searchPlaceholder="Search by Student ID, Staff ID, Name..."
              statusFilter={statusFilter}
              setStatusFilter={setStatusFilter}
              filterDepartment={filterDepartment}
              setFilterDepartment={grievanceSection === "student_grievances" ? setFilterDepartment : undefined}
              departments={studentDepartments}
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
                    ? (grievanceSection === "student_grievances"
                        ? `No grievances submitted by ${mySchoolName} students to other departments yet.`
                        : (grievanceSection === "forwarded" || grievanceSection === "transferred_in")
                            ? "No transferred grievances received from other departments."
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
                isForwardedSection={grievanceSection === "forwarded" || grievanceSection === "transferred_in"}
                isStudentSection={grievanceSection === "student_grievances"}
                currentDepartment={mySchoolName}
              />
            )}
              </>
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
        /* Inputs */
        input:focus, select:focus, textarea:focus {
          transform: scale(1.01);
          border-color: #2563eb !important;
          box-shadow: 0 0 0 4px rgba(37, 99, 235, 0.1) !important;
        }

        /* Table */
        tr { transition: background-color 0.2s ease; }
        tr:hover { background-color: #f8fafc !important; }

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