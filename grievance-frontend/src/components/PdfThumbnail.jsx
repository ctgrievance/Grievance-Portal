import React, { useEffect, useRef, useState } from "react";

// Global cache for PDF thumbnail dataUrls to avoid re-rendering
const thumbnailCache = new Map();

export default function PdfThumbnail({ fileUrl, docName, onPageCount }) {
  const canvasRef = useRef(null);
  const [status, setStatus] = useState("loading"); // "loading" | "ready" | "error"
  const [cachedImg, setCachedImg] = useState(null);

  useEffect(() => {
    if (!fileUrl) return;

    // 1. Check in-memory cache first for instant 0ms display
    if (thumbnailCache.has(fileUrl)) {
      const cached = thumbnailCache.get(fileUrl);
      setCachedImg(cached.dataUrl);
      if (cached.numPages && onPageCount) {
        onPageCount(cached.numPages);
      }
      setStatus("ready");
      return;
    }

    let isCancelled = false;

    const loadPdf = async () => {
      try {
        // Ensure pdfjsLib is available
        if (!window.pdfjsLib) {
          // Dynamic fallback to load local pdf.min.js
          await new Promise((resolve, reject) => {
            const existing = document.querySelector('script[data-pdfjs="true"]');
            if (existing) {
              existing.addEventListener("load", resolve);
              existing.addEventListener("error", reject);
              return;
            }
            const script = document.createElement("script");
            script.src = "/pdfjs/pdf.min.js";
            script.setAttribute("data-pdfjs", "true");
            script.onload = resolve;
            script.onerror = () => {
              // CDN fallback if local fails
              const cdnScript = document.createElement("script");
              cdnScript.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
              cdnScript.onload = resolve;
              cdnScript.onerror = reject;
              document.head.appendChild(cdnScript);
            };
            document.head.appendChild(script);
          });
        }

        if (isCancelled || !window.pdfjsLib) return;

        const pdfjs = window.pdfjsLib;
        if (!pdfjs.GlobalWorkerOptions.workerSrc) {
          pdfjs.GlobalWorkerOptions.workerSrc = "/pdfjs/pdf.worker.min.js";
        }

        const loadingTask = pdfjs.getDocument({
          url: fileUrl,
          cMapUrl: "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/cmaps/",
          cMapPacked: true,
        });

        const pdf = await loadingTask.promise;
        if (isCancelled) return;

        if (onPageCount) {
          onPageCount(pdf.numPages);
        }

        // Get Page 1
        const page = await pdf.getPage(1);
        if (isCancelled) return;

        // Render to an offscreen or inline canvas
        const unscaledViewport = page.getViewport({ scale: 1.0 });
        const targetWidth = 320; // High-resolution thumbnail
        const scale = targetWidth / unscaledViewport.width;
        const viewport = page.getViewport({ scale });

        let canvas = canvasRef.current;
        if (!canvas) {
          canvas = document.createElement("canvas");
        }

        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const context = canvas.getContext("2d");

        // White background for transparent PDF pages
        context.fillStyle = "#ffffff";
        context.fillRect(0, 0, canvas.width, canvas.height);

        const renderContext = {
          canvasContext: context,
          viewport: viewport,
        };

        await page.render(renderContext).promise;
        if (isCancelled) return;

        // Convert to dataUrl and cache
        const dataUrl = canvas.toDataURL("image/jpeg", 0.88);
        thumbnailCache.set(fileUrl, { dataUrl, numPages: pdf.numPages });
        setCachedImg(dataUrl);
        setStatus("ready");
      } catch (err) {
        console.warn("Could not generate PDF preview for:", fileUrl, err);
        if (!isCancelled) {
          setStatus("error");
        }
      }
    };

    loadPdf();

    return () => {
      isCancelled = true;
    };
  }, [fileUrl, onPageCount]);

  if (status === "ready" && cachedImg) {
    return (
      <div className="chat-pdf-real-preview">
        <img
          src={cachedImg}
          alt={docName || "PDF preview"}
          className="chat-pdf-thumbnail-img"
        />
        <div className="chat-pdf-preview-overlay">
          <span className="chat-pdf-view-badge">Tap to view full PDF</span>
        </div>
      </div>
    );
  }

  // Fallback / Loading Skeleton while rendering
  return (
    <div className="chat-pdf-mock-page">
      <div className="chat-pdf-mock-header">
        <div className="chat-pdf-mock-line w-40" />
        <div className="chat-pdf-mock-line w-20" />
      </div>
      <div className="chat-pdf-mock-content">
        <div className="chat-pdf-mock-line w-90" />
        <div className="chat-pdf-mock-line w-80" />
        <div className="chat-pdf-mock-line w-60" />
        <div className="chat-pdf-mock-line w-75" />
      </div>
      <div className="chat-pdf-preview-overlay">
        <span>{status === "loading" ? "Loading preview..." : "Click to view"}</span>
      </div>
    </div>
  );
}
