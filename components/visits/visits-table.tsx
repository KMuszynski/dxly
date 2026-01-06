"use client";

import * as React from "react";
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
import { ArrowUpDown, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
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
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { EditVisitDialog } from "./edit-visit";
import { AddVisitDialog } from "./add-visit";
import { ScheduleVisitDialog } from "./schedule-visit";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Plus,
  CalendarPlus,
  Play,
  Clock,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
} from "lucide-react";

export type Visit = {
  id: string;
  patient_id: string;
  doctor_id: string;
  visit_date: string;
  status?: string; // scheduled, checked_in, in_progress, completed, cancelled
  notes: string | null;
  created_at: string;
  updated_at: string;
  // Joined patient data
  patient?: {
    first_name: string;
    last_name: string;
    pesel: string | null;
  };
  // Symptom count for display
  symptom_count?: number;
};

interface VisitsDataTableProps {
  autoOpenAddDialog?: boolean;
}

export function VisitsDataTable({
  autoOpenAddDialog = false,
}: VisitsDataTableProps) {
  const { t } = useTranslation("visits");
  const [data, setData] = React.useState<Visit[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    []
  );
  const [editDialogOpen, setEditDialogOpen] = React.useState(false);
  const [addDialogOpen, setAddDialogOpen] = React.useState(false);
  const [scheduleDialogOpen, setScheduleDialogOpen] = React.useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [visitToDelete, setVisitToDelete] = React.useState<Visit | null>(null);
  const [deleting, setDeleting] = React.useState(false);
  const [selectedVisit, setSelectedVisit] = React.useState<Visit | null>(null);
  const [userType, setUserType] = React.useState<string | null>(null);

  const fetchVisits = React.useCallback(async () => {
    try {
      setLoading(true);
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        return;
      }

      // Fetch user type to determine query scope
      const { data: userProfile } = await supabase
        .from("users")
        .select("type")
        .eq("user_id", session.user.id)
        .single();

      setUserType(userProfile?.type || null);

      // Build the query based on user type
      let query = supabase
        .from("visits")
        .select(
          `
          *,
          patients!inner(
            first_name,
            last_name,
            pesel
          )
        `
        )
        .order("visit_date", { ascending: false });

      // Doctors see only their own visits, assistants see all visits
      if (userProfile?.type === "doctor") {
        query = query.eq("doctor_id", session.user.id);
      }
      // Assistants see all visits (no filter)

      const { data: visits, error } = await query;

      if (error) {
        console.error("Error fetching visits:", error);
        return;
      }

      // Transform the data to flatten patient info
      // Note: Supabase returns the related table as an array, but with inner join it should be a single object
      const transformedVisits =
        visits?.map((visit: any) => {
          const patientData = Array.isArray(visit.patients)
            ? visit.patients[0]
            : visit.patients;

          return {
            ...visit,
            patient: patientData
              ? {
                  first_name: patientData.first_name,
                  last_name: patientData.last_name,
                  pesel: patientData.pesel,
                }
              : undefined,
          };
        }) || [];

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

  // Auto-open add dialog if prop is set
  React.useEffect(() => {
    if (autoOpenAddDialog) {
      setAddDialogOpen(true);
    }
  }, [autoOpenAddDialog]);

  const handleEditVisit = React.useCallback((visit: Visit) => {
    setSelectedVisit(visit);
    setEditDialogOpen(true);
  }, []);

  const handleStartVisit = React.useCallback(
    async (visit: Visit) => {
      // Update status to in_progress (if not already) and open the add-visit dialog
      try {
        // Only update status if not already in_progress
        if (visit.status !== "in_progress") {
          await supabase
            .from("visits")
            .update({ status: "in_progress" })
            .eq("id", visit.id);
        }

        // Open the add dialog with the visit data pre-filled
        setSelectedVisit({ ...visit, status: "in_progress" });
        setAddDialogOpen(true);
        fetchVisits();
      } catch (error) {
        console.error("Error starting visit:", error);
      }
    },
    [fetchVisits]
  );

  const handleDeleteVisit = React.useCallback((visit: Visit) => {
    setVisitToDelete(visit);
    setDeleteDialogOpen(true);
  }, []);

  const confirmDeleteVisit = React.useCallback(async () => {
    if (!visitToDelete) return;

    setDeleting(true);
    try {
      // First delete related records (symptoms and diagnoses)
      await supabase
        .from("visit_symptoms")
        .delete()
        .eq("visit_id", visitToDelete.id);
      await supabase
        .from("visit_diagnoses")
        .delete()
        .eq("visit_id", visitToDelete.id);

      // Then delete the visit
      const { error } = await supabase
        .from("visits")
        .delete()
        .eq("id", visitToDelete.id);

      if (error) throw error;

      toast.success(t("table.visitDeleted", "Visit deleted successfully"));
      setDeleteDialogOpen(false);
      setVisitToDelete(null);
      fetchVisits();
    } catch (error) {
      console.error("Error deleting visit:", error);
      toast.error(t("table.deleteError", "Failed to delete visit"));
    } finally {
      setDeleting(false);
    }
  }, [visitToDelete, fetchVisits, t]);

  const handleVisitUpdated = () => {
    fetchVisits();
  };

  const handleVisitAdded = () => {
    fetchVisits();
  };

  const columns = React.useMemo<ColumnDef<Visit>[]>(
    () => [
      {
        accessorKey: "patientName",
        header: ({ column }) => {
          return (
            <Button
              variant="ghost"
              onClick={() =>
                column.toggleSorting(column.getIsSorted() === "asc")
              }
            >
              {t("table.patientName")}
              <ArrowUpDown className="ml-2 h-4 w-4" />
            </Button>
          );
        },
        cell: ({ row }) => {
          const visit = row.original;
          return (
            <div className="font-medium">
              {visit.patient
                ? `${visit.patient.first_name} ${visit.patient.last_name}`
                : t("table.unknownPatient")}
            </div>
          );
        },
        accessorFn: (row) =>
          row.patient
            ? `${row.patient.first_name} ${row.patient.last_name}`
            : "",
      },
      {
        accessorKey: "patientPesel",
        header: ({ column }) => {
          return (
            <Button
              variant="ghost"
              onClick={() =>
                column.toggleSorting(column.getIsSorted() === "asc")
              }
            >
              {t("table.patientPesel")}
              <ArrowUpDown className="ml-2 h-4 w-4" />
            </Button>
          );
        },
        cell: ({ row }) => {
          const visit = row.original;
          return (
            <div className="text-muted-foreground">
              {visit.patient?.pesel || "—"}
            </div>
          );
        },
        accessorFn: (row) => row.patient?.pesel || "",
      },
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
              {t("table.visitDate")}
              <ArrowUpDown className="ml-2 h-4 w-4" />
            </Button>
          );
        },
        cell: ({ row }) => {
          const visitDate = new Date(row.getValue("visit_date"));
          return (
            <div>
              {visitDate.toLocaleDateString()}{" "}
              {visitDate.toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </div>
          );
        },
      },
      {
        accessorKey: "status",
        header: () => <div>{t("table.status", "Status")}</div>,
        cell: ({ row }) => {
          const status = row.original.status || "scheduled";
          const statusConfig: Record<
            string,
            { icon: React.ReactNode; label: string; className: string }
          > = {
            scheduled: {
              icon: <Clock className="h-3 w-3" />,
              label: t("status.scheduled", "Scheduled"),
              className:
                "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
            },
            checked_in: {
              icon: <AlertCircle className="h-3 w-3" />,
              label: t("status.checkedIn", "Checked In"),
              className:
                "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300",
            },
            in_progress: {
              icon: <Play className="h-3 w-3" />,
              label: t("status.inProgress", "In Progress"),
              className:
                "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
            },
            completed: {
              icon: <CheckCircle2 className="h-3 w-3" />,
              label: t("status.completed", "Completed"),
              className:
                "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
            },
            cancelled: {
              icon: <AlertCircle className="h-3 w-3" />,
              label: t("status.cancelled", "Cancelled"),
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
        accessorKey: "notes",
        header: () => <div>{t("table.notes")}</div>,
        cell: ({ row }) => {
          const notes = row.getValue("notes") as string | null;
          return (
            <div className="max-w-[300px] truncate">
              {notes || (
                <span className="text-muted-foreground">
                  {t("table.noNotes")}
                </span>
              )}
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
          const status = visit.status || "scheduled";
          const canStartVisit =
            userType === "doctor" &&
            (status === "scheduled" ||
              status === "checked_in" ||
              status === "in_progress");
          const canEditVisit = userType === "doctor";

          // Doctors can delete all visits
          // Assistants can only delete scheduled, checked_in, or cancelled visits
          const canDelete =
            userType === "doctor" ||
            (userType === "assistant" &&
              ["scheduled", "checked_in", "cancelled"].includes(status));

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
                  {canStartVisit && (
                    <DropdownMenuItem onClick={() => handleStartVisit(visit)}>
                      <Play className="mr-2 h-4 w-4" />
                      {status === "in_progress"
                        ? t("table.continueVisit", "Continue Visit")
                        : t("table.startVisit", "Start Visit")}
                    </DropdownMenuItem>
                  )}
                  {canEditVisit && (
                    <DropdownMenuItem onClick={() => handleEditVisit(visit)}>
                      <Pencil className="mr-2 h-4 w-4" />
                      {t("table.editVisit")}
                    </DropdownMenuItem>
                  )}
                  {canDelete && (
                    <DropdownMenuItem
                      onClick={() => handleDeleteVisit(visit)}
                      className="text-destructive focus:text-destructive"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      {t("table.deleteVisit", "Delete Visit")}
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          );
        },
      },
    ],
    [t, handleEditVisit, handleStartVisit, handleDeleteVisit, userType]
  );

  const [globalFilter, setGlobalFilter] = React.useState("");

  const table = useReactTable({
    data,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    globalFilterFn: (row, columnId, filterValue) => {
      const visit = row.original;
      const searchValue = filterValue.toLowerCase();
      const patientName = visit.patient
        ? `${visit.patient.first_name} ${visit.patient.last_name}`.toLowerCase()
        : "";
      const pesel = (visit.patient?.pesel || "").toLowerCase();

      return patientName.includes(searchValue) || pesel.includes(searchValue);
    },
    state: {
      sorting,
      columnFilters,
      globalFilter,
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
      <div className="flex items-center justify-between py-4">
        <Input
          placeholder={t("table.filterPlaceholder")}
          value={globalFilter}
          onChange={(event) => setGlobalFilter(event.target.value)}
          className="max-w-sm bg-white"
        />
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setScheduleDialogOpen(true)}>
            <CalendarPlus className="mr-2 h-4 w-4" />
            {t("table.scheduleVisit", "Schedule Visit")}
          </Button>
          {userType === "doctor" && (
            <Button
              onClick={() => setAddDialogOpen(true)}
              className="bg-brand text-white hover:!bg-brand hover:brightness-125"
            >
              <Plus className="mr-2 h-4 w-4" />
              {t("table.addVisit")}
            </Button>
          )}
        </div>
      </div>
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
                  {t("table.noResults")}
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

      <EditVisitDialog
        visit={selectedVisit}
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        onVisitUpdated={handleVisitUpdated}
      />
      <AddVisitDialog
        open={addDialogOpen}
        onOpenChange={(open) => {
          setAddDialogOpen(open);
          if (!open) setSelectedVisit(null); // Clear selection when closing
        }}
        onVisitAdded={handleVisitAdded}
        existingVisit={selectedVisit}
      />
      <ScheduleVisitDialog
        open={scheduleDialogOpen}
        onOpenChange={setScheduleDialogOpen}
        onVisitScheduled={handleVisitAdded}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10">
                <AlertTriangle className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <DialogTitle>{t("table.deleteVisit")}</DialogTitle>
                <DialogDescription className="mt-1">
                  {t("table.confirmDelete")}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          {visitToDelete && (
            <div className="py-4">
              <div className="rounded-md bg-muted p-3 text-sm">
                <p className="font-medium">
                  {visitToDelete.patient
                    ? `${visitToDelete.patient.first_name} ${visitToDelete.patient.last_name}`
                    : t("table.unknownPatient")}
                </p>
                <p className="text-muted-foreground">
                  {new Date(visitToDelete.visit_date).toLocaleDateString()}{" "}
                  {new Date(visitToDelete.visit_date).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
            </div>
          )}
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={deleting}
            >
              {t("add.buttons.cancel", "Cancel")}
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDeleteVisit}
              disabled={deleting}
            >
              {deleting
                ? t("table.deleting", "Deleting...")
                : t("table.deleteVisit")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
