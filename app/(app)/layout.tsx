"use client";

import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { usePathname } from "next/navigation";
import "@/lib/i18n";
import { supabase } from "@/lib/supabase";
import {
  SidebarFooter,
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import {
  Calendar,
  Layout,
  Settings,
  Users,
  Stethoscope,
  ClipboardList,
} from "lucide-react";
import Link from "next/link";
import { SidebarFooterContent } from "@/components/sidebar-footer";
import { AppBreadcrumb } from "@/components/app-breadcrumb";
import { cn } from "@/lib/utils";
import { TourProvider, TourStep } from "@/components/guided-tour";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation("common");
  const pathname = usePathname();
  const [userProfile, setUserProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Determine active item based on current pathname
  const getActiveItem = () => {
    if (pathname === "/dashboard") return "dashboard";
    if (pathname.startsWith("/patients")) return "patients";
    if (
      pathname.startsWith("/doctor/visits") ||
      pathname.startsWith("/patient/visits")
    )
      return "visits";
    if (pathname.startsWith("/settings")) return "settings";
    return "dashboard";
  };

  const activeItem = getActiveItem();

  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (session) {
          const { data: profile } = await supabase
            .from("users")
            .select("*")
            .eq("user_id", session.user.id)
            .single();

          setUserProfile(profile);
        }
      } catch (error) {
        console.error("Error fetching user profile:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserProfile();
  }, []);

  // Dynamic storage key based on user type
  const getTourStorageKey = () => {
    if (!userProfile) return "dxly-tour";
    return `dxly-${userProfile.type}-tour`;
  };

  return (
    <TourProvider storageKey={getTourStorageKey()}>
      <SidebarProvider>
        <TourStep
          id="tour-sidebar"
          title={t("tour.sidebar.title", "Navigation Sidebar")}
          content={t(
            "tour.sidebar.content",
            "Use this sidebar to navigate between all pages in the app. Access your dashboard, patients, visits, and settings from anywhere."
          )}
          order={1}
          position="right"
        >
          <Sidebar>
            <SidebarHeader>
              <div className="flex items-center gap-2 px-2 py-2">
                <h2 className="text-2xl text-black font-bold">DXLY</h2>
              </div>
            </SidebarHeader>
            <SidebarContent>
              <SidebarGroup>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {/* Patient Navigation */}
                    {userProfile?.type === "patient" ? (
                      <>
                        <SidebarMenuItem>
                          <SidebarMenuButton
                            asChild
                            className={cn(
                              activeItem === "dashboard" && "bg-sidebar-accent"
                            )}
                          >
                            <Link href="/dashboard">
                              <Layout />
                              <span>{t("breadcrumb.dashboard")}</span>
                            </Link>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                        <SidebarMenuItem>
                          <SidebarMenuButton
                            asChild
                            className={cn(
                              activeItem === "visits" && "bg-sidebar-accent"
                            )}
                          >
                            <Link href="/patient/visits">
                              <Calendar />
                              <span>{t("breadcrumb.myVisits")}</span>
                            </Link>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                        <SidebarMenuItem>
                          <SidebarMenuButton
                            asChild
                            className={cn(
                              activeItem === "settings" && "bg-sidebar-accent"
                            )}
                          >
                            <Link href="/settings">
                              <Settings />
                              <span>{t("breadcrumb.settings")}</span>
                            </Link>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      </>
                    ) : (
                      <>
                        {/* Clinic Staff Navigation (Doctor/Assistant) */}
                        <SidebarMenuItem>
                          <SidebarMenuButton
                            asChild
                            className={cn(
                              activeItem === "dashboard" && "bg-sidebar-accent"
                            )}
                          >
                            <Link href="/dashboard">
                              <Layout />
                              <span>{t("breadcrumb.dashboard")}</span>
                            </Link>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                        <SidebarMenuItem>
                          <SidebarMenuButton
                            asChild
                            className={cn(
                              activeItem === "patients" && "bg-sidebar-accent"
                            )}
                          >
                            <Link href="/patients">
                              <Users />
                              <span>{t("breadcrumb.patients")}</span>
                            </Link>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                        {(userProfile?.type === "doctor" ||
                          userProfile?.type === "assistant") && (
                          <SidebarMenuItem>
                            <SidebarMenuButton
                              asChild
                              className={cn(
                                activeItem === "visits" && "bg-sidebar-accent"
                              )}
                            >
                              <Link href="/doctor/visits">
                                <Calendar />
                                <span>{t("breadcrumb.visits")}</span>
                              </Link>
                            </SidebarMenuButton>
                          </SidebarMenuItem>
                        )}
                        <SidebarMenuItem>
                          <SidebarMenuButton
                            asChild
                            className={cn(
                              activeItem === "settings" && "bg-sidebar-accent"
                            )}
                          >
                            <Link href="/settings">
                              <Settings />
                              <span>{t("breadcrumb.settings")}</span>
                            </Link>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      </>
                    )}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            </SidebarContent>
            <SidebarFooter>
              <SidebarFooterContent />
            </SidebarFooter>
          </Sidebar>
        </TourStep>
        <SidebarInset>
          <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4 bg-[hsl(var(--header-background))]">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <AppBreadcrumb />
          </header>
          <div className="flex flex-1 flex-col gap-4 bg-[hsl(var(--content-background))] min-h-[calc(100vh-4rem)]">
            {children}
          </div>
        </SidebarInset>
      </SidebarProvider>
    </TourProvider>
  );
}
