import * as React from "react";
import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Users, GraduationCap, Plus, List, LayoutGrid, Pencil, Trash2, Calendar } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { z } from "zod";
import { StudentsTab } from "@/components/academy/students-tab";

const search = z.object({ tab: z.enum(["groups", "students"]).optional(), view: z.enum(["list", "card"]).optional() });

export const Route = createFileRoute("/dashboard/academy/")({
  validateSearch: search,
  component: Academy,
});

function Academy() {
  const { t } = useTranslation();
  const sp = useSearch({ from: "/dashboard/academy/" });
  const navigate = useNavigate();
  const tab = sp.tab ?? "groups";

  return (
    <div className="space-y-5">
      <Tabs value={tab} onValueChange={(v) => navigate({ to: "/dashboard/academy", search: { tab: v as any } })}>
        <TabsList className="bg-card border h-10 p-1">
          <TabsTrigger value="groups" className="gap-1.5 data-[state=active]:bg-muted px-4">
            <Users className="h-3.5 w-3.5" /> {t("groups.title").split(" ")[0]}
          </TabsTrigger>
          <TabsTrigger value="students" className="gap-1.5 data-[state=active]:bg-muted px-4">
            <GraduationCap className="h-3.5 w-3.5" /> {t("students.title").split(" ")[0]}
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {tab === "groups" ? <GroupsTab /> : <StudentsTab />}
    </div>
  );
}

function GroupsTab() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const qc = useQueryClient();
  const sp = useSearch({ from: "/dashboard/academy/" });
  const navigate = useNavigate();
  const view = sp.view ?? "card";

  const [open, setOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<any>(null);
  const [name, setName] = React.useState("");
  const [desc, setDesc] = React.useState("");

  const { data: groups = [] } = useQuery({
    queryKey: ["groups", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("groups")
        .select("id,name,description,color,created_at,students(count),attendance_records(status)")
        .order("created_at", { ascending: false });
      return data || [];
    },
  });

  const upsert = useMutation({
    mutationFn: async () => {
      if (editing) {
        const { error } = await supabase.from("groups").update({ name, description: desc }).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("groups").insert({ name, description: desc, user_id: user!.id });
        if (error) throw error;
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["groups"] }); setOpen(false); setEditing(null); setName(""); setDesc(""); toast.success(t("common.success")); },
    onError: (e: any) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("groups").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["groups"] }); toast.success(t("common.success")); },
    onError: (e: any) => toast.error(e.message),
  });

  const startEdit = (g: any) => { setEditing(g); setName(g.name); setDesc(g.description || ""); setOpen(true); };
  const startCreate = () => { setEditing(null); setName(""); setDesc(""); setOpen(true); };

  return (
    <div className="rounded-xl border bg-card shadow-soft p-5">
      <div className="flex flex-wrap items-end justify-between gap-3 mb-5">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">{t("groups.title")}</h2>
          <p className="text-sm text-muted-foreground">{t("groups.subtitle")}</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-md border p-0.5 bg-background">
            <button onClick={() => navigate({ to: "/dashboard/academy", search: { tab: "groups", view: "list" } })} className={"h-8 w-8 inline-flex items-center justify-center rounded " + (view === "list" ? "bg-muted" : "")}><List className="h-4 w-4" /></button>
            <button onClick={() => navigate({ to: "/dashboard/academy", search: { tab: "groups", view: "card" } })} className={"h-8 w-8 inline-flex items-center justify-center rounded " + (view === "card" ? "bg-muted" : "")}><LayoutGrid className="h-4 w-4" /></button>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button onClick={startCreate} className="rounded-full gap-1.5"><Plus className="h-4 w-4" /> {t("groups.new")}</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>{editing ? t("groups.editTitle") : t("groups.createTitle")}</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div><Label>{t("groups.nameLabel")}</Label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder={t("groups.namePh")} /></div>
                <div><Label>{t("groups.descLabel")}</Label><Textarea value={desc} onChange={(e) => setDesc(e.target.value)} placeholder={t("groups.descPh")} /></div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>{t("groups.cancel")}</Button>
                <Button disabled={!name.trim() || upsert.isPending} onClick={() => upsert.mutate()}>{t("groups.save")}</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {groups.length === 0 ? (
        <div className="rounded-xl bg-muted/30 border border-dashed py-16 flex flex-col items-center text-center">
          <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center text-muted-foreground"><Users className="h-6 w-6" /></div>
          <h3 className="mt-4 text-lg font-semibold">{t("groups.empty")}</h3>
          <p className="text-sm text-muted-foreground mt-1">{t("groups.emptyHint")}</p>
          <Button onClick={startCreate} className="mt-4 rounded-full"><Plus className="h-4 w-4 mr-1" /> {t("groups.createFirst")}</Button>
        </div>
      ) : view === "card" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {groups.map((g: any) => {
            const recs = g.attendance_records || [];
            const present = recs.filter((r: any) => r.status === "present" || r.status === "late").length;
            const att = recs.length ? Math.round((present / recs.length) * 100) : 0;
            const studentsCount = g.students?.[0]?.count ?? 0;
            return (
              <div key={g.id} className="rounded-xl border bg-card hover:shadow-soft transition-shadow group">
                <Link to="/dashboard/academy/$groupId" params={{ groupId: g.id }} className="block p-4">
                  <div className="font-bold text-lg">{g.name}</div>
                  <div className="grid grid-cols-2 gap-3 mt-3 text-sm">
                    <Stat icon={<Users className="h-3.5 w-3.5 text-info" />} label={t("groups.students")} value={studentsCount} />
                    <Stat icon={<Calendar className="h-3.5 w-3.5 text-success" />} label={t("groups.attendance")} value={`${att}%`} valueClass="text-success" />
                  </div>
                  <div className="text-xs text-muted-foreground mt-3">{new Date(g.created_at).toLocaleDateString()}</div>
                </Link>
                <div className="border-t flex justify-end gap-1 px-3 py-2">
                  <button onClick={() => startEdit(g)} className="h-7 w-7 inline-flex items-center justify-center rounded text-info hover:bg-info/10"><Pencil className="h-3.5 w-3.5" /></button>
                  <DeleteBtn onConfirm={() => del.mutate(g.id)} />
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="rounded-xl border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-muted-foreground text-xs uppercase tracking-wider">
              <tr><th className="text-left p-3">Nom</th><th className="text-left p-3">{t("groups.students")}</th><th className="text-left p-3">{t("groups.attendance")}</th><th className="p-3"></th></tr>
            </thead>
            <tbody>
              {groups.map((g: any) => {
                const recs = g.attendance_records || [];
                const present = recs.filter((r: any) => r.status === "present" || r.status === "late").length;
                const att = recs.length ? Math.round((present / recs.length) * 100) : 0;
                const sc = g.students?.[0]?.count ?? 0;
                return (
                  <tr key={g.id} className="border-t hover:bg-muted/30">
                    <td className="p-3 font-semibold"><Link to="/dashboard/academy/$groupId" params={{ groupId: g.id }} className="hover:underline">{g.name}</Link></td>
                    <td className="p-3">{sc}</td>
                    <td className="p-3 text-success font-semibold">{att}%</td>
                    <td className="p-3 text-right">
                      <button onClick={() => startEdit(g)} className="h-7 w-7 inline-flex items-center justify-center rounded text-info hover:bg-info/10"><Pencil className="h-3.5 w-3.5" /></button>
                      <DeleteBtn onConfirm={() => del.mutate(g.id)} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Stat({ icon, label, value, valueClass = "" }: any) {
  return (
    <div>
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">{icon} {label}</div>
      <div className={"text-lg font-bold mt-0.5 " + valueClass}>{value}</div>
    </div>
  );
}

function DeleteBtn({ onConfirm }: { onConfirm: () => void }) {
  const { t } = useTranslation();
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <button className="h-7 w-7 inline-flex items-center justify-center rounded text-destructive hover:bg-destructive/10"><Trash2 className="h-3.5 w-3.5" /></button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader><AlertDialogTitle>{t("common.confirm")}</AlertDialogTitle><AlertDialogDescription>{t("groups.confirmDelete")}</AlertDialogDescription></AlertDialogHeader>
        <AlertDialogFooter><AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel><AlertDialogAction onClick={onConfirm} className="bg-destructive text-destructive-foreground">{t("common.delete")}</AlertDialogAction></AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
