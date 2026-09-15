import React, { useState, useEffect, useCallback } from "react";
import {
  GraduationCapIcon,
  UsersIcon,
  SearchIcon,
  XIcon,
  RefreshIcon,
  DownloadIcon,
  CheckCircleIcon,
  AlertCircleIcon,
  MailIcon,
  PhoneIcon,
  SpinnerIcon
} from "./Icons";

export default function RecordsComparisonTab() {
  const [cohort, setCohort] = useState("students"); // "students" | "staff"
  const [statusFilter, setStatusFilter] = useState("all"); // "all" | "registered" | "not_registered"
  const [search, setSearch] = useState("");
  const [department, setDepartment] = useState("all");
  const [page, setPage] = useState(1);
  const [limit] = useState(25);

  const [records, setRecords] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [summary, setSummary] = useState({
    totalRecords: 0,
    totalRegistered: 0,
    totalNotRegistered: 0,
    registrationRate: "0%"
  });
  const [departmentsList, setDepartmentsList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [msg, setMsg] = useState("");
  const [msgType, setMsgType] = useState("info");

  const BASE_URL = `${process.env.REACT_APP_API_URL || "http://localhost:5000"}/api/registered-users/compare`;

  const showNotification = (message, type = "info") => {
    setMsg(message);
    setMsgType(type);
    setTimeout(() => {
      setMsg("");
      setMsgType("");
    }, 4500);
  };

  const fetchComparison = useCallback(async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams({
        type: cohort,
        status: statusFilter,
        search: search.trim(),
        department,
        page: page.toString(),
        limit: limit.toString()
      });

      const res = await fetch(`${BASE_URL}?${queryParams.toString()}`);
      if (!res.ok) throw new Error("Failed to load comparison records");
      const data = await res.json();

      setRecords(data.records || []);
      setTotal(data.total || 0);
      setTotalPages(data.totalPages || 1);
      if (data.summary) {
        setSummary(data.summary);
      }
      if (Array.isArray(data.departments)) {
        setDepartmentsList(data.departments);
      }
    } catch (err) {
      console.error("Comparison fetch error:", err);
      showNotification(err.message || "Failed to fetch comparison", "error");
    } finally {
      setLoading(false);
    }
  }, [cohort, statusFilter, search, department, page, limit, BASE_URL]);

  useEffect(() => {
    fetchComparison();
  }, [fetchComparison]);

  // Cohort switch resets filters and page
  const handleCohortChange = (newCohort) => {
    if (newCohort === cohort) return;
    setCohort(newCohort);
    setStatusFilter("all");
    setSearch("");
    setDepartment("all");
    setPage(1);
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const queryParams = new URLSearchParams({
        type: cohort,
        status: statusFilter,
        search: search.trim(),
        department,
        export: "true"
      });

      const res = await fetch(`${BASE_URL}?${queryParams.toString()}`);
      if (!res.ok) throw new Error("Failed to generate Excel export");

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const dateStr = new Date().toISOString().split("T")[0];
      a.download = `${cohort === "students" ? "Students" : "Staff"}_Comparison_${statusFilter}_${dateStr}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      showNotification(`Excel report downloaded successfully for ${cohort}.`, "success");
    } catch (err) {
      console.error("Export error:", err);
      showNotification(err.message || "Failed to export Excel report", "error");
    } finally {
      setExporting(false);
    }
  };

  const calculatePct = (part, whole) => {
    if (!whole || whole === 0) return 0;
    return Math.round((part / whole) * 100);
  };

  return (
    <div style={{ width: "100%", animation: "fadeIn 0.2s ease" }}>
      
      {/* ── TOP COHORT SWITCHER & TITLE ── */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "14px",
          marginBottom: "18px"
        }}
      >
        <div>
          <h3 style={{ margin: 0, fontSize: "1.2rem", fontWeight: 700, color: "#0f172a" }}>
            Records vs Registered Accounts
          </h3>
          <p style={{ margin: "3px 0 0", fontSize: "0.84rem", color: "#64748b" }}>
            Audit and verify which official university records have activated portal accounts
          </p>
        </div>

        {/* Cohort Selector (Students vs Staff) */}
        <div
          className="reg-compare-cohort-wrap"
          style={{
            display: "inline-flex",
            background: "#f1f5f9",
            borderRadius: "10px",
            padding: "4px",
            border: "1px solid #e2e8f0"
          }}
        >
          <button
            type="button"
            onClick={() => handleCohortChange("students")}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "7px",
              padding: "7px 14px",
              borderRadius: "7px",
              border: "none",
              fontSize: "0.83rem",
              fontWeight: 600,
              cursor: "pointer",
              background: cohort === "students" ? "#ffffff" : "transparent",
              color: cohort === "students" ? "#0f172a" : "#64748b",
              boxShadow: cohort === "students" ? "0 1px 4px rgba(0, 0, 0, 0.08)" : "none",
              transition: "all 0.15s ease"
            }}
          >
            <GraduationCapIcon width="15" height="15" />
            <span>Student Records</span>
          </button>

          <button
            type="button"
            onClick={() => handleCohortChange("staff")}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "7px",
              padding: "7px 14px",
              borderRadius: "7px",
              border: "none",
              fontSize: "0.83rem",
              fontWeight: 600,
              cursor: "pointer",
              background: cohort === "staff" ? "#ffffff" : "transparent",
              color: cohort === "staff" ? "#0f172a" : "#64748b",
              boxShadow: cohort === "staff" ? "0 1px 4px rgba(0, 0, 0, 0.08)" : "none",
              transition: "all 0.15s ease"
            }}
          >
            <UsersIcon width="15" height="15" />
            <span>Staff / Faculty Records</span>
          </button>
        </div>
      </div>

      {/* ── NOTIFICATION BANNER ── */}
      {msg && (
        <div
          className={`reg-users-alert ${msgType === "error" ? "error" : "success"}`}
          style={{ marginBottom: "16px" }}
        >
          {msgType === "error" ? (
            <AlertCircleIcon width="16" height="16" />
          ) : (
            <CheckCircleIcon width="16" height="16" />
          )}
          <span>{msg}</span>
        </div>
      )}

      {/* ── KPI EXECUTIVE SUMMARY STATS ── */}
      <div className="reg-compare-kpi-grid">
        {/* Card 1: Master Records */}
        <div
          style={{
            background: "#ffffff",
            border: "1px solid #e2e8f0",
            borderLeft: "4px solid #6366f1",
            borderRadius: "10px",
            padding: "12px 14px",
            boxShadow: "0 1px 3px rgba(0,0,0,0.03)"
          }}
        >
          <span style={{ fontSize: "0.72rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.04em" }}>
            Total Master Records
          </span>
          <div className="kpi-num" style={{ fontSize: "1.5rem", fontWeight: 800, color: "#0f172a", marginTop: "3px" }}>
            {summary.totalRecords.toLocaleString()}
          </div>
          <span style={{ fontSize: "0.72rem", color: "#94a3b8" }}>
            Official validation dataset
          </span>
        </div>

        {/* Card 2: Registered */}
        <div
          style={{
            background: "#ffffff",
            border: "1px solid #e2e8f0",
            borderLeft: "4px solid #10b981",
            borderRadius: "10px",
            padding: "12px 14px",
            boxShadow: "0 1px 3px rgba(0,0,0,0.03)"
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "0.72rem", fontWeight: 700, color: "#059669", textTransform: "uppercase", letterSpacing: "0.04em" }}>
              Registered on Portal
            </span>
            <span style={{ background: "#dcfce7", color: "#15803d", fontSize: "0.7rem", fontWeight: 700, padding: "1px 6px", borderRadius: "999px" }}>
              {summary.registrationRate}
            </span>
          </div>
          <div className="kpi-num" style={{ fontSize: "1.5rem", fontWeight: 800, color: "#0f172a", marginTop: "3px" }}>
            {summary.totalRegistered.toLocaleString()}
          </div>
          <span style={{ fontSize: "0.72rem", color: "#16a34a" }}>
            Active verified accounts
          </span>
        </div>

        {/* Card 3: Not Registered */}
        <div
          style={{
            background: "#ffffff",
            border: "1px solid #e2e8f0",
            borderLeft: "4px solid #f43f5e",
            borderRadius: "10px",
            padding: "12px 14px",
            boxShadow: "0 1px 3px rgba(0,0,0,0.03)"
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "0.72rem", fontWeight: 700, color: "#e11d48", textTransform: "uppercase", letterSpacing: "0.04em" }}>
              Not Registered Yet
            </span>
            <span style={{ background: "#ffe4e6", color: "#be123c", fontSize: "0.7rem", fontWeight: 700, padding: "1px 6px", borderRadius: "999px" }}>
              {summary.totalRecords > 0 ? `${(100 - parseFloat(summary.registrationRate || "0")).toFixed(1)}%` : "0%"}
            </span>
          </div>
          <div className="kpi-num" style={{ fontSize: "1.5rem", fontWeight: 800, color: "#0f172a", marginTop: "3px" }}>
            {summary.totalNotRegistered.toLocaleString()}
          </div>
          <span style={{ fontSize: "0.72rem", color: "#e11d48" }}>
            Pending portal onboarding
          </span>
        </div>

        {/* Card 4: Progress Bar Card */}
        <div
          style={{
            background: "#ffffff",
            border: "1px solid #e2e8f0",
            borderLeft: "4px solid #3b82f6",
            borderRadius: "10px",
            padding: "12px 14px",
            boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center"
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
            <span style={{ fontSize: "0.72rem", fontWeight: 700, color: "#475569", textTransform: "uppercase" }}>
              Cohort Adoption
            </span>
            <span style={{ fontSize: "0.82rem", fontWeight: 700, color: "#2563eb" }}>
              {summary.registrationRate}
            </span>
          </div>
          <div style={{ background: "#e2e8f0", height: "6px", borderRadius: "999px", overflow: "hidden" }}>
            <div
              style={{
                background: "linear-gradient(90deg, #3b82f6, #10b981)",
                height: "100%",
                width: `${calculatePct(summary.totalRegistered, summary.totalRecords)}%`,
                transition: "width 0.4s ease"
              }}
            />
          </div>
          <span style={{ fontSize: "0.7rem", color: "#64748b", marginTop: "6px" }}>
            {summary.totalRegistered.toLocaleString()} of {summary.totalRecords.toLocaleString()} onboarded
          </span>
        </div>
      </div>

      {/* ── TOOLBAR: STATUS FILTER PILLS & SEARCH BAR ── */}
      <div className="reg-users-filters-bar" style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap", padding: "12px 16px" }}>
        
        {/* Status Filter Buttons */}
        <div className="reg-compare-status-filter-group" style={{ display: "flex", gap: "6px", flexWrap: "wrap", alignItems: "center" }}>
          <button
            type="button"
            onClick={() => { setStatusFilter("all"); setPage(1); }}
            style={{
              padding: "6px 12px",
              borderRadius: "7px",
              border: statusFilter === "all" ? "1.5px solid #0f172a" : "1px solid #cbd5e1",
              background: statusFilter === "all" ? "#f1f5f9" : "#ffffff",
              color: statusFilter === "all" ? "#0f172a" : "#475569",
              fontSize: "0.8rem",
              fontWeight: statusFilter === "all" ? 700 : 500,
              cursor: "pointer",
              transition: "all 0.15s ease",
              display: "inline-flex",
              alignItems: "center",
              gap: "6px"
            }}
          >
            <span>All Records</span>
            <span style={{ background: statusFilter === "all" ? "#e2e8f0" : "#f1f5f9", padding: "1px 5px", borderRadius: "10px", fontSize: "0.7rem", fontWeight: 700 }}>
              {summary.totalRecords.toLocaleString()}
            </span>
          </button>

          <button
            type="button"
            onClick={() => { setStatusFilter("registered"); setPage(1); }}
            style={{
              padding: "6px 12px",
              borderRadius: "7px",
              border: statusFilter === "registered" ? "1.5px solid #10b981" : "1px solid #cbd5e1",
              background: statusFilter === "registered" ? "#ecfdf5" : "#ffffff",
              color: statusFilter === "registered" ? "#047857" : "#475569",
              fontSize: "0.8rem",
              fontWeight: statusFilter === "registered" ? 700 : 500,
              cursor: "pointer",
              transition: "all 0.15s ease",
              display: "inline-flex",
              alignItems: "center",
              gap: "6px"
            }}
          >
            <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#10b981" }} />
            <span>Registered</span>
            <span style={{ background: statusFilter === "registered" ? "#a7f3d0" : "#f1f5f9", padding: "1px 5px", borderRadius: "10px", fontSize: "0.7rem", color: "#065f46", fontWeight: 700 }}>
              {summary.totalRegistered.toLocaleString()}
            </span>
          </button>

          <button
            type="button"
            onClick={() => { setStatusFilter("not_registered"); setPage(1); }}
            style={{
              padding: "6px 12px",
              borderRadius: "7px",
              border: statusFilter === "not_registered" ? "1.5px solid #f43f5e" : "1px solid #cbd5e1",
              background: statusFilter === "not_registered" ? "#fff1f2" : "#ffffff",
              color: statusFilter === "not_registered" ? "#be123c" : "#475569",
              fontSize: "0.8rem",
              fontWeight: statusFilter === "not_registered" ? 700 : 500,
              cursor: "pointer",
              transition: "all 0.15s ease",
              display: "inline-flex",
              alignItems: "center",
              gap: "6px"
            }}
          >
            <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#f43f5e" }} />
            <span>Not Registered</span>
            <span style={{ background: statusFilter === "not_registered" ? "#fecdd3" : "#f1f5f9", padding: "1px 5px", borderRadius: "10px", fontSize: "0.7rem", color: "#9f1239", fontWeight: 700 }}>
              {summary.totalNotRegistered.toLocaleString()}
            </span>
          </button>
        </div>

        {/* Search Box */}
        <div className="reg-users-search-box reg-compare-search-box" style={{ maxWidth: "260px" }}>
          <span className="reg-users-search-icon">
            <SearchIcon width="14" height="14" />
          </span>
          <input
            type="text"
            className="reg-users-search-input"
            placeholder={cohort === "students" ? "Search ID, CTU ID, Name..." : "Search Staff ID, Name..."}
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
          {search && (
            <button
              type="button"
              className="reg-users-search-clear"
              onClick={() => { setSearch(""); setPage(1); }}
              title="Clear search"
            >
              <XIcon width="13" height="13" />
            </button>
          )}
        </div>

        {/* School/Department Dropdown */}
        {departmentsList.length > 0 && (
          <div className="reg-users-select-wrap dept reg-compare-dept-select" style={{ width: "170px" }}>
            <select
              className="reg-users-select"
              value={department}
              onChange={(e) => { setDepartment(e.target.value); setPage(1); }}
            >
              <option value="all">All {cohort === "students" ? "Schools" : "Departments"}</option>
              {departmentsList.map(d => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>
        )}

        {/* Actions: Refresh & Export */}
        <div className="reg-compare-actions" style={{ display: "flex", gap: "8px", alignItems: "center", marginLeft: "auto" }}>
          <button
            type="button"
            className="reg-users-btn-reset"
            onClick={fetchComparison}
            title="Refresh list"
            disabled={loading}
          >
            <RefreshIcon width="14" height="14" />
            <span>Refresh</span>
          </button>

          <button
            type="button"
            onClick={handleExport}
            disabled={exporting || loading}
            style={{
              padding: "0 13px",
              height: "36px",
              borderRadius: "7px",
              border: "1px solid #0f172a",
              background: "#0f172a",
              color: "#ffffff",
              fontSize: "0.82rem",
              fontWeight: 600,
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              transition: "all 0.15s ease"
            }}
            title="Export filtered records to Excel spreadsheet"
          >
            {exporting ? <SpinnerIcon size={14} /> : <DownloadIcon width="14" height="14" />}
            <span>{exporting ? "Exporting..." : "Export (.xlsx)"}</span>
          </button>
        </div>
      </div>

      {/* ── COMPARISON DATA VIEW ── */}
      <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "10px", overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.02)" }}>
        {loading ? (
          <div style={{ padding: "48px 20px", textAlign: "center", color: "#64748b" }}>
            <div style={{ marginBottom: "10px", color: "#3b82f6", display: "flex", justifyContent: "center" }}>
              <SpinnerIcon size={30} />
            </div>
            <p style={{ margin: 0, fontWeight: 600, fontSize: "0.92rem", color: "#1e293b" }}>
              Comparing official records against registered accounts...
            </p>
          </div>
        ) : records.length === 0 ? (
          <div style={{ padding: "48px 20px", textAlign: "center", color: "#64748b" }}>
            <div style={{ marginBottom: "10px", color: "#94a3b8", display: "flex", justifyContent: "center" }}>
              <SearchIcon width="32" height="32" />
            </div>
            <p style={{ margin: 0, fontWeight: 700, color: "#1e293b", fontSize: "1rem" }}>No matching records found</p>
            <p style={{ margin: "5px 0 0", fontSize: "0.82rem" }}>
              Try adjusting your search keywords or status filter.
            </p>
          </div>
        ) : (
          <>
            {/* 1. DESKTOP VIEW: FULL COMPARISON TABLE */}
            <div className="reg-compare-desktop-table" style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "0.85rem" }}>
                <thead>
                  <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0", color: "#475569", textTransform: "uppercase", fontSize: "0.72rem", letterSpacing: "0.04em", fontWeight: 700 }}>
                    <th style={{ padding: "11px 14px" }}>#</th>
                    <th style={{ padding: "11px 14px" }}>{cohort === "students" ? "Student ID / CTU ID" : "Staff ID"}</th>
                    <th style={{ padding: "11px 14px" }}>Official Details</th>
                    <th style={{ padding: "11px 14px" }}>{cohort === "students" ? "School / Program" : "Department / Role"}</th>
                    <th style={{ padding: "11px 14px", textAlign: "center" }}>Portal Status</th>
                    <th style={{ padding: "11px 14px" }}>Registered Account Info</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map((rec, index) => {
                    const rowNum = (page - 1) * limit + index + 1;
                    return (
                      <tr
                        key={rec.id || index}
                        style={{
                          borderBottom: "1px solid #f1f5f9",
                          transition: "background 0.15s ease",
                          background: rec.isRegistered ? "#ffffff" : "#fffcfc"
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = "#f8fafc")}
                        onMouseLeave={(e) => (e.currentTarget.style.background = rec.isRegistered ? "#ffffff" : "#fffcfc")}
                      >
                        {/* S.No */}
                        <td style={{ padding: "11px 14px", color: "#94a3b8", fontSize: "0.78rem", fontWeight: 600 }}>
                          {rowNum}
                        </td>

                        {/* ID */}
                        <td style={{ padding: "11px 14px", whiteSpace: "nowrap" }}>
                          <div style={{ fontWeight: 700, color: "#0f172a", fontSize: "0.88rem" }}>
                            {rec.id}
                          </div>
                          {cohort === "students" && rec.ctuId && (
                            <div style={{ fontSize: "0.74rem", color: "#64748b" }}>
                              CTU: {rec.ctuId}
                            </div>
                          )}
                        </td>

                        {/* Name & Contact */}
                        <td style={{ padding: "11px 14px" }}>
                          <div style={{ fontWeight: 600, color: "#0f172a" }}>
                            {rec.fullName || "—"}
                          </div>
                          <div style={{ display: "flex", gap: "10px", fontSize: "0.75rem", color: "#64748b", marginTop: "3px", flexWrap: "wrap" }}>
                            {rec.email && (
                              <span style={{ display: "inline-flex", alignItems: "center", gap: "3px" }}>
                                <MailIcon width="12" height="12" /> {rec.email}
                              </span>
                            )}
                            {rec.phone && (
                              <span style={{ display: "inline-flex", alignItems: "center", gap: "3px" }}>
                                <PhoneIcon width="12" height="12" /> {rec.phone}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Academic / Dept Info */}
                        <td style={{ padding: "11px 14px" }}>
                          {cohort === "students" ? (
                            <>
                              <div style={{ fontWeight: 600, color: "#334155" }}>
                                {rec.program || rec.school || "—"}
                              </div>
                              <div style={{ fontSize: "0.74rem", color: "#64748b" }}>
                                {[rec.school, rec.batch ? `Batch ${rec.batch}` : "", rec.studentType].filter(Boolean).join(" · ")}
                              </div>
                            </>
                          ) : (
                            <>
                              <div style={{ fontWeight: 600, color: "#334155" }}>
                                {rec.department || "General"}
                              </div>
                              <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "2px", flexWrap: "wrap" }}>
                                <span style={{ fontSize: "0.74rem", color: "#64748b", textTransform: "capitalize" }}>
                                  Role: {rec.role || "staff"}
                                </span>
                                {rec.staffType === "Teaching" ? (
                                  <span style={{ display: "inline-flex", alignItems: "center", gap: "3px", padding: "1px 6px", borderRadius: "10px", fontSize: "0.7rem", fontWeight: "600", background: "#ecfdf5", color: "#047857", border: "1px solid #a7f3d0" }}>
                                    Faculty
                                  </span>
                                ) : (
                                  <span style={{ display: "inline-flex", alignItems: "center", gap: "3px", padding: "1px 6px", borderRadius: "10px", fontSize: "0.7rem", fontWeight: "600", background: "#f8fafc", color: "#475569", border: "1px solid #cbd5e1" }}>
                                    Admin
                                  </span>
                                )}
                              </div>
                            </>
                          )}
                        </td>

                        {/* Registration Status Pill */}
                        <td style={{ padding: "11px 14px", textAlign: "center", whiteSpace: "nowrap" }}>
                          {rec.isRegistered ? (
                            <span
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "5px",
                                padding: "3px 9px",
                                borderRadius: "14px",
                                fontSize: "0.74rem",
                                fontWeight: 700,
                                background: "#dcfce7",
                                color: "#15803d",
                                border: "1px solid #86efac"
                              }}
                            >
                              <CheckCircleIcon width="12" height="12" />
                              <span>Registered</span>
                            </span>
                          ) : (
                            <span
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "5px",
                                padding: "3px 9px",
                                borderRadius: "14px",
                                fontSize: "0.74rem",
                                fontWeight: 700,
                                background: "#fee2e2",
                                color: "#dc2626",
                                border: "1px solid #fca5a5"
                              }}
                            >
                              <AlertCircleIcon width="12" height="12" />
                              <span>Not Registered</span>
                            </span>
                          )}
                        </td>

                        {/* Registered Account Info */}
                        <td style={{ padding: "11px 14px", fontSize: "0.78rem" }}>
                          {rec.isRegistered ? (
                            <div>
                              <div style={{ color: "#166534", fontWeight: 600 }}>
                                Active & Verified
                              </div>
                              <div style={{ color: "#64748b", marginTop: "2px" }}>
                                {rec.registeredAt ? (
                                  <span>Joined: {new Date(rec.registeredAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
                                ) : (
                                  <span>OTP Confirmed</span>
                                )}
                              </div>
                            </div>
                          ) : (
                            <div style={{ color: "#94a3b8", fontStyle: "italic" }}>
                              No active portal account
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* 2. MOBILE VIEW: COMPACT RESPONSIVE CARDS (ZERO HORIZONTAL SCROLL) */}
            <div className="reg-compare-mobile-cards" style={{ padding: "10px" }}>
              {records.map((rec, index) => {
                const rowNum = (page - 1) * limit + index + 1;
                return (
                  <div key={rec.id || index} className="reg-compare-mcard">
                    {/* Header Row: Name + ID + Status */}
                    <div className="reg-compare-mcard-header">
                      <div className="reg-compare-mcard-title">
                        <span className="reg-compare-mcard-name">{rec.fullName || "—"}</span>
                        <div className="reg-compare-mcard-ids">
                          <span className="reg-compare-mcard-badge">{rec.id}</span>
                          {cohort === "students" && rec.ctuId && (
                            <span style={{ fontSize: "0.72rem", color: "#64748b" }}>
                              CTU: {rec.ctuId}
                            </span>
                          )}
                        </div>
                      </div>

                      {rec.isRegistered ? (
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "4px",
                            padding: "3px 8px",
                            borderRadius: "12px",
                            fontSize: "0.72rem",
                            fontWeight: 700,
                            background: "#dcfce7",
                            color: "#15803d",
                            border: "1px solid #86efac",
                            whiteSpace: "nowrap",
                            flexShrink: 0
                          }}
                        >
                          <CheckCircleIcon width="12" height="12" />
                          <span>Registered</span>
                        </span>
                      ) : (
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "4px",
                            padding: "3px 8px",
                            borderRadius: "12px",
                            fontSize: "0.72rem",
                            fontWeight: 700,
                            background: "#fee2e2",
                            color: "#dc2626",
                            border: "1px solid #fca5a5",
                            whiteSpace: "nowrap",
                            flexShrink: 0
                          }}
                        >
                          <AlertCircleIcon width="12" height="12" />
                          <span>Not Registered</span>
                        </span>
                      )}
                    </div>

                    {/* Academic / Dept Info */}
                    <div className="reg-compare-mcard-meta">
                      {cohort === "students" ? (
                        <>
                          <div style={{ fontWeight: 600, color: "#334155" }}>
                            {rec.program || rec.school || "—"}
                          </div>
                          <div style={{ fontSize: "0.74rem", color: "#64748b" }}>
                            {[rec.school, rec.batch ? `Batch ${rec.batch}` : "", rec.studentType].filter(Boolean).join(" · ")}
                          </div>
                        </>
                      ) : (
                        <>
                          <div style={{ fontWeight: 600, color: "#334155" }}>
                            {rec.department || "General"}
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "2px", flexWrap: "wrap" }}>
                            <span style={{ fontSize: "0.74rem", color: "#64748b", textTransform: "capitalize" }}>
                              Role: {rec.role || "staff"}
                            </span>
                            {rec.staffType === "Teaching" ? (
                              <span style={{ display: "inline-flex", alignItems: "center", gap: "3px", padding: "1px 6px", borderRadius: "10px", fontSize: "0.7rem", fontWeight: "600", background: "#ecfdf5", color: "#047857", border: "1px solid #a7f3d0" }}>
                                Faculty
                              </span>
                            ) : (
                              <span style={{ display: "inline-flex", alignItems: "center", gap: "3px", padding: "1px 6px", borderRadius: "10px", fontSize: "0.7rem", fontWeight: "600", background: "#f8fafc", color: "#475569", border: "1px solid #cbd5e1" }}>
                                Admin
                              </span>
                            )}
                          </div>
                        </>
                      )}
                    </div>

                    {/* Contact details if available */}
                    {(rec.email || rec.phone) && (
                      <div className="reg-compare-mcard-contacts">
                        {rec.email && (
                          <span style={{ display: "inline-flex", alignItems: "center", gap: "3px" }}>
                            <MailIcon width="12" height="12" /> {rec.email}
                          </span>
                        )}
                        {rec.phone && (
                          <span style={{ display: "inline-flex", alignItems: "center", gap: "3px" }}>
                            <PhoneIcon width="12" height="12" /> {rec.phone}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Footer */}
                    <div className="reg-compare-mcard-footer">
                      <span>#{rowNum}</span>
                      {rec.isRegistered ? (
                        <span style={{ color: "#166534", fontWeight: 600 }}>
                          Active & Verified {rec.registeredAt ? `(${new Date(rec.registeredAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })})` : ""}
                        </span>
                      ) : (
                        <span style={{ color: "#94a3b8", fontStyle: "italic" }}>
                          No active portal account
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* ── PAGINATION ── */}
        {!loading && total > 0 && (
          <div
            style={{
              padding: "11px 16px",
              borderTop: "1px solid #e2e8f0",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "10px",
              background: "#f8fafc",
              fontSize: "0.8rem",
              color: "#64748b"
            }}
          >
            <div>
              Showing <strong>{((page - 1) * limit) + 1}</strong> to <strong>{Math.min(page * limit, total)}</strong> of <strong>{total.toLocaleString()}</strong> records
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <button
                type="button"
                className="records-pag-btn"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                style={{
                  padding: "4px 10px",
                  borderRadius: "6px",
                  border: "1px solid #cbd5e1",
                  background: "#ffffff",
                  fontSize: "0.78rem",
                  fontWeight: 600,
                  cursor: page === 1 ? "not-allowed" : "pointer",
                  opacity: page === 1 ? 0.5 : 1
                }}
              >
                Previous
              </button>

              <span style={{ fontWeight: 600, color: "#334155", padding: "0 4px" }}>
                Page {page} of {totalPages}
              </span>

              <button
                type="button"
                className="records-pag-btn"
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                style={{
                  padding: "4px 10px",
                  borderRadius: "6px",
                  border: "1px solid #cbd5e1",
                  background: "#ffffff",
                  fontSize: "0.78rem",
                  fontWeight: 600,
                  cursor: page === totalPages ? "not-allowed" : "pointer",
                  opacity: page === totalPages ? 0.5 : 1
                }}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

