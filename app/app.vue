<template>
  <div
    class="min-h-screen bg-MyBlack text-white antialiased"
    :style="degradationStyles"
    :class="mainContainerClass"
  >
    <Transition name="header-fade">
      <LayoutAuthHeader v-if="!hideHeader" />
    </Transition>
    <NuxtRouteAnnouncer />
    <div
      :class="hideHeader ? '' : 'pt-14'"
      class="transition-[padding] duration-700"
    >
      <NuxtPage />
    </div>

    <!-- Overlay de dégradation (effets visuels globaux) - visible sur toutes les pages -->
    <EffectsDegradationOverlay v-if="showDegradation" />
  </div>
</template>

<script setup lang="ts">
const route = useRoute();
const {
  phase,
  cssVariables,
  level,
  isActive,
  startTimeTracking,
  stopTimeTracking,
} = useDegradation();

// Hide header only on fin page (not on home page)
const hideHeader = computed(() => {
  // Cacher sur la page fin
  if (route.path === "/fin") return true;
  // Cacher sur la page principale quand on dépasse la phase "glitching" (> 30%)
  if (route.path === "/" && level.value > 0.3) return true;
  return false;
});

// Afficher la dégradation sur la page principale
const showDegradation = computed(() => {
  return route.path === "/";
});

// Démarrer le tracking sur la page principale
watch(
  () => route.path,
  (path) => {
    if (path === "/" && !isActive.value) {
      startTimeTracking();
    } else if (path !== "/" && isActive.value) {
      // Optionnel: arrêter le tracking quand on quitte la page principale
      // stopTimeTracking();
    }
  },
  { immediate: true },
);

// Classe du conteneur principal basée sur la phase
const mainContainerClass = computed(() => {
  if (route.path !== "/") return "";

  const classes = ["degradation-container"];

  if (level.value > 0.1) classes.push("degrading");
  if (level.value > 0.3) classes.push("degrading-medium");
  if (level.value > 0.5) classes.push("degrading-high");
  if (level.value > 0.75) classes.push("degrading-critical");

  return classes.join(" ");
});

// Appliquer les CSS variables et l'attribut data-phase au body
const degradationStyles = computed(() => cssVariables.value);

// Mettre à jour l'attribut data-phase sur le body
watch(
  phase,
  (newPhase) => {
    if (import.meta.client) {
      document.body.setAttribute("data-phase", newPhase);
      document.body.setAttribute(
        "data-degradation-level",
        String(Math.round(level.value * 100)),
      );
    }
  },
  { immediate: true },
);

// Aussi mettre à jour le niveau de dégradation
watch(level, (newLevel) => {
  if (import.meta.client) {
    document.body.setAttribute(
      "data-degradation-level",
      String(Math.round(newLevel * 100)),
    );
  }
});

// Nettoyer au démontage
onUnmounted(() => {
  if (import.meta.client) {
    document.body.removeAttribute("data-phase");
    document.body.removeAttribute("data-degradation-level");
  }
});
</script>
<style scoped>
/* Animation de disparition du header */
.header-fade-enter-active,
.header-fade-leave-active {
  transition:
    opacity 0.7s ease,
    transform 0.7s ease;
}

.header-fade-enter-from,
.header-fade-leave-to {
  opacity: 0;
  transform: translateY(-100%);
}
</style>
