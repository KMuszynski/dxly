"use client";

import * as React from "react";
import { useTranslation } from "react-i18next";
import "@/lib/i18n";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { VisitStage1Patient } from "./stages/stage1-patient";
import { VisitStage2Symptoms } from "./stages/stage2-symptoms";
import { VisitStage3Diagnosis } from "./stages/stage3-diagnosis";
import { VisitStage4Notes } from "./stages/stage4-notes";

// Follow-up question definition from the API
export interface FollowUpQuestion {
  key: string;
  label: string;
  type: "enum" | "range" | "number";
  options?: string[];
  min?: number;
  max?: number;
}

// Symptom definition from the API
export interface SymptomDefinition {
  id: string;
  display_name: string;
  global_follow_ups: FollowUpQuestion[];
  unique_follow_ups: FollowUpQuestion[];
}

type PatientInfo = {
  date_of_birth: Date;
  gender: string;
  address: string;
};

export interface VisitFormData {
  // Stage 1: Patient
  patientId: string | null;
  patientName: string | null;
  patient: PatientInfo | null;

  // Stage 2: Symptoms - now includes follow-up answers
  symptoms: Array<{
    symptom: string; // Symptom ID (e.g., "Ear Pain")
    duration: string; // Legacy field for backward compatibility
    notes: string; // Legacy field for backward compatibility
    followUpAnswers: Record<string, string | number>; // Follow-up question answers
  }>;

  // Stage 3: Diagnoses
  diagnoses: Array<{
    diagnosis: string;
    notes: string;
  }>;

  // Stage 4: Notes
  visitNotes: string;
  visitDate: string;
  visitTime: string;
}

interface ExistingVisit {
  id: string;
  patient_id: string;
  visit_date: string;
  status?: string;
  notes?: string | null;
  patient?: {
    first_name: string;
    last_name: string;
  };
}

interface AddVisitDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onVisitAdded?: () => void;
  existingVisit?: ExistingVisit | null; // For "Start Visit" workflow
}

const STAGES = [
  { id: 1, key: "patient" },
  { id: 2, key: "symptoms" },
  { id: 3, key: "diagnosis" },
  { id: 4, key: "notes" },
] as const;

export function AddVisitDialog({
  open,
  onOpenChange,
  onVisitAdded,
  existingVisit,
}: AddVisitDialogProps) {
  const { t } = useTranslation("visits");
  const [currentStage, setCurrentStage] = React.useState(1);
  const [existingVisitId, setExistingVisitId] = React.useState<string | null>(
    null
  );
  const initialFormData: VisitFormData = {
    patientId: null,
    patientName: null,
    patient: {
      date_of_birth: new Date(),
      gender: "",
      address: "",
    },
    symptoms: [],
    diagnoses: [],
    visitNotes: "",
    visitDate: new Date().toISOString().split("T")[0],
    visitTime: new Date().toTimeString().split(" ")[0].slice(0, 5),
  };
  const [formData, setFormData] =
    React.useState<VisitFormData>(initialFormData);

  // Load existing symptoms for a visit
  const loadExistingSymptoms = async (visitId: string) => {
    try {
      const { data: symptoms, error } = await supabase
        .from("visit_symptoms")
        .select("symptom, duration, notes, follow_up_data")
        .eq("visit_id", visitId);

      if (error) {
        console.error("Error loading symptoms:", error);
        return;
      }

      if (symptoms && symptoms.length > 0) {
        setFormData((prev) => ({
          ...prev,
          symptoms: symptoms.map((s) => ({
            symptom: s.symptom,
            duration: s.duration || "",
            notes: s.notes || "",
            followUpAnswers:
              (s.follow_up_data as Record<string, string | number>) || {},
          })),
        }));
      }
    } catch (error) {
      console.error("Error loading symptoms:", error);
    }
  };

  type PatientInfo = {
    date_of_birth: Date;
    gender: string;
    address: string;
  };

  const getPatient = async (
    patientId: string
  ): Promise<
    { date_of_birth: Date; gender: string; address: string } | undefined
  > => {
    const { data: patient, error } = await supabase
      .from("patients")
      .select("date_of_birth, gender, address")
      .eq("id", patientId)
      .single();

    if (error) {
      console.error("Error loading patient:", error);
      return;
    }

    return {
      date_of_birth: new Date(patient.date_of_birth),
      gender: patient.gender,
      address: patient.address,
    };
  };

  React.useEffect(() => {
    const resetForm = async () => {
      if (!open) return;

      if (existingVisit) {
        setExistingVisitId(existingVisit.id);

        const visitDate = new Date(existingVisit.visit_date);
        setCurrentStage(2);

        const patient = await getPatient(existingVisit.patient_id);

        setFormData({
          patientId: existingVisit.patient_id,
          patientName: existingVisit.patient
            ? `${existingVisit.patient.first_name} ${existingVisit.patient.last_name}`
            : null,
          patient: patient ?? null,
          symptoms: [],
          diagnoses: [],
          visitNotes: existingVisit.notes || "",
          visitDate: visitDate.toISOString().split("T")[0],
          visitTime: visitDate.toTimeString().split(" ")[0].slice(0, 5),
        });

        loadExistingSymptoms(existingVisit.id);
      } else {
        // Normal "Add Visit" mode
        setExistingVisitId(null);
        setCurrentStage(1);

        setFormData({
          ...initialFormData,
          patient: null, // 👈 important because VisitFormData says patient can be null
          visitDate: new Date().toISOString().split("T")[0],
          visitTime: new Date().toTimeString().split(" ")[0].slice(0, 5),
        });
      }
    };

    resetForm();
  }, [open, existingVisit]);

  const handleNext = () => {
    if (currentStage < STAGES.length) {
      setCurrentStage(currentStage + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStage > 1) {
      setCurrentStage(currentStage - 1);
    }
  };

  const handleClose = () => {
    onOpenChange(false);
  };

  const renderStage = () => {
    switch (currentStage) {
      case 1:
        return (
          <VisitStage1Patient
            formData={formData}
            setFormData={setFormData}
            onNext={handleNext}
            onCancel={handleClose}
          />
        );
      case 2:
        return (
          <VisitStage2Symptoms
            formData={formData}
            setFormData={setFormData}
            onNext={handleNext}
            onPrevious={handlePrevious}
            onCancel={handleClose}
          />
        );
      case 3:
        return (
          <VisitStage3Diagnosis
            formData={formData}
            setFormData={setFormData}
            onNext={handleNext}
            onPrevious={handlePrevious}
            onCancel={handleClose}
          />
        );
      case 4:
        return (
          <VisitStage4Notes
            formData={formData}
            setFormData={setFormData}
            onPrevious={handlePrevious}
            onCancel={handleClose}
            onComplete={() => {
              handleClose();
              onVisitAdded?.();
            }}
            existingVisitId={existingVisitId}
          />
        );
      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-full h-full overflow-y-auto flex flex-col gap-4">
        <DialogHeader>
          <DialogTitle>{t("add.title")}</DialogTitle>
          <DialogDescription>{t("add.description")}</DialogDescription>
        </DialogHeader>

        {/* Progress Indicator */}
        <div className="py-6 border-b items-start justify-start">
          <div className="flex items-center justify-between">
            {STAGES.map((stage, index) => (
              <React.Fragment key={stage.id}>
                <div className="flex flex-col items-center flex-1">
                  <div
                    className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium border-2 transition-colors",
                      currentStage > stage.id
                        ? "bg-brand/70 text-primary-foreground border-brand/10"
                        : currentStage === stage.id
                        ? "bg-brand text-primary-foreground border-brand/10 ring-4 ring-brand/10"
                        : "bg-background text-muted-foreground border-muted"
                    )}
                  >
                    {currentStage > stage.id ? (
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    ) : (
                      stage.id
                    )}
                  </div>
                  <span
                    className={cn(
                      "mt-2 text-xs text-center max-w-[100px]",
                      currentStage >= stage.id
                        ? "text-foreground font-medium"
                        : "text-muted-foreground"
                    )}
                  >
                    {t(`add.stages.${stage.key}.title`)}
                  </span>
                </div>
                {index < STAGES.length - 1 && (
                  <div
                    className={cn(
                      "h-1 flex-1 mx-2 transition-colors",
                      currentStage > stage.id ? "bg-brand" : "bg-muted"
                    )}
                  />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Stage Content */}
        <div className="py-4 flex-1 min-h-0">{renderStage()}</div>
      </DialogContent>
    </Dialog>
  );
}
