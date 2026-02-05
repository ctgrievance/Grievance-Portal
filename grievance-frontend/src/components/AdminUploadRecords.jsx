import React, { useState, useEffect } from "react";
import "../styles/Dashboard.css";
import { DownloadIcon, EyeIcon, FileIcon, UploadIcon, UsersIcon } from "./Icons";

const AdminUploadRecords = () => {
  const [file, setFile] = useState(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [loadingFiles, setLoadingFiles] = useState(true);
  const [exportingUsers, setExportingUsers] = useState(false);
  const [skippedRecords, setSkippedRecords] = useState([]); // 🔥 Track skipped records

  const token = localStorage.getItem("grievance_token");

  // Fetch list of uploaded files
  const fetchUploadedFiles = async () => {
    try {
      setLoadingFiles(true);
      const res = await fetch("http://localhost:5000/api/admin/uploaded-files", {
        headers: { "Authorization": `Bearer ${token}` }
      });

      if (res.ok) {
        const data = await res.json();

        // Filter for specific file extensions (.csv, .xls, .xlsx)
        const validExtensions = ['.csv', '.xls', '.xlsx'];
        const filteredFiles = (data.files || []).filter(file => {
          const ext = file.filename.substring(file.filename.lastIndexOf('.')).toLowerCase();
          return validExtensions.includes(ext);
        });

        // Sort by uploadDate (newest first)
        const sortedFiles = filteredFiles.sort((a, b) => new Date(b.uploadDate) - new Date(a.uploadDate));

        setUploadedFiles(sortedFiles);
      }
    } catch (err) {
      console.error("Error fetching files:", err);
    } finally {
      setLoadingFiles(false);
    }
  };

  useEffect(() => {
    fetchUploadedFiles();
  }, []);

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
      setMessage("");
      setSkippedRecords([]); // 🔥 Clear previous skipped records
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setMessage("❌ Please select an Excel file first.");
      return;
    }

    const validExtensions = ['.xlsx', '.xls', '.csv'];
    const fileExtension = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();

    if (!validExtensions.includes(fileExtension)) {
      setMessage("❌ Invalid file format. Please upload .xlsx or .xls file.");
      return;
    }

    setLoading(true);
    setSkippedRecords([]); // 🔥 Clear previous skipped records
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("http://localhost:5000/api/admin/upload-records", {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}` },
        body: formData,
      });

      const data = await res.json();

      if (res.ok) {
        setMessage(data.message || "✅ Upload Successful!");
        setFile(null);
        document.getElementById("fileInput").value = "";
        fetchUploadedFiles(); // Refresh file list

        // 🔥 Store skipped records if any
        if (data.skippedDetails && data.skippedDetails.length > 0) {
          setSkippedRecords(data.skippedDetails);
        }
      } else {
        setMessage(`❌ Error: ${data.message}`);
      }
    } catch (err) {
      console.error("Upload Error:", err);
      setMessage("❌ Server Error. Could not upload.");
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadFile = (filename) => {
    window.open(`http://localhost:5000/api/admin/download-file/${filename}`, '_blank');
  };

  const handlePreviewFile = (filename) => {
    window.open(`http://localhost:5000/api/admin/preview-file/${filename}`, '_blank');
  };

  const handleExportUsers = async () => {
    setExportingUsers(true);
    try {
      const res = await fetch("http://localhost:5000/api/admin/export-users", {
        headers: { "Authorization": `Bearer ${token}` }
      });

      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `users_export_${new Date().toISOString().split('T')[0]}.xlsx`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        setMessage("✅ Users exported successfully!");
      } else {
        setMessage("❌ Failed to export users");
      }
    } catch (err) {
      console.error("Export Error:", err);
      setMessage("❌ Export failed");
    } finally {
      setExportingUsers(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return "N/A";
    const kb = bytes / 1024;
    if (kb < 1024) return `${kb.toFixed(2)} KB`;
    return `${(kb / 1024).toFixed(2)} MB`;
  };

  return (
    <div className="upload-container" style={{ maxWidth: '1200px', margin: '0 auto' }}>
      <h2 style={{ marginBottom: '10px', color: '#1e293b' }}>📂 University Records Management</h2>
      <p style={{ color: '#64748b', marginBottom: '30px' }}>Upload and manage university records, export user data</p>

      {/* Upload Section */}
      <div className="card" style={{ marginBottom: '30px' }}>
        <h3 style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '15px' }}>
          <UploadIcon width="24" height="24" />
          Upload New Records
        </h3>

        {/* Excel Format Instructions */}


        <div style={{ display: 'flex', gap: '15px', alignItems: 'center', flexWrap: 'wrap' }}>
          <input
            id="fileInput"
            type="file"
            accept=".xlsx, .xls, .csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
            onChange={handleFileChange}
            style={{
              flex: '1',
              padding: '12px',
              border: '2px dashed #cbd5e1',
              borderRadius: '8px',
              cursor: 'pointer',
              background: '#f8fafc'
            }}
          />

          <button
            onClick={handleUpload}
            disabled={loading || !file}
            className="submit-btn"
            style={{
              minWidth: '150px',
              opacity: loading || !file ? 0.6 : 1,
              cursor: loading || !file ? 'not-allowed' : 'pointer'
            }}
          >
            {loading ? "Uploading..." : "Upload Records"}
          </button>
        </div>

        {file && (
          <div style={{ marginTop: '15px', padding: '10px', background: '#eff6ff', borderRadius: '6px', fontSize: '0.9rem' }}>
            <strong>Selected:</strong> {file.name} ({formatFileSize(file.size)})
          </div>
        )}

        {message && (
          <div
            style={{
              marginTop: '15px',
              padding: '12px',
              borderRadius: '8px',
              color: message.startsWith("❌") ? "#dc2626" : "#16a34a",
              backgroundColor: message.startsWith("❌") ? "#fef2f2" : "#f0fdf4",
              border: `1px solid ${message.startsWith("❌") ? "#fecaca" : "#bbf7d0"}`
            }}
          >
            {message}
          </div>
        )}

        {/* 🔥 Skipped Records Section */}
        {skippedRecords.length > 0 && (
          <div style={{
            marginTop: '20px',
            padding: '15px',
            background: '#fef3c7',
            border: '1px solid #f59e0b',
            borderRadius: '8px'
          }}>
            <h4 style={{ color: '#92400e', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              ⚠️ Skipped Records ({skippedRecords.length})
            </h4>
            <p style={{ color: '#78350f', fontSize: '0.85rem', marginBottom: '12px' }}>
              Yeh records upload nahi hue kyunki ID/Role validation fail hui (Staff/Admin = Role "staff" ya "admin" hona chahiye, Student = 8 digits ID ya Role "student")
            </p>
            <div style={{ maxHeight: '250px', overflowY: 'auto' }}>
              <table style={{
                width: '100%',
                borderCollapse: 'collapse',
                fontSize: '0.85rem',
                background: 'white',
                borderRadius: '6px'
              }}>
                <thead>
                  <tr style={{ background: '#f59e0b', color: 'white' }}>
                    <th style={{ padding: '8px', textAlign: 'left' }}>S.No</th>
                    <th style={{ padding: '8px', textAlign: 'left' }}>ID</th>
                    <th style={{ padding: '8px', textAlign: 'left' }}>Email</th>
                    <th style={{ padding: '8px', textAlign: 'left' }}>Reason</th>
                  </tr>
                </thead>
                <tbody>
                  {skippedRecords.map((record, index) => (
                    <tr key={index} style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <td style={{ padding: '8px' }}>{index + 1}</td>
                      <td style={{ padding: '8px', fontWeight: '600', color: '#dc2626' }}>{record.id}</td>
                      <td style={{ padding: '8px' }}>{record.email}</td>
                      <td style={{ padding: '8px', color: '#78350f', fontSize: '0.8rem' }}>{record.reason}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Export Users Section */}
      <div className="card" style={{ marginBottom: '30px' }}>
        <h3 style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '15px' }}>
          <UsersIcon width="24" height="24" />
          Export Users Database
        </h3>
        <p style={{ color: '#64748b', marginBottom: '15px', fontSize: '0.9rem' }}>
          Download all registered users as an Excel file
        </p>
        <button
          onClick={handleExportUsers}
          disabled={exportingUsers}
          className="action-btn"
          style={{
            background: '#10b981',
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            opacity: exportingUsers ? 0.6 : 1
          }}
        >
          <DownloadIcon width="18" height="18" />
          {exportingUsers ? "Exporting..." : "Export All Users"}
        </button>
      </div>

      {/* Uploaded Files List */}
      <div className="card">
        <h3 style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '15px' }}>
          <FileIcon width="24" height="24" />
          Uploaded Files
        </h3>

        {loadingFiles ? (
          <p style={{ color: '#64748b' }}>Loading files...</p>
        ) : uploadedFiles.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
            <FileIcon width="48" height="48" style={{ margin: '0 auto 15px', opacity: 0.3 }} />
            <p>No files uploaded yet</p>
          </div>
        ) : (
          <div className="table-container">
            <table className="grievance-table">
              <thead>
                <tr>
                  <th>File Name</th>
                  <th>Upload Date</th>
                  <th>Size</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {uploadedFiles.map((file, index) => (
                  <tr key={index}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <FileIcon width="18" height="18" />
                        <strong>{file.filename}</strong>
                      </div>
                    </td>
                    <td>{formatDate(file.uploadDate)}</td>
                    <td>{formatFileSize(file.size)}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          onClick={() => handlePreviewFile(file.filename)}
                          className="action-btn view-btn"
                          style={{ display: 'flex', alignItems: 'center', gap: '5px' }}
                          title="Preview File"
                        >
                          <EyeIcon width="16" height="16" />
                          Preview
                        </button>
                        <button
                          onClick={() => handleDownloadFile(file.filename)}
                          className="action-btn"
                          style={{ background: '#10b981', color: 'white', display: 'flex', alignItems: 'center', gap: '5px' }}
                          title="Download File"
                        >
                          <DownloadIcon width="16" height="16" />
                          Download
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminUploadRecords;