import React from "react";
import { InboxIcon, ArrowRightLeftIcon, RerouteIcon, GraduationCapIcon, AlertCircleIcon } from "./Icons";

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

      {/* ── UNIFIED GRIEVANCE HUB SEGMENTED TABS (RESPONSIVE NO-SLIDE) ── */}
      <div
        className={`dept-section-tabs ${
          hasStudentSection
            ? "tabs-count-4"
            : showTracker
            ? "tabs-count-3"
            : "tabs-count-2"
        }`}
        role="tablist"
      >
        {/* TAB 1: DIRECT GRIEVANCES */}
        <button
          type="button"
          role="tab"
          aria-selected={grievanceSection === "direct"}
          className={`dept-section-tab-btn ${grievanceSection === "direct" ? "active" : ""}`}
          onClick={() => handleSelect("direct")}
        >
          <InboxIcon width="14" height="14" className="dept-sec-svg" />
          <span className="dept-sec-label">
            Direct<span className="dept-sec-label-extra"> Grievances</span>
          </span>
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
          <ArrowRightLeftIcon width="14" height="14" className="dept-sec-svg" />
          <span className="dept-sec-label">Transferred In</span>
          <span className="dept-sec-count forward">{forwardedCount}</span>
          {unassignedForwardedCount > 0 && (
            <span
              className="dept-sec-attention-symbol"
              title={`${unassignedForwardedCount} Action Needed: Unassigned grievance requiring faculty assignment`}
            >
              <AlertCircleIcon width="11" height="11" />
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
            <RerouteIcon width="14" height="14" className="dept-sec-svg" />
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
            <GraduationCapIcon width="14" height="14" className="dept-sec-svg" />
            <span className="dept-sec-label">
              Our Students<span className="dept-sec-label-extra">' Grievances</span>
            </span>
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
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 8px 12px;
        }
        .dept-grievance-title-area h2 {
          margin: 0;
          font-size: 1.25rem;
          color: #0f172a;
          font-weight: 700;
          letter-spacing: -0.01em;
          line-height: 1.3;
        }
        .dept-grievance-total-tag {
          background: #f1f5f9;
          color: #475569;
          font-size: 0.78rem;
          font-weight: 700;
          padding: 3px 10px;
          border-radius: 20px;
          border: 1px solid #e2e8f0;
          white-space: nowrap;
        }
        
        /* ── DESKTOP TABS ── */
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
          justify-content: center;
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
        .dept-sec-attention-symbol {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 17px;
          height: 17px;
          border-radius: 50%;
          background: #fef3c7;
          color: #b45309;
          border: 1px solid #fde68a;
          flex-shrink: 0;
          margin-left: 2px;
          animation: attentionPulse 2s infinite ease-in-out;
          transition: transform 0.15s ease, background 0.15s ease;
          cursor: pointer;
        }
        .dept-sec-attention-symbol:hover {
          transform: scale(1.15);
          background: #fde68a;
          color: #92400e;
        }
        @keyframes attentionPulse {
          0%, 100% {
            box-shadow: 0 0 0 0 rgba(217, 119, 6, 0.4);
          }
          50% {
            box-shadow: 0 0 0 3px rgba(217, 119, 6, 0);
          }
        }

        /* ── ZERO-SLIDE RESPONSIVE GRID ON MOBILE (NO SCROLLING NEEDED) ── */
        @media (max-width: 768px) {
          .dept-section-tabs {
            display: grid !important;
            grid-template-columns: repeat(2, 1fr) !important;
            width: 100% !important;
            max-width: 100% !important;
            gap: 6px !important;
            padding: 5px !important;
            overflow: visible !important;
            overflow-x: hidden !important;
            box-sizing: border-box !important;
          }
          .dept-section-tab-btn {
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            width: 100% !important;
            min-width: 0 !important;
            padding: 8px 6px !important;
            font-size: 0.78rem !important;
            gap: 5px !important;
            box-sizing: border-box !important;
            white-space: nowrap !important;
          }
          /* When there are 3 tabs, the 3rd tab spans full width */
          .dept-section-tabs.tabs-count-3 .dept-section-tab-btn:nth-child(3) {
            grid-column: span 2 !important;
          }
          .dept-sec-label-extra {
            display: none !important;
          }
        }
        @media (max-width: 420px) {
          .dept-section-tabs {
            gap: 4px !important;
            padding: 4px !important;
          }
          .dept-section-tab-btn {
            padding: 7px 3px !important;
            font-size: 0.72rem !important;
            gap: 4px !important;
          }
          .dept-sec-svg {
            width: 13px !important;
            height: 13px !important;
          }
          .dept-sec-count {
            font-size: 0.68rem !important;
            padding: 0px 4px !important;
            min-width: 16px !important;
          }
        }
      `}</style>
    </div>
  );
}
