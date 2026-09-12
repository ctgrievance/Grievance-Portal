import React, { useState } from "react";
import PdfThumbnail from "./PdfThumbnail";

const formatFileSize = (bytes) => {
  if (!bytes || isNaN(bytes)) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} kB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export default function PdfChatCard({ fileUrl, docName, fileSize, onView, onDownload }) {
  const [pageCount, setPageCount] = useState(null);

  const formattedSize = formatFileSize(fileSize);

  return (
    <div
      className="chat-pdf-card"
      onClick={onView}
      title="Click to view full screen"
    >
      {/* 📄 Top Preview Section (Real PDF Page 1 Preview like WhatsApp) */}
      <div className="chat-pdf-preview-pane">
        <PdfThumbnail
          fileUrl={fileUrl}
          docName={docName}
          onPageCount={setPageCount}
        />
      </div>

      {/* ℹ️ Bottom Info Section */}
      <div className="chat-pdf-info-footer">
        <div className="chat-pdf-icon-badge">
          <span>PDF</span>
        </div>
        <div className="chat-pdf-title-col">
          <span className="chat-pdf-filename" title={docName}>{docName}</span>
          <span className="chat-pdf-subinfo">
            {pageCount ? `${pageCount} page${pageCount > 1 ? "s" : ""} • ` : ""}
            PDF{formattedSize ? ` • ${formattedSize}` : " Document"}
          </span>
        </div>
        <button
          type="button"
          className="chat-pdf-download-btn"
          title="Download PDF"
          onClick={(e) => {
            e.stopPropagation();
            if (onDownload) onDownload();
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
        </button>
      </div>
    </div>
  );
}
