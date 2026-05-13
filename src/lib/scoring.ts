import type { Database } from "@/integrations/supabase/types";

export type AttendanceStatus = Database["public"]["Enums"]["attendance_status"];

export const STATUS_POINTS: Record<AttendanceStatus, number> = {
  present: 1,
  late: 0.5,
  absent: -1,
  unknown: 0,
};

export const STATUS_STYLES: Record<AttendanceStatus, { bg: string; text: string; symbol: string; label: string }> = {
  present: { bg: "bg-success/15 border-success/30", text: "text-success", symbol: "✓", label: "present" },
  late:    { bg: "bg-warning/15 border-warning/30", text: "text-warning", symbol: "○", label: "late" },
  absent:  { bg: "bg-destructive/15 border-destructive/30", text: "text-destructive", symbol: "−", label: "absent" },
  unknown: { bg: "bg-muted border-border", text: "text-muted-foreground", symbol: "·", label: "unknown" },
};

export function nextStatus(s: AttendanceStatus): AttendanceStatus {
  const order: AttendanceStatus[] = ["unknown", "present", "late", "absent"];
  return order[(order.indexOf(s) + 1) % order.length];
}

export function fmtDate(d: Date | string) {
  const dt = typeof d === "string" ? new Date(d) : d;
  return dt.toISOString().slice(0, 10);
}
