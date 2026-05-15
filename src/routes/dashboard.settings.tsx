import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { useTheme } from "@/components/providers/theme-provider";
import { useLang } from "@/components/providers/i18n-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from "@/components/ui/accordion";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader,
  AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  User, Palette, Languages, Lock, Bell, HelpCircle, Trash2, Save, Sun, Moon,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/dashboard/settings")({ component: SettingsPage });

function Section({
  icon: Icon, title, desc, children,
}: { icon: any; title: string; desc?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border bg-card shadow-sm p-5 space-y-4">
      <div className="flex items-start gap-3">
        <div className="h-9 w-9 rounded-md bg-primary/10 text-primary flex items-center justify-center shrink-0">
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <h2 className="text-base font-semibold leading-tight">{title}</h2>
          {desc && <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>}
        </div>
      </div>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function SettingsPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const qc = useQueryClient();
  const { theme, setTheme } = useTheme();
  const { lang, setLang } = useLang();

  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id], enabled: !!user,
    queryFn: async () => (await supabase.from("profiles").select("*").eq("id", user!.id).maybeSingle()).data,
  });

  const [name, setName] = React.useState("");
  const [school, setSchool] = React.useState("");
  const [phone, setPhone] = React.useState("");
  React.useEffect(() => {
    if (profile) {
      setName(profile.full_name || "");
      setSchool(profile.school_name || "");
    }
    if (user?.phone) setPhone(user.phone);
  }, [profile, user]);

  const saveProfile = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("profiles")
        .update({ full_name: name, school_name: school }).eq("id", user!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["profile"] });
      toast.success("Profil yangilandi");
    },
    onError: (e: any) => toast.error(e.message),
  });

  // Password change
  const [newPass, setNewPass] = React.useState("");
  const [newPass2, setNewPass2] = React.useState("");
  const changePass = useMutation({
    mutationFn: async () => {
      if (newPass.length < 6) throw new Error("Parol kamida 6 ta belgi");
      if (newPass !== newPass2) throw new Error("Parollar mos kelmaydi");
      const { error } = await supabase.auth.updateUser({ password: newPass });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Parol o'zgartirildi"); setNewPass(""); setNewPass2(""); },
    onError: (e: any) => toast.error(e.message),
  });

  // Notifications (local prefs)
  const [emailNotif, setEmailNotif] = React.useState(() =>
    typeof window !== "undefined" ? localStorage.getItem("notif_email") !== "0" : true);
  const [weeklyReport, setWeeklyReport] = React.useState(() =>
    typeof window !== "undefined" ? localStorage.getItem("notif_weekly") === "1" : false);
  const [soundOn, setSoundOn] = React.useState(() =>
    typeof window !== "undefined" ? localStorage.getItem("ui_sound") !== "0" : true);

  const persistPref = (k: string, v: boolean) => localStorage.setItem(k, v ? "1" : "0");

  const langs = [
    { code: "uz", flag: "🇺🇿", name: "O'zbekcha" },
    { code: "ru", flag: "🇷🇺", name: "Русский" },
    { code: "en", flag: "🇺🇸", name: "English" },
  ];

  const faqs = [
    {
      q: "Davomatni qanday belgilayman?",
      a: "Guruh ichidagi Kunlik Jurnal qismida o'quvchining davomat tugmasini bosing — Keldi → Kechikdi → Kelmadi → Sababli tartibida almashadi.",
    },
    {
      q: "Mukofot va jarima ballari nima farqi bor?",
      a: "Mukofot — ijobiy ball (faollik, javob), Jarima — manfiy ball (tartibsizlik). Ikkalasi ham umumiy reytingga ta'sir qiladi.",
    },
    {
      q: "Ma'lumotlarimni qanday zaxiralayman?",
      a: "Tizim → Ma'lumotlar bo'limidan barcha ma'lumotlarni JSON faylga eksport qilishingiz mumkin. Keyinchalik shu fayl orqali tiklash imkoni bor.",
    },
    {
      q: "Imtihon natijalarini qayerga kirityman?",
      a: "Imtihonlar bo'limida yangi imtihon yarating va shu yerda o'quvchilar uchun ballarni to'ldiring. Tahlil tabida statistika ko'rsatiladi.",
    },
    {
      q: "Tilni o'zgartira olamanmi?",
      a: "Ha, yuqori panelda til tugmasi bor (UZ/RU/EN) yoki bu sahifadagi 'Til' bo'limidan tanlang.",
    },
    {
      q: "Parolimni unutib qo'ysam-chi?",
      a: "Tizimdan chiqing va kirish sahifasida 'Parolni tiklash' havolasidan foydalaning. Email orqali tiklash xabari yuboriladi.",
    },
    {
      q: "Ma'lumotlarim xavfsizmi?",
      a: "Ha. Barcha ma'lumotlar shifrlangan ulanish orqali saqlanadi va faqat siz ko'ra olasiz (Row Level Security).",
    },
    {
      q: "Hisobimni o'chirsam, ma'lumotlar nima bo'ladi?",
      a: "Hisob o'chirilganda barcha guruhlar, o'quvchilar va davomat ma'lumotlari butunlay yo'q qilinadi. Avval eksport qilib oling.",
    },
  ];

  const deleteAccount = useMutation({
    mutationFn: async () => {
      // Soft cleanup: delete user data; auth user removal should be done via admin server fn
      await supabase.from("attendance_records").delete().eq("user_id", user!.id);
      await supabase.from("reward_records").delete().eq("user_id", user!.id);
      await supabase.from("students").delete().eq("user_id", user!.id);
      await supabase.from("groups").delete().eq("user_id", user!.id);
      await supabase.auth.signOut();
    },
    onSuccess: () => { toast.success("Ma'lumotlar o'chirildi"); window.location.href = "/auth"; },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="max-w-3xl mx-auto space-y-5 pb-10">
      <div>
        <h1 className="text-2xl font-bold">{t("nav.settings")}</h1>
        <p className="text-sm text-muted-foreground mt-1">Profil, ko'rinish, til va xavfsizlik sozlamalari</p>
      </div>

      {/* Profile */}
      <Section icon={User} title="Shaxsiy ma'lumotlar" desc="Ismingiz va muassasa nomini yangilang">
        <div className="grid sm:grid-cols-2 gap-3">
          <div><Label>To'liq ism</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
          <div><Label>Maktab/Muassasa</Label><Input value={school} onChange={(e) => setSchool(e.target.value)} /></div>
          <div><Label>Email</Label><Input value={user?.email || ""} disabled /></div>
          <div><Label>Telefon</Label><Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+998..." /></div>
        </div>
        <Button onClick={() => saveProfile.mutate()} disabled={saveProfile.isPending}>
          <Save className="h-4 w-4" /> Saqlash
        </Button>
      </Section>

      {/* Appearance */}
      <Section icon={Palette} title="Ko'rinish" desc="Yorug' yoki qorong'i mavzuni tanlang">
        <div className="grid grid-cols-2 gap-3">
          {(["light", "dark"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTheme(t)}
              className={cn(
                "flex items-center gap-3 rounded-lg border p-3 text-left transition-colors",
                theme === t ? "border-primary bg-primary/5" : "hover:bg-accent",
              )}
            >
              <div className={cn(
                "h-10 w-10 rounded-md flex items-center justify-center",
                t === "light" ? "bg-amber-100 text-amber-700" : "bg-slate-800 text-slate-100",
              )}>
                {t === "light" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
              </div>
              <div>
                <div className="text-sm font-medium">{t === "light" ? "Yorug'" : "Qorong'i"}</div>
                <div className="text-xs text-muted-foreground">{t === "light" ? "Kunduzgi rejim" : "Kechki rejim"}</div>
              </div>
            </button>
          ))}
        </div>
      </Section>

      {/* Language */}
      <Section icon={Languages} title="Til" desc="Interfeys tilini tanlang">
        <div className="grid grid-cols-3 gap-2">
          {langs.map((l) => (
            <button
              key={l.code}
              onClick={() => setLang(l.code)}
              className={cn(
                "flex flex-col items-center gap-1 rounded-lg border p-3 transition-colors",
                lang === l.code ? "border-primary bg-primary/5" : "hover:bg-accent",
              )}
            >
              <span className="text-2xl">{l.flag}</span>
              <span className="text-xs font-medium">{l.name}</span>
            </button>
          ))}
        </div>
      </Section>

      {/* Password */}
      <Section icon={Lock} title="Xavfsizlik" desc="Parolni o'zgartiring">
        <div className="grid sm:grid-cols-2 gap-3">
          <div><Label>Yangi parol</Label><Input type="password" value={newPass} onChange={(e) => setNewPass(e.target.value)} /></div>
          <div><Label>Tasdiqlash</Label><Input type="password" value={newPass2} onChange={(e) => setNewPass2(e.target.value)} /></div>
        </div>
        <Button variant="outline" onClick={() => changePass.mutate()} disabled={changePass.isPending || !newPass}>
          <Lock className="h-4 w-4" /> Parolni o'zgartirish
        </Button>
      </Section>

      {/* Notifications */}
      <Section icon={Bell} title="Bildirishnomalar" desc="Qaysi bildirishnomalarni olishni tanlang">
        <Toggle label="Email bildirishnomalari" desc="Muhim yangiliklar haqida xabar"
          checked={emailNotif} onChange={(v) => { setEmailNotif(v); persistPref("notif_email", v); }} />
        <Toggle label="Haftalik hisobot" desc="Har hafta umumiy statistika emailga"
          checked={weeklyReport} onChange={(v) => { setWeeklyReport(v); persistPref("notif_weekly", v); }} />
        <Toggle label="Interfeys tovushlari" desc="Tugma va amallar uchun ovoz"
          checked={soundOn} onChange={(v) => { setSoundOn(v); persistPref("ui_sound", v); }} />
      </Section>

      {/* FAQ */}
      <Section icon={HelpCircle} title="Ko'p so'raladigan savollar" desc="Tezkor javoblar va yo'riqlar">
        <Accordion type="single" collapsible className="w-full">
          {faqs.map((f, i) => (
            <AccordionItem key={i} value={`item-${i}`}>
              <AccordionTrigger className="text-left text-sm">{f.q}</AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground">{f.a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </Section>

      {/* Danger zone */}
      <Section icon={Trash2} title="Xavfli zona" desc="Bu amallar qaytarilmas">
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 flex items-start justify-between gap-4">
          <div>
            <div className="text-sm font-medium">Barcha ma'lumotlarni o'chirish</div>
            <div className="text-xs text-muted-foreground mt-1">
              Guruhlar, o'quvchilar, davomat va imtihon ma'lumotlari butunlay yo'q qilinadi.
            </div>
          </div>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm"><Trash2 className="h-4 w-4" /> O'chirish</Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Aniq ishonchingiz komilmi?</AlertDialogTitle>
                <AlertDialogDescription>
                  Bu amal qaytarilmas. Avval Tizim → Ma'lumotlar dan eksport qilishni tavsiya etamiz.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Bekor qilish</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  onClick={() => deleteAccount.mutate()}
                >Ha, o'chirish</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </Section>
    </div>
  );
}

function Toggle({
  label, desc, checked, onChange,
}: { label: string; desc?: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border p-3">
      <div className="min-w-0">
        <div className="text-sm font-medium">{label}</div>
        {desc && <div className="text-xs text-muted-foreground mt-0.5">{desc}</div>}
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}
