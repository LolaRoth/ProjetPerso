<template>
  <div
    class="fixed inset-0 bg-MyBlack text-white overflow-hidden select-none"
    :class="{
      'screen-shake': phase === 'result',
      'screen-shake-quiz':
        phase === 'quiz' && (currentQuestionIndex > 0 || loopCount > 0),
      'site-breaking': phase === 'result',
      'site-unstable': phase === 'quiz',
      'total-corruption': destructionLevel > 2,
      'screen-shatter': destructionLevel > 1.5,
    }"
    :style="{
      filter:
        phase === 'result'
          ? `hue-rotate(${Math.sin(scrollOffset * 0.1) * 10 * (1 + loopCount * 0.5)}deg) saturate(${1.2 + Math.sin(scrollOffset * 0.05) * 0.3 + loopCount * 0.2}) ${loopCount > 2 ? 'contrast(1.3)' : ''}`
          : destructionLevel > 0.5
            ? `hue-rotate(${Math.sin(scrollOffset * 0.05) * 5 * destructionLevel}deg)`
            : 'none',
      transform:
        destructionLevel > 1.5
          ? `perspective(1000px) rotateX(${Math.sin(scrollOffset * 0.02) * 2}deg) rotateY(${Math.cos(scrollOffset * 0.02) * 2}deg)`
          : 'none',
    }"
  >
    <!-- ==================== INDICATEUR DE CORRUPTION (DEBUG) ==================== -->
    <div
      v-if="destructionLevel > 0.3"
      class="fixed top-2 right-2 z-[100] font-mono text-[8px] text-red-500/30 pointer-events-none"
    >
      CORRUPTION: {{ (destructionLevel * 100).toFixed(0) }}% | LOOP:
      {{ loopCount }}
    </div>

    <!-- ==================== ÉCRAN CASSÉ OVERLAY ==================== -->
    <div
      v-if="phase === 'result' || destructionLevel > 1"
      class="absolute inset-0 pointer-events-none z-50 broken-screen-overlay"
      :style="{ opacity: Math.min(1, 0.3 + destructionLevel * 0.3) }"
    >
      <!-- Fissures d'écran - plus nombreuses avec destruction -->
      <svg
        class="absolute inset-0 w-full h-full"
        :style="{ opacity: 0.2 + loopCount * 0.1 }"
      >
        <line
          x1="0"
          y1="0"
          x2="45%"
          y2="60%"
          stroke="white"
          stroke-width="1"
          class="crack-line"
        />
        <line
          x1="45%"
          y1="60%"
          x2="30%"
          y2="100%"
          stroke="white"
          stroke-width="1"
          class="crack-line"
        />
        <line
          x1="45%"
          y1="60%"
          x2="70%"
          y2="85%"
          stroke="white"
          stroke-width="0.5"
          class="crack-line"
        />
        <line
          x1="100%"
          y1="20%"
          x2="60%"
          y2="50%"
          stroke="white"
          stroke-width="1"
          class="crack-line"
        />
        <line
          x1="60%"
          y1="50%"
          x2="80%"
          y2="100%"
          stroke="white"
          stroke-width="0.5"
          class="crack-line"
        />
        <!-- Fissures supplémentaires avec les loops -->
        <template v-if="loopCount > 0">
          <line
            x1="20%"
            y1="0"
            x2="50%"
            y2="40%"
            stroke="white"
            stroke-width="0.8"
            class="crack-line"
          />
          <line
            x1="80%"
            y1="0"
            x2="60%"
            y2="30%"
            stroke="white"
            stroke-width="0.5"
            class="crack-line"
          />
        </template>
        <template v-if="loopCount > 1">
          <line
            x1="0"
            y1="40%"
            x2="40%"
            y2="70%"
            stroke="white"
            stroke-width="1"
            class="crack-line"
          />
          <line
            x1="100%"
            y1="60%"
            x2="70%"
            y2="90%"
            stroke="white"
            stroke-width="0.8"
            class="crack-line"
          />
          <line
            x1="30%"
            y1="100%"
            x2="50%"
            y2="50%"
            stroke="white"
            stroke-width="0.5"
            class="crack-line"
          />
        </template>
        <template v-if="loopCount > 2">
          <line
            x1="10%"
            y1="20%"
            x2="40%"
            y2="50%"
            stroke="#ff66c8"
            stroke-width="1"
            class="crack-line"
          />
          <line
            x1="90%"
            y1="30%"
            x2="60%"
            y2="60%"
            stroke="#6bffff"
            stroke-width="1"
            class="crack-line"
          />
          <line
            x1="50%"
            y1="0"
            x2="50%"
            y2="100%"
            stroke="white"
            stroke-width="0.5"
            class="crack-line"
            style="opacity: 0.3"
          />
        </template>
      </svg>
      <!-- Dead pixels - plus nombreux -->
      <div
        v-for="n in 15 + loopCount * 10"
        :key="`dead-pixel-${n}`"
        class="absolute bg-black dead-pixel"
        :style="{
          left: `${(n * 17 + loopCount * 7) % 100}%`,
          top: `${(n * 23 + loopCount * 13) % 100}%`,
          width: `${2 + (n % 3) * 2 + loopCount}px`,
          height: `${2 + (n % 4) * 2 + loopCount}px`,
        }"
      />
      <!-- Pixels colorés qui apparaissent avec les loops -->
      <template v-if="loopCount > 1">
        <div
          v-for="n in loopCount * 5"
          :key="`glitch-pixel-${n}`"
          class="absolute dead-pixel"
          :style="{
            left: `${(n * 31) % 100}%`,
            top: `${(n * 37) % 100}%`,
            width: `${3 + (n % 4)}px`,
            height: `${3 + (n % 3)}px`,
            backgroundColor:
              n % 3 === 0 ? '#ff66c8' : n % 3 === 1 ? '#6bffff' : '#fff746',
            opacity: 0.3 + loopCount * 0.1,
          }"
        />
      </template>
    </div>

    <!-- ==================== FOND CHAOTIQUE EN MOUVEMENT ==================== -->
    <div class="absolute inset-0 pointer-events-none">
      <!-- ===== EFFETS DE BUG ÉCRAN (phases intro/quiz) ===== -->

      <!-- Glitch horizontal bands - ADAPTÉ À LA DESTRUCTION -->
      <div class="absolute inset-0 overflow-hidden">
        <div
          v-for="band in glitchBands"
          :key="band.id"
          class="absolute left-0 right-0 glitch-band-anim"
          :style="{
            top: `${band.y}%`,
            height: `${band.height * chaosIntensity * 2 * (1 + destructionLevel * 0.5)}px`,
            transform: `translateX(${band.offset * chaosIntensity * 3 * (1 + destructionLevel)}px) skewX(${band.skew * chaosIntensity * 2 * (1 + destructionLevel * 0.3)}deg)`,
            backgroundColor: band.color,
            opacity:
              band.opacity *
              chaosIntensity *
              1.5 *
              (1 + destructionLevel * 0.2),
            animationDelay: `${band.delay}s`,
            animationDuration: `${band.duration / (chaosIntensity * 2 * (1 + destructionLevel * 0.5))}s`,
          }"
        />
      </div>

      <!-- Scanlines CRT effet - PLUS VISIBLE AVEC DESTRUCTION -->
      <div
        class="absolute inset-0 scanlines-effect"
        :style="{
          opacity:
            (0.15 + Math.sin(scrollOffset * 0.02) * 0.08) *
            chaosIntensity *
            2 *
            (1 + destructionLevel * 0.3),
        }"
      />

      <!-- RGB Split / Aberration chromatique - AMPLIFIÉ -->
      <div
        class="absolute inset-0 rgb-split-effect"
        :style="{
          '--split-x': `${(4 + Math.sin(scrollOffset * 0.03) * 3) * chaosIntensity * 3 * (1 + destructionLevel * 0.5)}px`,
          '--split-y': `${Math.cos(scrollOffset * 0.02) * 2 * chaosIntensity * 3 * (1 + destructionLevel * 0.5)}px`,
          opacity:
            (0.6 + Math.sin(scrollOffset * 0.015) * 0.3) *
            chaosIntensity *
            (1 + destructionLevel * 0.2),
        }"
      />

      <!-- Noise grain animé - AMPLIFIÉ -->
      <div
        class="absolute inset-0 noise-grain"
        :style="{
          opacity:
            (0.06 + Math.random() * 0.04) *
            chaosIntensity *
            2.5 *
            (1 + destructionLevel * 0.4),
        }"
      />

      <!-- Vertical sync error lines -->
      <div class="absolute inset-0 overflow-hidden">
        <div
          v-for="vline in verticalGlitchLines"
          :key="vline.id"
          class="absolute top-0 bottom-0 vertical-tear"
          :style="{
            left: `${vline.x}%`,
            width: `${vline.width * chaosIntensity * 2}px`,
            backgroundColor: vline.color,
            opacity: vline.opacity * chaosIntensity * 1.5,
            transform: `translateY(${Math.sin(scrollOffset * vline.speed) * 20 * chaosIntensity}px)`,
          }"
        />
      </div>

      <!-- Screen flicker effect - plus fréquent avec le chaos -->
      <div
        v-if="Math.random() > 1 - chaosIntensity * 0.15"
        class="absolute inset-0 bg-white/5 screen-flicker"
        :style="{ opacity: chaosIntensity * 0.3 }"
      />

      <!-- ===== EFFET TV MAL BRANCHÉE (transition de phase) ===== -->
      <Transition name="tv-glitch">
        <div
          v-if="isPhaseTransitioning"
          class="absolute inset-0 z-50 tv-bad-signal"
        >
          <!-- Heavy static noise -->
          <div class="absolute inset-0 tv-heavy-static" />
          <!-- Horizontal rolling bars -->
          <div class="absolute inset-0 tv-rolling-bars" />
          <!-- Color distortion -->
          <div class="absolute inset-0 tv-color-bleed" />
          <!-- Vertical hold issue -->
          <div class="absolute inset-0 tv-vertical-hold" />
          <!-- Flash blanc -->
          <div class="absolute inset-0 bg-white/20 tv-flash" />
        </div>
      </Transition>

      <!-- ===== EFFETS DE GRÉSILLEMENT ===== -->

      <!-- Static TV noise (neige) -->
      <div
        v-if="phase === 'intro' || phase === 'quiz'"
        class="absolute inset-0 static-noise"
        :style="{ opacity: 0.04 + Math.sin(scrollOffset * 0.05) * 0.02 }"
      />

      <!-- Horizontal tearing effect -->
      <div class="absolute inset-0 overflow-hidden">
        <div
          v-for="tear in horizontalTears"
          :key="tear.id"
          class="absolute left-0 right-0 h-tearing"
          :style="{
            top: `${tear.y}%`,
            height: `${tear.height * chaosIntensity * 1.5}px`,
            transform: `translateX(${tear.offset * chaosIntensity * 2}px)`,
            opacity: tear.opacity * chaosIntensity * 1.5,
          }"
        />
      </div>

      <!-- Interlace lines (effet entrelacé TV) -->
      <div
        class="absolute inset-0 interlace-lines"
        :style="{
          opacity:
            (0.06 + Math.sin(scrollOffset * 0.03) * 0.03) * chaosIntensity * 2,
        }"
      />

      <!-- Random glitch blocks -->
      <div class="absolute inset-0 overflow-hidden">
        <div
          v-for="block in glitchBlocks"
          :key="block.id"
          class="absolute glitch-block"
          :style="{
            left: `${block.x}%`,
            top: `${block.y}%`,
            width: `${block.width * chaosIntensity * 1.5}px`,
            height: `${block.height * chaosIntensity * 1.5}px`,
            backgroundColor: block.color,
            opacity: block.opacity * chaosIntensity * 1.5,
            transform: `skewX(${block.skew * chaosIntensity}deg)`,
          }"
        />
      </div>

      <!-- Chromatic jitter (micro-décalages de couleur) -->
      <div
        class="absolute inset-0 chromatic-jitter"
        :style="{
          '--jitter-x': `${Math.sin(scrollOffset * 0.1) * 3 * chaosIntensity}px`,
          '--jitter-y': `${Math.cos(scrollOffset * 0.08) * 2 * chaosIntensity}px`,
        }"
      />

      <!-- Gradients statiques subtils -->
      <div
        class="absolute inset-0"
        style="
          background:
            radial-gradient(
              ellipse 80% 60% at 30% 20%,
              rgba(255, 102, 200, 0.15) 0%,
              transparent 50%
            ),
            radial-gradient(
              ellipse 60% 80% at 70% 80%,
              rgba(107, 255, 255, 0.12) 0%,
              transparent 50%
            ),
            radial-gradient(
              ellipse 50% 50% at 50% 50%,
              rgba(255, 247, 70, 0.08) 0%,
              transparent 70%
            );
        "
      />

      <!-- ===== FORMES SUBTILES QUI BOUGENT (avant le chaos) ===== -->
      <div
        v-if="phase === 'intro' || phase === 'quiz'"
        class="absolute inset-0 overflow-hidden"
      >
        <!-- Cercle flottant 1 -->
        <div
          class="absolute w-32 h-32 rounded-full border border-white/5 subtle-float"
          :style="{
            left: `${15 + Math.sin(scrollOffset * 0.008) * 8}%`,
            top: `${20 + Math.cos(scrollOffset * 0.006) * 10}%`,
            transform: `rotate(${scrollOffset * 0.02}deg)`,
          }"
        />
        <!-- Cercle flottant 2 -->
        <div
          class="absolute w-20 h-20 rounded-full border border-MyPink/10 subtle-float-reverse"
          :style="{
            right: `${10 + Math.cos(scrollOffset * 0.01) * 6}%`,
            top: `${35 + Math.sin(scrollOffset * 0.007) * 8}%`,
            transform: `rotate(${-scrollOffset * 0.015}deg)`,
          }"
        />
        <!-- Carré flottant -->
        <div
          class="absolute w-16 h-16 border border-MyBlue/8 subtle-float"
          :style="{
            left: `${70 + Math.sin(scrollOffset * 0.009) * 5}%`,
            bottom: `${25 + Math.cos(scrollOffset * 0.008) * 7}%`,
            transform: `rotate(${45 + scrollOffset * 0.025}deg)`,
          }"
        />
      </div>

      <!-- Grille infinie qui défile -->
      <div
        class="absolute inset-0 opacity-[0.03]"
        :style="{
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)
          `,
          backgroundSize: '60px 60px',
          transform: `translateY(${scrollOffset % 60}px)`,
        }"
      />

      <!-- Lignes de scan horizontales -->
      <div
        v-for="n in 8"
        :key="`scan-${n}`"
        class="absolute left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent"
        :style="{
          top: `${(n * 12.5 + scrollOffset * 0.3) % 100}%`,
          opacity: 0.4 + Math.sin(scrollOffset * 0.01 + n) * 0.3,
        }"
      />

      <!-- Orbes flottantes -->
      <div
        v-for="orb in floatingOrbs"
        :key="orb.id"
        class="absolute rounded-full blur-2xl"
        :style="{
          width: `${orb.size}px`,
          height: `${orb.size}px`,
          left: `${orb.x + Math.sin(scrollOffset * orb.speed + orb.phase) * 5}%`,
          top: `${((orb.y + scrollOffset * orb.drift) % 120) - 10}%`,
          backgroundColor: orb.color,
          opacity: orb.opacity,
        }"
      />

      <!-- Fragments d'interface qui flottent -->
      <div
        v-for="fragment in interfaceFragments"
        :key="fragment.id"
        class="absolute font-mono text-xs whitespace-nowrap"
        :style="{
          left: `${fragment.x}%`,
          top: `${((fragment.y + scrollOffset * fragment.speed) % 130) - 15}%`,
          color: fragment.color,
          opacity: fragment.opacity,
          transform: `rotate(${fragment.rotation + scrollOffset * 0.02}deg)`,
          fontSize: `${fragment.size}px`,
        }"
      >
        {{ fragment.text }}
      </div>

      <!-- Formes géométriques dérivantes -->
      <div
        v-for="shape in floatingShapes"
        :key="shape.id"
        class="absolute border"
        :style="{
          width: `${shape.size}px`,
          height: `${shape.size}px`,
          left: `${shape.x + Math.cos(scrollOffset * shape.speed) * 3}%`,
          top: `${((shape.y + scrollOffset * shape.drift) % 120) - 10}%`,
          borderColor: shape.color,
          borderRadius:
            shape.type === 'circle'
              ? '50%'
              : shape.type === 'diamond'
                ? '0'
                : '4px',
          transform: `rotate(${shape.rotation + scrollOffset * shape.rotSpeed}deg)`,
          opacity: shape.opacity,
        }"
      />

      <!-- Lignes de code qui scrollent sur le côté gauche -->
      <div
        class="absolute left-0 top-0 bottom-0 w-48 overflow-hidden opacity-[0.06]"
      >
        <div
          class="font-mono text-[10px] text-MyBlue whitespace-pre leading-relaxed"
          :style="{ transform: `translateY(${-scrollOffset * 0.5}px)` }"
        >
          <div v-for="(line, i) in codeLines" :key="i" class="px-2">
            {{ line }}
          </div>
        </div>
      </div>

      <!-- ===== EFFETS CHAOS MAXIMUM POUR PHASE RESULT ===== -->
      <template v-if="phase === 'result'">
        <!-- Gros blocs de glitch aléatoires -->
        <div
          v-for="n in 5"
          :key="`mega-glitch-${n}`"
          class="absolute mega-glitch-block"
          :style="{
            left: `${(scrollOffset * 0.7 + n * 73) % 100}%`,
            top: `${(scrollOffset * 0.5 + n * 41) % 100}%`,
            width: `${60 + Math.sin(scrollOffset * 0.1 + n) * 40}px`,
            height: `${20 + Math.cos(scrollOffset * 0.15 + n) * 15}px`,
            background:
              n % 2 === 0
                ? 'rgba(255, 102, 200, 0.4)'
                : 'rgba(107, 255, 255, 0.35)',
            transform: `skewX(${Math.sin(scrollOffset * 0.2 + n) * 30}deg) translateX(${Math.sin(scrollOffset * 0.3) * 50}px)`,
            opacity: 0.4 + Math.sin(scrollOffset * 0.1 + n * 2) * 0.3,
          }"
        />

        <!-- Screen tear horizontal massif -->
        <div
          v-if="Math.random() > 0.85"
          class="absolute left-0 right-0 screen-tear-massive"
          :style="{
            top: `${Math.random() * 100}%`,
            height: `${4 + Math.random() * 8}px`,
            background:
              'linear-gradient(90deg, transparent, rgba(255,255,255,0.8), transparent)',
            transform: `translateX(${(Math.random() - 0.5) * 100}px)`,
          }"
        />

        <!-- Corruption de pixels -->
        <div
          v-for="n in 12"
          :key="`corrupt-${n}`"
          class="absolute pixel-corrupt"
          :style="{
            left: `${(n * 17 + scrollOffset * 0.4) % 100}%`,
            top: `${(n * 23 + scrollOffset * 0.3) % 100}%`,
            width: `${8 + Math.random() * 20}px`,
            height: `${2 + Math.random() * 6}px`,
            background: ['#ff66c8', '#6bffff', '#fff746', '#ff4444'][n % 4],
            opacity: 0.5 + Math.sin(scrollOffset * 0.2 + n) * 0.3,
          }"
        />

        <!-- Signal perdu effect -->
        <div
          class="absolute inset-0 signal-lost"
          :style="{ opacity: 0.02 + Math.sin(scrollOffset * 0.15) * 0.02 }"
        />

        <!-- VHS tracking lines -->
        <div
          v-for="n in 3"
          :key="`vhs-${n}`"
          class="absolute left-0 right-0 vhs-tracking"
          :style="{
            top: `${(n * 33 + scrollOffset * 2) % 100}%`,
            height: '4px',
            opacity: 0.15 + Math.sin(scrollOffset * 0.1 + n) * 0.1,
          }"
        />

        <!-- Texte d'erreur qui clignote -->
        <div
          class="absolute error-text font-mono text-red-500/60"
          :style="{
            left: `${20 + Math.sin(scrollOffset * 0.05) * 10}%`,
            top: `${15 + Math.cos(scrollOffset * 0.04) * 5}%`,
            fontSize: '10px',
            opacity: Math.sin(scrollOffset * 0.3) > 0.5 ? 0.6 : 0,
            transform: `rotate(${Math.sin(scrollOffset * 0.02) * 5}deg)`,
          }"
        >
          ERROR_OVERFLOW_0x7F3A
        </div>

        <div
          class="absolute error-text font-mono text-red-500/50"
          :style="{
            right: `${15 + Math.cos(scrollOffset * 0.06) * 8}%`,
            bottom: `${20 + Math.sin(scrollOffset * 0.05) * 6}%`,
            fontSize: '9px',
            opacity: Math.cos(scrollOffset * 0.25) > 0.3 ? 0.5 : 0,
            transform: `rotate(${Math.cos(scrollOffset * 0.03) * -8}deg)`,
          }"
        >
          MEMORY_LEAK_CRITICAL
        </div>

        <!-- Bruit de fond intense -->
        <div class="absolute inset-0 heavy-noise" :style="{ opacity: 0.06 }" />
      </template>
    </div>

    <!-- ==================== FRAGMENTS D'INTERFACE BRISÉE QUI FLOTTENT ==================== -->
    <div
      v-if="destructionLevel > 0.5"
      class="absolute inset-0 pointer-events-none z-20 overflow-hidden"
    >
      <!-- Fragments de boutons cassés -->
      <div
        v-for="n in Math.floor(destructionLevel * 4)"
        :key="`broken-btn-${n}`"
        class="absolute font-bricolage text-xs px-3 py-1 rounded-full border border-zinc-700 text-zinc-500 bg-white/5 drift-away"
        :style="{
          ...getDestructionStyle(100 + n, 200),
          left: `${(n * 27) % 90}%`,
          top: `${(n * 33) % 90}%`,
          '--explode-x': `${(n - 2) * 15}px`,
          '--explode-y': `${(n - 2) * -10}px`,
          '--explode-r': `${(n - 2) * 5}deg`,
        }"
      >
        {{ ["Valider", "Suivant", "OK", "Annuler"][n % 4] }}
      </div>

      <!-- Fragments de texte qui dérivent -->
      <div
        v-for="n in Math.floor(destructionLevel * 3)"
        :key="`broken-text-${n}`"
        class="absolute font-mono text-[10px] text-white/30 text-disintegrate"
        :style="{
          ...getDestructionStyle(110 + n, 180),
          left: `${(n * 41) % 85}%`,
          top: `${(n * 37) % 85}%`,
        }"
      >
        {{
          [
            "Lorem ipsum",
            "Question #?",
            "Score: ???",
            "...loading",
            "undefined",
          ][n % 5]
        }}
      </div>

      <!-- Indicateurs de progression brisés -->
      <div
        v-for="n in Math.floor(destructionLevel * 5)"
        :key="`broken-indicator-${n}`"
        class="absolute w-2 h-2 rounded-full fragment-explode"
        :style="{
          ...getDestructionStyle(120 + n, 150),
          left: `${(n * 19) % 95}%`,
          top: `${(n * 23) % 95}%`,
          backgroundColor: [
            '#bbff42',
            '#ff66c8',
            '#6bffff',
            '#fff746',
            '#ffffff',
          ][n % 5],
          opacity: 0.4,
          '--explode-x': `${(n - 3) * 12}px`,
          '--explode-y': `${(n - 3) * -8}px`,
          '--explode-r': `${(n - 3) * 8}deg`,
        }"
      />

      <!-- Icônes cassées -->
      <template v-if="destructionLevel > 1">
        <div
          v-for="n in Math.floor((destructionLevel - 1) * 3)"
          :key="`broken-icon-${n}`"
          class="absolute text-white/20 drift-away"
          :style="{
            ...getDestructionStyle(130 + n, 200),
            left: `${(n * 31) % 90}%`,
            top: `${(n * 43) % 90}%`,
            fontSize: `${16 + n * 4}px`,
          }"
        >
          {{ ["✓", "✗", "💡", "🔄", "⚠️", "❌"][n % 6] }}
        </div>
      </template>

      <!-- Morceaux d'input qui flottent -->
      <template v-if="destructionLevel > 1.5">
        <div
          v-for="n in Math.floor((destructionLevel - 1.5) * 2)"
          :key="`broken-input-${n}`"
          class="absolute px-4 py-2 border-b border-zinc-600 bg-transparent text-white/20 font-bricolage text-sm ui-melt"
          :style="{
            ...getDestructionStyle(140 + n, 220),
            left: `${(n * 37) % 80}%`,
            top: `${(n * 47) % 80}%`,
            width: `${80 + n * 20}px`,
          }"
        >
          {{ ["...", "error", "???", ""][n % 4] }}
        </div>
      </template>

      <!-- Messages système brisés qui volent partout -->
      <template v-if="loopCount > 0">
        <div
          v-for="n in loopCount * 3"
          :key="`flying-error-${n}`"
          class="absolute font-mono text-[9px] shake-subtle"
          :style="{
            ...getDestructionStyle(150 + n, 250),
            left: `${(n * 29) % 95}%`,
            top: `${(n * 31) % 95}%`,
            color: [
              'rgba(255,102,200,0.5)',
              'rgba(107,255,255,0.4)',
              'rgba(255,247,70,0.4)',
              'rgba(239,68,68,0.5)',
            ][n % 4],
          }"
        >
          {{ ["ERR", "NULL", "0x7F", "NaN", "void", "???", "!@#"][n % 7] }}
        </div>
      </template>
    </div>

    <!-- ==================== VIGNETTE OVERLAY ==================== -->
    <div
      class="absolute inset-0 pointer-events-none"
      style="
        background: radial-gradient(
          ellipse at center,
          transparent 0%,
          transparent 40%,
          rgba(0, 0, 0, 0.6) 100%
        );
      "
    />

    <!-- ==================== CONTENU PRINCIPAL ==================== -->
    <div class="relative z-10 h-full flex items-center justify-center p-6">
      <!-- ===== PHASE INTRO: TEMPS PASSÉ - DÉJÀ INSTABLE ===== -->
      <div
        v-if="phase === 'intro'"
        class="text-center max-w-xl animate-fade-in-slow relative"
      >
        <!-- Avertissement système en haut -->
        <div class="absolute -top-20 left-1/2 -translate-x-1/2 w-full">
          <p
            class="font-mono text-[10px] text-yellow-500/40 flicker-text text-center"
          >
            ⚠ ATTENTION_DEFICIT_DETECTED ⚠
          </p>
        </div>

        <p
          class="font-bricolage text-zinc-600 text-sm mb-4 tracking-widest uppercase shake-subtle"
        >
          Tu as passé
        </p>
        <p
          class="font-candy text-7xl md:text-9xl text-transparent bg-clip-text bg-gradient-to-b from-white via-white/80 to-white/40 mb-6 glitch-text"
          data-text="{{ formattedTime }}"
          :style="{
            textShadow: `${Math.sin(scrollOffset * 0.05) * 2}px 0 #ff66c8, ${Math.cos(scrollOffset * 0.05) * -2}px 0 #6bffff`,
          }"
        >
          {{ formattedTime }}
        </p>
        <p
          class="font-bricolage text-lg text-zinc-500 mb-4 corrupted-text-anim"
        >
          {{ timeMessage }}
        </p>

        <!-- Code d'erreur discret -->
        <p class="font-mono text-[8px] text-red-500/30 mt-2">
          [ process_id: {{ Math.floor(scrollOffset) % 9999 }} | status: UNSTABLE
          ]
        </p>

        <div class="mt-8 flex justify-center gap-1">
          <span
            v-for="n in 3"
            :key="n"
            class="w-2 h-2 rounded-full bg-white/30 animate-pulse"
            :class="{ 'bg-red-500/50': n === 2 }"
            :style="{ animationDelay: `${n * 0.3}s` }"
          />
        </div>

        <!-- Message de transition omineux -->
        <p class="font-mono text-[9px] text-zinc-700 mt-6 blink-text">
          &gt; initializing attention_test.exe...
        </p>
      </div>

      <!-- ===== QUIZ DIRECT - SITE QUI SE CASSE ET S'ÉPARPILLE ===== -->
      <div
        v-if="phase === 'quiz'"
        class="w-full max-w-lg animate-fade-in relative"
        :style="getDestructionStyle(0, 20)"
      >
        <!-- Erreurs système qui apparaissent pendant le quiz - s'éparpillent -->
        <div
          v-if="currentQuestionIndex > 0 || loopCount > 0"
          class="absolute -top-16 left-0 right-0 flex justify-between pointer-events-none"
          :style="getDestructionStyle(1, 40)"
        >
          <span
            class="font-mono text-[9px] text-red-500/50 shake-subtle"
            :style="getDestructionStyle(2, 60)"
            >ERR_TIMEOUT</span
          >
          <span
            class="font-mono text-[9px] text-yellow-500/40 shake-subtle"
            style="animation-delay: 0.2s"
            :style="getDestructionStyle(3, 60)"
            >WARN: lag_detected</span
          >
        </div>

        <!-- Messages d'erreur additionnels qui flottent avec la destruction -->
        <template v-if="destructionLevel > 0.5">
          <span
            class="absolute font-mono text-[8px] text-red-500/40 pointer-events-none"
            :style="{
              ...getDestructionStyle(10, 100),
              top: '10%',
              left: '0',
            }"
            >CRITICAL_FAILURE</span
          >
          <span
            class="absolute font-mono text-[8px] text-MyPink/30 pointer-events-none"
            :style="{
              ...getDestructionStyle(11, 120),
              bottom: '20%',
              right: '0',
            }"
            >MEMORY_OVERFLOW</span
          >
        </template>
        <template v-if="destructionLevel > 1">
          <span
            class="absolute font-mono text-[10px] text-yellow-500/50 pointer-events-none shake-medium"
            :style="{
              ...getDestructionStyle(12, 150),
              top: '40%',
              left: '-10%',
            }"
            >⚠ UNSTABLE ⚠</span
          >
          <span
            class="absolute font-mono text-[7px] text-MyBlue/40 pointer-events-none"
            :style="{
              ...getDestructionStyle(13, 130),
              top: '60%',
              right: '-15%',
            }"
            >null_ptr_exception</span
          >
        </template>

        <!-- Temps passé discret en haut - devient glitché et se décale -->
        <div
          class="absolute top-6 left-1/2 -translate-x-1/2 text-center"
          :style="getDestructionStyle(4, 30)"
        >
          <p
            class="font-candy text-2xl"
            :class="
              currentQuestionIndex > 1 || loopCount > 0
                ? 'color-bleed text-white/40'
                : 'text-white/20'
            "
          >
            {{ formattedTime }}
          </p>
          <p
            class="font-bricolage text-[10px]"
            :class="
              currentQuestionIndex > 0 || loopCount > 0
                ? 'text-red-500/50 glitch-char'
                : 'text-zinc-700'
            "
          >
            {{
              loopCount > 0
                ? `BOUCLE #${loopCount + 1} - CORRUPTION`
                : currentQuestionIndex > 0
                  ? "SYSTÈME INSTABLE"
                  : "dans le chaos"
            }}
          </p>
        </div>

        <!-- Indicateur de progression - chaque point s'éparpille différemment -->
        <div
          class="flex justify-center gap-2 mb-12"
          :style="getDestructionStyle(5, 25)"
        >
          <div
            v-for="n in selectedQuestions.length"
            :key="n"
            class="w-2 h-2 rounded-full transition-all duration-300"
            :class="[
              n - 1 < currentQuestionIndex
                ? 'bg-MyGreen'
                : n - 1 === currentQuestionIndex
                  ? 'bg-white'
                  : 'bg-zinc-800',
              currentQuestionIndex > 1 || loopCount > 0 ? 'shake-subtle' : '',
            ]"
            :style="{
              ...getDestructionStyle(20 + n, 35),
              animationDelay: `${n * 0.1}s`,
            }"
          />
        </div>

        <!-- Question - devient instable et se déplace -->
        <div class="text-center mb-8" :style="getDestructionStyle(6, 40)">
          <p
            class="font-bricolage text-xl md:text-2xl leading-relaxed"
            :class="
              currentQuestionIndex > 1 || loopCount > 0
                ? 'text-corrupt-heavy text-white/80'
                : 'text-white/90'
            "
            :style="getDestructionStyle(7, 20)"
          >
            {{ currentQuestion?.question }}
          </p>
          <!-- Texte bugué sous la question -->
          <p
            v-if="currentQuestionIndex > 0 || loopCount > 0"
            class="font-mono text-[8px] text-MyPink/30 mt-2"
            :style="{
              ...getDestructionStyle(8, 50),
              transform: `translateX(${Math.sin(scrollOffset * 0.1) * 5 + getDestructionOffset(8, 30).x}px)`,
            }"
          >
            {{
              loopCount > 1
                ? "████ REALITY.EXE CRASHED ████"
                : currentQuestionIndex > 1
                  ? "█▓▒░ CORRUPTION DETECTED ░▒▓█"
                  : "// loading next..."
            }}
          </p>
        </div>

        <!-- Input - devient instable et s'échappe progressivement -->
        <div
          class="relative mb-6"
          :class="
            currentQuestionIndex > 1 || loopCount > 0 ? 'shake-subtle' : ''
          "
          :style="getDestructionStyle(9, 50)"
        >
          <input
            ref="answerInput"
            v-model="currentAnswer"
            type="text"
            placeholder="..."
            class="w-full px-6 py-5 bg-transparent border-b-2 text-center font-bricolage text-2xl text-white placeholder-zinc-700 focus:outline-none transition-colors"
            :class="[
              currentQuestionIndex > 1 || loopCount > 0
                ? 'border-red-500/30 focus:border-red-500/50'
                : 'border-zinc-800 focus:border-zinc-600',
              destructionLevel > 1 ? 'input-glitch' : '',
            ]"
            :style="
              destructionLevel > 0.5
                ? {
                    transform: `skewX(${Math.sin(scrollOffset * 0.05) * destructionLevel * 3}deg)`,
                  }
                : {}
            "
            @keydown.enter="handleSubmit"
            :disabled="answered"
          />
          <!-- Curseur bugué -->
          <span
            v-if="(currentQuestionIndex > 0 || loopCount > 0) && !currentAnswer"
            class="absolute left-1/2 top-1/2 -translate-y-1/2 font-mono text-MyPink/50 blink-cursor"
            :style="getDestructionStyle(30, 20)"
            >|</span
          >
        </div>

        <!-- Feedback - se décale avec la destruction -->
        <div
          class="h-16 flex items-center justify-center"
          :style="getDestructionStyle(31, 30)"
        >
          <div
            v-if="answered"
            class="animate-fade-in text-center"
            :style="getDestructionStyle(32, 25)"
          >
            <p
              v-if="lastAnswerCorrect"
              class="text-MyGreen font-bricolage flex items-center gap-2 justify-center"
              :style="getDestructionStyle(33, 15)"
            >
              <span class="text-2xl">✓</span>
              <span>Tu l'avais vu.</span>
            </p>
            <div
              v-else
              class="text-center"
              :style="getDestructionStyle(34, 20)"
            >
              <p class="font-bricolage text-red-400/80 mb-2">
                C'était
                <span class="text-white">{{
                  currentQuestion?.correctAnswer
                }}</span>
              </p>
              <p class="font-bricolage text-xs text-zinc-600">
                Retour au chaos dans {{ redirectCountdown }}s...
              </p>
            </div>
          </div>
        </div>

        <!-- Actions - les boutons s'échappent -->
        <div
          class="flex justify-center gap-4 mt-8"
          :style="getDestructionStyle(35, 40)"
        >
          <button
            v-if="
              !answered &&
              currentQuestion?.hint &&
              !showHints[currentQuestion.id]
            "
            @click="useHint"
            class="px-4 py-2 text-zinc-600 hover:text-MyYellow font-bricolage text-sm transition-colors"
            :style="getDestructionStyle(36, 50)"
          >
            💡 indice
          </button>
          <span
            v-else-if="showHints[currentQuestion?.id || '']"
            class="text-xs text-MyYellow/50 font-bricolage"
            :style="getDestructionStyle(37, 30)"
          >
            {{ currentQuestion?.hint }}
          </span>
        </div>

        <div
          class="flex justify-center mt-4"
          :style="getDestructionStyle(38, 45)"
        >
          <button
            v-if="!answered"
            @click="handleSubmit"
            :disabled="!currentAnswer.trim()"
            class="px-8 py-3 bg-white/10 hover:bg-white/20 rounded-full font-bricolage text-white transition-all disabled:opacity-30 disabled:cursor-not-allowed"
            :style="getDestructionStyle(39, 60)"
            :class="destructionLevel > 1 ? 'button-flee' : ''"
          >
            Valider
          </button>
          <button
            v-else-if="lastAnswerCorrect"
            @click="goToNext"
            class="px-8 py-3 bg-white/10 hover:bg-white/20 rounded-full font-bricolage text-white transition-all"
            :style="getDestructionStyle(40, 55)"
            :class="destructionLevel > 1 ? 'button-flee' : ''"
          >
            {{
              currentQuestionIndex < selectedQuestions.length - 1
                ? "Suivant"
                : "Voir les résultats"
            }}
          </button>
          <!-- Si erreur, pas de bouton - redirection automatique -->
        </div>
      </div>

      <!-- ===== PHASE RÉSULTATS ===== -->
      <div
        v-else-if="phase === 'result'"
        class="text-center max-w-2xl animate-fade-in-slow relative"
      >
        <!-- Texte de code bugé qui flotte - encore plus éparpillé avec les loops -->
        <div class="absolute inset-0 overflow-hidden pointer-events-none">
          <div
            v-for="n in 8 + loopCount * 4"
            :key="`code-bug-${n}`"
            class="absolute font-mono text-xs code-bug-text"
            :style="{
              left: `${(n * 23 + scrollOffset * 0.2 + getDestructionOffset(50 + n, 200).x) % 100}%`,
              top: `${(n * 31 + scrollOffset * 0.15 + getDestructionOffset(50 + n, 200).y) % 100}%`,
              color:
                n % 2 === 0
                  ? 'rgba(255, 102, 200, 0.4)'
                  : 'rgba(107, 255, 255, 0.35)',
              transform: `rotate(${Math.sin(scrollOffset * 0.05 + n) * 15 + getDestructionOffset(50 + n, 100).rotation}deg) scale(${1 + loopCount * 0.1})`,
              opacity:
                0.3 + Math.sin(scrollOffset * 0.1 + n) * 0.2 + loopCount * 0.1,
              fontSize: `${10 + loopCount * 2}px`,
            }"
          >
            {{ glitchCodeSnippets[n % glitchCodeSnippets.length] }}
          </div>
        </div>

        <!-- Message simple de fin - EPARPILLÉ -->
        <div class="mb-12 shake-element" :style="getDestructionStyle(60, 80)">
          <p
            class="font-candy text-6xl md:text-8xl text-transparent bg-clip-text bg-gradient-to-b from-white via-white/60 to-white/20 mb-6 result-title-glitch glitch-text"
            data-text="Fin."
            :style="{
              ...getDestructionStyle(61, 50),
              textShadow: `${10 * destructionLevel}px ${5 * destructionLevel}px 60px rgba(255, 102, 200, ${0.3 + destructionLevel * 0.2}), ${-10 * destructionLevel}px ${-5 * destructionLevel}px 120px rgba(107, 255, 255, ${0.2 + destructionLevel * 0.15})`,
            }"
          >
            {{ loopCount > 2 ? "F̴̨i̷n̵.̷" : loopCount > 0 ? "F̷in." : "Fin." }}
          </p>
          <p
            class="font-bricolage text-zinc-500 text-lg corrupted-text-anim"
            :style="getDestructionStyle(62, 60)"
          >
            <span
              class="inline-block shake-subtle"
              :style="getDestructionStyle(63, 30)"
              >{{ loopCount > 1 ? "Le" : "L'expérience" }}</span
            >
            <span
              class="inline-block glitch-char"
              :style="{
                ...getDestructionStyle(64, 35),
                animationDelay: '0.1s',
              }"
              >{{ loopCount > 1 ? "système" : "est" }}</span
            >
            <span
              class="inline-block shake-subtle"
              :style="{
                ...getDestructionStyle(65, 40),
                animationDelay: '0.2s',
              }"
              >{{ loopCount > 1 ? "est cassé." : "terminée." }}</span
            >
          </p>
        </div>

        <!-- Score final avec effet glitch - DÉSTRUCTURÉ -->
        <div
          class="mb-8 p-6 rounded-2xl bg-white/5 border border-white/10 inline-block shake-box relative overflow-hidden"
          :style="{
            ...getDestructionStyle(66, 100),
            borderColor: loopCount > 1 ? 'rgba(255, 102, 200, 0.3)' : undefined,
          }"
        >
          <div class="absolute inset-0 scan-line-fast"></div>
          <p
            class="font-bricolage text-xs text-zinc-600 uppercase tracking-widest mb-2 flicker-text"
            :style="getDestructionStyle(67, 20)"
          >
            {{ loopCount > 2 ? "SC0R3 D_4TT3NT!0N" : "Score d'attention" }}
          </p>
          <p
            class="font-candy text-4xl text-transparent bg-clip-text bg-gradient-to-r from-MyPink to-MyBlue number-glitch"
            :style="getDestructionStyle(68, 25)"
          >
            <span
              class="inline-block"
              :style="{
                ...getDestructionStyle(69, 15),
                transform: `translateX(${Math.sin(scrollOffset * 0.2) * 2 * destructionLevel}px)`,
              }"
              >{{ score.correct }}</span
            >
            <span
              class="text-white/30 mx-1 blink-cursor"
              :style="getDestructionStyle(70, 20)"
              >/</span
            >
            <span
              class="inline-block"
              :style="{
                ...getDestructionStyle(71, 15),
                transform: `translateX(${Math.cos(scrollOffset * 0.2) * 2 * destructionLevel}px)`,
              }"
              >{{ score.total }}</span
            >
          </p>
        </div>

        <!-- Citation finale avec effet de corruption - S'ÉPARPILLE -->
        <div class="relative mb-16" :style="getDestructionStyle(72, 90)">
          <p
            class="font-bricolage text-sm text-zinc-700 max-w-sm mx-auto italic leading-relaxed text-corrupt"
            :style="getDestructionStyle(73, 40)"
          >
            <span
              class="inline-block hover-glitch"
              :style="getDestructionStyle(74, 25)"
              >{{
                loopCount > 1
                  ? "« ERROR: quote.load() failed »"
                  : "« Nous regardons sans voir."
              }}</span
            ><br />
            <span
              class="inline-block hover-glitch"
              :style="{
                ...getDestructionStyle(75, 30),
                animationDelay: '0.5s',
              }"
              >{{
                loopCount > 1
                  ? ">> SYSTEM_CORRUPTED <<"
                  : "L'attention est devenue le plus rare des luxes. »"
              }}</span
            >
          </p>
          <!-- Code superposé -->
          <div
            class="absolute inset-0 flex items-center justify-center pointer-events-none"
          >
            <span
              class="font-mono text-[8px] text-MyPink/20 code-overlay"
              :style="getDestructionStyle(76, 50)"
            >
              {{ codeOverlayText }}
            </span>
          </div>
        </div>

        <!-- Messages d'erreur aléatoires qui tremblent - MULTIPLIÉS PAR LOOP -->
        <div
          class="absolute top-10 left-5 error-popup shake-intense"
          :style="getDestructionStyle(80, 150)"
        >
          <span
            class="font-mono text-[10px] text-red-500/70 bg-red-500/10 px-2 py-1 rounded"
            >FATAL_ERROR_0x8B3F</span
          >
        </div>
        <div
          class="absolute top-20 right-8 error-popup shake-subtle"
          style="animation-delay: 0.3s"
          :style="getDestructionStyle(81, 140)"
        >
          <span
            class="font-mono text-[9px] text-yellow-500/60 bg-yellow-500/10 px-2 py-1 rounded"
            >WARNING: memory_leak</span
          >
        </div>
        <div
          class="absolute bottom-32 left-10 error-popup shake-intense"
          style="animation-delay: 0.6s"
          :style="getDestructionStyle(82, 130)"
        >
          <span
            class="font-mono text-[10px] text-cyan-500/60 bg-cyan-500/10 px-2 py-1 rounded"
            >nullptr_exception</span
          >
        </div>
        <div
          class="absolute bottom-40 right-5 error-popup shake-subtle"
          style="animation-delay: 0.9s"
          :style="getDestructionStyle(83, 120)"
        >
          <span
            class="font-mono text-[9px] text-MyPink/60 bg-MyPink/10 px-2 py-1 rounded"
            >stack_overflow</span
          >
        </div>

        <!-- Messages d'erreur SUPPLÉMENTAIRES qui apparaissent avec les loops -->
        <template v-if="loopCount > 0">
          <div
            class="absolute error-popup shake-intense"
            :style="{
              ...getDestructionStyle(84, 200),
              top: '30%',
              left: '15%',
            }"
          >
            <span
              class="font-mono text-[11px] text-red-600/80 bg-red-600/20 px-3 py-2 rounded border border-red-500/30"
              >⚠ CRITICAL: reality.exe stopped</span
            >
          </div>
        </template>
        <template v-if="loopCount > 1">
          <div
            class="absolute error-popup shake-medium"
            :style="{
              ...getDestructionStyle(85, 180),
              top: '50%',
              right: '5%',
            }"
          >
            <span
              class="font-mono text-[12px] text-MyPink/90 bg-MyPink/20 px-3 py-2 rounded border border-MyPink/40"
              >LOOP_DETECTED: infinite recursion</span
            >
          </div>
          <div
            class="absolute error-popup shake-intense"
            :style="{
              ...getDestructionStyle(86, 220),
              bottom: '15%',
              left: '5%',
            }"
          >
            <span
              class="font-mono text-[10px] text-yellow-400/80 bg-yellow-500/20 px-2 py-1 rounded"
              >⚠ HEAP_CORRUPTION</span
            >
          </div>
        </template>
        <template v-if="loopCount > 2">
          <div
            class="absolute error-popup shake-intense"
            :style="{
              ...getDestructionStyle(87, 250),
              top: '15%',
              left: '40%',
            }"
          >
            <span
              class="font-mono text-[14px] text-red-500 bg-black/90 px-4 py-3 rounded border-2 border-red-500 blink-text"
              >💀 SYSTEM FAILURE 💀</span
            >
          </div>
          <div
            class="absolute error-popup shake-medium"
            :style="{
              ...getDestructionStyle(88, 230),
              bottom: '25%',
              right: '20%',
            }"
          >
            <span
              class="font-mono text-[11px] text-cyan-400/80 bg-cyan-500/20 px-3 py-2 rounded"
              >segmentation_fault (core dumped)</span
            >
          </div>
          <div
            class="absolute error-popup shake-subtle"
            :style="{
              ...getDestructionStyle(89, 200),
              top: '60%',
              left: '25%',
            }"
          >
            <span
              class="font-mono text-[9px] text-green-500/70 bg-green-500/10 px-2 py-1 rounded"
              >virus.consciousness.exe</span
            >
          </div>
        </template>

        <!-- Console de debug bugée - PLUS CHAOTIQUE -->
        <div
          class="absolute bottom-5 left-5 font-mono text-[8px] text-green-500/40 debug-console shake-subtle"
          :style="getDestructionStyle(90, 100)"
        >
          <div class="typing-effect">> system.attention.check()</div>
          <div class="typing-effect" style="animation-delay: 1s">
            > ERROR: user.focus = null
          </div>
          <div class="typing-effect" style="animation-delay: 2s">
            {{
              loopCount > 1
                ? "> LOOP_COUNT: " + loopCount
                : "> attempting recovery..."
            }}
          </div>
          <div class="blink-text" style="animation-delay: 3s">
            {{ loopCount > 2 ? "> ABORT_ABORT_ABORT_" : "> FAILED_" }}
          </div>
        </div>

        <!-- Bouton recommencer avec effet hover amélioré - S'ÉCHAPPE -->
        <button
          @click="restartAll"
          class="group relative inline-flex items-center gap-3 px-10 py-4 border border-zinc-700 rounded-full font-bricolage text-sm text-zinc-500 hover:text-white hover:border-MyPink/50 transition-all duration-500 overflow-hidden shake-button button-flee-result"
          :style="{
            ...getDestructionStyle(91, 120),
            borderColor: loopCount > 1 ? 'rgba(255, 102, 200, 0.5)' : undefined,
          }"
        >
          <span
            class="absolute inset-0 bg-gradient-to-r from-MyPink/10 to-MyBlue/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
          ></span>
          <span class="absolute inset-0 glitch-overlay-btn"></span>
          <svg
            class="w-4 h-4 relative z-10 group-hover:rotate-[-360deg] transition-transform duration-700 spin-glitch"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
          <span class="relative z-10 glitch-char">{{
            loopCount > 2 ? "R̷e̴c̵o̶m̸m̵e̴n̵c̸e̶r̷" : "Recommencer"
          }}</span>
        </button>

        <!-- Bouton restart quiz - seulement visible après des loops -->
        <button
          v-if="loopCount < 3"
          @click="restartQuiz"
          class="group relative mt-4 inline-flex items-center gap-3 px-8 py-3 border border-zinc-800 rounded-full font-bricolage text-xs text-zinc-600 hover:text-white hover:border-MyBlue/50 transition-all duration-500 overflow-hidden"
          :style="getDestructionStyle(92, 100)"
        >
          <span class="relative z-10">🔄 Refaire le quiz</span>
        </button>
        <p
          v-else
          class="mt-4 font-mono text-[10px] text-red-500/50 shake-subtle"
          :style="getDestructionStyle(93, 50)"
        >
          [ RESTART_BLOCKED: trop de boucles détectées ]
        </p>
      </div>
    </div>

    <!-- ==================== GRAIN SUBTIL ==================== -->
    <div
      class="absolute inset-0 pointer-events-none opacity-[0.015]"
      style="
        background-image: url(&quot;data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMDAiIGhlaWdodD0iMzAwIj48ZmlsdGVyIGlkPSJhIiB4PSIwIiB5PSIwIj48ZmVUdXJidWxlbmNlIGJhc2VGcmVxdWVuY3k9Ii43NSIgc3RpdGNoVGlsZXM9InN0aXRjaCIgdHlwZT0iZnJhY3RhbE5vaXNlIi8+PC9maWx0ZXI+PHJlY3Qgd2lkdGg9IjMwMCIgaGVpZ2h0PSIzMDAiIGZpbHRlcj0idXJsKCNhKSIgb3BhY2l0eT0iMSIvPjwvc3ZnPg==&quot;);
      "
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from "vue";
import {
  useAttentionQuiz,
  ATTENTION_QUESTIONS,
} from "~/composables/useAttentionQuiz";
import { useDegradation } from "~/composables/useDegradation";
import { useRouter } from "vue-router";

// Protection de la route - authentification obligatoire
definePageMeta({
  middleware: ["auth"],
});

// ==================== QUIZ ====================
const {
  currentQuestionIndex,
  showHints,
  quizCompleted,
  quizStarted,
  selectedQuestions,
  currentQuestion,
  score,
  endMessage,
  initQuiz,
  submitAnswer,
  nextQuestion,
  showHint,
} = useAttentionQuiz();

// ==================== PHASES ====================
type Phase = "intro" | "quiz" | "result";
const phase = ref<Phase>("intro");
const isPhaseTransitioning = ref(false);
let phaseTransitionTimeout: ReturnType<typeof setTimeout> | null = null;

// Watcher pour déclencher l'effet TV mal branchée lors des transitions
watch(phase, (newPhase, oldPhase) => {
  if (newPhase !== oldPhase) {
    // Déclencher l'effet de transition
    isPhaseTransitioning.value = true;
    if (phaseTransitionTimeout) clearTimeout(phaseTransitionTimeout);
    phaseTransitionTimeout = setTimeout(() => {
      isPhaseTransitioning.value = false;
    }, 600); // Durée de l'effet
  }
});

// ==================== INTENSITÉ DU CHAOS PAR PHASE ====================
const chaosIntensity = computed(() => {
  switch (phase.value) {
    case "intro":
      return 0.7; // Déjà assez intense
    case "quiz":
      // Augmente rapidement avec les questions
      const questionProgress =
        currentQuestionIndex.value /
        Math.max(1, selectedQuestions.value.length - 1);
      return 0.8 + questionProgress * 0.4; // 0.8 -> 1.2 (dépasse 1 pour plus d'intensité)
    case "result":
      return 1.5; // Chaos MAXIMUM - site vraiment cassé
    default:
      return 0.3;
  }
});

// ==================== ÉTAT LOCAL ====================
const currentAnswer = ref("");
const answered = ref(false);
const lastAnswerCorrect = ref(false);
const answerInput = ref<HTMLInputElement | null>(null);
const redirectCountdown = ref(3);
let redirectTimer: ReturnType<typeof setInterval> | null = null;

// ==================== SYSTÈME DE DESTRUCTION PROGRESSIVE ====================
const interactionCount = ref(0); // Compte chaque interaction
const loopCount = ref(0); // Nombre de fois qu'on a recommencé
const clickCount = ref(0); // Nombre total de clics
const keyPressCount = ref(0); // Nombre de touches pressées

// Niveau de destruction global (0 à 1+)
const destructionLevel = computed(() => {
  const base = loopCount.value * 0.3; // Chaque boucle ajoute 30%
  const questionBonus = currentQuestionIndex.value * 0.15; // Chaque question ajoute 15%
  const interactionBonus = Math.min(interactionCount.value * 0.02, 0.5); // Interactions max 50%
  const clickBonus = Math.min(clickCount.value * 0.01, 0.3); // Clics max 30%

  // En phase result, destruction maximale
  if (phase.value === "result") {
    return Math.min(2.5, base + 1.5 + interactionBonus + clickBonus);
  }

  return Math.min(2, base + questionBonus + interactionBonus);
});

// Génère des offsets aléatoires basés sur le niveau de destruction
const getDestructionOffset = (seed: number, maxOffset: number = 50) => {
  const chaos = destructionLevel.value;
  const randomX =
    Math.sin(seed * 12.9898 + scrollOffset.value * 0.01) * maxOffset * chaos;
  const randomY =
    Math.cos(seed * 78.233 + scrollOffset.value * 0.01) * maxOffset * chaos;
  const randomRotation =
    Math.sin(seed * 43.758 + scrollOffset.value * 0.02) * 30 * chaos;
  const randomScale = 1 + (Math.cos(seed * 93.989) - 0.5) * 0.3 * chaos;

  return {
    x: randomX,
    y: randomY,
    rotation: randomRotation,
    scale: Math.max(0.5, Math.min(1.5, randomScale)),
    opacity: Math.max(0.3, 1 - chaos * 0.2),
  };
};

// Style destructeur pour les éléments
const getDestructionStyle = (seed: number, maxOffset: number = 50) => {
  const offset = getDestructionOffset(seed, maxOffset);
  return {
    transform: `translate(${offset.x}px, ${offset.y}px) rotate(${offset.rotation}deg) scale(${offset.scale})`,
    opacity: offset.opacity,
    transition: "transform 0.5s cubic-bezier(0.23, 1, 0.32, 1)",
  };
};

// Écouter les interactions
const trackInteraction = () => {
  interactionCount.value++;
};

const trackClick = () => {
  clickCount.value++;
  trackInteraction();
};

const trackKeyPress = () => {
  keyPressCount.value++;
  if (keyPressCount.value % 3 === 0) {
    // Chaque 3 touches
    trackInteraction();
  }
};

// Compteur de boucles lors du restart
const incrementLoop = () => {
  loopCount.value++;
};

// ==================== TEMPS ====================
const timeSpentSeconds = ref(0);

const formattedTime = computed(() => {
  const hours = Math.floor(timeSpentSeconds.value / 3600);
  const minutes = Math.floor((timeSpentSeconds.value % 3600) / 60);
  const seconds = timeSpentSeconds.value % 60;

  if (hours > 0) {
    return `${hours}h${minutes}m`;
  } else if (minutes > 0) {
    return `${minutes}m${seconds}s`;
  } else {
    return `${seconds}s`;
  }
});

const timeMessage = computed(() => {
  const t = timeSpentSeconds.value;
  if (t < 60) return "Un passage éclair dans le chaos digital.";
  if (t < 180) return "Assez pour se perdre, pas assez pour tout voir.";
  if (t < 300) return "Le temps file quand l'attention dérive.";
  if (t < 600) return "Tu t'es laissé absorber par l'expérience.";
  if (t < 900) return "Profondément immergé dans le flux.";
  return "Un voyage complet à travers le chaos.";
});

// ==================== ANIMATION DE SCROLL CONTINU ====================
const scrollOffset = ref(0);
let scrollAnimationFrame: number;
let isAnimating = true;

const animateScroll = () => {
  if (!isAnimating) return;
  scrollOffset.value += 0.5;
  scrollAnimationFrame = requestAnimationFrame(animateScroll);
};

// ==================== TEXTES DE CODE GLITCHÉS ====================
const glitchCodeSnippets = [
  "if(attention === null) { crash(); }",
  "while(true) { forget(); }",
  "try { focus() } catch { void }",
  "const mind = undefined;",
  "return ERROR_0x7F3A;",
  "memory.leak(infinite);",
  "user.brain.overflow();",
  "async function chaos() {}",
  "throw new LostException();",
  "/* TODO: fix reality */",
  "console.error('HELP');",
  "process.exit(1);",
];

const codeOverlayText = computed(() => {
  const idx = Math.floor(scrollOffset.value * 0.05) % glitchCodeSnippets.length;
  return glitchCodeSnippets[idx];
});

// ==================== ÉLÉMENTS VISUELS ====================
const floatingOrbs = computed(() => {
  const colors = [
    "rgba(255, 102, 200, 0.15)",
    "rgba(107, 255, 255, 0.12)",
    "rgba(255, 247, 70, 0.1)",
    "rgba(187, 255, 66, 0.08)",
  ];
  return Array.from({ length: 6 }, (_, i) => ({
    id: `orb-${i}`,
    x: 10 + ((i * 15) % 80),
    y: 5 + ((i * 20) % 90),
    size: 150 + ((i * 50) % 200),
    color: colors[i % colors.length],
    speed: 0.002 + i * 0.001,
    drift: 0.02 + i * 0.01,
    phase: i * 1.5,
    opacity: 0.5,
  }));
});

const interfaceFragments = computed(() => {
  const fragments = [
    { text: "ERREUR", color: "rgba(255, 102, 200, 0.3)" },
    { text: "404", color: "rgba(107, 255, 255, 0.25)" },
    { text: "LOADING...", color: "rgba(255, 255, 255, 0.15)" },
    { text: "undefined", color: "rgba(255, 247, 70, 0.2)" },
    { text: "NULL", color: "rgba(187, 255, 66, 0.2)" },
    { text: "TIMEOUT", color: "rgba(107, 255, 255, 0.25)" },
    { text: "LOST", color: "rgba(255, 102, 200, 0.2)" },
    { text: "VOID", color: "rgba(138, 43, 226, 0.3)" },
  ];
  return fragments.map((f, i) => ({
    id: `frag-${i}`,
    text: f.text,
    color: f.color,
    x: 5 + ((i * 11) % 90),
    y: (i * 13) % 100,
    speed: 0.03 + i * 0.015,
    rotation: -15 + ((i * 7) % 30),
    opacity: 0.6,
    size: 10 + (i % 3) * 2,
  }));
});

const floatingShapes = computed(() => {
  const types = ["circle", "square", "diamond"] as const;
  const colors = [
    "rgba(255, 102, 200, 0.2)",
    "rgba(107, 255, 255, 0.15)",
    "rgba(255, 247, 70, 0.15)",
  ];
  return Array.from({ length: 12 }, (_, i) => ({
    id: `shape-${i}`,
    type: types[i % 3],
    x: 8 + ((i * 8) % 85),
    y: (i * 11) % 100,
    size: 20 + ((i * 5) % 40),
    color: colors[i % colors.length],
    rotation: i * 30,
    rotSpeed: 0.05 + i * 0.02,
    speed: 0.003 + i * 0.002,
    drift: 0.025 + i * 0.008,
    opacity: 0.4,
  }));
});

// Bandes de glitch horizontales
const glitchBands = computed(() => {
  const colors = [
    "rgba(255, 102, 200, 0.3)",
    "rgba(107, 255, 255, 0.25)",
    "rgba(255, 247, 70, 0.2)",
    "rgba(187, 255, 66, 0.2)",
    "rgba(255, 255, 255, 0.15)",
  ];
  return Array.from({ length: 12 }, (_, i) => ({
    id: `glitch-${i}`,
    y: (i * 8 + Math.sin(scrollOffset.value * 0.1 + i) * 5) % 100,
    height: 1 + Math.random() * 4,
    offset: Math.sin(scrollOffset.value * 0.05 + i * 2) * 30,
    skew: Math.sin(scrollOffset.value * 0.03 + i) * 10,
    color: colors[i % colors.length],
    opacity: 0.1 + Math.sin(scrollOffset.value * 0.02 + i) * 0.15,
    delay: i * 0.1,
    duration: 0.5 + Math.random() * 0.5,
  }));
});

// Lignes verticales de déchirure
const verticalGlitchLines = computed(() => {
  const colors = [
    "rgba(255, 0, 100, 0.2)",
    "rgba(0, 255, 255, 0.15)",
    "rgba(255, 255, 0, 0.1)",
  ];
  return Array.from({ length: 6 }, (_, i) => ({
    id: `vline-${i}`,
    x: 10 + i * 15 + Math.sin(scrollOffset.value * 0.02 + i) * 5,
    width: 1 + Math.random() * 2,
    color: colors[i % colors.length],
    opacity: 0.2 + Math.sin(scrollOffset.value * 0.03 + i * 1.5) * 0.15,
    speed: 0.02 + i * 0.01,
  }));
});

// Horizontal tearing (déchirures horizontales)
const horizontalTears = computed(() => {
  return Array.from({ length: 8 }, (_, i) => ({
    id: `tear-${i}`,
    y: (i * 12 + Math.sin(scrollOffset.value * 0.08 + i * 2) * 8) % 100,
    height: 2 + Math.random() * 6,
    offset: Math.sin(scrollOffset.value * 0.1 + i * 3) * 40,
    opacity: 0.15 + Math.sin(scrollOffset.value * 0.06 + i) * 0.1,
  }));
});

// Blocs de glitch aléatoires
const glitchBlocks = computed(() => {
  const colors = [
    "rgba(255, 102, 200, 0.4)",
    "rgba(107, 255, 255, 0.35)",
    "rgba(255, 247, 70, 0.3)",
    "rgba(255, 255, 255, 0.2)",
  ];
  return Array.from({ length: 6 }, (_, i) => ({
    id: `block-${i}`,
    x: (i * 17 + Math.sin(scrollOffset.value * 0.04 + i) * 10) % 95,
    y: (i * 14 + Math.cos(scrollOffset.value * 0.05 + i * 2) * 8) % 95,
    width: 20 + Math.random() * 80,
    height: 2 + Math.random() * 8,
    color: colors[i % colors.length],
    opacity: Math.sin(scrollOffset.value * 0.08 + i * 1.5) > 0.7 ? 0.3 : 0,
    skew: Math.sin(scrollOffset.value * 0.03 + i) * 15,
  }));
});

const codeLines = computed(() => {
  const lines = [
    "const attention = null;",
    "while (true) { scroll(); }",
    "if (time > 0) waste(time);",
    "return undefined;",
    'throw new Error("focus");',
    "await distraction();",
    "memory.clear();",
    "consciousness.fade();",
    "// TODO: be present",
    'import { chaos } from "life";',
    "export default void 0;",
    "delete reality.meaning;",
    'console.log("...");',
    "break; // never reached",
    "continue; // forever",
  ];
  // Répéter pour créer un scroll infini
  return [...lines, ...lines, ...lines, ...lines, ...lines];
});

// ==================== SCORE GRADIENT ====================
const scoreGradientClass = computed(() => {
  const p = score.value.percentage;
  if (p >= 80)
    return "bg-gradient-to-b from-MyGreen via-MyGreen/70 to-MyGreen/30";
  if (p >= 60)
    return "bg-gradient-to-b from-MyYellow via-MyYellow/70 to-MyYellow/30";
  if (p >= 40) return "bg-gradient-to-b from-MyBlue via-MyBlue/70 to-MyBlue/30";
  return "bg-gradient-to-b from-MyPink via-MyPink/70 to-MyPink/30";
});

// ==================== ACTIONS ====================
const router = useRouter();

// Reset global progression and navigate home
const { reset } = useDegradation();
const restartAll = () => {
  try {
    reset();
  } catch (e) {}
  // clear any local storage tracking
  try {
    localStorage.removeItem("chaosTimeSpent");
  } catch (e) {}
  router.push("/");
};

const startRedirectCountdown = () => {
  redirectCountdown.value = 3;
  redirectTimer = setInterval(() => {
    redirectCountdown.value--;
    if (redirectCountdown.value <= 0) {
      if (redirectTimer) clearInterval(redirectTimer);
      router.push("/");
    }
  }, 1000);
};

const restartQuiz = () => {
  incrementLoop(); // Augmente le niveau de destruction !
  currentAnswer.value = "";
  answered.value = false;
  lastAnswerCorrect.value = false;
  initQuiz(5);
  phase.value = "quiz";
  nextTick(() => {
    answerInput.value?.focus();
  });
};

const handleSubmit = () => {
  if (!currentAnswer.value.trim() || answered.value) return;

  if (currentQuestion.value) {
    lastAnswerCorrect.value = submitAnswer(
      currentQuestion.value.id,
      currentAnswer.value,
    );
    answered.value = true;

    // Si mauvaise réponse, démarrer le countdown de redirection
    if (!lastAnswerCorrect.value) {
      startRedirectCountdown();
    }
  }
};

const goToNext = () => {
  currentAnswer.value = "";
  answered.value = false;
  lastAnswerCorrect.value = false;

  if (currentQuestionIndex.value >= selectedQuestions.value.length - 1) {
    nextQuestion();
    phase.value = "result";
  } else {
    nextQuestion();
    nextTick(() => {
      answerInput.value?.focus();
    });
  }
};

const useHint = () => {
  if (currentQuestion.value) {
    showHint(currentQuestion.value.id);
  }
};

// Timer pour la transition auto de l'intro
let introTimer: ReturnType<typeof setTimeout> | null = null;

// ==================== LIFECYCLE ====================
onMounted(() => {
  // Récupérer le temps depuis localStorage
  const savedTime = localStorage.getItem("chaosTimeSpent");
  if (savedTime) {
    timeSpentSeconds.value = parseInt(savedTime, 10);
  }

  // Démarrer l'animation de scroll
  animateScroll();

  // Initialiser le quiz
  initQuiz(5);

  // Commencer par la phase intro (affichage du temps)
  phase.value = "intro";

  // Auto-transition vers le quiz après 3.5 secondes
  introTimer = setTimeout(() => {
    phase.value = "quiz";
    nextTick(() => {
      answerInput.value?.focus();
    });
  }, 3500);

  // Tracker les interactions pour la destruction
  document.addEventListener("click", trackClick);
  document.addEventListener("keydown", trackKeyPress);
});

onUnmounted(() => {
  isAnimating = false;
  if (scrollAnimationFrame) {
    cancelAnimationFrame(scrollAnimationFrame);
  }
  if (redirectTimer) {
    clearInterval(redirectTimer);
  }
  if (introTimer) {
    clearTimeout(introTimer);
  }
  // Cleanup des event listeners
  document.removeEventListener("click", trackClick);
  document.removeEventListener("keydown", trackKeyPress);
});
</script>

<style scoped>
.font-candy {
  font-family: "Candy Beans", cursive;
}

/* Animations */
@keyframes spin-slow {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.animate-spin-slow {
  animation: spin-slow 20s linear infinite;
}

@keyframes fade-in-slow {
  from {
    opacity: 0;
    transform: scale(0.98);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

.animate-fade-in-slow {
  animation: fade-in-slow 1.5s ease-out forwards;
}

@keyframes fade-in {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.animate-fade-in {
  animation: fade-in 0.4s ease-out forwards;
}

/* ===== EFFETS DE BUG ÉCRAN ===== */

/* Scanlines CRT */
.scanlines-effect {
  background: repeating-linear-gradient(
    0deg,
    rgba(0, 0, 0, 0.2) 0px,
    rgba(0, 0, 0, 0.2) 1px,
    transparent 1px,
    transparent 3px
  );
  animation: scanlines-scroll 0.1s linear infinite;
}

@keyframes scanlines-scroll {
  0% {
    background-position: 0 0;
  }
  100% {
    background-position: 0 3px;
  }
}

/* RGB Split / Aberration chromatique */
.rgb-split-effect {
  background:
    linear-gradient(90deg, rgba(255, 0, 100, 0.1) 0%, transparent 15%),
    linear-gradient(90deg, transparent 85%, rgba(0, 255, 255, 0.1) 100%);
  animation: rgb-shift 0.08s steps(3) infinite;
}

@keyframes rgb-shift {
  0%,
  100% {
    transform: translate(0, 0);
  }
  33% {
    transform: translate(var(--split-x, 2px), var(--split-y, 0));
  }
  66% {
    transform: translate(
      calc(var(--split-x, 2px) * -1),
      calc(var(--split-y, 0) * -1)
    );
  }
}

/* Noise grain */
.noise-grain {
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E");
  animation: noise-anim 0.15s steps(5) infinite;
}

@keyframes noise-anim {
  0%,
  100% {
    transform: translate(0, 0);
  }
  25% {
    transform: translate(-2%, -1%);
  }
  50% {
    transform: translate(1%, 2%);
  }
  75% {
    transform: translate(-1%, 1%);
  }
}

/* Glitch band animation */
.glitch-band-anim {
  animation: glitch-band-pulse 0.5s ease-in-out infinite alternate;
}

@keyframes glitch-band-pulse {
  0% {
    opacity: 0.05;
    transform: translateX(0) skewX(0deg);
  }
  50% {
    opacity: 0.2;
  }
  100% {
    opacity: 0.1;
    transform: translateX(10px) skewX(2deg);
  }
}

/* Vertical tear effect */
.vertical-tear {
  animation: vertical-tear-flicker 0.3s steps(2) infinite;
}

@keyframes vertical-tear-flicker {
  0%,
  100% {
    opacity: 0.1;
  }
  50% {
    opacity: 0.25;
  }
}

/* Screen flicker */
.screen-flicker {
  animation: flicker 0.1s ease-out;
}

@keyframes flicker {
  0% {
    opacity: 0.1;
  }
  50% {
    opacity: 0.05;
  }
  100% {
    opacity: 0;
  }
}

/* ===== EFFETS DE GRÉSILLEMENT ===== */

/* Static TV noise (neige TV) */
.static-noise {
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 512 512' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='static'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='1.5' numOctaves='3' stitchTiles='stitch' result='noise'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23static)'/%3E%3C/svg%3E");
  animation: static-flicker 0.05s steps(10) infinite;
  mix-blend-mode: overlay;
}

@keyframes static-flicker {
  0%,
  100% {
    transform: translate(0, 0) scale(1.1);
  }
  10% {
    transform: translate(-1%, 1%) scale(1.1);
  }
  20% {
    transform: translate(1%, -1%) scale(1.1);
  }
  30% {
    transform: translate(-2%, 0%) scale(1.1);
  }
  40% {
    transform: translate(0%, 2%) scale(1.1);
  }
  50% {
    transform: translate(2%, -2%) scale(1.1);
  }
  60% {
    transform: translate(-1%, -1%) scale(1.1);
  }
  70% {
    transform: translate(1%, 1%) scale(1.1);
  }
  80% {
    transform: translate(0%, -1%) scale(1.1);
  }
  90% {
    transform: translate(-2%, 2%) scale(1.1);
  }
}

/* Horizontal tearing */
.h-tearing {
  background: linear-gradient(
    90deg,
    transparent 0%,
    rgba(255, 255, 255, 0.1) 20%,
    rgba(255, 102, 200, 0.15) 40%,
    rgba(107, 255, 255, 0.1) 60%,
    rgba(255, 255, 255, 0.1) 80%,
    transparent 100%
  );
  animation: h-tear-shift 0.1s steps(3) infinite;
}

@keyframes h-tear-shift {
  0%,
  100% {
    transform: translateX(0);
  }
  33% {
    transform: translateX(10px);
  }
  66% {
    transform: translateX(-5px);
  }
}

/* Interlace lines (effet entrelacé) */
.interlace-lines {
  background: repeating-linear-gradient(
    0deg,
    transparent 0px,
    transparent 2px,
    rgba(0, 0, 0, 0.3) 2px,
    rgba(0, 0, 0, 0.3) 4px
  );
  animation: interlace-shift 0.08s steps(2) infinite;
}

@keyframes interlace-shift {
  0%,
  100% {
    background-position: 0 0;
  }
  50% {
    background-position: 0 2px;
  }
}

/* Glitch blocks */
.glitch-block {
  animation: block-flicker 0.15s steps(2) infinite;
}

@keyframes block-flicker {
  0%,
  100% {
    opacity: 0;
  }
  50% {
    opacity: 1;
  }
}

/* Chromatic jitter (micro-aberration) */
.chromatic-jitter {
  background:
    linear-gradient(90deg, rgba(255, 0, 0, 0.03) 0%, transparent 10%),
    linear-gradient(90deg, transparent 90%, rgba(0, 255, 255, 0.03) 100%);
  animation: jitter 0.06s steps(4) infinite;
}

@keyframes jitter {
  0%,
  100% {
    transform: translate(0, 0);
  }
  25% {
    transform: translate(var(--jitter-x, 1px), var(--jitter-y, 0));
  }
  50% {
    transform: translate(
      calc(var(--jitter-x, 1px) * -0.5),
      calc(var(--jitter-y, 0) * -0.5)
    );
  }
  75% {
    transform: translate(calc(var(--jitter-x, 1px) * 0.5), var(--jitter-y, 0));
  }
}

/* ===== FORMES SUBTILES QUI BOUGENT ===== */
.subtle-float {
  animation: subtle-float 8s ease-in-out infinite;
}

.subtle-float-reverse {
  animation: subtle-float-reverse 10s ease-in-out infinite;
}

@keyframes subtle-float {
  0%,
  100% {
    opacity: 0.3;
    transform: translateY(0) rotate(0deg);
  }
  50% {
    opacity: 0.5;
    transform: translateY(-15px) rotate(5deg);
  }
}

@keyframes subtle-float-reverse {
  0%,
  100% {
    opacity: 0.25;
    transform: translateY(0) rotate(0deg);
  }
  50% {
    opacity: 0.4;
    transform: translateY(10px) rotate(-5deg);
  }
}

/* ===== EFFET TV MAL BRANCHÉE ===== */

/* Transition d'entrée/sortie */
.tv-glitch-enter-active {
  animation: tv-glitch-in 0.3s ease-out;
}

.tv-glitch-leave-active {
  animation: tv-glitch-out 0.3s ease-in;
}

@keyframes tv-glitch-in {
  0% {
    opacity: 0;
  }
  20% {
    opacity: 1;
  }
  100% {
    opacity: 1;
  }
}

@keyframes tv-glitch-out {
  0% {
    opacity: 1;
  }
  80% {
    opacity: 1;
  }
  100% {
    opacity: 0;
  }
}

/* Container principal */
.tv-bad-signal {
  background: rgba(0, 0, 0, 0.3);
  mix-blend-mode: screen;
}

/* Static noise très intense */
.tv-heavy-static {
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 512 512' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='static'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='2' numOctaves='3' stitchTiles='stitch' result='noise'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23static)'/%3E%3C/svg%3E");
  opacity: 0.4;
  animation: heavy-static-flicker 0.03s steps(15) infinite;
}

@keyframes heavy-static-flicker {
  0%,
  100% {
    transform: translate(0, 0) scale(1.2);
    opacity: 0.5;
  }
  10% {
    transform: translate(-3%, 2%) scale(1.2);
    opacity: 0.3;
  }
  20% {
    transform: translate(2%, -3%) scale(1.2);
    opacity: 0.6;
  }
  30% {
    transform: translate(-1%, 1%) scale(1.2);
    opacity: 0.4;
  }
  40% {
    transform: translate(3%, -1%) scale(1.2);
    opacity: 0.5;
  }
  50% {
    transform: translate(-2%, 3%) scale(1.2);
    opacity: 0.35;
  }
  60% {
    transform: translate(1%, -2%) scale(1.2);
    opacity: 0.55;
  }
  70% {
    transform: translate(-3%, -1%) scale(1.2);
    opacity: 0.45;
  }
  80% {
    transform: translate(2%, 2%) scale(1.2);
    opacity: 0.4;
  }
  90% {
    transform: translate(-1%, -3%) scale(1.2);
    opacity: 0.5;
  }
}

/* Barres horizontales qui roulent */
.tv-rolling-bars {
  background: repeating-linear-gradient(
    0deg,
    transparent 0px,
    transparent 4px,
    rgba(255, 255, 255, 0.1) 4px,
    rgba(255, 255, 255, 0.1) 8px,
    transparent 8px,
    transparent 30px,
    rgba(0, 0, 0, 0.3) 30px,
    rgba(0, 0, 0, 0.3) 35px
  );
  animation: rolling-bars 0.15s linear infinite;
}

@keyframes rolling-bars {
  0% {
    transform: translateY(0);
  }
  100% {
    transform: translateY(35px);
  }
}

/* Saignement de couleur (color bleed) */
.tv-color-bleed {
  background:
    linear-gradient(90deg, rgba(255, 0, 100, 0.15) 0%, transparent 20%),
    linear-gradient(90deg, transparent 80%, rgba(0, 255, 255, 0.15) 100%),
    linear-gradient(180deg, rgba(255, 255, 0, 0.1) 0%, transparent 30%);
  animation: color-bleed-shift 0.08s steps(4) infinite;
}

@keyframes color-bleed-shift {
  0%,
  100% {
    transform: translateX(0);
    opacity: 0.6;
  }
  25% {
    transform: translateX(8px);
    opacity: 0.8;
  }
  50% {
    transform: translateX(-5px);
    opacity: 0.5;
  }
  75% {
    transform: translateX(3px);
    opacity: 0.7;
  }
}

/* Problème de synchronisation verticale */
.tv-vertical-hold {
  background: linear-gradient(
    180deg,
    transparent 0%,
    transparent 40%,
    rgba(255, 255, 255, 0.15) 45%,
    rgba(0, 0, 0, 0.5) 50%,
    rgba(255, 255, 255, 0.1) 55%,
    transparent 60%,
    transparent 100%
  );
  animation: vertical-hold-roll 0.2s linear infinite;
}

@keyframes vertical-hold-roll {
  0% {
    transform: translateY(-100%);
  }
  100% {
    transform: translateY(100%);
  }
}

/* Flash blanc */
.tv-flash {
  animation: tv-flash-pulse 0.1s ease-out;
}

@keyframes tv-flash-pulse {
  0% {
    opacity: 0.4;
  }
  30% {
    opacity: 0.1;
  }
  60% {
    opacity: 0.3;
  }
  100% {
    opacity: 0;
  }
}

/* ==================== EFFETS CHAOS PHASE RESULT ==================== */

/* Gros blocs de glitch */
.mega-glitch-block {
  filter: blur(1px);
  mix-blend-mode: screen;
  animation: mega-glitch-flicker 0.1s steps(2) infinite;
}

@keyframes mega-glitch-flicker {
  0%,
  100% {
    opacity: 0.4;
  }
  50% {
    opacity: 0.2;
  }
}

/* Screen tear massif */
.screen-tear-massive {
  animation: tear-slide 0.05s steps(3) infinite;
}

@keyframes tear-slide {
  0% {
    transform: translateX(-30px);
  }
  50% {
    transform: translateX(30px);
  }
  100% {
    transform: translateX(0);
  }
}

/* Corruption de pixels */
.pixel-corrupt {
  animation: pixel-glitch 0.08s steps(4) infinite;
}

@keyframes pixel-glitch {
  0%,
  100% {
    transform: scaleX(1);
  }
  25% {
    transform: scaleX(2) translateX(5px);
  }
  50% {
    transform: scaleX(0.5) translateX(-10px);
  }
  75% {
    transform: scaleX(1.5) translateX(3px);
  }
}

/* Signal perdu */
.signal-lost {
  background: repeating-linear-gradient(
    0deg,
    transparent,
    transparent 2px,
    rgba(255, 255, 255, 0.1) 2px,
    rgba(255, 255, 255, 0.1) 4px
  );
  animation: signal-static 0.05s steps(10) infinite;
}

@keyframes signal-static {
  0% {
    transform: translateY(0);
  }
  100% {
    transform: translateY(4px);
  }
}

/* VHS tracking */
.vhs-tracking {
  background: linear-gradient(
    180deg,
    transparent,
    rgba(255, 255, 255, 0.3),
    rgba(0, 0, 0, 0.5),
    rgba(255, 255, 255, 0.2),
    transparent
  );
  animation: vhs-roll 0.3s linear infinite;
}

@keyframes vhs-roll {
  0% {
    opacity: 0.3;
  }
  50% {
    opacity: 0.15;
  }
  100% {
    opacity: 0.3;
  }
}

/* Texte d'erreur clignotant */
.error-text {
  text-shadow:
    0 0 5px rgba(255, 0, 0, 0.5),
    2px 0 rgba(0, 255, 255, 0.3),
    -2px 0 rgba(255, 0, 100, 0.3);
  animation: error-glitch 0.2s steps(3) infinite;
}

@keyframes error-glitch {
  0%,
  100% {
    transform: translate(0, 0);
  }
  33% {
    transform: translate(-2px, 1px);
  }
  66% {
    transform: translate(2px, -1px);
  }
}

/* Bruit intense */
.heavy-noise {
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.5'/%3E%3C/svg%3E");
  animation: heavy-noise-shift 0.05s steps(8) infinite;
}

@keyframes heavy-noise-shift {
  0% {
    transform: translate(0, 0);
  }
  25% {
    transform: translate(-2%, 1%);
  }
  50% {
    transform: translate(1%, -2%);
  }
  75% {
    transform: translate(-1%, 2%);
  }
  100% {
    transform: translate(2%, -1%);
  }
}

/* Screen shake pour phase result */
.screen-shake {
  animation: screen-shake-chaos 0.1s ease-in-out infinite;
}

@keyframes screen-shake-chaos {
  0%,
  100% {
    transform: translate(0, 0) rotate(0deg);
  }
  10% {
    transform: translate(-1px, 0.5px) rotate(-0.1deg);
  }
  20% {
    transform: translate(1px, -0.5px) rotate(0.1deg);
  }
  30% {
    transform: translate(-0.5px, 1px) rotate(0deg);
  }
  40% {
    transform: translate(0.5px, -1px) rotate(-0.1deg);
  }
  50% {
    transform: translate(-1px, -0.5px) rotate(0.1deg);
  }
  60% {
    transform: translate(1px, 1px) rotate(0deg);
  }
  70% {
    transform: translate(0.5px, -0.5px) rotate(-0.1deg);
  }
  80% {
    transform: translate(-0.5px, 0.5px) rotate(0.1deg);
  }
  90% {
    transform: translate(0, -1px) rotate(0deg);
  }
}

/* Glitch du titre "Fin" */
.result-title-glitch {
  animation: title-glitch 3s ease-in-out infinite;
  position: relative;
}

@keyframes title-glitch {
  0%,
  90%,
  100% {
    transform: translate(0);
    filter: none;
  }
  91% {
    transform: translate(-3px, 1px) skewX(-2deg);
    filter: hue-rotate(90deg);
  }
  92% {
    transform: translate(3px, -1px) skewX(2deg);
    filter: hue-rotate(-90deg);
  }
  93% {
    transform: translate(-2px, -1px);
    filter: none;
  }
  94% {
    transform: translate(2px, 1px);
    filter: hue-rotate(45deg);
  }
  95% {
    transform: translate(0);
    filter: none;
  }
}

/* Animation fade-in lente pour les résultats */
@keyframes fade-in-slow {
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.animate-fade-in-slow {
  animation: fade-in-slow 1s ease-out forwards;
}

/* ==================== EFFETS DE CHAOS INTENSES ==================== */

/* Tremblement d'éléments */
.shake-element {
  animation: shake-chaos 0.15s ease-in-out infinite;
}

@keyframes shake-chaos {
  0%,
  100% {
    transform: translate(0, 0) rotate(0deg);
  }
  20% {
    transform: translate(-2px, 1px) rotate(-0.5deg);
  }
  40% {
    transform: translate(2px, -1px) rotate(0.5deg);
  }
  60% {
    transform: translate(-1px, -1px) rotate(-0.3deg);
  }
  80% {
    transform: translate(1px, 1px) rotate(0.3deg);
  }
}

.shake-subtle {
  animation: shake-subtle 0.2s ease-in-out infinite;
}

@keyframes shake-subtle {
  0%,
  100% {
    transform: translateX(0);
  }
  25% {
    transform: translateX(-1px);
  }
  75% {
    transform: translateX(1px);
  }
}

.shake-intense {
  animation: shake-intense 0.08s ease-in-out infinite;
}

@keyframes shake-intense {
  0%,
  100% {
    transform: translate(0, 0);
  }
  25% {
    transform: translate(-3px, 2px);
  }
  50% {
    transform: translate(3px, -2px);
  }
  75% {
    transform: translate(-2px, -1px);
  }
}

.shake-box {
  animation: shake-box 0.12s ease-in-out infinite;
}

@keyframes shake-box {
  0%,
  100% {
    transform: translate(0, 0) scale(1);
  }
  25% {
    transform: translate(-1px, 1px) scale(1.005);
  }
  50% {
    transform: translate(1px, -1px) scale(0.995);
  }
  75% {
    transform: translate(-1px, -1px) scale(1.002);
  }
}

.shake-button {
  animation: shake-button 0.3s ease-in-out infinite;
}

@keyframes shake-button {
  0%,
  100% {
    transform: translateX(0);
  }
  10% {
    transform: translateX(-1px);
  }
  30% {
    transform: translateX(1px);
  }
  50% {
    transform: translateX(-0.5px);
  }
  70% {
    transform: translateX(0.5px);
  }
}

/* Texte glitché avec pseudo-éléments */
.glitch-text {
  position: relative;
}

.glitch-text::before,
.glitch-text::after {
  content: attr(data-text);
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: transparent;
}

.glitch-text::before {
  color: #ff66c8;
  animation: glitch-anim-1 0.3s infinite linear alternate-reverse;
  clip-path: polygon(0 0, 100% 0, 100% 45%, 0 45%);
}

.glitch-text::after {
  color: #6bffff;
  animation: glitch-anim-2 0.3s infinite linear alternate-reverse;
  clip-path: polygon(0 55%, 100% 55%, 100% 100%, 0 100%);
}

@keyframes glitch-anim-1 {
  0% {
    transform: translate(0);
  }
  20% {
    transform: translate(-3px, 2px);
  }
  40% {
    transform: translate(3px, -2px);
  }
  60% {
    transform: translate(-2px, 1px);
  }
  80% {
    transform: translate(2px, -1px);
  }
  100% {
    transform: translate(0);
  }
}

@keyframes glitch-anim-2 {
  0% {
    transform: translate(0);
  }
  20% {
    transform: translate(3px, -2px);
  }
  40% {
    transform: translate(-3px, 2px);
  }
  60% {
    transform: translate(2px, -1px);
  }
  80% {
    transform: translate(-2px, 1px);
  }
  100% {
    transform: translate(0);
  }
}

/* Caractère glitché individuel */
.glitch-char {
  animation: glitch-char 0.5s infinite;
  display: inline-block;
}

@keyframes glitch-char {
  0%,
  90%,
  100% {
    transform: translate(0);
    opacity: 1;
  }
  92% {
    transform: translate(-4px, 2px) skewX(-5deg);
    opacity: 0.8;
    color: #ff66c8;
  }
  94% {
    transform: translate(4px, -2px) skewX(5deg);
    opacity: 0.9;
    color: #6bffff;
  }
  96% {
    transform: translate(-2px, -1px);
    opacity: 1;
  }
}

/* Texte de code bugué */
.code-bug-text {
  animation: code-bug 0.1s steps(2) infinite;
  white-space: nowrap;
}

@keyframes code-bug {
  0%,
  100% {
    opacity: 0.4;
    transform: scaleX(1);
  }
  50% {
    opacity: 0.2;
    transform: scaleX(1.02);
  }
}

/* Ligne de scan rapide */
.scan-line-fast {
  background: linear-gradient(
    180deg,
    transparent 0%,
    rgba(255, 255, 255, 0.03) 50%,
    transparent 100%
  );
  animation: scan-fast 0.5s linear infinite;
}

@keyframes scan-fast {
  0% {
    transform: translateY(-100%);
  }
  100% {
    transform: translateY(100%);
  }
}

/* Texte qui clignote */
.flicker-text {
  animation: flicker 0.15s infinite;
}

@keyframes flicker {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.7;
  }
}

/* Nombre qui glitch */
.number-glitch {
  animation: number-glitch 0.2s infinite;
}

@keyframes number-glitch {
  0%,
  95%,
  100% {
    filter: none;
  }
  96% {
    filter: hue-rotate(90deg) saturate(2);
  }
  97% {
    filter: hue-rotate(-90deg) saturate(1.5);
  }
  98% {
    filter: blur(1px);
  }
}

/* Curseur clignotant */
.blink-cursor {
  animation: blink 0.5s step-end infinite;
}

@keyframes blink {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0;
  }
}

/* Texte corrompu animé */
.corrupted-text-anim {
  animation: corrupt-text 2s infinite;
}

@keyframes corrupt-text {
  0%,
  95%,
  100% {
    letter-spacing: normal;
    word-spacing: normal;
  }
  96% {
    letter-spacing: 2px;
    word-spacing: 5px;
  }
  97% {
    letter-spacing: -1px;
    word-spacing: -2px;
  }
  98% {
    letter-spacing: 3px;
  }
}

/* Hover glitch effect */
.hover-glitch {
  transition: all 0.1s;
}

.hover-glitch:hover {
  animation: hover-glitch-anim 0.2s infinite;
  color: #ff66c8;
}

@keyframes hover-glitch-anim {
  0%,
  100% {
    transform: translate(0);
  }
  25% {
    transform: translate(-2px, 1px) skewX(-2deg);
  }
  50% {
    transform: translate(2px, -1px) skewX(2deg);
  }
  75% {
    transform: translate(-1px, -1px);
  }
}

/* Code overlay */
.code-overlay {
  animation: code-fade 2s infinite;
  white-space: pre;
}

@keyframes code-fade {
  0%,
  100% {
    opacity: 0;
  }
  50% {
    opacity: 0.3;
  }
}

/* Popup d'erreur */
.error-popup {
  animation:
    error-appear 0.5s ease-out forwards,
    error-float 3s ease-in-out infinite;
  opacity: 0;
}

@keyframes error-appear {
  from {
    opacity: 0;
    transform: scale(0.8);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

@keyframes error-float {
  0%,
  100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-5px);
  }
}

/* Console de debug */
.debug-console {
  text-align: left;
  line-height: 1.5;
}

.typing-effect {
  overflow: hidden;
  white-space: nowrap;
  animation: typing 1s steps(30) forwards;
  opacity: 0;
}

@keyframes typing {
  from {
    width: 0;
    opacity: 1;
  }
  to {
    width: 100%;
    opacity: 1;
  }
}

.blink-text {
  animation: blink-text 0.5s step-end infinite;
}

@keyframes blink-text {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0;
  }
}

/* Overlay glitch pour le bouton */
.glitch-overlay-btn {
  background: linear-gradient(
    90deg,
    transparent 0%,
    rgba(255, 102, 200, 0.1) 25%,
    transparent 50%,
    rgba(107, 255, 255, 0.1) 75%,
    transparent 100%
  );
  animation: glitch-overlay-move 0.5s linear infinite;
  opacity: 0;
}

.group:hover .glitch-overlay-btn {
  opacity: 1;
}

@keyframes glitch-overlay-move {
  0% {
    transform: translateX(-100%);
  }
  100% {
    transform: translateX(100%);
  }
}

/* Spin glitch pour l'icône */
.spin-glitch {
  animation: spin-glitch 3s ease-in-out infinite;
}

@keyframes spin-glitch {
  0%,
  90%,
  100% {
    transform: rotate(0deg);
  }
  92% {
    transform: rotate(10deg);
  }
  94% {
    transform: rotate(-10deg);
  }
  96% {
    transform: rotate(5deg);
  }
  98% {
    transform: rotate(-5deg);
  }
}

/* ==================== EFFETS SITE CASSÉ DRAMATIQUES ==================== */

/* Écran cassé - fissures */
.crack-line {
  stroke-dasharray: 1000;
  stroke-dashoffset: 1000;
  animation: crack-appear 2s ease-out forwards;
}

@keyframes crack-appear {
  to {
    stroke-dashoffset: 0;
  }
}

/* Dead pixels */
.dead-pixel {
  animation: dead-pixel-flicker 0.1s steps(2) infinite;
}

@keyframes dead-pixel-flicker {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.8;
  }
}

/* Broken screen overlay */
.broken-screen-overlay {
  background:
    linear-gradient(
      45deg,
      transparent 48%,
      rgba(255, 255, 255, 0.02) 50%,
      transparent 52%
    ),
    linear-gradient(
      -45deg,
      transparent 48%,
      rgba(255, 255, 255, 0.02) 50%,
      transparent 52%
    );
}

/* Site breaking - très intense */
.site-breaking {
  animation: site-breaking 0.05s ease-in-out infinite;
}

@keyframes site-breaking {
  0%,
  100% {
    transform: translate(0, 0) skewX(0deg);
  }
  10% {
    transform: translate(-3px, 1px) skewX(-0.5deg);
  }
  20% {
    transform: translate(3px, -2px) skewX(0.5deg);
  }
  30% {
    transform: translate(-2px, -1px) skewX(-0.3deg);
  }
  40% {
    transform: translate(2px, 2px) skewX(0.3deg);
  }
  50% {
    transform: translate(-1px, -2px) skewX(-0.2deg);
  }
  60% {
    transform: translate(1px, 1px) skewX(0.2deg);
  }
  70% {
    transform: translate(-2px, 1px) skewX(-0.4deg);
  }
  80% {
    transform: translate(2px, -1px) skewX(0.4deg);
  }
  90% {
    transform: translate(-1px, 2px) skewX(-0.1deg);
  }
}

/* Site unstable - quiz */
.site-unstable {
  animation: site-unstable 0.15s ease-in-out infinite;
}

@keyframes site-unstable {
  0%,
  100% {
    transform: translate(0, 0);
  }
  25% {
    transform: translate(-1px, 0.5px);
  }
  50% {
    transform: translate(1px, -0.5px);
  }
  75% {
    transform: translate(-0.5px, -0.5px);
  }
}

/* Screen shake plus intense pour quiz */
.screen-shake-quiz {
  animation: screen-shake-quiz 0.12s ease-in-out infinite;
}

@keyframes screen-shake-quiz {
  0%,
  100% {
    transform: translate(0, 0);
  }
  20% {
    transform: translate(-1px, 0.5px);
  }
  40% {
    transform: translate(1px, -0.5px);
  }
  60% {
    transform: translate(-0.5px, 1px);
  }
  80% {
    transform: translate(0.5px, -1px);
  }
}

/* Effet de freeze/lag aléatoire */
.freeze-effect {
  animation: freeze 5s steps(1) infinite;
}

@keyframes freeze {
  0%,
  98%,
  100% {
    opacity: 1;
  }
  99% {
    opacity: 0.5;
  }
}

/* Distorsion CRT intense */
.crt-distort {
  animation: crt-distort 0.1s linear infinite;
}

@keyframes crt-distort {
  0% {
    transform: scaleY(1) scaleX(1);
  }
  25% {
    transform: scaleY(1.002) scaleX(0.998);
  }
  50% {
    transform: scaleY(0.998) scaleX(1.002);
  }
  75% {
    transform: scaleY(1.001) scaleX(0.999);
  }
  100% {
    transform: scaleY(1) scaleX(1);
  }
}

/* Couleur qui saigne */
.color-bleed {
  text-shadow:
    -2px 0 #ff66c8,
    2px 0 #6bffff,
    0 2px #fff746;
  animation: color-bleed 0.08s steps(3) infinite;
}

@keyframes color-bleed {
  0% {
    text-shadow:
      -2px 0 #ff66c8,
      2px 0 #6bffff,
      0 2px #fff746;
  }
  33% {
    text-shadow:
      -3px 1px #ff66c8,
      3px -1px #6bffff,
      1px 2px #fff746;
  }
  66% {
    text-shadow:
      -1px -1px #ff66c8,
      1px 1px #6bffff,
      -1px 3px #fff746;
  }
  100% {
    text-shadow:
      -2px 0 #ff66c8,
      2px 0 #6bffff,
      0 2px #fff746;
  }
}

/* Texte complètement corrompu */
.text-corrupt-heavy {
  animation: text-corrupt-heavy 0.1s steps(4) infinite;
}

@keyframes text-corrupt-heavy {
  0% {
    transform: translate(0) skewX(0deg);
    filter: none;
  }
  25% {
    transform: translate(-3px, 1px) skewX(-3deg);
    filter: hue-rotate(90deg);
  }
  50% {
    transform: translate(3px, -1px) skewX(3deg);
    filter: hue-rotate(-90deg) saturate(2);
  }
  75% {
    transform: translate(-1px, -2px) skewX(-1deg);
    filter: blur(1px);
  }
  100% {
    transform: translate(0) skewX(0deg);
    filter: none;
  }
}

/* Écran qui se retourne partiellement */
.screen-flip-glitch {
  animation: screen-flip 8s ease-in-out infinite;
}

@keyframes screen-flip {
  0%,
  95%,
  100% {
    transform: perspective(1000px) rotateX(0deg);
  }
  96% {
    transform: perspective(1000px) rotateX(2deg);
  }
  97% {
    transform: perspective(1000px) rotateX(-2deg);
  }
  98% {
    transform: perspective(1000px) rotateX(1deg);
  }
  99% {
    transform: perspective(1000px) rotateX(-1deg);
  }
}

/* Effet de "no signal" */
.no-signal {
  animation: no-signal 0.1s steps(5) infinite;
}

@keyframes no-signal {
  0%,
  100% {
    background: repeating-linear-gradient(
      0deg,
      #000 0px,
      #000 2px,
      #111 2px,
      #111 4px
    );
    opacity: 0.1;
  }
  50% {
    background: repeating-linear-gradient(
      0deg,
      #111 0px,
      #111 2px,
      #000 2px,
      #000 4px
    );
    opacity: 0.15;
  }
}

/* ==================== DESTRUCTION PROGRESSIVE ==================== */

/* Boutons qui fuient le curseur */
.button-flee {
  animation: button-flee 2s ease-in-out infinite;
}

@keyframes button-flee {
  0%,
  100% {
    transform: translate(0, 0) rotate(0deg);
  }
  25% {
    transform: translate(-8px, 5px) rotate(-2deg);
  }
  50% {
    transform: translate(10px, -3px) rotate(1deg);
  }
  75% {
    transform: translate(-5px, -8px) rotate(3deg);
  }
}

.button-flee-result {
  animation: button-flee-result 1.5s ease-in-out infinite;
}

@keyframes button-flee-result {
  0%,
  100% {
    transform: translate(0, 0) rotate(0deg) scale(1);
  }
  20% {
    transform: translate(-15px, 10px) rotate(-5deg) scale(0.98);
  }
  40% {
    transform: translate(20px, -8px) rotate(3deg) scale(1.02);
  }
  60% {
    transform: translate(-10px, -15px) rotate(5deg) scale(0.97);
  }
  80% {
    transform: translate(12px, 12px) rotate(-3deg) scale(1.01);
  }
}

/* Input qui glitch */
.input-glitch {
  animation: input-glitch 0.3s steps(5) infinite;
}

@keyframes input-glitch {
  0%,
  100% {
    clip-path: inset(0 0 0 0);
    transform: translateX(0);
  }
  20% {
    clip-path: inset(0 0 40% 0);
    transform: translateX(-3px);
  }
  40% {
    clip-path: inset(30% 0 0 0);
    transform: translateX(3px);
  }
  60% {
    clip-path: inset(0 30% 0 0);
    transform: translateX(-2px);
  }
  80% {
    clip-path: inset(0 0 0 30%);
    transform: translateX(2px);
  }
}

/* Shake moyen */
.shake-medium {
  animation: shake-medium 0.15s infinite;
}

@keyframes shake-medium {
  0%,
  100% {
    transform: translate(0);
  }
  25% {
    transform: translate(-3px, 2px);
  }
  50% {
    transform: translate(3px, -2px);
  }
  75% {
    transform: translate(-2px, -1px);
  }
}

/* Éléments qui dérivent */
.drift-away {
  animation: drift-away 5s ease-in-out infinite;
}

@keyframes drift-away {
  0%,
  100% {
    transform: translate(0, 0) rotate(0deg);
    opacity: 1;
  }
  25% {
    transform: translate(-20px, 10px) rotate(-5deg);
    opacity: 0.9;
  }
  50% {
    transform: translate(30px, -15px) rotate(3deg);
    opacity: 0.8;
  }
  75% {
    transform: translate(-15px, -20px) rotate(7deg);
    opacity: 0.9;
  }
}

/* Texte qui se désintègre */
.text-disintegrate {
  animation: text-disintegrate 3s ease-in-out infinite;
}

@keyframes text-disintegrate {
  0%,
  100% {
    letter-spacing: normal;
    opacity: 1;
    filter: blur(0);
  }
  50% {
    letter-spacing: 5px;
    opacity: 0.7;
    filter: blur(1px);
  }
}

/* Fragments qui éclatent */
.fragment-explode {
  animation: fragment-explode 4s ease-in-out infinite;
}

@keyframes fragment-explode {
  0%,
  100% {
    transform: scale(1) translate(0, 0) rotate(0deg);
  }
  50% {
    transform: scale(1.2)
      translate(var(--explode-x, 10px), var(--explode-y, -10px))
      rotate(var(--explode-r, 5deg));
  }
}

/* UI qui fond */
.ui-melt {
  animation: ui-melt 6s ease-in-out infinite;
}

@keyframes ui-melt {
  0%,
  100% {
    transform: scaleY(1) skewX(0deg);
    filter: blur(0);
  }
  50% {
    transform: scaleY(1.1) skewX(2deg);
    filter: blur(0.5px);
  }
}

/* Corruption totale */
.total-corruption {
  animation: total-corruption 0.2s steps(8) infinite;
}

@keyframes total-corruption {
  0%,
  100% {
    transform: translate(0) skew(0deg) scale(1);
    filter: none;
    opacity: 1;
  }
  12.5% {
    transform: translate(-5px, 3px) skew(-3deg) scale(1.02);
    filter: hue-rotate(45deg);
    opacity: 0.9;
  }
  25% {
    transform: translate(3px, -2px) skew(2deg) scale(0.98);
    filter: saturate(2) hue-rotate(-30deg);
    opacity: 0.85;
  }
  37.5% {
    transform: translate(-2px, -4px) skew(-1deg) scale(1.01);
    filter: invert(10%) blur(0.5px);
    opacity: 0.95;
  }
  50% {
    transform: translate(4px, 2px) skew(3deg) scale(0.99);
    filter: hue-rotate(90deg) contrast(1.2);
    opacity: 0.8;
  }
  62.5% {
    transform: translate(-3px, -1px) skew(-2deg) scale(1.03);
    filter: saturate(0.5);
    opacity: 0.9;
  }
  75% {
    transform: translate(2px, 3px) skew(1deg) scale(0.97);
    filter: hue-rotate(-60deg) blur(1px);
    opacity: 0.75;
  }
  87.5% {
    transform: translate(-1px, -3px) skew(-1deg) scale(1);
    filter: invert(5%);
    opacity: 0.88;
  }
}

/* Écran brisé progressif */
.screen-shatter {
  position: relative;
}

.screen-shatter::before {
  content: "";
  position: absolute;
  inset: 0;
  background:
    linear-gradient(
      45deg,
      transparent 45%,
      rgba(255, 255, 255, 0.1) 45%,
      rgba(255, 255, 255, 0.1) 55%,
      transparent 55%
    ),
    linear-gradient(
      -45deg,
      transparent 45%,
      rgba(255, 255, 255, 0.1) 45%,
      rgba(255, 255, 255, 0.1) 55%,
      transparent 55%
    );
  background-size: 30px 30px;
  pointer-events: none;
  animation: shatter-pulse 1s ease-in-out infinite;
}

@keyframes shatter-pulse {
  0%,
  100% {
    opacity: 0;
  }
  50% {
    opacity: 0.5;
  }
}
</style>
