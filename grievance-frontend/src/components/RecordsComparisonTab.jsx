import React, { useState, useEffect, useCallback, useRef } from "react";
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
import MultiSelectDropdown from "./MultiSelectDropdown";
import ExportPreviewModal from "./ExportPreviewModal";

const studentComparisonColumns = [
  { key: "Student ID", label: "Student ID" },
  { key: "CTU ID", label: "CTU ID" },
  { key: "Full Name", label: "Full Name" },
  { key: "Official Email", label: "Official Email" },
  { key: "Official Phone", label: "Official Phone" },
  { key: "School", label: "School" },
  { key: "Program", label: "Program" },
  { key: "Batch", label: "Batch" },
  { key: "Type", label: "Student Type" },
  { key: "Portal Status", label: "Portal Status" },
  { key: "Registered Email", label: "Registered Email" },
  { key: "Registered Phone", label: "Registered Phone" },
  { key: "Registered On", label: "Registered On" },
];

const staffComparisonColumns = [
  { key: "Staff ID", label: "Staff ID" },
  { key: "Full Name", label: "Full Name" },
  { key: "Official Email", label: "Official Email" },
  { key: "Official Phone", label: "Official Phone" },
  { key: "Role", label: "Official Role" },
  { key: "Staff Category", label: "Staff Category" },
  { key: "Department", label: "Department" },
  { key: "Portal Status", label: "Portal Status" },
  { key: "Portal Role", label: "Portal Role" },
  { key: "Registered Email", label: "Registered Email" },
  { key: "Registered Phone", label: "Registered Phone" },
  { key: "Registered On", label: "Registered On" },
];

export default function RecordsComparisonTab() {
  const [cohort, setCohort] = useState("students"); // "students" | "staff"
  const [statusFilter, setStatusFilter] = useState("all"); // "all" | "registered" | "not_registered"
  const [staffType, setStaffType] = useState("all"); // "all" | "Teaching" | "Non-Teaching"
  const [search, setSearch] = useState("");
  const [selectedDepartments, setSelectedDepartments] = useState([]);
  const [page, setPage] = useState(1);
  const [limit] = useState(25);

  const cohortRef = useRef(cohort);
  cohortRef.current = cohort;

  const abortControllerRef = useRef(null);

  const [records, setRecords] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [summary, setSummary] = useState({
    totalRecords: 0,
    totalRegistered: 0,
    totalNotRegistered: 0,
    totalTeaching: 0,
    totalNonTeaching: 0,
    registrationRate: "0%"
  });
  const [departmentsList, setDepartmentsList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportPreviewData, setExportPreviewData] = useState([]);
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

  const fetchComparison = useCallback(async (
    targetCohort = cohortRef.current,
    targetStatus = statusFilter,
    targetSearch = search,
    targetDepts = selectedDepartments,
    targetStaffType = staffType,
    targetPage = page
  ) => {
    // Abort previous in-flight comparison request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setLoading(true);
    try {
      const deptsParam = (targetDepts || []).length > 0 ? (targetDepts || []).join(",") : "all";
      const queryParams = new URLSearchParams({
        type: targetCohort,
        status: targetStatus,
        search: (targetSearch || "").trim(),
        department: deptsParam,
        departments: deptsParam,
        staffType: targetCohort === "staff" ? (targetStaffType || "all") : "all",
        page: (targetPage || 1).toString(),
        limit: limit.toString(),
        _t: Date.now().toString()
      });

      const res = await fetch(`${BASE_URL}?${queryParams.toString()}`, {
        signal: controller.signal,
        headers: {
          "Cache-Control": "no-cache, no-store",
          "Pragma": "no-cache"
        }
      });
      if (!res.ok) throw new Error("Failed to load comparison records");
      const data = await res.json();

      // Guard: strictly ignore response if active cohort has switched
      if (data.type && data.type !== cohortRef.current) {
        return;
      }

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
      if (err.name === "AbortError") return;
      console.error("Comparison fetch error:", err);
      showNotification(err.message || "Failed to fetch comparison", "error");
    } finally {
      if (abortControllerRef.current === controller) {
        setLoading(false);
      }
    }
  }, [statusFilter, search, selectedDepartments, staffType, page, limit, BASE_URL]);

  useEffect(() => {
    fetchComparison();
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [cohort, statusFilter, search, selectedDepartments, staffType, page]);

  // Cohort switch resets filters and page immediately and fetches new cohort
  const handleCohortChange = (newCohort) => {
    if (newCohort === cohort) return;
    cohortRef.current = newCohort;
    setCohort(newCohort);
    setStatusFilter("all");
    setStaffType("all");
    setSearch("");
    setSelectedDepartments([]);
    setPage(1);
    setRecords([]);
    setTotal(0);
    setTotalPages(1);
    setDepartmentsList([]);
    setSummary({
      totalRecords: 0,
      totalRegistered: 0,
      totalNotRegistered: 0,
      totalTeaching: 0,
      totalNonTeaching: 0,
      registrationRate: "0%"
    });
    fetchComparison(newCohort, "all", "", [], "all", 1);
  };

  const handleOpenExportPreview = async () => {
    setExporting(true);
    try {
      const deptsParam = selectedDepartments.length > 0 ? selectedDepartments.join(",") : "all";
      const queryParams = new URLSearchParams({
        type: cohort,
        status: "all", // Load entire cohort dataset so user can switch between Registered and Not Registered in preview
        search: search.trim(),
        department: deptsParam,
        departments: deptsParam,
        staffType: cohort === "staff" ? staffType : "all",
        export: "preview"
      });

      const res = await fetch(`${BASE_URL}?${queryParams.toString()}`);
      if (!res.ok) throw new Error("Failed to load records for export preview");

      const data = await res.json();
      setExportPreviewData(data.records || []);
      setShowExportModal(true);
    } catch (err) {
      console.error("Export preview error:", err);
      showNotification(err.message || "Failed to load export preview", "error");
    } finally {
      setExporting(false);
    }
  };

  const handleExportSelected = async (selectedData, selectedColumns) => {
    try {
      const token = localStorage.getItem("grievance_token");
      const dateStr = new Date().toISOString().split("T")[0];
      const catSuffix = cohort === "staff" && staffType !== "all" ? `_${staffType}` : "";
      const fileName = `${cohort === "students" ? "Students" : "Staff"}_Comparison_${statusFilter}${catSuffix}_${dateStr}.xlsx`;

      const res = await fetch(`${process.env.REACT_APP_API_URL || "http://localhost:5000"}/api/grievances/export-custom`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          fileName,
          sheetName: `${cohort === "students" ? "Students" : "Staff"}_Comparison`,
          columns: selectedColumns,
          records: selectedData
        })
      });

      if (!res.ok) {
        const errPayload = await res.json().catch(() => null);
        throw new Error(errPayload?.message || `Failed to generate Excel export (HTTP ${res.status})`);
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      showNotification(`Excel report downloaded successfully (${selectedData.length} records).`, "success");
    } catch (err) {
      console.error("Export download error:", err);
      showNotification(err.message || "Failed to export Excel report", "error");
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
        {/* Card 1: Total Master Records */}
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
            {cohort === "staff" && staffType === "Teaching"
              ? "Total Teaching Records"
              : cohort === "staff" && staffType === "Non-Teaching"
              ? "Total Non-Teaching Records"
              : "Total Master Records"}
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
              {cohort === "staff" && staffType === "Teaching"
                ? "Faculty Adoption"
                : cohort === "staff" && staffType === "Non-Teaching"
                ? "Staff Adoption"
                : "Cohort Adoption"}
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
      <div className="reg-users-filters-bar reg-compare-toolbar">
        
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

        {/* Staff Category Filter: Teaching vs Non-Teaching */}
        {cohort === "staff" && (
          <div
            className="reg-compare-category-filter-group"
            style={{
              display: "inline-flex",
              alignItems: "center",
              background: "#f1f5f9",
              borderRadius: "8px",
              padding: "3px",
              border: "1px solid #cbd5e1",
              gap: "2px"
            }}
          >
            <button
              type="button"
              onClick={() => { setStaffType("all"); setPage(1); }}
              style={{
                padding: "4px 10px",
                borderRadius: "6px",
                border: "none",
                fontSize: "0.78rem",
                fontWeight: staffType === "all" ? 700 : 500,
                cursor: "pointer",
                background: staffType === "all" ? "#ffffff" : "transparent",
                color: staffType === "all" ? "#0f172a" : "#64748b",
                boxShadow: staffType === "all" ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
                transition: "all 0.15s ease",
                display: "inline-flex",
                alignItems: "center",
                gap: "5px"
              }}
              title="View all teaching and non-teaching staff"
            >
              <span>All Staff</span>
              {summary.totalTeaching !== undefined && summary.totalNonTeaching !== undefined && (
                <span style={{ fontSize: "0.68rem", background: staffType === "all" ? "#f1f5f9" : "#e2e8f0", padding: "1px 5px", borderRadius: "10px", fontWeight: 700 }}>
                  {(summary.totalTeaching + summary.totalNonTeaching).toLocaleString()}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => { setStaffType("Teaching"); setPage(1); }}
              style={{
                padding: "4px 10px",
                borderRadius: "6px",
                border: "none",
                fontSize: "0.78rem",
                fontWeight: staffType === "Teaching" ? 700 : 500,
                cursor: "pointer",
                background: staffType === "Teaching" ? "#ecfdf5" : "transparent",
                color: staffType === "Teaching" ? "#047857" : "#64748b",
                boxShadow: staffType === "Teaching" ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
                transition: "all 0.15s ease",
                display: "inline-flex",
                alignItems: "center",
                gap: "5px"
              }}
              title="Filter by teaching faculty records"
            >
              <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#10b981" }} />
              <span>Teaching (Faculty)</span>
              {summary.totalTeaching !== undefined && (
                <span style={{ fontSize: "0.68rem", background: staffType === "Teaching" ? "#a7f3d0" : "#e2e8f0", color: staffType === "Teaching" ? "#065f46" : "inherit", padding: "1px 5px", borderRadius: "10px", fontWeight: 700 }}>
                  {summary.totalTeaching.toLocaleString()}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => { setStaffType("Non-Teaching"); setPage(1); }}
              style={{
                padding: "4px 10px",
                borderRadius: "6px",
                border: "none",
                fontSize: "0.78rem",
                fontWeight: staffType === "Non-Teaching" ? 700 : 500,
                cursor: "pointer",
                background: staffType === "Non-Teaching" ? "#f8fafc" : "transparent",
                color: staffType === "Non-Teaching" ? "#334155" : "#64748b",
                boxShadow: staffType === "Non-Teaching" ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
                transition: "all 0.15s ease",
                display: "inline-flex",
                alignItems: "center",
                gap: "5px"
              }}
              title="Filter by non-teaching administrative staff records"
            >
              <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#64748b" }} />
              <span>Non-Teaching (Admin)</span>
              {summary.totalNonTeaching !== undefined && (
                <span style={{ fontSize: "0.68rem", background: staffType === "Non-Teaching" ? "#cbd5e1" : "#e2e8f0", color: staffType === "Non-Teaching" ? "#1e293b" : "inherit", padding: "1px 5px", borderRadius: "10px", fontWeight: 700 }}>
                  {summary.totalNonTeaching.toLocaleString()}
                </span>
              )}
            </button>
          </div>
        )}

        {/* Search Box */}
        <div className="reg-users-search-box reg-compare-search-box">
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

        {/* School/Department Multi-Select Filter */}
        {departmentsList.length > 0 && (
          <MultiSelectDropdown
            options={departmentsList}
            selected={selectedDepartments}
            onChange={(newDepts) => {
              setSelectedDepartments(newDepts);
              setPage(1);
            }}
            placeholder={cohort === "students" ? "All Schools" : "All Departments"}
            searchPlaceholder={cohort === "students" ? "Filter schools..." : "Filter departments..."}
            className="reg-compare-dept-select"
            width="210px"
          />
        )}

        {/* Actions: Refresh & Export */}
        <div className="reg-compare-actions">
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
            onClick={handleOpenExportPreview}
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
            title="Preview and customize export to Excel spreadsheet"
          >
            {exporting ? <SpinnerIcon size={14} /> : <DownloadIcon width="14" height="14" />}
            <span>{exporting ? "Preparing..." : "Export (.xlsx)"}</span>
          </button>
        </div>
      </div>

      {/* ── COMPARISON DATA VIEW ── */}
      <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "10px", overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.02)", position: "relative" }}>
        {loading && records.length === 0 ? (
          <div style={{ padding: "48px 20px", textAlign: "center", color: "#64748b" }}>
            <div style={{ marginBottom: "10px", color: "#3b82f6", display: "flex", justifyContent: "center" }}>
              <SpinnerIcon size={30} />
            </div>
            <p style={{ margin: 0, fontWeight: 600, fontSize: "0.92rem", color: "#1e293b" }}>
              Comparing official records against registered accounts...
            </p>
          </div>
        ) : !loading && records.length === 0 ? (
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
          <div style={{ opacity: loading ? 0.65 : 1, transition: "opacity 0.15s ease", pointerEvents: loading ? "none" : "auto" }}>
            {loading && (
              <div style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                height: "3px",
                background: "linear-gradient(90deg, #3b82f6, #60a5fa, #3b82f6)",
                backgroundSize: "200% 100%",
                zIndex: 20
              }} />
            )}
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
          </div>
        )}

        {/* ── PAGINATION ── */}
        {total > 0 && (
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

        {/* EXPORT PREVIEW MODAL */}
        <ExportPreviewModal
          isOpen={showExportModal}
          onClose={() => setShowExportModal(false)}
          data={exportPreviewData}
          columns={cohort === "students" ? studentComparisonColumns : staffComparisonColumns}
          title="Export Preview"
          subtitle={`Filter and select ${cohort === "students" ? "student" : "staff"} comparison data to export`}
          searchPlaceholder={`Search ${cohort === "students" ? "Student ID" : "Staff ID"}, Name, Email...`}
          initialStatus={statusFilter === "registered" ? "REGISTERED" : statusFilter === "not_registered" ? "NOT REGISTERED" : "All"}
          statusOptions={[
            { value: "All", label: "All Status" },
            { value: "REGISTERED", label: "Registered" },
            { value: "NOT REGISTERED", label: "Not Registered" }
          ]}
          departmentOptions={["All", ...departmentsList]}
          extraFilter={cohort === "staff" ? {
            label: "Category",
            options: [
              { value: "All", label: "All Categories" },
              { value: "Teaching", label: "Teaching" },
              { value: "Non-Teaching", label: "Non-Teaching" }
            ]
          } : null}
          getRowId={(item, idx) => item["Student ID"] || item["Staff ID"] || idx}
          onExport={handleExportSelected}
        />
      </div>
    </div>
  );
}

