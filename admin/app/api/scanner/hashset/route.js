import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import Ticket from "@/lib/models/Ticket";
import { authenticateScanner } from "@/lib/services/scannerService";

export async function GET(req) {
  await dbConnect();
  try {
    const device = await authenticateScanner(req);
    if (!device) return NextResponse.json({ message: "Scanner authentication required." }, { status: 401 });
    const tickets = await Ticket.find({ eventId: device.eventId, color: device.color }, { ticketId: 1, usedAt: 1 })
      .lean();
    return NextResponse.json({
      eventId: device.eventId,
      color: device.color,
      ids: tickets.filter((ticket) => !ticket.usedAt).map((ticket) => ticket.ticketId),
      downloadedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Scanner hashset error:", error);
    return NextResponse.json({ message: "Unable to download scanner ticket list." }, { status: 500 });
  }
}
