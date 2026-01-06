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
import { WandSparklesIcon, Loader2 } from "lucide-react";

interface VisitStage4NotesProps {
  formData: VisitFormData;
  setFormData: React.Dispatch<React.SetStateAction<VisitFormData>>;
  onPrevious: () => void;
  onCancel: () => void;
  onComplete?: () => void;
  existingVisitId?: string | null; // For "Start Visit" workflow
}

export function VisitStage4Notes({
  formData,
  setFormData,
  onPrevious,
  onCancel,
  onComplete,
  existingVisitId,
}: VisitStage4NotesProps) {
  const { t, i18n } = useTranslation("visits");
  const [saving, setSaving] = React.useState(false);
  const [generating, setGenerating] = React.useState(false);

  // --- FIX START ---
  React.useEffect(() => {
    const loadMissingPatientData = async () => {
      // 1. Check if we have an ID but the AI-required data is missing
      if (formData.patientId && !formData.patient) {
        console.log("Fetching missing patient data for AI...");

        try {
          const { data, error } = await supabase
            .from("patients")
            .select("date_of_birth, gender, address")
            .eq("id", formData.patientId)
            .single();

          if (error) throw error;

          // 2. Update the parent state so handleGenerateNotes can see it
          if (data) {
            setFormData((prev) => ({
              ...prev,
              patient: {
                date_of_birth: data.date_of_birth,
                gender: data.gender,
                address: data.address,
              },
            }));
          }
        } catch (err) {
          console.error("Failed to fetch patient details:", err);
        }
      }
    };

    loadMissingPatientData();
  }, [formData.patientId, formData.patient, setFormData]);
  // --- FIX END ---

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
      const visitDateTime = new Date(
        `${formData.visitDate}T${formData.visitTime}`
      );

      let visitId: string;

      if (existingVisitId) {
        // Update existing visit (Start Visit workflow)
        const { error: visitError } = await supabase
          .from("visits")
          .update({
            visit_date: visitDateTime.toISOString(),
            notes: formData.visitNotes || null,
            status: "completed", // Mark as completed when doctor saves
          })
          .eq("id", existingVisitId);

        if (visitError) {
          console.error("Visit update error:", visitError);
          toast.error(t("add.errors.visitFailed"));
          setSaving(false);
          return;
        }

        visitId = existingVisitId;

        // Delete existing symptoms and diagnoses (will be replaced)
        await supabase.from("visit_symptoms").delete().eq("visit_id", visitId);
        await supabase.from("visit_diagnoses").delete().eq("visit_id", visitId);
      } else {
        // Create new visit
        const { data: visit, error: visitError } = await supabase
          .from("visits")
          .insert({
            patient_id: formData.patientId,
            doctor_id: session.user.id,
            visit_date: visitDateTime.toISOString(),
            notes: formData.visitNotes || null,
            status: "completed", // New visits from this flow are completed
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

        visitId = visit.id;
      }

      // Insert symptoms
      if (formData.symptoms.length > 0) {
        const symptomsData = formData.symptoms
          .filter((s) => s.symptom.trim())
          .map((s) => ({
            visit_id: visitId,
            symptom: s.symptom.trim(),
            duration: s.duration?.trim() || null,
            notes: s.notes?.trim() || null,
            source: "doctor" as const,
            entered_by: session.user.id,
            follow_up_data:
              Object.keys(s.followUpAnswers || {}).length > 0
                ? s.followUpAnswers
                : null,
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
            visit_id: visitId,
            diagnosis: d.diagnosis.trim(),
            notes: d.notes?.trim() || null,
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

      toast.success(
        existingVisitId
          ? t("add.success.visitCompleted", "Visit completed successfully")
          : t("add.success.visitAdded")
      );
      onComplete?.();
    } catch (error) {
      console.error("Error saving visit:", error);
      toast.error(t("add.errors.saveError"));
    } finally {
      setSaving(false);
    }
  };

  const handleGenerateNotes = async () => {
    // Check if there's any data to generate notes from
    if (formData.symptoms.length === 0 && formData.diagnoses.length === 0) {
      toast.error(t("add.stages.notes.generateNoData"));
      return;
    }

    setGenerating(true);
    try {
      const response = await fetch("/api/generate-notes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          patientName: formData.patientName,
          patient: formData.patient,
          symptoms: formData.symptoms.map((s) => ({
            symptom: s.symptom,
            duration: s.duration,
            notes: s.notes,
            followUpAnswers: s.followUpAnswers,
          })),
          diagnoses: formData.diagnoses.map((d) => ({
            diagnosis: d.diagnosis,
            notes: d.notes,
          })),
          visitDate: formData.visitDate,
          visitTime: formData.visitTime,
          existingNotes: formData.visitNotes,
          language: i18n.language,
        }),
      });

      const data = await response.json();
      //console.log(formData.patient);

      if (!response.ok) {
        throw new Error(data.error || "Failed to generate notes");
      }

      if (data.success && data.notes) {
        setFormData((prev) => ({
          ...prev,
          visitNotes: data.notes,
        }));
        toast.success(t("add.stages.notes.generateSuccess"));
      }
    } catch (error) {
      console.error("Error generating notes:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : t("add.stages.notes.generateError")
      );
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 space-y-6">
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
                  setFormData((prev) => ({
                    ...prev,
                    visitDate: e.target.value,
                  }))
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
                  setFormData((prev) => ({
                    ...prev,
                    visitTime: e.target.value,
                  }))
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
            <Button
              variant="default"
              size="default"
              className="bg-brand text-white hover:!bg-brand hover:brightness-125"
              onClick={handleGenerateNotes}
              disabled={generating || saving}
            >
              {generating ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <WandSparklesIcon className="h-4 w-4 mr-2" />
              )}
              {generating
                ? t("add.stages.notes.generating")
                : t("add.buttons.generateNotes")}
            </Button>
          </div>
        </div>
      </div>

      <div className="flex justify-end space-x-2 pt-4 mt-auto">
        <Button variant="outline" onClick={onCancel} disabled={saving}>
          {t("add.buttons.cancel")}
        </Button>
        <Button variant="outline" onClick={onPrevious} disabled={saving}>
          {t("add.buttons.previous")}
        </Button>
        <Button
          onClick={handleSave}
          disabled={saving}
          className="bg-brand text-white hover:!bg-brand hover:brightness-125"
        >
          {saving ? t("add.buttons.saving") : t("add.buttons.complete")}
        </Button>
      </div>
    </div>
  );
}
