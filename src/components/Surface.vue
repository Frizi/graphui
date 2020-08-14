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
        v-for="node in graph.nodes"
        :key="node.id"
        :node="node"
        :kind="graph.kinds[node.kind]"
        :worldTransform="transform"
        @dots="updateDots"
        @move="node.pos = $event"
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
} from "../util";
import {
  Transform,
  VisualGraph,
  ComputedLinks,
  Vec2,
  transformPoint,
  DotKind,
} from "../graph";
import VisualNode from "./VisualNode.vue";

const graph: VisualGraph = {
  kinds: [
    {
      id: 0,
      inputs: [{ id: 0, kind: DotKind.ANY, label: "test" }],
      outputs: [
        {
          id: 0,
          label: "result",
          run(ctx) {
            let input = ctx.getInput(0);
            if (input != null) {
              switch (input.kind) {
                case DotKind.NUMBER:
                  return { kind: input.kind, value: input.value };
                case DotKind.COLOR:
                  return { kind: input.kind, value: input.value };
                case DotKind.IMAGE:
                  return { kind: input.kind, value: input.value };
              }
            }
            return null;
          },
        },
      ],
      preview(ctx) {
        return h("div", ["hello"]);
      },
    },
  ],
  nodes: [
    {
      id: 0,
      kind: 0,
      name: "Node 1",
      pos: { x: -100, y: 10 },
      minWidth: null,
      state: null,
    },
    {
      id: 1,
      kind: 0,
      name: "Node 2",
      pos: { x: 50, y: -30 },
      minWidth: null,
      state: null,
    },
  ],
  links: [{ startNode: 0, startOutput: 0, endNode: 1, endInput: 0 }],
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
    let dots = reactive({} as { [k: string]: Vec2 });

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
      console.log(distance);
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

    let links = computed(
      (): ComputedLinks => {
        return graph.links
          .map((l) => {
            let startKey = `${l.startNode}.o${l.startOutput}`;
            let endKey = `${l.endNode}.i${l.endInput}`;
            let start = dots[startKey];
            let end = dots[endKey];
            if (start != null && end != null) {
              return { start, end };
            }
            return null;
          })
          .filter(isDefined);
      }
    );

    let linksPath = computed(() => {
      let path = links.value
        .map((l) => {
          const x1 = l.start.x;
          const y1 = l.start.y;
          const x2 = l.end.x;
          const y2 = l.end.y;

          let delta = x2 - x1 * 0.5;

          let offset =
            delta > 0
              ? Math.max(50, delta)
              : Math.min(100 - delta * 0.2, Math.max(50, -delta));

          const c1 = x1 + offset;
          const c2 = x2 - offset;

          return `M${x1} ${y1} C${c1} ${y1}, ${c2} ${y2}, ${x2} ${y2}`;
        })
        .join("");
      return path;
    });

    return {
      graph,
      transform,
      dots,
      links,
      size,
      root,
      viewBox,
      bgLines,
      originStyle,
      linksPath,
      onWheel(e: WheelEvent) {
        let c = { x: e.clientX - size.w / 2, y: e.clientY - size.h / 2 };
        let p = transformPoint(transform, c);
        console.log(e.deltaMode);

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
      updateDots(newDots: { [k: string]: Vec2 }) {
        Object.assign(dots, newDots);
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
