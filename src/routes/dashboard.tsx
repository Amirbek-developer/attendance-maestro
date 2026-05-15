import * as React from "react";
import { createFileRoute, Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import {
  LayoutGrid, GraduationCap, FileCheck2, Trophy, Sparkles, Database,
  Settings, LogOut, Menu, Clock, X,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { LangToggle } from "@/components/topbar/lang-toggle";
import { ThemeToggle } from "@/components/topbar/theme-toggle";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/dashboard")({
  component: DashboardLayout,
});

function DashboardLayout() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [hover, setHover] = React.useState(false);
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const [demoDismissed, setDemoDismissed] = React.useState(false);

  React.useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [user, loading, navigate]);

  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*").eq("id", user!.id).maybeSingle();
      return data;
    },
  });

  if (loading || !user) {
    return <div className="min-h-screen flex items-center justify-center text-muted-foreground">…</div>;
  }

  const items = [
    { to: "/dashboard", icon: LayoutGrid, label: t("nav.overview"), exact: true },
    { to: "/dashboard/academy", icon: GraduationCap, label: t("nav.academy") },
    { to: "/dashboard/exams", icon: FileCheck2, label: t("nav.exams") },
    { to: "/dashboard/rating", icon: Trophy, label: t("nav.rating") },
    { to: "/dashboard/ai", icon: Sparkles, label: t("nav.aiAssistant") },
    { to: "/dashboard/system", icon: Database, label: t("nav.system") },
  ];

  const expanded = hover || mobileOpen;
  const fullName = profile?.full_name || user.email?.split("@")[0] || "";
  const firstName = fullName.split(" ")[0] || fullName;

  return (
    <div className="min-h-screen bg-muted/30 flex">
      {/* Sidebar */}
      <aside
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        className={cn(
          "hidden md:flex fixed left-0 top-0 h-screen z-40 flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border transition-all duration-300 ease-out",
          expanded ? "w-60" : "w-16",
        )}
      >
        <div className="h-14 flex items-center px-3 border-b border-sidebar-border shrink-0">
          <div className="h-8 w-8 rounded-md bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm shrink-0">T</div>
          <span className={cn("ml-2 font-bold tracking-tight whitespace-nowrap transition-opacity", expanded ? "opacity-100" : "opacity-0")}>TeachPro</span>
        </div>
        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-1">
          {items.map((it) => (
            <SidebarLink key={it.to} {...it} expanded={expanded} />
          ))}
        </nav>
        <div className="border-t border-sidebar-border p-2 space-y-1">
          <SidebarLink to="/dashboard/settings" icon={Settings} label={t("nav.settings")} expanded={expanded} />
          <button
            onClick={async () => { await supabase.auth.signOut(); navigate({ to: "/auth" }); toast.success(t("auth.signOut")); }}
            className={cn(
              "w-full flex items-center gap-3 rounded-md px-3 h-10 text-sm font-medium text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors",
            )}
          >
            <LogOut className="h-4 w-4 shrink-0" />
            <span className={cn("whitespace-nowrap transition-opacity", expanded ? "opacity-100" : "opacity-0")}>{t("nav.signOut")}</span>
          </button>
        </div>
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 bg-foreground/40" onClick={() => setMobileOpen(false)}>
          <aside className="absolute left-0 top-0 h-full w-60 bg-sidebar text-sidebar-foreground border-r border-sidebar-border flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="h-14 flex items-center justify-between px-3 border-b border-sidebar-border">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-md bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm">T</div>
                <span className="font-bold">TeachPro</span>
              </div>
              <button onClick={() => setMobileOpen(false)}><X className="h-5 w-5" /></button>
            </div>
            <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-1" onClick={() => setMobileOpen(false)}>
              {items.map((it) => <SidebarLink key={it.to} {...it} expanded />)}
            </nav>
            <div className="border-t border-sidebar-border p-2 space-y-1">
              <SidebarLink to="/dashboard/settings" icon={Settings} label={t("nav.settings")} expanded />
              <button
                onClick={async () => { await supabase.auth.signOut(); navigate({ to: "/auth" }); }}
                className="w-full flex items-center gap-3 rounded-md px-3 h-10 text-sm font-medium text-muted-foreground hover:bg-sidebar-accent"
              >
                <LogOut className="h-4 w-4" /> <span>{t("nav.signOut")}</span>
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* Main */}
      <div className="flex-1 md:ml-16 flex flex-col min-w-0">
        <header className="sticky top-0 z-30 h-14 bg-background/80 backdrop-blur border-b flex items-center px-3 sm:px-5 gap-3">
          <button className="md:hidden" onClick={() => setMobileOpen(true)} aria-label="Menu">
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="h-8 w-8 rounded-md bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm shrink-0">T</div>
            <div className="min-w-0">
              <div className="text-sm font-bold leading-tight truncate">TeachPro</div>
              <div className="text-[11px] text-muted-foreground leading-tight truncate">
                {t("auth.welcome")}, {fullName}
              </div>
            </div>
          </div>
          <div className="ml-auto flex items-center gap-1">
            <LangToggle />
            <ThemeToggle />
          </div>
        </header>

        <main className="flex-1 px-3 sm:px-6 py-5">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

function SidebarLink({ to, icon: Icon, label, expanded, exact }: any) {
  const state = useRouterState({ select: (s) => s.location.pathname });
  const active = exact ? state === to : state === to || state.startsWith(to + "/");
  return (
    <Link
      to={to}
      className={cn(
        "flex items-center gap-3 rounded-md px-3 h-10 text-sm font-medium transition-colors",
        active
          ? "bg-sidebar-accent text-sidebar-accent-foreground"
          : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
      )}
    >
      <Icon className={cn("h-4 w-4 shrink-0", active && "text-foreground")} />
      <span className={cn("whitespace-nowrap transition-opacity", expanded ? "opacity-100" : "opacity-0")}>{label}</span>
    </Link>
  );
}
