import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import { authenticateScanner, verifyCrossColorTicket } from "@/lib/services/scannerService";

export async function POST(req) {
  await dbConnect();
  try {
    const device = await authenticateScanner(req);
    if (!device) return NextResponse.json({ message: "Scanner authentication required." }, { status: 401 });
    const { ticketId } = await req.json();
    const result = await verifyCrossColorTicket(device, ticketId);
    return NextResponse.json(result, { status: result.status });
  } catch (error) {
    console.error("Cross-color verification error:", error);
    return NextResponse.json({ message: "Cross-color verification unavailable. Refer to the help desk." }, { status: 500 });
  }
}
