<script setup lang="ts">
/**
 * TypingGame - Mini-jeu de dactylographie
 * Le joueur doit taper des mots le plus vite possible avant la fin du temps.
 * Le timer ne démarre qu'à la première frappe.
 */
import { ref, computed, onUnmounted, nextTick } from 'vue'

const emit = defineEmits<{
  complete: [won: boolean, score: number, wordsCompleted: number]
  interaction: [weight: number]
}>()

const WORDS = [
  'chaos', 'pixel', 'glitch', 'neon', 'cyber', 'matrix', 'bug', 'code',
  'hack', 'error', 'crash', 'debug', 'loop', 'data', 'void', 'flux'
]

const getRandomWord = () => WORDS[Math.floor(Math.random() * WORDS.length)] || 'chaos'

// État du jeu
const state = ref({
  active: false,
  started: false,
  targetWord: '',
  userInput: '',
  wordsCompleted: 0,
  timeLeft: 30,
  score: 0
})

const inputRef = ref<HTMLInputElement | null>(null)
let timerInterval: ReturnType<typeof setInterval> | null = null

// Coloration du texte tapé (vert=correct, rouge=erreur)
const coloredInput = computed(() => {
  const target = state.value.targetWord.toLowerCase()
  const input = state.value.userInput.toLowerCase()
  
  return input.split('').map((char, i) => ({
    char: state.value.userInput[i] || char,
    correct: char === target[i]
  }))
})

const prepare = () => {
  state.value = {
    active: true,
    started: false,
    targetWord: getRandomWord(),
    userInput: '',
    wordsCompleted: 0,
    timeLeft: 30,
    score: 0
  }
  
  nextTick(() => inputRef.value?.focus())
}

const startTimer = () => {
  if (state.value.started) return
  state.value.started = true

  timerInterval = setInterval(() => {
    state.value.timeLeft--
    if (state.value.timeLeft <= 0) endGame()
  }, 1000)
}

const handleInput = (e: Event) => {
  const target = e.target as HTMLInputElement
  state.value.userInput = target.value

  // Démarre le timer à la première frappe
  if (!state.value.started && state.value.userInput.length > 0) {
    startTimer()
  }

  // Vérifie si le mot est correct
  if (state.value.userInput.toLowerCase() === state.value.targetWord.toLowerCase()) {
    state.value.wordsCompleted++
    state.value.score += state.value.targetWord.length * 10
    state.value.userInput = ''
    state.value.targetWord = getRandomWord()
    emit('interaction', 5)
  }
}

const endGame = () => {
  if (timerInterval) {
    clearInterval(timerInterval)
    timerInterval = null
  }

  const won = state.value.wordsCompleted >= 5
  emit('complete', won, state.value.score, state.value.wordsCompleted)

  state.value.active = false
  state.value.started = false
}

onUnmounted(() => {
  if (timerInterval) clearInterval(timerInterval)
})
</script>

<template>
  <div class="flex flex-col gap-4 p-6 rounded-2xl bg-zinc-900/50 border border-zinc-800">
    <div class="flex items-center justify-between">
      <h3 class="text-lg font-bricolage text-white">⌨️ Dactylographie</h3>
      <span 
        v-if="state.started" 
        class="text-MyPink font-mono"
        :class="{ 'animate-pulse': state.timeLeft <= 5 }"
      >
        {{ state.timeLeft }}s
      </span>
    </div>

    <!-- Stats -->
    <div class="flex justify-between text-sm text-zinc-400 font-mono">
      <span>Mots: <span class="text-MyGreen">{{ state.wordsCompleted }}</span>/5</span>
      <span>Score: <span class="text-MyYellow">{{ state.score }}</span></span>
    </div>

    <!-- Mot à taper -->
    <div 
      v-if="state.active"
      class="py-6 text-center bg-zinc-950 rounded-xl border border-zinc-800"
    >
      <p class="text-3xl font-mono tracking-wider text-white mb-4">
        {{ state.targetWord }}
      </p>
      
      <!-- Affichage coloré de l'input -->
      <p class="text-xl font-mono h-8">
        <span 
          v-for="(item, i) in coloredInput" 
          :key="i"
          :class="item.correct ? 'text-MyGreen' : 'text-red-500'"
        >
          {{ item.char }}
        </span>
        <span class="animate-pulse text-zinc-500">|</span>
      </p>
    </div>

    <!-- Input -->
    <input
      v-if="state.active"
      ref="inputRef"
      v-model="state.userInput"
      type="text"
      class="w-full px-4 py-3 bg-zinc-950 border border-zinc-700 rounded-xl 
             text-center font-mono text-xl text-white placeholder-zinc-600
             focus:outline-none focus:border-MyBlue transition-colors"
      placeholder="Tape ici..."
      autocomplete="off"
      @input="handleInput"
    />

    <!-- Bouton de démarrage -->
    <button
      v-if="!state.active"
      class="py-3 rounded-xl bg-MyBlue text-white font-bricolage hover:bg-MyBlue/80 transition-colors"
      @click="prepare"
    >
      🎮 {{ state.score > 0 ? 'Rejouer' : 'Jouer' }}
    </button>

    <!-- Résultat -->
    <p 
      v-if="!state.active && state.score > 0" 
      class="text-sm text-center font-bricolage"
      :class="state.wordsCompleted >= 5 ? 'text-MyGreen' : 'text-red-400'"
    >
      {{ state.wordsCompleted >= 5 ? '✅ Bien joué !' : `❌ ${state.wordsCompleted} mots seulement` }}
    </p>
  </div>
</template>
