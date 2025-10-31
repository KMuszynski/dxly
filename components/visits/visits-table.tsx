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
import { ArrowUpDown, MoreHorizontal, Pencil } from "lucide-react";
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
import { EditVisitDialog } from "./edit-visit";
import { AddVisitDialog } from "./add-visit";
import { Plus } from "lucide-react";

export type Visit = {
  id: string;
  patient_id: string;
  doctor_id: string;
  visit_date: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
  // Joined patient data
  patient?: {
    first_name: string;
    last_name: string;
  };
};

export function VisitsDataTable() {
  const { t } = useTranslation("visits");
  const [data, setData] = React.useState<Visit[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    []
  );
  const [editDialogOpen, setEditDialogOpen] = React.useState(false);
  const [addDialogOpen, setAddDialogOpen] = React.useState(false);
  const [selectedVisit, setSelectedVisit] = React.useState<Visit | null>(
    null
  );

  const fetchVisits = React.useCallback(async () => {
    try {
      setLoading(true);
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        return;
      }

      // Fetch visits for the logged-in doctor with patient data
      const { data: visits, error } = await supabase
        .from("visits")
        .select(`
          *,
          patients!inner(
            first_name,
            last_name
          )
        `)
        .eq("doctor_id", session.user.id)
        .order("visit_date", { ascending: false });

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

  const handleEditVisit = React.useCallback((visit: Visit) => {
    setSelectedVisit(visit);
    setEditDialogOpen(true);
  }, []);

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
              {visitDate.toLocaleDateString()} {visitDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </div>
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
              {notes || <span className="text-muted-foreground">{t("table.noNotes")}</span>}
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
                  <DropdownMenuItem onClick={() => handleEditVisit(visit)}>
                    <Pencil className="mr-2 h-4 w-4" />
                    {t("table.editVisit")}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          );
        },
      },
    ],
    [t, handleEditVisit]
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
      <div className="flex items-center justify-between py-4">
        <Input
          placeholder={t("table.filterPlaceholder")}
          value={(table.getColumn("patientName")?.getFilterValue() as string) ?? ""}
          onChange={(event) =>
            table.getColumn("patientName")?.setFilterValue(event.target.value)
          }
          className="max-w-sm"
        />
        <Button onClick={() => setAddDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          {t("table.addVisit")}
        </Button>
      </div>
      <div className="overflow-hidden rounded-md border">
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
        onOpenChange={setAddDialogOpen}
        onVisitAdded={handleVisitAdded}
      />
    </div>
  );
}

