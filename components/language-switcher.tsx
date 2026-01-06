"use client";

import "flag-icons/css/flag-icons.min.css";
import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { ChevronDown, Check } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const languages = [
  { code: "en", name: "English", flag: "🇺🇸" },
  { code: "pl", name: "Polski", flag: "🇵🇱" },
];

export function LanguageSwitcher({
  colorMode = "black",
}: {
  colorMode?: "white" | "black";
}) {
  const { i18n } = useTranslation("common");
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Prevent hydration mismatch by only rendering after mount
  useEffect(() => {
    setMounted(true);
  }, []);

  const currentLanguage =
    languages.find((lang) => lang.code === i18n.language) || languages[0];

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
    setIsOpen(false);
  };

  const isLightMode = colorMode === "white";

  // Show a placeholder during SSR to prevent hydration mismatch
  if (!mounted) {
    return (
      <Button
        variant="ghost"
        className={cn(
          "flex items-center gap-2 px-3 py-2",
          isLightMode
            ? "text-gray-700 hover:text-gray-900 hover:bg-gray-100"
            : "text-gray-200 hover:text-white hover:bg-white/10"
        )}
      >
        <span className="fi fi-us"></span>
        <span>EN</span>
        <ChevronDown className="w-4 h-4" />
      </Button>
    );
  }

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="relative">
      <CollapsibleTrigger asChild>
        <Button
          variant="ghost"
          className={cn(
            "flex items-center gap-2 px-3 py-2",
            isLightMode
              ? "text-gray-700 hover:text-gray-900 hover:bg-gray-100"
              : "text-gray-200 hover:text-white hover:bg-white/10"
          )}
        >
          {currentLanguage.code === "en" ? (
            <span className="fi fi-us"></span>
          ) : (
            <span className="fi fi-pl"></span>
          )}
          <span className="">{currentLanguage.code.toUpperCase()}</span>
          <ChevronDown
            className={cn(
              "w-4 h-4 transition-transform",
              isOpen && "rotate-180"
            )}
          />
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent
        className={cn(
          "absolute top-full right-0 mt-1 rounded-md shadow-lg z-50 min-w-[160px] border backdrop-blur-md p-1",
          isLightMode
            ? "bg-white border-gray-200"
            : "bg-black/10 border-white/10"
        )}
      >
        <div className="py-0 flex flex-col gap-1">
          {languages.map((language) => (
            <button
              key={language.code}
              onClick={() => changeLanguage(language.code)}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-2 text-sm transition-colors rounded-md",
                isLightMode
                  ? cn(
                      "text-gray-700 hover:bg-gray-100 hover:text-gray-900",
                      i18n.language === language.code && "bg-gray-100"
                    )
                  : cn(
                      "text-gray-200 hover:bg-white/15 hover:text-white",
                      i18n.language === language.code && "bg-white/10"
                    )
              )}
            >
              {language.code === "en" ? (
                <span className="fi fi-us"></span>
              ) : (
                <span className="fi fi-pl"></span>
              )}
              <span className="flex-1 text-left">{language.name}</span>
              {i18n.language === language.code && (
                <Check
                  className={cn(
                    "w-4 h-4",
                    isLightMode ? "text-gray-900" : "text-white"
                  )}
                />
              )}
            </button>
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
