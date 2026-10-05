import React, { useState, useRef, useEffect, useMemo } from "react";
import { SearchIcon, XIcon } from "./Icons";

/**
 * MultiSelectDropdown
 * Executive multi-select filter dropdown for Schools / Departments.
 * Supports live search, "Select All", "Clear", badges, and click-outside dismissal.
 */
export default function MultiSelectDropdown({
  options = [],
  selected = [],
  onChange,
  placeholder = "All Schools",
  searchPlaceholder = "Filter schools...",
  width = "200px"
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const dropdownRef = useRef(null);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  // Filtered options based on inner search
  const filteredOptions = useMemo(() => {
    if (!searchTerm.trim()) return options;
    const q = searchTerm.toLowerCase().trim();
    return options.filter((opt) => opt.toLowerCase().includes(q));
  }, [options, searchTerm]);

  const toggleOption = (opt) => {
    const isSelected = selected.includes(opt);
    let newSelected;
    if (isSelected) {
      newSelected = selected.filter((item) => item !== opt);
    } else {
      newSelected = [...selected, opt];
    }
    onChange(newSelected);
  };

  const handleSelectAll = () => {
    const allFiltered = Array.from(new Set([...selected, ...filteredOptions]));
    onChange(allFiltered);
  };

  const handleClearAll = (e) => {
    if (e) e.stopPropagation();
    onChange([]);
  };

  // Determine label on button
  let displayLabel = placeholder;
  if (selected.length === 1) {
    displayLabel = selected[0];
  } else if (selected.length > 1) {
    displayLabel = `${selected.length} Selected`;
  }

  return (
    <div
      ref={dropdownRef}
      style={{
        position: "relative",
        display: "inline-block",
        width
      }}
    >
      {/* Trigger Button */}
      <div
        onClick={() => setIsOpen((prev) => !prev)}
        style={{
          width: "100%",
          height: "38px",
          padding: "0 10px",
          border: isOpen ? "1.5px solid #2563eb" : selected.length > 0 ? "1.5px solid #3b82f6" : "1px solid #cbd5e1",
          borderRadius: "8px",
          fontSize: "0.82rem",
          background: selected.length > 0 ? "#eff6ff" : "#f8fafc",
          color: selected.length > 0 ? "#1e40af" : "#334155",
          cursor: "pointer",
          fontWeight: selected.length > 0 ? 600 : 500,
          boxSizing: "border-box",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "6px",
          boxShadow: isOpen ? "0 0 0 3px rgba(37, 99, 235, 0.12)" : "none",
          transition: "all 0.15s ease",
          userSelect: "none"
        }}
        title={selected.length > 0 ? selected.join(", ") : placeholder}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            overflow: "hidden",
            whiteSpace: "nowrap",
            textOverflow: "ellipsis",
            flex: 1
          }}
        >
          {selected.length > 0 && (
            <span
              style={{
                width: "7px",
                height: "7px",
                borderRadius: "50%",
                background: "#2563eb",
                flexShrink: 0
              }}
            />
          )}
          <span
            style={{
              overflow: "hidden",
              whiteSpace: "nowrap",
              textOverflow: "ellipsis"
            }}
          >
            {displayLabel}
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "4px", flexShrink: 0 }}>
          {selected.length > 0 && (
            <span
              onClick={handleClearAll}
              style={{
                padding: "2px 4px",
                borderRadius: "4px",
                background: "#dbeafe",
                color: "#1e40af",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer"
              }}
              title="Clear school filters"
            >
              <XIcon width="11" height="11" />
            </span>
          )}

          {/* Chevron */}
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{
              transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
              transition: "transform 0.2s ease",
              color: selected.length > 0 ? "#1e40af" : "#64748b"
            }}
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </div>
      </div>

      {/* Popover Dropdown */}
      {isOpen && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            left: 0,
            zIndex: 1050,
            minWidth: "260px",
            maxWidth: "340px",
            width: "max-content",
            background: "#ffffff",
            borderRadius: "10px",
            border: "1px solid #cbd5e1",
            boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.12), 0 8px 10px -6px rgba(0, 0, 0, 0.08)",
            padding: "8px",
            animation: "fadeIn 0.15s ease"
          }}
        >
          {/* Inner Search Box */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              background: "#f1f5f9",
              padding: "6px 8px",
              borderRadius: "6px",
              marginBottom: "8px"
            }}
          >
            <SearchIcon width="13" height="13" color="#64748b" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={searchPlaceholder}
              autoFocus
              style={{
                border: "none",
                background: "transparent",
                fontSize: "0.8rem",
                width: "100%",
                outline: "none",
                color: "#1e293b"
              }}
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm("")}
                style={{
                  border: "none",
                  background: "transparent",
                  cursor: "pointer",
                  padding: 0,
                  display: "flex",
                  color: "#64748b"
                }}
              >
                <XIcon width="12" height="12" />
              </button>
            )}
          </div>

          {/* Quick Select Actions Bar */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "2px 4px 6px",
              borderBottom: "1px solid #f1f5f9",
              marginBottom: "4px"
            }}
          >
            <button
              type="button"
              onClick={handleSelectAll}
              style={{
                border: "none",
                background: "transparent",
                color: "#2563eb",
                fontSize: "0.75rem",
                fontWeight: 600,
                cursor: "pointer",
                padding: "2px 4px",
                borderRadius: "4px"
              }}
            >
              Select All
            </button>
            <button
              type="button"
              onClick={() => onChange([])}
              style={{
                border: "none",
                background: "transparent",
                color: "#64748b",
                fontSize: "0.75rem",
                fontWeight: 500,
                cursor: "pointer",
                padding: "2px 4px",
                borderRadius: "4px"
              }}
            >
              Clear
            </button>
          </div>

          {/* Options List */}
          <div
            style={{
              maxHeight: "200px",
              overflowY: "auto",
              paddingRight: "2px"
            }}
          >
            {filteredOptions.length === 0 ? (
              <div
                style={{
                  padding: "16px 10px",
                  textAlign: "center",
                  fontSize: "0.78rem",
                  color: "#94a3b8"
                }}
              >
                No matching schools found
              </div>
            ) : (
              filteredOptions.map((opt) => {
                const isChecked = selected.includes(opt);
                return (
                  <label
                    key={opt}
                    onClick={(e) => {
                      e.preventDefault();
                      toggleOption(opt);
                    }}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      padding: "6px 8px",
                      borderRadius: "6px",
                      fontSize: "0.8rem",
                      cursor: "pointer",
                      background: isChecked ? "#f0f9ff" : "transparent",
                      color: isChecked ? "#0369a1" : "#334155",
                      fontWeight: isChecked ? 600 : 400,
                      transition: "background 0.1s ease",
                      marginBottom: "2px",
                      userSelect: "none"
                    }}
                    onMouseEnter={(e) => {
                      if (!isChecked) e.currentTarget.style.background = "#f8fafc";
                    }}
                    onMouseLeave={(e) => {
                      if (!isChecked) e.currentTarget.style.background = "transparent";
                    }}
                  >
                    {/* Custom Styled Checkbox */}
                    <div
                      style={{
                        width: "15px",
                        height: "15px",
                        borderRadius: "4px",
                        border: isChecked ? "1.5px solid #0284c7" : "1.5px solid #cbd5e1",
                        background: isChecked ? "#0284c7" : "#ffffff",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                        transition: "all 0.15s ease"
                      }}
                    >
                      {isChecked && (
                        <svg
                          width="10"
                          height="10"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="#ffffff"
                          strokeWidth="3.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      )}
                    </div>
                    <span style={{ lineHeight: "1.25" }}>{opt}</span>
                  </label>
                );
              })
            )}
          </div>

          {/* Footer Bar */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              borderTop: "1px solid #f1f5f9",
              paddingTop: "6px",
              marginTop: "4px",
              fontSize: "0.74rem",
              color: "#64748b"
            }}
          >
            <span>
              {selected.length === 0 ? "All included" : `${selected.length} of ${options.length} selected`}
            </span>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              style={{
                border: "none",
                background: "#0f172a",
                color: "#ffffff",
                padding: "3px 9px",
                borderRadius: "5px",
                fontSize: "0.74rem",
                fontWeight: 600,
                cursor: "pointer"
              }}
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
