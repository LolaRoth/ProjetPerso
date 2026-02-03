/**
 * Store global de degradation
 * Gere l'etat de degradation de l'experience visuelle
 * Plus l'utilisateur scroll en boucle, plus le site se dégrade
 */

interface DegradationState {
  level: number;
  cycles: number;
  baseLevel: number;
  scrollProgress: number;
  lastScrollProgress: number;
  scrollDirection: "up" | "down" | "none";
  totalScrollDistance: number;
  scrollLoops: number;
  timeSpent: number;
  interactions: number;
  phase: "pristine" | "glitching" | "unstable" | "chaotic" | "broken";
  isTransitioning: boolean;
  transitionFrom: DegradationState["phase"] | null;
  transitionTo: DegradationState["phase"] | null;
  glitchIntensity: number;
  rotationChaos: number;
  colorShift: number;
  textCorruption: number;
  // Pour affichage debug/stats
  isActive: boolean;
  lastDamageTime: number;
}

// State global reactif - singleton partagé entre toutes les instances
const state = reactive<DegradationState>({
  level: 0,
  cycles: 0,
  baseLevel: 0,
  scrollProgress: 0,
  lastScrollProgress: 0,
  scrollDirection: "none",
  totalScrollDistance: 0,
  scrollLoops: 0,
  timeSpent: 0,
  interactions: 0,
  phase: "pristine",
  isTransitioning: false,
  transitionFrom: null,
  transitionTo: null,
  glitchIntensity: 0,
  rotationChaos: 0,
  colorShift: 0,
  textCorruption: 0,
  isActive: false,
  lastDamageTime: 0,
});

// Variables pour la détection de boucles
let lastDirection: "up" | "down" | "none" = "none";
let directionChanges = 0;
let lastScrollY = 0;
let scrollSamples: number[] = [];

let timeInterval: ReturnType<typeof setInterval> | null = null;
let glitchInterval: ReturnType<typeof setInterval> | null = null;
let nativeScrollHandler: (() => void) | null = null;

// Messages de transition par phase
const phaseMessages: Record<DegradationState["phase"], string[]> = {
  pristine: [],
  glitching: [
    "Quelque chose cloche...",
    "Tu continues quand même ?",
    "Le scroll te possède.",
  ],
  unstable: [
    "Tu ne peux plus t'arrêter.",
    "Encore un peu...",
    "C'est hypnotique, non ?",
  ],
  chaotic: [
    "STOP. Regarde-toi.",
    "Combien de temps déjà ?",
    "Le chaos t'appelle.",
  ],
  broken: [
    "Tu as tout détruit.",
    "Voilà ce que fait le scroll infini.",
    "Bienvenue dans le néant.",
  ],
};

// Calcul de la phase basé sur le niveau
const getPhase = (level: number): DegradationState["phase"] => {
  if (level < 0.12) return "pristine";
  if (level < 0.3) return "glitching";
  if (level < 0.5) return "unstable";
  if (level < 0.75) return "chaotic";
  return "broken";
};

export function useDegradation() {
  // Calcul du niveau de degradation - très progressif pour laisser le temps de jouer
  const calculateLevel = () => {
    // Les boucles de scroll sont le facteur principal (50%)
    const scrollLoopFactor = Math.min(state.scrollLoops / 40, 0.5); // 40 boucles = 50%

    // Distance totale scrollée (20%)
    const distanceFactor = Math.min(state.totalScrollDistance / 150000, 0.2);

    // Temps passé (20%) - très lent
    const timeFactor = Math.min(state.timeSpent / 1800, 0.2); // 30 min = 20%

    // Interactions (10%)
    const interactionFactor = Math.min(state.interactions / 300, 0.1);

    const newLevel = Math.min(
      scrollLoopFactor + distanceFactor + timeFactor + interactionFactor,
      1,
    );

    const oldPhase = state.phase;
    state.level = newLevel;
    const newPhase = getPhase(newLevel);

    // Déclencher une transition si la phase change
    if (newPhase !== oldPhase) {
      triggerPhaseTransition(oldPhase, newPhase);
    }

    state.phase = newPhase;
    updateSpecialEffects();
  };

  // Mise à jour des effets spéciaux selon le niveau - transitions fluides
  const updateSpecialEffects = () => {
    const l = state.level;

    // Glitch: commence plus tard, progression très douce avec easing
    const glitchTarget = l > 0.15 ? Math.pow((l - 0.15) / 0.85, 2) * 0.5 : 0;
    state.glitchIntensity =
      state.glitchIntensity + (glitchTarget - state.glitchIntensity) * 0.1;

    // Rotation chaos: progression douce
    const rotationTarget = l > 0.25 ? (l - 0.25) * 20 : 0; // Max 15 degrés
    state.rotationChaos =
      state.rotationChaos + (rotationTarget - state.rotationChaos) * 0.1;

    // Décalage de couleur - très progressif et subtil
    const colorTarget = l * 25; // Max 25 degrés de hue shift (réduit de 40)
    state.colorShift =
      state.colorShift + (colorTarget - state.colorShift) * 0.05;

    // Corruption du texte - très progressive
    const corruptionTarget = l > 0.5 ? (l - 0.5) * 0.4 : 0; // Max 20%
    state.textCorruption =
      state.textCorruption + (corruptionTarget - state.textCorruption) * 0.08;
  };

  // Déclencher une transition de phase avec animation fluide
  const triggerPhaseTransition = (
    from: DegradationState["phase"],
    to: DegradationState["phase"],
  ) => {
    state.isTransitioning = true;
    state.transitionFrom = from;
    state.transitionTo = to;

    // Appliquer un effet de dommage visuel (plus doux)
    state.lastDamageTime = Date.now();

    // Durée de transition plus longue pour fluidité
    setTimeout(() => {
      state.isTransitioning = false;
      state.transitionFrom = null;
      state.transitionTo = null;
    }, 3500); // Augmenté de 2500 à 3500ms pour plus de fluidité
  };

  // Mise a jour du scroll avec détection de boucles améliorée
  const updateScroll = (progress: number) => {
    const delta = progress - state.lastScrollProgress;
    const absDelta = Math.abs(delta);

    // Ignorer les micro-mouvements
    if (absDelta < 0.002) return;

    // Accumuler la distance scrollée
    state.totalScrollDistance += absDelta * 1000;

    // Détecter la direction
    const newDirection: "up" | "down" = delta > 0 ? "down" : "up";

    // Détecter un changement de direction significatif
    if (lastDirection !== "none" && newDirection !== lastDirection) {
      directionChanges++;

      // 2 changements de direction = 1 boucle complète
      if (directionChanges >= 2) {
        state.scrollLoops++;
        directionChanges = 0;
        triggerScrollDamage();
      }
    }

    lastDirection = newDirection;
    state.scrollDirection = newDirection;
    state.lastScrollProgress = state.scrollProgress;
    state.scrollProgress = progress;

    calculateLevel();
  };

  // Tracking natif du scroll (plus réactif que ScrollTrigger seul)
  const startNativeScrollTracking = () => {
    if (typeof window === "undefined" || nativeScrollHandler) return;

    nativeScrollHandler = () => {
      const scrollY = window.scrollY;
      const maxScroll =
        document.documentElement.scrollHeight - window.innerHeight;

      if (maxScroll <= 0) return;

      const progress = scrollY / maxScroll;
      const delta = scrollY - lastScrollY;

      // Détecter si on est en bas de page et qu'on continue de scroller vers le bas
      if (progress >= 0.98 && delta > 0) {
        // Scroll vers le haut de la page (boucle infinie)
        state.scrollLoops++;
        triggerScrollDamage();
        window.scrollTo({ top: 0, behavior: "smooth" });
        lastScrollY = 0;
        lastDirection = "none";
        directionChanges = 0;
        calculateLevel();
        return;
      }

      // Accumuler la distance en pixels (réduit)
      state.totalScrollDistance += Math.abs(delta) * 0.05;

      // Détecter les changements de direction
      if (Math.abs(delta) > 10) {
        const newDirection: "up" | "down" = delta > 0 ? "down" : "up";

        if (lastDirection !== "none" && newDirection !== lastDirection) {
          directionChanges++;

          // 3 changements de direction = 1 boucle (plus difficile)
          if (directionChanges >= 3) {
            state.scrollLoops++;
            directionChanges = 0;
            triggerScrollDamage();
          }
        }

        lastDirection = newDirection;
        state.scrollDirection = newDirection;
      }

      lastScrollY = scrollY;
      state.scrollProgress = progress;

      calculateLevel();
    };

    window.addEventListener("scroll", nativeScrollHandler, { passive: true });
  };

  const stopNativeScrollTracking = () => {
    if (nativeScrollHandler && typeof window !== "undefined") {
      window.removeEventListener("scroll", nativeScrollHandler);
      nativeScrollHandler = null;
    }
  };

  // Effet visuel de dommage lors d'une boucle - plus subtil
  const triggerScrollDamage = () => {
    state.lastDamageTime = Date.now();

    // Flash visuel + augmentation temporaire du glitch (réduit)
    const originalGlitch = state.glitchIntensity;
    state.glitchIntensity = Math.min(originalGlitch + 0.15, 0.7);

    setTimeout(() => {
      state.glitchIntensity = Math.max(
        originalGlitch + 0.1,
        state.glitchIntensity * 0.8,
      );
    }, 400);
  };

  // Ajouter du dommage manuellement (pour tests ou événements)
  const addDamage = (amount: number) => {
    state.scrollLoops += amount;
    triggerScrollDamage();
    calculateLevel();
  };

  // Enregistrer une interaction
  const addInteraction = (amount: number = 1) => {
    state.interactions += amount;
    calculateLevel();
  };

  // Completer un cycle (fin de page)
  const completeCycle = () => {
    state.cycles++;
    calculateLevel();
  };

  // Demarrer le tracking du temps
  const startTimeTracking = () => {
    // Ne pas exécuter côté serveur
    if (import.meta.server) return;
    if (timeInterval) return;

    state.isActive = true;

    // Démarrer aussi le tracking natif du scroll
    startNativeScrollTracking();

    timeInterval = setInterval(() => {
      state.timeSpent++;
      calculateLevel();
    }, 1000);

    // Effets de glitch aléatoires plus fréquents
    glitchInterval = setInterval(() => {
      if (state.level > 0.1 && Math.random() < state.level * 0.4) {
        const originalGlitch = state.glitchIntensity;
        state.glitchIntensity = Math.min(originalGlitch + 0.25, 1);
        setTimeout(
          () => {
            state.glitchIntensity = Math.max(
              originalGlitch,
              state.glitchIntensity * 0.7,
            );
          },
          80 + Math.random() * 150,
        );
      }
    }, 400);
  };

  // Arreter le tracking
  const stopTimeTracking = () => {
    state.isActive = false;
    stopNativeScrollTracking();

    if (timeInterval) {
      clearInterval(timeInterval);
      timeInterval = null;
    }
    if (glitchInterval) {
      clearInterval(glitchInterval);
      glitchInterval = null;
    }
  };

  // Reset complet
  const reset = () => {
    lastDirection = "none";
    directionChanges = 0;
    lastScrollY = 0;
    scrollSamples = [];

    Object.assign(state, {
      level: 0,
      cycles: 0,
      baseLevel: 0,
      scrollProgress: 0,
      lastScrollProgress: 0,
      scrollDirection: "none",
      totalScrollDistance: 0,
      scrollLoops: 0,
      timeSpent: 0,
      interactions: 0,
      phase: "pristine",
      isTransitioning: false,
      transitionFrom: null,
      transitionTo: null,
      glitchIntensity: 0,
      rotationChaos: 0,
      colorShift: 0,
      textCorruption: 0,
      isActive: false,
      lastDamageTime: 0,
    });
  };

  // Obtenir un message de transition aléatoire
  const getTransitionMessage = () => {
    if (!state.transitionTo) return null;
    const messages = phaseMessages[state.transitionTo];
    if (!messages.length) return null;
    return messages[Math.floor(Math.random() * messages.length)];
  };

  // Getters reactifs
  const level = computed(() => state.level);
  const cycles = computed(() => state.cycles);
  const scrollLoops = computed(() => state.scrollLoops);
  const scrollProgress = computed(() => state.scrollProgress);
  const totalScrollDistance = computed(() => state.totalScrollDistance);
  const phase = computed(() => state.phase);
  const isTransitioning = computed(() => state.isTransitioning);
  const transitionMessage = computed(() => getTransitionMessage());
  const timeSpent = computed(() => state.timeSpent);
  const isActive = computed(() => state.isActive);
  const lastDamageTime = computed(() => state.lastDamageTime);

  // Seuils utiles - ajustés pour progression plus lente
  const thresholds = {
    subtle: computed(() => state.level >= 0.1),
    noticeable: computed(() => state.level >= 0.25),
    significant: computed(() => state.level >= 0.5),
    severe: computed(() => state.level >= 0.75),
  };

  // Facteurs pour les effets visuels (utilisables dans les composants) - allégés
  const factors = computed(() => ({
    // Effets de base - réduits
    shake: Math.min(state.level * 8, 6),
    blur: Math.min(state.level * 4, 3),
    rotation: state.rotationChaos * 0.5,
    drift: Math.min(state.level * 15, 10),
    opacity: Math.max(1 - state.level * 0.3, 0.6),
    scale: Math.max(1 - state.level * 0.1, 0.85),
    hueShift: state.colorShift,

    // Effets réduits
    glitch: state.glitchIntensity,
    textCorruption: state.textCorruption,
    skew: Math.min(state.level * 6, 4),
    contrast: 1 + state.level * 0.3,
    saturate: 1 + state.level * 0.5,
    invert: state.level > 0.7 ? (state.level - 0.7) * 0.2 : 0,

    // Effets additionnels allégés
    noise: Math.min(state.level * 0.2, 0.1),
    scanlines: state.level > 0.2 ? (state.level - 0.2) * 0.2 : 0,
    chromatic: state.glitchIntensity * 4,
  }));

  // CSS variables à appliquer au body - plus complètes
  const cssVariables = computed(() => ({
    "--degradation-level": state.level,
    "--degradation-percent": `${Math.round(state.level * 100)}%`,
    "--degradation-shake": `${factors.value.shake}px`,
    "--degradation-blur": `${factors.value.blur}px`,
    "--degradation-rotation": `${factors.value.rotation}deg`,
    "--degradation-hue": `${factors.value.hueShift}deg`,
    "--degradation-glitch": state.glitchIntensity,
    "--degradation-skew": `${factors.value.skew}deg`,
    "--degradation-chromatic": `${factors.value.chromatic}px`,
    "--degradation-noise": factors.value.noise,
    "--degradation-scanlines": factors.value.scanlines,
    "--degradation-contrast": factors.value.contrast,
    "--degradation-saturate": factors.value.saturate,
  }));

  return {
    // State
    level,
    cycles,
    scrollLoops,
    scrollProgress,
    totalScrollDistance,
    phase,
    isTransitioning,
    transitionMessage,
    timeSpent,
    isActive,
    lastDamageTime,
    thresholds,
    factors,
    cssVariables,
    // Actions
    updateScroll,
    addInteraction,
    addDamage,
    completeCycle,
    startTimeTracking,
    stopTimeTracking,
    reset,
  };
}
