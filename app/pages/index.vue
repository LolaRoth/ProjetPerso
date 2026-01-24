<script setup lang="ts">
const title = ref<HTMLElement | null>(null);
const subtitle = ref<HTMLElement | null>(null);
const button = ref<HTMLElement | null>(null);

// const { slideInUp, scaleIn } = useGsap();

// onMounted(() => {
//   slideInUp(title, 0.8, 0);
//   slideInUp(subtitle, 0.8, 0.2);
//   scaleIn(button, 0.6, 0.5);
// });
</script>

<template>
  <main class="flex min-h-screen flex-col items-center justify-center p-8">
    <h1
      ref="title"
      class="text-5xl font-bold text-center mb-4 bg-gradient-to-r from-green-400 to-blue-500 bg-clip-text text-transparent"
    >
      Bienvenue sur Nuxt + GSAP
    </h1>
    <h1 class="font-bricolage text-4xl text-MyPink">Titre</h1>
<p class="font-candy text-lg">Texte stylé</p>

    <p ref="subtitle" class="text-xl text-gray-400 text-center mb-8 max-w-md">
      Un projet configuré avec TypeScript, Tailwind CSS et GSAP pour des
      animations fluides.
    </p>

    <button
      ref="button"
      class="px-6 py-3 bg-gradient-to-r from-green-500 to-blue-600 rounded-lg font-semibold hover:scale-105 transition-transform duration-200"
    >
      Commencer
    </button>
  </main>
</template>
