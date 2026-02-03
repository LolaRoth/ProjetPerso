/**
 * Middleware pour les pages "invité"
 * Redirige les utilisateurs connectés vers le profil
 */
export default defineNuxtRouteMiddleware(async () => {
  // Seulement côté client
  if (import.meta.server) return;

  try {
    const { isAuthenticated, initialized, loading, initAuth } = useAuth();

    // Initialiser l'auth si pas encore fait
    if (!initialized.value) {
      try {
        await initAuth();
      } catch (initError: unknown) {
        // Ignorer les erreurs d'abort lors de l'initialisation
        if (
          initError instanceof Error &&
          (initError.name === "AbortError" ||
            initError.message?.includes("abort"))
        ) {
          return;
        }
        throw initError;
      }
    }

    // Attendre que le chargement soit terminé
    if (loading.value) {
      await new Promise<void>((resolve) => {
        const unwatch = watch(
          loading,
          (isLoading) => {
            if (!isLoading) {
              unwatch();
              resolve();
            }
          },
          { immediate: true },
        );
        // Timeout de sécurité
        setTimeout(() => {
          unwatch();
          resolve();
        }, 3000);
      });
    }

    // Si déjà authentifié, rediriger vers la page de bienvenue
    if (isAuthenticated.value) {
      return navigateTo("/welcome");
    }
  } catch (err: unknown) {
    // Ignorer silencieusement les erreurs d'abort (navigation interrompue)
    if (
      err instanceof Error &&
      (err.name === "AbortError" || err.message?.includes("abort"))
    ) {
      return;
    }
    // Log autres erreurs mais ne pas bloquer
    console.warn("[guest middleware] Erreur:", err);
  }
});
