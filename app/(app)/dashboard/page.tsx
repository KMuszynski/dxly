"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import "@/lib/i18n";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Calendar,
  Settings,
  UserPlus,
  Stethoscope,
  ClipboardList,
  Clock,
  ChevronRight,
  Loader2,
  Users,
  Sparkles,
  HelpCircle,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useTour, TourStep } from "@/components/guided-tour";

interface UserProfile {
  name: string;
  surname: string;
  full_name: string;
  type: "doctor" | "assistant" | "patient";
  specialization?: string;
  profile_picture?: string;
}

interface Visit {
  id: string;
  visit_date: string;
  status: string;
  notes?: string;
  doctor: {
    name: string;
    surname: string;
    specialization?: string;
  } | null;
  patient: {
    first_name: string;
    last_name: string;
  } | null;
}

export default function Dashboard() {
  const router = useRouter();
  const { t } = useTranslation("dashboard");
  const { t: tPatient } = useTranslation("patientDashboard");
  const { t: tCommon } = useTranslation("common");
  const { startTour } = useTour();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [upcomingVisits, setUpcomingVisits] = useState<Visit[]>([]);

  useEffect(() => {
    const getUser = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session) {
        setUser(session.user);

        const { data: userProfile } = await supabase
          .from("users")
          .select("*")
          .eq("user_id", session.user.id)
          .single();

        setProfile(userProfile);

        if (userProfile?.type === "patient") {
          const { data: patient } = await supabase
            .from("patients")
            .select("id")
            .eq("user_id", session.user.id)
            .single();

          if (patient) {
            const { data: visits } = await supabase
              .from("visits")
              .select(
                `
                id,
                visit_date,
                status,
                notes,
                doctor:users!visits_doctor_id_fkey(name, surname, specialization)
              `
              )
              .eq("patient_id", patient.id)
              .in("status", ["scheduled", "checked_in"])
              .order("visit_date", { ascending: true })
              .limit(5);

            const transformedVisits: Visit[] = (visits || []).map((v: any) => ({
              ...v,
              status: v.status || "scheduled",
              doctor: Array.isArray(v.doctor) ? v.doctor[0] || null : v.doctor,
              patient: null,
            }));
            setUpcomingVisits(transformedVisits);
          }
        } else if (userProfile?.type === "doctor") {
          // Fetch doctor's upcoming visits
          // visits.doctor_id references users.user_id directly (auth UUID)
          const { data: visits } = await supabase
            .from("visits")
            .select(
              `
              id,
              visit_date,
              status,
              notes,
              patient:patients(first_name, last_name)
            `
            )
            .eq("doctor_id", session.user.id)
            .in("status", ["scheduled", "checked_in"])
            .gte("visit_date", new Date().toISOString())
            .order("visit_date", { ascending: true })
            .limit(5);

          const transformedVisits: Visit[] = (visits || []).map((v: any) => ({
            ...v,
            status: v.status || "scheduled",
            doctor: null,
            patient: Array.isArray(v.patient)
              ? v.patient[0] || null
              : v.patient,
          }));
          setUpcomingVisits(transformedVisits);
        }
      } else {
        router.push("/login");
        return;
      }
      setLoading(false);
    };

    getUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        router.push("/login");
      } else {
        setUser(session.user);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, [router]);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return t("greeting.morning");
    if (hour < 18) return t("greeting.afternoon");
    return t("greeting.evening");
  };

  const getInitials = (name: string, surname: string) => {
    return `${name.charAt(0)}${surname.charAt(0)}`.toUpperCase();
  };

  const formatVisitDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const isToday = date.toDateString() === today.toDateString();
    const isTomorrow = date.toDateString() === tomorrow.toDateString();

    const time = date.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });

    if (isToday) return `Today, ${time}`;
    if (isTomorrow) return `Tomorrow, ${time}`;

    return date.toLocaleDateString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user || !profile) {
    return (
      <div className="p-8">
        <Card>
          <CardHeader>
            <CardTitle>{t("errors.profileNotFound.title")}</CardTitle>
            <CardDescription>
              {t("errors.profileNotFound.description")}
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const isDoctor = profile.type === "doctor";
  const isAssistant = profile.type === "assistant";
  const isPatient = profile.type === "patient";
  const isStaff = isDoctor || isAssistant;

  return (
    <div className="p-6 md:p-8 space-y-8 w-full max-w-4xl mx-auto">
      {/* Welcome Header */}
      <div className="flex items-center gap-4">
        <Avatar className="h-14 w-14 border">
          <AvatarImage src={profile.profile_picture} alt={profile.full_name} />
          <AvatarFallback className="text-lg font-semibold bg-muted">
            {getInitials(profile.name, profile.surname)}
          </AvatarFallback>
        </Avatar>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {getGreeting()}, {profile.name}!
          </h1>
          <p className="text-muted-foreground">
            {isDoctor
              ? `Dr. ${profile.full_name}${
                  profile.specialization ? ` • ${profile.specialization}` : ""
                }`
              : isPatient
              ? tPatient("welcome.subtitle", "Welcome to your patient portal")
              : profile.full_name}
          </p>
        </div>
      </div>

      {/* Patient Dashboard */}
      {isPatient && (
        <>
          {/* Quick Actions */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-muted-foreground" />
              {tPatient("quickActions.title", "Quick Actions")}
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {/* My Visits - Tour Step 2 */}
              <TourStep
                id="tour-patient-visits"
                title={tCommon("tour.patientVisits.title", "My Visits")}
                content={tCommon(
                  "tour.patientVisits.content",
                  "View all your appointments here. You can see upcoming and past visits, and add symptoms before your consultation."
                )}
                order={2}
                position="bottom"
              >
                <Link href="/patient/visits">
                  <Card className="h-full transition-all hover:shadow-md hover:border-foreground/20">
                    <CardContent className="p-5 flex items-center gap-4">
                      <div className="p-2.5 rounded-lg bg-blue-100">
                        <Calendar className="h-5 w-5 text-foreground" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-medium">
                          {tPatient("quickActions.viewVisits.title", "My Visits")}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {tPatient(
                            "quickActions.viewVisits.description",
                            "View appointments"
                          )}
                        </p>
                      </div>
                      <ChevronRight className="h-5 w-5 text-muted-foreground" />
                    </CardContent>
                  </Card>
                </Link>
              </TourStep>

              {/* Settings - Tour Step 3 */}
              <TourStep
                id="tour-patient-settings"
                title={tCommon("tour.settings.title", "Settings")}
                content={tCommon(
                  "tour.settings.content",
                  "Customize your profile, update your information, change language preferences, and manage your account settings."
                )}
                order={3}
                position="bottom"
              >
                <Link href="/settings">
                  <Card className="h-full transition-all hover:shadow-md hover:border-foreground/20">
                    <CardContent className="p-5 flex items-center gap-4">
                      <div className="p-2.5 rounded-lg bg-orange-100">
                        <Settings className="h-5 w-5 text-foreground" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-medium">
                          {tPatient(
                            "quickActions.updateProfile.title",
                            "Settings"
                          )}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {tPatient(
                            "quickActions.updateProfile.description",
                            "Update your info"
                          )}
                        </p>
                      </div>
                      <ChevronRight className="h-5 w-5 text-muted-foreground" />
                    </CardContent>
                  </Card>
                </Link>
              </TourStep>

              {/* Walkthrough for patients */}
              <Card
                className="h-full transition-all hover:shadow-md hover:border-foreground/20 cursor-pointer"
                onClick={startTour}
              >
                <CardContent className="p-5 flex items-center gap-4">
                  <div className="p-2.5 rounded-lg bg-cyan-100">
                    <HelpCircle className="h-5 w-5 text-foreground" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-medium">
                      {tPatient("quickActions.walkthrough.title", "Walkthrough")}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {tPatient(
                        "quickActions.walkthrough.description",
                        "Take a guided tour"
                      )}
                    </p>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Upcoming Visits - Tour Step 4 */}
          <TourStep
            id="tour-patient-upcoming"
            title={tCommon("tour.patientUpcoming.title", "Upcoming Visits")}
            content={tCommon(
              "tour.patientUpcoming.content",
              "See your upcoming appointments at a glance. You can add symptoms before your visit to help your doctor prepare."
            )}
            order={4}
            position="top"
          >
            <div>
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Clock className="h-5 w-5 text-muted-foreground" />
                {tPatient("upcomingVisits.title", "Upcoming Visits")}
              </h2>

              {upcomingVisits.length > 0 ? (
                <Card>
                  <CardContent className="p-0 divide-y">
                    {upcomingVisits.map((visit) => (
                      <div
                        key={visit.id}
                        className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
                      >
                        <div>
                          <p className="font-medium">
                            {formatVisitDate(visit.visit_date)}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {visit.doctor
                              ? `Dr. ${visit.doctor.name} ${visit.doctor.surname}`
                              : "—"}
                            {visit.doctor?.specialization &&
                              ` • ${visit.doctor.specialization}`}
                          </p>
                        </div>
                        <Link href={`/patient/visits?visit=${visit.id}`}>
                          <Button
                            variant="default"
                            size="default"
                            className="bg-brand text-white hover:bg-brand/90"
                          >
                            <ClipboardList className="h-4 w-4 mr-1.5" />
                            {tPatient("addSymptoms", "Add Symptoms")}
                          </Button>
                        </Link>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              ) : (
                <Card className="border-dashed">
                  <CardContent className="py-12 text-center">
                    <Calendar className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
                    <h3 className="font-medium mb-1">
                      {tPatient(
                        "upcomingVisits.noVisits.title",
                        "No Upcoming Visits"
                      )}
                    </h3>
                    <p className="text-muted-foreground text-sm">
                      {tPatient(
                        "upcomingVisits.noVisits.description",
                        "Contact your clinic to schedule an appointment."
                      )}
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </TourStep>
        </>
      )}

      {/* Staff Dashboard */}
      {!isPatient && (
        <>
          {/* Quick Actions */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-muted-foreground" />
              {t("quickActions.title")}
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {/* Patients - Tour Step 2 */}
              <TourStep
                id="tour-patients"
                title={tCommon("tour.patients.title", "Patients")}
                content={tCommon(
                  "tour.patients.content",
                  "View and manage all your patients. Add new patients, search by name or PESEL, and access patient records."
                )}
                order={2}
                position="bottom"
              >
                <Link href="/patients">
                  <Card className="h-full transition-all hover:shadow-md hover:border-foreground/20">
                    <CardContent className="p-5 flex items-center gap-4">
                      <div className="p-2.5 rounded-lg bg-blue-100">
                        <Users className="h-5 w-5 text-foreground" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-medium">
                          {t("quickActions.viewPatients.title")}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {t("quickActions.viewPatients.description")}
                        </p>
                      </div>
                      <ChevronRight className="h-5 w-5 text-muted-foreground" />
                    </CardContent>
                  </Card>
                </Link>
              </TourStep>

              <Link href="/patients?add=true">
                <Card className="h-full transition-all hover:shadow-md hover:border-foreground/20">
                  <CardContent className="p-5 flex items-center gap-4">
                    <div className="p-2.5 rounded-lg bg-green-100">
                      <UserPlus className="h-5 w-5 text-foreground" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-medium">
                        {t("quickActions.addPatient.title")}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {t("quickActions.addPatient.description")}
                      </p>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  </CardContent>
                </Card>
              </Link>

              {isDoctor && (
                <Link href="/doctor/visits?add=true">
                  <Card className="h-full transition-all hover:shadow-md hover:border-foreground/20">
                    <CardContent className="p-5 flex items-center gap-4">
                      <div className="p-2.5 rounded-lg bg-purple-100">
                        <Stethoscope className="h-5 w-5 text-foreground" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-medium">
                          {t("quickActions.newVisit.title")}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {t("quickActions.newVisit.description")}
                        </p>
                      </div>
                      <ChevronRight className="h-5 w-5 text-muted-foreground" />
                    </CardContent>
                  </Card>
                </Link>
              )}

              {/* Visits - Tour Step 3 */}
              <TourStep
                id="tour-visits"
                title={tCommon("tour.visits.title", "Visits")}
                content={tCommon(
                  "tour.visits.content",
                  "Manage your appointments and consultations. Create new visits, record symptoms, add diagnoses, and generate AI-powered notes."
                )}
                order={3}
                position="bottom"
              >
                <Link href="/doctor/visits">
                  <Card className="h-full transition-all hover:shadow-md hover:border-foreground/20">
                    <CardContent className="p-5 flex items-center gap-4">
                      <div className="p-2.5 rounded-lg bg-amber-100">
                        <Calendar className="h-5 w-5 text-foreground" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-medium">
                          {t("quickActions.viewVisits.title")}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {t("quickActions.viewVisits.description")}
                        </p>
                      </div>
                      <ChevronRight className="h-5 w-5 text-muted-foreground" />
                    </CardContent>
                  </Card>
                </Link>
              </TourStep>

              {/* Settings - Tour Step 4 */}
              <TourStep
                id="tour-settings"
                title={tCommon("tour.settings.title", "Settings")}
                content={tCommon(
                  "tour.settings.content",
                  "Customize your profile, update your information, change language preferences, and manage your account settings."
                )}
                order={4}
                position="bottom"
              >
                <Link href="/settings">
                  <Card className="h-full transition-all hover:shadow-md hover:border-foreground/20">
                    <CardContent className="p-5 flex items-center gap-4">
                      <div className="p-2.5 rounded-lg bg-slate-100">
                        <Settings className="h-5 w-5 text-foreground" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-medium">
                          {t("quickActions.settings.title")}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {t("quickActions.settings.description")}
                        </p>
                      </div>
                      <ChevronRight className="h-5 w-5 text-muted-foreground" />
                    </CardContent>
                  </Card>
                </Link>
              </TourStep>

              {/* Walkthrough - for all staff */}
              <Card
                className="h-full transition-all hover:shadow-md hover:border-foreground/20 cursor-pointer"
                onClick={startTour}
              >
                <CardContent className="p-5 flex items-center gap-4">
                  <div className="p-2.5 rounded-lg bg-cyan-100">
                    <HelpCircle className="h-5 w-5 text-foreground" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-medium">
                      {t("quickActions.walkthrough.title", "Walkthrough")}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {t(
                        "quickActions.walkthrough.description",
                        "Take a guided tour"
                      )}
                    </p>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Upcoming Visits for Doctors - Tour Step 5 */}
          {isDoctor && (
            <TourStep
              id="tour-upcoming-visits"
              title={tCommon("tour.upcomingVisits.title", "Upcoming Visits")}
              content={tCommon(
                "tour.upcomingVisits.content",
                "See your scheduled appointments at a glance. Quickly access visit details and prepare for upcoming consultations."
              )}
              order={5}
              position="top"
            >
              <div>
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Clock className="h-5 w-5 text-muted-foreground" />
                  {t("upcomingVisits.title")}
                </h2>

                {upcomingVisits.length > 0 ? (
                  <Card>
                    <CardContent className="p-0 divide-y">
                      {upcomingVisits.map((visit) => (
                        <div
                          key={visit.id}
                          className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
                        >
                          <div>
                            <p className="font-medium">
                              {formatVisitDate(visit.visit_date)}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {visit.patient
                                ? `${visit.patient.first_name} ${visit.patient.last_name}`
                                : "—"}
                            </p>
                          </div>
                          <Link href={`/doctor/visits?edit=${visit.id}`}>
                            <Button variant="outline" size="sm">
                              <Stethoscope className="h-4 w-4 mr-1.5" />
                              {t("upcomingVisits.viewVisit")}
                            </Button>
                          </Link>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                ) : (
                  <Card className="border-dashed">
                    <CardContent className="py-12 text-center">
                      <Calendar className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
                      <h3 className="font-medium mb-1">
                        {t("upcomingVisits.noVisits.title")}
                      </h3>
                      <p className="text-muted-foreground text-sm">
                        {t("upcomingVisits.noVisits.description")}
                      </p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </TourStep>
          )}
        </>
      )}
    </div>
  );
}
