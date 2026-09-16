import React, { useState } from "react";
import {
  XIcon,
  UploadIcon,
  FileIcon,
  PlusIcon,
  RefreshIcon,
  TrashIcon
} from "./Icons";

export default function ExcelUploadModeModal({
  isOpen,
  onClose,
  onConfirm,
  file,
  recordType = "Student" // "Student" | "Staff"
}) {
  const [selectedMode, setSelectedMode] = useState("add"); // "add" | "change" | "remove"

  if (!isOpen || !file) return null;

  const formatFileSize = (bytes) => {
    if (!bytes) return "0 KB";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  const handleProceed = () => {
    if (selectedMode === "change") {
      const confirmReplace = window.confirm(
        `⚠️ WARNING: "Full Replace" will permanently DELETE ALL existing ${recordType} records from the database and replace them with this Excel sheet. Are you sure you want to proceed?`
      );
      if (!confirmReplace) return;
    } else if (selectedMode === "remove") {
      const confirmDelete = window.confirm(
        `⚠️ ATTENTION: Are you sure you want to REMOVE records matching this Excel sheet from the ${recordType} database?`
      );
      if (!confirmDelete) return;
    }

    onConfirm(selectedMode);
  };

  const modes = [
    {
      id: "add",
      title: "Append & Update",
      subtitle: "Merge Mode",
      badge: "Recommended",
      badgeStyle: {
        background: "#f0fdf4",
        color: "#166534",
        border: "1px solid #bbf7d0"
      },
      icon: PlusIcon,
      description: `Keeps existing ${recordType} records. Adds new entries and updates existing ones with fresh details from all sheet tabs.`,
      highlight: "Safe · Existing data will not be deleted"
    },
    {
      id: "change",
      title: "Full Replace",
      subtitle: "Overwrite Mode",
      badge: "Complete Reset",
      badgeStyle: {
        background: "#f8fafc",
        color: "#334155",
        border: "1px solid #e2e8f0"
      },
      icon: RefreshIcon,
      description: `Clears all existing ${recordType} records from the database and replaces the entire dataset with the rows from this file.`,
      highlight: "Overwrites entire dataset across all tabs"
    },
    {
      id: "remove",
      title: "Remove Matching",
      subtitle: "Selective Delete",
      badge: "Delete",
      badgeStyle: {
        background: "#fff1f2",
        color: "#9f1239",
        border: "1px solid #fecdd3"
      },
      icon: TrashIcon,
      description: `Scans IDs across all sheet tabs and permanently removes those matching entries from the ${recordType} database.`,
      highlight: "Only matching record IDs will be removed"
    }
  ];

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(15, 23, 42, 0.45)",
        backdropFilter: "blur(4px)",
        zIndex: 99999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
        animation: "fadeIn 0.15s ease"
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "#ffffff",
          borderRadius: "16px",
          maxWidth: "540px",
          width: "100%",
          maxHeight: "90vh",
          overflowY: "auto",
          boxShadow: "0 20px 40px -15px rgba(15, 23, 42, 0.15), 0 0 0 1px rgba(15, 23, 42, 0.06)",
          position: "relative"
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── HEADER ── */}
        <div
          style={{
            padding: "18px 22px",
            borderBottom: "1px solid #f1f5f9",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "10px",
                background: "#f8fafc",
                border: "1px solid #e2e8f0",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#0f172a"
              }}
            >
              <FileIcon width="18" height="18" />
            </div>
            <div>
              <h3
                style={{
                  margin: 0,
                  fontSize: "1.05rem",
                  fontWeight: 700,
                  color: "#0f172a",
                  letterSpacing: "-0.01em"
                }}
              >
                Upload {recordType} Records
              </h3>
              <p style={{ margin: "2px 0 0 0", fontSize: "0.8rem", color: "#64748b" }}>
                Select how this dataset should be imported
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            style={{
              background: "transparent",
              border: "none",
              color: "#94a3b8",
              borderRadius: "8px",
              width: "30px",
              height: "30px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              transition: "all 0.15s ease"
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "#f1f5f9";
              e.currentTarget.style.color = "#0f172a";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.color = "#94a3b8";
            }}
          >
            <XIcon width="16" height="16" />
          </button>
        </div>

        {/* ── BODY ── */}
        <div style={{ padding: "20px 22px" }}>
          {/* File summary pill */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "10px 14px",
              background: "#f8fafc",
              border: "1px solid #e2e8f0",
              borderRadius: "10px",
              marginBottom: "18px",
              gap: "10px"
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px", minWidth: 0 }}>
              <div
                style={{
                  width: "28px",
                  height: "28px",
                  borderRadius: "6px",
                  background: "#e2e8f0",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#334155",
                  flexShrink: 0
                }}
              >
                <FileIcon width="14" height="14" />
              </div>
              <div style={{ minWidth: 0 }}>
                <div
                  style={{
                    fontWeight: 600,
                    fontSize: "0.85rem",
                    color: "#0f172a",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis"
                  }}
                  title={file.name}
                >
                  {file.name}
                </div>
                <div style={{ fontSize: "0.74rem", color: "#64748b" }}>
                  {formatFileSize(file.size)} · Multi-sheet extraction
                </div>
              </div>
            </div>
            <span
              style={{
                background: "#ffffff",
                border: "1px solid #e2e8f0",
                color: "#475569",
                padding: "2px 8px",
                borderRadius: "6px",
                fontSize: "0.7rem",
                fontWeight: 600,
                flexShrink: 0
              }}
            >
              All Sheets
            </span>
          </div>

          <div
            style={{
              marginBottom: "10px",
              fontWeight: 700,
              fontSize: "0.72rem",
              color: "#64748b",
              textTransform: "uppercase",
              letterSpacing: "0.05em"
            }}
          >
            Select Action Mode
          </div>

          {/* 3 Options Cards */}
          <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "20px" }}>
            {modes.map((mode) => {
              const isSelected = selectedMode === mode.id;
              const isDanger = mode.id === "remove";
              const IconComp = mode.icon;

              let cardBorder = "1px solid #e2e8f0";
              let cardBg = "#ffffff";
              let cardShadow = "none";

              if (isSelected) {
                if (isDanger) {
                  cardBorder = "1.5px solid #e11d48";
                  cardBg = "#fffcfc";
                  cardShadow = "0 2px 8px rgba(225, 29, 72, 0.06)";
                } else {
                  cardBorder = "1.5px solid #0f172a";
                  cardBg = "#f8fafc";
                  cardShadow = "0 2px 8px rgba(15, 23, 42, 0.05)";
                }
              }

              return (
                <div
                  key={mode.id}
                  onClick={() => setSelectedMode(mode.id)}
                  style={{
                    border: cardBorder,
                    background: cardBg,
                    borderRadius: "12px",
                    padding: "13px 15px",
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                    boxShadow: cardShadow
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.borderColor = "#cbd5e1";
                      e.currentTarget.style.background = "#fafafa";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.borderColor = "#e2e8f0";
                      e.currentTarget.style.background = "#ffffff";
                    }
                  }}
                >
                  <div style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
                    {/* Radio circle */}
                    <div
                      style={{
                        width: "18px",
                        height: "18px",
                        borderRadius: "50%",
                        border: isSelected
                          ? `5px solid ${isDanger ? "#e11d48" : "#0f172a"}`
                          : "1.5px solid #cbd5e1",
                        backgroundColor: "#ffffff",
                        marginTop: "2px",
                        flexShrink: 0,
                        transition: "all 0.15s"
                      }}
                    />

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          gap: "8px",
                          marginBottom: "4px"
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "7px",
                            fontWeight: 650,
                            fontSize: "0.88rem",
                            color: "#0f172a"
                          }}
                        >
                          <span
                            style={{
                              width: "22px",
                              height: "22px",
                              borderRadius: "6px",
                              display: "inline-flex",
                              alignItems: "center",
                              justifyContent: "center",
                              background: isSelected
                                ? isDanger
                                  ? "#ffe4e6"
                                  : "#0f172a"
                                : "#f1f5f9",
                              color: isSelected
                                ? isDanger
                                  ? "#be123c"
                                  : "#ffffff"
                                : "#64748b",
                              transition: "all 0.15s ease"
                            }}
                          >
                            <IconComp width="13" height="13" />
                          </span>
                          <span>{mode.title}</span>
                        </div>

                        <span
                          style={{
                            ...mode.badgeStyle,
                            padding: "2px 7px",
                            borderRadius: "6px",
                            fontSize: "0.68rem",
                            fontWeight: 600,
                            flexShrink: 0
                          }}
                        >
                          {mode.badge}
                        </span>
                      </div>

                      <p
                        style={{
                          margin: "0 0 4px 0",
                          fontSize: "0.8rem",
                          color: "#475569",
                          lineHeight: 1.4
                        }}
                      >
                        {mode.description}
                      </p>

                      <div
                        style={{
                          fontSize: "0.74rem",
                          color: isDanger && isSelected ? "#be123c" : "#64748b",
                          fontWeight: 500,
                          display: "flex",
                          alignItems: "center",
                          gap: "4px"
                        }}
                      >
                        <span>•</span>
                        <span>{mode.highlight}</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* ── FOOTER ── */}
          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              alignItems: "center",
              gap: "10px",
              paddingTop: "14px",
              borderTop: "1px solid #f1f5f9"
            }}
          >
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: "8px 16px",
                borderRadius: "8px",
                border: "1px solid #e2e8f0",
                background: "#ffffff",
                color: "#475569",
                fontWeight: 600,
                fontSize: "0.85rem",
                cursor: "pointer",
                transition: "all 0.15s ease"
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "#f8fafc";
                e.currentTarget.style.borderColor = "#cbd5e1";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "#ffffff";
                e.currentTarget.style.borderColor = "#e2e8f0";
              }}
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleProceed}
              style={{
                padding: "8px 18px",
                borderRadius: "8px",
                border: "none",
                background: selectedMode === "remove" ? "#dc2626" : "#0f172a",
                color: "#ffffff",
                fontWeight: 600,
                fontSize: "0.85rem",
                cursor: "pointer",
                transition: "all 0.15s ease",
                display: "inline-flex",
                alignItems: "center",
                gap: "7px"
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background =
                  selectedMode === "remove" ? "#b91c1c" : "#1e293b";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background =
                  selectedMode === "remove" ? "#dc2626" : "#0f172a";
              }}
            >
              <UploadIcon width="14" height="14" />
              <span>
                {selectedMode === "add"
                  ? "Append Records"
                  : selectedMode === "change"
                  ? "Overwrite Records"
                  : "Remove Records"}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
