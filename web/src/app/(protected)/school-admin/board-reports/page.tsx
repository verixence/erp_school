 'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { supabase } from '@/lib/supabase-client';

export default function BoardReportsRedirect() {
  const { user } = useAuth();
  const router = useRouter();

  // Fetch school details to determine board type
  const { data: school, isLoading } = useQuery({
    queryKey: ['school-board-type', user?.school_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('schools')
        .select('id, name, board_type, state_board_type, assessment_pattern, board_affiliation')
        .eq('id', user?.school_id!)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!user?.school_id,
  });

  // Determine if this is a State Board school
  const isStateBoardSchool = school && (
    school.state_board_type === 'Telangana' || 
    school.assessment_pattern === 'State_FA_SA' ||
    school.board_type === 'State Board' ||
    school.board_affiliation === 'State Board'
  );

  useEffect(() => {
    if (school && !isLoading) {
      // Debug logging
      console.log('Board Reports Redirect - School board detection:', {
        school_name: school.name,
        state_board_type: school.state_board_type,
        assessment_pattern: school.assessment_pattern,
        board_type: school.board_type,
        board_affiliation: school.board_affiliation,
        isStateBoardSchool,
        redirectTo: isStateBoardSchool ? '/school-admin/ssc-reports' : '/school-admin/cbse-reports'
      });

      // Redirect to appropriate reports page
      if (isStateBoardSchool) {
        router.replace('/school-admin/ssc-reports');
      } else {
        router.replace('/school-admin/cbse-reports');
      }
    }
  }, [school, isLoading, isStateBoardSchool, router]);

  // Show loading state while determining school type
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="text-center">
        <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
        <h2 className="text-lg font-semibold text-gray-900 mb-2">Loading Reports...</h2>
        <p className="text-gray-600">
          Detecting your school's board type to show the appropriate reports
        </p>
      </div>
    </div>
  );
}