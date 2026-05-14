import * as React from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { Search, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

export function ArchiveView() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [q, setQ] = React.useState("");

  // Archive views — currently no archived flag in DB, so all return empty.
  // Once an "archived_at" column exists we'll filter by it; until then show empty states.
  const { data: students = [] } = useQuery({
    queryKey: ["archive-students", user?.id, q],
    enabled: !!user,
    queryFn: async () => {
      // No archived field yet — return empty list to match design's empty state.
      return [] as { id: string; full_name: string }[];
    },
  });
  const { data: groups = [] } = useQuery({
    queryKey: ["archive-groups", user?.id, q],
    enabled: !!user,
    queryFn: async () => [] as { id: string; name: string }[],
  });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">{t("system.archiveTitle")}</h1>
        <p className="text-sm text-muted-foreground mt-0.5">{t("system.archiveSubtitle")}</p>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("system.searchPh")} className="pl-9 h-11 rounded-xl" />
      </div>

      <Tabs defaultValue="students">
        <TabsList className="bg-muted/40">
          <TabsTrigger value="students">{t("system.students")}</TabsTrigger>
          <TabsTrigger value="groups">{t("system.groups")}</TabsTrigger>
          <TabsTrigger value="exams">{t("system.exams")}</TabsTrigger>
        </TabsList>

        <TabsContent value="students" className="mt-3">
          <EmptyCard icon={<Users className="h-10 w-10" />} text={t("system.emptyStudents")} />
        </TabsContent>
        <TabsContent value="groups" className="mt-3">
          <EmptyCard icon={<Users className="h-10 w-10" />} text={t("system.emptyGroups")} />
        </TabsContent>
        <TabsContent value="exams" className="mt-3">
          <EmptyCard icon={<Users className="h-10 w-10" />} text={t("system.emptyExams")} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function EmptyCard({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="rounded-xl border bg-card shadow-soft py-20 flex flex-col items-center text-muted-foreground">
      <div className="opacity-40 mb-3">{icon}</div>
      <p className="text-sm">{text}</p>
    </div>
  );
}
