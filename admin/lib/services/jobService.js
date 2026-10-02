import crypto from "crypto";
import Event from "@/lib/models/Event";
import OperationJob from "@/lib/models/OperationJob";
import Ticket from "@/lib/models/Ticket";
import {
  createPersonalizedPdf,
  validateSlidesTemplate,
} from "@/lib/services/slidesTemplateService";
import { loadEventParticipants } from "@/lib/services/participantSourceService";
import { issueTicket, ticketColor } from "@/lib/services/ticketService";
import { renderHtmlTemplate, sendPersonalizedEmail } from "@/lib/services/emailService";
import { deleteDriveFile } from "@/lib/services/googleApi";
import {
  getTemplateTokens,
  renderTemplate,
  validateTemplateValues,
} from "@/lib/services/templateEngine";

function getParticipantPaths(value, prefix = "participant") {
  if (!value || typeof value !== "object" || Array.isArray(value)) return [prefix];
  return Object.entries(value).flatMap(([key, item]) => getParticipantPaths(item, `${prefix}.${key}`));
}

function getEmailContext(participant, event, ticketId = "") {
  return {
    participant,
    event: { name: event.name },
    ticket: { id: ticketId },
  };
}

export async function createOperationJob({
  eventId,
  type,
  subject,
  html,
  attachmentKind = "",
  otherAttachment = null,
}) {
  if (!["ticket", "certificate", "email"].includes(type)) throw new Error("Unsupported operation type.");
  const event = await Event.findOne({ eventId: String(eventId).toLowerCase() });
  if (!event) throw new Error("Event not found.");
  if ((type === "ticket" || type === "certificate") && !event.emailSettings?.enabled) {
    throw new Error("Email sending is disabled for this event.");
  }
  if (type === "ticket" && !event.ticketSettings?.enabled) {
    throw new Error("Ticket issuance is disabled for this event.");
  }
  if (type === "email" && !event.emailSettings?.enabled) {
    throw new Error("Email sending is disabled for this event.");
  }
  if (type === "email" && attachmentKind === "ticket" && !event.ticketSettings?.enabled) {
    throw new Error("Ticket issuance is disabled for this event.");
  }

  const participants = await loadEventParticipants(event);
  const unique = new Map();
  for (const participant of participants) {
    if (!participant.email) throw new Error("Every participant must have a mapped email address.");
    if (!unique.has(participant.email)) unique.set(participant.email, participant);
  }
  const recipients = [...unique.values()];
  if (!recipients.length) throw new Error("The selected source contains no participants.");
  if (attachmentKind && !["ticket", "certificate"].includes(attachmentKind)) {
    throw new Error("Choose a supported PDF attachment type.");
  }

  const emailSubject = String(subject ?? event.emailTemplate?.subject ?? "").trim();
  const emailHtml = String(html ?? event.emailTemplate?.html ?? "");
  if (!emailSubject || !emailHtml) throw new Error("Email subject and HTML body are required.");

  if (type === "ticket" && !process.env.TICKET_SAUCE) {
    throw new Error("TICKET_SAUCE is not configured on the server.");
  }

  const willHaveTicket = type === "ticket" || (type === "email" && attachmentKind === "ticket");
  if (willHaveTicket) {
    const seenPrns = new Set();
    for (const participant of recipients) {
      const normalizedPrn = String(participant.prn || "").trim().toUpperCase();
      if (!normalizedPrn) throw new Error(`Mapped PRN is required for ticket recipient ${participant.email}.`);
      if (seenPrns.has(normalizedPrn)) throw new Error(`PRN ${participant.prn} is assigned to more than one participant.`);
      seenPrns.add(normalizedPrn);
    }
  }

  const sample = recipients[0];
  const validationTicketId = willHaveTicket ? "VALIDATION-TICKET-ID" : "";
  const sampleContext = getEmailContext(sample, event, validationTicketId);
  const emailPaths = new Set(getParticipantPaths(sample));
  const validEmailTokens = new Set([...emailPaths, "event.name", ...(willHaveTicket ? ["ticket.id"] : [])]);
  const usedEmailTokens = getTemplateTokens(`${emailSubject}\n${emailHtml}`);
  const invalidEmailTokens = usedEmailTokens.filter((token) => !validEmailTokens.has(token));
  if (invalidEmailTokens.length) {
    throw new Error(`Email template contains unavailable placeholders: ${[...new Set(invalidEmailTokens)].join(", ")}`);
  }
  validateTemplateValues(`${emailSubject}\n${emailHtml}`, sampleContext, ["participant.name", "event.name"]);
  for (const participant of recipients) {
    const context = getEmailContext(participant, event, validationTicketId);
    renderTemplate(emailSubject, context, { strict: true });
    renderTemplate(emailHtml, context, { strict: true });
  }

  let templateUrl = "";
  let slidesTokenSets = [];
  const ticketTemplateUrls = {
    red: event.ticketTemplates?.red || event.ticketTemplateUrl || "",
    blue: event.ticketTemplates?.blue || event.ticketTemplateUrl || "",
  };
  if (type === "ticket" || (type === "email" && attachmentKind === "ticket")) {
    const context = { ...sampleContext, ticket: { id: validationTicketId, qr: "" } };
    for (const color of ["red", "blue"]) {
      const validation = await validateSlidesTemplate(ticketTemplateUrls[color], context, [
        "participant.name",
        "event.name",
        "ticket.id",
        "ticket.qr",
      ], event.ticketSettings?.qrPlaceholder || "{{ticket.qr}}");
      slidesTokenSets.push(validation.tokens);
    }
  } else if (type === "certificate" || (type === "email" && attachmentKind === "certificate")) {
    templateUrl = event.certificateTemplateUrl;
    const validation = await validateSlidesTemplate(templateUrl, sampleContext, ["participant.name", "event.name"]);
    slidesTokenSets.push(validation.tokens);
  }
  for (const participant of recipients) {
    const context = getEmailContext(participant, event, validationTicketId);
    for (const tokens of slidesTokenSets) renderTemplate(tokens.map((token) => `{{${token}}}`).join(" "), {
      ...context,
      ticket: { ...context.ticket, qr: "" },
    }, { strict: true });
  }

  const job = await OperationJob.create({
    eventId: event.eventId,
    type,
    subject: emailSubject,
    html: emailHtml,
    otherAttachment: otherAttachment || undefined,
    templateUrl,
    attachmentKind,
    recipientCount: recipients.length,
    delayMs: Number(event.emailSettings?.delayMs ?? 1000),
    recipients: recipients.map((participant) => ({
      email: participant.email,
      participant,
      status: "PENDING",
    })),
  });
  return job;
}

export async function getJobSummary(jobId) {
  return OperationJob.findById(jobId)
    .select("-recipients.participant -recipients.temporaryFileIds -otherAttachment.content")
    .lean();
}

export async function runJobItem(jobId) {
  const leaseId = crypto.randomUUID();
  const now = new Date();
  const job = await OperationJob.findOneAndUpdate(
    {
      _id: jobId,
      $expr: { $lt: ["$nextIndex", "$recipientCount"] },
      $or: [{ leaseUntil: null }, { leaseUntil: { $lte: now } }],
    },
    { $set: { leaseId, leaseUntil: new Date(now.getTime() + 120_000), status: "RUNNING" } },
    { new: true }
  );

  if (!job) {
    const current = await OperationJob.findById(jobId);
    if (!current) throw new Error("Job not found.");
    if (current.processedCount >= current.recipientCount) return current;
    if (current.leaseUntil && current.leaseUntil > now) return current;
    throw new Error("Could not acquire the job processing lease.");
  }

  while (job.nextIndex < job.recipientCount && job.recipients[job.nextIndex]?.status === "SENT") {
    job.nextIndex += 1;
  }
  const index = job.nextIndex;
  const recipient = job.recipients[index];
  if (!recipient) {
    job.leaseId = "";
    job.leaseUntil = null;
    job.status = job.failedCount ? (job.successfulCount ? "PARTIAL" : "FAILED") : "COMPLETED";
    await job.save();
    return job;
  }
  let cleanupWarning = "";
  try {
    for (const fileId of [...recipient.temporaryFileIds]) {
      await deleteDriveFile(fileId);
      recipient.temporaryFileIds = recipient.temporaryFileIds.filter((value) => value !== fileId);
    }
    const event = await Event.findOne({ eventId: job.eventId });
    if (!event) throw new Error("Event no longer exists.");
    const ticketTemplateUrls = {
      red: event.ticketTemplates?.red || event.ticketTemplateUrl || "",
      blue: event.ticketTemplates?.blue || event.ticketTemplateUrl || "",
    };
    if ((job.type === "ticket" || (job.type === "email" && job.attachmentKind === "ticket")) && !recipient.ticketId) {
      const ticket = await issueTicket({
        eventId: event.eventId,
        eventName: event.name,
        participant: recipient.participant,
      });
      recipient.ticketId = ticket.ticketId;
      recipient.ticketColor = ticket.color;
    }
    if (job.type === "ticket" || (job.type === "email" && job.attachmentKind === "ticket")) {
      recipient.ticketColor ||= ticketColor(recipient.ticketId) || "";
      recipient.templateUrl ||= job.templateUrl || ticketTemplateUrls[recipient.ticketColor];
      if (!recipient.templateUrl) {
        throw new Error(`No ${recipient.ticketColor || "matching"} ticket template is stored for this recipient.`);
      }
      await OperationJob.updateOne(
        { _id: job._id, leaseId, [`recipients.${index}.status`]: { $in: ["PENDING", "PROCESSING"] } },
        {
          $set: {
            [`recipients.${index}.ticketId`]: recipient.ticketId,
            [`recipients.${index}.ticketColor`]: recipient.ticketColor,
            [`recipients.${index}.templateUrl`]: recipient.templateUrl,
          },
        }
      );
    }
    const context = getEmailContext(recipient.participant, event, recipient.ticketId);
    const attachments = [];
    if (job.otherAttachment?.content) {
      attachments.push({
        filename: job.otherAttachment.filename || "attachment",
        content: job.otherAttachment.content,
        contentType: job.otherAttachment.mimeType || "application/octet-stream",
      });
    }

    if (job.type === "ticket" || (job.type === "email" && job.attachmentKind === "ticket")) {
      const generated = await createPersonalizedPdf({
        templateUrl: recipient.templateUrl,
        context: { ...context, ticket: { id: recipient.ticketId, qr: "" } },
        qrPlaceholder: event.ticketSettings?.qrPlaceholder || "{{ticket.qr}}",
        onTemporaryFile: async (fileId, removed = false) => {
          const filter = { _id: job._id, leaseId, [`recipients.${index}.status`]: { $in: ["PENDING", "PROCESSING"] } };
          if (removed) {
            await OperationJob.updateOne(filter, { $pull: { [`recipients.${index}.temporaryFileIds`]: fileId } });
          } else {
            await OperationJob.updateOne(filter, { $addToSet: { [`recipients.${index}.temporaryFileIds`]: fileId } });
          }
        },
      });
      cleanupWarning = generated.cleanupWarnings.join("; ");
      attachments.push({ filename: "ticket.pdf", content: generated.pdf, contentType: "application/pdf" });
    } else if (job.type === "certificate" || (job.type === "email" && job.attachmentKind === "certificate")) {
      const generated = await createPersonalizedPdf({
        templateUrl: job.templateUrl,
        context,
        onTemporaryFile: async (fileId, removed = false) => {
          const filter = { _id: job._id, leaseId, [`recipients.${index}.status`]: { $in: ["PENDING", "PROCESSING"] } };
          if (removed) {
            await OperationJob.updateOne(filter, { $pull: { [`recipients.${index}.temporaryFileIds`]: fileId } });
          } else {
            await OperationJob.updateOne(filter, { $addToSet: { [`recipients.${index}.temporaryFileIds`]: fileId } });
          }
        },
      });
      cleanupWarning = generated.cleanupWarnings.join("; ");
      attachments.push({ filename: "certificate.pdf", content: generated.pdf, contentType: "application/pdf" });
    }

    await sendPersonalizedEmail({
      to: recipient.email,
      subject: job.subject,
      html: job.html,
      context,
      attachments,
      dailyLimit: event.emailSettings?.dailyLimit,
      delayMs: job.delayMs,
    });

    recipient.status = "SENT";
    recipient.sentAt = new Date();
    recipient.lastError = "";
    recipient.cleanupWarning = cleanupWarning;
    job.successfulCount += 1;
  } catch (error) {
    recipient.status = "FAILED";
    recipient.lastError = error.message;
    job.failedCount += 1;
  }

  recipient.attempts += 1;
  job.processedCount += 1;
  job.nextIndex = index + 1;
  job.leaseId = "";
  job.leaseUntil = null;
  job.status = job.nextIndex >= job.recipientCount
    ? job.failedCount ? (job.successfulCount ? "PARTIAL" : "FAILED") : "COMPLETED"
    : "RUNNING";
  await job.save();
  return job;
}

export async function retryFailedRecipients(jobId) {
  const job = await OperationJob.findById(jobId);
  if (!job) throw new Error("Job not found.");
  let count = 0;
  for (const recipient of job.recipients) {
    if (recipient.status === "FAILED") {
      recipient.status = "PENDING";
      recipient.lastError = "";
      count++;
    }
  }
  if (!count) throw new Error("This job has no failed recipients to retry.");
  job.failedCount = 0;
  job.processedCount = job.successfulCount;
  job.nextIndex = job.recipients.findIndex((recipient) => recipient.status !== "SENT");
  job.status = "PENDING";
  await job.save();
  return job;
}

export async function testEventEmail({ eventId, to, subject, html }) {
  const event = await Event.findOne({ eventId: String(eventId).toLowerCase() });
  if (!event) throw new Error("Event not found.");
  const [participant] = await loadEventParticipants(event);
  if (!participant) throw new Error("The configured participant source contains no rows.");
  const ticket = participant.prn ? await Ticket.findOne({ eventId: event.eventId, prn: participant.prn }) : null;
  const context = getEmailContext(participant, event, ticket?.ticketId || "");
  validateTemplateValues(`${subject}\n${html}`, context, ["participant.name", "event.name"]);
  await sendPersonalizedEmail({
    to,
    subject,
    html,
    context,
    dailyLimit: event.emailSettings?.dailyLimit,
    delayMs: event.emailSettings?.delayMs,
  });
}

export async function previewEventEmail({ eventId, subject, html }) {
  const event = await Event.findOne({ eventId: String(eventId).toLowerCase() });
  if (!event) throw new Error("Event not found.");
  const [participant] = await loadEventParticipants(event);
  if (!participant) throw new Error("The configured participant source contains no rows.");
  const ticket = participant.prn ? await Ticket.findOne({ eventId: event.eventId, prn: participant.prn }) : null;
  const context = getEmailContext(participant, event, ticket?.ticketId || "SAMPLE-TICKET-ID");
  validateTemplateValues(`${subject}\n${html}`, context, ["participant.name", "event.name"]);
  return {
    subject: renderTemplate(subject, context),
    html: renderHtmlTemplate(html, context),
  };
}
