import { onMounted, onUnmounted, Ref } from "vue";
import { Transform, transformPoint } from "@/graph";
import { clamp } from "@/util";
import { default as panzoom, PanZoomEvent } from "pan-zoom";

export function panZoom(
  el: Ref<HTMLElement | null>,
  onPanZoom: (e: PanZoomEvent) => void
) {
  let deactivate: Function | null = null;

  onMounted(() => {
    if (el.value != null) {
      deactivate = panzoom(el.value, (e) => {
        onPanZoom(e);
      });
    }
  });

  onUnmounted(() => {
    if (deactivate != null) {
      deactivate();
    }
  });
}

/**
 * Special case panzoom handler for Transform updates
 */
export function handlePanZoomTransform(
  e: PanZoomEvent,
  size: { w: number; h: number },
  transform: Transform
): Transform {
  const f = 1 + e.dz * 0.005;
  const prevScale = transform.scale;
  const scale = clamp(prevScale * f, 0.05, 99.9);

  const c = { x: e.x - size.w / 2, y: e.y - size.h / 2 };
  const p = transformPoint(transform, c);

  const dx = e.dx + ((p.x * scale) / prevScale - p.x) / scale;
  const dy = e.dy + ((p.y * scale) / prevScale - p.y) / scale;

  const translateX = transform.translateX - dx;
  const translateY = transform.translateY - dy;

  return { translateX, translateY, scale };
}
