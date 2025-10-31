"use client";

import * as React from "react";
import { useTranslation } from "react-i18next";
import "@/lib/i18n";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import type { Visit } from "./visits-table";

interface Symptom {
  id: string;
  symptom: string;
  duration: string | null;
  notes: string | null;
}

interface Diagnosis {
  id: string;
  diagnosis: string;
  notes: string | null;
}

interface EditVisitDialogProps {
  visit: Visit | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onVisitUpdated?: () => void;
}

export function EditVisitDialog({
  visit,
  open,
  onOpenChange,
  onVisitUpdated,
}: EditVisitDialogProps) {
  const { t } = useTranslation("visits");
  const [saving, setSaving] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [symptoms, setSymptoms] = React.useState<Symptom[]>([]);
  const [diagnoses, setDiagnoses] = React.useState<Diagnosis[]>([]);

  // Form state
  const [visitDate, setVisitDate] = React.useState("");
  const [visitTime, setVisitTime] = React.useState("");
  const [notes, setNotes] = React.useState("");

  // Fetch visit details (symptoms and diagnoses) when visit changes
  React.useEffect(() => {
    if (visit && open) {
      setLoading(true);
      
      // Parse the visit_date which is a timestamp
      const visitDateTime = new Date(visit.visit_date);
      // Format date as YYYY-MM-DD
      const dateStr = visitDateTime.toISOString().split("T")[0];
      // Format time as HH:mm
      const timeStr = visitDateTime.toTimeString().split(" ")[0].slice(0, 5);
      
      setVisitDate(dateStr);
      setVisitTime(timeStr);
      setNotes(visit.notes || "");

      // Fetch symptoms
      const fetchSymptoms = async () => {
        try {
          const { data, error } = await supabase
            .from("visit_symptoms")
            .select("*")
            .eq("visit_id", visit.id)
            .order("created_at", { ascending: true });

          if (error) {
            console.error("Error fetching symptoms:", error);
            setSymptoms([]);
          } else {
            setSymptoms(data || []);
          }
        } catch (error) {
          console.error("Error fetching symptoms:", error);
          setSymptoms([]);
        }
      };

      // Fetch diagnoses
      const fetchDiagnoses = async () => {
        try {
          const { data, error } = await supabase
            .from("visit_diagnoses")
            .select("*")
            .eq("visit_id", visit.id)
            .order("created_at", { ascending: true });

          if (error) {
            console.error("Error fetching diagnoses:", error);
            setDiagnoses([]);
          } else {
            setDiagnoses(data || []);
          }
        } catch (error) {
          console.error("Error fetching diagnoses:", error);
          setDiagnoses([]);
        }
      };

      Promise.all([fetchSymptoms(), fetchDiagnoses()]).finally(() => {
        setLoading(false);
      });
    } else {
      setSymptoms([]);
      setDiagnoses([]);
    }
  }, [visit, open]);

  const handleSave = async () => {
    if (!visit) return;

    // Validation
    if (!visitDate) {
      toast.error(t("edit.errors.visitDateRequired"));
      return;
    }

    if (!visitTime) {
      toast.error(t("edit.errors.visitTimeRequired"));
      return;
    }

    setSaving(true);
    try {
      // Combine date and time into a single datetime
      const visitDateTime = new Date(`${visitDate}T${visitTime}`);
      
      const updateData: any = {
        visit_date: visitDateTime.toISOString(),
      };

      // Only include notes if it has a value
      if (notes.trim()) {
        updateData.notes = notes.trim();
      } else {
        updateData.notes = null;
      }

      const { error } = await supabase
        .from("visits")
        .update(updateData)
        .eq("id", visit.id);

      if (error) {
        console.error("Update error:", error);
        toast.error(t("edit.errors.updateFailed"));
      } else {
        toast.success(t("edit.success.visitUpdated"));
        onVisitUpdated?.();
        onOpenChange(false);
      }
    } catch (error) {
      console.error("Error saving visit:", error);
      toast.error(t("edit.errors.saveError"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("edit.title")}</DialogTitle>
          <DialogDescription>{t("edit.description")}</DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="py-8 text-center text-muted-foreground">
            {t("table.loading")}
          </div>
        ) : (
          <div className="space-y-6 py-4">
            {/* Basic Information */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">
                  {t("edit.sections.basicInfo")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Patient (read-only) */}
                <div className="space-y-2">
                  <Label htmlFor="visit-patient">
                    {t("edit.fields.patient")}
                  </Label>
                  <Input
                    id="visit-patient"
                    value={
                      visit?.patient
                        ? `${visit.patient.first_name} ${visit.patient.last_name}`
                        : t("table.unknownPatient")
                    }
                    disabled
                    className="bg-muted"
                  />
                </div>

                {/* Visit Date and Time */}
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="space-y-2 flex-1">
                    <Label htmlFor="visit-date">
                      {t("edit.fields.visitDate")}{" "}
                      <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="visit-date"
                      type="date"
                      value={visitDate}
                      onChange={(e) => setVisitDate(e.target.value)}
                      disabled={saving}
                    />
                  </div>

                  <div className="space-y-2 flex-1">
                    <Label htmlFor="visit-time">
                      {t("edit.fields.visitTime")}{" "}
                      <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="visit-time"
                      type="time"
                      value={visitTime}
                      onChange={(e) => setVisitTime(e.target.value)}
                      disabled={saving}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Symptoms */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">
                  {t("edit.sections.symptoms")} ({symptoms.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {symptoms.length === 0 ? (
                  <div className="text-center py-4 text-muted-foreground">
                    {t("edit.symptoms.noSymptoms")}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {symptoms.map((symptom, index) => (
                      <div
                        key={symptom.id}
                        className="p-4 border rounded-md bg-card space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <div className="font-medium">
                            {t("edit.symptoms.title")} {index + 1}
                          </div>
                        </div>
                        <div className="space-y-2">
                          <div>
                            <Label className="text-sm text-muted-foreground">
                              {t("edit.symptoms.title")}
                            </Label>
                            <div className="font-medium">{symptom.symptom}</div>
                          </div>
                          {symptom.duration && (
                            <div>
                              <Label className="text-sm text-muted-foreground">
                                {t("edit.symptoms.duration")}
                              </Label>
                              <div>{symptom.duration}</div>
                            </div>
                          )}
                          {symptom.notes && (
                            <div>
                              <Label className="text-sm text-muted-foreground">
                                {t("edit.symptoms.notes")}
                              </Label>
                              <div className="text-sm">{symptom.notes}</div>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Diagnoses */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">
                  {t("edit.sections.diagnoses")} ({diagnoses.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {diagnoses.length === 0 ? (
                  <div className="text-center py-4 text-muted-foreground">
                    {t("edit.diagnoses.noDiagnoses")}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {diagnoses.map((diagnosis, index) => (
                      <div
                        key={diagnosis.id}
                        className="p-4 border rounded-md bg-card space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <div className="font-medium">
                            {t("edit.diagnoses.title")} {index + 1}
                          </div>
                        </div>
                        <div className="space-y-2">
                          <div>
                            <Label className="text-sm text-muted-foreground">
                              {t("edit.diagnoses.title")}
                            </Label>
                            <div className="font-medium">
                              {diagnosis.diagnosis}
                            </div>
                          </div>
                          {diagnosis.notes && (
                            <div>
                              <Label className="text-sm text-muted-foreground">
                                {t("edit.diagnoses.notes")}
                              </Label>
                              <div className="text-sm">{diagnosis.notes}</div>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Visit Notes */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">
                  {t("edit.sections.visitNotes")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Label htmlFor="visit-notes">
                    {t("edit.fields.notes")}
                  </Label>
                  <textarea
                    id="visit-notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder={t("edit.placeholders.notes")}
                    disabled={saving}
                    rows={6}
                    className="flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-base shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm resize-none"
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            {t("edit.buttons.cancel")}
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? t("edit.buttons.saving") : t("edit.buttons.saveChanges")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

