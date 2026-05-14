import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { BookOpen, Pencil, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { fmtDate } from "@/lib/scoring";
import { toast } from "sonner";

export const Route = createFileRoute("/dashboard/exams")({
  component: ExamsHub,
});

function ExamsHub() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [groupId, setGroupId] = React.useState<string>("");
  const [date, setDate] = React.useState(fmtDate(new Date()));
  const [type, setType] = React.useState<string>("");
  const [name, setName] = React.useState("");

  const { data: groups = [] } = useQuery({
    queryKey: ["groups-list", user?.id], enabled: !!user,
    queryFn: async () => (await supabase.from("groups").select("id,name").eq("user_id", user!.id).order("name")).data || [],
  });

  const handleCreate = () => {
    if (!groupId) { toast.error(t("exams.groupPh")); return; }
    toast.success(t("common.success") + " — " + (name || t(`exams.${type || "midterm"}`)));
    setName("");
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <BookOpen className="h-7 w-7 text-info" />
        <div>
          <h1 className="text-2xl font-bold leading-tight">{t("exams.title")}</h1>
          <p className="text-sm text-muted-foreground">{t("exams.subtitle")}</p>
        </div>
      </div>

      <Tabs defaultValue="create">
        <TabsList className="bg-muted/40 w-full h-12 p-1 rounded-xl">
          <TabsTrigger value="create" className="flex-1 gap-1.5 rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-sm">
            <Pencil className="h-4 w-4" /> {t("exams.createTab")}
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex-1 gap-1.5 rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-sm">
            <BarChart3 className="h-4 w-4" /> {t("exams.analyticsTab")}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="create" className="mt-4 space-y-4">
          <div className="rounded-xl border border-info/30 bg-info/5 p-5">
            <div className="flex items-center gap-2 mb-1">
              <Pencil className="h-5 w-5 text-info" />
              <h2 className="text-lg font-bold">{t("exams.createTitle")}</h2>
            </div>
            <p className="text-sm text-muted-foreground mb-4">{t("exams.createSubtitle")}</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-semibold">{t("exams.groupLabel")} <span className="text-destructive">*</span></Label>
                <Select value={groupId} onValueChange={setGroupId}>
                  <SelectTrigger className="mt-1.5 bg-card"><SelectValue placeholder={t("exams.groupPh")} /></SelectTrigger>
                  <SelectContent>
                    {groups.map((g: any) => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-sm font-semibold">{t("exams.dateLabel")} <span className="text-destructive">*</span></Label>
                <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="mt-1.5 bg-card" />
              </div>
              <div>
                <Label className="text-sm font-semibold">{t("exams.typeLabel")}</Label>
                <Select value={type} onValueChange={setType}>
                  <SelectTrigger className="mt-1.5 bg-card"><SelectValue placeholder={t("exams.typePh")} /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="midterm">{t("exams.midterm")}</SelectItem>
                    <SelectItem value="final">{t("exams.final")}</SelectItem>
                    <SelectItem value="quiz">{t("exams.quiz")}</SelectItem>
                    <SelectItem value="oral">{t("exams.oral")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-sm font-semibold">{t("exams.nameLabel")}</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={t("exams.namePh")} className="mt-1.5 bg-card" />
              </div>
            </div>

            <Button onClick={handleCreate} className="w-full mt-5 h-11 rounded-full bg-gradient-to-r from-info to-primary text-primary-foreground font-semibold">
              ✓ {t("exams.createBtn")}
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <StepCard num={1} title={t("exams.step1")} desc={t("exams.step1d")} accent="info" />
            <StepCard num={2} title={t("exams.step2")} desc={t("exams.step2d")} accent="warning" />
            <StepCard num={3} title={t("exams.step3")} desc={t("exams.step3d")} accent="success" />
          </div>
        </TabsContent>

        <TabsContent value="analytics" className="mt-4">
          <div className="rounded-xl border bg-card shadow-soft py-20 flex flex-col items-center text-muted-foreground">
            <BarChart3 className="h-12 w-12 opacity-30" />
            <p className="text-sm mt-3">{t("exams.noAnalytics")}</p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function StepCard({ num, title, desc, accent }: { num: number; title: string; desc: string; accent: "info" | "warning" | "success" }) {
  const map = {
    info: "border-info/30 bg-info/5",
    warning: "border-warning/30 bg-warning/5",
    success: "border-success/30 bg-success/5",
  } as const;
  const numMap = {
    info: "bg-info/15 text-info",
    warning: "bg-warning/15 text-warning",
    success: "bg-success/15 text-success",
  } as const;
  return (
    <div className={"rounded-xl border p-4 " + map[accent]}>
      <div className={"h-8 w-8 rounded-md flex items-center justify-center font-bold mb-2 " + numMap[accent]}>{num}</div>
      <h3 className="font-bold text-sm">{title}</h3>
      <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
    </div>
  );
}
