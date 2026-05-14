import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { Archive, Database } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/dashboard/system")({
  component: SystemLayout,
});

function SystemLayout() {
  const { t } = useTranslation();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const tabs = [
    { to: "/dashboard/system/archive", icon: Archive, label: t("system.archive") },
    { to: "/dashboard/system/data", icon: Database, label: t("system.data") },
  ];
  const isExact = path === "/dashboard/system" || path === "/dashboard/system/";

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 flex-wrap">
        {tabs.map((tab) => {
          const active = (isExact && tab.to.endsWith("/archive")) || path.startsWith(tab.to);
          return (
            <Link
              key={tab.to}
              to={tab.to}
              className={cn(
                "inline-flex items-center gap-2 h-10 px-4 rounded-lg border text-sm font-medium transition-colors",
                active
                  ? "bg-card border-border shadow-soft text-foreground"
                  : "bg-transparent border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/50",
              )}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </Link>
          );
        })}
      </div>
      <Outlet />
    </div>
  );
}
