"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import "@/lib/i18n";
import { supabase } from "@/lib/supabase";
import { Loader2 } from "lucide-react";
import { PatientVisitsTable } from "@/components/visits/patient-visits-table";

function PatientVisitsContent() {
  const router = useRouter();
  const { t } = useTranslation("patientVisits");
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session) {
          router.push("/login");
          return;
        }

        // Check if user is a patient
        const { data: userProfile } = await supabase
          .from("users")
          .select("type")
          .eq("user_id", session.user.id)
          .single();

        if (!userProfile || userProfile.type !== "patient") {
          router.push("/dashboard");
          return;
        }

        setAuthorized(true);
      } catch (error) {
        console.error("Error checking auth:", error);
        router.push("/login");
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, [router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!authorized) {
    return null;
  }

  return (
    <div className="space-y-6 p-8">
      <div>
        <h1 className="text-3xl font-bold">{t("title")}</h1>
        <p className="text-muted-foreground">{t("subtitle")}</p>
      </div>

      <PatientVisitsTable />
    </div>
  );
}

function SuspenseFallback() {
  const { t } = useTranslation("patientVisits");
  return <div className="p-8">{t("table.loading")}</div>;
}

export default function PatientVisits() {
  return (
    <Suspense fallback={<SuspenseFallback />}>
      <PatientVisitsContent />
    </Suspense>
  );
}
