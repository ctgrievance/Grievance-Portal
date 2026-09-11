import React, { useState, useEffect } from "react";
import RegisteredStudentsTab from "./RegisteredStudentsTab";
import RegisteredStaffTab from "./RegisteredStaffTab";
import { DownloadIcon, GraduationCapIcon, UsersIcon, AlertCircleIcon, CheckCircleIcon } from "./Icons";

/**
 * RegisteredUsersView
 * Sleek executive directory for Verified Students and Staff accounts.
 * Includes sub-tab switcher and one-click direct Excel export.
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

  const [exporting, setExporting] = useState(false);
  const [exportMsg, setExportMsg] = useState("");
  const [exportMsgType, setExportMsgType] = useState("success");

  // Keep activeSubTab in sync if permissions change
  useEffect(() => {
    if (!canStudents && canStaff) {
      setActiveSubTab("staff");
    } else if (canStudents && !canStaff) {
      setActiveSubTab("students");
    }
  }, [canStudents, canStaff]);

  const handleExportUsers = async () => {
    setExporting(true);
    setExportMsg("");
    const token = localStorage.getItem("grievance_token");

    try {
      const res = await fetch(
        `${process.env.REACT_APP_API_URL || "http://localhost:5000"}/api/admin/export-users`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `users_directory_export_${new Date().toISOString().split("T")[0]}.xlsx`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);

        setExportMsg("User directory exported successfully.");
        setExportMsgType("success");
        setTimeout(() => setExportMsg(""), 4000);
      } else {
        const errData = await res.json().catch(() => ({}));
        setExportMsg(errData.message || "Failed to export user records.");
        setExportMsgType("error");
        setTimeout(() => setExportMsg(""), 4500);
      }
    } catch (err) {
      console.error("Export Error:", err);
      setExportMsg("Server error occurred while exporting records.");
      setExportMsgType("error");
      setTimeout(() => setExportMsg(""), 4500);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="registered-users-view-container" style={{ width: "100%" }}>
      {/* Top Controls Bar: Sub-Tabs & Direct Excel Export */}
      <div className="reg-users-topbar">
        <div className="reg-users-subtabs">
          {canStudents && (
            <button
              type="button"
              onClick={() => setActiveSubTab("students")}
              className={`reg-users-subtab-btn ${activeSubTab === "students" ? "active" : ""}`}
            >
              <GraduationCapIcon width="16" height="16" />
              <span>Registered Students</span>
            </button>
          )}

          {canStaff && (
            <button
              type="button"
              onClick={() => setActiveSubTab("staff")}
              className={`reg-users-subtab-btn ${activeSubTab === "staff" ? "active" : ""}`}
            >
              <UsersIcon width="16" height="16" />
              <span>Registered Staff</span>
            </button>
          )}
        </div>

        {/* Export Button (Available to Super Admin) */}
        {isSuperAdmin && (
          <div className="reg-users-export-wrapper">
            <button
              type="button"
              className="reg-users-export-btn"
              onClick={handleExportUsers}
              disabled={exporting}
              title="Download full user directory as Excel spreadsheet"
            >
              <DownloadIcon width="15" height="15" />
              <span>{exporting ? "Exporting..." : "Export Users (.xlsx)"}</span>
            </button>
          </div>
        )}
      </div>

      {/* Export Notification Banner if triggered */}
      {exportMsg && (
        <div
          className={`reg-users-alert ${exportMsgType === "error" ? "error" : "success"}`}
          style={{ marginBottom: "16px" }}
        >
          {exportMsgType === "error" ? (
            <AlertCircleIcon width="16" height="16" />
          ) : (
            <CheckCircleIcon width="16" height="16" />
          )}
          <span>{exportMsg}</span>
        </div>
      )}

      {/* Sub-tab content view */}
      {activeSubTab === "students" && canStudents && <RegisteredStudentsTab />}
      {activeSubTab === "staff" && canStaff && <RegisteredStaffTab />}
    </div>
  );
}

export default RegisteredUsersView;
