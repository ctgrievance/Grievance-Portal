import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { getDeptAdminRoute } from "../App";
import { ShieldIcon } from "./Icons";

function DepartmentSwitcher({ currentDepartment, onDepartmentChange }) {
  const navigate = useNavigate();
  const [departments, setDepartments] = useState([]);
  const [activeDept, setActiveDept] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const isMasterAdmin = localStorage.getItem("is_master_admin") === "true";

  useEffect(() => {
    try {
      const storedDepts = JSON.parse(localStorage.getItem("admin_departments")) || [];
      const currentStored = currentDepartment || localStorage.getItem("admin_department") || "";
      setDepartments(storedDepts);
      setActiveDept(currentStored);
    } catch (err) {
      console.warn("Error parsing admin_departments:", err);
    }

    // Auto-sync departments from backend in case the user didn't re-login after being assigned
    const syncLatestDepartments = async () => {
      try {
        const userId = localStorage.getItem("grievance_id");
        const token = localStorage.getItem("grievance_token");
        if (!userId || isMasterAdmin) return;

        const res = await fetch(`${process.env.REACT_APP_API_URL || "http://localhost:5000"}/api/admin-staff/all`, {
          headers: token ? { "Authorization": `Bearer ${token}` } : {}
        });
        if (res.ok) {
          const staffList = await res.json();
          const me = staffList.find(s => String(s.id).toUpperCase() === String(userId).toUpperCase());
          if (me && Array.isArray(me.adminDepartments) && me.adminDepartments.length > 0) {
            localStorage.setItem("admin_departments", JSON.stringify(me.adminDepartments));
            setDepartments(me.adminDepartments);
          }
        }
      } catch (err) {
        // Silent fallback
      }
    };

    syncLatestDepartments();
  }, [currentDepartment, isMasterAdmin]);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // ONLY show when the admin has TWO OR MORE departments!
  if (isMasterAdmin || departments.length <= 1) {
    return null;
  }

  const handleSwitch = (newDept) => {
    setIsOpen(false);
    if (!newDept || newDept === activeDept) return;

    setActiveDept(newDept);
    localStorage.setItem("admin_department", newDept);

    if (onDepartmentChange) {
      onDepartmentChange(newDept);
    }

    const targetRoute = getDeptAdminRoute(newDept);
    window.location.href = targetRoute;
  };

  return (
    <div
      ref={dropdownRef}
      className="department-switcher-wrapper"
      style={{ position: "relative", display: "inline-block", marginLeft: "10px", zIndex: 1010 }}
    >
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "8px",
          background: "#ffffff",
          color: "#334155",
          border: isOpen ? "1px solid #6366f1" : "1px solid #cbd5e1",
          borderRadius: "20px",
          padding: "0.42rem 0.9rem",
          fontSize: "0.85rem",
          fontWeight: "600",
          cursor: "pointer",
          boxShadow: isOpen ? "0 0 0 3px rgba(99, 102, 241, 0.15)" : "0 1px 3px rgba(0, 0, 0, 0.06)",
          transition: "all 0.2s ease",
          whiteSpace: "nowrap"
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = "translateY(-1px)";
          e.currentTarget.style.background = "#eff6ff";
          e.currentTarget.style.borderColor = "#93c5fd";
          e.currentTarget.style.boxShadow = "0 2px 6px rgba(37, 99, 235, 0.12)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = "translateY(0)";
          e.currentTarget.style.background = "#ffffff";
          e.currentTarget.style.borderColor = isOpen ? "#6366f1" : "#cbd5e1";
          e.currentTarget.style.boxShadow = isOpen ? "0 0 0 3px rgba(99, 102, 241, 0.15)" : "0 1px 3px rgba(0, 0, 0, 0.06)";
        }}
        title="Click to switch department dashboard"
      >
        <ShieldIcon width="15" height="15" color="#4f46e5" />
        <span>Dept: <strong style={{ color: "#4f46e5", fontWeight: "700" }}>{activeDept || "Select"}</strong></span>
        <span style={{ fontSize: "0.7rem", color: "#64748b", marginLeft: "2px" }}>
          {isOpen ? "▲" : "▼"}
        </span>
      </button>

      {isOpen && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 8px)",
            left: "0",
            minWidth: "280px",
            width: "max-content",
            maxWidth: "340px",
            background: "#ffffff",
            borderRadius: "12px",
            border: "1px solid #e2e8f0",
            boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.18), 0 10px 10px -5px rgba(0, 0, 0, 0.08)",
            padding: "8px 0",
            zIndex: 99999,
            animation: "fadeIn 0.15s ease-out"
          }}
        >
          <div
            style={{
              padding: "6px 16px 8px",
              fontSize: "0.72rem",
              fontWeight: "700",
              color: "#94a3b8",
              textTransform: "uppercase",
              letterSpacing: "0.5px",
              borderBottom: "1px solid #f1f5f9"
            }}
          >
            Switch Department
          </div>

          <div style={{ padding: "4px 0" }}>
            {departments.map((dept) => {
              const isActive = dept === activeDept;
              return (
                <div
                  key={dept}
                  onClick={() => handleSwitch(dept)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "10px 16px",
                    cursor: "pointer",
                    fontSize: "0.85rem",
                    fontWeight: isActive ? "700" : "500",
                    color: isActive ? "#0284c7" : "#334155",
                    background: isActive ? "#f0f9ff" : "transparent",
                    transition: "background 0.15s ease",
                    gap: "16px",
                    whiteSpace: "nowrap"
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) e.currentTarget.style.background = "#f8fafc";
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) e.currentTarget.style.background = "transparent";
                  }}
                >
                  <span style={{ display: "flex", alignItems: "center", gap: "8px", whiteSpace: "nowrap" }}>
                    <span>🏢</span>
                    <span style={{ whiteSpace: "nowrap" }}>{dept}</span>
                  </span>
                  {isActive ? (
                    <span
                      style={{
                        background: "#0284c7",
                        color: "#ffffff",
                        borderRadius: "10px",
                        padding: "2px 8px",
                        fontSize: "0.72rem",
                        fontWeight: "700",
                        whiteSpace: "nowrap",
                        flexShrink: 0
                      }}
                    >
                      ✓ Active
                    </span>
                  ) : (
                    <span style={{ fontSize: "0.78rem", color: "#94a3b8", whiteSpace: "nowrap", flexShrink: 0 }}>
                      Switch →
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default DepartmentSwitcher;
