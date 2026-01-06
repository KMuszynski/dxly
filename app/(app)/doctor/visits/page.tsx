"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslation } from "react-i18next";
import "@/lib/i18n";
import { VisitsDataTable } from "@/components/visits/visits-table";

function VisitsContent() {
  const { t } = useTranslation("visits");
  const searchParams = useSearchParams();
  const autoOpenAdd = searchParams.get("add") === "true";

  return (
    <div className="space-y-6 p-8 max-w-6xl mx-auto w-full h-full">
      <div>
        <h1 className="text-3xl font-bold">{t("title")}</h1>
        <p className="text-muted-foreground">{t("subtitle")}</p>
      </div>
      <VisitsDataTable autoOpenAddDialog={autoOpenAdd} />
    </div>
  );
}

export default function Visits() {
  return (
    <Suspense fallback={<div className="p-8">Loading...</div>}>
      <VisitsContent />
    </Suspense>
  );
}
