import React, { useState, useEffect, useRef, useMemo } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  ArrowLeftIcon,
  ChevronDownIcon,
  SearchIcon,
  HomeIcon,
  FileIcon,
  UserIcon,
  SparklesIcon
} from "./Icons";

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
  const navigate = useNavigate();
  const currentPath = location.pathname.toLowerCase();
  const searchParams = new URLSearchParams(location.search);
  const currentDeptParam = (searchParams.get("dept") || "").toLowerCase();

  const [departments, setDepartments] = useState(() => {
    try {
      const cached = sessionStorage.getItem("cached_student_depts");
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });

  const [isSwitcherOpen, setIsSwitcherOpen] = useState(false);
  const [switcherSearch, setSwitcherSearch] = useState("");
  const switcherRef = useRef(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (switcherRef.current && !switcherRef.current.contains(e.target)) {
        setIsSwitcherOpen(false);
      }
    };
    if (isSwitcherOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isSwitcherOpen]);

  useEffect(() => {
    const fetchDepts = async () => {
      try {
        const res = await fetch(
          `${process.env.REACT_APP_API_URL || "http://localhost:5000"}/api/departments`
        );
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data)) {
            const studentDepts = data.filter(
              (d) => d.targetAudience === "both" || d.targetAudience === "student" || !d.targetAudience
            );
            setDepartments(studentDepts);
            try {
              sessionStorage.setItem("cached_student_depts", JSON.stringify(studentDepts));
            } catch (e) {
              // ignore
            }
          }
        }
      } catch (err) {
        console.warn("Could not load student departments for navbar:", err);
      }
    };
    fetchDepts();
  }, []);

  // Helper to determine destination URL for a department
  const getDeptUrl = (dept) => {
    const cleanName = dept.name.trim().toLowerCase();
    if (ROUTE_MAP[cleanName]) return ROUTE_MAP[cleanName];
    if (dept.isAcademic) return "/student/department";
    return `/student/submit/${encodeURIComponent(dept.name)}`;
  };

  // Determine current active display name
  const currentDisplayName = useMemo(() => {
    if (activeCategory) {
      // capitalize
      return activeCategory.charAt(0).toUpperCase() + activeCategory.slice(1);
    }
    if (currentPath === "/student/department") return "Academic Department";
    if (currentPath === "/student/admission") return "Admission";
    if (currentPath === "/student/examination") return "Examination";
    if (currentPath === "/student/accounts") return "Accounts";
    if (currentPath === "/student/section") return "Student Section";
    if (currentPath === "/student/welfare") return "Student Welfare";
    if (currentPath === "/student/crc") return "CRC (Placement)";
    if (currentPath === "/student/transport") return "Transport";
    if (currentPath === "/student/hr") return "HR";
    if (currentDeptParam) return currentDeptParam.charAt(0).toUpperCase() + currentDeptParam.slice(1);

    const submitMatch = currentPath.match(/\/student\/submit\/(.+)/);
    if (submitMatch) {
      return decodeURIComponent(submitMatch[1]);
    }
    return "Grievance";
  }, [activeCategory, currentPath, currentDeptParam]);

  const isDashboard = currentPath === "/student/dashboard";

  // List of all departments for switcher
  const allDeptItems = useMemo(() => {
    const list = [];
    if (departments && departments.length > 0) {
      const hasAcademic = departments.some((d) => d.isAcademic);
      if (hasAcademic) {
        list.push({ name: "Academic Department", url: "/student/department" });
      }
      departments.filter((d) => !d.isAcademic).forEach((d) => {
        list.push({ name: d.name, url: getDeptUrl(d) });
      });
      return list;
    }
    return [
      { name: "Academic Department", url: "/student/department" },
      { name: "Admission", url: "/student/admission" },
      { name: "Examination", url: "/student/examination" },
      { name: "Accounts", url: "/student/accounts" },
      { name: "Student Section", url: "/student/section" },
      { name: "Student Welfare", url: "/student/welfare" },
      { name: "CRC (Placement)", url: "/student/crc" },
      { name: "Transport", url: "/student/transport" },
      { name: "HR", url: "/student/hr" },
    ];
  }, [departments]);

  const filteredDeptItems = useMemo(() => {
    if (!switcherSearch.trim()) return allDeptItems;
    return allDeptItems.filter((d) =>
      d.name.toLowerCase().includes(switcherSearch.toLowerCase())
    );
  }, [allDeptItems, switcherSearch]);

  // Smooth scroll handler on dashboard
  const scrollToSection = (sectionId) => {
    const el = document.getElementById(sectionId);
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
  };

  // 1️⃣ DASHBOARD VIEW: Sleek & Compact Bar
  if (isDashboard) {
    return (
      <nav className="navbar student-dashboard-navbar">
        <ul className="student-compact-nav-list">
          <li className="active">
            <Link to="/student/dashboard" className="student-nav-pill-link">
              <HomeIcon width="16" height="16" />
              <span>Dashboard</span>
            </Link>
          </li>
          <li>
            <button
              type="button"
              onClick={() => scrollToSection("lodge-grievance-section")}
              className="student-nav-pill-button accent"
            >
              <SparklesIcon width="16" height="16" />
              <span>Lodge Grievance</span>
            </button>
          </li>
          <li>
            <button
              type="button"
              onClick={() => scrollToSection("recent-activity-section")}
              className="student-nav-pill-button"
            >
              <FileIcon width="16" height="16" />
              <span>Recent Activity</span>
            </button>
          </li>
          <li>
            <Link to="/profile" className="student-nav-pill-link">
              <UserIcon width="16" height="16" />
              <span>My Profile</span>
            </Link>
          </li>
        </ul>
      </nav>
    );
  }

  // 2️⃣ GRIEVANCE FORM VIEW: App-Style Header with Back & Switcher
  return (
    <nav className="navbar student-form-navbar">
      <div className="student-form-nav-container">
        {/* Left: Back Button */}
        <Link to="/student/dashboard" className="student-nav-back-link" title="Back to Dashboard">
          <ArrowLeftIcon width="18" height="18" />
          <span className="back-text">Dashboard</span>
        </Link>

        {/* Center: Breadcrumb / Active Department */}
        <div className="student-nav-center-badge">
          <span className="breadcrumb-path">Dashboard</span>
          <span className="breadcrumb-sep">/</span>
          <span className="breadcrumb-current-name">{currentDisplayName}</span>
        </div>

        {/* Right: Switch Department Dropdown */}
        <div className="student-nav-switcher-wrap" ref={switcherRef}>
          <button
            type="button"
            className={`student-nav-switcher-btn ${isSwitcherOpen ? "open" : ""}`}
            onClick={() => setIsSwitcherOpen(!isSwitcherOpen)}
            title="Switch to another department"
          >
            <span>Change Department</span>
            <ChevronDownIcon width="15" height="15" />
          </button>

          {isSwitcherOpen && (
            <div className="student-nav-switcher-dropdown">
              <div className="switcher-search-box">
                <SearchIcon width="14" height="14" />
                <input
                  type="text"
                  placeholder="Search department..."
                  value={switcherSearch}
                  onChange={(e) => setSwitcherSearch(e.target.value)}
                  autoFocus
                />
              </div>

              <div className="switcher-options-list">
                {filteredDeptItems.map((dept) => {
                  const isActive =
                    dept.name.toLowerCase() === currentDisplayName.toLowerCase();
                  return (
                    <button
                      key={dept.name}
                      type="button"
                      className={`switcher-option-item ${isActive ? "active" : ""}`}
                      onClick={() => {
                        setIsSwitcherOpen(false);
                        navigate(dept.url);
                      }}
                    >
                      <span>{dept.name}</span>
                      {isActive && <span className="current-dot">•</span>}
                    </button>
                  );
                })}
                {filteredDeptItems.length === 0 && (
                  <div className="switcher-no-results">No departments found</div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}

export default StudentNavbar;
