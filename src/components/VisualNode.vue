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
        :ref="(e) => (dots[`${node.id}.i${input.id}`] = e)"
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
      <div
        class="dot"
        :style="{ backgroundColor: output.color }"
        :ref="(e) => (dots[`${node.id}.o${output.id}`] = e)"
      ></div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, computed, watch, ref } from "vue";
import { GraphNode, Vec2, Transform, NodeKind } from "../graph";
import { reqobj, dragHandler } from "../util";

export default defineComponent({
  name: "VisualNode",
  props: {
    worldTransform: reqobj<Transform>(),
    kind: reqobj<NodeKind>(),
    node: reqobj<GraphNode>(),
  },
  setup(props, { emit }) {
    let dots = ref({} as { [k: number]: HTMLElement });

    let rootStyle = computed(() => {
      return {
        transform: `translate(${props.node.pos.x}px, ${props.node.pos.y}px)`,
      };
    });

    const dotPositions = computed((): { [k: number]: Vec2 } => {
      let positions: { [k: number]: Vec2 } = {};
      for (let id of Object.keys(dots.value)) {
        let dot = dots.value[+id];
        let top = dot.offsetTop;
        let left = dot.offsetLeft;
        positions[+id] = {
          x: left + dot.offsetWidth / 2,
          y: top + dot.offsetHeight / 2,
        };
      }
      return positions;
    });

    const dotAbsolutePositions = computed((): { [k: number]: Vec2 } => {
      let abs: { [k: number]: Vec2 } = {};
      for (let id of Object.keys(dotPositions.value)) {
        let dot = dotPositions.value[+id];
        abs[+id] = { x: dot.x + props.node.pos.x, y: dot.y + props.node.pos.y };
      }
      return abs;
    });

    watch(dotAbsolutePositions, (pos) => {
      emit("dots", pos);
    });

    return {
      dots,
      rootStyle,
      drag: dragHandler(({ x: deltaX, y: deltaY }) => {
        let x = props.node.pos.x - deltaX * props.worldTransform.scale;
        let y = props.node.pos.y - deltaY * props.worldTransform.scale;
        emit("move", { x, y });
      }),
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
