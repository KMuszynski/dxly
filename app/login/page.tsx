"use client";

import { LanguageSwitcher } from "@/components/language-switcher";
import { useTranslation } from "react-i18next";
import "@/lib/i18n";
import { LoginForm } from "@/components/login/login-form";

export default function Login() {
  const { t } = useTranslation("common");
  return (
    <div className="flex flex-col min-h-screen pt-16 items-center justify-center">
      <div className="fixed top-0 left-0 right-0 z-50 flex justify-between items-center p-4 bg-black mx-0 px-8 h-16 ">
        <div
          className="text-2xl font-bold text-white cursor-pointer"
          onClick={() => (window.location.href = "/")}
        >
          {t("nav.logo")}
        </div>
        <div className="flex items-center gap-4">
          <LanguageSwitcher />
        </div>
      </div>
      <img
        src="/login/x-ray.avif"
        alt="X-ray"
        className="absolute z-0 inset-0 w-full h-full object-cover"
      />
      <div className="px-8 py-10 rounded-lg border border-gray-200 shadow-lg bg-white relative z-10 flex flex-col items-center justify-center w-fit">
        <LoginForm className="w-full max-w-sm" />
      </div>
    </div>
  );
}
