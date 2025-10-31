"use client";

import * as React from "react";
import { useTranslation } from "react-i18next";
import "@/lib/i18n";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { VisitFormData } from "../add-visit";

interface VisitStage5NotesProps {
  formData: VisitFormData;
  setFormData: React.Dispatch<React.SetStateAction<VisitFormData>>;
  onPrevious: () => void;
  onCancel: () => void;
  onComplete?: () => void;
}

export function VisitStage5Notes({
  formData,
  setFormData,
  onPrevious,
  onCancel,
  onComplete,
}: VisitStage5NotesProps) {
  const { t } = useTranslation("visits");
  const [saving, setSaving] = React.useState(false);

  const handleSave = async () => {
    if (!formData.patientId) {
      toast.error(t("add.errors.patientRequired"));
      return;
    }

    setSaving(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        toast.error(t("add.errors.sessionRequired"));
        setSaving(false);
        return;
      }

      // Combine date and time into a single datetime
      const visitDateTime = new Date(`${formData.visitDate}T${formData.visitTime}`);

      // Create the visit
      const { data: visit, error: visitError } = await supabase
        .from("visits")
        .insert({
          patient_id: formData.patientId,
          doctor_id: session.user.id,
          visit_date: visitDateTime.toISOString(),
          notes: formData.visitNotes || null,
        })
        .select()
        .single();

      if (visitError) {
        console.error("Visit insert error:", visitError);
        toast.error(t("add.errors.visitFailed"));
        setSaving(false);
        return;
      }

      if (!visit) {
        toast.error(t("add.errors.visitFailed"));
        setSaving(false);
        return;
      }

      // Insert symptoms
      if (formData.symptoms.length > 0) {
        const symptomsData = formData.symptoms
          .filter((s) => s.symptom.trim())
          .map((s) => ({
            visit_id: visit.id,
            symptom: s.symptom.trim(),
            duration: s.duration.trim() || null,
            notes: s.notes.trim() || null,
          }));

        if (symptomsData.length > 0) {
          const { error: symptomsError } = await supabase
            .from("visit_symptoms")
            .insert(symptomsData);

          if (symptomsError) {
            console.error("Symptoms insert error:", symptomsError);
            toast.error(t("add.errors.symptomsFailed"));
            setSaving(false);
            return;
          }
        }
      }

      // Insert diagnoses
      if (formData.diagnoses.length > 0) {
        const diagnosesData = formData.diagnoses
          .filter((d) => d.diagnosis.trim())
          .map((d) => ({
            visit_id: visit.id,
            diagnosis: d.diagnosis.trim(),
            notes: d.notes.trim() || null,
          }));

        if (diagnosesData.length > 0) {
          const { error: diagnosesError } = await supabase
            .from("visit_diagnoses")
            .insert(diagnosesData);

          if (diagnosesError) {
            console.error("Diagnoses insert error:", diagnosesError);
            toast.error(t("add.errors.diagnosesFailed"));
            setSaving(false);
            return;
          }
        }
      }

      toast.success(t("add.success.visitAdded"));
      onComplete?.();
    } catch (error) {
      console.error("Error saving visit:", error);
      toast.error(t("add.errors.saveError"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="visit-date">
              {t("add.stages.notes.visitDate")}{" "}
              <span className="text-destructive">*</span>
            </Label>
            <Input
              id="visit-date"
              type="date"
              value={formData.visitDate}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, visitDate: e.target.value }))
              }
              disabled={saving}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="visit-time">
              {t("add.stages.notes.visitTime")}{" "}
              <span className="text-destructive">*</span>
            </Label>
            <Input
              id="visit-time"
              type="time"
              value={formData.visitTime}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, visitTime: e.target.value }))
              }
              disabled={saving}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="visit-notes">
            {t("add.stages.notes.notesLabel")}
          </Label>
          <textarea
            id="visit-notes"
            value={formData.visitNotes}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, visitNotes: e.target.value }))
            }
            placeholder={t("add.stages.notes.notesPlaceholder")}
            disabled={saving}
            rows={8}
            className="flex min-h-[120px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 resize-none"
          />
        </div>
      </div>

      <div className="flex justify-end space-x-2 pt-4">
        <Button variant="outline" onClick={onCancel} disabled={saving}>
          {t("add.buttons.cancel")}
        </Button>
        <Button variant="outline" onClick={onPrevious} disabled={saving}>
          {t("add.buttons.previous")}
        </Button>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? t("add.buttons.saving") : t("add.buttons.complete")}
        </Button>
      </div>
    </div>
  );
}

