"use client";

import * as React from "react";
import { useTranslation } from "react-i18next";
import "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { X, Plus } from "lucide-react";
import type { VisitFormData } from "../add-visit";
import { cn } from "@/lib/utils";

interface VisitStage2SymptomsProps {
  formData: VisitFormData;
  setFormData: React.Dispatch<React.SetStateAction<VisitFormData>>;
  onNext: () => void;
  onPrevious: () => void;
  onCancel: () => void;
}

export function VisitStage2Symptoms({
  formData,
  setFormData,
  onNext,
  onPrevious,
  onCancel,
}: VisitStage2SymptomsProps) {
  const { t } = useTranslation("visits");

  const addSymptom = () => {
    setFormData((prev) => ({
      ...prev,
      symptoms: [
        ...prev.symptoms,
        { symptom: "", duration: "", notes: "" },
      ],
    }));
  };

  const removeSymptom = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      symptoms: prev.symptoms.filter((_, i) => i !== index),
    }));
  };

  const updateSymptom = (
    index: number,
    field: "symptom" | "duration" | "notes",
    value: string
  ) => {
    setFormData((prev) => ({
      ...prev,
      symptoms: prev.symptoms.map((s, i) =>
        i === index ? { ...s, [field]: value } : s
      ),
    }));
  };

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Label>{t("add.stages.symptoms.title")}</Label>
          <Button type="button" variant="outline" size="sm" onClick={addSymptom}>
            <Plus className="mr-2 h-4 w-4" />
            {t("add.stages.symptoms.add")}
          </Button>
        </div>

        {formData.symptoms.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground border border-dashed rounded-md">
            {t("add.stages.symptoms.noSymptoms")}
          </div>
        ) : (
          <div className="space-y-4">
            {formData.symptoms.map((symptom, index) => (
              <div
                key={index}
                className="p-4 border rounded-md space-y-4 bg-card"
              >
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">
                    {t("add.stages.symptoms.symptom")} {index + 1}
                  </Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeSymptom(index)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                <div className="space-y-2">
                  <div>
                    <Label htmlFor={`symptom-${index}`}>
                      {t("add.stages.symptoms.symptomLabel")}{" "}
                      <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id={`symptom-${index}`}
                      value={symptom.symptom}
                      onChange={(e) =>
                        updateSymptom(index, "symptom", e.target.value)
                      }
                      placeholder={t("add.stages.symptoms.symptomPlaceholder")}
                    />
                  </div>

                  <div>
                    <Label htmlFor={`duration-${index}`}>
                      {t("add.stages.symptoms.durationLabel")}
                    </Label>
                    <Input
                      id={`duration-${index}`}
                      value={symptom.duration}
                      onChange={(e) =>
                        updateSymptom(index, "duration", e.target.value)
                      }
                      placeholder={t("add.stages.symptoms.durationPlaceholder")}
                    />
                  </div>

                  <div>
                    <Label htmlFor={`symptom-notes-${index}`}>
                      {t("add.stages.symptoms.notesLabel")}
                    </Label>
                    <textarea
                      id={`symptom-notes-${index}`}
                      value={symptom.notes}
                      onChange={(e) =>
                        updateSymptom(index, "notes", e.target.value)
                      }
                      placeholder={t("add.stages.symptoms.notesPlaceholder")}
                      rows={2}
                      className="flex min-h-[60px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 resize-none"
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

