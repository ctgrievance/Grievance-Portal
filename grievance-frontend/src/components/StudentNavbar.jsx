import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";

// Standard route mapping for legacy department pages
const ROUTE_MAP = {
  "student welfare": "/student/welfare",
  "admission": "/student/admission",
  "student section": "/student/section",
  "accounts": "/student/accounts",
  "examination": "/student/examination",
  "hr": "/student/hr",
  "crc (placement)": "/student/crc",
  "crc": "/student/crc",
  "placement": "/student/crc",
  "transport": "/student/transport"
};

function StudentNavbar({ activeCategory = "" }) {
  const location = useLocation();
  const [departments, setDepartments] = useState([]);

  useEffect(() => {
    const fetchDepts = async () => {
      try {
        const res = await fetch(
          `${process.env.REACT_APP_API_URL || "http://localhost:5000"}/api/departments`
        );
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data)) {
            // Filter out staff-only departments so students only see relevant departments
            const studentDepts = data.filter(
              (d) => d.targetAudience === "both" || d.targetAudience === "student" || !d.targetAudience
            );
            setDepartments(studentDepts);
          }
        }
      } catch (err) {
        console.warn("Could not load student departments for navbar:", err);
      }
    };
    fetchDepts();
  }, []);

  const currentPath = location.pathname.toLowerCase();
  const searchParams = new URLSearchParams(location.search);
  const currentDeptParam = (searchParams.get("dept") || "").toLowerCase();

  // Helper to determine destination URL for a department
  const getDeptUrl = (dept) => {
    const cleanName = dept.name.trim().toLowerCase();
    if (ROUTE_MAP[cleanName]) {
      return ROUTE_MAP[cleanName];
    }
    if (dept.isAcademic) {
      return "/student/department";
    }
    // Universal dynamic route for custom/new departments (e.g. xyz, hostel, etc.)
    return `/student/submit/${encodeURIComponent(dept.name)}`;
  };

  // Helper to determine if a department tab is currently active
  const isDeptActive = (dept) => {
    const cleanName = dept.name.trim().toLowerCase();
    const mappedRoute = ROUTE_MAP[cleanName];

    if (activeCategory && activeCategory.toLowerCase() === cleanName) {
      return true;
    }

    if (mappedRoute && currentPath.startsWith(mappedRoute)) {
      return true;
    }

    if (dept.isAcademic && currentPath === "/student/department") {
      return true;
    }

    if (currentPath.startsWith("/student/submit")) {
      if (currentPath.includes(encodeURIComponent(dept.name).toLowerCase())) return true;
      if (currentDeptParam === cleanName) return true;
    }

    return false;
  };

  // Group academic schools under "Academic Department" if multiple exist,
  // or show non-academic departments individually
  const nonAcademicDepts = departments.filter((d) => !d.isAcademic);
  const hasAcademicDepts = departments.some((d) => d.isAcademic);

  return (
    <nav className="navbar">
      <ul>
        <li className={currentPath === "/student/dashboard" ? "active" : ""}>
          <Link to="/student/dashboard">Dashboard</Link>
        </li>

        {/* Academic Schools grouped under Department */}
        {hasAcademicDepts && (
          <li className={currentPath === "/student/department" ? "active" : ""}>
            <Link to="/student/department">Department</Link>
          </li>
        )}

        {/* All dynamic & standard non-academic departments */}
        {nonAcademicDepts.map((dept) => {
          const url = getDeptUrl(dept);
          const active = isDeptActive(dept);

          return (
            <li key={dept._id || dept.name} className={active ? "active" : ""}>
              <Link to={url}>{dept.name}</Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export default StudentNavbar;
