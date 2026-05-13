import * as React from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Plus, Check, RotateCcw, Calendar, FileText, Trophy, Award, Minus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import { UserPlus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { STATUS_POINTS, STATUS_STYLES, nextStatus, fmtDate, type AttendanceStatus } from "@/lib/scoring";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/dashboard/academy/$groupId")({
  component: GroupDetail,
});

function GroupDetail() {
  const { t } = useTranslation();
  const { groupId } = Route.useParams();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [date, setDate] = React.useState(fmtDate(new Date()));

  const { data: group } = useQuery({
    queryKey: ["group", groupId], enabled: !!user,
    queryFn: async () => (await supabase.from("groups").select("*").eq("id", groupId).maybeSingle()).data,
  });
  const { data: students = [] } = useQuery({
    queryKey: ["group-students", groupId], enabled: !!user,
    queryFn: async () => (await supabase.from("students").select("id,full_name,attendance_records(date,status),reward_records(points,reason,date)").eq("group_id", groupId).order("full_name")).data || [],
  });

  const enriched = students.map((s: any) => {
    const todayRec = (s.attendance_records || []).find((r: any) => r.date === date);
    const score = (s.attendance_records || []).reduce((a: number, r: any) => a + (STATUS_POINTS[r.status as AttendanceStatus] || 0), 0)
      + (s.reward_records || []).reduce((a: number, r: any) => a + Number(r.points), 0);
    const rewardSum = (s.reward_records || []).reduce((a: number, r: any) => a + Number(r.points), 0);
    return { ...s, today: todayRec?.status as AttendanceStatus | undefined, score, rewardSum };
  });

  const allDates = React.useMemo(() => {
    const set = new Set<string>();
    students.forEach((s: any) => (s.attendance_records || []).forEach((r: any) => set.add(r.date)));
    return Array.from(set).sort();
  }, [students]);

  const setStatus = useMutation({
    mutationFn: async ({ studentId, status }: { studentId: string; status: AttendanceStatus }) => {
      const { error } = await supabase.from("attendance_records").upsert({
        student_id: studentId, group_id: groupId, user_id: user!.id, date, status,
      }, { onConflict: "student_id,date" });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["group-students", groupId] }),
    onError: (e: any) => toast.error(e.message),
  });

  const markAll = useMutation({
    mutationFn: async (status: AttendanceStatus) => {
      const rows = students.map((s: any) => ({ student_id: s.id, group_id: groupId, user_id: user!.id, date, status }));
      const { error } = await supabase.from("attendance_records").upsert(rows, { onConflict: "student_id,date" });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["group-students", groupId] }); toast.success(t("common.success")); },
  });

  const clearDay = useMutation({
    mutationFn: async () => { const { error } = await supabase.from("attendance_records").delete().eq("group_id", groupId).eq("date", date); if (error) throw error; },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["group-students", groupId] }); toast.success(t("common.success")); },
  });

  const delStudent = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("students").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["group-students", groupId] }); qc.invalidateQueries({ queryKey: ["students-all"] }); qc.invalidateQueries({ queryKey: ["groups"] }); toast.success(t("common.success")); },
    onError: (e: any) => toast.error(e.message),
  });

  const ranked = [...enriched].sort((a, b) => b.score - a.score);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <Link to="/dashboard/academy" search={{ tab: "groups" }} className="inline-flex h-8 w-8 items-center justify-center rounded-md hover:bg-muted"><ArrowLeft className="h-4 w-4" /></Link>
        <h1 className="text-2xl font-bold">{group?.name || "—"}</h1>
        <span className="text-sm text-muted-foreground">{t("group.studentsCount", { count: students.length })}</span>
        <div className="ml-auto"><AddStudentDialog groupId={groupId} /></div>
      </div>

      <Tabs defaultValue="daily">
        <TabsList className="bg-transparent border-b w-full justify-start h-auto p-0 rounded-none">
          <TabsTrigger value="daily" className="rounded-none border-b-2 border-transparent data-[state=active]:border-info data-[state=active]:bg-transparent data-[state=active]:text-info pb-2">{t("group.dailyJournal")}</TabsTrigger>
          <TabsTrigger value="att" className="rounded-none border-b-2 border-transparent data-[state=active]:border-info data-[state=active]:bg-transparent data-[state=active]:text-info pb-2">{t("group.attendanceJournal")}</TabsTrigger>
        </TabsList>

        <TabsContent value="daily" className="mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4">
            <div className="rounded-xl border bg-card shadow-soft">
              <div className="flex flex-wrap items-center gap-2 p-3 border-b">
                <div className="inline-flex items-center gap-1.5 rounded-md border px-2.5 h-9 text-sm">
                  <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                  <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="bg-transparent outline-none" />
                </div>
                <Button size="sm" variant="outline" className="border-warning/40 text-warning gap-1.5"><FileText className="h-3.5 w-3.5" />{t("group.addNote")}</Button>
                <Button size="sm" variant="outline" className="border-success/40 text-success gap-1.5" onClick={() => markAll.mutate("present")}><Check className="h-3.5 w-3.5" />{t("group.markAllPresent")}</Button>
                <Button size="sm" variant="outline" className="border-destructive/40 text-destructive gap-1.5" onClick={() => clearDay.mutate()}><RotateCcw className="h-3.5 w-3.5" />{t("group.clear")}</Button>
              </div>
              {students.length === 0 ? (
                <div className="p-10 text-center text-sm text-muted-foreground">{t("group.emptyStudents")}</div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
                    <tr><th className="p-3 text-left w-10">#</th><th className="p-3 text-left">{t("group.student")}</th><th className="p-3 text-left">{t("group.attendance")}</th><th className="p-3 text-left">{t("group.rewardFine")}</th><th className="p-3 text-left">{t("group.totalScore")}</th><th className="p-3"></th></tr>
                  </thead>
                  <tbody>
                    {enriched.map((s: any, i: number) => (
                      <tr key={s.id} className="border-t hover:bg-muted/20">
                        <td className="p-3 text-muted-foreground">{i + 1}</td>
                        <td className="p-3 font-semibold">{s.full_name}</td>
                        <td className="p-3">
                          <button
                            onClick={() => setStatus.mutate({ studentId: s.id, status: nextStatus(s.today || "unknown") })}
                            className={cn("inline-flex items-center justify-center h-7 px-3 rounded-md border text-xs font-bold", STATUS_STYLES[(s.today || "unknown") as keyof typeof STATUS_STYLES].bg, STATUS_STYLES[(s.today || "unknown") as keyof typeof STATUS_STYLES].text)}
                          >
                            {t(`attendance.${s.today || "unknown"}`)}
                          </button>
                        </td>
                        <td className="p-3"><RewardCell studentId={s.id} groupId={groupId} sum={s.rewardSum} /></td>
                        <td className={"p-3 font-bold " + (s.score < 0 ? "text-destructive" : "text-success")}>{s.score.toFixed(1)}</td>
                        <td className="p-3"></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div className="rounded-xl border bg-card shadow-soft">
              <div className="px-4 py-3 border-b flex items-center justify-between">
                <h3 className="text-sm font-semibold">{t("group.classRating")}</h3>
                <span className="text-xs text-muted-foreground">{students.length} {t("group.studentsCount", { count: students.length }).split(" ")[1]}</span>
              </div>
              <div className="p-3 space-y-1.5 max-h-[480px] overflow-y-auto">
                {ranked.length === 0 ? <p className="text-sm text-muted-foreground text-center py-8">{t("group.noData")}</p> :
                  ranked.map((s: any, i: number) => (
                    <div key={s.id} className="flex items-center gap-3 rounded-md p-2 hover:bg-muted/40">
                      <span className="text-xs font-bold text-muted-foreground w-5">{i + 1}</span>
                      <span className="flex-1 text-sm truncate">{s.full_name}</span>
                      <span className={cn("inline-flex items-center justify-center min-w-12 h-7 px-2 rounded-full text-xs font-bold", s.score >= 0 ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive")}>{s.score.toFixed(1)}</span>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="att" className="mt-4">
          <div className="rounded-xl border bg-card shadow-soft p-4">
            <div className="text-sm text-muted-foreground mb-3">{t("group.lessonDays", { n: allDates.length })}</div>
            {students.length === 0 ? <p className="text-center text-sm text-muted-foreground py-10">{t("group.emptyStudents")}</p> : (
              <div className="overflow-x-auto">
                <table className="text-xs">
                  <thead>
                    <tr>
                      <th className="text-left p-2 sticky left-0 bg-card z-10 min-w-[180px]">{t("group.student")}</th>
                      <th className="p-2">%</th>
                      {allDates.map((d) => (
                        <th key={d} className="p-1 text-muted-foreground font-medium">
                          <div>{new Date(d).getDate()}</div>
                          <div className="text-[9px]">{new Date(d).toLocaleDateString("uz", { month: "short" })}</div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {students.map((s: any) => {
                      const recs = s.attendance_records || [];
                      const present = recs.filter((r: any) => r.status === "present" || r.status === "late").length;
                      const att = recs.length ? Math.round((present / recs.length) * 100) : 0;
                      return (
                        <tr key={s.id} className="border-t">
                          <td className="p-2 sticky left-0 bg-card font-semibold">{s.full_name}</td>
                          <td className="p-2 text-muted-foreground">{att}%</td>
                          {allDates.map((d) => {
                            const r = recs.find((x: any) => x.date === d);
                            const st = (r?.status || "unknown") as AttendanceStatus;
                            return <td key={d} className="p-0.5"><div className={cn("h-7 w-7 rounded border inline-flex items-center justify-center font-bold", STATUS_STYLES[st].bg, STATUS_STYLES[st].text)}>{STATUS_STYLES[st].symbol}</div></td>;
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                <Legend />
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Legend() {
  const { t } = useTranslation();
  return (
    <div className="mt-4 flex flex-wrap gap-3 text-xs">
      {(["present","late","absent","unknown"] as AttendanceStatus[]).map((s) => (
        <div key={s} className="flex items-center gap-1.5">
          <div className={cn("h-5 w-5 rounded border inline-flex items-center justify-center font-bold", STATUS_STYLES[s].bg, STATUS_STYLES[s].text)}>{STATUS_STYLES[s].symbol}</div>
          <span className="text-muted-foreground">{t(`group.legend.${s}`)}</span>
        </div>
      ))}
    </div>
  );
}

function RewardCell({ studentId, groupId, sum }: { studentId: string; groupId: string; sum: number }) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = React.useState(false);
  const [points, setPoints] = React.useState("1");
  const [reason, setReason] = React.useState("");
  const [sign, setSign] = React.useState<1 | -1>(1);

  const submit = useMutation({
    mutationFn: async () => {
      const v = sign * Math.abs(parseFloat(points) || 0);
      const { error } = await supabase.from("reward_records").insert({ student_id: studentId, group_id: groupId, user_id: user!.id, points: v, reason });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["group-students", groupId] }); setOpen(false); setPoints("1"); setReason(""); toast.success(t("common.success")); },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className={cn("inline-flex items-center gap-1 h-7 px-2.5 rounded-md border text-xs font-semibold", sum >= 0 ? "border-success/30 text-success bg-success/10" : "border-destructive/30 text-destructive bg-destructive/10")}>
          {sum >= 0 ? <Plus className="h-3 w-3" /> : <Minus className="h-3 w-3" />} {sum.toFixed(1)}
        </button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>{sign > 0 ? t("attendance.addReward") : t("attendance.addPenalty")}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="flex gap-2">
            <Button type="button" variant={sign === 1 ? "default" : "outline"} onClick={() => setSign(1)} className="flex-1 gap-1"><Award className="h-4 w-4" /> {t("attendance.addReward")}</Button>
            <Button type="button" variant={sign === -1 ? "default" : "outline"} onClick={() => setSign(-1)} className="flex-1 gap-1"><Minus className="h-4 w-4" /> {t("attendance.addPenalty")}</Button>
          </div>
          <div><Label>{t("attendance.points")}</Label><Input type="number" step="0.1" min="0" value={points} onChange={(e) => setPoints(e.target.value)} /></div>
          <div><Label>{t("attendance.reason")}</Label><Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder={t("attendance.reasonPh")} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>{t("common.cancel")}</Button>
          <Button onClick={() => submit.mutate()} disabled={submit.isPending}>{t("common.save")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AddStudentDialog({ groupId }: { groupId: string }) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = React.useState(false);
  const [name, setName] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [notes, setNotes] = React.useState("");

  const create = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("students").insert({
        full_name: name.trim(), phone: phone.trim() || null, notes: notes.trim() || null,
        group_id: groupId, user_id: user!.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["group-students", groupId] });
      qc.invalidateQueries({ queryKey: ["students-all"] });
      qc.invalidateQueries({ queryKey: ["groups"] });
      setOpen(false); setName(""); setPhone(""); setNotes("");
      toast.success(t("common.success"));
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="rounded-full gap-1.5"><UserPlus className="h-4 w-4" /> {t("students.addStudent")}</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>{t("students.addTitle")}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>{t("students.nameLabel")}</Label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder={t("students.namePh")} autoFocus /></div>
          <div><Label>{t("students.phoneLabel")}</Label><Input value={phone} onChange={(e) => setPhone(e.target.value)} /></div>
          <div><Label>{t("students.notesLabel")}</Label><Textarea value={notes} onChange={(e) => setNotes(e.target.value)} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>{t("common.cancel")}</Button>
          <Button disabled={!name.trim() || create.isPending} onClick={() => create.mutate()}>{t("common.save")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
