import mongoose from "mongoose";

const AdminStaffSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    unique: true, // Staff ID (e.g., 25002)
  },
  fullName: {
    type: String,
    required: true,
  },
  adminDepartment: {
    type: String,
    default: "", // e.g., "Student Welfare"
  },
  isDeptAdmin: {
    type: Boolean,
    default: false, 
  }
}, { timestamps: true });

const AdminStaffModel = mongoose.models.AdminStaff || mongoose.model("AdminStaff", AdminStaffSchema);
export default AdminStaffModel;