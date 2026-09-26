import mongoose from "mongoose";

const BulkRecipientSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    mobileNo: { type: String, trim: true, default: "" },
    status: {
      type: String,
      enum: ["PENDING", "SENDING", "SENT", "FAILED"],
      default: "PENDING",
    },
    attempts: { type: Number, default: 0 },
    sentAt: { type: Date, default: null },
    failedAt: { type: Date, default: null },
    lastError: { type: String, default: "" },
  },
  { timestamps: true }
);

const BulkCampaignSchema = new mongoose.Schema(
  {
    campaignName: { type: String, required: true, trim: true, index: true },
    subject: { type: String, required: true, trim: true },
    body: { type: String, required: true },
    adminEmail: { type: String, required: true, trim: true, lowercase: true },
    status: {
      type: String,
      enum: ["PENDING", "SENDING", "SENT", "FAILED"],
      default: "PENDING",
    },
    totalRecipients: { type: Number, default: 0 },
    pendingCount: { type: Number, default: 0 },
    sentCount: { type: Number, default: 0 },
    failedCount: { type: Number, default: 0 },
    recipients: [BulkRecipientSchema],
  },
  { timestamps: true }
);

BulkCampaignSchema.pre("save", function (next) {
  this.pendingCount = this.recipients.filter((recipient) => recipient.status === "PENDING").length;
  this.sentCount = this.recipients.filter((recipient) => recipient.status === "SENT").length;
  this.failedCount = this.recipients.filter((recipient) => recipient.status === "FAILED").length;
  this.totalRecipients = this.recipients.length;

  if (this.status !== "SENDING" && this.pendingCount === 0 && this.failedCount === 0 && this.totalRecipients > 0) {
    this.status = "SENT";
  }

  if (this.status !== "SENDING" && this.pendingCount === 0 && this.failedCount > 0) {
    this.status = "FAILED";
  }

  next();
});

export default mongoose.models.BulkCampaign || mongoose.model("BulkCampaign", BulkCampaignSchema);
