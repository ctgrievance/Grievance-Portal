import React, { useState, useEffect, useMemo } from "react";
import {
    SearchIcon,
    DownloadIcon,
    XIcon,
    UserIcon,
    GridIcon,
    ClockIcon,
    CheckCircleIcon,
    ChartBarIcon,
    FileIcon
} from "./Icons";

const ExportPreviewModal = ({ isOpen, onClose, grievances, staffMap, onExport }) => {
    // Column definitions
    const allColumns = [
        { key: "userId", label: "Student ID" },
        { key: "category", label: "Department" },
        { key: "message", label: "Message" },
        { key: "status", label: "Status" },
        { key: "assignedTo", label: "Staff" },
        { key: "createdAt", label: "Created" },
        { key: "resolvedAt", label: "Resolved" },
        { key: "rating", label: "Rating" },
    ];

    const [selectedColumns, setSelectedColumns] = useState(
        allColumns.map((col) => col.key)
    );
    const [selectedRows, setSelectedRows] = useState([]);
    const [selectAll, setSelectAll] = useState(true);

    // Filter states (same as dashboard)
    const [searchQuery, setSearchQuery] = useState("");
    const [filterStatus, setFilterStatus] = useState("All");
    const [filterDepartment, setFilterDepartment] = useState("All");
    const [filterMonth, setFilterMonth] = useState("");

    // Get unique departments from grievances
    const uniqueDepartments = useMemo(() => {
        return [...new Set(grievances.map(g => g.category || g.school).filter(Boolean))];
    }, [grievances]);

    // Filtered data based on filters
    const filteredData = useMemo(() => {
        return grievances.filter((g) => {
            // Status filter
            if (filterStatus !== "All" && g.status !== filterStatus) return false;

            // Department filter
            const categoryOrSchool = g.category || g.school || "";
            if (filterDepartment !== "All" && categoryOrSchool !== filterDepartment) return false;

            // Month filter
            if (filterMonth) {
                const gDate = new Date(g.createdAt);
                const [year, month] = filterMonth.split("-");
                if (gDate.getFullYear() !== parseInt(year) || (gDate.getMonth() + 1) !== parseInt(month)) {
                    return false;
                }
            }

            // Search filter
            if (searchQuery) {
                const query = searchQuery.toLowerCase();
                const matchesId = (g.userId || "").toLowerCase().includes(query);
                const matchesMsg = (g.message || "").toLowerCase().includes(query);
                const matchesStaff = (g.assignedTo || "").toLowerCase().includes(query);
                const matchesDept = (g.category || g.school || "").toLowerCase().includes(query);
                if (!matchesId && !matchesMsg && !matchesStaff && !matchesDept) return false;
            }

            return true;
        });
    }, [grievances, filterStatus, filterDepartment, filterMonth, searchQuery]);

    // Reset selections when modal opens
    useEffect(() => {
        if (isOpen && grievances.length > 0) {
            setSelectedRows(grievances.map((g) => g._id));
            setSelectAll(true);
            setSelectedColumns(allColumns.map((col) => col.key));
            setFilterStatus("All");
            setFilterDepartment("All");
            setFilterMonth("");
            setSearchQuery("");
        }
    }, [isOpen, grievances]);

    // Update selected rows when filter changes
    useEffect(() => {
        if (selectAll) {
            setSelectedRows(filteredData.map((g) => g._id));
        }
    }, [filteredData, selectAll]);

    if (!isOpen) return null;

    const toggleColumn = (key) => {
        setSelectedColumns((prev) =>
            prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
        );
    };

    const toggleRow = (id) => {
        setSelectedRows((prev) => {
            const newSelection = prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id];
            setSelectAll(newSelection.length === filteredData.length);
            return newSelection;
        });
    };

    const toggleSelectAll = () => {
        if (selectAll) {
            setSelectedRows([]);
        } else {
            setSelectedRows(filteredData.map((g) => g._id));
        }
        setSelectAll(!selectAll);
    };

    const formatDate = (dateString) => {
        if (!dateString) return "N/A";
        return new Date(dateString).toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
        });
    };

    const getCellValue = (grievance, key) => {
        switch (key) {
            case "category":
                return grievance.category || grievance.school || "N/A";
            case "assignedTo":
                return grievance.assignedTo
                    ? `${staffMap[grievance.assignedTo] || "Staff"}`
                    : "—";
            case "createdAt":
            case "resolvedAt":
                return formatDate(grievance[key]);
            case "rating":
                return grievance.rating?.stars ? `${grievance.rating.stars}/5` : "—";
            case "message":
                return grievance.message?.substring(0, 40) + (grievance.message?.length > 40 ? "..." : "");
            default:
                return grievance[key] || "N/A";
        }
    };

    const getStatusClass = (status) => {
        const s = (status || "").toLowerCase().replace(" ", "");
        return `status-badge status-${s}`;
    };

    const handleExport = () => {
        const selectedData = filteredData.filter((g) => selectedRows.includes(g._id));
        onExport(selectedData, selectedColumns);
        onClose();
    };

    const resetFilters = () => {
        setSearchQuery("");
        setFilterStatus("All");
        setFilterDepartment("All");
        setFilterMonth("");
    };

    // Styles
    const inputStyle = {
        padding: "10px 14px",
        borderRadius: "10px",
        border: "1px solid #cbd5e1",
        background: "#f8fafc",
        fontSize: "0.95rem",
        fontFamily: "'Outfit', sans-serif",
        color: "#1e293b",
        transition: "all 0.25s ease",
        flex: "1 1 150px",
        minWidth: "120px",
    };

    const selectStyle = {
        ...inputStyle,
        cursor: "pointer",
        appearance: "none",
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2364748b' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
        backgroundRepeat: "no-repeat",
        backgroundPosition: "right 12px center",
        paddingRight: "36px",
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
                backgroundColor: "rgba(0, 0, 0, 0.5)",
                backdropFilter: "blur(8px)",
                WebkitBackdropFilter: "blur(8px)",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                zIndex: 9999,
                animation: "fadeIn 0.3s ease-out",
            }}
        >
            <div
                onClick={(e) => e.stopPropagation()}
                style={{
                    background: "white",
                    borderRadius: "16px",
                    width: "95%",
                    maxWidth: "1200px",
                    maxHeight: "90vh",
                    boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
                    display: "flex",
                    flexDirection: "column",
                    overflow: "hidden",
                    animation: "slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1)",
                    fontFamily: "'Outfit', sans-serif",
                }}
            >
                {/* Header */}
                <div
                    style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: "20px 28px",
                        borderBottom: "1px solid rgba(0, 0, 0, 0.05)",
                        background: "white",
                    }}
                >
                    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                        <div style={{
                            width: "42px",
                            height: "42px",
                            borderRadius: "12px",
                            background: "linear-gradient(135deg, #6366f1, #a855f7)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: "white",
                        }}>
                            <FileIcon width="20" height="20" />
                        </div>
                        <div>
                            <h2 style={{
                                margin: 0,
                                fontSize: "1.5rem",
                                fontWeight: "700",
                                background: "linear-gradient(to right, #4f46e5, #9333ea)",
                                WebkitBackgroundClip: "text",
                                WebkitTextFillColor: "transparent",
                                backgroundClip: "text",
                            }}>
                                Export Preview
                            </h2>
                            <p style={{ margin: "2px 0 0", fontSize: "0.9rem", color: "#64748b" }}>
                                Filter and select data to export
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        style={{
                            background: "#f1f5f9",
                            border: "none",
                            width: "40px",
                            height: "40px",
                            borderRadius: "50%",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: "#64748b",
                            transition: "all 0.2s",
                        }}
                        onMouseOver={(e) => { e.currentTarget.style.background = "#e2e8f0"; e.currentTarget.style.color = "#ef4444"; e.currentTarget.style.transform = "rotate(90deg)"; }}
                        onMouseOut={(e) => { e.currentTarget.style.background = "#f1f5f9"; e.currentTarget.style.color = "#64748b"; e.currentTarget.style.transform = "rotate(0)"; }}
                    >
                        <XIcon width="18" height="18" />
                    </button>
                </div>

                {/* Filter Bar (Dashboard Style) */}
                <div style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: "10px",
                    padding: "15px 28px",
                    background: "#f8fafc",
                    borderBottom: "1px solid #e2e8f0",
                    alignItems: "center",
                }}>
                    {/* Search Input */}
                    <div style={{ position: "relative", flex: "1 1 200px" }}>
                        <SearchIcon
                            width="16"
                            height="16"
                            style={{
                                position: "absolute",
                                left: "12px",
                                top: "50%",
                                transform: "translateY(-50%)",
                                color: "#64748b",
                                pointerEvents: "none",
                            }}
                        />
                        <input
                            type="text"
                            placeholder="Search Student ID, Message..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            style={{
                                ...inputStyle,
                                paddingLeft: "38px",
                                width: "100%",
                            }}
                        />
                    </div>

                    {/* Status Dropdown */}
                    <select
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                        style={selectStyle}
                    >
                        <option value="All">All Status</option>
                        <option value="Pending">Pending</option>
                        <option value="Assigned">Assigned</option>
                        <option value="Resolved">Resolved</option>
                        <option value="Rejected">Rejected</option>
                    </select>

                    {/* Department Dropdown */}
                    <select
                        value={filterDepartment}
                        onChange={(e) => setFilterDepartment(e.target.value)}
                        style={{ ...selectStyle, flex: "1 1 200px" }}
                    >
                        <option value="All">All Departments</option>
                        {uniqueDepartments.map(dept => (
                            <option key={dept} value={dept}>{dept}</option>
                        ))}
                    </select>

                    {/* Month Filter */}
                    <input
                        type="month"
                        value={filterMonth}
                        onChange={(e) => setFilterMonth(e.target.value)}
                        style={{ ...inputStyle, cursor: "pointer" }}
                    />

                    {/* Reset Button */}
                    <button
                        onClick={resetFilters}
                        style={{
                            padding: "10px 20px",
                            borderRadius: "10px",
                            border: "none",
                            background: "#64748b",
                            color: "white",
                            fontWeight: "600",
                            cursor: "pointer",
                            transition: "all 0.2s",
                            display: "flex",
                            alignItems: "center",
                            gap: "6px",
                        }}
                        onMouseOver={(e) => { e.currentTarget.style.background = "#475569"; }}
                        onMouseOut={(e) => { e.currentTarget.style.background = "#64748b"; }}
                    >
                        Reset
                    </button>
                </div>

                {/* Column Selection */}
                <div style={{
                    padding: "14px 28px",
                    borderBottom: "1px solid #e2e8f0",
                    background: "white",
                }}>
                    <p style={{ margin: "0 0 10px", fontWeight: "600", color: "#334155", fontSize: "0.85rem", display: "flex", alignItems: "center", gap: "6px" }}>
                        <GridIcon width="14" height="14" /> Select Columns
                    </p>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                        {allColumns.map((col) => (
                            <label
                                key={col.key}
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "6px",
                                    padding: "8px 14px",
                                    borderRadius: "999px",
                                    cursor: "pointer",
                                    background: selectedColumns.includes(col.key) ? "#6366f1" : "#f1f5f9",
                                    color: selectedColumns.includes(col.key) ? "white" : "#475569",
                                    fontWeight: "500",
                                    fontSize: "0.85rem",
                                    transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
                                    boxShadow: selectedColumns.includes(col.key) ? "0 4px 12px rgba(99, 102, 241, 0.35)" : "none",
                                    transform: selectedColumns.includes(col.key) ? "translateY(-1px)" : "none",
                                }}
                            >
                                <input
                                    type="checkbox"
                                    checked={selectedColumns.includes(col.key)}
                                    onChange={() => toggleColumn(col.key)}
                                    style={{ display: "none" }}
                                />
                                {selectedColumns.includes(col.key) && <CheckCircleIcon width="14" height="14" />}
                                {col.label}
                            </label>
                        ))}
                    </div>
                </div>

                {/* Stats Bar */}
                <div style={{
                    padding: "12px 28px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    background: "#fffbeb",
                    borderBottom: "1px solid #fde047",
                }}>
                    <div style={{ display: "flex", gap: "24px", flexWrap: "wrap", alignItems: "center" }}>
                        <span style={{ color: "#854d0e", fontWeight: "600", fontSize: "0.9rem", display: "flex", alignItems: "center", gap: "6px" }}>
                            <ChartBarIcon width="14" height="14" /> Filtered: <strong style={{ color: "#1e293b" }}>{filteredData.length}</strong>
                        </span>
                        <span style={{ color: "#166534", fontWeight: "600", fontSize: "0.9rem", display: "flex", alignItems: "center", gap: "6px" }}>
                            <CheckCircleIcon width="14" height="14" /> Selected: <strong style={{ color: "#1e293b" }}>{selectedRows.length}</strong>
                        </span>
                        <span style={{ color: "#1e40af", fontWeight: "600", fontSize: "0.9rem", display: "flex", alignItems: "center", gap: "6px" }}>
                            <GridIcon width="14" height="14" /> Columns: <strong style={{ color: "#1e293b" }}>{selectedColumns.length}</strong>
                        </span>
                    </div>
                    <label style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        cursor: "pointer",
                        fontWeight: "600",
                        color: "#334155",
                        fontSize: "0.9rem",
                    }}>
                        <input
                            type="checkbox"
                            checked={selectAll}
                            onChange={toggleSelectAll}
                            style={{
                                width: "18px",
                                height: "18px",
                                cursor: "pointer",
                                accentColor: "#6366f1",
                            }}
                        />
                        Select All
                    </label>
                </div>

                {/* Table Preview */}
                <div style={{
                    flex: 1,
                    overflow: "auto",
                }}>
                    <table style={{
                        width: "100%",
                        borderCollapse: "collapse",
                        fontSize: "0.9rem",
                    }}>
                        <thead>
                            <tr>
                                <th style={{
                                    position: "sticky",
                                    top: 0,
                                    background: "#f8fafc",
                                    color: "#64748b",
                                    padding: "14px 16px",
                                    textAlign: "left",
                                    fontWeight: "600",
                                    textTransform: "uppercase",
                                    fontSize: "0.75rem",
                                    letterSpacing: "0.05em",
                                    borderBottom: "1px solid #e2e8f0",
                                    zIndex: 10,
                                }}>
                                    <input
                                        type="checkbox"
                                        checked={selectAll}
                                        onChange={toggleSelectAll}
                                        style={{ width: "16px", height: "16px", cursor: "pointer", accentColor: "#6366f1" }}
                                    />
                                </th>
                                {allColumns
                                    .filter((col) => selectedColumns.includes(col.key))
                                    .map((col) => (
                                        <th
                                            key={col.key}
                                            style={{
                                                position: "sticky",
                                                top: 0,
                                                background: "#f8fafc",
                                                color: "#64748b",
                                                padding: "14px 12px",
                                                textAlign: "left",
                                                fontWeight: "600",
                                                textTransform: "uppercase",
                                                fontSize: "0.75rem",
                                                letterSpacing: "0.05em",
                                                borderBottom: "1px solid #e2e8f0",
                                                zIndex: 10,
                                            }}
                                        >
                                            {col.label}
                                        </th>
                                    ))}
                            </tr>
                        </thead>
                        <tbody>
                            {filteredData.length === 0 ? (
                                <tr>
                                    <td
                                        colSpan={selectedColumns.length + 1}
                                        style={{
                                            textAlign: "center",
                                            padding: "60px 20px",
                                            color: "#64748b",
                                        }}
                                    >
                                        <FileIcon width="48" height="48" style={{ opacity: 0.3, marginBottom: "12px" }} />
                                        <p style={{ fontSize: "1.1rem", fontWeight: "600", margin: "0 0 6px" }}>No matching records</p>
                                        <p style={{ fontSize: "0.9rem", margin: 0 }}>Try adjusting your filters</p>
                                    </td>
                                </tr>
                            ) : (
                                filteredData.map((g) => (
                                    <tr
                                        key={g._id}
                                        onClick={() => toggleRow(g._id)}
                                        style={{
                                            cursor: "pointer",
                                            background: selectedRows.includes(g._id) ? "#eff6ff" : "white",
                                            transition: "all 0.15s ease",
                                            borderLeft: selectedRows.includes(g._id) ? "3px solid #6366f1" : "3px solid transparent",
                                        }}
                                        onMouseOver={(e) => {
                                            if (!selectedRows.includes(g._id)) {
                                                e.currentTarget.style.background = "#f8fafc";
                                            }
                                        }}
                                        onMouseOut={(e) => {
                                            if (!selectedRows.includes(g._id)) {
                                                e.currentTarget.style.background = "white";
                                            }
                                        }}
                                    >
                                        <td style={{
                                            padding: "14px 16px",
                                            borderBottom: "1px solid #f1f5f9",
                                        }}>
                                            <input
                                                type="checkbox"
                                                checked={selectedRows.includes(g._id)}
                                                onChange={() => toggleRow(g._id)}
                                                onClick={(e) => e.stopPropagation()}
                                                style={{ width: "16px", height: "16px", cursor: "pointer", accentColor: "#6366f1" }}
                                            />
                                        </td>
                                        {allColumns
                                            .filter((col) => selectedColumns.includes(col.key))
                                            .map((col) => (
                                                <td
                                                    key={col.key}
                                                    style={{
                                                        padding: "14px 12px",
                                                        borderBottom: "1px solid #f1f5f9",
                                                        color: "#1e293b",
                                                        maxWidth: col.key === "message" ? "200px" : "auto",
                                                        overflow: "hidden",
                                                        textOverflow: "ellipsis",
                                                        whiteSpace: "nowrap",
                                                    }}
                                                >
                                                    {col.key === "status" ? (
                                                        <span className={getStatusClass(g.status)}>
                                                            {g.status}
                                                        </span>
                                                    ) : (
                                                        getCellValue(g, col.key)
                                                    )}
                                                </td>
                                            ))}
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Footer */}
                <div style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "20px 28px",
                    borderTop: "1px solid #e2e8f0",
                    background: "#f8fafc",
                }}>
                    <p style={{ margin: 0, color: "#64748b", fontSize: "0.85rem" }}>
                        Click rows to select/deselect
                    </p>
                    <div style={{ display: "flex", gap: "12px" }}>
                        <button
                            onClick={onClose}
                            style={{
                                padding: "12px 24px",
                                borderRadius: "10px",
                                border: "none",
                                background: "#eff6ff",
                                color: "#4f46e5",
                                fontWeight: "600",
                                fontSize: "0.95rem",
                                cursor: "pointer",
                                transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
                            }}
                            onMouseOver={(e) => { e.currentTarget.style.background = "#4f46e5"; e.currentTarget.style.color = "white"; }}
                            onMouseOut={(e) => { e.currentTarget.style.background = "#eff6ff"; e.currentTarget.style.color = "#4f46e5"; }}
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleExport}
                            disabled={selectedRows.length === 0 || selectedColumns.length === 0}
                            style={{
                                padding: "12px 28px",
                                borderRadius: "10px",
                                border: "none",
                                background: selectedRows.length === 0 || selectedColumns.length === 0
                                    ? "#94a3b8"
                                    : "#6366f1",
                                color: "white",
                                fontWeight: "700",
                                fontSize: "0.95rem",
                                cursor: selectedRows.length === 0 || selectedColumns.length === 0 ? "not-allowed" : "pointer",
                                transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
                                boxShadow: selectedRows.length > 0 && selectedColumns.length > 0
                                    ? "0 4px 12px rgba(99, 102, 241, 0.35)"
                                    : "none",
                                display: "flex",
                                alignItems: "center",
                                gap: "8px",
                            }}
                            onMouseOver={(e) => {
                                if (selectedRows.length > 0 && selectedColumns.length > 0) {
                                    e.currentTarget.style.background = "#4f46e5";
                                    e.currentTarget.style.transform = "translateY(-2px)";
                                    e.currentTarget.style.boxShadow = "0 8px 20px rgba(79, 70, 229, 0.4)";
                                }
                            }}
                            onMouseOut={(e) => {
                                if (selectedRows.length > 0 && selectedColumns.length > 0) {
                                    e.currentTarget.style.background = "#6366f1";
                                    e.currentTarget.style.transform = "translateY(0)";
                                    e.currentTarget.style.boxShadow = "0 4px 12px rgba(99, 102, 241, 0.35)";
                                }
                            }}
                        >
                            <DownloadIcon width="16" height="16" />
                            Export {selectedRows.length} Records
                        </button>
                    </div>
                </div>
            </div>

            <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from { transform: translateY(20px) scale(0.95); opacity: 0; }
          to { transform: translateY(0) scale(1); opacity: 1; }
        }
        
        /* Mobile Responsive for Export Modal */
        @media (max-width: 768px) {
          .export-modal-container {
            max-height: 95vh !important;
            border-radius: 16px 16px 0 0 !important;
            margin: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
          }
          
          .export-header {
            padding: 16px 16px !important;
          }
          
          .export-header h2 {
            font-size: 1.2rem !important;
          }
          
          .export-filter-bar {
            flex-direction: column !important;
            padding: 12px 16px !important;
          }
          
          .export-filter-bar > * {
            width: 100% !important;
            flex: none !important;
          }
          
          .export-column-section {
            padding: 12px 16px !important;
          }
          
          .export-column-section > div {
            gap: 6px !important;
          }
          
          .export-column-section label {
            padding: 6px 10px !important;
            font-size: 0.75rem !important;
          }
          
          .export-stats-bar {
            padding: 10px 16px !important;
            flex-direction: column !important;
            gap: 10px !important;
          }
          
          .export-stats-bar > div {
            gap: 12px !important;
            justify-content: center !important;
          }
          
          .export-stats-bar span {
            font-size: 0.8rem !important;
          }
          
          .export-table-container {
            max-height: 40vh !important;
          }
          
          .export-footer {
            padding: 16px !important;
            flex-direction: column !important;
            gap: 12px !important;
          }
          
          .export-footer > div {
            width: 100% !important;
            flex-direction: column !important;
          }
          
          .export-footer button {
            width: 100% !important;
            justify-content: center !important;
          }
          
          .export-footer p {
            text-align: center !important;
          }
        }
        
        @media (max-width: 480px) {
          .export-header h2 {
            font-size: 1rem !important;
          }
          
          .export-header p {
            font-size: 0.75rem !important;
          }
          
          .export-column-section label {
            padding: 5px 8px !important;
            font-size: 0.7rem !important;
          }
        }
      `}</style>
        </div>
    );
};

export default ExportPreviewModal;
