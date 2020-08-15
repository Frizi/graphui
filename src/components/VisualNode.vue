<template>
  <div class="node" layout="column u1" :style="rootStyle" @mousedown.stop>
    <div class="header" @mousedown="drag">
      {{ node.name }}
    </div>
    <div
      layout="row u1"
      class="input"
      v-for="input in kind.inputs"
      :key="input.id"
    >
      <div
        :class="`dot kind-${input.kind}`"
        :ref="(e) => setDot(input.id, true, e)"
      ></div>
      <div class="label" flex>{{ input.label }}</div>
    </div>
    <div
      layout="row u1"
      class="output"
      v-for="output in kind.outputs"
      :key="output.id"
    >
      <div class="label" flex>{{ output.label }}</div>
      <div class="dot" :ref="(e) => setDot(output.id, false, e)"></div>
    </div>
    <div class="preview" v-if="data.preview">
      <RenderVNode :node="data.preview.value" />
    </div>
  </div>
</template>

<script lang="ts">
import {
  defineComponent,
  computed,
  watch,
  ref,
  onBeforeUpdate,
  reactive,
  shallowReactive,
} from "vue";
import {
  GraphNode,
  Vec2,
  Transform,
  NodeKind,
  encodeDotId,
  NodeData,
} from "../graph";
import RenderVNode from "./RenderVNode.vue";
import { reqobj, req, dragHandler } from "../util";

export default defineComponent({
  name: "VisualNode",
  props: {
    worldTransform: reqobj<Transform>(),
    kind: reqobj<NodeKind>(),
    nodeId: req(Number),
    node: reqobj<GraphNode>(),
    data: reqobj<NodeData>(),
  },
  components: { RenderVNode },
  setup(props, { emit }) {
    const dots = ref(new Map<number, HTMLElement>());

    onBeforeUpdate(() => {
      let map = dots.value;
      for (let [id, dot] of map) {
        if (dot.parentNode == null) {
          map.delete(id);
        }
      }
    });

    const rootStyle = computed(() => {
      return {
        transform: `translate(${props.node.pos.x}px, ${props.node.pos.y}px)`,
      };
    });

    const dotPositions = computed(
      (): Map<number, Vec2> => {
        let map = new Map<number, Vec2>();
        for (let [id, dot] of dots.value) {
          let top = dot.offsetTop;
          let left = dot.offsetLeft;
          map.set(+id, {
            x: left + dot.offsetWidth / 2,
            y: top + dot.offsetHeight / 2,
          });
        }
        return map;
      }
    );

    const dotAbsolutePositions = computed(
      (): Map<number, Vec2> => {
        let map = new Map<number, Vec2>();
        for (let [id, dot] of dotPositions.value) {
          map.set(id, {
            x: dot.x + props.node.pos.x,
            y: dot.y + props.node.pos.y,
          });
        }
        return map;
      }
    );

    watch(dotAbsolutePositions, (pos) => {
      emit("dots", pos);
    });

    return {
      rootStyle,
      drag: dragHandler(({ x: deltaX, y: deltaY }) => {
        const x = props.node.pos.x - deltaX * props.worldTransform.scale;
        const y = props.node.pos.y - deltaY * props.worldTransform.scale;
        emit("move", { x, y });
      }),
      setDot(dot: number, input: boolean, value: HTMLElement) {
        if (Object.is(input, -0)) {
          debugger;
        }
        const id = encodeDotId(props.nodeId, dot, input);
        dots.value.set(id, value);
      },
    };
  },
});
</script>

<style scoped>
.header {
  font-weight: bold;
  user-select: none;
  cursor: grab;
}
.node {
  position: absolute;
  width: max-content;
  padding: 5px;
  max-width: 300px;
  background: #ccc;
  border-radius: 2px;
  box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.5), 0 2px 10px 0 rgba(0, 0, 0, 0.1);
}

.input,
.output {
  display: flex;
}

.input .label {
  text-align: left;
}

.output .label {
  text-align: right;
}

.dot {
  width: 10px;
  height: 10px;
  border: 1px solid black;
  align-self: center;
  border-radius: 5px;
  box-sizing: border-box;
  background-color: grey;
}

.input .dot {
  margin-left: -10px;
}

.output .dot {
  margin-right: -10px;
}

.dot.kind-1 {
  background-color: red;
}

.dot.kind-2 {
  background-color: green;
}

.dot.kind-4 {
  background-color: blue;
}
</style>
