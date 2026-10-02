import mongoose from "mongoose";

const EmailUsageSchema = new mongoose.Schema({
  dateKey: { type: String, required: true, unique: true },
  reserved: { type: Number, default: 0 },
});

export default mongoose.models.EmailUsage || mongoose.model("EmailUsage", EmailUsageSchema);
