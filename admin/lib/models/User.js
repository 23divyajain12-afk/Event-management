import mongoose from "mongoose";

const UserSchema = new mongoose.Schema(
  {
    id: { type: String, required: false },
    name: { type: String, required: true },
    prn: { type: String, required: false },
    email: { type: String, required: true, unique: true },
    ticketType: { type: String, default: "General" },
    registeredEvent: [{ type: String }],
  },
  { timestamps: true }
);

UserSchema.index({ registeredEvent: 1 });

export default mongoose.models.User || mongoose.model("User", UserSchema);
