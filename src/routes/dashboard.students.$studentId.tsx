import * as React from "react";
import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Download, FileText, Calendar, Trophy, Award, BookOpen, TrendingUp, Check, Clock, X, AlertTriangle, Circle, BarChart3, Sparkles, User } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { STATUS_POINTS, STATUS_STYLES, type AttendanceStatus } from "@/lib/scoring";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/dashboard/students/$studentId")({
  component: StudentProfile,
});

const ICONS = { present: Check, late: Clock, absent: X, excused: AlertTriangle, unknown: Circle } as const;
const STATUS_LABEL: Record<AttendanceStatus, string> = {
  present: "Kelgan", late: "Kechikkan", absent: "Kelmagan", excused: "Sababli", unknown: "Belgilanmagan",
};

function StudentProfile() {
  const { studentId } = Route.useParams();
  const { user } = useAuth();
  const router = useRouter();

  const { data: student, isLoading } = useQuery({
    queryKey: ["student-profile", studentId],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("students")
        .select("id,full_name,phone,notes,group_id,created_at,groups(name,color),attendance_records(id,date,status,note),reward_records(id,date,points,reason)")
        .eq("id", studentId)
        .maybeSingle();
      return data;
    },
  });

  const { data: allStudents = [] } = useQuery({
    queryKey: ["rank-context", user?.id],
    enabled: !!user,
    queryFn: async () => (await supabase.from("students").select("id,attendance_records(status),reward_records(points)")).data || [],
  });

  if (isLoading) return <div className="p-10 text-center text-muted-foreground">Yuklanmoqda...</div>;
  if (!student) return <div className="p-10 text-center text-muted-foreground">O'quvchi topilmadi</div>;

  const recs = (student.attendance_records || []) as any[];
  const rewards = (student.reward_records || []) as any[];

  const present = recs.filter((r) => r.status === "present" || r.status === "late").length;
  const att = recs.length ? Math.round((present / recs.length) * 100) : 0;
  const cntKelgan = recs.filter((r) => r.status === "present").length;
  const cntLate = recs.filter((r) => r.status === "late").length;
  const cntAbsent = recs.filter((r) => r.status === "absent").length;

  const attScore = recs.reduce((a, r) => a + (STATUS_POINTS[r.status as AttendanceStatus] || 0), 0);
  const rewardSum = rewards.filter((r) => Number(r.points) > 0).reduce((a, r) => a + Number(r.points), 0);
  const penaltySum = rewards.filter((r) => Number(r.points) < 0).reduce((a, r) => a + Number(r.points), 0);
  const total = attScore + rewardSum + penaltySum;
  const rewardNet = rewardSum + penaltySum;

  const ranked = allStudents.map((s: any) => {
    const a = (s.attendance_records || []).reduce((x: number, r: any) => x + (STATUS_POINTS[r.status as AttendanceStatus] || 0), 0);
    const rr = (s.reward_records || []).reduce((x: number, r: any) => x + Number(r.points), 0);
    return { id: s.id, total: a + rr };
  }).sort((a, b) => b.total - a.total);
  const rank = ranked.findIndex((s) => s.id === studentId) + 1;

  const initials = (student.full_name || "?").split(" ").map((p: string) => p[0]).slice(0, 2).join("").toUpperCase();
  const isTop = rank === 1 && recs.length > 0;
  const isExcellent = att >= 90 && recs.length > 0;

  const exportCSV = () => {
    const lines = [
      ["O'quvchi", student.full_name],
      ["Guruh", (student as any).groups?.name || ""],
      ["Jami ball", total.toFixed(1)],
      ["Davomat", att + "%"],
      ["Reyting", "#" + rank],
      [],
      ["Sana", "Holat", "Izoh"],
      ...recs.map((r) => [r.date, STATUS_LABEL[r.status as AttendanceStatus] || r.status, r.note || ""]),
      [],
      ["Sana", "Ball", "Sabab"],
      ...rewards.map((r) => [r.date, r.points, r.reason || ""]),
    ];
    const csv = lines.map((row) => row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${student.full_name}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      {/* Header bar */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <button onClick={() => router.history.back()} className="inline-flex items-center gap-2 text-sm font-medium hover:bg-muted px-3 h-9 rounded-md">
          <ArrowLeft className="h-4 w-4" /> Orqaga
        </button>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={exportCSV} className="gap-1.5"><Download className="h-4 w-4" /> Excel</Button>
          <Button variant="outline" size="sm" onClick={() => window.print()} className="gap-1.5"><FileText className="h-4 w-4" /> PDF</Button>
        </div>
      </div>

      {/* Profile banner */}
      <div className="rounded-xl border bg-card shadow-soft overflow-hidden">
        <div className="h-24 bg-gradient-to-r from-emerald-400 to-emerald-600" />
        <div className="p-4 flex items-end gap-4 -mt-10">
          <div className="h-20 w-20 rounded-xl bg-emerald-500 text-white font-bold text-2xl flex items-center justify-center shadow-lg ring-4 ring-card shrink-0">
            {initials}
          </div>
          <div className="flex-1 min-w-0 pb-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-bold truncate">{student.full_name}</h1>
              {isExcellent && <span className="text-xs font-semibold bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 px-2 py-0.5 rounded-full">A'lo natija</span>}
              {isTop && <span className="text-xs font-semibold bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 px-2 py-0.5 rounded-full inline-flex items-center gap-1"><Trophy className="h-3 w-3" /> #1</span>}
            </div>
            <p className="text-sm text-muted-foreground">{(student as any).groups?.name || "—"}</p>
          </div>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard value={total.toFixed(1)} label="Jami ball" color="text-info" />
        <StatCard value={att + "%"} label="Davomat" color="text-success" />
        <StatCard value={"#" + (rank || "—")} label="Reyting" color="text-purple-600" />
        <StatCard value={(rewardNet >= 0 ? "+" : "") + rewardNet.toFixed(0)} label="Mukofot/Jarima" color={rewardNet >= 0 ? "text-success" : "text-destructive"} />
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview">
        <TabsList className="bg-transparent border-b w-full justify-start h-auto p-0 rounded-none flex-wrap">
          {[
            { v: "overview", l: "Umumiy" },
            { v: "att", l: "Davomat" },
            { v: "rewards", l: "Mukofot/Jarima" },
            { v: "exams", l: "Imtihonlar" },
            { v: "analytics", l: "Tahlil" },
          ].map((tab) => (
            <TabsTrigger key={tab.v} value={tab.v} className="rounded-none border-b-2 border-transparent data-[state=active]:border-info data-[state=active]:bg-transparent data-[state=active]:text-info pb-2">
              {tab.l}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* OVERVIEW */}
        <TabsContent value="overview" className="mt-4 space-y-4">
          <Panel icon={<Calendar className="h-4 w-4 text-info" />} title="Davomat statistikasi">
            <div className="flex flex-col items-center py-4">
              <div className="relative h-32 w-32">
                <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
                  <circle cx="50" cy="50" r="42" fill="none" stroke="hsl(var(--muted))" strokeWidth="8" />
                  <circle cx="50" cy="50" r="42" fill="none" stroke="hsl(var(--success))" strokeWidth="8" strokeLinecap="round"
                    strokeDasharray={`${(att / 100) * 263.9} 263.9`} />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-2xl font-bold text-success">{att}%</span>
                  <span className="text-[10px] text-muted-foreground">davomat</span>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              <Cell value={recs.length} label="Jami dars" Icon={Circle} tone="muted" />
              <Cell value={cntKelgan} label="Kelgan" Icon={Check} tone="success" />
              <Cell value={cntLate} label="Kechikkan" Icon={Clock} tone="warning" />
              <Cell value={cntAbsent} label="Kelmagan" Icon={X} tone="destructive" />
            </div>
          </Panel>

          <Panel icon={<Sparkles className="h-4 w-4 text-amber-500" />} title="Ball taqsimoti">
            <div className="space-y-2">
              <BallRow label="Davomat ballari" value={attScore} tone="info" />
              <BallRow label="Mukofot ballari" value={rewardSum} tone="success" />
              <BallRow label="Jarima ballari" value={penaltySum} tone="destructive" />
              <div className="flex items-center justify-between rounded-lg bg-foreground text-background px-4 py-2.5 mt-2">
                <span className="font-semibold text-sm">Jami ball</span>
                <span className="font-bold">{total.toFixed(1)}</span>
              </div>
            </div>
          </Panel>

          <Panel icon={<User className="h-4 w-4 text-muted-foreground" />} title="Qo'shimcha ma'lumotlar">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
              <Info label="A'zo bo'lgan sana" value={new Date(student.created_at as string).toLocaleDateString("uz-UZ", { day: "numeric", month: "short", year: "numeric" })} />
              {student.phone && <Info label="Telefon" value={student.phone} />}
              {(student as any).notes && <Info label="Izoh" value={(student as any).notes} />}
            </div>
          </Panel>
        </TabsContent>

        {/* ATTENDANCE */}
        <TabsContent value="att" className="mt-4">
          <Panel icon={<Calendar className="h-4 w-4 text-info" />} title="Davomat tarixi" right={<span className="text-xs bg-muted px-2 py-0.5 rounded-full">{recs.length} ta yozuv</span>}>
            {recs.length === 0 ? <Empty Icon={Calendar} text="Davomat ma'lumotlari topilmadi" /> : (
              <div className="space-y-1.5">
                {[...recs].sort((a, b) => b.date.localeCompare(a.date)).map((r) => {
                  const st = r.status as AttendanceStatus;
                  const Icon = ICONS[st];
                  const sty = STATUS_STYLES[st];
                  return (
                    <div key={r.id} className={cn("flex items-center gap-3 rounded-lg border px-3 py-2.5", `bg-${st === "present" ? "success" : st === "late" ? "warning" : st === "absent" ? "destructive" : "muted"}/5`)}>
                      <div className={cn("h-8 w-8 rounded-full inline-flex items-center justify-center", sty.bg, sty.text)}><Icon className="h-4 w-4" /></div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-sm">{new Date(r.date).toLocaleDateString("uz-UZ", { day: "numeric", month: "short", year: "numeric" })}</div>
                        {r.note && <div className="text-xs text-muted-foreground truncate">{r.note}</div>}
                      </div>
                      <span className={cn("text-xs font-semibold px-2.5 py-1 rounded-full", sty.bg, sty.text)}>{STATUS_LABEL[st]}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </Panel>
        </TabsContent>

        {/* REWARDS */}
        <TabsContent value="rewards" className="mt-4">
          <Panel icon={<Trophy className="h-4 w-4 text-purple-500" />} title="Mukofot va jarima tarixi"
            right={<div className="flex gap-1.5"><span className="text-xs bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 px-2 py-0.5 rounded-full">+{rewardSum} mukofot</span><span className="text-xs bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300 px-2 py-0.5 rounded-full">{penaltySum} jarima</span></div>}>
            {rewards.length === 0 ? <Empty Icon={Award} text="Mukofot yoki jarima ma'lumotlari topilmadi" sub="Bu o'quvchiga hali mukofot yoki jarima berilmagan" /> : (
              <div className="space-y-1.5">
                {[...rewards].sort((a, b) => b.date.localeCompare(a.date)).map((r) => {
                  const positive = Number(r.points) > 0;
                  return (
                    <div key={r.id} className={cn("flex items-center gap-3 rounded-lg border px-3 py-2.5", positive ? "bg-success/5 border-success/20" : "bg-destructive/5 border-destructive/20")}>
                      <div className={cn("h-8 w-8 rounded-full inline-flex items-center justify-center", positive ? "bg-success text-success-foreground" : "bg-destructive text-destructive-foreground")}>
                        {positive ? <Trophy className="h-4 w-4" /> : <X className="h-4 w-4" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-sm">{r.reason || (positive ? "Mukofot" : "Jarima")}</div>
                        <div className="text-xs text-muted-foreground">{new Date(r.date).toLocaleDateString("uz-UZ", { day: "numeric", month: "short", year: "numeric" })}</div>
                      </div>
                      <span className={cn("font-bold text-sm", positive ? "text-success" : "text-destructive")}>{positive ? "+" : ""}{Number(r.points)}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </Panel>
        </TabsContent>

        {/* EXAMS */}
        <TabsContent value="exams" className="mt-4">
          <Panel icon={<BookOpen className="h-4 w-4 text-info" />} title="Barcha imtihon natijalari">
            <Empty Icon={BookOpen} text="Imtihon natijalari topilmadi" sub="Bu o'quvchi hali imtihon topshirmagan" />
          </Panel>
        </TabsContent>

        {/* ANALYTICS */}
        <TabsContent value="analytics" className="mt-4 space-y-4">
          <Panel icon={<TrendingUp className="h-4 w-4 text-success" />} title="Davomat Dinamikasi">
            {recs.length === 0 ? <Empty Icon={BarChart3} text="Yetarli ma'lumot yo'q" /> : (
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={buildTrend(recs)}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} domain={[0, 100]} />
                    <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                    <Line type="monotone" dataKey="score" stroke="hsl(var(--info))" strokeWidth={2} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </Panel>

          <Panel icon={<BarChart3 className="h-4 w-4 text-purple-500" />} title="So'nggi Mukofot va Jarimalar">
            {rewards.length === 0 ? <Empty Icon={Award} text="Mukofot/Jarima tarixi mavjud emas" sub="Kamida 1 ta mukofot yoki jarima kerak" /> : (
              <div className="space-y-1">
                {[...rewards].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5).map((r) => (
                  <div key={r.id} className="flex items-center justify-between text-sm py-1.5 border-b last:border-0">
                    <span className="truncate">{r.reason || "—"}</span>
                    <span className={cn("font-semibold", Number(r.points) >= 0 ? "text-success" : "text-destructive")}>{Number(r.points) > 0 ? "+" : ""}{Number(r.points)}</span>
                  </div>
                ))}
              </div>
            )}
          </Panel>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function buildTrend(recs: any[]) {
  const sorted = [...recs].sort((a, b) => a.date.localeCompare(b.date));
  let total = 0, count = 0;
  return sorted.map((r) => {
    count++;
    if (r.status === "present" || r.status === "late") total++;
    const score = Math.round((total / count) * 100);
    const d = new Date(r.date);
    return { label: `${d.getDate()}-${d.toLocaleDateString("uz", { month: "short" })}`, score };
  });
}

function StatCard({ value, label, color }: { value: string; label: string; color: string }) {
  return (
    <div className="rounded-xl border bg-card p-3 text-center">
      <div className={cn("text-2xl font-bold", color)}>{value}</div>
      <div className={cn("text-xs mt-0.5", color, "opacity-80")}>{label}</div>
    </div>
  );
}

function Panel({ icon, title, right, children }: { icon: React.ReactNode; title: string; right?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border bg-card shadow-soft p-4">
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="inline-flex items-center gap-2 font-semibold text-sm">{icon} {title}</div>
        {right}
      </div>
      {children}
    </div>
  );
}

function Cell({ value, label, Icon, tone }: { value: number | string; label: string; Icon: any; tone: "muted" | "success" | "warning" | "destructive" }) {
  const map = {
    muted: "bg-muted text-muted-foreground",
    success: "bg-success/15 text-success",
    warning: "bg-warning/15 text-warning",
    destructive: "bg-destructive/15 text-destructive",
  };
  return (
    <div className="rounded-xl border bg-card p-3 flex flex-col items-center text-center">
      <div className={cn("h-9 w-9 rounded-full inline-flex items-center justify-center mb-1", map[tone])}><Icon className="h-4 w-4" /></div>
      <div className="text-lg font-bold">{value}</div>
      <div className="text-[11px] text-muted-foreground">{label}</div>
    </div>
  );
}

function BallRow({ label, value, tone }: { label: string; value: number; tone: "info" | "success" | "destructive" }) {
  const bg = { info: "bg-info/5", success: "bg-success/5", destructive: "bg-destructive/5" }[tone];
  const fg = { info: "text-info", success: "text-success", destructive: "text-destructive" }[tone];
  const sign = tone === "success" ? "+" : tone === "destructive" ? "" : value >= 0 ? "+" : "";
  return (
    <div className={cn("flex items-center justify-between rounded-lg border px-3 py-2", bg)}>
      <span className="text-sm">{label}</span>
      <span className={cn("font-bold text-sm", fg)}>{sign}{value.toFixed(1)}</span>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-muted/40 px-3 py-2">
      <div className="text-[11px] text-muted-foreground">{label}</div>
      <div className="text-sm font-semibold">{value}</div>
    </div>
  );
}

function Empty({ Icon, text, sub }: { Icon: any; text: string; sub?: string }) {
  return (
    <div className="py-10 flex flex-col items-center text-center text-muted-foreground">
      <Icon className="h-10 w-10 opacity-30 mb-2" />
      <p className="text-sm font-medium">{text}</p>
      {sub && <p className="text-xs mt-1">{sub}</p>}
    </div>
  );
}
