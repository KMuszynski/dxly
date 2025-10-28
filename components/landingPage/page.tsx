"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { ArrowDown, ArrowRight, Globe, Link } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import "@/lib/i18n";
import { FeaturesCarousel } from "@/components/landingPage/features-carousel";
import { LanguageSwitcher } from "@/components/language-switcher";
import { useIntersectionObserver } from "@/lib/useIntersectionObserver";

// 5a189a primary color

export default function LandingPage() {
  const { t, i18n } = useTranslation("common");
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<
    "idle" | "success" | "error"
  >("idle");

  // Animation hooks
  const heroTitleRef = useIntersectionObserver<HTMLHeadingElement>({
    threshold: 0.2,
  });
  const heroSubtitleRef = useIntersectionObserver<HTMLParagraphElement>({
    threshold: 0.2,
  });
  const featuresTitleRef = useIntersectionObserver<HTMLHeadingElement>({
    threshold: 0.2,
  });
  const infoTitleRef = useIntersectionObserver<HTMLHeadingElement>({
    threshold: 0.2,
  });
  const infoSubtitleRef = useIntersectionObserver<HTMLParagraphElement>({
    threshold: 0.2,
  });
  const ctaTitleRef = useIntersectionObserver<HTMLHeadingElement>({
    threshold: 0.2,
  });
  const ctaSubtitleRef = useIntersectionObserver<HTMLParagraphElement>({
    threshold: 0.2,
  });
  const contactTitleRef = useIntersectionObserver<HTMLHeadingElement>({
    threshold: 0.2,
  });
  const contactSubtitleRef = useIntersectionObserver<HTMLParagraphElement>({
    threshold: 0.2,
  });

  const scrollToSection = (sectionId: string) => {
    const section = document.getElementById(sectionId);
    if (section) {
      const screenHeight = window.innerHeight; // 64 for navbar height and 16 for padding
      const elementPosition = section.offsetTop + screenHeight / 1.1;
      window.scrollTo({
        top: elementPosition,
        behavior: "smooth",
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitStatus("idle");

    const formData = new FormData(e.currentTarget);
    const data = {
      name: formData.get("name") as string,
      email: formData.get("email") as string,
      message: formData.get("message") as string,
      website: "", // honeypot field
    };

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (response.ok) {
        setSubmitStatus("success");
        (e.target as HTMLFormElement).reset();
      } else {
        setSubmitStatus("error");
      }
    } catch (error) {
      console.error("Error submitting form:", error);
      setSubmitStatus("error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-black mx-0 w-full bg-black">
      <div className="text-center mx-0 w-full">
        {/* Navbar */}
        <div className="fixed top-0 left-0 right-0 z-50 flex justify-between items-center p-4 bg-black mx-0 px-8 h-16 ">
          <div className="text-2xl font-bold text-white">{t("nav.logo")}</div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => scrollToSection("features")}
              className="text-gray-200 hover:underline md:inline-block hidden"
            >
              {t("nav.features")}
            </button>
            <button
              onClick={() => scrollToSection("contact")}
              className="text-gray-200 hover:underline md:inline-block hidden"
            >
              {t("nav.contact")}
            </button>
            <LanguageSwitcher />
            <button
              onClick={() => router.push("/commingSoon")}
              className="bg-[#5a189a] text-white px-4 py-2 rounded-md border border-gray-700 hover:bg-[#5a189a]/70"
            >
              {t("nav.login")}
            </button>
          </div>
        </div>
        {/* Fixed video background */}
        <div className="fixed inset-0 w-full h-full z-0">
          <video
            src="/landingPage/dna-helix-video.mp4"
            poster="/landingPage/video-image.png"
            autoPlay
            muted
            loop
            playsInline
            preload="metadata"
            className="w-full h-full object-cover"
          />
          {/* video tint */}
          <div className="absolute inset-0 bg-black opacity-20"></div>
        </div>

        {/* Hero section */}
        <section
          className="relative pb-12 mt-16 bg-transparent"
          style={{ minHeight: "calc(100vh - 4rem)" }}
        >
          <div className="relative z-20 flex flex-col items-start justify-center h-full text-center px-10 pt-16 max-w-6xl">
            <h1
              ref={heroTitleRef.ref}
              className={`text-5xl md:text-7xl font-bold text-white mb-4 text-left animate-fade-in-up ${
                heroTitleRef.isIntersecting ? "animate-visible" : ""
              }`}
            >
              {t("hero.title")}
            </h1>
            <p
              ref={heroSubtitleRef.ref}
              className={`text-xl text-gray-200 mb-4 max-w-4xl text-justify animate-fade-in-up ${
                heroSubtitleRef.isIntersecting ? "animate-visible" : ""
              }`}
              style={{ transitionDelay: "0.2s" }}
            >
              {t("hero.subtitle")}
            </p>
            <div className="w-full flex justify-end max-w-4xl">
              <button
                onClick={() => router.push("/commingSoon")}
                className="border border-gray-600 bg-[#5a189a] hover:bg-[#5a189a]/90 text-white px-4 py-2 rounded-md flex items-center gap-2"
              >
                {t("cta.button")} <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
          <button
            onClick={() => scrollToSection("features")}
            className="hidden md:block absolute bottom-6 right-1/2 transform translate-x-1/2 animate-pulse hover:animate-none hover:opacity-100 transition-opacity duration-1000"
          >
            <ArrowDown className="w-10 h-10 text-white" />
          </button>
        </section>
        {/* <div className="bg-[linear-gradient(180deg,_#07141a_0%,_#07141a_40%,_#5a189a_100%)]"> */}
        <div className="bg-[#07141a] min-h-screen relative overflow-hidden z-10">
          {/* Blob background */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: `
                radial-gradient(ellipse 400px 300px at 20% 30%, rgba(90, 24, 154, 0.6) 0%, transparent 70%),
                radial-gradient(ellipse 350px 250px at 80% 20%, rgba(106, 31, 168, 0.5) 0%, transparent 70%),
                radial-gradient(ellipse 300px 400px at 40% 70%, rgba(74, 16, 132, 0.5) 0%, transparent 70%),
                radial-gradient(ellipse 450px 300px at 90% 80%, rgba(115, 32, 182, 0.4) 0%, transparent 70%),
                radial-gradient(ellipse 250px 350px at 10% 90%, rgba(77, 20, 141, 0.5) 0%, transparent 70%),
                radial-gradient(ellipse 320px 280px at 60% 40%, rgba(90, 24, 154, 0.3) 0%, transparent 70%),
                radial-gradient(ellipse 280px 320px at 30% 60%, rgba(106, 31, 168, 0.4) 0%, transparent 70%),
                radial-gradient(ellipse 350px 250px at 70% 10%, rgba(74, 16, 132, 0.3) 0%, transparent 70%)
              `,
              filter: "blur(80px)",
              zIndex: 0,
            }}
          />
          {/* Features section */}
          <section
            id="features"
            className="relative mt-0 mb-12 pt-12 px-4 z-10"
          >
            <h1
              ref={featuresTitleRef.ref}
              className={`text-5xl font-bold text-white mb-8 text-center animate-fade-in-up ${
                featuresTitleRef.isIntersecting ? "animate-visible" : ""
              }`}
            >
              {t("features.title")}
            </h1>
            <FeaturesCarousel />
          </section>
          {/* information section */}
          <section className="relative pb-12 mt-24 z-10 px-4">
            <h1
              ref={infoTitleRef.ref}
              className={`text-5xl font-bold text-white mb-4 animate-fade-in-up ${
                infoTitleRef.isIntersecting ? "animate-visible" : ""
              }`}
            >
              {t("info.title")}
            </h1>
            <p
              ref={infoSubtitleRef.ref}
              className={`text-xl text-gray-200 mb-4 max-w-4xl mx-auto animate-fade-in-up ${
                infoSubtitleRef.isIntersecting ? "animate-visible" : ""
              }`}
              style={{ transitionDelay: "0.2s" }}
            >
              {t("info.subtitle")}
            </p>
          </section>
          {/* CTA section */}
          <section className="relative pb-24 bg-[#07141a] pt-12 z-10 px-4">
            {/* background image /landingPage/hands-reaching.jpg*/}
            <img
              src="/landingPage/hands-reaching.jpg"
              alt="Hands reaching"
              className="absolute z-0 inset-0 w-full h-full object-cover"
            />
            {/* background overlay */}
            <div className="absolute inset-0 bg-black opacity-30 z-10"></div>
            <h1
              ref={ctaTitleRef.ref}
              className={`relative z-20 text-4xl font-bold text-white mb-4 animate-fade-in-up ${
                ctaTitleRef.isIntersecting ? "animate-visible" : ""
              }`}
            >
              {t("cta.title")}
            </h1>
            <p
              ref={ctaSubtitleRef.ref}
              className={`relative z-20 text-lg text-gray-200 mb-4 animate-fade-in-up ${
                ctaSubtitleRef.isIntersecting ? "animate-visible" : ""
              }`}
              style={{ transitionDelay: "0.2s" }}
            >
              {t("cta.subtitle")}
            </p>
            <button
              onClick={() => router.push("/commingSoon")}
              className="relative z-20 bg-[#5a189a] hover:bg-[#5a189a]/80 text-white px-4 py-2 rounded-md flex items-center gap-2 mx-auto"
            >
              {t("cta.button")} <ArrowRight className="w-4 h-4" />
            </button>
          </section>{" "}
          {/* contact section */}
          <section className="relative pb-12 px-4 pt-12 z-10" id="contact">
            {/* contact form */}
            <h1
              ref={contactTitleRef.ref}
              className={`text-4xl font-bold text-white mb-3 animate-fade-in-up ${
                contactTitleRef.isIntersecting ? "animate-visible" : ""
              }`}
            >
              {t("contact.title")}
            </h1>
            <p
              ref={contactSubtitleRef.ref}
              className={`text-lg text-gray-200 mb-3 animate-fade-in-up ${
                contactSubtitleRef.isIntersecting ? "animate-visible" : ""
              }`}
              style={{ transitionDelay: "0.2s" }}
            >
              {t("contact.subtitle")}
            </p>
            <form
              onSubmit={handleSubmit}
              className="flex flex-col items-start justify-center gap-2 max-w-4xl mx-auto w-full"
            >
              {/* Honeypot field - hidden from users */}
              <input
                type="text"
                name="website"
                style={{ display: "none" }}
                tabIndex={-1}
                autoComplete="off"
              />

              <label
                className="text-md text-gray-200 mb-1"
                htmlFor="contact-name"
              >
                {t("contact.nameLabel")}
              </label>
              <input
                id="contact-name"
                name="name"
                type="text"
                required
                placeholder={t("contact.namePlaceholder")}
                className="w-full p-1.5 rounded-md mb-2 bg-[#ffffff20] border border-gray-600 text-white focus:border-[#5a189a] focus:outline-none"
              />
              <label
                className="text-md text-gray-200 mb-1"
                htmlFor="contact-email"
              >
                {t("contact.emailLabel")}
              </label>
              <input
                id="contact-email"
                name="email"
                type="email"
                required
                placeholder={t("contact.emailPlaceholder")}
                className="w-full p-1.5 rounded-md mb-2 bg-[#ffffff20] border border-gray-600 text-white focus:border-[#5a189a] focus:outline-none"
              />
              <label
                className="text-md text-gray-200 mb-1"
                htmlFor="contact-message"
              >
                {t("contact.messageLabel")}
              </label>
              <textarea
                id="contact-message"
                name="message"
                required
                rows={4}
                placeholder={t("contact.messagePlaceholder")}
                className="w-full p-1.5 rounded-md mb-2 bg-[#ffffff20] border border-gray-600 text-white focus:border-[#5a189a] focus:outline-none resize-vertical"
              />

              {/* Status messages */}
              {submitStatus === "success" && (
                <div className="w-full p-3 mb-4 bg-green-500/20 border border-green-500 text-green-300 rounded-md text-center">
                  {t("contact.successMessage")}
                </div>
              )}
              {submitStatus === "error" && (
                <div className="w-full p-3 mb-4 bg-red-500/20 border border-red-500 text-red-300 rounded-md text-center">
                  {t("contact.errorMessage")}
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="bg-[#ffffff20] hover:bg-[#ffffff40] disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2 rounded-md flex items-center gap-2 mx-auto border border-gray-400 transition-colors"
              >
                {isSubmitting ? t("contact.sending") : t("contact.button")}
                {!isSubmitting && <ArrowRight className="w-4 h-4" />}
              </button>
            </form>
          </section>
        </div>
      </div>
    </main>
  );
}
