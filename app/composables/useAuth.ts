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
  avatar_url: string | null;
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
  signInWithGoogle: () => Promise<{ error: Error | null }>;
  signOut: () => Promise<{ error: AuthError | null }>;
  fetchProfile: () => Promise<void>;
  updateProfile: (
    updates: Partial<SimpleProfile>,
  ) => Promise<{ error: Error | null }>;
  uploadAvatar: (
    file: File,
  ) => Promise<{ url: string | null; error: Error | null }>;
  initAuth: () => Promise<void>;
  ensureProfile: () => Promise<void>;
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
        try {
          const { error: profileError } = await supabase
            .from("profiles")
            .insert({
              id: data.user.id,
              email: email,
              username: username || email.split("@")[0],
              created_at: new Date().toISOString(),
            });

          // Ignorer les erreurs de clé dupliquée (profil existe déjà)
          if (profileError && profileError.code !== "23505") {
            console.error(
              "Erreur lors de la création du profil:",
              profileError,
            );
            loading.value = false;
            return { error: new Error(profileError.message) };
          }
        } catch (profileErr: any) {
          // Ignorer les erreurs d'abort
          if (
            profileErr?.name !== "AbortError" &&
            !profileErr?.message?.includes("abort")
          ) {
            console.error("Erreur création profil:", profileErr);
            loading.value = false;
            return { error: profileErr as Error };
          }
        }

        user.value = data.user;
        session.value = data.session;
        try {
          await fetchProfile();
        } catch (fetchErr: any) {
          // Ignorer les erreurs d'abort pour fetchProfile
          if (
            fetchErr?.name !== "AbortError" &&
            !fetchErr?.message?.includes("abort")
          ) {
            console.warn("fetchProfile error (non bloquant):", fetchErr);
          }
        }
      }

      loading.value = false;
      return { error: null };
    } catch (err: any) {
      loading.value = false;
      // Ignorer les erreurs d'abort
      if (err?.name === "AbortError" || err?.message?.includes("abort")) {
        return { error: null };
      }
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
    try {
      await fetchProfile();
    } catch (fetchErr: any) {
      // Ignorer les erreurs d'abort
      if (
        fetchErr?.name !== "AbortError" &&
        !fetchErr?.message?.includes("abort")
      ) {
        console.warn(
          "fetchProfile error après signIn (non bloquant):",
          fetchErr,
        );
      }
    }
    loading.value = false;

    return { error: null };
  };

  /**
   * Connexion avec Google OAuth
   */
  const signInWithGoogle = async (): Promise<{ error: Error | null }> => {
    if (!import.meta.client) {
      return { error: new Error("OAuth uniquement disponible côté client") };
    }

    const supabase = getSupabase();
    if (!supabase) {
      return { error: new Error("Supabase non disponible") };
    }

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      return { error: new Error(error.message) };
    }

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
   * Upload un avatar pour l'utilisateur
   * Stocke l'image dans Supabase Storage et met à jour le profil
   */
  const uploadAvatar = async (
    file: File,
  ): Promise<{ url: string | null; error: Error | null }> => {
    if (!user.value) {
      return { url: null, error: new Error("Utilisateur non connecté") };
    }

    const supabase = getSupabase();
    if (!supabase) {
      return { url: null, error: new Error("Supabase non disponible") };
    }

    // Valider le fichier
    const maxSize = 2 * 1024 * 1024; // 2MB
    if (file.size > maxSize) {
      return {
        url: null,
        error: new Error("L'image ne doit pas dépasser 2MB"),
      };
    }

    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!allowedTypes.includes(file.type)) {
      return {
        url: null,
        error: new Error("Format non supporté. Utilisez JPG, PNG, WebP ou GIF"),
      };
    }

    // Générer un nom de fichier unique
    const fileExt = file.name.split(".").pop();
    const fileName = `${user.value.id}-${Date.now()}.${fileExt}`;
    const filePath = `avatars/${fileName}`;

    try {
      // Supprimer l'ancien avatar s'il existe
      if (profile.value?.avatar_url) {
        const oldPath = profile.value.avatar_url.split("/").pop();
        if (oldPath) {
          await supabase.storage.from("avatars").remove([`avatars/${oldPath}`]);
        }
      }

      // Upload le nouveau fichier
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: true,
        });

      if (uploadError) {
        return { url: null, error: new Error(uploadError.message) };
      }

      // Obtenir l'URL publique
      const {
        data: { publicUrl },
      } = supabase.storage.from("avatars").getPublicUrl(filePath);

      // Mettre à jour le profil avec la nouvelle URL
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: publicUrl })
        .eq("id", user.value.id);

      if (updateError) {
        return { url: null, error: new Error(updateError.message) };
      }

      await fetchProfile();
      return { url: publicUrl, error: null };
    } catch (err: any) {
      return {
        url: null,
        error: new Error(err.message || "Erreur lors de l'upload"),
      };
    }
  };

  /**
   * S'assure qu'un profil existe pour l'utilisateur (utile pour OAuth)
   * Crée le profil s'il n'existe pas
   */
  const ensureProfile = async (): Promise<void> => {
    if (!user.value) return;

    const supabase = getSupabase();
    if (!supabase) return;

    try {
      // Vérifier si le profil existe déjà
      const { data: existingProfile, error: fetchError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.value.id)
        .maybeSingle();

      // Ignorer les erreurs d'abort
      if (fetchError && !fetchError.message?.includes("abort")) {
        console.warn("Erreur lors de la vérification du profil:", fetchError);
      }

      if (existingProfile) {
        profile.value = existingProfile;
        return;
      }

      // Créer le profil pour l'utilisateur OAuth
      const email = user.value.email || "";
      const metadata = user.value.user_metadata || {};
      const username =
        (metadata.name as string) ||
        (metadata.full_name as string) ||
        email.split("@")[0] ||
        "Utilisateur";

      const { data: newProfile, error } = await supabase
        .from("profiles")
        .insert({
          id: user.value.id,
          email: email,
          username: username,
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) {
        // Ignorer les erreurs d'abort et de duplicate (profil déjà créé)
        if (
          !error.message?.includes("abort") &&
          !error.code?.includes("23505")
        ) {
          console.error("Erreur lors de la création du profil:", error);
        }
        // Si c'est un duplicate, récupérer le profil existant
        if (error.code?.includes("23505")) {
          await fetchProfile();
        }
        return;
      }

      profile.value = newProfile;
    } catch (err: any) {
      // Ignorer les erreurs d'abort (navigation en cours)
      if (err?.name === "AbortError" || err?.message?.includes("abort")) {
        return;
      }
      console.error("Erreur inattendue lors de ensureProfile:", err);
    }
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
      const { data, error: sessionError } = await supabase.auth.getSession();

      // Ignorer les erreurs d'abort
      if (sessionError && !sessionError.message?.includes("abort")) {
        console.warn(
          "Erreur lors de la récupération de la session:",
          sessionError,
        );
      }

      if (data.session) {
        user.value = data.session.user;
        session.value = data.session;
        try {
          await fetchProfile();
        } catch (profileErr: any) {
          // Ignorer les erreurs d'abort pour le profil
          if (
            profileErr?.name !== "AbortError" &&
            !profileErr?.message?.includes("abort")
          ) {
            console.warn("Erreur fetchProfile (non bloquante):", profileErr);
          }
        }
      }

      supabase.auth.onAuthStateChange(
        async (_event: string, newSession: SimpleSession | null) => {
          user.value = newSession?.user || null;
          session.value = newSession;

          if (newSession?.user) {
            try {
              await fetchProfile();
            } catch (err: any) {
              // Ignorer les erreurs d'abort
              if (
                err?.name !== "AbortError" &&
                !err?.message?.includes("abort")
              ) {
                console.warn(
                  "Erreur fetchProfile dans onAuthStateChange:",
                  err,
                );
              }
            }
          } else {
            profile.value = null;
          }
        },
      );

      initialized.value = true;
    } catch (err: any) {
      // Ignorer les erreurs d'abort (causées par navigation)
      if (err?.name === "AbortError" || err?.message?.includes("abort")) {
        // Ne pas logger les erreurs d'abort - c'est normal lors de navigation rapide
        return;
      }
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
    signInWithGoogle,
    signOut,
    fetchProfile,
    updateProfile,
    uploadAvatar,
    initAuth,
    ensureProfile,
  } as AuthReturn;
};
