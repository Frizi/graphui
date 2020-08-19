<template>
  <div class="menu" :style="style" layout="column">
    <div
      class="kind"
      v-for="[i, kind] in kinds"
      :key="i"
      tabindex
      @click="choose(i)"
    >
      {{ kind.name }}
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, computed } from "vue";
import { reqobj } from "@/util";
import { Vec2 } from "@/graph";
import { kinds } from "@/kinds";
export default defineComponent({
  name: "NodeKindMenu",
  props: {
    pos: reqobj<Vec2>(),
  },
  setup(props, { emit }) {
    return {
      kinds,
      style: computed(() => {
        return {
          transform: `translate(${props.pos.x}px, ${props.pos.y}px)`,
        };
      }),
      choose(i: number) {
        emit("choose", i);
      },
    };
  },
});
</script>

<style>
.menu {
  border: 1px solid #ccc;
  border-radius: 5px;
  background: white;
  box-shadow: 0 1px 5px 0 black;
  position: absolute;
  width: max-content;
  text-align: left;
}

.kind {
  padding: 5px 10px;
  cursor: pointer;
}

.kind:hover {
  background: #cccccc;
}

.kind + .kind {
  border-top: 1px solid #aaa;
}
</style>
