import mongoose from "mongoose";

// StaffRecord: University validation records for STAFF and ADMIN
// Used to verify if a staff/admin ID is valid before registration
const staffRecordSchema = new mongoose.Schema({
    id: {
        type: String,
        required: true,
        unique: true
    }, // e.g., STF001, 10001
    fullName: {
        type: String,
        default: ""
    },
    email: {
        type: String,
        default: ""
    },
    phone: {
        type: String,
        default: ""
    },
    role: {
        type: String,
        enum: ["staff", "admin"],
        required: true
    },
    department: {
        type: String,
        default: ""
    }, // e.g., Student Welfare, HR
    staffType: {
        type: String,
        enum: ["Teaching", "Non-Teaching"],
        default: "Non-Teaching"
    }, // e.g., Teaching (Faculty) vs Non-Teaching (Admin/Office)
    isRegistered: {
        type: Boolean,
        default: false,
        index: true
    },
    registeredUserId: {
        type: String,
        default: null
    },
    registeredAt: {
        type: Date,
        default: null
    },
    registeredEmail: {
        type: String,
        default: null
    },
    registeredPhone: {
        type: String,
        default: null
    },
    registeredRole: {
        type: String,
        default: null
    }
}, { timestamps: true });

staffRecordSchema.index({ email: 1 });
staffRecordSchema.index({ department: 1 });
staffRecordSchema.index({ staffType: 1 });
staffRecordSchema.index({ isRegistered: 1, department: 1 });
staffRecordSchema.index({ isRegistered: 1, staffType: 1 });
staffRecordSchema.index({ isRegistered: 1, createdAt: -1 });
staffRecordSchema.index({ department: 1, staffType: 1 });

const StaffRecord = mongoose.model("StaffRecord", staffRecordSchema);
export default StaffRecord;
