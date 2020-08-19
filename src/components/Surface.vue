<template>
  <div
    class="surface"
    ref="root"
    @mousedown="onMouseDown"
    @contextmenu="onContextMenu"
  >
    <canvas
      ref="canvas"
      :width="size.w * pixelRatio"
      :height="size.h * pixelRatio"
    />
    <svg
      xmlns="http://www.w3.org/2000/svg"
      :viewBox="viewBox"
      :width="size.w"
      :height="size.h"
    >
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
        @unset-dot="unsetDot"
        @rename="entry[1].name = $event"
      />
      <NodeKindMenu
        v-if="menu.show"
        :pos="menu.pos"
        @choose="addNode"
        @mousedown.stop
      />
    </div>
  </div>
</template>

<script lang="ts">
import {
  defineComponent,
  reactive,
  computed,
  onMounted,
  ref,
  watchEffect,
  onUnmounted,
} from "vue";
import { absDragHandler } from "../util";
import {
  Transform,
  VisualGraph,
  uiToWorld,
  Vec2,
  link,
  decodeDotId,
} from "../graph";
import { EvalContext } from "../evalContext";
import { panZoom, handlePanZoomTransform } from "../composites/panZoom";
import VisualNode from "./VisualNode.vue";
import NodeKindMenu from "./NodeKindMenu.vue";
import { drawGrid } from "@/draw";
import { kinds } from "@/kinds";

export default defineComponent({
  name: "Surface",
  components: {
    VisualNode,
    NodeKindMenu,
  },
  setup() {
    let transform: Transform = reactive({
      translateX: 0,
      translateY: 0,
      scale: 1,
    });

    let size = reactive({ w: 0, h: 0 });
    let pixelRatio = window.devicePixelRatio;

    let root = ref<HTMLElement | null>(null);
    let canvas = ref<HTMLCanvasElement | null>(null);

    let clickValid = false;

    panZoom(root, (e) => {
      clickValid = false;
      const newTransform = handlePanZoomTransform(e, size, transform);
      Object.assign(transform, newTransform);
    });

    let dots = reactive(new Map<number, Vec2>());
    const graph: VisualGraph = {
      nodes: reactive(
        new Map(
          [
            {
              kind: 0,
              name: kinds.get(0)!.name,
              pos: { x: -100, y: -50 },
              minWidth: null,
              state: null,
            },
            {
              kind: 0,
              name: kinds.get(0)!.name,
              pos: { x: -150, y: 60 },
              minWidth: null,
              state: null,
            },
            {
              kind: 1,
              name: kinds.get(1)!.name,
              pos: { x: 150, y: -30 },
              minWidth: null,
              state: null,
            },
          ].entries()
        )
      ),
      links: reactive(new Map([link(0, 0, 2, 0), link(1, 0, 2, 1)])),
    };

    let evalCtx = new EvalContext(graph);

    const svgSpace = computed(() => {
      let w = transform.scale * size.w;
      let h = transform.scale * size.h;
      let x = (transform.translateX - size.w / 2) * transform.scale;
      let y = (transform.translateY - size.h / 2) * transform.scale;
      return { w, h, x, y };
    });

    watchEffect(() => {
      let ctx = canvas.value?.getContext("2d");
      if (ctx == null) return;
      drawGrid(ctx, svgSpace.value, transform, pixelRatio);
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

    function globalHideModal(e: MouseEvent) {
      if (e.target instanceof Element) {
        let isInMenu = e.target.closest(".menu") != null;
        if (!isInMenu) {
          menu.show = false;
        }
      }
    }

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

      window.addEventListener("mousedown", globalHideModal, { capture: true });
    });
    onUnmounted(() => {
      window.removeEventListener("mousedown", globalHideModal, {
        capture: true,
      });
    });

    let linksPath = computed(() => {
      let path = "";
      function add(a: Vec2, b: Vec2) {
        let delta = (b.x - a.x) * 0.5;

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

    let menu = reactive({ show: false, pos: { x: 0, y: 0 } });

    return {
      graph,
      transform,
      dots,
      size,
      pixelRatio,
      root,
      canvas,
      viewBox,
      bgLines,
      originStyle,
      linksPath,
      evalCtx,
      menu,
      updateDots(newDots: Map<number, Vec2>) {
        for (let [key, val] of newDots) {
          dots.set(key, val);
        }
      },
      onMouseDown() {
        clickValid = true;
        menu.show = false;
      },
      onContextMenu(e: MouseEvent) {
        if (clickValid) {
          e.preventDefault();
          menu.pos = uiToWorld(size, transform, {
            x: e.pageX,
            y: e.pageY,
          });

          menu.show = true;
        }
      },
      addNode(kind: number) {
        let nextId = graph.nodes.size;
        graph.nodes.set(nextId, {
          name: kinds.get(kind)!.name,
          kind,
          pos: menu.pos,
          minWidth: null,
          state: null,
        });
        menu.show = false;
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
            if (dec1.input) {
              graph.links.set(dot, dot2);
            } else {
              graph.links.set(dot2, dot);
            }
          }
        }
        dotDragState.value = null;
      },
      unsetDot(dot: number) {
        graph.links.delete(dot);
      },
    };
  },
});
</script>

<style scoped>
.surface,
canvas,
svg {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  overflow: hidden;
  /* background-image: linear-gradient(#111 10%, #333 10%, #333); */
}

.origin {
  position: absolute;
  width: 0;
  height: 0;
  top: 50%;
  left: 50%;
}
</style>
