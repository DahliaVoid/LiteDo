import type { Repeat } from "./types";

export function pad(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

export function toDateStr(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function today(): string {
  return toDateStr(new Date());
}

export function parseDate(value: string): Date {
  const [y, m, d] = value.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(value: string, days: number): string {
  const date = parseDate(value);
  date.setDate(date.getDate() + days);
  return toDateStr(date);
}

export function addMonths(value: string, months: number): string {
  const date = parseDate(value);
  const day = date.getDate();
  date.setDate(1);
  date.setMonth(date.getMonth() + months);
  // 目标月没有当天日号时（如 1/31 +1 月），钳制到该月最后一天
  const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  date.setDate(Math.min(day, lastDay));
  return toDateStr(date);
}

export function advanceRepeat(value: string, repeat: Repeat): string {
  if (repeat === "daily") return addDays(value, 1);
  if (repeat === "weekly") return addDays(value, 7);
  if (repeat === "monthly") return addMonths(value, 1);
  return value;
}

export function formatDate(value: string): string {
  const [, m, d] = value.split("-").map(Number);
  return `${m}月${d}日`;
}

export function formatShort(value: string): string {
  const [, m, d] = value.split("-");
  return `${m}/${d}`;
}

export function weekdayCN(value: string): string {
  const week = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];
  return week[parseDate(value).getDay()];
}

export function dateInRange(value: string, start: string, end: string): boolean {
  return value >= start && value <= end;
}

export function diffDays(start: string, end: string): number {
  const ms = parseDate(end).getTime() - parseDate(start).getTime();
  return Math.round(ms / 86400000);
}

export function monthDays(year: number, month: number): Array<{ day: number | null; date: string }> {
  const first = new Date(year, month, 1);
  const startOffset = (first.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: Array<{ day: number | null; date: string }> = [];
  for (let i = 0; i < startOffset; i++) cells.push({ day: null, date: "" });
  for (let day = 1; day <= daysInMonth; day++) {
    cells.push({ day, date: `${year}-${pad(month + 1)}-${pad(day)}` });
  }
  while (cells.length % 7 !== 0) cells.push({ day: null, date: "" });
  return cells;
}

export function reminderAt(task: {
  has_time: number;
  time_point: string | null;
  reminder_offset_minutes: number;
}): Date | null {
  if (!task.has_time || !task.time_point) return null;
  const [h, m] = task.time_point.split(":").map(Number);
  const date = new Date();
  date.setHours(h, m - (task.reminder_offset_minutes || 0), 0, 0);
  return date;
}

export function sortPriority(a: string, b: string): number {
  const order: Record<string, number> = { P0: 0, P1: 1, P2: 2, P3: 3 };
  return (order[a] ?? 9) - (order[b] ?? 9);
}
