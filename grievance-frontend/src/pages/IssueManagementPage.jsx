import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/Dashboard.css";
import IssueManagementPanel from "../components/IssueManagementPanel";
import RoutingRuleConfig from "../components/RoutingRuleConfig";
import ctLogo from "../assets/ct-logo.png";
import { ShieldIcon } from "../components/Icons";
import ProfileHeaderButton from "../components/ProfileHeaderButton";

function IssueManagementPage() {
  const navigate = useNavigate();
  const role = localStorage.getItem("grievance_role")?.toLowerCase();
  const adminDept = localStorage.getItem("admin_department");
  const isDeptAdmin = localStorage.getItem("is_dept_admin") === "true";
  const isMasterAdmin = localStorage.getItem("is_master_admin") === "true";

  const [activeTab, setActiveTab] = useState("issues");

  const [departments, setDepartments] = useState([]);
  const [selectedDepartment, setSelectedDepartment] = useState(adminDept || "Accounts");

  useEffect(() => {
    // Only Department Admins and Master Admin can access
    if (!isDeptAdmin && !isMasterAdmin) {
      navigate("/");
    }
  }, [isDeptAdmin, isMasterAdmin, navigate]);

  // Fetch departments if Master Admin
  useEffect(() => {
    if (isMasterAdmin) {
      const fetchDepts = async () => {
        try {
          const res = await fetch(`${process.env.REACT_APP_API_URL || "http://localhost:5000"}/api/departments`);
          if (res.ok) {
            const data = await res.json();
            if (Array.isArray(data) && data.length > 0) {
              setDepartments(data);
              if (!adminDept) {
                setSelectedDepartment(data[0].name);
              }
            }
          }
        } catch (err) {
          console.warn("Could not load departments for Smart Assignment:", err);
        }
      };
      fetchDepts();
    }
  }, [isMasterAdmin, adminDept]);

  const handleLogout = () => {
    localStorage.clear();
    navigate("/");
  };

  const activeDepartmentToUse = isMasterAdmin ? selectedDepartment : adminDept;

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <div style={{ display: "flex", alignItems: "center", gap: "15px" }}>
          <img src={ctLogo} alt="CT University" style={{ height: "50px" }} />
          <div className="header-content">
            <h1>Smart Assignment Configuration</h1>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginTop: "5px" }}>
              {isMasterAdmin ? (
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{ fontSize: "0.9rem", color: "#64748b", fontWeight: "600" }}>Department:</span>
                  <select
                    value={selectedDepartment}
                    onChange={(e) => setSelectedDepartment(e.target.value)}
                    style={{
                      padding: "4px 10px",
                      borderRadius: "6px",
                      border: "1px solid #cbd5e1",
                      fontSize: "0.9rem",
                      fontWeight: "600",
                      background: "#fff",
                      color: "#1e293b"
                    }}
                  >
                    {departments.map((d) => (
                      <option key={d._id || d.name} value={d.name}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <p style={{ margin: 0 }}>
                  Department: <strong>{adminDept}</strong>
                </p>
              )}
              <span className="status-badge status-resolved" style={{ fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                <ShieldIcon width="14" height="14" /> {isMasterAdmin ? "Master Admin" : "Department Admin"}
              </span>
            </div>
          </div>
          <ProfileHeaderButton />
        </div>
        <button className="logout-btn-header" onClick={handleLogout}>
          Logout
        </button>
      </header>

      <nav className="navbar">
        <ul>
          <li className={activeTab === "issues" ? "active" : ""}>
            <button onClick={() => setActiveTab("issues")} className="tab-link-button">
              Issue Types
            </button>
          </li>
          <li className={activeTab === "routing" ? "active" : ""}>
            <button onClick={() => setActiveTab("routing")} className="tab-link-button">
              Routing Rules
            </button>
          </li>
          <li style={{ marginLeft: 'auto' }}>
            <button onClick={() => navigate(-1)} className="tab-link-button">
              ⬅ Back
            </button>
          </li>
        </ul>
      </nav>

      <main className="dashboard-body">
        {activeTab === "issues" && (
          <IssueManagementPanel department={activeDepartmentToUse} />
        )}
        {activeTab === "routing" && (
          <RoutingRuleConfig department={activeDepartmentToUse} />
        )}
      </main>
    </div>
  );
}

export default IssueManagementPage;
