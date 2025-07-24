import { createClient } from '@supabase/supabase-js'

// Check if Supabase environment variables are available
export const isSupabaseConfigured =
  typeof process.env.NEXT_PUBLIC_SUPABASE_URL === "string" &&
  process.env.NEXT_PUBLIC_SUPABASE_URL.length > 0 &&
  typeof process.env.SUPABASE_SERVICE_ROLE_KEY === "string" &&
  process.env.SUPABASE_SERVICE_ROLE_KEY.length > 0

// Fallback to anon key if service role key is not available (for development)
export const hasServiceRoleKey = 
  typeof process.env.SUPABASE_SERVICE_ROLE_KEY === "string" &&
  process.env.SUPABASE_SERVICE_ROLE_KEY.length > 0

// Helper to create a dummy PostgrestQueryBuilder chain
function dummyQueryBuilder(result = { data: null, error: null }) {
  const chain = {
    select: () => chain,
    eq: () => chain,
    order: () => chain,
    limit: () => chain,
    single: () => Promise.resolve(result),
    insert: () => chain,
    update: () => chain,
    delete: () => chain,
    gte: () => chain,
    lte: () => chain,
    in: () => chain,
    from: () => chain,
    // For .select().single() pattern
    then: undefined, // so it's not a thenable
  };
  return chain;
}

// Create a service role client for API routes that need to bypass RLS
export const createServiceRoleClient = () => {
  if (!isSupabaseConfigured) {
    console.warn("Supabase service role environment variables are not set. Using dummy client.");
    return {
      auth: {
        getUser: () => Promise.resolve({ data: { user: null }, error: null }),
        getSession: () => Promise.resolve({ data: { session: null }, error: null }),
      },
      from: () => dummyQueryBuilder(),
    };
  }

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceRoleKey!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  );
} 