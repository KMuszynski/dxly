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
import {
  ArrowUpDown,
  MoreHorizontal,
  Pencil,
  Trash2,
  Plus,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import "@/lib/i18n";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/lib/supabase";
import { EditPatientDialog } from "./edit-patient";
import { AddPatientDialog } from "./add-patient";
import { toast } from "sonner";

export type Patient = {
  id: string;
  user_id: string | null; // Linked auth user (for patient users)
  first_name: string;
  last_name: string;
  date_of_birth: string;
  gender: "female" | "male" | "other" | "unknown";
  phone: string | null;
  email: string | null;
  address: string | null;
  pesel: string | null;
  created_at: string;
  updated_at: string;
};

interface PatientsDataTableProps {
  autoOpenAddDialog?: boolean;
}

export function PatientsDataTable({
  autoOpenAddDialog = false,
}: PatientsDataTableProps) {
  const { t } = useTranslation("patients");
  const [data, setData] = React.useState<Patient[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    []
  );
  const [editDialogOpen, setEditDialogOpen] = React.useState(false);
  const [addDialogOpen, setAddDialogOpen] = React.useState(false);
  const [selectedPatient, setSelectedPatient] = React.useState<Patient | null>(
    null
  );

  const fetchPatients = React.useCallback(async () => {
    try {
      setLoading(true);
      const { data: patients, error } = await supabase
        .from("patients")
        .select("*")
        .order("last_name", { ascending: true });

      if (error) {
        console.error("Error fetching patients:", error);
        return;
      }

      setData(patients || []);
    } catch (error) {
      console.error("Error fetching patients:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchPatients();
  }, [fetchPatients]);

  // Auto-open add dialog if prop is set
  React.useEffect(() => {
    if (autoOpenAddDialog) {
      setAddDialogOpen(true);
    }
  }, [autoOpenAddDialog]);

  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [patientToDelete, setPatientToDelete] = React.useState<Patient | null>(
    null
  );
  const [isDeleting, setIsDeleting] = React.useState(false);

  const handleEditPatient = React.useCallback((patient: Patient) => {
    setSelectedPatient(patient);
    setEditDialogOpen(true);
  }, []);

  const handleDeletePatient = React.useCallback((patient: Patient) => {
    setPatientToDelete(patient);
    setDeleteDialogOpen(true);
  }, []);

  const confirmDeletePatient = async () => {
    if (!patientToDelete) return;

    try {
      setIsDeleting(true);

      // Call API route to delete patient and their auth user
      const response = await fetch(`/api/patients/${patientToDelete.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = await response.json();
        console.error("Error deleting patient:", data.error);
        toast.error(t("delete.errors.deleteFailed"));
        return;
      }

      toast.success(t("delete.success.patientDeleted"));
      fetchPatients();
    } catch (error) {
      console.error("Error deleting patient:", error);
      toast.error(t("delete.errors.deleteError"));
    } finally {
      setIsDeleting(false);
      setDeleteDialogOpen(false);
      setPatientToDelete(null);
    }
  };

  const handlePatientUpdated = () => {
    fetchPatients();
  };

  const handlePatientAdded = () => {
    fetchPatients();
  };

  const columns = React.useMemo<ColumnDef<Patient>[]>(
    () => [
      {
        accessorKey: "name",
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
          const patient = row.original;
          return (
            <div className="font-medium">
              {patient.first_name} {patient.last_name}
            </div>
          );
        },
        accessorFn: (row) => `${row.first_name} ${row.last_name}`,
      },
      {
        accessorKey: "pesel",
        header: ({ column }) => {
          return (
            <Button
              variant="ghost"
              onClick={() =>
                column.toggleSorting(column.getIsSorted() === "asc")
              }
            >
              {t("table.pesel")}
              <ArrowUpDown className="ml-2 h-4 w-4" />
            </Button>
          );
        },
        cell: ({ row }) => {
          const pesel = row.original.pesel;
          return <div className="text-muted-foreground">{pesel || "—"}</div>;
        },
      },
      {
        accessorKey: "email",
        header: ({ column }) => {
          return (
            <Button
              variant="ghost"
              onClick={() =>
                column.toggleSorting(column.getIsSorted() === "asc")
              }
            >
              {t("table.email")}
              <ArrowUpDown className="ml-2 h-4 w-4" />
            </Button>
          );
        },
        cell: ({ row }) => {
          const email = row.original.email;
          return <div className="text-muted-foreground">{email || "—"}</div>;
        },
      },
      {
        id: "actions",
        enableHiding: false,
        header: () => <div className="text-right"></div>,
        cell: ({ row }) => {
          const patient = row.original;

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
                  <DropdownMenuItem onClick={() => handleEditPatient(patient)}>
                    <Pencil className="mr-2 h-4 w-4" />
                    {t("table.editPatient")}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => handleDeletePatient(patient)}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    {t("table.deletePatient")}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          );
        },
      },
    ],
    [t, handleEditPatient, handleDeletePatient]
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
      const patient = row.original;
      const searchValue = filterValue.toLowerCase();
      const fullName =
        `${patient.first_name} ${patient.last_name}`.toLowerCase();
      const pesel = (patient.pesel || "").toLowerCase();
      const email = (patient.email || "").toLowerCase();

      return (
        fullName.includes(searchValue) ||
        pesel.includes(searchValue) ||
        email.includes(searchValue)
      );
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
        <Button
          onClick={() => setAddDialogOpen(true)}
          className="bg-brand text-white hover:!bg-brand hover:brightness-125"
        >
          <Plus className="mr-2 h-4 w-4" />
          {t("table.addPatient")}
        </Button>
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

      <EditPatientDialog
        patient={selectedPatient}
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        onPatientUpdated={handlePatientUpdated}
      />
      <AddPatientDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        onPatientAdded={handlePatientAdded}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("delete.title")}</DialogTitle>
            <DialogDescription>
              {t("delete.description", {
                name: patientToDelete
                  ? `${patientToDelete.first_name} ${patientToDelete.last_name}`
                  : "",
              })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={isDeleting}
            >
              {t("delete.buttons.cancel")}
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDeletePatient}
              disabled={isDeleting}
            >
              {isDeleting
                ? t("delete.buttons.deleting")
                : t("delete.buttons.delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
