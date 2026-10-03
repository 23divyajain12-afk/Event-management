import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import Ticket from "@/lib/models/Ticket";
import ScannerDevice from "@/lib/models/ScannerDevice";
import { authenticateScanner } from "@/lib/services/scannerService";
import { ticketColor } from "@/lib/services/ticketService";

export async function POST(req) {
  await dbConnect();
  try {
    const device = await authenticateScanner(req);
    if (!device) return NextResponse.json({ message: "Scanner authentication required." }, { status: 401 });
    const { ticketIds } = await req.json();
    if (!Array.isArray(ticketIds) || ticketIds.length > 1000) {
      return NextResponse.json({ message: "Provide up to 1000 locally used ticket IDs." }, { status: 400 });
    }

    const results = [];
    for (const ticketId of [...new Set(ticketIds)]) {
      if (ticketColor(ticketId) !== device.color) {
        results.push({ ticketId, status: "wrong-color" });
        continue;
      }
      const changed = await Ticket.findOneAndUpdate(
        { eventId: device.eventId, ticketId, color: device.color, usedAt: null },
        { $set: { usedAt: new Date(), usedBy: String(device._id), syncedAt: new Date() } },
        { new: true }
      );
      if (changed) {
        results.push({ ticketId, status: "synced" });
        continue;
      }
      const alreadyUsed = await Ticket.findOne(
        { eventId: device.eventId, ticketId, color: device.color, usedAt: { $ne: null } },
        { usedBy: 1 }
      ).lean();
      const status = !alreadyUsed
        ? "unknown"
        : alreadyUsed.usedBy === String(device._id)
          ? "already-synced"
          : "already-used";
      results.push({ ticketId, status });
    }
    await ScannerDevice.updateOne({ _id: device._id }, { $set: { lastSyncAt: new Date() } });
    return NextResponse.json({ results });
  } catch (error) {
    console.error("Scanner used-ticket sync error:", error);
    return NextResponse.json({ message: "Unable to synchronize local scans." }, { status: 500 });
  }
}
