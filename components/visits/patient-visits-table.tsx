"use client";

import * as React from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  ColumnDef,
  ColumnFiltersState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
} from "@tanstack/react-table";
import {
  ArrowUpDown,
  MoreHorizontal,
  Eye,
  Plus,
  Clock,
  CheckCircle2,
  AlertCircle,
  Play,
  X,
  Stethoscope,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import "@/lib/i18n";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { supabase } from "@/lib/supabase";
import { EditVisitDialog } from "./edit-visit";
import { PatientSymptomsDialog } from "./patient-symptoms-dialog";

export type PatientVisit = {
  id: string;
  visit_date: string;
  status?: string;
  notes: string | null;
  doctor?: {
    name: string;
    surname: string;
    specialization?: string;
  };
  symptom_count?: number;
  diagnosis_count?: number;
};

export function PatientVisitsTable() {
  const { t } = useTranslation("patientVisits");
  const searchParams = useSearchParams();
  const router = useRouter();
  const [data, setData] = React.useState<PatientVisit[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    []
  );
  const [viewDialogOpen, setViewDialogOpen] = React.useState(false);
  const [symptomsDialogOpen, setSymptomsDialogOpen] = React.useState(false);
  const [selectedVisit, setSelectedVisit] = React.useState<PatientVisit | null>(
    null
  );
  const [patientId, setPatientId] = React.useState<string | null>(null);
  const [autoOpenVisitId, setAutoOpenVisitId] = React.useState<string | null>(
    null
  );

  // Check for visit query parameter to auto-open symptoms dialog
  React.useEffect(() => {
    const visitId = searchParams.get("visit");
    if (visitId) {
      setAutoOpenVisitId(visitId);
    }
  }, [searchParams]);

  const fetchVisits = React.useCallback(async () => {
    try {
      setLoading(true);
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        return;
      }

      // Get patient record
      const { data: patient } = await supabase
        .from("patients")
        .select("id")
        .eq("user_id", session.user.id)
        .single();

      if (!patient) {
        console.error("No patient record found");
        setLoading(false);
        return;
      }

      setPatientId(patient.id);

      // Fetch visits with doctor info and counts
      const { data: visits, error } = await supabase
        .from("visits")
        .select(
          `
          id,
          visit_date,
          status,
          notes,
          doctor:users!visits_doctor_id_fkey(name, surname, specialization),
          visit_symptoms(id),
          visit_diagnoses(id)
        `
        )
        .eq("patient_id", patient.id)
        .order("visit_date", { ascending: false });

      if (error) {
        console.error("Error fetching visits:", error);
        return;
      }

      // Transform the data
      const transformedVisits: PatientVisit[] = (visits || []).map(
        (visit: any) => ({
          id: visit.id,
          visit_date: visit.visit_date,
          status: visit.status,
          notes: visit.notes,
          doctor: Array.isArray(visit.doctor) ? visit.doctor[0] : visit.doctor,
          symptom_count: visit.visit_symptoms?.length || 0,
          diagnosis_count: visit.visit_diagnoses?.length || 0,
        })
      );

      setData(transformedVisits);
    } catch (error) {
      console.error("Error fetching visits:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchVisits();
  }, [fetchVisits]);

  // Auto-open symptoms dialog when visit ID is in URL and data is loaded
  React.useEffect(() => {
    if (autoOpenVisitId && data.length > 0 && !loading) {
      const visit = data.find((v) => v.id === autoOpenVisitId);
      if (visit) {
        // Only open if visit allows adding symptoms
        const status = visit.status || "scheduled";
        if (status === "scheduled" || status === "checked_in") {
          setSelectedVisit(visit);
          setSymptomsDialogOpen(true);
        }
      }
      // Clear the auto-open flag and remove query param
      setAutoOpenVisitId(null);
      router.replace("/patient/visits", { scroll: false });
    }
  }, [autoOpenVisitId, data, loading, router]);

  const handleViewVisit = React.useCallback((visit: PatientVisit) => {
    setSelectedVisit(visit);
    setViewDialogOpen(true);
  }, []);

  const handleAddSymptoms = React.useCallback((visit: PatientVisit) => {
    setSelectedVisit(visit);
    setSymptomsDialogOpen(true);
  }, []);

  const canAddSymptoms = (visit: PatientVisit) => {
    const status = visit.status || "scheduled";
    return status === "scheduled" || status === "checked_in";
  };

  const columns = React.useMemo<ColumnDef<PatientVisit>[]>(
    () => [
      {
        accessorKey: "visit_date",
        header: ({ column }) => {
          return (
            <Button
              variant="ghost"
              onClick={() =>
                column.toggleSorting(column.getIsSorted() === "asc")
              }
            >
              {t("table.date")}
              <ArrowUpDown className="ml-2 h-4 w-4" />
            </Button>
          );
        },
        cell: ({ row }) => {
          const visitDate = new Date(row.getValue("visit_date"));
          return (
            <div>
              <div className="font-medium">
                {visitDate.toLocaleDateString(undefined, {
                  weekday: "short",
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                })}
              </div>
              <div className="text-sm text-muted-foreground">
                {visitDate.toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </div>
            </div>
          );
        },
      },
      {
        accessorKey: "doctor",
        header: () => <div>{t("table.doctor")}</div>,
        cell: ({ row }) => {
          const doctor = row.original.doctor;
          return (
            <div>
              {doctor ? (
                <>
                  <div className="font-medium">
                    Dr. {doctor.name} {doctor.surname}
                  </div>
                  {doctor.specialization && (
                    <div className="text-sm text-muted-foreground">
                      {doctor.specialization}
                    </div>
                  )}
                </>
              ) : (
                <span className="text-muted-foreground">—</span>
              )}
            </div>
          );
        },
      },
      {
        accessorKey: "status",
        header: () => <div>{t("table.status")}</div>,
        cell: ({ row }) => {
          const status = row.original.status || "scheduled";
          const statusConfig: Record<
            string,
            { icon: React.ReactNode; label: string; className: string }
          > = {
            scheduled: {
              icon: <Clock className="h-3 w-3" />,
              label: t("status.scheduled"),
              className:
                "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
            },
            checked_in: {
              icon: <AlertCircle className="h-3 w-3" />,
              label: t("status.checkedIn"),
              className:
                "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300",
            },
            in_progress: {
              icon: <Stethoscope className="h-3 w-3" />,
              label: t("status.inProgress"),
              className:
                "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
            },
            completed: {
              icon: <CheckCircle2 className="h-3 w-3" />,
              label: t("status.completed"),
              className:
                "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
            },
            cancelled: {
              icon: <X className="h-3 w-3" />,
              label: t("status.cancelled"),
              className:
                "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
            },
          };
          const config = statusConfig[status] || statusConfig.scheduled;
          return (
            <span
              className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${config.className}`}
            >
              {config.icon}
              {config.label}
            </span>
          );
        },
      },
      {
        accessorKey: "symptom_count",
        header: () => <div>{t("table.symptoms")}</div>,
        cell: ({ row }) => {
          const count = row.original.symptom_count || 0;
          return (
            <div className="text-center">
              <span
                className={`px-2 py-1 rounded-full text-xs ${
                  count > 0 ? " text-primary" : "text-muted-foreground"
                }`}
              >
                {count}
              </span>
            </div>
          );
        },
      },
      {
        accessorKey: "diagnosis_count",
        header: () => <div>{t("table.diagnoses")}</div>,
        cell: ({ row }) => {
          const count = row.original.diagnosis_count || 0;
          return (
            <div className="text-center">
              <span
                className={`px-2 py-1 rounded-full text-xs ${
                  count > 0
                    ? " text-foreground dark:text-white"
                    : "text-muted-foreground"
                }`}
              >
                {count}
              </span>
            </div>
          );
        },
      },
      {
        id: "actions",
        enableHiding: false,
        header: () => <div className="text-right"></div>,
        cell: ({ row }) => {
          const visit = row.original;

          return (
            <div className="text-right">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="h-8 w-8 p-0">
                    <span className="sr-only">{t("table.openMenu")}</span>
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>{t("table.actions")}</DropdownMenuLabel>
                  <DropdownMenuItem onClick={() => handleViewVisit(visit)}>
                    <Eye className="mr-2 h-4 w-4" />
                    {t("table.viewVisit")}
                  </DropdownMenuItem>
                  {canAddSymptoms(visit) && (
                    <DropdownMenuItem onClick={() => handleAddSymptoms(visit)}>
                      <Plus className="mr-2 h-4 w-4" />
                      {t("table.addSymptoms")}
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          );
        },
      },
    ],
    [t, handleViewVisit, handleAddSymptoms]
  );

  const table = useReactTable({
    data,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    state: {
      sorting,
      columnFilters,
    },
  });

  if (loading) {
    return (
      <div className="w-full">
        <div className="flex items-center justify-center py-8">
          <div className="text-muted-foreground">{t("table.loading")}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="overflow-hidden rounded-md border bg-white">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  {t("table.noVisits")}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <div className="flex items-center justify-end space-x-2 py-4">
        <div className="text-muted-foreground text-sm">
          {t("table.showing", {
            count: table.getRowModel().rows.length,
            total: data.length,
          })}
        </div>
        <div className="space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            {t("table.previous")}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            {t("table.next")}
          </Button>
        </div>
      </div>

      {/* View Visit Dialog (read-only) */}
      <EditVisitDialog
        visit={
          selectedVisit
            ? {
                id: selectedVisit.id,
                patient_id: patientId || "",
                doctor_id: "",
                visit_date: selectedVisit.visit_date,
                status: selectedVisit.status,
                notes: selectedVisit.notes,
                created_at: "",
                updated_at: "",
              }
            : null
        }
        open={viewDialogOpen}
        onOpenChange={setViewDialogOpen}
        readOnly={true}
      />

      {/* Symptoms Entry Dialog */}
      {symptomsDialogOpen && selectedVisit && patientId && (
        <PatientSymptomsDialog
          visit={selectedVisit}
          patientId={patientId}
          open={symptomsDialogOpen}
          onOpenChange={setSymptomsDialogOpen}
          onSymptomsUpdated={fetchVisits}
        />
      )}
    </div>
  );
}
