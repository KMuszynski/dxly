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
import { VisitStage1Patient } from "./stages/stage1-patient";
import { VisitStage2Symptoms } from "./stages/stage2-symptoms";
import { VisitStage3Diagnosis } from "./stages/stage3-diagnosis";
import { VisitStage4DiagnosisDetails } from "./stages/stage4-diagnosis-details";
import { VisitStage5Notes } from "./stages/stage5-notes";

export interface VisitFormData {
  // Stage 1: Patient
  patientId: string | null;
  patientName: string | null;
  
  // Stage 2: Symptoms
  symptoms: Array<{
    symptom: string;
    duration: string;
    notes: string;
  }>;
  
  // Stage 3 & 4: Diagnoses
  diagnoses: Array<{
    diagnosis: string;
    notes: string;
  }>;
  
  // Stage 5: Notes
  visitNotes: string;
  visitDate: string;
  visitTime: string;
}

interface AddVisitDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onVisitAdded?: () => void;
}

const STAGES = [
  { id: 1, key: "patient" },
  { id: 2, key: "symptoms" },
  { id: 3, key: "diagnosis" },
  { id: 4, key: "diagnosisDetails" },
  { id: 5, key: "notes" },
] as const;

export function AddVisitDialog({
  open,
  onOpenChange,
  onVisitAdded,
}: AddVisitDialogProps) {
  const { t } = useTranslation("visits");
  const [currentStage, setCurrentStage] = React.useState(1);
  const [formData, setFormData] = React.useState<VisitFormData>({
    patientId: null,
    patientName: null,
    symptoms: [],
    diagnoses: [],
    visitNotes: "",
    visitDate: new Date().toISOString().split("T")[0],
    visitTime: new Date().toTimeString().split(" ")[0].slice(0, 5),
  });

  // Reset form when dialog opens/closes
  React.useEffect(() => {
    if (open) {
      setCurrentStage(1);
      setFormData({
        patientId: null,
        patientName: null,
        symptoms: [],
        diagnoses: [],
        visitNotes: "",
        visitDate: new Date().toISOString().split("T")[0],
        visitTime: new Date().toTimeString().split(" ")[0].slice(0, 5),
      });
    }
  }, [open]);

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
          <VisitStage4DiagnosisDetails
            formData={formData}
            setFormData={setFormData}
            onNext={handleNext}
            onPrevious={handlePrevious}
            onCancel={handleClose}
          />
        );
      case 5:
        return (
          <VisitStage5Notes
            formData={formData}
            setFormData={setFormData}
            onPrevious={handlePrevious}
            onCancel={handleClose}
            onComplete={() => {
              handleClose();
              onVisitAdded?.();
            }}
          />
        );
      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("add.title")}</DialogTitle>
          <DialogDescription>{t("add.description")}</DialogDescription>
        </DialogHeader>

        {/* Progress Indicator */}
        <div className="py-6 border-b">
          <div className="flex items-center justify-between">
            {STAGES.map((stage, index) => (
              <React.Fragment key={stage.id}>
                <div className="flex flex-col items-center flex-1">
                  <div
                    className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium border-2 transition-colors",
                      currentStage > stage.id
                        ? "bg-primary text-primary-foreground border-primary"
                        : currentStage === stage.id
                        ? "bg-primary text-primary-foreground border-primary ring-4 ring-primary/20"
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
                      currentStage > stage.id
                        ? "bg-primary"
                        : "bg-muted"
                    )}
                  />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Stage Content */}
        <div className="py-4">{renderStage()}</div>
      </DialogContent>
    </Dialog>
  );
}

