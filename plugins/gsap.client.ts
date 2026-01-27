import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Draggable } from "gsap/Draggable";

// Enregistrement des plugins GSAP
gsap.registerPlugin(ScrollTrigger, Draggable);

// Types explicites pour GSAP
export type GSAPInstance = typeof gsap;
export type ScrollTriggerInstance = typeof ScrollTrigger;
export type DraggableInstance = typeof Draggable;

// Déclaration de type pour useNuxtApp()
declare module "#app" {
  interface NuxtApp {
    $gsap: GSAPInstance;
    $ScrollTrigger: ScrollTriggerInstance;
    $Draggable: DraggableInstance;
  }
}

// Déclaration pour Vue
declare module "@vue/runtime-core" {
  interface ComponentCustomProperties {
    $gsap: typeof gsap;
    $ScrollTrigger: typeof ScrollTrigger;
    $Draggable: typeof Draggable;
  }
}

export default defineNuxtPlugin(() => {
  return {
    provide: {
      gsap,
      ScrollTrigger,
      Draggable,
    },
  };
});
