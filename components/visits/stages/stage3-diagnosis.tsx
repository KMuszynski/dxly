"use client";

import * as React from "react";
import { useTranslation } from "react-i18next";
import "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, X } from "lucide-react";
import type { VisitFormData } from "../add-visit";

interface VisitStage3DiagnosisProps {
  formData: VisitFormData;
  setFormData: React.Dispatch<React.SetStateAction<VisitFormData>>;
  onNext: () => void;
  onPrevious: () => void;
  onCancel: () => void;
}

export function VisitStage3Diagnosis({
  formData,
  setFormData,
  onNext,
  onPrevious,
  onCancel,
}: VisitStage3DiagnosisProps) {
  const { t } = useTranslation("visits");

  const addDiagnosis = () => {
    setFormData((prev) => ({
      ...prev,
      diagnoses: [...prev.diagnoses, { diagnosis: "", notes: "" }],
    }));
  };

  const removeDiagnosis = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      diagnoses: prev.diagnoses.filter((_, i) => i !== index),
    }));
  };

  const updateDiagnosis = (
    index: number,
    field: "diagnosis" | "notes",
    value: string
  ) => {
    setFormData((prev) => ({
      ...prev,
      diagnoses: prev.diagnoses.map((d, i) =>
        i === index ? { ...d, [field]: value } : d
      ),
    }));
  };

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Label>{t("add.stages.diagnosis.title")}</Label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addDiagnosis}
          >
            <Plus className="mr-2 h-4 w-4" />
            {t("add.stages.diagnosis.add")}
          </Button>
        </div>

        {formData.diagnoses.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground border border-dashed rounded-md">
            {t("add.stages.diagnosis.noDiagnoses")}
          </div>
        ) : (
          <div className="space-y-4">
            {formData.diagnoses.map((diagnosis, index) => (
              <div
                key={index}
                className="p-4 border rounded-md space-y-4 bg-card"
              >
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">
                    {t("add.stages.diagnosis.diagnosis")} {index + 1}
                  </Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeDiagnosis(index)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                <div className="space-y-2">
                  <div>
                    <Label htmlFor={`diagnosis-${index}`}>
                      {t("add.stages.diagnosis.diagnosisLabel")}{" "}
                      <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id={`diagnosis-${index}`}
                      value={diagnosis.diagnosis}
                      onChange={(e) =>
                        updateDiagnosis(index, "diagnosis", e.target.value)
                      }
                      placeholder={t("add.stages.diagnosis.diagnosisPlaceholder")}
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

