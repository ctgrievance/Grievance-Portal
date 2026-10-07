import React, { useState, useEffect } from "react";
import RegisteredStudentsTab from "./RegisteredStudentsTab";
import RegisteredStaffTab from "./RegisteredStaffTab";
import RecordsComparisonTab from "./RecordsComparisonTab";
import { GraduationCapIcon, UsersIcon, FileIcon } from "./Icons";
import AuditLogsModal from "./AuditLogsModal";
import "../styles/Dashboard.css";

/**
 * RegisteredUsersView
 * Sleek executive directory for Verified Students and Staff accounts.
 * Includes sub-tab switcher and records vs registered comparison.
 */
function RegisteredUsersView({
  allowRegisteredStudents = false,
  allowRegisteredStaff = false,
  isSuperAdmin = false,
  studentReadOnly = false,
  staffReadOnly = false
}) {
  const canStudents = isSuperAdmin || !!allowRegisteredStudents;
  const canStaff = isSuperAdmin || !!allowRegisteredStaff;
  const canCompare = isSuperAdmin || canStudents || canStaff;

  // Determine initial active sub-tab based on permissions
  const [activeSubTab, setActiveSubTab] = useState(() => {
    if (canStudents) return "students";
    if (canStaff) return "staff";
    return "compare";
  });

  const [showLogs, setShowLogs] = useState(false);

  // Keep activeSubTab in sync if permissions change
  useEffect(() => {
    if (!canStudents && canStaff && activeSubTab === "students") {
      setActiveSubTab("staff");
    } else if (canStudents && !canStaff && activeSubTab === "staff") {
      setActiveSubTab("students");
    }
  }, [canStudents, canStaff, activeSubTab]);

  return (
    <div className="registered-users-view-container" style={{ width: "100%" }}>
      {/* Top Controls Bar: Sub-Tabs & Actions */}
      <div className="reg-users-topbar">
        <div className="reg-users-subtabs">
          {canStudents && (
            <button
              type="button"
              className={`reg-users-subtab-btn ${activeSubTab === "students" ? "active" : ""}`}
              onClick={() => setActiveSubTab("students")}
            >
              <GraduationCapIcon width="16" height="16" />
              <span>Registered Students</span>
            </button>
          )}

          {canStaff && (
            <button
              type="button"
              className={`reg-users-subtab-btn ${activeSubTab === "staff" ? "active" : ""}`}
              onClick={() => setActiveSubTab("staff")}
            >
              <UsersIcon width="16" height="16" />
              <span>Registered Staff</span>
            </button>
          )}

          {canCompare && (
            <button
              type="button"
              className={`reg-users-subtab-btn ${activeSubTab === "compare" ? "active" : ""}`}
              onClick={() => setActiveSubTab("compare")}
              title="Audit Official University Records vs Registered Accounts"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path>
                <rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect>
                <path d="m9 14 2 2 4-4"></path>
              </svg>
              <span>Records vs Registered</span>
            </button>
          )}
        </div>

        {/* Top Right Actions */}
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          {isSuperAdmin && (
            <button
              type="button"
              onClick={() => setShowLogs(true)}
              style={{
                backgroundColor: "#f8fafc",
                color: "#334155",
                border: "1px solid #cbd5e1",
                padding: "8px 14px",
                borderRadius: "8px",
                fontSize: "0.85rem",
                fontWeight: "600",
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                cursor: "pointer",
                boxShadow: "0 1px 2px rgba(0,0,0,0.05)"
              }}
              title="View data modification audit logs"
            >
              <FileIcon width="15" height="15" />
              <span>View Logs</span>
            </button>
          )}
        </div>
      </div>

      {showLogs && (
        <AuditLogsModal
          collectionName={activeSubTab === "staff" ? "StaffRecord" : "StudentRecord"}
          onClose={() => setShowLogs(false)}
        />
      )}

      {/* Sub-tab content view */}
      {activeSubTab === "students" && canStudents && (
        <RegisteredStudentsTab isReadOnly={!isSuperAdmin && studentReadOnly} />
      )}
      {activeSubTab === "staff" && canStaff && (
        <RegisteredStaffTab isReadOnly={!isSuperAdmin && staffReadOnly} />
      )}
      {activeSubTab === "compare" && canCompare && <RecordsComparisonTab />}
    </div>
  );
}

export default RegisteredUsersView;
