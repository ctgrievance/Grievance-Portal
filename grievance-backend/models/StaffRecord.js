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
}, { timestamps: true });

const StaffRecord = mongoose.model("StaffRecord", staffRecordSchema);
export default StaffRecord;
