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
    studentRecordsMode: {
      type: String,
      enum: ["read", "write"],
      default: "write"
    },
    allowStaffRecords: {
      type: Boolean,
      default: false
    },
    staffRecordsMode: {
      type: String,
      enum: ["read", "write"],
      default: "write"
    },
    allowRegisteredStudents: {
      type: Boolean,
      default: false
    },
    registeredStudentsMode: {
      type: String,
      enum: ["read", "write"],
      default: "write"
    },
    allowRegisteredStaff: {
      type: Boolean,
      default: false
    },
    registeredStaffMode: {
      type: String,
      enum: ["read", "write"],
      default: "write"
    },
    programs: {
      type: [String],
      default: []
    },
    lastRoutingReminderAt: {
      type: Date,
      default: null
    },
    lastRoutingReminderTo: {
      type: String,
      default: ""
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
