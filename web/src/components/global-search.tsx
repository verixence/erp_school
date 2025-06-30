'use client';

import { useState, useEffect } from 'react';
import { Search, Users, GraduationCap, UserCheck } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-client';

interface SearchResult {
  id: string;
  name: string;
  email: string;
  type: 'student' | 'teacher' | 'parent';
  details?: string;
}

export function GlobalSearch() {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const { data: searchResults, isLoading } = useQuery({
    queryKey: ['globalSearch', debouncedQuery],
    queryFn: async () => {
      if (!debouncedQuery || debouncedQuery.length < 2) {
        return [];
      }

      const results: SearchResult[] = [];

      // Search students
      const { data: students } = await supabase
        .from('students')
        .select('id, full_name, email, grade:grades(name), section:sections(name)')
        .or(`full_name.ilike.%${debouncedQuery}%,email.ilike.%${debouncedQuery}%`)
        .limit(5);

      if (students) {
        results.push(...students.map((student: any) => ({
          id: student.id,
          name: student.full_name,
          email: student.email || '',
          type: 'student' as const,
          details: `${student.grade?.name || ''} ${student.section?.name || ''}`.trim()
        })));
      }

      // Search teachers
      const { data: teachers } = await supabase
        .from('teachers')
        .select('id, full_name, email, subject')
        .or(`full_name.ilike.%${debouncedQuery}%,email.ilike.%${debouncedQuery}%`)
        .limit(5);

      if (teachers) {
        results.push(...teachers.map(teacher => ({
          id: teacher.id,
          name: teacher.full_name,
          email: teacher.email || '',
          type: 'teacher' as const,
          details: teacher.subject || ''
        })));
      }

      // Search parents
      const { data: parents } = await supabase
        .from('users')
        .select('id, full_name, email')
        .eq('role', 'parent')
        .or(`full_name.ilike.%${debouncedQuery}%,email.ilike.%${debouncedQuery}%`)
        .limit(5);

      if (parents) {
        results.push(...parents.map(parent => ({
          id: parent.id,
          name: parent.full_name || 'Unknown',
          email: parent.email || '',
          type: 'parent' as const,
          details: 'Parent Account'
        })));
      }

      return results;
    },
    enabled: !!debouncedQuery && debouncedQuery.length >= 2,
  });

  const getIcon = (type: SearchResult['type']) => {
    switch (type) {
      case 'student':
        return <GraduationCap className="h-4 w-4" />;
      case 'teacher':
        return <UserCheck className="h-4 w-4" />;
      case 'parent':
        return <Users className="h-4 w-4" />;
    }
  };

  const getTypeColor = (type: SearchResult['type']) => {
    switch (type) {
      case 'student':
        return 'bg-blue-100 text-blue-800';
      case 'teacher':
        return 'bg-green-100 text-green-800';
      case 'parent':
        return 'bg-purple-100 text-purple-800';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full justify-start text-muted-foreground">
          <Search className="mr-2 h-4 w-4" />
          Search students, teachers, parents...
          <kbd className="ml-auto pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
            <span className="text-xs">⌘</span>K
          </kbd>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Global Search</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search for students, teachers, or parents..."
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              autoFocus
            />
          </div>

          <div className="max-h-[400px] overflow-y-auto">
            {isLoading && debouncedQuery && (
              <div className="flex items-center justify-center py-8">
                <div className="text-sm text-muted-foreground">Searching...</div>
              </div>
            )}

            {!isLoading && debouncedQuery && searchResults?.length === 0 && (
              <div className="flex items-center justify-center py-8">
                <div className="text-sm text-muted-foreground">
                  No results found for "{debouncedQuery}"
                </div>
              </div>
            )}

            {!debouncedQuery && (
              <div className="flex items-center justify-center py-8">
                <div className="text-sm text-muted-foreground">
                  Start typing to search across all users...
                </div>
              </div>
            )}

            {searchResults && searchResults.length > 0 && (
              <div className="space-y-2">
                {searchResults.map((result) => (
                  <div
                    key={`${result.type}-${result.id}`}
                    className="flex items-center justify-between rounded-lg border p-3 hover:bg-muted/50 cursor-pointer transition-colors"
                    onClick={() => {
                      // Here you could navigate to the specific user's page
                      console.log(`Navigate to ${result.type}:`, result);
                      setIsOpen(false);
                    }}
                  >
                    <div className="flex items-center space-x-3">
                      <div className={`p-2 rounded-full ${getTypeColor(result.type)}`}>
                        {getIcon(result.type)}
                      </div>
                      <div>
                        <div className="font-medium">{result.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {result.email}
                        </div>
                        {result.details && (
                          <div className="text-xs text-muted-foreground">
                            {result.details}
                          </div>
                        )}
                      </div>
                    </div>
                    <Badge variant="secondary" className={getTypeColor(result.type)}>
                      {result.type}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </div>

          {searchResults && searchResults.length > 0 && (
            <div className="text-xs text-muted-foreground text-center">
              Press Enter to select, or click on a result
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Keyboard shortcut hook
export function useGlobalSearchShortcut() {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
        event.preventDefault();
        // Trigger global search dialog
        const trigger = document.querySelector('[data-global-search-trigger]') as HTMLElement;
        trigger?.click();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);
} 