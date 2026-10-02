import mongoose from "mongoose";

const EventSchema = new mongoose.Schema(
  {
    eventId: { type: String, required: true, unique: true, trim: true, lowercase: true },
    name: { type: String, required: true, trim: true },
    participantSource: {
      type: {
        type: String,
        enum: ["mongodb", "excel", "googleSheets"],
        default: "mongodb",
      },
      spreadsheetUrl: { type: String, default: "" },
      worksheet: { type: String, default: "" },
      excelVersion: { type: String, default: "" },
    },
    fieldMappings: { type: Map, of: String, default: {} },
    ticketTemplates: {
      red: { type: String, default: "" },
      blue: { type: String, default: "" },
    },
    ticketTemplateUrl: { type: String, default: "" },
    certificateTemplateUrl: { type: String, default: "" },
    emailTemplate: {
      subject: { type: String, default: "" },
      html: { type: String, default: "" },
    },
    ticketSettings: {
      enabled: { type: Boolean, default: true },
      qrPlaceholder: { type: String, default: "{{ticket.qr}}" },
      generationCount: { type: Number, default: 0 },
      generationLockId: { type: String, default: "" },
      generationLockUntil: { type: Date, default: null },
    },
    emailSettings: {
      enabled: { type: Boolean, default: true },
      delayMs: { type: Number, default: 1000, min: 0 },
      dailyLimit: { type: Number, default: 1500, min: 1 },
    },
  },
  { timestamps: true }
);

export default mongoose.models.Event || mongoose.model("Event", EventSchema);
