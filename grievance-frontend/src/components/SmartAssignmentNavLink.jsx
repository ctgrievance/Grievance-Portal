import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { SparklesIcon } from "./Icons";

function SmartAssignmentNavLink({ department, isMobileDropdownItem = false }) {
  const [hasWarning, setHasWarning] = useState(false);

  useEffect(() => {
    if (!department) return;

    const checkWarnings = async () => {
      try {
        const apiUrl = process.env.REACT_APP_API_URL || "http://localhost:5000";
        const [issuesRes, rulesRes] = await Promise.all([
          fetch(`${apiUrl}/api/issue-types/department/${encodeURIComponent(department)}`),
          fetch(`${apiUrl}/api/routing-rules/department/${encodeURIComponent(department)}`)
        ]);

        if (issuesRes.ok && rulesRes.ok) {
          const issues = await issuesRes.json();
          const rules = await rulesRes.json();

          const activeIssues = issues.filter((i) => i.isActive);
          const activeRules = rules.filter((r) => r.isActive);

          // Check if any active issue type lacks an active routing rule
          const unroutedExists = activeIssues.some((issue) => {
            return !activeRules.some(
              (r) => r.issueTypeId?._id === issue._id || r.issueTypeId === issue._id
            );
          });

          setHasWarning(unroutedExists);
        }
      } catch (err) {
        console.error("Error checking smart assignment warnings:", err);
      }
    };

    checkWarnings();
  }, [department]);

  const WarningBadge = () => hasWarning ? (
    <span
      title="Warning: One or more categories are missing a Routing Rule!"
      style={{
        width: "8px",
        height: "8px",
        backgroundColor: "#ef4444",
        borderRadius: "50%",
        display: "inline-block",
        boxShadow: "0 0 8px rgba(239, 68, 68, 0.9)",
        border: "1.5px solid white",
        marginLeft: "4px"
      }}
    />
  ) : null;

  if (isMobileDropdownItem) {
    return (
      <Link 
        to="/admin/smart-assignment" 
        className="admin-mobile-dropdown-item"
        style={{ textDecoration: 'none' }}
      >
        <span className="admin-mitem-icon">
          <SparklesIcon width="18" height="18" />
        </span>
        <div className="admin-mitem-content">
          <div className="admin-mitem-label-wrap">
            <span className="admin-mitem-label">
              Smart Assignment <WarningBadge />
            </span>
          </div>
          <span className="admin-mitem-desc">Configure routing rules</span>
        </div>
        <span className="admin-mitem-arrow" aria-hidden="true">›</span>
      </Link>
    );
  }

  // Desktop View
  return (
    <Link
      to="/admin/smart-assignment"
      className="tab-link-button"
      style={{
        position: "relative",
        display: "inline-flex",
        alignItems: "center",
        gap: "6px"
      }}
    >
      Smart Assignment <WarningBadge />
    </Link>
  );
}

export default SmartAssignmentNavLink;
