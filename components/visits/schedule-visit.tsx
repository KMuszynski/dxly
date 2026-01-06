"use client";

import * as React from "react";
import { useTranslation } from "react-i18next";
import "@/lib/i18n";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Search } from "lucide-react";

interface Patient {
  id: string;
  first_name: string;
  last_name: string;
  email?: string;
  phone?: string;
}

interface Doctor {
  user_id: string;
  name: string;
  surname: string;
  specialization?: string;
}

interface ScheduleVisitDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onVisitScheduled?: () => void;
}

export function ScheduleVisitDialog({
  open,
  onOpenChange,
  onVisitScheduled,
}: ScheduleVisitDialogProps) {
  const { t } = useTranslation("visits");

  const [loading, setLoading] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [loadingDoctors, setLoadingDoctors] = React.useState(false);

  // Patient selection
  const [patients, setPatients] = React.useState<Patient[]>([]);
  const [patientSearch, setPatientSearch] = React.useState("");
  const [selectedPatient, setSelectedPatient] = React.useState<Patient | null>(
    null
  );
  const [showPatientDropdown, setShowPatientDropdown] = React.useState(false);

  // Doctor selection
  const [doctors, setDoctors] = React.useState<Doctor[]>([]);
  const [selectedDoctor, setSelectedDoctor] = React.useState<Doctor | null>(
    null
  );

  // Visit details
  const [visitDate, setVisitDate] = React.useState(
    new Date().toISOString().split("T")[0]
  );
  const [visitTime, setVisitTime] = React.useState("09:00");
  const [notes, setNotes] = React.useState("");

  // Load doctors on mount
  React.useEffect(() => {
    if (open) {
      loadDoctors();
      // Reset form
      setSelectedPatient(null);
      setPatientSearch("");
      setSelectedDoctor(null);
      setVisitDate(new Date().toISOString().split("T")[0]);
      setVisitTime("09:00");
      setNotes("");
    }
  }, [open]);

  // Search patients as user types (but not if already selected)
  React.useEffect(() => {
    // Don't search if a patient is already selected
    if (selectedPatient) {
      return;
    }
    if (patientSearch.length >= 2) {
      searchPatients(patientSearch);
    } else {
      setPatients([]);
      setShowPatientDropdown(false);
    }
  }, [patientSearch, selectedPatient]);

  const loadDoctors = async () => {
    setLoadingDoctors(true);
    try {
      const { data, error } = await supabase
        .from("users")
        .select("user_id, name, surname, specialization")
        .eq("type", "doctor")
        .order("surname", { ascending: true });

      if (error) {
        console.error("Error loading doctors:", error);
        toast.error("Failed to load doctors list. Please check RLS policies.");
        return;
      }

      console.log("Loaded doctors:", data);
      setDoctors(data || []);
    } catch (error) {
      console.error("Error loading doctors:", error);
      toast.error("Failed to load doctors list");
    } finally {
      setLoadingDoctors(false);
    }
  };

  const searchPatients = async (query: string) => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("patients")
        .select("id, first_name, last_name, email, phone")
        .or(
          `first_name.ilike.%${query}%,last_name.ilike.%${query}%,email.ilike.%${query}%`
        )
        .limit(10);

      if (error) throw error;
      setPatients(data || []);
      setShowPatientDropdown(true);
    } catch (error) {
      console.error("Error searching patients:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectPatient = (patient: Patient) => {
    setSelectedPatient(patient);
    setPatientSearch(`${patient.first_name} ${patient.last_name}`);
    setShowPatientDropdown(false);
  };

  const handleSchedule = async () => {
    if (!selectedPatient || !selectedDoctor) {
      toast.error(
        t("schedule.validation.required", "Please select a patient and doctor")
      );
      return;
    }

    setSaving(true);
    try {
      // Combine date and time
      const visitDateTime = new Date(`${visitDate}T${visitTime}:00`);

      const { error } = await supabase.from("visits").insert({
        patient_id: selectedPatient.id,
        doctor_id: selectedDoctor.user_id,
        visit_date: visitDateTime.toISOString(),
        notes: notes || null,
        status: "scheduled",
      });

      if (error) throw error;

      toast.success(t("schedule.success", "Visit scheduled successfully!"));
      onOpenChange(false);
      onVisitScheduled?.();
    } catch (error: any) {
      console.error("Error scheduling visit:", error);
      toast.error(
        error.message || t("schedule.error", "Failed to schedule visit")
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("schedule.title", "Schedule a Visit")}</DialogTitle>
          <DialogDescription>
            {t(
              "schedule.description",
              "Schedule an appointment for a patient. They will be able to enter their symptoms before the visit."
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Patient Selection */}
          <div className="space-y-2">
            <Label>
              {t("schedule.patient", "Patient")}{" "}
              <span className="text-destructive">*</span>
            </Label>
            <div className="relative">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={patientSearch}
                  onChange={(e) => {
                    setPatientSearch(e.target.value);
                    setSelectedPatient(null);
                  }}
                  onFocus={() =>
                    patients.length > 0 && setShowPatientDropdown(true)
                  }
                  placeholder={t(
                    "schedule.searchPatient",
                    "Search by name or email..."
                  )}
                  className="pl-10"
                />
                {loading && (
                  <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin" />
                )}
              </div>

              {showPatientDropdown &&
                patients.length > 0 &&
                !selectedPatient && (
                  <div className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-lg max-h-[200px] overflow-y-auto">
                    {patients.map((patient) => (
                      <button
                        key={patient.id}
                        type="button"
                        className="w-full text-left px-3 py-2 text-sm hover:bg-accent focus:bg-accent outline-none"
                        onClick={() => handleSelectPatient(patient)}
                      >
                        <div className="font-medium">
                          {patient.first_name} {patient.last_name}
                        </div>
                        {(patient.email || patient.phone) && (
                          <div className="text-xs text-muted-foreground">
                            {patient.email || patient.phone}
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                )}

              {patientSearch.length >= 2 &&
                patients.length === 0 &&
                !loading &&
                !selectedPatient && (
                  <div className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-lg p-3 text-sm text-muted-foreground">
                    {t("schedule.noPatients", "No patients found")}
                  </div>
                )}
            </div>
            {selectedPatient && (
              <p className="text-sm text-green-600 dark:text-green-400">
                ✓ {t("schedule.selected", "Selected")}:{" "}
                {selectedPatient.first_name} {selectedPatient.last_name}
              </p>
            )}
          </div>

          {/* Doctor Selection */}
          <div className="space-y-2">
            <Label>
              {t("schedule.doctor", "Doctor")}{" "}
              <span className="text-destructive">*</span>
            </Label>
            <div className="relative">
              <Select
                value={selectedDoctor?.user_id || ""}
                onValueChange={(value: string) => {
                  const doctor = doctors.find((d) => d.user_id === value);
                  setSelectedDoctor(doctor || null);
                }}
                disabled={loadingDoctors}
              >
                <SelectTrigger className="bg-white">
                  <SelectValue
                    placeholder={
                      loadingDoctors
                        ? t("schedule.loadingDoctors", "Loading doctors...")
                        : doctors.length === 0
                        ? t("schedule.noDoctors", "No doctors available")
                        : t("schedule.selectDoctor", "Select a doctor...")
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {doctors.map((doctor) => (
                    <SelectItem key={doctor.user_id} value={doctor.user_id}>
                      Dr. {doctor.name} {doctor.surname}
                      {doctor.specialization && ` (${doctor.specialization})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {loadingDoctors && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin" />
              )}
            </div>
            {!loadingDoctors && doctors.length === 0 && (
              <p className="text-xs text-destructive">
                {t(
                  "schedule.noDoctorsHint",
                  "No doctors found. Make sure migration 009 is applied."
                )}
              </p>
            )}
          </div>

          {/* Date and Time */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="visitDate">
                {t("schedule.date", "Date")}{" "}
                <span className="text-destructive">*</span>
              </Label>
              <Input
                id="visitDate"
                type="date"
                value={visitDate}
                onChange={(e) => setVisitDate(e.target.value)}
                min={new Date().toISOString().split("T")[0]}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="visitTime">
                {t("schedule.time", "Time")}{" "}
                <span className="text-destructive">*</span>
              </Label>
              <Input
                id="visitTime"
                type="time"
                value={visitTime}
                onChange={(e) => setVisitTime(e.target.value)}
              />
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">
              {t("schedule.notes", "Notes (optional)")}
            </Label>
            <textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t(
                "schedule.notesPlaceholder",
                "Reason for visit, special instructions..."
              )}
              rows={3}
              className="flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("schedule.cancel", "Cancel")}
          </Button>
          <Button
            onClick={handleSchedule}
            disabled={saving || !selectedPatient || !selectedDoctor}
            className="bg-brand text-white hover:!bg-brand hover:brightness-125"
          >
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t("schedule.scheduling", "Scheduling...")}
              </>
            ) : (
              t("schedule.submit", "Schedule Visit")
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
