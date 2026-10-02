import mongoose from "mongoose";

const EventParticipantSchema = new mongoose.Schema(
  {
    eventId: { type: String, required: true },
    version: { type: String, required: true },
    index: { type: Number, required: true },
    row: { type: mongoose.Schema.Types.Mixed, required: true },
  },
  { timestamps: true }
);

EventParticipantSchema.index({ eventId: 1, version: 1, index: 1 }, { unique: true });

export default mongoose.models.EventParticipant ||
  mongoose.model("EventParticipant", EventParticipantSchema);
