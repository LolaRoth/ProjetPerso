<script setup lang="ts">
/**
 * ProgressBar - Barre de progression réutilisable
 * Avec animation fluide et couleurs personnalisables.
 */
interface Props {
  value: number; // 0 à 100
  max?: number;
  color?: string;
  bgColor?: string;
  height?: string;
  showLabel?: boolean;
  labelFormat?: "percent" | "value" | "custom";
  customLabel?: string;
  animated?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  max: 100,
  color: "#FF66C8",
  bgColor: "#27272a",
  height: "8px",
  showLabel: false,
  labelFormat: "percent",
  customLabel: "",
  animated: true,
});

const percentage = computed(() =>
  Math.min(100, Math.max(0, (props.value / props.max) * 100)),
);

const displayLabel = computed(() => {
  if (props.customLabel) return props.customLabel;
  if (props.labelFormat === "percent")
    return `${Math.round(percentage.value)}%`;
  return `${props.value}/${props.max}`;
});
</script>

<template>
  <div class="w-full">
    <!-- Label optionnel -->
    <div
      v-if="showLabel"
      class="flex justify-between text-xs text-zinc-400 mb-1 font-mono"
    >
      <slot name="label-start" />
      <span>{{ displayLabel }}</span>
    </div>

    <!-- Barre de progression -->
    <div
      class="w-full rounded-full overflow-hidden"
      :style="{ backgroundColor: bgColor, height }"
    >
      <div
        class="h-full rounded-full"
        :class="{ 'transition-all duration-300 ease-out': animated }"
        :style="{
          width: `${percentage}%`,
          backgroundColor: color,
          boxShadow: `0 0 10px ${color}80`,
        }"
      />
    </div>
  </div>
</template>
