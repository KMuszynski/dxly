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

interface AddPatientDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPatientAdded?: () => void;
}

export function AddPatientDialog({
  open,
  onOpenChange,
  onPatientAdded,
}: AddPatientDialogProps) {
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

  // Reset form when dialog opens/closes
  React.useEffect(() => {
    if (open) {
      // Reset form when dialog opens
      setFirstName("");
      setLastName("");
      setDateOfBirth("");
      setGender("unknown");
      setPhone("");
      setEmail("");
      setAddress("");
    }
  }, [open]);

  const handleSave = async () => {
    // Validation
    if (!firstName.trim() || !lastName.trim()) {
      toast.error(t("add.errors.firstNameLastNameRequired"));
      return;
    }

    if (!dateOfBirth) {
      toast.error(t("add.errors.dateOfBirthRequired"));
      return;
    }

    // Validate email format if provided
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error(t("add.errors.invalidEmail"));
      return;
    }

    // Validate phone format if provided (basic validation)
    if (phone && !/^[0-9+\-\s().]{6,}$/.test(phone)) {
      toast.error(t("add.errors.invalidPhone"));
      return;
    }

    setSaving(true);
    try {
      const insertData: any = {
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        date_of_birth: dateOfBirth,
        gender,
      };

      // Only include optional fields if they have values
      if (phone.trim()) {
        insertData.phone = phone.trim();
      } else {
        insertData.phone = null;
      }

      if (email.trim()) {
        insertData.email = email.trim();
      } else {
        insertData.email = null;
      }

      if (address.trim()) {
        insertData.address = address.trim();
      } else {
        insertData.address = null;
      }

      const { error } = await supabase
        .from("patients")
        .insert(insertData);

      if (error) {
        console.error("Insert error:", error);
        toast.error(t("add.errors.addFailed"));
      } else {
        toast.success(t("add.success.patientAdded"));
        onPatientAdded?.();
        onOpenChange(false);
      }
    } catch (error) {
      console.error("Error adding patient:", error);
      toast.error(t("add.errors.saveError"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("add.title")}</DialogTitle>
          <DialogDescription>{t("add.description")}</DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* First Name and Last Name */}
          <div className="flex flex-col md:flex-row gap-4">
            <div className="space-y-2 flex-1">
              <Label htmlFor="add-first-name">
                {t("add.fields.firstName")}{" "}
                <span className="text-destructive">*</span>
              </Label>
              <Input
                id="add-first-name"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder={t("add.placeholders.firstName")}
                disabled={saving}
              />
            </div>

            <div className="space-y-2 flex-1">
              <Label htmlFor="add-last-name">
                {t("add.fields.lastName")}{" "}
                <span className="text-destructive">*</span>
              </Label>
              <Input
                id="add-last-name"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder={t("add.placeholders.lastName")}
                disabled={saving}
              />
            </div>
          </div>

          {/* Date of Birth and Gender */}
          <div className="flex flex-col md:flex-row gap-4">
            <div className="space-y-2 flex-1">
              <Label htmlFor="add-date-of-birth">
                {t("add.fields.dateOfBirth")}{" "}
                <span className="text-destructive">*</span>
              </Label>
              <Input
                id="add-date-of-birth"
                type="date"
                value={dateOfBirth}
                onChange={(e) => setDateOfBirth(e.target.value)}
                max={new Date().toISOString().split("T")[0]}
                min="1900-01-01"
                disabled={saving}
              />
            </div>

            <div className="space-y-2 flex-1">
              <Label htmlFor="add-gender">
                {t("add.fields.gender")}{" "}
                <span className="text-destructive">*</span>
              </Label>
              <select
                id="add-gender"
                value={gender}
                onChange={(e) =>
                  setGender(e.target.value as Patient["gender"])
                }
                disabled={saving}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
              >
                <option value="unknown">{t("add.gender.unknown")}</option>
                <option value="female">{t("add.gender.female")}</option>
                <option value="male">{t("add.gender.male")}</option>
                <option value="other">{t("add.gender.other")}</option>
              </select>
            </div>
          </div>

          {/* Phone and Email */}
          <div className="flex flex-col md:flex-row gap-4">
            <div className="space-y-2 flex-1">
              <Label htmlFor="add-phone">{t("add.fields.phone")}</Label>
              <Input
                id="add-phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder={t("add.placeholders.phone")}
                disabled={saving}
              />
            </div>

            <div className="space-y-2 flex-1">
              <Label htmlFor="add-email">{t("add.fields.email")}</Label>
              <Input
                id="add-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t("add.placeholders.email")}
                disabled={saving}
              />
            </div>
          </div>

          {/* Address */}
          <div className="space-y-2">
            <Label htmlFor="add-address">{t("add.fields.address")}</Label>
            <Input
              id="add-address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder={t("add.placeholders.address")}
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
            {t("add.buttons.cancel")}
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? t("add.buttons.saving") : t("add.buttons.addPatient")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

