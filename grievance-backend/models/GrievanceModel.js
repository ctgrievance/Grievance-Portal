import mongoose from "mongoose";


const grievanceSchema = new mongoose.Schema(
  {
    // ================= USER / SUBMITTER INFO =================
    userId: { type: String, required: true }, // Student or Staff ID
    userType: { type: String, enum: ["student", "staff"] },
    name: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String },
    regid: { type: String },

    // ================= STUDENT ACADEMIC =================
    studentProgram: {
      type: String,
      required: true // e.g. B.Tech CSE
    },
    rating: {
      stars: { type: Number, min: 1, max: 5 },
      feedback: { type: String },
      ratedAt: { type: Date },
    },
    isRated: {
      type: Boolean,
      default: false
    }
    ,

    // ================= GRIEVANCE ROUTING (CATEGORY + ISSUE TYPE) =================
    category: {
      type: String,
      required: true,
      trim: true
    },
    issueTypeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "IssueType",
      default: null
    },
    assignmentMode: {
      type: String,
      enum: ["manual", "single", "round_robin", "pool_accept"],
      default: "manual"
    },
    verificationAttempts: {
      type: Number,
      default: 0
    },
    autoClosed: {
      type: Boolean,
      default: false
    }
    ,

    // ================= CONTENT =================
    message: { type: String, default: "" },
    attachment: { type: String, default: "" },

    // ================= ASSIGNMENT FLOW =================
    assignedTo: { type: String, default: null },
    assignedRole: {
      type: String,
      enum: ["staff", "admin"],
      default: null
    },
    assignedBy: { type: String, default: null },

    // ================= RESOLUTION & REJECTION =================
    resolvedBy: { type: String, default: null },
    resolutionRemarks: { type: String, default: "" },
    rejectedBy: { type: String, default: null },
    rejectedByName: { type: String, default: "" },
    rejectionReason: { type: String, default: "" },
    rejectedAt: { type: Date, default: null },

    // ================= STATUS =================
    status: {
      type: String,
      enum: ["Pending", "Assigned", "In Progress", "Verification", "Resolved", "Rejected"],
      default: "Pending"
    },

    // ✅ Verification Logic
    resolutionProposedAt: { type: Date, default: null }, // Start of 36h timer

    // ✅ Deadline for assigned staff
    deadlineDate: { type: Date, default: null },

    // ================= EXTENSION REQUEST =================
    extensionRequest: {
      requestedDate: { type: Date, default: null },
      reason: { type: String, default: "" },
      status: {
        type: String,
        enum: ["None", "Pending", "Approved", "Rejected"],
        default: "None"
      }
    },

    // ================= VISIBILITY (SOFT DELETE) =================
    hiddenFor: {
      type: [String], // Array of User IDs who have "deleted" this grievance
      default: []
    },

    // ================= DEPARTMENT RE-ROUTING & TRANSFER =================
    isRerouted: {
      type: Boolean,
      default: false
    },
    transferHistory: [
      {
        fromDepartment: { type: String, required: true },
        toDepartment: { type: String, required: true },
        transferredBy: { type: String, required: true }, // Staff / Admin ID
        transferredByName: { type: String, default: "" },
        transferredByRole: { type: String, default: "staff" },
        reason: { type: String, required: true },
        transferredAt: { type: Date, default: Date.now },
        assignedToInNewDept: { type: String, default: null },
        assignedToNameInNewDept: { type: String, default: null }
      }
    ]
  },
  { timestamps: true }
);

// Index to speed lookups for staff-assigned grievances
grievanceSchema.index({ assignedTo: 1, createdAt: -1 });

const Grievance =
  mongoose.models.Grievance ||
  mongoose.model("Grievance", grievanceSchema);


export default Grievance;
