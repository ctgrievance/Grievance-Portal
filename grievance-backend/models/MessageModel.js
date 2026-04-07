
import mongoose from "mongoose";

const messageSchema = new mongoose.Schema({
  grievanceId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "Grievance", 
    required: true 
  },
  senderId: { type: String, required: true }, // e.g., STU001 or STF001
  senderRole: { type: String, required: true }, // "student", "staff", "admin"
  sender: { type: String, default: "User" }, // Name to display
  
  // Message content
  message: { type: String, default: "" }, 
  
  // ✅ File Metadata
  messageType: { type: String, enum: ["text", "file"], default: "text" },
  fileData: {
    filename: String,     // GridFS filename
    originalName: String, // Original upload name
    contentType: String,  // Mime type
    fileId: mongoose.Schema.Types.ObjectId // GridFS ID
  },

  createdAt: { type: Date, default: Date.now },
});

const Message = mongoose.model("Message", messageSchema);
export default Message;