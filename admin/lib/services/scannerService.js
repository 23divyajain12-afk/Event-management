import crypto from "crypto";
import ScannerDevice from "@/lib/models/ScannerDevice";
import Ticket from "@/lib/models/Ticket";
import { ticketColor } from "@/lib/services/ticketService";

function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function createPairingCode() {
  return crypto.randomBytes(18).toString("base64url");
}

export async function authenticateScanner(req) {
  const authorization = req.headers.get("authorization") || "";
  const token = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
  if (!token) return null;
  const device = await ScannerDevice.findOne({ tokenHash: hashToken(token), active: true });
  return device;
}

export async function pairScanner(pairingCode) {
  if (!pairingCode) throw new Error("Pairing code is required.");
  const token = crypto.randomBytes(32).toString("base64url");
  const now = new Date();
  const device = await ScannerDevice.findOneAndUpdate(
    {
      pairingCodeHash: hashToken(pairingCode),
      active: true,
      pairingExpiresAt: { $gt: now },
    },
    {
      $set: {
        tokenHash: hashToken(token),
        pairingCodeHash: "",
        pairingExpiresAt: null,
        pairedAt: now,
      },
    },
    { new: true }
  );
  if (!device) throw new Error("Pairing code is invalid or expired.");
  return { token, device };
}

export async function verifyCrossColorTicket(device, ticketId) {
  if (!ticketColor(ticketId)) return { status: 400, message: "Invalid ticket code." };
  if (ticketColor(ticketId) === device.color) {
    return { status: 400, message: "Same-color tickets are verified locally by this scanner." };
  }
  const ticket = await Ticket.findOneAndUpdate(
    { eventId: device.eventId, ticketId, usedAt: null },
    { $set: { usedAt: new Date(), usedBy: String(device._id), syncedAt: new Date() } },
    { new: true }
  );
  if (ticket) return { status: 200, valid: true, message: "Cross-color ticket verified. Entry recorded." };
  const exists = await Ticket.exists({ eventId: device.eventId, ticketId });
  return {
    status: exists ? 409 : 404,
    message: exists ? "Ticket already used; refer to the help desk." : "Ticket not found for this event.",
  };
}
