import crypto from "crypto";
import QRCode from "qrcode";
import {
  copySlidesTemplate,
  deleteDriveFile,
  exportSlidesPdf,
  getSlidesPresentation,
  updateSlides,
  uploadTemporaryImage,
  extractGoogleId,
} from "@/lib/services/googleApi";
import { getTemplateTokens, renderTemplate } from "@/lib/services/templateEngine";

function getQrPlaceholder(presentation, placeholder) {
  const found = [];
  for (const slide of presentation.slides || []) {
    for (const element of slide.pageElements || []) {
      const text = element.shape?.text?.textElements
        ?.map((item) => item.textRun?.content || "")
        .join("");
      if (text?.includes(placeholder)) found.push({ slide, element, text });
    }
  }
  if (found.length !== 1) {
    throw new Error(`Google Slides template must contain exactly one ${placeholder} text box.`);
  }
  return found[0];
}

export async function validateSlidesTemplate(templateUrl, context, requiredTokens, qrPlaceholder = "") {
  if (!templateUrl) throw new Error("Configure a Google Slides template URL.");
  const presentation = await getSlidesPresentation(
    extractGoogleId(templateUrl, "presentation")
  );
  const allText = (presentation.slides || [])
    .flatMap((slide) => (slide.pageElements || []).map((element) =>
      element.shape?.text?.textElements?.map((item) => item.textRun?.content || "").join("") || ""
    ))
    .join("\n");
  const tokens = getTemplateTokens(allText);
  const missing = requiredTokens.filter((token) => !tokens.includes(token));
  if (missing.length) throw new Error(`Google Slides template is missing required placeholders: ${missing.join(", ")}`);
  if (qrPlaceholder) getQrPlaceholder(presentation, qrPlaceholder);
  if (!qrPlaceholder && (tokens.includes("ticket.id") || tokens.includes("ticket.qr"))) {
    throw new Error("Certificate templates must not contain ticket ID or QR placeholders.");
  }
  const collectParticipantPaths = (value, prefix = "participant") => {
    if (!value || typeof value !== "object" || Array.isArray(value)) return [prefix];
    return Object.entries(value).flatMap(([key, child]) => collectParticipantPaths(child, `${prefix}.${key}`));
  };
  const knownPaths = new Set([
    ...collectParticipantPaths(context.participant || {}),
    "event.name",
    "ticket.id",
    "ticket.qr",
  ]);
  const unknown = tokens.filter((token) => !knownPaths.has(token));
  if (unknown.length) throw new Error(`Google Slides template contains unmapped placeholders: ${[...new Set(unknown)].join(", ")}`);
  renderTemplate(tokens.map((token) => `{{${token}}}`).join(" "), context, { strict: true });
  return { presentationId: presentation.presentationId, tokens, presentation };
}

export async function createPersonalizedPdf({
  templateUrl,
  context,
  qrPlaceholder = "",
  onTemporaryFile = async () => {},
}) {
  let temporaryPresentationId = "";
  let qrFileId = "";
  const cleanupWarnings = [];
  let pdf;
  try {
    temporaryPresentationId = await copySlidesTemplate(
      templateUrl,
      `temporary-${crypto.randomUUID()}`
    );
    await onTemporaryFile(temporaryPresentationId);

    const presentation = await getSlidesPresentation(temporaryPresentationId);
    const tokens = getTemplateTokens(
      (presentation.slides || [])
        .flatMap((slide) => (slide.pageElements || []).map((element) =>
          element.shape?.text?.textElements?.map((item) => item.textRun?.content || "").join("") || ""
        ))
        .join("\n")
    );
    const qrToken = qrPlaceholder ? qrPlaceholder.replace(/^\{\{\s*|\s*\}\}$/g, "") : "";
    const requests = tokens.filter((token) => token !== qrToken).map((token) => ({
      replaceAllText: {
        containsText: { text: `{{${token}}}`, matchCase: true },
        replaceText: String(token.split(".").reduce((value, key) => value?.[key], context) ?? ""),
      },
    }));

    if (qrPlaceholder) {
      const marker = getQrPlaceholder(presentation, qrPlaceholder);
      const imageBuffer = await QRCode.toBuffer(context.ticket.id, {
        type: "png",
        errorCorrectionLevel: "M",
        margin: 1,
      });
      qrFileId = await uploadTemporaryImage(imageBuffer);
      await onTemporaryFile(qrFileId);
      const element = marker.element;
      requests.push(
        {
          deleteText: {
            objectId: element.objectId,
            textRange: {
              type: "FIXED_RANGE",
              startIndex: marker.text.indexOf(qrPlaceholder),
              endIndex: marker.text.indexOf(qrPlaceholder) + qrPlaceholder.length,
            },
          },
        },
        {
          createImage: {
            objectId: `qr_${crypto.randomBytes(8).toString("hex")}`,
            url: `https://drive.google.com/uc?export=download&id=${encodeURIComponent(qrFileId)}`,
            elementProperties: {
              pageObjectId: marker.slide.objectId,
              size: element.size,
              transform: element.transform,
            },
          },
        }
      );
    }

    await updateSlides(temporaryPresentationId, requests);
    pdf = await exportSlidesPdf(temporaryPresentationId);
  } finally {
    for (const fileId of [qrFileId, temporaryPresentationId].filter(Boolean)) {
      try {
        await deleteDriveFile(fileId);
        await onTemporaryFile(fileId, true);
      } catch (error) {
        cleanupWarnings.push(`${fileId}: ${error.message}`);
      }
    }
  }
  return { pdf, cleanupWarnings };
}
