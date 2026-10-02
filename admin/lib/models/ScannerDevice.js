import mongoose from "mongoose";

const ScannerDeviceSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    eventId: { type: String, required: true, index: true },
    color: { type: String, enum: ["red", "blue"], required: true },
    pairingCodeHash: { type: String, default: "" },
    pairingExpiresAt: { type: Date, default: null },
    tokenHash: { type: String, default: "" },
    active: { type: Boolean, default: true },
    pairedAt: { type: Date, default: null },
    lastSyncAt: { type: Date, default: null },
  },
  { timestamps: true }
);

export default mongoose.models.ScannerDevice ||
  mongoose.model("ScannerDevice", ScannerDeviceSchema);
