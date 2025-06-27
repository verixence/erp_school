'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-client';
import { useAuth } from '@/hooks/use-auth';
import { 
  Plus, 
  Edit, 
  Trash2, 
  MoreVertical, 
  Search,
  ChevronLeft,
  ChevronRight,
  Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'react-hot-toast';

interface Column<T = any> {
  key: string;
  label: string;
  render?: (value: any, item: T) => React.ReactNode;
  sortable?: boolean;
}

interface EnhancedCrudTableProps<T = any> {
  entity: string;
  columns: Column<T>[];
  title: string;
  searchPlaceholder?: string;
  onAdd?: () => void;
  onEdit?: (item: T) => void;
  onDelete?: (item: T) => void;
  addButtonText?: string;
  customActions?: Array<{
    label: string;
    icon?: React.ReactNode;
    onClick: (item: T) => void;
    variant?: 'default' | 'destructive' | 'outline';
  }>;
  filters?: Record<string, any>;
  enableSearch?: boolean;
  enablePagination?: boolean;
  pageSize?: number;
  customData?: T[]; // Add custom data prop to override querying
  isCustomDataLoading?: boolean;
}

export default function EnhancedCrudTable<T extends Record<string, any>>({
  entity,
  columns,
  title,
  searchPlaceholder = "Search...",
  onAdd,
  onEdit,
  onDelete,
  addButtonText = "Add New",
  customActions = [],
  filters = {},
  enableSearch = true,
  enablePagination = true,
  pageSize = 10,
  customData,
  isCustomDataLoading = false
}: EnhancedCrudTableProps<T>) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  // State
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState<string>('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [deleteItem, setDeleteItem] = useState<T | null>(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  // Queries - only run if no custom data provided
  const { data: items = [], isLoading, error } = useQuery({
    queryKey: [entity, user?.school_id, search, page, sortBy, sortOrder, filters],
    queryFn: async () => {
      let query = supabase
        .from(entity)
        .select('*')
        .eq('school_id', user?.school_id);
      
      // Apply additional filters
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          query = query.eq(key, value);
        }
      });
      
      // Apply search
      if (search && enableSearch) {
        const searchFields = columns
          .filter(col => col.key !== 'id' && col.key !== 'created_at' && col.key !== 'updated_at')
          .map(col => col.key);
        
        if (searchFields.length > 0) {
          query = query.or(
            searchFields.map(field => `${field}.ilike.%${search}%`).join(',')
          );
        }
      }
      
      // Apply sorting
      query = query.order(sortBy, { ascending: sortOrder === 'asc' });
      
      // Apply pagination
      if (enablePagination) {
        query = query.range((page - 1) * pageSize, page * pageSize - 1);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.school_id && !customData, // Only query if no custom data
  });

  // Count query for pagination
  const { data: totalCount = 0 } = useQuery({
    queryKey: [entity, 'count', user?.school_id, search, filters],
    queryFn: async () => {
      let query = supabase
        .from(entity)
        .select('*', { count: 'exact', head: true })
        .eq('school_id', user?.school_id);
      
      // Apply additional filters
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          query = query.eq(key, value);
        }
      });
      
      if (search && enableSearch) {
        const searchFields = columns
          .filter(col => col.key !== 'id' && col.key !== 'created_at' && col.key !== 'updated_at')
          .map(col => col.key);
        
        if (searchFields.length > 0) {
          query = query.or(
            searchFields.map(field => `${field}.ilike.%${search}%`).join(',')
          );
        }
      }
      
      const { count, error } = await query;
      if (error) throw error;
      return count || 0;
    },
    enabled: !!user?.school_id && enablePagination,
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from(entity)
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [entity] });
      setIsDeleteOpen(false);
      setDeleteItem(null);
      toast.success(`${entity.slice(0, -1)} deleted successfully`);
    },
    onError: (error: any) => {
      toast.error(`Failed to delete ${entity.slice(0, -1)}: ${error.message}`);
    }
  });

  // Handlers
  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('asc');
    }
  };

  const handleDeleteClick = (item: T) => {
    if (onDelete) {
      onDelete(item);
    } else {
      setDeleteItem(item);
      setIsDeleteOpen(true);
    }
  };

  const handleConfirmDelete = () => {
    if (deleteItem?.id) {
      deleteMutation.mutate(deleteItem.id);
    }
  };

  // Use custom data if provided, otherwise use queried data
  let displayItems = customData || items;
  const displayLoading = customData ? isCustomDataLoading : isLoading;
  
  // Apply client-side filtering for custom data
  if (customData && search && enableSearch) {
    displayItems = customData.filter(item => {
      const searchFields = columns
        .filter(col => col.key !== 'id' && col.key !== 'created_at' && col.key !== 'updated_at')
        .map(col => col.key);
      
      return searchFields.some(field => {
        const value = item[field];
        if (Array.isArray(value)) {
          // Handle arrays (like parent_names or subjects)
          return value.some(arrayItem => 
            arrayItem && arrayItem.toString().toLowerCase().includes(search.toLowerCase())
          );
        }
        return value && value.toString().toLowerCase().includes(search.toLowerCase());
      });
    });
  }
  
  // Apply client-side sorting for custom data
  if (customData && sortBy) {
    displayItems = [...displayItems].sort((a, b) => {
      const aVal = a[sortBy] || '';
      const bVal = b[sortBy] || '';
      
      if (sortOrder === 'asc') {
        return aVal.toString().localeCompare(bVal.toString());
      } else {
        return bVal.toString().localeCompare(aVal.toString());
      }
    });
  }
  
  // Calculate total count BEFORE pagination
  const displayTotalCount = customData ? displayItems.length : totalCount;
  
  // Apply client-side pagination for custom data
  if (customData && enablePagination) {
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    displayItems = displayItems.slice(startIndex, endIndex);
  }
  
  const totalPages = enablePagination ? Math.ceil(displayTotalCount / pageSize) : 1;

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-red-600">
            Error loading {title}: {error.message}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">{title}</h2>
          <p className="text-muted-foreground">
            {displayTotalCount} {displayTotalCount === 1 ? 'item' : 'items'}
          </p>
        </div>
        {onAdd && (
          <Button onClick={onAdd} className="gap-2">
            <Plus className="h-4 w-4" />
            {addButtonText}
          </Button>
        )}
      </div>

      {/* Search */}
      {enableSearch && (
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder={searchPlaceholder}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>
      )}

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b bg-muted/50">
                <tr>
                  {columns.map((column) => (
                    <th
                      key={column.key}
                      className={`px-4 py-3 text-left text-sm font-medium ${
                        column.sortable ? 'cursor-pointer hover:bg-muted' : ''
                      }`}
                      onClick={() => column.sortable && handleSort(column.key)}
                    >
                      <div className="flex items-center gap-2">
                        {column.label}
                        {column.sortable && sortBy === column.key && (
                          <span className="text-xs text-muted-foreground">
                            {sortOrder === 'asc' ? '↑' : '↓'}
                          </span>
                        )}
                      </div>
                    </th>
                  ))}
                  {(onEdit || onDelete || customActions.length > 0) && (
                    <th className="px-4 py-3 text-right text-sm font-medium">
                      Actions
                    </th>
                  )}
                </tr>
              </thead>
              <tbody>
                {displayLoading ? (
                  <tr>
                    <td colSpan={columns.length + 1} className="px-4 py-8 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Loading...
                      </div>
                    </td>
                  </tr>
                ) : displayItems.length === 0 ? (
                  <tr>
                    <td colSpan={columns.length + 1} className="px-4 py-8 text-center text-muted-foreground">
                      No {entity} found
                    </td>
                  </tr>
                ) : (
                  displayItems.map((item, index) => (
                    <tr key={item.id || index} className="border-b hover:bg-muted/50">
                      {columns.map((column) => (
                        <td key={column.key} className="px-4 py-3 text-sm">
                          {column.render
                            ? column.render(item[column.key], item)
                            : item[column.key] || '-'}
                        </td>
                      ))}
                      {(onEdit || onDelete || customActions.length > 0) && (
                        <td className="px-4 py-3 text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {onEdit && (
                                <DropdownMenuItem onClick={() => onEdit(item)}>
                                  <Edit className="mr-2 h-4 w-4" />
                                  Edit
                                </DropdownMenuItem>
                              )}
                              {customActions.map((action, actionIndex) => (
                                <DropdownMenuItem
                                  key={actionIndex}
                                  onClick={() => action.onClick(item)}
                                  className={action.variant === 'destructive' ? 'text-red-600' : ''}
                                >
                                  {action.icon && <span className="mr-2">{action.icon}</span>}
                                  {action.label}
                                </DropdownMenuItem>
                              ))}
                              {onDelete && (
                                <DropdownMenuItem
                                  onClick={() => handleDeleteClick(item)}
                                  className="text-red-600"
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Delete
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Pagination */}
      {enablePagination && totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {(page - 1) * pageSize + 1} to {Math.min(page * pageSize, displayTotalCount)} of {displayTotalCount} results
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(page - 1)}
              disabled={page === 1}
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            <span className="text-sm">
              Page {page} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(page + 1)}
              disabled={page === totalPages}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Delete</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this {entity.slice(0, -1)}? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmDelete}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
} 