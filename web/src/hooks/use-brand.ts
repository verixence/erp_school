import { useQuery } from '@tanstack/react-query';
import { getSchoolBrand } from '../../../common/src/api/brand';
import { useAuth } from './use-auth';

export function useSchoolBrand() {
  const { user } = useAuth();
  const schoolId = user?.school_id;

  return useQuery({
    queryKey: ['schoolBrand', schoolId],
    queryFn: () => getSchoolBrand(schoolId!),
    enabled: !!schoolId,
  });
} 