/**
 * Middleware pour les pages "invité"
 * Redirige les utilisateurs connectés vers le profil
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

  // Si déjà authentifié, rediriger vers la page de bienvenue
  if (isAuthenticated.value) {
    return navigateTo("/welcome");
  }
});
