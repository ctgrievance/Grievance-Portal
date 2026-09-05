import mongoose from "mongoose";

const issueTypeSchema = new mongoose.Schema({
  department: {
    type: String,
    required: true,
    index: true
  },
  issueName: {
    type: String,
    required: true,
    index: true
  },
  description: {
    type: String,
    default: ""
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isSystemReserved: {
    type: Boolean,
    default: false
  },
  targetAudience: {
    type: String,
    enum: ["student", "staff"],
    default: "student",
    index: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Ensure (department, issueName, targetAudience) is unique per department and audience
issueTypeSchema.index({ department: 1, issueName: 1, targetAudience: 1 }, { unique: true });

// Update timestamp on save
issueTypeSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

const IssueType = mongoose.model("IssueType", issueTypeSchema);
export default IssueType;
