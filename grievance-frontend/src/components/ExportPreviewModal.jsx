import React, { useState, useEffect, useMemo } from "react";
import {
    SearchIcon,
    DownloadIcon,
    XIcon,
    GridIcon,
    CheckCircleIcon,
    ChartBarIcon,
    FileIcon
} from "./Icons";
import { UserRoleBadge, getSubmitterRole } from "../utils/userRoleHelper";

// Column definitions
const allColumns = [
    { key: "userId", label: "User ID" },
    { key: "name", label: "User Name" },
    { key: "category", label: "Department" },
    { key: "message", label: "Message" },
    { key: "status", label: "Status" },
    { key: "assignedTo", label: "Staff" },
    { key: "createdAt", label: "Created" },
    { key: "resolvedAt", label: "Resolved" },
    { key: "rating", label: "Rating" },
];

const ExportPreviewModal = ({ isOpen, onClose, grievances, staffMap, onExport }) => {

    const [selectedColumns, setSelectedColumns] = useState(
        allColumns.map((col) => col.key)
    );
    const [selectedRows, setSelectedRows] = useState([]);
    const [selectAll, setSelectAll] = useState(true);

    // Filter states
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
                const role = getSubmitterRole(g);
                const matchesId = (g.userId || "").toLowerCase().includes(query) || 
                    (g.name || "").toLowerCase().includes(query) ||
                    role.includes(query);
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
        if (selectedColumns.includes(key)) {
            if (selectedColumns.length > 1) {
                setSelectedColumns(selectedColumns.filter((col) => col !== key));
            }
        } else {
            setSelectedColumns([...selectedColumns, key]);
        }
    };

    const toggleRow = (id) => {
        if (selectedRows.includes(id)) {
            setSelectedRows(selectedRows.filter((rId) => rId !== id));
            setSelectAll(false);
        } else {
            const next = [...selectedRows, id];
            setSelectedRows(next);
            if (next.length === filteredData.length) {
                setSelectAll(true);
            }
        }
    };

    const toggleSelectAll = () => {
        if (selectAll) {
            setSelectedRows([]);
            setSelectAll(false);
        } else {
            setSelectedRows(filteredData.map((g) => g._id));
            setSelectAll(true);
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return "—";
        return new Date(dateString).toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
        });
    };

    const getCellValue = (grievance, key) => {
        switch (key) {
            case "name": {
                const role = getSubmitterRole(grievance);
                const roleTag = role === "staff" ? "Staff" : "Student";
                return `${grievance.name || "N/A"} [${roleTag}]`;
            }
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

    // Executive Styles matching Super Admin
    const inputStyle = {
        height: "38px",
        padding: "0 12px",
        borderRadius: "6px",
        border: "1px solid #cbd5e1",
        background: "#ffffff",
        fontSize: "0.85rem",
        color: "#0f172a",
        boxSizing: "border-box",
        outline: "none",
        flex: "1 1 180px",
        minWidth: "140px",
    };

    const selectStyle = {
        ...inputStyle,
        cursor: "pointer",
        appearance: "none",
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2364748b' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
        backgroundRepeat: "no-repeat",
        backgroundPosition: "right 12px center",
        paddingRight: "32px",
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
                backgroundColor: "rgba(15, 23, 42, 0.55)",
                backdropFilter: "blur(6px)",
                WebkitBackdropFilter: "blur(6px)",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                zIndex: 9999,
                animation: "fadeIn 0.2s ease-out",
                padding: "16px",
                boxSizing: "border-box",
            }}
        >
            <div
                className="export-modal-container"
                onClick={(e) => e.stopPropagation()}
                style={{
                    background: "#ffffff",
                    borderRadius: "14px",
                    width: "100%",
                    maxWidth: "1160px",
                    maxHeight: "90vh",
                    boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)",
                    border: "1px solid #e2e8f0",
                    display: "flex",
                    flexDirection: "column",
                    overflow: "hidden",
                    animation: "slideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
                }}
            >
                {/* Header */}
                <div
                    className="export-header"
                    style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: "16px 24px",
                        borderBottom: "1px solid #f1f5f9",
                        background: "#ffffff",
                    }}
                >
                    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                        <div style={{
                            width: "38px",
                            height: "38px",
                            borderRadius: "8px",
                            background: "#f1f5f9",
                            border: "1px solid #e2e8f0",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: "#0f172a",
                            flexShrink: 0,
                        }}>
                            <FileIcon width="18" height="18" />
                        </div>
                        <div>
                            <h2 style={{
                                margin: 0,
                                fontSize: "1.25rem",
                                fontWeight: "700",
                                color: "#0f172a",
                                letterSpacing: "-0.02em",
                            }}>
                                Export Preview
                            </h2>
                            <p style={{ margin: "2px 0 0", fontSize: "0.82rem", color: "#64748b" }}>
                                Filter and select grievance data to export
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        style={{
                            background: "#ffffff",
                            border: "1px solid #e2e8f0",
                            width: "34px",
                            height: "34px",
                            borderRadius: "6px",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: "#64748b",
                            transition: "all 0.15s ease",
                        }}
                        onMouseOver={(e) => {
                            e.currentTarget.style.background = "#f1f5f9";
                            e.currentTarget.style.color = "#0f172a";
                        }}
                        onMouseOut={(e) => {
                            e.currentTarget.style.background = "#ffffff";
                            e.currentTarget.style.color = "#64748b";
                        }}
                    >
                        <XIcon width="16" height="16" />
                    </button>
                </div>

                {/* Filter Toolbar */}
                <div
                    className="export-filter-bar"
                    style={{
                        display: "flex",
                        flexWrap: "wrap",
                        gap: "10px",
                        padding: "12px 24px",
                        background: "#f8fafc",
                        borderBottom: "1px solid #e2e8f0",
                        alignItems: "center",
                    }}
                >
                    {/* Search Input */}
                    <div style={{ position: "relative", flex: "1 1 200px", minWidth: "160px" }}>
                        <SearchIcon
                            width="16"
                            height="16"
                            style={{
                                position: "absolute",
                                left: "12px",
                                top: "50%",
                                transform: "translateY(-50%)",
                                color: "#94a3b8",
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
                                paddingLeft: "36px",
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
                        style={{ ...selectStyle, flex: "1 1 180px" }}
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
                        style={{ ...inputStyle, cursor: "pointer", flex: "0 0 auto", width: "auto" }}
                    />

                    {/* Reset Button */}
                    <button
                        onClick={resetFilters}
                        style={{
                            height: "38px",
                            padding: "0 14px",
                            borderRadius: "6px",
                            border: "1px solid #cbd5e1",
                            background: "#ffffff",
                            color: "#475569",
                            fontWeight: "600",
                            fontSize: "0.82rem",
                            cursor: "pointer",
                            transition: "all 0.15s ease",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "6px",
                        }}
                        onMouseOver={(e) => {
                            e.currentTarget.style.background = "#f1f5f9";
                            e.currentTarget.style.color = "#0f172a";
                        }}
                        onMouseOut={(e) => {
                            e.currentTarget.style.background = "#ffffff";
                            e.currentTarget.style.color = "#475569";
                        }}
                    >
                        Reset
                    </button>
                </div>

                {/* Column Selection */}
                <div
                    className="export-column-section"
                    style={{
                        padding: "12px 24px",
                        borderBottom: "1px solid #e2e8f0",
                        background: "#ffffff",
                    }}
                >
                    <p style={{
                        margin: "0 0 8px",
                        fontWeight: "700",
                        color: "#64748b",
                        fontSize: "0.76rem",
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                        display: "flex",
                        alignItems: "center",
                        gap: "6px"
                    }}>
                        <GridIcon width="13" height="13" /> Select Columns
                    </p>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                        {allColumns.map((col) => {
                            const isSelected = selectedColumns.includes(col.key);
                            return (
                                <label
                                    key={col.key}
                                    style={{
                                        display: "inline-flex",
                                        alignItems: "center",
                                        gap: "5px",
                                        padding: "5px 12px",
                                        borderRadius: "6px",
                                        cursor: "pointer",
                                        background: isSelected ? "#0f172a" : "#ffffff",
                                        color: isSelected ? "#ffffff" : "#475569",
                                        border: isSelected ? "1px solid #0f172a" : "1px solid #e2e8f0",
                                        fontWeight: isSelected ? "600" : "500",
                                        fontSize: "0.8rem",
                                        transition: "all 0.15s ease",
                                        userSelect: "none",
                                    }}
                                >
                                    <input
                                        type="checkbox"
                                        checked={isSelected}
                                        onChange={() => toggleColumn(col.key)}
                                        style={{ display: "none" }}
                                    />
                                    {isSelected && <CheckCircleIcon width="12" height="12" />}
                                    {col.label}
                                </label>
                            );
                        })}
                    </div>
                </div>

                {/* Stats Ribbon */}
                <div
                    className="export-stats-bar"
                    style={{
                        padding: "10px 24px",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        background: "#f8fafc",
                        borderBottom: "1px solid #e2e8f0",
                    }}
                >
                    <div style={{ display: "flex", gap: "20px", flexWrap: "wrap", alignItems: "center" }}>
                        <span style={{ color: "#64748b", fontWeight: "500", fontSize: "0.82rem", display: "flex", alignItems: "center", gap: "6px" }}>
                            <ChartBarIcon width="14" height="14" style={{ color: "#94a3b8" }} />
                            Filtered: <strong style={{ color: "#0f172a", fontWeight: "700" }}>{filteredData.length}</strong>
                        </span>
                        <span style={{ color: "#64748b", fontWeight: "500", fontSize: "0.82rem", display: "flex", alignItems: "center", gap: "6px" }}>
                            <CheckCircleIcon width="14" height="14" style={{ color: "#16a34a" }} />
                            Selected: <strong style={{ color: "#16a34a", fontWeight: "700" }}>{selectedRows.length}</strong>
                        </span>
                        <span style={{ color: "#64748b", fontWeight: "500", fontSize: "0.82rem", display: "flex", alignItems: "center", gap: "6px" }}>
                            <GridIcon width="14" height="14" style={{ color: "#94a3b8" }} />
                            Columns: <strong style={{ color: "#0f172a", fontWeight: "700" }}>{selectedColumns.length}</strong>
                        </span>
                    </div>
                    <label style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "6px",
                        cursor: "pointer",
                        fontWeight: "600",
                        color: "#334155",
                        fontSize: "0.82rem",
                        userSelect: "none",
                    }}>
                        <input
                            type="checkbox"
                            checked={selectAll}
                            onChange={toggleSelectAll}
                            style={{
                                width: "16px",
                                height: "16px",
                                cursor: "pointer",
                                accentColor: "#0f172a",
                            }}
                        />
                        Select All
                    </label>
                </div>

                {/* Table Preview */}
                <div
                    className="export-table-container"
                    style={{
                        flex: 1,
                        overflow: "auto",
                        background: "#ffffff",
                    }}
                >
                    <table style={{
                        width: "100%",
                        borderCollapse: "collapse",
                        fontSize: "0.84rem",
                    }}>
                        <thead>
                            <tr>
                                <th style={{
                                    position: "sticky",
                                    top: 0,
                                    background: "#f8fafc",
                                    color: "#475569",
                                    padding: "10px 14px",
                                    textAlign: "left",
                                    fontWeight: "700",
                                    textTransform: "uppercase",
                                    fontSize: "0.72rem",
                                    letterSpacing: "0.06em",
                                    borderBottom: "2px solid #e2e8f0",
                                    zIndex: 10,
                                    width: "40px",
                                }}>
                                    <input
                                        type="checkbox"
                                        checked={selectAll}
                                        onChange={toggleSelectAll}
                                        style={{ width: "15px", height: "15px", cursor: "pointer", accentColor: "#0f172a" }}
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
                                                color: "#475569",
                                                padding: "10px 12px",
                                                textAlign: "left",
                                                fontWeight: "700",
                                                textTransform: "uppercase",
                                                fontSize: "0.72rem",
                                                letterSpacing: "0.06em",
                                                borderBottom: "2px solid #e2e8f0",
                                                zIndex: 10,
                                                whiteSpace: "nowrap",
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
                                            padding: "48px 20px",
                                            color: "#64748b",
                                        }}
                                    >
                                        <FileIcon width="40" height="40" style={{ opacity: 0.3, marginBottom: "8px" }} />
                                        <p style={{ fontSize: "1rem", fontWeight: "600", margin: "0 0 4px", color: "#0f172a" }}>No matching records</p>
                                        <p style={{ fontSize: "0.82rem", margin: 0, color: "#64748b" }}>Try adjusting your search or filters</p>
                                    </td>
                                </tr>
                            ) : (
                                filteredData.map((g) => {
                                    const isRowSelected = selectedRows.includes(g._id);
                                    return (
                                        <tr
                                            key={g._id}
                                            onClick={() => toggleRow(g._id)}
                                            style={{
                                                cursor: "pointer",
                                                background: isRowSelected ? "#f8fafc" : "white",
                                                transition: "background 0.1s ease",
                                                borderLeft: isRowSelected ? "3px solid #0f172a" : "3px solid transparent",
                                            }}
                                            onMouseOver={(e) => {
                                                if (!isRowSelected) {
                                                    e.currentTarget.style.background = "#f1f5f9";
                                                }
                                            }}
                                            onMouseOut={(e) => {
                                                if (!isRowSelected) {
                                                    e.currentTarget.style.background = "white";
                                                }
                                            }}
                                        >
                                            <td style={{
                                                padding: "10px 14px",
                                                borderBottom: "1px solid #f1f5f9",
                                                width: "40px",
                                            }}>
                                                <input
                                                    type="checkbox"
                                                    checked={isRowSelected}
                                                    onChange={() => toggleRow(g._id)}
                                                    onClick={(e) => e.stopPropagation()}
                                                    style={{ width: "15px", height: "15px", cursor: "pointer", accentColor: "#0f172a" }}
                                                />
                                            </td>
                                            {allColumns
                                                .filter((col) => selectedColumns.includes(col.key))
                                                .map((col) => (
                                                    <td
                                                        key={col.key}
                                                        style={{
                                                            padding: "10px 12px",
                                                            borderBottom: "1px solid #f1f5f9",
                                                            color: "#0f172a",
                                                            maxWidth: col.key === "message" ? "240px" : "auto",
                                                            overflow: "hidden",
                                                            textOverflow: "ellipsis",
                                                            whiteSpace: "nowrap",
                                                            fontSize: "0.82rem",
                                                        }}
                                                    >
                                                        {col.key === "status" ? (
                                                            <span className={getStatusClass(g.status)}>
                                                                {g.status}
                                                            </span>
                                                        ) : col.key === "name" ? (
                                                            <div style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                                                                <span style={{ fontWeight: "500" }}>{g.name || (getSubmitterRole(g) === "staff" ? "Staff Member" : "Student")}</span>
                                                                <UserRoleBadge grievance={g} />
                                                            </div>
                                                        ) : (
                                                            getCellValue(g, col.key)
                                                        )}
                                                    </td>
                                                ))}
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Footer */}
                <div
                    className="export-footer"
                    style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: "14px 24px",
                        borderTop: "1px solid #f1f5f9",
                        background: "#ffffff",
                    }}
                >
                    <p style={{ margin: 0, color: "#64748b", fontSize: "0.8rem" }}>
                        Click rows or use checkboxes to select records
                    </p>
                    <div style={{ display: "flex", gap: "10px" }}>
                        <button
                            onClick={onClose}
                            style={{
                                padding: "8px 18px",
                                borderRadius: "6px",
                                border: "1px solid #e2e8f0",
                                background: "#f1f5f9",
                                color: "#475569",
                                fontWeight: "600",
                                fontSize: "0.84rem",
                                cursor: "pointer",
                                transition: "all 0.15s ease",
                            }}
                            onMouseOver={(e) => {
                                e.currentTarget.style.background = "#e2e8f0";
                                e.currentTarget.style.color = "#0f172a";
                            }}
                            onMouseOut={(e) => {
                                e.currentTarget.style.background = "#f1f5f9";
                                e.currentTarget.style.color = "#475569";
                            }}
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleExport}
                            disabled={selectedRows.length === 0 || selectedColumns.length === 0}
                            style={{
                                padding: "8px 22px",
                                borderRadius: "6px",
                                border: "none",
                                background: selectedRows.length === 0 || selectedColumns.length === 0
                                    ? "#cbd5e1"
                                    : "#0f172a",
                                color: selectedRows.length === 0 || selectedColumns.length === 0
                                    ? "#94a3b8"
                                    : "#ffffff",
                                fontWeight: "600",
                                fontSize: "0.84rem",
                                cursor: selectedRows.length === 0 || selectedColumns.length === 0 ? "not-allowed" : "pointer",
                                transition: "all 0.15s ease",
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "6px",
                            }}
                            onMouseOver={(e) => {
                                if (selectedRows.length > 0 && selectedColumns.length > 0) {
                                    e.currentTarget.style.background = "#1e293b";
                                }
                            }}
                            onMouseOut={(e) => {
                                if (selectedRows.length > 0 && selectedColumns.length > 0) {
                                    e.currentTarget.style.background = "#0f172a";
                                }
                            }}
                        >
                            <DownloadIcon width="15" height="15" />
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
          from { transform: translateY(16px) scale(0.98); opacity: 0; }
          to { transform: translateY(0) scale(1); opacity: 1; }
        }
        
        /* Mobile Responsive for Export Modal */
        @media (max-width: 768px) {
          .export-modal-container {
            max-height: 95vh !important;
            border-radius: 14px !important;
            margin: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
          }
          
          .export-header {
            padding: 14px 16px !important;
          }
          
          .export-header h2 {
            font-size: 1.1rem !important;
          }
          
          .export-filter-bar {
            flex-direction: column !important;
            padding: 10px 14px !important;
            align-items: stretch !important;
          }
          
          .export-filter-bar > * {
            width: 100% !important;
            flex: none !important;
          }
          
          .export-column-section {
            padding: 10px 14px !important;
          }
          
          .export-column-section > div {
            gap: 5px !important;
          }
          
          .export-stats-bar {
            padding: 10px 14px !important;
            flex-direction: column !important;
            gap: 8px !important;
            align-items: flex-start !important;
          }
          
          .export-stats-bar > div {
            gap: 12px !important;
            justify-content: flex-start !important;
            width: 100% !important;
          }
          
          .export-table-container {
            max-height: 40vh !important;
          }
          
          .export-footer {
            padding: 14px 16px !important;
            flex-direction: column !important;
            gap: 10px !important;
          }
          
          .export-footer > div {
            width: 100% !important;
          }
          
          .export-footer button {
            flex: 1 !important;
            justify-content: center !important;
          }
          
          .export-footer p {
            text-align: center !important;
          }
        }
      `}</style>
        </div>
    );
};

export default ExportPreviewModal;
