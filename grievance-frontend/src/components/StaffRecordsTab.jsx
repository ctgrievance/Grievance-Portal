import React, { useState, useEffect, useRef, useCallback } from "react";
import { TrashIcon } from "./Icons";

function StaffRecordsTab() {
  const [records, setRecords] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [limit] = useState(20);
  const [search, setSearch] = useState("");
  
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [msgType, setMsgType] = useState("");
  const [clearing, setClearing]   = useState(false);
  const [dragOver, setDragOver]   = useState(false);

  // ── Upload progress state ────────────────────────────────────────────────
  const [uploadState, setUploadState] = useState(null);
  const pollRef    = useRef(null);
  const startRef   = useRef(null);
  const fileInputRef = useRef();

  // New Row State
  const [newRow, setNewRow] = useState({ id: "", fullName: "", email: "", phone: "", role: "staff", department: "" });
  const [isAdding, setIsAdding] = useState(false);

  // Editable Row State
  const [editingId, setEditingId] = useState(null);
  const [editFormData, setEditFormData] = useState({});

  const BASE = `${process.env.REACT_APP_API_URL || "http://localhost:5000"}/api/staff-records`;
  const token = localStorage.getItem("grievance_token");

  useEffect(() => {
    fetchRecords();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const fetchRecords = async () => {
    setLoading(true);
    try {
      const url = `${process.env.REACT_APP_API_URL || "http://localhost:5000"}/api/staff-records?page=${page}&limit=${limit}&search=${encodeURIComponent(search)}`;
      const res = await fetch(url);
      const data = await res.json();

      if (res.ok) {
        setRecords(data.records);
        setTotal(data.total);
        setTotalPages(data.totalPages);
      } else {
        throw new Error(data.message || "Failed to fetch records");
      }
    } catch (err) {
      showMsg(err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1); // Reset to page 1 on new search
    fetchRecords();
  };

  const showMsg = (message, type) => {
    setMsg(message);
    setMsgType(type);
    setTimeout(() => setMsg(""), 3000);
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
    if (!window.confirm("⚠️ Delete ALL staff records permanently?")) return;
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
      const res = await fetch(`${process.env.REACT_APP_API_URL || "http://localhost:5000"}/api/staff-records/${id}`, {
         method: "PUT",
         headers: { "Content-Type": "application/json" },
         body: JSON.stringify(editFormData)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to update");
      
      showMsg("Record updated successfully", "success");
      setEditingId(null);
      fetchRecords(); // Refresh data
    } catch (err) {
      showMsg(err.message, "error");
    }
  };

  // --- Add new ---
  const handleNewRowChange = (e) => {
    setNewRow({ ...newRow, [e.target.name]: e.target.value });
  };

  const handleAddNew = async () => {
    try {
      if (!newRow.id || !newRow.role) throw new Error("ID and Role are required");

      const res = await fetch(`${process.env.REACT_APP_API_URL || "http://localhost:5000"}/api/staff-records`, {
         method: "POST",
         headers: { "Content-Type": "application/json" },
         body: JSON.stringify(newRow)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to add");

      showMsg("New staff added successfully", "success");
      setIsAdding(false);
      setNewRow({ id: "", fullName: "", email: "", phone: "", role: "staff", department: "" });
      fetchRecords();
    } catch (err) {
      showMsg(err.message, "error");
    }
  };

  // --- Delete ---
  const handleDelete = async (id) => {
    if (!window.confirm(`Are you sure you want to delete staff ID ${id}?`)) return;
    try {
      const res = await fetch(`${process.env.REACT_APP_API_URL || "http://localhost:5000"}/api/staff-records/${id}`, {
         method: "DELETE"
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to delete");
      
      showMsg("Staff deleted", "success");
      fetchRecords();
    } catch (err) {
      showMsg(err.message, "error");
    }
  };

  // --- Styles ---
  const tableInputStyle = {
    width: "100%", padding: "6px", border: "1px solid #cbd5e1", borderRadius: "4px"
  };
  const isUploading = uploadState && (uploadState.status === "uploading" || uploadState.status === "processing");

  return (
    <div className="card" style={{ padding: "20px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
        <h2>Staff Records (Excel View)</h2>
        <button 
          onClick={() => setIsAdding(!isAdding)}
          style={{ padding: "10px 20px", background: "#2563eb", color: "white", borderRadius: "6px", border: "none", cursor: "pointer", fontWeight: "600" }}
        >
          {isAdding ? "Cancel Addition" : "+ Add New Staff"}
        </button>
      </div>

      {msg && <div className={`alert-box ${msgType}`}>{msg}</div>}

      <div style={{ display: "flex", alignItems: "center", marginBottom: "20px", gap: "15px", justifyContent: "space-between", flexWrap: "wrap" }}>
        <form onSubmit={handleSearch} style={{ display: "flex", flexDirection: "row", alignItems: "center", flex: 1, gap: "10px", maxWidth: "800px", margin: 0 }}>
          <input 
            type="text" 
            placeholder="Search by ID, Name, Email, Phone..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ padding: "10px 15px", borderRadius: "8px", border: "1px solid #cbd5e1", flex: 1, margin: 0 }}
          />
          <button type="submit" style={{ padding: "10px 20px", background: "#6366f1", color: "white", borderRadius: "8px", border: "none", cursor: "pointer", fontWeight: "600", whiteSpace: "nowrap" }}>Search</button>
          <button type="button" onClick={() => { setSearch(""); setPage(1); fetchRecords(); }} style={{ padding: "10px 20px", background: "#f1f5f9", color: "#475569", borderRadius: "8px", border: "1px solid #e2e8f0", cursor: "pointer", fontWeight: "600", whiteSpace: "nowrap" }}>Clear</button>
        </form>

        {total > 0 && (
          <button onClick={handleClearAll} disabled={clearing} style={{
            padding: "10px 20px", background: "#fee2e2", color: "#ef4444",
            borderRadius: "8px", border: "1px solid #fca5a5",
            cursor: clearing ? "not-allowed" : "pointer", fontWeight: "bold",
            whiteSpace: "nowrap"
          }}>
            {clearing ? "Clearing..." : "🗑️ Clear All Records"}
          </button>
        )}
      </div>

      {/* ── UPLOAD ZONE ── */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => !isUploading && fileInputRef.current?.click()}
        style={{
          border: `2px dashed ${dragOver ? "#2563eb" : isUploading ? "#60a5fa" : "#93c5fd"}`,
          borderRadius: "14px", padding: "28px 24px", textAlign: "center",
          background: dragOver ? "#eff6ff" : isUploading ? "#f0f7ff" : "#f8faff",
          cursor: isUploading ? "default" : "pointer",
          marginBottom: "20px", transition: "all 0.2s ease",
        }}
      >
        <input ref={fileInputRef} type="file" accept=".xlsx,.xls" style={{ display: "none" }}
          onChange={(e) => handleFileUpload(e.target.files[0])} />

        {!uploadState && (
          <div>
            <div style={{ fontSize: "2.5rem", marginBottom: "10px" }}>📊</div>
            <p style={{ color: "#1e40af", fontWeight: 700, fontSize: "1.05rem", margin: 0 }}>Drag & Drop Excel File</p>
            <p style={{ color: "#64748b", margin: "6px 0 12px", fontSize: "0.88rem" }}>or click to browse — .xlsx / .xls (Total: {total} records)</p>
            <span style={{ padding: "8px 20px", background: "#2563eb", color: "white", borderRadius: "8px", fontWeight: 600, fontSize: "0.88rem" }}>
              📁 Choose File
            </span>
          </div>
        )}

        {uploadState && uploadState.status === "uploading" && (
          <p style={{ color: "#2563eb", fontWeight: 600, margin: 0 }}>⏳ Reading Excel file...</p>
        )}

        {uploadState && uploadState.status === "processing" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px", fontSize: "0.88rem", fontWeight: 600 }}>
              <span style={{ color: "#1e40af" }}>⚡ Uploading... {uploadState.pct}%</span>
              <span style={{ color: "#475569" }}>{uploadState.inserted.toLocaleString()} / {uploadState.total.toLocaleString()} records</span>
            </div>
            <div style={{ background: "#dbeafe", borderRadius: "999px", height: "14px", overflow: "hidden", marginBottom: "10px" }}>
              <div style={{
                height: "100%", borderRadius: "999px",
                background: "linear-gradient(90deg, #2563eb, #60a5fa)",
                width: `${uploadState.pct}%`,
                transition: "width 0.4s ease",
                boxShadow: "0 0 8px rgba(37,99,235,0.4)"
              }} />
            </div>
            <div style={{ display: "flex", justifyContent: "center", gap: "24px", fontSize: "0.83rem", color: "#475569" }}>
              <span>✅ Inserted: <strong>{uploadState.inserted.toLocaleString()}</strong></span>
              <span>⏭ Skipped: <strong>{uploadState.skipped.toLocaleString()}</strong></span>
              <span>⚡ Speed: <strong>{uploadState.speed.toLocaleString()} rec/s</strong></span>
              {uploadState.eta !== null && <span>⏱ ETA: <strong>{uploadState.eta}s</strong></span>}
            </div>
          </div>
        )}

        {uploadState && uploadState.status === "done" && (
          <div>
            <div style={{ fontSize: "2.5rem", marginBottom: "8px" }}>✅</div>
            <p style={{ color: "#16a34a", fontWeight: 700, fontSize: "1.05rem", margin: 0 }}>Upload Complete!</p>
            <p style={{ color: "#64748b", margin: "6px 0 0", fontSize: "0.88rem" }}>
              {uploadState.inserted.toLocaleString()} inserted · {uploadState.skipped.toLocaleString()} skipped
            </p>
            <button onClick={(e) => { e.stopPropagation(); setUploadState(null); }} style={{ marginTop: "10px", padding: "7px 18px", background: "#2563eb", color: "white", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: 600, fontSize: "0.88rem" }}>
              Upload Another
            </button>
          </div>
        )}
      </div>

      <div style={{ background: "#f0f9ff", border: "1px solid #bae6fd", borderRadius: "8px", padding: "10px 16px", marginBottom: "16px", fontSize: "0.8rem", color: "#0369a1" }}>
        <strong>📋 Expected Excel Columns:</strong>
        <span style={{ marginLeft: "8px" }}>ID / Staff ID · Name · Email · Phone number · Role · Department</span>
      </div>

      <div className="table-container" style={{ overflowX: "auto" }}>
        <table className="grievance-table" style={{ width: "100%", minWidth: "800px" }}>
          <thead>
            <tr>
              <th>ID</th>
              <th>Full Name</th>
              <th>Email</th>
              <th>Phone</th>
              <th>Role</th>
              <th>Department</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {/* New Row Input */}
            {isAdding && (
              <tr style={{ background: "#f0fdf4" }}>
                <td><input type="text" name="id" value={newRow.id} onChange={handleNewRowChange} placeholder="e.g. STF001" style={tableInputStyle} /></td>
                <td><input type="text" name="fullName" value={newRow.fullName} onChange={handleNewRowChange} placeholder="Name" style={tableInputStyle} /></td>
                <td><input type="email" name="email" value={newRow.email} onChange={handleNewRowChange} placeholder="Email" style={tableInputStyle} /></td>
                <td><input type="text" name="phone" value={newRow.phone} onChange={handleNewRowChange} placeholder="Phone" style={tableInputStyle} /></td>
                <td>
                  <select name="role" value={newRow.role} onChange={handleNewRowChange} style={{...tableInputStyle, background: "#f1f5f9", cursor: "not-allowed"}} disabled>
                    <option value="staff">Staff</option>
                  </select>
                </td>
                <td><input type="text" name="department" value={newRow.department} onChange={handleNewRowChange} placeholder="Dept" style={tableInputStyle} /></td>
                <td>
                  <button onClick={handleAddNew} style={{ padding: "6px 12px", background: "#16a34a", color: "white", border: "none", borderRadius: "4px", cursor: "pointer" }}>Save</button>
                </td>
              </tr>
            )}

            {/* Existing Records */}
            {loading ? (
              <tr><td colSpan="7" style={{ textAlign: "center", padding: "20px" }}>Loading records...</td></tr>
            ) : records.length === 0 ? (
              <tr><td colSpan="7" style={{ textAlign: "center", padding: "20px" }}>No staff records found.</td></tr>
            ) : (
              records.map(record => (
                <tr key={record.id}>
                  {editingId === record.id ? (
                    <>
                      {/* Editable Row */}
                      <td><input type="text" value={editFormData.id} disabled style={{...tableInputStyle, background: "#f1f5f9"}} /></td>
                      <td><input type="text" name="fullName" value={editFormData.fullName} onChange={handleEditChange} style={tableInputStyle} /></td>
                      <td><input type="email" name="email" value={editFormData.email} onChange={handleEditChange} style={tableInputStyle} /></td>
                      <td><input type="text" name="phone" value={editFormData.phone} onChange={handleEditChange} style={tableInputStyle} /></td>
                      <td>
                        <select name="role" value={editFormData.role} onChange={handleEditChange} style={tableInputStyle}>
                          <option value="staff">Staff</option>
                          <option value="admin">Admin</option>
                        </select>
                      </td>
                      <td><input type="text" name="department" value={editFormData.department} onChange={handleEditChange} style={tableInputStyle} /></td>
                      <td>
                        <button onClick={() => handleSaveEdit(record.id)} style={{ padding: "6px 12px", background: "#3b82f6", color: "white", border: "none", borderRadius: "4px", cursor: "pointer", marginRight: "5px" }}>💾</button>
                        <button onClick={handleCancelEdit} style={{ padding: "6px 12px", background: "#ef4444", color: "white", border: "none", borderRadius: "4px", cursor: "pointer" }}>✖</button>
                      </td>
                    </>
                  ) : (
                    <>
                      {/* Normal View Row */}
                      <td onDoubleClick={() => handleEditClick(record)} style={{ fontWeight: "bold" }}>{record.id}</td>
                      <td onDoubleClick={() => handleEditClick(record)}>{record.fullName || "-"}</td>
                      <td onDoubleClick={() => handleEditClick(record)}>{record.email || "-"}</td>
                      <td onDoubleClick={() => handleEditClick(record)}>{record.phone || "-"}</td>
                      <td onDoubleClick={() => handleEditClick(record)}><span className={`status-badge ${record.role === 'admin' ? 'status-resolved' : 'status-pending'}`}>{record.role}</span></td>
                      <td onDoubleClick={() => handleEditClick(record)}>{record.department || "-"}</td>
                      <td>
                        <button onClick={() => handleEditClick(record)} style={{ padding: "6px 12px", background: "#e2e8f0", border: "none", borderRadius: "4px", cursor: "pointer", marginRight: "5px" }}>Edit</button>
                        <button onClick={() => handleDelete(record.id)} style={{ padding: "6px", background: "#fee2e2", border: "none", borderRadius: "4px", cursor: "pointer", color: "#ef4444" }}>
                          <TrashIcon width="16" height="16" />
                        </button>
                      </td>
                    </>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      {!loading && totalPages > 1 && (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "20px" }}>
          <div>Showing page {page} of {totalPages} ({total} total records)</div>
          <div style={{ display: "flex", gap: "10px" }}>
            <button 
              onClick={() => setPage(p => Math.max(1, p - 1))} 
              disabled={page === 1}
              style={{ padding: "8px 16px", borderRadius: "6px", border: "1px solid #cbd5e1", background: page === 1 ? "#f1f5f9" : "white", cursor: page === 1 ? "not-allowed" : "pointer" }}
            >
              Previous
            </button>
            <button 
              onClick={() => setPage(p => Math.min(totalPages, p + 1))} 
              disabled={page === totalPages}
              style={{ padding: "8px 16px", borderRadius: "6px", border: "1px solid #cbd5e1", background: page === totalPages ? "#f1f5f9" : "white", cursor: page === totalPages ? "not-allowed" : "pointer" }}
            >
              Next
            </button>
          </div>
        </div>
      )}
      
      <p style={{ marginTop: "10px", fontSize: "0.85rem", color: "#64748b", fontStyle: "italic" }}>
        * Tip: You can double-click on any cell to quickly edit the row.
      </p>
    </div>
  );
}

export default StaffRecordsTab;
