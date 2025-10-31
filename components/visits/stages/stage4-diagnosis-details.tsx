"use client";

import * as React from "react";
import { useTranslation } from "react-i18next";
import "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import type { VisitFormData } from "../add-visit";

interface VisitStage4DiagnosisDetailsProps {
  formData: VisitFormData;
  setFormData: React.Dispatch<React.SetStateAction<VisitFormData>>;
  onNext: () => void;
  onPrevious: () => void;
  onCancel: () => void;
}

export function VisitStage4DiagnosisDetails({
  formData,
  setFormData,
  onNext,
  onPrevious,
  onCancel,
}: VisitStage4DiagnosisDetailsProps) {
  const { t } = useTranslation("visits");

  const updateDiagnosisNotes = (index: number, notes: string) => {
    setFormData((prev) => ({
      ...prev,
      diagnoses: prev.diagnoses.map((d, i) =>
        i === index ? { ...d, notes } : d
      ),
    }));
  };

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <Label>{t("add.stages.diagnosisDetails.title")}</Label>

        {formData.diagnoses.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground border border-dashed rounded-md">
            {t("add.stages.diagnosisDetails.noDiagnoses")}
          </div>
        ) : (
          <div className="space-y-4">
            {formData.diagnoses.map((diagnosis, index) => (
              <div
                key={index}
                className="p-4 border rounded-md space-y-4 bg-card"
              >
                <div className="space-y-2">
                  <Label className="text-sm font-medium">
                    {diagnosis.diagnosis || t("add.stages.diagnosisDetails.diagnosis")} {index + 1}
                  </Label>
                  <div>
                    <Label htmlFor={`diagnosis-notes-${index}`}>
                      {t("add.stages.diagnosisDetails.notesLabel")}
                    </Label>
                    <textarea
                      id={`diagnosis-notes-${index}`}
                      value={diagnosis.notes}
                      onChange={(e) =>
                        updateDiagnosisNotes(index, e.target.value)
                      }
                      placeholder={t("add.stages.diagnosisDetails.notesPlaceholder")}
                      rows={4}
                      className="flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 resize-none"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex justify-end space-x-2 pt-4">
        <Button variant="outline" onClick={onCancel}>
          {t("add.buttons.cancel")}
        </Button>
        <Button variant="outline" onClick={onPrevious}>
          {t("add.buttons.previous")}
        </Button>
        <Button onClick={onNext}>
          {t("add.buttons.next")}
        </Button>
      </div>
    </div>
  );
}

