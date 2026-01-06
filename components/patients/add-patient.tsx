"use client";

import * as React from "react";
import { useTranslation } from "react-i18next";
import "@/lib/i18n";
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
import { Eye, EyeOff } from "lucide-react";
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
  const [pesel, setPesel] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = React.useState(false);

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
      setPesel("");
      setPassword("");
      setConfirmPassword("");
      setShowPassword(false);
      setShowConfirmPassword(false);
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

    // Email is required for authentication
    if (!email.trim()) {
      toast.error(t("add.errors.emailRequired"));
      return;
    }

    // Validate email format
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error(t("add.errors.invalidEmail"));
      return;
    }

    // Password validation
    if (!password) {
      toast.error(t("add.errors.passwordRequired"));
      return;
    }

    if (password.length < 6) {
      toast.error(t("add.errors.passwordTooShort"));
      return;
    }

    if (password !== confirmPassword) {
      toast.error(t("add.errors.passwordMismatch"));
      return;
    }

    // Validate phone format if provided (basic validation)
    if (phone && !/^[0-9+\-\s().]{6,}$/.test(phone)) {
      toast.error(t("add.errors.invalidPhone"));
      return;
    }

    // Validate PESEL format if provided (11 digits)
    if (pesel && !/^\d{11}$/.test(pesel)) {
      toast.error(t("add.errors.invalidPesel"));
      return;
    }

    setSaving(true);
    try {
      const response = await fetch("/api/patients", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          date_of_birth: dateOfBirth,
          gender,
          phone: phone.trim() || null,
          email: email.trim(),
          address: address.trim() || null,
          pesel: pesel.trim() || null,
          password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        console.error("Error creating patient:", data.error);
        toast.error(data.error || t("add.errors.addFailed"));
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
                onChange={(e) => setGender(e.target.value as Patient["gender"])}
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

          {/* Email and Phone */}
          <div className="flex flex-col md:flex-row gap-4">
            <div className="space-y-2 flex-1">
              <Label htmlFor="add-email">
                {t("add.fields.email")}{" "}
                <span className="text-destructive">*</span>
              </Label>
              <Input
                id="add-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t("add.placeholders.email")}
                disabled={saving}
              />
            </div>

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
          </div>

          {/* PESEL and Address */}
          <div className="flex flex-col md:flex-row gap-4">
            <div className="space-y-2 flex-1">
              <Label htmlFor="add-pesel">{t("add.fields.pesel")}</Label>
              <Input
                id="add-pesel"
                value={pesel}
                onChange={(e) =>
                  setPesel(e.target.value.replace(/\D/g, "").slice(0, 11))
                }
                placeholder={t("add.placeholders.pesel")}
                maxLength={11}
                disabled={saving}
              />
            </div>

            <div className="space-y-2 flex-1">
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

          {/* Password and Confirm Password */}
          <div className="flex flex-col md:flex-row gap-4">
            <div className="space-y-2 flex-1">
              <Label htmlFor="add-password">
                {t("add.fields.password")}{" "}
                <span className="text-destructive">*</span>
              </Label>
              <div className="relative">
                <Input
                  id="add-password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t("add.placeholders.password")}
                  disabled={saving}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            <div className="space-y-2 flex-1">
              <Label htmlFor="add-confirm-password">
                {t("add.fields.confirmPassword")}{" "}
                <span className="text-destructive">*</span>
              </Label>
              <div className="relative">
                <Input
                  id="add-confirm-password"
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder={t("add.placeholders.confirmPassword")}
                  disabled={saving}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  tabIndex={-1}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>
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
          <Button
            onClick={handleSave}
            disabled={saving}
            className="bg-brand hover:!bg-brand hover:brightness-125 text-white"
          >
            {saving ? t("add.buttons.saving") : t("add.buttons.addPatient")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
