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
  type: "doctor" | "assistant";
  specialization?: string;
  profile_picture?: string;
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
      } else {
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
