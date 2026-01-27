<script setup lang="ts">
/**
 * Forme géométrique flottante qui se dégrade
 * Utilisée comme élément décoratif de fond
 */
import { ref, computed, onMounted, onUnmounted } from "vue";
import { useDegradation } from "#imports";

interface Props {
  shape?: "circle" | "square" | "triangle" | "blob";
  color?: "pink" | "blue" | "yellow" | "green";
  size?: number;
  x?: number;
  y?: number;
  instability?: number;
}

const props = withDefaults(defineProps<Props>(), {
  shape: "circle",
  color: "pink",
  size: 100,
  x: 50,
  y: 50,
  instability: 1,
});

const { $gsap } = useNuxtApp();
const { level, thresholds } = useDegradation();

const element = ref<HTMLElement | null>(null);

const colorMap = {
  pink: "#FF66C8",
  blue: "#6BFFFF",
  yellow: "#FFF746",
  green: "#BBFF42",
};

const currentColor = computed(() => colorMap[props.color]);

// Position qui dérive avec la dégradation
const position = ref({ x: props.x, y: props.y });
const rotation = ref(0);
const currentScale = ref(1);

// Style calculé
const shapeStyle = computed(() => {
  const deg = level.value;
  const inst = props.instability;

  let borderRadius = "0";
  let clipPath = "none";

  switch (props.shape) {
    case "circle":
      borderRadius = "50%";
      break;
    case "square":
      borderRadius = `${deg * 30 * inst}%`; // Devient rond progressivement
      break;
    case "triangle":
      clipPath = "polygon(50% 0%, 0% 100%, 100% 100%)";
      break;
    case "blob":
      borderRadius = `${30 + Math.random() * 40}% ${30 + Math.random() * 40}% ${30 + Math.random() * 40}% ${30 + Math.random() * 40}%`;
      break;
  }

  return {
    width: `${props.size}px`,
    height: `${props.size}px`,
    left: `${position.value.x}%`,
    top: `${position.value.y}%`,
    backgroundColor: currentColor.value,
    borderRadius,
    clipPath,
    transform: `
      translate(-50%, -50%)
      rotate(${rotation.value}deg)
      scale(${currentScale.value})
    `,
    opacity: Math.max(0.1, 0.6 - deg * 0.4),
    filter: `
      blur(${deg * 20 * inst}px)
      saturate(${1 + deg * 2})
    `,
    mixBlendMode: (deg > 0.5 ? "difference" : "normal") as
      | "difference"
      | "normal",
  };
});

let animationFrame: number;

const animate = () => {
  const deg = level.value;
  const inst = props.instability;
  const time = Date.now() * 0.001;

  // Mouvement fluide de base
  position.value.x = props.x + Math.sin(time * 0.5) * 5 * (1 + deg * inst);
  position.value.y = props.y + Math.cos(time * 0.3) * 5 * (1 + deg * inst);

  // Rotation accélérée avec dégradation
  rotation.value += 0.2 + deg * 2 * inst;

  // Pulsation d'échelle
  currentScale.value = 1 + Math.sin(time * 2) * 0.1 * (1 + deg * inst);

  // Dérive vers le bas quand dégradé
  if (deg > 0.5) {
    position.value.y = Math.min(position.value.y + deg * 0.1, 120);
  }

  animationFrame = requestAnimationFrame(animate);
};

onMounted(() => {
  animate();
});

onUnmounted(() => {
  if (animationFrame) {
    cancelAnimationFrame(animationFrame);
  }
});
</script>

<template>
  <div
    ref="element"
    class="pointer-events-none absolute transition-[filter] duration-300"
    :style="shapeStyle"
  />
</template>
