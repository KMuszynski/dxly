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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Plus, X, Loader2, User, Stethoscope, MessageSquare } from "lucide-react";
import type { Visit } from "./visits-table";
import { cn } from "@/lib/utils";

interface Symptom {
  id: string;
  symptom: string;
  duration: string | null;
  notes: string | null;
  source?: string;  // 'patient' | 'doctor' | 'assistant'
  follow_up_data?: Record<string, unknown>;
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
  readOnly?: boolean;
}

export function EditVisitDialog({
  visit,
  open,
  onOpenChange,
  onVisitUpdated,
  readOnly = false,
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
  const [status, setStatus] = React.useState<string>("scheduled");
  
  // New diagnosis form
  const [newDiagnosis, setNewDiagnosis] = React.useState("");
  const [newDiagnosisNotes, setNewDiagnosisNotes] = React.useState("");
  const [addingDiagnosis, setAddingDiagnosis] = React.useState(false);
  const [showDiagnosisNotes, setShowDiagnosisNotes] = React.useState(false);
  const [expandedSymptomNotes, setExpandedSymptomNotes] = React.useState<Record<string, boolean>>({});
  const [expandedDiagnosisNotes, setExpandedDiagnosisNotes] = React.useState<Record<string, boolean>>({});

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
      setStatus(visit.status || "scheduled");
      setNewDiagnosis("");
      setNewDiagnosisNotes("");

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

  const handleAddDiagnosis = async () => {
    if (!visit || !newDiagnosis.trim()) return;

    setAddingDiagnosis(true);
    try {
      const { data, error } = await supabase
        .from("visit_diagnoses")
        .insert({
          visit_id: visit.id,
          diagnosis: newDiagnosis.trim(),
          notes: newDiagnosisNotes.trim() || null,
        })
        .select()
        .single();

      if (error) throw error;

      setDiagnoses((prev) => [...prev, data]);
      setNewDiagnosis("");
      setNewDiagnosisNotes("");
      toast.success(t("edit.success.diagnosisAdded", "Diagnosis added"));
    } catch (error) {
      console.error("Error adding diagnosis:", error);
      toast.error(t("edit.errors.diagnosisFailed", "Failed to add diagnosis"));
    } finally {
      setAddingDiagnosis(false);
    }
  };

  const handleRemoveDiagnosis = async (diagnosisId: string) => {
    try {
      const { error } = await supabase
        .from("visit_diagnoses")
        .delete()
        .eq("id", diagnosisId);

      if (error) throw error;

      setDiagnoses((prev) => prev.filter((d) => d.id !== diagnosisId));
      toast.success(t("edit.success.diagnosisRemoved", "Diagnosis removed"));
    } catch (error) {
      console.error("Error removing diagnosis:", error);
      toast.error(t("edit.errors.diagnosisRemoveFailed", "Failed to remove diagnosis"));
    }
  };

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
        status: status,
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

  const toggleSymptomNotes = (id: string) => {
    setExpandedSymptomNotes((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleDiagnosisNotes = (id: string) => {
    setExpandedDiagnosisNotes((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {readOnly ? t("view.title") : t("edit.title")}
          </DialogTitle>
          <DialogDescription>
            {readOnly ? t("view.description") : t("edit.description")}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12 gap-3">
            <Loader2 className="h-6 w-6 animate-spin text-brand" />
            <span className="text-muted-foreground">{t("table.loading")}</span>
          </div>
        ) : (
          <div className="space-y-6 py-4">
            {/* Basic Information Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-base font-semibold">
                  {t("edit.sections.basicInfo")}
                </Label>
              </div>

              {/* Patient (read-only) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="visit-patient" className="text-foreground">
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

                {/* Visit Status */}
                <div className="space-y-2">
                  <Label htmlFor="visit-status" className="text-foreground">
                    {t("edit.fields.status")}
                  </Label>
                  <Select
                    value={status}
                    onValueChange={(value: string) => setStatus(value)}
                    disabled={saving || readOnly}
                  >
                    <SelectTrigger className="h-9 bg-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="scheduled">{t("status.scheduled")}</SelectItem>
                      <SelectItem value="checked_in">{t("status.checkedIn")}</SelectItem>
                      <SelectItem value="in_progress">{t("status.inProgress")}</SelectItem>
                      <SelectItem value="completed">{t("status.completed")}</SelectItem>
                      <SelectItem value="cancelled">{t("status.cancelled")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Visit Date and Time */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="visit-date" className="text-foreground">
                    {t("edit.fields.visitDate")}{" "}
                    {!readOnly && <span className="text-destructive">*</span>}
                  </Label>
                  <Input
                    id="visit-date"
                    type="date"
                    value={visitDate}
                    onChange={(e) => setVisitDate(e.target.value)}
                    disabled={saving || readOnly}
                    className="bg-white"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="visit-time" className="text-foreground">
                    {t("edit.fields.visitTime")}{" "}
                    {!readOnly && <span className="text-destructive">*</span>}
                  </Label>
                  <Input
                    id="visit-time"
                    type="time"
                    value={visitTime}
                    onChange={(e) => setVisitTime(e.target.value)}
                    disabled={saving || readOnly}
                    className="bg-white"
                  />
                </div>
              </div>
            </div>

            {/* Symptoms Section */}
            <div className="space-y-4 border-t pt-6">
              <div className="flex items-center justify-between">
                <Label className="text-base font-semibold">
                  {t("edit.sections.symptoms")} ({symptoms.length})
                </Label>
              </div>

              {symptoms.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground border border-dashed rounded-md">
                  {t("edit.symptoms.noSymptoms")}
                </div>
              ) : (
                <div className="space-y-4">
                  {symptoms.map((symptom, index) => {
                    const hasNotes = symptom.notes && symptom.notes.trim().length > 0;
                    const hasFollowUp = symptom.follow_up_data && Object.keys(symptom.follow_up_data).length > 0;

                    return (
                      <div
                        key={symptom.id}
                        className="relative pl-4 border-l-2 border-brand/40 hover:border-brand hover:bg-gray-50/70 transition-all duration-300 p-4 rounded-r-md"
                      >
                        <div className="flex items-start gap-3">
                          <span className="flex-shrink-0 w-6 h-6 rounded-full bg-brand/10 text-brand text-xs font-semibold flex items-center justify-center mt-0.5">
                            {index + 1}
                          </span>

                          <div className="flex-1 min-w-0 space-y-2">
                            {/* Symptom name and source badge */}
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-medium text-foreground">
                                {symptom.symptom}
                              </span>
                              {symptom.source === "patient" && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                                  <User className="h-3 w-3" />
                                  {t("edit.symptoms.patientEntered")}
                                </span>
                              )}
                              {(symptom.source === "doctor" || symptom.source === "assistant") && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300">
                                  <Stethoscope className="h-3 w-3" />
                                  {t("edit.symptoms.clinicEntered")}
                                </span>
                              )}
                            </div>

                            {/* Duration */}
                            {symptom.duration && (
                              <div className="text-sm text-foreground/70">
                                <span className="font-medium">{t("edit.symptoms.duration")}:</span>{" "}
                                {symptom.duration}
                              </div>
                            )}

                            {/* Follow-up data in a grid */}
                            {hasFollowUp && (
                              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2">
                                {Object.entries(symptom.follow_up_data!).map(([key, value]) => (
                                  <div
                                    key={key}
                                    className="text-sm px-2 py-1 rounded bg-muted/50 text-foreground"
                                  >
                                    <span className="text-foreground/60">{key.replace(/_/g, " ")}:</span>{" "}
                                    <span className="font-medium">{String(value).replace(/_/g, " ")}</span>
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* Notes toggle & content */}
                            <div className="mt-2">
                              {!expandedSymptomNotes[symptom.id] && hasNotes ? (
                                <button
                                  type="button"
                                  onClick={() => toggleSymptomNotes(symptom.id)}
                                  className="inline-flex items-center gap-1.5 text-sm text-foreground/70 hover:text-foreground transition-colors"
                                >
                                  <MessageSquare className="h-4 w-4" />
                                  {t("edit.symptoms.notes")}
                                </button>
                              ) : hasNotes ? (
                                <div className="p-3 bg-muted/30 rounded-md text-sm text-foreground/80">
                                  {symptom.notes}
                                </div>
                              ) : null}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Diagnoses Section */}
            <div className="space-y-4 border-t pt-6">
              <div className="flex items-center justify-between">
                <Label className="text-base font-semibold">
                  {t("edit.sections.diagnoses")} ({diagnoses.length})
                </Label>
                {!readOnly && (
                  <Button
                    type="button"
                    variant="default"
                    size="sm"
                    onClick={() => {
                      setNewDiagnosis("");
                      setNewDiagnosisNotes("");
                      setShowDiagnosisNotes(false);
                    }}
                    className="bg-brand text-white hover:!bg-brand hover:brightness-125"
                    disabled={addingDiagnosis}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    {t("edit.diagnoses.addNew")}
                  </Button>
                )}
              </div>

              {diagnoses.length === 0 && !newDiagnosis ? (
                <div className="text-center py-6 text-muted-foreground border border-dashed rounded-md">
                  {t("edit.diagnoses.noDiagnoses")}
                </div>
              ) : (
                <div className="space-y-4">
                  {diagnoses.map((diagnosis, index) => {
                    const hasNotes = diagnosis.notes && diagnosis.notes.trim().length > 0;

                    return (
                      <div
                        key={diagnosis.id}
                        className="relative pl-4 border-l-2 border-brand/40 hover:border-brand hover:bg-gray-50/70 transition-all duration-300 p-4 rounded-r-md"
                      >
                        <div className="flex items-start gap-3">
                          <span className="flex-shrink-0 w-6 h-6 rounded-full bg-brand/10 text-brand text-xs font-semibold flex items-center justify-center mt-0.5">
                            {index + 1}
                          </span>

                          <div className="flex-1 min-w-0 space-y-2">
                            {/* Diagnosis name */}
                            <span className="font-medium text-foreground">
                              {diagnosis.diagnosis}
                            </span>

                            {/* Notes toggle & content */}
                            {hasNotes && (
                              <div className="mt-2">
                                {!expandedDiagnosisNotes[diagnosis.id] ? (
                                  <button
                                    type="button"
                                    onClick={() => toggleDiagnosisNotes(diagnosis.id)}
                                    className="inline-flex items-center gap-1.5 text-sm text-foreground/70 hover:text-foreground transition-colors"
                                  >
                                    <MessageSquare className="h-4 w-4" />
                                    {t("edit.diagnoses.notes")}
                                  </button>
                                ) : (
                                  <div className="p-3 bg-muted/30 rounded-md text-sm text-foreground/80">
                                    {diagnosis.notes}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>

                          {!readOnly && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => handleRemoveDiagnosis(diagnosis.id)}
                              disabled={saving}
                              className="flex-shrink-0 h-8 w-8 text-foreground/60 hover:text-destructive"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Add new diagnosis inline form */}
              {!readOnly && (
                <div className="relative pl-4 border-l-2 border-dashed border-brand/30 p-4 rounded-r-md bg-muted/20">
                  <div className="space-y-3">
                    <Label className="text-sm font-medium text-foreground">
                      {t("edit.diagnoses.addNew")}
                    </Label>
                    <Input
                      value={newDiagnosis}
                      onChange={(e) => setNewDiagnosis(e.target.value)}
                      placeholder={t("edit.diagnoses.diagnosisPlaceholder")}
                      disabled={addingDiagnosis}
                      className="bg-white"
                    />

                    {/* Notes textarea (shown when toggled) */}
                    {(showDiagnosisNotes || newDiagnosisNotes) && (
                      <textarea
                        value={newDiagnosisNotes}
                        onChange={(e) => setNewDiagnosisNotes(e.target.value)}
                        placeholder={t("edit.diagnoses.notesPlaceholder")}
                        rows={2}
                        disabled={addingDiagnosis}
                        className="flex min-h-[60px] w-full rounded-md border border-input bg-white px-3 py-2 text-sm shadow-sm placeholder:text-foreground/50 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 resize-none"
                      />
                    )}

                    {/* Notes toggle & Add button in a row */}
                    <div className="flex items-center gap-4">
                      {!showDiagnosisNotes && !newDiagnosisNotes && (
                        <button
                          type="button"
                          onClick={() => setShowDiagnosisNotes(true)}
                          className="inline-flex items-center gap-1.5 text-sm text-foreground/70 hover:text-foreground transition-colors"
                        >
                          <MessageSquare className="h-4 w-4" />
                          {t("edit.diagnoses.notes")}
                        </button>
                      )}
                      <Button
                        onClick={handleAddDiagnosis}
                        disabled={!newDiagnosis.trim() || addingDiagnosis}
                        size="sm"
                        className="bg-brand text-white hover:!bg-brand hover:brightness-125"
                      >
                        {addingDiagnosis ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <Plus className="h-4 w-4 mr-2" />
                        )}
                        {t("edit.diagnoses.add")}
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Visit Notes Section */}
            <div className="space-y-4 border-t pt-6">
              <div className="flex items-center justify-between">
                <Label className="text-base font-semibold">
                  {t("edit.sections.visitNotes")}
                </Label>
              </div>
              <textarea
                id="visit-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={readOnly ? "" : t("edit.placeholders.notes")}
                disabled={saving || readOnly}
                rows={4}
                className="flex min-h-[100px] w-full rounded-md border border-input bg-white px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-foreground/50 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 resize-none"
              />
            </div>
          </div>
        )}

        <DialogFooter className="border-t pt-4">
          {readOnly ? (
            <Button
              onClick={() => onOpenChange(false)}
              className="bg-brand text-white hover:!bg-brand hover:brightness-125"
            >
              {t("view.buttons.close")}
            </Button>
          ) : (
            <>
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={saving}
              >
                {t("edit.buttons.cancel")}
              </Button>
              <Button
                onClick={handleSave}
                disabled={saving}
                className="bg-brand text-white hover:!bg-brand hover:brightness-125"
              >
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {t("edit.buttons.saving")}
                  </>
                ) : (
                  t("edit.buttons.saveChanges")
                )}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

