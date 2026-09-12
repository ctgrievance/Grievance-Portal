import React from "react";
import { SearchIcon, UserIcon, DownloadIcon, XIcon } from "./Icons";

function DepartmentFilterBar({
  searchId,
  setSearchId,
  searchIdPlaceholder = "Search Student ID...",
  searchStaffId,
  setSearchStaffId,
  searchStaffIdPlaceholder = "Search Staff ID...",
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
  const showSearches = setSearchId != null || setSearchStaffId != null;
  const showControls =
    setStatusFilter != null ||
    (setFilterDepartment != null && departments.length > 0) ||
    setFilterMonth != null;
  const showActions = onReset != null || onExport != null;

  return (
    <div className="dept-filter-bar">
      {/* Search Inputs */}
      {showSearches && (
        <div className="dept-filter-searches">
          {setSearchId && (
            <div className="dept-filter-input-wrap">
              <span className="dept-filter-icon">
                <SearchIcon width="16" height="16" />
              </span>
              <input
                type="text"
                placeholder={searchIdPlaceholder}
                value={searchId || ""}
                onChange={(e) => setSearchId(e.target.value)}
                className="dept-filter-input"
              />
              {searchId ? (
                <button
                  type="button"
                  className="dept-filter-clear-btn"
                  onClick={() => setSearchId("")}
                  title="Clear"
                >
                  <XIcon width="14" height="14" />
                </button>
              ) : null}
            </div>
          )}

          {setSearchStaffId && (
            <div className="dept-filter-input-wrap">
              <span className="dept-filter-icon">
                <UserIcon width="16" height="16" />
              </span>
              <input
                type="text"
                placeholder={searchStaffIdPlaceholder}
                value={searchStaffId || ""}
                onChange={(e) => setSearchStaffId(e.target.value)}
                className="dept-filter-input"
              />
              {searchStaffId ? (
                <button
                  type="button"
                  className="dept-filter-clear-btn"
                  onClick={() => setSearchStaffId("")}
                  title="Clear"
                >
                  <XIcon width="14" height="14" />
                </button>
              ) : null}
            </div>
          )}
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

          {setFilterDepartment && departments.length > 0 && (
            <div className="dept-filter-select-wrap">
              <select
                value={filterDepartment || "All"}
                onChange={(e) => setFilterDepartment(e.target.value)}
                className="dept-filter-select"
              >
                <option value="All">All Departments</option>
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
