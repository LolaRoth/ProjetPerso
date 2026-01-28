/**
 * Composable pour la gestion de l'authentification
 * Gère inscription, connexion, déconnexion et état utilisateur
 */
import type { AuthError } from "@supabase/supabase-js";
import type { Json } from "../../types/supabase";

// Types simplifiés pour éviter les erreurs de type récursif Supabase
interface SimpleUser {
  id: string;
  email?: string;
  user_metadata?: Record<string, unknown>;
  app_metadata?: Record<string, unknown>;
  aud?: string;
  created_at?: string;
}

interface SimpleSession {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  expires_at?: number;
  user: SimpleUser;
}

interface SimpleProfile {
  id: string;
  email: string;
  username: string | null;
  metadata: Json;
  created_at: string;
}

interface AuthState {
  user: Ref<SimpleUser | null>;
  session: Ref<SimpleSession | null>;
  profile: Ref<SimpleProfile | null>;
  loading: Ref<boolean>;
  initialized: Ref<boolean>;
}

interface AuthReturn extends AuthState {
  isAuthenticated: ComputedRef<boolean>;
  signUp: (
    email: string,
    password: string,
    username?: string,
  ) => Promise<{ error: AuthError | Error | null }>;
  signIn: (
    email: string,
    password: string,
  ) => Promise<{ error: AuthError | null }>;
  signOut: () => Promise<{ error: AuthError | null }>;
  fetchProfile: () => Promise<void>;
  updateProfile: (
    updates: Partial<SimpleProfile>,
  ) => Promise<{ error: Error | null }>;
  initAuth: () => Promise<void>;
}

// État global partagé entre les composants (exporté pour éviter la récursion de types)
export const authUser = ref<SimpleUser | null>(null);
export const authSession = ref<SimpleSession | null>(null);
export const authProfile = ref<SimpleProfile | null>(null);
export const authLoading = ref<boolean>(true);
export const authInitialized = ref<boolean>(false);

// Aliases pour compatibilité interne
const user = authUser;
const session = authSession;
const profile = authProfile;
const loading = authLoading;
const initialized = authInitialized;

export const useAuth = (): AuthReturn => {
  const isAuthenticated = computed(() => !!user.value);

  /**
   * Récupère le client Supabase de manière sécurisée
   * Retourne null si pas disponible (SSR ou plugin pas chargé)
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const getSupabase = (): any => {
    if (!import.meta.client) {
      return null;
    }
    const nuxtApp = tryUseNuxtApp();
    if (!nuxtApp?.$supabase) {
      return null;
    }
    return nuxtApp.$supabase;
  };

  /**
   * Récupère le profil de l'utilisateur connecté
   */
  const fetchProfile = async (): Promise<void> => {
    if (!user.value) {
      profile.value = null;
      return;
    }

    const supabase = getSupabase();
    if (!supabase) return;

    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.value.id)
        .maybeSingle();

      if (error) {
        console.error("Erreur lors de la récupération du profil:", error);
        return;
      }

      profile.value = data;
    } catch (err) {
      console.error(
        "Erreur inattendue lors de la récupération du profil:",
        err,
      );
    }
  };

  /**
   * Inscription d'un nouvel utilisateur
   */
  const signUp = async (
    email: string,
    password: string,
    username?: string,
  ): Promise<{ error: AuthError | Error | null }> => {
    const supabase = getSupabase();
    if (!supabase) {
      return { error: new Error("Supabase non disponible") };
    }

    loading.value = true;

    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (signUpError) {
        loading.value = false;
        return { error: signUpError };
      }

      if (data.user) {
        const { error: profileError } = await supabase.from("profiles").insert({
          id: data.user.id,
          email: email,
          username: username || email.split("@")[0],
          created_at: new Date().toISOString(),
        });

        if (profileError) {
          console.error("Erreur lors de la création du profil:", profileError);
          loading.value = false;
          return { error: new Error(profileError.message) };
        }

        user.value = data.user;
        session.value = data.session;
        await fetchProfile();
      }

      loading.value = false;
      return { error: null };
    } catch (err) {
      loading.value = false;
      return { error: err as Error };
    }
  };

  /**
   * Connexion d'un utilisateur existant
   */
  const signIn = async (
    email: string,
    password: string,
  ): Promise<{ error: AuthError | null }> => {
    const supabase = getSupabase();
    if (!supabase) {
      return { error: { message: "Supabase non disponible" } as AuthError };
    }

    loading.value = true;

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      loading.value = false;
      return { error };
    }

    user.value = data.user;
    session.value = data.session;
    await fetchProfile();
    loading.value = false;

    return { error: null };
  };

  /**
   * Déconnexion de l'utilisateur
   */
  const signOut = async (): Promise<{ error: AuthError | null }> => {
    const supabase = getSupabase();
    if (!supabase) {
      return { error: { message: "Supabase non disponible" } as AuthError };
    }

    loading.value = true;

    const { error } = await supabase.auth.signOut();

    if (!error) {
      user.value = null;
      session.value = null;
      profile.value = null;
    }

    loading.value = false;
    return { error };
  };

  /**
   * Met à jour le profil de l'utilisateur
   */
  const updateProfile = async (
    updates: Partial<SimpleProfile>,
  ): Promise<{ error: Error | null }> => {
    if (!user.value) {
      return { error: new Error("Utilisateur non connecté") };
    }

    const supabase = getSupabase();
    if (!supabase) {
      return { error: new Error("Supabase non disponible") };
    }

    const { error } = await supabase
      .from("profiles")
      .update(updates)
      .eq("id", user.value.id);

    if (error) {
      return { error: new Error(error.message) };
    }

    await fetchProfile();
    return { error: null };
  };

  /**
   * Initialise l'état d'authentification
   * Doit être appelé explicitement depuis un composant (via onMounted)
   */
  const initAuth = async (): Promise<void> => {
    if (initialized.value) return;
    if (!import.meta.client) return;

    const supabase = getSupabase();
    if (!supabase) {
      // Plugin pas encore chargé, on réessaie après un court délai
      await new Promise((resolve) => setTimeout(resolve, 50));
      const retrySupabase = getSupabase();
      if (!retrySupabase) {
        loading.value = false;
        return;
      }
      return initAuthWithClient(retrySupabase);
    }

    return initAuthWithClient(supabase);
  };

  const initAuthWithClient = async (
    supabase: NonNullable<ReturnType<typeof getSupabase>>,
  ): Promise<void> => {
    loading.value = true;

    try {
      const { data } = await supabase.auth.getSession();

      if (data.session) {
        user.value = data.session.user;
        session.value = data.session;
        await fetchProfile();
      }

      supabase.auth.onAuthStateChange(
        async (_event: string, newSession: SimpleSession | null) => {
          user.value = newSession?.user || null;
          session.value = newSession;

          if (newSession?.user) {
            await fetchProfile();
          } else {
            profile.value = null;
          }
        },
      );

      initialized.value = true;
    } catch (err) {
      console.error("Erreur lors de l'initialisation de l'auth:", err);
    } finally {
      loading.value = false;
    }
  };

  return {
    user,
    session,
    profile,
    loading,
    initialized,
    isAuthenticated,
    signUp,
    signIn,
    signOut,
    fetchProfile,
    updateProfile,
    initAuth,
  } as AuthReturn;
};
