<template>
  <div class="surface" ref="root" @wheel="onWheel" @mousedown="pan">
    <svg
      xmlns="http://www.w3.org/2000/svg"
      :viewBox="viewBox"
      :width="size.w"
      :height="size.h"
    >
      <path
        :d="bgLines.fine"
        :stroke-width="transform.scale * 1"
        fill="none"
        stroke="#eeeeee"
      />
      <path
        :d="bgLines.coarse"
        :stroke-width="transform.scale * 3"
        fill="none"
        stroke="#eeeeee"
      />
      <!-- <circle
        v-for="(dot, i) in dots"
        :key="i"
        :cx="dot.x"
        :cy="dot.y"
        fill="blue"
        r="7"
      />-->
      <path :d="linksPath" stroke="black" fill="none" stroke-width="1" />
    </svg>
    <div class="origin" :style="originStyle">
      <VisualNode
        v-for="entry in graph.nodes"
        :key="entry[0]"
        :node="entry[1]"
        :node-id="entry[0]"
        :data="evalCtx.nodeData(entry[0])"
        :worldTransform="transform"
        @dots="updateDots"
        @move="entry[1].pos = $event"
        @drag-dot="dragDot"
        @drop-dot="dropDot"
      />
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, reactive, computed, onMounted, ref, h } from "vue";
import {
  nextId,
  isDefined,
  normalizedDeltaY,
  clamp,
  dragHandler,
  absDragHandler,
} from "../util";
import {
  Transform,
  VisualGraph,
  ComputedLinks,
  transformPoint,
  uiToWorld,
  DotKind,
  encodeDotId,
  Vec2,
  link,
  decodeDotId,
} from "../graph";
import { EvalContext } from "../evalContext";
import VisualNode from "./VisualNode.vue";

const graph: VisualGraph = {
  nodes: reactive(
    new Map(
      [
        {
          kind: 1,
          name: "Value",
          pos: { x: -100, y: -50 },
          minWidth: null,
          state: null,
        },
        {
          kind: 1,
          name: "Value",
          pos: { x: -150, y: 60 },
          minWidth: null,
          state: null,
        },
        {
          kind: 0,
          name: "Sum",
          pos: { x: 150, y: -30 },
          minWidth: null,
          state: null,
        },
      ].entries()
    )
  ),
  links: reactive(new Map([link(0, 0, 2, 0), link(1, 0, 2, 1)])),
};

export default defineComponent({
  name: "Surface",
  components: {
    VisualNode,
  },
  setup() {
    let transform: Transform = reactive({
      translateX: 0,
      translateY: 0,
      scale: 1,
    });

    let size = reactive({ w: 0, h: 0 });

    let root = ref(null);
    let dots = reactive(new Map<number, Vec2>());

    let evalCtx = new EvalContext(graph);

    const svgSpace = computed(() => {
      let w = transform.scale * size.w;
      let h = transform.scale * size.h;
      let x = (transform.translateX - size.w / 2) * transform.scale;
      let y = (transform.translateY - size.h / 2) * transform.scale;
      return { w, h, x, y };
    });

    const bgLines = computed(() => {
      let log = Math.log10(transform.scale);
      let distance = Math.pow(10, Math.floor(log) + 2) * 2;
      let coarseDistance = distance * 5;
      let { x, y, w, h } = svgSpace.value;
      let fw = (Math.ceil(w / distance) + 1) * distance;
      let fh = (Math.ceil(h / distance) + 1) * distance;
      let fx = Math.floor(x / distance) * distance;
      let fy = Math.floor(y / distance) * distance;
      let cw = (Math.ceil(w / coarseDistance) + 1) * coarseDistance;
      let ch = (Math.ceil(h / coarseDistance) + 1) * coarseDistance;
      let cx = Math.floor(x / coarseDistance) * coarseDistance;
      let cy = Math.floor(y / coarseDistance) * coarseDistance;

      let fine = "";
      let coarse = "";
      for (let nx = 0; nx < fw; nx += distance) {
        fine += `M${fx + nx} ${fy}L${fx + nx} ${fy + fh}`;
      }

      for (let ny = 0; ny < fw; ny += distance) {
        fine += `M${fx} ${fy + ny}L${fx + fw} ${fy + ny}`;
      }

      for (let nx = 0; nx < cw; nx += coarseDistance) {
        coarse += `M${cx + nx} ${cy}L${cx + nx} ${cy + ch}`;
      }

      for (let ny = 0; ny < cw; ny += coarseDistance) {
        coarse += `M${cx} ${cy + ny}L${cx + cw} ${cy + ny}`;
      }
      return { fine, coarse };
    });

    const viewBox = computed(() => {
      const { x, y, w, h } = svgSpace.value;
      return `${x} ${y} ${w} ${h}`;
    });

    const originStyle = computed(() => {
      let s = 1 / transform.scale;
      let x = -transform.translateX;
      let y = -transform.translateY;
      return {
        transform: `translate(${x}px, ${y}px) scale(${s})`,
      };
    });

    onMounted(() => {
      let e = root.value! as Element;
      // todo: remove this hack once ResizeObserver decl ships
      let res = new (window as any)["ResizeObserver"]((entries: any[]) => {
        let entry = entries[entries.length - 1];
        let rect: DOMRect = entry.contentRect;
        size.w = rect.width;
        size.h = rect.height;
      });
      res.observe(e);

      let rect = e.getBoundingClientRect();
      size.w = rect.width;
      size.h = rect.height;
    });

    let linksPath = computed(() => {
      let path = "";
      function add(a: Vec2, b: Vec2) {
        let delta = b.x - a.x * 0.5;

        let offset =
          delta > 0
            ? Math.max(50, delta)
            : Math.min(100 - delta * 0.2, Math.max(50, -delta));

        const c1 = a.x + offset;
        const c2 = b.x - offset;
        path += `M${a.x} ${a.y} C${c1} ${a.y}, ${c2} ${b.y}, ${b.x} ${b.y}`;
      }

      for (let [input, output] of graph.links) {
        let a = dots.get(output);
        let b = dots.get(input);
        if (a == null || b == null) {
          continue;
        }
        add(a, b);
      }

      if (dotDragState.value != null) {
        let { dot, pos } = dotDragState.value;
        let a = dots.get(dot);
        if (a != null) {
          const b = uiToWorld(size, transform, pos);

          if (decodeDotId(dot).input) {
            add(b, a);
          } else {
            add(a, b);
          }
        }
      }

      return path;
    });

    interface DragState {
      dot: number;
      pos: Vec2;
    }

    let dotDragState = ref<DragState | null>(null);

    return {
      graph,
      transform,
      dots,
      size,
      root,
      viewBox,
      bgLines,
      originStyle,
      linksPath,
      evalCtx,

      onWheel(e: WheelEvent) {
        let c = { x: e.clientX - size.w / 2, y: e.clientY - size.h / 2 };
        let p = transformPoint(transform, c);

        let delta = normalizedDeltaY(e);

        let f = 1 + delta * 0.01;
        let s = transform.scale;
        let ns = s * f;
        ns = clamp(ns, 0.05, 99.9);

        let dx = ((p.x * ns) / s - p.x) / ns;
        let dy = ((p.y * ns) / s - p.y) / ns;

        transform.translateX -= dx;
        transform.translateY -= dy;
        transform.scale = ns;
      },
      pan: dragHandler(({ x, y }) => {
        transform.translateX += x;
        transform.translateY += y;
      }),
      updateDots(newDots: Map<number, Vec2>) {
        for (let [key, val] of newDots) {
          dots.set(key, val);
        }
      },
      dragDot(dot: number) {
        absDragHandler(
          (pos) => {
            dotDragState.value = { dot, pos };
          },
          () => {
            dotDragState.value = null;
          }
        );
      },
      dropDot(dot: number) {
        if (dotDragState.value) {
          let dot2 = dotDragState.value.dot;
          let dec1 = decodeDotId(dot);
          let dec2 = decodeDotId(dot2);
          if (dec1.node != dec2.node && dec1.input != dec2.input) {
            // TODO: check cycles
            console.log(dec1.node, dec2.node);
            if (dec1.input) {
              graph.links.set(dot, dot2);
            } else {
              graph.links.set(dot2, dot);
            }
          }
        }
        dotDragState.value = null;
      },
    };
  },
});
</script>

<style scoped>
.surface {
  position: absolute;
  width: 100%;
  height: 100%;
  overflow: hidden;
}

.origin {
  position: absolute;
  width: 0;
  height: 0;
  top: 50%;
  left: 50%;
}
</style>
