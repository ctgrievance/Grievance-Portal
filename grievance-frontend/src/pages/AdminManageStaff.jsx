import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/Dashboard.css";
import ctLogo from "../assets/ct-logo.png";
import { ShieldIcon, AdminIcon, ArrowLeftIcon } from "../components/Icons";
import ProfileHeaderButton from "../components/ProfileHeaderButton";
import StaffRoleManager from "../components/StaffRoleManager";
import { getDeptAdminRoute } from "../App";

const AdminManageStaff = () => {
  const navigate = useNavigate();
  const userId = localStorage.getItem("grievance_id")?.toUpperCase();
  const role = localStorage.getItem("grievance_role")?.toLowerCase();
  const isMaster = localStorage.getItem("is_master_admin") === "true";
  const myDepartment = localStorage.getItem("admin_department") || "";
  const isDeptAdmin = localStorage.getItem("is_dept_admin") === "true";

  useEffect(() => {
    // Only Admin or Dept Admin allowed
    if (role !== "admin" && !isDeptAdmin) {
      navigate("/");
    }
  }, [role, isDeptAdmin, navigate]);

  const handleLogout = () => {
    localStorage.clear();
    navigate("/");
  };

  return (
    <div className="dashboard-container">
      <header className="dashboard-header admin-dashboard-header">
        <div className="admin-header-brand-wrap">
          <img src={ctLogo} alt="CT University" className="admin-header-logo" />
          <div className="header-content">
            <h1>Staff & Role Management</h1>
            <p className="admin-header-user-info">
              Logged in as: <strong>{userId}</strong>
              {myDepartment ? (
                <span className="admin-master-badge">
                  <ShieldIcon width="12" height="12" /> {myDepartment}
                </span>
              ) : (
                <span className="admin-master-badge">
                  <AdminIcon width="12" height="12" /> Master Admin
                </span>
              )}
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

      {/* Navigation bar */}
      <nav className="navbar admin-navbar">
        <div className="admin-nav-container">
          <ul className="admin-nav-tabs">
            <li className="active" style={{ cursor: "pointer" }} onClick={() => navigate(isMaster ? "/admin/dashboard" : getDeptAdminRoute(myDepartment))}>
              <span className="tab-link-button">
                <ArrowLeftIcon width="16" height="16" /> Back to Dashboard
              </span>
            </li>
          </ul>
        </div>
      </nav>

      <main className="dashboard-body">
        <StaffRoleManager />
      </main>
    </div>
  );
};

export default AdminManageStaff;