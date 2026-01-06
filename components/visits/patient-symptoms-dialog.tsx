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
import { Plus, X, Loader2, MessageSquare } from "lucide-react";
import type { SymptomDefinition, FollowUpQuestion } from "./add-visit";
import { cn } from "@/lib/utils";

// API endpoint
const DIAGNOSIS_API_URL =
  process.env.NEXT_PUBLIC_DIAGNOSIS_API_URL || "http://localhost:5001";

interface PatientSymptom {
  symptom: string;
  notes: string;
  followUpAnswers: Record<string, string | number>;
}

interface PatientSymptomsDialogProps {
  visit: {
    id: string;
    status?: string;
  };
  patientId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSymptomsUpdated?: () => void;
}

export function PatientSymptomsDialog({
  visit,
  patientId,
  open,
  onOpenChange,
  onSymptomsUpdated,
}: PatientSymptomsDialogProps) {
  const { t } = useTranslation("patientVisits");
  const [symptomLibrary, setSymptomLibrary] = React.useState<
    SymptomDefinition[]
  >([]);
  const [symptoms, setSymptoms] = React.useState<PatientSymptom[]>([]);
  const [showSuggestions, setShowSuggestions] = React.useState<
    Record<number, boolean>
  >({});
  const [showNotes, setShowNotes] = React.useState<Record<number, boolean>>({});
  const [saving, setSaving] = React.useState(false);
  const [loadingSymptoms, setLoadingSymptoms] = React.useState(false);
  const [loadingExisting, setLoadingExisting] = React.useState(true);
  const [newlyAddedIndex, setNewlyAddedIndex] = React.useState<number | null>(
    null
  );
  const symptomRefs = React.useRef<Record<number, HTMLDivElement | null>>({});
  const inputRefs = React.useRef<Record<number, HTMLInputElement | null>>({});

  // Fetch symptom library when dialog opens
  React.useEffect(() => {
    if (open && symptomLibrary.length === 0) {
      const fetchSymptomLibrary = async () => {
        setLoadingSymptoms(true);
        try {
          const response = await fetch(`${DIAGNOSIS_API_URL}/api/symptoms`);
          if (response.ok) {
            const data = await response.json();
            if (data.success && data.symptoms) {
              setSymptomLibrary(data.symptoms);
            }
          }
        } catch (error) {
          console.error("Error fetching symptom library:", error);
        } finally {
          setLoadingSymptoms(false);
        }
      };
      fetchSymptomLibrary();
    }
  }, [open, symptomLibrary.length]);

  // Load existing symptoms when dialog opens
  React.useEffect(() => {
    if (open && visit) {
      const loadExistingSymptoms = async () => {
        setLoadingExisting(true);
        try {
          const { data: existingSymptoms, error } = await supabase
            .from("visit_symptoms")
            .select("symptom, notes, source, follow_up_data")
            .eq("visit_id", visit.id);

          if (error) {
            console.error("Error loading existing symptoms:", error);
            setSymptoms([]);
          } else {
            // Filter to only patient-entered symptoms and transform
            const patientSymptoms = (existingSymptoms || [])
              .filter((s) => !s.source || s.source === "patient")
              .map((s) => ({
                symptom: s.symptom,
                notes: s.notes || "",
                followUpAnswers:
                  (s.follow_up_data as Record<string, string | number>) || {},
              }));
            setSymptoms(patientSymptoms);
          }
        } catch (error) {
          console.error("Error loading existing symptoms:", error);
          setSymptoms([]);
        } finally {
          setLoadingExisting(false);
        }
      };
      loadExistingSymptoms();
    }
  }, [open, visit]);

  const addSymptom = () => {
    const newIndex = symptoms.length;
    setSymptoms((prev) => [
      ...prev,
      { symptom: "", notes: "", followUpAnswers: {} },
    ]);
    setNewlyAddedIndex(newIndex);
  };

  // Auto-scroll to newly added symptom
  React.useEffect(() => {
    if (newlyAddedIndex !== null && symptomRefs.current[newlyAddedIndex]) {
      setTimeout(() => {
        symptomRefs.current[newlyAddedIndex]?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
        inputRefs.current[newlyAddedIndex]?.focus();
        setTimeout(() => setNewlyAddedIndex(null), 500);
      }, 50);
    }
  }, [newlyAddedIndex, symptoms.length]);

  const removeSymptom = (index: number) => {
    setSymptoms((prev) => prev.filter((_, i) => i !== index));
    delete showNotes[index];
  };

  const toggleNotes = (index: number) => {
    setShowNotes((prev) => ({ ...prev, [index]: !prev[index] }));
  };

  const updateSymptom = (
    index: number,
    field: keyof PatientSymptom,
    value: unknown
  ) => {
    setSymptoms((prev) =>
      prev.map((s, i) => (i === index ? { ...s, [field]: value } : s))
    );
  };

  const updateFollowUpAnswer = (
    index: number,
    key: string,
    value: string | number
  ) => {
    setSymptoms((prev) =>
      prev.map((s, i) =>
        i === index
          ? { ...s, followUpAnswers: { ...s.followUpAnswers, [key]: value } }
          : s
      )
    );
  };

  const selectSymptom = (index: number, symptomDef: SymptomDefinition) => {
    setSymptoms((prev) =>
      prev.map((s, i) =>
        i === index ? { ...s, symptom: symptomDef.id, followUpAnswers: {} } : s
      )
    );
    setShowSuggestions((prev) => ({ ...prev, [index]: false }));
  };

  const getFilteredSymptoms = (searchTerm: string): SymptomDefinition[] => {
    if (!searchTerm.trim()) return [];
    const term = searchTerm.toLowerCase();
    return symptomLibrary
      .filter((s) => s.display_name.toLowerCase().includes(term))
      .slice(0, 8);
  };

  const getSymptomDefinition = (
    symptomName: string
  ): SymptomDefinition | undefined => {
    return symptomLibrary.find(
      (s) => s.id === symptomName || s.display_name === symptomName
    );
  };

  const renderFollowUpInput = (
    question: FollowUpQuestion,
    symptomIndex: number,
    currentValue: string | number | undefined
  ) => {
    const inputId = `followup-${symptomIndex}-${question.key}`;

    if (question.type === "enum" && question.options) {
      return (
        <div className="space-y-1">
          <Label htmlFor={inputId} className="text-foreground text-sm">
            {question.label}
          </Label>
          <Select
            value={currentValue?.toString() || ""}
            onValueChange={(value: string) =>
              updateFollowUpAnswer(symptomIndex, question.key, value)
            }
          >
            <SelectTrigger className="h-9 bg-white">
              <SelectValue placeholder={t("dialog.select", "Select...")} />
            </SelectTrigger>
            <SelectContent>
              {question.options.map((option) => (
                <SelectItem key={option} value={option}>
                  {option.replace(/_/g, " ")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      );
    }

    if (question.type === "range") {
      return (
        <div className="space-y-1">
          <Label htmlFor={inputId} className="text-foreground text-sm">
            {question.label}{" "}
            <span className="opacity-60">
              ({question.min || 1}-{question.max || 10})
            </span>
          </Label>
          <Input
            id={inputId}
            type="number"
            min={question.min || 1}
            max={question.max || 10}
            value={currentValue?.toString() || ""}
            onChange={(e) =>
              updateFollowUpAnswer(
                symptomIndex,
                question.key,
                parseInt(e.target.value) || 0
              )
            }
            className="bg-white"
          />
        </div>
      );
    }

    return (
      <div className="space-y-1">
        <Label htmlFor={inputId} className="text-foreground text-sm">
          {question.label}
        </Label>
        <Input
          id={inputId}
          type="number"
          value={currentValue?.toString() || ""}
          onChange={(e) =>
            updateFollowUpAnswer(
              symptomIndex,
              question.key,
              parseFloat(e.target.value) || 0
            )
          }
          className="bg-white"
        />
      </div>
    );
  };

  const handleSaveSymptoms = async () => {
    if (!visit || symptoms.length === 0) return;

    setSaving(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error("Not authenticated");
      }

      // Delete existing patient-entered symptoms for this visit
      await supabase
        .from("visit_symptoms")
        .delete()
        .eq("visit_id", visit.id)
        .eq("source", "patient");

      // Insert new symptoms
      const symptomsToInsert = symptoms
        .filter((s) => s.symptom.trim())
        .map((s) => ({
          visit_id: visit.id,
          symptom: s.symptom,
          notes: s.notes || null,
          duration: null,
          source: "patient" as const,
          entered_by: user.id,
          follow_up_data:
            Object.keys(s.followUpAnswers).length > 0
              ? s.followUpAnswers
              : null,
        }));

      if (symptomsToInsert.length > 0) {
        const { error } = await supabase
          .from("visit_symptoms")
          .insert(symptomsToInsert);

        if (error) {
          throw error;
        }
      }

      // Update visit status to checked_in when patient adds symptoms
      if (visit.status === "scheduled") {
        await supabase
          .from("visits")
          .update({ status: "checked_in" })
          .eq("id", visit.id);
      }

      toast.success(
        t("messages.symptomsSaved", "Symptoms saved successfully!")
      );
      onSymptomsUpdated?.();
      onOpenChange(false);
    } catch (error) {
      console.error("Error saving symptoms:", error);
      toast.error(
        t("messages.saveError", "Failed to save symptoms. Please try again.")
      );
    } finally {
      setSaving(false);
    }
  };

  const isLoading = loadingSymptoms || loadingExisting;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] h-full flex flex-col">
        <DialogHeader>
          <DialogTitle>{t("dialog.title", "Enter Your Symptoms")}</DialogTitle>
          <DialogDescription>
            {t(
              "dialog.description",
              "Help your doctor by describing your symptoms before your visit."
            )}
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12 gap-3">
            <Loader2 className="h-6 w-6 animate-spin text-brand" />
            <span className="text-muted-foreground">
              {t("dialog.loading", "Loading...")}
            </span>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto space-y-4 py-2 h-full">
            {/* Header with Add button */}
            <div className="flex items-center justify-between">
              <Label className="text-base font-semibold">
                {t("dialog.yourSymptoms", "Your Symptoms")} ({symptoms.length})
              </Label>
              <Button
                type="button"
                variant="default"
                size="sm"
                onClick={addSymptom}
                className="bg-brand text-white hover:!bg-brand hover:brightness-125"
              >
                <Plus className="mr-2 h-4 w-4" />
                {t("dialog.addSymptom", "Add Symptom")}
              </Button>
            </div>

            {symptoms.length === 0 ? (
              <div className="text-center py-8 text-foreground border border-dashed rounded-md flex flex-col items-center justify-center gap-4 h-full">
                {t("dialog.noSymptoms", "No symptoms added yet")}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addSymptom}
                  className="border-dashed border-primary/20 flex flex-col items-center justify-center gap-2 p-8"
                >
                  {t("dialog.addFirst", "Add Your First Symptom")}
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {symptoms.map((symptom, index) => {
                  const symptomDef = getSymptomDefinition(symptom.symptom);
                  const allFollowUps = [
                    ...(symptomDef?.global_follow_ups || []),
                    ...(symptomDef?.unique_follow_ups || []),
                  ];
                  const hasFollowUps = allFollowUps.length > 0;
                  const hasNotes = symptom.notes.trim().length > 0;
                  const isNewlyAdded = newlyAddedIndex === index;

                  return (
                    <div
                      key={index}
                      ref={(el) => {
                        symptomRefs.current[index] = el;
                      }}
                      className={cn(
                        "relative pl-4 border-l-2 border-brand/40 hover:border-brand hover:bg-gray-50/70 transition-all duration-300 p-4 rounded-r-md",
                        isNewlyAdded &&
                          "animate-in fade-in-0 slide-in-from-bottom-4"
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <span className="flex-shrink-0 w-6 h-6 rounded-full bg-brand/10 text-brand text-xs font-semibold flex items-center justify-center mt-1">
                          {index + 1}
                        </span>

                        <div className="flex-1 min-w-0">
                          {/* Symptom search */}
                          <div className="symptom-autocomplete relative">
                            <Input
                              ref={(el) => {
                                inputRefs.current[index] = el;
                              }}
                              id={`symptom-${index}`}
                              value={symptom.symptom}
                              onChange={(e) => {
                                updateSymptom(index, "symptom", e.target.value);
                                setShowSuggestions((prev) => ({
                                  ...prev,
                                  [index]: e.target.value.trim().length > 0,
                                }));
                              }}
                              onFocus={() => {
                                if (symptom.symptom.trim()) {
                                  setShowSuggestions((prev) => ({
                                    ...prev,
                                    [index]: true,
                                  }));
                                }
                              }}
                              onKeyDown={(e) => {
                                if (e.key === "Escape") {
                                  setShowSuggestions((prev) => ({
                                    ...prev,
                                    [index]: false,
                                  }));
                                  inputRefs.current[index]?.blur();
                                }
                              }}
                              placeholder={t(
                                "dialog.symptomPlaceholder",
                                "Type to search symptoms..."
                              )}
                              className="font-medium bg-white"
                            />
                            {showSuggestions[index] && (
                              <div className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-lg max-h-[200px] overflow-y-auto">
                                {getFilteredSymptoms(symptom.symptom).length >
                                0 ? (
                                  <ul className="py-1">
                                    {getFilteredSymptoms(symptom.symptom).map(
                                      (s, i) => (
                                        <li key={i}>
                                          <button
                                            type="button"
                                            className="w-full text-left px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground outline-none"
                                            onClick={() =>
                                              selectSymptom(index, s)
                                            }
                                            onMouseDown={(e) =>
                                              e.preventDefault()
                                            }
                                          >
                                            <div className="font-medium">
                                              {s.display_name}
                                            </div>
                                            {(s.global_follow_ups?.length ||
                                              0) +
                                              (s.unique_follow_ups?.length ||
                                                0) >
                                              0 && (
                                              <div className="text-xs text-foreground/70">
                                                {(s.global_follow_ups?.length ||
                                                  0) +
                                                  (s.unique_follow_ups
                                                    ?.length || 0)}{" "}
                                                {t(
                                                  "dialog.followUpQuestions",
                                                  "follow-up questions"
                                                )}
                                              </div>
                                            )}
                                          </button>
                                        </li>
                                      )
                                    )}
                                  </ul>
                                ) : symptom.symptom.trim() ? (
                                  <div className="px-3 py-2 text-sm text-foreground">
                                    {t(
                                      "dialog.noSuggestions",
                                      "No suggestions found. You can type your own symptom."
                                    )}
                                  </div>
                                ) : null}
                              </div>
                            )}
                          </div>

                          {/* Follow-up questions grid - shown inline */}
                          {hasFollowUps && (
                            <div className="mt-3 grid grid-cols-2 gap-3">
                              {allFollowUps.map((question) => (
                                <div key={question.key}>
                                  {renderFollowUpInput(
                                    question,
                                    index,
                                    symptom.followUpAnswers[question.key]
                                  )}
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Notes toggle & textarea */}
                          <div className="mt-3">
                            {!showNotes[index] && !hasNotes ? (
                              <button
                                type="button"
                                onClick={() => toggleNotes(index)}
                                className="inline-flex items-center gap-1.5 text-sm text-foreground/70 hover:text-foreground transition-colors"
                              >
                                <MessageSquare className="h-4 w-4" />
                                {t("dialog.notesLabel", "Additional Notes")}
                              </button>
                            ) : (
                              <textarea
                                id={`notes-${index}`}
                                value={symptom.notes}
                                onChange={(e) =>
                                  updateSymptom(index, "notes", e.target.value)
                                }
                                placeholder={t(
                                  "dialog.notesPlaceholder",
                                  "Any additional details..."
                                )}
                                rows={2}
                                className="flex min-h-[60px] w-full rounded-md border border-input bg-white px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-foreground/50 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
                              />
                            )}
                          </div>
                        </div>

                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeSymptom(index)}
                          className="flex-shrink-0 h-8 w-8 text-foreground/60 hover:text-destructive"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        <DialogFooter className="border-t pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("dialog.cancel", "Cancel")}
          </Button>
          <Button
            onClick={handleSaveSymptoms}
            disabled={saving || symptoms.length === 0}
            className="bg-brand text-white hover:!bg-brand hover:brightness-125"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {t("dialog.saving", "Saving...")}
              </>
            ) : (
              t("dialog.save", "Save Symptoms")
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
