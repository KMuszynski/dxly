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

      const { error } = await supabase
        .from("patients")
        .update(updateData)
        .eq("id", patient.id);

      if (error) {
        console.error("Update error:", error);
        toast.error(t("edit.errors.updateFailed"));
      } else {
        toast.success(t("edit.success.patientUpdated"));
        onPatientUpdated?.();
        onOpenChange(false);
      }
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

          {/* Address */}
          <div className="space-y-2">
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
