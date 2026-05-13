import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { Users, BookOpen, TrendingUp, Trophy, BarChart3, Calendar } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { STATUS_POINTS } from "@/lib/scoring";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const Route = createFileRoute("/dashboard/")({
  component: Overview,
});

function Overview() {
  const { t } = useTranslation();
  const { user } = useAuth();

  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => (await supabase.from("profiles").select("*").eq("id", user!.id).maybeSingle()).data,
    enabled: !!user,
  });

  const { data: stats } = useQuery({
    queryKey: ["overview-stats", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const [g, s, a, r] = await Promise.all([
        supabase.from("groups").select("id", { count: "exact", head: true }),
        supabase.from("students").select("id", { count: "exact", head: true }),
        supabase.from("attendance_records").select("status"),
        supabase.from("reward_records").select("points,student_id"),
      ]);
      const total = (a.data || []).length;
      const present = (a.data || []).filter((x) => x.status === "present" || x.status === "late").length;
      return {
        groups: g.count ?? 0,
        students: s.count ?? 0,
        attendance: total ? Math.round((present / total) * 100) : 0,
        topPoints: (r.data || []).reduce((acc, x) => acc + Number(x.points), 0),
      };
    },
  });

  const firstName = (profile?.full_name || user?.email?.split("@")[0] || "").split(" ")[0];

  const cards = [
    { icon: Users, label: t("dashboard.students"), value: stats?.students ?? 0, color: "info" },
    { icon: BookOpen, label: t("dashboard.lessons"), value: stats?.groups ?? 0, color: "success" },
    { icon: TrendingUp, label: t("dashboard.attendance"), value: `${stats?.attendance ?? 0}%`, color: "warning" },
    { icon: Trophy, label: t("dashboard.topGrade"), value: stats?.topPoints ?? "—", color: "accent" },
  ];

  return (
    <div className="space-y-5">
      <div className="text-[10px] tracking-[0.2em] text-muted-foreground font-semibold">{t("dashboard.section").toUpperCase()}</div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t("dashboard.welcome", { name: firstName })}</h1>
          <p className="text-sm text-muted-foreground mt-1">{new Date().toLocaleDateString()}</p>
        </div>
        <div className="flex gap-2">
          <Select defaultValue="all">
            <SelectTrigger className="w-44 h-9"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="all">{t("dashboard.allGroups")}</SelectItem></SelectContent>
          </Select>
          <Select defaultValue="all">
            <SelectTrigger className="w-32 h-9"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="all">{t("dashboard.all")}</SelectItem></SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {cards.map((c) => (
          <div key={c.label} className="rounded-xl border bg-card p-4 shadow-soft">
            <div className={`h-9 w-9 rounded-lg flex items-center justify-center bg-${c.color}/15`}>
              <c.icon className={`h-4 w-4 text-${c.color}`} />
            </div>
            <div className="mt-3 text-2xl font-bold">{c.value}</div>
            <div className="text-[10px] tracking-[0.15em] text-muted-foreground font-semibold uppercase mt-1">{c.label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Panel icon={<BarChart3 className="h-4 w-4 text-accent" />} title={t("dashboard.groupsRating")}>
          <EmptyState icon={<Users className="h-10 w-10 text-muted-foreground/40" />} label={t("dashboard.noData")} />
        </Panel>
        <Panel icon={<Calendar className="h-4 w-4 text-info" />} title={t("dashboard.monthly")}>
          <EmptyState icon={<Calendar className="h-10 w-10 text-muted-foreground/40" />} label={t("dashboard.noMonthly")} />
        </Panel>
      </div>
    </div>
  );
}

function Panel({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border bg-card shadow-soft">
      <div className="px-4 py-3 border-b flex items-center gap-2">
        {icon}<h3 className="text-sm font-semibold">{title}</h3>
      </div>
      <div className="p-6 min-h-48 flex items-center justify-center">{children}</div>
    </div>
  );
}

function EmptyState({ icon, label }: { icon: React.ReactNode; label: string }) {
  return <div className="flex flex-col items-center gap-2 text-muted-foreground">{icon}<span className="text-sm">{label}</span></div>;
}
