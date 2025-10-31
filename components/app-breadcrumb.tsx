"use client";

import { usePathname } from "next/navigation";
import { useTranslation } from "react-i18next";
import "@/lib/i18n";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb";
import { LanguageSwitcher } from "./language-switcher";

export function AppBreadcrumb() {
  const { t } = useTranslation("common");
  const pathname = usePathname();

  // Define breadcrumb mapping with translation keys
  const breadcrumbMap: Record<string, string> = {
    "/dashboard": t("breadcrumb.dashboard"),
    "/settings": t("breadcrumb.settings"),
    "/patients": t("breadcrumb.patients"),
    "/doctor/visits": t("breadcrumb.visits"),
  };

  // Get the current page name
  const currentPage = breadcrumbMap[pathname] || t("breadcrumb.dashboard");

  return (
    <Breadcrumb className="w-full">
      <BreadcrumbList className="w-full">
        <BreadcrumbItem className="w-full">
          <div className="flex justify-between items-center w-full">
            <BreadcrumbPage>{currentPage}</BreadcrumbPage>
            <LanguageSwitcher colorMode="white" />
          </div>
        </BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>
  );
}
