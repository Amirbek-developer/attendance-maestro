import type { Database } from "@/integrations/supabase/types";

export type AttendanceStatus = Database["public"]["Enums"]["attendance_status"];

export const STATUS_POINTS: Record<AttendanceStatus, number> = {
  present: 1,
  late: 0.5,
  absent: -1,
  excused: 0,
  unknown: 0,
};

export const STATUS_STYLES: Record<AttendanceStatus, { bg: string; text: string; border: string; symbol: string; iconName: "check" | "clock" | "x" | "alert" | "dot"; label: string }> = {
  present: { bg: "bg-success",     text: "text-success-foreground",     border: "border-success",     symbol: "✓", iconName: "check", label: "present" },
  late:    { bg: "bg-warning",     text: "text-warning-foreground",     border: "border-warning",     symbol: "○", iconName: "clock", label: "late" },
  absent:  { bg: "bg-destructive", text: "text-destructive-foreground", border: "border-destructive", symbol: "✕", iconName: "x",     label: "absent" },
  excused: { bg: "bg-amber-400 dark:bg-amber-500", text: "text-amber-950 dark:text-amber-50", border: "border-amber-400", symbol: "!", iconName: "alert", label: "excused" },
  unknown: { bg: "bg-muted",       text: "text-muted-foreground",       border: "border-border",      symbol: "·", iconName: "dot",   label: "unknown" },
};

export function nextStatus(s: AttendanceStatus): AttendanceStatus {
  // Cycle: unknown -> present -> late -> absent -> excused -> unknown
  const order: AttendanceStatus[] = ["unknown", "present", "late", "absent", "excused"];
  return order[(order.indexOf(s) + 1) % order.length];
}

export function fmtDate(d: Date | string) {
  const dt = typeof d === "string" ? new Date(d) : d;
  return dt.toISOString().slice(0, 10);
}
