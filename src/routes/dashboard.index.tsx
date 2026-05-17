import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { Users, BookOpen, TrendingUp, Trophy, BarChart3, Calendar, AlertTriangle } from "lucide-react";
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
        supabase.from("groups").select("id,name"),
        supabase.from("students").select("id,group_id"),
        supabase.from("attendance_records").select("status,date,group_id,student_id"),
        supabase.from("reward_records").select("points,student_id"),
      ]);
      const groups = g.data || [];
      const students = s.data || [];
      const attendance = a.data || [];
      const rewards = r.data || [];

      const present = attendance.filter((x) => x.status === "present" || x.status === "late").length;
      const overallAttendance = attendance.length ? Math.round((present / attendance.length) * 100) : 0;

      // Top student by reward points
      const ptsByStudent = new Map<string, number>();
      for (const r of rewards) ptsByStudent.set(r.student_id, (ptsByStudent.get(r.student_id) || 0) + Number(r.points));
      let topStudentId: string | null = null;
      let topPts = -Infinity;
      for (const [sid, pts] of ptsByStudent) if (pts > topPts) { topPts = pts; topStudentId = sid; }
      const topName = topStudentId
        ? (await supabase.from("students").select("full_name").eq("id", topStudentId).maybeSingle()).data?.full_name || "—"
        : "—";

      // Per group ranking
      const perGroup = groups.map((grp) => {
        const grpAtt = attendance.filter((x) => x.group_id === grp.id);
        const grpPresent = grpAtt.filter((x) => x.status === "present" || x.status === "late").length;
        const att = grpAtt.length ? Math.round((grpPresent / grpAtt.length) * 100) : 0;
        const grpStudents = students.filter((x) => x.group_id === grp.id).length;
        const lessons = new Set(grpAtt.map((x) => x.date)).size;
        const breakdown = {
          present: grpAtt.filter((x) => x.status === "present").length,
          late: grpAtt.filter((x) => x.status === "late").length,
          absent: grpAtt.filter((x) => x.status === "absent" || x.status === "excused").length,
        };
        return { id: grp.id, name: grp.name, att, students: grpStudents, lessons, breakdown };
      }).sort((a, b) => b.att - a.att);

      // Monthly (current month)
      const now = new Date();
      const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
      const monthAtt = attendance.filter((x) => (x.date || "").startsWith(ym));
      const monthPresent = monthAtt.filter((x) => x.status === "present" || x.status === "late").length;
      const monthStats = {
        att: monthAtt.length ? Math.round((monthPresent / monthAtt.length) * 100) : 0,
        students: new Set(monthAtt.map((x) => x.student_id)).size,
        lessons: new Set(monthAtt.map((x) => x.date)).size,
        breakdown: {
          present: monthAtt.filter((x) => x.status === "present").length,
          late: monthAtt.filter((x) => x.status === "late").length,
          absent: monthAtt.filter((x) => x.status === "absent" || x.status === "excused").length,
        },
      };

      return {
        groups: groups.length,
        students: students.length,
        attendance: overallAttendance,
        topName,
        perGroup,
        monthStats,
        monthLabel: now.toLocaleDateString("default", { month: "long", year: "numeric" }),
      };
    },
  });

  const firstName = (profile?.full_name || user?.email?.split("@")[0] || "").split(" ")[0];

  const cards = [
    { icon: Users, label: t("dashboard.students"), value: stats?.students ?? 0, color: "info" },
    { icon: BookOpen, label: t("dashboard.lessons"), value: stats?.groups ?? 0, color: "success" },
    { icon: TrendingUp, label: t("dashboard.attendance"), value: `${stats?.attendance ?? 0}%`, color: "warning" },
    { icon: Trophy, label: t("dashboard.topGrade"), value: stats?.topName ?? "—", color: "accent" },
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
          {stats?.perGroup?.length ? (
            <div className="space-y-3">
              {stats.perGroup.map((g, i) => (
                <StatCard
                  key={g.id}
                  icon={<Trophy className="h-5 w-5 text-amber-500" />}
                  title={g.name}
                  rank={`#${i + 1}`}
                  subtitle={`${g.lessons} ${t("dashboard.lessonsDone")}`}
                  att={g.att}
                  students={g.students}
                  lessons={g.lessons}
                  breakdown={g.breakdown}
                  t={t}
                />
              ))}
            </div>
          ) : (
            <EmptyState icon={<Users className="h-10 w-10 text-muted-foreground/40" />} label={t("dashboard.noData")} />
          )}
        </Panel>
        <Panel icon={<Calendar className="h-4 w-4 text-info" />} title={t("dashboard.monthly")}>
          {stats?.monthStats && stats.monthStats.lessons > 0 ? (
            <StatCard
              icon={<BarChart3 className="h-5 w-5 text-info" />}
              title={stats.monthLabel}
              subtitle={`${stats.monthStats.lessons} ${t("dashboard.lessonsDone")}`}
              att={stats.monthStats.att}
              students={stats.monthStats.students}
              lessons={stats.monthStats.lessons}
              breakdown={stats.monthStats.breakdown}
              t={t}
            />
          ) : (
            <EmptyState icon={<Calendar className="h-10 w-10 text-muted-foreground/40" />} label={t("dashboard.noMonthly")} />
          )}
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
      <div className="p-4">{children}</div>
    </div>
  );
}

function EmptyState({ icon, label }: { icon: React.ReactNode; label: string }) {
  return <div className="min-h-40 flex flex-col items-center justify-center gap-2 text-muted-foreground">{icon}<span className="text-sm">{label}</span></div>;
}

function StatCard({ icon, title, rank, subtitle, att, students, lessons, breakdown, t }: {
  icon: React.ReactNode; title: string; rank?: string; subtitle: string;
  att: number; students: number; lessons: number;
  breakdown: { present: number; late: number; absent: number };
  t: (k: string) => string;
}) {
  const total = Math.max(1, breakdown.present + breakdown.late + breakdown.absent);
  const pPct = (breakdown.present / total) * 100;
  const lPct = (breakdown.late / total) * 100;
  const aPct = (breakdown.absent / total) * 100;
  const tone = att >= 80 ? { label: t("dashboard.good"), bg: "bg-success/15", text: "text-success" }
    : att >= 60 ? { label: t("dashboard.avg"), bg: "bg-warning/15", text: "text-warning" }
    : { label: t("dashboard.low"), bg: "bg-destructive/15", text: "text-destructive" };
  const attTone = att >= 80 ? "bg-success/15 text-success" : att >= 60 ? "bg-warning/15 text-warning" : "bg-destructive/15 text-destructive";

  return (
    <div className="rounded-xl border bg-muted/30 p-4 space-y-3">
      <div className="flex items-start gap-3">
        <div className="h-10 w-10 rounded-lg bg-card flex items-center justify-center shrink-0">{icon}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold truncate">{title}</span>
            {rank && <span className="text-[10px] font-bold text-muted-foreground">{rank}</span>}
          </div>
          <div className="text-xs text-muted-foreground">{subtitle}</div>
        </div>
        <div className={`text-right px-2.5 py-1 rounded-md ${attTone}`}>
          <div className="text-sm font-bold leading-tight">{att}%</div>
          <div className="text-[9px] tracking-wide opacity-80">{t("dashboard.attRate")}</div>
        </div>
      </div>

      <div className="rounded-lg bg-card p-3 space-y-2">
        <div className="text-[10px] tracking-[0.15em] text-muted-foreground font-semibold uppercase">{t("dashboard.overallMetrics")}</div>
        <div className="flex h-2 rounded-full overflow-hidden bg-muted">
          <div className="bg-success" style={{ width: `${pPct}%` }} />
          <div className="bg-warning" style={{ width: `${lPct}%` }} />
          <div className="bg-destructive" style={{ width: `${aPct}%` }} />
        </div>
        <div className="grid grid-cols-3 gap-2 pt-1">
          <Metric icon={<Users className="h-3.5 w-3.5 text-info" />} label={t("dashboard.studentShort")} value={students} />
          <Metric icon={<BookOpen className="h-3.5 w-3.5 text-success" />} label={t("dashboard.lessons")} value={lessons} />
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 text-[10px] text-muted-foreground">
              <TrendingUp className="h-3.5 w-3.5 text-accent" />
              <span>{t("dashboard.efficiency")}</span>
            </div>
            <div className={`mt-1 inline-flex items-center gap-1 px-2 py-0.5 rounded-md ${tone.bg} ${tone.text} text-xs font-semibold`}>
              <AlertTriangle className="h-3 w-3" />
              {att}% <span className="text-[9px] opacity-80">{tone.label}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Metric({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
  return (
    <div className="text-center">
      <div className="flex items-center justify-center gap-1 text-[10px] text-muted-foreground">{icon}<span>{label}</span></div>
      <div className="mt-1 text-base font-bold">{value}</div>
    </div>
  );
}
