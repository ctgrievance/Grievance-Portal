import React from "react";

/**
 * DepartmentGrievanceSectionTabs
 * 
 * Segmented control tabs that allow department administrators to toggle between:
 * 1. Direct Grievances: submitted directly by students/complainants to this department
 * 2. Forwarded Grievances: forwarded into this department from other departments
 */
export default function DepartmentGrievanceSectionTabs({
  grievanceSection = "direct",
  setGrievanceSection,
  directCount = 0,
  forwardedCount = 0,
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

  return (
    <div className="dept-grievance-header-wrap">
      <div className="dept-grievance-title-area">
        <h2>{departmentName} Grievances</h2>
        <span className="dept-grievance-total-tag">
          Total: {directCount + forwardedCount}
        </span>
      </div>

      {/* ── 2 SECTIONS: DIRECT GRIEVANCES vs FORWARDED GRIEVANCES ── */}
      <div className="dept-section-tabs">
        <button
          type="button"
          className={`dept-section-tab-btn ${grievanceSection === "direct" ? "active" : ""}`}
          onClick={() => handleSelect("direct")}
        >
          <div className="dept-sec-btn-icon direct">📥</div>
          <div className="dept-sec-btn-text">
            <div className="dept-sec-btn-title">
              Direct Grievances
              <span className="dept-sec-count direct">{directCount}</span>
            </div>
            <small className="dept-sec-btn-sub">Directly submitted by students to {departmentName}</small>
          </div>
        </button>

        <button
          type="button"
          className={`dept-section-tab-btn ${grievanceSection === "forwarded" ? "active" : ""}`}
          onClick={() => handleSelect("forwarded")}
        >
          <div className="dept-sec-btn-icon forward">🔁</div>
          <div className="dept-sec-btn-text">
            <div className="dept-sec-btn-title">
              Forwarded Grievances
              <span className="dept-sec-count forward">{forwardedCount}</span>
              {unassignedForwardedCount > 0 && (
                <span className="dept-sec-attention-pill" title={`${unassignedForwardedCount} grievance(s) require faculty assignment`}>
                  ⚡ {unassignedForwardedCount} Action Needed
                </span>
              )}
            </div>
            <small className="dept-sec-btn-sub">Transferred from other departments</small>
          </div>
        </button>
      </div>

      {/* Informative notice when Forwarded Section is active */}
      {grievanceSection === "forwarded" && (
        <div style={{
          background: "#f0fdf4",
          border: "1px solid #bbf7d0",
          borderRadius: "8px",
          padding: "10px 14px",
          display: "flex",
          alignItems: "center",
          gap: "10px",
          fontSize: "0.82rem",
          color: "#166534"
        }}>
          <span style={{ fontSize: "1.1rem" }}>💡</span>
          <div>
            <strong>Forwarded Grievances:</strong> These complaints were transferred into {departmentName} from other departments. As department admin, you can review the forward reason and assign your faculty members manually.
          </div>
        </div>
      )}

      <style>{`
        .dept-grievance-header-wrap {
          display: flex;
          flex-direction: column;
          gap: 14px;
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
          font-size: 1.35rem;
          color: #0f172a;
          font-weight: 700;
        }
        .dept-grievance-total-tag {
          background: #f1f5f9;
          color: #475569;
          font-size: 0.8rem;
          font-weight: 700;
          padding: 4px 12px;
          border-radius: 20px;
          border: 1px solid #e2e8f0;
        }
        .dept-section-tabs {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
          background: #f8fafc;
          padding: 6px;
          border-radius: 12px;
          border: 1px solid #e2e8f0;
        }
        .dept-section-tab-btn {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 16px;
          border-radius: 10px;
          border: 1.5px solid transparent;
          background: transparent;
          cursor: pointer;
          text-align: left;
          transition: all 0.25s cubic-bezier(0.2, 0.8, 0.2, 1);
        }
        .dept-section-tab-btn:hover {
          background: #ffffff;
          border-color: #cbd5e1;
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(0,0,0,0.03);
        }
        .dept-section-tab-btn.active {
          background: #ffffff;
          border-color: #2563eb;
          box-shadow: 0 4px 14px rgba(37, 99, 235, 0.12);
        }
        .dept-sec-btn-icon {
          width: 40px;
          height: 40px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justifyContent: center;
          font-size: 1.25rem;
          flex-shrink: 0;
          transition: transform 0.2s;
        }
        .dept-section-tab-btn:hover .dept-sec-btn-icon {
          transform: scale(1.08);
        }
        .dept-sec-btn-icon.direct {
          background: #eff6ff;
          border: 1px solid #bfdbfe;
        }
        .dept-sec-btn-icon.forward {
          background: #f0fdf4;
          border: 1px solid #bbf7d0;
        }
        .dept-sec-btn-text {
          display: flex;
          flex-direction: column;
          gap: 2px;
          min-width: 0;
          flex: 1;
        }
        .dept-sec-btn-title {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 0.92rem;
          font-weight: 700;
          color: #0f172a;
          flex-wrap: wrap;
        }
        .dept-sec-btn-sub {
          font-size: 0.74rem;
          color: #64748b;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .dept-sec-count {
          display: inline-flex;
          align-items: center;
          justifyContent: center;
          font-size: 0.75rem;
          font-weight: 800;
          padding: 2px 8px;
          border-radius: 12px;
        }
        .dept-sec-count.direct {
          background: #eff6ff;
          color: #1d4ed8;
          border: 1px solid #dbeafe;
        }
        .dept-section-tab-btn.active .dept-sec-count.direct {
          background: #2563eb;
          color: #ffffff;
        }
        .dept-sec-count.forward {
          background: #f0fdf4;
          color: #166534;
          border: 1px solid #dcfce7;
        }
        .dept-section-tab-btn.active .dept-sec-count.forward {
          background: #16a34a;
          color: #ffffff;
        }
        .dept-sec-attention-pill {
          font-size: 0.7rem;
          font-weight: 800;
          background: #fef3c7;
          color: #b45309;
          border: 1px solid #fde68a;
          padding: 2px 7px;
          border-radius: 6px;
          display: inline-flex;
          align-items: center;
          gap: 3px;
        }
        @media (max-width: 640px) {
          .dept-section-tabs {
            grid-template-columns: 1fr;
            gap: 8px;
          }
        }
      `}</style>
    </div>
  );
}
