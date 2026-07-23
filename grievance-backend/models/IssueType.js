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
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Ensure (department, issueName) is unique per department
issueTypeSchema.index({ department: 1, issueName: 1 }, { unique: true });

// Update timestamp on save
issueTypeSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

const IssueType = mongoose.model("IssueType", issueTypeSchema);
export default IssueType;
