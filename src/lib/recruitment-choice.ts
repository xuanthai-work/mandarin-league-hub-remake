/** Labels that behave like Google Form's "Other" option and open a free-text box. */

const OTHER_PREFIX = /^(?:khác|mục khác|other)\s*:\s*(.*)$/i;

/** Whether an option label means "Other" (and should reveal a text box when picked). */
export function isOtherOption(option: string): boolean {
  const norm = option.trim().toLowerCase();
  return (
    norm === "khác" ||
    norm === "mục khác" ||
    norm === "khác..." ||
    norm === "khác…" ||
    norm === "other" ||
    norm.startsWith("khác:") ||
    norm.startsWith("mục khác:")
  );
}

/** Whether a stored answer value came from an "Other" option (with or without custom text). */
export function isOtherAnswerValue(val: unknown): boolean {
  if (typeof val !== "string") return false;
  const norm = val.trim().toLowerCase();
  return (
    norm === "khác" ||
    norm === "mục khác" ||
    norm === "other" ||
    norm.startsWith("khác:") ||
    norm.startsWith("mục khác:") ||
    norm.startsWith("other:")
  );
}

/** Pulls the typed text out of a stored `"Khác: …"` value. */
export function extractOtherText(val: unknown): string {
  if (typeof val !== "string") return "";
  const match = val.trim().match(OTHER_PREFIX);
  return match?.[1] ?? "";
}

/** Builds the stored value for an "Other" answer: `"Khác: text"`, or just `"Khác"` when empty. */
export function formatOtherAnswer(prefix: string, customText: string): string {
  const clean = customText.trim();
  const base = prefix.replace(/\s*:.*$/, "").trim() || "Khác";
  return clean ? `${base}: ${clean}` : base;
}

/** Finds the "Other" entry inside a single or multi answer value. */
export function findOtherAnswer(value: string | string[] | undefined): string {
  if (typeof value === "string") return isOtherAnswerValue(value) ? value : "";
  if (Array.isArray(value)) return value.find(isOtherAnswerValue) ?? "";
  return "";
}

/** Applicant-facing options always end with an "Other" row; an explicit one is reused, not duplicated. */
export function withOtherOption(options: string[]): string[] {
  return options.some(isOtherOption) ? options : [...options, "Khác"];
}

/** Comparison key for option labels: trimmed and case-insensitive. */
const optionKey = (value: string) => value.trim().toLowerCase();

/**
 * Splits pasted text into choice labels — one per line (LF, CRLF or lone CR) —
 * then trims each label and drops blank lines, duplicates inside the pasted
 * block, and labels the question already has (compared case-insensitively).
 */
export function parsePastedOptions(rawText: string, existingOptions: string[] = []): string[] {
  const seen = new Set(existingOptions.map(optionKey));
  const fresh: string[] = [];
  for (const line of rawText.split(/\r\n|\r|\n/)) {
    const value = line.trim();
    if (!value) continue;
    const key = optionKey(value);
    if (seen.has(key)) continue;
    seen.add(key);
    fresh.push(value);
  }
  return fresh;
}
