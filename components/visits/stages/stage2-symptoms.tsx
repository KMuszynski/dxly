"use client";

import * as React from "react";
import { useTranslation } from "react-i18next";
import "@/lib/i18n";
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
import { X, Plus, Loader2, MessageSquare } from "lucide-react";
import type {
  VisitFormData,
  SymptomDefinition,
  FollowUpQuestion,
} from "../add-visit";
import { cn } from "@/lib/utils";

// API endpoint - defaults to localhost:5001, can be overridden via env var
const DIAGNOSIS_API_URL =
  process.env.NEXT_PUBLIC_DIAGNOSIS_API_URL ||
  (process.env.NODE_ENV === "production" ? "" : "http://localhost:5001");

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
  const [showSuggestions, setShowSuggestions] = React.useState<
    Record<number, boolean>
  >({});
  const [showNotes, setShowNotes] = React.useState<Record<number, boolean>>({});
  const [newlyAddedIndex, setNewlyAddedIndex] = React.useState<number | null>(
    null
  );
  const inputRefs = React.useRef<Record<number, HTMLInputElement | null>>({});
  const symptomRefs = React.useRef<Record<number, HTMLDivElement | null>>({});
  const listContainerRef = React.useRef<HTMLDivElement | null>(null);

  // State for API-loaded symptoms
  const [symptomLibrary, setSymptomLibrary] = React.useState<
    SymptomDefinition[]
  >([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Fetch symptom library from API
  React.useEffect(() => {
    const fetchSymptoms = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const response = await fetch(`${DIAGNOSIS_API_URL}/api/symptoms`);

        if (!response.ok) {
          throw new Error(`Failed to fetch symptoms: ${response.statusText}`);
        }

        const data = await response.json();

        if (data.success && data.symptoms) {
          setSymptomLibrary(data.symptoms);
        } else {
          throw new Error(data.error || "Failed to load symptoms");
        }
      } catch (err) {
        console.error("Error fetching symptoms:", err);
        setError(
          err instanceof Error
            ? err.message
            : "Failed to load symptoms. Please check if the backend is running."
        );
      } finally {
        setIsLoading(false);
      }
    };

    fetchSymptoms();
  }, []);

  const addSymptom = () => {
    const newIndex = formData.symptoms.length;
    setFormData((prev) => ({
      ...prev,
      symptoms: [
        ...prev.symptoms,
        { symptom: "", duration: "", notes: "", followUpAnswers: {} },
      ],
    }));
    setNewlyAddedIndex(newIndex);
  };

  // Auto-scroll to newly added symptom and focus input
  React.useEffect(() => {
    if (newlyAddedIndex !== null && symptomRefs.current[newlyAddedIndex]) {
      // Small delay to allow DOM to update
      setTimeout(() => {
        symptomRefs.current[newlyAddedIndex]?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
        // Focus the input
        inputRefs.current[newlyAddedIndex]?.focus();
        // Clear the newly added index after animation
        setTimeout(() => setNewlyAddedIndex(null), 500);
      }, 50);
    }
  }, [newlyAddedIndex, formData.symptoms.length]);

  const removeSymptom = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      symptoms: prev.symptoms.filter((_, i) => i !== index),
    }));
    delete showSuggestions[index];
    delete showNotes[index];
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

  const updateFollowUpAnswer = (
    symptomIndex: number,
    key: string,
    value: string | number
  ) => {
    setFormData((prev) => ({
      ...prev,
      symptoms: prev.symptoms.map((s, i) =>
        i === symptomIndex
          ? { ...s, followUpAnswers: { ...s.followUpAnswers, [key]: value } }
          : s
      ),
    }));
  };

  const getFilteredSymptoms = (searchTerm: string): SymptomDefinition[] => {
    if (!searchTerm.trim()) {
      return [];
    }
    const term = searchTerm.toLowerCase();
    return symptomLibrary
      .filter((symptom) => symptom.display_name.toLowerCase().includes(term))
      .slice(0, 8);
  };

  const handleSymptomChange = (index: number, value: string) => {
    updateSymptom(index, "symptom", value);
    setShowSuggestions((prev) => ({
      ...prev,
      [index]: value.trim().length > 0,
    }));
  };

  const selectSymptom = (index: number, symptomDef: SymptomDefinition) => {
    // Update the symptom name and clear previous follow-up answers
    setFormData((prev) => ({
      ...prev,
      symptoms: prev.symptoms.map((s, i) =>
        i === index ? { ...s, symptom: symptomDef.id, followUpAnswers: {} } : s
      ),
    }));
    setShowSuggestions((prev) => ({ ...prev, [index]: false }));
    inputRefs.current[index]?.blur();
  };

  const getSymptomDefinition = (
    symptomName: string
  ): SymptomDefinition | undefined => {
    return symptomLibrary.find(
      (s) => s.id === symptomName || s.display_name === symptomName
    );
  };

  const toggleNotes = (index: number) => {
    setShowNotes((prev) => ({ ...prev, [index]: !prev[index] }));
  };

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest(".symptom-autocomplete")) {
        setShowSuggestions({});
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Render a compact follow-up question input
  const renderFollowUpInput = (
    question: FollowUpQuestion,
    symptomIndex: number,
    currentValue: string | number | undefined
  ) => {
    const inputId = `followup-${symptomIndex}-${question.key}`;

    if (question.type === "enum" && question.options) {
      return (
        <div className="space-y-1">
          <Label htmlFor={inputId} className="text-foreground">
            {question.label}
          </Label>
          <Select
            value={currentValue?.toString() || ""}
            onValueChange={(value: string) =>
              updateFollowUpAnswer(symptomIndex, question.key, value)
            }
          >
            <SelectTrigger className="h-9 bg-white">
              <SelectValue placeholder={t("add.stages.symptoms.select")} />
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
          <Label htmlFor={inputId} className="text-foreground">
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

    // Default to number input
    return (
      <div className="space-y-1">
        <Label htmlFor={inputId} className="text-foreground">
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

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-foreground">{t("add.stages.symptoms.loading")}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="p-4 border border-destructive/50 bg-destructive/10 rounded-md">
          <p className="text-destructive font-medium">
            {t("add.stages.symptoms.errorTitle")}
          </p>
          <p className="text-sm text-foreground mt-1">{error}</p>
          <p className="text-xs text-foreground mt-2">
            {t("add.stages.symptoms.errorBackendHint")} {DIAGNOSIS_API_URL}
          </p>
        </div>
        <div className="flex justify-end space-x-2 pt-4">
          <Button variant="outline" onClick={onCancel}>
            {t("add.buttons.cancel")}
          </Button>
          <Button variant="outline" onClick={onPrevious}>
            {t("add.buttons.previous")}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 space-y-4 overflow-y-auto">
        <div className="flex items-center justify-between">
          <Label>{t("add.stages.symptoms.title")}</Label>
          <Button
            type="button"
            variant="default"
            // size=""
            onClick={addSymptom}
            className="bg-brand text-white hover:!bg-brand hover:brightness-125"
          >
            <Plus className="mr-2 h-4 w-4" />
            {t("add.stages.symptoms.add")}
          </Button>
        </div>

        {formData.symptoms.length === 0 ? (
          <div className="text-center py-8 text-foreground border border-dashed rounded-md flex flex-col items-center justify-center gap-4">
            {t("add.stages.symptoms.noSymptoms")}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addSymptom}
              className="border-dashed border-primary/20 flex flex-col items-center justify-center gap-2 p-8"
            >
              {t("add.stages.symptoms.addFirstSymptom")}
              <Plus className="mr-2 h-4 w-4" />
            </Button>
          </div>
        ) : (
          <div ref={listContainerRef} className="space-y-6">
            {formData.symptoms.map((symptom, index) => {
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
                    "relative pl-4 border-l-2 border-brand/40 hover:border-brand hover:bg-gray-100/70 transition-all duration-300 p-4",
                    isNewlyAdded &&
                      "animate-in fade-in-0 slide-in-from-bottom-4"
                  )}
                >
                  {/* Header row: number, symptom input, delete */}
                  <div className="flex items-start gap-3">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-brand/10 text-brand text-xs font-semibold flex items-center justify-center mt-1">
                      {index + 1}
                    </span>

                    <div className="flex-1 min-w-0">
                      {/* Symptom autocomplete */}
                      <div className="symptom-autocomplete relative">
                        <Input
                          ref={(el) => {
                            inputRefs.current[index] = el;
                          }}
                          id={`symptom-${index}`}
                          value={symptom.symptom}
                          onChange={(e) =>
                            handleSymptomChange(index, e.target.value)
                          }
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
                            "add.stages.symptoms.symptomPlaceholder"
                          )}
                          className="font-medium bg-white"
                        />
                        {showSuggestions[index] && (
                          <div className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-lg max-h-[200px] overflow-y-auto">
                            {getFilteredSymptoms(symptom.symptom).length > 0 ? (
                              <ul className="py-1">
                                {getFilteredSymptoms(symptom.symptom).map(
                                  (suggestedSymptom, suggestionIndex) => (
                                    <li key={suggestionIndex}>
                                      <button
                                        type="button"
                                        className="w-full text-left px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground outline-none"
                                        onClick={() =>
                                          selectSymptom(index, suggestedSymptom)
                                        }
                                        onMouseDown={(e) => e.preventDefault()}
                                      >
                                        <div className="font-medium">
                                          {suggestedSymptom.display_name}
                                        </div>
                                        {(suggestedSymptom.global_follow_ups
                                          ?.length ||
                                          suggestedSymptom.unique_follow_ups
                                            ?.length) && (
                                          <div className="text-xs text-foreground/70">
                                            {(suggestedSymptom.global_follow_ups
                                              ?.length || 0) +
                                              (suggestedSymptom
                                                .unique_follow_ups?.length ||
                                                0)}{" "}
                                            {t(
                                              "add.stages.symptoms.followUpQuestions"
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
                                {t("add.stages.symptoms.noSuggestionsFound")}
                              </div>
                            ) : null}
                          </div>
                        )}
                      </div>

                      {/* Follow-up questions grid - shown inline */}
                      {hasFollowUps && (
                        <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-3">
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
                            className="inline-flex items-center gap-1.5 text-sm text-foreground hover:text-foreground transition-colors"
                          >
                            <MessageSquare className="h-4 w-4" />
                            {t("add.stages.symptoms.notesLabel")}
                          </button>
                        ) : (
                          <textarea
                            id={`symptom-notes-${index}`}
                            value={symptom.notes}
                            onChange={(e) =>
                              updateSymptom(index, "notes", e.target.value)
                            }
                            placeholder={t(
                              "add.stages.symptoms.notesPlaceholder"
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

      <div className="flex justify-end space-x-2 pt-4 mt-auto border-t">
        <Button variant="outline" onClick={onCancel}>
          {t("add.buttons.cancel")}
        </Button>
        <Button variant="outline" onClick={onPrevious}>
          {t("add.buttons.previous")}
        </Button>
        <Button
          onClick={onNext}
          className="bg-brand text-white hover:!bg-brand hover:brightness-125"
        >
          {t("add.buttons.next")}
        </Button>
      </div>
    </div>
  );
}
