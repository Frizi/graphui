<template>
  <canvas ref="canvas" :width="IMAGE_SIZE" :height="IMAGE_SIZE"></canvas>
</template>

<script lang="ts">
import { defineComponent, ref, watchEffect, onMounted } from "vue";
import { IMAGE_SIZE } from "@/graph";
export default defineComponent({
  props: {
    pixels: Float32Array,
  },
  setup(props) {
    const canvas = ref<HTMLCanvasElement | null>(null);
    let ctx: CanvasRenderingContext2D | null = null;
    let imageData = ref<ImageData | null>(null);
    onMounted(() => {
      ctx = canvas.value?.getContext("2d") || null;
      imageData.value = ctx?.createImageData(IMAGE_SIZE, IMAGE_SIZE) || null;
    });

    watchEffect(() => {
      if (imageData.value != null && ctx != null && props.pixels != null) {
        let f32 = props.pixels;
        let u8 = imageData.value.data;
        for (let i = 0; i < f32.length; i++) {
          u8[i] = f32[i] * 255;
        }
        ctx.putImageData(imageData.value, 0, 0);
      }
    });

    return { IMAGE_SIZE, canvas };
  },
});
</script>

<style></style>
