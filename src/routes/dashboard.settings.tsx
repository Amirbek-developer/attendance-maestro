import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export const Route = createFileRoute("/dashboard/settings")({ component: SettingsPage });

function SettingsPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id], enabled: !!user,
    queryFn: async () => (await supabase.from("profiles").select("*").eq("id", user!.id).maybeSingle()).data,
  });
  const [name, setName] = React.useState("");
  const [school, setSchool] = React.useState("");
  React.useEffect(() => { if (profile) { setName(profile.full_name); setSchool(profile.school_name); } }, [profile]);

  const save = useMutation({
    mutationFn: async () => { const { error } = await supabase.from("profiles").update({ full_name: name, school_name: school }).eq("id", user!.id); if (error) throw error; },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["profile"] }); toast.success(t("common.success")); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="max-w-xl space-y-5">
      <h1 className="text-2xl font-bold">{t("nav.settings")}</h1>
      <div className="rounded-xl border bg-card shadow-soft p-5 space-y-4">
        <div><Label>{t("auth.fullName")}</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
        <div><Label>{t("auth.school")}</Label><Input value={school} onChange={(e) => setSchool(e.target.value)} /></div>
        <div><Label>{t("auth.email")}</Label><Input value={user?.email || ""} disabled /></div>
        <Button onClick={() => save.mutate()} disabled={save.isPending}>{t("common.save")}</Button>
      </div>
    </div>
  );
}
