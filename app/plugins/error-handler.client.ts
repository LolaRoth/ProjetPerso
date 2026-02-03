/**
 * Plugin pour gérer les erreurs non capturées
 * Filtre les erreurs d'abort qui sont normales lors des navigations
 */
export default defineNuxtPlugin(() => {
  if (!import.meta.client) return;

  // Gestionnaire pour les rejections de promesses non gérées
  const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
    const error = event.reason;

    // Ignorer silencieusement les AbortError (navigations interrompues)
    if (
      error?.name === "AbortError" ||
      error?.message?.includes("abort") ||
      error?.message?.includes("The operation was aborted")
    ) {
      event.preventDefault();
      return;
    }

    // Ignorer les erreurs de navigation Nuxt
    if (
      error?.message?.includes("Navigation cancelled") ||
      error?.message?.includes("Navigation aborted")
    ) {
      event.preventDefault();
      return;
    }
  };

  // Gestionnaire pour les erreurs non capturées
  const handleError = (event: ErrorEvent) => {
    const error = event.error;

    // Ignorer les AbortError
    if (
      error?.name === "AbortError" ||
      error?.message?.includes("abort") ||
      error?.message?.includes("The operation was aborted")
    ) {
      event.preventDefault();
      return;
    }
  };

  // Ajouter les gestionnaires
  window.addEventListener("unhandledrejection", handleUnhandledRejection);
  window.addEventListener("error", handleError);

  // Cleanup lors du démontage (pas vraiment nécessaire pour un SPA mais bonne pratique)
  const nuxtApp = useNuxtApp();
  nuxtApp.hook("app:beforeMount", () => {
    // Les handlers sont déjà ajoutés
  });
});
