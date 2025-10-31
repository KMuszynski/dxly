"use client";

import { useTranslation } from "react-i18next";
import "@/lib/i18n";
import { VisitsDataTable } from "@/components/visits/visits-table";

export default function Visits() {
  const { t } = useTranslation("visits");
  return (
    <div className="space-y-6 p-8 max-w-6xl mx-auto w-full h-full">
      <div>
        <h1 className="text-3xl font-bold">{t("title")}</h1>
        <p className="text-muted-foreground">{t("subtitle")}</p>
      </div>
      <VisitsDataTable />
    </div>
  );
}
