import crypto from "crypto";
import Event from "@/lib/models/Event";
import Ticket from "@/lib/models/Ticket";
import { setTimeout as sleep } from "node:timers/promises";

export function deriveTicketCore(prn, sauce = process.env.TICKET_SAUCE) {
  if (!sauce) throw new Error("TICKET_SAUCE is not configured.");
  const normalizedPrn = String(prn || "").trim().toUpperCase();
  if (!normalizedPrn) throw new Error("A PRN is required to issue a ticket.");
  return crypto.createHmac("sha256", sauce).update(normalizedPrn).digest("hex").slice(0, 12).toUpperCase();
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export async function issueTicket({ eventId, eventName, participant }) {
  const prn = String(participant.prn || "").trim();
  const normalizedPrn = prn.toUpperCase();
  if (!normalizedPrn) throw new Error("A PRN is required to issue a ticket.");
  const prnFilter = { $regex: `^${escapeRegex(prn)}$`, $options: "i" };
  const existing = await Ticket.findOne({ eventId, prn: prnFilter });
  if (existing) return existing;

  const lockId = crypto.randomUUID();
  const lockDeadline = Date.now() + 15_000;
  let event;
  while (!event && Date.now() < lockDeadline) {
    const now = new Date();
    event = await Event.findOneAndUpdate(
      {
        eventId,
        $or: [
          { "ticketSettings.generationLockUntil": null },
          { "ticketSettings.generationLockUntil": { $lte: now } },
        ],
      },
      {
        $set: {
          "ticketSettings.generationLockId": lockId,
          "ticketSettings.generationLockUntil": new Date(now.getTime() + 30_000),
        },
      },
      { new: true }
    );
    if (!event) await sleep(50);
  }
  if (!event) throw new Error("Ticket generation is busy for this event. Retry the operation.");
  try {
    const winner = await Ticket.findOne({ eventId, prn: prnFilter });
    if (winner) return winner;
    const lastTicket = await Ticket.findOne({ eventId }).sort({ generationOrder: -1 }).select("generationOrder").lean();
    const generationOrder = Math.max(
      Number(event.ticketSettings?.generationCount) || 0,
      (Number(lastTicket?.generationOrder) || 0) + (lastTicket ? 1 : 0)
    );
    const colorBit = generationOrder % 2 === 0 ? "0" : "1";
    const color = colorBit === "0" ? "red" : "blue";
    const ticketId = `${deriveTicketCore(normalizedPrn)}${colorBit}`;

    try {
      const ticket = await Ticket.create({
        eventId,
        prn: normalizedPrn,
        ticketId,
        color,
        generationOrder,
        email: participant.email,
        registeredEvent: eventName,
        ticketType: participant.ticketType || "EVENT",
        participant,
      });
      await Event.updateOne(
        { eventId, "ticketSettings.generationLockId": lockId },
        { $set: { "ticketSettings.generationCount": generationOrder + 1 } }
      );
      return ticket;
    } catch (error) {
      if (error.code === 11000) {
        const duplicate = await Ticket.findOne({ eventId, prn: prnFilter });
        if (duplicate) return duplicate;
      }
      throw error;
    }
  } finally {
    await Event.updateOne(
      { eventId, "ticketSettings.generationLockId": lockId },
      {
        $set: {
          "ticketSettings.generationLockId": "",
          "ticketSettings.generationLockUntil": null,
        },
      }
    );
  }
}

export function ticketColor(ticketId) {
  if (!/^[A-F0-9]{12}[01]$/i.test(String(ticketId || ""))) return null;
  return ticketId.slice(-1) === "0" ? "red" : "blue";
}
