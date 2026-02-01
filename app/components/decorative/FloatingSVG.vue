<script setup lang="ts">
/**
 * SVG décoratif flottant
 * Utilisé comme élément secondaire sur les bords
 */
import { ref, computed, onMounted, onUnmounted } from "vue";
import { useDegradation } from "#imports";

interface Props {
  src: string;
  position: "left" | "right";
  top?: number; // Position verticale en %
  size?: number;
  floatAmplitude?: number;
  floatSpeed?: number;
  rotateOnScroll?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  top: 50,
  size: 80,
  floatAmplitude: 15,
  floatSpeed: 1,
  rotateOnScroll: true,
});

const { $gsap, $ScrollTrigger } = useNuxtApp();
const { level, factors, scrollProgress } = useDegradation();

const element = ref<HTMLElement | null>(null);
const baseOffset = ref({ x: 0, y: 0 });
const rotation = ref(0);

let animationFrame: number;
let scrollTrigger: any = null;

const elementStyle = computed(() => {
  const deg = level.value;
  const isLeft = props.position === "left";

  // Plus visible pendant le chaos au lieu de disparaître
  return {
    width: `${props.size}px`,
    height: `${props.size}px`,
    [props.position]: `-${props.size * 0.3}px`,
    top: `${props.top}%`,
    transform: `
      translate(${baseOffset.value.x}px, ${baseOffset.value.y}px)
      rotate(${rotation.value}deg)
      scale(${1 + deg * 0.3})
    `,
    filter: `
      blur(${Math.max(0, deg * 1.5 - 0.5)}px)
      saturate(${1 + deg * 0.5})
      hue-rotate(${deg * 45}deg)
    `,
    opacity: Math.min(0.9, 0.4 + deg * 0.5),
  };
});

const animate = () => {
  const time = Date.now() * 0.001 * props.floatSpeed;
  const deg = level.value;

  // Mouvement de flottement naturel
  baseOffset.value.x = Math.sin(time * 0.7) * props.floatAmplitude * (1 + deg);
  baseOffset.value.y =
    Math.cos(time * 0.5) * props.floatAmplitude * 0.6 * (1 + deg);

  // Rotation basée sur le scroll
  if (props.rotateOnScroll) {
    rotation.value =
      scrollProgress.value * 360 * (props.position === "left" ? 1 : -1);
  }

  // Dérive supplémentaire avec la dégradation
  if (deg > 0.3) {
    baseOffset.value.y += deg * 50;
  }

  animationFrame = requestAnimationFrame(animate);
};

onMounted(async () => {
  await nextTick();
  animate();
});

onUnmounted(() => {
  if (animationFrame) cancelAnimationFrame(animationFrame);
});
</script>

<template>
  <div
    ref="element"
    class="pointer-events-none fixed z-0"
    :style="elementStyle"
  >
    <img
      :src="src"
      :alt="'Décoration'"
      class="h-full w-full object-contain"
      draggable="false"
    />
  </div>
</template>
