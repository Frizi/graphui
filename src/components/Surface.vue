<template>
  <div class="surface" ref="root" @wheel="onWheel" @mousedown="mouseDown">
    <svg
      xmlns="http://www.w3.org/2000/svg"
      :viewBox="viewBox"
      :width="size.w"
      :height="size.h"
    >
      <circle cx="0" cy="0" r="12" />

      <!-- <circle
        v-for="(dot, i) in dots"
        :key="i"
        :cx="dot.x"
        :cy="dot.y"
        fill="blue"
        r="7"
      /> -->
      <path :d="linksPath" stroke="black" fill="none" stroke-width="1" />
    </svg>
    <div class="origin" :style="originStyle">
      <VisualNode
        v-for="node in graph.nodes"
        :key="node.id"
        :node="node"
        :worldTransform="transform"
        @dots="updateDots"
        @move="node.pos = $event"
      />
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, reactive, computed, onMounted, ref } from "vue";
import { nextId, isDefined } from "../util";
import {
  Transform,
  VisualGraph,
  ComputedLinks,
  Vec2,
  transformPoint,
} from "../graph";
import VisualNode from "./VisualNode.vue";
interface TestProp {
  bla: Promise<number>;
}

function getGraph(): VisualGraph {
  let i1 = nextId();
  let i2 = nextId();
  return {
    nodes: [
      {
        id: nextId(),
        name: "Node 1",
        pos: { x: -100, y: 10 },
        inputs: [{ id: nextId(), color: "#123123", label: "test" }],
        outputs: [{ id: i1, color: "#123123", label: "result" }],
      },
      {
        id: nextId(),
        name: "Node 2",
        pos: { x: 50, y: -30 },
        inputs: [{ id: i2, color: "#123123", label: "test" }],
        outputs: [{ id: nextId(), color: "#123123", label: "result" }],
      },
    ],
    links: [{ start: i1, end: i2 }],
  };
}

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
    let dots = reactive({} as { [k: number]: Vec2 });

    const viewBox = computed(() => {
      let w = transform.scale * size.w;
      let h = transform.scale * size.h;
      let x = (transform.translateX - size.w / 2) * transform.scale;
      let y = (transform.translateY - size.h / 2) * transform.scale;
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

    let graph: VisualGraph = reactive(getGraph());

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
            let start = dots[l.start];
            let end = dots[l.end];
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

    let drag: Vec2 | null = null;

    return {
      graph,
      transform,
      dots,
      links,
      size,
      root,
      viewBox,
      originStyle,
      linksPath,
      onWheel(e: WheelEvent) {
        let c = { x: e.clientX - size.w / 2, y: e.clientY - size.h / 2 };
        let p = transformPoint(transform, c);

        let delta = e.deltaY > 0 ? 3 : -3;

        let f = 1 + delta * 0.05;
        let s = transform.scale;
        let ns = s * f;

        let dx = (p.x * f - p.x) / ns;
        let dy = (p.y * f - p.y) / ns;

        transform.translateX -= dx;
        transform.translateY -= dy;
        transform.scale = ns;
      },
      mouseDown(e: MouseEvent) {
        drag = { x: e.clientX, y: e.clientY };

        function move(e: MouseEvent) {
          if (drag != null) {
            let deltaX = drag.x - e.clientX;
            let deltaY = drag.y - e.clientY;

            transform.translateX += deltaX;
            transform.translateY += deltaY;

            drag = { x: e.clientX, y: e.clientY };
          }
        }

        function drop() {
          drag = null;
          window.removeEventListener("mousemove", move);
          window.removeEventListener("mouseup", drop);
        }
        window.addEventListener("mousemove", move);
        window.addEventListener("mouseup", drop);
      },
      mouseUp(_e: MouseEvent) {
        drag = null;
      },

      updateDots(newDots: Vec2[]) {
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