import mongoose from "mongoose";

// StudentRecord: University validation records for STUDENTS
// Used to verify if a student ID is valid before registration
const studentRecordSchema = new mongoose.Schema({
    id: {
        type: String,
        required: true,
        unique: true
    }, // e.g., STU123, 2024CSE001
    ctuId: {
        type: String,
        default: null
    }, // CTU ID - separate field, can be null
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
    program: {
        type: String,
        default: ""
    }, // e.g., B.Tech CSE, MBA
    studentType: {
        type: String,
        default: ""
    }, // e.g., Regular, Lateral
    school: {
        type: String,
        default: ""
    }, // e.g., SOCS, SOE
    batch: {
        type: String,
        default: ""
    }, // e.g., 2024, 2025
}, { timestamps: true });

const StudentRecord = mongoose.model("StudentRecord", studentRecordSchema);
export default StudentRecord;
