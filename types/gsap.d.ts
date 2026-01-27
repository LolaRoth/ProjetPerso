import type { gsap } from "gsap";
import type { ScrollTrigger } from "gsap/ScrollTrigger";
import type { Draggable } from "gsap/Draggable";

type GSAPInstance = typeof gsap;
type ScrollTriggerInstance = typeof ScrollTrigger;
type DraggableInstance = typeof Draggable;

declare module "#app" {
  interface NuxtApp {
    $gsap: GSAPInstance;
    $ScrollTrigger: ScrollTriggerInstance;
    $Draggable: DraggableInstance;
  }
}

declare module "nuxt/app" {
  interface NuxtApp {
    $gsap: GSAPInstance;
    $ScrollTrigger: ScrollTriggerInstance;
    $Draggable: DraggableInstance;
  }
}

declare module "@vue/runtime-core" {
  interface ComponentCustomProperties {
    $gsap: GSAPInstance;
    $ScrollTrigger: ScrollTriggerInstance;
    $Draggable: DraggableInstance;
  }
}

export {};
