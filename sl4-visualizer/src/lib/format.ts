import type { AuthorKey } from "./types";

const FULL = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
});
const SHORT = new Intl.DateTimeFormat("en-US", { month: "short", year: "numeric" });
const DAY = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" });

export function formatFull(iso: string | null) {
  if (!iso) return "—";
  try {
    return FULL.format(new Date(iso));
  } catch {
    return "—";
  }
}

export function formatMonth(iso: string | null) {
  if (!iso) return "—";
  try {
    return SHORT.format(new Date(iso));
  } catch {
    return "—";
  }
}

export function formatDay(iso: string | null) {
  if (!iso) return "—";
  try {
    return DAY.format(new Date(iso));
  } catch {
    return "—";
  }
}

export function formatRange(a: string | null, b: string | null) {
  if (!a || !b) return formatDay(a || b);
  const da = new Date(a);
  const db = new Date(b);
  if (da.getFullYear() === db.getFullYear() && da.getMonth() === db.getMonth()) {
    return formatMonth(a);
  }
  return `${formatDay(a)} – ${formatDay(b)}`;
}

export function authorColorClass(k: AuthorKey) {
  if (k === "yudkowsky") return "text-yud";
  if (k === "goertzel") return "text-goe";
  return "text-other";
}

export function authorDotClass(k: AuthorKey) {
  if (k === "yudkowsky") return "bg-yud";
  if (k === "goertzel") return "bg-goe";
  return "bg-other";
}

export function authorBorderClass(k: AuthorKey) {
  if (k === "yudkowsky") return "border-yud/60";
  if (k === "goertzel") return "border-goe/60";
  return "border-border";
}
