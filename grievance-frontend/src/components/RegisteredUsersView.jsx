import React, { useState, useEffect } from "react";
import RegisteredStudentsTab from "./RegisteredStudentsTab";
import RegisteredStaffTab from "./RegisteredStaffTab";

/**
 * RegisteredUsersView
 * A unified view containing both Registered Students and Registered Staff sub-tabs.
 * Displays sub-tab buttons styled like the Makhan UI tabs (Recent Activity & Verifications style).
 * Sub-tabs are dynamically shown and restricted based on department permissions.
 */
function RegisteredUsersView({
  allowRegisteredStudents = false,
  allowRegisteredStaff = false,
  isSuperAdmin = false
}) {
  const canStudents = isSuperAdmin || !!allowRegisteredStudents;
  const canStaff = isSuperAdmin || !!allowRegisteredStaff;

  // Determine initial active sub-tab based on permissions
  const [activeSubTab, setActiveSubTab] = useState(() => {
    if (canStudents) return "students";
    if (canStaff) return "staff";
    return "students";
  });

  // Keep activeSubTab in sync if permissions change
  useEffect(() => {
    if (!canStudents && canStaff) {
      setActiveSubTab("staff");
    } else if (canStudents && !canStaff) {
      setActiveSubTab("students");
    }
  }, [canStudents, canStaff]);

  return (
    <div className="registered-users-view-container" style={{ width: "100%" }}>
      {/* Tab Switcher Header (Identical Makhan UI styling from user's screenshot) */}
      <div className="dashboard-tabs" style={{ marginBottom: "24px" }}>
        {canStudents && (
          <button
            type="button"
            onClick={() => setActiveSubTab("students")}
            className={`tab-btn ${activeSubTab === "students" ? "active" : ""}`}
            style={{ fontSize: "0.95rem" }}
          >
            Registered Students
          </button>
        )}

        {canStaff && (
          <button
            type="button"
            onClick={() => setActiveSubTab("staff")}
            className={`tab-btn ${activeSubTab === "staff" ? "active" : ""}`}
            style={{ fontSize: "0.95rem" }}
          >
            Registered Staff
          </button>
        )}
      </div>

      {/* Sub-tab content view */}
      {activeSubTab === "students" && canStudents && <RegisteredStudentsTab />}
      {activeSubTab === "staff" && canStaff && <RegisteredStaffTab />}
    </div>
  );
}

export default RegisteredUsersView;
