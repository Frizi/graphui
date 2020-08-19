<template>
  <div class="node" layout="column u1" :style="rootStyle" @mousedown.stop>
    <form class="header" @submit.prevent="editName = false" v-if="editName">
      <InputAutosize
        v-model.trim.lazy="nodeName"
        @blur="editName = false"
        auto="select"
      />
    </form>
    <div class="header" v-else @mousedown="drag" @dblclick="editName = true">
      {{ node.name }}
      <em v-if="!node.name">Unnamed</em>
    </div>
    <div
      layout="row u1"
      class="input"
      v-for="(input, i) in kind.inputs"
      :key="i"
    >
      <div
        :class="`dot kind-${data.inputs[i].value}`"
        :ref="(e) => setDot(i, true, e)"
        @mousedown.prevent="dragDot($event, i, true)"
        @mouseup.prevent="dropDot($event, i, true)"
      ></div>
      <div class="label" flex>{{ input.label }}</div>
    </div>
    <div
      layout="row u1"
      class="output"
      v-for="(output, i) in kind.outputs"
      :key="i"
    >
      <div class="label" flex>{{ output.label }}</div>
      <div
        :class="`dot kind-${data.outputs[i].value?.kind}`"
        :ref="(e) => setDot(i, false, e)"
        @mousedown.prevent="dragDot($event, i, false)"
        @mouseup.prevent="dropDot(event, i, false)"
      ></div>
    </div>
    <div class="preview">
      <RenderVNode :node="data.preview" />
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
  watchEffect,
} from "vue";
import { GraphNode, Vec2, Transform, encodeDotId, NodeData } from "../graph";
import RenderVNode from "./RenderVNode.vue";
import InputAutosize from "./InputAutosize.vue";
import { reqobj, req, dragHandler } from "../util";
import { kinds } from "../kinds";

export default defineComponent({
  name: "VisualNode",
  props: {
    worldTransform: reqobj<Transform>(),
    nodeId: req(Number),
    node: reqobj<GraphNode>(),
    data: reqobj<NodeData>(),
  },
  components: { RenderVNode, InputAutosize },
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

    const dotPositions = reactive(new Map());

    function refreshDotPositions() {
      dotPositions.clear();
      for (let [id, dot] of dots.value) {
        let top = dot.offsetTop;
        let left = dot.offsetLeft;
        dotPositions.set(+id, {
          x: left + dot.offsetWidth / 2,
          y: top + dot.offsetHeight / 2,
        });
      }
    }
    watchEffect(refreshDotPositions);

    const dotAbsolutePositions = computed(
      (): Map<number, Vec2> => {
        let map = new Map<number, Vec2>();
        for (let [id, dot] of dotPositions) {
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

    let editName = ref(false);
    watch(props.data.preview, refreshDotPositions);

    return {
      rootStyle,
      editName,
      nodeName: computed({
        get() {
          return props.node.name;
        },
        set(newName) {
          emit("rename", newName);
        },
      }),
      kind: computed(() => {
        let kind = kinds.get(props.node.kind);
        if (kind == null) {
          throw new Error(`Invalid kind id ${props.node.kind}`);
        }
        return kind;
      }),
      drag: dragHandler(({ x: deltaX, y: deltaY }) => {
        const x = props.node.pos.x - deltaX * props.worldTransform.scale;
        const y = props.node.pos.y - deltaY * props.worldTransform.scale;
        emit("move", { x, y });
      }),
      setDot(dot: number, input: boolean, value: HTMLElement) {
        const id = encodeDotId(props.nodeId, dot, input);
        dots.value.set(id, value);
      },
      dragDot(e: MouseEvent, dot: number, input: boolean) {
        const id = encodeDotId(props.nodeId, dot, input);
        if (e.ctrlKey) {
          if (input) {
            emit("unset-dot", id);
          }
        } else {
          emit("drag-dot", id);
        }
      },
      dropDot(e: MouseEvent, dot: number, input: boolean) {
        const id = encodeDotId(props.nodeId, dot, input);
        emit("drop-dot", id);
      },
    };
  },
});
</script>

<style scoped>
.header {
  font-weight: bold;
  user-select: none;
  font-size: 16px;
  cursor: grab;
  border: none;
  line-height: 1.1;
  background: none;
  text-align: left;
  overflow: hidden;
  text-overflow: ellipsis;
  background: #333;
  color: #eee;
  width: auto;
  padding: 3px 5px;
  margin: -5px -5px 0;
  border-radius: 1px 1px 0 0;
}

.header em {
  font-weight: normal;
}

.node {
  position: absolute;
  width: max-content;
  padding: 5px;
  max-width: 300px;
  background: #ccc;
  border-radius: 1px;
  box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.6), 0 1px 10px 0 rgba(0, 0, 0, 0.1);
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
  /* number */
  background-color: #b0dfff;
}

.dot.kind-2 {
  /* vector */
  background-color: #5414b9;
}

.dot.kind-4 {
  /* color */
  background-color: rgb(255, 208, 0);
}

.dot.kind-8 {
  /* image */
  background-color: rgb(110, 255, 25);
}
/* deep style for in-node rendered controls */

.preview >>> .prop-input {
  min-width: 100px;
  background: #444;
  color: white;
  border-radius: 3px;
  box-shadow: inset 0 5px 10px -5px black, 0 0 1px rgba(0, 0, 0, 0.75);
  padding: 1px 5px;
  font-size: 0.7em;
}

.preview::empty {
  display: none;
}

.preview {
  padding-top: 5px;
  border-top: 1px solid #666;
}
</style>
