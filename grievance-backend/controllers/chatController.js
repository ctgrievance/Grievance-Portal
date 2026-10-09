import Message from "../models/MessageModel.js";
import Grievance from "../models/GrievanceModel.js";
import { sendChatMessageEmail } from "../utils/emailService.js";

// Send Message (Supports Text & File)
export const sendMessage = async (req, res) => {
  try {
    // fileData comes from frontend after uploading to /api/upload
    const { grievanceId, senderId, senderRole, sender, message, fileData, replyTo } = req.body;

    if (!grievanceId || !senderId || !senderRole) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    // Fetch grievance to validate status & participant permissions
    const grievance = await Grievance.findById(grievanceId);
    if (!grievance) {
      return res.status(404).json({ message: "Grievance not found" });
    }

    // 🔒 RESTRICTION: When grievance is Resolved or Rejected, student can only view and cannot chat
    const grievanceStatus = (grievance.status || "").toLowerCase();
    const isClosed = grievanceStatus === "resolved" || grievanceStatus === "rejected";

    if (isClosed && senderRole === "student") {
      return res.status(403).json({
        message: `This grievance has already been ${grievance.status.toLowerCase()}. Students can only view the conversation and cannot send new messages.`
      });
    }

    // Determine type
    const msgType = fileData ? "file" : "text";
    
    // Use message text if provided by user, otherwise keep empty
    const finalMessage = message || "";

    const newMessage = new Message({
      grievanceId,
      senderId,
      senderRole,
      sender,
      message: finalMessage,
      messageType: msgType,
      fileData: fileData || null,
      replyTo: replyTo || null
    });

    const savedMessage = await newMessage.save();

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