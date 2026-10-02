import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import Event from "@/lib/models/Event";
import OperationJob from "@/lib/models/OperationJob";
import EventParticipant from "@/lib/models/EventParticipant";
import { requireAdmin } from "@/lib/auth";
import { mapParticipant } from "@/lib/services/templateEngine";
import crypto from "crypto";

export async function GET(req, { params }) {
  const { response } = requireAdmin(req);
  if (response) return response;
  await dbConnect();
  const { eventId } = await params;
  const event = await Event.findOne({ eventId: eventId.toLowerCase() });
  if (!event) return NextResponse.json({ message: "Event not found." }, { status: 404 });
  const result = event.toObject({ flattenMaps: true });
  return NextResponse.json({ event: result });
}

export async function POST(req, { params }) {
  const { response } = requireAdmin(req);
  if (response) return response;
  await dbConnect();
  const { eventId } = await params;
  const event = await Event.findOne({ eventId: eventId.toLowerCase() });
  if (!event) return NextResponse.json({ message: "Event not found." }, { status: 404 });

  try {
    const body = await req.json();
    if (body.action === "import-excel") {
      if (!Array.isArray(body.rows) || !body.rows.length || body.rows.length > 5000) {
        return NextResponse.json({ message: "Provide between 1 and 5000 participant rows." }, { status: 400 });
      }
      const mappings = event.fieldMappings instanceof Map
        ? Object.fromEntries(event.fieldMappings.entries())
        : event.fieldMappings || {};
      body.rows.forEach((row) => mapParticipant(row, mappings));
      const version = crypto.randomUUID();
      try {
        for (let offset = 0; offset < body.rows.length; offset += 500) {
          await EventParticipant.insertMany(
            body.rows.slice(offset, offset + 500).map((row, index) => ({
              eventId: event.eventId,
              version,
              index: offset + index,
              row,
            }))
          );
        }
      } catch (error) {
        await EventParticipant.deleteMany({ eventId: event.eventId, version });
        throw error;
      }
      const previousVersion = event.participantSource.excelVersion;
      event.participantSource.type = "excel";
      event.participantSource.excelVersion = version;
      await event.save();
      if (previousVersion) {
        await EventParticipant.deleteMany({ eventId: event.eventId, version: previousVersion });
      }
      return NextResponse.json({ imported: body.rows.length });
    }
    return NextResponse.json({ message: "Unsupported event action." }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ message: error.message || "Unable to process event data." }, { status: 400 });
  }
}

export async function DELETE(req, { params }) {
  const { response } = requireAdmin(req);
  if (response) return response;
  await dbConnect();
  const { eventId } = await params;
  const running = await OperationJob.exists({ eventId: eventId.toLowerCase(), status: { $in: ["PENDING", "RUNNING"] } });
  if (running) return NextResponse.json({ message: "Cannot delete an event with an active operation." }, { status: 409 });
  const deleted = await Event.findOneAndDelete({ eventId: eventId.toLowerCase() });
  if (!deleted) return NextResponse.json({ message: "Event not found." }, { status: 404 });
  return NextResponse.json({ message: "Event deleted." });
}
