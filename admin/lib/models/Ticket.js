import mongoose from "mongoose";

const TicketSchema = new mongoose.Schema(
  {
    eventId: { type: String, required: true, index: true },
    ticketId: { type: String, required: true },
    prn: { type: String, required: true },
    email: { type: String, required: true, lowercase: true },
    registeredEvent: { type: String, required: true },
    ticketType: { type: String, default: "EVENT" },
    participant: { type: mongoose.Schema.Types.Mixed, default: {} },
    color: { type: String, enum: ["red", "blue"], required: true },
    generationOrder: { type: Number, required: true },
    usedAt: { type: Date, default: null },
    usedBy: { type: String, default: "" },
    syncedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

TicketSchema.index({ eventId: 1, ticketId: 1 }, { unique: true });
TicketSchema.index({ eventId: 1, prn: 1 }, { unique: true });
TicketSchema.index({ eventId: 1, color: 1 });

export default mongoose.models.Ticket || mongoose.model("Ticket", TicketSchema);
