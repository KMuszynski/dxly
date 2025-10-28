"use client";

import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import "@/lib/i18n";
import { LanguageSwitcher } from "@/components/language-switcher";
import { useIntersectionObserver } from "@/lib/useIntersectionObserver";

// 5a189a primary color

export default function LandingPage() {
  const { t, i18n } = useTranslation("commingSoon");
  const router = useRouter();

  // Animation hooks
  const titleRef = useIntersectionObserver<HTMLHeadingElement>({
    threshold: 0.2,
  });
  const subtitleRef = useIntersectionObserver<HTMLParagraphElement>({
    threshold: 0.2,
  });
  const buttonRef = useIntersectionObserver<HTMLButtonElement>({
    threshold: 0.2,
  });

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
            poster="/landingPage/video-image.png"
            autoPlay
            muted
            loop
            playsInline
            preload="metadata"
            className="absolute inset-0 w-full h-full object-cover z-0"
          />
          {/* video tint */}
          <div className="absolute inset-0 bg-black opacity-20 z-10"></div>

          <div className="relative z-20 flex flex-col items-center justify-center h-full px-10 pt-16">
            <h1
              ref={titleRef.ref}
              className={`text-5xl md:text-7xl font-bold text-white mb-4 text-center animate-fade-in-up ${
                titleRef.isIntersecting ? "animate-visible" : ""
              }`}
            >
              {t("body.title")}
            </h1>
            <p
              ref={subtitleRef.ref}
              className={`text-xxl text-gray-200 mb-4 max-w-4xl text-center animate-fade-in-up ${
                subtitleRef.isIntersecting ? "animate-visible" : ""
              }`}
              style={{ transitionDelay: "0.2s" }}
            >
              {t("body.subtitle")}
            </p>
            <button
              ref={buttonRef.ref}
              onClick={() => router.back()}
              className={`bg-[#5a189a] text-white px-4 py-2 rounded-md border border-gray-700 hover:bg-[#5a189a]/90 flex items-center gap-2 mx-auto animate-fade-in-up ${
                buttonRef.isIntersecting ? "animate-visible" : ""
              }`}
              style={{ transitionDelay: "0.4s" }}
            >
              {t("body.goBack")} <ArrowLeft className="w-4 h-4" />
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}
