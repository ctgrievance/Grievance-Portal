import Message from "../models/MessageModel.js";
import Grievance from "../models/GrievanceModel.js";
import { sendChatMessageEmail } from "../utils/emailService.js";

// Send Message (Supports Text & File)
export const sendMessage = async (req, res) => {
  try {
    // fileData comes from frontend after uploading to /api/upload
    const { grievanceId, senderId, senderRole, sender, message, fileData } = req.body;

    if (!grievanceId || !senderId || !senderRole) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    // Determine type
    const msgType = fileData ? "file" : "text";
    
    // Auto-text if message is empty but file exists
    const finalMessage = message || (fileData ? `Sent an attachment: ${fileData.originalName}` : "");

    const newMessage = new Message({
      grievanceId,
      senderId,
      senderRole,
      sender,
      message: finalMessage,
      messageType: msgType,
      fileData: fileData || null
    });

    const savedMessage = await newMessage.save();

    // Fetch grievance to notify student & assigned staff
    let grievance = null;
    try {
      grievance = await Grievance.findById(grievanceId);
    } catch (gErr) {
      console.error("Error finding grievance for notifications:", gErr);
    }

    // 🚀 1. Emit real-time message and socket notifications
    const io = req.app.get("io");
    if (io) {
      // Send directly to active chat room for instant delivery
      io.to(`grievance:${grievanceId}`).emit("receive_message", savedMessage);

      if (grievance) {
        const notificationPayload = {
          _id: savedMessage._id,
          grievanceId,
          senderId,
          senderRole,
          sender: sender || (senderRole === "student" ? "Student" : "Staff"),
          message: finalMessage,
          messageType: msgType,
          createdAt: savedMessage.createdAt,
          studentId: grievance.userId,
          assignedTo: grievance.assignedTo,
          category: grievance.category || "General",
        };

        // Direct to student's room if sender is staff/admin
        if (grievance.userId && senderId !== grievance.userId) {
          io.to(`user:${grievance.userId.toUpperCase()}`).emit("chat_notification", notificationPayload);
        }

        // Direct to staff's room if sender is student
        if (grievance.assignedTo && senderId !== grievance.assignedTo) {
          io.to(`user:${grievance.assignedTo.toUpperCase()}`).emit("chat_notification", notificationPayload);
        }

        // Global broadcast for dashboards to update unread badge in real time
        io.emit("global_chat_notification", notificationPayload);
      }
    }

    // 📧 2. Send LinkedIn-style email notification asynchronously (non-blocking)
    if (grievance) {
      sendChatMessageEmail({
        grievance,
        senderId,
        senderRole,
        senderName: sender,
        messageText: finalMessage,
        hasAttachment: !!fileData,
        attachmentName: fileData?.originalName || "",
      }).catch((emailErr) => {
        console.error("⚠️ Background chat email notification error:", emailErr);
      });
    }

    res.status(201).json(savedMessage);
  } catch (error) {
    console.error("Error sending message:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Get Messages
export const getMessages = async (req, res) => {
  try {
    const { grievanceId } = req.params;
    const messages = await Message.find({ grievanceId }).sort({ createdAt: 1 });
    res.status(200).json(messages);
  } catch (error) {
    console.error("Error fetching messages:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};