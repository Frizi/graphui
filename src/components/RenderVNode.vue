<script lang="ts">
import { defineComponent, VNode } from "vue";
import { reqobj } from "../util";
export default defineComponent({
  props: {
    node: reqobj<VNode>(),
  },
  render() {
    return this.node;
  },
});
</script>
