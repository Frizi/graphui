import { PropType } from "vue";

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
      return e.deltaY / 40;
      break;
    case WheelEvent.DOM_DELTA_PAGE:
      return e.deltaY / 800;
    case WheelEvent.DOM_DELTA_PIXEL:
      return e.deltaY;
  }
  throw new Error("deltaMode missing");
}

let LINE_HEIGHT: number | null = null;
function getScrollLineHeight() {
  if (LINE_HEIGHT != null) {
    return LINE_HEIGHT;
  }
  const el = document.createElement("div");
  el.style.fontSize = "initial";
  el.style.display = "none";
  document.body.appendChild(el);
  const fontSize = window.getComputedStyle(el).fontSize;
  document.body.removeChild(el);
  LINE_HEIGHT = window.parseInt(fontSize);
  return LINE_HEIGHT;
}

export function clamp(t: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, t));
}
