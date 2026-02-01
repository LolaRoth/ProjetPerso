<script setup lang="ts">
/**
 * CatchGame - Jeu d'attrape-étoiles tombantes
 * Le joueur doit cliquer sur les étoiles avant qu'elles ne tombent.
 * Système de combo et temps limité.
 */
import { ref, reactive, onUnmounted } from "vue";

const emit = defineEmits<{
  complete: [score: number, maxCombo: number];
  interaction: [weight: number];
}>();

interface FallingStar {
  id: number;
  x: number;
  y: number;
  speed: number;
  size: number;
  color: string;
  caught: boolean;
}

const COLORS = ["#FF66C8", "#6BFFFF", "#FFF746", "#BBFF42", "#FF8855"];

const game = reactive({
  active: false,
  score: 0,
  missed: 0,
  timeLeft: 20,
  bestScore: 0,
  combo: 0,
  maxCombo: 0,
});

const stars = ref<FallingStar[]>([]);
let starId = 0;
let timerInterval: ReturnType<typeof setInterval> | null = null;
let spawnInterval: ReturnType<typeof setInterval> | null = null;
let animationId: number | null = null;

const startGame = () => {
  if (game.active) return;

  game.active = true;
  game.score = 0;
  game.missed = 0;
  game.timeLeft = 20;
  game.combo = 0;
  game.maxCombo = 0;
  stars.value = [];

  // Timer
  timerInterval = setInterval(() => {
    game.timeLeft--;
    if (game.timeLeft <= 0) endGame();
  }, 1000);

  // Spawn des étoiles
  spawnInterval = setInterval(() => spawnStar(), 600);

  // Animation de chute
  const animate = () => {
    if (!game.active) return;

    stars.value = stars.value
      .map((star) => {
        if (star.caught) return star;
        return { ...star, y: star.y + star.speed };
      })
      .filter((star) => {
        if (star.y > 100 && !star.caught) {
          game.missed++;
          game.combo = 0;
          return false;
        }
        return star.y <= 110 || star.caught;
      });

    if (game.active) {
      animationId = requestAnimationFrame(animate);
    }
  };

  animationId = requestAnimationFrame(animate);
};

const spawnStar = () => {
  if (!game.active) return;

  const star: FallingStar = {
    id: starId++,
    x: 10 + Math.random() * 80,
    y: -5,
    speed: 0.8 + Math.random() * 1.2 + (20 - game.timeLeft) * 0.05,
    size: 30 + Math.random() * 20,
    color: COLORS[Math.floor(Math.random() * COLORS.length)] || "#FFF746",
    caught: false,
  };

  stars.value.push(star);
};

const catchStar = (id: number) => {
  const star = stars.value.find((s) => s.id === id);
  if (!star || star.caught) return;

  star.caught = true;
  game.combo++;
  if (game.combo > game.maxCombo) game.maxCombo = game.combo;

  // Score avec bonus combo
  const comboBonus = Math.floor(game.combo / 3);
  game.score += 10 + comboBonus * 5;
  emit("interaction", 3);

  // Retirer après animation
  setTimeout(() => {
    stars.value = stars.value.filter((s) => s.id !== id);
  }, 200);
};

const endGame = () => {
  game.active = false;

  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
  if (spawnInterval) {
    clearInterval(spawnInterval);
    spawnInterval = null;
  }
  if (animationId) {
    cancelAnimationFrame(animationId);
    animationId = null;
  }

  if (game.score > game.bestScore) game.bestScore = game.score;

  emit("complete", game.score, game.maxCombo);
  stars.value = [];
};

onUnmounted(() => {
  if (timerInterval) clearInterval(timerInterval);
  if (spawnInterval) clearInterval(spawnInterval);
  if (animationId) cancelAnimationFrame(animationId);
});
</script>

<template>
  <div
    class="flex flex-col gap-4 p-6 rounded-2xl bg-zinc-900/50 border border-zinc-800"
  >
    <div class="flex items-center justify-between">
      <h3 class="text-lg font-bricolage text-white">⭐ Attrape-Étoiles</h3>
      <div class="flex gap-3 text-sm text-zinc-400 font-mono">
        <span v-if="game.active" class="text-MyYellow"
          >⏱️ {{ game.timeLeft }}s</span
        >
        <span v-if="game.active">🎯 {{ game.score }}pts</span>
        <span v-if="game.combo > 1" class="text-MyGreen"
          >🔥 x{{ game.combo }}</span
        >
      </div>
    </div>

    <!-- Zone de jeu -->
    <div
      class="relative h-64 rounded-xl bg-gradient-to-b from-zinc-900 to-zinc-800 border border-zinc-700 overflow-hidden"
    >
      <!-- Étoiles qui tombent -->
      <button
        v-for="star in stars"
        :key="star.id"
        class="absolute transition-transform duration-100 cursor-pointer hover:scale-125 flex items-center justify-center"
        :class="star.caught ? 'scale-150 opacity-0' : ''"
        :style="{
          left: `${star.x}%`,
          top: `${star.y}%`,
          width: `${star.size}px`,
          height: `${star.size}px`,
          transform: 'translate(-50%, -50%)',
        }"
        @click="catchStar(star.id)"
      >
        <span
          class="text-2xl transition-all"
          :style="{ color: star.color, textShadow: `0 0 10px ${star.color}` }"
        >
          ⭐
        </span>
      </button>

      <!-- Message d'état (quand inactif) -->
      <div
        v-if="!game.active"
        class="absolute inset-0 flex flex-col items-center justify-center bg-black/50"
      >
        <p class="text-white font-bricolage text-lg mb-2">
          {{
            game.score > 0
              ? `Score: ${game.score} pts`
              : "Attrape les étoiles !"
          }}
        </p>
        <p v-if="game.maxCombo > 0" class="text-MyGreen text-sm mb-4">
          Combo max: {{ game.maxCombo }}
        </p>
      </div>
    </div>

    <!-- Records et statistiques -->
    <div class="flex justify-between text-xs text-zinc-500 font-mono">
      <span v-if="game.bestScore > 0">🏆 Record: {{ game.bestScore }}pts</span>
      <span v-if="game.active">❌ Ratées: {{ game.missed }}</span>
    </div>

    <!-- Bouton jouer -->
    <button
      v-if="!game.active"
      class="py-3 rounded-xl bg-MyYellow text-black font-bricolage font-semibold hover:bg-MyYellow/80 transition-colors"
      @click="startGame"
    >
      ▶️ {{ game.score > 0 ? "Rejouer" : "Jouer" }}
    </button>
  </div>
</template>
