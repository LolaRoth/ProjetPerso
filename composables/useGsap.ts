import { gsap } from "gsap";
import type { Ref } from "vue";

export function useGsap() {
  const { $gsap } = useNuxtApp();

  // Animation de fade in
  const fadeIn = (
    element: Ref<HTMLElement | null> | HTMLElement,
    duration = 0.5,
    delay = 0,
  ) => {
    const el = "value" in element ? element.value : element;
    if (!el) return;

    gsap.fromTo(
      el,
      { opacity: 0 },
      { opacity: 1, duration, delay, ease: "power2.out" },
    );
  };

  // Animation de slide in depuis le bas
  const slideInUp = (
    element: Ref<HTMLElement | null> | HTMLElement,
    duration = 0.5,
    delay = 0,
  ) => {
    const el = "value" in element ? element.value : element;
    if (!el) return;

    gsap.fromTo(
      el,
      { opacity: 0, y: 50 },
      { opacity: 1, y: 0, duration, delay, ease: "power2.out" },
    );
  };

  // Animation de scale
  const scaleIn = (
    element: Ref<HTMLElement | null> | HTMLElement,
    duration = 0.5,
    delay = 0,
  ) => {
    const el = "value" in element ? element.value : element;
    if (!el) return;

    gsap.fromTo(
      el,
      { opacity: 0, scale: 0.8 },
      { opacity: 1, scale: 1, duration, delay, ease: "back.out(1.7)" },
    );
  };

  return {
    gsap: $gsap || gsap,
    fadeIn,
    slideInUp,
    scaleIn,
  };
}
