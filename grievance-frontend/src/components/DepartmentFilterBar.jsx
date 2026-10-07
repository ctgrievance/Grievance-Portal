import React from "react";
import { SearchIcon, DownloadIcon, XIcon } from "./Icons";

function DepartmentFilterBar({
  searchId,
  setSearchId,
  searchIdPlaceholder,
  searchStaffId,
  setSearchStaffId,
  searchStaffIdPlaceholder,
  searchQuery,
  setSearchQuery,
  searchPlaceholder,
  statusFilter,
  setStatusFilter,
  statusOptions = ["All", "Pending", "Assigned", "Resolved", "Rejected"],
  filterDepartment,
  setFilterDepartment,
  departments = [],
  filterMonth,
  setFilterMonth,
  onReset,
  onExport,
}) {
  const showSearch = setSearchId != null || setSearchStaffId != null || searchQuery != null;
  const currentSearchValue = searchQuery !== undefined 
    ? (searchQuery || "") 
    : (searchId || searchStaffId || "");

  const handleSearchChange = (val) => {
    if (setSearchQuery) setSearchQuery(val);
    if (setSearchId) setSearchId(val);
    if (setSearchStaffId) setSearchStaffId("");
  };

  const handleClear = () => {
    if (setSearchQuery) setSearchQuery("");
    if (setSearchId) setSearchId("");
    if (setSearchStaffId) setSearchStaffId("");
  };

  const resolvedPlaceholder = 
    searchPlaceholder || 
    (searchIdPlaceholder && searchIdPlaceholder !== "Search Student ID..." ? searchIdPlaceholder : "Search by Student ID, Staff ID, Name...");

  const showControls =
    setStatusFilter != null ||
    setFilterDepartment != null ||
    setFilterMonth != null;
  const showActions = onReset != null || onExport != null;

  return (
    <div className="dept-filter-bar">
      {/* Unified Single Search Bar */}
      {showSearch && (
        <div className="dept-filter-searches">
          <div className="dept-filter-input-wrap">
            <span className="dept-filter-icon">
              <SearchIcon width="16" height="16" />
            </span>
            <input
              type="text"
              placeholder={resolvedPlaceholder}
              value={currentSearchValue}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="dept-filter-input"
            />
            {currentSearchValue ? (
              <button
                type="button"
                className="dept-filter-clear-btn"
                onClick={handleClear}
                title="Clear"
              >
                <XIcon width="14" height="14" />
              </button>
            ) : null}
          </div>
        </div>
      )}

      {/* Dropdown Filters & Month */}
      {showControls && (
        <div className="dept-filter-controls">
          {setStatusFilter && (
            <div className="dept-filter-select-wrap">
              <select
                value={statusFilter || "All"}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="dept-filter-select"
              >
                {statusOptions.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt === "All" ? "All Statuses" : opt}
                  </option>
                ))}
              </select>
            </div>
          )}

          {setFilterDepartment && (
            <div className="dept-filter-select-wrap">
              <select
                value={filterDepartment || "All"}
                onChange={(e) => setFilterDepartment(e.target.value)}
                className="dept-filter-select"
                disabled={departments.length === 0}
              >
                <option value="All">
                  {departments.length === 0 ? "No External Depts" : "All Departments"}
                </option>
                {departments.map((dept) => (
                  <option key={dept} value={dept}>
                    {dept}
                  </option>
                ))}
              </select>
            </div>
          )}

          {setFilterMonth && (
            <div className="dept-filter-select-wrap">
              <input
                type="month"
                value={filterMonth || ""}
                onChange={(e) => setFilterMonth(e.target.value)}
                className="dept-filter-select dept-filter-month"
                title="Filter by Month"
              />
            </div>
          )}
        </div>
      )}

      {/* Action Buttons */}
      {showActions && (
        <div className="dept-filter-actions">
          {onReset && (
            <button
              type="button"
              onClick={onReset}
              className="dept-filter-btn-reset"
            >
              Reset
            </button>
          )}
          {onExport && (
            <button
              type="button"
              onClick={onExport}
              className="dept-filter-btn-export"
            >
              <DownloadIcon width="15" height="15" />
              <span>Export</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default DepartmentFilterBar;
