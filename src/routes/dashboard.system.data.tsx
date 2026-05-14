import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { Download, Send, Upload, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/dashboard/system/data")({
  component: DataPage,
});

function DataPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const fileRef = React.useRef<HTMLInputElement>(null);

  const handleExport = async () => {
    if (!user) return;
    try {
      const [groups, students, attendance, rewards, profile] = await Promise.all([
        supabase.from("groups").select("*").eq("user_id", user.id),
        supabase.from("students").select("*").eq("user_id", user.id),
        supabase.from("attendance_records").select("*").eq("user_id", user.id),
        supabase.from("reward_records").select("*").eq("user_id", user.id),
        supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
      ]);
      const payload = {
        exportedAt: new Date().toISOString(),
        version: 1,
        profile: profile.data,
        groups: groups.data || [],
        students: students.data || [],
        attendance_records: attendance.data || [],
        reward_records: rewards.data || [],
      };
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `teachpro-export-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(t("common.success"));
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleImport = async (file: File) => {
    if (!user) return;
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      // Wipe current data first
      await supabase.from("attendance_records").delete().eq("user_id", user.id);
      await supabase.from("reward_records").delete().eq("user_id", user.id);
      await supabase.from("students").delete().eq("user_id", user.id);
      await supabase.from("groups").delete().eq("user_id", user.id);
      // Re-insert
      if (data.groups?.length) await supabase.from("groups").insert(data.groups.map((g: any) => ({ ...g, user_id: user.id })));
      if (data.students?.length) await supabase.from("students").insert(data.students.map((s: any) => ({ ...s, user_id: user.id })));
      if (data.attendance_records?.length) await supabase.from("attendance_records").insert(data.attendance_records.map((r: any) => ({ ...r, user_id: user.id })));
      if (data.reward_records?.length) await supabase.from("reward_records").insert(data.reward_records.map((r: any) => ({ ...r, user_id: user.id })));
      toast.success(t("common.success"));
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">{t("system.dataTitle")}</h1>
        <p className="text-sm text-muted-foreground mt-0.5">{t("system.dataSubtitle")}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Export */}
        <div className="rounded-xl border bg-card shadow-soft p-5">
          <div className="flex items-start gap-3 mb-3">
            <div className="h-10 w-10 rounded-lg bg-success/15 flex items-center justify-center shrink-0">
              <Download className="h-5 w-5 text-success" />
            </div>
            <div>
              <h3 className="font-semibold">{t("system.exportTitle")}</h3>
              <p className="text-xs text-muted-foreground mt-0.5">{t("system.exportDesc")}</p>
            </div>
          </div>
          <div className="space-y-2">
            <Button onClick={handleExport} className="w-full rounded-full bg-success hover:bg-success/90 text-success-foreground gap-2">
              <Download className="h-4 w-4" /> {t("system.exportBtn")}
            </Button>
            <Button variant="outline" className="w-full rounded-full border-info/40 text-info hover:bg-info/5 gap-2">
              <Send className="h-4 w-4" /> {t("system.telegramBtn")}
            </Button>
          </div>
        </div>

        {/* Import */}
        <div className="rounded-xl border bg-card shadow-soft p-5">
          <div className="flex items-start gap-3 mb-3">
            <div className="h-10 w-10 rounded-lg bg-info/15 flex items-center justify-center shrink-0">
              <Upload className="h-5 w-5 text-info" />
            </div>
            <div>
              <h3 className="font-semibold">{t("system.importTitle")}</h3>
              <p className="text-xs text-muted-foreground mt-0.5">{t("system.importDesc")}</p>
            </div>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="application/json"
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImport(f); }}
          />
          <Button variant="outline" onClick={() => fileRef.current?.click()} className="w-full rounded-full border-info/40 text-info hover:bg-info/5 gap-2">
            <Upload className="h-4 w-4" /> {t("system.importBtn")}
          </Button>
        </div>
      </div>

      <div className="rounded-xl border border-warning/40 bg-warning/10 p-5">
        <div className="flex items-center gap-2 mb-2">
          <AlertCircle className="h-4 w-4 text-warning" />
          <h4 className="font-semibold text-warning">{t("system.infoTitle")}</h4>
        </div>
        <ul className="space-y-1.5 text-sm text-foreground/80 pl-6 list-disc">
          <li>{t("system.info1")}</li>
          <li>{t("system.info2")}</li>
          <li>{t("system.info3")}</li>
          <li><span className="font-semibold">{t("system.info4")}</span></li>
        </ul>
      </div>
    </div>
  );
}
