import User from "@/lib/models/User";
import EventParticipant from "@/lib/models/EventParticipant";
import { getSpreadsheetRows } from "@/lib/services/googleApi";
import { mapParticipant } from "@/lib/services/templateEngine";

export async function loadEventParticipants(event) {
  const sourceType = event.participantSource?.type || "mongodb";
  let rows;

  if (sourceType === "googleSheets") {
    if (!event.participantSource.spreadsheetUrl) {
      throw new Error("Configure a Google Sheets URL for this event.");
    }
    rows = await getSpreadsheetRows(
      event.participantSource.spreadsheetUrl,
      event.participantSource.worksheet
    );
  } else if (sourceType === "excel") {
    rows = await EventParticipant.find({
      eventId: event.eventId,
      version: event.participantSource.excelVersion,
    }).sort({ index: 1 }).select("row").lean().then((items) => items.map((item) => item.row));
  } else {
    const users = await User.find({ registeredEvent: event.name }).lean();
    rows = users.map((user) => ({
      _id: String(user._id),
      id: user.id,
      name: user.name,
      email: user.email,
      prn: user.prn || "",
      ticketType: user.ticketType,
      registeredEvent: event.name,
    }));
  }

  const mappings = event.fieldMappings instanceof Map
    ? Object.fromEntries(event.fieldMappings.entries())
    : event.fieldMappings || {};
  return rows.map((row) => mapParticipant(row, mappings));
}
