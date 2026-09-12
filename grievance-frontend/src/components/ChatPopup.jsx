import React, { useState, useEffect, useRef } from "react";
import "../styles/Dashboard.css"; // Ensure this has basic modal styles

// ✅ Advanced Icons
import {
  PaperclipIcon,
  CameraIcon,
  FileIcon,
  XIcon as CloseIcon,
  MessageCircleIcon,
  SwitchCameraIcon
} from "./Icons";
import { getSocket, joinChatRoom, leaveChatRoom } from "../services/socket";
import { playNotificationSound } from "../utils/soundAlert";
import { jsPDF } from "jspdf";

function ChatPopup({ isOpen, onClose, grievanceId, currentUserId, currentUserRole }) {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [selectedFile, setSelectedFile] = useState(null); // Track selected file
  const [isUploading, setIsUploading] = useState(false);  // Loading state for upload
  const [grievanceData, setGrievanceData] = useState(null); // Store grievance details


  // 📷 Camera & Capture states
  const [showCamera, setShowCamera] = useState(false);
  const [cameraFacing, setCameraFacing] = useState("environment"); // Default to rear/back camera on mobile
  const [capturedPhoto, setCapturedPhoto] = useState(null); // { blob, dataUrl, width, height }
  const [isConvertingPdf, setIsConvertingPdf] = useState(false);

  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null); // Fallback native camera input
  const chatBodyRef = useRef(null);
  const hasScrolledRef = useRef(false);
  const prevMessagesLength = useRef(0);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

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
      // Scroll if I sent it OR if I was already reading at the bottom
      if (isMyMessage || isNearBottom) {
        messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
      }
    }

    // Update length ref
    prevMessagesLength.current = currentLength;
  }, [messages, currentUserId]);

  // 📷 CAMERA STREAM MANAGEMENT WITH FACING MODE
  useEffect(() => {
    let activeStream = null;
    let isCancelled = false;

    if (showCamera) {
      const initCamera = async () => {
        try {
          // Stop any leftover tracks
          if (videoRef.current && videoRef.current.srcObject) {
            videoRef.current.srcObject.getTracks().forEach((t) => t.stop());
          }

          const isPortrait = window.innerHeight > window.innerWidth;
          const constraints = {
            video: {
              facingMode: { ideal: cameraFacing },
              width: { ideal: isPortrait ? 1080 : 1920 },
              height: { ideal: isPortrait ? 1920 : 1080 }
            },
            audio: false
          };

          const stream = await navigator.mediaDevices.getUserMedia(constraints);
          if (isCancelled) {
            stream.getTracks().forEach((t) => t.stop());
            return;
          }
          activeStream = stream;
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
          }
        } catch (err) {
          console.warn("Camera with facingMode failed, trying fallback:", err);
          try {
            const fallbackStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
            if (isCancelled) {
              fallbackStream.getTracks().forEach((t) => t.stop());
              return;
            }
            activeStream = fallbackStream;
            if (videoRef.current) {
              videoRef.current.srcObject = fallbackStream;
            }
          } catch (fallbackErr) {
            console.error("Camera access failed:", fallbackErr);
            alert("Could not access camera. Please ensure camera permissions are allowed in your browser.");
            setShowCamera(false);
          }
        }
      };

      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        initCamera();
      } else {
        alert("Camera viewfinder is not supported directly in this browser. Opening native camera...");
        setShowCamera(false);
        if (cameraInputRef.current) cameraInputRef.current.click();
      }
    }

    return () => {
      isCancelled = true;
      if (activeStream) {
        activeStream.getTracks().forEach((track) => track.stop());
      }
      if (videoRef.current && videoRef.current.srcObject) {
        videoRef.current.srcObject.getTracks().forEach((track) => track.stop());
        videoRef.current.srcObject = null;
      }
    };
  }, [showCamera, cameraFacing]);

  const toggleCameraFacing = () => {
    setCameraFacing((prev) => (prev === "environment" ? "user" : "environment"));
  };

  const handleCapture = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const width = video.videoWidth || 1280;
      const height = video.videoHeight || 720;
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(video, 0, 0, width, height);

      const dataUrl = canvas.toDataURL("image/jpeg", 0.92);
      canvas.toBlob((blob) => {
        if (blob) {
          setCapturedPhoto({
            blob,
            dataUrl,
            width,
            height
          });
          setShowCamera(false); // Close camera overlay and open format chooser
        }
      }, "image/jpeg", 0.92);
    }
  };

  // Fallback for native mobile camera picker
  const handleNativeCameraFallback = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
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
      e.target.value = "";
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

  // Format Chooser Option 2: Convert & Send as PDF
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


  // Handle Standard File Selection
  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
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

      // Step 2: Send Message with File Data
      const savedFullName = localStorage.getItem("grievance_user_name");
      const payload = {
        grievanceId,
        senderId: currentUserId,
        senderRole: currentUserRole,
        sender: savedFullName || (currentUserRole === "student" ? "Student" : "Staff"),
        message: newMessage,
        fileData: uploadedFileData
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

        {/* 📷 LIVE CAMERA OVERLAY WITH SWITCH CAMERA */}
        {showCamera && (
          <div className="chat-camera-overlay">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="chat-camera-video"
            />
            <canvas ref={canvasRef} style={{ display: 'none' }} />

            {/* Top Bar with Camera Status / Facing Indicator & Close */}
            <div className="chat-camera-top-bar">
              <span className="chat-camera-badge">
                <span className="chat-camera-dot" />
                {cameraFacing === "environment" ? "Back Camera" : "Front Camera"}
              </span>
              <button
                type="button"
                onClick={() => setShowCamera(false)}
                className="chat-camera-close-icon"
                title="Close Camera"
              >
                ✕
              </button>
            </div>

            {/* Bottom Controls: Cancel, Capture Shutter, Switch Camera */}
            <div className="chat-camera-controls">
              <button
                type="button"
                onClick={() => setShowCamera(false)}
                className="chat-camera-action-btn"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleCapture}
                className="chat-camera-shutter-btn"
                title="Take Photo"
              >
                <div className="chat-shutter-inner" />
              </button>

              <button
                type="button"
                onClick={toggleCameraFacing}
                className="chat-camera-action-btn switch-btn"
                title="Switch Front / Back Camera"
              >
                <SwitchCameraIcon width="24" height="24" />
              </button>
            </div>
          </div>
        )}

        {/* 📄 CAPTURED PHOTO FORMAT CHOOSER MODAL (Photo vs PDF) */}
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
                    <CameraIcon width="22" height="22" />
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
                    <FileIcon width="22" height="22" />
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
                  onClick={() => {
                    setCapturedPhoto(null);
                    setShowCamera(true);
                  }}
                  disabled={isConvertingPdf}
                >
                  🔄 Retake Photo
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
            <CloseIcon width="20" height="20" />
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
                <MessageCircleIcon width="48" height="48" style={{ color: "#94a3b8" }} />
              </div>
              <p>No messages yet.<br />Start the conversation!</p>
            </div>
          ) : (
            messages.map((msg, index) => {
              const isMine = msg.senderId === currentUserId;
              const showAvatar = !isMine && (index === 0 || messages[index - 1].senderId !== msg.senderId);

              return (
                <div key={msg._id} className={`chat-message-row ${isMine ? 'sent' : 'received'}`}>
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

                  <div className={`chat-bubble ${isMine ? 'sent' : 'received'}`}>

                    {/* ✅ DISPLAY FILE */}
                    {msg.fileData && (
                      <div style={{ marginBottom: msg.message ? '8px' : '0' }}>
                        {msg.fileData.contentType?.startsWith("image/") ? (
                          <img
                            src={`${process.env.REACT_APP_API_URL || "http://localhost:5000"}/api/file/${msg.fileData.filename}`}
                            alt="attachment"
                            style={{ maxWidth: "100%", borderRadius: "12px", cursor: "pointer", display: 'block' }}
                            onClick={() => window.open(`${process.env.REACT_APP_API_URL || "http://localhost:5000"}/api/file/${msg.fileData.filename}`, "_blank")}
                          />
                        ) : (
                          <a
                            href={`${process.env.REACT_APP_API_URL || "http://localhost:5000"}/api/file/${msg.fileData.filename}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              display: "flex", alignItems: "center", gap: "8px", padding: "8px 12px",
                              background: isMine ? 'rgba(255,255,255,0.18)' : '#f1f5f9',
                              borderRadius: "10px", textDecoration: "none", color: 'inherit', fontWeight: '500'
                            }}
                          >
                            <FileIcon width="18" height="18" style={{ color: isMine ? '#ffffff' : '#ef4444', flexShrink: 0 }} />
                            <span style={{ fontSize: '0.85rem', wordBreak: 'break-all' }}>
                              {msg.fileData.originalname || "Download Document"}
                            </span>
                          </a>
                        )}
                      </div>
                    )}

                    {/* TEXT */}
                    {msg.message}

                    {/* TIME */}
                    <div className="chat-timestamp">
                      {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* ✅ FOOTER INPUT AREA */}
        <div className="chat-footer">
          {/* File Preview */}
          {selectedFile && (
            <div className="chat-selected-file-pill">
              <span style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                {selectedFile.type === "application/pdf" ? (
                  <FileIcon width="16" height="16" style={{ color: "#ef4444", flexShrink: 0 }} />
                ) : (
                  <PaperclipIcon width="16" height="16" style={{ color: "#3b82f6", flexShrink: 0 }} />
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
              {/* Attach File Button */}
              <button
                type="button"
                className="chat-icon-btn"
                onClick={() => fileInputRef.current.click()}
                title="Attach File"
              >
                <PaperclipIcon width="20" height="20" />
              </button>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                style={{ display: "none" }}
              />

              {/* Camera Button */}
              <button
                type="button"
                className="chat-icon-btn"
                onClick={() => {
                  if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
                    setShowCamera(true);
                  } else if (cameraInputRef.current) {
                    cameraInputRef.current.click();
                  } else {
                    setShowCamera(true);
                  }
                }}
                title="Camera"
              >
                <CameraIcon width="20" height="20" />
              </button>
              {/* Native Camera fallback input for devices/browsers blocking getUserMedia */}
              <input
                type="file"
                accept="image/*"
                capture="environment"
                ref={cameraInputRef}
                onChange={handleNativeCameraFallback}
                style={{ display: "none" }}
              />

              {/* Text Input (Middle) */}
              <input
                type="text"
                className="chat-input-field"
                placeholder="Message..."
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

export default ChatPopup;