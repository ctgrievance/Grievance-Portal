
import mongoose from "mongoose";
import crypto from "crypto";

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || "ct_university_secure_key_1234567";
const IV_LENGTH = 16;

// Key MUST be exactly 32 bytes for aes-256-cbc.
function getDerivedKey() {
  return crypto.createHash('sha256').update(String(ENCRYPTION_KEY)).digest('base64').substr(0, 32);
}

function encryptMessage(text) {
  if (!text) return text;
  if (text.startsWith("enc:")) return text; // Already encrypted

  try {
    const key = getDerivedKey();
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(key), iv);
    let encrypted = cipher.update(text);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    return "enc:" + iv.toString('hex') + ':' + encrypted.toString('hex');
  } catch (error) {
    console.error("Encryption error:", error);
    return text; // Fallback to plaintext if encryption fails to prevent crash
  }
}

function decryptMessage(text) {
  if (!text) return text;
  if (!text.startsWith("enc:")) return text; // Return plaintext directly (backward compatibility)

  try {
    const textParts = text.replace("enc:", "").split(':');
    const iv = Buffer.from(textParts.shift(), 'hex');
    const encryptedText = Buffer.from(textParts.join(':'), 'hex');
    const key = getDerivedKey();
    const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(key), iv);
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
  } catch (error) {
    console.error("Decryption failed:", error.message);
    return text; // Fallback to raw string if it crashes
  }
}

const messageSchema = new mongoose.Schema({
  grievanceId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "Grievance", 
    required: true 
  },
  senderId: { type: String, required: true }, // e.g., STU001 or STF001
  senderRole: { type: String, required: true }, // "student", "staff", "admin"
  sender: { type: String, default: "User" }, // Name to display
  
  // Message content (ENCRYPTED AT REST)
  message: { 
    type: String, 
    default: "",
    get: decryptMessage,
    set: encryptMessage
  },   
  // ✅ File Metadata
  messageType: { type: String, enum: ["text", "file"], default: "text" },
  fileData: {
    filename: String,     // GridFS filename
    originalName: String, // Original upload name
    contentType: String,  // Mime type
    fileId: mongoose.Schema.Types.ObjectId // GridFS ID
  },

  createdAt: { type: Date, default: Date.now },
}, {
  toJSON: { getters: true }, // Ensure decrypted value is sent in JSON responses
  toObject: { getters: true }
});

const Message = mongoose.model("Message", messageSchema);
export default Message;