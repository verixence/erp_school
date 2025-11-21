'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Filter, X, Search, SlidersHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface FilterConfig {
  key: string;
  label: string;
  type: 'select' | 'multiselect' | 'text' | 'date' | 'daterange';
  options?: { value: string; label: string }[];
  placeholder?: string;
}

interface FilterBarProps {
  filters: FilterConfig[];
  onFilterChange?: (filters: Record<string, any>) => void;
  searchPlaceholder?: string;
  className?: string;
}

export default function FilterBar({
  filters,
  onFilterChange,
  searchPlaceholder = 'Search...',
  className
}: FilterBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');
  const [filterValues, setFilterValues] = useState<Record<string, any>>(() => {
    const initial: Record<string, any> = {};
    filters.forEach(filter => {
      const value = searchParams.get(filter.key);
      if (value) {
        initial[filter.key] = value;
      }
    });
    return initial;
  });
  const [isOpen, setIsOpen] = useState(false);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      updateURL();
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, filterValues]);

  const updateURL = () => {
    const params = new URLSearchParams();

    if (searchQuery) {
      params.set('search', searchQuery);
    }

    Object.entries(filterValues).forEach(([key, value]) => {
      if (value) {
        params.set(key, value);
      }
    });

    const query = params.toString();
    router.push(`${pathname}${query ? `?${query}` : ''}`, { scroll: false });

    if (onFilterChange) {
      onFilterChange({
        search: searchQuery,
        ...filterValues
      });
    }
  };

  const handleFilterChange = (key: string, value: any) => {
    setFilterValues(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const clearFilter = (key: string) => {
    setFilterValues(prev => {
      const newValues = { ...prev };
      delete newValues[key];
      return newValues;
    });
  };

  const clearAllFilters = () => {
    setSearchQuery('');
    setFilterValues({});
    router.push(pathname);
  };

  const activeFilterCount = Object.keys(filterValues).length + (searchQuery ? 1 : 0);

  return (
    <div className={cn('space-y-4', className)}>
      {/* Search and Filter Toggle */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={searchPlaceholder}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Mobile Filter Sheet */}
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" className="relative">
              <SlidersHorizontal className="h-4 w-4 mr-2" />
              Filters
              {activeFilterCount > 0 && (
                <Badge
                  variant="destructive"
                  className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0 text-xs"
                >
                  {activeFilterCount}
                </Badge>
              )}
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
            <SheetHeader>
              <SheetTitle>Filters</SheetTitle>
              <SheetDescription>
                Refine your search with filters below
              </SheetDescription>
            </SheetHeader>

            <div className="space-y-4 mt-6">
              {filters.map(filter => (
                <div key={filter.key} className="space-y-2">
                  <Label htmlFor={filter.key}>{filter.label}</Label>
                  {filter.type === 'select' && (
                    <Select
                      value={filterValues[filter.key] || ''}
                      onValueChange={(value) => handleFilterChange(filter.key, value)}
                    >
                      <SelectTrigger id={filter.key}>
                        <SelectValue placeholder={filter.placeholder || `Select ${filter.label}`} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">All</SelectItem>
                        {filter.options?.map(option => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  {filter.type === 'text' && (
                    <Input
                      id={filter.key}
                      placeholder={filter.placeholder}
                      value={filterValues[filter.key] || ''}
                      onChange={(e) => handleFilterChange(filter.key, e.target.value)}
                    />
                  )}
                </div>
              ))}

              <div className="flex gap-2 pt-4">
                <Button variant="outline" onClick={clearAllFilters} className="flex-1">
                  Clear All
                </Button>
                <Button onClick={() => setIsOpen(false)} className="flex-1">
                  Apply
                </Button>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {/* Active Filter Chips */}
      {activeFilterCount > 0 && (
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-sm text-muted-foreground">Active filters:</span>

          {searchQuery && (
            <Badge variant="secondary" className="gap-1">
              Search: {searchQuery}
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => setSearchQuery('')}
              />
            </Badge>
          )}

          {Object.entries(filterValues).map(([key, value]) => {
            const filter = filters.find(f => f.key === key);
            const label = filter?.options?.find(o => o.value === value)?.label || value;
            return (
              <Badge key={key} variant="secondary" className="gap-1">
                {filter?.label}: {label}
                <X
                  className="h-3 w-3 cursor-pointer"
                  onClick={() => clearFilter(key)}
                />
              </Badge>
            );
          })}

          <Button
            variant="ghost"
            size="sm"
            onClick={clearAllFilters}
            className="h-6 text-xs"
          >
            Clear all
          </Button>
        </div>
      )}
    </div>
  );
}
