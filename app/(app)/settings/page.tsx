"use client";

import { useEffect, useState, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import "@/lib/i18n";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Edit, Upload } from "lucide-react";

interface UserProfile {
  name: string;
  surname: string;
  full_name: string;
  type: "doctor" | "assistant" | "patient";
  specialization?: string;
  profile_picture?: string;
}

interface PatientRecord {
  id: string;
  first_name: string;
  last_name: string;
  date_of_birth: string;
  gender: string;
  phone?: string;
  address?: string;
  pesel?: string;
}

export default function Settings() {
  const { t } = useTranslation("settings");
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Form state
  const [name, setName] = useState("");
  const [surname, setSurname] = useState("");
  const [specialization, setSpecialization] = useState("");
  const [profilePicture, setProfilePicture] = useState<File | null>(null);
  const [profilePictureUrl, setProfilePictureUrl] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Patient-specific state
  const [patientRecord, setPatientRecord] = useState<PatientRecord | null>(null);
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [gender, setGender] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [pesel, setPesel] = useState("");

  useEffect(() => {
    const getUser = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session) {
        setUser(session.user);

        // Fetch user profile
        const { data: userProfile } = await supabase
          .from("users")
          .select("*")
          .eq("user_id", session.user.id)
          .single();

        if (userProfile) {
          setProfile(userProfile);
          setName(userProfile.name || "");
          setSurname(userProfile.surname || "");
          setSpecialization(userProfile.specialization || "");
          setProfilePictureUrl(userProfile.profile_picture || "");

          // Fetch patient record if user is a patient
          if (userProfile.type === "patient") {
            const { data: patient } = await supabase
              .from("patients")
              .select("*")
              .eq("user_id", session.user.id)
              .single();

            if (patient) {
              setPatientRecord(patient);
              setDateOfBirth(patient.date_of_birth || "");
              setGender(patient.gender || "");
              setPhone(patient.phone || "");
              setAddress(patient.address || "");
              setPesel(patient.pesel || "");
            }
          }
        }
      } else {
        router.push("/login");
      }
      setLoading(false);
    };

    getUser();
  }, [router]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith("image/")) {
        toast.error(t("messages.fileTypeError"));
        return;
      }
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error(t("messages.fileSizeError"));
        return;
      }
      setProfilePicture(file);
      // Preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setProfilePictureUrl(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const deleteOldProfilePicture = async (oldPictureUrl: string | undefined) => {
    if (!oldPictureUrl) return;

    try {
      // Extract file path from URL
      // URL format: https://[project].supabase.co/storage/v1/object/public/profile_pictures/[userId]/[filename]
      const urlParts = oldPictureUrl.split("/profile_pictures/");
      if (urlParts.length < 2) return;

      const filePath = urlParts[1];

      // Delete old file from storage
      const { error } = await supabase.storage
        .from("profile_pictures")
        .remove([filePath]);

      if (error) {
        console.error("Error deleting old profile picture:", error);
        // Don't throw - continue with upload even if deletion fails
      }
    } catch (error) {
      console.error("Error deleting old profile picture:", error);
      // Don't throw - continue with upload even if deletion fails
    }
  };

  const uploadProfilePicture = async (
    file: File,
    oldPictureUrl?: string
  ): Promise<string | null> => {
    try {
      setUploading(true);

      // Get the authenticated user ID
      const {
        data: { user: authUser },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !authUser) {
        console.error("Error getting user:", userError);
        throw new Error("Failed to get authenticated user");
      }

      // Delete old profile picture if it exists
      if (oldPictureUrl) {
        await deleteOldProfilePicture(oldPictureUrl);
      }

      // Upload to folder structure: userId/filename
      const filePath = `${authUser.id}/${file.name}`;

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from("profile_pictures")
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: true,
        });

      if (error) {
        console.error("Upload error:", error);
        throw error;
      }

      // Get public URL
      const {
        data: { publicUrl },
      } = supabase.storage.from("profile_pictures").getPublicUrl(filePath);

      return publicUrl;
    } catch (error) {
      console.error("Error uploading file:", error);
      return null;
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!user || !profile) return;

    setSaving(true);
    try {
      let profilePictureUrlToSave = profilePictureUrl;

      // Upload new profile picture if selected
      if (profilePicture) {
        // Get the current profile picture URL (before update) to delete it
        const oldPictureUrl = profile?.profile_picture;

        const uploadedUrl = await uploadProfilePicture(
          profilePicture,
          oldPictureUrl
        );
        if (uploadedUrl) {
          profilePictureUrlToSave = uploadedUrl;
        } else {
          toast.error(t("messages.uploadError"));
          setSaving(false);
          return;
        }
      }

      // Update user profile
      const updateData: any = {
        name,
        surname,
      };

      // Only update specialization if user is a doctor
      if (profile.type === "doctor") {
        updateData.specialization = specialization || null;
      }

      // Update profile picture if it changed
      if (profilePictureUrlToSave) {
        updateData.profile_picture = profilePictureUrlToSave;
      }

      const { error } = await supabase
        .from("users")
        .update(updateData)
        .eq("user_id", user.id);

      if (error) {
        console.error("Update error:", error);
        toast.error(t("messages.updateError"));
        return;
      }

      // Update patient record if user is a patient
      if (profile.type === "patient" && patientRecord) {
        const { error: patientError } = await supabase
          .from("patients")
          .update({
            first_name: name,
            last_name: surname,
            date_of_birth: dateOfBirth || null,
            gender: gender || "unknown",
            phone: phone || null,
            address: address || null,
            pesel: pesel || null,
          })
          .eq("id", patientRecord.id);

        if (patientError) {
          console.error("Patient update error:", patientError);
          toast.error(t("messages.updateError"));
          return;
        }
      }

      toast.success(t("messages.updateSuccess"));

      // Refresh profile and reset form
      const { data: userProfile } = await supabase
        .from("users")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (userProfile) {
        // Update profile state
        setProfile(userProfile);

        // Reset form fields with saved values
        setName(userProfile.name || "");
        setSurname(userProfile.surname || "");
        setSpecialization(userProfile.specialization || "");

        // Reset profile picture state
        setProfilePicture(null);
        setProfilePictureUrl(userProfile.profile_picture || "");

        // Reset file input
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      }
    } catch (error) {
      console.error("Error saving profile:", error);
      toast.error(t("messages.saveError"));
    } finally {
      setSaving(false);
    }
  };

  const handleResetPassword = async () => {
    if (!user?.email) return;

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
        redirectTo: `${window.location.origin}/login`,
      });

      if (error) {
        console.error("Reset password error:", error);
        toast.error(t("messages.resetPasswordError"));
      } else {
        toast.success(t("messages.resetPasswordSuccess"));
      }
    } catch (error) {
      console.error("Error resetting password:", error);
      toast.error(t("messages.saveError"));
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  if (loading) {
    return <div className="p-8">{t("messages.loading")}</div>;
  }

  if (!user || !profile) {
    return <div className="p-8">{t("messages.errorLoading")}</div>;
  }

  return (
    <div className="space-y-6 p-8 max-w-3xl mx-auto w-full h-full">
      <div>
        <h1 className="text-3xl font-bold">{t("title")}</h1>
        <p className="text-muted-foreground">{t("subtitle")}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("profile.title")}</CardTitle>
          <CardDescription>{t("profile.description")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Profile Picture */}
          <div className="flex flex-col items-center space-y-2">
            <Label htmlFor="profile-picture" className="text-center">
              {t("profile.profilePicture")}
            </Label>
            <div className="flex flex-col items-center gap-4">
              <div className="relative inline-block">
                {profilePictureUrl ? (
                  <img
                    src={profilePictureUrl}
                    alt={t("profile.profilePicture")}
                    className="h-28 w-28 rounded-full object-cover border-2 border-border"
                  />
                ) : (
                  <div className="h-28 w-28 rounded-full border-2 border-border bg-muted flex items-center justify-center">
                    <Upload className="h-8 w-8 text-muted-foreground" />
                  </div>
                )}
                <input
                  ref={fileInputRef}
                  id="profile-picture"
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  disabled={uploading}
                  className="hidden"
                />
                <label
                  htmlFor="profile-picture"
                  className={cn(
                    "absolute bottom-0 right-0 h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center cursor-pointer shadow-md transition-all hover:bg-primary/90 hover:scale-110 focus-within:outline-none focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2",
                    uploading && "cursor-not-allowed opacity-50 hover:scale-100"
                  )}
                >
                  <Edit className="h-4 w-4" />
                </label>
              </div>
              {profilePicture && !uploading && (
                <p className="text-xs text-muted-foreground text-center">
                  {t("profile.selected")}: {profilePicture.name}
                </p>
              )}
            </div>
          </div>

          <div className="flex md:flex-row flex-col gap-4 w-full">
            {/* Name */}
            <div className="space-y-2 max-w-[250px] md:w-full">
              <Label htmlFor="name">{t("profile.name")}</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t("profile.namePlaceholder")}
              />
            </div>

            {/* Surname */}
            <div className="space-y-2 max-w-[250px] md:w-full">
              <Label htmlFor="surname">{t("profile.surname")}</Label>
              <Input
                id="surname"
                value={surname}
                onChange={(e) => setSurname(e.target.value)}
                placeholder={t("profile.surnamePlaceholder")}
              />
            </div>
          </div>

          {/* Role */}
          <div className="space-y-2">
            <Label htmlFor="type">{t("profile.role")}</Label>
            <Input
              id="role"
              value={profile.type}
              disabled
              className="bg-muted  max-w-[250px]"
              placeholder={t("profile.rolePlaceholder")}
            />
            <p className="text-sm text-muted-foreground">
              {t("profile.roleHelp")}
            </p>
          </div>

          {/* Specialization (only for doctors) */}
          {profile.type === "doctor" && (
            <div className="space-y-2 max-w-[250px]">
              <Label htmlFor="specialization">
                {t("profile.specialization")}
              </Label>
              <Input
                id="specialization"
                value={specialization}
                onChange={(e) => setSpecialization(e.target.value)}
                placeholder={t("profile.specializationPlaceholder")}
              />
            </div>
          )}

          {/* Patient-specific fields */}
          {profile.type === "patient" && (
            <>
              <div className="flex md:flex-row flex-col gap-4 w-full">
                <div className="space-y-2 max-w-[200px]">
                  <Label htmlFor="dateOfBirth">
                    {t("profile.dateOfBirth", "Date of Birth")}
                  </Label>
                  <Input
                    id="dateOfBirth"
                    type="date"
                    value={dateOfBirth}
                    onChange={(e) => setDateOfBirth(e.target.value)}
                  />
                </div>

                <div className="space-y-2 max-w-[150px]">
                  <Label htmlFor="gender">{t("profile.gender", "Gender")}</Label>
                  <select
                    id="gender"
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    <option value="unknown">{t("profile.genderOptions.unknown", "Prefer not to say")}</option>
                    <option value="male">{t("profile.genderOptions.male", "Male")}</option>
                    <option value="female">{t("profile.genderOptions.female", "Female")}</option>
                    <option value="other">{t("profile.genderOptions.other", "Other")}</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2 max-w-[250px]">
                <Label htmlFor="phone">{t("profile.phone", "Phone")}</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder={t("profile.phonePlaceholder", "+48 123 456 789")}
                />
              </div>

              <div className="space-y-2 max-w-[350px]">
                <Label htmlFor="address">{t("profile.address", "Address")}</Label>
                <Input
                  id="address"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder={t("profile.addressPlaceholder", "Your address")}
                />
              </div>

              <div className="space-y-2 max-w-[200px]">
                <Label htmlFor="pesel">{t("profile.pesel", "PESEL")}</Label>
                <Input
                  id="pesel"
                  value={pesel}
                  onChange={(e) => {
                    // Only allow digits and max 11 characters
                    const value = e.target.value.replace(/\D/g, '').slice(0, 11);
                    setPesel(value);
                  }}
                  placeholder="12345678901"
                  maxLength={11}
                />
                <p className="text-xs text-muted-foreground">
                  {t("profile.peselHelp", "11-digit Polish national ID number")}
                </p>
              </div>
            </>
          )}

          {/* Email (Disabled) */}
          <div className="space-y-2 max-w-[350px]">
            <Label htmlFor="email">{t("profile.email")}</Label>
            <Input
              id="email"
              type="email"
              value={user.email || ""}
              disabled
              className="bg-muted  max-w-[350px]"
            />
            <p className="text-sm text-muted-foreground">
              {t("profile.emailHelp")}
            </p>
          </div>

          <div className="flex justify-center">
            <Button
              onClick={handleSave}
              disabled={saving || uploading}
              className="w-3/5 mt-4"
            >
              {saving || uploading
                ? t("profile.saving")
                : t("profile.saveChanges")}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("account.title")}</CardTitle>
          <CardDescription>{t("account.description")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 ">
          <div className="flex flex-col md:flex-row gap-4 justify-center items-center">
            <Button
              onClick={handleResetPassword}
              variant="outline"
              className="w-full w-3/5"
            >
              {t("account.resetPassword")}
            </Button>

            <Button
              onClick={handleLogout}
              variant="destructive"
              className="w-full w-3/5"
            >
              {t("account.logout")}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
