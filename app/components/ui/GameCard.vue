<script setup lang="ts">
/**
 * GameCard - Carte wrapper pour les mini-jeux
 * Fournit un style cohérent et des animations d'entrée.
 */
interface Props {
  title?: string;
  icon?: string;
  glowColor?: string;
}

const props = withDefaults(defineProps<Props>(), {
  title: "",
  icon: "🎮",
  glowColor: "#FF66C8",
});
</script>

<template>
  <div
    class="relative p-6 rounded-2xl bg-zinc-900/80 border border-zinc-800 backdrop-blur-sm transition-all duration-300 hover:border-zinc-700"
    :style="{ boxShadow: `0 0 40px -10px ${glowColor}30` }"
  >
    <!-- Header optionnel -->
    <div v-if="title" class="flex items-center gap-2 mb-4">
      <span class="text-xl">{{ icon }}</span>
      <h3 class="text-lg font-bricolage font-semibold text-white">
        {{ title }}
      </h3>
    </div>

    <!-- Contenu du jeu -->
    <slot />

    <!-- Effet de glow subtil au hover -->
    <div
      class="absolute inset-0 rounded-2xl opacity-0 hover:opacity-100 transition-opacity duration-500 pointer-events-none"
      :style="{
        background: `radial-gradient(circle at center, ${glowColor}10 0%, transparent 70%)`,
      }"
    />
  </div>
</template>
