import React, { useState, useEffect, useRef } from "react";
import "../styles/Dashboard.css"; // Ensure this has basic modal styles

// ✅ Icons with bulletproof inline fallbacks (cannot ever be undefined)
import {
  PaperclipIcon,
  CameraIcon,
  FileIcon,
  XIcon,
  CloseIcon,
  MessageCircleIcon,
  DownloadIcon
} from "./Icons";
import { getSocket, joinChatRoom, leaveChatRoom } from "../services/socket";
import { playNotificationSound } from "../utils/soundAlert";
import { jsPDF } from "jspdf";
import PdfChatCard from "./PdfChatCard";

const SafePaperclipIcon = (props) => (
  typeof PaperclipIcon === "function" ? (
    <PaperclipIcon {...props} />
  ) : (
    <svg width={props.width || "20"} height={props.height || "20"} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
    </svg>
  )
);

const SafeDownloadIcon = (props) => (
  typeof DownloadIcon === "function" ? (
    <DownloadIcon {...props} />
  ) : (
    <svg width={props.width || "16"} height={props.height || "16"} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  )
);

const SafeCameraIcon = (props) => (
  typeof CameraIcon === "function" ? (
    <CameraIcon {...props} />
  ) : (
    <svg width={props.width || "22"} height={props.height || "22"} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
      <circle cx="12" cy="13" r="3" />
    </svg>
  )
);

const SafeFileIcon = (props) => (
  typeof FileIcon === "function" ? (
    <FileIcon {...props} />
  ) : (
    <svg width={props.width || "20"} height={props.height || "20"} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
    </svg>
  )
);

const SafeCloseIcon = (props) => {
  const IconComponent = typeof CloseIcon === "function" ? CloseIcon : typeof XIcon === "function" ? XIcon : null;
  return IconComponent ? (
    <IconComponent {...props} />
  ) : (
    <svg width={props.width || "20"} height={props.height || "20"} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
};

const SafeMessageCircleIcon = (props) => (
  typeof MessageCircleIcon === "function" ? (
    <MessageCircleIcon {...props} />
  ) : (
    <svg width={props.width || "48"} height={props.height || "48"} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
    </svg>
  )
);

const SafeReplyIcon = (props) => (
  <svg width={props.width || "14"} height={props.height || "14"} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <polyline points="9 17 4 12 9 7" />
    <path d="M20 18v-2a4 4 0 0 0-4-4H4" />
  </svg>
);

function ChatPopup({ isOpen, onClose, grievanceId, currentUserId, currentUserRole }) {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [selectedFile, setSelectedFile] = useState(null); // Track selected file
  const [isUploading, setIsUploading] = useState(false);  // Loading state for upload
  const [grievanceData, setGrievanceData] = useState(null); // Store grievance details

  // 💬 Active Quoted Reply State
  const [replyingTo, setReplyingTo] = useState(null);

  // 📷 Captured / Selected photo for Photo vs PDF chooser
  const [capturedPhoto, setCapturedPhoto] = useState(null); // { blob, dataUrl, width, height }
  const [isConvertingPdf, setIsConvertingPdf] = useState(false);

  // 🖼️ In-App Fullscreen Media Viewer (Image / PDF inside same window)
  const [activeMediaViewer, setActiveMediaViewer] = useState(null); // { type: 'image' | 'pdf', url, filename }

  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const textInputRef = useRef(null);
  const chatBodyRef = useRef(null);
  const touchStateRef = useRef({});
  const hasScrolledRef = useRef(false);
  const prevMessagesLength = useRef(0);

  // ⚡ Real-Time Socket.io Connection & Messages
  useEffect(() => {
    if (!isOpen || !grievanceId) return;

    const socket = getSocket();

    // 1. Join real-time room for this grievance
    joinChatRoom(grievanceId);

    // 2. Initial fetch of message history
    const fetchMessages = async () => {
      try {
        const res = await fetch(`${process.env.REACT_APP_API_URL || "http://localhost:5000"}/api/chat/${grievanceId}`);
        if (res.ok) {
          const data = await res.json();
          setMessages(data);
        }
      } catch (err) {
        console.error("Error fetching chat:", err);
      }
    };

    hasScrolledRef.current = false;
    prevMessagesLength.current = 0;
    fetchMessages();

    // 3. Real-time message listener (Instant 0ms delivery)
    const handleReceiveMessage = (incomingMsg) => {
      if (!incomingMsg || String(incomingMsg.grievanceId) !== String(grievanceId)) return;

      setMessages((prev) => {
        if (prev.some((m) => m._id && incomingMsg._id && String(m._id) === String(incomingMsg._id))) {
          return prev;
        }
        return [...prev, incomingMsg];
      });

      // Play audio notification if message is from the other party
      if (incomingMsg.senderId !== currentUserId) {
        playNotificationSound();
      }
    };

    socket.on("receive_message", handleReceiveMessage);

    return () => {
      socket.off("receive_message", handleReceiveMessage);
      leaveChatRoom(grievanceId);
    };
  }, [isOpen, grievanceId, currentUserId]);

  // ✅ Fetch grievance details (name, message) for header
  useEffect(() => {
    if (!isOpen || !grievanceId) return;

    const fetchGrievanceDetails = async () => {
      try {
        const res = await fetch(`${process.env.REACT_APP_API_URL || "http://localhost:5000"}/api/grievances/detail/${grievanceId}`);
        if (res.ok) {
          const data = await res.json();
          setGrievanceData(data);
        }
      } catch (err) {
        console.error("Error fetching grievance details:", err);
      }
    };

    fetchGrievanceDetails();
  }, [isOpen, grievanceId]);

  // ✅ SMART SCROLL LOGIC
  useEffect(() => {
    if (!messagesEndRef.current || !chatBodyRef.current) return;

    const container = chatBodyRef.current;
    const currentLength = messages.length;
    const prevLength = prevMessagesLength.current;
    const isNewMessage = currentLength > prevLength;

    // Check if user is near bottom (within 100px)
    const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 100;

    const lastMsg = messages[currentLength - 1];
    const isMyMessage = lastMsg?.senderId === currentUserId;

    // 1. First load? Force scroll instantly
    if (!hasScrolledRef.current && currentLength > 0) {
      messagesEndRef.current.scrollIntoView({ behavior: "auto" });
      hasScrolledRef.current = true;
    }
    // 2. Only scroll if a NEW message arrived
    else if (isNewMessage) {
      if (isMyMessage || isNearBottom) {
        messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
      }
    }

    // Update length ref
    prevMessagesLength.current = currentLength;
  }, [messages, currentUserId]);

  // 📥 Universal File Downloader
  const downloadFile = async (url, filename) => {
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = filename || "attachment";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (err) {
      const link = document.createElement("a");
      link.href = url;
      link.download = filename || "attachment";
      link.target = "_blank";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  // 📎 Handle File Selection (Both from Camera or Files)
  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];

      // If an image was chosen (either clicked via Camera or picked from Gallery)
      if (file.type && file.type.startsWith("image/")) {
        const reader = new FileReader();
        reader.onload = (evt) => {
          const dataUrl = evt.target.result;
          const img = new Image();
          img.onload = () => {
            setCapturedPhoto({
              blob: file,
              dataUrl,
              width: img.width || 1280,
              height: img.height || 720
            });
          };
          img.src = dataUrl;
        };
        reader.readAsDataURL(file);
      } else {
        // Non-image file (e.g. PDF, doc, etc.) attaches directly
        setSelectedFile(file);
      }
      e.target.value = ""; // Reset so same file can be re-selected if needed
    }
  };

  // Format Chooser Option 1: Send as Photo
  const handleSendAsPhoto = () => {
    if (!capturedPhoto) return;
    const file = new File(
      [capturedPhoto.blob],
      `photo_${Date.now()}.jpg`,
      { type: "image/jpeg" }
    );
    setSelectedFile(file);
    setCapturedPhoto(null);
  };

  // Format Chooser Option 2: Convert & Send as PDF (Exact Portrait / Landscape Dimensions)
  const handleSendAsPdf = () => {
    if (!capturedPhoto) return;
    setIsConvertingPdf(true);
    try {
      const imgWidth = capturedPhoto.width;
      const imgHeight = capturedPhoto.height;
      const isLandscape = imgWidth > imgHeight;

      // Exact matching orientation: Portrait if portrait, Landscape if landscape
      const pdf = new jsPDF({
        orientation: isLandscape ? "landscape" : "portrait",
        unit: "px",
        format: [imgWidth, imgHeight],
        hotfixes: ["px_scaling"]
      });

      pdf.addImage(capturedPhoto.dataUrl, "JPEG", 0, 0, imgWidth, imgHeight);
      const pdfBlob = pdf.output("blob");
      const pdfFile = new File(
        [pdfBlob],
        `document_${Date.now()}.pdf`,
        { type: "application/pdf" }
      );
      setSelectedFile(pdfFile);
      setCapturedPhoto(null);
    } catch (err) {
      console.error("PDF generation failed:", err);
      alert("Failed to convert image to PDF. Attaching as direct photo instead.");
      handleSendAsPhoto();
    } finally {
      setIsConvertingPdf(false);
    }
  };

  const handleRetakePhoto = () => {
    setCapturedPhoto(null);
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  // 💬 WhatsApp-style Reply Handler
  const handleInitiateReply = (msg) => {
    setReplyingTo(msg);
    setTimeout(() => {
      if (textInputRef.current) {
        textInputRef.current.focus();
      }
    }, 60);
  };

  const getQuotedSnippet = (target) => {
    if (!target) return "";
    const hasText = target.message && !target.message.toLowerCase().startsWith("sent an attachment:");
    if (hasText) return target.message;
    if (target.fileData) {
      const isImg = target.fileData.contentType?.startsWith("image/");
      const isPdfDoc = target.fileData.contentType === "application/pdf" || (target.fileData.originalName || "").toLowerCase().endsWith(".pdf");
      if (isImg) return "📷 Photo";
      if (isPdfDoc) return `📄 PDF: ${target.fileData.originalName || "Document"}`;
      return `📁 ${target.fileData.originalName || "Attachment"}`;
    }
    return "Message";
  };

  const scrollToMessage = (targetMsgId) => {
    if (!targetMsgId) return;
    const el = document.getElementById(`chat-msg-${targetMsgId}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.classList.add("chat-message-highlight");
      setTimeout(() => {
        el.classList.remove("chat-message-highlight");
      }, 1600);
    }
  };

  // 📱 Horizontal Swipe / Slide-to-reply gesture handlers
  const handleTouchStart = (e, msgId) => {
    const touch = e.touches[0];
    touchStateRef.current[msgId] = {
      startX: touch.clientX,
      startY: touch.clientY,
      currentX: touch.clientX,
      isSwiping: false
    };
  };

  const handleTouchMove = (e, msgId, isMine) => {
    const state = touchStateRef.current[msgId];
    if (!state) return;
    const touch = e.touches[0];
    const deltaX = touch.clientX - state.startX;
    const deltaY = touch.clientY - state.startY;

    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 10) {
      state.isSwiping = true;
      state.currentX = touch.clientX;
      const rowEl = document.getElementById(`chat-msg-${msgId}`);
      const bubbleEl = rowEl?.querySelector(".chat-bubble");
      if (bubbleEl) {
        let offset = 0;
        if (isMine && deltaX < 0) {
          offset = Math.max(deltaX, -45);
        } else if (!isMine && deltaX > 0) {
          offset = Math.min(deltaX, 45);
        }
        bubbleEl.style.transform = `translateX(${offset}px)`;
        bubbleEl.style.transition = "none";
      }
    }
  };

  const handleTouchEnd = (e, msg, isMine) => {
    const state = touchStateRef.current[msg._id];
    if (!state) return;
    const deltaX = state.currentX - state.startX;
    
    const rowEl = document.getElementById(`chat-msg-${msg._id}`);
    const bubbleEl = rowEl?.querySelector(".chat-bubble");
    if (bubbleEl) {
      bubbleEl.style.transform = "";
      bubbleEl.style.transition = "transform 0.2s ease";
    }

    if (state.isSwiping) {
      if ((isMine && deltaX < -32) || (!isMine && deltaX > 32)) {
        handleInitiateReply(msg);
        if (navigator.vibrate) {
          try { navigator.vibrate(20); } catch (vErr) {}
        }
      }
    }
    delete touchStateRef.current[msg._id];
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() && !selectedFile) return;

    setIsUploading(true);

    try {
      let uploadedFileData = null;

      // Step 1: Upload File if selected
      if (selectedFile) {
        const formData = new FormData();
        formData.append("file", selectedFile);

        const uploadRes = await fetch(`${process.env.REACT_APP_API_URL || "http://localhost:5000"}/api/upload`, {
          method: "POST",
          body: formData,
        });

        if (!uploadRes.ok) throw new Error("File upload failed");
        uploadedFileData = await uploadRes.json();
      }

      // Step 2: Send Message with File Data and Quoted Reply
      const savedFullName = localStorage.getItem("grievance_user_name");
      const payload = {
        grievanceId,
        senderId: currentUserId,
        senderRole: currentUserRole,
        sender: savedFullName || (currentUserRole === "student" ? "Student" : "Staff"),
        message: newMessage,
        fileData: uploadedFileData,
        replyTo: replyingTo ? {
          messageId: replyingTo._id,
          sender: replyingTo.sender,
          senderId: replyingTo.senderId,
          senderRole: replyingTo.senderRole,
          message: replyingTo.message,
          fileData: replyingTo.fileData ? {
            filename: replyingTo.fileData.filename,
            originalName: replyingTo.fileData.originalName || replyingTo.fileData.originalname,
            contentType: replyingTo.fileData.contentType
          } : null
        } : null
      };

      const res = await fetch(`${process.env.REACT_APP_API_URL || "http://localhost:5000"}/api/chat/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const sentMsg = await res.json();
        setMessages((prev) => {
          if (prev.some((m) => m._id && sentMsg._id && String(m._id) === String(sentMsg._id))) {
            return prev;
          }
          return [...prev, sentMsg];
        });
        setNewMessage("");
        setReplyingTo(null); // Clear reply preview on successful send
        setSelectedFile(null); // Reset file
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    } catch (err) {
      console.error("Error sending message:", err);
      alert("Failed to send message. Please try again.");
    } finally {
      setIsUploading(false);
    }
  };

  const viewerName = localStorage.getItem("grievance_user_name") || (currentUserRole === "student" ? "STUDENT" : "STAFF");
  const viewerId = currentUserId || localStorage.getItem("grievance_id") || "USER";
  const watermarkText = `${viewerName.toUpperCase()} • ID: ${viewerId} • CONFIDENTIAL`;

  if (!isOpen) return null;

  return (
    <div className="chat-modal-overlay">
      <div className="chat-modal">

        {/* 🖼️ IN-APP FULLSCREEN MEDIA VIEWER (No new tab!) */}
        {activeMediaViewer && (
          <div className="chat-fullscreen-viewer-overlay">
            <div className="chat-viewer-header">
              <div className="chat-viewer-info">
                <span className="chat-viewer-type-badge">
                  {activeMediaViewer.type === "pdf" ? "PDF" : "IMG"}
                </span>
                <span className="chat-viewer-filename" title={activeMediaViewer.filename}>
                  {activeMediaViewer.filename}
                </span>
              </div>

              <div className="chat-viewer-actions">
                <button
                  type="button"
                  onClick={() => downloadFile(activeMediaViewer.url, activeMediaViewer.filename)}
                  className="chat-viewer-action-btn download"
                  title="Download File"
                >
                  <SafeDownloadIcon width="16" height="16" />
                  <span>Download</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveMediaViewer(null)}
                  className="chat-viewer-action-btn close"
                  title="Close Viewer"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="chat-viewer-body">
              {activeMediaViewer.type === "image" ? (
                <img
                  src={activeMediaViewer.url}
                  alt={activeMediaViewer.filename}
                  className="chat-viewer-img"
                />
              ) : (
                <iframe
                  src={`${activeMediaViewer.url}#toolbar=1`}
                  title={activeMediaViewer.filename}
                  className="chat-viewer-iframe"
                />
              )}
            </div>
          </div>
        )}

        {/* 📄 CAPTURED / CHOSEN PHOTO FORMAT CHOOSER MODAL (Photo vs PDF) */}
        {capturedPhoto && (
          <div className="chat-capture-modal-overlay">
            <div className="chat-capture-modal">
              <div className="chat-capture-header">
                <h4>Attach Photo</h4>
                <button
                  type="button"
                  className="chat-capture-close-btn"
                  onClick={() => setCapturedPhoto(null)}
                  title="Close"
                >
                  ✕
                </button>
              </div>

              <div className="chat-capture-preview-container">
                <img
                  src={capturedPhoto.dataUrl}
                  alt="Captured Preview"
                  className="chat-capture-preview-img"
                />
              </div>

              <p className="chat-capture-prompt">Choose how you want to send this photo:</p>

              <div className="chat-capture-options">
                <button
                  type="button"
                  className="chat-capture-opt-btn photo-opt"
                  onClick={handleSendAsPhoto}
                  disabled={isConvertingPdf}
                >
                  <div className="chat-opt-icon">
                    <SafeCameraIcon width="22" height="22" />
                  </div>
                  <div className="chat-opt-text">
                    <strong>Send as Photo</strong>
                    <span>Direct image attachment (JPG)</span>
                  </div>
                </button>

                <button
                  type="button"
                  className="chat-capture-opt-btn pdf-opt"
                  onClick={handleSendAsPdf}
                  disabled={isConvertingPdf}
                >
                  <div className="chat-opt-icon">
                    <SafeFileIcon width="22" height="22" />
                  </div>
                  <div className="chat-opt-text">
                    <strong>{isConvertingPdf ? "Converting to PDF..." : "Send as PDF"}</strong>
                    <span>Convert into standard PDF document</span>
                  </div>
                </button>
              </div>

              <div className="chat-capture-footer-actions">
                <button
                  type="button"
                  className="chat-retake-btn"
                  onClick={handleRetakePhoto}
                  disabled={isConvertingPdf}
                >
                  🔄 Retake / Choose Other
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ✅ HEADER */}
        <div className="chat-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div className="chat-avatar">
              {currentUserRole === "student" ? grievanceData?.assignedStaff?.name?.[0] || "S" : grievanceData?.name?.[0] || "U"}
            </div>
            <div className="chat-header-info">
              <h3>
                {currentUserRole === "student" ? (grievanceData?.assignedStaff?.name || 'Support Team') : (grievanceData?.name || 'Student')}
              </h3>
              <p>
                {currentUserRole === "student" ? (grievanceData?.assignedStaff ? grievanceData.assignedStaff.department : 'Support') : (grievanceData?.userId || 'Online')}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="chat-close-btn">
            <SafeCloseIcon width="20" height="20" />
          </button>
        </div>

        {/* ✅ CHAT BODY (Text Selection Fully Enabled) */}
        <div
          className="chat-body"
          ref={chatBodyRef}
        >
          {/* 🔒 Dynamic Security Watermark (Selection-free background) */}
          <div className="chat-watermark-overlay" aria-hidden="true">
            {Array.from({ length: 14 }).map((_, i) => (
              <div key={i} className="chat-watermark-row">
                <span>{watermarkText}</span>
                <span>{watermarkText}</span>
              </div>
            ))}
          </div>

          {messages.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#94a3b8', textAlign: 'center', position: 'relative', zIndex: 1 }}>
              <div style={{ marginBottom: '12px', display: 'flex', justifyContent: 'center' }}>
                <SafeMessageCircleIcon width="48" height="48" style={{ color: "#94a3b8" }} />
              </div>
              <p>No messages yet.<br />Start the conversation!</p>
            </div>
          ) : (
            messages.map((msg, index) => {
              const isMine = msg.senderId === currentUserId;
              const showAvatar = !isMine && (index === 0 || messages[index - 1].senderId !== msg.senderId);

              // Check if message is a system generated attachment notice to suppress it
              const hasUserText = msg.message && !msg.message.toLowerCase().startsWith("sent an attachment:");

              return (
                <div
                  key={msg._id}
                  id={`chat-msg-${msg._id}`}
                  className={`chat-message-row ${isMine ? 'sent' : 'received'}`}
                  onTouchStart={(e) => handleTouchStart(e, msg._id)}
                  onTouchMove={(e) => handleTouchMove(e, msg._id, isMine)}
                  onTouchEnd={(e) => handleTouchEnd(e, msg, isMine)}
                >
                  {/* Avatar for received messages */}
                  {!isMine && (
                    <div style={{ width: '28px', height: '28px', flexShrink: 0 }}>
                      {showAvatar && (
                        <div style={{ width: '100%', height: '100%', borderRadius: '50%', background: '#cbd5e1', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', color: 'white', fontWeight: 'bold' }}>
                          {msg.sender?.[0]}
                        </div>
                      )}
                    </div>
                  )}

                  {/* 💬 OUR MESSAGE (SENT): Reply button appears on the LEFT of the bubble */}
                  {isMine && (
                    <button
                      type="button"
                      className="chat-msg-reply-trigger sent-side"
                      onClick={() => handleInitiateReply(msg)}
                      title="Reply"
                    >
                      <SafeReplyIcon width="13" height="13" />
                    </button>
                  )}

                  <div
                    className={`chat-bubble ${isMine ? 'sent' : 'received'}`}
                    onDoubleClick={() => handleInitiateReply(msg)}
                    title="Double-click or swipe to reply"
                  >
                    {/* 💬 QUOTED REPLY BLOCK (If this message is a reply) */}
                    {msg.replyTo && (
                      <div
                        className="chat-bubble-quoted-reply"
                        onClick={(e) => {
                          e.stopPropagation();
                          scrollToMessage(msg.replyTo.messageId);
                        }}
                        title="Click to view original message"
                      >
                        <div className="chat-quoted-accent" />
                        <div className="chat-quoted-body">
                          <div className="chat-quoted-sender">
                            {msg.replyTo.senderId === currentUserId ? "You" : (msg.replyTo.sender || "User")}
                          </div>
                          <div className="chat-quoted-text">
                            {getQuotedSnippet(msg.replyTo)}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* ✅ DISPLAY ATTACHMENT */}
                    {msg.fileData && (() => {
                      const fileUrl = `${process.env.REACT_APP_API_URL || "http://localhost:5000"}/api/file/${msg.fileData.filename}`;
                      const docName = msg.fileData.originalName || msg.fileData.originalname || "attachment";
                      const isImage = msg.fileData.contentType?.startsWith("image/");
                      const isPdf = msg.fileData.contentType === "application/pdf" || docName.toLowerCase().endsWith(".pdf");

                      return (
                        <div style={{ marginBottom: hasUserText ? '8px' : '0' }}>
                          {isImage ? (
                            /* 🖼️ IMAGE CARD */
                            <div
                              className="chat-image-card"
                              onClick={() => setActiveMediaViewer({ type: 'image', url: fileUrl, filename: docName })}
                              title="Click to view full screen"
                            >
                              <img
                                src={fileUrl}
                                alt={docName}
                                className="chat-message-image"
                              />
                              <button
                                type="button"
                                className="chat-img-download-btn"
                                title="Download Image"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  downloadFile(fileUrl, docName);
                                }}
                              >
                                <SafeDownloadIcon width="16" height="16" />
                              </button>
                            </div>
                          ) : isPdf ? (
                            /* 📄 WHATSAPP-STYLE PDF CARD (Real Page 1 Preview) */
                            <PdfChatCard
                              fileUrl={fileUrl}
                              docName={docName}
                              fileSize={msg.fileData?.size || msg.fileData?.length}
                              onView={() => setActiveMediaViewer({ type: 'pdf', url: fileUrl, filename: docName })}
                              onDownload={() => downloadFile(fileUrl, docName)}
                            />
                          ) : (
                            /* 📁 Other Generic Documents */
                            <div
                              style={{
                                display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px", padding: "10px 14px",
                                background: isMine ? 'rgba(255,255,255,0.18)' : '#f1f5f9',
                                borderRadius: "12px", color: 'inherit', fontWeight: '500', cursor: "pointer"
                              }}
                              onClick={() => downloadFile(fileUrl, docName)}
                            >
                              <div style={{ display: "flex", alignItems: "center", gap: "8px", minWidth: 0 }}>
                                <SafeFileIcon width="18" height="18" style={{ color: isMine ? '#ffffff' : '#3b82f6', flexShrink: 0 }} />
                                <span style={{ fontSize: '0.85rem', wordBreak: 'break-all' }}>{docName}</span>
                              </div>
                              <button
                                type="button"
                                style={{ background: "none", border: "none", color: "inherit", cursor: "pointer", display: "flex" }}
                                title="Download"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  downloadFile(fileUrl, docName);
                                }}
                              >
                                <SafeDownloadIcon width="16" height="16" />
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })()}

                    {/* TEXT (Only render if user actually typed a message) */}
                    {hasUserText && <div className="chat-msg-text">{msg.message}</div>}

                    {/* TIME */}
                    <div className="chat-timestamp">
                      {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>

                  {/* 💬 OTHER'S MESSAGE (RECEIVED): Reply button appears on the RIGHT of the bubble */}
                  {!isMine && (
                    <button
                      type="button"
                      className="chat-msg-reply-trigger received-side"
                      onClick={() => handleInitiateReply(msg)}
                      title="Reply"
                    >
                      <SafeReplyIcon width="13" height="13" />
                    </button>
                  )}
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* ✅ FOOTER INPUT AREA */}
        <div className="chat-footer">
          {/* 💬 WhatsApp-style Active Reply Preview Banner */}
          {replyingTo && (
            <div className="chat-reply-preview-bar">
              <div className="chat-reply-preview-accent" />
              <div className="chat-reply-preview-content">
                <div className="chat-reply-to-header">
                  <SafeReplyIcon width="12" height="12" style={{ color: "#6366f1", flexShrink: 0 }} />
                  <span className="chat-reply-to-name">
                    {replyingTo.senderId === currentUserId ? "Replying to yourself" : `Replying to ${replyingTo.sender}`}
                  </span>
                </div>
                <div className="chat-reply-preview-snippet">
                  {getQuotedSnippet(replyingTo)}
                </div>
              </div>
              <button
                type="button"
                className="chat-reply-preview-close"
                onClick={() => setReplyingTo(null)}
                title="Cancel reply"
              >
                ✕
              </button>
            </div>
          )}

          {/* File Preview */}
          {selectedFile && (
            <div className="chat-selected-file-pill">
              <span style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                {selectedFile.type === "application/pdf" ? (
                  <SafeFileIcon width="16" height="16" style={{ color: "#ef4444", flexShrink: 0 }} />
                ) : (
                  <SafePaperclipIcon width="16" height="16" style={{ color: "#3b82f6", flexShrink: 0 }} />
                )}
                <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                  {selectedFile.name}
                </span>
                {selectedFile.type === "application/pdf" && (
                  <span style={{ fontSize: '0.7rem', background: '#fee2e2', color: '#b91c1c', padding: '1px 6px', borderRadius: '4px', fontWeight: 600 }}>
                    PDF
                  </span>
                )}
              </span>
              <button
                type="button"
                onClick={() => {
                  setSelectedFile(null);
                  if (fileInputRef.current) fileInputRef.current.value = "";
                }}
                className="chat-remove-file-btn"
                title="Remove attachment"
              >
                ✕
              </button>
            </div>
          )}

          <form onSubmit={handleSend}>
            <div className="chat-input-wrapper">
              {/* Attach File Button (Single unified button for Camera, Camcorder, Files) */}
              <button
                type="button"
                className="chat-icon-btn"
                onClick={() => fileInputRef.current && fileInputRef.current.click()}
                title="Attach File or Take Photo"
              >
                <SafePaperclipIcon width="20" height="20" />
              </button>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                style={{ display: "none" }}
              />

              {/* Text Input (Middle) */}
              <input
                type="text"
                ref={textInputRef}
                className="chat-input-field"
                placeholder={replyingTo ? "Type your reply..." : "Message..."}
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                disabled={isUploading}
              />

              {/* Send Button (Right) */}
              {(newMessage.trim() || selectedFile) && (
                <button
                  type="submit"
                  disabled={isUploading}
                  className="chat-send-btn"
                >
                  {isUploading ? "..." : "Send"}
                </button>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export { ChatPopup };
export default ChatPopup;