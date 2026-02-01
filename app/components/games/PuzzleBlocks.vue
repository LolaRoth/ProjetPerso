<script setup lang="ts">
/**
 * PuzzleBlocks - Puzzle glisser-déposer avec 9 pièces
 * Trois types de formes (carré, cercle, hexagone) avec couleurs et rotations.
 * Le joueur doit associer chaque pièce à sa zone correspondante.
 */
import { ref, computed } from 'vue'

const emit = defineEmits<{
  complete: [puzzleNumber: number]
  interaction: [weight: number]
}>()

interface PuzzlePiece {
  id: number
  color: string
  emoji: string
  shape: 'square' | 'circle' | 'hexagon'
  rotation: number
  targetRotation: number
  sizeVariant?: 'small' | 'medium' | 'large'
  placed: boolean
}

interface PuzzleZone {
  id: number
  color: string
  shape: 'square' | 'circle' | 'hexagon'
  targetRotation: number
  expectedSize?: 'small' | 'medium' | 'large'
  filled: boolean
  filledBy: number | null
}

// Configuration initiale des pièces
const getInitialPieces = (): PuzzlePiece[] => [
  { id: 1, color: '#FF66C8', emoji: '🎀', shape: 'square', rotation: 0, targetRotation: 0, placed: false },
  { id: 2, color: '#6BFFFF', emoji: '💎', shape: 'circle', rotation: 0, targetRotation: 0, sizeVariant: 'medium', placed: false },
  { id: 3, color: '#FFF746', emoji: '⭐', shape: 'hexagon', rotation: 180, targetRotation: 0, placed: false },
  { id: 4, color: '#BBFF42', emoji: '🍀', shape: 'square', rotation: 0, targetRotation: 0, placed: false },
  { id: 5, color: '#FF8855', emoji: '🔥', shape: 'circle', rotation: 0, targetRotation: 0, sizeVariant: 'small', placed: false },
  { id: 6, color: '#AA66FF', emoji: '🌙', shape: 'hexagon', rotation: 90, targetRotation: 0, placed: false },
  { id: 7, color: '#FF66C8', emoji: '💖', shape: 'circle', rotation: 0, targetRotation: 0, sizeVariant: 'large', placed: false },
  { id: 8, color: '#6BFFFF', emoji: '❄️', shape: 'hexagon', rotation: 270, targetRotation: 0, placed: false },
  { id: 9, color: '#FFF746', emoji: '🌟', shape: 'square', rotation: 0, targetRotation: 0, placed: false }
]

// Configuration des zones cibles
const getInitialZones = (): PuzzleZone[] => [
  { id: 1, color: '#FF66C8', shape: 'square', targetRotation: 0, filled: false, filledBy: null },
  { id: 2, color: '#6BFFFF', shape: 'circle', targetRotation: 0, expectedSize: 'medium', filled: false, filledBy: null },
  { id: 3, color: '#FFF746', shape: 'hexagon', targetRotation: 0, filled: false, filledBy: null },
  { id: 4, color: '#BBFF42', shape: 'square', targetRotation: 0, filled: false, filledBy: null },
  { id: 5, color: '#FF8855', shape: 'circle', targetRotation: 0, expectedSize: 'small', filled: false, filledBy: null },
  { id: 6, color: '#AA66FF', shape: 'hexagon', targetRotation: 0, filled: false, filledBy: null },
  { id: 7, color: '#FF66C8', shape: 'circle', targetRotation: 0, expectedSize: 'large', filled: false, filledBy: null },
  { id: 8, color: '#6BFFFF', shape: 'hexagon', targetRotation: 0, filled: false, filledBy: null },
  { id: 9, color: '#FFF746', shape: 'square', targetRotation: 0, filled: false, filledBy: null }
]

const pieces = ref<PuzzlePiece[]>(getInitialPieces())
const zones = ref<PuzzleZone[]>(getInitialZones())
const message = ref('Glisse chaque pièce vers sa zone correspondante. Clique droit pour tourner !')
const currentDragged = ref<number | null>(null)
const dragOverZone = ref<number | null>(null)
const completedCount = ref(0)

// Rotation des hexagones (clic droit)
const rotatePiece = (pieceId: number, e: Event) => {
  e.preventDefault()
  const piece = pieces.value.find(p => p.id === pieceId)
  if (piece && !piece.placed && piece.shape === 'hexagon') {
    piece.rotation = (piece.rotation + 90) % 360
    emit('interaction', 1)
  }
}

// Cycle de taille pour les cercles (double-clic)
const cycleCircleSize = (pieceId: number, e?: Event) => {
  if (e) e.stopPropagation()
  const piece = pieces.value.find(p => p.id === pieceId)
  if (!piece || piece.placed || piece.shape !== 'circle') return
  
  const sizes: ('small' | 'medium' | 'large')[] = ['small', 'medium', 'large']
  const current = piece.sizeVariant || 'medium'
  piece.sizeVariant = sizes[(sizes.indexOf(current) + 1) % sizes.length]
  emit('interaction', 1)
}

const handleDragStart = (pieceId: number) => {
  currentDragged.value = pieceId
}

const handleDragEnd = () => {
  currentDragged.value = null
  dragOverZone.value = null
}

const handleDragOver = (e: DragEvent, zoneId: number) => {
  e.preventDefault()
  dragOverZone.value = zoneId
}

const handleDragLeave = () => {
  dragOverZone.value = null
}

const handleDrop = (e: DragEvent, zone: PuzzleZone) => {
  e.preventDefault()
  dragOverZone.value = null

  if (currentDragged.value === null || zone.filled) return

  const piece = pieces.value.find(p => p.id === currentDragged.value)
  if (!piece) return

  const colorMatch = piece.color === zone.color
  const shapeMatch = piece.shape === zone.shape
  const sizeMatch = piece.shape === 'circle' 
    ? (piece.sizeVariant || 'medium') === (zone.expectedSize || 'medium') 
    : true
  const rotationMatch = piece.shape === 'hexagon' 
    ? piece.rotation === zone.targetRotation 
    : true

  if (colorMatch && shapeMatch && rotationMatch && sizeMatch) {
    piece.placed = true
    zone.filled = true
    zone.filledBy = piece.id
    emit('interaction', 20)

    const allPlaced = pieces.value.every(p => p.placed)
    if (allPlaced) {
      message.value = '🎉 Parfait ! Puzzle complété !'
      completedCount.value++
      emit('complete', completedCount.value)

      setTimeout(() => resetPuzzle(), 2500)
    } else {
      const remaining = pieces.value.filter(p => !p.placed).length
      message.value = `✅ Bien joué ! Encore ${remaining} pièce(s)`
    }
  } else if (colorMatch && shapeMatch && !sizeMatch) {
    message.value = '🔄 Bonne pièce mais mauvaise taille ! Double-clic pour changer'
  } else if (colorMatch && shapeMatch && !rotationMatch) {
    message.value = '🔄 Bonne pièce mais mauvaise rotation ! Clique droit pour tourner'
  } else if (colorMatch && !shapeMatch) {
    message.value = '❌ Bonne couleur mais mauvaise forme !'
  } else if (!colorMatch && shapeMatch) {
    message.value = '❌ Bonne forme mais mauvaise couleur !'
  } else {
    message.value = '❌ Mauvaise pièce ! Vérifie la couleur et la forme'
  }

  setTimeout(() => {
    if (!pieces.value.every(p => p.placed)) {
      message.value = 'Glisse chaque pièce vers sa zone correspondante. Clique droit pour tourner !'
    }
  }, 2000)

  currentDragged.value = null
}

const resetPuzzle = () => {
  pieces.value.forEach(piece => {
    piece.placed = false
    if (piece.shape === 'hexagon') {
      piece.rotation = [0, 90, 180, 270][Math.floor(Math.random() * 4)]!
    } else if (piece.shape === 'circle') {
      const sizes: ('small' | 'medium' | 'large')[] = ['small', 'medium', 'large']
      piece.sizeVariant = sizes[Math.floor(Math.random() * sizes.length)]
      piece.rotation = 0
    }
  })

  zones.value.forEach(zone => {
    zone.filled = false
    zone.filledBy = null
  })

  // Mélanger les pièces
  for (let i = pieces.value.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[pieces.value[i], pieces.value[j]] = [pieces.value[j]!, pieces.value[i]!]
  }

  message.value = 'Nouveau puzzle ! Glisse chaque pièce vers sa zone correspondante.'
}

const getClipPath = (shape: string) => {
  if (shape === 'circle') return 'circle(50% at 50% 50%)'
  if (shape === 'hexagon') return 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)'
  return 'none'
}

const getPieceSize = (sizeVariant?: string) => {
  if (sizeVariant === 'small') return 'w-8 h-8'
  if (sizeVariant === 'large') return 'w-16 h-16'
  return 'w-12 h-12'
}

const unplacedPieces = computed(() => pieces.value.filter(p => !p.placed))
</script>

<template>
  <div class="flex flex-col gap-6 p-6 rounded-2xl bg-zinc-900/50 border border-zinc-800">
    <div class="flex items-center justify-between">
      <h3 class="text-lg font-bricolage text-white">🧩 Puzzle des Formes</h3>
      <span class="text-sm text-zinc-400 font-mono">Complétés: {{ completedCount }}</span>
    </div>

    <!-- Message -->
    <p class="text-center text-sm text-zinc-300 font-bricolage">{{ message }}</p>

    <!-- Zones cibles (grille 3x3) -->
    <div class="grid grid-cols-3 gap-2">
      <div
        v-for="zone in zones"
        :key="zone.id"
        :data-zone-id="`zone-${zone.id}`"
        class="aspect-square flex items-center justify-center border-2 border-dashed transition-all"
        :class="[
          zone.filled ? 'border-MyGreen bg-zinc-800/50' : 'border-zinc-600',
          dragOverZone === zone.id && !zone.filled && 'border-MyYellow scale-105'
        ]"
        :style="{ 
          clipPath: getClipPath(zone.shape),
          borderRadius: zone.shape === 'square' ? '12px' : '0'
        }"
        @dragover="handleDragOver($event, zone.id)"
        @dragleave="handleDragLeave"
        @drop="handleDrop($event, zone)"
      >
        <div 
          v-if="zone.filled"
          class="w-10 h-10 flex items-center justify-center text-2xl"
          :style="{ backgroundColor: zone.color, clipPath: getClipPath(zone.shape) }"
        >
          {{ pieces.find(p => p.id === zone.filledBy)?.emoji }}
        </div>
        <div 
          v-else 
          class="w-10 h-10 opacity-30"
          :style="{ backgroundColor: zone.color, clipPath: getClipPath(zone.shape) }"
        />
      </div>
    </div>

    <!-- Pièces disponibles -->
    <div class="flex flex-wrap gap-3 justify-center p-4 bg-zinc-800/50 rounded-xl min-h-[80px]">
      <div
        v-for="piece in unplacedPieces"
        :key="piece.id"
        draggable="true"
        class="flex items-center justify-center cursor-grab active:cursor-grabbing
               transition-all hover:scale-110 select-none"
        :class="getPieceSize(piece.sizeVariant)"
        :style="{ 
          backgroundColor: piece.color,
          clipPath: getClipPath(piece.shape),
          transform: `rotate(${piece.rotation}deg)`
        }"
        @dragstart="handleDragStart(piece.id)"
        @dragend="handleDragEnd"
        @contextmenu="rotatePiece(piece.id, $event)"
        @dblclick="cycleCircleSize(piece.id, $event)"
      >
        <span class="text-xl" :style="{ transform: `rotate(-${piece.rotation}deg)` }">
          {{ piece.emoji }}
        </span>
      </div>

      <p v-if="unplacedPieces.length === 0" class="text-zinc-500 text-sm">
        Toutes les pièces sont placées ! 🎉
      </p>
    </div>

    <!-- Bouton reset -->
    <button
      class="py-2 rounded-lg bg-zinc-700 text-white font-bricolage text-sm
             hover:bg-zinc-600 transition-colors"
      @click="resetPuzzle"
    >
      🔄 Nouveau Puzzle
    </button>
  </div>
</template>
