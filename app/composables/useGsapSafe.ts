/**
 * Composable pour utiliser GSAP avec typage correct
 * Resout les problemes de typage TypeScript
 */
export function useGsapSafe() {
  const nuxtApp = useNuxtApp();

  // Typage any pour eviter les erreurs TS
  const gsap = nuxtApp.$gsap as any;
  const ScrollTrigger = nuxtApp.$ScrollTrigger as any;
  const Draggable = nuxtApp.$Draggable as any;

  // Verifier si GSAP est disponible (client-side only)
  const isAvailable = computed(() => {
    return typeof window !== "undefined" && gsap && ScrollTrigger;
  });

  return {
    gsap,
    ScrollTrigger,
    Draggable,
    isAvailable,
  };
}
