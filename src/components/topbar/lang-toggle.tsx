import { Globe } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { useLang } from "@/components/providers/i18n-provider";

const LANGS = [
  { code: "uz", label: "UZ" },
  { code: "ru", label: "RU" },
  { code: "en", label: "EN" },
];

export function LangToggle() {
  const { lang, setLang } = useLang();
  const current = LANGS.find((l) => l.code === lang) || LANGS[0];
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground hover:text-foreground">
          <Globe className="h-4 w-4 text-info" />
          <span className="font-semibold">{current.label}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-24">
        {LANGS.map((l) => (
          <DropdownMenuItem key={l.code} onClick={() => setLang(l.code)} className={lang === l.code ? "font-semibold" : ""}>
            {l.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
