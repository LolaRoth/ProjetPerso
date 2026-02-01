<script setup lang="ts">
/**
 * TargetShooting - Mini-jeu de tir sur cibles
 * Des cibles apparaissent aléatoirement, le joueur doit les toucher avant qu'elles disparaissent.
 * Système de combo et difficulté ajustable.
 */
import { ref, computed, onUnmounted } from 'vue'

interface Target {
  id: number
  x: number
  y: number
  size: number
  spawnTime: number
  lifetime: number
}

const props = defineProps<{
  difficulty?: 'easy' | 'normal' | 'hard'
}>()

const emit = defineEmits<{
  complete: [score: number, stats: { hits: number; missed: number; maxCombo: number; accuracy: number }]
  interaction: [weight: number]
}>()

// Configuration par difficulté
const difficultySettings = {
  easy: { spawnRate: 1500, lifetime: 3000, maxTargets: 4, multiplier: 1 },
  normal: { spawnRate: 1000, lifetime: 2000, maxTargets: 6, multiplier: 1.5 },
  hard: { spawnRate: 700, lifetime: 1200, maxTargets: 8, multiplier: 2 }
}

const currentDifficulty = computed(() => props.difficulty || 'normal')
const settings = computed(() => difficultySettings[currentDifficulty.value])

// État du jeu
const targets = ref<Target[]>([])
const gameState = ref({
  active: false,
  started: false,
  score: 0,
  hits: 0,
  missed: 0,
  combo: 0,
  maxCombo: 0,
  timeLeft: 30,
  totalSpawned: 0
})

let timerInterval: ReturnType<typeof setInterval> | null = null
let spawnInterval: ReturnType<typeof setInterval> | null = null
let targetIdCounter = 0

const accuracy = computed(() => {
  if (gameState.value.totalSpawned === 0) return 0
  return Math.round((gameState.value.hits / gameState.value.totalSpawned) * 100)
})

const spawnTarget = () => {
  if (!gameState.value.active) return
  if (targets.value.length >= settings.value.maxTargets) return

  const id = targetIdCounter++
  const target: Target = {
    id,
    x: 8 + Math.random() * 84,
    y: 8 + Math.random() * 84,
    size: 35 + Math.random() * 25,
    spawnTime: Date.now(),
    lifetime: settings.value.lifetime + Math.random() * 500
  }

  targets.value.push(target)
  gameState.value.totalSpawned++

  // Auto-remove si non touché
  setTimeout(() => {
    const t = targets.value.find(t => t.id === id)
    if (t && gameState.value.active) {
      gameState.value.missed++
      gameState.value.combo = 0
      targets.value = targets.value.filter(t => t.id !== id)
    }
  }, target.lifetime)
}

const prepare = () => {
  gameState.value = {
    active: true,
    started: false,
    score: 0,
    hits: 0,
    missed: 0,
    combo: 0,
    maxCombo: 0,
    timeLeft: 30,
    totalSpawned: 0
  }
  targets.value = []
  
  // Afficher quelques cibles de preview
  for (let i = 0; i < 3; i++) spawnTarget()
}

const startTimer = () => {
  if (gameState.value.started) return
  gameState.value.started = true

  timerInterval = setInterval(() => {
    gameState.value.timeLeft--
    if (gameState.value.timeLeft <= 0) endGame()
  }, 1000)

  spawnInterval = setInterval(spawnTarget, settings.value.spawnRate)
}

const hitTarget = (id: number) => {
  const target = targets.value.find(t => t.id === id)
  if (!target) return

  if (!gameState.value.started) startTimer()

  // Calcul des points
  const timeAlive = Date.now() - target.spawnTime
  const timeBonus = Math.max(0, Math.floor((target.lifetime - timeAlive) / 100))
  const comboBonus = Math.min(gameState.value.combo * 2, 20)
  const points = Math.round((10 + comboBonus + timeBonus) * settings.value.multiplier)

  gameState.value.score += points
  gameState.value.hits++
  gameState.value.combo++
  if (gameState.value.combo > gameState.value.maxCombo) {
    gameState.value.maxCombo = gameState.value.combo
  }

  targets.value = targets.value.filter(t => t.id !== id)
  emit('interaction', 12 + points / 2)
}

const endGame = () => {
  if (timerInterval) clearInterval(timerInterval)
  if (spawnInterval) clearInterval(spawnInterval)
  timerInterval = null
  spawnInterval = null

  gameState.value.active = false
  
  emit('complete', gameState.value.score, {
    hits: gameState.value.hits,
    missed: gameState.value.missed,
    maxCombo: gameState.value.maxCombo,
    accuracy: accuracy.value
  })

  targets.value = []
}

onUnmounted(() => {
  if (timerInterval) clearInterval(timerInterval)
  if (spawnInterval) clearInterval(spawnInterval)
})
</script>

<template>
  <div class="flex flex-col gap-4 p-6 rounded-2xl bg-zinc-900/50 border border-zinc-800">
    <div class="flex items-center justify-between">
      <h3 class="text-lg font-bricolage text-white">🎯 Tir sur Cibles</h3>
      <span 
        v-if="gameState.started" 
        class="text-MyPink font-mono"
        :class="{ 'animate-pulse': gameState.timeLeft <= 5 }"
      >
        {{ gameState.timeLeft }}s
      </span>
    </div>

    <!-- Stats -->
    <div class="flex justify-between text-sm text-zinc-400 font-mono">
      <span>Score: <span class="text-MyGreen">{{ gameState.score }}</span></span>
      <span>Combo: <span class="text-MyYellow">x{{ gameState.combo }}</span></span>
      <span>Précision: <span class="text-MyBlue">{{ accuracy }}%</span></span>
    </div>

    <!-- Zone de jeu -->
    <div 
      class="relative w-full h-64 bg-zinc-950 rounded-xl overflow-hidden border border-zinc-800"
      @click="!gameState.active && prepare()"
    >
      <!-- Cibles -->
      <button
        v-for="target in targets"
        :key="target.id"
        class="absolute rounded-full bg-gradient-to-br from-MyPink to-MyPink/60 
               border-2 border-white/30 cursor-crosshair transition-transform 
               hover:scale-110 active:scale-90"
        :style="{
          left: `${target.x}%`,
          top: `${target.y}%`,
          width: `${target.size}px`,
          height: `${target.size}px`,
          transform: 'translate(-50%, -50%)'
        }"
        @click.stop="hitTarget(target.id)"
      >
        <span class="text-lg">🎯</span>
      </button>

      <!-- Message d'état -->
      <div 
        v-if="!gameState.active" 
        class="absolute inset-0 flex items-center justify-center bg-black/50"
      >
        <p class="text-zinc-400 font-bricolage">
          {{ gameState.totalSpawned > 0 ? `Score final: ${gameState.score}` : 'Clique pour jouer' }}
        </p>
      </div>
    </div>

    <!-- Bouton de démarrage -->
    <button
      v-if="!gameState.active"
      class="py-3 rounded-xl bg-MyPink text-white font-bricolage hover:bg-MyPink/80 transition-colors"
      @click="prepare"
    >
      🎮 {{ gameState.totalSpawned > 0 ? 'Rejouer' : 'Jouer' }}
    </button>
  </div>
</template>
