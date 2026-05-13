import { createFileRoute } from "@tanstack/react-router";
import { Sparkles } from "lucide-react";
import { useTranslation } from "react-i18next";

export const Route = createFileRoute("/dashboard/ai")({ component: () => <Placeholder /> });
function Placeholder() {
  const { t } = useTranslation();
  return (
    <div className="rounded-xl border bg-card shadow-soft py-20 flex flex-col items-center text-muted-foreground">
      <Sparkles className="h-12 w-12 opacity-30 text-accent" />
      <h2 className="text-lg font-semibold text-foreground mt-3">{t("nav.aiAssistant")}</h2>
      <p className="text-sm mt-1">{t("common.comingSoon")}</p>
    </div>
  );
}
