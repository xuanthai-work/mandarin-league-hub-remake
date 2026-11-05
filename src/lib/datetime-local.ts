/** Helpers for `YYYY-MM-DDTHH:mm` local wall-clock strings (the `<input type="datetime-local">` format). */

const pad = (n: number) => String(n).padStart(2, "0");
const LOCAL_RE = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/;

/** Local string → Date in the browser's timezone, or undefined when malformed. */
export function parseLocal(value: string | null | undefined): Date | undefined {
  const m = LOCAL_RE.exec(value ?? "");
  if (!m) return undefined;
  const [y, mo, d, h, mi] = m.slice(1).map(Number) as [number, number, number, number, number];
  const date = new Date(y, mo - 1, d, h, mi);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

/** Date → local string. */
export function toLocalValue(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** ISO timestamp from the database → local string ("" when empty/invalid). */
export function isoToLocal(iso: string | null | undefined): string {
  if (!iso) return "";
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? "" : toLocalValue(date);
}

/** Local string → ISO timestamp for the database (null when empty/invalid). */
export function localToIso(value: string | null | undefined): string | null {
  const date = parseLocal(value);
  return date ? date.toISOString() : null;
}

/** "YYYY-MM-DD" part of a local string ("" when malformed). */
export const datePart = (value: string | null | undefined) =>
  LOCAL_RE.test(value ?? "") ? (value as string).slice(0, 10) : "";

/** "HH:mm" part of a local string ("" when malformed). */
export const timePart = (value: string | null | undefined) =>
  LOCAL_RE.test(value ?? "") ? (value as string).slice(11, 16) : "";

/** Joins "YYYY-MM-DD" and "HH:mm" into a local string. */
export const joinLocal = (date: string, time: string) => `${date}T${time}`;

/** All "HH:mm" slots of a day for the given minute step (15 → 96 slots). */
export function timeSlots(step = 15): string[] {
  const out: string[] = [];
  for (let m = 0; m < 24 * 60; m += step) out.push(`${pad(Math.floor(m / 60))}:${pad(m % 60)}`);
  return out;
}

/** Slots plus `extra` (e.g. an off-step stored time like "19:07"), sorted and unique. */
export function withSlot(slots: string[], extra: string): string[] {
  if (!extra || slots.includes(extra)) return slots;
  return [...slots, extra].sort();
}

/** "DD/MM/YYYY · HH:mm" for display ("" when malformed). */
export function formatLocal(value: string | null | undefined): string {
  const date = parseLocal(value);
  if (!date) return "";
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()} · ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
