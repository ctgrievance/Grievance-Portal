import React, { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  GraduationCapIcon,
  CreditCardIcon,
  FileIcon,
  BuildingIcon,
  BusIcon,
  CpuIcon,
  BriefcaseIcon,
  HeartIcon,
  UsersIcon,
  SparklesIcon,
  BookIcon,
  SearchIcon,
  ChevronRightIcon
} from "./Icons";

// Predefined metadata for common university departments
const DEPT_META = {
  "academic department": {
    category: "academic",
    subtitle: "Course curriculum, faculty, classes & attendance",
    icon: GraduationCapIcon,
    color: "#6366f1",
    bg: "#eef2ff"
  },
  "department": {
    category: "academic",
    subtitle: "School-specific academic matters & classes",
    icon: GraduationCapIcon,
    color: "#6366f1",
    bg: "#eef2ff"
  },
  "examination": {
    category: "academic",
    subtitle: "Datesheets, admit cards, re-evaluation & grades",
    icon: FileIcon,
    color: "#f59e0b",
    bg: "#fef3c7"
  },
  "research and development": {
    category: "academic",
    subtitle: "Research projects, patents & paper approvals",
    icon: BookIcon,
    color: "#4f46e5",
    bg: "#e0e7ff"
  },
  "accounts": {
    category: "finance",
    subtitle: "Fee receipts, fee dues, fine waivers & refunds",
    icon: CreditCardIcon,
    color: "#0284c7",
    bg: "#e0f2fe"
  },
  "admission": {
    category: "admin",
    subtitle: "Document verification, enrollment & ID numbers",
    icon: GraduationCapIcon,
    color: "#8b5cf6",
    bg: "#f3e8ff"
  },
  "student section": {
    category: "admin",
    subtitle: "ID cards, bonafide & character certificates",
    icon: UsersIcon,
    color: "#0d9488",
    bg: "#ccfbf1"
  },
  "hr": {
    category: "admin",
    subtitle: "Staff coordination & administrative queries",
    icon: BriefcaseIcon,
    color: "#475569",
    bg: "#f1f5f9"
  },
  "hostel": {
    category: "facilities",
    subtitle: "Room allotment, mess food, cleanliness & leave",
    icon: BuildingIcon,
    color: "#ec4899",
    bg: "#fce7f3"
  },
  "transport": {
    category: "facilities",
    subtitle: "Bus routes, timings, bus passes & drivers",
    icon: BusIcon,
    color: "#10b981",
    bg: "#d1fae5"
  },
  "information technology": {
    category: "facilities",
    subtitle: "Campus Wi-Fi, portal login, email & lab systems",
    icon: CpuIcon,
    color: "#06b6d4",
    bg: "#cffafe"
  },
  "civil wing": {
    category: "facilities",
    subtitle: "Classroom furniture, washrooms & repairs",
    icon: BuildingIcon,
    color: "#ea580c",
    bg: "#ffedd5"
  },
  "electrical": {
    category: "facilities",
    subtitle: "Power cuts, ACs, cooling, fans & wiring",
    icon: SparklesIcon,
    color: "#eab308",
    bg: "#fef9c3"
  },
  "sports": {
    category: "facilities",
    subtitle: "Sports kits, ground booking, gym & events",
    icon: SparklesIcon,
    color: "#16a34a",
    bg: "#dcfce7"
  },
  "student welfare": {
    category: "support",
    subtitle: "Mental health, clubs, anti-ragging & wellness",
    icon: HeartIcon,
    color: "#ef4444",
    bg: "#fee2e2"
  },
  "crc (placement)": {
    category: "support",
    subtitle: "Internships, placement drives & career training",
    icon: BriefcaseIcon,
    color: "#2563eb",
    bg: "#dbeafe"
  },
  "crc": {
    category: "support",
    subtitle: "Internships, placement drives & career training",
    icon: BriefcaseIcon,
    color: "#2563eb",
    bg: "#dbeafe"
  },
  "placement": {
    category: "support",
    subtitle: "Internships, placement drives & career training",
    icon: BriefcaseIcon,
    color: "#2563eb",
    bg: "#dbeafe"
  }
};

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

const CATEGORY_TABS = [
  { key: "all", label: "All Services" },
  { key: "academic", label: "Academic" },
  { key: "finance", label: "Fees & Admin" },
  { key: "facilities", label: "Campus Facilities" },
  { key: "support", label: "Support & Welfare" }
];

export default function StudentServiceGrid({ departments = [] }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");

  // Format department objects into card items
  const serviceCards = useMemo(() => {
    const list = [];
    const hasAcademic = departments.some((d) => d.isAcademic);

    // 1. Academic department entry (School selection)
    if (hasAcademic) {
      list.push({
        id: "academic-dept",
        name: "Academic Department",
        url: "/student/department",
        category: "academic",
        subtitle: DEPT_META["academic department"].subtitle,
        IconComponent: DEPT_META["academic department"].icon,
        color: DEPT_META["academic department"].color,
        bg: DEPT_META["academic department"].bg
      });
    }

    // 2. All non-academic departments
    const nonAcademic = departments.filter((d) => !d.isAcademic);
    nonAcademic.forEach((dept) => {
      const lower = dept.name.trim().toLowerCase();
      const meta = DEPT_META[lower] || {
        category: "facilities",
        subtitle: dept.description || "Submit your grievance to this department",
        icon: BuildingIcon,
        color: "#6366f1",
        bg: "#eef2ff"
      };

      const url = ROUTE_MAP[lower] || `/student/submit/${encodeURIComponent(dept.name)}`;

      list.push({
        id: dept._id || dept.name,
        name: dept.name,
        url,
        category: meta.category,
        subtitle: meta.subtitle,
        IconComponent: meta.icon,
        color: meta.color,
        bg: meta.bg
      });
    });

    return list;
  }, [departments]);

  // Filter based on search and active category tab
  const filteredServices = useMemo(() => {
    return serviceCards.filter((item) => {
      // Category match
      if (activeCategory !== "all" && item.category !== activeCategory) {
        return false;
      }
      // Search match
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        return (
          item.name.toLowerCase().includes(query) ||
          item.subtitle.toLowerCase().includes(query)
        );
      }
      return true;
    });
  }, [serviceCards, activeCategory, searchQuery]);

  return (
    <section id="lodge-grievance-section" className="service-grid-section">
      <div className="service-grid-header">
        <div className="service-grid-title-wrap">
          <h2>Lodge a Grievance</h2>
          <p>Select a department below to quickly submit your grievance or query</p>
        </div>

        {/* Quick Search */}
        <div className="service-search-wrap">
          <SearchIcon width="16" height="16" className="search-icon" />
          <input
            type="text"
            placeholder="Search service (e.g. Fees, Hostel, Exam)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="service-search-input"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="clear-search-btn"
              title="Clear search"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Category Pills Bar */}
      <div className="service-category-pills">
        {CATEGORY_TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            className={`category-pill ${activeCategory === tab.key ? "active" : ""}`}
            onClick={() => setActiveCategory(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Cards Grid */}
      {filteredServices.length === 0 ? (
        <div className="service-grid-empty">
          <p>No departments match "{searchQuery}"</p>
          <button
            type="button"
            onClick={() => {
              setSearchQuery("");
              setActiveCategory("all");
            }}
            className="reset-search-btn"
          >
            Show All Departments
          </button>
        </div>
      ) : (
        <div className="service-grid-container">
          {filteredServices.map((service) => {
            const Icon = service.IconComponent;
            return (
              <Link
                key={service.id}
                to={service.url}
                className="service-card"
                title={`Submit grievance for ${service.name}`}
              >
                <div
                  className="service-card-icon-wrap"
                  style={{ backgroundColor: service.bg, color: service.color }}
                >
                  <Icon width="24" height="24" />
                </div>
                <div className="service-card-content">
                  <h3 className="service-card-title">{service.name}</h3>
                  <p className="service-card-subtitle">{service.subtitle}</p>
                </div>
                <div className="service-card-arrow">
                  <ChevronRightIcon width="18" height="18" />
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </section>
  );
}
