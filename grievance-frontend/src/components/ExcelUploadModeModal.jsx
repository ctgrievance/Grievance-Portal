import React, { useState } from "react";
import { XIcon, UploadIcon, CheckCircleIcon } from "./Icons";

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
        `⚠️ WARNING: "Change Data" will permanently DELETE ALL existing ${recordType} records from the database and replace them with this Excel sheet. Are you sure you want to proceed?`
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
      title: "Add Data (Merge / Append)",
      badge: "Safe & Recommended",
      badgeColor: "#10b981",
      icon: "➕",
      description: `Keep all existing ${recordType} records in the database. New records from all sheet tabs will be added, and existing ones will be updated with fresh details.`,
      highlight: "No existing data will be deleted."
    },
    {
      id: "change",
      title: "Change Data (Replace / Overwrite Entire Records)",
      badge: "New Session / Fresh Batch",
      badgeColor: "#6366f1",
      icon: "🔄",
      description: `Wipes out all current ${recordType} records from the database and replaces the entire dataset with the records from this new Excel file.`,
      highlight: "Clean complete replacement across all tabs."
    },
    {
      id: "remove",
      title: "Remove Data (Delete Matching Records)",
      badge: "Selective Purge",
      badgeColor: "#ef4444",
      icon: "🗑️",
      description: `Scans IDs from all tabs in this Excel file and permanently deletes those matching records from the ${recordType} database.`,
      highlight: "Only matching records will be removed."
    }
  ];

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(15, 23, 42, 0.75)",
        backdropFilter: "blur(6px)",
        zIndex: 99999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
        animation: "fadeIn 0.2s ease"
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "#ffffff",
          borderRadius: "20px",
          maxWidth: "640px",
          width: "100%",
          maxHeight: "92vh",
          overflowY: "auto",
          boxShadow: "0 25px 50px -12px rgba(15, 23, 42, 0.35)",
          border: "1px solid rgba(226, 232, 240, 0.8)",
          position: "relative",
          animation: "modalSlideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1)"
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: "22px 26px",
            borderBottom: "1px solid #e2e8f0",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            background: "linear-gradient(135deg, #0f172a 0%, #1e1b4b 60%, #312e81 100%)",
            color: "#ffffff",
            borderTopLeftRadius: "20px",
            borderTopRightRadius: "20px"
          }}
        >
          <div>
            <h3 style={{ margin: 0, fontSize: "1.2rem", fontWeight: 700, display: "flex", alignItems: "center", gap: "8px" }}>
              <span>📊</span>
              <span>Upload {recordType} Records</span>
            </h3>
            <p style={{ margin: "4px 0 0 0", fontSize: "0.85rem", color: "#c7d2fe" }}>
              Select how this Excel dataset should be processed into the verification database
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: "rgba(255, 255, 255, 0.15)",
              border: "none",
              color: "#ffffff",
              borderRadius: "50%",
              width: "34px",
              height: "34px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              transition: "all 0.2s"
            }}
          >
            <XIcon width="18" height="18" />
          </button>
        </div>

        {/* Body Content */}
        <div style={{ padding: "24px 26px" }}>
          {/* File summary pill */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "12px 16px",
              background: "linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)",
              border: "1.5px solid #cbd5e1",
              borderRadius: "12px",
              marginBottom: "20px",
              gap: "12px"
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px", minWidth: 0 }}>
              <span style={{ fontSize: "1.6rem" }}>📑</span>
              <div style={{ minWidth: 0 }}>
                <div
                  style={{
                    fontWeight: 700,
                    fontSize: "0.95rem",
                    color: "#0f172a",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis"
                  }}
                  title={file.name}
                >
                  {file.name}
                </div>
                <div style={{ fontSize: "0.8rem", color: "#64748b" }}>
                  Size: {formatFileSize(file.size)} · Multi-Tab Extraction Active
                </div>
              </div>
            </div>
            <span
              style={{
                background: "#e0e7ff",
                color: "#3730a3",
                padding: "4px 10px",
                borderRadius: "16px",
                fontSize: "0.75rem",
                fontWeight: 700,
                flexShrink: 0
              }}
            >
              All Tabs Included
            </span>
          </div>

          <div style={{ marginBottom: "14px", fontWeight: 700, fontSize: "0.95rem", color: "#1e293b" }}>
            Select Action Mode:
          </div>

          {/* 3 Options Cards */}
          <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "24px" }}>
            {modes.map((mode) => {
              const isSelected = selectedMode === mode.id;
              return (
                <div
                  key={mode.id}
                  onClick={() => setSelectedMode(mode.id)}
                  style={{
                    border: isSelected ? "2px solid #6366f1" : "1.5px solid #e2e8f0",
                    background: isSelected
                      ? "linear-gradient(135deg, #eef2ff 0%, #ffffff 100%)"
                      : "#ffffff",
                    borderRadius: "14px",
                    padding: "14px 16px",
                    cursor: "pointer",
                    transition: "all 0.2s ease",
                    boxShadow: isSelected ? "0 4px 16px rgba(99, 102, 241, 0.15)" : "none",
                    position: "relative"
                  }}
                >
                  <div style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
                    {/* Radio circle */}
                    <div
                      style={{
                        width: "20px",
                        height: "20px",
                        borderRadius: "50%",
                        border: isSelected ? "6px solid #6366f1" : "2px solid #cbd5e1",
                        backgroundColor: "#ffffff",
                        marginTop: "3px",
                        flexShrink: 0,
                        transition: "all 0.15s"
                      }}
                    />

                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px", flexWrap: "wrap", marginBottom: "4px" }}>
                        <div style={{ fontWeight: 700, fontSize: "0.95rem", color: isSelected ? "#1e1b4b" : "#1e293b" }}>
                          <span style={{ marginRight: "6px" }}>{mode.icon}</span>
                          {mode.title}
                        </div>
                        <span
                          style={{
                            backgroundColor: `${mode.badgeColor}18`,
                            color: mode.badgeColor,
                            border: `1px solid ${mode.badgeColor}40`,
                            padding: "2px 8px",
                            borderRadius: "12px",
                            fontSize: "0.72rem",
                            fontWeight: 700
                          }}
                        >
                          {mode.badge}
                        </span>
                      </div>

                      <p style={{ margin: "0 0 6px 0", fontSize: "0.84rem", color: "#475569", lineHeight: 1.45 }}>
                        {mode.description}
                      </p>

                      <div style={{ fontSize: "0.78rem", color: mode.id === "remove" ? "#b91c1c" : mode.id === "change" ? "#4338ca" : "#15803d", fontWeight: 600 }}>
                        ✦ {mode.highlight}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Action Footer */}
          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              alignItems: "center",
              gap: "12px",
              paddingTop: "16px",
              borderTop: "1px solid #e2e8f0"
            }}
          >
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: "10px 20px",
                borderRadius: "10px",
                border: "1.5px solid #cbd5e1",
                background: "#ffffff",
                color: "#475569",
                fontWeight: 600,
                fontSize: "0.92rem",
                cursor: "pointer",
                transition: "all 0.2s"
              }}
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleProceed}
              style={{
                padding: "10px 24px",
                borderRadius: "10px",
                border: "none",
                background:
                  selectedMode === "remove"
                    ? "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)"
                    : selectedMode === "change"
                    ? "linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)"
                    : "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                color: "#ffffff",
                fontWeight: 700,
                fontSize: "0.92rem",
                cursor: "pointer",
                boxShadow: "0 4px 14px rgba(0, 0, 0, 0.15)",
                transition: "all 0.2s",
                display: "inline-flex",
                alignItems: "center",
                gap: "8px"
              }}
            >
              <UploadIcon width="16" height="16" />
              <span>
                {selectedMode === "add"
                  ? "Proceed with Add Data"
                  : selectedMode === "change"
                  ? "Proceed with Complete Overwrite"
                  : "Proceed with Remove Data"}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
