import mongoose from "mongoose";

const JobRecipientSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, lowercase: true },
    participant: { type: mongoose.Schema.Types.Mixed, default: {} },
    ticketId: { type: String, default: "" },
    status: {
      type: String,
      enum: ["PENDING", "PROCESSING", "SENT", "FAILED"],
      default: "PENDING",
    },
    attempts: { type: Number, default: 0 },
    lastError: { type: String, default: "" },
    temporaryFileIds: { type: [String], default: [] },
    cleanupWarning: { type: String, default: "" },
    sentAt: { type: Date, default: null },
  },
  { _id: false }
);

const OperationJobSchema = new mongoose.Schema(
  {
    eventId: { type: String, required: true, index: true },
    type: { type: String, enum: ["ticket", "certificate", "email"], required: true },
    status: {
      type: String,
      enum: ["PENDING", "RUNNING", "COMPLETED", "PARTIAL", "FAILED"],
      default: "PENDING",
      index: true,
    },
    subject: { type: String, default: "" },
    html: { type: String, default: "" },
    otherAttachment: {
      filename: { type: String, default: "" },
      mimeType: { type: String, default: "" },
      content: { type: Buffer, default: null },
    },
    templateUrl: { type: String, default: "" },
    attachmentKind: { type: String, enum: ["", "ticket", "certificate"], default: "" },
    recipientCount: { type: Number, default: 0 },
    processedCount: { type: Number, default: 0 },
    successfulCount: { type: Number, default: 0 },
    failedCount: { type: Number, default: 0 },
    nextIndex: { type: Number, default: 0 },
    delayMs: { type: Number, default: 1000 },
    leaseId: { type: String, default: "" },
    leaseUntil: { type: Date, default: null },
    recipients: { type: [JobRecipientSchema], default: [] },
  },
  { timestamps: true }
);

export default mongoose.models.OperationJob ||
  mongoose.model("OperationJob", OperationJobSchema);
