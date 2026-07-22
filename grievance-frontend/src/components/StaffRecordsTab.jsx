import React, { useState, useEffect } from "react";
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

  // New Row State
  const [newRow, setNewRow] = useState({ id: "", fullName: "", email: "", phone: "", role: "staff", department: "" });
  const [isAdding, setIsAdding] = useState(false);

  // Editable Row State
  const [editingId, setEditingId] = useState(null);
  const [editFormData, setEditFormData] = useState({});

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

      <div style={{ display: "flex", marginBottom: "20px", gap: "10px" }}>
        <form onSubmit={handleSearch} style={{ display: "flex", flex: 1, gap: "10px" }}>
          <input 
            type="text" 
            placeholder="Search by ID, Name, Email, Phone..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ padding: "10px", borderRadius: "6px", border: "1px solid #cbd5e1", flex: 1 }}
          />
          <button type="submit" style={{ padding: "10px 20px", background: "#64748b", color: "white", borderRadius: "6px", border: "none", cursor: "pointer" }}>Search</button>
          <button type="button" onClick={() => { setSearch(""); setPage(1); fetchRecords(); }} style={{ padding: "10px 20px", background: "#e2e8f0", color: "#475569", borderRadius: "6px", border: "none", cursor: "pointer" }}>Clear</button>
        </form>
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
