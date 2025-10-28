"use client";

import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import "@/lib/i18n";
import { LanguageSwitcher } from "../../components/language-switcher";

// 5a189a primary color

export default function LandingPage() {
  const { t, i18n } = useTranslation("commingSoon");
  const router = useRouter();

  return (
    <main className="flex min-h-screen items-center justify-center bg-black mx-0 w-full">
      <div className="text-center mx-0 w-full">
        {/* Navbar */}
        <div className="fixed top-0 left-0 right-0 z-50 flex justify-between items-center p-4 bg-black mx-0 px-8 h-16 ">
          <div className="text-2xl font-bold text-white">{t("nav.logo")}</div>
          <div className="flex items-center gap-4">
            <LanguageSwitcher />
          </div>
        </div>
        {/* Hero section */}
        <section
          className="relative pb-12 mt-16 bg-blue-500"
          style={{ minHeight: "calc(100vh - 4rem)" }}
        >
          {/* overlay video */}
          <video
            src="/landingPage/dna-helix-video.mp4"
            autoPlay
            muted
            loop
            className="absolute inset-0 w-full h-full object-cover z-0"
          />
          {/* video tint */}
          <div className="absolute inset-0 bg-black opacity-20 z-10"></div>

          <div className="relative z-20 flex flex-col items-center justify-center h-full text-center px-10 pt-16">
            <h1 className="text-5xl md:text-7xl font-bold text-white mb-4 text-center">
              {t("body.title")}
            </h1>
            <p className="text-xl text-gray-200 mb-8 max-w-4xl text-center">
              {t("body.subtitle")}
            </p>
            <button
              onClick={() => router.back()}
              className="bg-[#5a189a] text-white px-6 py-3 rounded-md border border-gray-700 hover:bg-[#5a189a]/70 flex items-center gap-2 transition-colors"
            >
              {t("body.goBack")} <ArrowLeft className="w-4 h-4" />
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}
