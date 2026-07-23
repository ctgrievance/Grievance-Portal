import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";

function SmartAssignmentNavLink({ department }) {
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

  return (
    <Link
      to="/admin/smart-assignment"
      style={{
        position: "relative",
        display: "inline-flex",
        alignItems: "center",
        gap: "6px"
      }}
    >
      Smart Assignment
      {hasWarning && (
        <span
          title="Warning: One or more categories are missing a Routing Rule!"
          style={{
            width: "10px",
            height: "10px",
            backgroundColor: "#ef4444",
            borderRadius: "50%",
            display: "inline-block",
            boxShadow: "0 0 8px rgba(239, 68, 68, 0.9)",
            border: "1.5px solid white"
          }}
        />
      )}
    </Link>
  );
}

export default SmartAssignmentNavLink;
