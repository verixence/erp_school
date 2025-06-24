import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

export const createServerSupabaseClient = async () => {
  const cookieStore = await cookies();
  
  return createClient(
    process.env.NEXT_PUBLIC_SUPA_URL!,
    process.env.NEXT_PUBLIC_SUPA_ANON_KEY!,
    {
      auth: {
        storage: {
          getItem: (key: string) => {
            return cookieStore.get(key)?.value || null;
          },
          setItem: (key: string, value: string) => {
            cookieStore.set(key, value);
          },
          removeItem: (key: string) => {
            cookieStore.delete(key);
          },
        },
      },
    }
  );
};