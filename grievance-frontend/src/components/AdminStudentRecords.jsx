import React, { useState, useEffect, useRef, useCallback } from "react";

const AdminStudentRecords = () => {
  const [records, setRecords]     = useState([]);
  const [total, setTotal]         = useState(0);
  const [page, setPage]           = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch]       = useState("");
  const [loading, setLoading]     = useState(false);
  const [clearing, setClearing]   = useState(false);
  const [dragOver, setDragOver]   = useState(false);
  const [msg, setMsg]             = useState("");
  const [msgType, setMsgType]     = useState("success");

  // ── Upload progress state ────────────────────────────────────────────────
  const [uploadState, setUploadState] = useState(null);
  // null | { status, jobId, total, processed, inserted, skipped, pct, speed, eta }
  const pollRef    = useRef(null);
  const startRef   = useRef(null);
  const fileInputRef = useRef();
  // ────────────────────────────────────────────────────────────────────────

  const LIMIT = 20;
  const BASE  = "http://localhost:5000/api/student-records";
  const token = localStorage.getItem("grievance_token");

  // ── Fetch records table ──────────────────────────────────────────────────
  const fetchRecords = useCallback(async () => {
    setLoading(true);
    try {
      const res  = await fetch(`${BASE}?page=${page}&limit=${LIMIT}&search=${encodeURIComponent(search)}`);
      const data = await res.json();
      if (res.ok) { setRecords(data.records); setTotal(data.total); setTotalPages(data.totalPages); }
      else throw new Error(data.message);
    } catch (err) { showMsg(err.message, "error"); }
    finally { setLoading(false); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  useEffect(() => { fetchRecords(); }, [fetchRecords]);

  const showMsg = (m, t = "success") => { setMsg(m); setMsgType(t); setTimeout(() => setMsg(""), 6000); };

  // ── Stop polling ─────────────────────────────────────────────────────────
  const stopPoll = () => { if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; } };

  // ── Poll progress ────────────────────────────────────────────────────────
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

  // ── File upload handler ──────────────────────────────────────────────────
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

      // Got jobId — start polling
      setUploadState({ status: "processing", jobId: data.jobId, total: data.total, processed: 0, inserted: 0, skipped: 0, pct: 0, speed: 0, eta: null });
      startPolling(data.jobId, data.total);
    } catch (err) {
      setUploadState(null);
      showMsg(`❌ ${err.message}`, "error");
    }

    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // ── Drag & drop ──────────────────────────────────────────────────────────
  const handleDrop = (e) => { e.preventDefault(); setDragOver(false); handleFileUpload(e.dataTransfer.files[0]); };

  // ── Clear all ────────────────────────────────────────────────────────────
  const handleClearAll = async () => {
    if (!window.confirm("⚠️ Delete ALL student records permanently?")) return;
    setClearing(true);
    try {
      const res  = await fetch(`${BASE}/clear-all`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (res.ok) { showMsg(`✅ ${data.message}`, "success"); setUploadState(null); setPage(1); fetchRecords(); }
      else throw new Error(data.message);
    } catch (err) { showMsg(`❌ ${err.message}`, "error"); }
    finally { setClearing(false); }
  };

  // ── Delete one record ─────────────────────────────────────────────────────
  const handleDelete = async (id) => {
    if (!window.confirm(`Delete record ${id}?`)) return;
    try {
      const res  = await fetch(`${BASE}/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (res.ok) { showMsg("✅ Deleted", "success"); fetchRecords(); }
      else throw new Error(data.message);
    } catch (err) { showMsg(`❌ ${err.message}`, "error"); }
  };

  const isUploading = uploadState && (uploadState.status === "uploading" || uploadState.status === "processing");

  const fields = [
    { key: "id",          label: "Reg No / ID" },
    { key: "ctuId",       label: "CTU ID" },
    { key: "fullName",    label: "Full Name" },
    { key: "school",      label: "School" },
    { key: "program",     label: "Program" },
    { key: "batch",       label: "Batch" },
    { key: "studentType", label: "Type" },
    { key: "email",       label: "Email" },
    { key: "phone",       label: "Phone" },
  ];

  return (
    <div style={{ maxWidth: "1300px", margin: "0 auto", padding: "24px" }}>

      {/* ── HEADER ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "20px", flexWrap: "wrap", gap: "16px" }}>
        <div>
          <h2 style={{ margin: 0, fontSize: "1.6rem", fontWeight: 700, color: "#1e293b", display: "flex", alignItems: "center", gap: "10px" }}>
            🎓 Student Records
          </h2>
          <p style={{ color: "#64748b", margin: "4px 0 0", fontSize: "0.9rem" }}>
            Upload Excel to bulk-import. Total: <strong>{total}</strong> records
          </p>
        </div>

        <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
          {total > 0 && (
            <button onClick={handleClearAll} disabled={clearing} style={{
              padding: "9px 16px", background: "#fee2e2", color: "#dc2626",
              border: "1px solid #fca5a5", borderRadius: "8px",
              cursor: clearing ? "not-allowed" : "pointer", fontWeight: 600, fontSize: "0.88rem"
            }}>
              {clearing ? "⏳ Clearing..." : "🗑️ Clear All"}
            </button>
          )}
          <form onSubmit={(e) => { e.preventDefault(); setPage(1); fetchRecords(); }} style={{ display: "flex", gap: "8px" }}>
            <input
              type="text" value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Search ID, name, school..."
              style={{ padding: "9px 14px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "0.9rem", width: "230px", outline: "none" }}
            />
            <button type="submit" style={{ padding: "9px 16px", background: "#2563eb", color: "white", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: 600, fontSize: "0.9rem" }}>
              Search
            </button>
            {search && (
              <button type="button" onClick={() => { setSearch(""); setPage(1); setTimeout(fetchRecords, 0); }}
                style={{ padding: "9px 12px", background: "#f1f5f9", color: "#64748b", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: 600 }}>
                ✕
              </button>
            )}
          </form>
        </div>
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
          marginBottom: "16px", transition: "all 0.2s ease",
        }}
      >
        <input ref={fileInputRef} type="file" accept=".xlsx,.xls" style={{ display: "none" }}
          onChange={(e) => handleFileUpload(e.target.files[0])} />

        {!uploadState && (
          <div>
            <div style={{ fontSize: "2.5rem", marginBottom: "10px" }}>📊</div>
            <p style={{ color: "#1e40af", fontWeight: 700, fontSize: "1.05rem", margin: 0 }}>Drag & Drop Excel File</p>
            <p style={{ color: "#64748b", margin: "6px 0 12px", fontSize: "0.88rem" }}>or click to browse — .xlsx / .xls</p>
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
            {/* Progress Bar */}
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
            <button onClick={() => setUploadState(null)} style={{ marginTop: "10px", padding: "7px 18px", background: "#2563eb", color: "white", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: 600, fontSize: "0.88rem" }}>
              Upload Another
            </button>
          </div>
        )}
      </div>

      {/* ── Column hint ── */}
      <div style={{ background: "#f0f9ff", border: "1px solid #bae6fd", borderRadius: "8px", padding: "10px 16px", marginBottom: "16px", fontSize: "0.8rem", color: "#0369a1" }}>
        <strong>📋 Expected Excel Columns:</strong>
        <span style={{ marginLeft: "8px" }}>ID / Registration No · CTU ID · Name · Email · Phone number · School · program · batch (20xx - 20xx)</span>
      </div>

      {/* ── Alert ── */}
      {msg && (
        <div style={{
          padding: "12px 16px", borderRadius: "8px", marginBottom: "14px", fontWeight: 500, fontSize: "0.9rem",
          background: msgType === "error" ? "#fef2f2" : "#f0fdf4",
          color: msgType === "error" ? "#dc2626" : "#16a34a",
          border: `1px solid ${msgType === "error" ? "#fecaca" : "#bbf7d0"}`,
        }}>
          {msg}
        </div>
      )}

      {/* ── TABLE ── */}
      <div style={{ background: "white", borderRadius: "12px", border: "1px solid #e2e8f0", overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.07)" }}>
        {loading ? (
          <div style={{ padding: "60px", textAlign: "center", color: "#94a3b8" }}>⏳ Loading...</div>
        ) : records.length === 0 ? (
          <div style={{ padding: "60px", textAlign: "center", color: "#94a3b8" }}>
            <div style={{ fontSize: "2.5rem", marginBottom: "10px" }}>📂</div>
            <p style={{ margin: 0, fontWeight: 600 }}>No records yet</p>
            <p style={{ margin: "6px 0 0", fontSize: "0.88rem" }}>Upload an Excel file above</p>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
              <thead>
                <tr style={{ background: "#f8fafc", borderBottom: "2px solid #e2e8f0" }}>
                  {fields.map((f) => (
                    <th key={f.key} style={{ padding: "12px 14px", textAlign: "left", fontWeight: 600, color: "#475569", whiteSpace: "nowrap" }}>{f.label}</th>
                  ))}
                  <th style={{ padding: "12px 14px", textAlign: "center", fontWeight: 600, color: "#475569" }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {records.map((r, idx) => (
                  <tr key={r._id || idx}
                    style={{ borderBottom: "1px solid #f1f5f9", transition: "background 0.15s" }}
                    onMouseEnter={(e) => e.currentTarget.style.background = "#f8fafc"}
                    onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                  >
                    {fields.map((f) => (
                      <td key={f.key} style={{ padding: "11px 14px", color: f.key === "id" ? "#1e293b" : "#475569", fontWeight: f.key === "id" ? 600 : 400, whiteSpace: "nowrap" }}>
                        {r[f.key] || <span style={{ color: "#cbd5e1", fontStyle: "italic" }}>—</span>}
                      </td>
                    ))}
                    <td style={{ padding: "11px 14px", textAlign: "center" }}>
                      <button onClick={() => handleDelete(r.id)}
                        style={{ padding: "5px 10px", background: "#fee2e2", color: "#dc2626", border: "1px solid #fca5a5", borderRadius: "6px", cursor: "pointer", fontWeight: 600, fontSize: "0.78rem" }}
                        onMouseEnter={(e) => e.currentTarget.style.background = "#fecaca"}
                        onMouseLeave={(e) => e.currentTarget.style.background = "#fee2e2"}
                      >
                        🗑 Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── PAGINATION ── */}
      {totalPages > 1 && (
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "8px", marginTop: "18px" }}>
          <button disabled={page === 1} onClick={() => setPage((p) => p - 1)}
            style={{ padding: "7px 14px", borderRadius: "7px", border: "1px solid #e2e8f0", background: page === 1 ? "#f8fafc" : "white", color: page === 1 ? "#94a3b8" : "#1e293b", cursor: page === 1 ? "not-allowed" : "pointer", fontWeight: 600 }}>
            ← Prev
          </button>
          <span style={{ color: "#64748b", fontSize: "0.88rem" }}>
            Page <strong>{page}</strong> / <strong>{totalPages}</strong> · {total.toLocaleString()} records
          </span>
          <button disabled={page === totalPages} onClick={() => setPage((p) => p + 1)}
            style={{ padding: "7px 14px", borderRadius: "7px", border: "1px solid #e2e8f0", background: page === totalPages ? "#f8fafc" : "white", color: page === totalPages ? "#94a3b8" : "#1e293b", cursor: page === totalPages ? "not-allowed" : "pointer", fontWeight: 600 }}>
            Next →
          </button>
        </div>
      )}
    </div>
  );
};

export default AdminStudentRecords;
