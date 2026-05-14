import { Languages, Check } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { useLang } from "@/components/providers/i18n-provider";
import { useTranslation } from "react-i18next";

const LANGS = [
  { code: "uz", short: "UZ", flag: "🇺🇿" },
  { code: "en", short: "EN", flag: "🇺🇸" },
  { code: "ru", short: "RU", flag: "🇷🇺" },
];

export function LangToggle() {
  const { lang, setLang } = useLang();
  const { t } = useTranslation();
  const current = LANGS.find((l) => l.code === lang) || LANGS[0];
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground hover:text-foreground">
          <Languages className="h-4 w-4 text-info" />
          <span className="font-semibold">{current.short}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[160px]">
        {LANGS.map((l) => (
          <DropdownMenuItem
            key={l.code}
            onClick={() => setLang(l.code)}
            className="gap-2 cursor-pointer"
          >
            <span className="text-base leading-none">{l.flag}</span>
            <span className={lang === l.code ? "font-semibold flex-1" : "flex-1"}>
              {t(`lang.${l.code}`)}
            </span>
            {lang === l.code && <Check className="h-3.5 w-3.5 text-info" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
