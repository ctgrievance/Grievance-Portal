import React, { useState, useEffect, useRef, useCallback } from "react";
import { 
  DownloadIcon, 
  XIcon, 
  SearchIcon, 
  TrashIcon,
  PlusIcon,
  UploadIcon,
  RefreshIcon,
  MailIcon,
  PhoneIcon,
  EditIcon,
  SaveIcon,
  StaffIcon,
  CheckCircleIcon,
  AlertCircleIcon,
  FileIcon
} from "./Icons";
import ExcelUploadModeModal from "./ExcelUploadModeModal";

function StaffRecordsTab() {
  const [records, setRecords]       = useState([]);
  const [total, setTotal]           = useState(0);
  const [totalTeaching, setTotalTeaching] = useState(0);
  const [totalNonTeaching, setTotalNonTeaching] = useState(0);
  const [staffTypeFilter, setStaffTypeFilter] = useState("all"); // "all" | "Teaching" | "Non-Teaching"
  const [page, setPage]             = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [jumpPage, setJumpPage]     = useState("1");
  const [limit]                     = useState(20);
  const [search, setSearch]         = useState("");
  
  const [loading, setLoading]       = useState(false);
  const [msg, setMsg]               = useState("");
  const [msgType, setMsgType]       = useState("");
  const [clearing, setClearing]     = useState(false);
  const [dragOver, setDragOver]     = useState(false);

  // ── Upload progress state ────────────────────────────────────────────────
  const [uploadState, setUploadState] = useState(null);
  const [pendingFile, setPendingFile] = useState(null);
  const [showModeModal, setShowModeModal] = useState(false);
  const pollRef    = useRef(null);
  const startRef   = useRef(null);
  const fileInputRef = useRef();

  // New Row State
  const [newRow, setNewRow] = useState({ id: "", fullName: "", email: "", phone: "", role: "staff", department: "", staffType: "Non-Teaching" });
  const [isAdding, setIsAdding] = useState(false);

  // Editable Row State
  const [editingId, setEditingId] = useState(null);
  const [editFormData, setEditFormData] = useState({});

  const BASE = `${process.env.REACT_APP_API_URL || "http://localhost:5000"}/api/staff-records`;
  const token = localStorage.getItem("grievance_token");

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    try {
      const url = `${process.env.REACT_APP_API_URL || "http://localhost:5000"}/api/staff-records?page=${page}&limit=${limit}&search=${encodeURIComponent(search)}&staffType=${staffTypeFilter}`;
      const res = await fetch(url);
      const data = await res.json();

      if (res.ok) {
        setRecords(data.records);
        setTotal(data.total);
        setTotalTeaching(data.totalTeaching || 0);
        setTotalNonTeaching(data.totalNonTeaching || 0);
        setTotalPages(data.totalPages);
      } else {
        throw new Error(data.message || "Failed to fetch records");
      }
    } catch (err) {
      showMsg(err.message, "error");
    } finally {
      setLoading(false);
    }
  }, [page, search, limit, staffTypeFilter]);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  useEffect(() => {
    setJumpPage(page.toString());
  }, [page]);

  const handleJumpPage = (e) => {
    if (e) e.preventDefault();
    const target = parseInt(jumpPage, 10);
    if (isNaN(target)) {
      setJumpPage(page.toString());
      return;
    }
    const clamped = Math.max(1, Math.min(totalPages, target));
    setPage(clamped);
    setJumpPage(clamped.toString());
  };

  const showMsg = (message, type = "info") => {
    setMsg(message);
    setMsgType(type);
    setTimeout(() => { setMsg(""); setMsgType(""); }, 6000);
  };

  const stopPoll = () => { if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; } };

  const startPolling = (jobId, totalRows) => {
    startRef.current = Date.now();
    pollRef.current = setInterval(async () => {
      try {
        const res  = await fetch(`${BASE}/progress/${jobId}`);
        const data = await res.json();
        if (!res.ok) { stopPoll(); return; }

        const elapsed = (Date.now() - startRef.current) / 1000;
        const speed   = elapsed > 0 ? Math.round(data.inserted / elapsed) : 0;
        const pct     = totalRows > 0 ? Math.round((data.processed / totalRows) * 100) : 0;
        const remaining = speed > 0 ? Math.round((totalRows - data.processed) / speed) : null;

        setUploadState({
          status:    data.status,
          jobId,
          total:     totalRows,
          processed: data.processed,
          inserted:  data.inserted,
          skipped:   data.skipped,
          deleted:   data.deleted || 0,
          mode:      data.mode || "add",
          sheetCount: data.sheetCount || 1,
          pct,
          speed,
          eta:       remaining,
          errors:    data.errors || [],
        });

        if (data.status === "done" || data.status === "error") {
          stopPoll();
          fetchRecords();
          if (data.status === "done") {
            if (data.mode === "remove") {
              showMsg(`🗑️ Remove complete! ${data.deleted || 0} matching records deleted from database.`, "success");
            } else if (data.mode === "change") {
              showMsg(`🔄 Complete overwrite done! ${data.inserted} records replaced across ${data.sheetCount || 1} sheet tab(s).`, "success");
            } else {
              showMsg(`✅ Upload complete! ${data.inserted} inserted/updated, ${data.skipped} skipped across ${data.sheetCount || 1} sheet tab(s).`, "success");
            }
          } else {
            showMsg(`❌ Upload failed: ${data.errorMessage || "Unknown error"}`, "error");
          }
        }
      } catch (_) { /* ignore poll errors */ }
    }, 500);
  };

  // ── Step 1: File Selected → Open Mode Choice Modal ──
  const handleFileSelect = (file) => {
    if (!file) return;
    const ext = file.name.split(".").pop().toLowerCase();
    if (!["xlsx", "xls"].includes(ext)) {
      showMsg("❌ Only .xlsx or .xls files allowed", "error");
      return;
    }
    setPendingFile(file);
    setShowModeModal(true);
  };

  // ── Step 2: User Confirms Mode → Execute Upload ──
  const handleExecuteUpload = async (mode = "add") => {
    if (!pendingFile) return;
    const file = pendingFile;
    setPendingFile(null);
    setShowModeModal(false);

    setUploadState({ status: "uploading", pct: 0, total: 0, processed: 0, inserted: 0, skipped: 0, deleted: 0, mode, speed: 0, eta: null });
    stopPoll();

    const formData = new FormData();
    formData.append("file", file);
    formData.append("mode", mode);

    try {
      const res  = await fetch(`${BASE}/upload`, { method: "POST", headers: { Authorization: `Bearer ${token}` }, body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      setUploadState({
        status: "processing",
        jobId: data.jobId,
        total: data.total,
        sheetCount: data.sheetCount || 1,
        sheetNames: data.sheetNames || [],
        mode: data.mode || mode,
        processed: 0,
        inserted: 0,
        skipped: 0,
        deleted: 0,
        pct: 0,
        speed: 0,
        eta: null
      });
      startPolling(data.jobId, data.total);
    } catch (err) {
      setUploadState(null);
      showMsg(`❌ ${err.message}`, "error");
    }

    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleDrop = (e) => { e.preventDefault(); setDragOver(false); handleFileSelect(e.dataTransfer.files[0]); };

  const handleClearAll = async () => {
    if (!window.confirm("⚠️ Delete ALL staff records permanently? This cannot be undone.")) return;
    setClearing(true);
    try {
      const res  = await fetch(`${BASE}/clear-all`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (res.ok) { showMsg(`✅ ${data.message}`, "success"); setUploadState(null); setPage(1); fetchRecords(); }
      else throw new Error(data.message);
    } catch (err) { showMsg(`❌ ${err.message}`, "error"); }
    finally { setClearing(false); }
  };

  // --- inline editing ---
  const handleEditClick = (record) => {
    setEditingId(record.id);
    setEditFormData({ ...record });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditFormData({});
  };

  const handleEditChange = (e) => {
    setEditFormData({ ...editFormData, [e.target.name]: e.target.value });
  };

  const handleSaveEdit = async (id) => {
    try {
      const res = await fetch(`${BASE}/${id}`, {
        method: "PUT",
        headers: { 
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(editFormData)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to update record");

      showMsg("Record updated successfully", "success");
      setEditingId(null);
      fetchRecords();
    } catch (err) {
      showMsg(err.message, "error");
    }
  };

  // --- Add new row ---
  const handleNewRowChange = (e) => {
    setNewRow({ ...newRow, [e.target.name]: e.target.value });
  };

  const handleAddNew = async () => {
    if (!newRow.id || !newRow.fullName) {
      showMsg("Staff ID and Full Name are required", "error");
      return;
    }

    try {
      const res = await fetch(BASE, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(newRow)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to add record");

      showMsg("New staff record added successfully", "success");
      setIsAdding(false);
      setNewRow({ id: "", fullName: "", email: "", phone: "", role: "staff", department: "" });
      fetchRecords();
    } catch (err) {
      showMsg(err.message, "error");
    }
  };

  // --- Delete row ---
  const handleDelete = async (id) => {
    if (!window.confirm(`Are you sure you want to delete staff record ${id}?`)) return;
    try {
      const res = await fetch(`${BASE}/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to delete");
      
      showMsg("Staff record deleted successfully", "success");
      fetchRecords();
    } catch (err) {
      showMsg(err.message, "error");
    }
  };

  const isUploading = uploadState && (uploadState.status === "uploading" || uploadState.status === "processing");

  return (
    <div className="records-view-container">
      
      {/* ── HEADER BAR ── */}
      <div className="records-header-bar">
        <div className="records-header-title-wrap">
          <div className="records-title-row">
            <h2 className="records-title">Staff Records Directory</h2>
            <span className="records-count-pill">
              <StaffIcon width="14" height="14" />
              {total.toLocaleString()} Staff Records
            </span>
          </div>
          <p className="records-subtitle">
            Upload, verify and manage CT University staff & faculty records from master Excel
          </p>
        </div>

        <button 
          type="button"
          onClick={() => setIsAdding(!isAdding)}
          className={`records-add-btn ${isAdding ? "active" : ""}`}
        >
          {isAdding ? (
            <><XIcon width="15" height="15" /> Cancel</>
          ) : (
            <><PlusIcon width="15" height="15" /> Add New Staff</>
          )}
        </button>
      </div>

      {/* ── NOTIFICATION MESSAGE ── */}
      {msg && (
        <div className={`reg-users-alert ${msgType === "error" ? "error" : "success"}`} style={{ marginBottom: "18px" }}>
          {msgType === "error" ? <AlertCircleIcon width="16" height="16" /> : <CheckCircleIcon width="16" height="16" />}
          <span>{msg}</span>
        </div>
      )}

      {/* ── CATEGORY TABS (All / Teaching / Non-Teaching) ── */}
      <div
        className="staff-category-tabs"
        style={{
          display: "inline-flex",
          background: "#f1f5f9",
          borderRadius: "10px",
          padding: "4px",
          border: "1px solid #e2e8f0",
          gap: "4px",
          marginBottom: "16px",
          flexWrap: "wrap",
          alignItems: "center"
        }}
      >
        <button
          type="button"
          onClick={() => { setStaffTypeFilter("all"); setPage(1); }}
          className={`records-tab-pill ${staffTypeFilter === "all" ? "active" : ""}`}
          style={{
            padding: "6px 14px",
            borderRadius: "7px",
            fontSize: "0.83rem",
            fontWeight: 600,
            cursor: "pointer",
            border: "none",
            backgroundColor: staffTypeFilter === "all" ? "#ffffff" : "transparent",
            color: staffTypeFilter === "all" ? "#0f172a" : "#64748b",
            boxShadow: staffTypeFilter === "all" ? "0 1px 3px rgba(15, 23, 42, 0.08)" : "none",
            display: "inline-flex",
            alignItems: "center",
            gap: "7px",
            transition: "all 0.15s ease"
          }}
        >
          <span>All Staff</span>
          <span
            style={{
              fontSize: "0.72rem",
              background: staffTypeFilter === "all" ? "#0f172a" : "#e2e8f0",
              color: staffTypeFilter === "all" ? "#ffffff" : "#475569",
              padding: "2px 7px",
              borderRadius: "999px",
              fontWeight: 600
            }}
          >
            {total}
          </span>
        </button>

        <button
          type="button"
          onClick={() => { setStaffTypeFilter("Teaching"); setPage(1); }}
          className={`records-tab-pill ${staffTypeFilter === "Teaching" ? "active" : ""}`}
          style={{
            padding: "6px 14px",
            borderRadius: "7px",
            fontSize: "0.83rem",
            fontWeight: 600,
            cursor: "pointer",
            border: "none",
            backgroundColor: staffTypeFilter === "Teaching" ? "#ffffff" : "transparent",
            color: staffTypeFilter === "Teaching" ? "#0f172a" : "#64748b",
            boxShadow: staffTypeFilter === "Teaching" ? "0 1px 3px rgba(15, 23, 42, 0.08)" : "none",
            display: "inline-flex",
            alignItems: "center",
            gap: "7px",
            transition: "all 0.15s ease"
          }}
        >
          <span>Teaching (Faculty)</span>
          <span
            style={{
              fontSize: "0.72rem",
              background: staffTypeFilter === "Teaching" ? "#0f172a" : "#e2e8f0",
              color: staffTypeFilter === "Teaching" ? "#ffffff" : "#475569",
              padding: "2px 7px",
              borderRadius: "999px",
              fontWeight: 600
            }}
          >
            {totalTeaching}
          </span>
        </button>

        <button
          type="button"
          onClick={() => { setStaffTypeFilter("Non-Teaching"); setPage(1); }}
          className={`records-tab-pill ${staffTypeFilter === "Non-Teaching" ? "active" : ""}`}
          style={{
            padding: "6px 14px",
            borderRadius: "7px",
            fontSize: "0.83rem",
            fontWeight: 600,
            cursor: "pointer",
            border: "none",
            backgroundColor: staffTypeFilter === "Non-Teaching" ? "#ffffff" : "transparent",
            color: staffTypeFilter === "Non-Teaching" ? "#0f172a" : "#64748b",
            boxShadow: staffTypeFilter === "Non-Teaching" ? "0 1px 3px rgba(15, 23, 42, 0.08)" : "none",
            display: "inline-flex",
            alignItems: "center",
            gap: "7px",
            transition: "all 0.15s ease"
          }}
        >
          <span>Non-Teaching (Admin / Offices)</span>
          <span
            style={{
              fontSize: "0.72rem",
              background: staffTypeFilter === "Non-Teaching" ? "#0f172a" : "#e2e8f0",
              color: staffTypeFilter === "Non-Teaching" ? "#ffffff" : "#475569",
              padding: "2px 7px",
              borderRadius: "999px",
              fontWeight: 600
            }}
          >
            {totalNonTeaching}
          </span>
        </button>
      </div>

      {/* ── SEARCH & FILTER BAR (SLEEK & FIXED) ── */}
      <div className="records-filters-bar">
        <div className="records-search-box">
          <span className="records-search-icon">
            <SearchIcon width="16" height="16" />
          </span>
          <input 
            type="text" 
            className="records-search-input"
            placeholder="Search by ID, Emp Code, Name, Email, Phone, Department..." 
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
          {search && (
            <button
              type="button"
              className="records-search-clear"
              onClick={() => { setSearch(""); setPage(1); }}
              title="Clear search"
            >
              <XIcon width="14" height="14" />
            </button>
          )}
        </div>

        <div className="records-filter-actions">
          {search && (
            <button
              type="button"
              className="records-btn-reset"
              onClick={() => { setSearch(""); setPage(1); }}
            >
              Reset
            </button>
          )}

          <button
            type="button"
            className="records-btn-reset"
            onClick={fetchRecords}
            title="Refresh list"
          >
            <RefreshIcon width="14" height="14" />
            <span>Refresh</span>
          </button>

          {total > 0 && (
            <button 
              type="button"
              className="records-btn-clear-all"
              onClick={handleClearAll} 
              disabled={clearing} 
              title="Permanently remove all staff records"
            >
              <TrashIcon width="14" height="14" />
              <span>{clearing ? "Clearing..." : "Clear All Records"}</span>
            </button>
          )}
        </div>
      </div>

      {/* ── SLIDE-DOWN ADD NEW STAFF CARD ── */}
      {isAdding && (
        <div className="records-add-card">
          <div className="records-add-title">
            <PlusIcon width="16" height="16" style={{ color: "#2563eb" }} />
            <span>Add Single Staff Record</span>
          </div>
          <div className="records-form-grid">
            <div className="records-form-field">
              <label className="records-form-label">Staff / Emp ID *</label>
              <input type="text" name="id" value={newRow.id} onChange={handleNewRowChange} placeholder="e.g. 24051 or STF001" className="records-form-input" />
            </div>
            <div className="records-form-field">
              <label className="records-form-label">Full Name *</label>
              <input type="text" name="fullName" value={newRow.fullName} onChange={handleNewRowChange} placeholder="Full Name" className="records-form-input" />
            </div>
            <div className="records-form-field">
              <label className="records-form-label">Category</label>
              <select name="staffType" value={newRow.staffType || "Non-Teaching"} onChange={handleNewRowChange} className="records-form-input">
                <option value="Teaching">Teaching (Faculty)</option>
                <option value="Non-Teaching">Non-Teaching (Admin)</option>
              </select>
            </div>
            <div className="records-form-field">
              <label className="records-form-label">Email Address</label>
              <input type="email" name="email" value={newRow.email} onChange={handleNewRowChange} placeholder="staff@ctuniversity.in" className="records-form-input" />
            </div>
            <div className="records-form-field">
              <label className="records-form-label">Phone / Mobile</label>
              <input type="text" name="phone" value={newRow.phone} onChange={handleNewRowChange} placeholder="Contact Number" className="records-form-input" />
            </div>
            <div className="records-form-field">
              <label className="records-form-label">Role</label>
              <select name="role" value={newRow.role} onChange={handleNewRowChange} className="records-form-input">
                <option value="staff">Staff</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div className="records-form-field">
              <label className="records-form-label">Department</label>
              <input type="text" name="department" value={newRow.department} onChange={handleNewRowChange} placeholder="e.g. HR, Student Welfare" className="records-form-input" />
            </div>
          </div>
          <div className="records-form-actions">
            <button type="button" onClick={() => setIsAdding(false)} className="records-btn-cancel">Cancel</button>
            <button type="button" onClick={handleAddNew} className="records-btn-save">
              <SaveIcon width="14" height="14" /> Save Record
            </button>
          </div>
        </div>
      )}

      {/* ── SLEEK UPLOAD ZONE ── */}
      <div
        className={`records-upload-card ${dragOver ? "drag-over" : ""}`}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => !isUploading && fileInputRef.current?.click()}
      >
        <input ref={fileInputRef} type="file" accept=".xlsx,.xls" style={{ display: "none" }}
          onChange={(e) => handleFileSelect(e.target.files[0])} />

        {!uploadState && (
          <div>
            <div className="records-upload-icon-circle">
              <UploadIcon width="24" height="24" />
            </div>
            <p className="records-upload-title">Drag & Drop Excel File</p>
            <p className="records-upload-sub">or click to browse — .xlsx / .xls (Total: {total.toLocaleString()} records · Multi-Tab auto extraction)</p>
            <span className="records-upload-browse-btn">
              <UploadIcon width="14" height="14" /> Choose Excel File
            </span>
          </div>
        )}

        {uploadState && uploadState.status === "uploading" && (
          <p style={{ color: "#334155", fontWeight: 600, margin: 0, fontSize: "0.88rem" }}>
            Reading all sheet tabs in Excel file...
          </p>
        )}

        {uploadState && uploadState.status === "processing" && (
          <div style={{ maxWidth: "560px", margin: "0 auto", textAlign: "left" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px", fontSize: "0.84rem", fontWeight: 600 }}>
              <span style={{ color: "#0f172a" }}>
                {uploadState.mode === "remove" ? "Deleting records..." : uploadState.mode === "change" ? "Overwriting database..." : "Importing records..."} {uploadState.pct}%
              </span>
              <span style={{ color: "#64748b" }}>
                {uploadState.sheetCount ? `${uploadState.sheetCount} tab(s) · ` : ""}
                {uploadState.mode === "remove" ? `${(uploadState.deleted || 0).toLocaleString()} deleted` : `${uploadState.inserted.toLocaleString()} / ${uploadState.total.toLocaleString()} records`}
              </span>
            </div>
            <div style={{ background: "#e2e8f0", borderRadius: "999px", height: "8px", overflow: "hidden", marginBottom: "12px" }}>
              <div style={{
                height: "100%", borderRadius: "999px",
                background: uploadState.mode === "remove" ? "#e11d48" : "#0f172a",
                width: `${uploadState.pct}%`,
                transition: "width 0.3s ease"
              }} />
            </div>
            <div style={{ display: "flex", justifyContent: "center", gap: "16px", fontSize: "0.8rem", color: "#64748b", flexWrap: "wrap" }}>
              {uploadState.mode === "remove" ? (
                <span>Deleted: <strong style={{ color: "#0f172a" }}>{(uploadState.deleted || 0).toLocaleString()}</strong></span>
              ) : (
                <>
                  <span>Inserted: <strong style={{ color: "#0f172a" }}>{uploadState.inserted.toLocaleString()}</strong></span>
                  <span>Skipped: <strong style={{ color: "#0f172a" }}>{uploadState.skipped.toLocaleString()}</strong></span>
                </>
              )}
              <span>Speed: <strong style={{ color: "#0f172a" }}>{uploadState.speed.toLocaleString()} rec/s</strong></span>
              {uploadState.eta !== null && <span>ETA: <strong style={{ color: "#0f172a" }}>{uploadState.eta}s</strong></span>}
            </div>
          </div>
        )}

        {uploadState && uploadState.status === "done" && (
          <div style={{ padding: "4px 0" }}>
            <div
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "50%",
                background: uploadState.mode === "remove" ? "#fff1f2" : "#f0fdf4",
                border: uploadState.mode === "remove" ? "1px solid #fecdd3" : "1px solid #bbf7d0",
                color: uploadState.mode === "remove" ? "#be123c" : "#166534",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: "10px"
              }}
            >
              {uploadState.mode === "remove" ? (
                <TrashIcon width="17" height="17" />
              ) : uploadState.mode === "change" ? (
                <RefreshIcon width="17" height="17" />
              ) : (
                <CheckCircleIcon width="17" height="17" />
              )}
            </div>
            <p style={{ color: "#0f172a", fontWeight: 700, fontSize: "1rem", margin: "0 0 4px" }}>
              {uploadState.mode === "remove"
                ? "Matching Records Removed"
                : uploadState.mode === "change"
                ? "Complete Overwrite Finished"
                : "Excel Records Imported"}
            </p>
            <p style={{ color: "#64748b", margin: "0 0 14px", fontSize: "0.84rem" }}>
              {uploadState.mode === "remove"
                ? `${(uploadState.deleted || 0).toLocaleString()} matching records deleted from database.`
                : `${uploadState.inserted.toLocaleString()} records inserted/updated · ${uploadState.skipped.toLocaleString()} skipped across ${uploadState.sheetCount || 1} sheet tab(s)`
              }
            </p>
            <button 
              type="button" 
              onClick={(e) => { e.stopPropagation(); setUploadState(null); }} 
              className="records-upload-browse-btn"
            >
              <UploadIcon width="13" height="13" />
              <span>Upload Another</span>
            </button>
          </div>
        )}
      </div>

      {/* ── SUPPORTED COLUMNS GUIDE ── */}
      <div className="records-columns-guide">
        <div style={{ display: "flex", alignItems: "center", gap: "6px", fontWeight: 600, color: "#334155" }}>
          <FileIcon width="14" height="14" style={{ color: "#64748b" }} />
          <span>Supported Columns:</span>
        </div>
        <div className="records-column-chips">
          <span className="records-column-chip">ID / Staff ID / Emp Code</span>
          <span className="records-column-chip">Full Name / Faculty Name</span>
          <span className="records-column-chip">Email</span>
          <span className="records-column-chip">Mobile / Phone</span>
          <span className="records-column-chip">Department</span>
          <span className="records-column-chip">Role</span>
        </div>
      </div>

      {/* ── TABLE VIEW ── */}
      <div className="records-table-wrap">
        <div style={{ overflowX: "auto", width: "100%" }}>
          <table className="records-table">
            <thead>
              <tr>
                <th>Staff ID</th>
                <th>Full Name</th>
                <th>Category</th>
                <th>Contact Info</th>
                <th>Role</th>
                <th>Department</th>
                <th style={{ textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {/* Existing Records */}
              {loading ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: "center", padding: "36px", color: "#64748b" }}>
                    Loading staff records...
                  </td>
                </tr>
              ) : records.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: "center", padding: "40px 20px", color: "#64748b" }}>
                    <SearchIcon width="28" height="28" style={{ color: "#94a3b8", marginBottom: "8px" }} />
                    <div style={{ fontWeight: "600", color: "#334155" }}>No staff records found</div>
                    <p style={{ margin: "4px 0 0 0", fontSize: "0.82rem", color: "#64748b" }}>
                      {search ? "Try adjusting your search criteria" : "Upload an Excel sheet to populate staff records."}
                    </p>
                  </td>
                </tr>
              ) : (
                records.map(record => (
                  <tr key={record.id}>
                    {editingId === record.id ? (
                      <>
                        {/* Editable Row */}
                        <td><span className="records-id-badge">{record.id}</span></td>
                        <td>
                          <input 
                            type="text" 
                            name="fullName" 
                            value={editFormData.fullName || ""} 
                            onChange={handleEditChange} 
                            placeholder="Full Name"
                            className="records-form-input" 
                            style={{ height: "32px", fontSize: "0.84rem" }} 
                          />
                        </td>
                        <td>
                          <select 
                            name="staffType" 
                            value={editFormData.staffType || "Non-Teaching"} 
                            onChange={handleEditChange} 
                            className="records-form-input" 
                            style={{ height: "32px", fontSize: "0.82rem" }}
                          >
                            <option value="Teaching">Teaching (Faculty)</option>
                            <option value="Non-Teaching">Non-Teaching (Admin)</option>
                          </select>
                        </td>
                        <td>
                          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                            <input 
                              type="email" 
                              name="email" 
                              value={editFormData.email || ""} 
                              onChange={handleEditChange} 
                              placeholder="Email address"
                              className="records-form-input" 
                              style={{ height: "28px", fontSize: "0.8rem" }} 
                            />
                            <input 
                              type="text" 
                              name="phone" 
                              value={editFormData.phone || ""} 
                              onChange={handleEditChange} 
                              placeholder="Phone number"
                              className="records-form-input" 
                              style={{ height: "28px", fontSize: "0.8rem" }} 
                            />
                          </div>
                        </td>
                        <td>
                          <select 
                            name="role" 
                            value={editFormData.role || "staff"} 
                            onChange={handleEditChange} 
                            className="records-form-input" 
                            style={{ height: "32px", fontSize: "0.84rem" }}
                          >
                            <option value="staff">Staff</option>
                            <option value="admin">Admin</option>
                          </select>
                        </td>
                        <td>
                          <input 
                            type="text" 
                            name="department" 
                            value={editFormData.department || ""} 
                            onChange={handleEditChange} 
                            placeholder="Department"
                            className="records-form-input" 
                            style={{ height: "32px", fontSize: "0.84rem" }} 
                          />
                        </td>
                        <td style={{ textAlign: "right" }}>
                          <div className="records-action-group" style={{ justifyContent: "flex-end" }}>
                            <button type="button" onClick={() => handleSaveEdit(record.id)} className="records-action-btn edit" title="Save changes">
                              <SaveIcon width="14" height="14" />
                            </button>
                            <button type="button" onClick={handleCancelEdit} className="records-action-btn delete" title="Cancel edit">
                              <XIcon width="14" height="14" />
                            </button>
                          </div>
                        </td>
                      </>
                    ) : (
                      <>
                        {/* Normal Row */}
                        <td onDoubleClick={() => handleEditClick(record)}>
                          <span className="records-id-badge">{record.id}</span>
                        </td>
                        <td onDoubleClick={() => handleEditClick(record)}>
                          <div className="records-name-text">{record.fullName || "—"}</div>
                        </td>
                        <td onDoubleClick={() => handleEditClick(record)}>
                          {record.staffType === "Teaching" ? (
                            <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", padding: "3px 9px", borderRadius: "12px", fontSize: "0.75rem", fontWeight: "600", background: "#ecfdf5", color: "#047857", border: "1px solid #a7f3d0" }}>
                              Faculty
                            </span>
                          ) : (
                            <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", padding: "3px 9px", borderRadius: "12px", fontSize: "0.75rem", fontWeight: "600", background: "#f8fafc", color: "#475569", border: "1px solid #cbd5e1" }}>
                              Admin
                            </span>
                          )}
                        </td>
                        <td onDoubleClick={() => handleEditClick(record)}>
                          {record.email && (
                            <div className="records-contact-item">
                              <MailIcon width="12" height="12" style={{ color: "#94a3b8" }} />
                              <span>{record.email}</span>
                            </div>
                          )}
                          {record.phone && (
                            <div className="records-contact-item">
                              <PhoneIcon width="12" height="12" style={{ color: "#94a3b8" }} />
                              <span>{record.phone}</span>
                            </div>
                          )}
                          {!record.email && !record.phone && "—"}
                        </td>
                        <td onDoubleClick={() => handleEditClick(record)}>
                          <span className={`records-type-pill ${record.role === 'admin' ? 'admin' : 'staff'}`}>
                            {record.role || 'staff'}
                          </span>
                        </td>
                        <td onDoubleClick={() => handleEditClick(record)}>
                          <span style={{ color: "#334155" }}>{record.department || "—"}</span>
                        </td>
                        <td style={{ textAlign: "right" }}>
                          <div className="records-action-group" style={{ justifyContent: "flex-end" }}>
                            <button 
                              type="button" 
                              onClick={() => handleEditClick(record)} 
                              className="records-action-btn edit" 
                              title="Edit staff record"
                            >
                              <EditIcon width="14" height="14" />
                            </button>
                            <button 
                              type="button" 
                              onClick={() => handleDelete(record.id)} 
                              className="records-action-btn delete" 
                              title="Delete staff record"
                            >
                              <TrashIcon width="14" height="14" />
                            </button>
                          </div>
                        </td>
                      </>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── PAGINATION CONTROLS ── */}
      {!loading && total > 0 && (
        <div className="records-pagination">
          <div>
            Showing <strong>{((page - 1) * limit) + 1}</strong> to <strong>{Math.min(page * limit, total)}</strong> of <strong>{total.toLocaleString()}</strong> records
          </div>
          <div className="records-pag-controls">
            <button 
              type="button"
              className="records-pag-btn"
              onClick={() => setPage(1)} 
              disabled={page === 1}
              title="First Page"
              style={{ minWidth: "36px", padding: "0 8px" }}
            >
              «
            </button>
            <button 
              type="button"
              className="records-pag-btn"
              onClick={() => setPage(p => Math.max(1, p - 1))} 
              disabled={page === 1}
            >
              Previous
            </button>

            {/* Jump to Page Form */}
            <form onSubmit={handleJumpPage} className="records-pag-jump-form">
              <span>Page</span>
              <input
                type="number"
                min="1"
                max={totalPages}
                value={jumpPage}
                onChange={(e) => setJumpPage(e.target.value)}
                onBlur={handleJumpPage}
                onFocus={(e) => e.target.select()}
                className="records-pag-jump-input"
                title="Enter page number and press Enter"
              />
              <span>of {totalPages.toLocaleString()}</span>
              <button
                type="submit"
                className="records-pag-go-btn"
                title="Jump to page"
              >
                Go
              </button>
            </form>

            <button 
              type="button"
              className="records-pag-btn"
              onClick={() => setPage(p => Math.min(totalPages, p + 1))} 
              disabled={page === totalPages}
            >
              Next
            </button>
            <button 
              type="button"
              className="records-pag-btn"
              onClick={() => setPage(totalPages)} 
              disabled={page === totalPages}
              title="Last Page"
              style={{ minWidth: "36px", padding: "0 8px" }}
            >
              »
            </button>
          </div>
        </div>
      )}
      
      <p style={{ marginTop: "12px", fontSize: "0.8rem", color: "#94a3b8", textAlign: "right", margin: "8px 0 0" }}>
        💡 Double-click any row to edit directly.
      </p>

      {/* ── EXCEL UPLOAD MODE CHOICE MODAL ── */}
      <ExcelUploadModeModal
        isOpen={showModeModal}
        onClose={() => {
          setShowModeModal(false);
          setPendingFile(null);
        }}
        onConfirm={handleExecuteUpload}
        file={pendingFile}
        recordType="Staff"
      />
    </div>
  );
}

export default StaffRecordsTab;
