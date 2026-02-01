<script setup lang="ts">
/**
 * GameTimer - Affichage de timer pour les mini-jeux
 * Avec indicateur visuel du temps restant.
 */
interface Props {
  time: number; // secondes
  maxTime?: number;
  warning?: number; // seuil d'alerte
  danger?: number; // seuil critique
  showIcon?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  maxTime: 30,
  warning: 10,
  danger: 5,
  showIcon: true,
});

const statusClass = computed(() => {
  if (props.time <= props.danger) return "text-red-500 animate-pulse";
  if (props.time <= props.warning) return "text-MyYellow";
  return "text-white";
});

const percentage = computed(() => (props.time / props.maxTime) * 100);
</script>

<template>
  <div class="flex items-center gap-2">
    <span v-if="showIcon" class="text-lg">⏱️</span>
    <div class="flex items-center gap-2">
      <span
        class="font-mono font-bold text-lg tabular-nums"
        :class="statusClass"
      >
        {{ time }}s
      </span>

      <!-- Mini barre de progression -->
      <div class="w-16 h-1.5 bg-zinc-700 rounded-full overflow-hidden">
        <div
          class="h-full rounded-full transition-all duration-300"
          :class="[
            time <= danger
              ? 'bg-red-500'
              : time <= warning
                ? 'bg-MyYellow'
                : 'bg-MyGreen',
          ]"
          :style="{ width: `${percentage}%` }"
        />
      </div>
    </div>
  </div>
</template>
