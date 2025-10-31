"use client";

import * as React from "react";
import { useTranslation } from "react-i18next";
import "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/lib/supabase";
import { Plus } from "lucide-react";
import type { VisitFormData } from "../add-visit";
import { AddPatientDialog } from "@/components/patients/add-patient";
import { cn } from "@/lib/utils";

interface VisitStage1PatientProps {
  formData: VisitFormData;
  setFormData: React.Dispatch<React.SetStateAction<VisitFormData>>;
  onNext: () => void;
  onCancel: () => void;
}

export function VisitStage1Patient({
  formData,
  setFormData,
  onNext,
  onCancel,
}: VisitStage1PatientProps) {
  const { t } = useTranslation("visits");
  const [patients, setPatients] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [addPatientOpen, setAddPatientOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");

  React.useEffect(() => {
    const fetchPatients = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from("patients")
          .select("id, first_name, last_name")
          .order("last_name", { ascending: true });

        if (error) {
          console.error("Error fetching patients:", error);
          return;
        }

        setPatients(data || []);
      } catch (error) {
        console.error("Error fetching patients:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchPatients();
  }, []);

  const filteredPatients = React.useMemo(() => {
    if (!searchQuery.trim()) return patients;
    const query = searchQuery.toLowerCase();
    return patients.filter(
      (p) =>
        p.first_name?.toLowerCase().includes(query) ||
        p.last_name?.toLowerCase().includes(query) ||
        `${p.first_name} ${p.last_name}`.toLowerCase().includes(query)
    );
  }, [patients, searchQuery]);

  const handlePatientSelect = (patientId: string) => {
    const patient = patients.find((p) => p.id === patientId);
    setFormData((prev) => ({
      ...prev,
      patientId,
      patientName: patient
        ? `${patient.first_name} ${patient.last_name}`
        : null,
    }));
  };

  const handlePatientAdded = () => {
    // Refresh patients list
    const fetchPatients = async () => {
      const { data } = await supabase
        .from("patients")
        .select("id, first_name, last_name")
        .order("last_name", { ascending: true });

      if (data) {
        setPatients(data);
      }
    };
    fetchPatients();
  };

  const canProceed = formData.patientId !== null;

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Label htmlFor="patient-search">
            {t("add.stages.patient.searchLabel")}
          </Label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setAddPatientOpen(true)}
          >
            <Plus className="mr-2 h-4 w-4" />
            {t("add.stages.patient.addNew")}
          </Button>
        </div>
        <Input
          id="patient-search"
          placeholder={t("add.stages.patient.searchPlaceholder")}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="text-center py-8 text-muted-foreground">
          {t("add.stages.patient.loading")}
        </div>
      ) : (
        <div className="space-y-2 max-h-[300px] overflow-y-auto">
          {filteredPatients.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {searchQuery
                ? t("add.stages.patient.noResults")
                : t("add.stages.patient.noPatients")}
            </div>
          ) : (
            filteredPatients.map((patient) => {
              const fullName = `${patient.first_name} ${patient.last_name}`;
              const isSelected = formData.patientId === patient.id;
              return (
                <button
                  key={patient.id}
                  type="button"
                  onClick={() => handlePatientSelect(patient.id)}
                  className={cn(
                    "w-full p-4 text-left rounded-md border transition-colors",
                    isSelected
                      ? "border-primary bg-primary/5"
                      : "border-border hover:bg-muted"
                  )}
                >
                  <div className="font-medium">{fullName}</div>
                </button>
              );
            })
          )}
        </div>
      )}

      <div className="flex justify-end space-x-2 pt-4">
        <Button variant="outline" onClick={onCancel}>
          {t("add.buttons.cancel")}
        </Button>
        <Button onClick={onNext} disabled={!canProceed}>
          {t("add.buttons.next")}
        </Button>
      </div>

      <AddPatientDialog
        open={addPatientOpen}
        onOpenChange={setAddPatientOpen}
        onPatientAdded={handlePatientAdded}
      />
    </div>
  );
}

