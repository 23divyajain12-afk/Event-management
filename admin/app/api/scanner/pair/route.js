import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import { pairScanner } from "@/lib/services/scannerService";

export async function POST(req) {
  await dbConnect();
  try {
    const { pairingCode } = await req.json();
    const { token, device } = await pairScanner(pairingCode);
    return NextResponse.json({
      token,
      device: { name: device.name, eventId: device.eventId, color: device.color },
    });
  } catch (error) {
    return NextResponse.json({ message: error.message || "Scanner pairing failed." }, { status: 401 });
  }
}
