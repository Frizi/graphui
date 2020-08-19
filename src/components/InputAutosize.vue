<template>
  <div class="autosize">
    <input
      :type="type"
      size="1"
      v-model="model"
      ref="input"
      @input="$event.target.parentNode.dataset.value = $event.target.value"
      @focus="$emit('focus', $event)"
      @blur="$emit('blur', $event)"
    />
  </div>
</template>

<script lang="ts">
import { defineComponent, computed, ref, onMounted } from "vue";

export default defineComponent({
  props: {
    type: { type: String, default: "text" },
    auto: String,
    modelValue: String,
  },
  setup(props, { emit }) {
    let input = ref<HTMLInputElement | null>(null);
    onMounted(() => {
      let e = input.value;
      if (e != null) {
        if (props.auto == "focus") {
          e.focus();
        } else if (props.auto == "select") {
          e.focus();
          e.select();
        }

        (e.parentNode! as HTMLElement).dataset.value = e.value;
      }
    });

    return {
      input,
      model: computed({
        get: () => props.modelValue,
        set: (value) => emit("update:modelValue", value),
      }),
    };
  },
});
</script>

<style scoped>
.autosize {
  display: grid;
}
.autosize:after {
  content: attr(data-value) " ";
  visibility: hidden;
}

.autosize:after,
.autosize input {
  grid-area: 1/1;
  border: none;
  padding: 0;
  margin: 0;
  background: none;
  font-weight: inherit;
  white-space: pre-wrap;
  color: inherit;
  font: inherit;
}

.autosize input:focus {
  outline: none;
}
</style>
