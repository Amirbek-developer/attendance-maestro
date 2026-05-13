import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { Trophy, BarChart3 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { STATUS_POINTS } from "@/lib/scoring";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/dashboard/rating")({ component: RatingPage });

function RatingPage() {
  const { t } = useTranslation();
  const { user } = useAuth();

  const { data: students = [] } = useQuery({
    queryKey: ["rating", user?.id], enabled: !!user,
    queryFn: async () => (await supabase.from("students").select("id,full_name,groups(name),attendance_records(status),reward_records(points)")).data || [],
  });

  const ranked = students.map((s: any) => {
    const att = (s.attendance_records || []).reduce((a: number, r: any) => a + (STATUS_POINTS[r.status as keyof typeof STATUS_POINTS] || 0), 0);
    const reward = (s.reward_records || []).filter((r: any) => Number(r.points) > 0).reduce((a: number, r: any) => a + Number(r.points), 0);
    const penalty = (s.reward_records || []).filter((r: any) => Number(r.points) < 0).reduce((a: number, r: any) => a + Number(r.points), 0);
    return { ...s, att, reward, penalty, total: att + reward + penalty };
  }).sort((a, b) => b.total - a.total);

  const top3 = ranked.slice(0, 3);
  const initials = (n: string) => n.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">{t("rating.title")}</h1>
        <p className="text-sm text-muted-foreground">{t("rating.subtitle")}</p>
      </div>

      {ranked.length === 0 ? (
        <div className="rounded-xl border bg-card shadow-soft py-20 flex flex-col items-center text-muted-foreground">
          <BarChart3 className="h-12 w-12 opacity-30" />
          <p className="mt-3 text-sm">{t("rating.noStudents")}</p>
        </div>
      ) : (
        <>
          {top3.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {top3.map((s, i) => {
                const tones = [
                  "bg-gradient-to-br from-accent/20 to-accent-glow/10 border-accent/30",
                  "bg-gradient-to-br from-muted to-muted/40 border-border",
                  "bg-gradient-to-br from-warning/15 to-warning/5 border-warning/30",
                ];
                return (
                  <div key={s.id} className={cn("rounded-2xl border p-4 text-center shadow-soft", tones[i])}>
                    <div className="text-xs uppercase tracking-wider font-bold text-muted-foreground flex items-center justify-center gap-1"><Trophy className="h-3.5 w-3.5" /> #{i + 1}</div>
                    <div className="font-bold mt-2">{s.full_name}</div>
                    <div className="text-xs text-muted-foreground">{s.groups?.name}</div>
                    <div className="mt-3 inline-flex items-center justify-center h-16 w-16 rounded-full bg-success text-success-foreground font-bold text-xl shadow-glow">{s.total.toFixed(1)}</div>
                    <div className="grid grid-cols-3 mt-3 text-[11px]">
                      <div><div className="text-info font-bold">{s.att.toFixed(1)}</div><div className="text-muted-foreground">{t("rating.attendance")}</div></div>
                      <div><div className="text-success font-bold">+{s.reward.toFixed(1)}</div><div className="text-muted-foreground">{t("rating.reward")}</div></div>
                      <div><div className="text-destructive font-bold">{s.penalty.toFixed(1)}</div><div className="text-muted-foreground">{t("rating.penalty")}</div></div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          <div className="rounded-xl border bg-card shadow-soft">
            <div className="px-4 py-3 border-b flex items-center justify-between">
              <h3 className="text-sm font-semibold">{t("rating.allRating")}</h3>
              <span className="text-xs text-muted-foreground">{t("rating.countSuffix", { n: ranked.length })}</span>
            </div>
            <div className="divide-y">
              {ranked.map((s, i) => (
                <div key={s.id} className="flex items-center gap-3 px-4 py-2.5">
                  <span className="w-6 text-sm font-bold text-muted-foreground">{i + 1}</span>
                  <div className="h-9 w-9 rounded-full bg-muted text-muted-foreground inline-flex items-center justify-center text-xs font-bold">{initials(s.full_name)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold truncate text-sm">{s.full_name}</div>
                    <div className="text-xs text-muted-foreground truncate">{s.groups?.name}</div>
                  </div>
                  <div className="hidden sm:flex gap-4 text-xs">
                    <span className="text-info">{s.att.toFixed(1)}</span>
                    <span className="text-success">+{s.reward.toFixed(1)}</span>
                    <span className="text-destructive">{s.penalty.toFixed(1)}</span>
                  </div>
                  <span className={cn("inline-flex items-center justify-center min-w-14 h-7 px-2 rounded-full text-xs font-bold", s.total >= 0 ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive")}>{s.total.toFixed(1)}</span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
