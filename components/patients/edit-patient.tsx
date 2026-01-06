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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Patient } from "./patients-table";

interface EditPatientDialogProps {
  patient: Patient | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPatientUpdated?: () => void;
}

export function EditPatientDialog({
  patient,
  open,
  onOpenChange,
  onPatientUpdated,
}: EditPatientDialogProps) {
  const { t } = useTranslation("patients");
  const [saving, setSaving] = React.useState(false);

  // Form state
  const [firstName, setFirstName] = React.useState("");
  const [lastName, setLastName] = React.useState("");
  const [dateOfBirth, setDateOfBirth] = React.useState("");
  const [gender, setGender] = React.useState<Patient["gender"]>("unknown");
  const [phone, setPhone] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [address, setAddress] = React.useState("");
  const [pesel, setPesel] = React.useState("");

  // Reset form when patient changes
  React.useEffect(() => {
    if (patient) {
      setFirstName(patient.first_name || "");
      setLastName(patient.last_name || "");
      // Format date for input (YYYY-MM-DD)
      const dob = patient.date_of_birth
        ? new Date(patient.date_of_birth).toISOString().split("T")[0]
        : "";
      setDateOfBirth(dob);
      setGender(patient.gender || "unknown");
      setPhone(patient.phone || "");
      setEmail(patient.email || "");
      setAddress(patient.address || "");
      setPesel(patient.pesel || "");
    }
  }, [patient]);

  const handleSave = async () => {
    if (!patient) return;

    // Validation
    if (!firstName.trim() || !lastName.trim()) {
      toast.error(t("edit.errors.firstNameLastNameRequired"));
      return;
    }

    if (!dateOfBirth) {
      toast.error(t("edit.errors.dateOfBirthRequired"));
      return;
    }

    // Validate email format if provided
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error(t("edit.errors.invalidEmail"));
      return;
    }

    // Validate phone format if provided (basic validation)
    if (phone && !/^[0-9+\-\s().]{6,}$/.test(phone)) {
      toast.error(t("edit.errors.invalidPhone"));
      return;
    }

    // Validate PESEL format if provided (11 digits)
    if (pesel && !/^\d{11}$/.test(pesel)) {
      toast.error(
        t("edit.errors.invalidPesel", "PESEL must be exactly 11 digits")
      );
      return;
    }

    setSaving(true);
    try {
      const updateData: any = {
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        date_of_birth: dateOfBirth,
        gender,
      };

      // Only include optional fields if they have values
      if (phone.trim()) {
        updateData.phone = phone.trim();
      } else {
        updateData.phone = null;
      }

      if (email.trim()) {
        updateData.email = email.trim();
      } else {
        updateData.email = null;
      }

      if (address.trim()) {
        updateData.address = address.trim();
      } else {
        updateData.address = null;
      }

      if (pesel.trim()) {
        updateData.pesel = pesel.trim();
      } else {
        updateData.pesel = null;
      }

      const { error } = await supabase
        .from("patients")
        .update(updateData)
        .eq("id", patient.id);

      if (error) {
        console.error("Update error:", error);
        toast.error(t("edit.errors.updateFailed"));
        return;
      }

      // If patient has a linked user account, also update the users table
      if (patient.user_id) {
        console.log("Syncing user profile for user_id:", patient.user_id);
        const { error: userError, data: userData } = await supabase
          .from("users")
          .update({
            name: firstName.trim(),
            surname: lastName.trim(),
          })
          .eq("user_id", patient.user_id)
          .select();

        if (userError) {
          console.error("Error updating linked user:", userError);
          // Don't fail the whole operation, just log the warning
          toast.warning(
            t(
              "edit.warnings.userUpdateFailed",
              "Patient updated, but linked user account could not be synced"
            )
          );
        } else {
          console.log("User profile synced successfully:", userData);
        }
      } else {
        console.log("No linked user_id for this patient");
      }

      toast.success(t("edit.success.patientUpdated"));
      onPatientUpdated?.();
      onOpenChange(false);
    } catch (error) {
      console.error("Error saving patient:", error);
      toast.error(t("edit.errors.saveError"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("edit.title")}</DialogTitle>
          <DialogDescription>{t("edit.description")}</DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* First Name and Last Name */}
          <div className="flex flex-col md:flex-row gap-4">
            <div className="space-y-2 flex-1">
              <Label htmlFor="first-name">
                {t("edit.fields.firstName")}{" "}
                <span className="text-destructive">*</span>
              </Label>
              <Input
                id="first-name"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder={t("edit.placeholders.firstName")}
                disabled={saving}
              />
            </div>

            <div className="space-y-2 flex-1">
              <Label htmlFor="last-name">
                {t("edit.fields.lastName")}{" "}
                <span className="text-destructive">*</span>
              </Label>
              <Input
                id="last-name"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder={t("edit.placeholders.lastName")}
                disabled={saving}
              />
            </div>
          </div>

          {/* Date of Birth and Gender */}
          <div className="flex flex-col md:flex-row gap-4">
            <div className="space-y-2 flex-1">
              <Label htmlFor="date-of-birth">
                {t("edit.fields.dateOfBirth")}{" "}
                <span className="text-destructive">*</span>
              </Label>
              <Input
                id="date-of-birth"
                type="date"
                value={dateOfBirth}
                onChange={(e) => setDateOfBirth(e.target.value)}
                max={new Date().toISOString().split("T")[0]}
                min="1900-01-01"
                disabled={saving}
              />
            </div>

            <div className="space-y-2 flex-1">
              <Label htmlFor="gender">
                {t("edit.fields.gender")}{" "}
                <span className="text-destructive">*</span>
              </Label>
              <select
                id="gender"
                value={gender}
                onChange={(e) => setGender(e.target.value as Patient["gender"])}
                disabled={saving}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
              >
                <option value="unknown">{t("edit.gender.unknown")}</option>
                <option value="female">{t("edit.gender.female")}</option>
                <option value="male">{t("edit.gender.male")}</option>
                <option value="other">{t("edit.gender.other")}</option>
              </select>
            </div>
          </div>

          {/* Phone and Email */}
          <div className="flex flex-col md:flex-row gap-4">
            <div className="space-y-2 flex-1">
              <Label htmlFor="phone">{t("edit.fields.phone")}</Label>
              <Input
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder={t("edit.placeholders.phone")}
                disabled={saving}
              />
            </div>

            <div className="space-y-2 flex-1">
              <Label htmlFor="email">{t("edit.fields.email")}</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t("edit.placeholders.email")}
                disabled={saving}
              />
            </div>
          </div>

          {/* PESEL and Address */}
          <div className="flex flex-col md:flex-row gap-4">
            <div className="space-y-2 flex-1">
              <Label htmlFor="pesel">{t("edit.fields.pesel", "PESEL")}</Label>
              <Input
                id="pesel"
                value={pesel}
                onChange={(e) =>
                  setPesel(e.target.value.replace(/\D/g, "").slice(0, 11))
                }
                placeholder={t(
                  "edit.placeholders.pesel",
                  "11-digit national ID"
                )}
                disabled={saving}
                maxLength={11}
              />
              {pesel && pesel.length !== 11 && (
                <p className="text-xs text-muted-foreground">
                  {t("edit.hints.pesel", "PESEL must be 11 digits")} (
                  {pesel.length}/11)
                </p>
              )}
            </div>

            <div className="space-y-2 flex-1">
              <Label htmlFor="address">{t("edit.fields.address")}</Label>
              <Input
                id="address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder={t("edit.placeholders.address")}
                disabled={saving}
              />
            </div>
          </div>
        </div>

        <DialogFooter>
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
            className="bg-brand hover:!bg-brand hover:brightness-125 text-white"
          >
            {saving ? t("edit.buttons.saving") : t("edit.buttons.saveChanges")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
