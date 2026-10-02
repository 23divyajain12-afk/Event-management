const TOKEN_PATTERN = /\{\{\s*([a-zA-Z0-9_.-]+)\s*\}\}/g;

export function getTemplateTokens(template) {
  return [...String(template || "").matchAll(TOKEN_PATTERN)].map((match) => match[1]);
}

export function getPathValue(context, path) {
  return path.split(".").reduce((value, key) => value?.[key], context);
}

export function renderTemplate(template, context, { strict = false } = {}) {
  const unresolved = new Set();
  const rendered = String(template || "").replace(TOKEN_PATTERN, (token, path) => {
    const value = getPathValue(context, path);
    if (value === undefined || value === null) {
      unresolved.add(path);
      return strict ? token : "";
    }
    return String(value);
  });

  if (strict && unresolved.size) {
    throw new Error(`Missing template values: ${[...unresolved].join(", ")}`);
  }
  return rendered;
}

export function validateTemplateValues(template, context, required = []) {
  const available = new Set(getTemplateTokens(template));
  const missing = required.filter((token) => !available.has(token));
  if (missing.length) {
    throw new Error(`Template is missing required placeholders: ${missing.join(", ")}`);
  }

  const collectPaths = (value, prefix = "participant") => {
    if (!value || typeof value !== "object" || Array.isArray(value)) return [prefix];
    return Object.entries(value).flatMap(([key, child]) => collectPaths(child, `${prefix}.${key}`));
  };
  const contextTokens = new Set(collectPaths(context.participant || {}));
  contextTokens.add("event.name");
  contextTokens.add("ticket.id");
  contextTokens.add("ticket.qr");
  const unknown = [...available].filter((token) => !contextTokens.has(token));
  if (unknown.length) {
    throw new Error(`Template contains unmapped placeholders: ${unknown.join(", ")}`);
  }
}

export function mapParticipant(sourceRow, fieldMappings = {}) {
  const participant = {};
  const mappings = fieldMappings instanceof Map
    ? Object.fromEntries(fieldMappings.entries())
    : fieldMappings;

  for (const [sourceField, targetPath] of Object.entries(mappings || {})) {
    if (!targetPath || !Object.prototype.hasOwnProperty.call(sourceRow, sourceField)) continue;
    const path = String(targetPath).split(".");
    if (
      path[0] !== "participant" ||
      path.length < 2 ||
      path.some((key) => ["__proto__", "prototype", "constructor"].includes(key))
    ) {
      throw new Error(`Field mapping must target participant fields: ${targetPath}`);
    }
    let target = participant;
    for (const key of path.slice(1, -1)) {
      target[key] ||= {};
      target = target[key];
    }
    target[path[path.length - 1]] = sourceRow[sourceField];
  }

  for (const [field, value] of Object.entries(sourceRow || {})) {
    const mappedPath = mappings?.[field];
    if (mappedPath || value === undefined || value === null) continue;
    const customKey = field.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
    if (customKey && !(customKey in participant)) participant[customKey] = value;
  }

  participant.name = String(participant.name || "").trim();
  participant.email = String(participant.email || "").trim().toLowerCase();
  participant.prn = String(participant.prn || "").trim();
  if (!participant.email || !/\S+@\S+\.\S+/.test(participant.email)) {
    throw new Error("Mapped participant email is missing or invalid.");
  }
  if (!participant.name) participant.name = participant.email.split("@")[0];
  return participant;
}
