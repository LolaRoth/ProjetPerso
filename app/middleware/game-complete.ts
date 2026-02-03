/**
 * Middleware de protection de la page de fin
 * Empêche l'accès à /fin si le jeu n'a pas été terminé (bouton secret non trouvé)
 */
export default defineNuxtRouteMiddleware(async (to) => {
  // Seulement côté client
  if (import.meta.server) return;

  // Vérifier si le jeu a été complété via localStorage
  try {
    const gameCompleted = localStorage.getItem("gameCompleted");
    const chaosTimeSpent = localStorage.getItem("chaosTimeSpent");

    // Si pas de marqueur de complétion, rediriger vers la page principale
    if (!gameCompleted || gameCompleted !== "true") {
      console.log("Accès à /fin bloqué: jeu non terminé");
      return navigateTo("/");
    }

    // Vérification supplémentaire: le temps passé doit exister
    if (!chaosTimeSpent) {
      console.log("Accès à /fin bloqué: pas de temps enregistré");
      return navigateTo("/");
    }
  } catch (e) {
    // En cas d'erreur localStorage, bloquer l'accès
    console.error("Erreur vérification game-complete:", e);
    return navigateTo("/");
  }
});
