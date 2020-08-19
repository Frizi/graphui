import { PropType } from "vue";
import { Vec2 } from "./graph";

let idCounter = 0;
export function nextId(): number {
  return idCounter++;
}

export function req<T>(ty: T): { type: T; required: true } {
  return { type: ty, required: true };
}

export function reqobj<T>(): { type: PropType<T>; required: true } {
  return { type: Object as PropType<T>, required: true };
}

export function isDefined<T>(t: T | null | undefined): t is T {
  return t != null;
}

export function normalizedDeltaY(e: WheelEvent): number {
  switch (e.deltaMode) {
    case WheelEvent.DOM_DELTA_LINE:
      return e.deltaY / 3;
      break;
    case WheelEvent.DOM_DELTA_PAGE:
      return e.deltaY / 40;
    case WheelEvent.DOM_DELTA_PIXEL:
      return e.deltaY / 150;
  }
  throw new Error("deltaMode missing");
}

export function clamp(t: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, t));
}

export function absDragHandler(
  onDrag: (pos: Vec2) => void,
  onDrop?: (pos: Vec2) => void
) {
  function move(e: MouseEvent) {
    onDrag({ x: e.clientX, y: e.clientY });
  }

  function drop(e: MouseEvent) {
    window.removeEventListener("mousemove", move);
    window.removeEventListener("mouseup", drop);
    if (onDrop != null) {
      onDrop({ x: e.clientX, y: e.clientY });
    }
  }
  window.addEventListener("mousemove", move);
  window.addEventListener("mouseup", drop);
}

export function dragHandler(onDrag: (delta: Vec2) => void) {
  let drag: Vec2 | null = null;
  return function down(e: MouseEvent) {
    drag = { x: e.clientX, y: e.clientY };
    e.stopPropagation();

    function move(e: MouseEvent) {
      if (drag != null) {
        const deltaX = drag.x - e.clientX;
        const deltaY = drag.y - e.clientY;
        drag = { x: e.clientX, y: e.clientY };
        onDrag({ x: deltaX, y: deltaY });
      }
    }

    function drop() {
      drag = null;
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", drop);
    }
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", drop);
  };
}
