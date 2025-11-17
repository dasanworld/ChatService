import { createClient } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';
import { env } from '@/constants/env';

export type ServiceClientConfig = {
  url: string;
  serviceRoleKey: string;
};

export const createServiceClient = ({
  url,
  serviceRoleKey,
}: ServiceClientConfig): SupabaseClient =>
  createClient(url, serviceRoleKey, {
    auth: {
      persistSession: false,
    },
  });

// Create a function to get the service client with environment variables
export const getSupabaseServiceClient = (): SupabaseClient => {
  return createClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        persistSession: false,
      },
    }
  );
};
