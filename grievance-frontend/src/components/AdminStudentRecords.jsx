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
  GraduationCapIcon,
  CheckCircleIcon,
  AlertCircleIcon
} from "./Icons";

const AdminStudentRecords = () => {
  const [records, setRecords]       = useState([]);
  const [total, setTotal]           = useState(0);
  const [page, setPage]             = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch]         = useState("");
  const [loading, setLoading]       = useState(false);
  const [clearing, setClearing]     = useState(false);
  const [dragOver, setDragOver]     = useState(false);
  const [msg, setMsg]               = useState("");
  const [msgType, setMsgType]       = useState("success");

  // ── Upload progress state ────────────────────────────────────────────────
  const [uploadState, setUploadState] = useState(null);
  const pollRef    = useRef(null);
  const startRef   = useRef(null);
  const fileInputRef = useRef();

  // Editable Row State
  const [editingId, setEditingId] = useState(null);
  const [editFormData, setEditFormData] = useState({});

  // New Row State
  const [isAdding, setIsAdding] = useState(false);
  const [newRow, setNewRow] = useState({ id: "", ctuId: "", fullName: "", email: "", phone: "", school: "", program: "", batch: "", studentType: "" });

  const LIMIT = 20;
  const BASE  = `${process.env.REACT_APP_API_URL || "http://localhost:5000"}/api/student-records`;
  const token = localStorage.getItem("grievance_token");

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    try {
      const res  = await fetch(`${BASE}?page=${page}&limit=${LIMIT}&search=${encodeURIComponent(search)}`);
      const data = await res.json();
      if (res.ok) { setRecords(data.records); setTotal(data.total); setTotalPages(data.totalPages); }
      else throw new Error(data.message);
    } catch (err) { showMsg(err.message, "error"); }
    finally { setLoading(false); }
  }, [page, search, BASE]);

  useEffect(() => { fetchRecords(); }, [fetchRecords]);

  const showMsg = (m, t = "success") => { setMsg(m); setMsgType(t); setTimeout(() => setMsg(""), 6000); };

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
          pct,
          speed,
          eta:       remaining,
          errors:    data.errors || [],
        });

        if (data.status === "done" || data.status === "error") {
          stopPoll();
          fetchRecords();
          if (data.status === "done") {
            showMsg(`✅ Upload complete! ${data.inserted} inserted, ${data.skipped} skipped.`, "success");
          } else {
            showMsg(`❌ Upload failed: ${data.errorMessage || "Unknown error"}`, "error");
          }
        }
      } catch (_) { /* ignore poll errors */ }
    }, 500);
  };

  const handleFileUpload = async (file) => {
    if (!file) return;
    const ext = file.name.split(".").pop().toLowerCase();
    if (!["xlsx", "xls"].includes(ext)) { showMsg("❌ Only .xlsx or .xls files allowed", "error"); return; }

    setUploadState({ status: "uploading", pct: 0, total: 0, processed: 0, inserted: 0, skipped: 0, speed: 0, eta: null });
    stopPoll();

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res  = await fetch(`${BASE}/upload`, { method: "POST", headers: { Authorization: `Bearer ${token}` }, body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      setUploadState({ status: "processing", jobId: data.jobId, total: data.total, processed: 0, inserted: 0, skipped: 0, pct: 0, speed: 0, eta: null });
      startPolling(data.jobId, data.total);
    } catch (err) {
      setUploadState(null);
      showMsg(`❌ ${err.message}`, "error");
    }

    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleDrop = (e) => { e.preventDefault(); setDragOver(false); handleFileUpload(e.dataTransfer.files[0]); };

  const handleClearAll = async () => {
    if (!window.confirm("⚠️ Delete ALL student records permanently? This cannot be undone.")) return;
    setClearing(true);
    try {
      const res  = await fetch(`${BASE}/clear-all`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (res.ok) { showMsg(`✅ ${data.message}`, "success"); setUploadState(null); setPage(1); fetchRecords(); }
      else throw new Error(data.message);
    } catch (err) { showMsg(`❌ ${err.message}`, "error"); }
    finally { setClearing(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm(`Are you sure you want to delete student record ${id}?`)) return;
    try {
      const res  = await fetch(`${BASE}/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (res.ok) { showMsg("✅ Record deleted successfully", "success"); fetchRecords(); }
      else throw new Error(data.message);
    } catch (err) { showMsg(`❌ ${err.message}`, "error"); }
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
      if (!res.ok) throw new Error(data.message || "Failed to update");
      
      showMsg("Record updated successfully", "success");
      setEditingId(null);
      fetchRecords(); 
    } catch (err) {
      showMsg(err.message, "error");
    }
  };

  // --- Add new ---
  const handleNewRowChange = (e) => {
    setNewRow({ ...newRow, [e.target.name]: e.target.value });
  };

  const handleAddNew = async () => {
    if (!newRow.id || !newRow.fullName) {
      showMsg("Student ID and Full Name are required", "error");
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
      if (!res.ok) throw new Error(data.message || "Failed to add");

      showMsg("New student record added successfully", "success");
      setIsAdding(false);
      setNewRow({ id: "", ctuId: "", fullName: "", email: "", phone: "", school: "", program: "", batch: "", studentType: "" });
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
            <h2 className="records-title">Student Records Directory</h2>
            <span className="records-count-pill">
              <GraduationCapIcon width="14" height="14" />
              {total.toLocaleString()} Records
            </span>
          </div>
          <p className="records-subtitle">
            Upload, verify and manage CT University student records from master Excel
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
            <><PlusIcon width="15" height="15" /> Add New Student</>
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

      {/* ── SEARCH & FILTER BAR (SLEEK & FIXED) ── */}
      <div className="records-filters-bar">
        <div className="records-search-box">
          <span className="records-search-icon">
            <SearchIcon width="16" height="16" />
          </span>
          <input 
            type="text" 
            className="records-search-input"
            placeholder="Search by ID, CTU ID, Name, Email, Phone, School..." 
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
              title="Permanently remove all student records"
            >
              <TrashIcon width="14" height="14" />
              <span>{clearing ? "Clearing..." : "Clear All Records"}</span>
            </button>
          )}
        </div>
      </div>

      {/* ── SLIDE-DOWN ADD NEW STUDENT CARD ── */}
      {isAdding && (
        <div className="records-add-card">
          <div className="records-add-title">
            <PlusIcon width="16" height="16" style={{ color: "#2563eb" }} />
            <span>Add Single Student Record</span>
          </div>
          <div className="records-form-grid">
            <div className="records-form-field">
              <label className="records-form-label">Student ID *</label>
              <input type="text" name="id" value={newRow.id} onChange={handleNewRowChange} placeholder="e.g. 20210001" className="records-form-input" />
            </div>
            <div className="records-form-field">
              <label className="records-form-label">CTU ID</label>
              <input type="text" name="ctuId" value={newRow.ctuId} onChange={handleNewRowChange} placeholder="e.g. CTU1024" className="records-form-input" />
            </div>
            <div className="records-form-field">
              <label className="records-form-label">Full Name *</label>
              <input type="text" name="fullName" value={newRow.fullName} onChange={handleNewRowChange} placeholder="Student Name" className="records-form-input" />
            </div>
            <div className="records-form-field">
              <label className="records-form-label">Email Address</label>
              <input type="email" name="email" value={newRow.email} onChange={handleNewRowChange} placeholder="student@ctuniversity.in" className="records-form-input" />
            </div>
            <div className="records-form-field">
              <label className="records-form-label">Phone Number</label>
              <input type="text" name="phone" value={newRow.phone} onChange={handleNewRowChange} placeholder="Mobile Number" className="records-form-input" />
            </div>
            <div className="records-form-field">
              <label className="records-form-label">School</label>
              <input type="text" name="school" value={newRow.school} onChange={handleNewRowChange} placeholder="e.g. SET" className="records-form-input" />
            </div>
            <div className="records-form-field">
              <label className="records-form-label">Program</label>
              <input type="text" name="program" value={newRow.program} onChange={handleNewRowChange} placeholder="e.g. B.Tech CSE" className="records-form-input" />
            </div>
            <div className="records-form-field">
              <label className="records-form-label">Batch</label>
              <input type="text" name="batch" value={newRow.batch} onChange={handleNewRowChange} placeholder="e.g. 2022-2026" className="records-form-input" />
            </div>
            <div className="records-form-field">
              <label className="records-form-label">Student Type</label>
              <input type="text" name="studentType" value={newRow.studentType} onChange={handleNewRowChange} placeholder="Regular / Lateral" className="records-form-input" />
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
          onChange={(e) => handleFileUpload(e.target.files[0])} />

        {!uploadState && (
          <div>
            <div className="records-upload-icon-circle">
              <UploadIcon width="24" height="24" />
            </div>
            <p className="records-upload-title">Drag & Drop Excel File</p>
            <p className="records-upload-sub">or click to browse — .xlsx / .xls (Total: {total.toLocaleString()} records)</p>
            <span className="records-upload-browse-btn">
              <UploadIcon width="14" height="14" /> Choose Excel File
            </span>
          </div>
        )}

        {uploadState && uploadState.status === "uploading" && (
          <p style={{ color: "#2563eb", fontWeight: 600, margin: 0 }}>⏳ Reading Excel file...</p>
        )}

        {uploadState && uploadState.status === "processing" && (
          <div style={{ maxWidth: "600px", margin: "0 auto", textAlign: "left" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px", fontSize: "0.86rem", fontWeight: 600 }}>
              <span style={{ color: "#1e40af" }}>⚡ Uploading... {uploadState.pct}%</span>
              <span style={{ color: "#475569" }}>{uploadState.inserted.toLocaleString()} / {uploadState.total.toLocaleString()} records</span>
            </div>
            <div style={{ background: "#dbeafe", borderRadius: "999px", height: "10px", overflow: "hidden", marginBottom: "12px" }}>
              <div style={{
                height: "100%", borderRadius: "999px",
                background: "linear-gradient(90deg, #2563eb, #38bdf8)",
                width: `${uploadState.pct}%`,
                transition: "width 0.3s ease"
              }} />
            </div>
            <div style={{ display: "flex", justifyContent: "center", gap: "20px", fontSize: "0.82rem", color: "#475569", flexWrap: "wrap" }}>
              <span>✅ Inserted: <strong>{uploadState.inserted.toLocaleString()}</strong></span>
              <span>⏭ Skipped: <strong>{uploadState.skipped.toLocaleString()}</strong></span>
              <span>⚡ Speed: <strong>{uploadState.speed.toLocaleString()} rec/s</strong></span>
              {uploadState.eta !== null && <span>⏱ ETA: <strong>{uploadState.eta}s</strong></span>}
            </div>
          </div>
        )}

        {uploadState && uploadState.status === "done" && (
          <div>
            <div style={{ fontSize: "2rem", marginBottom: "6px" }}>✅</div>
            <p style={{ color: "#16a34a", fontWeight: 700, fontSize: "1.05rem", margin: 0 }}>Upload Complete!</p>
            <p style={{ color: "#64748b", margin: "6px 0 12px", fontSize: "0.88rem" }}>
              {uploadState.inserted.toLocaleString()} records inserted/updated · {uploadState.skipped.toLocaleString()} skipped
            </p>
            <button 
              type="button" 
              onClick={(e) => { e.stopPropagation(); setUploadState(null); }} 
              className="records-upload-browse-btn"
            >
              Upload Another
            </button>
          </div>
        )}
      </div>

      {/* ── SUPPORTED COLUMNS GUIDE ── */}
      <div className="records-columns-guide">
        <strong>📋 Supported Columns:</strong>
        <div className="records-column-chips">
          <span className="records-column-chip">ID / Reg No</span>
          <span className="records-column-chip">CTU ID</span>
          <span className="records-column-chip">Full Name</span>
          <span className="records-column-chip">Email</span>
          <span className="records-column-chip">Phone / Mobile</span>
          <span className="records-column-chip">School</span>
          <span className="records-column-chip">Program</span>
          <span className="records-column-chip">Batch</span>
          <span className="records-column-chip">Type</span>
        </div>
      </div>

      {/* ── TABLE VIEW ── */}
      <div className="records-table-wrap">
        <div style={{ overflowX: "auto", width: "100%" }}>
          <table className="records-table">
            <thead>
              <tr>
                <th>Student ID</th>
                <th>CTU ID</th>
                <th>Full Name</th>
                <th>Contact Info</th>
                <th>School</th>
                <th>Program</th>
                <th>Batch</th>
                <th>Type</th>
                <th style={{ textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {/* Existing Records */}
              {loading ? (
                <tr>
                  <td colSpan="9" style={{ textAlign: "center", padding: "36px", color: "#64748b" }}>
                    Loading student records...
                  </td>
                </tr>
              ) : records.length === 0 ? (
                <tr>
                  <td colSpan="9" style={{ textAlign: "center", padding: "40px 20px", color: "#64748b" }}>
                    <SearchIcon width="28" height="28" style={{ color: "#94a3b8", marginBottom: "8px" }} />
                    <div style={{ fontWeight: "600", color: "#334155" }}>No student records found</div>
                    <p style={{ margin: "4px 0 0 0", fontSize: "0.82rem", color: "#64748b" }}>
                      {search ? "Try adjusting your search criteria" : "Upload an Excel sheet to populate student records."}
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
                        <td><input type="text" name="ctuId" value={editFormData.ctuId || ""} onChange={handleEditChange} className="records-form-input" style={{ height: "30px" }} /></td>
                        <td><input type="text" name="fullName" value={editFormData.fullName || ""} onChange={handleEditChange} className="records-form-input" style={{ height: "30px" }} /></td>
                        <td><input type="email" name="email" value={editFormData.email || ""} onChange={handleEditChange} className="records-form-input" style={{ height: "30px" }} /></td>
                        <td><input type="text" name="school" value={editFormData.school || ""} onChange={handleEditChange} className="records-form-input" style={{ height: "30px" }} /></td>
                        <td><input type="text" name="program" value={editFormData.program || ""} onChange={handleEditChange} className="records-form-input" style={{ height: "30px" }} /></td>
                        <td><input type="text" name="batch" value={editFormData.batch || ""} onChange={handleEditChange} className="records-form-input" style={{ height: "30px" }} /></td>
                        <td><input type="text" name="studentType" value={editFormData.studentType || ""} onChange={handleEditChange} className="records-form-input" style={{ height: "30px" }} /></td>
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
                          <span style={{ color: "#475569", fontWeight: 500 }}>{record.ctuId || "—"}</span>
                        </td>
                        <td onDoubleClick={() => handleEditClick(record)}>
                          <div className="records-name-text">{record.fullName || "—"}</div>
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
                          <span style={{ color: "#334155" }}>{record.school || "—"}</span>
                        </td>
                        <td onDoubleClick={() => handleEditClick(record)}>
                          <span style={{ color: "#334155", fontWeight: 500 }}>{record.program || "—"}</span>
                        </td>
                        <td onDoubleClick={() => handleEditClick(record)}>
                          <span style={{ color: "#64748b", fontSize: "0.82rem" }}>{record.batch || "—"}</span>
                        </td>
                        <td onDoubleClick={() => handleEditClick(record)}>
                          <span className="records-type-pill regular">{record.studentType || "Regular"}</span>
                        </td>
                        <td style={{ textAlign: "right" }}>
                          <div className="records-action-group" style={{ justifyContent: "flex-end" }}>
                            <button 
                              type="button" 
                              onClick={() => handleEditClick(record)} 
                              className="records-action-btn edit" 
                              title="Edit student record"
                            >
                              <EditIcon width="14" height="14" />
                            </button>
                            <button 
                              type="button" 
                              onClick={() => handleDelete(record.id)} 
                              className="records-action-btn delete" 
                              title="Delete student record"
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
            Showing <strong>{((page - 1) * LIMIT) + 1}</strong> to <strong>{Math.min(page * LIMIT, total)}</strong> of <strong>{total.toLocaleString()}</strong> records
          </div>
          <div className="records-pag-controls">
            <button 
              type="button"
              className="records-pag-btn"
              onClick={() => setPage(p => Math.max(1, p - 1))} 
              disabled={page === 1}
            >
              Previous
            </button>
            <span style={{ fontSize: "0.82rem", fontWeight: 600, color: "#475569", padding: "0 6px" }}>
              Page {page} of {totalPages}
            </span>
            <button 
              type="button"
              className="records-pag-btn"
              onClick={() => setPage(p => Math.min(totalPages, p + 1))} 
              disabled={page === totalPages}
            >
              Next
            </button>
          </div>
        </div>
      )}
      
      <p style={{ marginTop: "12px", fontSize: "0.8rem", color: "#94a3b8", textAlign: "right", margin: "8px 0 0" }}>
        💡 Double-click any row to edit directly.
      </p>
    </div>
  );
};

export default AdminStudentRecords;
