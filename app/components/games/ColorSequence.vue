<script setup lang="ts">
/**
 * ColorSequence - Mini-jeu de mémorisation de séquences de couleurs
 * Le joueur doit reproduire une séquence de couleurs après l'avoir vue.
 * La difficulté augmente avec chaque niveau réussi.
 */
import { ref, computed, onUnmounted } from "vue";

const emit = defineEmits<{
  complete: [won: boolean, level: number, sequenceLength: number];
  interaction: [weight: number];
}>();

const COLORS = ["#FF66C8", "#6BFFFF", "#FFF746", "#BBFF42"];

// État du jeu
const sequence = ref<string[]>([]);
const playerSequence = ref<string[]>([]);
const level = ref(1);
const showingSequence = ref(false);
const activeColorIndex = ref(-1);
const message = ref("Clique sur JOUER pour commencer");
const gameActive = ref(false);

const generateSequence = () => {
  sequence.value = Array.from(
    { length: level.value + 2 },
    () => COLORS[Math.floor(Math.random() * COLORS.length)]!,
  );
};

const startGame = async () => {
  if (showingSequence.value) return;

  playerSequence.value = [];
  generateSequence();
  showingSequence.value = true;
  gameActive.value = true;
  message.value = "👀 Mémorise la séquence...";

  // Montrer la séquence
  for (let i = 0; i < sequence.value.length; i++) {
    await new Promise((r) => setTimeout(r, 700));
    activeColorIndex.value = COLORS.indexOf(sequence.value[i] || "");
    await new Promise((r) => setTimeout(r, 300));
    activeColorIndex.value = -1;
  }

  showingSequence.value = false;
  message.value = "🎮 À toi de reproduire !";
};

const handleColorClick = (color: string, index: number) => {
  if (showingSequence.value || !gameActive.value) return;
  if (sequence.value.length === 0) {
    message.value = "Clique sur JOUER d'abord !";
    return;
  }

  playerSequence.value.push(color);
  emit("interaction", 2);

  const idx = playerSequence.value.length - 1;

  // Vérifie si la couleur est correcte
  if (playerSequence.value[idx] !== sequence.value[idx]) {
    message.value = "❌ Raté ! Clique JOUER pour réessayer";
    emit("complete", false, level.value, sequence.value.length);
    playerSequence.value = [];
    sequence.value = [];
    level.value = Math.max(1, level.value - 1);
    gameActive.value = false;
    return;
  }

  // Vérifie si la séquence est complète
  if (playerSequence.value.length === sequence.value.length) {
    // INDICE SECRET: Affiche "violet" brièvement au niveau 3+
    if (level.value >= 3) {
      message.value = `✅ violet... Niveau ${level.value} réussi !`;
      setTimeout(() => {
        message.value = `✅ Bravo ! Niveau ${level.value} réussi !`;
      }, 800);
    } else {
      message.value = `✅ Bravo ! Niveau ${level.value} réussi !`;
    }
    emit("complete", true, level.value, sequence.value.length);
    level.value++;
    playerSequence.value = [];
    sequence.value = [];
    gameActive.value = false;
  } else {
    message.value = `🎮 Continue... (${playerSequence.value.length}/${sequence.value.length})`;
  }
};

// Animation de flash pour le bouton actif
const getButtonStyle = (index: number, color: string) => {
  const isActive = activeColorIndex.value === index;
  return {
    backgroundColor: color,
    transform: isActive ? "scale(1.2)" : "scale(1)",
    boxShadow: isActive ? `0 0 30px ${color}` : "none",
    opacity: showingSequence.value && !isActive ? 0.3 : 1,
  };
};
</script>

<template>
  <div
    class="flex flex-col gap-4 p-6 rounded-2xl bg-zinc-900/50 border border-zinc-800"
  >
    <div class="flex items-center justify-between">
      <h3 class="text-lg font-bricolage text-white">🎨 Séquence de Couleurs</h3>
      <span class="text-sm text-zinc-400 font-mono">Niveau {{ level }}</span>
    </div>

    <!-- Message d'état -->
    <p class="text-center text-sm text-zinc-300 font-bricolage">
      {{ message }}
    </p>

    <!-- Grille de couleurs -->
    <div class="grid grid-cols-2 gap-3">
      <button
        v-for="(color, index) in COLORS"
        :key="color"
        class="h-20 rounded-xl border-2 border-white/20 transition-all duration-200 hover:scale-105 active:scale-95"
        :style="getButtonStyle(index, color)"
        :disabled="showingSequence"
        @click="handleColorClick(color, index)"
      />
    </div>

    <!-- Progression -->
    <div
      v-if="gameActive && !showingSequence"
      class="flex justify-center gap-1"
    >
      <span
        v-for="(_, i) in sequence"
        :key="i"
        class="w-2 h-2 rounded-full transition-colors"
        :class="i < playerSequence.length ? 'bg-MyGreen' : 'bg-zinc-700'"
      />
    </div>

    <!-- Bouton de démarrage -->
    <button
      v-if="!showingSequence"
      class="py-3 rounded-xl bg-MyYellow text-black font-bricolage font-semibold hover:bg-MyYellow/80 transition-colors"
      @click="startGame"
    >
      ▶️ {{ gameActive ? "En cours..." : "Jouer" }}
    </button>
  </div>
</template>
