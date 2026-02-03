<script setup lang="ts">
/**
 * SlidingPuzzle - Taquin 3x3 avec images SVG
 * Le joueur doit remettre les tuiles dans l'ordre en glissant.
 * Deux images au choix, timer et compteur de coups.
 * INDICE SECRET: Le mot "ISLANDE" est caché sous les pièces du puzzle
 */
import { ref, computed, onUnmounted } from "vue";

const emit = defineEmits<{
  complete: [score: number, time: number, moves: number];
  interaction: [weight: number];
}>();

const GRID_SIZE = 3;
const SVG_FILES = ["/svg/flower-cart.svg", "/svg/tel-cart.svg"];

// Indice secret caché sous les pièces - réparti sur la grille 3x3
// Les cases qui ont été "découvertes" (où une pièce a été déplacée)
const revealedCells = ref<Set<number>>(new Set());
const HIDDEN_HINT = ["I", "S", "L", "A", "N", "D", "E", "🇮🇸", ""]; // 9 cases

const tiles = ref<number[]>([1, 2, 3, 4, 5, 6, 7, 8, 0]);
const selectedSvg = ref(SVG_FILES[0] || "");
const message = ref(
  "Choisis une image et clique sur Mélanger pour commencer !",
);

const game = ref({
  active: false,
  moves: 0,
  timer: 0,
  bestTime: 0,
  bestMoves: 0,
  puzzlesSolved: 0,
});

let timerInterval: ReturnType<typeof setInterval> | null = null;

const isSolved = (arr: number[]) => {
  for (let i = 0; i < arr.length - 1; i++) {
    if (arr[i] !== i + 1) return false;
  }
  return arr[arr.length - 1] === 0;
};

const countInversions = (arr: number[]) => {
  const flat = arr.filter((n) => n !== 0);
  let inv = 0;
  for (let i = 0; i < flat.length; i++) {
    for (let j = i + 1; j < flat.length; j++) {
      if ((flat[i] ?? 0) > (flat[j] ?? 0)) inv++;
    }
  }
  return inv;
};

const isSolvable = (arr: number[]) => countInversions(arr) % 2 === 0;

const getTileStyle = (tileNumber: number) => {
  if (!tileNumber) return {};

  const originalIdx = tileNumber - 1;
  const row = Math.floor(originalIdx / GRID_SIZE);
  const col = originalIdx % GRID_SIZE;
  const posX = (col / (GRID_SIZE - 1)) * 100;
  const posY = (row / (GRID_SIZE - 1)) * 100;

  return {
    backgroundImage: `url(${selectedSvg.value})`,
    backgroundSize: `${GRID_SIZE * 100}% ${GRID_SIZE * 100}%`,
    backgroundPosition: `${posX}% ${posY}%`,
    backgroundRepeat: "no-repeat",
  };
};

const shuffle = () => {
  let arr: number[] = [];
  do {
    arr = [...tiles.value];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j]!, arr[i]!];
    }
  } while (!isSolvable(arr) || isSolved(arr));

  tiles.value = arr;

  // Réinitialiser les cellules révélées lors d'un nouveau mélange
  revealedCells.value = new Set();

  game.value.active = true;
  game.value.moves = 0;
  game.value.timer = 0;
  message.value = "🎮 C'est parti ! Remets les pièces dans l'ordre";

  if (timerInterval) clearInterval(timerInterval);
  timerInterval = setInterval(() => {
    if (game.value.active) game.value.timer++;
  }, 1000);
};

const findEmpty = () => tiles.value.findIndex((n) => n === 0);

const handleTileClick = (idx: number) => {
  if (!game.value.active) return;

  const emptyIdx = findEmpty();
  const rowA = Math.floor(idx / GRID_SIZE);
  const colA = idx % GRID_SIZE;
  const rowB = Math.floor(emptyIdx / GRID_SIZE);
  const colB = emptyIdx % GRID_SIZE;

  const dist = Math.abs(rowA - rowB) + Math.abs(colA - colB);
  if (dist !== 1) return;

  // Révéler la cellule où la pièce ÉTAIT (là où elle part)
  // car c'est là que l'indice se trouve dessous
  revealedCells.value.add(idx);

  // Swap
  [tiles.value[idx], tiles.value[emptyIdx]] = [
    tiles.value[emptyIdx]!,
    tiles.value[idx]!,
  ];
  game.value.moves++;
  emit("interaction", 1);

  // Vérifier victoire
  if (isSolved(tiles.value)) {
    game.value.active = false;
    if (timerInterval) clearInterval(timerInterval);

    game.value.puzzlesSolved++;

    const isNewBestTime =
      game.value.bestTime === 0 || game.value.timer < game.value.bestTime;
    const isNewBestMoves =
      game.value.bestMoves === 0 || game.value.moves < game.value.bestMoves;

    if (isNewBestTime) game.value.bestTime = game.value.timer;
    if (isNewBestMoves) game.value.bestMoves = game.value.moves;

    const timeBonus = Math.max(0, 300 - game.value.timer * 2);
    const movesBonus = Math.max(0, 200 - game.value.moves * 3);
    const score = 100 + timeBonus + movesBonus;

    message.value = `🎉 Bravo ! Résolu en ${game.value.timer}s et ${game.value.moves} coups ! Score: ${score}`;
    emit("complete", score, game.value.timer, game.value.moves);
  }
};

const selectSvg = (svg: string) => {
  selectedSvg.value = svg;
};

onUnmounted(() => {
  if (timerInterval) clearInterval(timerInterval);
});
</script>

<template>
  <div
    class="flex flex-col gap-4 p-6 rounded-2xl bg-zinc-900/50 border border-zinc-800"
  >
    <div class="flex items-center justify-between">
      <h3 class="text-lg font-bricolage text-white">🧩 Taquin 3x3</h3>
      <div class="flex gap-3 text-sm text-zinc-400 font-mono">
        <span v-if="game.active">⏱️ {{ game.timer }}s</span>
        <span v-if="game.active">🎯 {{ game.moves }} coups</span>
      </div>
    </div>

    <!-- Message -->
    <p class="text-center text-sm text-zinc-300 font-bricolage">
      {{ message }}
    </p>

    <!-- Sélection d'image -->
    <div class="flex justify-center gap-4">
      <button
        v-for="svg in SVG_FILES"
        :key="svg"
        class="w-16 h-16 rounded-lg border-2 overflow-hidden transition-all"
        :class="
          selectedSvg === svg
            ? 'border-MyPink scale-105'
            : 'border-zinc-600 opacity-60 hover:opacity-100'
        "
        @click="selectSvg(svg)"
      >
        <img :src="svg" :alt="svg" class="w-full h-full object-cover" />
      </button>
    </div>

    <!-- Grille du puzzle avec indice caché -->
    <div
      class="grid grid-cols-3 gap-1 aspect-square max-w-[300px] mx-auto relative"
    >
      <!-- Couche de fond avec l'indice caché (très subtil) -->
      <div class="absolute inset-0 grid grid-cols-3 gap-1 pointer-events-none">
        <div
          v-for="(letter, idx) in HIDDEN_HINT"
          :key="`hint-${idx}`"
          class="aspect-square rounded-md flex items-center justify-center"
        >
          <!-- Lettre visible uniquement quand la case est vide ou a été révélée -->
          <span
            v-if="tiles[idx] === 0"
            class="text-lg font-mono text-MyPink/60"
            :class="{ 'text-xl': letter === '🇮🇸' }"
          >
            {{ letter }}
          </span>
        </div>
      </div>

      <!-- Couche des pièces du puzzle -->
      <button
        v-for="(tile, idx) in tiles"
        :key="idx"
        class="aspect-square rounded-md transition-all duration-150 relative z-10"
        :class="[
          tile === 0
            ? 'bg-transparent'
            : 'bg-zinc-800 hover:scale-95 active:scale-90 cursor-pointer border border-zinc-700 shadow-lg',
        ]"
        :style="getTileStyle(tile)"
        :disabled="tile === 0 || !game.active"
        @click="handleTileClick(idx)"
      >
        <span v-if="tile === 0" class="sr-only">Vide</span>
      </button>
    </div>

    <!-- Records -->
    <div
      v-if="game.bestTime > 0"
      class="flex justify-center gap-6 text-xs text-MyGreen font-mono"
    >
      <span>⏱️ Record: {{ game.bestTime }}s</span>
      <span>🎯 Min coups: {{ game.bestMoves }}</span>
    </div>

    <!-- Bouton mélanger -->
    <button
      class="py-3 rounded-xl bg-MyCyan text-black font-bricolage font-semibold hover:bg-MyCyan/80 transition-colors"
      @click="shuffle"
    >
      🔀 {{ game.active ? "Remélanger" : "Mélanger" }}
    </button>
  </div>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.5s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
