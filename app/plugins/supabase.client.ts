/**
 * Plugin Supabase pour Nuxt 3
 * Initialise le client Supabase côté client uniquement
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../../types/supabase";

export default defineNuxtPlugin({
  name: "supabase",
  enforce: "pre",
  async setup() {
    // Récupérer la configuration runtime
    const config = useRuntimeConfig();

    const supabaseUrl = config.public.supabaseUrl as string;
    const supabaseAnonKey = config.public.supabaseAnonKey as string;

    if (!supabaseUrl || !supabaseAnonKey) {
      console.error(
        "Supabase URL ou Anon Key manquante. Vérifiez vos variables d'environnement.",
      );
      // fournir un stub résilient pour éviter que l'app plante lors de l'accès
      const notConfiguredError = new Error(
        "Supabase non configuré - vérifiez SUPABASE_URL et SUPABASE_ANON_KEY",
      );

      const stubClient = {
        auth: {
          signUp: async () => ({ data: null, error: notConfiguredError }),
          signInWithPassword: async () => ({
            data: null,
            error: notConfiguredError,
          }),
          signOut: async () => ({ error: notConfiguredError }),
          getSession: async () => ({ data: { session: null } }),
          onAuthStateChange: () => ({
            data: { subscription: { unsubscribe: () => {} } },
          }),
        },
        from: (_table: string) => ({
          select: () => ({
            eq: () => ({
              single: async () => ({ data: null, error: notConfiguredError }),
              order: () => ({
                limit: () => ({
                  single: async () => ({
                    data: null,
                    error: notConfiguredError,
                  }),
                }),
              }),
            }),
            order: () => ({
              eq: () => ({ data: null, error: notConfiguredError }),
            }),
          }),
          insert: () => ({
            select: () => ({
              single: async () => ({ data: null, error: notConfiguredError }),
            }),
          }),
          update: () => ({
            eq: async () => ({ data: null, error: notConfiguredError }),
          }),
        }),
      } as unknown as SupabaseClient<Database>;

      return { provide: { supabase: stubClient } };
    }

    const supabase: SupabaseClient<Database> = createClient<Database>(
      supabaseUrl,
      supabaseAnonKey,
      {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
        },
      },
    );

    return {
      provide: {
        supabase,
      },
    };
  },
});
