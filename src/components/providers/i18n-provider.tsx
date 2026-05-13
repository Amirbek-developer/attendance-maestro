import * as React from "react";
import { I18nextProvider } from "react-i18next";
import i18n from "@/lib/i18n";

export function I18nProvider({ children }: { children: React.ReactNode }) {
  return <I18nextProvider i18n={i18n}>{children}</I18nextProvider>;
}

export function useLang() {
  const [lang, setLangState] = React.useState<string>(() =>
    typeof window !== "undefined" ? localStorage.getItem("lang") || "uz" : "uz",
  );
  const setLang = (l: string) => {
    localStorage.setItem("lang", l);
    i18n.changeLanguage(l);
    setLangState(l);
  };
  return { lang, setLang };
}
