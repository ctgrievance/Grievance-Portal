import React, { useState, useEffect, useRef } from "react";
import "../styles/Dashboard.css"; // Ensure this has basic modal styles

// ✅ Advanced Icons
import { PaperclipIcon, CameraIcon, FileIcon, XIcon as CloseIcon } from "./Icons";

function ChatPopup({ isOpen, onClose, grievanceId, currentUserId, currentUserRole }) {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [selectedFile, setSelectedFile] = useState(null); // ✅ NEW: Track selected file
  const [isUploading, setIsUploading] = useState(false);  // ✅ NEW: Loading state for upload
  const [grievanceData, setGrievanceData] = useState(null); // ✅ Store grievance details

  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null); // ✅ NEW: Ref for hidden file input
  const chatBodyRef = useRef(null); // ✅ NEW: Ref for scroll container
  const hasScrolledRef = useRef(false); // ✅ NEW: Track initial scroll
  const prevMessagesLength = useRef(0); // ✅ NEW: Track message count to detect new messages

  const [showCamera, setShowCamera] = useState(false); // ✅ Camera State
  const videoRef = useRef(null); // ✅ Video Ref
  const canvasRef = useRef(null); // ✅ Canvas Ref

  // Poll for messages every 3 seconds
  useEffect(() => {
    if (!isOpen || !grievanceId) return;

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

    // ✅ Reset scroll state when switching chats
    hasScrolledRef.current = false;
    prevMessagesLength.current = 0;

    fetchMessages();
    const interval = setInterval(fetchMessages, 3000);

    return () => clearInterval(interval);
  }, [isOpen, grievanceId]);

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

  // ✅ Handle File Selection
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

      // ✅ Step 1: Upload File if selected
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

      // ✅ Step 2: Send Message with File Data
      const payload = {
        grievanceId,
        senderId: currentUserId,
        senderRole: currentUserRole,
        sender: currentUserRole === "student" ? "Student" : "Staff",
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
        setMessages([...messages, sentMsg]);
        setNewMessage("");
        setSelectedFile(null); // Reset file
        if (fileInputRef.current) fileInputRef.current.value = ""; // Reset input
      }
    } catch (err) {
      console.error("Error sending message:", err);
      alert("Failed to send message. Please try again.");
    } finally {
      setIsUploading(false);
    }
  };

  // ✅ CAMERA LOGIC
  useEffect(() => {
    let stream = null;
    if (showCamera) {
      navigator.mediaDevices.getUserMedia({ video: true })
        .then((s) => {
          stream = s;
          if (videoRef.current) {
            videoRef.current.srcObject = s;
          }
        })
        .catch((err) => {
          console.error("Camera Error:", err);
          alert("Could not access camera. Please check permissions.");
          setShowCamera(false);
        });
    }
    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [showCamera]);

  const handleCapture = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      canvas.toBlob((blob) => {
        if (blob) {
          const file = new File([blob], `camera_capture_${Date.now()}.png`, { type: "image/png" });
          setSelectedFile(file);
          setShowCamera(false);
        }
      }, "image/png");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="chat-modal-overlay">
      <div className="chat-modal">

        {/* ✅ CAMERA OVERLAY */}
        {showCamera && (
          <div style={{
            position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
            backgroundColor: '#000', zIndex: 50, display: 'flex', flexDirection: 'column'
          }}>
            <video ref={videoRef} autoPlay playsInline style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            <canvas ref={canvasRef} style={{ display: 'none' }} />

            <div style={{ position: 'absolute', bottom: '30px', width: '100%', display: 'flex', justifyContent: 'center', gap: '20px', zIndex: 60 }}>
              <button
                onClick={() => setShowCamera(false)}
                style={{ padding: '12px 24px', borderRadius: '30px', border: 'none', background: 'rgba(255,255,255,0.2)', color: 'white', backdropFilter: 'blur(10px)', cursor: 'pointer', fontWeight: '600' }}
              >
                Cancel
              </button>
              <button
                onClick={handleCapture}
                style={{ width: '60px', height: '60px', borderRadius: '50%', border: '4px solid white', background: 'transparent', cursor: 'pointer' }}
              />
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

        {/* ✅ CHAT BODY */}
        <div className="chat-body" ref={chatBodyRef}>
          {messages.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#94a3b8', textAlign: 'center' }}>
              <div style={{ fontSize: '3rem', marginBottom: '10px' }}>💬</div>
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
                        {msg.fileData.contentType.startsWith("image/") ? (
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
                              background: isMine ? 'rgba(255,255,255,0.1)' : '#f1f5f9',
                              borderRadius: "10px", textDecoration: "none", color: 'inherit', fontWeight: '500'
                            }}
                          >
                            <FileIcon width="16" height="16" />
                            <span style={{ fontSize: '0.85rem' }}>Download File</span>
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
            <div style={{
              marginBottom: '10px', padding: '8px 12px', background: '#eff6ff',
              borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              fontSize: '0.85rem', color: '#1e40af'
            }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><PaperclipIcon width="16" height="16" /> {selectedFile.name}</span>
              <button
                onClick={() => setSelectedFile(null)}
                style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontWeight: 'bold' }}
              >
                ✕
              </button>
            </div>
          )}

          <form onSubmit={handleSend}>
            <div className="chat-input-wrapper">
              {/* Icons container (Left) */}
              <button
                type="button"
                className="chat-icon-btn"
                onClick={() => fileInputRef.current.click()}
                title="Attach File"
              >
                <PaperclipIcon width="20" height="20" />
              </button>
              <input type="file" ref={fileInputRef} onChange={handleFileChange} style={{ display: "none" }} />

              <button
                type="button"
                className="chat-icon-btn"
                onClick={() => setShowCamera(true)}
                title="Camera"
              >
                <CameraIcon width="20" height="20" />
              </button>

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
                  Send
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