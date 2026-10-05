import mongoose from 'mongoose';

const auditLogSchema = new mongoose.Schema({
  action: {
    type: String,
    required: true,
    enum: ["ADD", "UPDATE", "DELETE", "UPLOAD", "CLEAR_ALL"]
  },
  collectionName: {
    type: String,
    required: true,
    enum: ["StudentRecord", "StaffRecord", "StudentUser", "StaffUser"]
  },
  performedBy: {
    id: { type: String, required: true },
    fullName: { type: String, required: true },
    role: { type: String, required: true }
  },
  details: {
    type: Object, // Could store "affectedRows", "recordId", "mode", etc.
    default: {}
  }
}, { timestamps: true });

const AuditLog = mongoose.model('AuditLog', auditLogSchema);
export default AuditLog;
