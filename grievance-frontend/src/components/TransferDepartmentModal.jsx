import React, { useState, useEffect } from "react";

const DEPARTMENTS = [
  "Accounts",
  "Student Welfare",
  "Student Section",
  "Admission",
  "Examination",
  "School of Engineering and Technology",
  "School of Management Studies",
  "School of Law",
  "School of Pharmaceutical Sciences",
  "School of Hotel Management",
  "School of Design and innovation",
  "School of Allied Health Sciences",
  "School of Social Sciences and Liberal Arts",
  "HR",
  "CRC (Placement)",
  "Transport"
];

function TransferDepartmentModal({ grievance, onClose, onTransferred }) {
  const [targetDepartment, setTargetDepartment] = useState("");
  const [issueTypes, setIssueTypes] = useState([]);
  const [targetIssueTypeId, setTargetIssueTypeId] = useState("");
  const [reason, setReason] = useState("");
  const [loadingIssues, setLoadingIssues] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const currentDept = grievance?.category || "";
  const availableDepartments = DEPARTMENTS.filter(d => d !== currentDept);

  // When target department changes, fetch issue types for that department
  useEffect(() => {
    if (!targetDepartment) {
      setIssueTypes([]);
      setTargetIssueTypeId("");
      return;
    }

    const fetchIssues = async () => {
      setLoadingIssues(true);
      setErrorMsg("");
      try {
        const res = await fetch(
          `${process.env.REACT_APP_API_URL || "http://localhost:5000"}/api/issues/department/${encodeURIComponent(targetDepartment)}`
        );
        if (res.ok) {
          const data = await res.json();
          setIssueTypes(data || []);
        } else {
          setIssueTypes([]);
        }
      } catch (err) {
        console.warn("Could not fetch issue types for department:", err);
        setIssueTypes([]);
      } finally {
        setLoadingIssues(false);
      }
    };

    fetchIssues();
  }, [targetDepartment]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!targetDepartment) {
      setErrorMsg("Please select a target department.");
      return;
    }
    if (!reason.trim() || reason.trim().length < 8) {
      setErrorMsg("Please provide a detailed reason for re-routing (at least 8 characters).");
      return;
    }

    setSubmitting(true);
    setErrorMsg("");

    try {
      const currentUserId = localStorage.getItem("grievance_id") || "STAFF";
      const currentUserName = localStorage.getItem("grievance_name") || "Staff Member";
      const currentRole = localStorage.getItem("grievance_role") || "staff";

      const payload = {
        targetDepartment,
        targetIssueTypeId: targetIssueTypeId || null,
        reason: reason.trim(),
        transferredBy: currentUserId,
        transferredByName: currentUserName,
        transferredByRole: currentRole
      };

      const res = await fetch(
        `${process.env.REACT_APP_API_URL || "http://localhost:5000"}/api/grievances/transfer/${grievance._id}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("grievance_token") || ""}`
          },
          body: JSON.stringify(payload)
        }
      );

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Failed to transfer grievance.");
      }

      if (onTransferred) {
        onTransferred(data.message, data.grievance);
      }
      onClose();
    } catch (err) {
      setErrorMsg(err.message || "Failed to re-route grievance.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        backgroundColor: "rgba(15, 23, 42, 0.7)",
        backdropFilter: "blur(6px)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        zIndex: 1100,
        padding: "16px"
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#ffffff",
          borderRadius: "16px",
          width: "100%",
          maxWidth: "520px",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          animation: "modalSlideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)"
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "20px 24px",
            background: "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)",
            color: "#ffffff",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center"
          }}
        >
          <div>
            <h3 style={{ margin: 0, fontSize: "1.2rem", fontWeight: "700", display: "flex", alignItems: "center", gap: "8px" }}>
              <span>🔁</span> Forward to Another Department
            </h3>
            <p style={{ margin: "4px 0 0 0", fontSize: "0.82rem", color: "#94a3b8" }}>
              Re-route this grievance if submitted to the wrong department
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "rgba(255, 255, 255, 0.1)",
              border: "none",
              color: "#e2e8f0",
              width: "32px",
              height: "32px",
              borderRadius: "50%",
              cursor: "pointer",
              fontSize: "1.2rem",
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}
          >
            &times;
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "16px" }}>
          {/* Grievance Summary Box */}
          <div
            style={{
              background: "#f8fafc",
              border: "1px solid #e2e8f0",
              borderRadius: "10px",
              padding: "12px 16px",
              display: "flex",
              flexDirection: "column",
              gap: "6px"
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem" }}>
              <span style={{ color: "#64748b" }}>Grievance ID:</span>
              <strong style={{ color: "#1e293b", fontFamily: "monospace" }}>#{grievance?._id?.slice(-8)}</strong>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem" }}>
              <span style={{ color: "#64748b" }}>Student:</span>
              <strong style={{ color: "#1e293b" }}>{grievance?.name} ({grievance?.userId || grievance?.regid || "N/A"})</strong>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem" }}>
              <span style={{ color: "#64748b" }}>Current Department:</span>
              <span
                style={{
                  background: "#fee2e2",
                  color: "#991b1b",
                  padding: "2px 8px",
                  borderRadius: "6px",
                  fontWeight: "700",
                  fontSize: "0.8rem"
                }}
              >
                {currentDept}
              </span>
            </div>
          </div>

          {/* Destination Department Selector */}
          <div>
            <label style={{ display: "block", marginBottom: "6px", fontSize: "0.88rem", fontWeight: "600", color: "#334155" }}>
              Select Destination Department <span style={{ color: "#ef4444" }}>*</span>
            </label>
            <select
              value={targetDepartment}
              onChange={(e) => setTargetDepartment(e.target.value)}
              required
              style={{
                width: "100%",
                padding: "10px 12px",
                borderRadius: "8px",
                border: "1.5px solid #cbd5e1",
                fontSize: "0.92rem",
                color: "#1e293b",
                backgroundColor: "#ffffff",
                outline: "none",
                cursor: "pointer"
              }}
            >
              <option value="">-- Choose Department --</option>
              {availableDepartments.map((dept) => (
                <option key={dept} value={dept}>
                  {dept}
                </option>
              ))}
            </select>
          </div>

          {/* Target Issue Type (Optional / Dynamic) */}
          {targetDepartment && (
            <div>
              <label style={{ display: "block", marginBottom: "6px", fontSize: "0.88rem", fontWeight: "600", color: "#334155" }}>
                Select Specific Issue Type in {targetDepartment} <span style={{ color: "#64748b", fontWeight: "normal" }}>(Optional)</span>
              </label>
              {loadingIssues ? (
                <p style={{ margin: 0, fontSize: "0.85rem", color: "#64748b" }}>Loading issues...</p>
              ) : (
                <select
                  value={targetIssueTypeId}
                  onChange={(e) => setTargetIssueTypeId(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    borderRadius: "8px",
                    border: "1.5px solid #cbd5e1",
                    fontSize: "0.92rem",
                    color: "#1e293b",
                    backgroundColor: "#ffffff",
                    outline: "none",
                    cursor: "pointer"
                  }}
                >
                  <option value="">⚡ Auto-assign (General / Others / Smart Routing)</option>
                  {issueTypes.map((issue) => (
                    <option key={issue._id} value={issue._id}>
                      {issue.issueName}
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}

          {/* Mandatory Reason */}
          <div>
            <label style={{ display: "block", marginBottom: "6px", fontSize: "0.88rem", fontWeight: "600", color: "#334155" }}>
              Reason for Re-routing <span style={{ color: "#ef4444" }}>*</span>
            </label>
            <textarea
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Student paid fee for bus pass, which needs to be processed by Transport department..."
              required
              style={{
                width: "100%",
                padding: "10px 12px",
                borderRadius: "8px",
                border: "1.5px solid #cbd5e1",
                fontSize: "0.9rem",
                color: "#1e293b",
                fontFamily: "inherit",
                resize: "vertical",
                outline: "none"
              }}
            />
            <span style={{ fontSize: "0.75rem", color: "#64748b", display: "block", marginTop: "2px" }}>
              This reason will be visible to the destination staff, department admin, and student.
            </span>
          </div>

          {/* Notice Callout */}
          <div
            style={{
              padding: "10px 14px",
              background: "#eff6ff",
              border: "1px solid #bfdbfe",
              borderRadius: "8px",
              fontSize: "0.82rem",
              color: "#1e40af",
              lineHeight: "1.4"
            }}
          >
            ℹ️ Upon forwarding, this grievance will be transferred out of your active dashboard and auto-assigned to the designated staff in <strong>{targetDepartment || "the destination department"}</strong> with a fresh SLA deadline.
          </div>

          {errorMsg && (
            <div
              style={{
                padding: "10px 14px",
                background: "#fef2f2",
                border: "1px solid #fecaca",
                borderRadius: "8px",
                fontSize: "0.85rem",
                color: "#dc2626",
                fontWeight: "600"
              }}
            >
              ⚠️ {errorMsg}
            </div>
          )}

          {/* Modal Footer Buttons */}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "8px" }}>
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              style={{
                padding: "10px 18px",
                borderRadius: "8px",
                border: "1px solid #cbd5e1",
                background: "#f8fafc",
                color: "#475569",
                fontWeight: "600",
                fontSize: "0.9rem",
                cursor: "pointer"
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !targetDepartment || !reason.trim()}
              style={{
                padding: "10px 22px",
                borderRadius: "8px",
                border: "none",
                background: submitting || !targetDepartment || !reason.trim() ? "#94a3b8" : "linear-gradient(135deg, #2563eb, #1d4ed8)",
                color: "#ffffff",
                fontWeight: "700",
                fontSize: "0.9rem",
                cursor: submitting || !targetDepartment || !reason.trim() ? "not-allowed" : "pointer",
                boxShadow: "0 4px 12px rgba(37, 99, 235, 0.25)"
              }}
            >
              {submitting ? "Re-routing..." : "Confirm & Forward ➔"}
            </button>
          </div>
        </form>
      </div>

      <style>{`
        @keyframes modalSlideUp {
          from { opacity: 0; transform: translateY(15px) scale(0.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  );
}

export default TransferDepartmentModal;
