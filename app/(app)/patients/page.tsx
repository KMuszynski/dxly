"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslation } from "react-i18next";
import "@/lib/i18n";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PatientsDataTable } from "@/components/patients/patients-table";

function PatientsContent() {
  const { t } = useTranslation("patients");
  const searchParams = useSearchParams();
  const autoOpenAdd = searchParams.get("add") === "true";

  return (
    <div className="space-y-6 p-8 max-w-3xl mx-auto w-full h-full">
      <div>
        <h1 className="text-3xl font-bold">{t("title")}</h1>
        <p className="text-muted-foreground">{t("subtitle")}</p>
      </div>
      <PatientsDataTable autoOpenAddDialog={autoOpenAdd} />
    </div>
  );
}

export default function Patients() {
  return (
    <Suspense fallback={<div className="p-8">Loading...</div>}>
      <PatientsContent />
    </Suspense>
  );
}
