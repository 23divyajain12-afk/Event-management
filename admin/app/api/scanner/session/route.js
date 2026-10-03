import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import { authenticateScanner } from "@/lib/services/scannerService";

export async function GET(req) {
  try {
    await dbConnect();
    const device = await authenticateScanner(req);
    if (!device) {
      return NextResponse.json({ message: "Scanner authentication required." }, { status: 401 });
    }
    return NextResponse.json({
      device: { name: device.name, eventId: device.eventId, color: device.color },
    });
  } catch (error) {
    console.error("Scanner session validation error:", error);
    return NextResponse.json({ message: "Unable to validate scanner session." }, { status: 500 });
  }
}
