// Time helpers. Times are stored as "minutes from midnight" (local salon time)
// and dates as plain "YYYY-MM-DD" strings to keep scheduling timezone-stable.

export const DAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

export const DAY_NAMES_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** "09:30" / "9 AM" style label from minutes-from-midnight. */
export function minutesToLabel(min: number): string {
  const h24 = Math.floor(min / 60);
  const m = min % 60;
  const period = h24 >= 12 ? "PM" : "AM";
  let h12 = h24 % 12;
  if (h12 === 0) h12 = 12;
  return m === 0
    ? `${h12}:00 ${period}`
    : `${h12}:${m.toString().padStart(2, "0")} ${period}`;
}

/** 24h "HH:MM" from minutes (for <input type=time> values). */
export function minutesToHHMM(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
}

/** Parse "HH:MM" -> minutes from midnight. */
export function hhmmToMinutes(value: string): number {
  const [h, m] = value.split(":").map((n) => parseInt(n, 10));
  return h * 60 + (m || 0);
}

export function durationLabel(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h && m) return `${h}h ${m}m`;
  if (h) return `${h} ${h === 1 ? "Hour" : "Hours"}`;
  return `${m} Min`;
}

export function formatKes(amount: number): string {
  return `KES ${amount.toLocaleString("en-KE")}`;
}

/** Local-date "YYYY-MM-DD" for a Date object (no UTC shift). */
export function toDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = (d.getMonth() + 1).toString().padStart(2, "0");
  const day = d.getDate().toString().padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function todayStr(): string {
  return toDateStr(new Date());
}

/** Day of week (0=Sun..6=Sat) for a "YYYY-MM-DD" string, parsed as local. */
export function dayOfWeek(dateStr: string): number {
  const [y, m, d] = dateStr.split("-").map((n) => parseInt(n, 10));
  return new Date(y, m - 1, d).getDay();
}

export function prettyDate(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map((n) => parseInt(n, 10));
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString("en-KE", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function addDaysStr(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split("-").map((n) => parseInt(n, 10));
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() + days);
  return toDateStr(date);
}

/** Minutes-from-midnight "now" for a given date, or -1 if date is in the future. */
export function nowMinutesForDate(dateStr: string): number {
  const today = todayStr();
  if (dateStr > today) return -1; // whole day is in the future
  if (dateStr < today) return 24 * 60 + 1; // whole day is in the past
  const now = new Date();
  return now.getHours() * 60 + now.getMinutes();
}
