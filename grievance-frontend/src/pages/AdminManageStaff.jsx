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
      <header className="dashboard-header">
        <div style={{ display: "flex", alignItems: "center", gap: "15px" }}>
          <img src={ctLogo} alt="CT University" style={{ height: "50px" }} />
          <div className="header-content">
            <h1>Staff & Role Management</h1>
            <p>
              Logged in as: <strong>{userId}</strong>
              {myDepartment ? (
                <span
                  className="status-badge status-assigned"
                  style={{
                    marginLeft: "10px",
                    fontSize: "0.8rem",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "5px"
                  }}
                >
                  <ShieldIcon width="14" height="14" /> {myDepartment}
                </span>
              ) : (
                <span
                  className="status-badge status-resolved"
                  style={{
                    marginLeft: "10px",
                    fontSize: "0.8rem",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "5px"
                  }}
                >
                  <AdminIcon width="14" height="14" /> Master Admin
                </span>
              )}
            </p>
          </div>
          <ProfileHeaderButton />
        </div>
        <button className="logout-btn-header" onClick={handleLogout}>
          Logout
        </button>
      </header>

      {/* Navigation bar */}
      <nav className="navbar">
        <ul>
          <li className="admin-nav-title">
            <span>{isMaster ? "Master Admin Panel" : `${myDepartment} Admin`}</span>
          </li>
          <li>
            <button
              type="button"
              className="tab-link-button"
              style={{ display: "inline-flex", alignItems: "center", gap: "6px", cursor: "pointer", background: "none", border: "none" }}
              onClick={() => navigate(isMaster ? "/admin/dashboard" : getDeptAdminRoute(myDepartment))}
            >
              <ArrowLeftIcon width="14" height="14" /> Back to Dashboard
            </button>
          </li>
        </ul>
      </nav>

      <main className="dashboard-body">
        <StaffRoleManager />
      </main>
    </div>
  );
};

export default AdminManageStaff;