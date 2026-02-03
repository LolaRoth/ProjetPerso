<script setup lang="ts">
/**
 * MemoryGame - Jeu de mémoire avec cartes à retourner
 * Trois niveaux de difficulté avec émojis différents.
 * Timer et système de combo pour encourager la rapidité.
 */
import { ref, computed, onUnmounted } from "vue";

const emit = defineEmits<{
  complete: [
    won: boolean,
    level: number,
    moves: number,
    time: number,
    maxCombo: number,
  ];
  interaction: [weight: number];
}>();

interface MemoryCard {
  id: number;
  emoji: string;
  pairId: number;
  flipped: boolean;
  matched: boolean;
}

// Configuration par niveau
// INDICE SECRET: Une paire spéciale "42" est cachée au niveau 2+
const EMOJIS_PER_LEVEL: Record<number, string[]> = {
  1: ["🎮", "🎯", "🎪", "🎨", "🎭", "🎸"], // 6 paires = 12 cartes
  2: ["🌟", "🌙", "☀️", "⭐", "🌈", "❄️", "🔥", "4️⃣2️⃣"], // 8 paires = 16 cartes (42 caché!)
  3: ["🍎", "🍊", "🍋", "🍇", "🍓", "🍒", "🥝", "🍑", "🍌", "4️⃣2️⃣"], // 10 paires = 20 cartes (42 caché!)
};

// État du jeu
const cards = ref<MemoryCard[]>([]);
const flippedCards = ref<number[]>([]);
const moves = ref(0);
const gameActive = ref(false);
const message = ref("Clique sur JOUER pour commencer");
const canFlip = ref(true);
const level = ref(1);
const timer = ref(0);
const bestTime = ref<Record<number, number>>({ 1: 999, 2: 999, 3: 999 });
const combo = ref(0);
const maxCombo = ref(0);

let timerInterval: ReturnType<typeof setInterval> | null = null;

const gridCols = computed(() => {
  const count = cards.value.length;
  if (count <= 12) return 4;
  if (count <= 16) return 4;
  return 5;
});

const initGame = (newLevel: number = level.value) => {
  level.value = newLevel;
  const emojis = EMOJIS_PER_LEVEL[newLevel] || EMOJIS_PER_LEVEL[1]!;
  const pairs: { emoji: string; pairId: number }[] = [];

  emojis.forEach((emoji, idx) => {
    pairs.push({ emoji, pairId: idx });
    pairs.push({ emoji, pairId: idx });
  });

  // Fisher-Yates shuffle
  for (let i = pairs.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pairs[i], pairs[j]] = [pairs[j]!, pairs[i]!];
  }

  cards.value = pairs.map((pair, i) => ({
    id: i,
    emoji: pair.emoji,
    pairId: pair.pairId,
    flipped: false,
    matched: false,
  }));

  flippedCards.value = [];
  moves.value = 0;
  timer.value = 0;
  combo.value = 0;
  maxCombo.value = 0;
  gameActive.value = true;
  message.value = `Niveau ${newLevel} - Trouve toutes les paires ! (${emojis.length} paires)`;
  canFlip.value = true;

  if (timerInterval) clearInterval(timerInterval);
  timerInterval = setInterval(() => {
    timer.value++;
  }, 1000);
};

const flipCard = (card: MemoryCard) => {
  if (!gameActive.value || !canFlip.value) return;
  if (card.flipped || card.matched) return;
  if (flippedCards.value.length >= 2) return;

  card.flipped = true;
  flippedCards.value.push(card.id);
  emit("interaction", 1);

  if (flippedCards.value.length === 2) {
    moves.value++;
    canFlip.value = false;

    const [firstId, secondId] = flippedCards.value;
    const firstCard = cards.value.find((c) => c.id === firstId);
    const secondCard = cards.value.find((c) => c.id === secondId);

    if (firstCard && secondCard && firstCard.pairId === secondCard.pairId) {
      // Match trouvé !
      firstCard.matched = true;
      secondCard.matched = true;
      flippedCards.value = [];
      canFlip.value = true;
      combo.value++;
      if (combo.value > maxCombo.value) maxCombo.value = combo.value;
      emit("interaction", 10 + combo.value * 5);

      // Vérifier si gagné
      if (cards.value.every((c) => c.matched)) {
        if (timerInterval) clearInterval(timerInterval);

        if (timer.value < (bestTime.value[level.value] || 999)) {
          bestTime.value[level.value] = timer.value;
        }

        message.value = `🎉 Niveau ${level.value} gagné en ${moves.value} coups (${timer.value}s) ! Combo max: ${maxCombo.value}`;
        gameActive.value = false;
        emit(
          "complete",
          true,
          level.value,
          moves.value,
          timer.value,
          maxCombo.value,
        );
      }
    } else {
      // Pas de match - reset combo
      combo.value = 0;
      setTimeout(() => {
        if (firstCard) firstCard.flipped = false;
        if (secondCard) secondCard.flipped = false;
        flippedCards.value = [];
        canFlip.value = true;
      }, 800);
    }
  }
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
      <h3 class="text-lg font-bricolage text-white">🧠 Jeu de Mémoire</h3>
      <div class="flex gap-4 text-sm text-zinc-400 font-mono">
        <span v-if="gameActive">⏱️ {{ timer }}s</span>
        <span v-if="gameActive">🎯 {{ moves }} coups</span>
        <span v-if="combo > 1" class="text-MyYellow">🔥 x{{ combo }}</span>
      </div>
    </div>

    <!-- Message -->
    <p class="text-center text-sm text-zinc-300 font-bricolage">
      {{ message }}
    </p>

    <!-- Sélection niveau (avant de jouer) -->
    <div
      v-if="!gameActive && cards.length === 0"
      class="flex justify-center gap-3"
    >
      <button
        v-for="lvl in [1, 2, 3]"
        :key="lvl"
        class="px-4 py-2 rounded-lg border transition-all"
        :class="
          level === lvl
            ? 'bg-MyPink text-black border-MyPink'
            : 'bg-zinc-800 text-white border-zinc-700 hover:border-MyPink'
        "
        @click="level = lvl"
      >
        Niveau {{ lvl }}
      </button>
    </div>

    <!-- Grille de cartes -->
    <div
      v-if="cards.length > 0"
      class="grid gap-2 justify-center"
      :style="{ gridTemplateColumns: `repeat(${gridCols}, minmax(0, 1fr))` }"
    >
      <button
        v-for="card in cards"
        :key="card.id"
        class="aspect-square rounded-lg text-2xl transition-all duration-300 border-2 flex items-center justify-center"
        :class="[
          card.flipped || card.matched
            ? 'bg-zinc-800 border-MyPink rotate-0'
            : 'bg-zinc-900 border-zinc-700 hover:border-zinc-500',
          card.matched && 'opacity-60',
        ]"
        :disabled="card.matched"
        @click="flipCard(card)"
      >
        <span
          class="transition-opacity duration-200"
          :class="card.flipped || card.matched ? 'opacity-100' : 'opacity-0'"
        >
          {{ card.emoji }}
        </span>
      </button>
    </div>

    <!-- Meilleur temps -->
    <p
      v-if="!gameActive && (bestTime[level] ?? 999) < 999"
      class="text-center text-sm text-MyGreen font-mono"
    >
      ⏱️ Meilleur temps niveau {{ level }}: {{ bestTime[level] }}s
    </p>

    <!-- Bouton jouer -->
    <button
      v-if="!gameActive"
      class="py-3 rounded-xl bg-MyPink text-black font-bricolage font-semibold hover:bg-MyPink/80 transition-colors"
      @click="initGame()"
    >
      ▶️ {{ cards.length > 0 ? "Rejouer" : "Jouer" }} Niveau {{ level }}
    </button>
  </div>
</template>
