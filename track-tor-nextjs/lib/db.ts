import "server-only";

import { createClient } from "@supabase/supabase-js";

import { getRequiredEnv } from "@/lib/env";

const supabaseUrl = getRequiredEnv("SUPABASE_URL");
const serviceRoleKey = getRequiredEnv("SUPABASE_SERVICE_ROLE_KEY");

export const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});
