import React, { useState, useEffect, useMemo, useCallback } from "react";
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
import MultiSelectDropdown from "./MultiSelectDropdown";

// Default column definitions for Grievances
const defaultGrievanceColumns = [
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

const ExportPreviewModal = ({
    isOpen,
    onClose,
    grievances = [],
    data = null,
    staffMap = {},
    onExport,
    title = "Export Preview",
    subtitle,
    columns = null,
    statusOptions = null,
    departmentOptions = null,
    extraFilter = null,
    searchPlaceholder,
    getRowId = null,
    renderCell = null,
    initialStatus = "All",
}) => {
    // Determine dataset & columns
    const isGrievanceMode = !columns && (!data || grievances.length > 0);
    const itemList = useMemo(() => {
        if (data && Array.isArray(data)) return data;
        if (grievances && Array.isArray(grievances)) return grievances;
        return [];
    }, [data, grievances]);

    const activeColumns = useMemo(() => {
        if (columns && Array.isArray(columns) && columns.length > 0) return columns;
        return defaultGrievanceColumns;
    }, [columns]);

    // Department and String normalization helper
    const normKey = (s) => String(s || "")
        .toLowerCase()
        .replace(/\s*(?:&|and)\s*/g, " and ")
        .replace(/[^a-z0-9]/g, " ")
        .replace(/\s+/g, " ")
        .trim();

    const getItemId = useCallback((item, idx = 0) => {
        if (getRowId) return getRowId(item, idx);
        if (item._id) return item._id;
        if (item.id) return item.id;
        if (item["Student ID"]) return item["Student ID"];
        if (item["Staff ID"]) return item["Staff ID"];
        if (item["CTU ID"]) return item["CTU ID"];
        if (item["ID"]) return item["ID"];
        if (item["S.No"]) return `sno_${item["S.No"]}`;
        return `row_${idx}`;
    }, [getRowId]);

    const [selectedColumns, setSelectedColumns] = useState(
        activeColumns.map((col) => col.key)
    );
    // Use Set for O(1) row selection lookups to eliminate click lag on large cohorts
    const [selectedRowIds, setSelectedRowIds] = useState(() => new Set());

    // Preview table pagination states
    const [previewPage, setPreviewPage] = useState(1);
    const [previewPageSize, setPreviewPageSize] = useState(50);

    // Dynamic report / sheet name defaults
    const defaultSheetName = useMemo(() => {
        if (title && title !== "Export Preview") return title;
        if (isGrievanceMode) return "Grievances Export";
        return "Export Data";
    }, [title, isGrievanceMode]);

    const [customSheetName, setCustomSheetName] = useState(defaultSheetName);

    // Filter states
    const [searchQuery, setSearchQuery] = useState("");
    const [filterStatus, setFilterStatus] = useState("All");
    const [filterDepartments, setFilterDepartments] = useState([]);
    const [filterMonth, setFilterMonth] = useState("");
    const [internalExtraFilter, setInternalExtraFilter] = useState("All");

    // Dynamic departments list
    const uniqueDepartments = useMemo(() => {
        if (departmentOptions && Array.isArray(departmentOptions)) {
            return departmentOptions.filter(d => d !== "All");
        }
        return [...new Set(itemList.map(g => g.category || g.school || g.department || g["School"] || g["Department"]).filter(Boolean))];
    }, [itemList, departmentOptions]);

    // Active status dropdown options
    const activeStatusOptions = useMemo(() => {
        if (statusOptions && Array.isArray(statusOptions)) return statusOptions;
        if (isGrievanceMode) {
            return ["All", "Pending", "Assigned", "Resolved", "Rejected"];
        }
        return ["All", "REGISTERED", "NOT REGISTERED"];
    }, [statusOptions, isGrievanceMode]);

    // Filtered data based on toolbar selections
    const filteredData = useMemo(() => {
        return itemList.filter((item) => {
            // Status filter
            if (filterStatus !== "All") {
                const s = item.status || item.Status || item["Portal Status"] || item["Status"] || (item.isRegistered ? "REGISTERED" : "NOT REGISTERED");
                if (String(s).toLowerCase() !== String(filterStatus).toLowerCase()) {
                    return false;
                }
            }

            // Department / School filter (Multi-select)
            if (filterDepartments && filterDepartments.length > 0) {
                const dept = item.category || item.school || item.department || item["School"] || item["Department"] || "";
                const itemNorm = normKey(dept);
                const matchesAny = filterDepartments.some(d => {
                    const dNorm = normKey(d);
                    return itemNorm === dNorm || itemNorm.includes(dNorm) || dNorm.includes(itemNorm);
                });
                if (!matchesAny) return false;
            }

            // Extra Filter (Category / Staff Type / Role)
            if (extraFilter) {
                const activeExtraVal = extraFilter.value !== undefined ? extraFilter.value : internalExtraFilter;
                if (activeExtraVal && activeExtraVal !== "All") {
                    const candidate = item.staffType || item["Staff Category"] || item["Category"] || item.role || item["Role"] || item.userType || "";
                    if (String(candidate).toLowerCase() !== String(activeExtraVal).toLowerCase()) {
                        return false;
                    }
                }
            }

            // Month / Date filter
            if (filterMonth) {
                const rawDate = item.createdAt || item.registeredAt || item["Registered On"] || item["Joined Date"];
                if (rawDate) {
                    const d = new Date(rawDate);
                    if (!isNaN(d.getTime())) {
                        const [year, month] = filterMonth.split("-");
                        if (d.getFullYear() !== parseInt(year) || (d.getMonth() + 1) !== parseInt(month)) {
                            return false;
                        }
                    }
                }
            }

            // Search filter
            if (searchQuery) {
                const query = searchQuery.toLowerCase().trim();
                if (isGrievanceMode) {
                    const role = getSubmitterRole(item);
                    const matchesId = (item.userId || "").toLowerCase().includes(query) || 
                        (item.name || "").toLowerCase().includes(query) ||
                        role.includes(query);
                    const matchesMsg = (item.message || "").toLowerCase().includes(query);
                    const matchesStaff = (item.assignedTo || "").toLowerCase().includes(query);
                    const matchesDept = (item.category || item.school || "").toLowerCase().includes(query);
                    if (!matchesId && !matchesMsg && !matchesStaff && !matchesDept) return false;
                } else {
                    const values = Object.values(item);
                    const hasMatch = values.some(val => {
                        if (val === null || val === undefined) return false;
                        return String(val).toLowerCase().includes(query);
                    });
                    if (!hasMatch) return false;
                }
            }

            return true;
        });
    }, [itemList, filterStatus, filterDepartments, filterMonth, searchQuery, extraFilter, internalExtraFilter, isGrievanceMode]);

    // Active selected count strictly scoped to currently filtered records
    const activeSelectedCount = useMemo(() => {
        let count = 0;
        for (let i = 0; i < filteredData.length; i++) {
            if (selectedRowIds.has(getItemId(filteredData[i], i))) {
                count++;
            }
        }
        return count;
    }, [filteredData, selectedRowIds, getItemId]);

    // Reset and initialize when modal opens or dataset changes
    useEffect(() => {
        if (isOpen && itemList.length > 0) {
            const initStatus = initialStatus || "All";
            setFilterStatus(initStatus);
            setFilterDepartments([]);
            setFilterMonth("");
            setSearchQuery("");
            setInternalExtraFilter("All");
            setPreviewPage(1);
            setSelectedColumns(activeColumns.map((col) => col.key));
            setCustomSheetName(defaultSheetName);

            // Select initial records matching the active status
            const initialFiltered = itemList.filter(item => {
                if (initStatus !== "All") {
                    const s = item.status || item.Status || item["Portal Status"] || item["Status"] || (item.isRegistered ? "REGISTERED" : "NOT REGISTERED");
                    if (String(s).toLowerCase() !== String(initStatus).toLowerCase()) {
                        return false;
                    }
                }
                return true;
            });
            setSelectedRowIds(new Set(initialFiltered.map((item, idx) => getItemId(item, idx))));
        }
    }, [isOpen, itemList, activeColumns, initialStatus, getItemId, defaultSheetName]);

    // Calculate preview page slice
    const totalPreviewPages = Math.max(1, Math.ceil(filteredData.length / previewPageSize));
    const currentPreviewPage = Math.min(previewPage, totalPreviewPages);
    const paginatedPreviewData = useMemo(() => {
        const start = (currentPreviewPage - 1) * previewPageSize;
        return filteredData.slice(start, start + previewPageSize);
    }, [filteredData, currentPreviewPage, previewPageSize]);

    if (!isOpen) return null;

    // Fast column selection toggle
    const toggleColumn = (key) => {
        if (selectedColumns.includes(key)) {
            if (selectedColumns.length > 1) {
                setSelectedColumns(selectedColumns.filter((col) => col !== key));
            }
        } else {
            setSelectedColumns([...selectedColumns, key]);
        }
    };

    // Instant O(1) single row selection toggle
    const toggleRow = (id) => {
        setSelectedRowIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });
    };

    // Fast select/deselect all toggle (scoped to current filtered view)
    const isAllFilteredSelected = filteredData.length > 0 && activeSelectedCount === filteredData.length;
    const toggleSelectAll = () => {
        if (isAllFilteredSelected || activeSelectedCount > 0) {
            setSelectedRowIds(prev => {
                const next = new Set(prev);
                filteredData.forEach((item, idx) => next.delete(getItemId(item, idx)));
                return next;
            });
        } else {
            setSelectedRowIds(prev => {
                const next = new Set(prev);
                filteredData.forEach((item, idx) => next.add(getItemId(item, idx)));
                return next;
            });
        }
    };

    // Helper to evaluate if item matches a set of filters
    const matchesFilters = (item, status, depts, extraVal, monthVal, queryVal) => {
        if (status !== "All") {
            const s = item.status || item.Status || item["Portal Status"] || item["Status"] || (item.isRegistered ? "REGISTERED" : "NOT REGISTERED");
            if (String(s).toLowerCase() !== String(status).toLowerCase()) return false;
        }
        if (depts && Array.isArray(depts) && depts.length > 0) {
            const d = item.category || item.school || item.department || item["School"] || item["Department"] || "";
            const itemNorm = normKey(d);
            const matchesAny = depts.some(targetDept => {
                const targetNorm = normKey(targetDept);
                return itemNorm === targetNorm || itemNorm.includes(targetNorm) || targetNorm.includes(itemNorm);
            });
            if (!matchesAny) return false;
        } else if (depts && typeof depts === "string" && depts !== "All") {
            const d = item.category || item.school || item.department || item["School"] || item["Department"] || "";
            if (normKey(d) !== normKey(depts)) return false;
        }
        if (extraVal && extraVal !== "All") {
            const candidate = item.staffType || item["Staff Category"] || item["Category"] || item.role || item["Role"] || item.userType || "";
            if (String(candidate).toLowerCase() !== String(extraVal).toLowerCase()) return false;
        }
        if (monthVal) {
            const rawDate = item.createdAt || item.registeredAt || item["Registered On"] || item["Joined Date"];
            if (rawDate) {
                const d = new Date(rawDate);
                if (!isNaN(d.getTime())) {
                    const [year, month] = monthVal.split("-");
                    if (d.getFullYear() !== parseInt(year) || (d.getMonth() + 1) !== parseInt(month)) return false;
                }
            }
        }
        if (queryVal) {
            const q = queryVal.toLowerCase().trim();
            const values = Object.values(item);
            const hasMatch = values.some(val => val !== null && val !== undefined && String(val).toLowerCase().includes(q));
            if (!hasMatch) return false;
        }
        return true;
    };

    // Filter change handlers that immediately sync selections to new view
    const handleStatusFilterChange = (newStatus) => {
        setFilterStatus(newStatus);
        setPreviewPage(1);
        const extraVal = extraFilter ? (extraFilter.value !== undefined ? extraFilter.value : internalExtraFilter) : "All";
        const nextFiltered = itemList.filter(item => matchesFilters(item, newStatus, filterDepartments, extraVal, filterMonth, searchQuery));
        setSelectedRowIds(new Set(nextFiltered.map((item, idx) => getItemId(item, idx))));
    };

    const handleDepartmentsFilterChange = (newDepts) => {
        setFilterDepartments(newDepts);
        setPreviewPage(1);
        const extraVal = extraFilter ? (extraFilter.value !== undefined ? extraFilter.value : internalExtraFilter) : "All";
        const nextFiltered = itemList.filter(item => matchesFilters(item, filterStatus, newDepts, extraVal, filterMonth, searchQuery));
        setSelectedRowIds(new Set(nextFiltered.map((item, idx) => getItemId(item, idx))));
    };

    const handleSearchQueryChange = (val) => {
        setSearchQuery(val);
        setPreviewPage(1);
    };

    const handleMonthFilterChange = (val) => {
        setFilterMonth(val);
        setPreviewPage(1);
    };

    const formatDate = (dateString) => {
        if (!dateString) return "—";
        const d = new Date(dateString);
        if (isNaN(d.getTime())) return String(dateString);
        return d.toLocaleDateString("en-US", {
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
                return grievance[key] !== undefined && grievance[key] !== null ? grievance[key] : "—";
        }
    };

    const getStatusClass = (status) => {
        const s = (status || "").toLowerCase().replace(" ", "");
        return `status-badge status-${s}`;
    };

    const renderCellContent = (item, colKey) => {
        if (renderCell) {
            const custom = renderCell(item, colKey);
            if (custom !== undefined) return custom;
        }

        if (isGrievanceMode) {
            if (colKey === "status") {
                return (
                    <span className={getStatusClass(item.status)}>
                        {item.status}
                    </span>
                );
            }
            if (colKey === "name") {
                return (
                    <div style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                        <span style={{ fontWeight: "500" }}>
                            {item.name || (getSubmitterRole(item) === "staff" ? "Staff Member" : "Student")}
                        </span>
                        <UserRoleBadge grievance={item} />
                    </div>
                );
            }
            return getCellValue(item, colKey);
        }

        // Generic mode cell value extraction
        const val = item[colKey] !== undefined 
            ? item[colKey] 
            : (item[activeColumns.find(c => c.key === colKey)?.label]);

        // Status badge formatting
        if (colKey === "Portal Status" || colKey === "status" || colKey === "Status") {
            const strVal = String(val || "").toUpperCase();
            if (strVal.includes("REGISTERED") && !strVal.includes("NOT")) {
                return (
                    <span style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "4px",
                        padding: "2px 8px",
                        borderRadius: "12px",
                        fontSize: "0.74rem",
                        fontWeight: 700,
                        background: "#dcfce7",
                        color: "#15803d",
                        border: "1px solid #86efac"
                    }}>
                        <CheckCircleIcon width="11" height="11" />
                        REGISTERED
                    </span>
                );
            }
            if (strVal.includes("NOT REGISTERED") || strVal === "UNREGISTERED") {
                return (
                    <span style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "4px",
                        padding: "2px 8px",
                        borderRadius: "12px",
                        fontSize: "0.74rem",
                        fontWeight: 700,
                        background: "#fee2e2",
                        color: "#dc2626",
                        border: "1px solid #fca5a5"
                    }}>
                        NOT REGISTERED
                    </span>
                );
            }
            return <span className={getStatusClass(val)}>{val || "—"}</span>;
        }

        // Role badge formatting
        if (colKey === "Role" || colKey === "role" || colKey === "Portal Role") {
            const roleStr = String(val || "").toLowerCase();
            const isStaff = roleStr.includes("staff");
            const isAdmin = roleStr.includes("admin");
            return (
                <span style={{
                    display: "inline-flex",
                    alignItems: "center",
                    padding: "2px 7px",
                    borderRadius: "4px",
                    fontSize: "0.74rem",
                    fontWeight: 600,
                    background: isAdmin ? "#fef3c7" : isStaff ? "#e0f2fe" : "#f1f5f9",
                    color: isAdmin ? "#92400e" : isStaff ? "#0369a1" : "#475569",
                    border: isAdmin ? "1px solid #fde68a" : isStaff ? "1px solid #bae6fd" : "1px solid #cbd5e1",
                    textTransform: "capitalize"
                }}>
                    {val || "—"}
                </span>
            );
        }

        if (val === true) return "Yes";
        if (val === false) return "No";
        if (val === null || val === undefined || val === "") return "—";
        return String(val);
    };

    const handleExport = () => {
        const selectedData = filteredData.filter((item, idx) => selectedRowIds.has(getItemId(item, idx)));
        if (selectedData.length === 0) {
            alert("Please select at least one record to export.");
            return;
        }
        const finalSheetName = (customSheetName && customSheetName.trim())
            ? customSheetName.trim()
            : defaultSheetName;
        onExport(selectedData, selectedColumns, finalSheetName);
        onClose();
    };

    const resetFilters = () => {
        setSearchQuery("");
        setFilterStatus("All");
        setFilterDepartments([]);
        setFilterMonth("");
        setInternalExtraFilter("All");
        setPreviewPage(1);
        setSelectedRowIds(new Set(itemList.map(getItemId)));
        if (extraFilter && extraFilter.onChange) {
            extraFilter.onChange("All");
        }
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

    const computedSubtitle = subtitle || (isGrievanceMode ? "Filter and select grievance data to export" : "Filter and select data to export");
    const computedSearchPlaceholder = searchPlaceholder || (isGrievanceMode ? "Search Student ID, Message..." : "Search records by ID, Name...");
    const isStudentCohort = /student/i.test(title || "");
    const deptPlaceholder = isStudentCohort ? "All Schools" : "All Departments";
    const deptSearchPlaceholder = isStudentCohort ? "Filter schools..." : "Filter departments...";

    return (
        <div
            className="export-modal-overlay"
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
                                {title}
                            </h2>
                            <p style={{ margin: "2px 0 0", fontSize: "0.82rem", color: "#64748b" }}>
                                {computedSubtitle}
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

                {/* Scrollable Modal Body (Contains Filters, Columns, Stats, Records, and Pagination) */}
                <div
                    className="export-modal-body"
                    style={{
                        flex: 1,
                        overflowY: "auto",
                        overflowX: "hidden",
                        WebkitOverflowScrolling: "touch",
                        minHeight: 0,
                        display: "flex",
                        flexDirection: "column",
                        background: "#ffffff",
                    }}
                >
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
                            placeholder={computedSearchPlaceholder}
                            value={searchQuery}
                            onChange={(e) => handleSearchQueryChange(e.target.value)}
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
                        onChange={(e) => handleStatusFilterChange(e.target.value)}
                        style={selectStyle}
                    >
                        {activeStatusOptions.map((opt) => {
                            const val = typeof opt === "string" ? opt : opt.value;
                            const lbl = typeof opt === "string" ? (opt === "All" ? "All Status" : opt) : opt.label;
                            return (
                                <option key={val} value={val}>{lbl}</option>
                            );
                        })}
                    </select>

                    {/* Department / School Multi-Select Dropdown */}
                    {uniqueDepartments.length > 0 && (
                        <div style={{ flex: "1 1 200px", minWidth: "180px", maxWidth: "340px" }}>
                            <MultiSelectDropdown
                                options={uniqueDepartments}
                                selected={filterDepartments}
                                onChange={handleDepartmentsFilterChange}
                                placeholder={deptPlaceholder}
                                searchPlaceholder={deptSearchPlaceholder}
                                width="100%"
                                showDoneButton={false}
                                buttonStyle={{
                                    height: "38px",
                                    borderRadius: "6px",
                                    fontSize: "0.85rem",
                                    background: filterDepartments.length > 0 ? "#eff6ff" : "#ffffff",
                                    border: filterDepartments.length > 0 ? "1.5px solid #3b82f6" : "1px solid #cbd5e1",
                                    color: filterDepartments.length > 0 ? "#1e40af" : "#0f172a",
                                }}
                            />
                        </div>
                    )}

                    {/* Optional Extra Filter (Category / Role) */}
                    {extraFilter && extraFilter.options && (
                        <select
                            value={extraFilter.value !== undefined ? extraFilter.value : internalExtraFilter}
                            onChange={(e) => {
                                setInternalExtraFilter(e.target.value);
                                setPreviewPage(1);
                                if (extraFilter.onChange) extraFilter.onChange(e.target.value);
                            }}
                            style={{ ...selectStyle, flex: "1 1 160px" }}
                        >
                            {extraFilter.options.map(opt => {
                                const val = typeof opt === "string" ? opt : opt.value;
                                const lbl = typeof opt === "string" ? opt : opt.label;
                                return <option key={val} value={val}>{lbl}</option>;
                            })}
                        </select>
                    )}

                    {/* Month Filter */}
                    <input
                        type="month"
                        value={filterMonth}
                        onChange={(e) => handleMonthFilterChange(e.target.value)}
                        style={{ ...inputStyle, cursor: "pointer", flex: "0 0 auto", width: "auto" }}
                        title="Filter by creation/registration month"
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
                    <div
                        style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            marginBottom: "8px",
                        }}
                    >
                        <p style={{
                            margin: 0,
                            fontWeight: "700",
                            color: "#64748b",
                            fontSize: "0.76rem",
                            textTransform: "uppercase",
                            letterSpacing: "0.05em",
                            display: "flex",
                            alignItems: "center",
                            gap: "6px"
                        }}>
                            <GridIcon width="13" height="13" /> Select Columns ({selectedColumns.length}/{activeColumns.length})
                        </p>
                    </div>
                    <div
                        className="export-columns-chips-container"
                        style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}
                    >
                        {activeColumns.map((col) => {
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
                            Filtered: <strong style={{ color: "#0f172a", fontWeight: "700" }}>{filteredData.length.toLocaleString()}</strong>
                        </span>
                        <span style={{ color: "#64748b", fontWeight: "500", fontSize: "0.82rem", display: "flex", alignItems: "center", gap: "6px" }}>
                            <CheckCircleIcon width="14" height="14" style={{ color: "#16a34a" }} />
                            Selected to Export: <strong style={{ color: "#16a34a", fontWeight: "700" }}>{activeSelectedCount.toLocaleString()}</strong>
                        </span>
                        <span style={{ color: "#64748b", fontWeight: "500", fontSize: "0.82rem", display: "flex", alignItems: "center", gap: "6px" }}>
                            <GridIcon width="14" height="14" style={{ color: "#94a3b8" }} />
                            Columns: <strong style={{ color: "#0f172a", fontWeight: "700" }}>{selectedColumns.length}</strong>
                        </span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        {/* Select All Checkbox */}
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
                                checked={isAllFilteredSelected}
                                onChange={toggleSelectAll}
                                style={{
                                    width: "16px",
                                    height: "16px",
                                    cursor: "pointer",
                                    accentColor: "#0f172a",
                                }}
                            />
                            {isAllFilteredSelected ? "Deselect All" : "Select All"}
                        </label>
                    </div>
                </div>

                {/* Horizontal Scroll Table Preview */}
                <div
                    className="export-table-container"
                    style={{
                        flex: 1,
                        overflow: "auto",
                        background: "#ffffff",
                        WebkitOverflowScrolling: "touch",
                    }}
                >
                    <table style={{
                        width: "100%",
                        minWidth: "850px",
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
                                        checked={isAllFilteredSelected}
                                        onChange={toggleSelectAll}
                                        style={{ width: "15px", height: "15px", cursor: "pointer", accentColor: "#0f172a" }}
                                    />
                                </th>
                                {activeColumns
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
                                paginatedPreviewData.map((item, idx) => {
                                    const globalIdx = (currentPreviewPage - 1) * previewPageSize + idx;
                                    const rowId = getItemId(item, globalIdx);
                                    const isRowSelected = selectedRowIds.has(rowId);
                                    return (
                                        <tr
                                            key={rowId}
                                            onClick={() => toggleRow(rowId)}
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
                                                    onChange={() => toggleRow(rowId)}
                                                    onClick={(e) => e.stopPropagation()}
                                                    style={{ width: "15px", height: "15px", cursor: "pointer", accentColor: "#0f172a" }}
                                                />
                                            </td>
                                            {activeColumns
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
                                                        {renderCellContent(item, col.key)}
                                                    </td>
                                                ))}
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Preview Pagination Toolbar */}
                {filteredData.length > 0 && (
                    <div
                        className="export-pagination-bar"
                        style={{
                            padding: "10px 24px",
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            background: "#f8fafc",
                            borderTop: "1px solid #e2e8f0",
                            fontSize: "0.82rem",
                            color: "#64748b",
                            flexWrap: "wrap",
                            gap: "10px"
                        }}
                    >
                        <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                            <span>
                                Showing <strong>{((currentPreviewPage - 1) * previewPageSize) + 1}</strong> – <strong>{Math.min(currentPreviewPage * previewPageSize, filteredData.length)}</strong> of <strong>{filteredData.length.toLocaleString()}</strong> preview records
                            </span>
                            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                <span style={{ fontSize: "0.78rem" }}>Preview rows:</span>
                                <select
                                    value={previewPageSize}
                                    onChange={(e) => {
                                        setPreviewPageSize(Number(e.target.value));
                                        setPreviewPage(1);
                                    }}
                                    style={{
                                        padding: "3px 8px",
                                        borderRadius: "6px",
                                        border: "1px solid #cbd5e1",
                                        fontSize: "0.78rem",
                                        background: "#ffffff",
                                        cursor: "pointer"
                                    }}
                                >
                                    <option value={25}>25</option>
                                    <option value={50}>50</option>
                                    <option value={100}>100</option>
                                </select>
                            </div>
                        </div>

                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                            <button
                                type="button"
                                onClick={() => setPreviewPage(p => Math.max(1, p - 1))}
                                disabled={currentPreviewPage <= 1}
                                style={{
                                    padding: "4px 10px",
                                    borderRadius: "6px",
                                    border: "1px solid #cbd5e1",
                                    background: currentPreviewPage <= 1 ? "#f1f5f9" : "#ffffff",
                                    color: currentPreviewPage <= 1 ? "#94a3b8" : "#0f172a",
                                    cursor: currentPreviewPage <= 1 ? "not-allowed" : "pointer",
                                    fontWeight: "600",
                                    fontSize: "0.78rem"
                                }}
                            >
                                Previous
                            </button>
                            <span style={{ padding: "0 6px", fontWeight: "600", color: "#0f172a" }}>
                                Page {currentPreviewPage} of {totalPreviewPages}
                            </span>
                            <button
                                type="button"
                                onClick={() => setPreviewPage(p => Math.min(totalPreviewPages, p + 1))}
                                disabled={currentPreviewPage >= totalPreviewPages}
                                style={{
                                    padding: "4px 10px",
                                    borderRadius: "6px",
                                    border: "1px solid #cbd5e1",
                                    background: currentPreviewPage >= totalPreviewPages ? "#f1f5f9" : "#ffffff",
                                    color: currentPreviewPage >= totalPreviewPages ? "#94a3b8" : "#0f172a",
                                    cursor: currentPreviewPage >= totalPreviewPages ? "not-allowed" : "pointer",
                                    fontWeight: "600",
                                    fontSize: "0.78rem"
                                }}
                            >
                                Next
                            </button>
                        </div>
                    </div>
                )}

                </div>{/* End export-modal-body */}

                {/* Footer */}
                <div
                    className="export-footer"
                    style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: "12px 24px",
                        borderTop: "1px solid #f1f5f9",
                        background: "#ffffff",
                        gap: "16px",
                    }}
                >
                    {/* Sheet / File Name Input (User customizable) */}
                    <div
                        className="export-sheetname-wrap"
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "10px",
                            flex: "1 1 auto",
                            maxWidth: "460px",
                        }}
                    >
                        <label
                            htmlFor="export-custom-sheet-name-input"
                            style={{
                                fontSize: "0.82rem",
                                fontWeight: "600",
                                color: "#1e293b",
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "6px",
                                whiteSpace: "nowrap",
                            }}
                        >
                            <FileIcon width="15" height="15" style={{ color: "#2563eb" }} />
                            Sheet / File Name:
                        </label>
                        <div style={{ position: "relative", width: "100%" }}>
                            <input
                                id="export-custom-sheet-name-input"
                                type="text"
                                value={customSheetName}
                                onChange={(e) => setCustomSheetName(e.target.value)}
                                placeholder="Enter sheet / report name..."
                                style={{
                                    width: "100%",
                                    height: "36px",
                                    padding: "0 50px 0 12px",
                                    borderRadius: "6px",
                                    border: "1.5px solid #cbd5e1",
                                    background: "#f8fafc",
                                    fontSize: "0.84rem",
                                    fontWeight: "500",
                                    color: "#0f172a",
                                    boxSizing: "border-box",
                                    outline: "none",
                                    transition: "all 0.15s ease",
                                }}
                                onFocus={(e) => {
                                    e.target.style.borderColor = "#2563eb";
                                    e.target.style.background = "#ffffff";
                                    e.target.style.boxShadow = "0 0 0 3px rgba(37, 99, 235, 0.12)";
                                }}
                                onBlur={(e) => {
                                    e.target.style.borderColor = "#cbd5e1";
                                    e.target.style.background = "#f8fafc";
                                    e.target.style.boxShadow = "none";
                                }}
                            />
                            <span
                                style={{
                                    position: "absolute",
                                    right: "8px",
                                    top: "50%",
                                    transform: "translateY(-50%)",
                                    fontSize: "0.72rem",
                                    fontWeight: "600",
                                    color: "#64748b",
                                    pointerEvents: "none",
                                    userSelect: "none",
                                    background: "#e2e8f0",
                                    padding: "2px 6px",
                                    borderRadius: "4px",
                                }}
                            >
                                .xlsx
                            </span>
                        </div>
                    </div>

                    <div style={{ display: "flex", gap: "10px", alignItems: "center", flexShrink: 0 }}>
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
                            disabled={activeSelectedCount === 0 || selectedColumns.length === 0}
                            style={{
                                padding: "8px 22px",
                                borderRadius: "6px",
                                border: "none",
                                background: activeSelectedCount === 0 || selectedColumns.length === 0
                                    ? "#cbd5e1"
                                    : "#0f172a",
                                color: activeSelectedCount === 0 || selectedColumns.length === 0
                                    ? "#94a3b8"
                                    : "#ffffff",
                                fontWeight: "600",
                                fontSize: "0.84rem",
                                cursor: activeSelectedCount === 0 || selectedColumns.length === 0 ? "not-allowed" : "pointer",
                                transition: "all 0.15s ease",
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "6px",
                            }}
                            onMouseOver={(e) => {
                                if (activeSelectedCount > 0 && selectedColumns.length > 0) {
                                    e.currentTarget.style.background = "#1e293b";
                                }
                            }}
                            onMouseOut={(e) => {
                                if (activeSelectedCount > 0 && selectedColumns.length > 0) {
                                    e.currentTarget.style.background = "#0f172a";
                                }
                            }}
                        >
                            <DownloadIcon width="15" height="15" />
                            Export {activeSelectedCount.toLocaleString()} Records
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
          .export-modal-overlay {
            padding: 8px !important;
            align-items: center !important;
          }

          .export-modal-container {
            height: 94vh !important;
            max-height: 94vh !important;
            border-radius: 14px !important;
            margin: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
            display: flex !important;
            flex-direction: column !important;
            overflow: hidden !important;
          }
          
          .export-header {
            padding: 12px 16px !important;
            flex-shrink: 0 !important;
          }
          
          .export-header h2 {
            font-size: 1.05rem !important;
          }

          .export-modal-body {
            flex: 1 !important;
            overflow-y: auto !important;
            -webkit-overflow-scrolling: touch !important;
            min-height: 0 !important;
            display: flex !important;
            flex-direction: column !important;
          }
          
          .export-filter-bar {
            display: flex !important;
            flex-direction: row !important;
            flex-wrap: wrap !important;
            padding: 8px 12px !important;
            gap: 6px !important;
            align-items: center !important;
          }
          
          .export-filter-bar > * {
            flex: 1 1 130px !important;
            min-width: 110px !important;
          }
          
          .export-column-section {
            padding: 8px 12px !important;
          }

          .export-columns-chips-container {
            display: flex !important;
            flex-wrap: nowrap !important;
            overflow-x: auto !important;
            -webkit-overflow-scrolling: touch !important;
            padding-bottom: 4px !important;
            gap: 6px !important;
          }
          
          .export-columns-chips-container label {
            flex-shrink: 0 !important;
          }
          
          .export-stats-bar {
            padding: 10px 14px !important;
            flex-direction: row !important;
            flex-wrap: wrap !important;
            gap: 8px !important;
            align-items: center !important;
            justify-content: space-between !important;
          }
          
          .export-stats-bar > div {
            gap: 10px !important;
            flex-wrap: wrap !important;
          }
          
          .export-table-container {
            flex: 1 !important;
            min-height: 260px !important;
            overflow: auto !important;
            -webkit-overflow-scrolling: touch !important;
            background: #ffffff !important;
          }

          .export-table-container table {
            min-width: 850px !important;
            border-collapse: collapse !important;
          }

          .export-pagination-bar {
            padding: 8px 12px !important;
            font-size: 0.78rem !important;
            gap: 6px !important;
          }
          
          .export-footer {
            padding: 10px 14px !important;
            flex-direction: column !important;
            gap: 8px !important;
            align-items: stretch !important;
            flex-shrink: 0 !important;
          }
          
          .export-sheetname-wrap {
            max-width: 100% !important;
            width: 100% !important;
            flex-direction: column !important;
            align-items: flex-start !important;
            gap: 4px !important;
          }

          .export-sheetname-wrap > div {
            width: 100% !important;
          }

          .export-footer > div:last-child {
            width: 100% !important;
          }
          
          .export-footer button {
            flex: 1 !important;
            justify-content: center !important;
          }
        }
      `}</style>
        </div>
    );
};

export default ExportPreviewModal;
