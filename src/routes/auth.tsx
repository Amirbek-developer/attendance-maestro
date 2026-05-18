import * as React from "react";
import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { z } from "zod";
import { toast } from "sonner";
import { User, Mail, Lock, Eye, EyeOff, Trophy, Building2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { LangToggle } from "@/components/topbar/lang-toggle";
import { ThemeToggle } from "@/components/topbar/theme-toggle";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

const search = z.object({ tab: z.enum(["login", "register"]).optional() });
const TOKEN_KEY = "upro.session_token";
const SESSION_STALE_MS = 2 * 60 * 1000;

async function hasActiveSession(userId: string) {
  const { data, error } = await supabase
    .from("active_sessions")
    .select("session_token,last_seen")
    .eq("user_id", userId)
    .maybeSingle();

  if (error || !data?.session_token || !data.last_seen) return false;

  const localToken = localStorage.getItem(`${TOKEN_KEY}.${userId}`);
  const lastSeenMs = new Date(data.last_seen).getTime();
  return data.session_token !== localToken && Date.now() - lastSeenMs < SESSION_STALE_MS;
}

export const Route = createFileRoute("/auth")({
  validateSearch: search,
  component: AuthPage,
});

function AuthPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const sp = useSearch({ from: "/auth" });
  const [tab, setTab] = React.useState<"login" | "register">(sp.tab ?? "login");

  React.useEffect(() => {
    if (!loading && user) navigate({ to: "/dashboard" });
  }, [user, loading, navigate]);

  return (
    <div className="relative min-h-screen bg-muted/40 flex items-center justify-center px-4 py-10">
      <div className="absolute top-4 right-4 flex items-center gap-1">
        <LangToggle />
        <ThemeToggle />
      </div>

      <div className="w-full max-w-md rounded-2xl border bg-card shadow-soft p-7 sm:p-9">
        <div className="flex flex-col items-center text-center">
          <div className="h-14 w-14 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center shadow-soft">
            <User className="h-6 w-6" />
          </div>
          <h1 className="mt-4 text-2xl font-bold tracking-tight">
            {tab === "login" ? t("auth.welcome") : t("auth.joinTitle")}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {tab === "login" ? t("auth.loginSubtitle") : t("auth.joinSubtitle")}
          </p>
        </div>

        <button
          type="button"
          className="mt-5 w-full rounded-full bg-gradient-accent text-accent-foreground font-semibold text-sm py-3 px-4 flex items-center justify-center gap-2 shadow-glow transition-transform hover:scale-[1.01]"
          onClick={() => toast.info(t("common.comingSoon"))}
        >
          <Trophy className="h-4 w-4" />
          {t("auth.ratingCta")}
        </button>

        <Tabs value={tab} onValueChange={(v) => setTab(v as "login" | "register")} className="mt-5">
          <TabsList className="grid grid-cols-2 w-full bg-muted h-11 p-1 rounded-lg">
            <TabsTrigger value="login" className="text-sm font-semibold rounded-md data-[state=active]:bg-card data-[state=active]:shadow-sm">{t("auth.login")}</TabsTrigger>
            <TabsTrigger value="register" className="text-sm font-semibold rounded-md data-[state=active]:bg-card data-[state=active]:shadow-sm">{t("auth.register")}</TabsTrigger>
          </TabsList>

          <TabsContent value="login" className="mt-5">
            <LoginForm />
          </TabsContent>
          <TabsContent value="register" className="mt-5">
            <RegisterForm onDone={() => setTab("login")} />
          </TabsContent>
        </Tabs>

        <Divider label={t("auth.or")} />

        <button
          type="button"
          onClick={async () => {
            const { error } = await supabase.auth.signInWithOAuth({
              provider: "google",
              options: { redirectTo: window.location.origin + "/dashboard" },
            });
            if (error) toast.error(error.message);
          }}
          className="w-full rounded-lg border bg-card hover:bg-accent/5 text-sm font-medium py-2.5 flex items-center justify-center gap-3"
        >
          <GoogleIcon /> {tab === "login" ? t("auth.googleSignIn") : t("auth.googleSignUp")}
        </button>
      </div>
    </div>
  );
}

function Divider({ label }: { label: string }) {
  return (
    <div className="my-5 flex items-center gap-3 text-[10px] tracking-[0.2em] text-muted-foreground/70">
      <div className="h-px flex-1 bg-border" /> {label} <div className="h-px flex-1 bg-border" />
    </div>
  );
}

function LoginForm() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [show, setShow] = React.useState(false);
  const [busy, setBusy] = React.useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) { setBusy(false); return toast.error(error.message); }
    if (data.user && await hasActiveSession(data.user.id)) {
      await supabase.auth.signOut();
      setBusy(false);
      return toast.error("Bu akkaunt boshqa qurilmada ochiq. Avval o‘sha joydan chiqing.");
    }
    setBusy(false);
    toast.success(t("common.success"));
    // Don't navigate here — AuthPage's useEffect will redirect once `user` is hydrated.
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <Field id="email" label={t("auth.email")} icon={<Mail className="h-4 w-4" />}>
        <Input id="email" type="email" required placeholder={t("auth.emailPh")} value={email} onChange={(e) => setEmail(e.target.value)} className="pl-9 h-11" />
      </Field>
      <div>
        <Field id="password" label={t("auth.password")} icon={<Lock className="h-4 w-4" />} right={
          <button type="button" onClick={() => setShow((s) => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
            {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        }>
          <Input id="password" type={show ? "text" : "password"} required minLength={6} placeholder={t("auth.passwordPh")} value={password} onChange={(e) => setPassword(e.target.value)} className="pl-9 pr-9 h-11" />
        </Field>
        <p className="mt-1.5 text-xs text-muted-foreground">{t("auth.passwordHint")}</p>
      </div>
      <Button type="submit" disabled={busy} className="w-full h-11 rounded-lg font-semibold">
        {busy && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
        {t("auth.signIn")}
      </Button>
    </form>
  );
}

function RegisterForm({ onDone }: { onDone: () => void }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [fullName, setFullName] = React.useState("");
  const [school, setSchool] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [show, setShow] = React.useState(false);
  const [busy, setBusy] = React.useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.signUp({
      email, password,
      options: {
        emailRedirectTo: window.location.origin + "/dashboard",
        data: { full_name: fullName, school_name: school },
      },
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success(t("common.success"));
    // Auto-confirm enabled — try direct sign in; AuthPage useEffect will redirect.
    const { error: e2 } = await supabase.auth.signInWithPassword({ email, password });
    if (e2) onDone();
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <Field id="fname" label={`${t("auth.fullName")} *`} icon={<User className="h-4 w-4" />}>
        <Input id="fname" required placeholder={t("auth.fullNamePh")} value={fullName} onChange={(e) => setFullName(e.target.value)} className="pl-9 h-11" />
      </Field>
      <Field id="school" label={`${t("auth.school")} *`} icon={<Building2 className="h-4 w-4" />}>
        <Input id="school" required placeholder={t("auth.schoolPh")} value={school} onChange={(e) => setSchool(e.target.value)} className="pl-9 h-11" />
      </Field>
      <Field id="remail" label={t("auth.email")} icon={<Mail className="h-4 w-4" />}>
        <Input id="remail" type="email" required placeholder={t("auth.emailPh")} value={email} onChange={(e) => setEmail(e.target.value)} className="pl-9 h-11" />
      </Field>
      <Field id="rpassword" label={t("auth.password")} icon={<Lock className="h-4 w-4" />} right={
        <button type="button" onClick={() => setShow((s) => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      }>
        <Input id="rpassword" type={show ? "text" : "password"} required minLength={6} placeholder={t("auth.passwordPh")} value={password} onChange={(e) => setPassword(e.target.value)} className="pl-9 pr-9 h-11" />
      </Field>
      <Button type="submit" disabled={busy} className="w-full h-11 rounded-lg font-semibold">
        {busy && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
        {t("auth.signUp")}
      </Button>
    </form>
  );
}

function Field({ id, label, icon, right, children }: { id: string; label: string; icon?: React.ReactNode; right?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div>
      <Label htmlFor={id} className="text-sm font-semibold mb-1.5 block">{label}</Label>
      <div className="relative">
        {icon && <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">{icon}</span>}
        {children}
        {right}
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.99.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A10.97 10.97 0 0 0 1 12c0 1.77.42 3.45 1.18 4.93l3.66-2.84z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
  );
}
