"use client";

import { useState, useMemo, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase-client";
import { useAuth } from "@/hooks/use-auth";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Search,
  Plus,
  MoreVertical,
  Edit,
  Trash2,
  Download,
  Upload,
  Filter,
  SortAsc,
  SortDesc,
  Eye,
  EyeOff,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

export interface DataGridColumn<T = any> {
  key: string;
  label: string;
  sortable?: boolean;
  filterable?: boolean;
  hidden?: boolean;
  width?: string;
  render?: (value: any, row: T) => React.ReactNode;
}

interface DataGridProps<T = any> {
  entity: string;
  columns: DataGridColumn<T>[];
  title: string;
  description?: string;
  searchPlaceholder?: string;
  onRowClick?: (row: T) => void;
  onAdd?: () => void;
  onEdit?: (row: T) => void;
  onDelete?: (row: T) => void;
  onBulkAction?: (selectedRows: T[], action: string) => void;
  enableSelection?: boolean;
  enableExport?: boolean;
  enableColumnToggle?: boolean;
  pageSize?: number;
}

export function DataGrid<T extends Record<string, any>>({
  entity,
  columns,
  title,
  description,
  searchPlaceholder = "Search...",
  onRowClick,
  onAdd,
  onEdit,
  onDelete,
  onBulkAction,
  enableSelection = true,
  enableExport = true,
  enableColumnToggle = true,
  pageSize = 10,
}: DataGridProps<T>) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  // State
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [visibleColumns, setVisibleColumns] = useState<Set<string>>(
    new Set(columns.filter(col => !col.hidden).map(col => col.key))
  );
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; item: T | null }>({
    open: false,
    item: null,
  });

  // Computed values
  const offset = (currentPage - 1) * pageSize;
  
  // Data fetching
  const { data: items = { data: [], count: 0 }, isLoading, error } = useQuery({
    queryKey: [entity, user?.school_id, search, sortBy, sortOrder, currentPage],
    queryFn: async () => {
      let query = supabase
        .from(entity)
        .select("*", { count: "exact" });

      // Apply school filter for non-super admins
      if (user?.role !== "super_admin" && user?.school_id) {
        query = query.eq("school_id", user.school_id);
      }

      // Apply search
      if (search) {
        const searchableColumns = columns
          .filter(col => col.filterable !== false)
          .map(col => col.key);
        
        if (searchableColumns.length > 0) {
          query = query.or(
            searchableColumns.map(field => `${field}.ilike.%${search}%`).join(",")
          );
        }
      }

      // Apply sorting
      if (sortBy) {
        query = query.order(sortBy, { ascending: sortOrder === "asc" });
      } else {
        query = query.order("created_at", { ascending: false });
      }

      // Apply pagination
      query = query.range(offset, offset + pageSize - 1);

      const { data, error, count } = await query;
      if (error) throw error;
      
      return { data: data || [], count: count || 0 };
    },
    enabled: !!user,
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from(entity)
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [entity] });
      setDeleteDialog({ open: false, item: null });
    },
  });

  // Handlers
  const handleSort = useCallback((columnKey: string) => {
    if (sortBy === columnKey) {
      setSortOrder(prev => prev === "asc" ? "desc" : "asc");
    } else {
      setSortBy(columnKey);
      setSortOrder("asc");
    }
    setCurrentPage(1);
  }, [sortBy]);

  const handleRowSelect = useCallback((rowId: string, checked: boolean) => {
    setSelectedRows(prev => {
      const next = new Set(prev);
      if (checked) {
        next.add(rowId);
      } else {
        next.delete(rowId);
      }
      return next;
    });
  }, []);

  const handleSelectAll = useCallback((checked: boolean) => {
    if (checked) {
      setSelectedRows(new Set(items?.data?.map(item => item.id) || []));
    } else {
      setSelectedRows(new Set());
    }
  }, [items?.data]);

  const handleColumnToggle = useCallback((columnKey: string) => {
    setVisibleColumns(prev => {
      const next = new Set(prev);
      if (next.has(columnKey)) {
        next.delete(columnKey);
      } else {
        next.add(columnKey);
      }
      return next;
    });
  }, []);

  const handleExport = useCallback(() => {
    const csvContent = [
      // Header
      visibleColumns.size > 0 
        ? columns.filter(col => visibleColumns.has(col.key)).map(col => col.label).join(",")
        : columns.map(col => col.label).join(","),
      // Data
      ...(items?.data || []).map(item => 
        (visibleColumns.size > 0 
          ? columns.filter(col => visibleColumns.has(col.key))
          : columns
        ).map(col => {
          const value = item[col.key];
          return typeof value === "string" ? `"${value.replace(/"/g, '""')}"` : value || "";
        }).join(",")
      )
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${entity}-export-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [entity, items?.data, columns, visibleColumns]);

  const totalPages = Math.ceil((items.count || 0) / pageSize);
  const visibleColumnsArray = columns.filter(col => visibleColumns.has(col.key));

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-red-600">
            Error loading data. Please try again.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">{title}</h2>
          {description && (
            <p className="text-muted-foreground">{description}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {enableExport && (
            <Button variant="outline" size="sm" onClick={handleExport}>
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
          )}
          {onAdd && (
            <Button onClick={onAdd}>
              <Plus className="w-4 h-4 mr-2" />
              Add {entity.slice(0, -1)}
            </Button>
          )}
        </div>
      </div>

      {/* Toolbar */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder={searchPlaceholder}
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setCurrentPage(1);
                }}
                className="pl-10"
              />
            </div>

            {/* Column toggle */}
            {enableColumnToggle && (
              <div className="flex items-center gap-2">
                {columns.map(column => (
                  <Button
                    key={column.key}
                    variant={visibleColumns.has(column.key) ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleColumnToggle(column.key)}
                  >
                    {visibleColumns.has(column.key) ? (
                      <Eye className="w-3 h-3 mr-1" />
                    ) : (
                      <EyeOff className="w-3 h-3 mr-1" />
                    )}
                    {column.label}
                  </Button>
                ))}
              </div>
            )}
          </div>

          {/* Bulk actions */}
          {enableSelection && selectedRows.size > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4 p-3 bg-primary/10 rounded-lg"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">
                  {selectedRows.size} item{selectedRows.size === 1 ? "" : "s"} selected
                </span>
                <div className="flex items-center gap-2">
                  {onBulkAction && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const selected = (items?.data || []).filter(item => selectedRows.has(item.id));
                        onBulkAction(selected, "delete");
                      }}
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete Selected
                    </Button>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  {enableSelection && (
                    <TableHead className="w-12">
                      <input
                        type="checkbox"
                        checked={
                          (items?.data?.length || 0) > 0 && 
                          (items?.data || []).every(item => selectedRows.has(item.id))
                        }
                        onChange={(e) => handleSelectAll(e.target.checked)}
                        className="rounded border-gray-300"
                      />
                    </TableHead>
                  )}
                  {visibleColumnsArray.map((column) => (
                    <TableHead
                      key={column.key}
                      className={cn(
                        "font-semibold",
                        column.sortable !== false && "cursor-pointer select-none hover:bg-muted/50",
                        column.width && `w-[${column.width}]`
                      )}
                      onClick={() => column.sortable !== false && handleSort(column.key)}
                    >
                      <div className="flex items-center space-x-2">
                        <span>{column.label}</span>
                        {column.sortable !== false && (
                          <div className="flex flex-col">
                            <SortAsc
                              className={cn(
                                "w-3 h-3",
                                sortBy === column.key && sortOrder === "asc"
                                  ? "text-primary"
                                  : "text-muted-foreground"
                              )}
                            />
                            <SortDesc
                              className={cn(
                                "w-3 h-3 -mt-1",
                                sortBy === column.key && sortOrder === "desc"
                                  ? "text-primary"
                                  : "text-muted-foreground"
                              )}
                            />
                          </div>
                        )}
                      </div>
                    </TableHead>
                  ))}
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell
                      colSpan={visibleColumnsArray.length + (enableSelection ? 1 : 0) + 1}
                      className="h-32 text-center"
                    >
                      <div className="flex items-center justify-center">
                        <Loader2 className="w-6 h-6 animate-spin mr-2" />
                        Loading...
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (items?.data?.length || 0) === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={visibleColumnsArray.length + (enableSelection ? 1 : 0) + 1}
                      className="h-32 text-center text-muted-foreground"
                    >
                      No {entity} found.
                    </TableCell>
                  </TableRow>
                ) : (
                  <AnimatePresence>
                    {(items?.data || []).map((item, index) => (
                      <motion.tr
                        key={item.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ delay: index * 0.05 }}
                        className={cn(
                          "border-b transition-colors hover:bg-muted/50",
                          onRowClick && "cursor-pointer",
                          selectedRows.has(item.id) && "bg-primary/5"
                        )}
                        onClick={() => onRowClick?.(item)}
                      >
                        {enableSelection && (
                          <TableCell>
                            <input
                              type="checkbox"
                              checked={selectedRows.has(item.id)}
                              onChange={(e) => {
                                e.stopPropagation();
                                handleRowSelect(item.id, e.target.checked);
                              }}
                              className="rounded border-gray-300"
                            />
                          </TableCell>
                        )}
                        {visibleColumnsArray.map((column) => (
                          <TableCell key={column.key}>
                            {column.render
                              ? column.render(item[column.key], item)
                              : item[column.key]}
                          </TableCell>
                        ))}
                        <TableCell>
                          <div className="flex items-center gap-1">
                            {onEdit && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onEdit(item);
                                }}
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                            )}
                            {onDelete && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setDeleteDialog({ open: true, item });
                                }}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </motion.tr>
                    ))}
                  </AnimatePresence>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                Showing {offset + 1} to {Math.min(offset + pageSize, items.count)} of{" "}
                {items.count} results
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                >
                  <ChevronsLeft className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <span className="text-sm font-medium px-3">
                  Page {currentPage} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={currentPage === totalPages}
                >
                  <ChevronsRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialog.open} onOpenChange={(open) => setDeleteDialog({ open, item: null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this item? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialog({ open: false, item: null })}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteDialog.item && deleteMutation.mutate(deleteDialog.item.id)}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
} 