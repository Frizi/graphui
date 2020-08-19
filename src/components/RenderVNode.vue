<script lang="ts">
import { defineComponent, VNode, Fragment, h, PropType } from "vue";
export default defineComponent({
  props: {
    node: { type: Function as PropType<() => VNode | null>, required: true },
  },
  render() {
    let node = this.node?.();
    if (node != null) {
      return h(Fragment, [node]);
    } else {
      return h(Fragment, []);
    }
  },
});
</script>
