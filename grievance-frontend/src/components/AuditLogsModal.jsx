import React, { useEffect, useState } from "react";
import { XIcon, RefreshIcon } from "./Icons";
import "../styles/Dashboard.css"; // Reuse styling where possible

const AuditLogsModal = ({ onClose, collectionName }) => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("grievance_token");
      const res = await fetch(`${process.env.REACT_APP_API_URL || "http://localhost:5000"}/api/audit-logs?collectionName=${collectionName}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) setLogs(data.logs);
    } catch (err) {
      console.error("Failed to fetch logs:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [collectionName]);

  const getActionBadge = (action) => {
    switch(action) {
      case "ADD": return <span style={{color: "green", fontWeight: "bold"}}>ADDED</span>;
      case "UPDATE": return <span style={{color: "#E28743", fontWeight: "bold"}}>UPDATED</span>;
      case "DELETE": return <span style={{color: "red", fontWeight: "bold"}}>DELETED</span>;
      case "UPLOAD": return <span style={{color: "blue", fontWeight: "bold"}}>BULK UPLOADED</span>;
      case "CLEAR_ALL": return <span style={{color: "darkred", fontWeight: "bold"}}>CLEARED ALL</span>;
      default: return <span>{action}</span>;
    }
  };

  return (
    <div className="fixed inset-0" style={{position:"fixed", top:0, left:0, width:"100vw", height:"100vh", backgroundColor:"rgba(0,0,0,0.5)", zIndex: 9999, display: "flex", justifyContent: "center", alignItems: "center"}}>
      <div style={{backgroundColor: "#fff", width: "80%", maxWidth: "900px", height: "80vh", borderRadius: "8px", display: "flex", flexDirection: "column", overflow: "hidden"}}>
        <div style={{padding: "20px", borderBottom: "1px solid #eee", display: "flex", justifyContent: "space-between", alignItems: "center", backgroundColor: "#f9fafb"}}>
          <h2 style={{margin: 0, fontSize: "1.2rem", color: "#111827", fontWeight: "600"}}>
            Data Modification Logs ({collectionName === "StudentRecord" || collectionName === "StudentUser" ? "Students" : "Staff"})
          </h2>
          <div style={{display: "flex", gap: "10px"}}>
            <button onClick={fetchLogs} style={{background:"none", border:"1px solid #ccc", padding: "6px 12px", borderRadius:"6px", cursor: "pointer", display:"flex", alignItems:"center", gap:"5px"}}>
              <RefreshIcon width="14" height="14"/> Refresh
            </button>
            <button onClick={onClose} style={{background:"none", border:"none", cursor: "pointer", padding: "5px"}}>
              <XIcon width="20" height="20" />
            </button>
          </div>
        </div>
        
        <div style={{flex: 1, overflowY: "auto", padding: "0"}}>
          {loading ? (
            <div style={{padding: "40px", textAlign: "center", color: "#6b7280"}}>Loading logs...</div>
          ) : logs.length === 0 ? (
            <div style={{padding: "40px", textAlign: "center", color: "#6b7280"}}>No audit logs found.</div>
          ) : (
            <table style={{width: "100%", borderCollapse: "collapse"}}>
              <thead style={{backgroundColor: "#f3f4f6", position: "sticky", top: 0}}>
                <tr>
                  <th style={{padding: "12px 20px", textAlign: "left", fontSize: "0.75rem", color: "#4b5563", textTransform: "uppercase"}}>Time</th>
                  <th style={{padding: "12px 20px", textAlign: "left", fontSize: "0.75rem", color: "#4b5563", textTransform: "uppercase"}}>Action</th>
                  <th style={{padding: "12px 20px", textAlign: "left", fontSize: "0.75rem", color: "#4b5563", textTransform: "uppercase"}}>Performed By</th>
                  <th style={{padding: "12px 20px", textAlign: "left", fontSize: "0.75rem", color: "#4b5563", textTransform: "uppercase"}}>Details</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log._id} style={{borderBottom: "1px solid #f3f4f6"}}>
                    <td style={{padding: "12px 20px", fontSize: "0.85rem", color: "#374151"}}>
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                    <td style={{padding: "12px 20px", fontSize: "0.85rem"}}>
                      {getActionBadge(log.action)}
                    </td>
                    <td style={{padding: "12px 20px", fontSize: "0.85rem", color: "#111827"}}>
                      {log.performedBy?.fullName} <br/>
                      <span style={{color: "#6b7280", fontSize: "0.75rem"}}>{log.performedBy?.role} ({log.performedBy?.id})</span>
                    </td>
                    <td style={{padding: "12px 20px", fontSize: "0.85rem", color: "#4b5563"}}>
                      <pre style={{margin: 0, fontFamily: "inherit", whiteSpace: "pre-wrap"}}>
                        {JSON.stringify(log.details, null, 2)}
                      </pre>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

export default AuditLogsModal;
