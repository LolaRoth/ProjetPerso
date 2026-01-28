/**
 * Composable pour accéder au client Supabase
 * Fournit un accès typé au client Supabase
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../../types/supabase";

export const useSupabase = (): SupabaseClient<Database> => {
  const nuxtApp = useNuxtApp();
  const supabase = nuxtApp.$supabase as SupabaseClient<Database> | undefined;

  if (!supabase) {
    throw new Error(
      "Supabase client non initialisé. Vérifie que le plugin 'plugins/supabase.client.ts' est chargé et que tu es côté client, et que les variables d'environnement SUPABASE_URL et SUPABASE_ANON_KEY sont définies.",
    );
  }

  return supabase;
};
