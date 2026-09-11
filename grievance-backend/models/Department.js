import mongoose from "mongoose";

const departmentSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Department name is required"],
      unique: true,
      trim: true,
      index: true
    },
    code: {
      type: String,
      trim: true,
      uppercase: true,
      default: ""
    },
    description: {
      type: String,
      trim: true,
      default: ""
    },
    targetAudience: {
      type: String,
      enum: ["student", "staff", "both"],
      default: "both"
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true
    },
    isAcademic: {
      type: Boolean,
      default: false
    },
    allowStudentRecords: {
      type: Boolean,
      default: false
    },
    allowStaffRecords: {
      type: Boolean,
      default: false
    },
    allowRegisteredStudents: {
      type: Boolean,
      default: false
    },
    allowRegisteredStaff: {
      type: Boolean,
      default: false
    }
  },
  { timestamps: true }
);

// Auto-generate code from name if not provided
departmentSchema.pre("save", function (next) {
  if (!this.code && this.name) {
    this.code = this.name
      .replace(/[^a-zA-Z0-9\s]/g, "")
      .split(/\s+/)
      .map(w => w[0])
      .join("")
      .toUpperCase();
  }
  next();
});

const Department = mongoose.models.Department || mongoose.model("Department", departmentSchema);
export default Department;
