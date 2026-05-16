import * as React from "react";
import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Users, Plus, Pencil, Trash2, Search, TrendingUp, Trophy, Download } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { STATUS_POINTS } from "@/lib/scoring";

export function StudentsTab() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<any>(null);
  const [name, setName] = React.useState("");
  const [groupId, setGroupId] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const [q, setQ] = React.useState("");

  const { data: groups = [] } = useQuery({
    queryKey: ["groups-min", user?.id], enabled: !!user,
    queryFn: async () => (await supabase.from("groups").select("id,name").order("name")).data || [],
  });

  const { data: students = [] } = useQuery({
    queryKey: ["students-all", user?.id], enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("students")
        .select("id,full_name,phone,group_id,groups(name),attendance_records(status),reward_records(points)")
        .order("full_name");
      return data || [];
    },
  });

  const enriched = students.map((s: any) => {
    const recs = s.attendance_records || [];
    const present = recs.filter((r: any) => r.status === "present" || r.status === "late").length;
    const att = recs.length ? Math.round((present / recs.length) * 100) : 0;
    const score = recs.reduce((a: number, r: any) => a + (STATUS_POINTS[r.status as keyof typeof STATUS_POINTS] || 0), 0)
      + (s.reward_records || []).reduce((a: number, r: any) => a + Number(r.points), 0);
    return { ...s, att, score, recCount: recs.length };
  });

  const filtered = enriched.filter((s) => s.full_name.toLowerCase().includes(q.toLowerCase()));
  const total = enriched.length;
  const avgAtt = total ? Math.round(enriched.reduce((a, s) => a + s.att, 0) / total) : 0;
  const avgScore = total ? (enriched.reduce((a, s) => a + s.score, 0) / total).toFixed(1) : "0.0";
  const risky = enriched.filter((s) => s.recCount > 0 && s.att < 70).length;
  const high = enriched.filter((s) => s.att >= 90).length;
  const neg = enriched.filter((s) => s.score < 0).length;
  const noAtt = enriched.filter((s) => s.recCount === 0).length;

  const upsert = useMutation({
    mutationFn: async () => {
      if (!groupId) throw new Error("Guruh tanlang");
      if (editing) {
        const { error } = await supabase.from("students").update({ full_name: name, phone, notes, group_id: groupId }).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("students").insert({ full_name: name, phone, notes, group_id: groupId, user_id: user!.id });
        if (error) throw error;
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["students-all"] }); qc.invalidateQueries({ queryKey: ["groups"] }); setOpen(false); setEditing(null); setName(""); setGroupId(""); setPhone(""); setNotes(""); toast.success(t("common.success")); },
    onError: (e: any) => toast.error(e.message),
  });
  const del = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("students").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["students-all"] }); toast.success(t("common.success")); },
  });

  const startEdit = (s: any) => { setEditing(s); setName(s.full_name); setGroupId(s.group_id); setPhone(s.phone || ""); setNotes(s.notes || ""); setOpen(true); };
  const startCreate = () => { setEditing(null); setName(""); setGroupId(groups[0]?.id || ""); setPhone(""); setNotes(""); setOpen(true); };

  return (
    <div className="rounded-xl border bg-card shadow-soft p-5 space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold">{t("students.title")}</h2>
          <p className="text-sm text-muted-foreground">{t("students.subtitle")}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-1.5"><Download className="h-4 w-4" /> {t("students.export")}</Button>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button onClick={startCreate} className="rounded-full gap-1.5"><Plus className="h-4 w-4" /> {t("students.addStudent")}</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>{editing ? t("students.editTitle") : t("students.addTitle")}</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div><Label>{t("students.nameLabel")}</Label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder={t("students.namePh")} /></div>
                <div><Label>{t("students.groupLabel")}</Label>
                  <Select value={groupId} onValueChange={setGroupId}>
                    <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                    <SelectContent>{groups.map((g: any) => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>{t("students.phoneLabel")}</Label><Input value={phone} onChange={(e) => setPhone(e.target.value)} /></div>
                <div><Label>{t("students.notesLabel")}</Label><Textarea value={notes} onChange={(e) => setNotes(e.target.value)} /></div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>{t("common.cancel")}</Button>
                <Button disabled={!name.trim() || !groupId || upsert.isPending} onClick={() => upsert.mutate()}>{t("common.save")}</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <KPI icon={<Users className="h-4 w-4 text-info" />} label={t("students.total")} value={total} />
        <KPI icon={<TrendingUp className="h-4 w-4 text-success" />} label={t("students.avgAttendance")} value={`${avgAtt}%`} />
        <KPI icon={<Trophy className="h-4 w-4 text-accent" />} label={t("students.avgScore")} value={avgScore} />
      </div>

      <div className="rounded-xl border bg-muted/20 p-4 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
        <div>
          <div className="font-semibold mb-2">{t("students.categories")}</div>
          <Row label={t("students.risky")} value={risky} color="text-destructive" />
          <Row label={t("students.topResult")} value={high} color="text-success" />
          <Row label={t("students.negative")} value={neg} color="text-warning" />
          <Row label={t("students.noAttendance")} value={noAtt} />
        </div>
        <div>
          <div className="font-semibold mb-2">{t("students.attDistribution")}</div>
          {["0-59%", "60-74%", "75-89%", "90-100%"].map((bk, i) => {
            const [lo, hi] = [[0,59],[60,74],[75,89],[90,100]][i];
            const c = enriched.filter((s) => s.recCount > 0 && s.att >= lo && s.att <= hi).length;
            return <Row key={bk} label={bk} value={c} />;
          })}
        </div>
        <div>
          <div className="font-semibold mb-2">{t("students.topRisky")}</div>
          {risky === 0 ? <p className="text-destructive text-xs">{t("students.noRisky")}</p>
            : enriched.filter((s) => s.att < 70 && s.recCount > 0).slice(0, 5).map((s) => (
              <div key={s.id} className="flex justify-between text-xs py-0.5"><span>{s.full_name}</span><span className="text-destructive font-semibold">{s.att}%</span></div>
            ))}
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("students.searchPh")} className="pl-9" />
      </div>

      <div className="rounded-xl border overflow-x-auto">
        <table className="w-full text-sm min-w-[600px]">
          <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
            <tr><th className="text-left p-3">{t("group.student")}</th><th className="text-left p-3">{t("students.groupLabel")}</th><th className="text-left p-3">{t("group.attendance")}</th><th className="text-left p-3">{t("group.totalScore")}</th><th className="p-3"></th></tr>
          </thead>
          <tbody>
            {filtered.map((s: any) => (
              <tr key={s.id} className="border-t hover:bg-muted/20">
                <td className="p-3 font-semibold"><Link to="/dashboard/students/$studentId" params={{ studentId: s.id }} className="hover:text-info hover:underline">{s.full_name}</Link></td>
                <td className="p-3 text-muted-foreground">{s.groups?.name}</td>
                <td className="p-3">{s.recCount > 0 ? `${s.att}%` : "—"}</td>
                <td className={"p-3 font-semibold " + (s.score < 0 ? "text-destructive" : "text-success")}>{s.score.toFixed(1)}</td>
                <td className="p-3 text-right">
                  <button onClick={() => startEdit(s)} className="h-7 w-7 inline-flex items-center justify-center rounded text-info hover:bg-info/10"><Pencil className="h-3.5 w-3.5" /></button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild><button className="h-7 w-7 inline-flex items-center justify-center rounded text-destructive hover:bg-destructive/10"><Trash2 className="h-3.5 w-3.5" /></button></AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader><AlertDialogTitle>{t("common.confirm")}</AlertDialogTitle><AlertDialogDescription>{t("students.confirmDelete")}</AlertDialogDescription></AlertDialogHeader>
                      <AlertDialogFooter><AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel><AlertDialogAction onClick={() => del.mutate(s.id)} className="bg-destructive text-destructive-foreground">{t("common.delete")}</AlertDialogAction></AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && <tr><td colSpan={5} className="p-10 text-center text-muted-foreground text-sm">{t("dashboard.noData")}</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function KPI({ icon, label, value }: any) {
  return (
    <div className="rounded-xl border bg-card p-4 flex items-center gap-3">
      <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center">{icon}</div>
      <div><div className="text-xs text-muted-foreground uppercase tracking-wider">{label}</div><div className="text-xl font-bold">{value}</div></div>
    </div>
  );
}
function Row({ label, value, color = "" }: any) {
  return <div className="flex justify-between py-1 text-xs"><span className="text-muted-foreground">{label}</span><span className={"font-bold " + color}>{value}</span></div>;
}
