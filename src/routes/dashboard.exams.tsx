import { createFileRoute } from "@tanstack/react-router";
import { FileCheck2 } from "lucide-react";
import { useTranslation } from "react-i18next";

export const Route = createFileRoute("/dashboard/exams")({ component: () => <Placeholder /> });
function Placeholder() {
  const { t } = useTranslation();
  return (
    <div className="rounded-xl border bg-card shadow-soft py-20 flex flex-col items-center text-muted-foreground">
      <FileCheck2 className="h-12 w-12 opacity-30" />
      <h2 className="text-lg font-semibold text-foreground mt-3">{t("nav.exams")}</h2>
      <p className="text-sm mt-1">{t("common.comingSoon")}</p>
    </div>
  );
}
