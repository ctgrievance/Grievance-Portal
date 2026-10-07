import React from "react";
import { InboxIcon, ArrowRightLeftIcon, RerouteIcon, GraduationCapIcon } from "./Icons";

/**
 * DepartmentGrievanceSectionTabs
 * 
 * Unified Grievance Hub segmented control (Super Admin aesthetic):
 * 1. Direct Grievances: submitted directly to this department
 * 2. Transferred In: transferred into this department from other departments (Action queue)
 * 3. Transferred Out: transferred out from this department to other departments (Outgoing tracker)
 * 4. Our Students' Grievances (optional): submitted by students of this school across campus
 */
export default function DepartmentGrievanceSectionTabs({
  grievanceSection = "direct",
  setGrievanceSection,
  directCount = 0,
  forwardedCount = 0,
  trackerCount = null,
  showTracker = true,
  studentGrievancesCount = null,
  unassignedForwardedCount = 0,
  departmentName = "Department",
  onTabChange
}) {
  const handleSelect = (section) => {
    if (setGrievanceSection) {
      setGrievanceSection(section);
    }
    if (onTabChange) {
      onTabChange(section);
    }
  };

  const hasStudentSection = typeof studentGrievancesCount === "number";

  return (
    <div className="dept-grievance-header-wrap">
      <div className="dept-grievance-title-area">
        <h2>{departmentName} Grievances</h2>
        <span className="dept-grievance-total-tag">
          Total: {grievanceSection === "student_grievances" ? (studentGrievancesCount || 0) : (directCount + forwardedCount)}
        </span>
      </div>

      {/* ── UNIFIED GRIEVANCE HUB SEGMENTED TABS (SUPER ADMIN SLEEK STYLE) ── */}
      <div className="dept-section-tabs" role="tablist">
        {/* TAB 1: DIRECT GRIEVANCES */}
        <button
          type="button"
          role="tab"
          aria-selected={grievanceSection === "direct"}
          className={`dept-section-tab-btn ${grievanceSection === "direct" ? "active" : ""}`}
          onClick={() => handleSelect("direct")}
        >
          <InboxIcon width="15" height="15" className="dept-sec-svg" />
          <span className="dept-sec-label">Direct Grievances</span>
          <span className="dept-sec-count direct">{directCount}</span>
        </button>

        {/* TAB 2: TRANSFERRED IN (FORWARDED) */}
        <button
          type="button"
          role="tab"
          aria-selected={grievanceSection === "forwarded" || grievanceSection === "transferred_in"}
          className={`dept-section-tab-btn ${(grievanceSection === "forwarded" || grievanceSection === "transferred_in") ? "active" : ""}`}
          onClick={() => handleSelect("forwarded")}
        >
          <ArrowRightLeftIcon width="15" height="15" className="dept-sec-svg" />
          <span className="dept-sec-label">Transferred In</span>
          <span className="dept-sec-count forward">{forwardedCount}</span>
          {unassignedForwardedCount > 0 && (
            <span className="dept-sec-attention-pill" title={`${unassignedForwardedCount} grievance(s) require faculty assignment`}>
              <span className="dept-sec-pulse-dot" />
              <span className="dept-sec-action-text">{unassignedForwardedCount} Action Needed</span>
              <span className="dept-sec-action-short">{unassignedForwardedCount}</span>
            </span>
          )}
        </button>

        {/* TAB 3: TRANSFERRED OUT (INTER-DEPT TRACKER) */}
        {showTracker && (
          <button
            type="button"
            role="tab"
            aria-selected={grievanceSection === "outgoing_tracker" || grievanceSection === "tracker"}
            className={`dept-section-tab-btn ${(grievanceSection === "outgoing_tracker" || grievanceSection === "tracker") ? "active" : ""}`}
            onClick={() => handleSelect("outgoing_tracker")}
          >
            <RerouteIcon width="15" height="15" className="dept-sec-svg" />
            <span className="dept-sec-label">Transferred Out</span>
            {trackerCount !== null && trackerCount !== undefined && (
              <span className="dept-sec-count tracker">{trackerCount}</span>
            )}
          </button>
        )}

        {/* TAB 4: OUR STUDENTS' GRIEVANCES (FOR ACADEMIC SCHOOLS) */}
        {hasStudentSection && (
          <button
            type="button"
            role="tab"
            aria-selected={grievanceSection === "student_grievances"}
            className={`dept-section-tab-btn ${grievanceSection === "student_grievances" ? "active" : ""}`}
            onClick={() => handleSelect("student_grievances")}
          >
            <GraduationCapIcon width="15" height="15" className="dept-sec-svg" />
            <span className="dept-sec-label">Our Students' Grievances</span>
            <span className="dept-sec-count student-out">{studentGrievancesCount}</span>
          </button>
        )}
      </div>

      <style>{`
        .dept-grievance-header-wrap {
          display: flex;
          flex-direction: column;
          gap: 12px;
          margin-bottom: 16px;
        }
        .dept-grievance-title-area {
          display: flex;
          align-items: center;
          justifyContent: space-between;
          flex-wrap: wrap;
          gap: 10px;
        }
        .dept-grievance-title-area h2 {
          margin: 0;
          font-size: 1.3rem;
          color: #0f172a;
          font-weight: 700;
          letter-spacing: -0.01em;
        }
        .dept-grievance-total-tag {
          background: #f1f5f9;
          color: #475569;
          font-size: 0.78rem;
          font-weight: 700;
          padding: 3px 10px;
          border-radius: 20px;
          border: 1px solid #e2e8f0;
        }
        
        /* ── SLEEK SEGMENTED TABS (SUPER ADMIN MATCH) ── */
        .dept-section-tabs {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          background: #f1f5f9;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          padding: 4px;
          width: fit-content;
          max-width: 100%;
          box-sizing: border-box;
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
        }
        .dept-section-tab-btn {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          padding: 6px 14px;
          font-size: 0.84rem;
          font-weight: 500;
          color: #64748b;
          background: transparent;
          border: 1px solid transparent;
          border-radius: 6px;
          cursor: pointer;
          white-space: nowrap;
          transition: all 0.15s ease;
          user-select: none;
        }
        .dept-section-tab-btn:hover {
          color: #0f172a;
          background: rgba(255, 255, 255, 0.6);
        }
        .dept-section-tab-btn.active {
          background: #ffffff;
          color: #0f172a;
          font-weight: 600;
          border-color: #e2e8f0;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06), 0 1px 2px rgba(0, 0, 0, 0.04);
        }
        .dept-sec-svg {
          flex-shrink: 0;
          opacity: 0.75;
          transition: opacity 0.15s ease, color 0.15s ease;
        }
        .dept-section-tab-btn:hover .dept-sec-svg {
          opacity: 1;
        }
        .dept-section-tab-btn.active .dept-sec-svg {
          opacity: 1;
          color: #2563eb;
        }
        .dept-sec-count {
          display: inline-flex;
          align-items: center;
          justifyContent: center;
          font-size: 0.72rem;
          font-weight: 700;
          padding: 1px 6px;
          border-radius: 10px;
          min-width: 18px;
          line-height: 1.25;
          background: #e2e8f0;
          color: #475569;
          transition: all 0.15s ease;
        }
        .dept-section-tab-btn.active .dept-sec-count.direct {
          background: #eff6ff;
          color: #1d4ed8;
          border: 1px solid #bfdbfe;
        }
        .dept-section-tab-btn.active .dept-sec-count.forward {
          background: #f0fdf4;
          color: #166534;
          border: 1px solid #bbf7d0;
        }
        .dept-section-tab-btn.active .dept-sec-count.tracker {
          background: #eef2ff;
          color: #4f46e5;
          border: 1px solid #c7d2fe;
        }
        .dept-section-tab-btn.active .dept-sec-count.student-out {
          background: #fefce8;
          color: #854d0e;
          border: 1px solid #fef08a;
        }
        .dept-sec-attention-pill {
          font-size: 0.68rem;
          font-weight: 700;
          background: #fef3c7;
          color: #92400e;
          border: 1px solid #fde68a;
          padding: 1px 6px;
          border-radius: 6px;
          display: inline-flex;
          align-items: center;
          gap: 4px;
          margin-left: 2px;
          line-height: 1.2;
        }
        .dept-sec-pulse-dot {
          width: 5px;
          height: 5px;
          border-radius: 50%;
          background: #d97706;
          display: inline-block;
        }
        .dept-sec-action-short {
          display: none;
        }

        /* ── MOBILE OPTIMIZATION (< 640px) ── */
        @media (max-width: 640px) {
          .dept-section-tabs {
            width: 100%;
            display: flex;
            padding: 3px;
          }
          .dept-section-tab-btn {
            flex: 1;
            padding: 6px 6px;
            font-size: 0.76rem;
            gap: 4px;
            justifyContent: center;
          }
          .dept-sec-action-text {
            display: none;
          }
          .dept-sec-action-short {
            display: inline;
          }
        }
        @media (max-width: 480px) {
          .dept-sec-svg {
            display: none;
          }
          .dept-section-tab-btn {
            padding: 6px 3px;
            font-size: 0.72rem;
          }
        }
      `}</style>
    </div>
  );
}
