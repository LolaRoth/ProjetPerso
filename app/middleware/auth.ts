/**
 * Middleware d'authentification
 * Protège les routes nécessitant une connexion
 */
export default defineNuxtRouteMiddleware(async () => {
  // Seulement côté client
  if (import.meta.server) return;

  const { isAuthenticated, initialized, loading, initAuth } = useAuth();

  // Initialiser l'auth si pas encore fait
  if (!initialized.value) {
    await initAuth();
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

  // Si non authentifié, rediriger vers login
  if (!isAuthenticated.value) {
    return navigateTo("/login");
  }
});
