/**
 * Store global de degradation
 * Gere l'etat de degradation de l'experience visuelle
 */

interface DegradationState {
  level: number;
  cycles: number;
  baseLevel: number;
  scrollProgress: number;
  timeSpent: number;
  interactions: number;
  phase: "pristine" | "stable" | "unstable" | "chaotic" | "broken";
  isTransitioning: boolean;
}

// State global reactif
const state = reactive<DegradationState>({
  level: 0,
  cycles: 0,
  baseLevel: 0,
  scrollProgress: 0,
  timeSpent: 0,
  interactions: 0,
  phase: "pristine",
  isTransitioning: false,
});

let timeInterval: ReturnType<typeof setInterval> | null = null;

// Calcul de la phase
const getPhase = (level: number): DegradationState["phase"] => {
  if (level < 0.1) return "pristine";
  if (level < 0.25) return "stable";
  if (level < 0.5) return "unstable";
  if (level < 0.75) return "chaotic";
  return "broken";
};

export function useDegradation() {
  // Calcul du niveau de degradation
  const calculateLevel = () => {
    const scrollFactor = state.scrollProgress * 0.6;
    const timeFactor = Math.min(state.timeSpent / 300, 0.2);
    const interactionFactor = Math.min(state.interactions / 50, 0.15);
    const cycleBonus = state.baseLevel;

    state.level = Math.min(
      cycleBonus + scrollFactor + timeFactor + interactionFactor,
      1,
    );
    state.phase = getPhase(state.level);
  };

  // Mise a jour du scroll
  const updateScroll = (progress: number) => {
    state.scrollProgress = progress;
    calculateLevel();
  };

  // Enregistrer une interaction
  const addInteraction = (amount: number = 1) => {
    state.interactions += amount;
    calculateLevel();
  };

  // Completer un cycle
  const completeCycle = () => {
    state.isTransitioning = true;
    state.cycles++;
    state.baseLevel = Math.min(state.baseLevel + 0.05, 0.3);
    state.scrollProgress = 0;

    setTimeout(() => {
      state.isTransitioning = false;
    }, 1000);

    calculateLevel();
  };

  // Demarrer le tracking du temps
  const startTimeTracking = () => {
    if (timeInterval) return;
    timeInterval = setInterval(() => {
      state.timeSpent++;
      calculateLevel();
    }, 1000);
  };

  // Arreter le tracking du temps
  const stopTimeTracking = () => {
    if (timeInterval) {
      clearInterval(timeInterval);
      timeInterval = null;
    }
  };

  // Reset complet
  const reset = () => {
    Object.assign(state, {
      level: 0,
      cycles: 0,
      baseLevel: 0,
      scrollProgress: 0,
      timeSpent: 0,
      interactions: 0,
      phase: "pristine",
      isTransitioning: false,
    });
  };

  // Getters reactifs
  const level = computed(() => state.level);
  const cycles = computed(() => state.cycles);
  const scrollProgress = computed(() => state.scrollProgress);
  const phase = computed(() => state.phase);
  const isTransitioning = computed(() => state.isTransitioning);

  // Seuils utiles
  const thresholds = {
    subtle: computed(() => state.level >= 0.1),
    noticeable: computed(() => state.level >= 0.25),
    significant: computed(() => state.level >= 0.5),
    severe: computed(() => state.level >= 0.75),
  };

  // Facteurs pour les effets visuels
  const factors = computed(() => ({
    shake: Math.min(state.level * 10, 8),
    blur: Math.min(state.level * 6, 5),
    rotation: Math.min(state.level * 20, 15),
    drift: Math.min(state.level * 25, 20),
    opacity: Math.max(1 - state.level * 0.3, 0.6),
    scale: Math.max(1 - state.level * 0.1, 0.85),
    hueShift: state.level * 45,
  }));

  return {
    // State
    level,
    cycles,
    scrollProgress,
    phase,
    isTransitioning,
    thresholds,
    factors,
    // Actions
    updateScroll,
    addInteraction,
    completeCycle,
    startTimeTracking,
    stopTimeTracking,
    reset,
  };
}
