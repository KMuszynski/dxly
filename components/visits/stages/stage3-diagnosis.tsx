"use client";

import * as React from "react";
import { useTranslation } from "react-i18next";
import "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Plus,
  X,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Info,
  MessageSquare,
} from "lucide-react";
import type { VisitFormData } from "../add-visit";
import { cn } from "@/lib/utils";

// API endpoint - defaults to localhost:5001, can be overridden via env var
const DIAGNOSIS_API_URL =
  process.env.NEXT_PUBLIC_DIAGNOSIS_API_URL || "http://localhost:5001";

// New API response types
interface MatchedSymptom {
  symptom: string;
  match_quality: number;
  importance: number;
}

interface DiagnosisResult {
  disease: string;
  common_name: string;
  category: string;
  confidence: number;
  matched_symptoms: MatchedSymptom[];
  partially_matched: MatchedSymptom[];
  missing_symptoms: Array<{ symptom: string; importance: number }>;
  negative_matches: Array<{ symptom: string; note: string }>;
  explanation: string;
}

interface DiagnosisApiResponse {
  success: boolean;
  input_symptoms: string[];
  diagnosis_count: number;
  diagnoses: DiagnosisResult[];
  error?: string;
}

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
  const [diagnosisSuggestions, setDiagnosisSuggestions] = React.useState<
    DiagnosisResult[]
  >([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [showSuggestions, setShowSuggestions] = React.useState<
    Record<number, boolean>
  >({});
  const [expandedDiagnosis, setExpandedDiagnosis] = React.useState<
    number | null
  >(null);
  const [showNotes, setShowNotes] = React.useState<Record<number, boolean>>({});
  const [newlyAddedDiagnosisIndex, setNewlyAddedDiagnosisIndex] =
    React.useState<number | null>(null);
  const diagnosisRefs = React.useRef<Record<number, HTMLDivElement | null>>({});
  const diagnosisInputRefs = React.useRef<
    Record<number, HTMLInputElement | null>
  >({});

  // Build the symptoms payload for the new API format
  const buildSymptomsPayload = () => {
    const symptoms: Record<string, Record<string, unknown>> = {};

    formData.symptoms.forEach((s) => {
      if (s.symptom.trim()) {
        symptoms[s.symptom] = {
          present: true,
          ...s.followUpAnswers,
        };
      }
    });

    return symptoms;
  };

  // Fetch diagnosis suggestions when component mounts or symptoms change
  React.useEffect(() => {
    const fetchDiagnoses = async () => {
      const symptomsPayload = buildSymptomsPayload();
      const symptomCount = Object.keys(symptomsPayload).length;

      if (symptomCount === 0) {
        setDiagnosisSuggestions([]);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(`${DIAGNOSIS_API_URL}/api/diagnose`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            symptoms: symptomsPayload,
            options: {
              top_n: 10,
              min_confidence: 5,
            },
          }),
        });

        if (!response.ok) {
          throw new Error(`API request failed: ${response.statusText}`);
        }

        const data: DiagnosisApiResponse = await response.json();

        if (data.success && data.diagnoses) {
          setDiagnosisSuggestions(data.diagnoses);
        } else {
          throw new Error(data.error || "Failed to get diagnoses");
        }
      } catch (err) {
        console.error("Error fetching diagnoses:", err);
        setError(
          err instanceof Error
            ? err.message
            : "Failed to fetch diagnosis suggestions. Please check if the backend API is running."
        );
        setDiagnosisSuggestions([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDiagnoses();
  }, [formData.symptoms]);

  const addDiagnosis = () => {
    const newIndex = formData.diagnoses.length;
    setFormData((prev) => ({
      ...prev,
      diagnoses: [...prev.diagnoses, { diagnosis: "", notes: "" }],
    }));
    setNewlyAddedDiagnosisIndex(newIndex);
  };

  // Auto-scroll to newly added diagnosis and focus input
  React.useEffect(() => {
    if (
      newlyAddedDiagnosisIndex !== null &&
      diagnosisRefs.current[newlyAddedDiagnosisIndex]
    ) {
      setTimeout(() => {
        diagnosisRefs.current[newlyAddedDiagnosisIndex]?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
        diagnosisInputRefs.current[newlyAddedDiagnosisIndex]?.focus();
        setTimeout(() => setNewlyAddedDiagnosisIndex(null), 500);
      }, 50);
    }
  }, [newlyAddedDiagnosisIndex, formData.diagnoses.length]);

  const toggleNotes = (index: number) => {
    setShowNotes((prev) => ({ ...prev, [index]: !prev[index] }));
  };

  const removeDiagnosis = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      diagnoses: prev.diagnoses.filter((_, i) => i !== index),
    }));
    delete showSuggestions[index];
    delete showNotes[index];
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

  const selectSuggestion = (index: number, result: DiagnosisResult) => {
    updateDiagnosis(index, "diagnosis", result.common_name);
    // Add explanation as notes
    updateDiagnosis(index, "notes", result.explanation);
    setShowSuggestions((prev) => ({ ...prev, [index]: false }));
  };

  const addDiagnosisFromSuggestion = (result: DiagnosisResult) => {
    setFormData((prev) => ({
      ...prev,
      diagnoses: [
        ...prev.diagnoses,
        { diagnosis: result.common_name, notes: result.explanation },
      ],
    }));
  };

  // Close suggestions when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (
        !target.closest(".diagnosis-suggestions") &&
        !target.closest(".diagnosis-input")
      ) {
        setShowSuggestions({});
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const symptomNames = formData.symptoms
    .map((s) => s.symptom.trim())
    .filter((s) => s.length > 0);

  // Get confidence color based on score
  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 70) return "text-green-600 dark:text-green-400";
    if (confidence >= 40) return "text-yellow-600 dark:text-yellow-400";
    return "text-orange-600 dark:text-orange-400";
  };

  const getConfidenceBg = (confidence: number) => {
    if (confidence >= 70) return "bg-green-100 dark:bg-green-900/30";
    if (confidence >= 40) return "bg-yellow-100 dark:bg-yellow-900/30";
    return "bg-orange-100 dark:bg-orange-900/30";
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 space-y-6">
        {/* Diagnosis Suggestions Section */}
        {symptomNames.length > 0 && (
          <div className="p-4 border rounded-md bg-muted/50 ">
            <div className="flex items-center justify-between mb-3">
              <Label className="text-sm font-medium">
                {t("add.stages.diagnosis.suggestionsTitle")} -{" "}
                {t("add.stages.diagnosis.suggestionsSubtitle")}
                {isLoading && (
                  <Loader2 className="ml-2 h-4 w-4 animate-spin inline" />
                )}
              </Label>
              {diagnosisSuggestions.length > 0 && (
                <span className="text-xs text-muted-foreground">
                  {t("add.stages.diagnosis.basedOnSymptoms", {
                    count: symptomNames.length,
                  })}
                </span>
              )}
            </div>

            {error && (
              <div className="flex items-center gap-2 p-3 mb-3 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {isLoading && diagnosisSuggestions.length === 0 && (
              <div className="text-center py-4 text-muted-foreground text-sm">
                {t("add.stages.diagnosis.analyzing")}
              </div>
            )}

            {!isLoading && diagnosisSuggestions.length > 0 && (
              <div className="space-y-2 max-h-[350px] overflow-y-auto">
                {diagnosisSuggestions.map((result, idx) => (
                  <div
                    key={idx}
                    className={cn(
                      "border rounded-md bg-card transition-all overflow-hidden",
                      expandedDiagnosis === idx
                        ? "ring-2 ring-primary ring-offset-2 ring-offset-background"
                        : "hover:bg-accent/50"
                    )}
                  >
                    <div
                      className="p-3 cursor-pointer"
                      onClick={() =>
                        setExpandedDiagnosis(
                          expandedDiagnosis === idx ? null : idx
                        )
                      }
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-md">
                              {result.common_name}
                            </span>
                            <span className="text-xs text-muted-foreground px-2 py-0.5 bg-muted rounded">
                              {result.category}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 mt-1">
                            <span
                              className={cn(
                                "text-sm font-semibold px-2 py-0.5 rounded",
                                getConfidenceBg(result.confidence),
                                getConfidenceColor(result.confidence)
                              )}
                            >
                              {t("add.stages.diagnosis.confidence", {
                                value: result.confidence.toFixed(0),
                              })}
                            </span>
                            {result.matched_symptoms.length > 0 && (
                              <span className="text-xs text-muted-foreground flex items-center gap-1">
                                <CheckCircle2 className="h-3 w-3 text-green-500" />
                                {t("add.stages.diagnosis.matched", {
                                  count: result.matched_symptoms.length,
                                })}
                              </span>
                            )}
                            {result.missing_symptoms.length > 0 && (
                              <span className="text-xs text-muted-foreground flex items-center gap-1">
                                <Info className="h-3 w-3 text-yellow-500" />
                                {t("add.stages.diagnosis.toCheck", {
                                  count: result.missing_symptoms.length,
                                })}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex-1 text-center text-sm text-muted-foreground">
                          {t("add.stages.diagnosis.clickToExpand")}
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            addDiagnosisFromSuggestion(result);
                          }}
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          {t("add.stages.diagnosis.addThis")}
                        </Button>
                      </div>
                    </div>

                    {/* Expanded Details */}
                    {expandedDiagnosis === idx && (
                      <div className="px-4 pb-4 pt-4 border-t space-y-3">
                        {/* Matched Symptoms */}
                        {result.matched_symptoms.length > 0 && (
                          <div>
                            <p className="text-sm font-medium text-green-600 dark:text-green-400 mb-1">
                              {t("add.stages.diagnosis.strongMatches")}
                            </p>
                            <div className="flex flex-wrap gap-1">
                              {result.matched_symptoms.map((ms, i) => (
                                <span
                                  key={i}
                                  className="text-sm px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded"
                                >
                                  {ms.symptom} ({ms.match_quality}%)
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Partially Matched */}
                        {result.partially_matched.length > 0 && (
                          <div>
                            <p className="text-sm font-medium text-yellow-600 dark:text-yellow-400 mb-1">
                              {t("add.stages.diagnosis.partialMatches")}
                            </p>
                            <div className="flex flex-wrap gap-1">
                              {result.partially_matched.map((pm, i) => (
                                <span
                                  key={i}
                                  className="text-sm px-2 py-0.5 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 rounded"
                                >
                                  {pm.symptom} ({pm.match_quality}%)
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Negative Matches (absence supports diagnosis) */}
                        {result.negative_matches.length > 0 && (
                          <div>
                            <p className="text-sm font-medium text-blue-600 dark:text-blue-400 mb-1">
                              {t("add.stages.diagnosis.supportiveFindings")}
                            </p>
                            <div className="space-y-1">
                              {result.negative_matches.map((nm, i) => (
                                <p
                                  key={i}
                                  className="text-sm text-blue-700 dark:text-blue-300"
                                >
                                  • {nm.note}
                                </p>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Missing Symptoms to Check */}
                        {result.missing_symptoms.length > 0 && (
                          <div>
                            <p className="text-sm font-medium text-orange-600 dark:text-orange-400 mb-1">
                              {t("add.stages.diagnosis.considerChecking")}
                            </p>
                            <div className="flex flex-wrap gap-1">
                              {result.missing_symptoms.map((ms, i) => (
                                <span
                                  key={i}
                                  className="text-sm px-2 py-0.5 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 rounded"
                                >
                                  {ms.symptom}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Full Explanation */}
                        <div className="pt-2 border-t">
                          <p className="text-sm text-muted-foreground">
                            {result.explanation}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {!isLoading &&
              !error &&
              diagnosisSuggestions.length === 0 &&
              symptomNames.length > 0 && (
                <div className="text-center py-4 text-muted-foreground text-sm">
                  {t("add.stages.diagnosis.noSuggestionsFound")}
                </div>
              )}
          </div>
        )}

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label>{t("add.stages.diagnosis.title")}</Label>
            <Button
              type="button"
              variant="default"
              // size="sm"
              onClick={addDiagnosis}
              className="bg-brand text-white hover:!bg-brand hover:brightness-125"
            >
              <Plus className="mr-2 h-4 w-4" /> {t("add.stages.diagnosis.add")}
            </Button>
          </div>

          {formData.diagnoses.length === 0 ? (
            <div className="text-center py-8 text-foreground border border-dashed rounded-md">
              {t("add.stages.diagnosis.noDiagnoses")}
            </div>
          ) : (
            <div className="space-y-6">
              {formData.diagnoses.map((diagnosis, index) => {
                const hasNotes = diagnosis.notes.trim().length > 0;
                const isNewlyAdded = newlyAddedDiagnosisIndex === index;

                return (
                  <div
                    key={index}
                    ref={(el) => {
                      diagnosisRefs.current[index] = el;
                    }}
                    className={cn(
                      "relative pl-4 border-l-2 border-brand/40 hover:border-brand hover:bg-gray-100/70 transition-all duration-300 p-4",
                      isNewlyAdded &&
                        "animate-in fade-in-0 slide-in-from-bottom-4"
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-brand/10 text-brand text-xs font-semibold flex items-center justify-center mt-1">
                        {index + 1}
                      </span>

                      <div className="flex-1 min-w-0">
                        {/* Diagnosis input with autocomplete */}
                        <div className="diagnosis-input relative">
                          <Label htmlFor={`diagnosis-${index}`}>
                            {t("add.stages.diagnosis.diagnosisLabel")}
                          </Label>
                          <Input
                            ref={(el) => {
                              diagnosisInputRefs.current[index] = el;
                            }}
                            id={`diagnosis-${index}`}
                            value={diagnosis.diagnosis}
                            onChange={(e) =>
                              updateDiagnosis(
                                index,
                                "diagnosis",
                                e.target.value
                              )
                            }
                            onFocus={() => {
                              if (diagnosisSuggestions.length > 0) {
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
                              }
                            }}
                            placeholder={t(
                              "add.stages.diagnosis.diagnosisPlaceholder"
                            )}
                            className="font-medium bg-white"
                          />
                          {showSuggestions[index] &&
                            diagnosisSuggestions.length > 0 && (
                              <div className="diagnosis-suggestions absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-lg max-h-[200px] overflow-y-auto">
                                <ul className="py-1">
                                  {diagnosisSuggestions.map(
                                    (result, suggestionIndex) => (
                                      <li key={suggestionIndex}>
                                        <button
                                          type="button"
                                          className="w-full text-left px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground outline-none"
                                          onClick={() => {
                                            selectSuggestion(index, result);
                                          }}
                                          onMouseDown={(e) =>
                                            e.preventDefault()
                                          }
                                        >
                                          <div className="flex items-center justify-between">
                                            <span className="font-medium">
                                              {result.common_name}
                                            </span>
                                            <span
                                              className={cn(
                                                "text-xs font-semibold",
                                                getConfidenceColor(
                                                  result.confidence
                                                )
                                              )}
                                            >
                                              {result.confidence.toFixed(0)}%
                                            </span>
                                          </div>
                                          <div className="text-xs text-muted-foreground">
                                            {result.category}
                                          </div>
                                        </button>
                                      </li>
                                    )
                                  )}
                                </ul>
                              </div>
                            )}
                        </div>

                        {/* Notes toggle & textarea */}
                        <div className="mt-3">
                          {!showNotes[index] && !hasNotes ? (
                            <button
                              type="button"
                              onClick={() => toggleNotes(index)}
                              className="inline-flex items-center gap-1.5 text-sm text-foreground hover:text-foreground transition-colors"
                            >
                              <MessageSquare className="h-4 w-4" />
                              {t("add.stages.diagnosis.notesLabel")}
                            </button>
                          ) : (
                            <div className="mt-3">
                              <Label htmlFor={`diagnosis-notes-${index}`}>
                                {t("add.stages.diagnosis.notesLabel")}
                              </Label>
                              <textarea
                                id={`diagnosis-notes-${index}`}
                                value={diagnosis.notes}
                                onChange={(e) =>
                                  updateDiagnosis(
                                    index,
                                    "notes",
                                    e.target.value
                                  )
                                }
                                placeholder={t(
                                  "add.stages.diagnosis.notesPlaceholder"
                                )}
                                rows={2}
                                className="flex min-h-[60px] w-full rounded-md border border-input bg-white px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-foreground/50 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
                              />
                            </div>
                          )}
                        </div>
                      </div>

                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeDiagnosis(index)}
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
      </div>

      <div className="flex justify-end space-x-2 pt-4 mt-auto">
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
